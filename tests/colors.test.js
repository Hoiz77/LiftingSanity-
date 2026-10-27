// your own colours: Settings → Colours with a live preview (dark and light), swatches, the colour wheel and hex codes, and
// ready-made sets; saved, they colour the app (darkened just enough in light mode), the end screen and its cards; Cancel
// and "All back to default"; Y2K keeps its own colours
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

  await t.tab('settings');
  r.ok(await p.evaluate(() => { const b = document.querySelector('[data-a="openColors"]'); return !!b && /Colours/.test(b.closest('.set-item').textContent) && b.querySelectorAll('.cdots i').length === 5; }), 'Settings → Look has Colours, with the colours in use on its button');
  await t.click('[data-a="openColors"]', 600);
  const before = await pv('--accent');
  await t.inSheet('.cslot[data-k="accent"] [data-a="pick"][data-v="#FF375F"]', 200);
  r.ok(before === '#0A84FF' && await pv('--accent') === '#FF375F', 'a swatch shows in the preview straight away', { before });
  r.ok(await rootVar('--accent') === '#0A84FF', 'and nothing in the app changes before Save');
  await p.evaluate(() => { const i = document.querySelector('.cslot[data-k="good"] input[type="color"]'); i.value = '#ffcc00'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(150);
  const onGood = await pv('--on-good');
  r.ok(await pv('--good') === '#FFCC00' && contrast(onGood, '#FFCC00') >= 4.5 && await p.evaluate(() => document.querySelector('.cslot[data-k="good"] .chex').value) === '#FFCC00', 'the colour wheel takes any colour, a light one gets dark text on it, and its hex code follows', { onGood });
  await p.fill('.cslot[data-k="left"] .chex', '0f0'); await p.waitForTimeout(150);
  r.ok(await pv('--side-l') === '#00FF00' && await p.evaluate(() => !document.querySelector('.cslot[data-k="left"] .cslot-reset').hidden), 'a hex code works too (short ones like 0f0 included), and the colour gets a Default button');
  await t.inSheet('[data-a="mode"][data-v="light"]', 300);
  const lg = await pv('--good');
  r.ok(await pv('--bg') === '#F2F2F7' && lg !== '#FFCC00' && contrast(lg, '#FFFFFF') >= 2.6 && /In light mode/.test(await note('good')), 'the light preview: the page is light, and the yellow is darkened just enough to read on white (and says so)', { lg });
  await t.inSheet('[data-a="mode"][data-v="dark"]', 300);
  await t.inSheet('.cslot[data-k="bg"] [data-a="pick"][data-v="#0A1020"]', 200);
  r.ok(await pv('--bg') === '#0A1020' && await pv('--panel') !== '#121214', 'a dark background colours the page, with the cards a shade lighter');
  await p.fill('.cslot[data-k="bg"] .chex', '#8090A0'); await p.waitForTimeout(150);
  r.ok(lum(await pv('--bg')) <= 0.04 && /darker/.test(await note('bg')), 'a background too light for dark mode is kept dark, and it says so', await pv('--bg'));
  await t.inSheet('[data-a="sheetClose"]', 600);
  r.ok(!Object.keys((await t.state()).settings.colors || {}).length && await rootVar('--accent') === '#0A84FF', 'Cancel leaves the colours as they were');

  await t.click('[data-a="openColors"]', 600);
  await t.inSheet('[data-a="preset"][data-i="2"]', 300);
  r.ok(await pv('--accent') === '#FF375F' && await pv('--good') === '#FF9F0A' && await pv('--bg') === '#0B0B10', 'a ready-made set changes several colours at once');
  await t.inSheet('.cslot[data-k="accent"] [data-a="pick"][data-v="#FFD60A"]', 200);
  await t.inSheet('[data-a="save"]', 700);
  const saved = (await t.state()).settings.colors;
  r.ok(saved.accent === '#FFD60A' && saved.good === '#FF9F0A' && saved.bg === '#0B0B10' && /saved/.test(await t.text('#toast')), 'Save keeps them', saved);
  r.ok(await rootVar('--accent') === '#FFD60A' && await rootVar('--bg') === '#0B0B10', 'and the app takes them');
  await t.start();
  const look = await p.evaluate(() => { const f = getComputedStyle(document.querySelector('#workout [data-a="woFinish"]')); return { btn: f.backgroundColor, text: f.color, page: getComputedStyle(document.querySelector('#workout')).backgroundColor }; });
  r.ok(hex(look.btn) === '#FFD60A' && contrast(hex(look.text), '#FFD60A') >= 4.5, 'in a workout the Finish button is in the new accent, with dark text on it', look);
  await t.ev(`state.settings.theme = 'light'; applyTheme(); renderWorkout()`); await p.waitForTimeout(200);
  const la = await rootVar('--accent'), lb = await rootVar('--bg');
  r.ok(la !== '#FFD60A' && contrast(la, '#FFFFFF') >= 3 && lb === '#F2F2F7', 'in light mode the accent is darkened to read on white, and the background stays light', { la, lb });
  // the end of a workout: always dark, in the dark-mode colours, and so are its cards
  await t.ev(`(() => { for (const x of A().ex) for (const s of x.sets) { s.done = true; s.w = s.w || 20; s.r = s.r || 8; } finishWorkout(); })()`);
  await p.waitForTimeout(1300);
  const fin = await p.evaluate(() => { const f = document.querySelector('.fin'); return f && { accent: getComputedStyle(f).getPropertyValue('--accent').trim().toUpperCase(), bg: getComputedStyle(f).getPropertyValue('--bg').trim().toUpperCase(), card: document.querySelector('.fin-card svg').outerHTML }; });
  r.ok(fin && fin.accent === '#FFD60A' && fin.bg === '#0B0B10' && fin.card.includes('#FFD60A') && fin.card.includes('#0B0B10'), 'the end screen and its cards use your colours too', fin && { accent: fin.accent, bg: fin.bg });
  await t.ev('closeAllSheets()'); await p.waitForTimeout(500);
  await t.ev(`state.settings.theme = 'dark'; state.settings.style = 'y2k'; applyTheme()`); await p.waitForTimeout(200);
  r.ok(await rootVar('--accent') === '#19F0FF', 'Y2K keeps its own colours');
  await t.ev(`state.settings.style = 'clean'; applyTheme(); render()`); await p.waitForTimeout(200);
  await t.tab('settings');
  await t.click('[data-a="openColors"]', 600);
  await t.inSheet('[data-a="resetAll"]', 300); await t.inSheet('[data-a="save"]', 700);
  r.ok(!Object.keys((await t.state()).settings.colors || {}).length && await rootVar('--accent') === '#0A84FF' && await rootVar('--bg') === '#000000', '“All back to default” puts every colour back');
  await r.done(t);
})();
