// The quick view (v0.2, it replaced the multi-pick picker): armed, a hover paints the element's frame, size lines and margin / padding bands; a click opens
// the quick box with the name, the box model and the size lines; the CSS view's declaration hover still paints its bands.
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const ov = () => page.evaluate(() => { const r = document.querySelector("fm-inspector").shadowRoot; const t = (s) => [...r.querySelectorAll(s)].map((n) => n.textContent); return { probes: r.querySelectorAll(".ov .probe").length, box: r.querySelectorAll(".ov .box").length, pd: r.querySelectorAll(".ov .pd").length, mr: r.querySelectorAll(".ov .mr").length, pv: t(".ov .pv"), mv: t(".ov .mv"), names: t(".ov .lb .n"), dims: t(".ov .lb.sz"), lines: [r.querySelectorAll(".ov .dim-width").length, r.querySelectorAll(".ov .dim-height").length] }; });
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
const h1 = await page.locator("h1").boundingBox();
await page.mouse.move(h1.x + 10, h1.y + 10); await page.waitForTimeout(250);
console.log("hover h1:", JSON.stringify(await ov()), "(expect one probe with its frame, two size lines, the margin band with 16s)");
await page.mouse.click(h1.x + 10, h1.y + 10); await page.waitForTimeout(400);
const box = await page.evaluate(() => { const i = document.querySelector("fm-inspector"), r = i.shadowRoot; return { open: i.hasAttribute("open"), view: i.view, name: r.querySelector("#view-quick .qname")?.textContent.trim(), layers: r.querySelectorAll("#view-quick .bm-layer").length, lines: [...r.querySelectorAll("#view-quick .lim")].map((n) => n.textContent.trim().replace(/\s+/g, " ").slice(0, 40)) }; });
console.log("click h1:", JSON.stringify(box), "(expect the quick view open on h1: name, three box-model layers, width / height / content / rendered content / space / with margin)");
await page.mouse.move(10, 10); await page.waitForTimeout(200);
await page.screenshot({ path: "pick-after.png" });
// the CSS view's declaration hover still paints its bands
await openBox(page, host, "css"); await page.waitForTimeout(200);
await host.locator("#view-css .d", { hasText: /^padding: /, hasNotText: "padding: 0" }).first().hover(); await page.waitForTimeout(250);
console.log("decl hover pd bands:", await page.evaluate(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .pd").length), "(expect one per element the rule reaches)");
console.log("errors:", errors);
await browser.close();
