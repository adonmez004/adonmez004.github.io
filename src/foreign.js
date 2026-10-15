export const skip = (n) =>
  (n.nodeType === 1 && (helper(n) || (n.localName === "script" && /inspector\.js/.test(n.getAttribute("src") || "")))) ||
  (n.nodeType === 8 && /inspector/i.test(n.data)) ||
  (n.nodeType === 3 && !n.data.trim());
// Browser extensions (translation popups, password managers, ad blockers, the Replit badge) add their own nodes to the page; none is the solution's code.
// A top-level node of html, head or body that the page's own HTML source never had is one of theirs when it looks like one (an id, a custom element name
// or a shadow root); a plain id-less element the solution's own script adds, a toast or a modal, stays the page's. A few are known by name when the source cannot be read
const KNOWN = /^(immersive-translate|grammarly|adguard|replit-pill)/i;
const foreignRoots = new Set();
let sourceTops = null; // the source's top-level nodes: their tag names and ids
export const ROOTS = () => [document.documentElement, document.head, document.body];
export const topOf = (el) => { let n = el; while (n.parentElement && !ROOTS().includes(n.parentElement)) n = n.parentElement; return n; };
export const markForeign = () => {
  foreignRoots.clear();
  for (const root of ROOTS()) for (const el of root?.children || []) {
    if (ROOTS().includes(el) || /^(fm-inspector|style|link|script|meta|title|base|noscript|template)$/.test(el.localName)) continue;
    const known = KNOWN.test(el.id) || KNOWN.test(el.localName);
    const inSource = !sourceTops || (el.id ? sourceTops.ids.has(el.id) : sourceTops.tags.has(el.localName));
    const extensionLike = !!el.id || el.localName.includes("-") || !!el.shadowRoot;
    if (known || (!inSource && extensionLike)) foreignRoots.add(el);
  }
};
export const readSource = async () => {
  try {
    const response = await fetch(location.href, { cache: "force-cache" });
    if (!response.ok) return;
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const tops = [doc.documentElement, doc.head, doc.body].flatMap((root) => [...root.children]).filter((el) => ![doc.head, doc.body].includes(el));
    sourceTops = { tags: new Set(tops.map((el) => el.localName)), ids: new Set(tops.filter((el) => el.id).map((el) => el.id)), styles: new Set([...doc.querySelectorAll("style")].map((el) => el.textContent.trim())) };
  } catch { /* file:// or offline: the known names alone */ }
  markForeign();
};
export const helper = (el) => !!el?.closest && (!!el.closest("fm-inspector, [data-fm-inspector-ignore]") || foreignRoots.has(topOf(el))); // the inspector itself, the extensions' nodes and anything the page marks data-fm-inspector-ignore are not the solution's code
export const rendered = (el) => el.isConnected && el.getClientRects().length > 0 && !helper(el);
export const sourceStyles = () => sourceTops?.styles || null; // the <style> texts the page's own source carries
