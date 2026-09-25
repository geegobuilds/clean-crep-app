import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export function useNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(friendlyError(queryError, 'load'));
    } else {
      setError(null);
      setNotifications((data ?? []) as Notification[]);
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

  return { notifications, loading, error, reload, markRead, markAllRead };
}
