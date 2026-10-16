// Nested, @container, @layer and inline declarations toggled and reset; pins on inactive rules paint nothing; arrow edits; the CSS lens scoped to .btn; a late element and stylesheet show up live (v0.2)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
await openBox(page, host, "css"); // v0.2: the CSS lens, Show All
const sr = (fn, arg) => page.evaluate(fn, arg);
const heads = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel, #view-css .cm")].map((n) => n.textContent.trim()));
console.log("css tab:", JSON.stringify(await heads()));
const rows = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].map((d) => ({ t: d.querySelector(".t").textContent.trim(), v: d.querySelector(".v")?.textContent, live: !d.classList.contains("na") })));
console.log("rows:", JSON.stringify(await rows()));
const cs = (sel, prop) => sr(([s, p]) => getComputedStyle(document.querySelector(s))[p], [sel, prop]);
// nested rule toggle: & .btn background
const rowAt = (prop, idx) => `[...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .d")].filter((d) => d.querySelector(".t").textContent.trim() === "${prop}:")[${idx}]`;
const tick = async (prop, idx = 0) => { await sr(`${rowAt(prop, idx)}.querySelector("input").click()`); await page.waitForTimeout(120); };
await tick("background"); console.log("nested & .btn background off:", await cs(".btn", "backgroundColor"));
await tick("font-size"); console.log("nested .title font-size off:", await cs(".title", "fontSize"));
await tick("margin"); console.log("margin off, margin-left stays:", await cs(".card", "marginLeft"), await cs(".card", "marginTop"));
await tick("color", 1); console.log("second color off -> red:", await cs(".card", "color"));
await tick("padding", 1); console.log("@container padding off:", await cs(".btn", "padding"));
await tick("font-weight"); console.log("@layer font-weight off:", await cs(".note", "fontWeight"));
await tick("margin-top"); console.log("inline margin-top off:", await cs(".note", "marginTop"), "attr:", await sr(() => document.querySelector(".note").getAttribute("style")));
// pins on an inactive media rule paint nothing
const pinBoxes = async (prop, idx = 0) => { await sr(`${rowAt(prop, idx)}.querySelector(".t").click()`); await page.waitForTimeout(200); const n = await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .decl .box").length); await sr(`${rowAt(prop, idx)}.querySelector(".t").click()`); return n; };
await host.locator(".reset").click(); await page.waitForTimeout(200);
console.log("after reset:", await cs(".btn", "backgroundColor"), await cs(".card", "marginLeft"), await cs(".card", "color"), await cs(".note", "marginTop"), await cs(".note", "fontWeight"), "attr:", await sr(() => document.querySelector(".note").getAttribute("style")));
console.log("inactive @media color pin boxes:", await pinBoxes("color", 2), " nested .title font-size pin boxes:", await pinBoxes("font-size"), " @container padding pin boxes:", await pinBoxes("padding", 1));
// edit with arrows
await sr(`${rowAt("padding", 0)}.querySelector(".v").click()`); await page.waitForTimeout(100); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Shift+ArrowUp"); await page.waitForTimeout(100);
console.log("padding after arrows:", await cs(".card", "paddingTop")); await page.keyboard.press("Escape"); await page.waitForTimeout(100); console.log("after escape:", await cs(".card", "paddingTop"));
// the CSS lens on the button: the view scoped to it shows the nested rule and the @container rule (v0.2: no picks; the scoped view lists the rules that reach the element)
await openBox(page, host, "css", { all: false, at: ".btn" }); await page.waitForTimeout(300);
console.log("rules reaching .btn:", JSON.stringify(await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .grp .gh .sel")].map((n) => n.textContent.trim()))));
await page.keyboard.press("Escape");
// live DOM: a new element and a new stylesheet show up without a reload
await openBox(page, host, "html"); await page.waitForTimeout(100);
await sr(() => { const s = document.createElement("span"); s.className = "late"; s.textContent = "late"; document.querySelector("main").append(s); const st = document.createElement("style"); st.textContent = ".late { color: rgb(7, 7, 7); }"; document.head.append(st); });
await page.waitForTimeout(600);
await openBox(page, host, "html"); await page.waitForTimeout(300); // the HTML view again, whole tree
console.log("html has late row:", await sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-html .row")].some((r) => r.textContent.includes("late"))));
await openBox(page, host, "css"); await page.waitForTimeout(300);
console.log("css has .late:", (await heads()).includes(".late"));
console.log("errors:", errors);
await browser.close(); srv.close();
