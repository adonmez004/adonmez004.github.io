// v0.1.37's three checks on v0.2: edit / Reset (the rail's Clear all) / undo (the host's undo(), no button yet) agree with the page at every step; a runtime <style id> stays listed; a 12-rule href filter list is dropped while the page's own hide rules stay
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
const edit = async (prop, idx, value) => { await sr(`${rowAt(prop, idx)}.querySelector(".v").click()`); await page.waitForTimeout(80); await page.keyboard.press("Control+a"); await page.keyboard.type(value); await page.keyboard.press("Enter"); await page.waitForTimeout(120); };
const shown = (prop, idx) => sr(`${rowAt(prop, idx)}.querySelector(".v").textContent`);
await openBox(page, host, "css"); await page.waitForTimeout(300);
// 3.1: red -> blue -> Reset -> Undo -> green -> Reset: live and panel agree at every step, Reset lands on red
console.log("start margin-left:", await cs(".card", "marginLeft"));
await edit("margin-left", 0, "50px"); console.log("edit 50:", await cs(".card", "marginLeft"), "panel", await shown("margin-left", 0));
await host.locator(".reset").click(); await page.waitForTimeout(700); await openBox(page, host, "css"); console.log("reset (Clear all closes the box, reopened):", await cs(".card", "marginLeft"), "panel", await shown("margin-left", 0));
console.log("undo stack empty after reset (a reset starts clean):", await sr(() => document.querySelector("fm-inspector").history.length === 0));
await edit("margin-left", 0, "70px"); console.log("edit 70:", await cs(".card", "marginLeft"), "panel", await shown("margin-left", 0));
await host.locator(".reset").click(); await page.waitForTimeout(700); await openBox(page, host, "css"); console.log("reset again:", await cs(".card", "marginLeft"), "panel", await shown("margin-left", 0), "(expect 20px = the page's original)");
// 3.2: our write, then the page writes the same property: Undo leaves the page's value
await edit("padding", 0, "20px"); console.log("padding edit:", await cs(".card", "paddingTop"));
await sr(() => { [...document.styleSheets[0].cssRules].find((r) => r.selectorText === ".card").style.setProperty("padding", "33px"); }); await page.waitForTimeout(900);
await sr(() => document.querySelector("fm-inspector").undo()); await page.waitForTimeout(300); console.log("undo after the page's own write:", await cs(".card", "paddingTop"), "(expect 33px kept)");
// 3.3: the page's runtime <style id> stays listed; an id'd app node added at runtime is still treated as foreign (the accepted trade-off)
await sr(() => { const st = document.createElement("style"); st.id = "runtime-theme"; st.textContent = ".runtime-rule { color: rgb(4, 4, 4); }"; document.head.append(st); });
await page.waitForTimeout(900);
console.log("runtime style#id listed:", (await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()))).includes(".runtime-rule"), "(expect true)");
// 3.4: the page's own five utility hide rules stay; a 12-rule href filter list is dropped
await sr(() => { const own = document.createElement("style"); own.textContent = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `.u${i} { display: none !important; }`).join("\n"); document.head.append(own);
  const ext = document.createElement("style"); ext.textContent = Array.from({ length: 12 }, (_, i) => `a[href^="https://t${i}.example/"] { display: none !important; }`).join("\n"); document.head.append(ext); });
await page.waitForTimeout(900);
const heads = await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()));
console.log("page's 11 utility hide rules listed:", heads.filter((h) => /^\.u\d+$/.test(h)).length, "(expect 11); href filter list listed:", heads.filter((h) => /t\d+\.example/.test(h)).length, "(expect 0)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
