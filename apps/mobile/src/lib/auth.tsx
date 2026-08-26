import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Customer } from '@clean-crep/shared';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  customer: Customer | null;
  initializing: boolean;
  refreshCustomer: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadCustomer = useCallback(async (userId: string) => {
    const { data } = await supabase.from('customers').select('*').eq('id', userId).maybeSingle();
    setCustomer((data as Customer | null) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadCustomer(data.session.user.id);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadCustomer(newSession.user.id);
      else setCustomer(null);
    });

    return () => subscription.subscription.unsubscribe();
  }, [loadCustomer]);

  const refreshCustomer = useCallback(async () => {
    if (session) await loadCustomer(session.user.id);
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
