// layout on phone widths, in both styles (and in Arabic): no text or button runs off the screen or out of its card, the page never
// scrolls sideways, and short button labels sit in the middle of their buttons. Uses the real fonts when online.
const { open, report } = require('./lib');
const CUT = () => {
  const W = document.documentElement.clientWidth, out = new Set();
  const TAGS = new Set(['BUTTON', 'P', 'SPAN', 'B', 'H1', 'H2', 'H3', 'SMALL', 'LABEL', 'A', 'INPUT', 'TEXTAREA', 'LI', 'I', 'STRONG', 'EM', 'DT', 'DD']);
  for (const el of document.querySelectorAll('body *')) {
    if (!TAGS.has(el.tagName) || el.closest('.thumb, .exc-hero, .strip, .sci-cur, .row-del, #hud, svg, [hidden], .sheet-wrap:not(.in)')) continue;
    if (!(el.innerText || el.value || '').trim()) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight * 3) continue;
    let a = el.parentElement, clip = null, sx = false;
    while (a && a !== document.documentElement) { const s = getComputedStyle(a); if (/auto|scroll/.test(s.overflowX)) { sx = true; break; } if (/hidden|clip/.test(s.overflowX)) { clip = a; break; } a = a.parentElement; }
    if (sx) continue;
    const right = Math.min(W, clip ? clip.getBoundingClientRect().right : W), left = Math.max(0, clip ? clip.getBoundingClientRect().left : 0);
    if (r.right > right + 1.5 || r.left < left - 1.5) out.add(`${el.tagName}.${String(el.className).slice(0, 24)} "${(el.innerText || el.value).trim().slice(0, 28)}"`);
  }
  if (document.documentElement.scrollWidth > W + 1) out.add(`the page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);
  for (const b of document.querySelectorAll('button, label.btn')) {
    const cs = getComputedStyle(b), r = b.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight || cs.visibility === 'hidden') continue;
    const txt = (b.innerText || '').trim(); if (!txt || txt.length > 8 || b.querySelector('img')) continue;
    if ((cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent') && cs.boxShadow === 'none' && cs.borderStyle === 'none') continue;
    const rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect();
    const dx = (t.left + t.right) / 2 - (r.left + r.right) / 2;
    if (Math.abs(dx) > 6 && r.width - t.width > 14) out.add(`"${txt}" sits ${dx.toFixed(0)}px off the middle of its button`);
  }
  return [...out].slice(0, 6);
};
(async () => {
  const r = report('Layout: nothing cut off, nothing sideways, labels centred');
  // every width in English, and the middle one in Arabic (right to left, longer words)
  const runs = ['clean', 'y2k'].flatMap(style => [...[375, 393, 430].map(width => ({ style, width, lang: 'en' })), { style, width: 393, lang: 'ar' }]);
  for (const { style, width, lang } of runs) {
    const t = await open({ width, height: 852, fonts: true, settings: { style } });
    if (lang === 'ar') { await t.p.evaluate(() => localStorage.setItem('liftingsanity:lang', 'ar')); await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(500); }
    const p = t.p, found = [];
    const check = async name => {
      await p.evaluate(() => document.fonts.ready);
      await p.waitForFunction(() => !document.querySelector('.view-ghost,.card-ghost,#woScrim') && !document.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.target && ['view', 'workout', 'keypad', 'restbar', 'mini'].includes(a.effect.target.id))).catch(() => {});
      await p.waitForTimeout(120);
      for (const x of await p.evaluate(CUT)) found.push(`${name}: ${x}`);
    };
    await t.click('[data-a="demoOn"]', 50).catch(async () => { await t.tab('settings'); await t.click('[data-a="demoOn"]'); });
    for (const tab of ['train', 'history', 'library', 'progress', 'settings']) {
      await t.tab(tab);
      for (let y = 0; y < 4; y++) { await check(`${tab} @${y}`); const more = await p.evaluate(() => { const h = document.scrollingElement, b = h.scrollTop; h.scrollBy(0, innerHeight * 0.9); return h.scrollTop !== b; }); if (!more) break; }
      await p.evaluate(() => document.scrollingElement.scrollTo(0, 0));
    }
    await t.start();
    await check('workout');
    for (let k = 0; k < 5; k++) { await t.click('#workout [data-a="woNext"]', 450).catch(() => {}); await check('workout, exercise ' + (k + 2)); }
    await p.evaluate(() => document.querySelectorAll('#workout .cell.eff')[1].click()); await check('RIR picker');
    for (const a of ['woRest', 'woMenu']) { await t.click(`#workout [data-a="${a}"]`, 500); await check(a); await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
    await t.ev(`(() => { state.settings.view = 'list'; state.settings.uniStyle = 'one'; save(true); renderWorkout(true); })()`); await p.waitForTimeout(500);
    for (let y = 0; y < 10; y++) { await check('workout list @' + y); await p.evaluate(() => document.querySelector('#workout .wo-main').scrollBy(0, innerHeight * 0.8)); }
    await t.ev(`(() => { for (const x of A().ex) for (const s of x.sets) { s.done = true; s.w = s.tw ?? 10; s.r = 5; } finishWorkout(); })()`); await p.waitForTimeout(900);
    await check('summary');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await check('done for today');
    await t.click('[data-a="planReview"]', 600); await check('plan review');
    r.ok(!found.length, `${style} at ${width}px wide${lang === 'ar' ? ', in Arabic' : ''}`, found);
    await t.ctx.close();
  }
  await r.done();
})();
