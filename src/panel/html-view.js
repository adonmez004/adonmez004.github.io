// The HTML tab: the live DOM as rows with fold carets, a pick button per element row, the folds and the focused row kept across a rebuild.
// It reaches the panel through `ui` alone: view (the tab's element), body (the scroll box), activeElement(), picks (the Map, read to re-mark),
// onPick(el, row), prune()
import { VOID, squash, name, PALETTE, TRUNC, span } from "../util.js";
import { skip, markForeign, rendered } from "../foreign.js";

export class HtmlView {
  constructor(ui) {
    this.ui = ui;
    this.rows = new Map(); // element -> its HTML row
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
    const fragment = document.createDocumentFragment();
    this.tree(fragment, document.body, 0);
    this.ui.view.replaceChildren(fragment);
    for (const el of folds) { const row = this.rows.get(el); if (row) this.setFolded(row, true); }
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
    for (const n of kids) {
      if (n.nodeType === 1) this.tree(out, n, depth + 1);
      else { const child = this.row(depth + 1); child.append(span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data))); out.append(child); }
    }
    const close = this.row(depth); close.classList.add("cl"); close.append(span("tag", `</${el.localName}>`));
    out.append(close); row.close = close;
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
