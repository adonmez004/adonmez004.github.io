// An element's inline style group sits right above the first rule that selects it, in its own colour; a resize writes into it and a drag past the parent warns (v0.2: the CSS lens on every stylesheet, the hold read from the size view)
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
const host = page.locator("fm-inspector"); const sr = (f, a) => page.evaluate(f, a);
const heads = () => sr(() => [...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .grp")].map((g) => (g.classList.contains("inline") ? "[inline] " : "") + g.querySelector(".gh .sel").textContent.trim()));
await openBox(page, host, "css");
const hold = () => page.evaluate(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(); }); // the hold's words without the door
let h = await heads(); console.log("p.note inline sits above the first .note rule:", JSON.stringify(h), "| index inline:", h.findIndex((x) => x.startsWith("[inline]")), "first .note rule:", h.findIndex((x) => x === ".note"), "(expect inline right before)");
console.log("no Inline styles comment:", await sr(() => ![...document.querySelector("fm-inspector").shadowRoot.querySelectorAll("#view-css .cm")].some((c) => c.textContent.includes("Inline styles"))));
console.log("inline colour differs:", await sr(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const a = getComputedStyle(sh.querySelector(".grp.inline .gh .sel")).color, b = getComputedStyle(sh.querySelector(".grp:not(.inline) .gh .sel")).color; return a !== b ? [a, b] : false; }));
// a resize on .btn: its inline group appears above the first rule selecting .btn, and the parent cap warns
await host.locator(".sizebtn").click(); await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector(".btn"))); await page.waitForTimeout(150);
const b = await host.locator(".hd").boundingBox(); await page.mouse.move(b.x + 8, b.y + 8); await page.mouse.down(); await page.mouse.move(b.x + 600, b.y + 8); await page.mouse.move(b.x + 1300, b.y + 8); await page.waitForTimeout(150);
console.log("dragged past the parent, mid-drag warn:", JSON.stringify(await hold()), "(expect held by the parent)");
await page.mouse.up(); await page.waitForTimeout(400);
h = await heads(); console.log("after resize:", JSON.stringify(h.filter((x) => x.includes("btn"))), "btn style:", await sr(() => document.querySelector(".btn").getAttribute("style")));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
