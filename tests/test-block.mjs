// The resize tool held by a rule: the reason, the declaration with its tick and the door in the size view, for a max, a min, an important width, inline, a flex kid, a grid track, a free element and the parent's edge
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site2/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const choose = async (sel) => { const [x, y] = await sr((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + 2, r.y + 2]; }, sel); await page.mouse.click(x, y); await page.waitForTimeout(120); };
const drag = async (dx, dy) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 4; i++) await page.mouse.move(x + dx * i / 4, y + dy * i / 4); await page.mouse.up(); await page.waitForTimeout(250); };
// v0.2: the hold reads in the resize tool's own box (the size view), the holding declaration with its tick; the box opens on the first choice
const out = () => sr(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const h = document.querySelector("fm-inspector"); const w = sh.querySelector(".wblock"), wr = w.getBoundingClientRect(), p = sh.querySelector("#panel").getBoundingClientRect(); const note = [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); return { note, shown: getComputedStyle(w).display !== "none", inBox: h.hasAttribute("open") && h.view === "size" && wr.left >= p.left && wr.right <= p.right, inside: wr.right <= innerWidth, tick: w.querySelector("input")?.checked ?? null, door: !!w.querySelector(".wgo") }; });
await host.locator(".sizebtn").click(); await page.waitForTimeout(100);
await choose(".maxed"); await drag(200, 0); console.log("max-width:", JSON.stringify(await out()));
await choose(".minned"); await drag(-150, 0); console.log("min-width:", JSON.stringify(await out()));
await choose(".locked"); await drag(100, 0); console.log("important width:", JSON.stringify(await out()));
await choose(".inl"); await drag(100, 0); console.log("display inline:", JSON.stringify(await out()));
await choose(".flexp .kid"); await drag(150, 0); console.log("flex kid grown:", JSON.stringify(await out()));
await choose(".gridp .cell"); await drag(100, 0); console.log("grid cell (held in its 100px track):", JSON.stringify(await out()), "width:", await sr(() => Math.round(document.querySelector(".gridp .cell").getBoundingClientRect().width)), "(expect 100)");
await choose(".free"); await drag(100, 20); console.log("free element (no note):", JSON.stringify(await out()));
await choose(".free"); await drag(900, 0); console.log("free past the 600px parent:", JSON.stringify(await out()), "width:", await sr(() => Math.round(document.querySelector(".free").getBoundingClientRect().width)), "(expect 600)");
await choose(".maxed"); await drag(100, 0); console.log("max again then choose another clears:", (await out()).note !== ""); await choose(".free"); console.log("cleared:", JSON.stringify(await out()));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
