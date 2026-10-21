// the plan review: points grouped by topic in a fixed order, a count of each kind that matches what's listed, every
// point saying whether it rests on studies or a rule of thumb, the key that explains those, and badges on one line
const { open, report } = require('./lib');
const ORDER = ['Every muscle covered', 'Weekly sets per muscle', 'How often each muscle is trained', 'Effort', 'Exercise choice', 'Rest between sets', 'Workout length', 'Push and pull balance'];
const read = p => p.evaluate(() => {
  const s = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop();
  const topics = [...s.querySelectorAll('.rv-topic')].map(t => ({
    title: t.querySelector('.rv-h span').textContent.trim(),
    status: t.querySelector('.rv-status').className.replace('rv-status', '').trim(),
    kinds: [...t.querySelectorAll('.review-list li')].map(li => li.className),
    basis: [...t.querySelectorAll('.review-list li')].map(li => { const b = li.querySelector('.basis'); return b ? (b.classList.contains('study') ? (li.querySelector('.rv-src a') ? 'study' : 'study-no-link') : 'rule') : 'none'; })
  }));
  const tiles = Object.fromEntries([...s.querySelectorAll('.rv-tile')].map(t => [t.classList[1], +t.querySelector('b').textContent]));
  const badges = [...s.querySelectorAll('.basis')].map(b => { const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, cls: b.className }; });
  return { topics, tiles, badges, key: (s.querySelector('.rv-key') || {}).textContent || '' };
});
(async () => {
  const r = report('Plan review: clear, grouped, labelled'), pages = [];
  for (const style of ['clean', 'y2k']) {
    const t = await open({ width: 393, height: 852, settings: { style } });
    await t.tab('train');
    await t.click('[data-a="planReview"]', 900);
    const v = await read(t.p);
    const titles = v.topics.map(x => x.title);
    r.ok(titles.length >= 5 && titles.every((x, i) => ORDER.indexOf(x) > (i ? ORDER.indexOf(titles[i - 1]) : -1)), `${style}: topics come in a fixed order`, titles);
    const rank = { fix: 0, tip: 1, good: 2 };
    r.ok(v.topics.every(x => x.kinds.every((k, i) => !i || rank[k] >= rank[x.kinds[i - 1]])), `${style}: inside a topic, things to fix come first and things on track last`, v.topics.map(x => x.kinds));
    r.ok(v.topics.every(x => x.status === x.kinds[0]), `${style}: each topic’s heading shows its most pressing point`, v.topics.map(x => [x.status, x.kinds[0]]));
    const all = v.topics.flatMap(x => x.kinds);
    r.ok(['fix', 'tip', 'good'].every(k => v.tiles[k] === all.filter(x => x === k).length), `${style}: the counts at the top match the points listed`, { tiles: v.tiles, all });
    r.ok(v.topics.every(x => x.basis.every(b => b === 'study' || b === 'rule')), `${style}: every point says whether it comes from studies (with a link) or is a rule of thumb`, v.topics.map(x => x.basis));
    r.ok(/Studies/i.test(v.key) && /Rule of thumb/i.test(v.key) && /research/.test(v.key) && /coaching practice/.test(v.key), `${style}: a key explains what Studies and Rule of thumb mean`, v.key);
    r.ok(v.badges.length && v.badges.every(b => b.h < 26 && b.w > b.h * 2.5 && !/\bthumb\b/.test(b.cls)), `${style}: the Studies and Rule of thumb badges sit on one line`, v.badges.filter(b => !(b.h < 26 && b.w > b.h * 2.5)).slice(0, 3));
    // the weekly sets chart sits with its topic
    r.ok(await t.p.evaluate(() => { const s = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const m = s.querySelector('.mbars'); return !!(m && m.closest('.rv-topic') && /Weekly sets/.test(m.closest('.rv-topic').querySelector('.rv-h').textContent)); }), `${style}: the weekly sets chart is under Weekly sets per muscle`);
    // an exercise link in a point opens that exercise, by tap and by keyboard
    const name = await t.p.evaluate(() => { const s = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const a = s.querySelector('.review-list a.link[data-a="openEx"]'); if (!a) return null; a.click(); return a.textContent; });
    await t.p.waitForTimeout(700);
    r.ok(name && (await t.sheetText()).includes(name), `${style}: a suggested exercise opens when tapped`, name);
    // changing sessions a week redraws it without errors
    await t.p.evaluate(() => { const s = [...document.querySelectorAll('#sheets .sheet-wrap')].find(w => w.querySelector('.rv-sum')); s.querySelector('[data-a="pw"][data-v="5"]').click(); });
    await t.p.waitForTimeout(300);
    r.ok(await t.p.evaluate(() => !!document.querySelector('#sheets [data-a="pw"][data-v="5"].on')), `${style}: changing sessions a week redraws the review`);
    pages.push(t);
    await t.ctx.close();
  }
  // a plan with a muscle left out and a long day: the topics say so
  {
    const t = await open({ width: 393, height: 852 });
    await t.ev(`(() => { const sp = state.splits.find(s => s.id === state.activeSplit); const d = tplById(sp.days.find(x => !isRest(x))); d.ex = d.ex.filter(x => getEx(x.exId).m !== 'chest' && !getEx(x.exId).sec.includes('chest')); save(true); })()`);
    await t.tab('train');
    await t.click('[data-a="planReview"]', 900);
    const v = await read(t.p);
    const cov = v.topics.find(x => x.title === 'Every muscle covered');
    r.ok(cov && cov.status === 'fix' && /chest/.test(await t.sheetText()), 'a muscle with no work at all is listed to fix under Every muscle covered');
    pages.push(t);
    await t.ctx.close();
  }
  await r.done(...pages);
})();
