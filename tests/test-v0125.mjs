// v0.1.25's checks on v0.2: two rules in one @media (the page changes one, we edit the other), a page-added declaration before two quick edits, adopted sheets reordered; a drag from a head button survives the child's lostpointercapture; a phone still click on a head button keeps the focus and a pull from it still pulls; a very short screen
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errors.push(m.text()); }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const cs = (sel, prop) => sr(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
const rowAt = (prop, idx) => `[...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].filter((d) => d.querySelector(".t").textContent.trim() === "${prop}:")[${idx}]`;
const rowIn = (sel, prop) => `(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll("#view-css .grp")].find((g) => g.querySelector(".gh .sel").textContent.trim() === "${sel}"); return [...g.querySelectorAll(".d")].find((d) => d.querySelector(".t").textContent.trim() === "${prop}:"); })()`;
const tickIn = async (sel, prop) => { await sr(`${rowIn(sel, prop)}.querySelector("input").click()`); await page.waitForTimeout(80); };
const valueIn = (sel, prop) => sr(`${rowIn(sel, prop)}?.querySelector(".v")?.textContent`);
const rowsIn = (sel) => sr(`(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll("#view-css .grp")].find((g) => g.querySelector(".gh .sel").textContent.trim() === "${sel}"); return [...g.querySelectorAll(".d")].map((d) => d.querySelector(".t").textContent.trim()); })()`);
const heads = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()));
await openBox(page, host, "css"); await sr(() => document.querySelector("fm-inspector").lens.arm("css", false)); await page.waitForTimeout(300);
// 1. two rules in one @media: the page changes one, we edit the other right away
await sr(() => { const s = document.styleSheets[0]; s.insertRule("@media (min-width: 1px) { .sib-a { color: rgb(255, 0, 0); } .sib-b { color: rgb(0, 128, 0); padding: 2px; } }", s.cssRules.length); });
await page.waitForTimeout(900);
console.log("1 media group listed:", (await heads()).includes(".sib-a"));
await sr(() => { const s = document.styleSheets[0]; const m = [...s.cssRules].find((r) => r.media && r.media.mediaText === "(min-width: 1px)"); m.cssRules[0].style.color = "rgb(0, 0, 255)"; });
await tickIn(".sib-b", "padding"); await page.waitForTimeout(1200);
console.log("1 sibling's page change shown after our edit of the other:", await valueIn(".sib-a", "color"), "(expect rgb(0, 0, 255))");
// 2. page adds a decl to a rule, then two quick own edits on that rule before the poll
await sr(() => { const s = document.styleSheets[0]; const m = [...s.cssRules].find((r) => r.media && r.media.mediaText === "(min-width: 1px)"); m.cssRules[1].style.setProperty("outline", "1px solid rgb(1, 1, 1)"); });
await tickIn(".sib-b", "color"); await tickIn(".sib-b", "color"); await page.waitForTimeout(1200);
console.log("2 page-added outline listed after two quick edits:", (await rowsIn(".sib-b")).includes("outline:"), "live outline:", await cs(".note", "outlineWidth"));
// 3. adopted sheets reordered: the same texts in a new order
await sr(() => { const a = new CSSStyleSheet(); a.replaceSync(".note { color: rgb(200, 0, 0); }"); const b = new CSSStyleSheet(); b.replaceSync(".note { color: rgb(0, 0, 200); }"); window.ab = [a, b]; document.adoptedStyleSheets = [a, b]; });
await page.waitForTimeout(900);
const adoptedOrder = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .cm")].map((n) => n.textContent.trim()).filter((t) => t.includes("adopted")));
console.log("3 before reorder:", await cs(".note", "color"), JSON.stringify(await adoptedOrder()), await sr(() => { const sh = document.querySelector("fm-inspector").shadowRoot; return [...sh.querySelectorAll("#view-css .grp .d .v")].map((v) => v.textContent).filter((t) => /200/.test(t)); }));
await sr(() => { document.adoptedStyleSheets = [window.ab[1], window.ab[0]]; }); await page.waitForTimeout(1200);
console.log("3 after reorder:", await cs(".note", "color"), await sr(() => { const sh = document.querySelector("fm-inspector").shadowRoot; return [...sh.querySelectorAll("#view-css .grp .d .v")].map((v) => v.textContent).filter((t) => /200/.test(t)); }), "(expect the panel's order flipped too)");
// 4. a child's lostpointercapture bubbling through the head must not cancel a drag
const before = await sr(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel").getBoundingClientRect().x));
{ const b = await host.locator(".vall").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 40, y - 10); await page.mouse.move(x - 80, y - 20);
  await sr(() => { const t = document.querySelector("fm-inspector").shadowRoot.querySelector(".vall"); t.dispatchEvent(new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 1 })); });
  await page.mouse.move(x - 120, y - 30); await page.mouse.up(); await page.waitForTimeout(150); }
console.log("4 drag survives a child's lostpointercapture: x", before, "->", await sr(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel").getBoundingClientRect().x)), "(expect -120)");
// 5. phone: a still click on a head button (Show All) keeps the focus on it; a pull from that button still pulls the sheet
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await openBox(phone, phone.locator("fm-inspector"), "css", { all: false, at: ".card" });
await phone.locator("fm-inspector .vall").click(); await phone.waitForTimeout(100);
console.log("5 phone click on Show All: focus", await phone.evaluate(() => document.querySelector("fm-inspector").shadowRoot.activeElement?.className), "pressed", await phone.locator("fm-inspector .vall").getAttribute("aria-pressed"));
const ph = (p) => p.evaluate(() => Math.round(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel").getBoundingClientRect().height));
{ const b = await phone.locator("fm-inspector .vall").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await phone.mouse.move(x, y); await phone.mouse.down(); for (let i = 1; i <= 8; i++) await phone.mouse.move(x, y + 150 * i / 8); await phone.mouse.up(); await phone.waitForTimeout(150); }
console.log("5 phone pull from the button by 150:", await ph(phone), "(expect the sheet 150 shorter than its open height 422: 272)");
// 6. a very short screen: pushing up must not close, pulling down still does
const short = await browser.newPage({ viewport: { width: 390, height: 200 } });
await short.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await openBox(short, short.locator("fm-inspector"), "html", { all: false, at: ".card" });
console.log("6 short open height:", await ph(short), "open", await short.evaluate(() => document.querySelector("fm-inspector").hasAttribute("open")));
const pull = async (dy) => { const b = await short.locator("fm-inspector #panel .head").boundingBox(); const x = b.x + b.width - 30, y = b.y + 8; await short.mouse.move(x, y); await short.mouse.down(); for (let i = 1; i <= 5; i++) await short.mouse.move(x, y + dy * i / 5); await short.mouse.up(); await short.waitForTimeout(150); };
await pull(-25); console.log("6 after pushing up 25: open", await short.evaluate(() => document.querySelector("fm-inspector").hasAttribute("open")), "height", await ph(short));
await pull(60); console.log("6 after pulling down 60: open", await short.evaluate(() => document.querySelector("fm-inspector").hasAttribute("open")), "height", await ph(short), "(v0.2: only the close button closes the sheet, a pull shrinks it to the head)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
