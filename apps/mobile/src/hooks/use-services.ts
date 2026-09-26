import { useCallback, useEffect, useRef, useState } from 'react';
import type { Service } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // supabase-js retries failed requests in the background, so an old request
  // can settle after a newer one (e.g. after Try Again). Only the latest wins.
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const call = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (call !== latest.current) return;
      if (queryError) throw queryError;
      setServices((data ?? []) as Service[]);
      setLoading(false);
    } catch (e) {
      if (call !== latest.current) return;
      setError(friendlyError(e, 'load'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { services, loading, error, reload };
}
