import { useCallback, useEffect, useRef, useState } from 'react';
import type { MembershipPlan, MyMembership } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

/**
 * The signed-in customer's Club membership (null if none) and the plans on
 * offer. Both come back empty unless the `membership` flag is on for them.
 */
export function useMembership() {
  const { session } = useAuth();
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dataFor, setDataFor] = useState<string | null>(null);
  // Only the latest request may update state (a slow fetch for a previous account loses).
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const call = ++latest.current;
    if (!session) return;
    const [m, p] = await Promise.all([supabase.rpc('my_membership'), supabase.from('membership_plans').select('*').order('sort_order')]);
    if (call !== latest.current) return;
    if (m.error || p.error) setError(friendlyError(m.error ?? p.error, 'load'));
    else setError(null);
    // On error these are null/empty, so a failed load never shows another account's membership.
    setMembership((m.data as MyMembership | null) ?? null);
    setPlans((p.data ?? []) as MembershipPlan[]);
    setDataFor(session.user.id);
  }, [session]);

  const userId = session?.user.id ?? null;
  const current = !!userId && dataFor === userId;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async: state is only set after the fetch resolves
    reload();
  }, [reload]);

  const join = useCallback(
    async (slug: string) => {
      const { data, error: e } = await supabase.rpc('join_membership', { p_plan_slug: slug });
      if (e) return friendlyError(e, 'save');
      setMembership(data as MyMembership);
      return null;
    },
    []
  );

  return { membership: current ? membership : null, plans: current ? plans : [], loading: !!userId && !current, error: userId ? error : null, reload, join };
}
