// the app's own self-check (Settings has none; run LiftingSanity.selfCheck() in a browser console to see it)
const { open, report } = require('./lib');
(async () => {
  const r = report('Self-check: the calculation rules, run on made-up sets');
  const t = await open();
  const before = await t.p.evaluate(() => localStorage.getItem('liftingsanity:data:v1'));
  const out = await t.p.evaluate(() => window.LiftingSanity.selfCheck());
  for (const c of out) r.ok(c.passed, c.check, c.detail);
  r.ok(before === await t.p.evaluate(() => localStorage.getItem('liftingsanity:data:v1')), 'saved data untouched by the self-check');
  await r.done(t);
})();
