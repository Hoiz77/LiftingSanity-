// celebrations: a set that beats a record (the gold banner with what it beat, the trophy count in the header, confetti),
// and the end of a workout (the medal, the cards, sharing a card as a picture, the note), from History too; milestones;
// quiet when a workout is edited or with Reduce Motion
const fs = require('fs'), os = require('os'), path = require('path');
const { open, report } = require('./lib');
const D = 864e5;
const set = (id, t, extra = {}) => ({ id, t, done: false, ...extra });
const ex = (id, exId, sets, extra = {}) => ({ id, exId, rest: 90, uni: false, ss: null, note: '', sets, ...extra });
const logged = (p, w, r, n) => Array.from({ length: n }, (_, k) => set(p + k, 'N', { w, r, done: true }));
// three earlier "Upper A" workouts, a week apart: bench 80 × 8 and rows 60 × 10
const past = [1, 2, 3].map(k => ({ id: 'p' + k, name: 'Upper A', tplId: 'tu', ago: 7 * k, ex: [ex('pb' + k, 'barbell-bench-press', logged('b' + k, 80, 8, 3)), ex('pr' + k, 'seated-cable-row', logged('r' + k, 60, 10, 3))] }));
const pngSize = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
(async () => {
  const r = report('Celebrations: records and the end of a workout');
  const t = await open({ settings: { view: 'focus', keypad: 'app' } });
  const p = t.p;
  const load = async (active, before = past) => {
    await t.ev(`(() => { state.workouts = ${JSON.stringify(before)}.map(w => ({ ...w, start: Date.now() - w.ago * ${D}, end: Date.now() - w.ago * ${D} + 3600e3, prs: [] })).sort((a, b) => a.start - b.start); recalcPRs();
      state.active = { id: 'wa', name: 'Upper A', tplId: 'tu', start: Date.now() - 3000e3, splitId: null, day: null, note: '', cur: 0, ...${JSON.stringify(active)} };
      state.rest = null; ui.woHidden = false; resetWoUI(); save(true); render(); renderWorkout(true); })()`);
    await p.waitForTimeout(600);
  };
  const check = async (e, s, wait = 450) => t.click(`#workout [data-a="toggleSet"][data-e="${e}"][data-s="${s}"]`, wait);
  const banner = () => p.evaluate(() => { const b = document.querySelector('#prfx'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ').trim() : null; });

  // a record while you train
  await load({ ex: [ex('x0', 'barbell-bench-press', [set('w', 'W', { w: 40, r: 10 }), set('s1', 'N', { w: 80, r: 8 }), set('s2', 'N', { w: 82.5, r: 8 })]), ex('x1', 'seated-cable-row', [set('q1', 'N', { w: 60, r: 10 })]), ex('x2', 'leg-extension', [set('l1', 'N', { w: 50, r: 12 })])] });
  await check(0, 0); await check(0, 1);
  r.ok(await banner() === null && !(await p.evaluate(() => document.querySelector('.wo-prs'))), 'a warm-up, or a set that only matches the best so far, sets no record and no banner', await banner());
  await check(0, 2, 150);
  const glow = await p.evaluate(() => !!document.querySelector('#workout .set-row.pr-hit'));
  await p.waitForTimeout(500);
  const b1 = await banner(), bits = await t.ev('fxBits.length');
  r.ok(/New PRs!/i.test(b1 || '') && /Barbell Bench Press/.test(b1) && /Est\. 1RM 104\.5 kg \+3\.2 kg/.test(b1) && /Heaviest 82\.5 kg \+2\.5 kg/.test(b1), 'beating the record brings the gold banner: the exercise, each record and what it beat (+2.5 kg)', b1);
  r.ok(bits > 50, 'with confetti', bits);
  r.ok(await t.text('#workout .wo-prs') === '2' && glow, 'the header counts the records so far, and the row that set them glows', { count: await t.text('#workout .wo-prs'), glow });
  await p.waitForTimeout(4000);
  r.ok(await banner() === null, 'the banner goes by itself after a few seconds');
  await t.ev('woGo(2)'); await p.waitForTimeout(400);
  await check(2, 0);
  r.ok(await banner() === null, 'an exercise done for the first time sets no record (nothing to beat yet)');
  await t.ev('woGo(1)'); await p.waitForTimeout(400);
  await t.click('#workout .cell[data-e="1"][data-s="0"][data-f="r"]', 250); await t.click('#keypad [data-a="kpStep"][data-d="1"]', 150); await t.click('#keypad [data-a="kpLog"]', 550);
  const b2 = await banner();
  r.ok(/New PR!/i.test(b2 || '') && /Seated Cable Row/.test(b2) && /Est\. 1RM/.test(b2), 'logging on the number pad celebrates too', b2);
  await t.click('#prfx .prfx-card', 450);
  r.ok(await banner() === null, 'a tap puts the banner away');

  // one-row left/right: both sides' records in one banner
  const fly = side => logged('f' + side, 15, 10, 1).map(s => ({ ...s, side, pair: 'pp' }));
  await load({ ex: [ex('x0', 'single-arm-cable-fly', [set('l', 'N', { side: 'L', pair: 'p', w: 17.5, r: 10 }), set('r', 'N', { side: 'R', pair: 'p', w: 17.5, r: 10 })], { uni: true })] },
    [{ id: 'pf', name: 'Upper A', ago: 3, ex: [ex('pfx', 'single-arm-cable-fly', [...fly('L'), ...fly('R')], { uni: true })] }]);
  await t.ev(`(() => { state.exPrefs['single-arm-cable-fly'] = { uniStyle: 'one' }; renderWorkout(true); })()`); await p.waitForTimeout(300);
  await t.click('#workout .set-row.one [data-a="toggleBoth"]', 450);
  const b3 = await banner();
  r.ok(/Heaviest 17\.5 kg \+2\.5 kg/.test(b3 || '') && (b3.match(/Heaviest/g) || []).length === 1, 'one-row left/right: both sides checked at once give one banner, each record once', b3);
  await t.ev(`delete state.exPrefs['single-arm-cable-fly']`);
  await t.click('#prfx .prfx-card', 400);

  // the end of a workout: Upper A for the fourth time, with records
  await load({ ex: [ex('x0', 'barbell-bench-press', logged('n', 82.5, 8, 3)), ex('x1', 'seated-cable-row', logged('m', 62.5, 10, 3))] });
  // a record's banner still up as the workout ends goes away rather than sit over the celebration
  await t.ev('prParty(A().ex[0], setGains(A(), A().ex[0], 2))'); await p.waitForTimeout(400);
  const upBefore = await banner();
  await t.ev('fxBits = []; finishWorkout()');
  await p.waitForTimeout(500);
  r.ok(/New PRs?!/i.test(upBefore || '') && await banner() === null, 'a record banner still showing when Finish is tapped goes away for the celebration', upBefore);
  // the medal starts in the middle of the screen, with its light ready to go off as it lands
  const stage = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in'), m = w && w.querySelector('.fin-medal'), r = m && m.getBoundingClientRect();
    return w && { mid: Math.round(r.top + r.height / 2), h: innerHeight, beams: w.querySelectorAll('.fin-beams i').length, waves: w.querySelectorAll('.fin-wave').length, streaks: w.querySelectorAll('.fin-streaks i').length, words: [...w.querySelectorAll('.fin-title .w')].map(e => e.textContent) }; });
  r.ok(stage && stage.mid > stage.h * 0.3 && stage.beams === 2 && stage.waves === 2 && stage.streaks > 10 && stage.words.join(' ') === 'New records!', 'a workout just finished: the medal lands big in the middle, with spotlights, rings and streaks of light, and the title comes in word by word', stage);
  let landed = 0;
  for (let i = 0; i < 30 && landed <= 100; i++) { await p.waitForTimeout(100); landed = await t.ev('fxBits.length'); }
  const fin = await p.evaluate(() => {
    const w = document.querySelector('.sheet-wrap.finish.in');
    return w && { title: w.querySelector('.fin-title').textContent, sub: w.querySelector('.fin-sub').textContent, cards: [...w.querySelectorAll('.fin-card')].map(c => c.querySelector('svg').getAttribute('aria-label')), dots: w.querySelectorAll('.fin-dots button').length, medal: !!w.querySelector('.fin-face') };
  });
  r.ok(fin && fin.title === 'New records!' && fin.sub === 'Your workout number 4 · Upper A' && fin.medal, 'Finish opens the full-screen celebration: a medal, “New records!” and the workout’s number', fin);
  const CARDS = ['The workout', 'New records', 'The exercises', 'Muscles worked', 'Getting stronger', 'Week streak', 'Against last time'];
  r.ok(fin && JSON.stringify(fin.cards) === JSON.stringify(CARDS) && fin.dots === 7, 'the cards: the workout, its records, the exercises, the muscles worked, getting stronger, the week streak and against last time, with a dot for each', fin && fin.cards);
  r.ok(landed > 100, 'it opens with confetti as the medal lands', landed);
  let fw = 0;
  for (let i = 0; i < 40 && !fw; i++) { await p.waitForTimeout(100); fw = await t.ev(`fxBits.filter(b => b.k).length`); }
  const home = await p.evaluate(() => { const m = document.querySelector('.fin-medal').getBoundingClientRect(), t = document.querySelector('.fin-title').getBoundingClientRect(); return { medal: Math.round(m.bottom), title: Math.round(t.top) }; });
  r.ok(fw > 0 && home.medal <= home.title + 2, 'then fireworks, and the medal has risen to its place above the title', { fw, home });
  await p.waitForTimeout(1700);
  const cardText = i => p.evaluate(i => document.querySelectorAll('.fin-card')[i].textContent.replace(/\s+/g, ' ').trim(), typeof i === 'number' ? i : CARDS.indexOf(i));
  const vol = 82.5 * 8 * 3 + 62.5 * 10 * 3, prevVol = 80 * 8 * 3 + 60 * 10 * 3;
  const c0 = await cardText(0);
  r.ok(c0.includes('Upper A') && c0.includes(`${vol.toLocaleString('en-US')} kg`) && /As heavy as 2\.6 cars/.test(c0) && /\d+ min/.test(c0) && /WORKING SETS/.test(c0) && /LIFTING SANITY/.test(c0), 'the workout card: the name, the weight lifted (counted up to the total), what that weighs as much as, time and sets', c0);
  const c1 = await cardText(1);
  r.ok(/4\s*NEW RECORDS/.test(c1) && /Barbell Bench Press/.test(c1) && /\+2\.5 kg/.test(c1) && /Seated Cable Row/.test(c1), 'the records card lists each record with what it beat by', c1);
  const c2 = await cardText('Week streak');
  r.ok(/4-week streak!/.test(c2) && /trained 4 weeks in a row/.test(c2) && /1 workout this week/.test(c2), 'the streak card: weeks in a row and the workouts this week', c2);
  const c3 = await cardText('Against last time'), pct = Math.round((vol - prevVol) / prevVol * 100);
  r.ok(c3.includes(`+${pct}%`) && /more weight lifted than last time/.test(c3) && /Better than last time on 2 of 2 exercises/.test(c3) && /Biggest jump/.test(c3), `against last time: +${pct}% weight lifted, better on 2 of 2 exercises, the biggest jump`, c3);
  const ce = await cardText('The exercises'), tiles = await p.evaluate(() => {
    const c = [...document.querySelectorAll('.fin-card')][2];
    return { pics: [...c.querySelectorAll('image[data-i]')].map(i => i.getAttribute('href')), standIns: [...c.querySelectorAll('svg.bd')].filter(b => !b.closest('[display="none"]')).length, trophies: (c.innerHTML.match(/<circle[^>]*r="11"/g) || []).length };
  });
  r.ok(/2 EXERCISES/.test(ce) && /Barbell Bench Press/.test(ce) && /3 sets · 82\.5 × 8/.test(ce) && /Seated Cable Row/.test(ce) && tiles.trophies === 2, 'the exercises card: each exercise with its sets and best set, a trophy on the ones with records', { ce, tiles });
  r.ok(tiles.standIns === 2 && !tiles.pics.some(u => /^https:/.test(u)), 'a picture that can’t load (no internet here) shows the body with that exercise’s muscles instead', tiles);
  const cm = await cardText('Muscles worked'), cg = await cardText('Getting stronger');
  r.ok(/MUSCLES WORKED/.test(cm) && /muscle groups/.test(cm) && /fewer sets/.test(cm) && /Chest/.test(cm) && await p.evaluate(() => { const c = [...document.querySelectorAll('.fin-card')][3]; return c.querySelectorAll('svg.bd').length === 2 && c.querySelectorAll('svg.bd mask path').length >= 2 && [...c.querySelectorAll('svg.bd image')].every(i => /art\/body\/male-(front|back)-dark\.webp$/.test(i.getAttribute('href'))); }), 'the muscles card: the body front and back, with the muscles worked and how many sets', cm);
  r.ok(/GETTING STRONGER/.test(cg) && /Barbell Bench Press/.test(cg) && /\+3\.2 kg since/.test(cg) && /Seated Cable Row/.test(cg), 'getting stronger: a chart of each lift’s best set over the last sessions, with the gain', cg);
  await p.evaluate(() => document.querySelector('.fin-ms').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
  const more = await p.evaluate(() => ({ prs: [...document.querySelectorAll('.fin-prs li')].map(l => l.innerText.replace(/\s+/g, ' ')), bars: document.querySelectorAll('.fin-ms div').length, go: document.querySelectorAll('.fin-prs.go, .fin-ms.go').length }));
  r.ok(more.prs.length === 4 && more.prs.every(l => /\+[\d.]+ (kg|reps)/.test(l)) && more.bars >= 2 && more.go === 2, 'below the cards: every record with its gain, and sets per muscle as bars, brought in as they’re scrolled to', more);
  await p.evaluate(() => document.querySelector('.fin-body').scrollTo(0, 0)); await p.waitForTimeout(300);
  // sharing a card: here there's no share sheet, so the picture is saved
  const shot = async () => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), t.inSheet('.fin-foot [data-a="finShare"]', 200)]);
    const f = path.join(os.tmpdir(), `ls-card-${Date.now()}.png`); await dl.saveAs(f);
    return { name: dl.suggestedFilename(), size: pngSize(f), bytes: fs.statSync(f).size };
  };
  const s1 = await shot();
  r.ok(/^lifting-sanity-\d{4}-\d\d-\d\d-workout\.png$/.test(s1.name) && s1.size.join('×') === '1080×1350' && s1.bytes > 20000, 'Share makes the card in view a 1080 × 1350 picture', s1);
  await p.evaluate(() => document.querySelectorAll('.fin-card')[1].scrollIntoView({ inline: 'center', block: 'nearest' })); await p.waitForTimeout(500);
  const dot = await p.evaluate(() => [...document.querySelectorAll('.fin-dots button')].findIndex(b => b.classList.contains('on')));
  const s2 = await shot();
  r.ok(dot === 1 && /-records\.png$/.test(s2.name), 'swiping to another card moves the dot, and Share shares that card', { dot, name: s2.name });
  await p.evaluate(() => document.querySelectorAll('.fin-card')[2].scrollIntoView({ inline: 'center', block: 'nearest' })); await p.waitForTimeout(500);
  const s3 = await shot();
  r.ok(/-exercises\.png$/.test(s3.name) && s3.size.join('×') === '1080×1350' && s3.bytes > 20000, 'the exercises card shares as a picture too, stand-ins and all', s3);
  await t.inSheet('[data-a="finDot"][data-i="2"]', 700);
  r.ok(await p.evaluate(() => [...document.querySelectorAll('.fin-dots button')].findIndex(b => b.classList.contains('on'))) === 2, 'a dot goes to its card');
  // a picture that can't be fetched for the shared picture: its stand-in goes in instead
  const swapped = await t.ev(`inlineArt('<svg><g data-fb="0" display="none"><rect/></g><image data-i="0" href="https://raw.githubusercontent.com/none.webp" x="0"/></svg>')`);
  r.ok(/<g data-fb="0">/.test(swapped) && /<image data-i="0" display="none"/.test(swapped), 'for sharing, a picture that can’t be fetched is swapped for its stand-in', swapped);
  // the note and saving
  await t.inSheet('[data-a="wnoteChip"]', 200);
  const note = await t.ev('state.workouts[state.workouts.length - 1].note');
  await t.inSheet('.fin-foot [data-a="sheetClose"]', 700);
  r.ok(note === 'Great session' && !(await p.evaluate(() => document.querySelector('.sheet-wrap.finish.in'))), 'words for the note still work, and Done closes it', note);

  // History: the cards for any workout, without the celebration
  await t.tab('history');
  await t.ev(`workoutSheet(state.workouts[state.workouts.length - 1].id)`); await p.waitForTimeout(500);
  await t.ev('fxBits = []');
  await t.inSheet('[data-a="cards"]', 900);
  const hist = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in'); return w && { title: w.querySelector('.fin-title').textContent, note: !!w.querySelector('.fin-more'), cards: w.querySelectorAll('.fin-card').length, stage: w.querySelectorAll('.fin-beams, .fin-wave').length }; });
  r.ok(hist && hist.title === 'Upper A' && !hist.note && hist.cards === 7 && !hist.stage && await t.ev('fxBits.length') === 0, 'History → a workout → Share opens its cards, with no confetti or show', hist);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(500);

  // milestones: the first workout ever, and the tenth
  await load({ name: 'Day 1', tplId: null, ex: [ex('x0', 'leg-press', logged('a', 100, 10, 3))] }, []);
  await t.ev('finishWorkout()'); await p.waitForTimeout(700);
  await p.mouse.click(195, 300); await p.waitForTimeout(150);
  const skipped = await p.evaluate(() => { const f = document.querySelector('.sheet-wrap.finish.in .fin'), t = f.querySelector('.fin-title .w'), c = f.querySelector('.fin-card');
    return { word: +getComputedStyle(t).opacity, card: +getComputedStyle(c).opacity, playing: f.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && isFinite(a.effect.getComputedTiming().endTime)).length }; });
  r.ok(skipped.word === 1 && skipped.card === 1 && skipped.playing === 0, 'a tap while it plays skips to the end: the words and cards are there at once', skipped);
  const first = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in'); return w && { title: w.querySelector('.fin-title').textContent, card: w.querySelector('.fin-card svg').getAttribute('aria-label'), text: w.querySelector('.fin-card').textContent.replace(/\s+/g, ' ') }; });
  r.ok(first && first.title === 'First workout done!' && first.card === 'Milestone' && /The first of many/.test(first.text) && /And 1,000 kg lifted in total!/.test(first.text), 'the first workout ever: “First workout done!”, a milestone card first (and the first 1,000 kg lifted)', first);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  const nine = Array.from({ length: 9 }, (_, k) => ({ id: 'n' + k, name: 'Legs', ago: 20 - k * 2, ex: [ex('nx' + k, 'leg-press', logged('l' + k, 100, 10, 1))] }));
  await load({ name: 'Legs', tplId: null, ex: [ex('x0', 'leg-press', logged('a', 100, 10, 1))] }, nine);
  await t.ev('finishWorkout()'); await p.waitForTimeout(1200);
  const tenth = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in'); return w && { title: w.querySelector('.fin-title').textContent, text: w.querySelector('.fin-card').textContent.replace(/\s+/g, ' ') }; });
  r.ok(tenth && tenth.title === 'Workout #10!' && /10 workouts!/.test(tenth.text) && /That’s 10 times you showed up/.test(tenth.text), 'the tenth workout: “Workout #10!” and a medal card', tenth);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);

  // editing a workout: “Changes saved”, no confetti or banner
  await t.ev(`fxBits = []; editWorkout(state.workouts[state.workouts.length - 1].id)`); await p.waitForTimeout(800);
  await t.ev('A().ex[0].sets[0].w = 140; finishWorkout()'); await p.waitForTimeout(1200);
  const edit = await p.evaluate(() => { const w = document.querySelector('.sheet-wrap.finish.in'); return w && w.querySelector('.fin-title').textContent; });
  r.ok(edit === 'Changes saved' && await t.ev('fxBits.length') === 0 && await banner() === null, 'saving an edited workout says “Changes saved”, with no confetti', edit);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);

  // Reduce Motion: the same words and numbers, no confetti, nothing counting
  const q = await open({ settings: { view: 'focus', keypad: 'app' }, reducedMotion: 'reduce' });
  await q.ev(`(() => { state.workouts = ${JSON.stringify(past)}.map(w => ({ ...w, start: Date.now() - w.ago * ${D}, end: Date.now() - w.ago * ${D} + 3600e3, prs: [] })).sort((a, b) => a.start - b.start); recalcPRs();
    state.active = { id: 'wq', name: 'Upper A', tplId: 'tu', start: Date.now() - 3000e3, splitId: null, day: null, note: '', cur: 0, ex: ${JSON.stringify([ex('x0', 'barbell-bench-press', [set('z1', 'N', { w: 85, r: 8 })])])} };
    resetWoUI(); save(true); render(); renderWorkout(true); })()`);
  await q.p.waitForTimeout(500);
  await q.click('#workout [data-a="toggleSet"][data-e="0"][data-s="0"]', 300);
  const qb = await q.p.evaluate(() => { const b = document.querySelector('#prfx'); return b && !b.hidden ? b.innerText : null; });
  await q.ev('finishWorkout()'); await q.p.waitForTimeout(400);
  const qv = await q.p.evaluate(() => { const t = document.querySelector('.fin-card [data-count][data-fmt="int"]'); return t && t.textContent; });
  r.ok(/New PRs?!/i.test(qb || '') && await q.ev('fxBits.length') === 0 && qv === '680', 'with Reduce Motion: the banner and the end screen still say it all, with no confetti and the numbers shown straight away', { qb, qv });
  await r.done(t, q);
})();
