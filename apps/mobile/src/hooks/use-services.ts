import { useCallback, useEffect, useState } from 'react';
import type { Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (queryError) throw queryError;
      setServices((data ?? []) as Service[]);
    } catch (e) {
      setError(friendlyError(e, 'load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { services, loading, error, reload };
}
