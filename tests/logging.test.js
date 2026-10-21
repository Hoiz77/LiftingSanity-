// logging a workout: one tap logs what's shown, suggestions follow the set's type, the number pad never types into
// the wrong set, left/right pairs, supersets, replacing an exercise, the finish prompt
const { open, report } = require('./lib');
const D = 864e5;
const set = (id, t, extra = {}) => ({ id, t, done: false, ...extra });
const ex = (id, exId, sets, extra = {}) => ({ id, exId, rest: 90, uni: false, ss: null, note: '', sets, ...extra });
(async () => {
  const r = report('Logging a workout');
  const t = await open({ settings: { view: 'focus', keypad: 'app' } });
  // put a workout (and optionally a past one) in place and open it
  const load = async (active, past = []) => {
    await t.ev(`(() => { state.workouts = ${JSON.stringify(past)}.map(w => ({ ...w, start: Date.now() - w.ago * 864e5, end: Date.now() - w.ago * 864e5 + 3600e3, prs: [] })); recalcPRs();
      state.active = { id: 'wa', name: 'Test', start: Date.now(), tplId: null, splitId: null, day: null, note: '', cur: 0, ...${JSON.stringify(active)} };
      state.rest = null; ui.woHidden = false; resetWoUI(); save(true); render(); renderWorkout(true); })()`);
    await t.p.waitForTimeout(700);
  };
  const S = () => t.ev('JSON.parse(JSON.stringify(state.active))');
  const ph = (e, s, f = 'w') => t.p.evaluate(([e, s, f]) => { const c = document.querySelector(`#workout .cell[data-e="${e}"][data-s="${s}"][data-f="${f}"]`); return c ? (c.dataset.ph ?? c.placeholder ?? '') : null; }, [e, s, f]);
  const check = async (e, s, wait = 250) => { await t.click(`#workout [data-a="toggleSet"][data-e="${e}"][data-s="${s}"]`, wait); };

  // one tap logs what's shown
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { tr: '8-10', trir: 2 }), set('b', 'N', { tr: '8-10', trir: 2 })])] },
    [{ id: 'p1', name: 'Arms', ago: 3, ex: [ex('px', 'barbell-curl', [set('pa', 'N', { w: 30, r: 9, done: true }), set('pb', 'N', { w: 30, r: 8, done: true })])] }]);
  await check(0, 0);
  let a = await S();
  r.ok(a.ex[0].sets[0].done && a.ex[0].sets[0].w === 30 && a.ex[0].sets[0].r === 9 && a.ex[0].sets[0].rir === 2, 'one tap logs the weight, reps and target RIR shown in the set', a.ex[0].sets[0]);

  // how many taps the common jobs take
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { tr: '8-10' }), set('b', 'N', { tr: '8-10' }), set('c', 'N', { tr: '8-10' })])] },
    [{ id: 'p1', name: 'Arms', ago: 3, ex: [ex('px', 'barbell-curl', [set('pa', 'N', { w: 30, r: 9, done: true }), set('pb', 'N', { w: 30, r: 8, done: true }), set('pc', 'N', { w: 30, r: 8, done: true })])] }]);
  let taps = 0;
  const tap = async (sel, wait = 250) => { taps++; await t.click(sel, wait); };
  await tap('#workout [data-a="toggleSet"][data-e="0"][data-s="1"]');
  r.ok(taps === 1 && (await S()).ex[0].sets[1].done, 'a set done as planned: 1 tap');
  taps = 0;
  await tap('#workout .cell[data-e="0"][data-s="2"][data-f="r"]'); await tap('#keypad [data-a="kpStep"][data-d="1"]', 120); await tap('#keypad [data-a="kpLog"]');
  a = await S();
  r.ok(taps === 3 && a.ex[0].sets[2].done && a.ex[0].sets[2].r === 9, 'one more rep than planned: 3 taps (reps box, +1, Log)', a.ex[0].sets[2]);
  taps = 0;
  await t.ev(`(() => { A().ex[0].sets[0].done = false; renderWorkout(); })()`); await t.p.waitForTimeout(150);
  await tap('#workout .cell[data-e="0"][data-s="0"][data-f="w"]'); await tap('#keypad [data-a="kpStep"][data-d="1"]', 120); await tap('#keypad [data-a="kpLog"]');
  a = await S();
  r.ok(taps === 3 && a.ex[0].sets[0].done && a.ex[0].sets[0].w === 32.5, 'a little heavier: 3 taps (weight box, +2.5, Log)', a.ex[0].sets[0]);

  // a set that can't be checked yet changes nothing
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { trir: 2 })])] });
  await check(0, 0);
  a = await S();
  r.ok(!a.ex[0].sets[0].done && a.ex[0].sets[0].rir == null && /Type how many reps/.test(await t.text('#toast')), 'a set with no reps isn’t checked, and nothing in it changes', a.ex[0].sets[0]);

  // suggestions follow the set's type
  await load({ ex: [ex('x0', 'barbell-curl', [set('w1', 'W', { w: 40, r: 8, done: true }), set('w2', 'W'), set('t', 'T', { w: 100, r: 5, done: true }), set('b', 'B'), set('d', 'D')])] },
    [{ id: 'p1', name: 'Arms', ago: 3, ex: [ex('px', 'barbell-curl', [set('q1', 'W', { w: 40, r: 8, done: true }), set('q2', 'W', { w: 60, r: 5, done: true }), set('q3', 'T', { w: 100, r: 5, done: true }), set('q4', 'B', { w: 85, r: 8, done: true }), set('q5', 'N', { w: 80, r: 10, done: true })])] }]);
  r.ok(await ph(0, 1) === '60', 'a warm-up suggests last time’s warm-up, not the one you just did (warm-ups ramp up)', await ph(0, 1));
  r.ok(await ph(0, 3) === '85', 'a back-off set never takes the top set’s weight', await ph(0, 3));
  await check(0, 3);
  r.ok(await ph(0, 4) === '67.5', 'a drop set comes down about 20% from the set just before it (85 → 67.5)', await ph(0, 4));

  // the second side uses the first side's weight; a "120s" target is 120 seconds
  await load({ ex: [ex('x0', 'single-arm-cable-fly', [set('l', 'N', { side: 'L', pair: 'p', w: 15, r: 10, done: true }), set('r', 'N', { side: 'R', pair: 'p' })], { uni: true }), ex('x1', 'plank', [set('pk', 'N', { tr: '120s' })])] });
  r.ok(await ph(0, 1) === '15', 'the second side suggests the weight the first side just did', await ph(0, 1));
  await t.ev('woGo(1)'); await t.p.waitForTimeout(400);
  r.ok(await ph(1, 0, 'sec') === '2:00', 'a "120s" target is 2:00, not 1:20', await ph(1, 0, 'sec'));

  // the number pad follows its set, not its position
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N'), set('b', 'N')])] });
  await t.click('#workout .cell[data-e="0"][data-s="0"][data-f="w"]', 300);
  await t.click('#keypad [data-a="kpKey"][data-k="5"]', 150);
  await t.ev('addWarmSet(0, false)'); await t.p.waitForTimeout(300);
  await t.click('#keypad [data-a="kpKey"][data-k="0"]', 200);
  a = await S();
  r.ok(a.ex[0].sets[0].t === 'W' && a.ex[0].sets[0].w == null && a.ex[0].sets[1].w === 50, 'adding a warm-up while typing: the typing still goes into the set you started on', a.ex[0].sets.map(s => [s.t, s.w]));
  await t.click('#keypad [data-a="kpClose"]', 400);

  // the RIR picker opens again after tapping a number box
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { w: 30, r: 8 })])] });
  await t.click('#workout .cell.eff[data-e="0"][data-s="0"]', 300);
  await t.click('#workout .cell[data-e="0"][data-s="0"][data-f="w"]', 300);
  await t.click('#workout .cell.eff[data-e="0"][data-s="0"]', 300);
  r.ok(await t.p.evaluate(() => !!document.querySelector('#workout .eff-pick')), 'the RIR picker opens again after tapping a number box');

  // one-row left/right: with one side done, the check finishes the other side
  await load({ ex: [ex('x0', 'single-arm-cable-fly', [set('l', 'N', { side: 'L', pair: 'p', w: 15, r: 10, done: true }), set('r', 'N', { side: 'R', pair: 'p', w: 15, r: 9 })], { uni: true })] });
  await t.ev(`(() => { state.exPrefs['single-arm-cable-fly'] = { uniStyle: 'one' }; renderWorkout(true); })()`); await t.p.waitForTimeout(300);
  await t.click('#workout .set-row.one [data-a="toggleBoth"]', 300);
  a = await S();
  r.ok(a.ex[0].sets.every(s => s.done), 'one-row left/right: checking a half-done set finishes it instead of unchecking', a.ex[0].sets.map(s => s.done));
  await t.ev(`delete state.exPrefs['single-arm-cable-fly']`);

  // supersets: no rest mid-round, rest at the end of a round, on to the next exercise when the group is done
  const mk = (p, n) => Array.from({ length: n }, (_, k) => set(p + k, 'N', { w: 20, r: 10 }));
  await load({ ex: [ex('x1', 'barbell-curl', mk('a', 3), { ss: 'G' }), ex('x2', 'lever-seated-fly', mk('b', 2), { ss: 'G' }), ex('x3', 'leg-extension', mk('c', 2))] });
  const step = async (e, s) => { await t.ev('state.rest = null'); await check(e, s, 1100); const st = await t.ev('({ cur: state.active.cur, rest: state.rest && state.rest.next })'); return st; };
  const s1 = await step(0, 0), s2 = await step(1, 0), s3 = await step(0, 1), s4 = await step(1, 1), s5 = await step(0, 2);
  r.ok(s1.cur === 1 && !s1.rest, 'superset: straight on to the next exercise, no rest mid-round', s1);
  r.ok(s2.cur === 0 && s2.rest, 'superset: rest at the end of a round, then back to the first', s2);
  r.ok(s5.cur === 2 && s5.rest === 'Leg Extension', 'superset: when one finishes early the other keeps going, and when the group is done it moves on (the rest says what’s next)', { s3, s4, s5 });
  // unlinking the first of three keeps the other two together
  await load({ ex: [ex('x1', 'barbell-curl', mk('a', 1), { ss: 'G' }), ex('x2', 'lever-seated-fly', mk('b', 1), { ss: 'G' }), ex('x3', 'leg-extension', mk('c', 1), { ss: 'G' })] });
  await t.ev('unlinkNext(A().ex, 0)');
  a = await S();
  r.ok(!a.ex[0].ss && a.ex[1].ss && a.ex[1].ss === a.ex[2].ss, 'unlinking the first of three keeps the other two linked', a.ex.map(x => x.ss));

  // replacing an exercise keeps the sets already done under the one they were done on
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { w: 30, r: 8, done: true }), set('b', 'N')])] });
  await t.click('#workout [data-a="exMenu"]', 400);
  await t.menu('Replace exercise', 600);
  await t.p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const i = w.querySelector('input'); i.value = 'hammer curl'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await t.p.waitForTimeout(400);
  await t.inSheet('[data-a="tog"]', 300); await t.inSheet('[data-a="done"]', 600).catch(() => {});
  a = await S();
  r.ok(a.ex.length === 2 && a.ex[0].exId === 'barbell-curl' && a.ex[0].sets.length === 1 && a.ex[0].sets[0].done && a.ex[1].sets.length === 1 && !a.ex[1].sets[0].done, 'replacing an exercise: the set already done stays under the original, the new one gets the rest', a.ex.map(x => [x.exId, x.sets.map(s => s.done)]));

  // set type sheet numbers sets like the badges (warm-ups aren't counted)
  await load({ ex: [ex('x0', 'barbell-curl', [set('w', 'W'), set('a', 'N')])] });
  await t.click('#workout [data-a="setType"][data-e="0"][data-s="1"]', 500);
  r.ok(/^Set 1 ·/.test((await t.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('h2').textContent))), 'the set-type sheet calls the first working set "Set 1"');
  await t.inSheet('[data-a="sheetClose"]', 500);

  // the finish prompt: a left/right set with one side checked is left out, and it says so
  await load({ ex: [ex('x0', 'barbell-curl', [set('a', 'N', { w: 30, r: 8, done: true })]), ex('x1', 'single-arm-cable-fly', [set('l', 'N', { side: 'L', pair: 'p', w: 15, r: 10, done: true }), set('r', 'N', { side: 'R', pair: 'p' })], { uni: true })] });
  await t.click('#workout [data-a="woFinish"]', 500);
  const prompt = await t.sheetText();
  r.ok(/1 of 2 sets checked/.test(prompt) && /only one side checked/.test(prompt), 'the finish prompt counts a half-done left/right set as not done, and says so', prompt);
  await t.inSheet('[data-a="ok"]', 900);
  const saved = await t.ev('state.workouts[state.workouts.length - 1].ex.map(x => x.sets.length)');
  r.ok(JSON.stringify(saved) === '[1]', 'only the finished sets are saved', saved);
  await r.done(t);
})();
