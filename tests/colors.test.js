// your own colours: Settings → Colours with a live preview (dark and light), ready-made looks, and every colour in groups:
// the main ones, background and text for each mode, left and right, and the set types. Swatches, the colour wheel and
// hex codes; saved, they colour the app (kept readable in light mode), the end screen and its cards; Cancel and "All
// back to default". Y2K has its own set (frame, neons, background...) and each style keeps its own
const { open, report } = require('./lib');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hex = rgb => '#' + rgb.match(/\d+/g).slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase();
(async () => {
  const r = report('Your own colours');
  const t = await open({ settings: { view: 'focus', keypad: 'app', theme: 'dark' } });
  const p = t.p;
  const rootVar = v => p.evaluate(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim().toUpperCase(), v);
  const pv = v => p.evaluate(v => getComputedStyle([...document.querySelectorAll('#sheets .sheet-wrap.in .cpv')].pop()).getPropertyValue(v).trim().toUpperCase(), v);
  const note = k => p.evaluate(k => document.querySelector(`#sheets .sheet-wrap.in .cslot[data-k="${k}"] .cnote`).textContent, k);
  const section = id => p.evaluate(id => { const d = document.querySelector(`#sheets .sheet-wrap.in details[data-sec="${id}"]`); if (!d.open) d.querySelector('summary').click(); }, id);
  const wheel = (k, v) => p.evaluate(([k, v]) => { const i = document.querySelector(`#sheets .sheet-wrap.in .cslot[data-k="${k}"] input[type="color"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]);

  await t.tab('settings');
  r.ok(await p.evaluate(() => { const b = document.querySelector('[data-a="openColors"]'); return !!b && /Colours/.test(b.closest('.set-item').textContent) && b.querySelectorAll('.cdots i').length === 4; }), 'Settings → Look has Colours, with the colours in use on its button');
  await t.click('[data-a="openColors"]', 600);
  r.ok(await p.evaluate(() => ['main', 'surf', 'sides', 'types'].every(id => document.querySelector(`#sheets .sheet-wrap.in details[data-sec="${id}"]`)) && document.querySelector('details[data-sec="main"]').open && !document.querySelector('details[data-sec="types"]').open), 'the colours come in groups: main, background and text, left and right, set types (the last two folded away)');
  const before = await pv('--accent');
  await t.inSheet('.cslot[data-k="accent"] [data-a="pick"][data-v="#FF375F"]', 200);
  r.ok(before === '#0A84FF' && await pv('--accent') === '#FF375F', 'a swatch shows in the preview straight away', { before });
  r.ok(await rootVar('--accent') === '#0A84FF', 'and nothing in the app changes before Save');
  await wheel('good', '#ffcc00'); await p.waitForTimeout(150);
  const onGood = await pv('--on-good');
  r.ok(await pv('--good') === '#FFCC00' && contrast(onGood, '#FFCC00') >= 4.5 && await p.evaluate(() => document.querySelector('.cslot[data-k="good"] .chex').value) === '#FFCC00', 'the colour wheel takes any colour, a light one gets dark text on it, and its hex code follows', { onGood });
  await section('sides');
  await p.fill('.cslot[data-k="left"] .chex', '0f0'); await p.waitForTimeout(150);
  r.ok(await pv('--side-l') === '#00FF00' && await p.evaluate(() => !document.querySelector('.cslot[data-k="left"] .cslot-reset').hidden), 'a hex code works too (short ones like 0f0 included), and the colour gets a Default button');
  await t.inSheet('[data-a="mode"][data-v="light"]', 300);
  r.ok(await pv('--bg') === '#F2F2F7' && await pv('--accent') === '#007AFF' && await pv('--good') === '#1F9D47', 'light mode is edited on its own: what was picked for dark mode isn’t in it', { accent: await pv('--accent'), good: await pv('--good') });
  await wheel('good', '#ffcc00'); await p.waitForTimeout(150);
  const lg = await pv('--good');
  r.ok(lg !== '#FFCC00' && contrast(lg, '#FFFFFF') >= 2.6 && /light background/.test(await note('good')), 'a yellow picked for light mode is darkened just enough to read on the light page (and says so)', { lg });
  r.ok(await p.evaluate(() => document.querySelector('details[data-sec="sides"]').open), 'groups opened stay open when the preview changes');
  r.ok(/Light mode/.test(await t.text('#sheets .sheet-wrap.in details[data-sec="surf"] summary')), 'background and text are for the mode shown in the preview');
  await t.inSheet('.cslot[data-k="bg"] [data-a="pick"][data-v="#F3EBDD"]', 200);
  r.ok(await pv('--bg') === '#F3EBDD' && lum(await pv('--panel')) > lum('#F3EBDD'), 'a light background for light mode, with the cards lighter than it');
  await t.inSheet('[data-a="mode"][data-v="dark"]', 300);
  await t.inSheet('.cslot[data-k="bg"] [data-a="pick"][data-v="#15202B"]', 200);
  r.ok(await pv('--bg') === '#15202B' && await pv('--panel') !== '#121214' && await pv('--panel') !== '#15202B', 'dark mode has its own: a grey-blue page, with the cards a shade lighter');
  await p.fill('.cslot[data-k="bg"] .chex', '#8090A0'); await p.waitForTimeout(150);
  r.ok(lum(await pv('--bg')) <= 0.06 && /darker/.test(await note('bg')), 'a background too light for dark mode is kept dark, and it says so', await pv('--bg'));
  await p.fill('.cslot[data-k="ink2"] .chex', '#303030'); await p.waitForTimeout(150);
  r.ok(contrast(await pv('--ink-2'), await pv('--panel')) >= 4.5 && /easy to read/.test(await note('ink2')), 'text too dark to read on the cards is lightened until it reads, and it says so', await pv('--ink-2'));
  await section('types');
  await t.inSheet('.cslot[data-k="types.D"] [data-a="pick"][data-v="#FFD60A"]', 500);
  const dTag = await p.evaluate(() => { const b = document.querySelector('#sheets .sheet-wrap.in .cpv .cpv-types .badge.t-D'), cs = getComputedStyle(b); return { bg: cs.backgroundColor, ink: cs.color }; });
  r.ok(await pv('--p-d') === '#FFD60A' && hex(dTag.bg) === '#FFD60A' && contrast(hex(dTag.ink), '#FFD60A') >= 4.5, 'a set type gets its own colour, with readable text on its plate', dTag);
  r.ok(/Same as Delete and warnings/.test(await note('types.F')), 'failure sets follow the delete colour unless you pick one');
  await t.inSheet('[data-a="sheetClose"]', 600);
  r.ok(!Object.keys((await t.state()).settings.colors || {}).length && await rootVar('--accent') === '#0A84FF', 'Cancel leaves the colours as they were');

  await t.click('[data-a="openColors"]', 600);
  await t.inSheet('[data-a="preset"][data-i="1"]', 300);
  r.ok(await pv('--accent') === '#1D9BF0' && await pv('--bg') === '#15202B' && await pv('--panel') === '#192734' && await pv('--ink-2') === '#8B98A5', 'a ready-made look (X Dim) changes the page, cards, text and accent at once');
  await t.inSheet('.cslot[data-k="accent"] [data-a="pick"][data-v="#FFD60A"]', 200);
  await t.inSheet('[data-a="mode"][data-v="light"]', 300);
  r.ok(await pv('--accent') !== '#FFD60A', 'picking in dark mode leaves light mode alone', await pv('--accent'));
  await t.inSheet('[data-a="mode"][data-v="dark"]', 300);
  await section('types');
  await t.inSheet('.cslot[data-k="types.W"] [data-a="pick"][data-v="#BF5AF2"]', 200);
  await t.inSheet('[data-a="save"]', 700);
  const saved = (await t.state()).settings.colors;
  r.ok(saved.dark.accent === '#FFD60A' && saved.dark.good === '#00BA7C' && saved.dark.bg === '#15202B' && saved.dark.types.W === '#BF5AF2' && saved.light.accent === '#1D9BF0' && saved.light.bg === '#F7F9F9' && !(saved.light.types || {}).W && /saved/.test(await t.text('#toast')), 'Save keeps them: the look in both modes, and the changes made in dark mode in dark mode only', saved);
  r.ok(await rootVar('--accent') === '#FFD60A' && await rootVar('--bg') === '#15202B' && await rootVar('--panel') === '#192734', 'and the app takes them');
  await t.start();
  const look = await p.evaluate(() => { const f = getComputedStyle(document.querySelector('#workout [data-a="woFinish"]')), w = document.querySelector('#workout .badge.t-W'); return { btn: f.backgroundColor, text: f.color, page: getComputedStyle(document.querySelector('#workout')).backgroundColor, warm: w && getComputedStyle(w).borderTopColor }; });
  r.ok(hex(look.btn) === '#FFD60A' && contrast(hex(look.text), '#FFD60A') >= 4.5 && hex(look.page) === '#15202B', 'in a workout: the page in the new background, the Finish button in the new accent with dark text on it', look);
  r.ok(!look.warm || hex(look.warm) === '#BF5AF2', 'and a warm-up plate in its new colour', look.warm);
  await t.ev(`state.settings.theme = 'light'; applyTheme(); renderWorkout()`); await p.waitForTimeout(200);
  const la = await rootVar('--accent'), lb = await rootVar('--bg');
  r.ok(la !== '#FFD60A' && contrast(la, '#F7F9F9') >= 3 && lb === '#F7F9F9', 'in light mode: the look’s light background and its own accent, not the yellow picked for dark mode', { la, lb });
  // the end of a workout: always dark, in the dark-mode colours, and so are its cards
  await t.ev(`(() => { for (const x of A().ex) for (const s of x.sets) { s.done = true; s.w = s.w || 20; s.r = s.r || 8; } finishWorkout(); })()`);
  await p.waitForTimeout(1300);
  const fin = await p.evaluate(() => { const f = document.querySelector('.fin'); return f && { accent: getComputedStyle(f).getPropertyValue('--accent').trim().toUpperCase(), bg: getComputedStyle(f).getPropertyValue('--bg').trim().toUpperCase(), card: document.querySelector('.fin-card svg').outerHTML }; });
  r.ok(fin && fin.accent === '#FFD60A' && fin.bg === '#15202B' && fin.card.includes('#FFD60A') && fin.card.includes('#15202B'), 'the end screen and its cards use your colours too', fin && { accent: fin.accent, bg: fin.bg });
  await t.ev('closeAllSheets()'); await p.waitForTimeout(500);

  // Y2K: its own colours, its own editor; the Clean ones stay as they are
  await t.ev(`state.settings.theme = 'dark'; state.settings.style = 'y2k'; applyTheme(); render()`); await p.waitForTimeout(300);
  r.ok(await rootVar('--accent') === '#19F0FF' && await rootVar('--cobalt') === '#1F3BFF', 'Y2K starts from its own colours, not the Clean ones');
  await t.tab('settings');
  await t.click('[data-a="openColors"]', 600);
  r.ok(await p.evaluate(() => ['frame', 'accent', 'hot'].every(k => document.querySelector(`#sheets .sheet-wrap.in .cslot[data-k="${k}"]`))) && /Y2K style/.test(await t.text('#sheets .sheet-wrap.in .cstyle-note')), 'in Y2K the editor has its frame, accent and highlight colours, and says they’re the Y2K style’s');
  await t.inSheet('.cslot[data-k="frame"] [data-a="pick"][data-v="#FF3B3B"]', 200);
  r.ok(await pv('--cobalt') === '#FF3B3B' && await pv('--seg-on') === '#FF3B3B' && await pv('--panel') !== '#0A0F2E', 'the frame colour tints the preview’s borders and panels', { panel: await pv('--panel') });
  await t.inSheet('[data-a="preset"][data-i="1"]', 300);
  await t.inSheet('[data-a="save"]', 700);
  const st = await t.state();
  r.ok(st.settings.colorsY2k.dark.frame === '#B967FF' && st.settings.colorsY2k.light.accent === '#05FFA1' && st.settings.colors.dark.accent === '#FFD60A', 'saved as the Y2K colours; the Clean ones are kept', { y2k: st.settings.colorsY2k });
  const y = { cobalt: await rootVar('--cobalt'), cyan: await rootVar('--cyan'), accent: await rootVar('--accent'), good: await rootVar('--good'), right: await rootVar('--side-r'), bg: await rootVar('--bg') };
  r.ok(y.cobalt === '#B967FF' && y.cyan === '#05FFA1' && y.accent === '#05FFA1' && y.good === '#05FFA1' && y.right === '#FF71CE' && y.bg === '#120A1F', 'and Y2K takes them: the frame, the accent (done follows it), the highlight on the right side, the page', y);
  await t.ev(`state.settings.theme = 'light'; applyTheme()`); await p.waitForTimeout(200);
  const yl = { cobalt: await rootVar('--cobalt'), accent: await rootVar('--accent'), bg: await rootVar('--bg'), panel: await rootVar('--panel') };
  r.ok(yl.bg === '#EDE4F7' && contrast(yl.accent, yl.panel) >= 3 && contrast(yl.cobalt, yl.panel) >= 3 && yl.cobalt !== '#B967FF', 'Y2K in light mode: the look’s light page, the frame darkened to read on it', yl);
  await t.ev(`state.settings.style = 'clean'; applyTheme(); render()`); await p.waitForTimeout(200);
  r.ok(await rootVar('--bg') === '#F7F9F9', 'back in Clean, the Clean colours are there as they were');
  await t.ev(`state.settings.theme = 'dark'; applyTheme(); render()`); await p.waitForTimeout(200);
  await t.tab('settings');
  await t.click('[data-a="openColors"]', 600);
  await t.inSheet('[data-a="resetAll"]', 300); await t.inSheet('[data-a="save"]', 700);
  r.ok(!Object.keys((await t.state()).settings.colors || {}).length && await rootVar('--accent') === '#0A84FF' && await rootVar('--bg') === '#000000', '“All back to default” puts every colour back');
  // colours saved by an earlier version: the background moves to dark mode's, anything that isn't a colour is dropped
  const old = await t.ev(`migrate({ settings: { colors: { accent: '#ff0000', bg: '#101010', good: 'red', types: { D: '#00ff00', Q: '#000000' } } } }).settings`);
  r.ok(JSON.stringify(old.colors) === JSON.stringify({ dark: { accent: '#FF0000', bg: '#101010', types: { D: '#00FF00' } }, light: { accent: '#FF0000', types: { D: '#00FF00' } } }) && JSON.stringify(old.colorsY2k) === '{}', 'colours from an earlier version are kept, in their new places (shared ones in both modes)', old.colors);
  const v38 = await t.ev(`migrate({ settings: { colors: { accent: '#ff0000', dark: { bg: '#101010' }, light: { bg: '#eeeeee' } } } }).settings.colors`);
  r.ok(v38.dark.accent === '#FF0000' && v38.light.accent === '#FF0000' && v38.dark.bg === '#101010' && v38.light.bg === '#EEEEEE', 'and from v38: the accent goes to both modes, each background to its own', v38);
  await r.done(t);
})();
