// records, charts and plans: records stay right when history changes, weeks across clock changes, chart labels,
// splits and templates, blocks and resets, custom exercises
const { open, report } = require('./lib');
const D = 864e5;
const w = (id, ago, exs) => ({ id, name: id, ago, ex: exs.map(([exId, sets], i) => ({ id: id + i, exId, sets: sets.map(([wt, r], k) => ({ id: `${id}${i}${k}`, t: 'N', w: wt, r, done: true })) })) });
(async () => {
  const r = report('Records, charts and plans');
  const t = await open();
  const history = async ws => { await t.ev(`(() => { state.workouts = ${JSON.stringify(ws)}.map(w => ({ ...w, start: Date.now() - w.ago * 864e5, end: Date.now() - w.ago * 864e5 + 3600e3, prs: [] })).sort((a, b) => a.start - b.start); recalcPRs(); save(true); render(); })()`); };
  const prsOf = id => t.ev(`state.workouts.find(w => w.id === '${id}').prs.map(p => p.kind + ' ' + p.set.w + 'x' + p.set.r)`);

  // records after history changes
  await history([w('A', 10, [['barbell-bench-press', [[100, 5]]]]), w('B', 3, [['barbell-bench-press', [[105, 5]]]])]);
  r.ok((await prsOf('B')).includes('Heaviest 105x5'), 'a heavier set is a record');
  await t.ev(`(() => { const x = { id: 'P', name: 'Past', start: Date.now() - 6 * 864e5, end: Date.now() - 6 * 864e5 + 3600e3, prs: [], ex: [{ id: 'P0', exId: 'barbell-bench-press', sets: [{ id: 'P00', t: 'N', w: 120, r: 5, done: true }] }] }; state.workouts.push(x); state.workouts.sort((a, b) => a.start - b.start); recalcPRs(); })()`);
  r.ok((await prsOf('B')).length === 0 && (await prsOf('P')).includes('Heaviest 120x5'), 'logging a heavier past workout takes the record from the later one');
  await t.ev(`(() => { state.workouts = state.workouts.filter(w => w.id !== 'P'); recalcPRs(); })()`);
  r.ok((await prsOf('B')).includes('Heaviest 105x5'), 'deleting it gives the record back');
  // the same exercise twice in one workout
  await history([w('A', 10, [['barbell-bench-press', [[95, 5]]]]), w('B', 2, [['barbell-bench-press', [[110, 3]]], ['barbell-bench-press', [[100, 5]]]])]);
  const dup = await prsOf('B');
  r.ok(dup.length === 2 && dup.every(p => /110x3/.test(p)), 'an exercise done twice in one workout gets one record of each kind, its best', dup);
  // a reset during a workout counts that workout as after it
  await history([w('A', 10, [['leg-press', [[200, 10]]]])]);
  await t.ev(`(() => { state.active = { id: 'now', name: 'Now', start: Date.now() - 300000, cur: 0, note: '', ex: [{ id: 'n0', exId: 'leg-press', rest: 90, uni: false, ss: null, note: '', sets: [{ id: 'n00', t: 'N', w: 120, r: 12, done: true }] }] }; ui.woHidden = true; save(true); })()`);
  await t.ev(`(() => { (state.exResets['leg-press'] = []).push(resetStamp('leg-press')); finishWorkout(); })()`); await t.p.waitForTimeout(600);
  const since = await t.ev(`records('leg-press', baseline('leg-press')).sessions`);
  r.ok(since === 1, 'resetting an exercise during a workout counts that workout as after the reset', since);
  await t.inSheet('[data-a="sheetClose"]', 500).catch(() => {});

  // weekly volume: one bar per calendar week, also across clock changes
  for (const tz of ['Australia/Sydney', 'Europe/London']) {
    const z = await open({ tz, clock: new Date('2026-11-10T12:00:00Z') });
    await z.ev(`(() => {
      const wk = weekStart(Date.now()); state.workouts = [];
      for (let i = 0; i < 12; i++) { const d = new Date(wk); d.setDate(d.getDate() - 7 * i - 1); d.setHours(23, 30); const s = d.getTime();
        state.workouts.push({ id: 'w' + i, name: 'W', start: s, end: s + 1800e3, prs: [], ex: [{ id: 'x' + i, exId: 'barbell-bench-press', sets: [{ id: 's' + i, t: 'N', w: 100, r: 5, done: true }] }] }); }
      state.workouts.sort((a, b) => a.start - b.start); save(true); })()`);
    await z.tab('progress');
    // the weekly volume chart's bars: one 500 kg workout in each of the last 11 weeks
    const bars = await z.ev(`[...charts.values()].find(s => s.bars && s.bars.length === 12).bars.map(b => b.v)`);
    r.ok(bars.filter(v => v === 500).length === 11 && bars.every(v => v === 0 || v === 500), `${tz}: every late-Sunday workout lands in its own week's bar, clock changes included`, bars);
    await z.ctx.close();
  }
  // chart labels never repeat
  const labels = await t.ev(`(() => { const svg = lineSVG({ points: [{ x: Date.now() - 864e6, y: 10 }, { x: Date.now(), y: 11 }], whole: true, fmt: v => v, tick: v => compact(v) }, 600); return [...svg.matchAll(/x="38" y="[^"]*" text-anchor="end">([^<]*)</g)].map(m => m[1]); })()`);
  r.ok(labels.length > 1 && new Set(labels).size === labels.length, 'chart labels for reps are whole numbers and never repeat', labels);
  // records saved by the first version (one row with reps for each side)
  const legacy = await open({ seed: { v: 1, workouts: [{ id: 'old', name: 'Old', start: Date.now() - 5 * D, ex: [{ id: 'x', exId: 'dumbbell-curl', sets: [{ id: 's', t: 'N', w: 20, rl: 10, rr: 9, done: true }] }], prs: [{ exId: 'dumbbell-curl', kind: 'Heaviest', set: { w: 20, rl: 10, rr: 9 } }] }] } });
  const ls = await legacy.state();
  r.ok(ls.workouts[0].ex[0].sets.length === 2 && ls.workouts[0].ex[0].sets.every(s => s.r > 0 && s.side), 'an early save with left and right reps on one row opens as a left row and a right row');

  // splits: removing or moving days keeps "up next" on the same day
  const sp = await t.ev(`(() => { const p = PROGRAMS.find(p => p.id === 'ul'); installProgram(p, true); const s = activeSplit(); s.days = s.days.filter(d => d !== 'rest'); s.pos = 2; return s.days.map(d => tplById(d).name); })()`);
  const nextName = () => t.ev(`tplById(activeSplit().days[activeSplit().pos]).name`);
  const was = await nextName();
  await t.ev(`deleteTemplate(activeSplit().days[0])`);
  r.ok(await nextName() === was, 'deleting an earlier day keeps "up next" on the same day', { days: sp, was, now: await nextName() });
  await t.ev(`(() => { const s = activeSplit(); moveDay(s, s.pos, s.pos - 1); })()`);
  r.ok(await nextName() === was, 'moving a day keeps "up next" on it');
  // "after a rest day" only when one is coming
  const restText = await t.ev(`(() => { const s = activeSplit(); s.days = s.days.filter(d => d !== 'rest'); s.days.push('rest'); s.pos = 0;
    state.workouts.push({ id: 'today', name: 'T', start: Date.now() - 3600e3, end: Date.now(), tplId: s.days[0], splitId: s.id, day: 0, prs: [], ex: [] }); s.pos = 1; render(); return document.querySelector('.upnext-b').textContent; })()`);
  r.ok(!/after a rest day/.test(restText), '"after a rest day" isn’t said when the next day isn’t a rest day', restText.slice(0, 120));
  // template editor: the left/right menu reflects your own setting for that exercise
  await t.ev(`state.exPrefs['single-arm-cable-fly'] = { uni: false }`);
  const label = await t.ev(`tplUni({ exId: 'single-arm-cable-fly', sets: [] }) ? 'together' : 'separately'`);
  r.ok(label === 'separately', 'a template follows your left/right setting for the exercise', label);

  // blocks: an Undo tapped twice never removes a real block
  await t.tab('progress');
  await t.click('[data-a="blockReset"]', 500); await t.inSheet('[data-a="ok"]', 600);
  await t.click('[data-a="blockUndo"]', 500); await t.inSheet('[data-a="ok"]', 500);
  await t.p.evaluate(() => { const b = document.querySelector('#toast [data-a="toastAct"]'); if (b) b.click(); }); await t.p.waitForTimeout(300);
  const blocks = await t.ev('state.blocks.length');
  r.ok(blocks === 1 && (await t.p.evaluate(() => document.querySelector('#view').innerHTML.length)) > 500, 'undoing a new block twice leaves the first block and Progress intact', blocks);
  // Enter while Cancel is focused cancels
  await t.click('[data-a="blockRename"]', 500); await t.p.fill('#sheetInput', 'Typo'); await t.p.focus('#sheets .sheet-wrap.in [data-a="sheetClose"].btn'); await t.p.keyboard.press('Enter'); await t.p.waitForTimeout(400);
  r.ok(await t.ev('curBlock().name') !== 'Typo', 'Enter on the Cancel button doesn’t save');

  // custom exercises: in use in a workout → hidden, not deleted; changing how it's logged doesn't break its details
  await t.ev(`(() => { state.custom.push({ id: 'c-test', name: 'My Cable Thing', m: 'chest', eq: 'cable', k: 'wr', sec: [], uni: false, custom: true }); rebuildCustom();
    state.active = { id: 'a2', name: 'Now', start: Date.now(), cur: 0, note: '', ex: [{ id: 'cx', exId: 'c-test', rest: 90, uni: false, ss: null, note: '', sets: [] }] }; ui.woHidden = true; save(true); exerciseSheet('c-test'); })()`);
  await t.p.waitForTimeout(600);
  await t.inSheet('[data-a="delCustom"]', 500); await t.inSheet('[data-a="ok"]', 600);
  r.ok(await t.ev(`state.custom.find(c => c.id === 'c-test')?.hidden === true`), 'a custom exercise in the open workout is hidden, not deleted');
  await t.ev(`(() => { closeAllSheets(); state.custom.find(c => c.id === 'c-test').k = 'dur'; rebuildCustom(); exerciseSheet('c-test'); })()`); await t.p.waitForTimeout(600);
  r.ok(/Longest/.test(await t.sheetText()), 'changing how a custom exercise is logged: its details still open, with the right charts');
  await t.ev('closeAllSheets(); state.active = null; save(true); renderWorkout()');
  await r.done(t, legacy);
})();
