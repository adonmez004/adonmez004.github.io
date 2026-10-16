// The box dragged down to its narrowest: the head's buttons wrap inside it, nothing overflows (v0.2: the word buttons in two or three rows)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`file://${process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname}index.html`); await page.waitForTimeout(300);
const host = page.locator("fm-inspector");
await openBox(page, host, "css"); // v0.2: the CSS view, its head two rows of word buttons
// drag the west edge far to the right: the panel shrinks to its floor
const b = await host.locator(".rz.w").boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + 200, b.y + 100); await page.mouse.move(b.x + 400, b.y + 100); await page.mouse.up(); await page.waitForTimeout(200);
const m = await page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const head = sh.querySelector("#panel .head"), panel = sh.querySelector("#panel"); const hb = head.getBoundingClientRect(); const items = [...head.querySelectorAll("button")].map((x) => { const r = x.getBoundingClientRect(); return { c: x.className || x.id, top: Math.round(r.top - hb.top), right: Math.round(r.right - hb.left) }; }); return { panel: Math.round(panel.getBoundingClientRect().width), head: Math.round(hb.height), overflow: head.scrollWidth > head.clientWidth, items }; });
console.log(JSON.stringify(m));
console.log("rows (v0.2 wraps the block buttons to a second and third row at the floor):", [...new Set(m.items.map((i) => i.top))].length, "all inside:", m.items.every((i) => i.right <= m.panel), "no overflow:", !m.overflow);
const hb = await host.locator("#panel .head").boundingBox(); await page.screenshot({ path: "shot-narrow.png", clip: { x: hb.x - 4, y: hb.y - 4, width: hb.width + 8, height: hb.height + 40 } });
console.log("errors:", JSON.stringify(errors));
await browser.close();
