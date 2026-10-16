// A big page: 3000 elements and 300 rules. What the panel costs there, in coarse buckets (the raw numbers go to bigpage-timings.json beside the
// output, the buckets alone are compared run to run): opening the panel, the HTML rows, the CSS rows, a pick, the eye's 300-element cap, the
// 500 ms poll's own cost, and the overlay's paint.
import { launch, routeInspector, serve, openBox } from "./lib/browser.mjs";
import fs from "node:fs";
const rules = Array.from({ length: 300 }, (_, i) => `.c${i} { padding: ${i % 7}px; margin: ${i % 5}px; color: rgb(${i % 255}, 0, 0); }`).join("\n");
const items = Array.from({ length: 3000 }, (_, i) => `<div class="c${i % 300} item"><span>item ${i}</span></div>`).join("");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${rules}\n.item { display: inline-block; width: 60px; height: 20px; }</style></head><body><main>${items}</main><script defer src="https://demo.frontendmentorsolutions.io/inspector.js"></script></body></html>`;
const site = serve(html);
const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
await routeInspector(page);
await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const timings = {};
const bucket = (ms) => (ms < 100 ? "<100ms" : ms < 2000 ? "<2s" : ms < 10000 ? "<10s" : ">=10s"); // coarse on purpose: under a full run's load the numbers double, the buckets must not
const time = async (label, fn) => { const ms = await fn(); timings[label] = Math.round(ms); console.log(`${label}: ${bucket(ms)}`); };

await time("open the box (HTML + CSS load; v0.2: the HTML lens, a click on main, Show All)", async () => { const t = Date.now(); await openBox(page, host, "html", { all: false }); await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".vall").click()); await sr(() => document.querySelector("fm-inspector").load()); return Date.now() - t; }); // Show All pressed from the page: Playwright's actionability wait times out while the 6000-row view builds
await time("the HTML rows alone (loadHtml)", async () => sr(() => { const i = document.querySelector("fm-inspector"); const t = performance.now(); i.loadHtml(); return performance.now() - t; }));
console.log("HTML rows:", await sr(() => document.querySelector("fm-inspector").rows.size), "(expect 3000 items + their spans + main + body)");
await time("CSS tab render", async () => sr(() => { const i = document.querySelector("fm-inspector"); const t = performance.now(); i.renderCss(); return performance.now() - t; }));
console.log("CSS declaration rows:", await sr(() => document.querySelector("fm-inspector").store.allDecls.length));
await time("a pick (hits marked, overlay painted)", async () => sr(async () => { const i = document.querySelector("fm-inspector"); const t = performance.now(); i.select(document.querySelector(".c17")); await new Promise((r) => requestAnimationFrame(r)); return performance.now() - t; }));
await time("the poll's snapshot (store.changed) x10", async () => sr(() => { const i = document.querySelector("fm-inspector"); const t = performance.now(); for (let k = 0; k < 10; k++) i.store.changed(); return (performance.now() - t) / 10; }));
await time("the eye switched on (setMeasuring + its first frame)", async () => sr(async () => { const i = document.querySelector("fm-inspector"); const t = performance.now(); i.setMeasuring(true); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t; }));
await time("the eye's mark list", async () => sr(() => { const i = document.querySelector("fm-inspector"); const t = performance.now(); const n = i.marks().length; window.__marks = n; return performance.now() - t; }));
console.log("eye marks:", await sr(() => window.__marks), "(expect <= 301: the 300 cap + the pick)");
await time("one overlay frame with the eye on", async () => sr(async () => { const i = document.querySelector("fm-inspector"); const t = performance.now(); i.draw(); return performance.now() - t; }));
await sr(() => document.querySelector("fm-inspector").setMeasuring(false));
await time("a DOM change under the open panel (HTML rebuilt)", async () => sr(async () => { const i = document.querySelector("fm-inspector"); const t = performance.now(); document.querySelector("main").append(Object.assign(document.createElement("div"), { className: "c1 item", textContent: "late" })); await new Promise((r) => setTimeout(r, 0)); i.loadHtml(); return performance.now() - t; }));
fs.writeFileSync("bigpage-timings.json", JSON.stringify(timings, null, 2));
console.log("errors:", errors.length, errors.slice(0, 3));
await browser.close(); site.close();
