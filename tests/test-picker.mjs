// The quick view's arming and ending (v0.2, it replaced the picker): the icon reads pressed, a hover paints the probe and its chip, a click opens the quick
// box on that element without leaving the page, a second click on the same element keeps it, Escape ends the tool and closes its box.
import { chromium } from "playwright";
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
const st = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"), r = i.shadowRoot; return { picking: r.querySelector(".pickbtn").getAttribute("aria-pressed"), attr: i.hasAttribute("picking"), probe: r.querySelectorAll(".ov .probe").length, open: i.hasAttribute("open"), view: i.view, name: r.querySelector("#view-quick .qname")?.textContent.trim() || null, chips: [...r.querySelectorAll(".ov .lb .n")].map((n) => n.textContent), state: getComputedStyle(r.querySelector(".state")).display !== "none" ? r.querySelector(".state").textContent : null }; });
await page.screenshot({ path: "picker-0.png", clip: { x: 800, y: 350, width: 480, height: 60 } });
await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
console.log("armed:", JSON.stringify(await st()), "(expect pressed, no box yet, the state pill)");
const h1 = await page.locator("h1").boundingBox();
await page.mouse.move(h1.x + 10, h1.y + 10); await page.waitForTimeout(200);
console.log("hover h1:", JSON.stringify(await st()), "(expect one probe, the h1 chip, still no box)");
await page.screenshot({ path: "picker-hover.png" });
const p = await page.locator("p").boundingBox();
await page.mouse.move(p.x + 10, p.y + 10); await page.waitForTimeout(150);
await page.mouse.click(p.x + 10, p.y + 10); await page.waitForTimeout(400);
console.log("click p:", JSON.stringify(await st()), "(expect the quick box open on p)");
console.log("page url unchanged:", page.url().endsWith("/qr-code-component/"));
await page.screenshot({ path: "picker-picked.png" });
// a second click on the same element keeps the box on it
await page.mouse.click(p.x + 10, p.y + 10); await page.waitForTimeout(300);
console.log("click p again:", JSON.stringify((await st()).name));
// Escape ends the tool and closes its box
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
console.log("esc:", JSON.stringify(await st()), "(expect the tool off, the box closed)");
console.log("errors:", errors);
await browser.close();
