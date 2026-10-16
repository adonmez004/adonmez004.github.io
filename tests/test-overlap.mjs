// Overlay labels never overlap each other or leave the viewport when a declaration's reach includes a box at the page's corner (v0.2: the hover alone, no pick)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
// a second div at the page's bottom-left corner, like Replit's badge
await page.evaluate(() => { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:0;bottom:0;width:120px;height:30px;background:#ccc"; document.body.append(d); });
const host = page.locator("fm-inspector");
await openBox(page, host, "css"); // v0.2: the CSS view on every stylesheet; a hover on a declaration paints every element it reaches
await host.locator("#view-css .d", { hasText: "max-inline-size" }).first().hover(); await page.waitForTimeout(250);
const r = await page.evaluate(() => { const ov = document.querySelector("fm-inspector").shadowRoot.querySelector(".ov"); const labels = [...ov.querySelectorAll(".lb")].map((n) => ({ t: n.textContent, b: n.getBoundingClientRect() })); const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; const overlaps = []; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (hits(labels[i].b, labels[j].b)) overlaps.push(labels[i].t + " x " + labels[j].t); const out = labels.filter((l) => l.b.left < 0 || l.b.right > innerWidth || l.b.top < 0 || l.b.bottom > innerHeight).map((l) => l.t); return { labels: labels.map((l) => `${l.t}@${Math.round(l.b.left)},${Math.round(l.b.top)}`), overlaps, out }; });
console.log(JSON.stringify(r));
await page.screenshot({ path: "overlap.png" });
console.log("errors:", errors);
await browser.close();
