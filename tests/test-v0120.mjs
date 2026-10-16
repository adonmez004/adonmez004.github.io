// v0.1.20's acceptance on v0.2: the quick view probes without the page's handlers firing and a click opens its box, Escape ends it; outside CSSOM changes survive own edits and Clear all; a late rule arrives through the poll; an invalid value on Enter stays and says so, Escape restores; own edits never rebuild the rows; a text node's removal throws nothing; the head's buttons; the phone shield pans (no tabs, no theme toggle any more)
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
const tick = async (prop, idx = 0) => { await sr(`${rowAt(prop, idx)}.querySelector("input").click()`); await page.waitForTimeout(120); };
const heads = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()));
// page handlers that must stay silent while picking
await sr(() => { window.hits = []; const b = document.querySelector(".btn"); for (const t of ["pointerdown", "mousedown", "click"]) b.addEventListener(t, () => window.hits.push(t)); document.addEventListener("click", (e) => { if (e.target.closest?.(".btn")) window.hits.push("doc-click"); }); });
await host.locator(".pickbtn").click();
const btnXY = await sr(() => { const r = document.querySelector(".btn").getBoundingClientRect(); return [r.x + 5, r.y + 5]; });
await page.mouse.move(...btnXY); await page.waitForTimeout(100);
console.log("probe over .btn:", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".ov .probe .n")?.textContent), "hover state:", await sr(() => document.querySelector(".btn").matches(":hover")));
await page.mouse.click(...btnXY); await page.waitForTimeout(300);
console.log("quick view on .btn:", await sr(() => { const h = document.querySelector("fm-inspector"); return h.hasAttribute("open") && h.view === "quick" ? h.shadowRoot.querySelector("#view-quick .qname")?.textContent.trim() : null; }), "page handlers fired:", JSON.stringify(await sr(() => window.hits)));
console.log("focus after the click stays in the inspector:", await sr(() => document.activeElement?.localName), "picking still armed:", await host.getAttribute("picking") !== null);
await page.keyboard.press("Escape"); await page.waitForTimeout(100);
console.log("after esc: picking", await host.getAttribute("picking") !== null, "open", await host.getAttribute("open") !== null);
await page.mouse.click(...btnXY); await page.waitForTimeout(100);
console.log("disarmed: page handlers fired:", JSON.stringify(await sr(() => window.hits)));
// outside changes survive our edits and Reset
await openBox(page, host, "css"); await page.waitForTimeout(200);
await tick("padding"); console.log("padding off:", await cs(".card", "paddingTop"));
await sr(() => { const sheet = document.styleSheets[0]; const rule = [...sheet.cssRules].find((r) => r.selectorText === ".card"); rule.style.setProperty("outline", "3px solid rgb(1, 1, 1)"); });
await page.waitForTimeout(900);
console.log("page added outline: row present", (await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d .t")].map((n) => n.textContent.trim()))).includes("outline:"), "padding still off:", await cs(".card", "paddingTop"));
await tick("margin-top"); console.log("inline margin-top off:", await cs(".note", "marginTop"));
await sr(() => { document.querySelector(".note").style.setProperty("letter-spacing", "2px"); }); await page.waitForTimeout(900);
console.log("page added letter-spacing inline: attr", await sr(() => document.querySelector(".note").getAttribute("style")), "margin-top still off:", await cs(".note", "marginTop"));
await host.locator(".reset").click(); await page.waitForTimeout(400); await openBox(page, host, "css"); // Clear all closes the box too
console.log("after reset: padding", await cs(".card", "paddingTop"), "outline kept", await cs(".card", "outlineWidth"), "| margin-top", await cs(".note", "marginTop"), "letter-spacing kept", await cs(".note", "letterSpacing"), "attr:", await sr(() => document.querySelector(".note").getAttribute("style")));
// a rule the page inserts through the CSSOM shows up through the poll
await sr(() => { document.styleSheets[0].insertRule(".late-rule { color: rgb(3, 3, 3); }", document.styleSheets[0].cssRules.length); }); await page.waitForTimeout(1200);
console.log("css tab has .late-rule:", (await heads()).includes(".late-rule"));
// an invalid value: Enter keeps the field and says so; Escape restores
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(100);
await page.keyboard.press("Control+a"); await page.keyboard.type("nonsense"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
console.log("invalid+enter: field stays", await sr(() => !!document.querySelector("fm-inspector").shadowRoot.querySelector(".ed")), "aria-invalid", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".ed")?.getAttribute("aria-invalid")), "status:", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".status").textContent), "page padding:", await cs(".card", "paddingTop"));
await page.keyboard.press("Escape"); await page.waitForTimeout(100);
console.log("after escape: field gone", await sr(() => !document.querySelector("fm-inspector").shadowRoot.querySelector(".ed")), "status empty", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".status").textContent === ""), "padding:", await cs(".card", "paddingTop"), "panel open", await host.getAttribute("open") !== null);
// an own edit does not rebuild the CSS view (the rows keep their identity)
await sr(() => { const sh = document.querySelector("fm-inspector").shadowRoot; sh.querySelector("#view-css .d").dataset.mark = "1"; });
await tick("color", 1); await tick("margin-top"); await page.waitForTimeout(1200);
console.log("rows kept after own edits (no rebuild):", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector("#view-css .d").dataset.mark === "1"));
await host.locator(".reset").click(); await page.waitForTimeout(300); await openBox(page, host, "css");
// removing a text node from the page must not throw
await sr(() => { const p = document.querySelector(".note"); p.firstChild.remove(); const c = document.createComment("x"); document.body.append(c); c.remove(); }); await page.waitForTimeout(300);
console.log("text/comment removal errors:", JSON.stringify(errors));
// the head's buttons on the CSS view (v0.2: the scope pair and the five blocks; no tabs, no theme, no undo)
console.log("head buttons:", await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#panel .head button")].filter((b) => !b.hidden).map((b) => b.className)));
// OS dark: the inspector follows the system (no toggle): the box's background goes dark
const dark = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
await dark.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await openBox(dark, dark.locator("fm-inspector"), "html");
console.log("OS dark, the box follows:", await dark.evaluate(() => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector("#panel")).backgroundColor), "(expect a dark rgb)");
// phone: a touch pan on the shield
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await phone.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await phone.locator("fm-inspector .pickbtn").tap(); await phone.waitForTimeout(300);
console.log("phone shield touch-action:", await phone.evaluate(() => getComputedStyle(document.querySelector("fm-inspector").shadowRoot.querySelector(".pick-surface")).touchAction));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
