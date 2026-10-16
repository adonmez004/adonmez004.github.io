// The handle's Reset: this element's size back AND every CSS edit back, the other resized element keeping its size (v0.2: opened through the CSS lens, no picks)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname), LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const untick = (sel, prop) => page.evaluate(([s, p]) => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll("#view-css .grp")].find((g) => g.querySelector(".gh .sel").textContent.trim() === s); [...g.querySelectorAll(".d")].find((d) => d.querySelector(".t").textContent.trim() === p + ":").querySelector("input").click(); }, [sel, prop]);
const st = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); return { bodyDisplay: getComputedStyle(document.body).display, cardMax: getComputedStyle(document.querySelector("main div")).maxInlineSize, img: document.querySelector("img").getAttribute("style"), h1: document.querySelector("h1").getAttribute("style"), hreset: getComputedStyle(i.shadowRoot.querySelector(".hreset")).display }; });
const park = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); if (i.hasAttribute("open")) i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // v0.2: the size view opens over the page's right side, where the handle sits; the box goes to the left edge
const dragOn = async (sel, dx) => { await page.evaluate((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(200); await park(); const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(300); };
await openBox(page, host, "css"); // v0.2: the CSS view on every stylesheet; the old multi-pick picker is gone, so no pick is made
await untick("body", "display"); await untick("div", "max-inline-size"); await page.waitForTimeout(300);
await host.locator(".sizebtn").click(); await dragOn("h1", 100); await dragOn("img", -60);
console.log("before:", JSON.stringify(await st()), "(body block, card max none, img + h1 sized)");
await host.locator(".hreset").click(); await page.waitForTimeout(400);
console.log("handle Reset on img:", JSON.stringify(await st()), "(expect body grid, card max 320px, img style null, h1 KEEPS its size, hreset none)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
