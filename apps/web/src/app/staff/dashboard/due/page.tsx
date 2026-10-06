'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { colors } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

// "Due for a clean": customers whose last order was picked up ~5 weeks ago
// (migrations 0017/0018). App customers with push get an automatic nudge at
// 9 AM; everyone else is here as one tap to WhatsApp (or email). Every tap is
// logged, so the same person drops off the list for 30 days.

interface Due {
  customer_key: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  service_label: string;
  last_order_number: string;
  days_since: number;
  source: string;
  has_push: boolean;
  stage: '5wk' | '10wk';
}

interface Stats {
  nudged: number;
  rebooked: number;
  rate: number;
  pending: number;
  ten_week_enabled: boolean;
  discount_enabled: boolean;
  welcome_back_pct: number;
}

const card: React.CSSProperties = { background: colors.white, borderRadius: 14, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 24 };
const th: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 9,
  fontWeight: 500,
  color: colors.caption,
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  textAlign: 'left',
  background: colors.offWhite,
  borderBottom: `1px solid ${colors.border}`,
};
const td: React.CSSProperties = { padding: '10px 14px', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle', fontSize: 12, color: colors.navy };
const btn: React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: '6px 12px', borderRadius: 7, textDecoration: 'none', display: 'inline-block' };

/** Jamaican numbers for wa.me: 876… -> 1876…; already 1… stays. */
function waNumber(phone: string | null): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 7) return `1876${d}`;
  return d.startsWith('1') ? d : `1${d}`;
}

function nudgeText(row: Pick<Due, 'name' | 'service_label'>, stats: Pick<Stats, 'discount_enabled' | 'welcome_back_pct'> | null): string {
  const first = row.name.split(' ')[0] || 'there';
  let text = `Wah gwaan ${first}! It's been a few weeks since we cleaned your ${row.service_label}. Want to book a refresh this week? Reply here or book at cleancrep.com`;
  if (stats?.discount_enabled && stats.welcome_back_pct > 0) {
    text += ` and use WELCOMEBACK${stats.welcome_back_pct} for ${stats.welcome_back_pct}% off`;
  }
  return text;
}

export default function DuePage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Due[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [due, st] = await Promise.all([supabase.rpc('customers_due_for_clean'), supabase.rpc('reactivation_stats')]);
    setLoaded(true);
    if (due.error || st.error) {
      setLoadError("Couldn't load the list. Refresh the page; if it keeps happening, check you're signed in as staff.");
      return;
    }
    setLoadError(null);
    setRows((due.data ?? []) as Due[]);
    setStats(((st.data ?? []) as Stats[])[0] ?? null);
  }, [supabase]);

  useEffect(() => {
    // One-shot load after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function logNudge(row: Due, channel: 'whatsapp' | 'email') {
    // Log first (the open happens in the same click), then refresh so the row drops off.
    await supabase.from('reactivation_nudges').insert({ customer_key: row.customer_key, customer_id: row.customer_id, channel, stage: row.stage });
    reload();
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.offWhite }}>
      <div style={{ background: colors.navy, height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Image src="/assets/logo-cropped.png" alt="Clean Crep" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.white }}>Clean Crep JA</span>
        <span style={{ fontSize: 11, color: 'rgba(168,200,240,0.6)', marginLeft: 2 }}>· Due for a clean</span>
        <Link href="/staff/dashboard" style={{ marginLeft: 'auto', fontSize: 12, color: colors.softBlue, textDecoration: 'none', fontWeight: 500 }}>
          ← Orders
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <Tile label="Due now" value={loaded ? String(rows.length) : '…'} />
          <Tile label="Nudged (counted)" value={stats ? String(stats.nudged) : '…'} />
          <Tile label="Rebooked within 14 days" value={stats ? `${stats.rebooked} · ${Math.round(Number(stats.rate) * 100)}%` : '…'} />
          <Tile label={`WELCOMEBACK${stats?.welcome_back_pct ?? 10}`} value={stats ? (stats.discount_enabled ? 'On' : 'Off') : '…'} />
          <Tile label="10-week nudge" value={stats ? (stats.ten_week_enabled ? 'On' : 'Off') : '…'} />
        </div>
        <div style={{ fontSize: 12, color: colors.caption, marginBottom: 20, lineHeight: 1.6 }}>
          Customers whose last order was picked up 5–8 weeks ago and haven&apos;t booked since. App customers with notifications on get a push at
          9 AM automatically. Message the rest: tap WhatsApp, send, and they leave the list for 30 days.
        </div>
        {loadError && <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 16 }}>{loadError}</div>}

        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Customer', 'Last clean', 'Days', 'From', ''].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaded && !loadError && rows.length === 0 && (
                <tr>
                  <td style={{ ...td, color: colors.caption }} colSpan={5}>
                    Nobody is due right now. Customers show up here about 5 weeks after an order is marked Completed.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const wa = waNumber(r.phone);
                const text = encodeURIComponent(nudgeText(r, stats));
                return (
                  <tr key={`${r.customer_key}-${r.stage}`} data-testid="due-row">
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: colors.caption }}>{r.phone ?? r.email ?? 'No contact on file'}</div>
                    </td>
                    <td style={td}>
                      {r.service_label} · {r.last_order_number}
                    </td>
                    <td style={td}>{r.days_since}</td>
                    <td style={td}>
                      {r.source}
                      {r.has_push ? ' · push' : ''}
                      {r.stage === '10wk' ? ' · 10-week' : ''}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}?text=${text}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => logNudge(r, 'whatsapp')}
                          style={{ ...btn, background: '#25D366', color: colors.white }}
                        >
                          WhatsApp
                        </a>
                      )}
                      {r.email && (
                        <a
                          href={`mailto:${r.email}?subject=${encodeURIComponent('Due for a clean?')}&body=${text}`}
                          onClick={() => logNudge(r, 'email')}
                          style={{ ...btn, marginLeft: 8, border: `1px solid ${colors.border}`, color: colors.navy }}
                        >
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, marginBottom: 0, padding: '14px 18px', minWidth: 150 }}>
      <div style={{ fontSize: 9, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: colors.navy }}>{value}</div>
    </div>
  );
}
