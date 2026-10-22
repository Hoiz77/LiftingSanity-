// the guide: on a new phone, "Set me up" asks five questions (one per screen, as proper radio choices), recommends a
// plan and settings that fit, and then a tour, tips as you go or nothing. Settings → Guide opens it again any time.
const { open, report } = require('./lib');
const top = p => p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return w ? w.textContent.replace(/\s+/g, ' ').trim() : ''; });
(async () => {
  const r = report('Guide: questions, a plan that fits, tour, tips'), pages = [];
  let t = await open({ fresh: true }); pages.push(t);
  const p = t.p;
  await p.waitForTimeout(600);
  r.ok(await p.evaluate(() => { const b = document.querySelector('#sheets .welcome-opts .welcome-opt'); return b && b.dataset.a === 'wGuide' && /Recommended/.test(b.textContent); }), 'the welcome offers “Set me up” first, marked as recommended');
  await t.inSheet('[data-a="wGuide"]', 500);
  const q1 = await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const g = w.querySelector('[role="radiogroup"]'); return { step: w.querySelector('.guide-step').textContent, radios: [...g.querySelectorAll('[role="radio"]')].map(b => b.getAttribute('aria-checked')), labelled: g.getAttribute('aria-labelledby'), focus: document.activeElement && document.activeElement.id }; });
  r.ok(/Question 1 of 5/.test(q1.step) && q1.radios.length === 3 && q1.radios.every(x => x === 'false') && q1.labelled === 'guideH', 'questions come one at a time, as a labelled group of radio choices', q1);
  r.ok(q1.focus === 'guideH', 'the question itself gets the focus, so a screen reader reads it out', q1.focus);
  for (const v of ['new', 'muscle', '3', 'gym']) await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
  await t.inSheet('[data-a="gAns"][data-v="tour"]', 600);
  let txt = await top(p);
  r.ok(/Your plan/.test(txt) && /Full Body/.test(txt) && /Just starting · Building muscle · 3 days a week · In a gym/.test(txt), 'the result says what it’s based on and recommends a plan', txt.slice(0, 200));
  r.ok(/Rest between sets: 2:00/.test(txt) && /Effort tracking: off for now/.test(txt), 'it suggests settings that fit: rest for the goal, effort tracking off while you learn');
  await t.inSheet('[data-a="gBack"]', 500);
  r.ok(await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const b = w.querySelector('[data-a="gAns"][data-v="tour"]'); return b && b.getAttribute('aria-checked') === 'true' && /Question 5 of 5/.test(w.textContent); }), 'Back goes to the last question with your answer still picked');
  await t.inSheet('[data-a="gAns"][data-v="tour"]', 600);
  await t.inSheet('.guide-plan.main [data-a="gUse"]', 800);
  let s = await t.state();
  const sp = s.splits.find(x => x.id === s.activeSplit);
  r.ok(sp && sp.programId === 'fb' && s.settings.rest === 120 && s.settings.effort === 'off' && s.profile && s.profile.level === 'new', 'using it installs the plan, applies the settings and remembers the answers', { prog: sp && sp.programId, rest: s.settings.rest, effort: s.settings.effort, profile: s.profile });
  txt = await top(p);
  r.ok(/Part 1 of 6/.test(txt) && /Log a set in one tap/.test(txt) && /Start lighter than you think/.test(txt), 'then the tour starts, with notes for someone just starting', txt.slice(0, 160));
  for (let i = 0; i < 5; i++) await t.inSheet('[data-a="gNext"]', 300);
  r.ok(/Part 6 of 6/.test(await top(p)), 'the tour has six short parts');
  await t.inSheet('[data-a="gWords"]', 500);
  txt = await top(p);
  r.ok(['Working set', 'RIR', 'Est. 1RM', 'Superset', 'Progressive overload', 'Block'].every(w => txt.includes(w)) && await p.evaluate(() => !!document.querySelector('#sheets .sheet-wrap.in dl.guide-words dt')), 'the words you’ll see are explained, as a list of terms and meanings');
  await t.inSheet('[data-a="gEnd"]', 700);
  r.ok(!(await p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))) && (await t.state()).flags.welcomed === 1, 'Done closes it, and the welcome won’t come back');
  // the plan picks
  const picks = await t.ev(`({
    dumbbells: guidePlans({ level: 'some', goal: 'muscle', days: '4', kit: 'db' })[0],
    strength4: guidePlans({ level: 'some', goal: 'strength', days: '4', kit: 'gym' })[0],
    strength3: guidePlans({ level: 'new', goal: 'strength', days: '3', kit: 'gym' })[0],
    exp3: guidePlans({ level: 'exp', goal: 'muscle', days: '3', kit: 'gym' })[0],
    two: guidePlans({ level: 'some', goal: 'health', days: '2', kit: 'gym' })[0],
    new5: guidePlans({ level: 'new', goal: 'muscle', days: '5', kit: 'gym' })[0],
    exp6: guidePlans({ level: 'exp', goal: 'muscle', days: '6', kit: 'gym' }).join(),
    all: [...new Set(['new', 'some', 'exp'].flatMap(level => ['muscle', 'strength', 'health'].flatMap(goal => ['2', '3', '4', '5', '6'].flatMap(days => ['gym', 'db'].flatMap(kit => guidePlans({ level, goal, days, kit }))))))].every(id => PROGRAMS.some(p => p.id === id))
  })`);
  r.ok(picks.dumbbells === 'db' && picks.strength4 === 'phul' && picks.strength3 === '5x5' && picks.exp3 === 'ulf' && picks.two === 'fb2' && picks.new5 === 'ul' && /^ppl,/.test(picks.exp6) && picks.all, 'plans follow the answers (dumbbells, strength, experience, days), and every pick exists', picks);

  // every plan offered, for every combination of answers, against the days chosen: it's built for them, or it says
  // so (naming its days and yours); and when some ready-made plan fits the days, one that fits is offered
  const all = await t.ev(`(() => { const out = []; for (const level of ['new', 'some', 'exp']) for (const goal of ['muscle', 'strength', 'health']) for (const days of ['2', '3', '4', '5', '6']) for (const kit of ['gym', 'db']) out.push({ level, goal, days: +days, kit, pick: guidePick({ level, goal, days, kit }).map(p => ({ id: p.id, note: p.note, ds: PLAN_DAYS[p.id] })) }); return { out, ids: Object.keys(PLAN_DAYS).sort().join(), programs: PROGRAMS.map(p => p.id).sort().join() }; })()`);
  r.ok(all.ids === all.programs, 'every ready-made plan has the days a week it’s built for', all);
  const unexplained = all.out.flatMap(c => c.pick.filter(p => !p.ds.includes(c.days) && !(p.note && p.note.includes(String(c.days)) && [p.ds[0], p.ds[p.ds.length - 1]].every(n => p.note.includes(String(n))))).map(p => `${c.level}/${c.goal}/${c.days}/${c.kit} → ${p.id}`));
  r.ok(all.out.length === 90 && !unexplained.length, 'in all 90 combinations of answers, every plan offered is built for the days chosen or says so, with its days and yours', unexplained.slice(0, 8));
  const DAYS = { fb: [3], fbeod: [3, 4], ul: [4], ppl: [3, 6], phul: [4], '5x5': [3], arnold: [6], bro: [5] };
  const missed = all.out.filter(c => c.kit === 'gym' && Object.entries(DAYS).some(([id, ds]) => ds.includes(c.level === 'new' ? Math.min(c.days, 4) : c.days) && (c.level === 'exp' || (id !== 'bro' && id !== 'arnold'))) && !c.pick.some(p => p.ds.includes(c.days) || (c.level === 'new' && p.ds.includes(Math.min(c.days, 4))))).map(c => `${c.level}/${c.goal}/${c.days}`);
  r.ok(!missed.length, 'when a ready-made plan fits the days chosen, one that fits is offered', missed);
  const s6 = all.out.find(c => c.level === 'some' && c.goal === 'strength' && c.days === 6 && c.kit === 'gym').pick;
  r.ok(s6[0].id === 'phul' && /fewer than the 6 you have/.test(s6[0].note) && /recovery/.test(s6[0].note) && s6.some(p => p.ds.includes(6)), 'strength on six days: a strength plan that says why it trains fewer days, and one that uses all six', s6);

  // on screen: strength on six days
  t = await open({ fresh: true }); pages.push(t);
  await t.p.waitForTimeout(600);
  await t.inSheet('[data-a="wGuide"]', 500);
  for (const v of ['some', 'strength', '6', 'gym', 'self']) await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
  const six = await t.p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return { main: (w.querySelector('.guide-note.days') || {}).textContent || '', alts: [...w.querySelectorAll('.guide-plan:not(.main)')].map(a => ({ name: a.querySelector('b').textContent, note: !!a.querySelector('[data-days-note]') })) }; });
  r.ok(/PHUL trains 4 days a week, fewer than the 6 you have/.test(six.main) && six.alts.some(a => /Push \/ Pull \/ Legs/.test(a.name) && !a.note), 'on screen, the plan says why it trains fewer days than chosen, and the six-day option sits below it', six);

  // not applying the settings, and tips as you go
  t = await open({ fresh: true }); pages.push(t);
  await t.p.waitForTimeout(600);
  await t.inSheet('[data-a="wGuide"]', 500);
  for (const v of ['exp', 'strength', '4', 'gym', 'tips']) await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
  r.ok(/PHUL/.test(await top(t.p)) && /Rest between sets: 3:00/.test(await top(t.p)), 'strength on four days: PHUL first, with 3 minutes’ rest');
  r.ok(!(await t.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('.guide-note.days'))), 'a plan built for the days chosen has no days note');
  await t.p.evaluate(() => { const c = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('[data-f="gUseSet"]'); c.click(); });
  await t.p.waitForTimeout(200);
  await t.inSheet('.guide-plan.main [data-a="gUse"]', 800);
  s = await t.state();
  r.ok(s.settings.rest === 120 && s.settings.effort === 'rir' && s.flags.tips === 1, 'unticking “Use these settings” leaves them as they were; picking tips turns them on', { rest: s.settings.rest, effort: s.settings.effort, tips: s.flags.tips });
  await t.tab('train');
  r.ok(await t.p.evaluate(() => !!document.querySelector('#view .tip-card')), 'a tip shows the first time the Train page opens');
  await t.click('#view .tip-card [data-a="tipDone"]', 400);
  await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(500);
  r.ok(!(await t.p.evaluate(() => document.querySelector('#view .tip-card'))), 'once dismissed, it stays gone');
  await t.start();
  r.ok(/Logging a set/.test((await t.text('#workout .tip-card')) || ''), 'the workout has its own tip, about logging a set');
  await t.click('#workout .tip-card [data-a="tipsOff"]', 500);
  r.ok(!(await t.p.evaluate(() => document.querySelector('.tip-card'))) && (await t.state()).flags.tips === 0, '“Turn tips off” turns them all off');
  await t.click('[data-a="woMin"]', 500);
  // Settings → Guide
  await t.tab('settings');
  await t.click('[data-a="openGuide"]', 700);
  txt = await top(t.p);
  r.ok(/Get to know Lifting Sanity/.test(txt) && /You told us: More than two years · Getting stronger · 4 days a week · In a gym/.test(txt), 'Settings → Guide opens the guide, with what you told it');
  await t.inSheet('[data-a="gTips"]', 300);
  r.ok((await t.state()).flags.tips === 1 && await t.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().querySelector('[data-a="gTips"]').getAttribute('aria-pressed') === 'true'), 'tips can be turned back on there');
  await t.inSheet('[data-a="gStart"]', 500);
  await t.inSheet('[data-a="gBack"]', 500);
  r.ok(/Get to know Lifting Sanity/.test(await top(t.p)), 'Back from the first question returns to the guide');
  await t.inSheet('[data-a="gTour"]', 500);
  r.ok(/Part 1 of 6/.test(await top(t.p)) && /supersets/.test(await top(t.p)), 'the tour opens from there, with notes for experienced lifters');
  await t.inSheet('[data-a="gEnd"]', 600);

  // someone with history: a plan from the guide keeps every workout
  t = await open(); pages.push(t);
  await t.tab('settings'); await t.click('[data-a="demoOn"]', 600);
  const before = (await t.state()).workouts.length;
  await t.tab('settings'); await t.click('[data-a="openGuide"]', 700);
  await t.inSheet('[data-a="gStart"]', 500);
  for (const v of ['some', 'muscle', '4', 'gym', 'self']) await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
  await t.inSheet('.guide-plan.main [data-a="gUse"]', 800);
  s = await t.state();
  r.ok(s.workouts.length === before && s.splits.find(x => x.id === s.activeSplit).programId === 'ul' && !(await t.p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))), 'from Settings, a new plan keeps every workout, and “I’ll explore” just closes');

  // in Arabic: no English left in the guide
  t = await open({ fresh: true }); pages.push(t);
  await t.p.evaluate(() => localStorage.setItem('liftingsanity:lang', 'ar')); await t.p.reload(); await t.p.waitForTimeout(800);
  // the top sheet's words, leaving out links to studies (their titles stay in English, as everywhere in the app)
  const words = p => p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); if (!w) return ''; const c = w.cloneNode(true); c.querySelectorAll('a[href^="http"]').forEach(a => a.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
  const latin = async () => (await words(t.p)).replace(/RIR|RPE|1RM|kg|lb|English|Lifting Sanity|PHUL|PHAT|Y2K|iCloud Drive|EZ|PPL|EOD/g, '').match(/[A-Za-z]{2,}[A-Za-z ]*/g) || [];
  const left = [];
  await t.inSheet('[data-a="wGuide"]', 500); left.push(...await latin());
  for (const v of ['new', 'health', '2', 'gym', 'tour']) { await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450); left.push(...await latin()); }
  await t.inSheet('.guide-plan.main [data-a="gUse"]', 800);
  for (let i = 0; i < 6; i++) { left.push(...await latin()); await t.inSheet('[data-a="gNext"]', 300).catch(() => {}); }
  await t.inSheet('[data-a="gWords"]', 500); left.push(...await latin());
  r.ok(!left.length, 'in Arabic, the questions, the plan, the tour and the words are all in Arabic', [...new Set(left)].slice(0, 12));
  await r.done(...pages);
})();
