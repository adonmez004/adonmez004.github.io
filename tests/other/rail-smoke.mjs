import { launch, routeInspector, blockFonts, serve } from "../lib/browser.mjs";
import fs from "node:fs";
const site = serve(); const browser = await launch();
for (const [name, vp, touch] of [["desktop", { width: 1280, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await routeInspector(page); await blockFonts(page); await page.goto(site.url, { waitUntil: "networkidle" });
  const host = page.locator("fm-inspector");
  const sr = (fn, a) => page.evaluate(fn, a);
  const state = () => sr(() => { const i = document.querySelector("fm-inspector"), sh = i.shadowRoot; return { open: i.hasAttribute("open"), view: i.view, html: !sh.querySelector("#view-html").hidden, css: !sh.querySelector("#view-css").hidden, htmlExp: sh.querySelector(".htmlbtn").getAttribute("aria-expanded"), cssExp: sh.querySelector(".cssbtn").getAttribute("aria-expanded"), rail: Math.round(sh.querySelector(".rail").getBoundingClientRect().right), panel: (() => { const r = sh.querySelector(".panel").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })() }; });
  console.log(`== ${name}`); console.log("closed:", JSON.stringify(await state()));
  await page.screenshot({ path: `rail-${name}-closed.png` });
  await host.locator(".htmlbtn").click(); await page.waitForTimeout(500); console.log("html click:", JSON.stringify(await state()));
  await page.screenshot({ path: `rail-${name}-html.png` });
  await host.locator(".cssbtn").click(); await page.waitForTimeout(400); console.log("css click:", JSON.stringify(await state()));
  await host.locator(".pickbtn").click(); await page.waitForTimeout(200);
  const h1 = await page.locator("h1").boundingBox(); if (touch) await page.touchscreen.tap(h1.x + 20, h1.y + 10); else await page.mouse.click(h1.x + 20, h1.y + 10); await page.waitForTimeout(500);
  console.log("pick h1:", JSON.stringify(await state()), "picks", await sr(() => document.querySelector("fm-inspector").picks.size), "hits", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .grp.hit").length));
  await page.screenshot({ path: `rail-${name}-pick.png` });
  await host.locator(".cssbtn").click(); await page.waitForTimeout(300); console.log("css click again (closes):", JSON.stringify(await state()));
  await host.locator(".htmlbtn").click(); await page.waitForTimeout(300); await host.locator(".close").click(); await page.waitForTimeout(300); console.log("close button:", JSON.stringify(await state()), "picking still", await sr(() => document.querySelector("fm-inspector").picking));
  await host.locator(".theme").click(); await host.locator(".htmlbtn").click(); await page.waitForTimeout(400); await page.screenshot({ path: `rail-${name}-dark.png` });
  if (!touch) { const head = await host.locator(".head").boundingBox(); await page.mouse.move(head.x + 40, head.y + 12); await page.mouse.down(); await page.mouse.move(head.x - 300, head.y + 200, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200); console.log("dragged:", JSON.stringify(await state())); }
  await page.keyboard.press("Escape"); await page.waitForTimeout(200); console.log("Escape:", JSON.stringify(await state()));
  console.log("errors:", errors);
  await ctx.close();
}
await browser.close(); site.close();
