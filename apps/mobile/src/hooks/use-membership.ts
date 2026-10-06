import { useCallback, useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) {
      setMembership(null);
      setPlans([]);
      setLoading(false);
      return;
    }
    const [m, p] = await Promise.all([supabase.rpc('my_membership'), supabase.from('membership_plans').select('*').order('sort_order')]);
    if (m.error || p.error) setError(friendlyError(m.error ?? p.error, 'load'));
    else setError(null);
    setMembership((m.data as MyMembership | null) ?? null);
    setPlans((p.data ?? []) as MembershipPlan[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
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

  return { membership, plans, loading, error, reload, join };
}
