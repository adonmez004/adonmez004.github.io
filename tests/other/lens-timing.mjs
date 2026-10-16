import { launch, routeInspector, serve } from "../lib/browser.mjs";
const site = serve(); const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await routeInspector(page); await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector"); const sr = (fn, a) => page.evaluate(fn, a);
await sr(() => { const i = document.querySelector("fm-inspector"); const orig = i.store.load.bind(i.store); window.__loads = []; i.store.load = async () => { const t = performance.now(); await orig(); window.__loads.push(Math.round(performance.now() - t)); }; });
const at = async (sel) => { const b = await page.locator(sel).boundingBox(); return [b.x + 10, b.y + 8]; };
const measure = async (which, sel) => {
  await host.locator(`.${which}btn`).click(); await page.waitForTimeout(150);
  const [x, y] = await at(sel);
  await sr(() => { window.__t0 = performance.now(); window.__shown = null; const i = document.querySelector("fm-inspector"); const view = i.shadowRoot.querySelector("#view-" + (i.lens.armed)); const mo = new MutationObserver(() => { if (view.childElementCount && !window.__shown) { window.__shown = Math.round(performance.now() - window.__t0); } }); mo.observe(view, { childList: true, subtree: true }); });
  await page.mouse.click(x, y); await page.waitForTimeout(1500);
  const r = await sr(() => ({ untilRows: window.__shown, open: document.querySelector("fm-inspector").hasAttribute("open"), storeLoads: window.__loads.splice(0) }));
  console.log(`${which} click on ${sel}:`, JSON.stringify(r));
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
};
await measure("html", "h1"); await measure("html", "p"); await measure("css", "p"); await measure("css", "h1");
await page.keyboard.press("Escape"); await measure("css", "img"); await measure("html", "img");
await browser.close(); site.close();
