// the first time the app opens on a device: a welcome with a few ways to start, and nobody else's plan or weights
const { open, report } = require('./lib');
(async () => {
  const r = report('First time on a new phone');
  const pages = [];
  const fresh = async () => { const t = await open({ fresh: true }); pages.push(t); await t.p.waitForTimeout(600); return t; };
  let t = await fresh();
  const s0 = await t.state();
  r.ok(/Welcome to Lifting Sanity/.test(await t.sheetText()), 'a new phone opens with the welcome');
  r.ok(s0.splits.length === 0 && s0.templates.length === 0, 'nobody else’s split or templates are put on it');
  await t.inSheet('[data-a="wUnit"][data-v="lb"]', 300);
  r.ok((await t.state()).settings.unit === 'lb' && /aria-pressed="true">lb/.test(await t.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().innerHTML)), 'you can choose kg or lb right there');
  await t.inSheet('[data-a="wPlans"]', 400);
  r.ok(/Pick a plan/.test(await t.sheetText()) && await t.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelectorAll('[data-a="planOpen"]').length >= 18), '“Pick a ready-made plan” lists the plans');
  await t.inSheet('[data-a="planOpen"][data-id="fbeod"]', 700);
  r.ok(/Full Body EOD/.test(await t.sheetText()) && /Use this plan/.test(await t.sheetText()), 'a plan opens on its own page first');
  await t.inSheet('[data-a="use"]', 900);
  let s = await t.state();
  const sp = s.splits.find(x => x.id === s.activeSplit);
  r.ok(sp && sp.programId === 'fbeod' && s.templates.every(tp => tp.ex.every(x => x.sets.every(st => st.tw == null))), 'picking a plan makes it yours, without anyone else’s starting weights');
  r.ok(!(await t.p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))) && /Start/.test(await t.text('[data-a="startDay"]') || ''), 'the welcome closes and the plan is ready to start');
  await t.p.reload(); await t.p.waitForTimeout(800);
  r.ok(!(await t.p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))), 'the welcome doesn’t come back');

  t = await fresh(); await t.inSheet('[data-a="wOwn"]', 700);
  r.ok(/New split/.test(await t.sheetText()), '“Build my own” opens a new split to fill in');
  t = await fresh(); await t.inSheet('[data-a="wLook"]', 900);
  r.ok((await t.state()).workouts.length > 10 && (await t.state()).workouts.every(w => w.demo), '“Look around first” loads sample workouts (marked as samples)');
  t = await fresh(); await t.inSheet('[data-a="sheetClose"]', 600);
  r.ok((await t.state()).flags.welcomed === 1 && /No split picked/.test(await t.text('#view') || ''), '“Skip” closes it for good and leaves an empty start with the plans below');

  // someone who already uses the app: no welcome, their split and weights stay
  t = await open(); pages.push(t); await t.p.waitForTimeout(500);
  s = await t.state();
  r.ok(!(await t.p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))) && s.splits.some(x => x.programId === 'fbeod') && s.templates.some(tp => tp.ex.some(x => x.sets.some(st => st.tw != null))), 'someone with data already sees no welcome, and keeps their split with its weights');
  await r.done(...pages);
})();
