// A shrink stops at the content: the card's children and the paragraph's text stay inside, growing still works (v0.2: the resize box opens on the choice, the hold's words read without the door)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname);
const qrSrv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const QR_URL = `http://127.0.0.1:${qrSrv.address().port}/`;
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); page.on("pageerror", (e) => errors.push(e.message)); // v0.2: room to park the size box on the left, clear of the card and its handle
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(QR_URL, { waitUntil: "networkidle" }); await page.waitForTimeout(300);
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const warn = () => sr(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words, the door's aside
const park = () => sr(() => { const h = document.querySelector("fm-inspector"); if (h.hasAttribute("open")) h.moveTo(innerWidth - h.panel.offsetWidth - 8, 8); }); // v0.2: the size box opens on the choice and can cover the handle; it is parked on the left for the drags
const choose = async (sel) => { const [x, y] = await sr((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + 2, r.y + 2]; }, sel); await page.mouse.click(x, y); await page.waitForTimeout(150); await park(); await page.waitForTimeout(100); };
const drag = async (dx, dy) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y + dy * i / 6); await page.mouse.up(); await page.waitForTimeout(250); };
const fits = (sel) => sr((s) => { const el = document.querySelector(s), r = el.getBoundingClientRect(); return [...el.children].every((c) => { const cr = c.getBoundingClientRect(); return cr.right <= r.right + 1 && cr.bottom <= r.bottom + 1; }) && el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1; }, sel);
await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
// the h1 made wide, then the card shrunk hard: the card stops at its content
await choose("h1"); await drag(-100, 0); console.log("h1 width:", await sr(() => Math.round(document.querySelector("h1").getBoundingClientRect().width)));
await choose("main div"); await drag(-250, -300);
console.log("card shrunk detail:", JSON.stringify(await sr(() => { const el = document.querySelector("main div"), r = el.getBoundingClientRect(); return { card: [Math.round(r.left), Math.round(r.right)], scroll: [el.scrollWidth, el.clientWidth, el.scrollHeight, el.clientHeight], kids: [...el.children].map((c) => { const k = c.getBoundingClientRect(); return [c.localName, Math.round(k.left), Math.round(k.right), c.scrollWidth, c.clientWidth]; }) }; })));
console.log("card shrunk: children inside:", await fits("main div"), "size:", await sr(() => { const r = document.querySelector("main div").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }), "warn:", JSON.stringify(await warn()));
// the wrapped paragraph: its text stays inside too
await choose("p"); await drag(-150, -40); console.log("p shrunk: text inside:", await fits("p"), "warn:", JSON.stringify(await warn()));
// growing still works
await choose("p"); await drag(40, 20); console.log("p grown ok, warn:", JSON.stringify(await warn()));
console.log("errors:", JSON.stringify(errors));
await browser.close(); qrSrv.close();
