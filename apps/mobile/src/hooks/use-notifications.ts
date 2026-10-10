import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Notification } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export function useNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Whose notifications are in state (see useOrders).
  const [dataFor, setDataFor] = useState<string | null>(null);
  // Several screens use this hook at once (Home, Orders, Profile). supabase.channel()
  // returns the existing channel for a repeated name, and adding .on() to an
  // already-subscribed channel throws — so each hook instance needs its own name.
  const instanceId = useId();
  // Only the latest request may update state (stale background retries lose).
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const call = ++latest.current;
    if (!session) return;
    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (call !== latest.current) return;
    if (queryError) {
      setError(friendlyError(queryError, 'load'));
    } else {
      setError(null);
      setNotifications((data ?? []) as Notification[]);
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
      .channel(`notifications-${session.user.id}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `customer_id=eq.${session.user.id}` },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, reload, instanceId]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!session) return;
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('customer_id', session.user.id).eq('read', false);
  }, [session]);

  return { notifications: current ? notifications : [], loading: !!userId && !current, error: userId ? error : null, reload, markRead, markAllRead };
}
