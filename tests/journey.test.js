// someone new, start to finish, on a phone-sized screen: first launch and the
// guide, a whole workout logged with the number pad and ✓, the app sent to the background and closed mid-workout,
// finishing, then a backup saved, everything erased and the backup restored. Runs in Chromium, and in WebKit
// (Safari's engine, with an iPhone's user agent) with LS_BROWSER=webkit.
const fs = require('fs'), path = require('path'), os = require('os');
const { open, report, ENGINE } = require('./lib');
(async () => {
  const r = report(`First launch to a restored backup (${ENGINE})`);
  const t = await open({ fresh: true });
  const p = t.p;
  const sheetOpen = () => p.evaluate(() => !!document.querySelector('#sheets .sheet-wrap.in'));
  const closeSheets = async () => { for (let k = 0; k < 4 && await sheetOpen(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(450); } };
  // first launch: the welcome, then the guide sets up a plan
  const welcome = await p.waitForFunction(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return w && /Welcome to Lifting Sanity/.test(w.textContent); }, null, { timeout: 8000 }).then(() => true, () => false);
  if (!r.ok(welcome, 'first launch opens the welcome', { page: await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)), errors: t.errors })) return r.done(t);
  await p.waitForTimeout(400);
  await t.inSheet('[data-a="wUnit"][data-v="kg"]', 250);
  await t.inSheet('[data-a="wGuide"]', 500);
  for (const v of ['new', 'muscle', '3', 'gym', 'self']) await t.inSheet(`[data-a="gAns"][data-v="${v}"]`, 450);
  await t.inSheet('.guide-plan.main [data-a="gUse"]', 900);
  let s = await t.state();
  const split = s.splits.find(x => x.id === s.activeSplit);
  r.ok(split && split.programId === 'fb' && !(await sheetOpen()) && s.flags.welcomed === 1, 'the guide sets up a plan that fits, and the welcome is done', split && split.programId);

  // the first workout
  await t.tab('train');
  await t.click('[data-a="startDay"]', 900);
  r.ok(await p.evaluate(() => document.body.classList.contains('wo-open') && !!document.querySelector('#workout .exc')), 'Start opens the workout');
  const total = await t.ev('A().ex.reduce((n, x) => n + x.sets.length, 0)');
  // each set in turn, the way someone new does it: anything the app can't fill in yet (a first workout has no weights,
  // and warm-ups no reps) is typed on the number pad and logged with its Log key; the rest is one tap on ✓
  const doneCount = () => t.ev('A().ex.reduce((m, x) => m + x.sets.filter(s => s.done).length, 0)');
  const logNext = async () => {
    const n = await t.ev(`(() => { const w = A(), x = w.ex[w.cur], j = x.sets.findIndex(s => !s.done);
      if (j < 0) return { j, cur: w.cur, left: w.ex.some(x => x.sets.some(s => !s.done)) };
      const s = x.sets[j], ph = placeholder(x, j, exCtx(w, x)), k = getEx(x.exId).k;
      const want = [hasWeight(k) && k !== 'bw' && 'w', hasReps(k) && 'r', !hasReps(k) && hasTime(k) && 'sec'].filter(Boolean);
      return { cur: w.cur, j, warm: s.t === 'W', type: want.filter(f => s[f] == null && ph[f] == null) }; })()`);
    if (n.j < 0) { if (n.left) { await t.click('#workout [data-a="woNext"]', 700); return (await t.ev('A().cur')) !== n.cur ? 'moved' : 'stuck: next exercise'; } return false; }
    const before = await doneCount();
    if (n.type.length) {
      for (const f of n.type) {
        await t.click(`#workout .cell[data-e="${n.cur}"][data-s="${n.j}"][data-f="${f}"]`, 250);
        const v = f === 'w' ? (n.warm ? '20' : '40') : f === 'r' ? (n.warm ? '10' : '8') : '45';
        for (const k of v) await t.click(`#keypad [data-a="kpKey"][data-k="${k}"]`, 60);
      }
      await t.click('#keypad [data-a="kpLog"]', 500);
    } else await t.click(`#workout [data-a="toggleSet"][data-e="${n.cur}"][data-s="${n.j}"]`, 500);
    // a step has to log a set; if it didn't, say what was on screen
    if (await doneCount() > before) return 'set';
    return 'stuck: ' + JSON.stringify(n) + ' ' + (await t.text('#toast') || '') + ' ' + (await t.text(`#workout .exc[data-e="${n.cur}"] .set-row[data-s="${n.j}"]`) || '');
  };
  // logs up to `max` sets, until the workout is done or a step gets stuck (a failure, not a hang)
  const logUpTo = async max => { let k = 0; for (let steps = 0; k < max && steps < max + 12; steps++) { const st = await logNext(); if (st === false) break; if (st === 'set') k++; else if (st !== 'moved') { r.ok(false, 'logging keeps going', st); break; } } return k; };
  let logged = await logUpTo(Math.floor(total / 2));
  const halfway = await doneCount();
  r.ok(halfway === logged && halfway > 4, 'sets log with the number pad and one tap each', { halfway, logged, total });
  r.ok(await p.evaluate(() => !document.getElementById('restbar').hidden), 'the rest timer starts by itself after a set');

  // the phone locks, then the app is closed and opened again mid-workout
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
  const saved = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('liftingsanity:data:v1')); return d.active ? d.active.ex.reduce((n, x) => n + x.sets.filter(s => s.done).length, 0) : -1; });
  r.ok(saved === halfway, 'locking the phone saves every set logged so far', { saved, halfway });
  const cur = await t.ev('A().cur');
  await p.reload(); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(900);
  const back = await t.ev('({ open: !!A() && document.body.classList.contains("wo-open"), cur: A() && A().cur, done: A() ? A().ex.reduce((n, x) => n + x.sets.filter(s => s.done).length, 0) : 0 })');
  r.ok(back.open && back.cur === cur && back.done === halfway, 'opening the app again brings back the workout, on the same exercise, with every set', { back, cur, halfway });

  // the rest of the workout, then Finish
  logged += await logUpTo(total * 2);
  const done = await t.ev('A().ex.every(x => x.sets.every(s => s.done))');
  r.ok(done, 'every set of the workout can be logged', { logged, total });
  await t.click('#workout [data-a="woFinish"]', 700);
  if (await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); return !!(w && w.querySelector('[data-a="ok"]')); })) await t.inSheet('[data-a="ok"]', 1200);
  const shown = await p.waitForFunction(() => document.querySelector('#sheets .sheet-wrap.finish.in'), null, { timeout: 6000 }).then(() => true, () => false);
  s = await t.state();
  // if the end screen didn't come up: what's open, and what happens when it's asked for directly
  const why = shown ? null : await t.ev(`(() => { const open = [...document.querySelectorAll('#sheets .sheet-wrap')].map(w => w.className); try { finishScreen(state.workouts[0].id); return { open, direct: 'opened' }; } catch (e) { return { open, direct: String(e && e.stack || e).slice(0, 400) }; } })()`);
  r.ok(shown && !s.active && s.workouts.length === 1 && s.workouts[0].ex.every(x => x.sets.every(st => st.done)) && /First workout done!/.test(await t.sheetText()), 'Finish saves the workout and celebrates the first one', { workouts: s.workouts.length, sheet: (await t.sheetText()).slice(0, 80), why });
  // in Safari's engine too: a card drawn into a picture, the way Share makes it
  const pic = await t.ev(`(async () => { try { const b = await cardPNG(finCards(workoutStory(state.workouts[0]))[1]); return b ? b.size : 0; } catch (e) { return 'error: ' + e.message; } })()`);
  r.ok(pic > 10000, 'a card from the end screen can be made into a picture to share', pic);
  await closeSheets();
  await t.tab('history');
  r.ok(await p.evaluate(() => document.querySelectorAll('#view .hist-card').length === 1), 'History shows the workout');
  // records need something to beat, so a first workout claims none
  r.ok(s.workouts[0].prs.length === 0, 'a first workout claims no records', s.workouts[0].prs);

  // back up to a file, erase everything, restore the file
  await t.tab('settings');
  const [dl] = await Promise.all([p.waitForEvent('download'), t.click('[data-a="exportFile"]', 600)]);
  const file = path.join(os.tmpdir(), `ls-journey-${Date.now()}.json`);
  await dl.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  r.ok(backup.app === 'liftingsanity' && backup.data.workouts.length === 1 && backup.data.splits.length >= 1, 'the backup file holds the workout and the plan', { workouts: backup.data.workouts.length });
  const before = await t.state();
  await t.click('[data-a="eraseAll"]', 500);
  await p.fill('#eraseBox', 'ERASE'); await t.inSheet('[data-a="ok"]', 800);
  s = await t.state();
  r.ok(s.workouts.length === 0 && !s.profile, 'Erase everything empties the app');
  await closeSheets(); await t.tab('settings');
  await p.setInputFiles('#view input[data-f="importFile"]', file);
  await p.waitForTimeout(800);
  if (await sheetOpen()) await t.inSheet('[data-a="ok"]', 1200);
  await closeSheets();
  s = await t.state();
  const same = JSON.stringify(s.workouts) === JSON.stringify(before.workouts) && JSON.stringify(s.splits) === JSON.stringify(before.splits) && s.activeSplit === before.activeSplit && s.settings.rest === before.settings.rest && s.settings.effort === before.settings.effort;
  r.ok(same, 'restoring the file brings back the workout, the plan and the settings exactly', { workouts: s.workouts.length });
  await p.reload(); await p.waitForFunction(() => window.LiftingSanity); await p.waitForTimeout(700);
  s = await t.state();
  r.ok(s.workouts.length === 1 && s.activeSplit === before.activeSplit, 'and it’s all still there after closing and opening the app');
  fs.rmSync(file, { force: true });
  await r.done(t);
})();
