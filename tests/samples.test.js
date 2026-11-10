// the sample workouts (for looking around) stay out of what's yours: the week's goal, the spreadsheet export and a
// finished block's summary count only workouts you logged; and a message can be flicked away
const { open, report } = require('./lib');
(async () => {
  const r = report('Samples stay samples; messages can be flicked away');
  const t = await open({ width: 393, height: 852, settings: { keypad: 'app', installHint: false } }), p = t.p;
  await t.tab('settings'); await t.click('[data-a="demoOn"]', 500);
  // a sample session this week, whatever day the tests run on
  await t.ev(`(() => { const w = state.workouts[state.workouts.length - 1]; w.start = Date.now() - 3600e3; w.end = Date.now() - 600e3; save(true); render(); })()`);
  await t.tab('train');
  const wk = await t.text('.week-sum');
  r.ok(await t.ev('state.workouts.every(w => w.demo) && state.workouts.length > 5') && /^0 of 3 workouts this week/.test(wk || ''), 'sample workouts don’t count towards the week’s goal', wk);
  await t.tab('settings'); await t.click('[data-a="exportCSV"]', 400);
  r.ok(/Nothing logged yet/.test(await t.text('#toast.in') || ''), 'with only samples there’s nothing to export', await t.text('#toast'));

  // flick that message away: down, and it's gone long before its time is up
  const gone = async (dx, dy) => {
    await t.ev(`toast('Removed something.', { label: 'Undo', fn: () => { window.__undone = true; } })`); await p.waitForTimeout(300);
    const b = await p.evaluate(() => { const r = document.querySelector('#toast span').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
    await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + dx / 2, b.y + dy / 2, { steps: 3 }); await p.mouse.move(b.x + dx, b.y + dy, { steps: 3 }); await p.mouse.up();
    await p.waitForTimeout(450);
    return p.evaluate(() => !document.querySelector('#toast').classList.contains('in'));
  };
  const down = await gone(0, 60), up = await gone(0, -60), side = await gone(90, 0);
  r.ok(down && up && side && !(await p.evaluate(() => window.__undone)), 'a message goes away with a swipe down, up or to the side (and that isn’t a tap on Undo)', { down, up, side });
  await t.ev(`toast('Removed something.', { label: 'Undo', fn: () => {} })`); await p.waitForTimeout(300);
  const b = await p.evaluate(() => { const r = document.querySelector('#toast span').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x, b.y + 10, { steps: 2 }); await p.mouse.up(); await p.waitForTimeout(400);
  r.ok(await p.evaluate(() => document.querySelector('#toast').classList.contains('in') && !document.querySelector('#toast').style.transform), 'a small nudge leaves it where it was');
  await p.waitForTimeout(5600);
  r.ok(await p.evaluate(() => !document.querySelector('#toast').classList.contains('in')), 'left alone, a message with Undo goes after 6 seconds');

  // one workout of your own among the samples: the export and a block's summary hold just that one
  await t.ev(`(() => { state.workouts.push({ id: 'mine', name: 'Mine', tplId: null, start: Date.now() - 2 * 864e5, end: Date.now() - 2 * 864e5 + 3600e3, prs: [], ex: [{ id: 'mx', exId: 'barbell-bench-press', rest: 90, uni: false, ss: null, note: '', sets: [{ id: 'ms', t: 'N', w: 60, r: 8, done: true }] }] }); state.workouts.sort((a, b) => a.start - b.start); recalcPRs(); save(true); render(); })()`);
  await t.tab('settings');
  const [csv] = await Promise.all([p.waitForEvent('download'), t.click('[data-a="exportCSV"]', 500)]);
  const rows = require('fs').readFileSync(await csv.path(), 'utf8').split('\r\n').filter(Boolean);
  r.ok(rows.length === 2 && /,Mine,Barbell Bench Press,1,Working set,60,8,/.test(rows[1]), 'the spreadsheet holds your sets only, not the samples', rows.slice(0, 3));
  await t.tab('progress'); await t.click('[data-a="blockReset"]', 500); await t.inSheet('[data-a="ok"]', 1500);
  const show = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in.block-show .bs-past'); return s && s.textContent.replace(/\s+/g, ' '); });
  r.ok(show && /1\s*session/.test(show) && !/Biggest gains/.test(show), 'a finished block’s summary counts your workouts, not the samples', show);
  await r.done(t);
})();
