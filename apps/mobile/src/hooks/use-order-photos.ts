import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface OrderPhotos {
  before: string | null; // signed URL
  after: string | null;
}

const BUCKET = 'order-photos';

/**
 * The latest before and after photo on an order, as short-lived signed URLs
 * (the bucket is private; RLS lets a customer read only their own orders').
 * Fails quietly: no photos just means no slider.
 */
export function useOrderPhotos(orderId: string | null, enabled = true) {
  const [photos, setPhotos] = useState<OrderPhotos>({ before: null, after: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhotos({ before: null, after: null });
    if (!orderId || !enabled) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('order_photos')
        .select('kind, storage_path, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data?.length) {
        setLoading(false);
        return;
      }
      const before = data.find((p) => p.kind === 'before')?.storage_path ?? null;
      const after = data.find((p) => p.kind === 'after')?.storage_path ?? null;
      const paths = [before, after].filter((p): p is string => !!p);
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      if (cancelled) return;
      const url = (path: string | null) => (path ? (signed?.find((s) => s.path === path)?.signedUrl ?? null) : null);
      setPhotos({ before: url(before), after: url(after) });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, enabled]);

  return { ...photos, loading };
}
