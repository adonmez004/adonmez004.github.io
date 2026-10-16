// What the layout allows an element's width, and why a resize did not land: measurements off the live page (computed styles, rects, scroll sizes)
// and the rule that held the size, named for the bar and the CSS tab. Nothing here touches the inspector's state; the resize tool asks and acts.
import { num, fmt, name } from "../util.js";
import { helper } from "../foreign.js";

export const sizeProp = (el) => (/^(vertical|sideways)/.test(getComputedStyle(el).writingMode) ? "block-size" : "inline-size");

export const extraOf = (cs) => (cs.boxSizing === "content-box" ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : 0); // the padding and border a content-box width leaves out

export function sizeOf(el, attr, prop = sizeProp(el)) {
  // The size property as a style attribute string holds it: value, priority, and the attribute's normalized text.
  // The property is the one the tool wrote at the time (a step keeps it), so a writing mode the page changed since does not redirect the step
  const style = document.createElement("div").style;
  style.cssText = attr || "";
  return { prop, value: style.getPropertyValue(prop), priority: style.getPropertyPriority(prop), cssText: style.cssText };
}

export function resizeSupported(el) {
  // A transformed or zoomed element (or ancestor) renders at another scale than its CSS size: the drag would write the wrong number
  for (let node = el; node; node = node.parentElement) {
    const cs = getComputedStyle(node);
    if (cs.transform !== "none" || (cs.zoom && cs.zoom !== "normal" && num(cs.zoom) !== 1)) return false;
  }
  return true;
}

export function contentNeed(el) {
  // How far the element's content reaches past its padding box, per axis, when its overflow is visible
  const cs = getComputedStyle(el), out = { x: 0, y: 0 };
  if (cs.display === "inline" || !el.scrollWidth) return out;
  if (cs.overflowX === "visible") out.x = el.scrollWidth - el.clientWidth;
  if (cs.overflowY === "visible") out.y = el.scrollHeight - el.clientHeight;
  return out;
}

export function overflow(el, parent) {
  // How far the element's margin box reaches past the parent's content box, per axis
  const r = el.getBoundingClientRect(), pr = parent.getBoundingClientRect(), pcs = getComputedStyle(parent), cs = getComputedStyle(el);
  const right = pr.right - num(pcs.paddingRight) - num(pcs.borderRightWidth), bottom = pr.bottom - num(pcs.paddingBottom) - num(pcs.borderBottomWidth);
  return { x: r.right + Math.max(num(cs.marginRight), 0) - right, y: r.bottom + Math.max(num(cs.marginBottom), 0) - bottom };
}

export function trackTokens(value, limit = 2048) {
  // The declared track list as tokens: bracketed line names and comments dropped, a numeric repeat() unrolled (capped), an auto-fill/auto-fit repeat reduced to its pattern
  const tokens = [];
  let depth = 0, brackets = 0, quote = null, token = "";
  const source = value.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) { token += ch; if (ch === "\\") token += source[++i] || ""; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "[") brackets++; else if (ch === "]") brackets = Math.max(0, brackets - 1);
    if (/\s/.test(ch) && !depth && !brackets) { if (token) tokens.push(token); token = ""; } else token += ch;
  }
  if (token) tokens.push(token);
  const out = [];
  for (const item of tokens) {
    if (out.length >= limit) break;
    if (/^\[.*\]$/.test(item)) continue;
    const repeat = item.match(/^repeat\((auto-fill|auto-fit|\d+),\s*(.*)\)$/);
    if (!repeat) { out.push(item); continue; }
    const inner = trackTokens(repeat[2], limit - out.length);
    if (!inner.length) continue;
    const count = /^\d+$/.test(repeat[1]) ? Math.min(Number(repeat[1]), Math.ceil((limit - out.length) / inner.length)) : 1;
    for (let n = 0; n < count && out.length < limit; n++) out.push(...inner.slice(0, limit - out.length));
  }
  return out;
}

export function declaredOn(store, el, props) {
  // The last live declaration of one of the props in the rules reaching the element
  const models = store.models.filter((m) => !m.inlineEl && store.matchModel(m, [el]).length > 0);
  for (const m of models.reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
  return null;
}

export function sizeLimits(store, el, cs) {
  // What the layout allows the element's width: a grid item in a FIXED track (a length, a percentage or fr the parent declared) stays in its area;
  // an auto track grows with it, and the parent's content box is the limit there
  const parent = el.parentElement;
  const out = { w: Infinity, whyW: null, parent: null };
  if (!parent || /absolute|fixed/.test(cs.position)) return out;
  out.parent = parent;
  const pcs = getComputedStyle(parent);
  if (/grid/.test(pcs.display)) {
    const decl = declaredOn(store, parent, ["grid-template-columns", "grid-template", "grid"]);
    const sizes = pcs.gridTemplateColumns.split(" ").map(num).filter((n) => n > 0), gap = num(pcs.columnGap);
    if (decl && sizes.length) {
      const tokens = trackTokens(decl.value), pr = parent.getBoundingClientRect(), r = el.getBoundingClientRect();
      let x = pr.left + num(pcs.borderLeftWidth) + num(pcs.paddingLeft), first = -1, last = -1, width = 0;
      sizes.forEach((size, i) => {
        const overlaps = x + size > r.left + 0.5 && x < r.right - 0.5;
        if (overlaps) { if (first < 0) first = i; last = i; width += size + (first < i ? gap : 0); }
        x += size + gap;
      });
      const fixed = (t) => /^(\d|\.)/.test(t) && /(px|%|em|rem|vw|vh|vmin|vmax|fr|ch|ex)$/.test(t) || /^minmax\(.*,\s*(\d|\.)[^)]*(px|%|em|rem|vw|vh|fr|ch)\)$/.test(t);
      if (first >= 0 && tokens.length && Array.from({ length: last - first + 1 }, (_, k) => tokens[Math.min(first + k, tokens.length - 1)]).every(fixed)) { out.w = width; out.whyW = "grid"; }
    }
  }
  return out;
}

export const contentWidth = (el) => { const cs = getComputedStyle(el); return el.getBoundingClientRect().width - num(cs.paddingLeft) - num(cs.paddingRight) - num(cs.borderLeftWidth) - num(cs.borderRightWidth); }; // the content box's width

export function parentBase(store, el) {
  // The parent's content-box width when it limits the element plainly, else 0 (an auto grid track, a positioned or inline element)
  const parent = el.parentElement, cs = getComputedStyle(el);
  if (!parent || /absolute|fixed/.test(cs.position) || cs.display === "inline") return 0;
  const pcs = getComputedStyle(parent);
  if (/grid/.test(pcs.display) && sizeLimits(store, el, cs).whyW !== "grid") return 0; // an auto track: cyclic
  return contentWidth(parent);
}

const reaches = (store, m, target) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && store.matchModel(m, [target]).length > 0;
export const rulesOf = (store, target) => [...store.models.filter((m) => reaches(store, m, target)), ...store.models.filter((m) => m.inlineEl === target)];
const find = (models, props) => { for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d; return null; };
const say = (d) => [{ p: d.prop }, ": ", { v: d.value }]; // a declaration as parts: the property, the value
const E = (el) => ({ e: name(el) }); // an element's name as a part

export function widthWhy(store, a) {
  // What sets an element's width, in a few words: its own max/min/width rule, a percentage of the parent, a grid track, hugging its content, filling the parent, the viewport
  const acs = getComputedStyle(a), ar = a.getBoundingClientRect(), own = rulesOf(store, a), parent = a.parentElement;
  if (a === document.documentElement || a === document.body) { const w = find(own, ["width", "inline-size", "max-width", "max-inline-size"]); return w ? say(w) : ["the viewport"]; }
  const pad = extraOf(acs);
  const maxD = find(own, ["max-width", "max-inline-size"]), minD = find(own, ["min-width", "min-inline-size"]), sizeD = find(own, ["width", "inline-size"]);
  if (acs.maxWidth !== "none" && Math.abs(num(acs.maxWidth) + pad - ar.width) <= 1) return maxD ? say(maxD) : [{ p: "max-width" }, ": ", { v: acs.maxWidth }];
  if (acs.minWidth !== "auto" && num(acs.minWidth) > 0 && Math.abs(num(acs.minWidth) + pad - ar.width) <= 1) return minD ? say(minD) : [{ p: "min-width" }, ": ", { v: acs.minWidth }];
  if (sizeD && !/^(auto|fit-content|max-content|min-content)$/.test(sizeD.value)) return /%$/.test(sizeD.value) && parent ? [...say(sizeD), " of ", E(parent)] : say(sizeD);
  if (!parent) return ["the viewport"];
  if (/absolute|fixed/.test(acs.position)) return acs.left !== "auto" && acs.right !== "auto" ? ["both insets"] : ["its content"];
  const pcs = getComputedStyle(parent), limit = sizeLimits(store, a, acs);
  if (limit.whyW === "grid") { const g = find(rulesOf(store, parent), ["grid-template-columns", "grid-template", "grid"]); return [E(parent), " grid track: ", { v: g ? g.value : fmt(limit.w) + "px" }]; }
  const shrinks = /inline-block|inline-flex|inline-grid|table/.test(acs.display) || acs.float !== "none" || (/flex/.test(pcs.display) && !/column/.test(pcs.flexDirection) && num(acs.flexGrow) === 0) || (/grid/.test(pcs.display) && /start|end|center/.test(pcs.justifyItems) && acs.justifySelf === "auto") || /start|end|center|self/.test(acs.justifySelf);
  if (shrinks) {
    if (/grid/.test(pcs.display)) { const g = find(rulesOf(store, parent), ["place-items", "justify-items"]); return ["hugs its content: ", E(parent), " grid", ...(g ? [": ", ...say(g)] : [])]; }
    if (/flex/.test(pcs.display)) return ["hugs its content: a flex item of ", E(parent), " with no ", { p: "flex-grow" }];
    return ["hugs its content (", { v: acs.float !== "none" ? "float" : acs.display }, ")"];
  }
  if (/^inline$/.test(acs.display)) return ["its content (", { v: "inline" }, ")"];
  const inner = contentWidth(parent), outer = ar.width + Math.max(num(acs.marginLeft), 0) + Math.max(num(acs.marginRight), 0);
  if (Math.abs(inner - outer) <= 1) return ["fills ", E(parent)];
  return [E(parent), " leaves ", { v: fmt(inner) + "px" }, "; the margins take the rest"];
}

export function heightWhy(store, a) {
  // What sets an element's height, in a few words: its own max/min/height rule, an aspect ratio, a replaced element's intrinsic size, a stretch, else its content
  const acs = getComputedStyle(a), ar = a.getBoundingClientRect(), own = rulesOf(store, a), parent = a.parentElement;
  const pad = acs.boxSizing === "content-box" ? num(acs.paddingTop) + num(acs.paddingBottom) + num(acs.borderTopWidth) + num(acs.borderBottomWidth) : 0;
  const maxD = find(own, ["max-height", "max-block-size"]), minD = find(own, ["min-height", "min-block-size"]), sizeD = find(own, ["height", "block-size"]);
  if (acs.maxHeight !== "none" && Math.abs(num(acs.maxHeight) + pad - ar.height) <= 1) return maxD ? say(maxD) : [{ p: "max-height" }, ": ", { v: acs.maxHeight }];
  if (acs.minHeight !== "auto" && num(acs.minHeight) > 0 && Math.abs(num(acs.minHeight) + pad - ar.height) <= 1) return minD ? say(minD) : [{ p: "min-height" }, ": ", { v: acs.minHeight }];
  if (sizeD && !/^(auto|fit-content|max-content|min-content)$/.test(sizeD.value)) return /%$/.test(sizeD.value) && parent ? [...say(sizeD), " of ", E(parent)] : say(sizeD);
  if (a === document.documentElement && Math.abs(ar.height - innerHeight) <= 1) return ["the viewport"];
  const ratio = find(own, ["aspect-ratio"]);
  if (ratio && acs.aspectRatio !== "auto") return [...say(ratio), ", from its width"];
  if (/^(img|video|canvas|svg|iframe|embed|object)$/.test(a.localName)) {
    const w = a.naturalWidth || a.videoWidth, h = a.naturalHeight || a.videoHeight;
    return h ? ["its intrinsic ratio (", { v: `${w} × ${h}` }, "), from its width"] : ["its intrinsic size"];
  }
  if (/absolute|fixed/.test(acs.position) && acs.top !== "auto" && acs.bottom !== "auto") return ["both insets"];
  if (parent) {
    const pcs = getComputedStyle(parent), pr = parent.getBoundingClientRect();
    const inner = pr.height - num(pcs.paddingTop) - num(pcs.paddingBottom) - num(pcs.borderTopWidth) - num(pcs.borderBottomWidth);
    const outer = ar.height + Math.max(num(acs.marginTop), 0) + Math.max(num(acs.marginBottom), 0);
    const stretch = acs.alignSelf === "stretch" || (acs.alignSelf === "auto" && /normal|stretch/.test(pcs.alignItems));
    if (/flex/.test(pcs.display) && !/column/.test(pcs.flexDirection) && stretch && Math.abs(inner - outer) <= 1) return ["stretches to ", E(parent), "'s row"];
    if (/flex/.test(pcs.display) && /column/.test(pcs.flexDirection) && num(acs.flexGrow) > 0 && Math.abs(inner - outer) > 1) return ["grows in ", E(parent), "'s column"];
    if (/grid/.test(pcs.display) && stretch && Math.abs(inner - outer) <= 1) return ["stretches to ", E(parent), "'s grid"];
  }
  return ["its content"];
}

export function sizeLadder(store, el) {
  // The CSS box's "Show Size" and the quick view: the element's width and height and what sets each, then the same for each parent up to the body.
  // Entries { el, name, w, h, width: parts, height: parts }, read-only
  const out = [];
  if (!el.getBoundingClientRect().width) return out;
  for (let a = el; a; a = a.parentElement) {
    const r = a.getBoundingClientRect();
    out.push({ el: a, name: name(a), w: r.width, h: r.height, width: widthWhy(store, a), height: heightWhy(store, a) });
    if (a === document.body) break;
  }
  return out;
}

export function explainSize(store, el, wantW, cap) {
  // After a resize: when the element did not take the width, the property that kept it (a max or min, an important width,
  // display inline, flex, a grid track, both insets, the parent, its own content) is named: { d, text, area } for the bar, the CSS tab and the page frame;
  // null when the width landed. `cap` is the limit the drag met (parent, grid, content), when it met one
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), parent = el.parentElement, pcs = parent ? getComputedStyle(parent) : null;
  const axes = Math.abs(wantW - r.width) > 1 ? [{ axis: "x", want: wantW, got: r.width }] : [];
  if (!axes.length) return null;
  const rendered = (x) => store.matchModel(x, [el]).length > 0;
  const own = store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && rendered(m));
  const above = parent ? store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && store.matchModel(m, [parent]).length > 0) : [];
  const find = (models, props) => { for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d; return null; };
  const flex = /flex/.test(pcs?.display || ""), grid = /grid/.test(pcs?.display || ""), row = !/column/.test(pcs?.flexDirection || "");
  const held = (d, text, area = null) => ({ d, text, area });
  for (const { axis, want, got } of axes) {
    const x = axis === "x";
    // The element's own max or min comes first: when the width it took IS its max (or min), that rule held it, whatever cap the drag also met
    const maxP = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], minP = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
    const maxC = x ? cs.maxWidth : cs.maxHeight, minC = x ? cs.minWidth : cs.minHeight;
    const pad = cs.boxSizing === "content-box" ? (x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth)) : 0;
    if (maxC !== "none" && got < want && Math.abs(num(maxC) + pad - got) <= 1) { const d = find(own, maxP); return held(d, `held by ${d ? `${d.prop}: ${d.value}` : `${maxP[0]}: ${maxC}`}`); }
    if (minC !== "auto" && num(minC) > 0 && got > want && Math.abs(num(minC) + pad - got) <= 1) { const d = find(own, minP); return held(d, `held by ${d ? `${d.prop}: ${d.value}` : `${minP[0]}: ${minC}`}`); }
    if (cap === "content") {
      // the child that reaches furthest names the limit; its own inline size is lit when it was resized
      const child = [...el.children].filter((c) => !helper(c)).sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return x ? rb.right - ra.right : rb.bottom - ra.bottom; })[0];
      const d = child ? store.models.find((m) => m.inlineEl === child)?.decls.find((k) => k.type === "decl" && k.on && k.prop === (x ? "inline-size" : "block-size")) || null : null;
      return held(d, `held by content${child ? `: ${name(child)}` : ""}`, child || null);
    }
    if (cap) {
      const d = cap === "grid" ? find(above, x ? ["grid-template-columns", "grid-auto-columns", "grid-template", "grid"] : ["grid-template-rows", "grid-auto-rows", "grid-template", "grid"]) : find(above, x ? ["width", "inline-size", "max-width", "max-inline-size"] : ["height", "block-size", "max-height", "max-block-size"]);
      if (cap === "grid") return held(d, `grid track${d ? `: ${d.value}` : ""}`, parent);
      if (d) return held(d, `${name(parent)}: ${d.prop}: ${d.value}`, parent);
      // the parent has no width rule: it is sized by its own parent's layout (a grid or flex that centres it) or by its content
      const gp = parent?.parentElement, gcs = gp ? getComputedStyle(gp) : null;
      if (gcs && /grid/.test(gcs.display)) {
        const g = declaredOn(store, gp, ["place-items", "justify-items"]) || declaredOn(store, parent, ["justify-self", "place-self"]) || declaredOn(store, gp, ["display"]);
        return held(g, `${name(gp)} grid${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
      }
      if (gcs && /flex/.test(gcs.display)) {
        const g = declaredOn(store, parent, ["flex", "flex-grow"]) || declaredOn(store, gp, ["display"]);
        return held(g, `${name(gp)} flex${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
      }
      return held(null, `${name(parent)}: content-sized`, parent);
    }
    const max = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], min = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
    const size = x ? ["width", "inline-size"] : ["height", "block-size"];
    const maxV = x ? cs.maxWidth : cs.maxHeight, minV = x ? cs.minWidth : cs.minHeight;
    let d = null, note = "";
    if (maxV !== "none" && got < want && Math.abs(num(maxV) + (cs.boxSizing === "content-box" ? (x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth)) : 0) - got) <= 1) { d = find(own, max); note = d ? `${d.prop}: ${d.value}` : `${max[0]}: ${maxV}`; }
    else if (minV !== "auto" && num(minV) > 0 && got > want) { d = find(own, min); note = d ? `${d.prop}: ${d.value}` : `${min[0]}: ${minV}`; }
    else if ((d = find(own, size)) && d.important) note = `${d.prop}: ${d.value} !important`;
    else if (cs.display === "inline") { d = find(own, ["display"]); note = "display: inline"; }
    else if (flex && (row === x)) { const grow = num(cs.flexGrow), shrink = num(cs.flexShrink); d = find(own, got < want ? ["flex-shrink", "flex"] : ["flex-grow", "flex"]); note = d ? `${d.prop}: ${d.value}` : got < want && shrink ? `flex-shrink: ${shrink}` : got > want && grow ? `flex-grow: ${grow}` : "the flex container"; if (!d) d = find(above, ["display"]); }
    else if (grid) { d = find(above, x ? ["grid-template-columns", "grid-auto-columns"] : ["grid-template-rows", "grid-auto-rows"]); note = d ? `${d.prop}: ${d.value}` : "the grid track"; }
    else if (/absolute|fixed/.test(cs.position) && (x ? cs.left !== "auto" && cs.right !== "auto" : cs.top !== "auto" && cs.bottom !== "auto")) { d = find(own, x ? ["left", "right", "inset", "inset-inline"] : ["top", "bottom", "inset", "inset-block"]); note = d ? `${d.prop}: ${d.value}` : "both insets"; }
    else { d = null; note = ""; }
    if (note) return held(d, `held by ${note}`);
  }
  return null;
}
