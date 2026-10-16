import { launch, routeInspector, serve } from "../lib/browser.mjs";
const site = serve(); const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); await routeInspector(page); await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector"); const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const state = () => page.evaluate(() => { const i = document.querySelector("fm-inspector"); const p = i.shadowRoot.querySelector(".panel"); return `h ${Math.round(p.getBoundingClientRect().height)} sheet "${p.style.getPropertyValue("--sheet")}" dragged ${!!i.dragged} clicks ${JSON.stringify(window.__ev)}`; });
await page.touchscreen.tap(195, 800); await page.waitForTimeout(500);
await page.evaluate(() => { const i = document.querySelector("fm-inspector"); window.__ev = []; i.shadowRoot.querySelector(".head").addEventListener("click", (e) => window.__ev.push(`${Math.round(performance.now())}:${e.target.className}:${Math.round(e.clientY)}`)); });
const spot = async () => { const b = await host.locator(".spacer").boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
let s = await spot();
await touch("touchStart", s.x, s.y); for (let i = 1; i <= 8; i++) await touch("touchMove", s.x, s.y + 75 * i); await touch("touchEnd", s.x, s.y + 600); await page.waitForTimeout(400);
console.log("after drag:", await state());
for (let n = 1; n <= 3; n++) { s = await spot(); console.log("spot", Math.round(s.x), Math.round(s.y)); await touch("touchStart", s.x, s.y); await touch("touchEnd", s.x, s.y); await page.waitForTimeout(120); await touch("touchStart", s.x, s.y); await touch("touchEnd", s.x, s.y); await page.waitForTimeout(400); console.log(`dbl ${n}:`, await state()); }
await browser.close(); site.close();
