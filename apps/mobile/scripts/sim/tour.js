// Tour mode check: a guest taps "Take the tour", then walks every tab on the
// sample data, books a clean, and watches it move along. Tour state lives in
// memory, so this navigates by tapping (never page loads).
//   node scripts/sim/tour.js [outDir]   (web build on :8099 with EXPO_PUBLIC_TOUR=1)
const { chromium, devices } = require('@playwright/test');
const OUT = require('path').resolve(process.argv[2] ?? '.sim/tour');
require('fs').mkdirSync(OUT, { recursive: true });
const EXE = process.env.PW_CHROMIUM ?? (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const issues = [];
const netCalls = [];

(async () => {
  const d = devices['iPhone 15 Pro'];
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: true, hasTouch: true, userAgent: d.userAgent });
  const p = await ctx.newPage();
  let step = 'start';
  p.on('console', (m) => { if (m.type() === 'error') issues.push(`${step}: console.error ${m.text().slice(0, 200)}`); });
  p.on('pageerror', (e) => issues.push(`${step}: pageerror ${e.message.slice(0, 200)}`));
  p.on('request', (r) => { if (/:54321\/(rest|auth|storage)/.test(r.url()) && step !== 'start') netCalls.push(`${step}: ${r.method()} ${r.url().slice(0, 120)}`); });
  const vis = (v, exact = true) => p.getByText(v, { exact }).and(p.locator('xpath=//*[not(ancestor-or-self::*[@aria-hidden="true"])]')).first();
  let n = 0;
  const snap = async (name) => { step = name; await p.waitForTimeout(1100); const t = await p.evaluate(() => document.body.innerText); const bad = t.match(/\b(undefined|NaN|null|\[object Object\])\b/g); if (bad) issues.push(`${name}: shows ${[...new Set(bad)].join(', ')}`); await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const tab = async (name) => { await p.getByRole('tab', { name }).click(); await p.waitForTimeout(800); };
  const scroll = async (px) => { await p.mouse.move(d.viewport.width / 2, d.viewport.height / 2); for (let i = 0; i < Math.round(px / 80); i++) { await p.mouse.wheel(0, 80); await p.waitForTimeout(30); } };
  try {
    await p.goto('http://localhost:8099/sign-in', { waitUntil: 'networkidle', timeout: 300000 });
    await p.waitForTimeout(1500); await snap('sign-in');
    step = 'tour-start';
    await p.getByTestId('tour-start').click();
    await p.getByTestId('tour-banner').waitFor({ timeout: 15000 });
    await snap('home');
    await scroll(600); await snap('home-scrolled');
    await tab('Orders'); await snap('orders');
    await scroll(700); await snap('orders-scrolled');
    await tab('Vault'); await snap('vault');
    await p.getByTestId('vault-pair').first().click(); await snap('vault-pair');
    await p.goBack().catch(() => {});
    await tab('Inbox'); await snap('inbox');
    await tab('Profile'); await snap('profile');
    await scroll(900); await snap('profile-scrolled');
    // Book a clean on the tour
    await tab('Book'); await snap('book');
    await vis('Sneaker Clean').click(); await snap('book-details');
    await scroll(2400); await snap('book-receipt');
    await vis('Confirm Booking').click();
    await vis('BOOKED', false).waitFor({ timeout: 15000 }).catch(() => {});
    await snap('booked');
    await vis('Back to Home').click();
    await tab('Orders'); await snap('orders-after-booking');
    await p.waitForTimeout(42000);
    await tab('Inbox'); await tab('Orders'); await snap('orders-cleaning');
    await tab('Inbox'); await snap('inbox-after');
    // End the tour
    await p.getByTestId('tour-end').click(); await p.waitForTimeout(1500); await snap('after-tour');
  } catch (e) { issues.push(`${step}: FLOW FAILED ${e.message.split('\n')[0]}`); await p.screenshot({ path: `${OUT}/zz-failed.png` }); }
  await b.close();
  const live = netCalls.filter((c) => !c.startsWith('after-tour'));
  if (live.length) issues.push(`network calls during the tour (should be none):\n  ${live.slice(0, 10).join('\n  ')}`);
  require('fs').writeFileSync(`${OUT}/issues.txt`, issues.join('\n'));
  console.log(issues.length ? `ISSUES (${issues.length}):\n${issues.join('\n')}` : 'NO ISSUES');
  process.exit(issues.length ? 1 : 0);
})();
