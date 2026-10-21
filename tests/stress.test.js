// random tapping all over the app (every button, odd typed values, Escape), in six set-ups, checking after every
// step that nothing broke: no page errors, no NaN/undefined on screen, no broken or duplicated data, saves readable.
// STEPS=500 node tests/stress.test.js for a longer run; SEED=… for a different path
const { open, report } = require('./lib');
const STEPS = +process.env.STEPS || 120, SEED = +process.env.SEED || 7;
const SETUPS = [
  { style: 'clean', view: 'focus', uniStyle: 'rows', w: 393 }, { style: 'clean', view: 'list', uniStyle: 'one', w: 393 },
  { style: 'y2k', view: 'focus', uniStyle: 'one', w: 393 }, { style: 'clean', view: 'list', uniStyle: 'rows', w: 820 },
  { style: 'y2k', view: 'list', uniStyle: 'rows', w: 375 }, { style: 'clean', view: 'focus', uniStyle: 'one', w: 430, effort: 'rpe', unit: 'lb' }
];
// things that leave the page or need a person (files, sharing)
const SKIP = ['exportFile', 'exportCopy', 'demoOff', 'install', 'dismissInstall', 'reload', 'shareWeek'];
const ODD = ['', '0', '-3', '1e9', '0.5', 'abc', '12', '7', '100', '2.5', ' ', '99999', '1:30', '00:45'];
const CHECKS = () => {
  const s = window.LiftingSanity.state, out = [], txt = document.body.innerText;
  for (const word of ['NaN', 'undefined']) if (new RegExp('\\b' + word + '\\b').test(txt)) out.push(word + ' shown on screen');
  const chk = (w, where) => {
    if (!Array.isArray(w.ex)) { out.push(where + ': exercises not a list'); return; }
    for (const x of w.ex) {
      if (!Array.isArray(x.sets)) { out.push(where + ': sets not a list'); continue; }
      const ids = new Set();
      for (const t of x.sets) {
        if (t.id) { if (ids.has(t.id)) out.push(where + ': two sets with one id'); ids.add(t.id); }
        for (const f of ['w', 'r', 'sec', 'dist', 'rir']) if (t[f] != null && (typeof t[f] !== 'number' || !isFinite(t[f]) || t[f] < 0)) out.push(`${where}: bad ${f}=${t[f]}`);
        if (t.pair) { const m = x.sets.filter(o => o.pair === t.pair); if (m.length !== 2 || m[0].side === m[1].side) out.push(`${where}: broken left/right pair`); }
      }
    }
  };
  if (s.active) { chk(s.active, 'open workout'); if (s.active.ex.length && (s.active.cur < 0 || s.active.cur >= s.active.ex.length)) out.push('current exercise out of range'); }
  s.workouts.forEach(w => chk(w, 'history'));
  for (let i = 1; i < s.workouts.length; i++) if (s.workouts[i].start < s.workouts[i - 1].start) { out.push('history out of order'); break; }
  if (new Set(s.workouts.map(w => w.id)).size !== s.workouts.length) out.push('two workouts with one id');
  for (const sp of s.splits) for (const d of sp.days) if (d !== 'rest' && !s.templates.some(t => t.id === d)) out.push('a split day points to a missing template');
  try { JSON.parse(localStorage.getItem('liftingsanity:data:v1')); } catch (e) { out.push('the save can’t be read'); }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('the page scrolls sideways');
  return out;
};
(async () => {
  const r = report(`Stress: ${STEPS} random steps in each of ${SETUPS.length} set-ups`);
  let seed = SEED;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const reached = new Set();
  for (const cfg of SETUPS) {
    const { w, ...settings } = cfg;
    const t = await open({ width: w, height: w > 600 ? 1180 : 852, settings });
    const p = t.p, log = [], issues = new Map();
    p.on('dialog', d => d.dismiss());
    await t.tab('settings'); await t.click('[data-a="demoOn"]');
    for (let step = 0; step < STEPS; step++) {
      const x = rnd();
      try {
        if (x < 0.08) { await p.keyboard.press('Escape'); log.push('Esc'); }
        else if (x < 0.2) {
          const v = ODD[Math.floor(rnd() * ODD.length)], k = rnd();
          const did = await p.evaluate(([v, k]) => { const els = [...document.querySelectorAll('input:not([type=file]):not([type=checkbox]), textarea')].filter(e => e.offsetParent); if (!els.length) return false; const e = els[Math.floor(k * els.length)]; e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); e.blur(); return true; }, [v, k]);
          if (did) log.push(`type "${v}"`);
        } else {
          const a = await p.evaluate(([k, skip]) => {
            const top = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(), scope = top || document;
            const els = [...scope.querySelectorAll('[data-a]')].filter(e => !e.disabled && e.offsetParent && !skip.includes(e.dataset.a) && !e.closest('[hidden], [inert]'));
            if (!els.length) return null;
            const el = els[Math.floor(k * els.length)]; el.click(); return el.dataset.a;
          }, [rnd(), SKIP]);
          if (a) { log.push(a); reached.add(a); }
        }
        await p.waitForTimeout(40);
        for (const b of await p.evaluate(CHECKS)) if (!issues.has(b)) issues.set(b, log.slice(-6).join(' → '));
      } catch (e) { /* something went away mid-step: fine */ }
    }
    for (const e of t.errors) if (!issues.has('page error: ' + e)) issues.set('page error: ' + e, log.slice(-6).join(' → '));
    t.errors.length = 0;
    r.ok(!issues.size, `${JSON.stringify(cfg)}: nothing broke`, [...issues].map(([k, v]) => `${k} (after ${v})`));
    await t.ctx.close();
  }
  console.log(`  ${reached.size} different buttons and actions were used`);
  await r.done();
})();
