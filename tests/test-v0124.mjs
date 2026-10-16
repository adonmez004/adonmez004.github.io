// v0.1.24's CSSOM races on v0.2 (a page change right before an own edit, a page-added declaration in the edited rule, a new adopted sheet, own edits never rebuilding the rows) and the box's Escape order: an open edit cancels first and the box stays, the next Escape closes the box; an invalid field clears with its message
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
const rowAt = (prop, idx) => `[...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].filter((d) => d.querySelector(".t").textContent.trim() === "${prop}:").at(${idx})`;
const tick = async (prop, idx = 0) => { await sr(`${rowAt(prop, idx)}.querySelector("input").click()`); await page.waitForTimeout(120); };
const rows = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].map((d) => d.querySelector(".t").textContent.trim() + " " + d.querySelector(".v")?.textContent));
const heads = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()));
const rule = (sel) => `[...document.styleSheets[0].cssRules].find((r) => r.selectorText === "${sel}")`;
await openBox(page, host, "css"); await sr(() => document.querySelector("fm-inspector").lens.arm("css", false)); await page.waitForTimeout(300);
// 1. the page changes ANOTHER rule right before an own edit: the panel must still pick it up
await sr(`${rule("@layer base")}`); // no-op probe
await sr(`${rule(".card")}.style.setProperty("color", "rgb(0, 0, 255)")`); // the page's change (immediately followed by ours, before the poll runs)
await tick("padding");
await page.waitForTimeout(1200);
console.log("1 own edit right after a page change to another decl: padding off", await cs(".card", "paddingTop"), "| color rows:", JSON.stringify((await rows()).filter((r) => r.startsWith("color"))));
// 2. the page adds a declaration to the SAME rule, then we edit that rule
await sr(`${rule(".card")}.style.setProperty("outline", "2px solid rgb(1, 1, 1)")`);
await tick("margin"); await page.waitForTimeout(1200);
console.log("2 page-added outline listed after our edit of the same rule:", (await rows()).some((r) => r.startsWith("outline")), "margin off", await cs(".card", "marginTop"));
// 3. a new adopted sheet, then an unrelated own edit
await sr(() => { const sh = new CSSStyleSheet(); sh.replaceSync(".adopted-late { padding: 9px; }"); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; });
await tick("font-weight"); await page.waitForTimeout(1200);
console.log("3 new adopted sheet listed after an unrelated own edit:", (await heads()).includes(".adopted-late"), "font-weight off", await cs(".note", "fontWeight"));
// 4. own edits alone do not rebuild the view
await host.locator(".reset").click(); await page.waitForTimeout(600); await openBox(page, host, "css"); await sr(() => document.querySelector("fm-inspector").lens.arm("css", false)); // Clear all closes the box
await sr(() => { document.querySelector("fm-inspector").shadowRoot.querySelector("#view-css .d").dataset.mark = "1"; });
await tick("padding"); await tick("padding"); await page.waitForTimeout(1200);
console.log("4 rows kept after own edits:", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector("#view-css .d").dataset.mark === "1"));
// 5. an open edit: Escape cancels it and keeps the box, the next Escape closes the box (v0.2: arming a tool closes the box, so no tool stands while the editor is open)
await sr(`${rowAt("color", 1)}.querySelector(".v").click()`); await page.waitForTimeout(100);
await page.keyboard.press("Control+a"); await page.keyboard.type("rgb(0, 128, 0)"); await page.waitForTimeout(100);
console.log("5 typed:", await cs(".card", "color"), "field focused", await sr(() => document.querySelector("fm-inspector").shadowRoot.activeElement?.className));
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("5 after Escape: color", await cs(".card", "color"), "field gone", await sr(() => !document.querySelector("fm-inspector").shadowRoot.querySelector(".ed")), "open", await host.getAttribute("open") !== null, "(expect the start colour, open true)");
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("5 second Escape: open", await host.getAttribute("open") !== null, "focus in", await sr(() => document.querySelector("fm-inspector").shadowRoot.activeElement?.className || document.activeElement?.localName), "(expect false: the re-render after a cancelled edit keeps the focus on the row, so the Escape reaches the box; it fell to the body until v0.2.1)");
// 6. an INVALID editor: Escape clears it and its message, the box stays
await openBox(page, host, "css"); await sr(() => document.querySelector("fm-inspector").lens.arm("css", false));
await sr(`${rowAt("color", 1)}.querySelector(".v").click()`); await page.waitForTimeout(100);
await page.keyboard.press("Control+a"); await page.keyboard.type("nonsense"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
console.log("6 invalid: status", JSON.stringify(await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".status").textContent)));
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("6 after Escape: field gone", await sr(() => !document.querySelector("fm-inspector").shadowRoot.querySelector(".ed")), "status empty", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".status").textContent === ""), "color", await cs(".card", "color"), "open", await host.getAttribute("open") !== null);
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
