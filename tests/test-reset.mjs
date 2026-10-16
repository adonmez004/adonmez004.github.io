// Clear all (the rail's eraser, v0.2: it also closes the box and forgets the lens scopes): a page rule unticked under Show All, an edited value under a scope, an untick carried to another scope, and a tool armed; each time the page's CSS comes back
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname);
const qrSrv = http.createServer((q, r) => { const f = path.join(QR, q.url.split("?")[0] === "/" ? "index.html" : q.url.split("?")[0]); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const QR_URL = `http://127.0.0.1:${qrSrv.address().port}/`;
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(QR_URL, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const scopeTo = async (which, sel, dx = 24, dy = 8) => { // like openBox without Show All, clicking further in: the card's rounded corner would hand a 2px click to main
  const armed = await page.evaluate((w) => document.querySelector("fm-inspector").lens?.armed === w, which);
  if (!armed) { await host.locator(which === "css" ? ".cssbtn" : ".htmlbtn").click(); await page.waitForTimeout(150); }
  const [x, y] = await page.evaluate(([s, dx, dy]) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + dx, r.top + dy]; }, [sel, dx, dy]);
  await page.mouse.click(x, y); await page.waitForTimeout(400);
};
const pad = () => page.evaluate(() => getComputedStyle(document.querySelector("main div")).paddingLeft);
const radius = () => page.evaluate(() => getComputedStyle(document.querySelector("main div")).borderRadius);
const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const box = () => page.evaluate(() => { const h = document.querySelector("fm-inspector"); return { open: h.hasAttribute("open"), scope: h.lens.scope.css?.localName || null, sizing: h.hasAttribute("sizing") }; });
const rawClick = async (loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150); };
// 1. Show All (no scope): untick body background, raw-click Clear all
await openBox(page, host, "css");
console.log("reset visible:", await host.locator(".reset").isVisible());
await rawClick(host.locator("#view-css .d", { hasText: "background-color: #D5E1EF" }).first().locator("input"));
console.log("1 body bg after untick:", await bodyBg());
await rawClick(host.locator(".reset"));
console.log("1 body bg after reset:", await bodyBg(), "box:", JSON.stringify(await box()), "(expect closed, no scope)");
// 2. the div's own rules: edit border-radius by typing, Clear all
await scopeTo("css", "main div");
await host.locator("#view-css .d", { hasText: "border-radius" }).first().locator(".v").click(); await page.waitForTimeout(100);
await page.keyboard.type("0px"); await page.keyboard.press("Enter"); await page.waitForTimeout(150);
console.log("2 radius after edit:", await radius());
await rawClick(host.locator(".reset"));
console.log("2 radius after reset:", await radius());
await scopeTo("css", "main div");
console.log("2 row value after reopening:", await host.locator("#view-css .d", { hasText: "border-radius" }).first().locator(".v").textContent());
// 3. untick padding-inline under the div, move the scope to p (a re-render), Clear all from p's view
await rawClick(host.locator("#view-css .d", { hasText: "padding-inline" }).first().locator("input"));
console.log("3 pad after untick:", await pad());
await scopeTo("css", "p");
console.log("3 scope now:", JSON.stringify(await box()));
await rawClick(host.locator(".reset"));
console.log("3 pad after reset from p view:", await pad());
// 4. a tool armed (resize), a rule unticked, Clear all: the tool ends too
await scopeTo("css", "p");
await rawClick(host.locator("#view-css .d", { hasText: "text-align" }).first().locator("input"));
console.log("4 p align after untick:", await page.evaluate(() => getComputedStyle(document.querySelector("p")).textAlign));
await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
console.log("4 resize armed:", JSON.stringify(await box()));
await rawClick(host.locator(".reset"));
console.log("4 p align after reset:", await page.evaluate(() => getComputedStyle(document.querySelector("p")).textAlign), "box:", JSON.stringify(await box()), "(expect sizing false)");
console.log("errors:", errors);
await browser.close(); qrSrv.close();
