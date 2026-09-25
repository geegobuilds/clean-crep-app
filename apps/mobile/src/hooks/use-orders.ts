import { useCallback, useEffect, useState } from 'react';
import type { Order, Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export interface OrderWithService extends Order {
  service: Service;
}

export function useOrders() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setOrders([]);
      setError(null);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('*, service:services(*)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(friendlyError(queryError, 'load'));
    } else {
      setError(null);
      setOrders((data ?? []) as unknown as OrderWithService[]);
    }
    setLoading(false);
  }, [session]);

  // A different user (or a sign-in) means the current list is stale: show the
  // loading state rather than flashing an empty list before the fetch lands.
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) setLoading(true);
  }, [userId]);

  useEffect(() => {
    // Initial fetch, then subscribe below — the intended fetch-then-subscribe pattern.
    reload();
    if (!session) return;
    const channel = supabase
      .channel(`orders-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, reload]);

  return { orders, loading, error, reload };
}
