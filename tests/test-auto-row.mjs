// The resize tool's own inline line is tinted (.auto), the page's own inline style is not; the handle's Reset clears it (v0.2: the CSS view under Show All, the resize tool's own box)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname), LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); page.on("pageerror", (e) => errors.push(e.message)); // v0.2: room to park the size box on the left, clear of the card and its handle
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
// the page's own inline style on the img must NOT be tinted; the resize's line must
await page.evaluate(() => document.querySelector("img").setAttribute("style", "opacity: 0.9"));
const host = page.locator("fm-inspector"); const sr = (f, a) => page.evaluate(f, a);
const park = () => sr(() => { const h = document.querySelector("fm-inspector"); if (h.hasAttribute("open")) h.moveTo(innerWidth - h.panel.offsetWidth - 8, 8); }); // v0.2: the size box opens on the choice and can cover the handle; it is parked on the left for the drags
const choose = async (sel) => { await sr((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(150); await park(); await page.waitForTimeout(100); };
const drag = async (dx) => { const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(700); };
const rows = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .grp.inline .d")].map((d) => [d.querySelector(".t").textContent.trim(), d.classList.contains("auto"), getComputedStyle(d).backgroundColor]));
await openBox(page, host, "css");
await host.locator(".sizebtn").click();
await choose("img"); await drag(-60);
console.log("img inline rows:", JSON.stringify(await rows()), "(expect opacity false, inline-size true)");
await host.locator(".hreset").click(); await page.waitForTimeout(700);
console.log("after Reset:", JSON.stringify(await rows()), "(expect opacity alone, untinted)");
await page.screenshot({ path: "/tmp/claude-1000/-var-www-ghost-content-themes-frontier/4d520945-76be-45d9-961b-d566970cef67/scratchpad/auto-row.png" });
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
