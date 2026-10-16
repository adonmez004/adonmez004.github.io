// Assertion-based regressions; the fixture is also usable through a normal browser.
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, INSPECTOR } from "./lib/browser.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const fixtures = fileURLToPath(new URL("./review/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/late.css") {
    setTimeout(() => { res.setHeader("content-type", "text/css"); res.end("#target { border-width: 3px; border-style: solid; }"); }, 400);
    return;
  }
  const base = pathname.startsWith("/src/") ? repo : fixtures;
  const file = pathname === "/inspector.js" ? INSPECTOR : resolve(base, "." + pathname);
  if (pathname !== "/inspector.js" && !file.startsWith(base.endsWith(sep) ? base : base + sep)) { res.writeHead(404); res.end(); return; }
  try { res.setHeader("content-type", types[extname(file)] || "application/octet-stream"); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const name of ["review-tests", "core-tests", "resize-engine-tests"]) {
    await page.goto(`http://127.0.0.1:${server.address().port}/${name}.html`);
    await page.locator("#run").click();
    await page.waitForFunction(() => {
      try { const r = JSON.parse(document.querySelector("#results").textContent); return !Array.isArray(r) && typeof r.failed === "number"; }
      catch { return false; }
    }, null, { timeout: 120000 });
    const result = JSON.parse(await page.locator("#results").textContent());
    console.log(`${name}: ${result.passed} passed, ${result.failed} failed${result.skipped ? `, ${result.skipped} skipped` : ""}`);
    for (const t of result.tests.filter((t) => t.status === "SKIP")) console.log(`  SKIP ${t.name}: ${t.reason}`);
    assert.ok(result.tests.length > 0, `${name} must execute checks`);
    assert.equal(result.failed, 0, JSON.stringify(result.tests.filter((t) => t.status === "FAIL"), null, 2));
  }
  assert.deepEqual(errors, [], "No uncaught page errors");
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
