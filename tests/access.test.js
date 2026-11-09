// easier to use and to read: the week's goal, every switch has a name for VoiceOver, a sheet takes the focus and hands it back, small
// things have a full-size target, Text size and Increase Contrast, today's workout starts without scrolling, the
// number pad never covers the row it types into, and Settings jumps to its sections
const { open, report } = require('./lib');
(async () => {
  const r = report('Access: names, focus, text size, contrast, reach');
  let t = await open({ width: 393, height: 852, settings: { keypad: 'app', installHint: false } }), p = t.p;

  // today's workout starts from the first screen
  await t.tab('train');
  const start = await p.evaluate(() => { const b = document.querySelector('.upnext [data-a="startDay"]'), l = document.querySelector('.upnext .ex-preview'), tabs = document.querySelector('#tabs'); const r = b.getBoundingClientRect(); return { bottom: Math.round(r.bottom), tabs: Math.round(tabs.getBoundingClientRect().top), above: !!(b.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  r.ok(start.above && start.bottom <= start.tabs, 'Start sits above the list of exercises, on the first screen: no scrolling to begin', start);

  // the week's goal: what the split plans (every other day: 3 a week), and a badge once it's reached
  const wk0 = await t.text('.week-sum');
  await t.ev(`(() => { const tpl = state.templates[0]; state.workouts = [0, 1, 2].map(i => ({ id: 'w' + i, name: tpl.name, tplId: tpl.id, start: Date.now() - 3000 + i * 1000, end: Date.now() - 2500 + i * 1000, prs: [], ex: [{ id: 'x' + i, exId: 'barbell-bench-press', rest: 90, uni: false, ss: null, note: '', sets: [{ id: 's' + i, t: 'N', w: 60, r: 8, done: true }] }] })); recalcPRs(); save(true); render(); })()`);
  const wk1 = await t.text('.week-sum');
  r.ok(/^0 of 3 workouts this week/.test(wk0) && /Week’s goal reached/.test(wk1) && /3 of 3 workouts this week/.test(wk1), 'Train shows the week against what the split plans, and says when the goal is reached', { wk0, wk1 });
  await t.ev(`(() => { state.workouts = []; recalcPRs(); save(true); render(); })()`);

  // switches
  await t.tab('settings');
  const sw = await p.evaluate(() => [...document.querySelectorAll('#view .switch')].map(b => [b.getAttribute('role'), b.getAttribute('aria-label'), b.getAttribute('aria-checked')]));
  r.ok(sw.length >= 4 && sw.every(([role, name, on]) => role === 'switch' && name && /^(true|false)$/.test(on)) && sw.some(([, name]) => name === 'Sound when rest is over'), 'every switch in Settings says what it is and whether it’s on', sw);

  // a sheet takes the focus, Escape closes it, and the button that opened it has the focus again
  await p.evaluate(() => document.querySelector('[data-a="openNews"]').focus());
  await t.click('[data-a="openNews"]', 700);
  const inside = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in .sheet'); return !!s && s.contains(document.activeElement) && s.getAttribute('role') === 'dialog' && s.getAttribute('aria-modal') === 'true'; });
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  const back = await p.evaluate(() => document.activeElement && document.activeElement.dataset.a);
  r.ok(inside && back === 'openNews', 'a sheet takes the focus when it opens and gives it back to the button that opened it', { inside, back });

  // small things to tap: the target reaches past what's drawn
  const reach = await p.evaluate(() => { const b = document.querySelector('#view [data-a="testSound"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const hit = (x, y) => { const el = document.elementFromPoint(x, y); return !!el && (el === b || b.contains(el)); }; return { h: Math.round(r.height), above: hit(r.left + r.width / 2, r.top - 9), below: hit(r.left + r.width / 2, r.bottom + 9) }; });
  r.ok(reach.above && reach.below, '“Play it” (20px tall) takes a tap from 9px above and below', reach);

  // Settings jumps to its sections
  await t.click('[data-a="setJump"][data-v="data"]', 900);
  const at = await p.evaluate(() => Math.round(document.getElementById('set-data').getBoundingClientRect().top));
  r.ok(at >= 0 && at < 120, 'the chips at the top of Settings jump to a section (Your data)', at);

  // Text size
  const size = () => p.evaluate(() => [parseFloat(getComputedStyle(document.body).fontSize), parseFloat(getComputedStyle(document.querySelector('#view h1')).fontSize)]);
  const [b0, h0] = await size();
  await t.click('[data-a="setText"][data-v="xl"]', 400);
  const [b1, h1] = await size();
  r.ok(Math.abs(b1 / b0 - 1.2) < 0.01 && Math.abs(h1 / h0 - 1.2) < 0.01 && (await t.state()).settings.text === 'xl', 'Text size → Larger makes every size 20% bigger', { b0, b1, h0, h1 });
  await p.reload(); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(400);
  r.ok(Math.abs((await size())[0] / b0 - 1.2) < 0.01, 'and it’s still on after closing the app');
  await t.tab('settings'); await t.click('[data-a="setText"][data-v="m"]', 400);
  r.ok((await size())[0] === b0 && (await t.state()).settings.text === undefined, 'Default puts it back', await size());

  // Increase Contrast: the greys step up (a colour you picked yourself stays)
  const muted = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--muted').trim());
  const m0 = await muted();
  await p.emulateMedia({ contrast: 'more' });
  const m1 = await muted();
  await p.emulateMedia({ contrast: 'no-preference' });
  r.ok(m0 === '#84848c' && m1 === '#a2a2aa', 'with Increase Contrast on, grey text gets lighter on dark', { m0, m1 });
  await t.ctx.close();

  // a small phone: the first tap on a number brings its row above the pad (it used to stay behind it)
  t = await open({ width: 375, height: 667, settings: { keypad: 'app' } }); p = t.p;
  await t.start(); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('#workout .cell[data-f="w"]').click());
  await p.waitForFunction(() => { const c = document.querySelector('#workout .cell[data-f="w"]').getBoundingClientRect(), k = document.querySelector('#keypad'); return !k.hidden && !k.getAnimations().length && c.bottom <= k.getBoundingClientRect().top; }, null, { timeout: 4000 }).catch(() => {});
  const pad = await p.evaluate(() => { const c = document.querySelector('#workout .cell[data-f="w"]').getBoundingClientRect(), k = document.querySelector('#keypad').getBoundingClientRect(); return { cell: Math.round(c.bottom), pad: Math.round(k.top) }; });
  r.ok(pad.cell <= pad.pad, 'on a small phone the number pad never covers the number it’s typing', pad);
  await r.done(t);
})();
