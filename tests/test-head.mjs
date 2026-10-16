// The box's head at desktop and phone widths (v0.2: the Selected Element / Show All row, the block buttons on the CSS view, the close button; no tabs, no theme)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  await openBox(page, host, "css");
  const m = await page.evaluate(() => { const r = document.querySelector("fm-inspector").shadowRoot; const h = (s) => Math.round(r.querySelector(s).getBoundingClientRect().height * 10) / 10; return { head: h(".head"), scope: h(".vscope"), all: h(".vall"), size: h(".vlimits"), close: h(".close"), blocksShown: !r.querySelector(".vlimits").hidden, fits: r.querySelector(".head").scrollWidth <= r.querySelector(".head").clientWidth }; });
  console.log(width, JSON.stringify(m));
  if (width === 1280) { await page.mouse.move(640, 60); const pb = await host.locator("#panel").boundingBox(); await page.screenshot({ path: "head-32.png", clip: { x: pb.x - 4, y: pb.y - 4, width: pb.width + 8, height: 120 } }); }
  await ctx.close();
}
await browser.close();
