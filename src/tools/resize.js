// The resize tool: one element at a time, chosen by a page click, its width dragged by the corner handle (or stepped by the arrow keys) and written
// inline; the layout's limits hold, the children resized earlier narrow with their parent, every step goes on its own undo stack, and the rule that
// held a drag is named in the tool's own view in the box and lit in the CSS view. It reaches the panel through `ui` alone:
// host (the element: its sizing/resizing attributes), els { btn, handle, wval, wnow, wblock, hreset }, tools, store, painter,
// paint(), box(on), goTo(el, d), toggleDecl(d, on), queueLoad(), dirtyHtml(), syncRow(d), revealRow(d), gesture(e, move, done), suppressClick(), cancelGesture(), finishEdit()
import { num, fmt, name, span } from "../util.js";
import { helper } from "../foreign.js";
import { History } from "../history.js";
import { sizeProp, sizeOf, extraOf, contentWidth, resizeSupported, contentNeed, overflow, sizeLimits, parentBase, explainSize } from "./size-explain.js";

export class Resizer {
  constructor(ui) {
    this.ui = ui;
    const { els } = ui;
    this.sizing = false; // armed: a click on the page chooses the element, its corner handle drags its width
    this.target = null; // the chosen element
    this.sized = new Map(); // element -> its style attribute before the first resize, for Reset
    this.wrote = new WeakMap(); // element -> { attr, prop, written }: the last observed or written size; observations detect page changes before the first move
    this.drag = null; // the element under a running drag
    this.cap = { x: null, y: null }; // the limit the last step met: parent, grid, content
    this.hugs = new Set(); // the parents seen growing with their element this session: content-sized, never written 100% against
    this.blocked = null; // the declaration found to keep the last resize from landing
    this.heldArea = null; // the element framed on the page as the area that held it
    this.first = new WeakMap(); // element -> { w, h }: its size when the tool first chose it, the head's line; a resize shows the size now under it with the difference
    this.history = new History(() => {}); // resizes, newest last: [{ el, before, after, prop }] style attributes; no control wears the undo since the row left the view, `undo()` stands for the box's coming undo
    this.handleEvents(els.handle);
    ui.tools.register("sizing", {
      label: "Click an element to resize · Esc to end",
      handlers: () => ({
        click: (target) => this.choose(target),
        escape: () => { this.setSizing(false); els.btn.focus(); },
      }),
      release: () => this.cancel(), // a running drag ends when the tool changes hands or closes
    });
  }

  setSizing(on) {
    // The resize tool and the picker stand together: the one armed last takes the page's clicks, the other keeps its state (the chosen element,
    // its handle and view; the picks) and takes the clicks back when that one ends. Closing a tool closes its own things only
    if (on === this.sizing) return;
    if (!on) this.cancel();
    this.sizing = on;
    this.ui.els.btn.setAttribute("aria-pressed", String(on));
    this.ui.host.toggleAttribute("sizing", on);
    if (on) this.ui.tools.arm("sizing");
    else {
      this.target = null;
      this.setBlocked(null, "");
      this.ui.els.handle.removeAttribute("data-on");
      this.ui.els.hreset.removeAttribute("data-on");
      this.ui.els.wval.textContent = ""; this.ui.els.wnow.replaceChildren();
      this.ui.tools.end("sizing");
    }
    if (!on) this.ui.box(false); // the box closes with the tool; it opens on the first choice, not on the arm (Alper: "resize'a basar basmaz box'ın açılmasına gerek yok")
    this.ui.paint();
  }

  prune() {
    // The elements that left the page (or turned out to be helpers) go: out of the sized map, out of the chosen seat
    for (const el of this.sized.keys()) if (!el.isConnected || helper(el)) this.sized.delete(el);
    if (this.target && (!this.target.isConnected || helper(this.target))) {
      this.cancel();
      this.target = null; this.ui.els.handle.removeAttribute("data-on"); this.ui.els.hreset.removeAttribute("data-on"); this.ui.els.wval.textContent = ""; this.ui.els.wnow.replaceChildren();
    }
  }

  writeSize(el, px, snap = true) {
    // The resize as a fixed px size; once it reaches the parent's content box (where that box is a plain limit) it is written as 100%
    // instead, so the element follows the parent from then on (a content-box element keeps its padding and border out of the percentage).
    // The content pass asks for px only: a 100% against a content-sized parent is cyclic and would open the element to its max-content.
    // The property is the logical one that is the physical width (block-size in a vertical writing mode); an !important already on it stays
    // A parent that hugs its content (a centred grid item, a float, a fit-content width) grows with the element: it has no box to follow, so it never
    // gets the 100% (Alper's call, v0.1.79). The px value is written first; a parent whose content box moved with it hugs, for the rest of the session
    const base = parentBase(this.ui.store, el), prop = sizeProp(el), parent = el.parentElement;
    if (base > 0 && !snap) px = Math.min(px, Math.round(base));
    el.style.setProperty(prop, `${Math.max(1, px)}px`, el.style.getPropertyPriority(prop));
    if (base > 0 && snap && px >= base - 0.5 && !this.hugs.has(parent)) {
      if (Math.abs(contentWidth(parent) - base) > 0.5) this.hugs.add(parent);
      else {
        const extra = extraOf(getComputedStyle(el));
        el.style.setProperty(prop, extra ? `calc(100% - ${fmt(extra)}px)` : "100%", el.style.getPropertyPriority(prop));
      }
    }
    this.wrote.set(el, { attr: el.getAttribute("style"), prop, written: true });
    return base > 0 && px > base + 0.5 && !this.hugs.has(parent); // capped at the parent
  }

  restoreSize(el, attr, prop = sizeProp(el)) {
    // Only the size property goes back to what the attribute held; whatever else the page (or the panel) wrote onto the element since stands.
    // The attribute itself is put back verbatim once the live style equals it, so an element that had none loses it again
    if (!el.isConnected) return;
    const want = sizeOf(el, attr, prop);
    this.ui.store.writeProperty(el.style, want.prop, want.value, want.priority);
    if (el.style.cssText === want.cssText) { if (attr == null) el.removeAttribute("style"); else el.setAttribute("style", attr); }
    this.wrote.set(el, { attr: el.getAttribute("style"), prop, written: true });
  }

  pageSized(el) {
    // The page wrote the size property itself since the tool's last write (another value, another priority): its write stands, the tool's step is skipped
    const ours = this.wrote.get(el);
    if (!ours) return false;
    const now = sizeOf(el, el.getAttribute("style"), ours.prop), expected = sizeOf(el, ours.attr, ours.prop);
    return now.value !== expected.value || now.priority !== expected.priority;
  }

  cancel() { if (this.drag) this.ui.cancelGesture(); }

  crush(el, kids) {
    // The parent wins: every descendant resized earlier that now reaches past its own parent's content box is narrowed to fit, outer ones first
    const depth = (node) => { let n = 0; for (let p = node; p && p !== el; p = p.parentElement) n++; return n; };
    for (const kid of [...kids].sort((a, b) => depth(a) - depth(b))) {
      if (!kid.isConnected || !kid.parentElement) continue;
      const pcs = getComputedStyle(kid.parentElement), pr = kid.parentElement.getBoundingClientRect();
      const inner = pr.width - num(pcs.paddingLeft) - num(pcs.paddingRight) - num(pcs.borderLeftWidth) - num(pcs.borderRightWidth);
      const kcs = getComputedStyle(kid), kr = kid.getBoundingClientRect();
      const room = inner - Math.max(num(kcs.marginLeft), 0) - Math.max(num(kcs.marginRight), 0);
      if (kr.width <= room + 0.5) continue;
      this.writeSize(kid, Math.max(1, Math.round(room - extraOf(kcs))));
    }
  }

  explain(el, want) {
    // The reason the width did not land, into the view, the CSS tab and the page; nothing when it did
    const held = explainSize(this.ui.store, el, want, this.cap?.x);
    if (held) this.setBlocked(held.d, held.text, held.area); else this.setBlocked(null, "");
  }

  setBlocked(d, text, area = null) {
    // The row that kept the size: lit red in the CSS tab (and brought into view, the tab opened for it); the reason is spoken to assistive tech.
    // The element's own rule first (the row alone says it); when the hold came from outside, the holding AREA is framed on the page with the reason:
    // the parent (content-sized, a grid track, its own width rule, the grandparent's grid or flex) or the child whose content reaches furthest
    const was = this.blocked;
    this.blocked = d; this.heldArea = text ? area : null;
    const { wblock } = this.ui.els; wblock.replaceChildren();
    if (!text) { if (was) this.ui.syncRow(was); return; }
    if (d) { // the holding declaration itself, with its tick: off, and the next step is free of it; the words around it say whose it is
      const shown = `${d.prop}: ${d.value}${d.important ? " !important" : ""}`;
      const note = (text.includes(shown) ? text.replace(shown, "") : text.includes(`${d.prop}: ${d.value}`) ? text.replace(`${d.prop}: ${d.value}`, "") : text.replace(`: ${d.value}`, ":")).trim(); // the words around the declaration: `held by`, `div:` (the parent's name), `grid track:`
      const label = document.createElement("label"); label.className = "hdecl";
      const box = document.createElement("input"); box.type = "checkbox"; box.checked = d.on; box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      box.addEventListener("change", () => { this.ui.toggleDecl(d, box.checked); label.classList.toggle("off", !d.on); });
      label.append(box, span("t", `${d.prop}: `), span("v", d.value), ...(d.important ? [" ", span("x", "!important")] : [])); label.classList.toggle("off", !d.on);
      wblock.append(span("hnote", note ? `${note} ` : ""), label);
    } else wblock.append(span("hnote", text));
    if (this.target) { const go = document.createElement("button"); go.type = "button"; go.className = "wgo"; go.textContent = "Go to this element"; go.addEventListener("click", () => this.ui.goTo(this.target, d)); wblock.append(go); } // the element's whole CSS in the second box
    if (was) this.ui.syncRow(was);
    if (d) { this.ui.syncRow(d); this.ui.revealRow(d); }
  }

  blockedText() { const w = this.ui.els.wblock; return w.childNodes.length ? [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim() : ""; } // the reason alone, without the door's words

  choose(el) {
    // The chosen element: the corner handle moves onto it, the view's head reads its size
    this.setBlocked(null, "");
    this.target = el;
    if (!this.first.has(el)) { const r = el.getBoundingClientRect(); this.first.set(el, { w: r.width, h: r.height }); }
    this.ui.els.handle.setAttribute("data-on", "");
    this.ui.box(true); // the tool's box opens on the choice
    this.ui.paint();
  }

  handleEvents(handle) {
    // Dragging the handle writes the element's size as inline px (a border-box size, whatever its box-sizing); the block size follows the content.
    // A parent always wins: children resized earlier are narrowed with it, as one undo step. Left/Right arrows on the focused handle step by 1px (Shift: 10)
    handle.addEventListener("pointerdown", (e) => {
      const el = this.target;
      if (e.button !== 0 || !el || !resizeSupported(el)) return;
      e.preventDefault(); e.stopPropagation();
      this.ui.finishEdit();
      const from = { x: e.clientX, w: el.getBoundingClientRect().width };
      const session = this.start(el);
      let want = from.w;
      this.ui.gesture(e, (event) => {
        want = Math.max(1, from.w + event.clientX - from.x);
        this.width(session, want);
        if (!this.drag) return;
        // The warning comes up the moment the drag meets a limit, and goes the moment it leaves it
        const held = this.cap.x || Math.abs(el.getBoundingClientRect().width - want) > 1, now = performance.now();
        if (held && (!this.blockedText() || now - (this.explainedAt || 0) > 200)) { this.explainedAt = now; this.explain(el, want); }
        else if (!held && this.blockedText()) this.setBlocked(null, "");
      }, (_, cancelled) => {
        this.finish(session, cancelled);
        this.ui.suppressClick();
        if (!cancelled && el.isConnected) this.explain(el, want);
      });
    });
    handle.addEventListener("keydown", (e) => {
      const el = this.target;
      if (!["ArrowLeft", "ArrowRight"].includes(e.key) || !el || !resizeSupported(el)) return;
      e.preventDefault(); e.stopPropagation();
      const session = this.start(el);
      const want = Math.max(1, el.getBoundingClientRect().width + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1));
      this.width(session, want);
      this.finish(session, false);
      this.explain(el, want);
    });
  }

  start(el) {
    // One resize session: the element, the children resized earlier (narrowed with it), their drag-start attributes, the layout's limits
    if (!this.sized.has(el)) this.sized.set(el, el.getAttribute("style"));
    const cs = getComputedStyle(el);
    const kids = [...this.sized.keys()].filter((kid) => kid !== el && el.contains(kid) && kid.isConnected);
    const before = new Map([el, ...kids].map((node) => [node, node.getAttribute("style")]));
    // Observe without claiming a write. A page change before our first move must be detectable,
    // and a cancelled press that wrote nothing must never restore the page's style.
    for (const [node, attr] of before) {
      if (this.pageSized(node)) this.sized.set(node, attr);
      this.wrote.set(node, { attr, prop: sizeProp(node), written: false });
    }
    this.cap = { x: null, y: null }; this.hugs = new Set();
    this.drag = el; this.ui.host.setAttribute("resizing", "");
    return { el, kids, before, extra: extraOf(cs), limit: sizeLimits(this.ui.store, el, cs) };
  }

  width(session, desired) {
    // One step: the layout's rules hold (never past the parent's content box, never past a grid track; the handle may ask, the element stays inside),
    // and never narrower than its own content: the children stay inside (an element that clips or scrolls its overflow is its own rule);
    // the children resized earlier start each step from their drag-start size, so a step that narrowed them is undone by a wider one
    const { el, kids, before, extra, limit } = session;
    if (!el.isConnected || helper(el)) { this.cancel(); return; }
    if (!resizeSupported(el)) { this.cancel(); this.setBlocked(null, "transformed: edit the CSS value instead"); return; }
    // A size the page wrote since the tool's last write is the page's: the step starts from it, and a cancel or an undo returns to it, not to the drag's start
    for (const node of [el, ...kids]) if (this.pageSized(node)) { const attr = node.getAttribute("style"); before.set(node, attr); this.sized.set(node, attr); } // the Reset's record moves with it
    let w = Math.max(1, desired);
    this.cap = { x: null, y: null };
    if (w > limit.w) { w = limit.w; this.cap.x = limit.whyW; }
    // The box the element must stay inside is the nearest ancestor's content box that does NOT move with it: an ancestor whose content box moved
    // with the write hugs its content (it grows with the element, up to its own limit) and the bound is the one above it, down to the body
    const chain = []; for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) chain.push({ a, was: contentWidth(a) });
    if (this.writeSize(el, Math.round(w - extra))) this.cap.x ||= "parent";
    let bound = chain.at(-1)?.a || null;
    for (const { a, was } of chain) { if (Math.abs(contentWidth(a) - was) > 0.5) this.hugs.add(a); else { bound = a; break; } }
    const over = limit.parent && bound ? overflow(el, bound) : null;
    if (over?.x > 0.5) { this.writeSize(el, Math.max(1, Math.round(w - over.x - extra))); this.cap.x ||= "parent"; }
    for (let pass = 0; ; pass++) {
      for (const kid of kids) this.restoreSize(kid, before.get(kid));
      this.crush(el, kids);
      const need = contentNeed(el);
      if (need.x <= 1 || pass === 4) break; // scrollWidth is an integer (Firefox rounds both sides): a 1px "need" at the edge is rounding, not content
      this.writeSize(el, Math.round(el.getBoundingClientRect().width + need.x - extra), false); this.cap.x = "content";
    }
    this.ui.paint();
  }

  finish(session, cancelled) {
    // A cancelled session puts the size properties back; a finished one records what changed as one undo entry
    // A step's "after" is the tool's own last write, so a size the page wrote between the last move and the release is not undone as if it were the tool's
    if (cancelled) for (const [node, attr] of session.before) { if (this.wrote.get(node)?.written && !this.pageSized(node)) this.restoreSize(node, attr, this.wrote.get(node)?.prop); } // a size the page wrote after the last move stands
    else {
      const steps = [...session.before].filter(([node, attr]) => this.wrote.get(node)?.written && node.isConnected && node.getAttribute("style") !== attr)
        .map(([node, attr]) => ({ el: node, before: attr, after: this.wrote.get(node)?.attr ?? node.getAttribute("style"), prop: this.wrote.get(node)?.prop }));
      if (steps.length) this.history.push(steps);
    }
    this.drag = null; this.ui.host.removeAttribute("resizing");
    this.changed();
  }

  changed() { this.ui.dirtyHtml(); this.ui.queueLoad(); this.ui.paint(); }

  reset(el, record = true) {
    // The handle's Reset: this element's size back to its own style attribute, as one undo step
    this.cancel();
    if (!el || !this.sized.has(el)) return;
    this.setBlocked(null, "");
    const before = el.getAttribute("style"), prop = this.wrote.get(el)?.prop;
    if (this.pageSized(el)) { this.sized.delete(el); this.wrote.delete(el); this.setBlocked(null, "resize skipped: the page changed it"); } // the page's size stands, the element is its own again
    else {
      this.restoreSize(el, this.sized.get(el), prop);
      this.sized.delete(el);
      if (record && el.getAttribute("style") !== before) this.history.push([{ el, before, after: el.getAttribute("style"), prop }]);
    }
    this.changed();
  }

  undo() {
    // Undo: the last resize back, the children it narrowed and the handle's Reset included.
    // A step whose size the page has written since (another value, another priority) is skipped: the page's write stands
    this.cancel();
    const entry = this.history.pop();
    if (!entry) return;
    this.setBlocked(null, "");
    let skipped = 0;
    for (const step of [...entry].reverse()) {
      if (!step.el.isConnected || helper(step.el)) { skipped++; continue; }
      const now = sizeOf(step.el, step.el.getAttribute("style"), step.prop), expected = sizeOf(step.el, step.after, step.prop);
      if (now.value !== expected.value || now.priority !== expected.priority) { skipped++; continue; }
      if (!this.sized.has(step.el)) this.sized.set(step.el, step.after); // undone past its Reset: the current attribute is what Reset returns to
      this.restoreSize(step.el, step.before, step.prop);
      if (step.el.getAttribute("style") === this.sized.get(step.el)) this.sized.delete(step.el);
    }
    if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
    this.changed();
  }

  resetAll() {
    // Clear all's part: every resized element back to its own size, the history cleared
    this.cancel();
    let skipped = 0;
    for (const [el, attr] of this.sized) { if (this.pageSized(el)) skipped++; else this.restoreSize(el, attr, this.wrote.get(el)?.prop); }
    this.sized.clear(); this.history.clear();
    if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
    this.changed();
  }

  paintHold(el, chrome) {
    // The area that held the resize: a red dashed frame with the reason on a red chip (the name chip's spots, never over a control)
    const { painter } = this.ui, { r } = painter.geometry(el);
    painter.box("dbox", r.left, r.top, r.width, r.height);
    painter.chip(painter.label("hold", this.blockedText(), 0, 0), r, chrome);
  }

  paintSizer(el, chrome = []) {
    // The chosen element: its frame, the handle on its bottom-right corner (kept reachable inside the viewport), its live size in the view's head
    const { painter, els } = this.ui, { r } = painter.geometry(el);
    painter.box("box", r.left, r.top, r.width, r.height);
    const first = this.first.get(el) || { w: r.width, h: r.height }, dw = r.width - first.w, dh = r.height - first.h;
    els.wval.textContent = `${name(el)} ${fmt(first.w)} × ${fmt(first.h)}px`;
    const sign = (d) => (Math.abs(d) < 0.01 ? "0" : (d > 0 ? "+" : "−") + fmt(Math.abs(d))); const diff = document.createElement("span"); diff.className = "wdiff"; diff.textContent = `${sign(dw)} × ${sign(dh)}px`;
    els.wnow.replaceChildren(`${fmt(r.width)} × ${fmt(r.height)}px`, diff); // the size now with the difference, 0 × 0px before a resize
    if (Math.abs(dw) >= 0.01 || Math.abs(dh) >= 0.01) { // a changed size reads on the page too: a line along the width and one along the height, each with its number
      const above = r.top >= 32, y = above ? r.top - 10 : r.top + 10;
      painter.box("ln dim-width", r.left, y, r.width, 1);
      painter.place(painter.label("sz", `${fmt(r.width)}px`, 0, y + (above ? -12 : 12)), "left", r.left, r.right, chrome);
      const beside = painter.beside(r, chrome), x = beside ? r.right + 10 : r.right - 10;
      painter.box("ln dim-height", x, r.top, 1, r.height);
      const l = painter.label("sz", `${fmt(r.height)}px`, x + (beside ? 8 : -8), 0); l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
      painter.place(l, "top", r.top, r.bottom, chrome);
    }
    const supported = resizeSupported(el);
    els.handle.disabled = !supported;
    els.handle.setAttribute("aria-label", `Adjust the width of ${name(el)}: ${fmt(r.width)}px`);
    if (!supported && !this.blockedText()) this.setBlocked(null, "transformed: edit the CSS value instead");
    const half = els.handle.offsetWidth / 2 || 16;
    const hx = Math.min(Math.max(r.right, half), innerWidth - half), hy = Math.min(Math.max(r.bottom, half), innerHeight - half);
    els.handle.style.left = `${hx}px`;
    els.handle.style.top = `${hy}px`;
    // the Reset sits right of the handle, or left of it against the viewport's edge, only once the element has been resized
    const reset = els.hreset, w = reset.offsetWidth || 50, h = reset.offsetHeight || 20, gap = half + 6;
    reset.toggleAttribute("data-on", this.sized.has(el));
    reset.style.left = `${Math.max(4, hx + gap + w > innerWidth - 4 ? hx - gap - w : hx + gap)}px`;
    reset.style.top = `${Math.max(4, Math.min(hy - h / 2, innerHeight - h - 4))}px`;
  }
}
