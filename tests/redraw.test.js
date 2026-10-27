// the workout screen redraws only the parts that change (that's what keeps it smooth); after every kind of change,
// that must look exactly like drawing the whole screen again
const { open, report } = require('./lib');
(async () => {
  const r = report('In-place redraws match full redraws');
  const pages = [];
  for (const view of ['list', 'focus']) {
    const t = await open({ settings: { view, keypad: 'app' } }); pages.push(t);
    await t.start();
    const snap = () => t.p.evaluate(() => document.getElementById('workout').innerHTML.replace(/(data-clock="">)[^<]*/g, '$1').replace(/ just"/g, '"').replace(/ class=""/g, ''));
    const redraw = force => t.p.evaluate(force => { if (force) document.getElementById('workout').dataset.wk = 'force'; window.__ev('renderWorkout()'); }, force);
    const bad = [];
    let n = 0;
    const act = async (label, fn) => {
      try { await fn(); } catch (e) { bad.push(`${label}: couldn't do it (${e.message.split('\n')[0]})`); return; }
      await t.p.waitForTimeout(150);
      n++;
      await redraw(false); const a = await snap();
      await redraw(true); const c = await snap();
      if (a !== c) { let i = 0; while (a[i] === c[i]) i++; bad.push(`${label}: differs near "${a.slice(Math.max(0, i - 60), i + 60)}"`); }
    };
    const nth = (sel, k = 0) => t.p.evaluate(([s, k]) => document.querySelectorAll(s)[k].click(), [sel, k]);
    await act('check a set', () => nth('#workout .set-row:not(.head) .check', 1));
    await act('uncheck it', () => nth('#workout .set-row:not(.head) .check', 1));
    await act('open the number pad', () => nth('#workout .cell[data-f="r"]', 1));
    await act('type on the pad', () => nth('#keypad [data-a="kpKey"][data-k="7"]'));
    await act('pad next', () => nth('#keypad [data-a="kpNext"]'));
    // on the reps of a working set with no RIR yet, whatever the day's plan, so Log asks for it
    await act('pad log, to the RIR', async () => { await t.ev(`(() => { const s = A().ex[ui.kp.e].sets[ui.kp.s]; s.t = 'N'; s.done = false; delete s.rir; ui.kp.f = 'r'; renderKeypad(); })()`); await nth('#keypad [data-a="kpLog"]'); });
    await act('pad RIR, logged', () => nth('#keypad [data-a="kpEff"]', 1));
    await act('RIR box', () => nth('#workout .cell.eff', 2));
    await act('pick an effort', () => nth('#keypad [data-a="kpEff"]', 1));
    await act('add a set', () => nth('#workout [data-a="addSet"]'));
    await act('delete mode', () => nth('#workout .del-btn'));
    await act('delete a set', () => nth('#workout .check.del', 0));
    await act('delete mode off', () => nth('#workout .del-btn'));
    await act('note editor', () => nth('#workout [data-a="noteOpen"]'));
    await act('note word', () => nth('#workout [data-a="noteChip"]', 0));
    await act('note done', () => nth('#workout [data-a="noteDone"]'));
    await act('setup editor', () => nth('#workout [data-a="setupOpen"]'));
    await act('setup part', () => nth('#workout [data-a="setupChip"]', 0));
    await act('setup done', () => nth('#workout [data-a="setupDone"]'));
    await act('switch to kg→lb', () => t.ev(`(() => { state.settings.unit = 'lb'; renderWorkout(); })()`));
    r.ok(!bad.length && n >= 18, `${view} layout: ${n} changes, the quick redraw always matches a full one`, bad);
  }
  await r.done(...pages);
})();
