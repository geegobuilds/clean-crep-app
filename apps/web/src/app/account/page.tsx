'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { colors, formatPrice } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';
import { accountConfirmUrl, friendlyAuthError } from '@/lib/account';

const WHATSAPP_URL = 'https://wa.me/18765072163';

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
  const [points, setPoints] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    const q = new URLSearchParams(window.location.search);
    setExpired(q.get('error') === 'link_expired' || q.get('link') === 'expired');
    setUser(u);
    if (u) {
      const metaName = typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : '';
      // First visit: creating the profile moves their guest bookings onto it.
      await supabase
        .from('customers')
        .upsert({ id: u.id, name: metaName || (u.email ?? '').split('@')[0], email: u.email ?? null }, { onConflict: 'id', ignoreDuplicates: true });
      // Returning customers: pick up any bookings made with this (verified) email since last visit.
      await supabase.rpc('claim_my_guest_orders');
      const { data: me } = await supabase.from('customers').select('loyalty_points').eq('id', u.id).maybeSingle();
      setPoints(typeof me?.loyalty_points === 'number' ? me.loyalty_points : null);
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
    if (err) return setError(friendlyAuthError(err, 'savePassword'));
    setSaved(true);
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter a valid email.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: accountConfirmUrl(), shouldCreateUser: true },
    });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err, 'sendLink'));
    setSent(true);
  }

  return (
    <>
    <nav>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <Image src="/assets/logo-cropped.png" alt="Clean Crep JA" width={34} height={34} />
          <span>Clean Crep Jamaica</span>
        </Link>
        <div className="nav-links">
          <Link href="/#services">Services</Link>
          <Link href="/#how">How It Works</Link>
          <Link href="/#location">Location</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/#book" className="btn-primary nav-cta" style={{ padding: '8px 18px', fontSize: 13 }}>
            Book Now
          </Link>
        </div>
      </div>
    </nav>
    <div style={{ minHeight: '100vh', background: colors.navy, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '92px 16px 32px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

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

              <div style={{ ...label, marginTop: 24 }}>Loyalty points</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.navy, marginTop: 4 }}>
                {points ?? 0}
                <span style={{ fontSize: 12, fontWeight: 400, color: colors.caption, marginLeft: 6 }}>pts · 50 per completed clean</span>
              </div>

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
              <div style={title}>{sent ? 'Check your email' : expired ? 'Link expired, request a new one' : 'Your Clean Crep account'}</div>
              <div style={{ ...sub, marginTop: 6, lineHeight: 1.5 }}>
                {sent
                  ? 'Check your email. Tap the link from Clean Crep Jamaica.'
                  : 'Enter your email and we’ll send you a sign-in link. No password needed.'}
              </div>
              {!sent && (
                <form onSubmit={resend} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  <input type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={input} aria-label="Email" />
                  {error && (
                    <div style={err}>
                      {error}{' '}
                      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: colors.blue, fontWeight: 500 }}>
                        Link us on WhatsApp
                      </a>
                    </div>
                  )}
                  <button type="submit" disabled={busy} style={btn}>
                    {busy ? 'Sending…' : 'Send my link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
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
