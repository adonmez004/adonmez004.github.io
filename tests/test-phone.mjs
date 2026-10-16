// Phones, with real touch input (CDP touch events), v0.2: the rail is a strip along the foot, a tap on the HTML icon arms the lens and a tap on the page
// opens the bottom sheet at half the screen, a pull down stops at the head and never closes, a double tap on the head drops and raises it, two quick taps
// on two head buttons are two clicks, the close button alone closes, and a closed sheet keeps the quick view armed so a tap on the page opens its box.
import { launch, routeInspector, serve, BROWSER } from "./lib/browser.mjs";
const site = serve();
const browser = await launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
await routeInspector(page);
await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const cdp = BROWSER === "chromium" ? await ctx.newCDPSession(page) : null;
const touch = async (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const tap = async (x, y) => { await touch("touchStart", x, y); await touch("touchEnd", x, y); };
// the finger rests before it lifts: a lift mid-motion is a fling, and the browser spends the next tap on stopping it (native, not the inspector's)
const drag = async (x, y0, y1, steps = 8) => { await touch("touchStart", x, y0); for (let i = 1; i <= steps; i++) await touch("touchMove", x, y0 + ((y1 - y0) * i) / steps); await page.waitForTimeout(150); await touch("touchEnd", x, y1); };
const center = async (sel) => { const b = await host.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const panelH = () => sr(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel").getBoundingClientRect().height));
const open = () => sr(() => document.querySelector("fm-inspector").hasAttribute("open"));
if (!cdp) { console.log("touch input needs chromium's CDP; skipped under", BROWSER); await browser.close(); site.close(); process.exit(0); }

// 1. the rail is a strip along the foot; the HTML icon tapped arms the lens, a tap on the page opens the sheet at most half the screen
const rail = await host.locator(".rail").boundingBox();
console.log("rail: top", Math.round(rail.y), "height", Math.round(rail.height), "width", Math.round(rail.width), "(expect a 52px strip at the foot, full width)");
const html = await center(".htmlbtn");
await tap(html.x, html.y); await page.waitForTimeout(300);
console.log("HTML icon tapped: lens", await sr(() => document.querySelector("fm-inspector").hasAttribute("lens")), "open", await open(), "(expect armed, closed)");
const main = await page.locator("main").boundingBox();
await tap(main.x + 4, main.y + 4); await page.waitForTimeout(500);
const h0 = await panelH();
console.log("page tapped: open", await open(), "sheet height", h0, "(expect <= 422)", "resize edges shown:", await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".rz")].some((e) => getComputedStyle(e).display !== "none")));
// 2. a pull down shrinks the sheet to its head and never closes it
// a bare spot on the head, measured before every tap: the head moves with the sheet; its word buttons are clicks, not sheet taps
const spot = () => center("#panel .head .spacer");
let head = await spot();
await drag(head.x, head.y, head.y + 600); await page.waitForTimeout(400);
console.log("pulled down 600px: open", await open(), "sheet height", await panelH(), "(expect open, the head's height)");
// 3. a double tap on the head raises it, another drops it
const dbl = async () => { head = await spot(); await tap(head.x, head.y); await page.waitForTimeout(120); await tap(head.x, head.y); await page.waitForTimeout(400); };
await dbl();
console.log("double tap: sheet height", await panelH(), "(expect back to", h0 + ")");
await dbl();
console.log("double tap again: sheet height", await panelH(), "(expect the head's height)");
await dbl();
// 4. two quick taps on two different head buttons are two clicks, not a double tap: Show All then Selected Element
const all = await center(".vall"), scope = await center(".vscope");
await tap(all.x, all.y); await page.waitForTimeout(100); await tap(scope.x, scope.y); await page.waitForTimeout(400);
console.log("Show All then Selected Element, 100ms apart: pressed", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".vscope").getAttribute("aria-pressed")), "sheet height", await panelH(), "(expect Selected Element pressed, the sheet unchanged)");
// 5. the quick view armed from the strip (that closes the sheet, one tool at a time); a tap on the page opens the quick box
const pick = await center(".pickbtn");
await tap(pick.x, pick.y); await page.waitForTimeout(300);
console.log("quick view tapped: open", await open(), "picking", await sr(() => document.querySelector("fm-inspector").picking), "(expect the sheet closed, the tool armed)");
const h1 = await page.locator("h1").boundingBox();
await tap(h1.x + h1.width / 2, h1.y + h1.height / 2); await page.waitForTimeout(500);
console.log("tap on the h1: open", await open(), "view", await sr(() => document.querySelector("fm-inspector").view), "name", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector("#view-quick .qname")?.textContent.trim()), "chips:", await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .lb .n")].map((l) => l.textContent)));
// 6. the close button closes the sheet, the tool stays armed; a tap on the page reopens it full height
const close = await center("#panel .close");
await tap(close.x, close.y); await page.waitForTimeout(400);
console.log("closed with the quick view armed: open", await open(), "picking", await sr(() => document.querySelector("fm-inspector").picking));
await tap(h1.x + h1.width / 2, h1.y + h1.height / 2); await page.waitForTimeout(500);
console.log("reopened: open", await open(), "sheet height", await panelH(), "(expect", h0 + ")");
console.log("errors:", errors.length, errors.slice(0, 3));
await browser.close(); site.close();
