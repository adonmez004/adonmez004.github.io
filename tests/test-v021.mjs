// Native keyboard/pointer regression coverage for the v0.2.1 fixes.
import assert from 'node:assert/strict';
import { launch, openBox, shadow, INSPECTOR } from './lib/browser.mjs';
import { featureServer } from './lib/feature-server.mjs';
import { check } from './lib/check.mjs';
import { v021 } from './lib/v021-expectations.mjs';

const server = await featureServer(INSPECTOR);
let browser;
try {
  browser = await launch();
  const errors = [], page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/site/index.html`);
  const host = page.locator('fm-inspector');
  const state = () => shadow(page, (sh, i) => ({
    open: i.hasAttribute('open'), armed: i.lens.armed,
    editing: !!sh.querySelector('#view-css input.v, #view-css .d input[type=text]'),
    focusInBox: !!sh.activeElement && !!sh.activeElement.closest('#panel'),
    valueFocused: !!sh.activeElement?.matches('.v'),
    padding: getComputedStyle(document.querySelector('.card')).paddingTop,
  }));
  await openBox(page, host, 'css', { all: false, at: '.card' });
  await page.keyboard.press('Escape');
  await check('Escape disarms lens and keeps CSS box open', state, v021.lens);
  const value = host.locator('#view-css .d', { hasText: /^padding: 10px/ }).first().locator('.v');
  await value.click(); await page.keyboard.press('ArrowUp');
  await check('ArrowUp edits focused padding value', state, v021.edit);
  await page.keyboard.press('Escape');
  await check('Cancelled edit restores padding and focus to the new value row', state, v021.cancel);
  await page.keyboard.press('Escape');
  await check('Next Escape closes the CSS box', state, v021.closed);

  const at = async () => { const r = await host.locator('#panel').boundingBox(); assert.ok(r, 'Panel visible'); return [r.x, r.y]; };
  const drag = async () => {
    const r = await host.locator('#panel .head').boundingBox(); assert.ok(r, 'Head visible');
    const x = r.x + r.width / 2, y = r.y + 10;
    await page.mouse.move(x, y); await page.mouse.down();
    try { await page.mouse.move(x - 400, y - 240, { steps: 10 }); } // inside the viewport: headless Firefox sends no pointerup for a release outside it
    finally { await page.mouse.up(); }
  };
  await openBox(page, host, 'css', { all: true, at: '.card' });
  await host.evaluate(i => i.moveTo(560, 420));
  const start = await at();
  assert.equal(await host.evaluate(i => i.lens.armed), 'css', 'Lens must be armed for the first drag');
  await drag();
  const armedEnd = await at();
  assert.ok(armedEnd[0] < start[0] - 200 && armedEnd[1] < start[1] - 200, `Armed drag must travel, not pass because both positions stayed still: ${JSON.stringify({start, armedEnd})}`);
  await host.evaluate(i => i.moveTo(560, 420));
  await page.keyboard.press('Escape');
  assert.equal(await host.evaluate(i => i.lens.armed), null, 'Lens off for the comparison');
  await drag();
  await check('Armed and unarmed drags reach the same position', async () => ({ start, armedEnd, plainEnd: await at() }), v021.drag);
  await page.keyboard.press('Escape');

  await page.addStyleTag({ content: '.btn { max-width: 60px !important; }' });
  await host.locator('.sizebtn').click();
  const point = await page.locator('.btn').boundingBox(); assert.ok(point);
  await page.mouse.click(point.x + 3, point.y + 3);
  await host.evaluate(i => i.moveTo(8, 8));
  await check('New important limit is present in the CSS model', () => host.evaluate(i => i.store.allDecls.some(d => d.prop === 'max-width' && d.value === '60px' && d.important && d.on)), ready => assert.equal(ready, true));
  const h = await host.locator('.hd').boundingBox(); assert.ok(h, 'Resize handle visible');
  const x = h.x + h.width / 2, y = h.y + h.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  try { await page.mouse.move(x + 200, y, { steps: 4 }); }
  finally { await page.mouse.up(); }
  await check('Holding declaration includes important exactly once in its label', () => shadow(page, sh => {
    const w = sh.querySelector('.wblock');
    return { note: w?.querySelector('.hnote')?.textContent, label: w?.querySelector('.hdecl')?.textContent.replace(/\s+/g, ' ').trim(), bang: w?.querySelector('.hdecl .x')?.textContent };
  }), v021.hold);
  await check('Overlay dimensions agree with the actual resized element', () => shadow(page, sh => {
    const r = document.querySelector('.btn').getBoundingClientRect();
    return { width: r.width, height: r.height, lines: [sh.querySelectorAll('.ov .dim-width').length, sh.querySelectorAll('.ov .dim-height').length], labels: [...sh.querySelectorAll('.ov .lb.sz')].map(n => n.textContent.trim()), now: sh.querySelector('.wnow')?.textContent || '' };
  }), v021.overlay);
  assert.deepEqual(errors, [], 'No uncaught page errors');
  console.log('v021: native Escape, drag, hold and overlay checks passed');
} finally {
  try { await browser?.close(); } finally { await server.close(); }
}
