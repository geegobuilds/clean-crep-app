// Phone walkthrough: the real app (Expo web build) in Chromium with the iPhone 15 Pro
// and Pixel 7 profiles (screen size, pixel density, touch), signed in and as a guest,
// through every section. Writes a screenshot per step and issues.txt (console errors,
// anything wider than the screen, "undefined"/"NaN"/"null" on screen).
//   node scripts/sim/walkthrough.js [outDir]      (default .sim/)
// Needs scripts/sim/mock-supabase.js and the web build on :8099 (see README.md).
const { chromium, devices } = require('@playwright/test');
const OUT = require('path').resolve(process.argv[2] ?? '.sim');
require('fs').mkdirSync(OUT, { recursive: true });
const EXE = process.env.PW_CHROMIUM ?? (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BASE = 'http://localhost:8099';
const session = { access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '00000000-0000-0000-0000-000000000001', email: 'ana@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };
const issues = [];

async function run(devName, signedIn, flow) {
  const d = devices[devName];
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: true, hasTouch: true, userAgent: d.userAgent });
  if (signedIn) await ctx.addInitScript((s) => localStorage.setItem('sb-127-auth-token', s), JSON.stringify(session));
  const p = await ctx.newPage();
  const tag = devName.replace(/\s+/g, '');
  let step = '';
  p.on('console', (m) => { if (m.type() === 'error') issues.push(`[${tag}] ${step}: console.error ${m.text().slice(0, 220)}`); });
  p.on('pageerror', (e) => issues.push(`[${tag}] ${step}: pageerror ${e.message.slice(0, 220)}`));
  const vis = (v, exact = true) => p.getByText(v, { exact }).and(p.locator('xpath=//*[not(ancestor-or-self::*[@aria-hidden="true"])]')).first();
  let n = 0;
  const snap = async (name) => {
    step = name;
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const w = window.innerWidth;
      const over = [...document.querySelectorAll('div,span,img')].filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return false;
        let q = el.parentElement; while (q) { const s = getComputedStyle(q); if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden') return false; q = q.parentElement; }
        return b.right > w + 2;
      }).length;
      const txt = document.body.innerText;
      const bad = (txt.match(/\b(undefined|NaN|null|\[object Object\])\b/g) || []);
      return { over, bad };
    });
    if (r.over) issues.push(`[${tag}] ${name}: ${r.over} element(s) overflow the screen width`);
    if (r.bad.length) issues.push(`[${tag}] ${name}: shows ${[...new Set(r.bad)].join(', ')}`);
    await p.screenshot({ path: `${OUT}/${tag}-${String(++n).padStart(2, '0')}-${name}.png` });
  };
  const scroll = async (px) => { await p.mouse.move(d.viewport.width / 2, d.viewport.height / 2); for (let i = 0; i < Math.round(px / 80); i++) { await p.mouse.wheel(0, 80); await p.waitForTimeout(30); } };
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 300000 }); await p.waitForTimeout(1500); };
  try { await flow({ p, vis, snap, scroll, go }); } catch (e) { issues.push(`[${tag}] ${step}: FLOW FAILED ${e.message.split('\n')[0]}`); await p.screenshot({ path: `${OUT}/${tag}-zz-failed.png` }); }
  await b.close();
}

const signedInFlow = async ({ p, vis, snap, scroll, go }) => {
  await go('/'); await snap('home');
  await scroll(500); await snap('home-scrolled');
  await go('/'); await vis('Creppie').click(); await snap('creppie-chat'); await p.getByLabel('Close chat').click();
  await go('/book'); await snap('book');
  await scroll(1400); await snap('book-caps');
  await vis('Premium Cap Clean').click(); await snap('book-cap-details');
  await vis(/^Pickup/).click(); await vis('Zone 2 · Wednesdays', false).click(); await snap('book-cap-pickup');
  await scroll(1600); await snap('book-cap-receipt');
  await vis('Confirm Booking').click(); await vis("You're booked.", false).waitFor(); await snap('booked-cap-pickup');
  await scroll(600); await snap('booked-cap-pickup-ticket');
  await go('/book'); await vis('Sneaker Clean').click(); await p.getByPlaceholder('e.g. Nike Air Force 1, Clarks Desert Boot').first().fill('Jordan 4 Bred');
  await vis('Confirm Booking').click(); await vis("You're booked.", false).waitFor(); await snap('booked-sneaker-dropoff');
  await go('/orders'); await snap('orders');
  await scroll(900); await snap('orders-list');
  await vis('New Era 59FIFTY', false).click(); await scroll(-900); await snap('orders-pickup-ticket');
  await go('/vault'); await snap('vault');
  await scroll(700); await snap('vault-grid');
  await p.getByTestId('vault-pair').last().click(); await snap('vault-cap-detail');
  await scroll(900); await snap('vault-cap-detail-2');
  await go('/club'); await snap('club');
  await go('/profile'); await snap('profile');
  await scroll(800); await snap('profile-settings');
  await go('/inbox'); await snap('inbox');
};
const guestFlow = async ({ p, vis, snap, scroll, go }) => {
  await go('/'); await snap('guest-home');
  await go('/sign-in'); await snap('signin');
  await vis("Don't have an account? Sign up", false).click(); await snap('signup');
  await go('/orders'); await snap('guest-orders');
  await go('/profile'); await snap('guest-profile');
};

(async () => {
  for (const dev of ['iPhone 15 Pro', 'Pixel 7']) {
    await run(dev, true, signedInFlow);
    await run(dev, false, guestFlow);
  }
  // The mock has no realtime socket, and sandboxes may block fonts/analytics: not app issues.
  const real = issues.filter((i) => !/realtime\/v1\/websocket|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/.test(i));
  require('fs').writeFileSync(`${OUT}/issues.txt`, real.join('\n') + '\n');
  console.log(real.length ? real.join('\n') : 'NO ISSUES');
  process.exitCode = real.length ? 1 : 0;
})();
