import { useCallback, useEffect, useRef, useState } from 'react';
import type { DropMethod, OrderStatus, Pair } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { onTourChange, tour } from '@/lib/tour/state';
import { photoUrl, sampleCover } from '@/lib/tour/photos';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

export interface VaultClean {
  id: string;
  order_number: string;
  created_at: string;
  drop_method?: DropMethod;
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
  /** The pair's cover: its product shot (cutout), else its latest "after" photo, else a sample. */
  cover: string | null;
  /** 'cutout' = transparent product shot (0030), 'photo' = an after photo, 'sample' = stock, tagged Sample. */
  coverKind: 'cutout' | 'photo' | 'sample' | null;
}

const BUCKET = 'order-photos';

/**
 * The signed-in customer's pairs with their clean history (newest first) and
 * a cover photo. RLS returns nothing unless the `vault` flag is on for them.
 */
export function useVault() {
  const { session } = useAuth();
  const [pairs, setPairs] = useState<VaultPair[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dataFor, setDataFor] = useState<string | null>(null);
  const owner = useRef<string | null>(null);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const call = ++latest.current;
    if (!session) return;
    const { data, error: qe } = await supabase
      .from('pairs')
      .select('*, cleans:orders(id, order_number, created_at, status, drop_method, service:services(name)), events:pair_events(kind, order_id, data, created_at)')
      .order('created_at', { ascending: false });
    if (call !== latest.current) return;
    if (qe) {
      setError(friendlyError(qe, 'load'));
      if (owner.current !== session.user.id) setPairs([]);
      setDataFor(session.user.id);
      return;
    }
    const rows = ((data ?? []) as unknown as Omit<VaultPair, 'cover'>[]).map((p) => ({
      ...p,
      cleans: [...(p.cleans ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      events: p.events ?? [],
    }));

    // One query for every pair's photos, one call to sign the covers: the latest
    // product shot (cutout) wins, else the latest after photo.
    const orderToPair = new Map<string, string>();
    rows.forEach((p) => p.cleans.forEach((o) => orderToPair.set(o.id, p.id)));
    const covers = new Map<string, { url: string; kind: 'cutout' | 'photo' }>();
    if (orderToPair.size) {
      const { data: photos } = await supabase
        .from('order_photos')
        .select('order_id, kind, storage_path, created_at')
        .in('kind', ['after', 'cutout'])
        .in('order_id', [...orderToPair.keys()])
        .order('created_at', { ascending: false });
      const pick = new Map<string, { path: string; kind: 'cutout' | 'photo' }>();
      for (const ph of photos ?? []) {
        const pairId = orderToPair.get(ph.order_id);
        if (!pairId) continue;
        const kind = ph.kind === 'cutout' ? 'cutout' : 'photo';
        const had = pick.get(pairId);
        if (!had || (had.kind === 'photo' && kind === 'cutout')) pick.set(pairId, { path: ph.storage_path, kind });
      }
      if (pick.size) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls([...pick.values()].map((x) => x.path), 60 * 60);
        for (const [pairId, { path, kind }] of pick) {
          const url = photoUrl(signed?.find((s) => s.path === path)?.signedUrl);
          if (url) covers.set(pairId, { url, kind });
        }
      }
    }
    if (call !== latest.current) return;
    setError(null);
    setPairs(
      rows.map((p) => {
        const own = covers.get(p.id);
        const sample = own ? null : sampleCover(p.category);
        return { ...p, cover: own?.url ?? sample, coverKind: own?.kind ?? (sample ? 'sample' : null) };
      })
    );
    owner.current = session.user.id;
    setDataFor(session.user.id);
  }, [session]);

  useEffect(() => {
    // One-shot load per account.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async: state is only set after the fetch resolves
    reload();
    // On the tour, reload when its sample data changes (a booking, an order moving along).
    return tour.active ? onTourChange(() => reload()) : undefined;
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

  /** Remove a never-cleaned item (RLS refuses anything with a clean). */
  const removePair = useCallback(
    async (id: string) => {
      if (!session) return 'Sign in first.';
      const { data, error: e } = await supabase.from('pairs').delete().eq('id', id).select('id');
      if (e) return friendlyError(e, 'save');
      if (!data?.length) return "This one has care history, so it stays in your Vault.";
      await reload();
      return null;
    },
    [session, reload]
  );

  const userId = session?.user.id ?? null;
  const current = !!userId && dataFor === userId;
  return { pairs: current ? pairs : [], loading: !!userId && !current, error: userId ? error : null, reload, savePair, removePair };
}
