// Visual regression on the v0.2 chrome: the overlay and the boxes in seven fixed states, each screenshot saved beside the output (visual-<state>.png) and summed up as a
// 16x9 luminance grid plus a hash. A grid that differs from the last run is a layout change worth looking at; a hash that differs alone is noise. (v0.2 baselines: the rail, no pill, no theme toggle.)
import { launch, routeInspector, blockFonts, serve, signature, openBox } from "./lib/browser.mjs";
import fs from "node:fs";
const site = serve();
const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
await routeInspector(page); await blockFonts(page);
await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const shot = async (state, clip = null) => {
  await page.waitForTimeout(400);
  const png = await page.screenshot(clip ? { clip } : { fullPage: false });
  fs.writeFileSync(`visual-${state}.png`, png);
  const { grid, sha } = await signature(page, png);
  console.log(`${state}: grid ${grid} sha ${sha}`);
};
const panelBox = async () => { const b = await host.locator("#panel").boundingBox(); return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, 1280 - b.x), height: Math.min(b.height, 900 - b.y) }; };
const lensDown = () => sr(() => { const i = document.querySelector("fm-inspector"); for (const w of ["html", "css"]) if (i.lens.armed === w) i.lens.arm(w, false); });

// 1. closed: the rail alone
await shot("closed");
// 2. open on the HTML view, the whole tree
await openBox(page, host, "html"); await lensDown(); await page.mouse.move(640, 60);
await shot("open-html");
// 3. a pick on the h1 (the HTML row's pick): box, chip, dims, guides; the CSS view on its rules
await sr(() => document.querySelector("fm-inspector").select(document.querySelector("h1"))); await page.waitForTimeout(400);
await shot("pick-h1");
// 4. the ruler: every element's bands and chips (it closes the box)
await host.locator(".measure").click(); await page.waitForTimeout(500);
await shot("eye");
await host.locator(".measure").click(); await page.waitForTimeout(200);
// 5. a pinned padding declaration: its reach painted (the CSS view on every stylesheet)
await openBox(page, host, "css"); await lensDown();
await sr(() => { const i = document.querySelector("fm-inspector"); const d = i.store.allDecls.find((d) => d.model.selector === "div" && d.prop === "padding-inline"); i.pins.add(d); i.rowOf.get(d)?.row.classList.add("on"); i.paint(); });
await page.mouse.move(640, 60);
await shot("pin-padding");
await sr(() => { const i = document.querySelector("fm-inspector"); i.pins.clear(); i.paint(); });
// 6. the resize tool on the card, dragged 40px narrower: frame, handle, the size box with the difference
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.querySelector("main > div"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, el.getBoundingClientRect().width - 40); i.finishResize(s, false); });
await shot("resize-card");
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
// 7. the quick view on the p: bands and the box model
await host.locator(".pickbtn").click(); await page.waitForTimeout(100);
const p = await page.locator("p").boundingBox(); await page.mouse.click(p.x + 10, p.y + 10); await page.waitForTimeout(300); await page.mouse.move(640, 60);
await shot("quick-p");
await shot("quick-p-box", await panelBox());
console.log("errors:", errors.length, errors.slice(0, 3));
await browser.close(); site.close();
