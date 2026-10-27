// "What's new": a short note once after an update, easy to dismiss; never on a first launch or over an open workout;
// all of it again from Settings
const { open, report } = require('./lib');
(async () => {
  const r = report('What’s new');
  const sheet = p => p.evaluate(() => { const s = document.querySelector('#sheets .sheet-wrap.in.news-sheet'); return s && s.textContent; });
  const seen = p => p.evaluate(() => localStorage.getItem('liftingsanity:seen-version'));
  // someone updating from the version before
  let t = await open({ news: true });
  await t.p.waitForTimeout(1200);
  const v = await t.ev('APP_VERSION'), txt = await sheet(t.p);
  r.ok(txt && /In this update/.test(txt) && txt.includes(`v${v}`) && !txt.includes('v37') && !txt.includes('v36'), 'after an update, a note says what’s new in it and in any update missed since (nothing older)', txt && txt.slice(0, 160));
  r.ok(await t.p.evaluate(() => document.querySelectorAll('#sheets .news-sheet .news-item').length) >= 2 && await seen(t.p) === String(v), 'a few short items, each with an icon, and it counts as seen');
  await t.click('#sheets .news-sheet [data-a="sheetClose"].news-ok', 600);
  r.ok(!(await sheet(t.p)), '“Got it” puts it away');
  await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(1300);
  r.ok(!(await sheet(t.p)), 'and it doesn’t come back on the next launch');
  await t.tab('settings');
  await t.click('[data-a="openNews"]', 600);
  const all = await sheet(t.p);
  r.ok(all && all.includes(`v${v}`) && all.includes(`v${v - 1}`) && /Earlier/.test(all), 'Settings → What’s new shows it again, with the updates before', all && all.slice(0, 120));
  await t.click('#sheets .news-sheet .sheet-backdrop', 600);
  r.ok(!(await sheet(t.p)), 'a tap outside closes it too');
  await t.ctx.close();
  // over an open workout it waits for the next launch
  t = await open({ news: true });
  await t.p.waitForTimeout(1200); await t.ev('closeAllSheets()'); await t.p.evaluate(() => localStorage.removeItem('liftingsanity:seen-version'));
  await t.start(); await t.p.waitForTimeout(300);
  await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(1300);
  r.ok(!(await sheet(t.p)) && await seen(t.p) === null, 'with a workout open, it waits (nothing covers the workout)', { sheet: await sheet(t.p), seen: await seen(t.p), active: await t.ev('!!state.active') });
  await t.ctx.close();
  // a first launch: the welcome, not the news
  t = await open({ fresh: true });
  await t.p.waitForTimeout(1300);
  r.ok(!(await sheet(t.p)) && await seen(t.p) === String(v), 'a first launch has nothing to catch up on: no note');
  await r.done(t);
})();
