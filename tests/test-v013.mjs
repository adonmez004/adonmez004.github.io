// The v0.1.3 tour on the v0.2 chrome: the HTML view's rows, a fold by caret, a long text row, a pick by row click; the CSS view scoped to the card then Show All, swatches, a tick and Clear all; the quick view's probe and box, the Alt distance from a pick; the box under an OS dark scheme; a phone head that fits
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname);
const qrSrv = http.createServer((q, r) => { const f = path.join(QR, q.url.split("?")[0] === "/" ? "index.html" : q.url.split("?")[0]); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const QR_URL = `http://127.0.0.1:${qrSrv.address().port}/`;
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 1280, height: 900 }, colorScheme: opts.dark ? "dark" : "light" });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto(QR_URL, { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  return { ctx, page, host };
}
const sr = (page, fn) => page.evaluate(fn);
const lensDown = (page) => sr(page, () => { const i = document.querySelector("fm-inspector"); for (const w of ["html", "css"]) if (i.lens.armed === w) i.lens.arm(w, false); });
// the card's corners are rounded (20px): a lens click 2px into its corner lands on main, so the card is scoped by a click 12px in
const scopeCard = async (page, host) => { if (await sr(page, () => document.querySelector("fm-inspector").lens.armed) !== "css") { await host.locator(".cssbtn").click(); await page.waitForTimeout(150); } const [x, y] = await sr(page, () => { const r = document.querySelector("main > div").getBoundingClientRect(); return [r.left + 12, r.top + 12]; }); await page.mouse.click(x, y); await page.waitForTimeout(400); };
{
  const { ctx, page, host } = await open();
  // HTML view, the whole tree
  await openBox(page, host, "html"); await lensDown(page);
  const html = await sr(page, () => { const r = document.querySelector("fm-inspector").shadowRoot; return [...r.querySelectorAll("#view-html .row")].filter((n) => !n.hidden).map((n) => n.textContent.trim().slice(0, 40)); });
  console.log("rows:", JSON.stringify(html));
  await page.screenshot({ path: "v013-html.png" });
  // fold main
  const mainRow = host.locator("#view-html .row", { hasText: /^<main>/ }).first();
  await mainRow.locator(".caret").click(); await page.waitForTimeout(100);
  console.log("after fold main, visible rows:", await sr(page, () => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-html .row")].filter((n) => !n.hidden).length), "folded text:", await mainRow.evaluate((n) => n.textContent.trim()));
  await mainRow.locator(".caret").click(); await page.waitForTimeout(100);
  // unfold h1 text
  const h1Row = host.locator("#view-html .row", { hasText: /^<h1>/ }).first();
  console.log("h1 folded:", await h1Row.evaluate((n) => n.textContent.trim()));
  await h1Row.locator(".caret").click(); await page.waitForTimeout(100);
  console.log("h1 open:", await h1Row.evaluate((n) => n.textContent.trim()));
  // pick the div via row click
  const divRow = host.locator("#view-html .row", { hasText: /^<div/ }).first();
  await divRow.locator(".pickrow").click(); await page.waitForTimeout(300);
  console.log("div picked:", await divRow.getAttribute("data-picked"), "boxes on the page:", await sr(page, () => document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .pick").length));
  await page.screenshot({ path: "v013-html-picked.png" });
  // CSS view scoped to the card
  await scopeCard(page, host); await lensDown(page);
  const css = await sr(page, () => { const r = document.querySelector("fm-inspector").shadowRoot; return [...r.querySelectorAll("#view-css .gh")].map((n) => n.textContent.trim()); });
  console.log("css groups (scoped to the card):", JSON.stringify(css));
  console.log("swatches:", await sr(page, () => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d .sw:not([hidden])")].map((n) => n.style.background)));
  await page.screenshot({ path: "v013-css.png" });
  // untick padding-inline, check page, Clear all (it closes the box: reopen)
  const bg = () => page.evaluate(() => getComputedStyle(document.querySelector("main div")).paddingLeft);
  const row = host.locator("#view-css .d", { hasText: "padding-inline" }).first();
  await row.locator("input").click(); await page.waitForTimeout(150);
  console.log("padding after untick:", await bg(), "row off:", await row.evaluate((n) => n.classList.contains("off")));
  await host.locator(".reset").click(); await page.waitForTimeout(150);
  await scopeCard(page, host); await lensDown(page);
  console.log("padding after Clear all:", await bg(), "row off:", await host.locator("#view-css .d", { hasText: "padding-inline" }).first().evaluate((n) => n.classList.contains("off")));
  // Show All: the full sheet
  await host.locator(".vall").click(); await page.waitForTimeout(200);
  console.log("full sheet groups:", await sr(page, () => document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .grp").length));
  await page.screenshot({ path: "v013-css-full.png" });
  // the quick view: probe, its box, the state pill; the Alt distance from a pick
  await host.locator(".pickbtn").click(); await page.waitForTimeout(100);
  console.log("state pill visible:", await sr(page, () => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector(".state")).display));
  const h1 = await page.locator("h1").boundingBox(), p = await page.locator("p").boundingBox(), img = await page.locator("img").boundingBox();
  await page.mouse.move(h1.x + 10, h1.y + 10); await page.waitForTimeout(150);
  console.log("probe chip:", await sr(page, () => document.querySelector("fm-inspector").shadowRoot.querySelector(".ov .probe .lb .n")?.closest(".lb").textContent), "(the name chip; the quick view paints the bands too)");
  await page.screenshot({ path: "v013-probe.png" });
  await page.mouse.click(h1.x + 10, h1.y + 10); await page.waitForTimeout(300);
  console.log("quick box:", await sr(page, () => { const i = document.querySelector("fm-inspector"); return { open: i.hasAttribute("open"), view: i.view, head: i.shadowRoot.querySelector("#view-quick .qname")?.textContent.trim(), lines: [...i.shadowRoot.querySelectorAll("#view-quick .lim")].map((n) => n.querySelector(".rp")?.textContent) }; }));
  await page.mouse.click(p.x + 10, p.y + 10); await page.waitForTimeout(300);
  console.log("quick box on the p:", await sr(page, () => document.querySelector("fm-inspector").shadowRoot.querySelector("#view-quick .qname")?.textContent.trim()));
  await page.mouse.move(600, 100); await page.waitForTimeout(100);
  await page.screenshot({ path: "v013-quick.png" });
  // the Alt distance: from a picked p (the HTML row's pick, the newest pick is the focus) to the img under the pointer: the gap between the two boxes
  await sr(page, () => { const i = document.querySelector("fm-inspector"); const el = document.querySelector("p"); if (!i.picks.has(el)) i.pick(el, i.rows.get(el)); });
  await page.keyboard.down("Alt"); await page.mouse.move(img.x + 20, img.y + 20); await page.waitForTimeout(150);
  console.log("alt distance from the picked p to the img:", await sr(page, () => { const r = document.querySelector("fm-inspector").shadowRoot; return { dbox: r.querySelectorAll(".ov .dbox").length, chip: r.querySelector(".ov .dch")?.textContent }; }));
  await page.screenshot({ path: "v013-dist.png" });
  await page.keyboard.up("Alt");
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  console.log("picking after esc:", await host.locator(".pickbtn").getAttribute("aria-pressed"));
  await ctx.close();
}
{
  const { ctx, page, host } = await open({ dark: true });
  await scopeCard(page, host);
  await page.mouse.move(600, 100); await page.waitForTimeout(100);
  console.log("dark box background:", await sr(page, () => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel")).backgroundColor));
  await page.screenshot({ path: "v013-dark.png" });
  await ctx.close();
}
{
  const { ctx, page, host } = await open({ width: 390 });
  await scopeCard(page, host);
  await page.screenshot({ path: "v013-phone.png" });
  console.log("phone head fits:", await sr(page, () => { const h = document.querySelector("fm-inspector").shadowRoot.querySelector("#panel .head"); return h.scrollWidth <= h.clientWidth; }));
  await ctx.close();
}
console.log("errors:", errors);
await browser.close(); qrSrv.close();
