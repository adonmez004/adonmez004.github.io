import assert from 'node:assert/strict';
import { launch, openBox, shadow, INSPECTOR } from './browser.mjs';
import { check } from './check.mjs';
import { featureServer } from './feature-server.mjs';

export async function runFeature(name, scenario) {
  const server = await featureServer(INSPECTOR);
  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${server.url}/features/${name}.html`);
    const host = page.locator('fm-inspector');
    await host.waitFor({ state: "attached" });
    let count = 0;
    await scenario({
      open: selector => openBox(page, host, 'css', { all: false, at: selector }),
      click: async (selector, text, first) => {
        let loc = host.locator(`#view-css ${selector}`);
        // Detail switches are outside #view-css.
        if (/^\.v(initials|render|limits)$/.test(selector)) loc = host.locator(selector);
        if (text !== undefined) loc = loc.filter({ hasText: new RegExp(`^${text}$`) });
        if (first) loc = loc.first();
        await loc.click();
      },
      replaceAuthorCSS: css => page.evaluate(text => { document.head.querySelector('style').textContent = text; }, css),
      read: fn => shadow(page, fn),
      check: async (...args) => { await check(...args); count++; },
    });
    assert.ok(count > 0, 'The scenario must execute checks');
    assert.deepEqual(errors, [], 'No uncaught page errors');
    console.log(`${name}: ${count} checkpoints passed`);
  } finally {
    try { await browser?.close(); } finally { await server.close(); }
  }
}
