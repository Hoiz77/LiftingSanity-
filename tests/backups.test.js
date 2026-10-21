// backing up: when you last did, a nudge when it's been a while, and the automatic copies kept on the device
const { open, report } = require('./lib');
(async () => {
  const r = report('Backups: reminders and copies on the device');
  const t = await open({ clock: new Date('2026-10-01T09:00:00') });
  const p = t.p;
  const nudge = () => t.text('.backup-nudge');
  const backupRow = async () => { await t.tab('settings'); return p.evaluate(() => [...document.querySelectorAll('.set-item')].map(r => r.textContent).find(x => /Back up/.test(x)) || ''); };
  const logOne = async () => {
    await t.start();
    await t.ev(`(() => { const s = A().ex[0].sets.find(o => o.t !== 'W'); s.w = 50; s.r = 5; s.done = true; save(); })()`);
    await t.click('[data-a="woFinish"]', 500); await t.inSheet('[data-a="ok"]', 900);
    await t.ev('closeAllSheets()'); await p.waitForTimeout(500);
  };
  await t.tab('train');
  r.ok(!(await nudge()), 'no nudge before you’ve logged anything');
  await t.tab('settings'); await t.click('[data-a="demoOn"]'); await t.tab('train');
  r.ok(!(await nudge()), 'sample workouts don’t count');
  await t.tab('settings'); await t.click('[data-a="demoOff"]');
  for (let i = 0; i < 3; i++) { await logOne(); await p.clock.fastForward(26 * 3600e3); }
  await t.tab('train');
  r.ok(/Your 3 workouts are only on this device/.test(await nudge() || ''), 'three workouts and never backed up: the Train page says so');
  r.ok(/Never backed up\. Your 3 workouts are only on this device/.test(await backupRow()), 'Settings says when you last backed up (never)');
  await t.tab('train'); await t.click('[data-a="backupLater"]');
  r.ok(!(await nudge()), '“Later” hides it');
  await p.clock.fastForward(3 * 86400e3 + 3600e3); await t.tab('history'); await t.tab('train');
  r.ok(!!(await nudge()), 'and it comes back 3 days later');
  const dl = p.waitForEvent('download');
  await t.click('.backup-nudge [data-a="exportFile"]');
  r.ok(!!(await dl) && !(await nudge()), '“Back up now” saves a file, and the nudge goes');
  r.ok(/Last backup today · nothing new since/.test(await backupRow()), 'Settings: last backup today');
  await p.clock.fastForward(7 * 86400e3 + 3600e3); await logOne(); await t.tab('train');
  r.ok(/1 workout since your last backup/.test(await nudge() || ''), 'a week and a new workout later, it nudges again');
  // copies on the device: one a day; the last 5 days are kept (plus the fullest older one)
  for (let i = 0; i < 9; i++) { await p.clock.fastForward(86400e3); await t.ev('keepCopy()'); await p.waitForTimeout(120); }
  const copies = await t.ev('listCopies().then(l => l.length)');
  r.ok(copies >= 5 && copies <= 6, 'one copy a day, the last 5 days kept', copies);
  await t.ev(`(() => { state.workouts = state.workouts.slice(0, 1); recalcPRs(); save(true); render(); })()`);
  await t.tab('settings'); await t.click('[data-a="copies"]', 700);
  await t.inSheet('[data-a="useCopy"]', 600);
  r.ok(/Go back to this copy\?/.test(await t.sheetText()), 'going back to a copy asks first');
  await t.inSheet('[data-a="ok"]', 700);
  r.ok((await t.state()).workouts.length === 4 && !!(await p.evaluate(() => localStorage.getItem('liftingsanity:data:v1:before-restore'))), 'going back restores the copy, and what was there is set aside');
  await t.tab('settings'); await t.click('[data-a="eraseAll"]', 400); await p.fill('#eraseBox', 'ERASE'); await t.inSheet('[data-a="ok"]', 800);
  r.ok(await t.ev('listCopies().then(l => l.length)') === 0, 'Erase everything removes the copies too');
  await r.done(t);
})();
