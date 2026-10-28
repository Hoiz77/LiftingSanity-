// lift ranks: off until you turn them on; your details (standards, bodyweight, age); the standards themselves (from the
// competition data, by bodyweight, sex and age); which exercises are ranked and how; the Progress section with your
// muscles from start to now; an exercise's ladder and a machine's reading; a rank-up while you train; the end-screen
// cards; turning them off; kept in backups
const { open, report } = require('./lib');
const D = 864e5;
const set = (w, r, extra = {}) => ({ id: Math.random().toString(36).slice(2), t: 'N', w, r, done: true, ...extra });
const ex = (id, exId, sets) => ({ id, exId, rest: 90, uni: false, ss: null, note: '', sets });
(async () => {
  const r = report('Lift ranks');
  const t = await open({ settings: { view: 'focus', keypad: 'app', theme: 'dark' } });
  const p = t.p;
  const ago = d => Date.now() - d * D;
  // three workouts: bench 70 → 90 kg, squat 100 → 120 kg, a lever fly, and a calf raise (not ranked)
  const past = [[60, 70], [40, 80], [10, 90]].map(([d, w], i) => ({ id: 'p' + i, name: 'Push', start: ago(d), end: ago(d) + 3600e3, prs: [],
    ex: [ex('b' + i, 'barbell-bench-press', [set(w, 5), set(w, 5)]), ex('s' + i, 'back-squat', [set(w + 30, 5)]), ex('f' + i, 'lever-seated-fly', [set(w - 10, 8)]), ex('c' + i, 'standing-calf-raise', [set(100, 10)])] }));
  await t.ev(`(() => { state.workouts = ${JSON.stringify(past)}; recalcPRs(); save(true); render(); })()`);

  // off until you turn them on
  await t.tab('progress');
  r.ok(await p.evaluate(() => !!document.querySelector('.rank-promo') && !document.querySelector('.rank-card')), 'off at first: Progress only offers them');
  await t.ev(`exerciseSheet('barbell-bench-press')`); await p.waitForTimeout(600);
  r.ok(await p.evaluate(() => !document.querySelector('.rank-ex')), 'and an exercise shows no rank');
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.tab('settings');
  await t.click('[data-a="rankToggle"]', 600);
  r.ok(await p.evaluate(() => !!document.querySelector('#sheets .sheet-wrap.in.rank-setup')), 'Settings → Lift ranks asks for your details first');
  await t.inSheet('[data-a="save"]', 300);
  r.ok(/bodyweight/.test(await t.text('#toast')) && !(await t.state()).settings.ranks, 'it needs a bodyweight');
  await p.fill('#sheets .rank-setup [data-f="bw"]', '80');
  await p.fill('#sheets .rank-setup [data-f="age"]', '30');
  await t.inSheet('[data-a="save"]', 600);
  let st = await t.state();
  r.ok(st.settings.ranks && st.body.sex === 'M' && st.body.bw === 80 && st.body.age === 30, 'saved: ranks are on, with your details', st.body);

  // the standards
  const lad = await t.ev(`({ b: RK.ladder({ ref: 'B', r: 1 }, { sex: 'M', bw: 80 }), f: RK.ladder({ ref: 'B', r: 1 }, { sex: 'F', bw: 63 }), heavy: RK.ladder({ ref: 'B', r: 1 }, { sex: 'M', bw: 110 }), old: RK.ladder({ ref: 'S', r: 1 }, { sex: 'M', bw: 80, age: 55 }), young: RK.ladder({ ref: 'S', r: 1 }, { sex: 'M', bw: 80, age: 30 }) })`);
  r.ok(lad.b.length === 9 && lad.b[0] === 0 && lad.b.every((v, i) => !i || v > lad.b[i - 1]) && lad.b[3] > 90 && lad.b[3] < 100 && lad.b[8] > 175 && lad.b[8] < 195, 'nine ranks, Wood to Olympian; an 80 kg man’s bench: Gold from about 95 kg, Olympian from about 185 kg', lad.b.map(Math.round));
  r.ok(Math.abs(lad.b[2] / lad.b[3] - 0.8) < 1e-9 && Math.abs(lad.b[1] / lad.b[3] - 0.6) < 1e-9, 'Silver is 80% of Gold, Bronze 60%');
  r.ok(lad.f[3] > 40 && lad.f[3] < 48 && lad.heavy[3] > lad.b[3] && lad.heavy[3] / 110 < lad.b[3] / 80, 'women have their own standards, and heavier lifters need more but less per kilo of bodyweight', { f: Math.round(lad.f[3]), heavy: Math.round(lad.heavy[3]) });
  r.ok(lad.old[3] < lad.young[3] * 0.9, 'at 55 the standards are lower, as in the records', { old: Math.round(lad.old[3]), young: Math.round(lad.young[3]) });
  const kinds = await t.ev(`['barbell-bench-press', 'incline-dumbbell-press', 'lever-seated-fly', 'standing-calf-raise', 'pull-up', 'push-up'].map(id => { const b = rankBasis(id); return b.why ? 'no:' + b.why : b.conf + ':' + b.ref + (b.per ? '/' + b.per : ''); })`);
  r.ok(JSON.stringify(kinds) === JSON.stringify(['data:B', 'est:B/hand', 'rough:B', 'no:machine', 'est:pull/total', 'no:kind']), 'the bench from the data, a dumbbell press estimated per dumbbell, a machine rough, pull-ups with your bodyweight; calf raises and push-ups aren’t ranked', kinds);

  // Progress: your rank, start to now, your lifts
  await t.tab('progress');
  const card = await p.evaluate(() => { const c = document.querySelector('.rank-card'); return c && { tier: c.querySelector('.rank-top-t b').textContent, maps: c.querySelectorAll('.rank-body svg').length, rows: [...c.querySelectorAll('.rank-row b')].map(b => b.textContent), emb: c.querySelectorAll('.rank-emb').length }; });
  r.ok(card && card.maps === 4 && card.emb >= 3 && card.rows.includes('Barbell Bench Press') && !card.rows.some(n => /Calf/.test(n)), 'Progress shows your rank, your muscles from start to now, and your lifts (not the calf raise)', card);
  const rows = await t.ev(`rankTable().map(o => [o.id, RK.TIERS[o.now.tier].id, RK.TIERS[o.was.tier].id, Math.round(o.load)])`);
  const bench = rows.find(x => x[0] === 'barbell-bench-press');
  r.ok(bench && bench[3] === 105 && bench[1] === 'gold' && bench[2] === 'silver', 'the bench: best est. 1RM 105 kg is Gold now, Silver at the start (81.7 kg)', rows);
  await t.click('.rank-card .rank-row[data-id="barbell-bench-press"]', 700);
  const ladder = await p.evaluate(() => { const l = document.querySelector('.rank-ex'); return l && { rows: l.querySelectorAll('.rank-ladder li').length, on: (l.querySelector('.rank-ladder li.on .rl-n') || {}).textContent, how: l.textContent }; });
  r.ok(ladder && ladder.rows === 9 && ladder.on === 'Gold' && /competition records/.test(ladder.how), 'its details: the ladder for your bodyweight with your rank lit, and where the standard comes from', ladder);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  // a machine: rough, and you can say how it reads
  await t.ev(`exerciseSheet('lever-seated-fly')`); await p.waitForTimeout(600);
  const before = await t.ev(`rankTable().find(o => o.id === 'lever-seated-fly').lad[3]`);
  r.ok(/Rough/.test(await t.text('#sheets .sheet-wrap.in .rank-ex')) && await p.evaluate(() => !!document.querySelector('.rank-adj')), 'a machine’s rank is marked rough, and asks how the machine reads');
  await t.inSheet('[data-a="rankAdj"][data-v="1"]', 400);
  const after = await t.ev(`rankTable().find(o => o.id === 'lever-seated-fly').lad[3]`);
  r.ok(Math.abs(after / before - 1.25) < 1e-6 && (await t.state()).exPrefs['lever-seated-fly'].rankAdj === 1, '“Heavy” raises its standards by a quarter, and is kept', { before, after });
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.click('[data-a="rankAll"]', 600);
  r.ok(await p.evaluate(() => { const s = document.querySelector('#sheets .sheet-wrap.in.rank-sheet'); return s && s.querySelectorAll('.rank-tiers > span').length === 9 && /OpenPowerlifting/.test(s.textContent) && /Rough: machines/.test(s.textContent); }), 'All your ranks: the nine ranks, your lifts by how sure they are, and how ranks work (with the data’s source)');
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);

  // a rank-up while you train
  await t.start();
  await t.ev(`(() => { const w = A(); w.ex = [${JSON.stringify(ex('nx', 'barbell-bench-press', [set(105, 5, { done: false, tr: '4-6' }), set(80, 5, { done: false, tr: '4-6' })]))}, ${JSON.stringify(ex('ny', 'barbell-curl', [set(40, 8, { done: false })]))}]; w.cur = 0; renderWorkout(true); })()`);
  await p.waitForTimeout(400);
  const hint = await t.text('#workout .exc[data-e="0"] .rank-hint');
  r.ok(/Gold/.test(hint) && /next: Platinum at 95 kg × 6/.test(hint), 'in a workout, the exercise shows its rank and the next one as a set at the top of its rep range (95 kg × 6 for Platinum)', hint);
  await t.click('#workout [data-a="toggleSet"][data-e="0"][data-s="0"]', 700);
  const take = await p.evaluate(() => { const f = document.querySelector('#rankfx:not([hidden])'); return f && f.textContent.replace(/\s+/g, ' '); });
  r.ok(take && /Rank up/.test(take) && /Platinum/.test(take) && /Barbell Bench Press/.test(take) && /Gold/.test(take), 'beating your rank fills the screen for a moment: the new emblem, “Platinum”, the lift, from Gold', take);
  r.ok(/Platinum/.test(await t.text('#workout .exc[data-e="0"] .rank-hint')), 'and the card’s rank moves up with it');
  await p.waitForTimeout(2600);
  const banner = await p.evaluate(() => { const b = document.querySelector('#prfx:not([hidden]) .prfx-card'); return b && { rank: b.classList.contains('prfx-rank'), text: b.textContent, emb: !!b.querySelector('.rank-emb') }; });
  r.ok(banner && banner.rank && banner.emb && /Rank up: Platinum!/.test(banner.text) && /from Gold/.test(banner.text) && await p.evaluate(() => document.querySelector('#rankfx').hidden), 'then it gives way to the banner: “Rank up: Platinum!”, from Gold, with the new emblem', banner);
  await t.ev('prHide()'); await p.waitForTimeout(400);
  await t.ev(`woGo(1)`); await p.waitForTimeout(400);
  await t.click('#workout [data-a="toggleSet"][data-e="1"][data-s="0"]', 700);
  r.ok(await p.evaluate(() => !document.querySelector('#prfx:not([hidden]) .prfx-rank')), 'an exercise done for the first time isn’t a rank-up');
  await t.ev(`(() => { for (const x of A().ex) for (const s of x.sets) s.done = true; finishWorkout(); })()`);
  await p.waitForTimeout(1500);
  const cards = await p.evaluate(() => [...document.querySelectorAll('.fin-card')].map(c => c.getAttribute('aria-label')));
  r.ok(/Rank up/.test(cards[0] || '') && cards.some(c => /: Ranks$/.test(c)), 'the end screen opens with the rank-up card, and has your ranks', cards);
  const png = await t.ev(`(async () => { const st = workoutStory(state.workouts[state.workouts.length - 1]); const b = await cardPNG(finCards(st).find(c => c.k === 'rankup')); return b.size; })()`);
  r.ok(png > 20000, 'the rank-up card makes a picture to share', png);
  // your rank in one exercise, to share; rank-ups through your history; your ranks in the exercise list
  const own = await t.ev(`(async () => { const c = cardRankOf(rankTable().find(o => o.id === 'barbell-bench-press')); return { label: c.svg.match(/aria-label="([^"]+)"/)[1], has: /PLATINUM/.test(c.svg) && /105 × 5/.test(c.svg), size: (await cardPNG(c)).size }; })()`);
  r.ok(own.has && own.size > 20000, 'an exercise’s rank as a card to share: the rank, the lift and the set', own);
  const ups = await t.ev(`rankUpHistory().map(u => [u.id, RK.TIERS[u.from].id, RK.TIERS[u.to].id])`);
  r.ok(ups.length && JSON.stringify(ups[0]) === JSON.stringify(['barbell-bench-press', 'gold', 'platinum']), 'rank-ups through your history, newest first', ups);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.tab('progress'); await t.click('.rank-card [data-a="rankAll"]', 600);
  r.ok(await p.evaluate(() => document.querySelectorAll('#sheets .sheet-wrap.in .rank-up-row').length >= 2), 'All your ranks lists them');
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.tab('library'); await p.fill('#view input[type="search"]', 'barbell bench press'); await p.waitForTimeout(500);
  r.ok(await p.evaluate(() => { const row = [...document.querySelectorAll('#view .ex-row')].find(b => b.querySelector('b').textContent === 'Barbell Bench Press'); return !!(row && row.querySelector('.ex-rank .rank-emb[aria-label="Platinum"]')); }), 'the exercise list shows your rank in each exercise you’ve done');
  await t.ev('closeAllSheets()'); await p.waitForTimeout(500);

  // kept in backups; nonsense details are dropped
  const back = await t.ev(`JSON.parse(exportData()).data.body`);
  const bad = await t.ev(`migrate({ body: { sex: 'X', bw: 'heavy' } }).body`);
  r.ok(back && back.bw === 80 && bad === null, 'your details go into backups, and nonsense ones are dropped', { back, bad });
  // pounds: typed and shown in lb, kept in kg
  await t.ev(`state.settings.unit = 'lb'`);
  await t.ev('rankSetup()'); await p.waitForTimeout(500);
  r.ok(await p.evaluate(() => document.querySelector('#sheets .rank-setup [data-f="bw"]').value) === '176.4', 'in pounds, your bodyweight shows in lb');
  await p.fill('#sheets .rank-setup [data-f="bw"]', '200');
  await t.inSheet('[data-a="sex"][data-v="F"]', 200);
  await t.inSheet('[data-a="save"]', 600);
  st = await t.state();
  r.ok(Math.abs(st.body.bw - 90.72) < 0.01 && st.body.sex === 'F', 'and is kept in kg (200 lb = 90.7 kg), with women’s standards picked', st.body);
  r.ok(st.body.log.length === 2 && st.body.log[0].bw === 80 && await t.ev(`bwAt(Date.now() - 30 * 864e5)`) === 80 && await t.ev(`bwAt(Date.now())`) > 90, 'each bodyweight is kept with its day, so older workouts are ranked at the bodyweight you had then', st.body.log);
  await t.ev(`state.settings.unit = 'kg'`);
  // off: no ranks anywhere
  await t.tab('settings');
  await t.click('[data-a="rankToggle"]', 500);
  await t.tab('progress');
  r.ok(!(await t.state()).settings.ranks && await p.evaluate(() => !document.querySelector('.rank-card')), 'turned off, the ranks go (your details are kept for next time)');
  await t.click('[data-a="rankPromoOff"]', 400);
  r.ok(await p.evaluate(() => !document.querySelector('.rank-promo')), '“Not now” puts the offer away');
  await r.done(t);
})();
