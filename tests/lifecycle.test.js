// on a phone: what you type is saved the moment the app goes to the background, a full device is reported,
// the rest timer keeps time across a locked screen
const { open, report } = require('./lib');
const KEY = 'liftingsanity:data:v1';
(async () => {
  const r = report('Phone lifecycle: locking, closing, storage, rest timer');
  const t = await open({ settings: { keypad: 'app', view: 'focus' }, clock: Date.now() });
  const stored = () => t.p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const vis = v => t.p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); }, v);
  await t.start();
  const cell = await t.p.evaluate(() => { const c = [...document.querySelectorAll('#workout .set-row:not(.head) .cell[data-f="r"]')][1]; return { e: c.dataset.e, s: +c.dataset.s }; });
  await t.click(`#workout .cell[data-e="${cell.e}"][data-s="${cell.s}"][data-f="r"]`, 300);
  await t.click('#keypad [data-a="kpKey"][data-k="9"]', 50);
  await vis('hidden');
  r.ok((await stored()).active.ex[+cell.e].sets[cell.s].r === 9, 'locking the phone straight after typing saves it (no waiting for the usual save)');
  await vis('visible');
  await t.click('#keypad [data-a="kpKey"][data-k="7"]', 50);
  await t.p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  r.ok((await stored()).active.ex[+cell.e].sets[cell.s].r === 97, 'swiping the app away saves what was just typed');
  await t.click('#keypad [data-a="kpClose"]', 400);
  // storage full
  await t.p.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; });
  await t.click('#workout .set-row:not(.head) .check', 300);
  await vis('hidden'); await vis('visible'); await t.p.waitForTimeout(200);
  r.ok(/Couldn’t save/.test(await t.text('#toast')), 'when the device is full, you’re told it couldn’t save');
  await t.p.evaluate(() => { Storage.prototype.setItem = window.__set; });
  await vis('hidden'); await vis('visible');
  r.ok((await stored()).active.ex.some(x => x.sets.some(s => s.done)), 'once there’s space again, it saves');
  // rest timer across a lock
  await t.ev('state.rest = null; renderRest()');
  const nextCheck = await t.p.evaluate(() => { const b = document.querySelector('#workout .set-row:not(.head):not(.done) [data-a="toggleSet"]'); return b && `[data-a="toggleSet"][data-e="${b.dataset.e}"][data-s="${b.dataset.s}"]`; });
  await t.click('#workout ' + nextCheck, 600);
  const t0 = await t.text('#restbar .rb-time');
  await vis('hidden'); await t.p.clock.fastForward(60000); await vis('visible'); await t.p.waitForTimeout(300);
  const t1 = await t.text('#restbar .rb-time');
  const toSec = s => { const [m, x] = (s || '0:0').split(':').map(Number); return m * 60 + x; };
  r.ok(t0 && Math.abs(toSec(t0) - toSec(t1) - 60) <= 2, 'the rest timer keeps time while the screen is locked', { t0, t1 });
  await vis('hidden'); await t.p.clock.fastForward(300000); await vis('visible'); await t.p.waitForTimeout(400);
  r.ok(/over|Go/i.test(await t.text('#restbar')), 'and shows it’s over if it ran out while locked', await t.text('#restbar'));
  await r.done(t);
})();
