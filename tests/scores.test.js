// growth scores: shown as estimates, explained, and never given where they'd mislead
const { open, report } = require('./lib');
(async () => {
  const r = report('Growth scores are honest');
  const t = await open();
  const audit = await t.ev(`(() => {
    const out = { stretches: [], timed: [], bands: [], range: [], total: 0 };
    for (const e of LIB) {
      const a = sciOf(e.id); if (!a || a.score == null) continue;
      out.total++;
      if (['mobility', 'cardio'].includes(e.m) || /stretch/i.test(e.name)) out.stretches.push(e.name);
      if (!['wr', 'bw', 'aw'].includes(e.k)) out.timed.push(e.name);
      if (e.eq === 'band' && a.r.L > 1) out.bands.push(e.name);
      if (a.score < 0 || a.score > 10 || a.score !== Object.values(a.r).reduce((x, y) => x + y, 0)) out.range.push(e.name);
    }
    return out;
  })()`);
  r.ok(audit.total > 1000, `${audit.total} exercises have a score`);
  r.ok(!audit.stretches.length, 'no stretch, mobility or conditioning drill gets a growth score', audit.stretches.slice(0, 5));
  r.ok(!audit.timed.length, 'nothing done for time or distance gets one either', audit.timed.slice(0, 5));
  r.ok(!audit.bands.length, 'band exercises never get full marks for loading the stretch (bands are lightest there)', audit.bands.slice(0, 5));
  r.ok(!audit.range.length, 'every score is 0–10 and adds up from the points shown for it', audit.range.slice(0, 5));
  // what you see
  await t.tab('library'); await t.p.fill('#libQ', 'lever seated fly'); await t.p.waitForTimeout(400); await t.click('#view .ex-row', 800);
  const sheet = await t.sheetText();
  r.ok(/Estimate from the mechanics/.test(sheet) && /Why \d+\/10: points from the mechanics/.test(sheet) && /How sure is this\?/.test(sheet) && /What it can’t see/.test(sheet), 'the details say it’s an estimate, show where the points come from, and what it can’t know');
  await t.p.keyboard.press('Escape'); await t.p.waitForTimeout(500);
  await t.p.fill('#libQ', 'standing calves calf stretch'); await t.p.waitForTimeout(400); await t.click('#view .ex-row', 800);
  r.ok(/Not rated for growth/.test(await t.sheetText()), 'a stretch says it isn’t rated, and why');
  await t.p.keyboard.press('Escape'); await t.p.waitForTimeout(500);
  await t.p.fill('#libQ', ''); await t.click('[data-a="libS"][data-v="score"]', 600);
  r.ok(/Ordered by an estimate/.test(await t.text('.sort-note') || ''), '“Best for growth” says it’s ordered by an estimate');
  await t.start();
  r.ok(/Est\. \d+\/10/.test(await t.text('#workout .hero-tag') || ''), 'the score on the exercise picture says “Est.”');
  await r.done(t);
})();
