'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AddOn, Service, Zone } from '@clean-crep/shared';
import { formatPrice } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';
import { accountConfirmUrl } from '@/lib/account';

// Quick Book: the hero's booking card. Three short steps (what / when / who)
// then one call to book_web_order(), which prices the order and picks the
// date server-side (supabase/migrations/0013). Email is required so we can
// send a link to create an account; the booking moves onto that account once
// they confirm it.

export const PICK_SERVICE_EVENT = 'cc:pick-service';

const WHATSAPP_URL = 'https://wa.me/18765072163';
const MAX_PAIRS = 10;

type Step = 0 | 1 | 2;
interface Booked {
  order_number: string;
  price_cents: number | null;
  scheduled_date: string;
  has_account: boolean;
  emailSent: boolean;
}

/** Today's date in Jamaica (no DST, UTC-5) as YYYY-MM-DD. */
function jmToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Jamaica' }).format(new Date());
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekday(iso: string, style: 'short' | 'long' = 'short'): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-JM', { weekday: style, timeZone: 'UTC' });
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-JM', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Next 6 shop days (Mon–Sat), starting today. Mirrors the database's drop-off rule. */
function dropOffDays(): string[] {
  const today = jmToday();
  const out: string[] = [];
  for (let i = 0; out.length < 6 && i < 14; i++) {
    const d = addDays(today, i);
    if (weekday(d) !== 'Sun') out.push(d);
  }
  return out;
}

/** Mirrors next_pickup_date(): the zone's weekday, from tomorrow on. */
function nextPickup(day: string): string | null {
  const today = jmToday();
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (weekday(d, 'long').toLowerCase() === day.trim().toLowerCase()) return d;
  }
  return null;
}

export function QuickBook({ services, addOns, zones }: { services: Service[]; addOns: AddOn[]; zones: Zone[] }) {
  const extras = addOns.filter((a) => a.kind === 'addon' || a.kind === 'kit');
  const [step, setStep] = useState<Step>(0);
  const [serviceId, setServiceId] = useState(services.find((s) => s.popular)?.id ?? services[0]?.id ?? '');
  const [pairs, setPairs] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [method, setMethod] = useState<'dropoff' | 'pickup'>('dropoff');
  const [zoneId, setZoneId] = useState('');
  const days = useMemo(() => dropOffDays(), []);
  const [day, setDay] = useState(days[0] ?? '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  // "Book this" on a service tile.
  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!services.some((s) => s.id === id)) return;
      setServiceId(id);
      setStep(0);
      setBooked(null);
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener(PICK_SERVICE_EVENT, onPick);
    return () => window.removeEventListener(PICK_SERVICE_EVENT, onPick);
  }, [services]);

  const service = services.find((s) => s.id === serviceId);
  const zone = zones.find((z) => z.id === zoneId);
  const pickupDate = zone ? nextPickup(zone.pickup_day) : null;
  const date = method === 'pickup' ? pickupDate : day;

  // Mirrors book_web_order(): service + service extras per pair, kits once, CrepRun by zone.
  let total: number | null = null;
  if (service && service.price_cents !== null) {
    total = service.price_cents * pairs;
    for (const a of extras) if (picked.includes(a.id)) total += (a.price_cents ?? 0) * (a.kind === 'addon' ? pairs : 1);
    if (method === 'pickup' && zone) total += zone.rate_cents;
  }

  function next() {
    setError(null);
    if (step === 0 && !service) return setError('Pick a service.');
    if (step === 1 && method === 'pickup' && !zone) return setError('Pick your area so we know the pickup day.');
    if (step === 1 && !date) return setError('Pick a day.');
    setStep((s) => (s + 1) as Step);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (name.trim().length < 2) return setError('Please enter your name.');
    if (phone.replace(/\D/g, '').length < 7) return setError('Please enter a valid phone number.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Please enter a valid email.');
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('book_web_order', {
      p_service_id: serviceId,
      p_pairs: pairs,
      p_item: item,
      p_add_on_ids: picked,
      p_drop_method: method,
      p_zone_id: method === 'pickup' ? zoneId : null,
      p_date: method === 'dropoff' ? day : null,
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_notes: notes,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (rpcError || !row) {
      const msg = rpcError?.message ?? '';
      setError(msg.startsWith('BOOK: ') ? msg.slice(6) : "Couldn't book that just now. Try again, or link us on WhatsApp.");
      setSubmitting(false);
      return;
    }
    // New customers get an email with a link to create their account; the
    // booking moves onto it once they confirm (claim_guest_orders()).
    let emailSent = false;
    if (!row.has_account) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: accountConfirmUrl(),
          data: { name: name.trim() },
        },
      });
      emailSent = !otpError;
    }
    setBooked({ ...row, emailSent });
    setSubmitting(false);
  }

  if (booked) {
    return (
      <div className="qb" id="book" aria-live="polite">
        <div className="qb-done-tick">✓</div>
        <div className="qb-title">You&apos;re booked!</div>
        <div className="qb-summary">
          <div>
            <span>Order</span>
            <strong>{booked.order_number}</strong>
          </div>
          <div>
            <span>{method === 'pickup' ? 'CrepRun pickup' : 'Drop-off'}</span>
            <strong>{prettyDate(booked.scheduled_date)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{booked.price_cents === null ? 'Quote on inspection' : formatPrice(booked.price_cents)}</strong>
          </div>
        </div>
        <p className="qb-note">
          {booked.has_account
            ? 'It’s on your Clean Crep account. Track it in the app.'
            : booked.emailSent
              ? `Check ${email.trim()}: tap the link to create your account and track this order, get updates and earn points.`
              : 'We’ll WhatsApp you to confirm. Pay cash or bank transfer at the shop.'}
        </p>
        <div className="qb-actions">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="qb-ghost">
            Questions? WhatsApp us
          </a>
          <button
            type="button"
            className="qb-ghost"
            onClick={() => {
              setBooked(null);
              setStep(0);
              setPicked([]);
              setItem('');
              setNotes('');
            }}
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="qb" id="book" onSubmit={submit} noValidate>
      <div className="qb-head">
        <div className="qb-title">Book a clean</div>
        <div className="qb-steps" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <>
          <div className="qb-label">Service</div>
          <div className="qb-services" role="radiogroup" aria-label="Service">
            {services.map((s) => (
              <button
                type="button"
                role="radio"
                aria-checked={s.id === serviceId}
                key={s.id}
                className={`qb-service${s.id === serviceId ? ' on' : ''}`}
                onClick={() => setServiceId(s.id)}
              >
                <span className="qb-service-name">{s.name}</span>
                <span className="qb-service-price">{formatPrice(s.price_cents)}</span>
              </button>
            ))}
          </div>

          <div className="qb-row">
            <div className="qb-label" style={{ margin: 0 }}>
              Pairs
            </div>
            <div className="qb-stepper">
              <button type="button" aria-label="Fewer pairs" onClick={() => setPairs((p) => Math.max(1, p - 1))} disabled={pairs <= 1}>
                −
              </button>
              <span aria-live="polite">{pairs}</span>
              <button type="button" aria-label="More pairs" onClick={() => setPairs((p) => Math.min(MAX_PAIRS, p + 1))} disabled={pairs >= MAX_PAIRS}>
                +
              </button>
            </div>
          </div>

          {extras.length > 0 && (
            <>
              <div className="qb-label">Level it up</div>
              <div className="qb-extras">
                {extras.map((a) => {
                  const on = picked.includes(a.id);
                  return (
                    <label key={a.id} className={`qb-extra${on ? ' on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))} />
                      <span className="qb-extra-name">
                        {a.name}
                        {a.kind === 'addon' && pairs > 1 ? ' (per pair)' : ''}
                      </span>
                      <span className="qb-extra-price">{a.price_cents === null ? 'Quote' : `+${formatPrice(a.price_cents)}`}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <div className="qb-label">How you&apos;re getting them to us</div>
          <div className="qb-toggle" role="radiogroup" aria-label="Drop-off or pickup">
            <button type="button" role="radio" aria-checked={method === 'dropoff'} className={method === 'dropoff' ? 'on' : ''} onClick={() => setMethod('dropoff')}>
              Drop off at the shop
            </button>
            <button type="button" role="radio" aria-checked={method === 'pickup'} className={method === 'pickup' ? 'on' : ''} onClick={() => setMethod('pickup')}>
              CrepRun pickup
            </button>
          </div>

          {method === 'dropoff' ? (
            <>
              <div className="qb-label">Drop-off day · Shop 19, Pristine Plaza</div>
              <div className="qb-days">
                {days.map((d, i) => (
                  <button type="button" key={d} className={`qb-day${d === day ? ' on' : ''}`} onClick={() => setDay(d)}>
                    <span>{i === 0 ? 'Today' : weekday(d)}</span>
                    <strong>{Number(d.slice(8))}</strong>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="qb-label" htmlFor="qb-zone">
                Your area
              </label>
              <select id="qb-zone" className="qb-input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="">Choose your area…</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.areas.split(',').slice(0, 3).join(', ')}… · {formatPrice(z.rate_cents)}
                  </option>
                ))}
              </select>
              {zone && pickupDate && (
                <p className="qb-hint">
                  We collect in {zone.name} on <strong>{prettyDate(pickupDate)}</strong> and bring them back clean. {formatPrice(zone.rate_cents)} round
                  trip. Areas: {zone.areas}.
                </p>
              )}
              <p className="qb-hint">Area not listed? WhatsApp us and we&apos;ll see what we can do.</p>
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <div className="qb-grid">
            <input className="qb-input" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
            <input
              className="qb-input"
              placeholder="Phone / WhatsApp"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Phone"
            />
          </div>
          <input
            className="qb-input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <p className="qb-hint" style={{ marginTop: -4 }}>
            We&apos;ll email your booking and a link to create your account (track orders, earn points).
          </p>
          <input
            className="qb-input"
            placeholder="Which pair? e.g. white AF1s (optional)"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            maxLength={120}
            aria-label="Which pair"
          />
          <textarea
            className="qb-input"
            placeholder="Anything we should know? (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            aria-label="Notes"
          />
        </>
      )}

      {error && (
        <div className="qb-error" role="alert">
          {error}
        </div>
      )}

      <div className="qb-foot">
        <div className="qb-total">
          <span>
            {pairs > 1 ? `${pairs} pairs · ` : ''}
            {date && step > 0 ? `${method === 'pickup' ? 'Pickup' : 'Drop-off'} ${weekday(date)} · ` : ''}Total
          </span>
          <strong>{total === null ? 'Quote' : formatPrice(total)}</strong>
        </div>
        <div className="qb-nav">
          {step > 0 && (
            <button type="button" className="qb-back" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button type="button" className="qb-next" onClick={next}>
              Continue →
            </button>
          ) : (
            <button type="submit" className="qb-next" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          )}
        </div>
      </div>
      <p className="qb-small">Pay cash or bank transfer at the shop. No payment online.</p>
    </form>
  );
}
