// The overlay's drawings: a picked element, the probe under the picker, the ruler's bands, the gap Alt measures, a declaration's reach and its size line.
// Free functions over the Painter (overlay/painter.js): the panel passes the painter, the element and the chrome rect the labels must dodge.
import { num, fmt, camel, sides, SIZE } from "../util.js";
import { helper } from "../foreign.js";

export function paintModel(painter, el, hue, chrome, focus) {
  // A picked element: its frame, the width and height lines with their sizes, the name chip in its hue;
  // the last pick also draws the guide lines across the viewport
  const r = painter.geometry(el).r;
  if (el === focus) {
    painter.box("gd v", r.left, 0, 0, innerHeight);
    painter.box("gd v", r.right, 0, 0, innerHeight);
    painter.box("gd h", 0, r.top, innerWidth, 0);
    painter.box("gd h", 0, r.bottom, innerWidth, 0);
  }
  painter.box("box", r.left, r.top, r.width, r.height);
  painter.chip(painter.label("hue", painter.chipParts(el, r, false), 0, 0), r, chrome);
  painter.dims(r, chrome);
}

export function paintProbe(painter, el, chrome) {
  // The element under the picker: its frame, the width and height lines with their sizes, the name chip
  const r = painter.geometry(el).r;
  painter.box("box", r.left, r.top, r.width, r.height);
  painter.chip(painter.label("", painter.chipParts(el, r, false), 0, 0), r, chrome);
  painter.dims(r, chrome);
}

export function paintMeasure(painter, el, chrome) {
  // The ruler: the frame, one DevTools-style chip (name | W × H) and the margin, border and padding bands with their values where they are non-zero;
  // no measure lines, they drowned the page when every element wore them
  const { r, p, m, b } = painter.geometry(el);
  const all = { t: 1, r: 1, b: 1, l: 1 };
  const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
  if (pos.t || pos.r || pos.b || pos.l) painter.ring("mr", painter.outer(r, pos), pos, all, "mv");
  if (b.t || b.r || b.b || b.l) painter.ring("bd", r, b, all, "bv");
  const inner = { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b };
  if (p.t || p.r || p.b || p.l) painter.ring("pd", inner, p, all, "pv");
  painter.box("box", r.left, r.top, r.width, r.height);
  painter.chip(painter.label("", painter.chipParts(el, r, true), 0, 0), r, chrome);
  paintFree(painter, el, r, m);
}

export function paintFree(painter, el, r, m) {
  // The room a block-level box leaves beside itself in a block container (the card's img at 299px in a 536px content box): hatched, with its width
  const parent = el.parentElement, cs = painter.geometry(el).cs;
  if (!parent || helper(parent)) return;
  const pcs = getComputedStyle(parent);
  if (!/^(block|flow-root|list-item)$/.test(pcs.display) || !/^(block|flex|grid|table|list-item|flow-root)$/.test(cs.display) || cs.float !== "none" || /absolute|fixed/.test(cs.position)) return;
  const { r: pr, p: pp, b: pb } = painter.geometry(parent);
  const inner = { left: pr.left + pb.l + pp.l, right: pr.right - pb.r - pp.r };
  const top = r.top - Math.max(m.t, 0), height = r.height + Math.max(m.t, 0) + Math.max(m.b, 0);
  for (const [l, w] of [[inner.left, r.left - Math.max(m.l, 0) - inner.left], [r.right + Math.max(m.r, 0), inner.right - r.right - Math.max(m.r, 0)]]) {
    if (w < 24 || height < 8) continue;
    painter.box("free", l, top, w, height);
    if (w >= 72) painter.label("fv", `unused ${fmt(w)}px`, l + w / 2, top + height / 2);
  }
}

export function paintDistance(painter, from, to, chrome) {
  // Alt while picking: the gap between the last pick and the element under the pointer, along the nearest side
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  painter.box("dbox", b.left, b.top, b.width, b.height);
  let line = null, gap = 0, chipX, chipY;
  const mid = (lo1, hi1, lo2, hi2) => { const lo = Math.max(lo1, lo2), hi = Math.min(hi1, hi2); return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2; };
  if (b.left >= a.right) { gap = b.left - a.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = painter.box("dln", a.right, y, gap, 1); chipX = a.right + gap / 2; chipY = y; }
  else if (b.right <= a.left) { gap = a.left - b.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = painter.box("dln", b.right, y, gap, 1); chipX = b.right + gap / 2; chipY = y; }
  else if (b.top >= a.bottom) { gap = b.top - a.bottom; const x = mid(a.left, a.right, b.left, b.right); line = painter.box("dln", x, a.bottom, 1, gap); chipX = x; chipY = a.bottom + gap / 2; }
  else if (b.bottom <= a.top) { gap = a.top - b.bottom; const x = mid(a.left, a.right, b.left, b.right); line = painter.box("dln", x, b.bottom, 1, gap); chipX = x; chipY = b.bottom + gap / 2; }
  if (line) painter.label("dch", fmt(gap), chipX, chipY);
  painter.chip(painter.label("", painter.chipParts(to, b), 0, 0), b, chrome);
}

export function paintDecl(painter, el, d, chrome) {
  // A hovered or pinned declaration: where its rule lands, with the band or size it sets; no name chip
  const { r, cs, p, m, b } = painter.geometry(el);
  const band = sides(d.prop, cs);
  if (band && band.kind === "padding") {
    painter.ring("pd", { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b }, p, band.sides, "pv");
  } else if (band) {
    const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
    painter.ring("mr", painter.outer(r, pos), pos, band.sides, "mv");
  }
  painter.box("box", r.left, r.top, r.width, r.height);
  if (!band && SIZE.test(d.prop)) sizeLine(painter, el, d, r, cs, p, b, chrome);
}

export function sizeLine(painter, el, d, r, cs, p, b, chrome) {
  // A line as long as the property resolves to, on the element's start edge; auto/none fall back to the box
  const vertical = /^(vertical|sideways)/.test(cs.writingMode);
  const horizontal = /width/.test(d.prop) || (/inline-size/.test(d.prop) && !vertical) || (/block-size/.test(d.prop) && vertical);
  const resolved = num(cs[camel(d.prop)]);
  const content = cs.boxSizing === "content-box";
  const pad = content ? (horizontal ? b.l + p.l : b.t + p.t) : 0;
  const len = Number.isFinite(parseFloat(cs[camel(d.prop)])) ? resolved : (horizontal ? r.width : r.height) - (content ? (horizontal ? b.l + b.r + p.l + p.r : b.t + b.b + p.t + p.b) : 0);
  const text = `${d.prop}: ${d.value}`;
  if (horizontal) {
    const above = r.top >= 32;
    const y = above ? r.top - 10 : r.top + 10;
    painter.box("ln dim-width", r.left + pad, y, len, 1);
    const l = painter.label("sz", text, 0, y + (above ? -12 : 12));
    painter.place(l, "left", r.left + pad, r.left + pad + len, chrome);
  } else {
    const beside = painter.beside(r, chrome);
    const x = beside ? r.right + 10 : r.right - 10;
    painter.box("ln dim-height", x, r.top + pad, 1, len);
    const l = painter.label("sz", text, x + (beside ? 8 : -8), 0);
    l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
    painter.place(l, "top", r.top + pad, r.top + pad + len, chrome);
  }
}
