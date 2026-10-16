// v0.1.10's checks on the v0.2 chrome: the rail inside the viewport at desktop and phone widths, the box opened by the CSS lens inside the viewport, a lens click on the p scoping the view to it (its rules lit, the first group in view), the close returning the rail alone
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const width of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  const rb = await host.locator(".rail").boundingBox();
  console.log(width, "rail rect:", JSON.stringify({ x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height) }), "inside viewport:", rb.x >= 0 && rb.x + rb.width <= width && rb.y >= 0 && rb.y + rb.height <= 900, "phone strip along the foot:", width === 390 ? rb.width > rb.height : "n/a");
  if (width === 1280) await page.screenshot({ path: "rail-edge.png" });
  await openBox(page, host, "css", { all: false, at: "p" });
  const pb = await host.locator("#panel").boundingBox();
  console.log(width, "box rect:", JSON.stringify({ x: Math.round(pb.x), y: Math.round(pb.y), w: Math.round(pb.width), h: Math.round(pb.height) }), "inside viewport:", pb.x >= 0 && pb.x + pb.width <= width && pb.y >= 0 && pb.y + pb.height <= 900);
  const st = await page.evaluate(() => { const h = document.querySelector("fm-inspector"), r = h.shadowRoot; const b = r.querySelector(".body").getBoundingClientRect(); return { view: h.view, scoped: r.querySelector(".vscope").getAttribute("aria-pressed"), groups: [...r.querySelectorAll("#view-css .grp .gh .sel")].map((n) => n.textContent.trim()), firstVisible: [...r.querySelectorAll("#view-css .grp")].find((g) => g.getBoundingClientRect().bottom > b.top)?.querySelector(".sel").textContent }; });
  console.log(width, JSON.stringify(st), "(expect view css, scoped, a p group among the groups: the lens scope lists the rules that reach the element)");
  await page.mouse.move(width / 2, 60); await page.waitForTimeout(150);
  if (width === 1280) await page.screenshot({ path: "css-hit.png" });
  await host.locator("#panel .close").click(); await page.waitForTimeout(200);
  console.log(width, "after close: open", await host.evaluate((n) => n.hasAttribute("open")), "lens still armed", await host.evaluate((n) => n.lens.armed));
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
