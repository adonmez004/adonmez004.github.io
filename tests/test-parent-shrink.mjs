// A child grown then its parent shrunk: the child follows the parent in, no content warning (v0.2: the hold read from the size view)
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
const warn = () => sr(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words without the door

const park = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); if (i.hasAttribute("open")) i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // v0.2: the size view opens over the page's right side, where the handle sits; the box goes to the left edge
const choose = async (sel) => { await sr((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(150); await park(); };
const drag = async (dx) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(250); };
const size = (sel) => sr((s) => { const el = document.querySelector(s), r = el.getBoundingClientRect(); return { w: Math.round(r.width), style: el.getAttribute("style") }; }, sel);
await host.locator(".sizebtn").click(); // v0.2: no pill; the size view opens on the first choice
await choose("h1"); await drag(150); console.log("h1 grown (a block: max-width cannot widen it):", await size("h1"), "warn:", JSON.stringify(await warn()));
await choose("main"); await drag(-140); console.log("then main shrunk: main", await size("main"), "h1", await size("h1"), "warn:", JSON.stringify(await warn()), "(expect main narrower, h1 following, no content warning)");
console.log("h1 inside main:", await sr(() => { const m = document.querySelector("main").getBoundingClientRect(), h = document.querySelector("h1").getBoundingClientRect(); return h.right <= m.right + 1; }));
console.log("errors:", JSON.stringify(errors));
await browser.close(); qrSrv.close();
