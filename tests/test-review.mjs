// The v0.1.x outside reviews' checks on v0.2: parsing oddities, a shorthand untick and Clear all, a duplicate colour, the 28.0px and nonsense edits, an inactive @media hover, the host removed while a tool is armed; phones: the quick view's probe, no resize edges, the rail at the foot, a page tap above it
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
const EXTRA = `
??? { color: red; }
.probe { margin: 10px; margin-left: 20px; color: red; color: blue; }
h1 { letter-spacing: 1px; &:hover { color: blue; } word-spacing: 2px; }
:root { --blob: { a: b; c: d }; --plain: 3px; }
@media (max-width: 100px) { p { color: rgb(1, 2, 3); } }
`;
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 1280, height: 900 }, hasTouch: !!opts.mobile, isMobile: !!opts.mobile });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.route("https://demo.frontendmentorsolutions.io/qr-code-component/", async (r) => { const res = await r.fetch(); let html = await res.text(); html = html.replace("</head>", `<style>${EXTRA}</style></head>`).replace("<main>", '<main><span class="probe">x</span>'); await r.fulfill({ response: res, body: html, headers: { ...res.headers(), "content-type": "text/html" } }); });
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  if (!opts.mobile) await openBox(page, host, "html");
  return { ctx, page, host };
}
{
  const { ctx, page, host } = await open();
  console.log("data-version:", await host.getAttribute("data-version"));
  await openBox(page, host, "css");
  const clearAll = async () => { await host.locator(".reset").click(); await page.waitForTimeout(150); await openBox(page, host, "css"); }; // Clear all closes the box in v0.2: reopen on Show All
  console.log("box after the CSS lens:", await page.evaluate(() => { const h = document.querySelector("fm-inspector"); return `open=${h.hasAttribute("open")} view=${h.view} all=${h.shadowRoot.querySelector(".vall").getAttribute("aria-pressed")}`; }));
  // left handle height
  console.log("rz.w height:", await page.evaluate(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector(".rz.w").getBoundingClientRect().height)), "rz.e:", await page.evaluate(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector(".rz.e").getBoundingClientRect().height)));
  // parsing: groups rendered, nested rule note, custom property with braces, the rule after the dropped one is live
  const info = await page.evaluate(() => { const r = document.querySelector("fm-inspector").shadowRoot; const groups = [...r.querySelectorAll("#view-css .grp")].map((g) => ({ sel: g.querySelector(".sel").textContent, rows: [...g.querySelectorAll(".d")].map((d) => d.textContent.trim().slice(0, 40) + (d.classList.contains("na") ? " [na]" : "")), notes: [...g.querySelectorAll(".cm")].map((c) => c.textContent.slice(0, 40)) })); return groups.filter((g) => /\?\?\?|probe|^h1$|:root|^p$/.test(g.sel)); });
  console.log("parsed:", JSON.stringify(info));
  const probe = (prop) => page.evaluate((prop) => getComputedStyle(document.querySelector(".probe"))[prop], prop);
  console.log("probe before:", await probe("marginLeft"), await probe("marginTop"), await probe("color"));
  // untick margin (shorthand) -> margin-left stays 20px by source order; reset -> back
  const row = (sel, txt) => host.locator("#view-css .grp", { has: page.locator(".sel", { hasText: new RegExp("^" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }) }).locator(".d", { hasText: txt }).first();
  await row(".probe", "margin: 10px").locator("input").click(); await page.waitForTimeout(150);
  console.log("after unticking margin shorthand: left/top:", await probe("marginLeft"), await probe("marginTop"));
  await clearAll();
  console.log("after reset: left/top:", await probe("marginLeft"), await probe("marginTop"));
  // duplicate color: untick the second (blue) -> red; untick first too -> initial; reset -> blue
  await row(".probe", "color: blue").locator("input").click(); await page.waitForTimeout(150);
  console.log("after unticking color: blue ->", await probe("color"));
  await clearAll();
  console.log("after reset color:", await probe("color"));
  // 28.0px accepted on h1 font-size
  const fs = row("h1", "font-size:");
  await fs.locator(".v").click(); await page.waitForTimeout(100);
  await page.keyboard.press("Control+A"); await page.keyboard.type("28.0px"); await page.waitForTimeout(100);
  console.log("28.0px invalid flag:", await host.locator("#view-css .ed").getAttribute("aria-invalid"), "h1 size:", await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontSize));
  await page.keyboard.press("Enter"); await page.waitForTimeout(100);
  await fs.locator(".v").click(); await page.keyboard.press("Control+A"); await page.keyboard.type("nonsense"); await page.waitForTimeout(100);
  console.log("nonsense invalid flag:", await host.locator("#view-css .ed").getAttribute("aria-invalid"));
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  await clearAll();
  // inactive media rule paints nothing when hovered
  await row("p", "rgb(1, 2, 3)").hover(); await page.waitForTimeout(200);
  console.log("inactive @media hover boxes:", await page.evaluate(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .decl .box").length), "(the scope frame aside)");
  // removal from the DOM while picking: no listeners left behind
  await host.locator(".pickbtn").click(); await page.waitForTimeout(100);
  await page.evaluate(() => document.querySelector("fm-inspector").remove());
  const h1 = await page.locator("h1").boundingBox();
  await page.mouse.click(h1.x + 5, h1.y + 5);
  console.log("after external remove: host gone:", await page.evaluate(() => !document.querySelector("fm-inspector")));
  await ctx.close();
}
{
  const { ctx, page, host } = await open({ vp: { width: 390, height: 844 }, mobile: true });
  await host.locator(".pickbtn").click(); await page.waitForTimeout(100);
  const img = await page.locator("img").boundingBox();
  await page.mouse.click(img.x + 10, img.y + 10); await page.waitForTimeout(400);
  const box = () => page.evaluate(() => { const n = document.querySelector("fm-inspector").shadowRoot.querySelector(".ov .box"); if (!n) return null; const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width)]; });
  console.log("mobile quick view open:", await page.evaluate(() => { const h = document.querySelector("fm-inspector"); return `open=${h.hasAttribute("open")} view=${h.view}`; }));
  console.log("mobile img rect:", JSON.stringify([Math.round(img.x), Math.round(img.y), Math.round(img.width)]), "overlay open:", JSON.stringify(await box()));
  console.log("mobile rz displayed:", await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".rz")].filter((n) => getComputedStyle(n).display !== "none").length));
  await host.locator("#panel .close").click(); await page.waitForTimeout(300);
  console.log("overlay after close:", JSON.stringify(await box()), "rail at the foot:", await page.evaluate(() => { const b = document.querySelector("fm-inspector").shadowRoot.querySelector(".rail").getBoundingClientRect(); return `${Math.round(b.left)}..${Math.round(b.right)} x ${Math.round(b.top)}..${Math.round(b.bottom)}`; }));
  // the quick view is still armed after the x: Escape ends it; then a tap above the rail reaches the page, a tap on the rail does not
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  await page.evaluate(() => { window.__hit = 0; document.body.addEventListener("click", () => window.__hit++); });
  await page.mouse.click(40, 700); await page.waitForTimeout(100);
  console.log("page click above the rail reaches the page:", await page.evaluate(() => window.__hit));
  await page.mouse.click(40, 820); await page.waitForTimeout(100);
  console.log("click on the rail strip:", await page.evaluate(() => window.__hit), "(2: the rail is in the host, a click on it bubbles through to the body like any element's)");
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
