// the body in the muscle pictures: every muscle the app knows has an outline on both builds, front or back; pictures
// paint the worked muscles with soft edges; a man's or a woman's build (picked for you by women's rank standards);
// Y2K tints the body; the big pictures zoom to what's worked; cards carry the body inside them; the rank emblems
// and the rank-up screen
const { open, report } = require('./lib');
(async () => {
  const r = report('Body pictures and rank visuals');
  const t = await open({ settings: { theme: 'dark', keypad: 'app', view: 'focus' } });
  const p = t.p;

  // the outlines
  const data = await t.ev(`(() => {
    const keys = new Set();
    for (const e of LIB) for (const m of [e.m, ...e.sec]) if (!['fullbody', 'cardio', 'mobility'].includes(m)) keys.add(m);
    const miss = [];
    for (const sex of ['male', 'female']) for (const k of keys) if (!BD[sex].front[k] && !BD[sex].back[k]) miss.push(sex + ':' + k);
    const both = v => ['male', 'female'].every(s => !!BD[s][v[0]][v[1]]);
    return { n: keys.size, miss, erectors: both(['back', 'lowerback']), soleusFront: both(['front', 'calves']), calvesBack: both(['back', 'calves']), abductorsFront: both(['front', 'abductors']), adductorsBack: both(['back', 'adductors']), outerThigh: both(['back', 'quads']), size: [BD.w, BD.h] };
  })()`);
  r.ok(data.n >= 20 && !data.miss.length, `every muscle the exercises use (${data.n}) has an outline on both builds`, data.miss);
  r.ok(data.erectors && data.soleusFront && data.calvesBack && data.abductorsFront && data.adductorsBack && data.outerThigh, 'including the erectors, the soleus from the front, the outer hip and thigh, and the adductors from behind', data);

  // the shared drawing: the light render in Clean, with its filters
  const sp = await p.evaluate(() => { const s = document.querySelector('#bd-sprite'); return s && { front: s.querySelector('#bd-front').getAttribute('href'), back: s.querySelector('#bd-back').getAttribute('href'), soft: !!s.querySelector('#bd-soft'), hit: !!s.querySelector('#bd-hit'), outlines: s.querySelectorAll('path[id^="bm-"]').length }; });
  r.ok(sp && sp.front === 'art/body/male-front-light.webp' && sp.back === 'art/body/male-back-light.webp' && sp.soft && sp.hit && sp.outlines > 25, 'the body is drawn once and shared: the shaded render, every outline and the colour filters', sp);
  const img = await p.evaluate(() => Promise.all(['male-front-light', 'female-back-dark'].map(n => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth + '×' + i.naturalHeight); i.onerror = () => res('failed'); i.src = `art/body/${n}.webp`; }))));
  r.ok(img.every(v => v === '513×986'), 'the body pictures load', img);

  // an exercise with no picture: its thumbnail paints the main muscle, with soft edges (a blurred mask, not a hard cut)
  await t.tab('library'); await p.fill('#libQ', 'larsen press'); await p.waitForTimeout(400);
  const th = await p.evaluate(() => { const s = document.querySelector('#libList .ex-row .thumb svg'); if (!s) return null; const ms = [...s.querySelectorAll('[mask]')].map(g => document.querySelector(g.getAttribute('mask').slice(4, -1))); return { masks: ms.length, found: ms.every(Boolean), clips: s.querySelectorAll('clipPath').length, soft: ms.every(m => m && m.querySelector('g[filter="url(#bd-soft)"]')), chest: ms.some(m => m && m.querySelector('use[href="#bm-front-chest"]')), view: s.getAttribute('viewBox') }; });
  r.ok(th && th.masks >= 1 && th.found && !th.clips && th.soft && th.chest && th.view === '31 8 451 451', 'a thumbnail for an exercise with no picture: the chest painted with soft edges, framed on the upper body', th);
  const gl = await t.ev(`(() => { const d = document.createElement('div'); d.innerHTML = mapThumb('frog-pump'); return d.querySelector('svg').getAttribute('viewBox'); })()`);
  r.ok(gl === '31 330 451 451', 'the glutes get a frame of their own, so the whole muscle shows', gl);

  // the details and the workout picture: front and back, the main muscle glowing
  await t.ev(`exerciseSheet('larsen-press')`); await p.waitForTimeout(700);
  const dm = await p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const m = w && w.querySelector('.exd-map'); return m && { svgs: m.querySelectorAll('svg').length, glow: m.querySelectorAll('g[filter="url(#bd-glow)"]').length }; });
  r.ok(dm && dm.svgs === 2 && dm.glow >= 1, 'an exercise’s details: the body front and back, the main muscle glowing', dm);
  await t.ev('closeAllSheets()'); await p.waitForTimeout(400);
  await t.ev(`(() => { startEmpty(); A().ex.push(wexFresh('larsen-press')); A().cur = 0; save(); renderWorkout(true); })()`); await p.waitForTimeout(700);
  const hero = await p.evaluate(() => [...document.querySelectorAll('#workout .exc-hero.maps .hero-maps svg')].map(s => s.getAttribute('viewBox')));
  r.ok(hero.length === 2 && hero.every(v => v === '31 8 451 451'), 'in a workout, the picture zooms to the part of the body that’s worked, front and back', hero);

  // a woman's build: chosen in Settings, or picked by women's rank standards
  await t.ev(`(() => { state.settings.figure = 'female'; save(); bodySprite(); renderWorkout(true); })()`); await p.waitForTimeout(300);
  const fem = await p.evaluate(() => ({ href: document.querySelector('#bd-front').getAttribute('href'), hero: document.querySelector('#workout .exc-hero.maps svg').getAttribute('viewBox') }));
  r.ok(fem.href === 'art/body/female-front-light.webp' && fem.hero === '61 36 391 391', 'with a woman’s build the pictures switch body, with framing to fit it', fem);
  await t.ev(`(() => { delete state.settings.figure; state.body = { sex: 'F', bw: 60, age: null, at: Date.now(), log: [] }; save(); bodySprite(); })()`);
  r.ok(await t.ev('figSex()') === 'female', 'with no choice made, women’s rank standards pick a woman’s build');
  await t.ev(`(() => { state.body = null; save(); bodySprite(); render(); })()`);
  await t.tab('settings');
  const seg = await p.evaluate(() => [...document.querySelectorAll('[data-a="setFigure"]')].map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')));
  r.ok(seg.join('|') === 'Man*|Woman', 'Settings → Look → Body in pictures: Man or Woman', seg);
  await t.click('[data-a="setFigure"][data-v="female"]', 400);
  r.ok((await t.state()).settings.figure === 'female' && await p.evaluate(() => document.querySelector('#bd-back').getAttribute('href')) === 'art/body/female-back-light.webp', 'picking Woman switches every picture and is kept');
  await t.click('[data-a="setFigure"][data-v="male"]', 400);

  // Y2K: the dark render, tinted in its own colours
  await t.click('[data-a="setStyle"][data-v="y2k"]', 600);
  const y = await p.evaluate(() => ({ href: document.querySelector('#bd-front').getAttribute('href'), base: !!document.querySelector('#bd-base'), tinted: !!document.querySelector('.thumb svg use[filter="url(#bd-base)"], .exc-hero svg use[filter="url(#bd-base)"]') }));
  r.ok(y.href === 'art/body/male-front-dark.webp' && y.base && y.tinted, 'Y2K tints the body in its own colours', y);
  await t.click('[data-a="setStyle"][data-v="clean"]', 600);

  // a card carries the body inside it, so the shared picture has it
  const card = await t.ev(`(async () => { const c = cardCtx('muscles', 'x'), svg = cardFrame(c, cardBody(c, 'front', { chest: 1, frontdelts: .5 }, 40, 80, 280)); const out = await inlineArt(svg); return { masks: (svg.match(/<mask /g) || []).length, inlined: /data-body="1" href="data:image\\/webp;base64,/.test(out), left: /data-body="1" href="art\\//.test(out) }; })()`);
  r.ok(card.masks >= 2 && card.inlined && !card.left, 'a card carries the body picture inside it, so sharing it as a picture keeps the body', card);

  // the emblems: nine shapes, gems from Gold up, list-sized ones without the glow
  const em = await t.ev(`(() => { const shapes = RK.TIERS.map((x, i) => (RK.emblem(i, 'q' + i, '').match(/<path d="([^"]+)" fill="url\\(#req\\d+rim\\)"/) || [])[1]); return { distinct: new Set(shapes.filter(Boolean)).size, gems: RK.TIERS.map((x, i) => RK.emblem(i, 'g' + i, '').includes('gm)')), small: RK.emblem(8, 's', '', true).includes('aura)'), big: RK.emblem(8, 'b', '').includes('aura)') }; })()`);
  r.ok(em.distinct >= 8 && em.gems.slice(3).every(Boolean) && !em.gems[0] && !em.small && em.big, 'the emblems: each rank its own shape, a gem from Gold up, and no glow at list sizes', em);

  // the rank-up screen: the old emblem, the new one, rings of light, sparks and a sweep of light
  await t.ev(`rankTakeover([3, 4], getEx('barbell-bench-press'))`); await p.waitForTimeout(200);
  const fx = await p.evaluate(() => { const f = document.querySelector('#rankfx:not([hidden])'); return f && { old: !!f.querySelector('.rkfx-old .rank-emb'), now: !!f.querySelector('.rkfx-new .rank-emb'), rings: f.querySelectorAll('.rkfx-ring').length, sparks: f.querySelectorAll('.rkfx-sparks i').length, shine: !!f.querySelector('.emb-shine'), text: f.textContent.replace(/\s+/g, ' ') }; });
  r.ok(fx && fx.old && fx.now && fx.rings === 2 && fx.sparks === 16 && fx.shine && /Rank up/.test(fx.text) && /Platinum/.test(fx.text), 'a rank-up: the old emblem breaks, the new one lands with rings of light, sparks and a shine', fx);
  await t.ev('rankfxHide()'); await p.waitForTimeout(500);
  await r.done(t);
})();
