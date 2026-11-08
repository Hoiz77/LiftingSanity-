// a new block (Reset progression) and a reset of one exercise: why you start fresh and how heavy, the moment it starts
// (the finished block and its biggest gains), the Train banner, the first session's lighter suggestions and its
// "fresh start" note, the finish screen's new baselines, the session after, and undoing
const { open, report } = require('./lib');
const D = 864e5;
const set = (id, t, extra = {}) => ({ id, t, done: false, ...extra });
const ex = (id, exId, sets, extra = {}) => ({ id, exId, rest: 90, uni: false, ss: null, note: '', sets, ...extra });
const logged = (p, w, r, n) => Array.from({ length: n }, (_, k) => set(p + k, 'N', { w, r, done: true, tr: '6-8' }));
// five weeks of Upper A: the bench from 70 to 80 kg, rows from 55 to 65 kg
const past = [5, 4, 3, 2, 1].map(k => ({ id: 'p' + k, name: 'Upper A', tplId: 'tu', ago: 7 * k + 2, ex: [ex('pb' + k, 'barbell-bench-press', logged('b' + k, 70 + (5 - k) * 2.5, 8, 3)), ex('pr' + k, 'seated-cable-row', logged('r' + k, 55 + (5 - k) * 2.5, 10, 3))] }));
const fresh = (id, start = 'Date.now() + 1000') => `(() => { state.active = { id: '${id}', name: 'Upper A', tplId: 'tu', start: ${start}, splitId: null, day: null, note: '', cur: 0, ex: ${JSON.stringify([ex('x0', 'barbell-bench-press', [set('s1', 'N', { tr: '6-8' }), set('s2', 'N', { tr: '6-8' })]), ex('x1', 'seated-cable-row', [set('q1', 'N', { tr: '8-10' })])])} }; resetWoUI(); save(true); render(); renderWorkout(true); })()`;
(async () => {
  const r = report('A new block and a fresh start for one exercise');
  const t = await open({ settings: { keypad: 'app' } }), p = t.p;
  await t.ev(`(() => { state.workouts = ${JSON.stringify(past)}.map(w => ({ ...w, start: Date.now() - w.ago * ${D}, end: Date.now() - w.ago * ${D} + 3600e3, prs: [] })).sort((a, b) => a.start - b.start); recalcPRs(); save(true); render(); })()`);
  await t.tab('progress');
  await t.click('[data-a="blockReset"]', 500);
  const sheet = () => p.evaluate(() => { const s = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return { why: (s.querySelector('[data-a="why"].on') || {}).textContent, load: (s.querySelector('[data-a="load"].on') || {}).textContent, text: s.textContent.replace(/\s+/g, ' ') }; });
  const s0 = await sheet();
  r.ok(s0.why === 'New program' && s0.load === 'Same' && /Records start over/.test(s0.text) && /Nothing is deleted/.test(s0.text), 'Reset progression asks why, how heavy the first session is, and says what changes (nothing deleted)', s0);
  await t.inSheet('[data-a="why"][data-v="break"]', 250);
  const s1 = await sheet();
  r.ok(s1.why === 'After a break' && s1.load === '10% lighter' && /10% under last time/.test(s1.text), '“After a break” picks a first session 10% lighter', s1);
  await t.inSheet('[data-a="ok"]', 1500);
  const show = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in.block-show'); return s && s.textContent.replace(/\s+/g, ' '); });
  const blk = await t.ev('JSON.stringify(curBlock())');
  r.ok(/"why":"break"/.test(blk) && /"load":0.9/.test(blk) && await t.ev('state.blocks.length') === 2, 'the new block keeps why and how heavy', blk);
  r.ok(show && /Block 1 complete/.test(show) && /5\s*sessions/.test(show) && /Biggest gains/.test(show) && /Seated Cable Row/.test(show) && /\+18%/.test(show) && /Block 2 starts now/.test(show) && /10% lighter/.test(show), 'starting it fills the screen: Block 1 with its sessions and biggest gains, then “Block 2 starts now”', show && show.slice(0, 400));
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.tab('train');
  const card = await t.text('.fresh-card'), chip = await t.text('.page-h-side .blk');
  r.ok(/Block 2 · fresh start/.test(card || '') && /10% lighter/.test(card) && /Block 2 · week 1/.test(chip || ''), 'Train shows the new block until its first workout, and which week of it this is', { card, chip });

  // the first session: lighter suggestions under last time's sets, and a note that today sets the bar
  await t.ev(fresh('w1')); await p.waitForTimeout(600);
  const note = await t.text('#workout .exc[data-e="0"] .fresh-note');
  const ph = await p.evaluate(() => [...document.querySelectorAll('#workout .exc[data-e="0"] .cell[data-f="w"]')].map(c => c.textContent.trim()));
  const prev = await p.evaluate(() => document.querySelector('#workout .exc[data-e="0"] .last').textContent.replace(/\s+/g, ' '));
  r.ok(/Block 2 · fresh start/.test(note || '') && /new baseline/.test(note) && /80 kg → 72\.5 kg/.test(note) && ph.every(v => v === '72.5') && /80 × 8/.test(prev), 'the first session suggests 10% under last time (80 → 72.5 kg) with last time still shown, and says today sets the bar', { note, ph, prev });
  for (const [e, s] of [[0, 0], [0, 1]]) await t.click(`#workout [data-a="toggleSet"][data-e="${e}"][data-s="${s}"]`, 350);
  await t.ev('woGo(1)'); await p.waitForTimeout(350);
  await t.click('#workout [data-a="toggleSet"][data-e="1"][data-s="0"]', 450);
  const banner = await p.evaluate(() => { const b = document.querySelector('#prfx'); return b && !b.hidden ? b.innerText : null; });
  const done = await t.ev('A().ex[0].sets.map(s => s.w).join()');
  r.ok(banner === null && done === '72.5,72.5', 'checking logs the lighter weight, and nothing to beat yet means no record banner', { banner, done });
  await t.ev('finishWorkout()');
  let fin = null;
  for (let i = 0; i < 40 && !fin; i++) { await p.waitForTimeout(100); fin = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in .fin[data-fresh]'); return w && { title: w.querySelector('.fin-title').textContent, sub: w.querySelector('.fin-sub').textContent, cards: [...w.querySelectorAll('.fin-card > svg')].map(c => c.getAttribute('aria-label')), base: (([...w.querySelectorAll('.fin-card')].find(c => c.querySelector('svg').getAttribute('aria-label') === 'New baselines') || {}).textContent || '').replace(/\s+/g, ' ') }; }); }
  r.ok(fin && fin.title === 'Fresh start!' && /Block 2 · session 1/.test(fin.sub) && fin.cards.includes('New baselines') && /2 new baselines/.test(fin.base) && /72\.5 × 8/.test(fin.base) && /BLOCK 2 STARTS HERE/.test(fin.base), 'its finish says “Fresh start!”, Block 2 · session 1, and a card of the new baselines to beat', fin);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.tab('train');
  r.ok(!(await t.text('.fresh-card')), 'after it, the Train banner goes');

  // the session after: built up from this block (8 reps at the top of 6–8, so 2.5 kg more), no fresh-start note,
  // and records count again
  await t.ev(fresh('w2', 'Date.now() + 5000')); await p.waitForTimeout(600);
  const ph2 = await p.evaluate(() => [...document.querySelectorAll('#workout .exc[data-e="0"] .cell[data-f="w"]')].map(c => c.textContent.trim()));
  const tip = await t.text('#workout .exc[data-e="0"] .hint.good');
  r.ok(!(await t.text('#workout .fresh-note')) && ph2.every(v => v === '75') && /Try 75 kg today/.test(tip || ''), 'the next session builds up from the new block (72.5 → 75 kg), with no fresh-start note', { ph2, tip });
  await t.ev(`(() => { A().ex[0].sets[0].w = 75; A().ex[0].sets[0].r = 8; renderWorkout(true); })()`); await p.waitForTimeout(200);
  await t.click('#workout [data-a="toggleSet"][data-e="0"][data-s="0"]', 700);
  const b2 = await p.evaluate(() => { const b = document.querySelector('#prfx'); return b && !b.hidden ? b.innerText : ''; });
  r.ok(/new pr/i.test(b2) && /Barbell Bench Press/.test(b2), 'and beating the baseline is a record again', b2);
  await t.ev('discardActive()'); await p.waitForTimeout(300);

  // one exercise, 20% lighter; undo takes it back
  await t.ev(`resetExercise('seated-cable-row')`); await p.waitForTimeout(500);
  await t.inSheet('[data-a="load"][data-v="0.8"]', 250); await t.inSheet('[data-a="ok"]', 600);
  const pref = await t.ev(`JSON.stringify(state.exPrefs['seated-cable-row'].restarts || null)`);
  await t.ev(fresh('w3', 'Date.now() + 9000')); await p.waitForTimeout(600);
  await t.ev('woGo(1)'); await p.waitForTimeout(400);
  const n1 = await t.text('#workout .exc[data-e="1"] .fresh-note');
  r.ok(/":0.8}/.test(pref) && /Fresh start for this exercise/.test(n1 || '') && /20% lighter/.test(n1), 'resetting one exercise can start it 20% lighter, and its card says so', { pref, n1 });
  await t.ev('discardActive()'); await p.waitForTimeout(300);
  await p.evaluate(() => { const b = document.querySelector('#toast [data-a="toastAct"]'); if (b) b.click(); }); await p.waitForTimeout(300);
  await t.ev(`undoExReset('seated-cable-row')`); await p.waitForTimeout(300);
  r.ok(await t.ev(`!(state.exPrefs['seated-cable-row'] || {}).restarts`), 'undoing the reset drops its lighter start too');
  // two resets in a row: undoing the second brings back the first with its own lighter start
  await t.ev(`resetExercise('seated-cable-row')`); await p.waitForTimeout(500);
  await t.inSheet('[data-a="load"][data-v="0.8"]', 250); await t.inSheet('[data-a="ok"]', 500);
  await t.ev(`state.exResets['seated-cable-row'][0] -= 5000; state.exPrefs['seated-cable-row'].restarts = Object.fromEntries(Object.entries(state.exPrefs['seated-cable-row'].restarts).map(([k, v]) => [+k - 5000, v]))`);
  await t.ev(`resetExercise('seated-cable-row')`); await p.waitForTimeout(500);
  await t.inSheet('[data-a="ok"]', 500);
  const same = await t.ev(`restartLoad('seated-cable-row')`);
  await t.ev(`undoExReset('seated-cable-row')`); await p.waitForTimeout(300);
  const back = await t.ev(`restartLoad('seated-cable-row')`);
  r.ok(same === 1 && back === 0.8, 'a second reset with the same weights, undone, brings back the first one’s 20% lighter start', { same, back });
  await t.ev(`undoExReset('seated-cable-row')`); await p.waitForTimeout(300);

  // undo from the moment itself
  await t.tab('progress');
  await t.click('[data-a="blockReset"]', 500); await t.inSheet('[data-a="ok"]', 1400);
  await t.inSheet('[data-a="undo"]', 500);
  r.ok(await t.ev('state.blocks.length') === 2, 'Undo on the new block’s screen takes it straight back', await t.ev('state.blocks.length'));
  await r.done(t);
})();
