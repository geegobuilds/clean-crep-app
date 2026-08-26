import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function useNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // Initial fetch, then subscribe below — the intended
    // fetch-then-subscribe pattern (see the web dashboard's identical hook
    // for the fuller explanation of this lint exception).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    if (!session) return;
    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `customer_id=eq.${session.user.id}` },
        () => reload()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, reload]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!session) return;
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('customer_id', session.user.id).eq('read', false);
  }, [session]);

  return { notifications, loading, reload, markRead, markAllRead };
}
