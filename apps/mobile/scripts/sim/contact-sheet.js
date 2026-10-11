// Contact sheet of walkthrough screenshots, for reviewing many screens at once.
//   node scripts/sim/contact-sheet.js <dir> <filePrefix> <out.png> [perRow]
const { chromium } = require('@playwright/test');
const fs = require('fs');
const [dir, prefix, out] = process.argv.slice(2, 5);
const per = Number(process.argv[5] || 4);
const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.png')).sort();
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  const p = await (await b.newContext({ viewport: { width: per * 330 + 20, height: 800 } })).newPage();
  const html = `<html><body style="margin:0;padding:10px;background:#222;display:flex;flex-wrap:wrap;gap:10px;font:12px sans-serif;color:#ddd">${files.map((f) => `<div style="width:320px"><div>${f}</div><img src="file://${dir}/${f}" style="width:320px;border-radius:12px"></div>`).join('')}</body></html>`;
  fs.writeFileSync(`${dir}/_sheet.html`, html);
  await p.goto(`file://${dir}/_sheet.html`); await p.waitForTimeout(800);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
