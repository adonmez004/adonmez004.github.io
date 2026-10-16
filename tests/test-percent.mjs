// Resizes write px, not percentages: an image narrowed inside the card, the card's max lifted, the card narrowed, main in a grid auto track (v0.2: opened through the CSS lens)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname), LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector"); const sr = (f, a) => page.evaluate(f, a);
const untick = async (sel, prop) => sr(([s, p]) => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll("#view-css .grp")].find((g) => g.querySelector(".gh .sel").textContent.trim() === s); const d = [...g.querySelectorAll(".d")].find((d) => d.querySelector(".t").textContent.trim() === p + ":"); d.querySelector("input").click(); }, [sel, prop]);
const w = (s) => sr((s) => Math.round(document.querySelector(s).getBoundingClientRect().width), s);
const style = (s) => sr((s) => document.querySelector(s).getAttribute("style"), s);
const park = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); if (i.hasAttribute("open")) i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // v0.2: the size view opens over the page's right side, where the handle sits; the box goes to the left edge
const choose = async (sel) => { await sr((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(150); await park(); };
const drag = async (dx) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(250); };
await openBox(page, host, "css"); // v0.2: the CSS view on every stylesheet, its rows stay rendered while the size view shows
await host.locator(".sizebtn").click();
// the image narrowed to ~200 of the card's 288 content width: a percentage
await choose("img"); await drag(-88); console.log("img narrowed:", await w("img"), "style:", await style("img"), "(expect px)");
// the card's max lifted and the card widened: the image follows in proportion
await untick("div", "max-inline-size"); await page.waitForTimeout(300);
console.log("card max lifted: card", await w("main div"), "img", await w("img"), "(expect the img unchanged: it sits in px, short of the card)");
await choose("main div"); await drag(-200); console.log("card narrowed: card", await w("main div"), "img", await w("img"), "card style:", await style("main div"));
// main is a grid item in an auto track: px
await choose("main"); await drag(40); console.log("main (grid auto track) style:", await style("main"));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
