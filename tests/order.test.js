// the order of a workout's exercises (drag a handle, press and hold a row, or tap one and tap where it goes; from the
// strip, the list, the menus and a long press on the strip), and a workout from a template asking whether an exercise
// you add, remove, replace or move should change the template too
const { open, report } = require('./lib');
(async () => {
  const r = report('Order and template: move exercises around, and keep the template in step');
  const t = await open({ width: 393, height: 852, settings: { keypad: 'app', installHint: false } }), p = t.p;
  const order = () => t.ev('A().ex.map(x => x.exId)');
  const tpl = () => t.ev('tplById(A().tplId).ex.map(x => x.exId)');
  const rows = () => p.evaluate(() => [...document.querySelectorAll('.sheet-wrap.in .ord-row')].map(li => li.querySelector('.ord-txt b').textContent));
  const toastText = () => t.text('#toast.in');
  const toastAct = async () => { await p.evaluate(() => document.querySelector('#toast [data-a="toastAct"]').click()); await p.waitForTimeout(400); };
  // a finger, as touch events on the page (press, hold, move in steps, lift)
  const finger = (sel, i, dy, hold) => p.evaluate(async ([sel, i, dy, hold]) => {
    const el = document.querySelectorAll(sel)[i], b = el.getBoundingClientRect(), x = b.left + Math.min(120, b.width / 2), y = b.top + b.height / 2;
    const fire = (type, yy) => { const pt = new Touch({ identifier: 1, target: el, clientX: x, clientY: yy }); el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [pt], changedTouches: [pt] })); };
    const wait = ms => new Promise(res => setTimeout(res, ms));
    fire('touchstart', y); await wait(hold);
    for (let k = 1; k <= 8 && dy; k++) { fire('touchmove', y + dy * k / 8); await wait(25); }
    fire('touchend', y + dy);
  }, [sel, i, dy, hold]);

  await t.start(); await p.waitForTimeout(400);
  const o0 = await order(), t0 = await tpl();
  // the sheet
  await t.click('#workout .wo-nav [data-a="woOrder"]', 600);
  const first = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in'); return { n: s.querySelectorAll('.ord-row').length, now: s.querySelector('.ord-row em') && s.querySelector('.ord-row em').closest('.ord-row').querySelector('.ord-n').textContent, hint: s.querySelector('.ord-hint').textContent }; });
  r.ok(first.n === o0.length && first.now === '1' && /handle/.test(first.hint) && /tap where/.test(first.hint), 'Reorder (at the end of the strip) lists every exercise in order, marks the one you’re on, and says how', first);

  // a handle: the first row dragged past the third
  const grip = i => p.evaluate(i => { const b = document.querySelectorAll('.sheet-wrap.in .ord-row')[i].querySelector('[data-grip]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, i);
  const a = await grip(0), b = await grip(2);
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x, a.y + 15, { steps: 3 }); await p.mouse.move(b.x, b.y + 12, { steps: 8 });
  const mid = await p.evaluate(() => { const d = document.querySelector('.ord-row.drag'); return d && { n: d.querySelector('.ord-n').textContent, others: [...document.querySelectorAll('.ord-row:not(.drag)')].slice(0, 2).map(x => x.style.transform) }; });
  await p.mouse.up(); await p.waitForTimeout(600);
  const o1 = await order();
  r.ok(mid && mid.n === '3' && mid.others.every(x => /translateY\(-/.test(x)) && o1[2] === o0[0] && o1[0] === o0[1] && o1[1] === o0[2], 'dragging a row by its handle moves it; the rows it passes step aside and its number follows', { mid, o1: o1.slice(0, 4) });
  r.ok(await t.ev('A().ex[A().cur].exId') === o0[0], 'the exercise you’re on stays the one you’re on, wherever it goes', await t.ev('A().cur'));

  // a finger: press and hold a row, then move it up two places; a quick touch that moves at once doesn't pick it up
  await finger('.sheet-wrap.in .ord-main', 4, -150, 20); await p.waitForTimeout(500);
  const o1b = await order();
  await finger('.sheet-wrap.in .ord-main', 4, -125, 320); await p.waitForTimeout(700);
  const o2 = await order();
  r.ok(o1b.join() === o1.join() && o2[2] === o1[4] && o2.length === o1.length, 'press and hold a row to pick it up and drag it (a swipe that starts at once is left to scroll the list)', { o1: o1.slice(0, 5), o2: o2.slice(0, 5) });

  // tap one, then tap where it should go
  await p.evaluate(() => document.querySelectorAll('.sheet-wrap.in .ord-main')[0].click()); await p.waitForTimeout(300);
  const pk = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in'); return { hint: s.querySelector('.ord-hint').textContent, pressed: s.querySelector('.ord-main').getAttribute('aria-pressed'), there: s.querySelectorAll('.ord-main')[3].getAttribute('aria-label') }; });
  await p.evaluate(() => document.querySelectorAll('.sheet-wrap.in .ord-main')[3].click()); await p.waitForTimeout(500);
  const o3 = await order();
  r.ok(/Now tap where .+ should go/.test(pk.hint) && pk.pressed === 'true' && /^Put it here, at 4/.test(pk.there) && o3[3] === o2[0] && o3[0] === o2[1], 'or tap an exercise, then tap where it should go', { pk, o3: o3.slice(0, 5) });

  // closing: today's order can be the template's too, and that can be undone
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  const offer = await toastText();
  await toastAct();
  const t1 = await tpl();
  const said = await toastText();
  r.ok(/New order for today\./.test(offer || '') && /Keep it in the template/.test(offer) && t1.join() === o3.join() && /“Full Body” changed\./.test(said || ''), 'closing offers to keep the new order in the template, and it’s changed there and then', { offer, said });
  await toastAct();
  r.ok((await tpl()).join() === t0.join(), 'Undo puts the template’s order back');

  // a long press on the strip picks that exercise up
  await finger('#workout .nav-ex[data-i]', 1, 0, 620); await p.waitForTimeout(600);
  const lp = await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in.order'); return s && s.querySelector('.ord-row.picked .ord-n') && s.querySelector('.ord-row.picked .ord-n').textContent; });
  r.ok(lp === '2', 'a long press on an exercise in the strip opens it picked up, ready to place', lp);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);

  // the list view has it next to Add exercises, and each exercise's menu goes there with it picked
  await t.ev(`(() => { state.settings.view = 'list'; save(true); renderWorkout(true); })()`); await p.waitForTimeout(400);
  r.ok(await p.evaluate(() => !!document.querySelector('#workout .add-ex [data-a="woOrder"]') && !!document.querySelector('#workout .add-ex [data-a="woAddEx"]')), 'the list of every exercise has Reorder next to Add exercises');
  await t.ev('exMenu(2)'); await p.waitForTimeout(500); await t.menu('Move it in the order', 600);
  r.ok(await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in.order'); return !!s && s.querySelector('.ord-row.picked .ord-n').textContent === '3'; }), 'an exercise’s menu opens the order with that exercise picked up');
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  await t.ev(`(() => { state.settings.view = 'focus'; save(true); renderWorkout(true); })()`); await p.waitForTimeout(300);

  // removing an exercise asks about the template
  const gone = (await order())[1], goneName = await t.ev('getEx(A().ex[1].exId).name');
  await t.ev('exMenu(1)'); await p.waitForTimeout(500); await t.menu('Remove exercise', 600);
  const q1 = await t.sheetText();
  await t.inSheet('[data-a="ok"]', 600);
  const rm = { tpl: await tpl(), wo: await order(), toast: await toastText() };
  r.ok(/Remove from “Full Body” too\?/.test(q1) && q1.includes(goneName) && /Just today/.test(q1) && !rm.tpl.includes(gone) && !rm.wo.includes(gone) && rm.tpl.length === t0.length - 1 && /today and from “Full Body”/.test(rm.toast || ''), 'removing an exercise asks “Remove from the template too?”; yes takes it out of the template there and then', { q1, toast: rm.toast });
  await toastAct();
  r.ok((await tpl()).join() === t0.join() && (await order()).includes(gone), 'Undo brings it back, in the workout and in the template');
  await t.ev('exMenu(1)'); await p.waitForTimeout(500); await t.menu('Remove exercise', 600);
  await t.inSheet('[data-a="sheetClose"]', 600);
  r.ok((await tpl()).join() === t0.join() && !(await order()).includes(gone) && /^Removed .+\.Undo$/.test(await toastText() || ''), '“Just today” leaves the template as it was', await toastText());

  // adding asks too; the new one goes to the end of both
  await t.click('#workout .wo-nav [data-a="woAddEx"]', 700);
  const pick = await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet-wrap.in [data-a="tog"]')].find(x => x.dataset.id !== 'nope'); b.click(); return b.dataset.id; });
  await p.waitForTimeout(250); await t.inSheet('[data-a="done"]', 700);
  const q2 = await t.sheetText();
  await t.inSheet('[data-a="ok"]', 600);
  const ad = { tpl: await tpl(), wo: await order(), toast: await toastText() };
  r.ok(/Add to “Full Body” too\?/.test(q2) && ad.wo[ad.wo.length - 1] === pick && ad.tpl[ad.tpl.length - 1] === pick && ad.tpl.length === t0.length + 1 && /Added to “Full Body” too\./.test(ad.toast || ''), 'adding an exercise puts it last and asks “Add to the template too?”; yes adds it to the template there and then', { q2, toast: ad.toast });
  await toastAct();
  r.ok((await tpl()).join() === t0.join(), 'and Undo takes it back out of the template');
  // said no: the new exercise can be moved straight from the note
  await t.click('#workout .wo-nav [data-a="woAddEx"]', 700);
  await p.evaluate(() => document.querySelectorAll('.sheet-wrap.in [data-a="tog"]')[1].click()); await p.waitForTimeout(250); await t.inSheet('[data-a="done"]', 700);
  await t.inSheet('[data-a="sheetClose"]', 600);
  const mv = await toastText();
  await toastAct(); await p.waitForTimeout(300);
  r.ok(/Added at the end\.Move/.test(mv || '') && await p.evaluate(() => { const s = document.querySelector('.sheet-wrap.in.order'), rows = s && s.querySelectorAll('.ord-row'); return !!s && rows[rows.length - 1].classList.contains('picked'); }), 'said “Just today”: the note says it’s at the end, and Move opens the order with it picked up', mv);
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);

  // replacing one
  const oldId = (await order())[0];
  await t.ev('exMenu(0)'); await p.waitForTimeout(500); await t.menu('Replace exercise', 700);
  const neu = await p.evaluate(old => { const b = [...document.querySelectorAll('.sheet-wrap.in [data-a="tog"]')].find(x => x.dataset.id !== old); b.click(); return b.dataset.id; }, oldId);
  await p.waitForTimeout(700);
  const q3 = await t.sheetText();
  const at = (await tpl()).indexOf(oldId);
  await t.inSheet('[data-a="ok"]', 600);
  r.ok(/Use it in “Full Body” from now on\?/.test(q3) && (await tpl())[at] === neu && !(await tpl()).includes(oldId), 'replacing an exercise asks whether the template should use the new one from now on', q3);

  // the question can be turned off, and a workout that isn't from a template never asks
  await t.ev(`(() => { state.settings.tplAsk = false; save(true); })()`);
  const before = await tpl();
  await t.ev('exMenu(1)'); await p.waitForTimeout(500); await t.menu('Remove exercise', 600);
  r.ok(!(await p.evaluate(() => document.querySelector('.sheet-wrap.in'))) && (await tpl()).join() === before.join(), 'with “Ask to change the template” off in Settings, nothing is asked and the template stays');
  await r.done(t);
})();
