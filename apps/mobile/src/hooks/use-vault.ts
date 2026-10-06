import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderStatus, Pair } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export interface VaultClean {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  service: { name: string } | null;
}

export interface VaultEvent {
  kind: string;
  order_id: string | null;
  data: unknown;
  created_at: string;
}

export interface VaultPair extends Pair {
  cleans: VaultClean[];
  events: VaultEvent[];
  /** Latest "after" photo across the pair's cleans (signed URL), if any. */
  cover: string | null;
}

const BUCKET = 'order-photos';

/**
 * The signed-in customer's pairs with their clean history (newest first) and
 * a cover photo. RLS returns nothing unless the `vault` flag is on for them.
 */
export function useVault() {
  const { session } = useAuth();
  const [pairs, setPairs] = useState<VaultPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const call = ++latest.current;
    if (!session) {
      setPairs([]);
      setError(null);
      setLoading(false);
      return;
    }
    const { data, error: qe } = await supabase
      .from('pairs')
      .select('*, cleans:orders(id, order_number, created_at, status, service:services(name)), events:pair_events(kind, order_id, data, created_at)')
      .order('created_at', { ascending: false });
    if (call !== latest.current) return;
    if (qe) {
      setError(friendlyError(qe, 'load'));
      setLoading(false);
      return;
    }
    const rows = ((data ?? []) as unknown as Omit<VaultPair, 'cover'>[]).map((p) => ({
      ...p,
      cleans: [...(p.cleans ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      events: p.events ?? [],
    }));

    // One query for every pair's latest "after" photo, one call to sign them.
    const orderToPair = new Map<string, string>();
    rows.forEach((p) => p.cleans.forEach((o) => orderToPair.set(o.id, p.id)));
    const covers = new Map<string, string>();
    if (orderToPair.size) {
      const { data: photos } = await supabase
        .from('order_photos')
        .select('order_id, storage_path, created_at')
        .eq('kind', 'after')
        .in('order_id', [...orderToPair.keys()])
        .order('created_at', { ascending: false });
      const pathByPair = new Map<string, string>();
      for (const ph of photos ?? []) {
        const pairId = orderToPair.get(ph.order_id);
        if (pairId && !pathByPair.has(pairId)) pathByPair.set(pairId, ph.storage_path);
      }
      if (pathByPair.size) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls([...pathByPair.values()], 60 * 60);
        for (const [pairId, path] of pathByPair) {
          const url = signed?.find((s) => s.path === path)?.signedUrl;
          if (url) covers.set(pairId, url);
        }
      }
    }
    if (call !== latest.current) return;
    setError(null);
    setPairs(rows.map((p) => ({ ...p, cover: covers.get(p.id) ?? null })));
    setLoading(false);
  }, [session]);

  useEffect(() => {
    // One-shot load per account.
    reload();
  }, [reload]);

  const savePair = useCallback(
    async (id: string | null, fields: Partial<Pick<Pair, 'brand' | 'model' | 'colorway' | 'size' | 'nickname' | 'category'>>) => {
      if (!session) return 'Sign in first.';
      const clean = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
      const { error: e } = id
        ? await supabase.from('pairs').update(clean).eq('id', id)
        : await supabase.from('pairs').insert({ ...clean, customer_id: session.user.id });
      if (e) return friendlyError(e, 'save');
      await reload();
      return null;
    },
    [session, reload]
  );

  return { pairs, loading, error, reload, savePair };
}
