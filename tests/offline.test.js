// the installed app: opens with no signal, keeps working; a new version found as it starts switches over by itself,
// one that arrives while you use it waits until you tap Reload
const { open, report } = require('./lib');
(async () => {
  const r = report('Offline and updates (service worker)');
  const t = await open({ serviceWorkers: true, hook: false });
  const p = t.p;
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(800);
  r.ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'the app installs its offline helper');
  const cacheNames = await p.evaluate(async () => (await caches.keys()).join(','));
  r.ok(/liftingsanity-v\d+/.test(cacheNames), 'the app’s files are saved on the device', cacheNames);
  await t.ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(900);
  r.ok(await p.evaluate(() => document.querySelectorAll('#tabs .tab').length === 5 && document.querySelector('#view').innerHTML.length > 500), 'with no signal, the app still opens');
  const body = await p.evaluate(async () => {
    const c = await caches.open('liftingsanity-art'), keys = (await c.keys()).map(q => new URL(q.url).pathname).filter(k => k.includes('/art/body/'));
    const got = await fetch('art/body/female-back-dark.webp').then(q => q.ok && q.headers.get('content-type')).catch(() => null);
    return { n: keys.length, got };
  });
  r.ok(body.n === 8 && /webp/.test(body.got), 'the body pictures are saved on the device too (both builds, front and back, light and dark), so muscle maps show with no signal', body);
  await t.tab('library'); await p.fill('#libQ', 'barbell curl'); await p.waitForTimeout(400); await t.click('#libList .ex-row', 900);
  r.ok(await p.evaluate(() => document.querySelectorAll('.sheet-wrap.in .steps li').length) > 0, 'with no signal, how-to steps still open');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.start();
  await p.evaluate(() => document.querySelectorAll('#workout .set-row:not(.head) .check')[1].click()); await p.waitForTimeout(400);
  r.ok(await p.evaluate(() => window.LiftingSanity.state.active.ex[0].sets.some(s => s.done)), 'with no signal, sets are logged');
  await t.ctx.setOffline(false);
  // a new version goes up (served in place of the files on disk)
  const fs = require('fs'), path = require('path');
  // the test server is shared: swap in a new version through its overrides
  const lib = require('./lib');
  const overrides = lib.__site ? lib.__site.overrides : null;
  if (!overrides) { r.ok(false, 'test server overrides available'); await r.done(t); return; }
  const swText = fs.readFileSync(path.join(lib.ROOT, 'sw.js'), 'utf8'), appText = fs.readFileSync(path.join(lib.ROOT, 'app.js'), 'utf8');
  const version = (tag, flag) => { overrides.set('sw.js', swText.replace(/liftingsanity-v\d+/, 'liftingsanity-' + tag)); overrides.set('app.js', appText.replace('window.LiftingSanity = {', `window.${flag} = true; window.LiftingSanity = {`)); };
  // one that's found while the app is starting switches over by itself, keeping the open workout
  version('vTEST', '__newVersion');
  await p.reload();
  // (the page reloads itself while this waits)
  const has = () => p.evaluate(() => !!window.__newVersion).catch(() => false);
  for (let k = 0; k < 30 && !(await has()); k++) await p.waitForTimeout(300);
  await p.waitForFunction(() => window.LiftingSanity).catch(() => {}); await p.waitForTimeout(500);
  const nv = await p.evaluate(() => ({ newCode: !!window.__newVersion, workout: !!(window.LiftingSanity && window.LiftingSanity.state.active) }));
  r.ok(nv.newCode && nv.workout, 'a new version found while the app starts switches over by itself, and the open workout is still there', nv);
  // one that arrives later, while you're using it, waits until you tap Reload
  await p.waitForTimeout(6500);
  await p.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  version('vTEST2', '__newVersion2');
  await p.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); });
  let toast = '';
  for (let k = 0; k < 30 && !/updated/.test(toast); k++) { await p.waitForTimeout(300); toast = (await t.text('#toast')) || ''; }
  r.ok(/updated/.test(toast) && !(await p.evaluate(() => window.__newVersion2)), 'a new version that arrives while you use the app is offered, and nothing changes until you tap Reload', toast);
  await Promise.all([p.waitForEvent('load'), p.evaluate(() => document.querySelector('#toast button').click())]);
  await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(500);
  const nv2 = await p.evaluate(() => ({ newCode: !!window.__newVersion2, workout: !!(window.LiftingSanity && window.LiftingSanity.state.active) }));
  r.ok(nv2.newCode && nv2.workout, 'after Reload the new version runs, and the open workout is still there', nv2);
  const after = await p.evaluate(async () => (await caches.keys()).join(','));
  r.ok(/vTEST2/.test(after) && !/liftingsanity-v\d/.test(after.replace(/vTEST2?/g, '')) && !/vTEST(,|$)/.test(after), 'the old versions’ files are cleared out', after);
  overrides.clear();
  await r.done(t);
})();
