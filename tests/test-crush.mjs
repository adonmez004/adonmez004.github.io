// A narrowed parent crushes the child resized earlier; the resize undo (host.sizeUndo(), no button in v0.2) restores both
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
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
const warn = () => sr(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words, the door's aside
const choose = async (sel) => { await sr((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(150); };
const drag = async (dx) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(250); };
const size = (sel) => sr((s) => { const el = document.querySelector(s), r = el.getBoundingClientRect(); return { w: Math.round(r.width), style: el.getAttribute("style") }; }, sel);
await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
// grow the card first (it is a block in main: inline-size grows it), then narrow main: the card is crushed with it
await choose("main div"); await drag(60); console.log("card grown:", await size("main div"), "warn:", JSON.stringify(await warn()));
await choose("main"); await drag(-200); console.log("main narrowed: main", await size("main"), "card", await size("main div"), "warn:", JSON.stringify(await warn()), "(expect card narrowed with main, no content warning)");
console.log("card inside main:", await sr(() => { const m = document.querySelector("main").getBoundingClientRect(), c = document.querySelector("main div").getBoundingClientRect(); return c.right <= m.right + 1; }));
await sr(() => document.querySelector("fm-inspector").sizeUndo()); await page.waitForTimeout(200); console.log("undo the parent's drag restores both:", "main", await size("main"), "card", await size("main div"));
console.log("errors:", JSON.stringify(errors));
await browser.close(); qrSrv.close();
