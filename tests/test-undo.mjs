// The CSS undo (v0.2: no button yet, the host's undo() method drives it; the history length stands in for the button's disabled state): ticks, an edit session as one step, a cancelled edit recording nothing, Clear all starting a clean history; the phone head fits
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
const tick = async (prop, idx = 0) => { await sr(`${rowAt(prop, idx)}.querySelector("input").click()`); await page.waitForTimeout(80); };
const undo = async () => { await sr(() => document.querySelector("fm-inspector").undo()); await page.waitForTimeout(120); };
const steps = () => sr(() => document.querySelector("fm-inspector").history.length);
await openBox(page, host, "css");
console.log("empty history:", await steps());
await tick("padding"); console.log("padding off:", await cs(".card", "paddingTop"), "steps:", await steps());
await tick("margin"); console.log("margin off:", await cs(".card", "marginTop"), "steps:", await steps());
await undo(); console.log("undo 1: margin", await cs(".card", "marginTop"), "padding", await cs(".card", "paddingTop"), "row ticked:", await sr(`${rowAt("margin", 0)}.querySelector("input").checked`));
await undo(); console.log("undo 2: padding", await cs(".card", "paddingTop"), "steps:", await steps());
// an edit session is one step
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(80);
await page.keyboard.press("ArrowUp"); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Shift+ArrowUp"); await page.keyboard.press("Enter"); await page.waitForTimeout(120);
console.log("after edit session:", await cs(".card", "paddingTop"), "row value:", await sr(`${rowAt("padding", 0)}.querySelector(".v").textContent`), "steps:", await steps());
await undo(); console.log("undo the session:", await cs(".card", "paddingTop"), "row value:", await sr(`${rowAt("padding", 0)}.querySelector(".v").textContent`), "steps:", await steps());
// a cancelled edit records nothing
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(80); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Escape"); await page.waitForTimeout(120);
console.log("after a cancelled edit: steps", await steps(), "padding", await cs(".card", "paddingTop"));
// Clear all starts clean
await tick("padding"); await tick("margin"); await tick("font-weight");
await host.locator(".reset").click(); await page.waitForTimeout(300);
console.log("after Clear all:", await cs(".card", "paddingTop"), await cs(".card", "marginTop"), await cs(".note", "fontWeight"), "steps (a reset starts clean):", await steps(), "box open:", await host.evaluate((n) => n.hasAttribute("open")));
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
await phone.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" }); await openBox(phone, phone.locator("fm-inspector"), "css");
console.log("phone head fits:", await phone.evaluate(() => { const h = document.querySelector("fm-inspector").shadowRoot.querySelector("#panel .head"); return { scroll: h.scrollWidth, client: h.clientWidth, last: Math.round(h.querySelector(".close").getBoundingClientRect().right), rows: Math.round(h.getBoundingClientRect().height) }; }));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
