import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface OrderPhotos {
  before: string | null; // signed URL
  after: string | null;
}

const BUCKET = 'order-photos';
const NONE: OrderPhotos = { before: null, after: null };

/**
 * The latest before and after photo on an order, as short-lived signed URLs
 * (the bucket is private; RLS lets a customer read only their own orders').
 * Fails quietly: no photos just means no slider.
 */
export function useOrderPhotos(orderId: string | null, enabled = true) {
  // Photos are kept with the order they belong to, so switching orders never
  // shows the previous order's photos while the new ones load.
  const [got, setGot] = useState<{ orderId: string; photos: OrderPhotos } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!orderId || !enabled) return;
    (async () => {
      const { data, error } = await supabase
        .from('order_photos')
        .select('kind, storage_path, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data?.length) {
        setGot({ orderId, photos: NONE });
        return;
      }
      const before = data.find((p) => p.kind === 'before')?.storage_path ?? null;
      const after = data.find((p) => p.kind === 'after')?.storage_path ?? null;
      const paths = [before, after].filter((p): p is string => !!p);
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      if (cancelled) return;
      const url = (path: string | null) => (path ? (signed?.find((s) => s.path === path)?.signedUrl ?? null) : null);
      setGot({ orderId, photos: { before: url(before), after: url(after) } });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, enabled]);

  const active = !!orderId && enabled;
  const current = active && got?.orderId === orderId;
  return { ...(current ? got.photos : NONE), loading: active && !current };
}
