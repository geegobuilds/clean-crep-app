'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { colors, formatPrice, type MembershipPlan, type MembershipStatus } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

// Clean Crep Club (migration 0022): customers join in the app (pending, with a
// payment reference). When their transfer / Lynk / cash lands, "Record
// payment" activates the month and grants the plan's credits; renewals work
// the same way. "Offered" decides which plans customers can see once the
// membership feature is on.

interface Row {
  id: string;
  status: MembershipStatus;
  payment_ref: string | null;
  current_period_end: string | null;
  created_at: string;
  plan: MembershipPlan;
  customer: { name: string; email: string | null; phone: string | null } | null;
}

const card: React.CSSProperties = { background: colors.white, borderRadius: 14, border: `1px solid ${colors.border}`, padding: 20, marginBottom: 16 };
const btn: React.CSSProperties = { height: 32, borderRadius: 7, border: 'none', padding: '0 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };
const input: React.CSSProperties = { height: 32, borderRadius: 7, border: `1px solid ${colors.border}`, padding: '0 8px', fontSize: 12, fontFamily: 'inherit', color: colors.charcoal, background: colors.white };
const h2: React.CSSProperties = { fontSize: 10, fontWeight: 500, color: colors.caption, letterSpacing: 1.5, textTransform: 'uppercase', margin: '28px 0 10px' };

function day(iso: string | null) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' }) : '—';
}

export default function MembersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [p, m, l] = await Promise.all([
      supabase.from('membership_plans').select('*').order('sort_order'),
      supabase
        .from('memberships')
        .select('id, status, payment_ref, current_period_end, created_at, plan:membership_plans(*), customer:customers!memberships_customer_id_fkey(name, email, phone)')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
      supabase.from('membership_credit_ledger').select('membership_id, delta'),
    ]);
    if (p.error || m.error || l.error) {
      setError("Couldn't load members. Refresh; if it keeps happening, check you're signed in as staff.");
      return;
    }
    setError(null);
    setPlans((p.data ?? []) as MembershipPlan[]);
    setRows((m.data ?? []) as unknown as Row[]);
    const b: Record<string, number> = {};
    for (const r of (l.data ?? []) as { membership_id: string; delta: number }[]) b[r.membership_id] = (b[r.membership_id] ?? 0) + r.delta;
    setBalances(b);
  }, [supabase]);

  useEffect(() => {
    // One-shot load after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function toggleOffered(plan: MembershipPlan) {
    if (!plan.active && !window.confirm(`Offer "${plan.name}" to customers who can see the Club?`)) return;
    await supabase.from('membership_plans').update({ active: !plan.active }).eq('id', plan.id);
    reload();
  }

  async function recordPayment(row: Row, amount: number, method: string, reference: string) {
    const { error: e } = await supabase.rpc('record_membership_payment', {
      p_membership_id: row.id,
      p_amount_cents: Math.round(amount * 100),
      p_method: method,
      p_reference: reference,
    });
    if (e) setError("Couldn't record that payment. Try again.");
    setPaying(null);
    reload();
  }

  async function adjust(row: Row, delta: number) {
    const note = window.prompt(delta > 0 ? 'Why add a credit? (e.g. redo, goodwill)' : 'Why remove a credit?');
    if (note === null) return;
    await supabase.from('membership_credit_ledger').insert({ membership_id: row.id, delta, reason: 'adjust', note: note || null });
    reload();
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const members = rows.filter((r) => r.status !== 'pending');
  const mrr = members.filter((r) => r.status === 'active').reduce((n, r) => n + r.plan.price_cents, 0);

  return (
    <div style={{ minHeight: '100vh', background: colors.offWhite }}>
      <div style={{ background: colors.navy, height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Image src="/assets/logo-cropped.png" alt="Clean Crep" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.white }}>Clean Crep JA</span>
        <span style={{ fontSize: 11, color: 'rgba(168,200,240,0.6)', marginLeft: 2 }}>· Club members</span>
        <Link href="/staff/dashboard" style={{ marginLeft: 'auto', fontSize: 12, color: colors.softBlue, textDecoration: 'none', fontWeight: 500 }}>
          ← Orders
        </Link>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 48px' }}>
        {error && <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Tile label="Active members" value={String(members.filter((r) => r.status === 'active').length)} />
          <Tile label="Monthly recurring" value={formatPrice(mrr)} />
          <Tile label="Waiting to pay" value={String(pending.length)} />
        </div>

        <div style={h2}>Waiting to pay</div>
        {pending.length === 0 && <div style={{ ...card, fontSize: 12, color: colors.caption }}>Nobody right now. New sign-ups from the app land here with their payment reference.</div>}
        {pending.map((r) => (
          <MemberRow key={r.id} row={r} balance={balances[r.id] ?? 0} paying={paying === r.id} onPay={() => setPaying(r.id)} onCancelPay={() => setPaying(null)} onRecord={recordPayment} />
        ))}

        <div style={h2}>Members</div>
        {members.length === 0 && <div style={{ ...card, fontSize: 12, color: colors.caption }}>No members yet.</div>}
        {members.map((r) => (
          <MemberRow
            key={r.id}
            row={r}
            balance={balances[r.id] ?? 0}
            paying={paying === r.id}
            onPay={() => setPaying(r.id)}
            onCancelPay={() => setPaying(null)}
            onRecord={recordPayment}
            onAdjust={(d) => adjust(r, d)}
          />
        ))}

        <div style={h2}>Plans</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {plans.map((p) => (
            <div key={p.id} style={{ ...card, marginBottom: 0 }} data-testid={`plan-${p.slug}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{p.name}</div>
                <button
                  onClick={() => toggleOffered(p)}
                  aria-pressed={p.active}
                  style={{ ...btn, background: p.active ? '#16A34A' : colors.offWhite, color: p.active ? colors.white : colors.navy, border: `1px solid ${colors.border}` }}
                >
                  {p.active ? 'Offered' : 'Not offered'}
                </button>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.navy, margin: '8px 0 2px' }}>
                {formatPrice(p.price_cents)}
                <span style={{ fontSize: 12, fontWeight: 400, color: colors.caption }}> / month</span>
              </div>
              <div style={{ fontSize: 12, color: colors.caption, lineHeight: 1.6 }}>
                {p.credits_per_month} credits · rollover {p.rollover_max}
                {p.max_household > 1 ? ` · up to ${p.max_household} people` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, marginBottom: 0, padding: '14px 18px', minWidth: 160 }}>
      <div style={{ fontSize: 9, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: colors.navy }}>{value}</div>
    </div>
  );
}

function MemberRow({
  row,
  balance,
  paying,
  onPay,
  onCancelPay,
  onRecord,
  onAdjust,
}: {
  row: Row;
  balance: number;
  paying: boolean;
  onPay: () => void;
  onCancelPay: () => void;
  onRecord: (row: Row, amount: number, method: string, reference: string) => void;
  onAdjust?: (delta: number) => void;
}) {
  const [amount, setAmount] = useState(String(row.plan.price_cents / 100));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState(row.payment_ref ?? '');
  const statusColor = row.status === 'active' ? '#16A34A' : row.status === 'paused' ? '#B45309' : colors.blue;
  return (
    <div style={{ ...card, padding: 16 }} data-testid="member-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{row.customer?.name ?? 'Unknown'}</div>
          <div style={{ fontSize: 12, color: colors.caption }}>{row.customer?.phone ?? row.customer?.email ?? ''}</div>
        </div>
        <div style={{ fontSize: 12, color: colors.navy, minWidth: 120 }}>
          {row.plan.name}
          <div style={{ fontSize: 11, color: colors.caption }}>Ref {row.payment_ref ?? '—'}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'capitalize', minWidth: 60 }}>{row.status}</span>
        <div style={{ fontSize: 12, color: colors.navy, minWidth: 110 }}>
          <b>{balance}</b> credit{balance === 1 ? '' : 's'}
          <div style={{ fontSize: 11, color: colors.caption }}>{row.status === 'pending' ? `Asked ${day(row.created_at.slice(0, 10))}` : `Renews ${day(row.current_period_end)}`}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onAdjust && (
            <>
              <button onClick={() => onAdjust(-1)} style={{ ...btn, background: colors.offWhite, color: colors.navy, border: `1px solid ${colors.border}` }} aria-label="Remove a credit">
                −1
              </button>
              <button onClick={() => onAdjust(1)} style={{ ...btn, background: colors.offWhite, color: colors.navy, border: `1px solid ${colors.border}` }} aria-label="Add a credit">
                +1
              </button>
            </>
          )}
          <button onClick={onPay} style={{ ...btn, background: colors.blue, color: colors.white }}>
            {row.status === 'pending' ? 'Record payment' : 'Record renewal'}
          </button>
        </div>
      </div>
      {paying && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRecord(row, Number(amount), method, reference);
          }}
          style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <label style={{ fontSize: 12, color: colors.caption }}>
            J${' '}
            <input style={{ ...input, width: 90 }} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
          </label>
          <select style={input} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
            <option value="bank_transfer">Bank transfer</option>
            <option value="lynk">Lynk</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
          <input style={{ ...input, width: 140 }} placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} aria-label="Reference" />
          <button type="submit" style={{ ...btn, background: '#16A34A', color: colors.white }}>
            {row.status === 'pending' ? 'Activate' : 'Renew'} · +{row.plan.credits_per_month} credits
          </button>
          <button type="button" onClick={onCancelPay} style={{ ...btn, background: 'none', color: colors.caption }}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
