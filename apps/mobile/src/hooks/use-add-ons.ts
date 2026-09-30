import { useEffect, useState } from 'react';
import type { AddOn } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';

/**
 * Extras offered on the Book screen. Best-effort: if this fails the booking
 * still works, just without the "Level it up" section — never block a
 * booking on an upsell.
 */
export function useAddOns() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  useEffect(() => {
    let live = true;
    supabase
      .from('add_ons')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (live && data) setAddOns(data as AddOn[]);
      });
    return () => {
      live = false;
    };
  }, []);

  return addOns;
}
