// The overlay's drawing primitives: boxes, bands, labels and chips placed in the viewport without covering a control or each other.
// It knows the overlay element alone: callers begin() a frame, open group()s, draw into them and end() it; the labels' spots are resolved at end(),
// from one layout read for the whole frame. `chrome` is the list of rects the labels must keep off (the rail, the open box).
import { num, fmt, name, span } from "../util.js";

export class Painter {
  constructor(ov) {
    this.ov = ov;
    this.into = null; // the group the next box lands in
    this.placed = []; // the labels' rects this frame, for collision
    this.pending = []; // the labels waiting for their spot: chips, fixed labels and line labels, resolved together at end()
    this.rectCache = null; this.geometryCache = null; // one measurement per element per frame
  }

  begin() {
    this.rectCache = new Map(); this.geometryCache = new Map();
    this.ov.replaceChildren(); this.placed = []; this.pending = [];
  }

  end() { this.resolve(); this.into = null; this.rectCache = null; this.geometryCache = null; }

  group(cls, accent) {
    const group = document.createElement("div"); group.className = cls;
    if (accent) group.style.setProperty("--accent", accent);
    this.ov.append(group); this.into = group;
    return group;
  }

  rect(el) {
    if (this.rectCache?.has(el)) return this.rectCache.get(el);
    const r = el.getBoundingClientRect();
    this.rectCache?.set(el, r);
    return r;
  }

  box(cls, l, t, w, h) {
    const n = document.createElement("div");
    n.className = cls;
    n.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
    (this.into || this.ov).append(n);
    return n;
  }

  label(cls, text, x, y) {
    const n = document.createElement("div");
    n.className = "lb " + cls;
    if (typeof text === "string") n.textContent = text; else n.append(...text);
    n.style.cssText = `left:${x}px;top:${y}px`;
    (this.into || this.ov).append(n);
    return n;
  }

  geometry(el) {
    if (this.geometryCache?.has(el)) return this.geometryCache.get(el);
    const r = this.rect(el), cs = getComputedStyle(el);
    const side = (p) => ({ t: num(cs[`${p}Top`]), r: num(cs[`${p}Right`]), b: num(cs[`${p}Bottom`]), l: num(cs[`${p}Left`]) });
    const b = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) };
    const result = { r, cs, p: side("padding"), m: side("margin"), b };
    this.geometryCache?.set(el, result);
    return result;
  }

  ring(cls, r, s, only, labelCls) {
    // A band drawn as the border of one box: outer edges r, thickness per side s (only the named sides)
    const w = { t: only.t ? s.t : 0, r: only.r ? s.r : 0, b: only.b ? s.b : 0, l: only.l ? s.l : 0 };
    const n = this.box(cls, r.left, r.top, r.width, r.height);
    n.style.borderWidth = `${w.t}px ${w.r}px ${w.b}px ${w.l}px`;
    if (!labelCls) return;
    if (w.t) this.fix(this.label(labelCls, fmt(w.t), r.left + r.width / 2, r.top + w.t / 2));
    if (w.b) this.fix(this.label(labelCls, fmt(w.b), r.left + r.width / 2, r.bottom - w.b / 2));
    if (w.l) this.fix(this.label(labelCls, fmt(w.l), r.left + w.l / 2, r.top + r.height / 2));
    if (w.r) this.fix(this.label(labelCls, fmt(w.r), r.right - w.r / 2, r.top + r.height / 2));
  }

  outer(r, m) {
    return { left: r.left - m.l, top: r.top - m.t, right: r.right + m.r, bottom: r.bottom + m.b, width: r.width + m.l + m.r, height: r.height + m.t + m.b };
  }

  chipParts(el, r, size = true) {
    // name · W × H, a flex/grid word when the element lays out its children that way
    const parts = [span("n", name(el))];
    if (size) parts.push(span("bar", "|"), span("", `${fmt(r.width)} × ${fmt(r.height)}px`));
    const d = this.geometry(el).cs.display;
    if (/flex|grid/.test(d)) parts.push(span("fx", d.replace("inline-", "")));
    return parts;
  }

  dims(r, chrome) {
    // Width line above the box, height line beside it; inside the edge when the viewport has no room
    const above = r.top >= 32;
    const w = this.box("ln dim-width", r.left, above ? r.top - 10 : r.top + 10, r.width, 1);
    const beside = this.beside(r, chrome);
    const h = this.box("ln dim-height", beside ? r.right + 10 : r.right - 10, r.top, 1, r.height);
    const wl = this.label("sz", `${fmt(r.width)}px`, 0, 0);
    const hl = this.label("sz", `${fmt(r.height)}px`, 0, 0);
    wl.style.top = `${num(w.style.top) + (above ? -12 : 12)}px`;
    hl.style.left = `${num(h.style.left) + (beside ? 8 : -8)}px`;
    hl.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
    this.place(wl, "left", r.left, r.right, chrome);
    this.place(hl, "top", r.top, r.bottom, chrome);
  }

  chip(label, r, chrome) {
    // The name chip: above the element, else below, else inside its top-left corner; never over the panel or another chip. Resolved at end()
    this.pending.push({ kind: "chip", label, r, chrome });
  }

  fix(label) {
    // The label stays where it was drawn, clamped into the viewport, and the labels after it keep off it. Resolved at end()
    this.pending.push({ kind: "fix", label });
    return label;
  }

  place(label, side, from, to, chrome) {
    // Centers the label on its line, then slides it along the line until it clears the panel (or the pill)
    // and every label already placed; the first free spot nearest the centre wins. Resolved at end()
    this.pending.push({ kind: "place", label, side, from, to, chrome });
  }

  beside(r, chrome) {
    // The height line stands outside the right edge when the viewport has room there and no chrome (the rail, the open box) is over it
    if (innerWidth - r.right < 90) return false;
    return !chrome.some((c) => r.right + 10 < c.right && r.right + 90 > c.left && r.top < c.bottom && r.bottom > c.top);
  }

  resolve() {
    // The labels' spots, in drawing order, from ONE layout: every label's size and transform are read first (a single forced layout for the frame),
    // then each spot is computed in numbers and written, never read back. Reading after every write made a 300-chip frame cost a minute on a big page
    const sizes = new Map();
    for (const { label } of this.pending) {
      if (sizes.has(label)) continue;
      const b = label.getBoundingClientRect(), t = getComputedStyle(label).transform.match(/matrix\(([^)]*)\)/);
      const [, , , , tx, ty] = t ? t[1].split(",").map(Number) : [1, 0, 0, 1, 0, 0];
      sizes.set(label, { w: b.width, h: b.height, tx, ty });
    }
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const rectOf = (label) => { const s = sizes.get(label), l = num(label.style.left) + s.tx, t = num(label.style.top) + s.ty; return { left: l, top: t, right: l + s.w, bottom: t + s.h, width: s.w, height: s.h }; };
    const clamp = (label) => {
      // Keeps a label inside the viewport, whatever transform it wears
      const b = rectOf(label);
      let dx = 0, dy = 0;
      if (b.left < 4) dx = 4 - b.left; else if (b.right > innerWidth - 4) dx = innerWidth - 4 - b.right;
      if (b.top < 4) dy = 4 - b.top; else if (b.bottom > innerHeight - 4) dy = innerHeight - 4 - b.bottom;
      if (dx) label.style.left = `${num(label.style.left) + dx}px`;
      if (dy) label.style.top = `${num(label.style.top) + dy}px`;
    };
    const free = (label, chrome) => { const b = rectOf(label); return !chrome.some((c) => hits(b, c)) && !this.placed.some((p) => hits(b, p)); };
    for (const item of this.pending) {
      const { label } = item;
      if (!label.isConnected) continue;
      if (item.kind === "fix") { clamp(label); this.placed.push(rectOf(label)); continue; }
      if (item.kind === "chip") {
        const { r, chrome } = item, { w, h } = sizes.get(label);
        const spots = [];
        if (r.top - h - 8 >= 0) spots.push([r.left, r.top - h - 8]);
        if (r.bottom + h + 8 <= innerHeight) spots.push([r.left, r.bottom + 8]);
        spots.push([r.left + 8, r.top + 8], [r.right + 8, r.top], [r.left - w - 8, r.top]);
        let found = false;
        for (const [x, y] of spots) {
          label.style.left = `${Math.max(x, 0)}px`;
          label.style.top = `${y}px`;
          clamp(label); // the collision test reads the clamped spot: a chip pushed in from the edge must not land on a control
          if (free(label, chrome)) { this.placed.push(rectOf(label)); found = true; break; }
        }
        if (!found) label.remove(); // no free spot: the frame and bands stand, the name chip must not cover a control or another chip
        continue;
      }
      const { side, from, to, chrome } = item, { w, h } = sizes.get(label);
      const set = (mid) => { label.style[side] = `${mid}px`; };
      const mid = (from + to) / 2;
      set(mid);
      if (!free(label, chrome)) {
        const size = side === "left" ? w : h, step = size * 0.6 + 4;
        const span = Math.max((to - from) / 2 - size / 2, 0);
        let found = false;
        for (let k = 1; k * step <= span && !found; k++) {
          for (const dir of [1, -1]) { set(mid + dir * k * step); if (free(label, chrome)) { found = true; break; } }
        }
        if (!found) {
          // No room along the line: step off it, row by row, until the label clears everything
          set(mid);
          const cross = side === "left" ? "top" : "left", thick = (side === "left" ? h : w) + 4;
          const base = num(label.style[cross]);
          for (let k = 1; k <= 4 && !found; k++) {
            for (const dir of [-1, 1]) { label.style[cross] = `${base + dir * k * thick}px`; if (free(label, chrome)) { found = true; break; } }
          }
          if (!found) label.style[cross] = `${base}px`;
        }
      }
      clamp(label); this.placed.push(rectOf(label));
    }
    this.pending = [];
  }
}
