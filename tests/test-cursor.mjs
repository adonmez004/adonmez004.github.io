// The crosshair while the quick view is armed: the page's cursor, the box's own, the style node added and removed (v0.2: a page click opens the quick box and keeps the tool armed)
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
await openBox(page, host, "html"); await page.keyboard.press("Escape"); await page.waitForTimeout(200); // the lens stays armed after its click in v0.2: Escape ends it, the box stays
const probe = () => page.evaluate(() => {
  const h = document.querySelector("fm-inspector"), r = h.shadowRoot;
  const a = document.querySelector("a") || document.body;
  return { body: getComputedStyle(document.body).cursor, link: getComputedStyle(a).cursor, html: getComputedStyle(document.documentElement).cursor,
    rail: getComputedStyle(r.querySelector(".rail button")).cursor, head: getComputedStyle(r.querySelector(".head")).cursor, picking: h.hasAttribute("picking"), styles: document.head.querySelectorAll("style").length };
});
console.log("before", JSON.stringify(await probe()));
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
console.log("armed ", JSON.stringify(await probe()));
await page.mouse.click(640, 300); await page.waitForTimeout(300); // a pick keeps the picker armed
console.log("picked", JSON.stringify(await probe()));
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
console.log("esc   ", JSON.stringify(await probe()));
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
console.log("toggle", JSON.stringify(await probe()));
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector("fm-inspector").remove()); await page.waitForTimeout(200);
console.log("removed", await page.evaluate(() => ({ body: getComputedStyle(document.body).cursor, styles: document.head.querySelectorAll("style").length })));
console.log("errors:", errors);
await browser.close();
