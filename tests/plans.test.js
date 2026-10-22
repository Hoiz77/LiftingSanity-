// The ready-made plans: every one, in both versions, holds to the rules it's built on (the plan review's checks from
// the training literature), the machine versions swap every barbell, dumbbell and pull-up lift for a machine, the list
// narrows down by days and experience, each plan has its own page before it's used, a split moves between machines
// and free weights and back, and the guide gives someone new the machine version
const { open, report } = require('./lib');
(async () => {
  const r = report('Ready-made plans: the evidence, machine versions, the list and each plan’s page');
  const t = await open({ fresh: true });
  const p = t.p;
  await p.waitForTimeout(600);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);

  // the data
  const data = await t.ev(`(() => {
    const out = { missing: [], meta: [], dup: [], free: [], sets: [], link: [] };
    const FREE_EQ = new Set(['barbell', 'dumbbell', 'ezbar', 'landmine', 'kettlebell', 'trapbar']);
    const skill = e => COMPOUND.has((sciOf(e.id) || {}).pattern) && (FREE_EQ.has(e.eq) || (e.eq === 'bodyweight' && /pull-up|chin-up|dip|push-up/i.test(e.name)));
    for (const p of PROGRAMS) {
      if (!p.week || !p.level || !p.goals || !p.short || !p.why) out.meta.push(p.id);
      const lines = p.days.filter(d => Array.isArray(d)).map(d => typeof d[1] === 'string' ? d[1].trim().split('\\n').length : d[1].length);
      const free = programDays(p, false).filter(d => !isRest(d)), mach = programDays(p, true).filter(d => !isRest(d));
      free.forEach((d, i) => { if (d.ex.length !== lines[i]) out.missing.push(p.id + ' ' + d.name); });
      if (!p.machine) continue;
      mach.forEach((d, i) => {
        const ids = d.ex.map(x => x.exId);
        if (new Set(ids).size !== ids.length) out.dup.push(p.id + ' ' + d.name);
        for (const x of d.ex) if (skill(getEx(x.exId))) out.free.push(p.id + ' ' + d.name + ': ' + getEx(x.exId).name);
        d.ex.forEach((x, j) => { const f = free[i].ex[j]; if (JSON.stringify(x.sets) !== JSON.stringify(f.sets) || x.rest !== f.rest) out.sets.push(p.id + ' ' + d.name + ' ' + j); if ((x.free || x.exId) !== f.exId) out.link.push(p.id + ' ' + d.name + ' ' + j); });
      });
    }
    out.machines = PROGRAMS.filter(p => p.machine).map(p => p.id);
    return out;
  })()`);
  r.ok(!data.missing.length, 'every exercise in every plan is in the library (none dropped)', data.missing);
  r.ok(!data.meta.length, 'every plan says the days a week it’s for, its level, goals, a plain line and why', data.meta);
  r.ok(data.machines.length >= 15 && !data.machines.includes('db') && !data.machines.includes('fbeod'), 'every gym plan has a machine version (not the home plan, and Full Body EOD is machines already)', data.machines);
  r.ok(!data.free.length, 'machine versions have no barbell, dumbbell, pull-up or dip lifts left', data.free);
  r.ok(!data.dup.length, 'a swap never repeats an exercise already in that day', data.dup);
  r.ok(!data.sets.length && !data.link.length, 'machine versions keep every set, rep target and rest, and each swap remembers its free-weight lift', { sets: data.sets, link: data.link });

  // the evidence: the plan review's own checks, for every plan and version at every number of days it's built for
  const ev = await t.ev(`(() => {
    const bad = [];
    const strip = h => h.replace(/<[^>]+>/g, '');
    for (const p of PROGRAMS.filter(p => !p.own)) for (const machine of p.machine ? [false, true] : [false]) for (const n of p.week) {
      const tag = p.id + (machine ? ' (machines)' : '') + ' @' + n;
      const tpls = programDays(p, machine).filter(d => !isRest(d));
      const { st, topics } = reviewTopics({ name: p.name, days: tpls.map(d => d.id), tpls }, n);
      const items = topics.flatMap(tp => tp.items);
      for (const i of items.filter(i => i.kind === 'fix')) bad.push(tag + ' FIX ' + strip(i.text).slice(0, 80));
      const strength = p.goals[0] === 'strength', home = p.kit === 'home';
      // effort, rest and length
      const work = st.ex.flatMap(o => o.x.sets.filter(s => s.t !== 'W'));
      if (work.some(s => s.trir == null) || work.reduce((a, s) => a + s.trir, 0) / work.length > 3) bad.push(tag + ' effort');
      for (const o of st.ex) if (o.a && COMPOUND.has(o.a.pattern) && o.x.rest < 120) bad.push(tag + ' short rest ' + o.e.name);
      for (const tp of tpls) if (estMinutes(tp) > 75) bad.push(tag + ' long ' + tp.name);
      // balance
      const sum = ms => ms.reduce((a, m) => a + (st.sets[m] || 0), 0), ratio = sum(['chest', 'frontdelts', 'triceps']) / sum(['lats', 'upperback', 'reardelts', 'biceps']);
      if (ratio > 1.5 || ratio < 0.67) bad.push(tag + ' push/pull ' + ratio.toFixed(2));
      // enough for the main muscles, and not piled on
      if ((st.sets.chest || 0) < 6 || (st.sets.lats || 0) + (st.sets.upperback || 0) < 9 || (st.sets.quads || 0) < 5) bad.push(tag + ' low volume');
      if (!strength && (st.sets.hamstrings || 0) < 5) bad.push(tag + ' low hamstrings');
      for (const m of MAJOR) if ((st.sets[m] || 0) > 25) bad.push(tag + ' over 25 sets ' + m);
      // twice a week for the big muscles, unless the plan is built otherwise (and says so)
      const once = p.id === 'bro' || (p.id === 'ppl' && n === 3) || p.id === '5x5';
      if (!once) for (const m of ['chest', 'quads', 'hamstrings']) if ((st.days[m] || 0) < 1.5) bad.push(tag + ' ' + m + ' once a week');
      // exercise choice: overhead triceps work, seated leg curls, straight-knee calf raises, nothing rated 5 or under
      // (strength plans keep their barbell lifts; the home plan has no cables or machines)
      if (!home) for (const re of [/^Triceps only get pushdowns/, /isn’t the seated kind/, /^Calves only get seated/]) if (items.some(i => re.test(strip(i.text)))) bad.push(tag + ' ' + re.source);
      if (!strength && !home) for (const o of st.ex) if (o.a && o.a.score != null && o.a.score <= 5) bad.push(tag + ' low-rated ' + o.e.name);
    }
    return bad;
  })()`);
  r.ok(!ev.length, 'every plan, both versions, at each days a week it’s for: nothing to fix, 0–3 RIR, 2+ minutes’ rest on big lifts, 75 minutes at most, push and pull balanced, enough sets, big muscles twice a week, well-rated exercises', ev);

  // the list on the Train tab
  await t.tab('train');
  const cards = () => p.evaluate(() => [...document.querySelectorAll('#plans [data-a="planOpen"]')].map(b => b.dataset.id));
  const all = await cards();
  r.ok(all.length === 18, 'the Train tab lists every ready-made plan', all.length);
  await t.click('#plans [data-a="planF"][data-k="days"][data-v="4"]', 400);
  const four = await cards(), fourWant = await t.ev(`PROGRAMS.filter(p => p.week.includes(4)).map(p => p.id)`);
  const pressed = await p.evaluate(() => { const b = document.querySelector('#plans [data-a="planF"][data-k="days"][data-v="4"]'); return { on: b.getAttribute('aria-pressed'), focus: document.activeElement === b }; });
  r.ok(JSON.stringify(four.sort()) === JSON.stringify(fourWant.sort()) && pressed.on === 'true' && pressed.focus, 'choosing 4 days shows exactly the plans built for 4, says it’s chosen, and keeps the focus there', { four, pressed });
  await t.click('#plans [data-a="planF"][data-k="level"][data-v="new"]', 400);
  const newFour = await cards(), levels = await t.ev(`${JSON.stringify(await cards())}.map(id => PROGRAMS.find(p => p.id === id).level)`);
  r.ok(newFour.length >= 1 && levels.every(l => l === 'new') && /plan fits|plans fit/.test(await t.text('#plans .pf-count')), '“Just starting” leaves the plans for beginners, and the count says how many fit', { newFour, levels });
  await t.click('#plans [data-a="planF"][data-k="days"][data-v="5"]', 400);
  r.ok((await cards()).length === 0 && /No plan fits both/.test(await t.text('#plans')), 'when nothing fits both, it says so instead of showing nothing');
  await t.click('#plans [data-a="planF"][data-k="all"]', 400);
  r.ok((await cards()).length === 18, '“Show all plans” brings them all back');

  // a plan's page
  await t.click('#plans [data-a="planOpen"][data-id="ap"]', 800);
  const page = await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return { text: w.textContent.replace(/\s+/g, ' '), week: w.querySelectorAll('.plan-week li.on').length, days: w.querySelectorAll('.plan-day').length, why: w.querySelectorAll('.plan-why li').length, links: w.querySelectorAll('.plan-why a[href^="http"]').length, ver: [...w.querySelectorAll('[data-a="ver"]')].map(b => b.getAttribute('aria-pressed')), focus: document.activeElement && document.activeElement.id }; });
  r.ok(/Anterior \/ Posterior/.test(page.text) && page.week === 4 && page.days === 4 && page.why === 5 && page.links >= 5 && page.ver.join() === 'true,false' && page.focus === 'planH', 'a plan opens on its own page: the week, every day’s exercises, how it’s built with its studies, free weights chosen to start, the heading focused', page);
  r.ok(/Barbell Bench Press/.test(page.text) && !/Machine Chest Press/.test(page.text), 'the free-weight version shows the barbell lifts');
  await t.inSheet('[data-a="ver"][data-v="machine"]', 400);
  const mtext = await t.sheetText();
  r.ok(/Machine Chest Press/.test(mtext) && /instead of Barbell Bench Press/.test(mtext) && /Haugen et al\. 2023/.test(mtext), 'the machine version shows the machines, what each replaces, and the study behind it');
  await t.inSheet('[data-a="review"]', 800);
  const rev = await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return { title: (w.querySelector('.big-title') || {}).textContent, fixes: +(w.querySelector('.rv-tile.fix b') || {}).textContent }; });
  r.ok(rev.title === 'Anterior / Posterior' && rev.fixes === 0, 'the full review opens for the plan before it’s used, with nothing to fix', rev);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await t.inSheet('[data-a="use"]', 900);
  let s = await t.state();
  let sp = s.splits.find(x => x.id === s.activeSplit);
  const mIds = s.templates.filter(x => sp.days.includes(x.id)).map(x => x.ex.map(e => e.exId).join());
  const press = s.templates.find(x => x.id === sp.days[0]).ex[0];
  r.ok(sp.programId === 'ap' && sp.version === 'machine' && press.exId === 'machine-chest-press' && press.free === 'barbell-bench-press' && !(await p.evaluate(() => document.querySelector('#sheets .sheet-wrap.in'))), 'Use makes the machine version your split', { version: sp.version, press });

  // machines ↔ free weights on your split
  r.ok(/Machine version · Move to free weights/.test(await t.text('.split-ver')), 'your split says it’s the machine version, with the way to free weights next to it');
  await t.click('[data-a="splitVersion"]', 600);
  r.ok(/Machine Chest Press → Barbell Bench Press/.test(await t.sheetText()), 'before switching, it lists every exercise that changes');
  await t.inSheet('[data-a="ok"]', 700);
  s = await t.state(); sp = s.splits.find(x => x.id === s.activeSplit);
  const fIds = s.templates.filter(x => sp.days.includes(x.id)).map(x => x.ex.map(e => e.exId).join());
  const want = await t.ev(`programDays(PROGRAMS.find(p => p.id === 'ap'), false).filter(d => !isRest(d)).map(d => d.ex.map(e => e.exId).join())`);
  r.ok(!sp.version && JSON.stringify(fIds) === JSON.stringify(want) && s.templates.every(x => x.ex.every(e => !e.free)) && /Free weights · Switch to machines/.test(await t.text('.split-ver')), 'moving to free weights gives exactly the free-weight plan', { fIds, want });
  await t.click('[data-a="splitVersion"]', 600); await t.inSheet('[data-a="ok"]', 700);
  s = await t.state(); sp = s.splits.find(x => x.id === s.activeSplit);
  r.ok(sp.version === 'machine' && JSON.stringify(s.templates.filter(x => sp.days.includes(x.id)).map(x => x.ex.map(e => e.exId).join())) === JSON.stringify(mIds), 'and switching back gives the same machines again');

  // the guide: someone new gets the machine version, someone with experience the free-weight one
  const guide = async (level, kit) => {
    const g = await open({ fresh: true }); await g.p.waitForTimeout(700);
    await g.inSheet('[data-a="wUnit"][data-v="kg"]', 200); await g.inSheet('[data-a="wGuide"]', 500);
    for (const v of [level, 'muscle', '3', kit, 'self']) await g.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
    const note = await g.p.evaluate(() => !!document.querySelector('#sheets .sheet-wrap.in [data-machine-note]'));
    await g.inSheet('.guide-plan.main [data-a="gUse"]', 900);
    const st = await g.state(), x = st.splits.find(y => y.id === st.activeSplit);
    const ids = st.templates.filter(y => x.days.includes(y.id)).flatMap(y => y.ex.map(e => e.exId));
    const res = { note, version: x.version, program: x.programId, barbell: ids.filter(id => /barbell|dumbbell-press|pull-up|back-squat/.test(id)) };
    g.errors.forEach(e => t.errors.push(e)); await g.ctx.close();
    return res;
  };
  const novice = await guide('new', 'gym'), some = await guide('some', 'gym'), home = await guide('new', 'db');
  r.ok(novice.version === 'machine' && novice.note && !novice.barbell.length, 'the guide gives someone just starting the machine version, and says why', novice);
  r.ok(!some.version && !some.note, 'with some experience, the free-weight version', some);
  r.ok(home.program === 'db' && !home.version && !home.note, 'at home, the dumbbell plan', home);
  await r.done(t);
})();
