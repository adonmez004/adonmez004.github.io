export const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
export const squash = (s) => s.replace(/\s+/g, " ").trim();
export const num = (v) => parseFloat(v) || 0;
export const fmt = (n) => String(Math.round(n * 100) / 100);
export const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export const name = (el) => el.localName + (el.id ? `#${el.id}` : "") + (el.classList.length ? "." + [...el.classList].join(".") : "");
export const PALETTE = 5;
export const TRUNC = 24; // text-only rows show this many characters while folded
export const COLORISH = /^(color|background(-color)?|border(-.*)?-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color|column-rule-color)$/;
export const isColor = (prop, v) => COLORISH.test(prop) && CSS.supports("color", v);

// Which sides a padding/margin property names: t r b l
export function sides(prop, cs = { writingMode: "horizontal-tb", direction: "ltr" }) {
  const m = prop.match(/^(padding|margin)(?:-(top|right|bottom|left|inline|block))?(?:-(start|end))?$/);
  if (!m) return null;
  const [, kind, part, half] = m;
  let s = { t: 1, r: 1, b: 1, l: 1 };
  if (part === "top") s = { t: 1 }; else if (part === "right") s = { r: 1 }; else if (part === "bottom") s = { b: 1 }; else if (part === "left") s = { l: 1 };
  else if (part === "inline" || part === "block") {
    const vertical = /^(vertical|sideways)/.test(cs.writingMode);
    const rtl = cs.direction === "rtl";
    const reversed = cs.writingMode === "sideways-lr";
    const inline = vertical ? ((rtl !== reversed) ? ["b", "t"] : ["t", "b"]) : (rtl ? ["r", "l"] : ["l", "r"]);
    const block = vertical ? (/-(rl)$/.test(cs.writingMode) ? ["r", "l"] : ["l", "r"]) : ["t", "b"];
    const pair = part === "inline" ? inline : block;
    s = half ? { [pair[half === "start" ? 0 : 1]]: 1 } : { [pair[0]]: 1, [pair[1]]: 1 };
  }
  return { kind, sides: s };
}
export const SIZE = /^(min-|max-)?(inline-size|block-size|width|height)$/;

export function rich(parts) {
  // Reason parts as nodes: a plain string as text, { p } a property, { v } a value, { e } an element name, each in its own colour
  const f = document.createDocumentFragment();
  for (const part of parts) f.append(typeof part === "string" ? part : span(part.p ? "rp" : part.v ? "rv" : "re", part.p ?? part.v ?? part.e));
  return f;
}

export function sizeRows(entry, head = true, kin = "") {
  // A size ladder entry as rows: `name W × Hpx` (head, with its kinship to the element when given: parent, grandparent, …), then `width Wpx: <why>` and `height Hpx: <why>`
  const rows = [];
  if (head) { const n = document.createElement("div"); n.className = "lim lhead"; n.append(span("re", entry.name), ` ${fmt(entry.w)} × ${fmt(entry.h)}px`); if (kin) n.append(span("lkin", kin)); rows.push(n); }
  for (const [word, size, why] of [["width", entry.w, entry.width], ["height", entry.h, entry.height]]) {
    const n = document.createElement("div"); n.className = "lim";
    n.append(span("rp", word), " ", span("rv", fmt(size) + "px"), ": ", rich(why));
    rows.push(n);
  }
  return rows;
}

export function span(cls, text) {
  const s = document.createElement("span");
  s.className = cls;
  s.textContent = text;
  return s;
}
