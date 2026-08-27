import { useCallback, useEffect, useState } from 'react';
import type { Order, Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export interface OrderWithService extends Order {
  service: Service;
}

export function useOrders() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithService[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(*)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as unknown as OrderWithService[]);
    setLoading(false);
  }, [session]);

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

  return { orders, loading, reload };
}
