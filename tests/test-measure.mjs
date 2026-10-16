// The ruler (Show all sizes): every rendered element's frame, size chip, padding / margin / border bands with values, on desktop and phone; off again on a second press and on Clear all (v0.2: a rail icon)
import { chromium } from "playwright";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 900 } }], ["phone", { viewport: { width: 390, height: 844 } }]]) {
  const page = await browser.newPage(opts); page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto(`file://${process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname}index.html`); await page.waitForTimeout(300);
  const host = page.locator("fm-inspector");
  // v0.2: the ruler is a rail icon, no box needed; it sits right after the resize icon
  const btn = await page.evaluate(() => { const b = document.querySelector("fm-inspector").shadowRoot.querySelector(".rail .measure"); const r = b.getBoundingClientRect(); const size = b.previousElementSibling.getBoundingClientRect(); return { w: r.width, h: r.height, afterSize: Math.round(innerWidth <= 480 ? r.left - size.right : r.top - size.bottom), label: b.getAttribute("aria-label"), pressed: b.getAttribute("aria-pressed") }; });
  console.log(name, "button:", JSON.stringify(btn));
  const t0 = Date.now(); await host.locator(".measure").click(); await page.waitForTimeout(400); const dt = Date.now() - t0;
  const ov = () => page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const q = (s) => sh.querySelectorAll(s).length; return { groups: q(".ov .pick.ruler"), boxes: q(".ov .ruler .box"), sizes: q(".ov .ruler .lb.sz"), names: q(".ov .ruler .lb:not(.sz):not(.pv):not(.mv):not(.bv)"), pad: q(".ov .ruler .pd"), padLabels: q(".ov .ruler .lb.pv"), mar: q(".ov .ruler .mr"), marLabels: q(".ov .ruler .lb.mv"), bord: q(".ov .ruler .bd"), bordLabels: q(".ov .ruler .lb.bv"), elements: [document.body, ...document.body.querySelectorAll("*")].filter((e) => !e.closest("fm-inspector") && e.getClientRects().length).length, pressed: sh.querySelector(".measure").getAttribute("aria-pressed"), attr: document.querySelector("fm-inspector").hasAttribute("measuring") }; });
  console.log(name, "measuring:", JSON.stringify(await ov()), "paint ms <", dt);
  const sample = await page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll(".ov .pick.ruler")].find((g) => g.querySelector(".lb .n")?.textContent.startsWith("div")); return { name: g.querySelector(".lb .n").textContent, sizes: [...g.querySelectorAll(".lb.sz")].map((l) => l.textContent), pad: [...g.querySelectorAll(".lb.pv")].map((l) => l.textContent), mar: [...g.querySelectorAll(".lb.mv")].map((l) => l.textContent), bord: [...g.querySelectorAll(".lb.bv")].map((l) => l.textContent), cs: (() => { const el = document.querySelector("div"); const c = getComputedStyle(el); return { pad: c.padding, mar: c.margin, bord: c.borderWidth, w: el.getBoundingClientRect().width }; })() }; });
  console.log(name, "first div:", JSON.stringify(sample));
  await host.locator(".measure").click(); await page.waitForTimeout(200);
  console.log(name, "off:", JSON.stringify(await ov()));
  await host.locator(".measure").click(); await page.waitForTimeout(200); await host.locator(".reset").click(); await page.waitForTimeout(200);
  console.log(name, "after reset:", JSON.stringify(await ov()));
  await page.screenshot({ path: `shot-measure-${name}.png` });
}
console.log("errors:", JSON.stringify(errors));
await browser.close();
