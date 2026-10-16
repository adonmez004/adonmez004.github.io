// Clear all with everything standing (v0.2): a scoped CSS view with an unticked row and a pinned declaration, the resize tool armed on top; after the eraser the pins are gone, the CSS is back, the tool is off, the box closed and the scope forgotten
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
await scopeTo("css", "main div");
console.log("reset in the rail visible:", await host.locator(".reset").isVisible());
await host.locator("#view-css .d", { hasText: "padding-inline" }).first().locator("input").click(); await page.waitForTimeout(100);
await host.locator("#view-css .d", { hasText: "border-radius" }).first().locator(".t").click(); await page.waitForTimeout(100);
const st = () => page.evaluate(() => { const h = document.querySelector("fm-inspector"), r = h.shadowRoot; return { open: h.hasAttribute("open"), scope: h.lens.scope.css?.localName || null, pins: h.pins.size, pinnedRows: r.querySelectorAll("#view-css .d.on").length, decls: r.querySelectorAll(".ov .decl").length, sizing: h.hasAttribute("sizing"), pad: getComputedStyle(document.querySelector("main div")).paddingLeft, groups: r.querySelectorAll("#view-css .grp").length }; });
console.log("unticked + pinned:", JSON.stringify(await st()));
await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
console.log("resize armed (the box closes, the pin stands):", JSON.stringify(await st()));
await host.locator(".reset").click(); await page.waitForTimeout(300);
console.log("after Clear all:", JSON.stringify(await st()), "(expect pins 0, pad 16px, sizing false, closed, no scope)");
await openBox(page, host, "css");
console.log("reopened on Show All:", JSON.stringify(await st()));
console.log("errors:", errors);
await browser.close(); qrSrv.close();
