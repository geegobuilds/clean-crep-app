import { useEffect, useState } from 'react';
import type { Zone } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';

/** CrepRun pickup zones (public read). Empty while loading or if it fails: Pickup then can't be chosen. */
export function useZones() {
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    let live = true;
    supabase
      .from('zones')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (live && data) setZones(data as Zone[]);
      });
    return () => {
      live = false;
    };
  }, []);

  return zones;
}
