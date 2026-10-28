// text you need to read stays readable against what's behind it, in both styles and both modes: the numbers a set will
// log (the faint suggestions), the number pad's heading, the weekly stats terminal, the growth scores in the exercise
// list and the "How sure is this?" note in an exercise's details. Y2K keeps some boxes dark in light mode.
const { open, report } = require('./lib');
// the contrast ratio between an element's text and the first solid background behind it
const CONTRAST = sel => {
  const el = document.querySelector(sel);
  if (!el) return null;
  // rgb()/rgba() in 0–255, or color(srgb …) (what color-mix() gives) in 0–1
  const rgb = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const v = m.map(Number); return c.startsWith('color(') ? [...v.slice(0, 3).map(x => x * 255), ...v.slice(3)] : v; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bg = null;
  for (let a = el; a && !bg; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if (c && (c.length < 4 || c[3] === 1)) bg = c; }
  const fg = rgb(getComputedStyle(el).color), L1 = lum(fg), L2 = lum(bg || [255, 255, 255]);
  return +((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(2);
};
(async () => {
  const r = report('Contrast: text stays readable in both styles and modes');
  for (const style of ['clean', 'y2k']) for (const theme of ['dark', 'light']) {
    const t = await open({ settings: { style, theme, keypad: 'app' } }), p = t.p, at = `${style} ${theme}`;
    // (wait for it first: a busy machine can take a moment to open a sheet or the pad)
    const ratio = async sel => { await p.waitForSelector(sel, { state: 'attached', timeout: 4000 }).catch(() => {}); return p.evaluate(CONTRAST, sel); };
    await t.click('[data-a="demoOn"]', 300).catch(async () => { await t.tab('settings'); await t.click('[data-a="demoOn"]', 300); });
    await t.tab('progress');
    const term = await ratio('.term');
    await t.tab('library');
    const score = await ratio('#view .score.ok') ?? await ratio('#view .score');
    await t.click('#view [data-a="openEx"]', 600);
    const sure = await ratio('.sheet-wrap.in .sci-sure p');
    await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
    await t.start();
    const sug = await ratio('#workout .cell .ph') ?? await ratio('#workout .cell');
    await p.evaluate(() => document.querySelectorAll('#workout .cell[data-f="w"]')[1].click()); await p.waitForTimeout(400);
    const pad = await ratio('#keypad .kp-title b'), padSub = await ratio('#keypad .kp-title span');
    r.ok(sug >= 3, `${at}: the numbers a set will log are easy to read (${sug}:1)`, sug);
    r.ok(pad >= 4.5 && padSub >= 3, `${at}: the number pad's heading (${pad}:1, ${padSub}:1)`, { pad, padSub });
    r.ok(term >= 4.5, `${at}: the weekly stats terminal (${term}:1)`, term);
    r.ok(score >= 3, `${at}: a growth score in the exercise list (${score}:1)`, score);
    r.ok(sure >= 4.5, `${at}: “How sure is this?” in an exercise's details (${sure}:1)`, sure);
    await t.ctx.close();
  }
  await r.done();
})();
