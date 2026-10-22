// the two extra choices in Arabic: exercise names in Arabic, and units and gym terms in Arabic. Both start off; on,
// they change what's shown and nothing else (search finds either name, scores and saved data stay the same)
const { open, report } = require('./lib');
const KEEP = /^(Lifting|Sanity|iCloud|Drive|Safari|Chrome|Android|iPhone|iPad|RepDB|repdb|co|Everkinetic|Greg|Priday|MIT|CC|BY|SA|Y2K|LCD|HUD|LS|OS|SYS|OK|UTC|TYO|NYC|exercises|dataset|github|com|https|www|org|English|Full|Body|EOD|ERASE|JSON|EZ|TRX|JM|T|V|L)$/;
// (T, V and L stay in a few names for the shape they describe: بار T for a T-bar)
// visible Latin words, outside how-to steps, citations, the Y2K HUD and the weekly terminal card
const LATIN = keep => {
  const skip = '.steps, .refs, .credits, #hud, .term, .sci-ref, a[href^="http"], input, textarea, svg, [hidden], .lang-seg, [lang="en"], .exd-en';
  const out = new Set(), re = new RegExp(keep);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest(skip) || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const words = (n.textContent.match(/[A-Za-z][A-Za-z'’-]*/g) || []).filter(w => !re.test(w));
    if (words.length) out.add(words.slice(0, 5).join(' ') + '  ←  ' + n.textContent.trim().slice(0, 60));
  }
  return [...out];
};
(async () => {
  const r = report('Arabic options: exercise names, units and gym terms'), pages = [];
  const t = await open();
  const p = t.p;
  pages.push(t);
  const reload = async () => { await p.reload(); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(600); };
  const pick = async (a, v) => { await t.tab('settings'); await Promise.all([p.waitForEvent('load'), t.click(`[data-a="${a}"][data-v="${v}"]`, 0)]); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(600); };
  // the workout comes back open after a reload; from the mini bar otherwise
  const showWo = async () => { if (await p.evaluate(() => !!document.querySelector('#mini:not([hidden]) [data-a="resume"]'))) await showWo(); else await p.waitForTimeout(300); };
  const scores = () => t.ev(`['barbell-bench-press', 'lever-seated-fly', 'seated-cable-row', 'lever-leg-extension'].map(id => scoreOf(id))`);
  const scoresEn = await scores();
  // English: neither choice is offered
  await t.tab('settings');
  r.ok(!(await p.$('[data-a="setArNames"]')) && !(await p.$('[data-a="setArTerms"]')), 'in English, the two Arabic choices aren’t shown');
  // Arabic, as it starts
  await p.evaluate(() => localStorage.setItem('liftingsanity:lang', 'ar')); await reload();
  await t.tab('settings');
  r.ok(await p.evaluate(() => !!document.querySelector('[data-a="setArNames"][data-v="en"].on') && !!document.querySelector('[data-a="setArTerms"][data-v="en"].on')), 'in Arabic, both choices are offered and start off');
  await t.start();
  const head0 = await t.text('#workout .set-row.head'), name0 = await t.text('#workout .exc-name');
  r.ok(/kg/.test(head0) && /RIR/.test(head0) && /^[A-Za-z]/.test(name0), 'to start, exercise names are English and units and terms are as they are', { head0, name0 });
  await t.click('[data-a="woMin"]', 600);
  // Arabic names
  await pick('setArNames', 'ar');
  await showWo();
  const name1 = await t.text('#workout .exc-name');
  r.ok(/[؀-ۿ]/.test(name1) && !/[A-Za-z]{3}/.test(name1), 'with Arabic names, the workout shows the exercise’s Arabic name', name1);
  r.ok(await t.ev(`A().ex.every(x => x.exId && LIB_MAP.has(x.exId))`), 'the workout still refers to the same exercises');
  await t.click('[data-a="woMin"]', 600);
  await t.tab('library');
  for (const q of ['bench', 'بنش']) {
    await p.fill('#libQ', q); await p.waitForTimeout(450);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#libList .ex-row b')].slice(0, 5).map(b => b.textContent));
    r.ok(rows.length && rows.every(x => /[؀-ۿ]/.test(x)), `searching “${q}” finds exercises, shown with Arabic names`, rows);
  }
  await t.click('#libList .ex-row', 900);
  const en = await p.evaluate(() => { const e = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.exd-en'); return e && e.textContent; });
  r.ok(en && /^[A-Za-z]/.test(en), 'an exercise’s details show its English name under the Arabic one', en);
  r.ok(await p.evaluate(() => { const a = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('a[href*="youtube"]'); return !a || /search_query=[A-Za-z]/.test(a.href); }), 'its video link still searches in English');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  r.ok(JSON.stringify(await scores()) === JSON.stringify(scoresEn), 'growth scores are the same with Arabic names', { en: scoresEn, ar: await scores() });
  // Arabic units and terms
  await pick('setArTerms', 'ar');
  await t.tab('settings');
  r.ok(await p.evaluate(() => /كغ/.test(document.querySelector('[data-a="setUnit"][data-v="kg"]').textContent) && /احتياط/.test(document.querySelector('[data-a="setEffort"][data-v="rir"]').textContent)), 'with Arabic terms, Settings shows كغ and احتياط');
  await showWo();
  const head1 = await t.text('#workout .set-row.head');
  r.ok(/كغ/.test(head1) && /احتياط/.test(head1) && !/kg|RIR/.test(head1), 'the set columns read كغ and احتياط', head1);
  r.ok(await p.evaluate(() => [...document.querySelectorAll('#workout .badge.t-W')].every(b => b.textContent.trim() === 'إ')), 'a warm-up set is marked إ');
  r.ok(await t.ev(`state.settings.unit === 'kg' && state.settings.effort === 'rir'`), 'what’s saved doesn’t change');
  // nothing English left with both on (brand names, how-to steps and citations aside)
  const left = [];
  const scan = async label => { await p.waitForTimeout(400); for (const x of await p.evaluate(`(${LATIN.toString()})(${JSON.stringify(KEEP.source)})`)) left.push(`${label}: ${x}`); };
  await scan('workout');
  await t.ev(`(() => { state.settings.view = 'list'; save(true); renderWorkout(true); })()`); await p.waitForTimeout(500);
  for (let y = 0; y < 5; y++) { await scan('workout list'); await p.evaluate(() => document.querySelector('#workout .wo-main').scrollBy(0, innerHeight * 0.8)); }
  await t.click('[data-a="woMin"]', 600);
  await t.tab('settings'); await t.click('[data-a="demoOn"]');
  for (const tab of ['train', 'history', 'library', 'progress']) { await t.tab(tab); for (let y = 0; y < 3; y++) { await scan(tab); await p.evaluate(() => scrollBy(0, innerHeight * 0.9)); } await p.evaluate(() => scrollTo(0, 0)); }
  await t.tab('train'); await t.click('[data-a="planReview"]', 800);
  for (let y = 0; y < 5; y++) { await scan('plan review'); await p.evaluate(() => { const b = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.sheet-body'); b.scrollTop += 700; }); }
  r.ok(!left.length, 'with both on, no English words are left (brand names, how-to steps and citations aside)', [...new Set(left)].slice(0, 30));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // and back off
  await pick('setArNames', 'en'); await pick('setArTerms', 'en');
  await showWo();
  r.ok(/^[A-Za-z]/.test(await t.text('#workout .exc-name')) && /kg/.test(await t.text('#workout .set-row.head')), 'turning them off brings back English names, kg and RIR');
  await r.done(...pages);
})();
