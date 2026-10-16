// The rail's Remove button (v0.2: no pill badge, the button stands in the rail at rest): a CSS edit made in the box, the box closed, Remove takes the inspector away with the edit undone until the next load; desktop and phone
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const [name, width, touch] of [["desktop", 1280, false], ["phone", 390, true]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, ...(touch ? { isMobile: true } : {}) });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(name + ": " + m.text()); });
  page.on("pageerror", (e) => errors.push(name + ": " + e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  const bye = () => page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot, b = sh.querySelector(".bye"), r = b.getBoundingClientRect(); return { display: getComputedStyle(b).display, opacity: getComputedStyle(b).opacity, inRail: !!b.closest(".rail"), label: b.getAttribute("aria-label"), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inside: r.right <= innerWidth && r.bottom <= innerHeight, vw: innerWidth }; });
  await page.mouse.move(10, 10);
  console.log(name, "rest:", JSON.stringify(await bye()), "(expect shown, in the rail, inside the viewport)");
  await openBox(page, host, "css");
  console.log(name, "open: bye still shown:", (await bye()).display !== "none");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await bg();
  await host.locator("#view-css .d", { hasText: "background-color: #D5E1EF" }).first().locator("input").click(); await page.waitForTimeout(200);
  console.log(name, "body bg before/after untick:", before, await bg());
  await host.locator("#panel .close").click(); await page.waitForTimeout(300);
  console.log(name, "closed: open attr:", await page.evaluate(() => document.querySelector("fm-inspector").hasAttribute("open")), "bye shown:", (await bye()).display !== "none");
  const b = await host.locator(".bye").boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300);
  console.log(name, "after Remove: host count:", await host.count(), "body bg restored:", (await bg()) === before);
  await page.setViewportSize({ width: width - 100, height: 800 }); await page.evaluate(() => scrollTo(0, 50)); await page.waitForTimeout(300);
  await page.screenshot({ path: `bye-${name}-gone.png` });
  await page.reload({ waitUntil: "networkidle" });
  console.log(name, "after reload: host count:", await host.count());
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
