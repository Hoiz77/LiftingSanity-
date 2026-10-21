// screen transitions: the workout grows out of its bar and shrinks back, tabs crossfade, sheets slide and can be
// pulled down, the exercise card follows a finger. Checked mid-animation and once settled, with fast repeated taps
const { open, report } = require('./lib');
(async () => {
  const r = report('Screen transitions');
  const pages = [];
  for (const style of ['clean', 'y2k']) {
    const t = await open({ settings: { style, view: 'focus' } }); pages.push(t);
    const p = t.p, T = style + ': ';
    const cdp = await t.ctx.newCDPSession(p);
    const touch = async (pts, gap = 16) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
      for (const [x, y] of pts.slice(1)) { await p.waitForTimeout(gap); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const st = () => p.evaluate(() => ({
      hidden: document.querySelector('#workout').hidden, moving: getComputedStyle(document.querySelector('#workout')).transform !== 'none',
      scrim: !!document.querySelector('#woScrim'), open: document.body.classList.contains('wo-open'), mini: !document.querySelector('#mini').hidden,
      ghosts: document.querySelectorAll('.view-ghost,.card-ghost').length, sheets: document.querySelectorAll('#sheets .sheet-wrap').length,
      pageVisible: getComputedStyle(document.querySelector('#view')).visibility === 'visible'
    }));
    await t.tab('train');
    await p.tap('[data-a="startDay"]'); await p.waitForTimeout(110);
    let s = await st();
    r.ok(!s.hidden && s.moving && s.scrim && s.pageVisible, T + 'starting: the workout rises over the page');
    await p.waitForTimeout(650); s = await st();
    r.ok(!s.moving && !s.scrim && s.open && !s.pageVisible, T + 'starting: settles open', s);
    await p.tap('[data-a="woMin"]'); await p.waitForTimeout(140); s = await st();
    r.ok(!s.hidden && s.moving && s.mini && s.pageVisible, T + 'minimizing: shrinks onto the bar, the page shows under it', s);
    await p.waitForTimeout(700); s = await st();
    r.ok(s.hidden && s.mini && !s.scrim && !s.open, T + 'minimizing: settles on the bar', s);
    await p.tap('#mini [data-a="resume"]'); await p.waitForTimeout(120); s = await st();
    r.ok(!s.hidden && s.moving && !s.mini, T + 'resuming: grows out of the bar', s);
    await p.waitForTimeout(650);
    // fast taps never leave things half-way
    for (const a of ['[data-a="woMin"]', '#mini [data-a="resume"]', '[data-a="woMin"]']) { await p.evaluate(sel => document.querySelector(sel).click(), a); await p.waitForTimeout(30); }
    await p.waitForTimeout(800); s = await st();
    r.ok(s.hidden && s.mini && !s.scrim && !s.open, T + 'minimize, resume, minimize in quick succession ends on the bar', s);
    await p.tap('#mini [data-a="resume"]'); await p.waitForTimeout(750);
    // the card follows a finger
    const cur0 = await t.ev('A().cur');
    const box = await p.evaluate(() => { const r = document.querySelector('#workout .wo-main > .exc').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 80 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    for (let k = 1; k <= 8; k++) { await p.waitForTimeout(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x - k * 20, y: box.y + k }] }); }
    const follow = await p.evaluate(() => document.querySelector('#workout .wo-main > .exc').style.transform);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(700);
    r.ok(/translateX\(-1\d\d/.test(follow) && await t.ev('A().cur') === cur0 + 1 && (await st()).ghosts === 0, T + 'the exercise card follows a finger and goes to the next one', { follow });
    await touch([[box.x, box.y], [box.x - 15, box.y], [box.x - 30, box.y], [box.x - 45, box.y]], 60);
    await p.waitForTimeout(500);
    r.ok(await t.ev('A().cur') === cur0 + 1 && !(await p.evaluate(() => document.querySelector('#workout .wo-main > .exc').style.transform)), T + 'a short, slow drag settles back');
    await touch([[box.x, box.y + 200], [box.x + 2, box.y + 150], [box.x + 3, box.y + 100], [box.x + 4, box.y + 40]]);
    await p.waitForTimeout(400);
    r.ok(await t.ev('A().cur') === cur0 + 1, T + 'scrolling up and down doesn’t move the card');
    // while the workout slides away, nothing in it can be tapped or typed into
    await t.ev('state.active.ex[0].sets.find(s => s.t !== "W").done = true');
    await p.evaluate(() => document.querySelector('[data-a="woMin"]').click()); await p.waitForTimeout(60);
    await p.evaluate(() => { for (const el of document.querySelectorAll('#workout [data-a]')) el.click(); for (const el of document.querySelectorAll('#workout input')) { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); } });
    await p.waitForTimeout(800);
    r.ok((await st()).hidden && (await st()).sheets === 0, T + 'a screen on its way out ignores taps and typing');
    // tabs: the old page fades while the new one comes in; the highlight glides to the new tab
    await t.tab('train');
    await p.tap('[data-a="tab"][data-tab="progress"]'); await p.waitForTimeout(90);
    r.ok((await st()).ghosts === 1, T + 'switching tabs: the old page fades out over the new one');
    let wide = 0;
    for (let k = 0; k < 8; k++) { wide = Math.max(wide, await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)); await p.waitForTimeout(40); }
    await p.waitForTimeout(500);
    const pill = await p.evaluate(() => { const a = document.querySelector('.tab-pill').getBoundingClientRect(), b = document.querySelector('.tab.on .i').getBoundingClientRect(); return Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1; });
    r.ok((await st()).ghosts === 0 && pill && wide <= 0, T + 'switching tabs: settles with the highlight on the new tab, the page never wider than the screen', { pill, wide });
    for (const tb of ['history', 'library', 'settings', 'train', 'progress', 'history']) { await p.evaluate(x => document.querySelector(`[data-a="tab"][data-tab="${x}"]`).click(), tb); await p.waitForTimeout(25); }
    await p.waitForTimeout(700);
    r.ok((await st()).ghosts === 0 && await p.evaluate(() => document.body.dataset.tab === 'history' && getComputedStyle(document.querySelector('#view')).opacity === '1'), T + 'tapping through tabs quickly ends on one clean page');
    // sheets
    await t.tab('library');
    await p.tap('#view .ex-row'); await p.waitForTimeout(650);
    const head = await p.evaluate(() => { const r = document.querySelector('#sheets .sheet-h').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await touch([[head.x, head.y], ...Array.from({ length: 10 }, (_, k) => [head.x, head.y + (k + 1) * 22])]);
    await p.waitForTimeout(80);
    const closing = (await st()).sheets;
    await p.waitForTimeout(650);
    r.ok(closing === 1 && (await st()).sheets === 0, T + 'pulling a sheet down closes it: it slides away first, then goes');
    await p.tap('#view .ex-row'); await p.waitForTimeout(650);
    await touch([[head.x, head.y], [head.x, head.y + 20], [head.x, head.y + 40]], 80);
    await p.waitForTimeout(600);
    r.ok((await st()).sheets === 1, T + 'a small pull lets the sheet settle back');
    await p.evaluate(() => { document.querySelector('#sheets .sheet-body').scrollTop = 300; });
    const body = await p.evaluate(() => { const r = document.querySelector('#sheets .sheet-body').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 200 }; });
    await touch([[body.x, body.y], [body.x, body.y + 40], [body.x, body.y + 120], [body.x, body.y + 200]]);
    await p.waitForTimeout(600);
    r.ok((await st()).sheets === 1, T + 'pulling down inside scrolled content scrolls instead of closing');
  }
  // with Reduce Motion: quick fades, the same end states
  const m = await open({ reducedMotion: 'reduce' }); pages.push(m);
  await m.start(); await m.click('[data-a="woMin"]', 400); await m.tab('history');
  const e = await m.p.evaluate(() => ({ hidden: document.querySelector('#workout').hidden, mini: !document.querySelector('#mini').hidden, extra: document.querySelectorAll('.view-ghost,.card-ghost,#woScrim').length }));
  r.ok(e.hidden && e.mini && !e.extra, 'Reduce Motion: things fade quickly and end in the same place', e);
  await r.done(...pages);
})();
