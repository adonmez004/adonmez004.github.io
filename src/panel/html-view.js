// The HTML tab: the live DOM as rows with fold carets, a pick button per element row, the folds and the focused row kept across a rebuild.
// It reaches the panel through `ui` alone: view (the tab's element), body (the scroll box), activeElement(), picks (the Map, read to re-mark),
// onPick(el, row), prune()
import { VOID, squash, name, PALETTE, TRUNC, span } from "../util.js";
import { skip, markForeign, rendered } from "../foreign.js";

export class HtmlView {
  constructor(ui) {
    this.ui = ui;
    this.rows = new Map(); // element -> its HTML row
    this.scope = null; // the lens's chosen element: the view shows its subtree alone; null = the whole body
    this.around = null; // under a scope, the element in its context: "parent" (the parent's tag around it and its siblings, folded), "siblings" (the parent's children side by side, the others folded, no parent tag), "children" (its own children, each folded)
  }

  setPickedRow(row, on) {
    row.dataset.picked = String(on);
    row.pickButton?.setAttribute("aria-pressed", String(on));
  }

  load() {
    markForeign();
    const folds = new Set([...this.rows].filter(([, row]) => row.hasAttribute("data-folded")).map(([el]) => el));
    const focused = this.ui.activeElement()?.closest(".row")?.pageElement;
    this.rows = new Map();
    this.ui.view.replaceChildren(); // the old rows go first: the build's own layout reads (rendered() per element) would otherwise lay the stale rows out again, seconds on a big page
    const fragment = document.createDocumentFragment();
    const scope = this.scope?.isConnected ? this.scope : null, parent = scope?.parentElement;
    const around = scope ? (this.around === "children" || parent ? this.around : null) : null;
    if (around === "content") fragment.append(this.contentBlock(scope)); // what the element holds, by kind: an image, a link, text, the media and links inside it
    else if (around === "children" && ![...scope.children].some((c) => !skip(c))) fragment.append(this.note(`${name(scope)} has no child elements.`)); // nothing to list: said, not the element again
    else if (around === "parent") this.tree(fragment, parent, 0); // the parent's tag around all its children, the others folded
    else if (around === "siblings") this.forest(fragment, parent, 0); // the parent's children side by side, the parent's own tag left out
    else this.tree(fragment, scope || document.body, 0);
    this.ui.view.replaceChildren(fragment);
    for (const el of folds) { const row = this.rows.get(el); if (row) this.setFolded(row, true); }
    if (around === "siblings" || around === "parent") for (const c of parent.children) { const r = this.rows.get(c); if (c !== scope && r?.close) this.setFolded(r, true); } // the others one line each
    if (around === "children") for (const c of scope.children) { const r = this.rows.get(c); if (r?.close) this.setFolded(r, true); }
    if (scope) { const root = this.rows.get(scope); if (root) { root.dataset.scope = "true"; if (root.tx && root.hasAttribute("data-folded")) this.setFolded(root, false); } } // the chosen element's own text reads whole, its row marked
    this.ui.prune();
    for (const [el, pick] of this.ui.picks) {
      pick.row = this.rows.get(el); if (!pick.row) continue;
      this.setPickedRow(pick.row, true);
      pick.row.style.setProperty("--accent", `var(--pick-${pick.hue % PALETTE})`);
    }
    if (focused) this.rows.get(focused)?.pickButton.focus();
  }

  tree(out, el, depth) {
    const kids = [...el.childNodes].filter((n) => !skip(n));
    const textOnly = kids.length > 0 && kids.every((n) => n.nodeType === 3);
    const row = this.row(depth); row.pageElement = el;
    const caret = document.createElement("button");
    caret.type = "button"; caret.className = "caret"; row.caret = caret;
    caret.setAttribute("aria-label", "Collapse element"); caret.setAttribute("aria-expanded", "true");
    const select = document.createElement("button");
    select.type = "button"; select.className = "pickrow"; select.setAttribute("aria-pressed", "false");
    select.setAttribute("aria-label", `Select ${name(el)}`); select.append(this.openTag(el)); row.pickButton = select;
    select.addEventListener("click", () => this.ui.onPick(el, row));
    row.append(caret, select); this.setPickedRow(row, false);
    this.rows.set(el, row); out.append(row);
    if (!rendered(el)) { row.classList.add("na"); row.title = "Not rendered on the page"; select.disabled = true; }
    const foldable = !VOID.has(el.localName) && kids.length > 0;
    if (!foldable) { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; if (!VOID.has(el.localName)) select.append(span("tag", `</${el.localName}>`)); return; }
    caret.addEventListener("click", () => this.setFolded(row, !row.hasAttribute("data-folded")));
    if (textOnly) {
      const text = squash(kids.map((n) => n.data).join(""));
      row.tx = span("tx", text); row.full = text;
      select.append(row.tx, span("tag", `</${el.localName}>`));
      if (text.length > TRUNC) this.setFolded(row, true);
      else { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; }
      return;
    }
    select.append(span("fold c", "…"), span("fold tag", `</${el.localName}>`));
    this.forest(out, el, depth + 1, kids);
    const close = this.row(depth); close.classList.add("cl", "nc"); close.append(span("tag", `</${el.localName}>`));
    out.append(close); row.close = close;
  }

  forest(out, el, depth, kids = [...el.childNodes].filter((n) => !skip(n))) {
    // The element's children as rows at one depth, the element's own tags not drawn
    for (const n of kids) {
      if (n.nodeType === 1) this.tree(out, n, depth);
      else { const child = this.row(depth); child.classList.add("nc"); child.append(span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data))); out.append(child); }
    }
  }

  contentBlock(el) {
    // The element's content by kind (Show Content): an image is shown with its source, alt and natural size; a link with its address and text; media with
    // its source; a field with its value; anything else with its text, then the images and links inside it
    const box = document.createElement("div"); box.className = "hc";
    const row = (label, value, href) => {
      const r = document.createElement("div"); r.className = "hcr";
      r.append(span("hcl", label));
      if (href) { const a = document.createElement("a"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = value; r.append(a); }
      else r.append(span("hcv", value));
      box.append(r);
    };
    const text = (n) => squash(n.textContent || "").trim();
    const tag = el.localName;
    const head = document.createElement("div"); head.className = "hch"; head.append(span("re", name(el))); box.append(head);
    if (tag === "img") {
      const pic = document.createElement("img"); pic.src = el.currentSrc || el.src; pic.alt = ""; pic.className = "hcpic"; box.append(pic);
      row("image", el.currentSrc || el.getAttribute("src") || "", el.currentSrc || el.src);
      row("alt", el.alt || "(none)");
      if (el.naturalWidth) row("natural", `${el.naturalWidth} × ${el.naturalHeight}px`);
    } else if (tag === "a") {
      row("link", el.getAttribute("href") || "(no href)", el.href);
      row("text", text(el) || "(empty)");
    } else if (/^(video|audio|iframe|source|embed|object)$/.test(tag)) {
      row(tag, el.currentSrc || el.src || el.data || el.getAttribute("src") || "(no source)", el.currentSrc || el.src || el.data);
    } else if (/^(input|textarea|select)$/.test(tag)) {
      row("value", el.value || "(empty)");
      if (el.placeholder) row("placeholder", el.placeholder);
    } else if (tag === "svg") {
      const pic = el.cloneNode(true); pic.classList.add("hcpic"); pic.removeAttribute("id"); box.append(pic);
      row("vector", `${el.children.length} shapes`);
    } else {
      row("text", text(el) || "(no text)");
      for (const i of el.querySelectorAll("img")) row("image", i.getAttribute("src") || "", i.src);
      for (const a of el.querySelectorAll("a[href]")) row("link", `${text(a) || a.getAttribute("href")}`, a.href);
    }
    return box;
  }

  note(text) {
    const n = document.createElement("div");
    n.className = "empty";
    n.textContent = text;
    return n;
  }

  row(depth) {
    const row = document.createElement("div"); row.className = "row"; row.style.setProperty("--d", depth); return row;
  }

  openTag(el) {
    // One span for the whole tag: a flex row drops bare whitespace text between items
    const f = span("ot", "");
    f.append(span("tag", `<${el.localName}`));
    for (const a of el.attributes) {
      f.append(" ", span("an", a.name));
      if (a.value !== "") f.append(`="${a.value}"`);
    }
    f.append(span("tag", ">"));
    return f;
  }

  setFolded(row, on) {
    // Hides the rows between an element's open and close rows; a text-only row just slices its text
    row.toggleAttribute("data-folded", on);
    row.caret?.setAttribute("aria-expanded", String(!on));
    row.caret?.setAttribute("aria-label", on ? "Expand element" : "Collapse element");
    if (row.tx) { row.tx.textContent = on ? row.full.slice(0, TRUNC).trimEnd() + " …" : row.full; return; }
    if (!row.close) return;
    let n = row.nextElementSibling;
    while (n && n !== row.close) {
      n.hidden = on;
      if (!on && n.hasAttribute("data-folded") && n.close) { // a folded subtree inside stays folded
        let m = n.nextElementSibling;
        while (m && m !== n.close) { m.hidden = true; m = m.nextElementSibling; }
        n.close.hidden = true;
        n = n.close;
      }
      n = n.nextElementSibling;
    }
    row.close.hidden = on;
  }

  reveal(el) {
    // Unfolds every ancestor row so the element's row is on screen, then scrolls the list to it
    const row = this.rows.get(el);
    if (!row) return;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const r = this.rows.get(a);
      if (r && r.hasAttribute("data-folded")) this.setFolded(r, false);
    }
    if (this.ui.view.hidden) return;
    const body = this.ui.body.getBoundingClientRect(), b = row.getBoundingClientRect();
    if (b.top < body.top || b.bottom > body.bottom) this.ui.body.scrollTop += b.top - body.top - this.ui.body.clientHeight / 2;
  }
}
