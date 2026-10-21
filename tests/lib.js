// Shared test helpers: a small web server for the app, a phone-sized browser, and pass/fail reporting.
const http = require('http'), fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('These tests need Playwright: run `npm install` and `npx playwright install chromium` in the repo first.');
  process.exit(2);
}
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

// serves the repo as it is on disk; `overrides` (path → text) stand in for files, e.g. to fake a new version
function serve(overrides = new Map()) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    const type = TYPES[path.extname(rel)] || 'application/octet-stream';
    const head = { 'content-type': type, 'cache-control': 'no-store' };
    if (overrides.has(rel)) { res.writeHead(200, head); res.end(overrides.get(rel)); return; }
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, head); fs.createReadStream(file).pipe(res);
  });
  return new Promise(res => server.listen(0, 'localhost', () => res({ url: `http://localhost:${server.address().port}/`, overrides, close: () => new Promise(r => server.close(r)) })));
}

// the app with a hook for reaching its internals from a test (window.__ev runs code inside the app)
const HOOKED = () => fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').replace('window.LiftingSanity = {', 'window.__ev = s => eval(s); window.LiftingSanity = {');

let browser = null, site = null;
async function open(o = {}) {
  if (!browser) browser = await chromium.launch();
  if (!site) { site = await serve(); module.exports.__site = site; }
  const ctx = await browser.newContext({
    viewport: { width: o.width || 390, height: o.height || 844 }, isMobile: o.width ? o.width < 700 : true, hasTouch: true, deviceScaleFactor: 1,
    colorScheme: o.scheme || 'dark', reducedMotion: o.reducedMotion || 'no-preference', timezoneId: o.tz, acceptDownloads: true,
    serviceWorkers: o.serviceWorkers ? 'allow' : 'block'
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  // the web fonts load only when a test asks (they need the internet); the hosted exercise pictures are left out
  if (!o.fonts) await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.route(/raw\.githubusercontent\.com/, r => r.fulfill({ status: 404, body: '' }));
  if (o.hook !== false) await p.route(/\/app\.js(\?|$)/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: HOOKED() }));
  if (o.clock) await p.clock.install({ time: o.clock });
  // tests start as someone who's used the app before (with the Full Body EOD split); `fresh: true` starts from nothing
  if (!o.seed && !o.fresh) o.seed = '{"v":1}';
  if (o.seed) await p.addInitScript(d => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('liftingsanity:data:v1', d); } }, typeof o.seed === 'string' ? o.seed : JSON.stringify(o.seed));
  await p.goto(site.url);
  await p.waitForFunction(() => window.LiftingSanity);
  await p.waitForTimeout(300);
  if (o.settings) { await p.evaluate(s => { Object.assign(window.LiftingSanity.state.settings, s); window.LiftingSanity.save(); }, o.settings); await p.reload(); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(400); }
  const t = {
    ctx, p, errors,
    // run code inside the app (its own functions and state are in scope)
    ev: code => p.evaluate(c => window.__ev(c), code),
    state: () => p.evaluate(() => JSON.parse(JSON.stringify(window.LiftingSanity.state))),
    click: async (sel, wait = 350) => { await p.evaluate(s => { const el = document.querySelector(s); if (!el) throw new Error('nothing matches ' + s); el.click(); }, sel); await p.waitForTimeout(wait); },
    // tap something in the top open sheet (sheets on their way out don't count)
    inSheet: async (sel, wait = 350) => { await p.evaluate(s => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const el = w && w.querySelector(s); if (!el) throw new Error('no open sheet has ' + s); el.click(); }, sel); await p.waitForTimeout(wait); },
    sheetText: () => p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return w ? w.textContent.replace(/\s+/g, ' ').trim() : ''; }),
    // pick a menu item in the top sheet by its words
    menu: async (words, wait = 400) => { await p.evaluate(w => { const s = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const b = s && [...s.querySelectorAll('.menu-item')].find(b => b.textContent.includes(w)); if (!b) throw new Error('no menu item: ' + w); b.click(); }, words); await p.waitForTimeout(wait); },
    tab: async name => { await t.click(`[data-a="tab"][data-tab="${name}"]`, 550); },
    // start the next day of the split and wait for the workout to be up
    start: async () => { await t.tab('train'); await t.click('[data-a="startDay"]', 700); },
    text: sel => p.evaluate(s => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel)
  };
  return t;
}
async function closeAll() { if (browser) await browser.close(); if (site) await site.close(); browser = null; site = null; }

// pass/fail lines, and a non-zero exit code if anything failed or the page threw an error
function report(title) {
  const fails = [];
  let n = 0;
  console.log(`\n${title}`);
  return {
    ok(cond, label, detail) {
      n++;
      if (cond) console.log(`  ✓ ${label}`);
      else { fails.push(label); console.log(`  ✗ ${label}${detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 600) : ''}`); }
      return !!cond;
    },
    async done(...pages) {
      const errs = pages.flatMap(t => t.errors || []);
      for (const e of errs) { fails.push('page error'); console.log(`  ✗ page error: ${e}`); }
      console.log(`  ${n - fails.length + errs.length}/${n} passed${errs.length ? `, ${errs.length} page error${errs.length > 1 ? 's' : ''}` : ''}`);
      await closeAll();
      process.exitCode = fails.length ? 1 : 0;
    }
  };
}
module.exports = { open, serve, report, closeAll, ROOT, chromium: () => chromium };
