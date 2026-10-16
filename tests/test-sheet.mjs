// Phones, light and dark: the box is a sheet on the screen's foot above the rail strip (v0.2: opened through the rail, scoped to the card, the CSS view; no pill, the rail strip stands after the close)
import { chromium } from "playwright";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const [name, dark] of [["light", false], ["dark", true]]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: dark ? "dark" : "light" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  await host.locator(".cssbtn").click(); await page.waitForTimeout(150);
  const [x, y] = await page.evaluate(() => { const r = document.querySelector("main div").getBoundingClientRect(); return [r.left + 24, r.top + 8]; });
  await page.mouse.click(x, y); await page.waitForTimeout(500);
  const pb = await host.locator("#panel").boundingBox(), rb = await host.locator(".rail").boundingBox();
  console.log(name, "panel:", JSON.stringify({ x: Math.round(pb.x), w: Math.round(pb.width), bottom: Math.round(pb.y + pb.height), h: Math.round(pb.height) }), "rail:", JSON.stringify({ top: Math.round(rb.y), h: Math.round(rb.height) }), "head:", await page.evaluate(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel .head").getBoundingClientRect().height)), "view:", await host.evaluate((n) => n.view), "scope:", await host.evaluate((n) => n.lens.scope.css?.localName), "bg:", await page.evaluate(() => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel")).backgroundColor));
  await page.screenshot({ path: `sheet-${name}.png` });
  await host.locator("#panel .close").click(); await page.waitForTimeout(300);
  const rb2 = await host.locator(".rail").boundingBox();
  console.log(name, "after close: open:", await host.evaluate((n) => n.hasAttribute("open")), "rail:", JSON.stringify({ x: Math.round(rb2.x), y: Math.round(rb2.y), w: Math.round(rb2.width) }));
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
