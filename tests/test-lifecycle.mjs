// Lifecycle acceptance (v0.2): the script loaded twice, the host removed and reattached, a page style change under an open box, Escape mid-drag, and the two resets kept apart: the handle's Reset (this element's size and every CSS edit back) against the rail's Clear all.
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname);
const qrSrv = http.createServer((q, r) => { const f = path.join(QR, q.url.split("?")[0] === "/" ? "index.html" : q.url.split("?")[0]); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const QR_URL = `http://127.0.0.1:${qrSrv.address().port}/`;
const LOCAL = process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname;
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(QR_URL, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn) => page.evaluate(fn);
const open = () => sr(() => document.querySelector("fm-inspector").hasAttribute("open"));
const park = () => sr(() => { const i = document.querySelector("fm-inspector"); if (i.hasAttribute("open")) i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // the box off the page's right side, where the handles sit
console.log("hosts after first load:", await host.count(), "version:", await sr(() => document.querySelector("fm-inspector").dataset.version));

// 1. the script loaded a second time: no second host, no error, the first host untouched
await page.addScriptTag({ url: "https://demo.frontendmentorsolutions.io/inspector.js" }); await page.waitForTimeout(400);
console.log("double load: hosts:", await host.count(), "shadow boxes:", await sr(() => document.querySelectorAll("fm-inspector").length && document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#panel").length));

// 2. open the CSS view, untick a declaration, then remove the host and reattach it: listeners rebind, the page's CSS state survives the detach
await openBox(page, host, "css");
const bg = () => sr(() => getComputedStyle(document.body).backgroundColor);
const before = await bg();
await host.locator("#view-css .d", { hasText: "background-color: #D5E1EF" }).first().locator("input").click(); await page.waitForTimeout(200);
console.log("untick: body bg before/after:", before, await bg());
await sr(() => { const h = document.querySelector("fm-inspector"); window.__h = h; h.remove(); }); await page.waitForTimeout(300);
console.log("detached: hosts:", await host.count(), "bg while detached:", await bg());
await sr(() => document.body.appendChild(window.__h)); await page.waitForTimeout(500);
console.log("reattached: hosts:", await host.count(), "box open:", await open());
await host.locator("#panel").focus(); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
console.log("Escape (focus in the box) after reattach: open now", await open());

// 3. a page style change under the open box refreshes the CSS view (mutation path) and a CSSOM edit (poll path)
await openBox(page, host, "css");
const rows = () => sr(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d").length);
const r0 = await rows();
await sr(() => { const s = document.createElement("style"); s.id = "late"; s.textContent = ".late-rule { color: red; outline: 1px solid red; }"; document.head.appendChild(s); }); await page.waitForTimeout(700);
const r1 = await rows();
await sr(() => { document.styleSheets[0].insertRule(".cssom-rule { margin: 1px; }", 0); }); await page.waitForTimeout(1200);
const r2 = await rows();
console.log("css rows: start", r0, "after <style>", r1, "after insertRule", r2, "(expect two rises)");

// 4. Escape in the middle of a resize drag: the drag ends cleanly, the tool disarms with its box, the size property is put back, no error
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("main"))); await page.waitForTimeout(300); await park();
const hd0 = await host.locator(".hd").boundingBox();
const mainStyle = () => sr(() => document.querySelector("main").getAttribute("style"));
console.log("main style before drag:", JSON.stringify(await mainStyle()), "size view open:", await open());
await page.mouse.move(hd0.x + hd0.width / 2, hd0.y + hd0.height / 2); await page.mouse.down(); await page.mouse.move(hd0.x + hd0.width / 2 - 80, hd0.y + hd0.height / 2, { steps: 8 }); await page.waitForTimeout(150);
console.log("mid-drag main style:", JSON.stringify(await mainStyle()));
await page.keyboard.press("Escape"); await page.waitForTimeout(200); await page.mouse.up(); await page.waitForTimeout(300);
console.log("after Escape mid-drag: main style:", JSON.stringify(await mainStyle()), "sizing armed:", await host.locator(".sizebtn").getAttribute("aria-pressed"), "handle on:", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".hd").hasAttribute("data-on")), "box open:", await open());
if (await host.locator(".sizebtn").getAttribute("aria-pressed") === "true") { await host.locator(".sizebtn").click(); await page.waitForTimeout(200); }

// 5. the two resets kept apart: a resize on main + a CSS edit; the handle's Reset on main puts main's size AND the edit back (v0.2: one button for both); then a resize on the img, and Clear all ends every tool and puts everything back
await openBox(page, host, "css");
await host.locator("#view-css .d", { hasText: "background-color: #D5E1EF" }).first().locator("input").click(); await page.waitForTimeout(200);
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("main"))); await page.waitForTimeout(300); await park();
const hd = await host.locator(".hd").boundingBox();
await page.mouse.move(hd.x + hd.width / 2, hd.y + hd.height / 2); await page.mouse.down(); await page.mouse.move(hd.x + hd.width / 2 - 60, hd.y + hd.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
const state = () => sr(() => ({ mainInline: document.querySelector("main").style.cssText, imgInline: document.querySelector("img").style.cssText, bodyBg: getComputedStyle(document.body).backgroundColor, sizing: document.querySelector("fm-inspector").sizing, open: document.querySelector("fm-inspector").hasAttribute("open") }));
console.log("before resets:", JSON.stringify(await state()), "(main sized, the body bg edited away)");
await host.locator(".hreset").click(); await page.waitForTimeout(300);
console.log("after the handle's Reset:", JSON.stringify(await state()), "(main's size back, the edit back, the tool standing)");
await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("img"))); await page.waitForTimeout(300); await park();
const hd2 = await host.locator(".hd").boundingBox(); await page.mouse.move(hd2.x + hd2.width / 2, hd2.y + hd2.height / 2); await page.mouse.down(); await page.mouse.move(hd2.x + hd2.width / 2 - 60, hd2.y + hd2.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(300);
console.log("img resized:", JSON.stringify(await state()));
await host.locator(".reset").click(); await page.waitForTimeout(300);
console.log("after Clear all:", JSON.stringify(await state()), "(every size back, the tool off, the box closed)");

console.log("errors:", errors);
await browser.close(); qrSrv.close();
