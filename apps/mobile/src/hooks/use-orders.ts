import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Order, OrderStatus, Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export interface OrderWithService extends Order {
  service: Service;
  /** Status history, for the timeline on the order ticket. */
  events?: { status: OrderStatus; created_at: string }[];
}

/**
 * `onReady` fires when an order this hook already knew about turns Ready for
 * Pickup (live, via realtime). Pass it from ONE always-mounted screen (Home)
 * so the success haptic fires once, not once per screen.
 */
export function useOrders({ onReady }: { onReady?: (order: OrderWithService) => void } = {}) {
  const { session } = useAuth();
  const [orders, setOrders] = useState<OrderWithService[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Whose orders are in state. Loading = signed in but no data for this user
  // yet, so a sign-in or account switch shows the loading state, never the
  // previous account's list.
  const [dataFor, setDataFor] = useState<string | null>(null);
  // Same, readable inside reload: a failed fetch for a new account must not keep the previous account's list.
  const owner = useRef<string | null>(null);
  // Several screens use this hook at once (Home, Orders, Profile). supabase.channel()
  // returns the existing channel for a repeated name, and adding .on() to an
  // already-subscribed channel throws — so each hook instance needs its own name.
  const instanceId = useId();
  // Only the latest request may update state (stale background retries lose).
  const latest = useRef(0);
  const known = useRef<Map<string, OrderStatus> | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  const reload = useCallback(async () => {
    const call = ++latest.current;
    if (!session) {
      known.current = null;
      return;
    }
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('*, service:services(*), events:order_status_events(status, created_at)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (call !== latest.current) return;
    if (queryError) {
      setError(friendlyError(queryError, 'load'));
      if (owner.current !== session.user.id) {
        known.current = null;
        setOrders([]);
      }
    } else {
      setError(null);
      const next = (data ?? []) as unknown as OrderWithService[];
      // First load just records statuses; later loads compare against them.
      if (known.current && onReadyRef.current) {
        for (const o of next) {
          const before = known.current.get(o.id);
          if (before && before !== 'ready_for_pickup' && o.status === 'ready_for_pickup') onReadyRef.current(o);
        }
      }
      known.current = new Map(next.map((o) => [o.id, o.status]));
      setOrders(next);
      owner.current = session.user.id;
    }
    setDataFor(session.user.id);
  }, [session]);

  const userId = session?.user.id ?? null;
  const current = !!userId && dataFor === userId;

  useEffect(() => {
    // Initial fetch, then subscribe below — the intended fetch-then-subscribe pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async: state is only set after the fetch resolves
    reload();
    if (!session) return;
    const channel = supabase
      .channel(`orders-${session.user.id}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, reload, instanceId]);

  return { orders: current ? orders : [], loading: !!userId && !current, error: userId ? error : null, reload };
}
