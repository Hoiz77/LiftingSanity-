// the iPhone Home Screen app when iOS leaves the page shorter than the screen (after the keyboard has been up, or by
// the status bar's height):
// the workout, tab bar, sheets and number pad still reach the bottom edge, the floating bars move down with it, and
// nothing changes in a browser tab, in an iPad window beside another app, or once the page is full height again
const { open, report } = require('./lib');
// pretend to be a Home Screen app on an 852pt-tall phone screen
const IPHONE = ([w, h]) => { Object.defineProperty(navigator, 'standalone', { get: () => true }); Object.defineProperty(screen, 'width', { get: () => w }); Object.defineProperty(screen, 'height', { get: () => h }); };
const box = (p, sel) => p.evaluate(s => { const el = document.querySelector(s); if (!el || el.hidden) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }, sel);
const fix = p => p.evaluate(() => ({ on: document.documentElement.classList.contains('vfix'), gap: document.documentElement.style.getPropertyValue('--vgap') }));
(async () => {
  const r = report('Full screen: nothing stops short of the bottom edge'), pages = [];

  for (const style of ['y2k', 'clean']) {
    const t = await open({ width: 393, height: 808, settings: { style } });
    await t.p.addInitScript(IPHONE, [393, 852]);
    await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(800);
    const f = await fix(t.p);
    r.ok(f.on && f.gap === '44px', `${style}: a page 44pt short of the screen is noticed`, JSON.stringify(f));
    const tabs = await box(t.p, '#tabs');
    r.ok(tabs && tabs.bottom === 852, `${style}: the tab bar reaches the bottom edge`, JSON.stringify(tabs));
    await t.start();
    await t.ev('startRest(90)'); await t.p.waitForTimeout(600);
    const wo = await box(t.p, '#workout'), main = await box(t.p, '#workout .wo-main'), rest = await box(t.p, '#restbar');
    r.ok(wo && wo.bottom === 852 && main && main.bottom === 852, `${style}: the workout and its scrolling part reach the bottom edge`, JSON.stringify({ wo, main }));
    r.ok(rest && rest.bottom === 852 - 12, `${style}: the rest bar keeps its usual distance from the real bottom`, JSON.stringify(rest));
    // scroll positions survive the moment the page is taken out of layout
    await t.p.evaluate(() => { document.querySelector('#workout .wo-main').scrollTop = 120; });
    const before = await t.p.evaluate(() => document.querySelector('#workout .wo-main').scrollTop);
    await t.ev('fitTried = 0; fitScreen()');
    const after = await t.p.evaluate(() => document.querySelector('#workout .wo-main').scrollTop);
    r.ok(before > 0 && after === before, `${style}: measuring again keeps the workout where it was scrolled`, `${before} → ${after}`);
    // the number pad and a sheet sit on the real bottom too
    await t.click('#workout .cell[data-a="kp"]', 600);
    const kp = await box(t.p, '#keypad');
    r.ok(kp && kp.bottom === 852, `${style}: the number pad reaches the bottom edge`, JSON.stringify(kp));
    await t.ev('kpClose()'); await t.p.waitForTimeout(400);
    await t.click('[data-a="woMenu"]', 600).catch(() => {});
    const sh = await t.p.evaluate(() => { const w = [...document.querySelectorAll('#sheets .sheet-wrap.in')].pop(); const s = w && w.querySelector('.sheet'); return s ? Math.round(s.getBoundingClientRect().bottom) : null; });
    if (sh != null) r.ok(sh === 852, `${style}: a sheet reaches the bottom edge`, String(sh));
    // the page comes back to full height: back to normal
    await t.p.setViewportSize({ width: 393, height: 852 }); await t.p.waitForTimeout(500);
    const g = await fix(t.p);
    r.ok(!g.on && g.gap === '0px', `${style}: once the page is full height again nothing is moved`, JSON.stringify(g));
    pages.push(t);
    await t.ctx.close();
  }

  // short by the status bar's height (59pt), on a phone that says it's a Home Screen app only through display-mode
  {
    const t = await open({ width: 393, height: 793, settings: { style: 'y2k' } });
    await t.p.addInitScript(([w, h]) => {
      Object.defineProperty(screen, 'width', { get: () => w }); Object.defineProperty(screen, 'height', { get: () => h });
      const mm = window.matchMedia.bind(window);
      window.matchMedia = q => /display-mode: standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q);
    }, [393, 852]);
    await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(800);
    const f = await fix(t.p);
    r.ok(f.on && f.gap === '59px', 'a page short by the status bar’s height is noticed, with display-mode as the only sign of a Home Screen app', JSON.stringify(f));
    await t.start(); await t.p.waitForTimeout(400);
    const wo = await box(t.p, '#workout');
    r.ok(wo && wo.bottom === 852, 'and the workout reaches the bottom edge', JSON.stringify(wo));
    await t.click('[data-a="woMin"]', 600); await t.tab('settings');
    const line = await t.text('#fitInfo');
    r.ok(/screen 393×852/.test(line) && /page 393×793/.test(line) && /Home Screen app/.test(line) && /filled 59/.test(line), 'the bottom of Settings says what the screen check found', line);
    const sw = require('fs').readFileSync(require('path').join(__dirname, '..', 'sw.js'), 'utf8').match(/liftingsanity-v(\d+)/)[1];
    r.ok(line.startsWith(`v${sw} `), 'the version shown is the offline cache’s version', { line, sw });
    pages.push(t);
    await t.ctx.close();
  }

  // the Home Screen app: an open workout is placed as part of the page over a page held still, so iOS draws it all
  // the way down, and dragging the rest timer can't bounce the page
  {
    const t = await open({ width: 393, height: 852 });
    await t.p.addInitScript(IPHONE, [393, 852]);
    await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(600);
    await t.tab('settings'); await t.click('[data-a="demoOn"]', 600); await t.tab('history');
    await t.p.evaluate(() => window.scrollTo(0, 600)); await t.p.waitForTimeout(200);
    const y0 = await t.p.evaluate(() => window.scrollY);
    await t.tab('train'); await t.p.evaluate(() => window.scrollTo(0, 400)); await t.p.waitForTimeout(200);
    const y1 = await t.p.evaluate(() => window.scrollY);
    await t.p.evaluate(() => document.querySelector('[data-a="startDay"]').click()); await t.p.waitForTimeout(900);
    const w = await t.p.evaluate(() => { const el = document.getElementById('workout'), r = el.getBoundingClientRect(); return { cls: document.documentElement.className, pos: getComputedStyle(el).position, top: Math.round(r.top), h: Math.round(r.height), y: window.scrollY }; });
    r.ok(/ios-app/.test(w.cls) && /wo-lock/.test(w.cls) && w.pos === 'absolute' && w.top === 0 && w.h === 852, 'in the Home Screen app the open workout is part of the page and covers the screen exactly', w);
    await t.p.mouse.move(200, 300); await t.p.mouse.wheel(0, 500); await t.p.waitForTimeout(300);
    r.ok(await t.p.evaluate(y => window.scrollY === y, w.y), 'the page behind can’t be scrolled while the workout is open');
    await t.ev('startRest(60)'); await t.p.waitForTimeout(500);
    r.ok(await t.p.evaluate(() => getComputedStyle(document.getElementById('restbar')).touchAction === 'none' && getComputedStyle(document.querySelector('#workout .wo-h')).touchAction === 'none'), 'dragging the rest timer or the header doesn’t move the page');
    await t.click('[data-a="woMin"]', 900);
    const after = await t.p.evaluate(() => ({ cls: document.documentElement.className, y: window.scrollY }));
    r.ok(!/wo-lock/.test(after.cls) && Math.abs(after.y - w.y) < 2 && y0 > 0 && y1 >= 0, 'closing it leaves the page where it was, free to scroll again', { after, w, y1 });
    pages.push(t);
    await t.ctx.close();
  }

  // while typing (the keyboard may be up) nothing is moved; it comes back after
  {
    const t = await open({ width: 393, height: 808 });
    await t.p.addInitScript(IPHONE, [393, 852]);
    await t.p.reload(); await t.p.waitForFunction(() => window.LiftingSanity); await t.p.waitForTimeout(800);
    await t.p.evaluate(() => { const i = document.createElement('textarea'); i.id = 'tmpType'; document.body.append(i); i.focus(); });
    await t.ev('fitScreen()');
    r.ok(!(await fix(t.p)).on, 'nothing is moved while a text box has the keyboard');
    await t.p.evaluate(() => document.getElementById('tmpType').blur()); await t.p.waitForTimeout(800);
    r.ok((await fix(t.p)).on, 'after typing, a short page is put right again');
    pages.push(t);
    await t.ctx.close();
  }

  // a browser tab, and an iPad window beside another app, are left alone
  {
    const t = await open({ width: 393, height: 760 });
    await t.p.waitForTimeout(700);
    r.ok(!(await fix(t.p)).on, 'in a browser tab nothing is moved');
    await t.ctx.close();
    const ipad = await open({ width: 694, height: 1300 });
    await ipad.p.addInitScript(IPHONE, [1024, 1366]);
    await ipad.p.reload(); await ipad.p.waitForFunction(() => window.LiftingSanity); await ipad.p.waitForTimeout(800);
    r.ok(!(await fix(ipad.p)).on, 'an iPad window narrower than the screen is left alone');
    await ipad.ctx.close();
  }
  await r.done(...pages);
})();
