'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { colors, formatPrice } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

// Where the Quick Book email's link lands (via /account/confirm). Signing in
// creates their customers row, which claims the bookings made with this email
// (claim_guest_orders()). They set a password here so the same account works
// in the Clean Crep app.

interface OrderRow {
  id: string;
  order_number: string;
  item_name: string;
  status: string;
  scheduled_date: string;
  price_cents: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  received: 'Received',
  in_progress: 'Being cleaned',
  ready_for_pickup: 'Ready for pickup',
  completed: 'Completed',
  pending_payment: 'Payment pending',
};

export default function AccountPage() {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    setExpired(new URLSearchParams(window.location.search).get('link') === 'expired');
    setUser(u);
    if (u) {
      const metaName = typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : '';
      // First visit: creating the profile moves their guest bookings onto it.
      await supabase
        .from('customers')
        .upsert({ id: u.id, name: metaName || (u.email ?? '').split('@')[0], email: u.email ?? null }, { onConflict: 'id', ignoreDuplicates: true });
      const { data: rows } = await supabase
        .from('orders')
        .select('id, order_number, item_name, status, scheduled_date, price_cents')
        .eq('customer_id', u.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setOrders((rows ?? []) as OrderRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot load after mount
    load();
  }, [load]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setSaved(true);
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter the email you booked with.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/account/confirm` },
    });
    setBusy(false);
    if (err) return setError('Couldn’t send that just now. Try again in a minute.');
    setSent(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ display: 'block', fontSize: 14, fontWeight: 500, color: colors.white, textAlign: 'center', marginBottom: 24, textDecoration: 'none' }}>
          Clean Crep Jamaica
        </Link>

        <div style={card}>
          {loading ? (
            <div style={{ fontSize: 13, color: colors.caption }}>Loading your account…</div>
          ) : user ? (
            <>
              <div style={title}>You&apos;re in 👟</div>
              <div style={sub}>{user.email}</div>

              {!saved ? (
                <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                  <label style={label} htmlFor="pw">
                    Set a password for the Clean Crep app
                  </label>
                  <input id="pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
                  {error && <div style={err}>{error}</div>}
                  <button type="submit" disabled={busy} style={btn}>
                    {busy ? 'Saving…' : 'Save password'}
                  </button>
                </form>
              ) : (
                <div style={{ ...sub, marginTop: 16, color: colors.navy }}>Password saved. Sign in on the app with {user.email}.</div>
              )}

              <div style={{ ...label, marginTop: 24 }}>Your bookings</div>
              {orders.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.caption, marginTop: 8 }}>No bookings on this account yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {orders.map((o) => (
                    <div key={o.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: colors.navy }}>{o.item_name}</div>
                        <div style={{ fontSize: 11, color: colors.caption, marginTop: 2 }}>
                          {o.order_number} · {new Date(`${o.scheduled_date}T12:00:00Z`).toLocaleDateString('en-JM', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: colors.blue }}>{STATUS_LABEL[o.status] ?? o.status}</div>
                        <div style={{ fontSize: 11, color: colors.caption, marginTop: 2 }}>{formatPrice(o.price_cents)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <Link href="/#book" style={linkStyle}>
                  Book another clean
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                    setOrders([]);
                  }}
                  style={{ ...linkStyle, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: colors.caption }}
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={title}>{expired ? 'That link has expired' : 'Your Clean Crep account'}</div>
              <div style={{ ...sub, marginTop: 6, lineHeight: 1.5 }}>
                {sent
                  ? `Check ${email.trim()} for a fresh link. Open it on this device.`
                  : 'Enter the email you booked with and we’ll send you a link to get in.'}
              </div>
              {!sent && (
                <form onSubmit={resend} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  <input type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={input} aria-label="Email" />
                  {error && <div style={err}>{error}</div>}
                  <button type="submit" disabled={busy} style={btn}>
                    {busy ? 'Sending…' : 'Email me a link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: colors.white, borderRadius: 16, padding: 24 };
const title: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: colors.navy };
const sub: React.CSSProperties = { fontSize: 13, color: colors.caption, marginTop: 2 };
const label: React.CSSProperties = { fontSize: 10, fontWeight: 500, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.6 };
const input: React.CSSProperties = { width: '100%', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, fontFamily: 'inherit' };
const btn: React.CSSProperties = { background: colors.blue, color: colors.white, border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const err: React.CSSProperties = { fontSize: 12, color: '#993C1D' };
const linkStyle: React.CSSProperties = { fontSize: 13, color: colors.blue, fontWeight: 500, textDecoration: 'none' };
