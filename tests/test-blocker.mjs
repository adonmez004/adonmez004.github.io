// An ad blocker's cosmetic sheet is left out of the CSS view, the page's own small hide rule stays (v0.2: opened with Show All; the pill label line is gone with the pill)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
// an ad blocker's cosmetic sheet, injected before the inspector reads, plus a solution's own small hide rule
await page.evaluate(() => {
  const st = document.createElement("style"); st.textContent = ['a[href^="https://click.dtiserv2.com/"]', 'a[href^="https://track.aftrk3.com/"]', '[href="//sexcams.plus/"]', '[href^="https://zone.gotrackier.com/"]', 'a[href^="https://pb-front.com/"]', 'a[href^="https://t.acam.link/"]'].map((s) => `${s} { display: none !important; }`).join("\n"); document.head.append(st);
  const own = document.createElement("style"); own.textContent = ".hidden { display: none !important; } .late { color: rgb(7, 7, 7); }"; document.head.append(own);
});
await page.waitForTimeout(200);
const host = page.locator("fm-inspector");
await openBox(page, host, "css");
const heads = await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel")].map((n) => n.textContent.trim()));
console.log("blocker selectors listed:", heads.filter((h) => /dtiserv|aftrk|sexcams|gotrackier|pb-front|acam/.test(h)).length, "(expect 0)");
console.log("own .hidden and .late listed:", heads.includes(".hidden"), heads.includes(".late"));
console.log("sheet notes:", JSON.stringify(await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .cm")].map((n) => n.textContent.trim()).filter((t) => t.startsWith("/* ") && t.endsWith(" */")))));
console.log("rail labels:", JSON.stringify(await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".rail button")].map((b) => b.getAttribute("aria-label")))));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
