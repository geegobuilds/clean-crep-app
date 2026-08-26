import { useEffect, useState } from 'react';
import type { Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (!active) return;
        setServices((data ?? []) as Service[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { services, loading };
}
