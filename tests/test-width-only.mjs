// The resize tool writes the width alone: a downward drag never writes a height (the text wraps), an upward one never a negative; a centred grid item in an auto track widens freely
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname);
const qrSrv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const QR_URL = `http://127.0.0.1:${qrSrv.address().port}/`;
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(QR_URL, { waitUntil: "networkidle" }); await page.waitForTimeout(300);
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const choose = async (sel) => { const [x, y] = await sr((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + 2, r.y + 2]; }, sel); await page.mouse.click(x, y); await page.waitForTimeout(150); };
const drag = async (dx, dy) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y + dy * i / 6); await page.mouse.up(); await page.waitForTimeout(250); };
const size = (sel) => sr((s) => { const el = document.querySelector(s), r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), style: el.getAttribute("style") }; }, sel);
// v0.2: the resize tool opens its own box on the first choice; no pill to open first
await host.locator(".sizebtn").click();
const p0 = await size("p"); await choose("p"); await drag(-120, 80); const p1 = await size("p");
console.log("p narrowed with a downward drag:", p1, "from", p0, "(expect width down, height grown by wrapping, no height in style)");
await choose("main"); const c0 = await size("main"); await drag(60, -200); const c1 = await size("main");
console.log("main (a centred grid item in an auto track) widened with an upward drag:", c1, "from", c0, "warn:", JSON.stringify(await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock").childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim())), "(expect width up or its own max-width named, never the grid track)");
console.log("handle cursor:", await sr(() => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector(".hd")).cursor));
console.log("errors:", JSON.stringify(errors));
await browser.close(); qrSrv.close();
