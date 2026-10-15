// Fake Supabase for the phone walkthrough (scripts/sim): a signed-in customer who is
// also staff, with orders (drop-off + CrepRun), Vault items (sneakers, Clarks, a cap),
// Club plans, inbox, the live menu (incl. caps & hats), add-ons and CrepRun zones.
// node scripts/sim/mock-supabase.js   -> http://127.0.0.1:54321
const http = require('http');
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
const fs = require('fs');
const IMG = (k) => fs.readFileSync(require('path').join(__dirname, '../../../web/public/assets/work', `${k}-1.jpg`));
const events = [
  { kind: 'grade', order_id: 'o141', created_at: ago(6), data: { stage: 'before', score: 4, summary: 'Heavy grime on the midsoles and toe box creasing.', issues: ['dirty midsoles', 'scuffed toe'] } },
  { kind: 'grade', order_id: 'o141', created_at: ago(5), data: { stage: 'after', score: 9, summary: 'Uppers and midsoles bright white again; light creasing remains.', issues: ['light creasing'] } },
];
const order = { id: 'o200', order_number: 'CC-0160', item_name: '1x AF1s', status: 'in_progress', drop_method: 'dropoff', scheduled_date: new Date().toISOString().slice(0,10), price_cents: 200000, add_ons: [], service: { name: 'Sneaker Clean' }, customer: { name: 'Ana Brown', phone: '8765550101' }, pair_id: 'p1', pair: { id: 'p1', brand: 'Nike', model: 'Air Force 1', nickname: 'AF1s', category: 'sneaker', passport_code: 'K7Q4M2XR' } };
const photos = [ { id: 'ph2', kind: 'after', storage_path: 'o200/after-2.jpg', created_at: ago(0) }, { id: 'ph1', kind: 'before', storage_path: 'o200/before-1.jpg', created_at: ago(0.1) } ];
const orderEvents = [];
const order2 = { id: 'o201', order_number: 'CC-0161', item_name: 'New Era 59FIFTY', status: 'ready_for_pickup', drop_method: 'pickup', scheduled_date: new Date(Date.now()-2*864e5).toISOString().slice(0,10), price_cents: 450000, add_ons: [{ id: 'z2', name: 'CrepRun Zone 2 (Wednesday)', kind: 'delivery', price_cents: 200000 }], service: { name: 'Premium Cap Clean', turnaround_days: 2 }, events: [], customer: { name: 'Ana Brown', phone: '8765550101' } };
let mode = 'none';
const plansData = [
  { id: 'pl1', slug: 'fresh', name: 'Fresh', price_cents: 500000, credits_per_month: 3, rollover_max: 1, max_household: 1, active: true, sort_order: 1, perks: ['3 cleans a month (a Clarks clean uses 2)', 'Book any day, no queue', '1 unused clean rolls over', 'Cancel any time'] },
  { id: 'pl2', slug: 'sneakerhead', name: 'Sneakerhead', price_cents: 800000, credits_per_month: 5, rollover_max: 2, max_household: 1, active: true, sort_order: 2, perks: ['5 cleans a month', 'Priority turnaround', '2 unused cleans roll over', '10% off kits and add-ons'] },
  { id: 'pl3', slug: 'household', name: 'Household', price_cents: 1250000, credits_per_month: 8, rollover_max: 2, max_household: 4, active: true, sort_order: 3, perks: ['8 cleans a month shared by up to 4 people', 'Everyone gets their own Vault', '2 unused cleans roll over'] },
];
const planOf = (pl) => ({ slug: pl.slug, name: pl.name, price_cents: pl.price_cents, credits_per_month: pl.credits_per_month, rollover_max: pl.rollover_max, max_household: pl.max_household, perks: pl.perks });
const myMembership = () => mode === 'none' ? null : mode === 'pending'
  ? { id: 'm1', status: 'pending', is_owner: true, payment_ref: 'CC7F3A2', current_period_start: null, current_period_end: null, balance: 0, plan: planOf(plansData[1]), household: [], ledger: [] }
  : { id: 'm1', status: 'active', is_owner: true, payment_ref: 'CC7F3A2', current_period_start: ago(9).slice(0,10), current_period_end: ago(-21).slice(0,10), balance: 3, plan: planOf(plansData[1]), household: [],
      ledger: [{ delta: -1, reason: 'redeem', note: 'CC-0161', created_at: ago(2) }, { delta: 4, reason: 'grant', note: 'October 2026', created_at: ago(9) }] };
const services = [
  { id: 's1', name: 'Sneaker Clean', price_cents: 200000, note: 'JMD', description: 'Full clean, deodorize, and wipe-down. Looking fresh. Best for: Air Force 1s, Jordans, Dunks, Vans and everyday sneakers.', icon: 'pkg', popular: false, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 1, sort_order: 1, turnaround_days: 2 },
  { id: 's2', name: 'Clarks Clean', price_cents: 350000, note: 'JMD', description: 'Deep clean, conditioning and restoration for your Clarks. Best for: Clarks Originals, Desert Boots and Wallabees.', icon: 'star', popular: true, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 2, sort_order: 2, turnaround_days: 3 },
  { id: 's3', name: 'Sole Refresh', price_cents: 150000, note: 'JMD', description: 'Sole yellowing, oxidation removal and sole whitening. Best for: yellowed soles, oxidized AF1s and vintage Jordans.', icon: 'check', popular: false, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 1, sort_order: 3, turnaround_days: 3 },
  { id: 's4', name: 'Standard Cap Clean', price_cents: 150000, note: '24-48 hrs', description: 'Cotton, polyester, dad caps.', icon: 'pkg', popular: false, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 1, sort_order: 40, turnaround_days: 2 },
  { id: 's5', name: 'Premium Cap Clean', price_cents: 250000, note: '24-48 hrs', description: 'Wool, structured, fitted -- hand washed and reshaped on a form.', icon: 'pkg', popular: false, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 1, sort_order: 41, turnaround_days: 2 },
  { id: 's6', name: 'Bucket Hat', price_cents: 180000, note: '24-48 hrs', description: 'All materials.', icon: 'pkg', popular: false, active: true, location_id: 'l1', currency: 'JMD', credit_cost: 1, sort_order: 42, turnaround_days: 2 },
];
const staffMembers = [
  { id: 'm2', status: 'pending', payment_ref: 'CC9B41D', current_period_end: null, created_at: ago(0), plan: plansData[0], customer: { name: 'Marcus Reid', email: 'marcus@example.com', phone: '876-555-0142' } },
  { id: 'm1', status: 'active', payment_ref: 'CC7F3A2', current_period_end: ago(-21).slice(0,10), created_at: ago(9), plan: plansData[1], customer: { name: 'Ana Brown', email: 'ana@example.com', phone: '876-555-0101' } },
  { id: 'm3', status: 'active', payment_ref: 'CC22E90', current_period_end: ago(-4).slice(0,10), created_at: ago(26), plan: plansData[0], customer: { name: 'Dwayne Clarke', email: 'dwayne@example.com', phone: '876-555-0177' } },
  { id: 'm4', status: 'paused', payment_ref: 'CC5D0C8', current_period_end: ago(3).slice(0,10), created_at: ago(40), plan: plansData[0], customer: { name: 'Keisha Lewis', email: 'keisha@example.com', phone: '876-555-0190' } },
];
const ledgerRows = [{ membership_id: 'm1', delta: 4 }, { membership_id: 'm1', delta: -1 }, { membership_id: 'm3', delta: 3 }, { membership_id: 'm3', delta: -2 }, { membership_id: 'm4', delta: 1 }];
const uid = '00000000-0000-0000-0000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'ana@example.com', app_metadata: {}, user_metadata: { name: 'Ana Brown' }, created_at: '2026-01-01T00:00:00Z' };
const now = new Date().toISOString();
const flags = [
  ['condition_grade', 'AI condition grade at intake and Restoration Score after the clean'],
  ['fresh_pairs', 'Fresh Pairs: consignment resale of passport-verified pairs'],
  ['membership', 'Clean Crep Club: monthly plans with care credits'],
  ['passport', 'Crep Passport: public QR page per pair (care history, grades, verified by Clean Crep)'],
  ['smart_nudges', 'Weather / wear / seasonal care reminders'],
  ['vault', 'Digital Vault: every pair a customer has had cleaned, with its care timeline'],
].map(([key, description]) => ({ key, description, enabled_for_all: false, updated_at: now }));
const clean = (n, d, status, service) => ({ id: `o${n}`, order_number: `CC-0${n}`, created_at: ago(d), status, service: { name: service } });
const pair = (id, o) => ({ id, customer_id: uid, guest_key: null, category: 'sneaker', brand: null, model: null, colorway: null, size: null, nickname: null, est_value_cents: null, passport_public: true, created_at: ago(200), updated_at: now, ...o });
const pairs = [
  pair('p1', { events, brand: 'Nike', model: 'Air Force 1', colorway: 'Triple White', size: '10', nickname: 'AF1s', passport_code: 'K7Q4M2XR', cleans: [clean(141, 6, 'completed', 'Sneaker Clean'), clean(118, 48, 'completed', 'Sneaker Clean'), clean(87, 110, 'completed', 'Sneaker Clean')] }),
  pair('p2', { category: 'clarks', brand: 'Clarks', model: 'Wallabee', colorway: 'Sand Suede', size: '9', nickname: 'Clarks', passport_code: 'W9HN3TQ6', cleans: [clean(152, 1, 'in_progress', 'Clarks Clean'), clean(102, 70, 'completed', 'Clarks Clean')] }),
  pair('p3', { brand: 'Jordan', model: '4 Retro', colorway: 'Bred', size: '10.5', passport_code: 'R2ZD8MPA', cleans: [clean(130, 30, 'completed', 'Sole Refresh')] }),
  pair('p4', { brand: 'New Balance', model: '550', colorway: 'White Green', passport_code: 'B5XK9HC3', cleans: [] }),
  pair('p5', { category: 'cap', brand: 'New Era', model: '59FIFTY', colorway: 'Yankees Navy', size: '7 3/8', passport_code: 'C4PN7E2R', cleans: [clean(158, 3, 'completed', 'Premium Cap Clean')] }),
];
const passport = { code: 'K7Q4M2XR', category: 'sneaker', brand: 'Nike', model: 'Air Force 1', colorway: 'Triple White', since: ago(110).slice(0, 10),
  showcase: { date: ago(6).slice(0, 10), service: 'Sneaker Clean', before: 'o141/before-1.jpg', after: 'o141/after-1.jpg' },
  cleans: [{ date: ago(110).slice(0, 10), service: 'Sneaker Clean', completed: true, photos: 2 }, { date: ago(48).slice(0, 10), service: 'Sneaker Clean', completed: true, photos: 2 }, { date: ago(6).slice(0, 10), service: 'Deep Clean', completed: true, photos: 4 }], events: events.map((e) => ({ kind: e.kind, date: e.created_at.slice(0, 10), data: e.data })) };
const testers = [{ flag_key: 'vault', user_id: 'c1' }, { flag_key: 'passport', user_id: 'c1' }];
const people = [{ id: 'c1', name: 'Ana Brown', email: 'ana@example.com' }];
http.createServer((req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  const p = req.url.split('?')[0];
  if (p === '/__mode') { mode = new URL(req.url, 'http://x').searchParams.get('m'); res.writeHead(200, h); return res.end('{}'); }
  if (p === '/v1/messages') {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const before = b.includes('Before cleaning');
      const text = before ? '{"score": 4, "summary": "Heavy grime on the midsoles and scuffing on the toe box.", "issues": ["dirty midsoles", "toe scuffs", "lace stains"]}' : '{"score": 9, "summary": "Uppers and midsoles bright white again; light creasing remains.", "issues": ["light creasing"]}';
      res.writeHead(200, h); res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
    });
    return;
  }
  if (p.startsWith('/storage/v1/object/sign/')) {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const paths = JSON.parse(b || '{}').paths || [];
      res.writeHead(200, h); res.end(JSON.stringify(paths.map((x) => ({ path: x, signedURL: `/object/img/${x.includes('before') ? 'before' : 'after'}`, error: null }))));
    });
    return;
  }
  if (p.startsWith('/storage/v1/object/')) {
    res.writeHead(200, { ...h, 'Content-Type': 'image/jpeg' }); return res.end(IMG(p.includes('before') ? 'before' : 'after'));
  }
  if (p === '/rest/v1/pair_events' && req.method === 'POST') {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const row = JSON.parse(b); orderEvents.push({ ...row, created_at: new Date().toISOString() });
      res.writeHead(201, h); res.end('');
    });
    return;
  }
  const single = (req.headers.accept || '').includes('vnd.pgrst.object');
  let body = [];
  if (p === '/auth/v1/user') body = user;
  else if (p === '/rest/v1/rpc/my_features') body = ['condition_grade', 'membership', 'passport', 'smart_nudges', 'vault'];
  else if (p === '/rest/v1/rpc/passport') body = passport;
  else if (p === '/rest/v1/staff') body = { id: uid, name: 'Geego' };
  else if (p === '/rest/v1/feature_flags') body = flags;
  else if (p === '/rest/v1/feature_flag_users') body = testers;
  else if (p === '/rest/v1/customers') body = single ? { id: uid, name: 'Ana Brown', email: 'ana@example.com', phone: null, loyalty_points: 320, member_since: ago(400) } : req.url.includes('id=eq.') ? [{ id: uid, name: 'Ana Brown', email: 'ana@example.com', phone: null, loyalty_points: 320, member_since: ago(400) }] : people;
  else if (p === '/rest/v1/pairs') { const m = req.url.match(/passport_code=eq\.([A-Z0-9]+)/); body = m ? pairs.filter((x) => x.passport_code === m[1]) : pairs; }
  else if (p === '/rest/v1/rpc/my_membership') body = myMembership();
  else if (p === '/rest/v1/rpc/join_membership') { mode = 'pending'; body = myMembership(); }
  else if (p === '/rest/v1/membership_plans') body = req.headers.referer && req.headers.referer.includes('3100') ? plansData : plansData.filter((x) => x.active);
  else if (p === '/rest/v1/memberships') body = staffMembers;
  else if (p === '/rest/v1/membership_credit_ledger') body = ledgerRows;
  else if (p === '/rest/v1/services') body = services;
  else if (p === '/rest/v1/add_ons') body = [
    ['a1','deep-clean','Deep Clean Upgrade','addon',100000,'For heavy stains and deep dirt.',1],
    ['a2','sole-refresh','Sole Refresh','addon',150000,'Whitens yellowed, oxidized soles. Adds ~3 days (sun-dried).',2],
    ['a3','suede-revive-kit','Suede Revive Kit','kit',400000,'Keep suede and Clarks fresh between cleans.',10],
    ['a4','sole-refresh-kit','Sole Refresh Kit','kit',400000,'Keep soles white at home.',11],
  ].map(([id,slug,name,kind,price_cents,description,sort_order]) => ({ id, slug, name, kind, price_cents, description, sort_order, active: true }));
  else if (p === '/rest/v1/zones') body = [
    ['z1','Zone 1','Half Way Tree, HWT, New Kingston, Cross Roads, Vineyard Town, Trafalgar','Tuesday',150000,1],
    ['z2','Zone 2','Liguanea, Mona, Papine, Barbican, Hope Road, Beverly Hills','Wednesday',200000,2],
    ['z3','Zone 3','Constant Spring, Manor Park, Stony Hill, Golden Spring, Red Hills','Thursday',300000,3],
  ].map(([id,name,areas,pickup_day,rate_cents,sort_order]) => ({ id, name, areas, pickup_day, rate_cents, delivery_rate_cents: rate_cents/2, sort_order, active: true, location_id: 'l1' }));
  else if (p === '/rest/v1/notifications') body = [
    { id: 'n1', customer_id: uid, type: 'promo', title: 'Due for a clean', body: 'Your Nike Air Force 1 are due a clean 👟 Book again and keep them fresh.', read: false, created_at: ago(0.02) },
    { id: 'n2', customer_id: uid, type: 'promo', title: 'Use your care credits', body: 'You have 3 care credits. 1 expire on 12 Oct. Book a clean this week.', read: false, created_at: ago(1) },
    { id: 'n3', customer_id: uid, type: 'ready', title: 'Still waiting for you', body: 'Your Jordan 4 Retro are clean and waiting at Shop 19, Pristine Plaza. Swing by this week.', read: true, created_at: ago(2) },
  ];
  else if (p === '/rest/v1/orders') body = single ? order : [order, order2];
  else if (p === '/rest/v1/order_photos') { const one = photos.find((x) => req.url.includes(`id=eq.${x.id}`)); body = one ? (single ? { ...one, order } : [{ ...one, order }]) : photos; }
  else if (p === '/rest/v1/pair_events') body = orderEvents;
  else if (p === '/rest/v1/rpc/feature_enabled') body = true;
  else if (p.startsWith('/rest/v1/rpc/')) body = null;
  else if (single) body = null;
  res.writeHead(200, h); res.end(JSON.stringify(body));
}).listen(54321, () => console.log('mock up'));
