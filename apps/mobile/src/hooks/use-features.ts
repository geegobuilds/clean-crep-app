import { useEffect, useState } from 'react';
import type { Feature } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// Which hidden features this person can see (staff, test accounts, or
// everyone once a flag is switched on). Re-checked when the account changes.
// Fails closed: on any error, nothing new shows.
export function useFeatures() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [features, setFeatures] = useState<ReadonlySet<Feature>>(new Set());

  useEffect(() => {
    let active = true;
    supabase.rpc('my_features').then(({ data, error }) => {
      if (!active) return;
      setFeatures(new Set(error || !Array.isArray(data) ? [] : (data as Feature[])));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return features;
}

export function useFeature(key: Feature): boolean {
  return useFeatures().has(key);
}
