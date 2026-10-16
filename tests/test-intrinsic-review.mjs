import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { launch, INSPECTOR, BROWSER } from './lib/browser.mjs';
import { featureServer } from './lib/feature-server.mjs';

const server = await featureServer(INSPECTOR);
let browser;
try {
  browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/features/intrinsic-review.html`);
  const userAgent = await page.evaluate(() => navigator.userAgent);
  await page.locator('#run').click();
  await page.waitForFunction(() => {
    try { const r = JSON.parse(document.querySelector('#results').textContent); return typeof r.failed === 'number'; }
    catch { return false; }
  }, null, { timeout: 120000 });
  const result = JSON.parse(await page.locator('#results').textContent());
  const full = { engine: BROWSER, browserVersion: browser.version(), userAgent, errors, ...result };
  writeFileSync('intrinsic-review.json', JSON.stringify(full, null, 2) + '\n');
  console.log(`${BROWSER} ${browser.version()}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);
  for (const test of result.tests.filter(t => t.status !== 'PASS')) console.log(`${test.status} ${test.name}: ${test.error || test.reason}`);
  assert.ok(result.passed > 0, 'Some intrinsic checks must run');
  assert.equal(result.failed, 0, JSON.stringify(result.tests.filter(t => t.status === 'FAIL'), null, 2));
  assert.deepEqual(errors, [], 'No uncaught page errors');
} finally {
  try { await browser?.close(); } finally { await server.close(); }
}
