'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Camera, ChevronLeft, Loader2 } from 'lucide-react';
import {
  DASHBOARD_STATUS_FLOW,
  formatPrice,
  ORDER_STATUS_LABEL,
  palette,
  radius,
  shadow,
  type Order,
  type OrderStatus,
  type Service,
} from '@clean-crep/shared';
import { StatusTag } from '@/components/status-tag';
import { createClient } from '@/lib/supabase/client';
import { listOrderPhotos, uploadOrderPhoto, type OrderPhoto, type PhotoKind } from '@/lib/order-photos';

// Staff order page, built for a phone held at the counter: shoot a "before" at
// drop-off and an "after" when it's clean. The file input opens the camera
// directly (capture="environment"); photos are shrunk before upload.

interface OrderRow extends Order {
  service: Service | null;
  customer: { name: string; phone: string | null } | null;
}

const display: React.CSSProperties = { fontFamily: 'var(--font-archivo), var(--font-dm-sans), sans-serif', fontWeight: 800 };
const overline: React.CSSProperties = { fontSize: 12, fontWeight: 500, letterSpacing: 1.6, textTransform: 'uppercase', color: palette.inkMuted };

export default function StaffOrderPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<PhotoKind | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const reload = useCallback(async () => {
    const [{ data }, list] = await Promise.all([
      supabase.from('orders').select('*, service:services(*), customer:customers(name, phone)').eq('id', id).maybeSingle(),
      listOrderPhotos(supabase, id),
    ]);
    setOrder((data as OrderRow | null) ?? null);
    setPhotos(list);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    // One-shot fetch on load (same pattern as the dashboard list).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function onPick(kind: PhotoKind, file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setMessage(null);
    try {
      await uploadOrderPhoto(supabase, id, kind, file);
      setMessage({ tone: 'ok', text: `${kind === 'before' ? 'Before' : 'After'} photo saved.` });
      await reload();
    } catch (e) {
      console.error('[order photo]', e);
      setMessage({ tone: 'error', text: "Couldn't save that photo. Check the connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', id);
    await reload();
  }

  const latest = (kind: PhotoKind) => photos.find((p) => p.kind === kind) ?? null;
  const name = order?.customer?.name ?? order?.guest_name ?? 'Guest';

  return (
    <div style={{ minHeight: '100vh', background: palette.offWhite, color: palette.navy }}>
      <div style={{ background: palette.navy, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/staff/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 4, color: palette.white, textDecoration: 'none', fontSize: 15, fontWeight: 500, minHeight: 44 }}>
          <ChevronLeft size={20} /> Orders
        </Link>
      </div>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
        {loading && <p style={{ fontSize: 15, color: palette.inkMuted }}>Loading…</p>}
        {!loading && !order && <p style={{ fontSize: 15, color: palette.inkMuted }}>Order not found.</p>}

        {order && (
          <>
            <section style={{ background: palette.navy, color: palette.white, borderRadius: radius.lg, padding: 20, boxShadow: shadow.raised }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ ...overline, color: palette.onNavyMuted }}>{order.order_number}</span>
                <StatusTag status={order.status} />
              </div>
              <h1 style={{ ...display, fontSize: 28, lineHeight: '32px', margin: '10px 0 4px' }}>{order.item_name}</h1>
              <p style={{ fontSize: 15, color: palette.onNavyMuted, margin: 0 }}>
                {order.service?.name ?? '—'}
                {(order.add_ons ?? []).length ? ` + ${order.add_ons.map((a) => a.name).join(', ')}` : ''}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...overline, color: palette.onNavyMuted }}>Customer</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div>
                </div>
                <div>
                  <div style={{ ...overline, color: palette.onNavyMuted }}>{order.drop_method === 'pickup' ? 'Pickup' : 'Drop-off'}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>
                    {new Date(`${order.scheduled_date}T12:00:00`).toLocaleDateString('en-JM', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...overline, color: palette.onNavyMuted }}>Total</div>
                  <div style={{ ...display, fontSize: 22 }}>{formatPrice(order.price_cents)}</div>
                </div>
              </div>
            </section>

            <section style={{ background: palette.white, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card }}>
              <div style={{ ...overline, marginBottom: 12 }}>Photos</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['before', 'after'] as const).map((kind) => (
                  <PhotoSlot key={kind} kind={kind} photo={latest(kind)} busy={busy === kind} disabled={busy !== null} onPick={(f) => onPick(kind, f)} />
                ))}
              </div>
              {message && (
                <p role="status" style={{ fontSize: 15, margin: '12px 0 0', color: message.tone === 'ok' ? palette.blue : palette.danger }}>
                  {message.text}
                </p>
              )}
              <p style={{ fontSize: 13, color: palette.inkMuted, margin: '12px 0 0' }}>
                The customer sees the latest before + after on their order in the app once it&apos;s Completed.
                {photos.length > 2 ? ` ${photos.length} photos on this order.` : ''}
              </p>
            </section>

            <section style={{ background: palette.white, borderRadius: radius.lg, padding: 16, boxShadow: shadow.card }}>
              <div style={{ ...overline, marginBottom: 12 }}>Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DASHBOARD_STATUS_FLOW.map((s) => {
                  const on = order.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{
                        minHeight: 44,
                        padding: '0 14px',
                        borderRadius: radius.md,
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1px solid ${on ? palette.blue : palette.line}`,
                        background: on ? palette.blue : palette.white,
                        color: on ? palette.white : palette.navy,
                      }}
                    >
                      {ORDER_STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PhotoSlot({
  kind,
  photo,
  busy,
  disabled,
  onPick,
}: {
  kind: PhotoKind;
  photo: OrderPhoto | null;
  busy: boolean;
  disabled: boolean;
  onPick: (file: File | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const label = kind === 'before' ? 'Add before' : 'Add after';
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        style={{
          aspectRatio: '4 / 5',
          borderRadius: radius.md,
          background: palette.ice,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL, not a static asset
          <img src={photo.url} alt={`${kind} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 13, color: palette.inkMuted }}>No {kind} photo yet</span>
        )}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(10,31,68,0.72)',
            color: palette.white,
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {kind}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid={`photo-input-${kind}`}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          background: kind === 'after' ? palette.blue : palette.navy,
          color: palette.white,
          fontSize: 16,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled && !busy ? 0.6 : 1,
        }}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}
