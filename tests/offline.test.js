// the installed app: opens with no signal, keeps working, and a new version waits until you tap Reload
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
  overrides.set('sw.js', fs.readFileSync(path.join(lib.ROOT, 'sw.js'), 'utf8').replace(/liftingsanity-v\d+/, 'liftingsanity-vTEST'));
  overrides.set('app.js', fs.readFileSync(path.join(lib.ROOT, 'app.js'), 'utf8').replace('window.LiftingSanity = {', 'window.__newVersion = true; window.LiftingSanity = {'));
  await p.reload();
  let toast = '';
  for (let k = 0; k < 25 && !/updated/.test(toast); k++) { await p.waitForTimeout(300); toast = (await t.text('#toast')) || ''; }
  r.ok(/updated/.test(toast) && !(await p.evaluate(() => window.__newVersion)), 'a new version is offered, and nothing changes until you tap Reload', toast);
  await Promise.all([p.waitForEvent('load'), p.evaluate(() => document.querySelector('#toast button').click())]);
  await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(500);
  const nv = await p.evaluate(() => ({ newCode: !!window.__newVersion, workout: !!(window.LiftingSanity && window.LiftingSanity.state.active) }));
  r.ok(nv.newCode && nv.workout, 'after Reload the new version runs, and the open workout is still there', nv);
  const after = await p.evaluate(async () => (await caches.keys()).join(','));
  r.ok(/vTEST/.test(after) && !/liftingsanity-v\d/.test(after.replace('vTEST', '')), 'the old version’s files are cleared out', after);
  overrides.clear();
  await r.done(t);
})();
