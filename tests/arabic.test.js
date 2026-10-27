// Arabic: the whole app reads right to left, nothing is left in English except what's meant to be (exercise names,
// how-to steps, units, citations), nothing is cut off, gestures follow the reading direction, and English comes back
const { open, report } = require('./lib');
// words that stay as they are in Arabic: units, abbreviations (1RM shows up as RM), names of things and plans, the
// English choice in the language setting
const KEEP = /^(kg|lb|km|mi|yd|RIR|RPE|1RM|AMRAP|EZ|TRX|PPL|PHUL|iCloud|Safari|Chrome|Android|iPhone|iPad|Lifting|Sanity|RepDB|repdb|co|Everkinetic|Greg|Priday|MIT|CC|BY|SA|Y2K|LS|OS|SYS|OK|UTC|TYO|NYC|exercises|dataset|github|com|https|www|org|Lyfta|Hevy|Strong|Smith|EOD|PHUL|PHAT|Bro|Arnold|Push|Pull|Legs|Upper|Lower|Full|Body|Split|Power|Hypertrophy|RM|English|LCD|HUD|Drive)$/;
const ENGLISH = (names) => {
  const skip = '.steps, .refs, .credits, #hud, .term, .sci-ref, a[href^="http"], input, textarea, svg, [hidden], .lang-seg, [lang="en"]';
  const out = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest(skip) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let t = n.textContent;
    if (!/[A-Za-z]{2}/.test(t)) continue;
    for (const nm of names) if (t.includes(nm)) t = t.split(nm).join(' ');
    const words = (t.match(/[A-Za-z][A-Za-z'’-]+/g) || []).filter(w => !window.__keep.test(w));
    if (words.length) out.add(words.slice(0, 6).join(' ') + '  ←  ' + n.textContent.trim().slice(0, 70));
  }
  return [...out];
};
(async () => {
  const r = report('Arabic');
  const t = await open();
  const p = t.p;
  await t.tab('settings');
  await Promise.all([p.waitForEvent('load'), t.click('[data-a="setLang"][data-v="ar"]', 0)]);
  await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(600);
  r.ok(await p.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar'), 'choosing العربية turns the app right to left');
  r.ok(await p.evaluate(() => /[؀-ۿ]/.test(document.querySelector('#tabs').textContent)), 'the tabs are in Arabic');
  const names = await t.ev('[...LIB.map(e => e.name), ...state.custom.map(c => c.name)].sort((a, b) => b.length - a.length)');
  await p.evaluate(k => { window.__keep = new RegExp(k); }, KEEP.source);
  const scan = async label => { await p.waitForTimeout(450); return (await p.evaluate(`(${ENGLISH.toString()})(${JSON.stringify(names)})`)).map(x => `${label}: ${x}`); };
  let left = [];
  await t.tab('settings'); await t.click('[data-a="demoOn"]');
  for (const tab of ['train', 'history', 'library', 'progress', 'settings']) {
    await t.tab(tab);
    for (let y = 0; y < 5; y++) { left.push(...await scan(tab)); await p.evaluate(() => scrollBy(0, innerHeight * 0.9)); }
    await p.evaluate(() => scrollTo(0, 0));
  }
  await t.tab('settings'); await t.click('[data-a="openColors"]', 700);
  for (let y = 0; y < 4; y++) { left.push(...await scan('colours')); await p.evaluate(() => { const b = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.sheet-body'); b.scrollTop += 600; }); }
  await t.ev('closeAllSheets()'); await p.waitForTimeout(500);
  await t.tab('history'); await t.click('#view .hist-card', 700); left.push(...await scan('workout details')); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.tab('library'); await t.click('#view .ex-row', 800);
  for (let y = 0; y < 6; y++) { left.push(...await scan('exercise details')); await p.evaluate(() => { const b = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.sheet-body'); b.scrollTop += 600; }); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.tab('train'); await t.click('[data-a="planReview"]', 800);
  for (let y = 0; y < 5; y++) { left.push(...await scan('plan review')); await p.evaluate(() => { const b = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.sheet-body'); b.scrollTop += 600; }); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // a ready-made plan's page, in its machine version, and the switch between versions on your split
  await t.ev(`ui.planF = { days: 0, level: '' }; render();`);
  await t.click('[data-a="planOpen"][data-id="ap"]', 800); await t.inSheet('[data-a="ver"][data-v="machine"]', 400);
  for (let y = 0; y < 6; y++) { left.push(...await scan('plan page')); await p.evaluate(() => { const b = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.sheet-body'); b.scrollTop += 600; }); }
  await t.inSheet('[data-a="use"]', 900);
  await t.click('[data-a="splitVersion"]', 600); left.push(...await scan('version switch')); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.start();
  left.push(...await scan('workout'));
  await t.click('#workout [data-a="woMenu"]', 500); left.push(...await scan('workout menu')); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.click('#workout [data-a="exMenu"]', 500); left.push(...await scan('exercise menu')); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('#workout .cell[data-f="r"]')[1].click()); await p.waitForTimeout(500); left.push(...await scan('number pad'));
  await p.evaluate(() => document.querySelectorAll('#workout .cell.eff')[1].click()); await p.waitForTimeout(400); left.push(...await scan('number pad, RIR'));
  await t.click('#keypad [data-a="kpClose"]', 400);
  await p.evaluate(() => document.querySelectorAll('#workout .set-row:not(.head) .check')[1].click()); await p.waitForTimeout(700); left.push(...await scan('rest timer'));
  await t.ev(`(() => { state.settings.view = 'list'; save(true); renderWorkout(true); })()`); await p.waitForTimeout(500);
  for (let y = 0; y < 6; y++) { left.push(...await scan('workout list')); await p.evaluate(() => document.querySelector('#workout .wo-main').scrollBy(0, innerHeight * 0.8)); }
  await t.ev(`(() => { for (const x of A().ex) for (const s of x.sets) { s.done = true; s.w = s.tw ?? 10; s.r = 5; } })()`);
  await t.click('[data-a="woFinish"]', 500); left.push(...await scan('finish prompt')); await t.inSheet('[data-a="ok"]', 1000);
  left.push(...await scan('summary'));
  r.ok(!left.length, 'no English left on any screen (exercise names, how-to steps, units and citations aside)', [...new Set(left)].slice(0, 40));
  // the welcome, on a new phone set to Arabic
  const w = await open({ fresh: true });
  await w.p.evaluate(() => localStorage.setItem('liftingsanity:lang', 'ar')); await w.p.reload(); await w.p.waitForTimeout(900);
  await w.p.evaluate(k => { window.__keep = new RegExp(k); }, KEEP.source);
  const wl = await w.p.evaluate(`(${ENGLISH.toString()})([])`);
  r.ok(/[؀-ۿ]/.test(await w.sheetText()) && !wl.length, 'the welcome is in Arabic', wl.slice(0, 10));
  // names the app gave (a plan, its days, a new workout) follow the language; a name someone typed stays as typed
  await t.ev(`(() => { closeAllSheets(); installProgram(PROGRAMS.find(p => p.id === 'ppl'), true); state.splits.push({ id: 'typed', name: 'تقسيمي', days: [], pos: 0 }); startEmpty(); save(true); })()`); await p.waitForTimeout(400);
  const before = await t.ev(`({ split: activeSplit().name, days: activeSplit().days.map(d => tplById(d).name), workout: A().name })`);
  // back to English
  await t.ev('closeAllSheets()'); await t.tab('settings');
  await Promise.all([p.waitForEvent('load'), t.click('[data-a="setLang"][data-v="en"]', 0)]);
  await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(500);
  r.ok(await p.evaluate(() => document.documentElement.dir === 'ltr' && /Settings/.test(document.querySelector('#tabs').textContent)), 'English comes back, left to right');
  const after = await t.ev(`({ split: activeSplit().name, days: activeSplit().days.map(d => tplById(d).name), workout: A().name, typed: state.splits.find(s => s.id === 'typed').name, page: document.body.innerText })`);
  r.ok(/[؀-ۿ]/.test(before.split + before.days.join('') + before.workout) && after.split === 'Push / Pull / Legs' && after.days.join() === 'Push,Pull,Legs' && /^(Morning|Afternoon|Evening) workout$/.test(after.workout) && after.typed === 'تقسيمي', 'a plan, its days and a workout named in Arabic show in English after switching; a name you typed stays as you typed it', { before, after: { ...after, page: undefined } });
  await r.done(t, w);
})();
