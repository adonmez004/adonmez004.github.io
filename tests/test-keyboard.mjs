// Keyboard paths (v0.2, the rail): Enter on the rail's HTML icon arms the lens, a page click opens the box with the focus inside, the Escape chain
// (an open edit cancels first, then the second box closes, then the armed tool ends), the handle's arrow steps, and where the focus lands after each.
import { launch, routeInspector, serve, openBox } from "./lib/browser.mjs";
const site = serve();
const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
await routeInspector(page);
await page.goto(site.url, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const focused = () => sr(() => { const a = document.querySelector("fm-inspector").shadowRoot.activeElement; return a ? `${a.localName}.${[...a.classList].join(".")}${a.id ? "#" + a.id : ""}` : String(document.activeElement?.localName); });
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(80); } };
const open = () => sr(() => document.querySelector("fm-inspector").hasAttribute("open"));
const view = () => sr(() => document.querySelector("fm-inspector").view);

// 1. Enter on the rail's HTML icon arms the lens; a click on the page opens the box on that element with the focus inside the box
await host.locator(".htmlbtn").focus(); await key("Enter"); await page.waitForTimeout(300);
console.log("Enter on the HTML icon: lens armed", await sr(() => document.querySelector("fm-inspector").hasAttribute("lens")), "box open", await open(), "(expect armed, closed)");
const main = await page.locator("main").boundingBox(); await page.mouse.click(main.x + 2, main.y + 2); await page.waitForTimeout(400);
console.log("page click: box open", await open(), "view", await view(), "focus", await focused(), "(expect open, html, the focus in the box)");
// 2. Tab from the box reaches the head's word buttons, then the rows; Enter on a row's pick button picks it
await key("Tab"); console.log("one Tab from the box: focus", await focused(), "(the head's first button)");
await host.locator("#view-html .row .pickrow").nth(2).focus(); console.log("focus on a row's pick button:", await focused());
await key("Enter"); await page.waitForTimeout(300);
console.log("Enter on the row's button: picked rows", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelectorAll('#view-html .row[data-picked="true"]').length), "focus", await focused());
// 3. the Escape chain (v0.2: an edit and an armed tool meet in the resize tool's second box): the resize tool armed, a hold's door opens the CSS box,
// a value edit opened there; Escape cancels the edit and leaves both boxes and the tool, the next closes the second box, the next ends the tool
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("img"))); await page.waitForTimeout(300);
await sr(() => { const i = document.querySelector("fm-inspector"); i.moveTo(innerWidth - i.panel.offsetWidth - 8, 8); }); // the size box to the left, off the handle
await host.locator(".hd").focus(); await key("Shift+ArrowRight", 3); await page.waitForTimeout(300);
await host.locator(".wgo").click(); await page.waitForTimeout(400);
console.log("held, door pressed: second box", await sr(() => !document.querySelector("fm-inspector").shadowRoot.querySelector("#panel2").hidden), "sizing", await sr(() => document.querySelector("fm-inspector").sizing), "focus", await focused());
const value = host.locator("#panel2 #view-css .d .v").first();
await value.focus(); await key("Enter"); await page.waitForTimeout(200);
console.log("Enter on a value in the second box: editing", await sr(() => !!document.querySelector("fm-inspector").editor), "focus", await focused());
const second = () => sr(() => !document.querySelector("fm-inspector").shadowRoot.querySelector("#panel2").hidden);
await key("Escape"); console.log("Escape 1: editing", await sr(() => !!document.querySelector("fm-inspector").editor), "second box", await second(), "sizing", await sr(() => document.querySelector("fm-inspector").sizing), "(expect the edit cancelled, the box and the tool standing)");
await key("Escape"); console.log("Escape 2: second box", await second(), "sizing", await sr(() => document.querySelector("fm-inspector").sizing), "open", await open(), "view", await view(), "focus", await focused(), "(expect the second box closed, the size view and the tool standing, the focus back on the door)");
await key("Escape"); await page.waitForTimeout(300);
console.log("Escape 3: sizing", await sr(() => document.querySelector("fm-inspector").sizing), "open", await open(), "focus", await focused(), "(expect the tool off, its box closed, the focus on the resize icon)");
// 4. the handle's keys: Left x3, Shift+Left, Right, then Escape ends the tool and focuses its icon; the size view opened on the choice
await host.locator(".sizebtn").click(); await page.waitForTimeout(200); await host.locator(".reset").click(); await page.waitForTimeout(200); await host.locator(".sizebtn").click(); await page.waitForTimeout(200); // Clear all between: the img's size back
await sr(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("main > div"))); await page.waitForTimeout(300);
console.log("chosen: box open", await open(), "view", await view(), "(expect the size view)");
const w0 = await sr(() => Math.round(document.querySelector("main > div").getBoundingClientRect().width));
await host.locator(".hd").focus(); await key("ArrowLeft", 3); await page.keyboard.press("Shift+ArrowLeft"); await page.waitForTimeout(100); await key("ArrowRight"); await page.waitForTimeout(200);
console.log("handle Left x3, Shift+Left, Right: width", w0, "->", await sr(() => Math.round(document.querySelector("main > div").getBoundingClientRect().width)), "(expect -12) style", JSON.stringify(await sr(() => document.querySelector("main > div").getAttribute("style"))), "size line:", await sr(() => document.querySelector("fm-inspector").shadowRoot.querySelector(".wnow").textContent));
await key("Escape"); await page.waitForTimeout(200);
console.log("Escape on the handle: sizing", await sr(() => document.querySelector("fm-inspector").sizing), "open", await open(), "focus", await focused(), "size kept", JSON.stringify(await sr(() => document.querySelector("main > div").getAttribute("style"))), "(expect the tool off, its box closed, the focus on the resize icon)");
console.log("errors:", errors.length, errors.slice(0, 3));
await browser.close(); site.close();
