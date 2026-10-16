import { launch, routeInspector, blockFonts, serve } from "../lib/browser.mjs";
const site = serve(); const browser = await launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await routeInspector(page); await blockFonts(page); await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector"); await host.locator(".fab").click(); await page.waitForTimeout(400); await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
const sr = (fn, a) => page.evaluate(fn, a);
await sr(() => { const r = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } }).find((r) => r.selectorText === "div"); r.style.removeProperty("max-inline-size"); }); await page.waitForTimeout(700);
const st = () => sr(() => { const i = document.querySelector("fm-inspector"); const w = (s) => Math.round(document.querySelector(s).getBoundingClientRect().width); return { card: w("main div"), main: w("main"), body: w("body"), note: i.shadowRoot.querySelector(".wblock").textContent, cap: i.resize.cap.x, hugs: i.resize.hugs.size }; });
for (const want of [400, 700, 1000, 1300, 2000]) { await sr((want) => { const i = document.querySelector("fm-inspector"), el = document.querySelector("main div"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, want); i.finishResize(s, false); i.resize.explain(el, want); }, want); await page.waitForTimeout(200); console.log("card ->", want, JSON.stringify(await st())); }
await browser.close(); site.close();
