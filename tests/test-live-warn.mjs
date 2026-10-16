// The hold's reason mid-drag: it appears past a max, clears below it, returns past it again, and stands on release (v0.2: read from the size view, the door's words aside)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site2/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const warn = () => page.evaluate(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words without the door
await host.locator(".sizebtn").click(); // v0.2: the tool arms without the box; the first choice opens the size view
const [x, y] = await page.evaluate(() => { const r = document.querySelector(".maxed").getBoundingClientRect(); return [r.x + 2, r.y + 2]; }); await page.mouse.click(x, y); await page.waitForTimeout(150);
const b = await host.locator(".hd").boundingBox(); const hx = b.x + b.width / 2, hy = b.y + b.height / 2;
await page.mouse.move(hx, hy); await page.mouse.down();
await page.mouse.move(hx - 50, hy); await page.waitForTimeout(80); console.log("shrunk below the max, mid-drag:", JSON.stringify(await warn()), "(expect empty)");
await page.mouse.move(hx + 40, hy); await page.waitForTimeout(80); console.log("past the max, mid-drag:", JSON.stringify(await warn()), "(expect held by max-width)");
await page.mouse.move(hx - 60, hy); await page.waitForTimeout(80); console.log("back below, mid-drag:", JSON.stringify(await warn()), "(expect empty)");
await page.mouse.move(hx + 120, hy); await page.waitForTimeout(80); console.log("past again, mid-drag:", JSON.stringify(await warn()));
await page.mouse.up(); await page.waitForTimeout(250); console.log("released:", JSON.stringify(await warn()));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
