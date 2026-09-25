import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Customer } from '@clean-crep/shared';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  customer: Customer | null;
  initializing: boolean;
  refreshCustomer: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Idempotently creates the customers row for a user (no-op if it exists).
 * Safe to race between sign-up and the auth listener.
 */
export function ensureCustomerProfile(user: User, name: string) {
  return supabase
    .from('customers')
    .upsert({ id: user.id, name, email: user.email ?? null }, { onConflict: 'id', ignoreDuplicates: true });
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadCustomer = useCallback(async (user: User) => {
    const { data } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();
    if (data) {
      setCustomer(data as Customer);
      return;
    }
    // No profile row yet — e.g. the account was created while email confirmation
    // was pending, so sign-up couldn't insert it. orders.customer_id references
    // customers, so create it now or the first booking would fail.
    const fallbackName = user.email?.split('@')[0] ?? 'Customer';
    const name = typeof user.user_metadata?.name === 'string' && user.user_metadata.name ? user.user_metadata.name : fallbackName;
    const { error } = await ensureCustomerProfile(user, name);
    if (error) console.warn('[auth] could not create customer profile', error);
    const { data: created } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();
    setCustomer((created as Customer | null) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadCustomer(data.session.user);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadCustomer(newSession.user);
      else setCustomer(null);
    });

    return () => subscription.subscription.unsubscribe();
  }, [loadCustomer]);

  const refreshCustomer = useCallback(async () => {
    if (session) await loadCustomer(session.user);
  }, [session, loadCustomer]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, customer, initializing, refreshCustomer, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
