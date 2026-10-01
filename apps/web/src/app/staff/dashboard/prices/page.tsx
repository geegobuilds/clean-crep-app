'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { colors, formatPrice, type AddOn, type Service, type Zone } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

// Prices & Zones: the one place to change what things cost. The app's Book
// screen, the website and Creppie (n8n) all read these tables live, so a save
// here is what customers see on their next load / next message. Replaces
// editing prices in Airtable.

interface ZoneRequest {
  id: number;
  area: string;
  customer: string | null;
  created_at: string;
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
const input: React.CSSProperties = {
  height: 32,
  borderRadius: 7,
  border: `1px solid ${colors.border}`,
  padding: '0 10px',
  fontSize: 12,
  color: colors.charcoal,
  background: colors.white,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "2,000" / "2000" / "J$2000" -> 200000 cents; "" -> null; junk -> NaN. */
function toCents(v: string): number | null {
  const s = v.replace(/[^0-9.]/g, '');
  if (!v.trim()) return null;
  const n = Number(s);
  return s && Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
const dollars = (c: number | null) => (c === null ? '' : String(c / 100));

export default function PricesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [services, setServices] = useState<Service[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [requests, setRequests] = useState<ZoneRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [s, a, z, r] = await Promise.all([
      supabase.from('services').select('*').order('sort_order'),
      supabase.from('add_ons').select('*').order('sort_order'),
      supabase.from('zones').select('*').order('sort_order'),
      supabase.from('zone_requests').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (s.error || a.error || z.error) {
      setLoadError("Couldn't load prices. Refresh the page; if it keeps happening, check you're signed in as staff.");
      return;
    }
    setLoadError(null);
    setServices((s.data ?? []) as Service[]);
    setAddOns((a.data ?? []) as AddOn[]);
    setZones((z.data ?? []) as Zone[]);
    setRequests((r.data ?? []) as ZoneRequest[]);
  }, [supabase]);

  useEffect(() => {
    // One-shot load after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return (
    <div style={{ minHeight: '100vh', background: colors.offWhite }}>
      <div style={{ background: colors.navy, height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Image src="/assets/logo-cropped.png" alt="Clean Crep" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.white }}>Clean Crep JA</span>
        <span style={{ fontSize: 11, color: 'rgba(168,200,240,0.6)', marginLeft: 2 }}>· Prices &amp; Zones</span>
        <Link href="/staff/dashboard" style={{ marginLeft: 'auto', fontSize: 12, color: colors.softBlue, textDecoration: 'none', fontWeight: 500 }}>
          ← Orders
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
        <div style={{ fontSize: 12, color: colors.caption, marginBottom: 20, lineHeight: 1.6 }}>
          Changes save per row and go live straight away: the app, the website and Creppie all read these prices on the next load or message. Leave a
          service price empty to show it as <b>Quote</b>.
        </div>
        {loadError && <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 16 }}>{loadError}</div>}

        <Section title="Services" hint="What customers book. Turnaround is in working days.">
          <thead>
            <tr>
              {['Service', 'Price (J$)', 'Turnaround', 'Creppie upsells', 'Live', ''].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} onSaved={reload} />
            ))}
          </tbody>
        </Section>

        <Section title="Add-ons & kits" hint="Extras on a booking. Kits are paid for and collected at the shop. Pickup & Delivery is the app's pickup fee.">
          <thead>
            <tr>
              {['Item', 'Type', 'Price (J$)', 'Shown to customers as', 'Live', ''].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {addOns.map((a) => (
              <AddOnRow key={a.id} addOn={a} onSaved={reload} />
            ))}
          </tbody>
        </Section>

        <Section title="CrepRun zones" hint="Creppie quotes these. Rate = collect + return (round trip); delivery only = one way (kits).">
          <thead>
            <tr>
              {['Zone', 'Areas (comma-separated)', 'Pickup day', 'Rate (J$)', 'Delivery only (J$)', 'Live', ''].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <ZoneRow key={z.id} zone={z} onSaved={reload} />
            ))}
          </tbody>
        </Section>

        <div style={card}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.navy }}>Pickup requests outside your zones</div>
            <div style={{ fontSize: 11, color: colors.caption, marginTop: 2 }}>Where customers asked Creppie for CrepRun that you don&apos;t cover yet. Use it to pick the next zone.</div>
          </div>
          {requests.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: colors.caption }}>No requests yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.area}</td>
                    <td style={{ ...td, color: colors.caption }}>{r.customer ?? '—'}</td>
                    <td style={{ ...td, color: colors.caption, textAlign: 'right' }}>{new Date(r.created_at).toLocaleDateString('en-JM', { month: 'short', day: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.navy }}>{title}</div>
        <div style={{ fontSize: 11, color: colors.caption, marginTop: 2 }}>{hint}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>{children}</table>
      </div>
    </div>
  );
}

/** Save button + status for one row. `save` returns an error message or null. */
function useRowSave(onSaved: () => void) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function run(save: () => Promise<string | null>) {
    setState('saving');
    setError(null);
    const err = await save();
    if (err) {
      setError(err);
      setState('idle');
      return;
    }
    setState('saved');
    onSaved();
    setTimeout(() => setState('idle'), 1500);
  }
  return { state, error, run };
}

function SaveCell({ dirty, state, error, onSave }: { dirty: boolean; state: 'idle' | 'saving' | 'saved'; error: string | null; onSave: () => void }) {
  return (
    <td style={{ ...td, width: 110, textAlign: 'right' }}>
      {error && <div style={{ fontSize: 10, color: '#993C1D', marginBottom: 4 }}>{error}</div>}
      {state === 'saved' ? (
        <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>Saved ✓</span>
      ) : (
        <button
          onClick={onSave}
          disabled={!dirty || state === 'saving'}
          style={{
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 7,
            padding: '6px 14px',
            border: 'none',
            cursor: dirty ? 'pointer' : 'default',
            background: dirty ? colors.blue : colors.ice,
            color: dirty ? colors.white : colors.caption,
          }}
        >
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      )}
    </td>
  );
}

function Live({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <td style={td}>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: value ? '#16A34A' : colors.caption }}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {value ? 'On' : 'Off'}
      </label>
    </td>
  );
}

function ServiceRow({ service, onSaved }: { service: Service; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [price, setPrice] = useState(dollars(service.price_cents));
  const [days, setDays] = useState(service.turnaround_days === null ? '' : String(service.turnaround_days));
  const [upsell, setUpsell] = useState(service.upsell ?? '');
  const [active, setActive] = useState(service.active);
  const { state, error, run } = useRowSave(onSaved);
  const dirty =
    price !== dollars(service.price_cents) ||
    days !== (service.turnaround_days === null ? '' : String(service.turnaround_days)) ||
    upsell !== (service.upsell ?? '') ||
    active !== service.active;

  return (
    <tr>
      <td style={td}>
        <div style={{ fontWeight: 500 }}>{service.name}</div>
        <div style={{ fontSize: 10, color: colors.caption }}>now {formatPrice(service.price_cents)}</div>
      </td>
      <td style={td}>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Quote" inputMode="decimal" style={{ ...input, width: 90 }} />
      </td>
      <td style={td}>
        <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} placeholder="—" inputMode="numeric" style={{ ...input, width: 56 }} /> days
      </td>
      <td style={td}>
        <input value={upsell} onChange={(e) => setUpsell(e.target.value)} placeholder="—" style={{ ...input, width: 160 }} />
      </td>
      <Live value={active} onChange={setActive} />
      <SaveCell
        dirty={dirty}
        state={state}
        error={error}
        onSave={() =>
          run(async () => {
            const cents = toCents(price);
            if (Number.isNaN(cents)) return 'Price must be a number';
            const { error: e } = await supabase
              .from('services')
              .update({ price_cents: cents, turnaround_days: days ? Number(days) : null, upsell: upsell.trim() || null, active })
              .eq('id', service.id);
            return e ? "Couldn't save. Try again." : null;
          })
        }
      />
    </tr>
  );
}

function AddOnRow({ addOn, onSaved }: { addOn: AddOn; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [price, setPrice] = useState(dollars(addOn.price_cents));
  const [description, setDescription] = useState(addOn.description);
  const [active, setActive] = useState(addOn.active);
  const { state, error, run } = useRowSave(onSaved);
  const dirty = price !== dollars(addOn.price_cents) || description !== addOn.description || active !== addOn.active;
  const kind = { addon: 'Add-on', kit: 'Kit', delivery: 'Pickup fee' }[addOn.kind];

  return (
    <tr>
      <td style={{ ...td, fontWeight: 500 }}>{addOn.name}</td>
      <td style={{ ...td, color: colors.caption }}>{kind}</td>
      <td style={td}>
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="On inspection" inputMode="decimal" style={{ ...input, width: 110 }} />
      </td>
      <td style={td}>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, width: '100%', minWidth: 220 }} />
      </td>
      <Live value={active} onChange={setActive} />
      <SaveCell
        dirty={dirty}
        state={state}
        error={error}
        onSave={() =>
          run(async () => {
            const cents = toCents(price);
            if (Number.isNaN(cents)) return 'Price must be a number';
            const { error: e } = await supabase.from('add_ons').update({ price_cents: cents, description: description.trim(), active }).eq('id', addOn.id);
            return e ? "Couldn't save. Try again." : null;
          })
        }
      />
    </tr>
  );
}

function ZoneRow({ zone, onSaved }: { zone: Zone; onSaved: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [areas, setAreas] = useState(zone.areas);
  const [day, setDay] = useState(zone.pickup_day);
  const [rate, setRate] = useState(dollars(zone.rate_cents));
  const [delivery, setDelivery] = useState(dollars(zone.delivery_rate_cents));
  const [active, setActive] = useState(zone.active);
  const { state, error, run } = useRowSave(onSaved);
  const dirty =
    areas !== zone.areas ||
    day !== zone.pickup_day ||
    rate !== dollars(zone.rate_cents) ||
    delivery !== dollars(zone.delivery_rate_cents) ||
    active !== zone.active;

  return (
    <tr>
      <td style={{ ...td, fontWeight: 500, whiteSpace: 'nowrap' }}>{zone.name}</td>
      <td style={td}>
        <textarea value={areas} onChange={(e) => setAreas(e.target.value)} rows={2} style={{ ...input, height: 'auto', padding: '6px 10px', width: '100%', minWidth: 240, resize: 'vertical' }} />
      </td>
      <td style={td}>
        <select value={day} onChange={(e) => setDay(e.target.value)} style={{ ...input, width: 110 }}>
          {(DAYS.includes(day) ? DAYS : [day, ...DAYS]).map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </td>
      <td style={td}>
        <input
          value={rate}
          onChange={(e) => {
            // Delivery-only follows half the round trip unless edited separately.
            const halfBefore = dollars(Math.round((toCents(rate) ?? 0) / 2));
            if (delivery === halfBefore) {
              const c = toCents(e.target.value);
              if (c !== null && !Number.isNaN(c)) setDelivery(dollars(Math.round(c / 2)));
            }
            setRate(e.target.value);
          }}
          inputMode="decimal"
          style={{ ...input, width: 80 }}
        />
      </td>
      <td style={td}>
        <input value={delivery} onChange={(e) => setDelivery(e.target.value)} inputMode="decimal" style={{ ...input, width: 80 }} />
      </td>
      <Live value={active} onChange={setActive} />
      <SaveCell
        dirty={dirty}
        state={state}
        error={error}
        onSave={() =>
          run(async () => {
            const r = toCents(rate);
            const d = toCents(delivery);
            if (r === null || d === null || Number.isNaN(r) || Number.isNaN(d)) return 'Rates must be numbers';
            if (!areas.trim()) return 'Add at least one area';
            const { error: e } = await supabase
              .from('zones')
              .update({ areas: areas.trim(), pickup_day: day, rate_cents: r, delivery_rate_cents: d, active })
              .eq('id', zone.id);
            return e ? "Couldn't save. Try again." : null;
          })
        }
      />
    </tr>
  );
}
