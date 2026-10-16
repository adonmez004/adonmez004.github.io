// Extension nodes (a translate popup, a grammar helper, a password manager's fixed overlay) are left out of the HTML and CSS views, a late one too; the page's own late node stays; the quick view's hover looks through the overlay (v0.2: openBox for the pill and tabs)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT = new URL("./site/", import.meta.url).pathname, LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const f = q.url === "/inspector.js" ? LOCAL : path.join(ROOT, q.url === "/" ? "index.html" : q.url); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
// extension nodes injected BEFORE the page's scripts run, as a content script would
await page.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => {
  const pop = document.createElement("div"); pop.id = "immersive-translate-popup"; pop.setAttribute("style", "all: initial"); pop.textContent = "translate"; document.body.append(pop);
  const g = document.createElement("grammarly-desktop-integration"); g.textContent = "g"; document.body.append(g);
  const pm = document.createElement("div"); pm.id = "some-password-manager-root"; pm.setAttribute("style", "position: fixed; inset: 0"); pm.textContent = "pm"; document.body.append(pm);
  const st = document.createElement("style"); st.textContent = ".ext-only { color: rgb(1, 1, 1); }"; document.head.append(st);
}); });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const host = page.locator("fm-inspector");
await openBox(page, host, "html");
const rows = () => page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-html .row")].map((r) => r.textContent.trim().slice(0, 40)));
const html = await rows();
console.log("html rows with extension nodes:", html.filter((t) => /immersive|grammarly|password/.test(t)).length, "(expect 0); own rows:", html.filter((t) => /class="card"|class="note"|class="btn"/.test(t)).length, "(expect 3)");
await openBox(page, host, "css");
const css = await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .gh .sel, #view-css .cm")].map((n) => n.textContent.trim()));
console.log("css: extension inline listed:", css.filter((t) => /immersive|password/.test(t)).length, "(expect 0); extension head style shown (accepted):", css.filter((t) => /ext-only/.test(t)).length, "; own inline:", css.includes("p.note (inline)"), "own <style>:", css.includes("/* inline sheet */"));
// a popup that appears later, and a page element the solution's own JS adds (kept)
await page.evaluate(() => { const late = document.createElement("div"); late.id = "immersive-translate-tip"; late.textContent = "tip"; document.body.append(late); const own = document.createElement("div"); own.className = "toast"; own.textContent = "saved"; document.body.append(own); });
await page.waitForTimeout(500); await openBox(page, host, "html");
const later = await rows();
console.log("late extension popup listed:", later.some((t) => t.includes("immersive-translate-tip")), "(expect false); own late .toast listed:", later.some((t) => t.includes('class="toast"')), "(expect true)");
// picking over an extension overlay is ignored
await host.locator(".pickbtn").click(); await page.waitForTimeout(200); await page.mouse.move(640, 300); await page.waitForTimeout(250);
console.log("probe over the page through the extension's fixed overlay:", await page.evaluate(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll(".ov .lb .n")].map((n) => n.textContent)), "(expect the page's element under 640,300, never the extension's)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
