// Phones, real touch (the lens ended with Escape right after the open, v0.2's armed shield swallows the moves that leave the sheet, see test-sheet2): the sheet pulled all the way down stands at its head, pushed up it is half the screen again, a double tap on the head drops and raises it, two slow taps on a head button do not toggle, the x closes (v0.2: opened through the rail's HTML lens and a tap on the page; the rail strip stays at the foot)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const st = () => page.evaluate(() => { const h = document.querySelector("fm-inspector"), sh = h.shadowRoot; return { open: h.hasAttribute("open"), height: Math.round(sh.querySelector("#panel").getBoundingClientRect().height), head: sh.querySelector("#panel .head").offsetHeight, rail: getComputedStyle(sh.querySelector(".rail")).display, view: h.view }; });
const pull = async (dy) => { const b = await host.locator("#panel .head").boundingBox(); const x = b.x + b.width - 70, y = b.y + 6; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(x, y + dy * i / 8); await page.mouse.up(); await page.waitForTimeout(150); };
const doubleTap = async () => { const b = await host.locator("#panel .head").boundingBox(); const x = b.x + b.width - 70, y = b.y + 6; await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y); await page.waitForTimeout(250); }; // on the first row's spacer: the head's centre is a button in v0.2
const open = async () => { if (await host.evaluate((n) => n.lens.armed !== "html")) { await host.locator(".htmlbtn").tap(); await page.waitForTimeout(150); } const [x, y] = await page.evaluate(() => { const r = document.querySelector("main").getBoundingClientRect(); return [r.left + 2, r.top + 2]; }); await page.touchscreen.tap(x, y); await page.waitForTimeout(400); };
await open(); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
console.log("open (lens ended):", JSON.stringify(await st()), "armed:", await host.evaluate((n) => n.lens.armed));
await pull(600); console.log("pulled all the way down:", JSON.stringify(await st()), "(expect open, height = head)");
await pull(-300); console.log("pushed up:", JSON.stringify(await st()), "(expect up to 422: the head's 86px + 300)");
await doubleTap(); console.log("double tap on the head:", JSON.stringify(await st()), "(expect height = head)");
await doubleTap(); console.log("double tap again:", JSON.stringify(await st()), "(expect 422)");
await host.locator("#panel .vall").tap(); await page.waitForTimeout(400); await host.locator("#panel .vscope").tap(); await page.waitForTimeout(100);
console.log("two slow taps on head buttons: height", (await st()).height, "(expect 422, no toggle)");
await host.locator("#panel .close").tap(); await page.waitForTimeout(200);
console.log("close button:", JSON.stringify(await st()), "(expect open false, the rail shown)");
await open(); await page.keyboard.press("Escape"); await page.waitForTimeout(200); console.log("reopened:", JSON.stringify(await st()), "(expect 422)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
