// v0.1.16's checks on the v0.2 chrome: the box's height is one height on the HTML and CSS views; a click on the head's bare part folds the box to its head (desktop only, the resize edges hidden), the next raises it; on a phone a head click does not fold (the sheet's pull stands)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const [name, vp, mobile] of [["desktop", { width: 1280, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  const h = async () => Math.round((await host.locator("#panel").boundingBox()).height);
  await openBox(page, host, "html"); const hHtml = await h();
  await openBox(page, host, "css"); const hCss = await h();
  await openBox(page, host, "html");
  console.log(name, "heights html/css/html:", hHtml, hCss, await h());
  const folded = () => page.evaluate(() => document.querySelector("fm-inspector").shadowRoot.querySelector("#panel").hasAttribute("data-folded"));
  const hb = await host.locator("#panel .head").boundingBox();
  await page.mouse.click(hb.x + hb.width * 0.55, hb.y + 12); await page.waitForTimeout(200);
  console.log(name, "head click: folded:", await folded(), "height:", await h(), "rz visible:", await host.locator(".rz.s").isVisible(), mobile ? "(phones never fold)" : "(expect folded, the head alone, no rz)");
  if (mobile) { const b = await host.locator("#panel .head").boundingBox(); const x = b.x + 60, y = b.y + 8; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x, y + 20 * i); await page.mouse.up(); await page.waitForTimeout(150); console.log(name, "after a pull down 120: height:", await h(), "(expect smaller: the sheet shrinks)"); }
  else { const hb2 = await host.locator("#panel .head").boundingBox(); await page.mouse.click(hb2.x + hb2.width * 0.55, hb2.y + 12); await page.waitForTimeout(200); console.log(name, "second click: folded:", await folded(), "height:", await h(), "(expect raised)"); }
  await host.locator("#panel .close").click(); await page.waitForTimeout(200);
  console.log(name, "closed:", !(await host.evaluate((n) => n.hasAttribute("open"))));
  if (mobile) await page.screenshot({ path: "phone-rail.png" });
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
