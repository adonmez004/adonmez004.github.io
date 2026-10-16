// Escape's order on v0.2 (v0.1.38's checks): the quick view ends on Escape with its box; an invalid edit cancels on Escape from the page or in the field with the box kept; after a committed edit Escape with the focus in the box closes the box
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
const st = () => sr(() => { const h = document.querySelector("fm-inspector"), sh = h.shadowRoot; return { open: h.hasAttribute("open"), view: h.view, picking: h.hasAttribute("picking"), quick: h.quickEl?.className || null, pins: h.pins.size, field: !!sh.querySelector(".ed"), status: sh.querySelector(".status").textContent, boxes: sh.querySelectorAll(".ov .box").length }; });
const rowAt = (prop, idx) => `[...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].filter((d) => d.querySelector(".t").textContent.trim() === "${prop}:")[${idx}]`;
// 1. the quick view open on an element, then Escape: the tool off AND its box closed
await host.locator(".pickbtn").click(); await page.waitForTimeout(100);
const [x, y] = await sr(() => { const r = document.querySelector(".btn").getBoundingClientRect(); return [r.x + 5, r.y + 5]; }); await page.mouse.click(x, y); await page.waitForTimeout(300);
console.log("quick view on .btn:", JSON.stringify(await st()));
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("after Escape:", JSON.stringify(await st()), "(expect picking false, quick null, boxes 0, open false)");
// 2. an invalid edit, a click elsewhere (focus leaves the field), then Escape from the page; the lens is put down first, so the page click is a plain click, not a new scope
await openBox(page, host, "css"); await sr(() => document.querySelector("fm-inspector").lens.arm("css", false));
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(80);
await page.keyboard.press("Control+a"); await page.keyboard.type("default"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
console.log("invalid:", JSON.stringify(await st()));
await page.mouse.click(200, 400); await page.waitForTimeout(100); // the page: focus leaves the box
console.log("after a page click: focus in", await sr(() => document.activeElement?.localName), JSON.stringify(await st()));
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("Escape from the page:", JSON.stringify(await st()), "padding", await sr(() => getComputedStyle(document.querySelector(".card")).paddingTop), "(expect field false, status empty, 10px, open true)");
// 3. after a finished edit, Escape is no longer swallowed: with the focus in the box it closes the box as before
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(80); await page.keyboard.press("Control+a"); await page.keyboard.type("12px"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("Escape after a committed edit (focus on the value):", JSON.stringify(await st()), "(expect open false)");
// 4. an invalid field with the focus still in it: Escape cancels and keeps the box
await openBox(page, host, "css");
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(80); await page.keyboard.press("Control+a"); await page.keyboard.type("nonsense"); await page.keyboard.press("Enter"); await page.waitForTimeout(100);
await page.keyboard.press("Escape"); await page.waitForTimeout(150);
console.log("Escape in the invalid field:", JSON.stringify(await st()), "(expect field false, open true)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
