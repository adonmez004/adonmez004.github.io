// The resize tool's own box (v0.2, the top bar's replacement): closed while armed, opened by the first choice with the first-chosen size, the size now and the signed difference, the hold's reason with the holding declaration's tick and the Go to this element door to a second box; Escape takes the second box first; the phone's state pill clear of the rail
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const sizes = () => sr(() => ({ btn: Math.round(document.querySelector(".btn").getBoundingClientRect().width), title: Math.round(document.querySelector(".title").getBoundingClientRect().width), btnStyle: document.querySelector(".btn").getAttribute("style"), titleStyle: document.querySelector(".title").getAttribute("style") }));
const tools = () => sr(() => { const h = document.querySelector("fm-inspector"), sh = h.shadowRoot; const w = sh.querySelector(".wblock"); return { box: h.hasAttribute("open") ? h.view : "closed", val: sh.querySelector(".wval").textContent, now: sh.querySelector(".wnow").textContent, hint: getComputedStyle(sh.querySelector(".shint")).display !== "none", reason: [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(), tick: w.querySelector(".hdecl input")?.checked ?? null, door: w.querySelector(".wgo")?.textContent || null, second: !sh.querySelector("#panel2").hidden, secondTitle: sh.querySelector(".p2title").textContent, redRow: sh.querySelector("#panel2 .d.block")?.textContent.trim().replace(/\s+/g, " ") || null }; });
const choose = async (sel) => { const [x, y] = await sr((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + 3, r.y + 3]; }, sel); await page.mouse.click(x, y); await page.waitForTimeout(250); };
const drag = async (dx, dy) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 4; i++) await page.mouse.move(x + dx * i / 4, y + dy * i / 4); await page.mouse.up(); await page.waitForTimeout(200); };
await page.addStyleTag({ content: ".btn { max-width: 60px; }" }); await page.waitForTimeout(700); // a rule the drag will meet, with a tick in the box
console.log("box before:", (await tools()).box);
await host.locator(".sizebtn").click(); await page.waitForTimeout(100);
console.log("armed:", JSON.stringify(await tools()), "(expect closed: the box opens on the choice)");
const start = await sizes();
await choose(".btn"); console.log("btn chosen:", JSON.stringify(await tools()), "(expect size view, val = first size, now = same with 0 × 0px)");
await drag(40, 0); console.log("after +40:", JSON.stringify(await tools()), JSON.stringify(await sizes()));
await drag(200, 0); console.log("past the max:", JSON.stringify(await tools()), "(expect held by [x] max-width: 60px and the door)");
await host.locator(".wgo").click(); await page.waitForTimeout(400); console.log("door:", JSON.stringify(await tools()), "(expect the second box CSS · button.btn with the red row)");
await page.keyboard.press("Escape"); await page.waitForTimeout(200); console.log("Escape once:", JSON.stringify((({ box, second }) => ({ box, second }))(await tools())), "sizing:", await host.evaluate((n) => n.hasAttribute("sizing")), "(expect second closed, the tool standing)");
const held = await sr(() => { const h = document.querySelector("fm-inspector"); return h.blocked ? { prop: h.blocked.prop, on: h.blocked.on } : null; });
console.log("holding declaration:", JSON.stringify(held));
if (held) { await host.locator(".hdecl input").click(); await page.waitForTimeout(300); console.log("unticked:", JSON.stringify(await sr(() => { const h = document.querySelector("fm-inspector"); return { on: h.blocked?.on, off: !!h.shadowRoot.querySelector(".hdecl.off"), steps: h.history.length }; })), "(expect on false, struck, one undo step)"); }
await drag(40, 0); console.log("drag with the rule off:", JSON.stringify(await tools()), JSON.stringify(await sizes()), "(expect past 60px, no reason)");
await sr(() => document.querySelector("fm-inspector").sizeUndo()); await page.waitForTimeout(200); console.log("sizeUndo:", JSON.stringify(await sizes()), "now:", (await tools()).now);
await choose(".title"); await drag(-50, 0); console.log("title chosen and narrowed:", JSON.stringify(await tools()));
await page.keyboard.press("Escape"); await page.waitForTimeout(150); console.log("Escape:", JSON.stringify(await tools()), "(expect closed, empty)");
await host.locator(".reset").click(); await page.waitForTimeout(300); console.log("Clear all:", JSON.stringify(await sizes()), "(expect", JSON.stringify(start), ")");
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } }); await phone.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await phone.locator("fm-inspector .sizebtn").click(); await phone.waitForTimeout(150);
console.log("phone: state pill and rail:", JSON.stringify(await phone.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const s = sh.querySelector(".state").getBoundingClientRect(), r = sh.querySelector(".rail").getBoundingClientRect(); return { pillTop: Math.round(s.top), railTop: Math.round(r.top), overlap: s.bottom > r.top }; })), "(expect no overlap)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
