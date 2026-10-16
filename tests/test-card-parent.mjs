// The card dragged wider with its own max off meets the body grid's place-items; main dragged wider widens on its own (v0.2: the hold reads in the size box; CSS view under Show All for the untick)
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
const warn = () => sr(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words, the door's aside
const choose = async (sel) => { await sr((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(150); };
const drag = async (dx) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(300); };
await openBox(page, host, "css");
await untick("div", "max-inline-size"); await page.waitForTimeout(200);
await host.locator(".sizebtn").click(); await choose("main div"); await drag(150);
console.log("card dragged wider with its max off:", await w("main div"), "warn:", JSON.stringify(await warn()), "(expect body grid: place-items: center)");
await choose("main"); await drag(150); console.log("main dragged wider:", await w("main"), "card now:", await w("main div"), "warn:", JSON.stringify(await warn()), "(since v0.1.79 the card sits at px, not 100%, so main widens on its own; the card keeps its width)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
