// your data is never lost or half-changed: loading odd saves, backups and restores, two tabs at once
const { open, report } = require('./lib');
const fs = require('fs');
const KEY = 'liftingsanity:data:v1';
const day = 864e5;
(async () => {
  const r = report('Data safety');
  const pages = [];

  // a save with odd records: mended on opening, nothing lost
  const odd = {
    v: 1, workouts: [
      { id: 'a', name: 'A', start: Date.now() - 5 * day, ex: [{ id: 'x', exId: 'barbell-bench-press', sets: [{ id: 's', t: 'N', w: 100, r: 5, done: true }] }] },
      { id: 'odd', name: 'no exercises', start: Date.now() - 4 * day },
      { id: 'odd2', start: Date.now() - 3 * day, ex: [{ id: 'y', exId: 'barbell-row', sets: null }, null] }],
    templates: [{ id: 't1', name: 'T', ex: [] }], splits: [{ id: 'sp', name: 'S', days: ['t1', 'gone', 'rest'], pos: 2 }], activeSplit: 'sp', custom: null
  };
  let t = await open({ seed: odd }); pages.push(t);
  let s = await t.state();
  r.ok(s.workouts.length === 3 && Array.isArray(s.custom), 'a workout with no exercises or a broken set list is mended, every workout kept', { n: s.workouts.length });
  r.ok(s.splits[0].days.join(',') === 't1,rest' && s.splits[0].pos === 1, 'a split day whose template was deleted is dropped, "up next" stays on the same day', s.splits[0]);
  r.ok((await t.p.evaluate(() => document.querySelector('#view').innerHTML.length)) > 500, 'the Train page still draws');

  // unreadable data with no room to copy it aside: never written over
  const ctxFull = await open({ hook: false }); pages.push(ctxFull);
  // filled in before the app starts (the page being left saves its own data on the way out)
  await ctxFull.p.addInitScript(k => {
    if (sessionStorage.getItem('full')) return;
    sessionStorage.setItem('full', '1');
    localStorage.clear();
    let n = 0; try { for (;;) localStorage.setItem('filler' + n++, 'x'.repeat(200000)); } catch (e) { /* full */ }
    for (let len = 200000; len > 10; len = Math.floor(len * 0.9)) { try { localStorage.setItem(k, '[' + '1,'.repeat(len) + '1]'); break; } catch (e) { /* smaller */ } }
  }, KEY);
  await ctxFull.p.reload(); await ctxFull.p.waitForTimeout(900);
  await ctxFull.p.evaluate(() => { window.LiftingSanity.state.settings.sound = false; window.LiftingSanity.save(); });
  await ctxFull.p.waitForTimeout(200);
  const kept = await ctxFull.p.evaluate(k => localStorage.getItem(k).slice(0, 10), KEY);
  const toast = await ctxFull.text('#toast');
  r.ok(kept.startsWith('[1,1,1') && /couldn’t be read/.test(toast), 'saved data that can’t be read, with no room to copy it aside, is never written over (and you’re told)', { kept, toast });
  await ctxFull.p.evaluate(() => localStorage.clear());

  // deleting a template from inside the split editor, then saving the split
  t = await open(); pages.push(t);
  await t.click('[data-a="planF"][data-k="all"]', 300).catch(() => {});
  await t.click('[data-a="planOpen"][data-id="ppl"]', 600);
  await t.inSheet('[data-a="use"]', 900);
  await t.click('[data-a="splitEdit"]', 500);
  await t.inSheet('[data-a="editDay"][data-i="0"]', 600);
  await t.inSheet('[data-a="del"]', 500);
  await t.inSheet('[data-a="ok"]', 600);
  await t.inSheet('[data-a="save"]', 600);
  s = await t.state();
  const sp = s.splits.find(x => x.id === s.activeSplit);
  r.ok(sp.days.every(d => d === 'rest' || s.templates.some(x => x.id === d)), 'deleting a day’s template inside the split editor leaves no dead day behind', sp.days);
  await t.p.reload(); await t.p.waitForTimeout(800);
  r.ok((await t.p.evaluate(() => document.querySelector('#view').innerHTML.length)) > 500, 'the Train page still draws after reopening');

  // backups
  t = await open(); pages.push(t);
  await t.p.evaluate(() => {
    const st = window.LiftingSanity.state;
    st.workouts.push({ id: 'w1', name: 'Pull', start: Date.now() - 2 * 864e5, end: Date.now() - 2 * 864e5 + 3600e3, ex: [{ id: 'x1', exId: 'barbell-row', sets: [{ id: 's1', t: 'N', w: 60, r: 8, done: true }] }], prs: [] });
    st.exPrefs['lever-leg-extension'] = { note: 'Seat 5', profile: [1, 0.9, 0.7, 0.6, 0.5] };
    st.exResets['lever-seated-fly'] = [Date.now() - 864e5];
    st.settings.style = 'y2k';
    window.LiftingSanity.save();
  });
  await t.p.evaluate(() => new Promise(res => { const c = document.createElement('canvas'); c.width = c.height = 8; const url = c.toDataURL('image/jpeg'); const rq = indexedDB.open('liftingsanity', 1); rq.onsuccess = () => { const tx = rq.result.transaction('photos', 'readwrite'); tx.objectStore('photos').put(url, 'lever-seated-fly'); tx.oncomplete = res; }; }));
  await t.p.reload(); await t.p.waitForTimeout(800);
  await t.tab('settings');
  const dl = t.p.waitForEvent('download');
  await t.click('[data-a="exportFile"]');
  const text = fs.readFileSync(await (await dl).path(), 'utf8'), bk = JSON.parse(text);
  r.ok(bk.app === 'liftingsanity' && Object.keys(bk.photos).length === 1 && bk.data.workouts.length === 1 && bk.data.exPrefs['lever-leg-extension'].profile.length === 5 && bk.data.settings.style === 'y2k', 'a backup file holds workouts, settings, setups, machine profiles, resets and photos');

  const q = await open(); pages.push(q);
  await q.tab('settings');
  const paste = async txt => { await q.click('[data-a="importPaste"]', 400); await q.p.fill('#pasteBox', txt); await q.inSheet('[data-a="ok"]', 500); };
  const before = await q.p.evaluate(k => localStorage.getItem(k), KEY);
  const bad = JSON.parse(text); bad.data.workouts.push({ start: 5, ex: [{ exId: 'x', sets: 'broken' }] });
  await paste(JSON.stringify(bad));
  r.ok(/can’t be restored/.test(await q.text('#toast')) && before === await q.p.evaluate(k => localStorage.getItem(k), KEY), 'a damaged backup is refused and nothing on the device changes');
  const nulls = JSON.parse(text); nulls.data.custom = null; nulls.data.exPrefs = null;
  await paste(JSON.stringify(nulls)); await q.inSheet('[data-a="ok"]', 700);
  await q.p.reload(); await q.p.waitForTimeout(800);
  r.ok((await q.state()).workouts.length === 1 && (await q.p.evaluate(() => document.querySelector('#view').innerHTML.length)) > 500, 'a backup with empty lists in it restores without breaking the app');
  await q.tab('settings');
  await paste(text);
  r.ok(/1<\/b> workouts|1 workouts/.test(await q.p.evaluate(() => [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop().innerHTML)), 'restoring asks first and says what’s in the backup');
  await q.inSheet('[data-a="ok"]', 700);
  await q.p.reload(); await q.p.waitForTimeout(800);
  const rs = await q.state();
  const photo = await q.p.evaluate(() => new Promise(res => { const rq = indexedDB.open('liftingsanity', 1); rq.onsuccess = () => { const g = rq.result.transaction('photos').objectStore('photos').get('lever-seated-fly'); g.onsuccess = () => res(!!g.result); }; }));
  r.ok(rs.workouts.length === 1 && rs.exPrefs['lever-leg-extension'].note === 'Seat 5' && Object.keys(rs.exResets).length === 1 && rs.settings.style === 'y2k' && photo, 'everything comes back after a restore and a reopen, photo included', { w: rs.workouts.length, photo });
  r.ok(!!(await q.p.evaluate(k => localStorage.getItem(k + ':before-restore'), KEY)), 'what was on the device is set aside before a restore');
  await q.tab('settings'); await q.click('[data-a="eraseAll"]', 400); await q.p.fill('#eraseBox', 'ERASE'); await q.inSheet('[data-a="ok"]', 700);
  r.ok(!(await q.p.evaluate(() => Object.keys(localStorage).some(k => k.includes(':before-restore')))) && (await q.state()).workouts.length === 0, 'Erase everything also removes the set-aside copy');

  // two tabs: a save in one never drops the other's unsaved typing
  const a = await open(); pages.push(a);
  const b2 = await a.ctx.newPage(); await b2.goto(a.p.url()); await b2.waitForFunction(() => window.LiftingSanity);
  await a.start();
  await a.ev(`(() => { A().ex[0].sets[1].w = 77; save(); })()`);
  await b2.evaluate(() => { window.LiftingSanity.state.settings.sound = false; window.LiftingSanity.save(); });
  await a.p.waitForTimeout(1300);
  r.ok((await a.state()).active.ex[0].sets[1].w === 77 && JSON.parse(await a.p.evaluate(k => localStorage.getItem(k), KEY)).active.ex[0].sets[1].w === 77, 'a save from another tab doesn’t drop a weight just typed here');
  await r.done(...pages);
})();
