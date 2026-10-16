// A drag past an element's OWN max: the red row and the hold name that rule, not the parent; the card's max unticked in the size view, then the body grid's place-items (v0.2)
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
const park = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); if (i.hasAttribute("open")) i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // v0.2: the size view opens over the page's right side, where the handle sits; the box goes to the left edge
const dragOn = async (sel, dx) => { await page.evaluate((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(200); await park(); const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(400); };
// v0.2: the hold reads in the size view (the holding declaration with its tick), the CSS view's red row stays rendered behind it
const st = () => page.evaluate(() => { const h = document.querySelector("fm-inspector"), sh = h.shadowRoot; const row = sh.querySelector("#view-css .d.block"); const w = sh.querySelector(".wblock"); const hold = [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); return { hold, tick: w.querySelector("input")?.checked ?? null, redRow: row?.textContent.trim().replace(/\s+/g, " ") || null, redSelector: sh.querySelector("#view-css .grp:has(.d.block) .gh .sel")?.textContent || null, view: h.view, open: h.hasAttribute("open"), chips: sh.querySelectorAll(".lb.pct").length }; });
await openBox(page, host, "css"); await host.locator(".sizebtn").click();
await dragOn("p", 200); console.log("p past its own max AND the card:", JSON.stringify(await st()), "(expect redRow max-inline-size: 256px under p, the size view open, no chips)");
await dragOn("img", 200); console.log("img past its own max:", JSON.stringify(await st()), "(expect max-inline-size: 288px under img)");
await dragOn("main div", 200); console.log("card past its own max:", JSON.stringify(await st()), "(expect max-inline-size: 320px under div)");
await page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; sh.querySelector(".wblock .hdecl input").click(); }); await page.waitForTimeout(300); // the tick in the size view, no trip to the CSS view
await dragOn("main div", 300); console.log("card with its max off, 300 wider:", JSON.stringify(await st()), "(since v0.1.79 main hugs its content and grows with the card: nothing red)");
await dragOn("main div", 1200); console.log("card with its max off, past the body's box:", JSON.stringify(await st()), "(expect the body grid's place-items row red, sr 'body grid: place-items: center')");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
