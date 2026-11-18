// the sample workouts (for looking around) stay out of what's yours: the week's goal, the spreadsheet export and a
// finished block's summary count only workouts you logged, and Progress counts the same way as Train; a message can be
// flicked away; a picture on its way has an outline behind it, and an iPad's list keeps long exercise names
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
  // Progress agrees with Train: its week, sets this week, streak and the block's sessions and volume are yours alone
  await t.tab('progress');
  const tiles = await p.evaluate(() => [...document.querySelectorAll('.tiles.four .tile b')].map(b => b.textContent.trim()));
  const blockLine = await t.text('.block-card .block-top p.muted');
  r.ok(JSON.stringify(tiles) === JSON.stringify(['0', '0', '0', '0']) && /\b0 sessions\b/.test(blockLine || '') && !(await t.text('.page-h-side .streak')), 'Progress counts the week, the streak and the block the same way as Train: samples left out', { tiles, blockLine });
  r.ok(await p.evaluate(() => !!document.querySelector('.chart-card .chart-bars, .chart-card svg, .chart-card canvas, .chart-card [data-chart]')), 'while the charts still show the samples, so there’s something to look at');
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
  // a picture on its way shows a body outline, not a blank tile; on an iPad the list beside a workout keeps long names
  r.ok(await p.evaluate(() => { const el = document.body.appendChild(Object.assign(document.createElement('span'), { className: 'thumb art' })), bg = getComputedStyle(el).backgroundImage; el.remove(); return /^url\("data:image\/svg\+xml/.test(bg); }), 'an exercise picture still loading has a body outline behind it');
  const ipad = await open({ width: 1024, height: 768, settings: { installHint: false } });
  await ipad.start(); await ipad.p.waitForTimeout(500);
  const cut = await ipad.p.evaluate(() => [...document.querySelectorAll('#workout .nav-name')].filter(n => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1).map(n => n.textContent));
  const long = await ipad.p.evaluate(() => [...document.querySelectorAll('#workout .nav-name')].map(n => n.textContent).find(t => t.length > 26));
  r.ok(long && !cut.length, 'on an iPad the exercise list beside a workout wraps long names instead of cutting them off', { long, cut });
  await ipad.ctx.close();
  // the app open in a second tab changes the look: this one follows (theme and text size), not only the data
  const p2 = await t.ctx.newPage();
  await p2.goto(new URL('manifest.webmanifest', t.p.url()).href);
  await p2.evaluate(() => { const k = 'liftingsanity:data:v1', d = JSON.parse(localStorage.getItem(k)); d.settings.theme = 'light'; d.settings.text = 'xl'; localStorage.setItem(k, JSON.stringify(d)); });
  await t.p.waitForTimeout(500);
  const look = await t.p.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.text]);
  r.ok(look[0] === 'light' && look[1] === 'xl', 'a look changed in another open tab shows here too', look);
  await p2.close();
  await r.done(t);
})();
