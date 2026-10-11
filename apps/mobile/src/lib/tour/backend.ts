import { serviceKind, type OrderStatus } from '@clean-crep/shared';
import { emitTourChange, TOUR_EMAIL } from './state';

// The sample backend behind Tour mode: answers the app's Supabase calls (auth,
// PostgREST tables, RPCs, Storage signing) from memory, the way the real
// database would. A booking made on the tour moves itself along (received →
// cleaning → ready) over a couple of minutes so the whole journey can be seen.

const UID = '7a5e0000-0000-4000-8000-00000000c0de';
const DAY = 864e5;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const isoDay = (days: number) => ago(days).slice(0, 10);
const SHOP = 'Shop 19, Pristine Plaza';

const user = {
  id: UID,
  aud: 'authenticated',
  role: 'authenticated',
  email: TOUR_EMAIL,
  app_metadata: { provider: 'email' },
  user_metadata: { name: 'Ana Brown' },
  created_at: ago(400),
};

const services = ([
  ['s1', 'Sneaker Clean', 200000, 'Full clean, deodorize, and wipe-down. Looking fresh. Best for: Air Force 1s, Jordans, Dunks, Vans and everyday sneakers.', 'pkg', false, 1, 1, 2],
  ['s2', 'Clarks Clean', 350000, 'Deep clean, conditioning and restoration for your Clarks. Best for: Clarks Originals, Desert Boots and Wallabees.', 'star', true, 2, 2, 3],
  ['s3', 'Sole Refresh', 150000, 'Sole yellowing, oxidation removal and sole whitening. Best for: yellowed soles, oxidized AF1s and vintage Jordans.', 'check', false, 3, 1, 3],
  ['s4', 'Standard Cap Clean', 150000, 'Cotton, polyester, dad caps.', 'pkg', false, 40, 1, 2],
  ['s5', 'Premium Cap Clean', 250000, 'Wool, structured, fitted. Hand washed and reshaped on a form.', 'pkg', false, 41, 1, 2],
  ['s6', 'Bucket Hat', 180000, 'All materials.', 'pkg', false, 42, 1, 2],
] as [string, string, number, string, string, boolean, number, number, number][]).map(([id, name, price_cents, description, icon, popular, sort_order, credit_cost, turnaround_days]) => ({
  id, name, price_cents, description, icon, popular, sort_order, credit_cost, turnaround_days,
  note: 'JMD', active: true, location_id: 'loc1', currency: 'JMD',
}));
const svc = (id: string) => services.find((s) => s.id === id)!;

const addOns = ([
  ['a1', 'deep-clean', 'Deep Clean Upgrade', 'addon', 100000, 'For heavy stains and deep dirt.', 1],
  ['a2', 'sole-refresh', 'Sole Refresh', 'addon', 150000, 'Whitens yellowed, oxidized soles. Adds ~3 days (sun-dried).', 2],
  ['a3', 'suede-revive-kit', 'Suede Revive Kit', 'kit', 400000, 'Keep suede and Clarks fresh between cleans.', 10],
  ['a4', 'sole-refresh-kit', 'Sole Refresh Kit', 'kit', 400000, 'Keep soles white at home.', 11],
] as [string, string, string, string, number, string, number][]).map(([id, slug, name, kind, price_cents, description, sort_order]) => ({ id, slug, name, kind, price_cents, description, sort_order, active: true }));

const zones = ([
  ['z1', 'Zone 1', 'Half Way Tree, New Kingston, Cross Roads, Vineyard Town, Trafalgar', 'Tuesday', 150000, 1],
  ['z2', 'Zone 2', 'Liguanea, Mona, Papine, Barbican, Hope Road, Beverly Hills', 'Wednesday', 200000, 2],
  ['z3', 'Zone 3', 'Constant Spring, Manor Park, Stony Hill, Golden Spring, Red Hills', 'Thursday', 300000, 3],
] as [string, string, string, string, number, number][]).map(([id, name, areas, pickup_day, rate_cents, sort_order]) => ({
  id, name, areas, pickup_day, rate_cents, delivery_rate_cents: rate_cents / 2, sort_order, active: true, location_id: 'loc1',
}));

const plans = ([
  ['pl1', 'fresh', 'Fresh', 500000, 3, 1, 1, ['3 cleans a month (a Clarks clean uses 2)', 'Book any day, no queue', '1 unused clean rolls over', 'Cancel any time']],
  ['pl2', 'sneakerhead', 'Sneakerhead', 800000, 5, 2, 1, ['5 cleans a month', 'Priority turnaround', '2 unused cleans roll over', '10% off kits and add-ons']],
  ['pl3', 'household', 'Household', 1250000, 8, 2, 4, ['8 cleans a month shared by up to 4 people', 'Everyone gets their own Vault', '2 unused cleans roll over']],
] as [string, string, string, number, number, number, number, string[]][]).map(([id, slug, name, price_cents, credits_per_month, rollover_max, max_household, perks], i) => ({
  id, slug, name, price_cents, credits_per_month, rollover_max, max_household, perks, active: true, sort_order: i + 1,
}));
const planOf = (slug: string) => {
  const p = plans.find((x) => x.slug === slug) ?? plans[1];
  return { slug: p.slug, name: p.name, price_cents: p.price_cents, credits_per_month: p.credits_per_month, rollover_max: p.rollover_max, max_household: p.max_household, perks: p.perks };
};

type Row = Record<string, unknown>;
type Ev = { status: OrderStatus; created_at: string };

interface State {
  customer: Row;
  pairs: Row[];
  pairEvents: Row[];
  orders: Row[];
  photos: Row[];
  notifications: Row[];
  membership: Row | null;
  nextNumber: number;
}

function seed(): State {
  const order = (
    n: number,
    o: { item: string; service: string; status: OrderStatus; method: 'dropoff' | 'pickup'; days: number; pair: string | null; addOns?: string[]; zone?: string; credit?: boolean }
  ): Row => {
    const s = svc(o.service);
    const extras = (o.addOns ?? []).map((id) => addOns.find((a) => a.id === id)!).map((a) => ({ id: a.id, name: a.name, kind: a.kind, price_cents: a.price_cents }));
    const zone = o.zone ? zones.find((z) => z.id === o.zone)! : null;
    if (zone) extras.push({ id: zone.id, name: `CrepRun ${zone.name} (${zone.pickup_day})`, kind: 'delivery', price_cents: zone.rate_cents });
    const total = extras.reduce((t, a) => t + (a.price_cents as number), o.credit ? 0 : s.price_cents);
    const steps: OrderStatus[] = ['received', 'in_progress', 'ready_for_pickup', 'completed'];
    const events: Ev[] = steps.slice(0, steps.indexOf(o.status) + 1).map((st, i) => ({ status: st, created_at: ago(o.days - i * 0.6) }));
    return {
      id: `o${n}`, order_number: `CC-0${n}`, customer_id: UID, service_id: s.id, location_id: 'loc1', item_name: o.item, status: o.status,
      drop_method: o.method, scheduled_date: isoDay(o.days), notes: null, price_cents: total, add_ons: extras, zone_id: o.zone ?? null,
      currency: 'JMD', source: 'app', pair_id: o.pair, credits_used: o.credit ? s.credit_cost : 0, created_at: ago(o.days + 0.1), updated_at: ago(0),
      events,
    };
  };
  const pair = (id: string, p: Row): Row => ({
    id, customer_id: UID, guest_key: null, category: 'sneaker', brand: null, model: null, colorway: null, size: null, nickname: null,
    est_value_cents: null, passport_public: true, created_at: ago(200), updated_at: ago(1), ...p,
  });
  return {
    customer: { id: UID, name: 'Ana Brown', email: TOUR_EMAIL, phone: '876-555-0101', loyalty_points: 340, member_since: isoDay(400) },
    pairs: [
      pair('p1', { brand: 'Nike', model: 'Air Force 1', colorway: 'Triple White', size: '10', nickname: 'AF1s', passport_code: 'K7Q4M2XR' }),
      pair('p2', { category: 'clarks', brand: 'Clarks', model: 'Wallabee', colorway: 'Sand Suede', size: '9', passport_code: 'W9HN3TQ6' }),
      pair('p3', { brand: 'Jordan', model: '1 Retro', colorway: 'Bred', size: '10.5', passport_code: 'R2ZD8MPA' }),
      pair('p4', { brand: 'New Balance', model: '550', colorway: 'White Green', size: '10', passport_code: 'B5XK9HC3', created_at: ago(20) }),
      pair('p5', { category: 'cap', brand: null, model: 'Washed Dad Cap', colorway: 'Charcoal', size: 'One size', passport_code: 'C4PN7E2R' }),
    ],
    pairEvents: [
      { pair_id: 'p1', kind: 'grade', order_id: 'o158', created_at: ago(6), data: { stage: 'before', score: 4, summary: 'Heavy grime on the midsoles and creasing on the toe box.', issues: ['dirty midsoles', 'scuffed toe'] } },
      { pair_id: 'p1', kind: 'grade', order_id: 'o158', created_at: ago(5), data: { stage: 'after', score: 9, summary: 'Uppers and midsoles bright white again; light creasing remains.', issues: ['light creasing'] } },
    ],
    orders: [
      order(163, { item: 'Washed Dad Cap', service: 's4', status: 'ready_for_pickup', method: 'pickup', days: 2, pair: 'p5', zone: 'z2', credit: true }),
      order(162, { item: 'Clarks Wallabee', service: 's2', status: 'in_progress', method: 'dropoff', days: 1, pair: 'p2', addOns: ['a1'] }),
      order(158, { item: 'Nike Air Force 1', service: 's1', status: 'completed', method: 'dropoff', days: 6, pair: 'p1', addOns: ['a1'] }),
      order(141, { item: 'Jordan 1 Retro', service: 's3', status: 'completed', method: 'pickup', days: 34, pair: 'p3', zone: 'z1' }),
      order(118, { item: 'Nike Air Force 1', service: 's1', status: 'completed', method: 'dropoff', days: 48, pair: 'p1' }),
      order(102, { item: 'Clarks Wallabee', service: 's2', status: 'completed', method: 'dropoff', days: 70, pair: 'p2' }),
    ],
    // Sample photos (Unsplash, free licence), resolved by lib/tour/photos.ts.
    photos: [
      { id: 'ph1', order_id: 'o158', kind: 'before', storage_path: 'o158/af1-before', created_at: ago(6) },
      { id: 'ph2', order_id: 'o158', kind: 'after', storage_path: 'o158/af1-after', created_at: ago(5) },
      { id: 'ph3', order_id: 'o141', kind: 'before', storage_path: 'o141/j1-before', created_at: ago(34) },
      { id: 'ph4', order_id: 'o141', kind: 'after', storage_path: 'o141/j1-after', created_at: ago(33) },
      { id: 'ph5', order_id: 'o163', kind: 'after', storage_path: 'o163/cap-after', created_at: ago(1) },
    ],
    notifications: [
      { id: 'n1', customer_id: UID, order_id: 'o163', type: 'ready', title: 'Ready for Delivery', body: 'Your Washed Dad Cap is clean. CrepRun brings it back on your zone day.', read: false, created_at: ago(0.03) },
      { id: 'n2', customer_id: UID, order_id: 'o162', type: 'progress', title: 'In Progress', body: 'Your Clarks Wallabee are being cleaned now.', read: false, created_at: ago(0.4) },
      { id: 'n3', customer_id: UID, order_id: null, type: 'promo', title: 'Due for a clean', body: 'Your Jordan 1 Retro are due a clean 👟 Book again and keep them fresh.', read: false, created_at: ago(1.2) },
      { id: 'n4', customer_id: UID, order_id: null, type: 'promo', title: 'Use your care credits', body: 'You have 3 care credits. 1 expires on the 20th. Book a clean this week.', read: true, created_at: ago(3) },
      { id: 'n5', customer_id: UID, order_id: 'o158', type: 'complete', title: 'Order Completed', body: 'Your Nike Air Force 1 are fresh again. Thanks for choosing Clean Crep!', read: true, created_at: ago(5) },
    ],
    membership: {
      id: 'm1', status: 'active', is_owner: true, payment_ref: 'CC7F3A2', current_period_start: isoDay(9), current_period_end: isoDay(-21), balance: 3,
      plan: planOf('sneakerhead'), household: [],
      ledger: [
        { delta: -1, reason: 'redeem', note: 'CC-0163', created_at: ago(2) },
        { delta: 4, reason: 'grant', note: 'This month', created_at: ago(9) },
      ],
    },
    nextNumber: 164,
  };
}

let db = seed();

/** A fresh tour every time it starts. */
export function resetTour() {
  db = seed();
}

// ---- Bookings made on the tour move themselves along -------------------------

const STAGES: { status: OrderStatus; after: number }[] = [
  { status: 'received', after: 0 },
  { status: 'in_progress', after: 40_000 },
  { status: 'ready_for_pickup', after: 110_000 },
];

const fmtDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
};

function note(o: Row, status: OrderStatus, at: string): Row {
  const item = o.item_name as string;
  const cap = serviceKind((svc(o.service_id as string) ?? {}).name) === 'headwear';
  const pickup = o.drop_method === 'pickup';
  const is = cap ? 'is' : 'are';
  const base = { id: `n-${o.id}-${status}`, customer_id: UID, order_id: o.id, read: false, created_at: at };
  if (status === 'received') {
    return { ...base, type: 'received', title: 'Order Received', body: pickup ? `We got your ${item} booking. CrepRun collects on ${fmtDay(o.scheduled_date as string)}.` : `We got your ${item} booking. Drop-off on ${fmtDay(o.scheduled_date as string)} at ${SHOP}.` };
  }
  if (status === 'in_progress') return { ...base, type: 'progress', title: 'In Progress', body: `Your ${item} ${is} being cleaned now.` };
  return pickup
    ? { ...base, type: 'ready', title: 'Ready for Delivery', body: `Your ${item} ${is} clean. CrepRun brings ${cap ? 'it' : 'them'} back on your zone day.` }
    : { ...base, type: 'ready', title: 'Ready for Pickup', body: `Your ${item} ${is} clean and waiting at ${SHOP}.` };
}

/** Moves tour bookings along; true if anything changed. */
export function advance(): boolean {
  let changed = false;
  const now = Date.now();
  for (const o of db.orders) {
    if (!o.tour_booked_at) continue;
    const age = now - (o.tour_booked_at as number);
    const reached = STAGES.filter((s) => age >= s.after);
    const events = o.events as Ev[];
    for (const s of reached) {
      if (events.some((e) => e.status === s.status)) continue;
      const at = new Date((o.tour_booked_at as number) + s.after).toISOString();
      events.push({ status: s.status, created_at: at });
      o.status = s.status;
      db.notifications.unshift(note(o, s.status, at));
      changed = true;
    }
  }
  return changed;
}

// ---- Request handling ----------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined || status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function session() {
  return {
    access_token: 'tour-access-token',
    token_type: 'bearer',
    expires_in: 3600 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
    refresh_token: 'tour-refresh-token',
    user,
  };
}

/** PostgREST filters we use: col=eq.x, col=in.(a,b), col=is.null. */
function filters(params: URLSearchParams): ((r: Row) => boolean)[] {
  const out: ((r: Row) => boolean)[] = [];
  params.forEach((v, k) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) return;
    if (v.startsWith('eq.')) out.push((r) => String(r[k]) === v.slice(3));
    else if (v.startsWith('in.(')) {
      const set = v.slice(4, -1).split(',').map((x) => x.replace(/^"|"$/g, ''));
      out.push((r) => set.includes(String(r[k])));
    } else if (v === 'is.null') out.push((r) => r[k] == null);
  });
  return out;
}

const withService = (o: Row) => ({ ...o, service: svc(o.service_id as string) ?? null });

function pairsView(): Row[] {
  return db.pairs.map((p) => ({
    ...p,
    cleans: db.orders
      .filter((o) => o.pair_id === p.id)
      .map((o) => ({ id: o.id, order_number: o.order_number, created_at: o.created_at, status: o.status, drop_method: o.drop_method, service: { name: svc(o.service_id as string)?.name } })),
    events: db.pairEvents.filter((e) => e.pair_id === p.id).map(({ kind, order_id, data, created_at }) => ({ kind, order_id, data, created_at })),
  }));
}

function nextShopDay(pickupDay: string): string {
  const d = new Date();
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    if (d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === pickupDay.toLowerCase()) break;
  }
  return d.toISOString().slice(0, 10);
}

function placeOrder(b: Row): Row {
  const s = svc(b.service_id as string);
  const zone = b.drop_method === 'pickup' ? zones.find((z) => z.id === b.zone_id) : undefined;
  const extras = ((b.add_ons as { id: string }[]) ?? [])
    .map((x) => addOns.find((a) => a.id === x.id))
    .filter((a): a is (typeof addOns)[number] => !!a)
    .map((a) => ({ id: a.id, name: a.name, kind: a.kind, price_cents: a.price_cents }));
  if (zone) extras.push({ id: zone.id, name: `CrepRun ${zone.name} (${zone.pickup_day})`, kind: 'delivery', price_cents: zone.rate_cents });
  const m = db.membership;
  const useCredit = !!b.redeem_credit && m?.status === 'active' && (m.balance as number) >= s.credit_cost;
  const total = extras.reduce((t, a) => t + (a.price_cents as number), useCredit ? 0 : s.price_cents);
  const n = db.nextNumber++;
  const now = Date.now();
  const o: Row = {
    id: `o${n}`, order_number: `CC-0${n}`, customer_id: UID, service_id: s.id, location_id: 'loc1', item_name: b.item_name, status: 'received',
    drop_method: b.drop_method, scheduled_date: zone ? nextShopDay(zone.pickup_day) : b.scheduled_date, notes: b.notes ?? null, price_cents: total,
    add_ons: extras, zone_id: zone?.id ?? null, currency: 'JMD', source: 'app', pair_id: b.pair_id ?? null, credits_used: useCredit ? s.credit_cost : 0,
    created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(), events: [], tour_booked_at: now,
  };
  if (useCredit && m) {
    m.balance = (m.balance as number) - s.credit_cost;
    (m.ledger as Row[]).unshift({ delta: -s.credit_cost, reason: 'redeem', note: o.order_number, created_at: o.created_at });
  }
  // Same as vault_pair_for_order (0027): a booking lands on the item it names.
  if (!o.pair_id) {
    const cat = serviceKind(s.name) === 'headwear' ? 'cap' : /clarks/i.test(s.name) ? 'clarks' : 'sneaker';
    const name = String(b.item_name ?? '').toLowerCase();
    const hit = db.pairs.find((p) => [p.nickname, [p.brand, p.model].filter(Boolean).join(' '), p.model].some((x) => x && String(x).toLowerCase() === name));
    if (hit) o.pair_id = hit.id;
    else if (name && name !== s.name.toLowerCase()) {
      const id = `p${now}`;
      db.pairs.unshift({ id, customer_id: UID, guest_key: null, category: cat, brand: null, model: b.item_name, colorway: null, size: null, nickname: null, est_value_cents: null, passport_code: `T${String(n).padStart(7, '0')}`, passport_public: true, created_at: o.created_at, updated_at: o.created_at });
      o.pair_id = id;
    }
  }
  db.orders.unshift(o);
  advance();
  return o;
}

async function readBody(init?: RequestInit): Promise<unknown> {
  if (!init?.body || typeof init.body !== 'string') return null;
  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

/** Answers one Supabase request from the tour's sample data. */
export async function tourFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const path = url.pathname;
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);
  const one = (headers.get('Accept') ?? '').includes('vnd.pgrst.object');
  const wantRows = (headers.get('Prefer') ?? '').includes('return=representation');
  const body = (await readBody(init)) as Row | Row[] | null;
  advance();

  // Auth
  if (path.startsWith('/auth/v1/')) {
    if (path === '/auth/v1/token' || path === '/auth/v1/signup') return json(session());
    if (path === '/auth/v1/user') return json(user);
    if (path === '/auth/v1/logout') return json(undefined, 204);
    return json({});
  }

  // Storage: hand back "tour:<photo>" for lib/tour/photos.ts to turn into an image URL.
  if (path.startsWith('/storage/v1/object/sign/')) {
    const paths = ((body as Row | null)?.paths as string[]) ?? [];
    return json(paths.map((p) => ({ path: p, signedURL: `/tour:${p.split('/').pop()}`, error: null })));
  }

  // RPCs
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = path.slice('/rest/v1/rpc/'.length);
    if (fn === 'my_features') return json(['vault', 'membership', 'passport', 'condition_grade', 'smart_nudges']);
    if (fn === 'my_membership') return json(db.membership);
    if (fn === 'join_membership') {
      const slug = String((body as Row | null)?.p_plan_slug ?? 'fresh');
      db.membership = { id: 'm1', status: 'pending', is_owner: true, payment_ref: 'CC7F3A2', current_period_start: null, current_period_end: null, balance: 0, plan: planOf(slug), household: [], ledger: [] };
      return json(db.membership);
    }
    if (fn === 'feature_enabled') return json(true);
    return json(null);
  }

  const table = path.replace('/rest/v1/', '');
  const keep = filters(url.searchParams);
  const match = (r: Row) => keep.every((f) => f(r));
  const reply = (rows: Row[]) => (one ? (rows[0] ? json(rows[0]) : json({ code: 'PGRST116', message: 'No rows' }, 406)) : json(rows));

  if (method === 'GET') {
    let rows: Row[] = [];
    if (table === 'customers') rows = [db.customer];
    else if (table === 'services') rows = services;
    else if (table === 'add_ons') rows = addOns;
    else if (table === 'zones') rows = zones;
    else if (table === 'membership_plans') rows = plans;
    else if (table === 'orders') rows = db.orders.map(withService);
    else if (table === 'pairs') rows = pairsView();
    else if (table === 'order_photos') rows = db.photos;
    else if (table === 'notifications') rows = db.notifications;
    else if (table === 'pair_events') rows = db.pairEvents;
    return reply(rows.filter(match));
  }

  if (method !== 'GET') setTimeout(emitTourChange, 0);

  if (method === 'POST') {
    const list = Array.isArray(body) ? body : body ? [body] : [];
    let made: Row[] = [];
    if (table === 'orders') made = list.map(placeOrder).map(withService);
    else if (table === 'pairs') {
      made = list.map((p) => ({ id: `p${Date.now()}`, guest_key: null, passport_code: `V${Date.now().toString(36).toUpperCase().slice(-7)}`, passport_public: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p }));
      db.pairs.unshift(...made);
    } else if (table === 'pair_events') {
      made = list.map((e) => ({ ...e, created_at: new Date().toISOString() }));
      db.pairEvents.push(...made);
    }
    return wantRows ? json(made, 201) : json(undefined, 201);
  }

  if (method === 'PATCH') {
    const src = table === 'notifications' ? db.notifications : table === 'pairs' ? db.pairs : table === 'customers' ? [db.customer] : [];
    const hit = src.filter(match);
    hit.forEach((r) => Object.assign(r, body, { updated_at: new Date().toISOString() }));
    return wantRows ? json(hit) : json(undefined, 204);
  }

  if (method === 'DELETE' && table === 'pairs') {
    // Same rule as the live policy (0028): only items with no care history.
    const gone = db.pairs.filter((p) => match(p) && !db.orders.some((o) => o.pair_id === p.id));
    db.pairs = db.pairs.filter((p) => !gone.includes(p));
    return wantRows ? json(gone.map((p) => ({ id: p.id }))) : json(undefined, 204);
  }

  return json(wantRows ? [] : undefined, wantRows ? 200 : 204);
}
