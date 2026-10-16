// A CSS edit and a resize undone together (v0.2: the top bar's Reset sizes / Reset rules are gone; the handle's Reset puts this element's size AND every CSS edit back, the rail's Clear all everything): padding unticked and the button resized, then each door
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const rowAt = (prop, idx) => `[...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].filter((d) => d.querySelector(".t").textContent.trim() === "${prop}:")[${idx}]`;
const st = () => sr(() => ({ pad: getComputedStyle(document.querySelector(".card")).paddingTop, btnStyle: document.querySelector(".btn").getAttribute("style"), sizing: document.querySelector("fm-inspector").hasAttribute("sizing"), open: document.querySelector("fm-inspector").hasAttribute("open") }));
const setUp = async () => {
  await openBox(page, host, "css");
  await sr(`${rowAt("padding", 0)}.querySelector("input").click()`); await page.waitForTimeout(100);
  await host.locator(".sizebtn").click(); await page.waitForTimeout(100);
  const [x, y] = await sr(() => { const r = document.querySelector(".btn").getBoundingClientRect(); return [r.x + 2, r.y + 2]; }); await page.mouse.click(x, y); await page.waitForTimeout(200);
  const b = await host.locator(".hd").boundingBox(); await page.mouse.move(b.x + 8, b.y + 8); await page.mouse.down(); await page.mouse.move(b.x + 40, b.y + 8); await page.mouse.move(b.x + 60, b.y + 8); await page.mouse.up(); await page.waitForTimeout(200);
};
await setUp(); console.log("padding off + btn resized:", JSON.stringify(await st()));
await host.locator(".hreset").click(); await page.waitForTimeout(400); console.log("handle Reset:", JSON.stringify(await st()), "(expect btnStyle null, pad 10px, the tool standing)");
await page.keyboard.press("Escape"); await page.waitForTimeout(100);
await setUp(); console.log("again:", JSON.stringify(await st()));
await host.locator(".reset").click(); await page.waitForTimeout(400); console.log("Clear all:", JSON.stringify(await st()), "(expect btnStyle null, pad 10px, sizing false, closed)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
