/* ---------- a small CSS reader: keeps comments and blank lines, maps rules onto the CSSOM ---------- */

export const CONDITIONAL = /^@(media|supports|layer|container|scope)\b/;

export function parseBlock(src, pos, end, lines) {
  // Parses sibling rules/comments/blank lines between pos and end; returns [nodes, nextPos]
  const nodes = [];
  let i = pos;
  const ws = () => {
    let nl = 0;
    while (i < end && /\s/.test(src[i])) { if (src[i] === "\n") nl++; i++; }
    if (nl > 1 && nodes.length) nodes.push({ type: "blank" });
  };
  while (i < end) {
    ws();
    if (i >= end) break;
    if (src[i] === "}") { i++; break; }
    if (src.startsWith("/*", i)) {
      const close = src.indexOf("*/", i + 2);
      const stop = close === -1 ? end : close + 2;
      nodes.push({ type: "comment", text: src.slice(i, stop) });
      i = stop;
      continue;
    }
    const brace = scanTo(src, i, end, "{;");
    if (brace === -1 || brace >= end) { nodes.push({ type: "comment", text: src.slice(i, end).trim() }); i = end; break; }
    const head = src.slice(i, brace).trim();
    const line = lines(i);
    if (src[brace] === ";") { nodes.push({ type: "flat", text: head + ";" }); i = brace + 1; continue; }
    const blockEnd = matchBrace(src, brace, end);
    if (head.startsWith("@") && CONDITIONAL.test(head)) {
      const [children] = parseBlock(src, brace + 1, blockEnd, lines);
      nodes.push({ type: "group", head, children, line });
    } else if (head.startsWith("@keyframes") || head.startsWith("@-webkit-keyframes")) {
      nodes.push({ type: "opaque", head, text: src.slice(brace + 1, blockEnd), line });
    } else {
      nodes.push({ type: "rule", head, decls: parseDecls(src, brace + 1, blockEnd), line });
    }
    i = blockEnd + 1;
  }
  return [nodes, i];
}

export function scanTo(src, i, end, stops) {
  let parens = 0, brackets = 0, braces = 0, quote = null;
  for (; i < end; i++) {
    const ch = src[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === "\\") { i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c < 0 ? end : c + 1; continue; }
    if (!parens && !brackets && !braces && stops.includes(ch)) return i;
    if (ch === "(") parens++; else if (ch === ")") parens = Math.max(0, parens - 1);
    else if (ch === "[") brackets++; else if (ch === "]") brackets = Math.max(0, brackets - 1);
    else if (ch === "{") braces++; else if (ch === "}") braces = Math.max(0, braces - 1);
  }
  return -1;
}

export function matchBrace(src, open, end) {
  let depth = 0, q = null;
  for (let i = open; i < end; i++) {
    const ch = src[i];
    if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
    if (ch === "\\") { i++; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c === -1 ? end : c + 1; continue; }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return end;
}

export function parseDecls(src, pos, end) {
  const items = [];
  let i = pos;
  while (i < end) {
    while (i < end && /\s/.test(src[i])) i++;
    if (i >= end) break;
    if (src.startsWith("/*", i)) {
      const close = src.indexOf("*/", i + 2), stop = close < 0 ? end : Math.min(end, close + 2);
      items.push({ type: "comment", text: src.slice(i, stop) }); i = stop; continue;
    }
    let stop = scanTo(src, i, end, ";{");
    if (stop >= 0 && src[stop] === "{") {
      const prefix = src.slice(i, stop), colon = scanTo(prefix, 0, prefix.length, ":");
      if (colon < 0 || !/^--/.test(prefix.slice(0, colon).trim())) {
        // Nested rules belong to the CSSOM child list, never to a declaration value.
        i = Math.min(end, matchBrace(src, stop, end) + 1); continue;
      }
      stop = scanTo(src, i, end, ";");
    }
    const raw = src.slice(i, stop < 0 ? end : stop).trim();
    i = stop < 0 ? end : stop + 1;
    const colon = scanTo(raw, 0, raw.length, ":");
    if (colon < 0) { if (raw) items.push({ type: "comment", text: raw }); continue; }
    let prop = raw.slice(0, colon).trim(), value = raw.slice(colon + 1).trim();
    if (!prop.startsWith("--")) prop = prop.toLowerCase();
    const priority = /!\s*(?:\/\*[\s\S]*?\*\/\s*)*important\s*$/i;
    const important = priority.test(value);
    if (important) value = value.replace(priority, "").trimEnd();
    items.push({ type: "decl", prop, value, important, on: true });
  }
  return items;
}

const headerCache = new Map();
const norm = (text) => text.trim(); // Never fold case, strings or descendant combinators.
export function ruleHead(rule) {
  if (typeof rule.selectorText === "string") return rule.selectorText;
  const at = scanTo(rule.cssText, 0, rule.cssText.length, "{");
  return (at < 0 ? rule.cssText : rule.cssText.slice(0, at)).trim();
}
export function canonicalHead(head) {
  if (headerCache.has(head)) return headerCache.get(head);
  let result = head.trim();
  try {
    const sheet = new CSSStyleSheet(); sheet.replaceSync(`${head} {}`);
    result = sheet.cssRules.length ? ruleHead(sheet.cssRules[0]) : null;
  } catch { /* Exact matching is the safe fallback in older browsers. */ }
  if (headerCache.size > 2000) headerCache.clear();
  headerCache.set(head, result); return result;
}
export function link(nodes, cssRules, cond = []) {
  let cursor = 0;
  const rules = Array.from(cssRules), byHead = new Map();
  rules.forEach((rule, index) => { const key = norm(ruleHead(rule)); if (!byHead.has(key)) byHead.set(key, []); byHead.get(key).push(index); });
  for (const n of nodes) {
    if (!["rule", "group", "opaque", "flat"].includes(n.type)) continue;
    const wanted = canonicalHead(n.head || n.text.replace(/;$/, ""));
    if (wanted == null) continue;
    const candidates = byHead.get(wanted) || [];
    let low = 0, high = candidates.length;
    while (low < high) { const mid = (low + high) >>> 1; if (candidates[mid] < cursor) low = mid + 1; else high = mid; }
    const k = candidates[low];
    if (k == null) continue;
    const r = rules[k]; cursor = k + 1; n.cond = cond; n.cssRule = r;
    if (n.type === "rule" && r.style) n.rule = r;
    if (n.type === "group" && r.cssRules) link(n.children, r.cssRules, [...cond, n.head]);
  }
}
export function resolveSelector(child, parent) {
  if (!parent) return child;
  let out = "", quote = null, amp = false;
  for (let i = 0; i < child.length; i++) {
    const ch = child[i];
    if (ch === "\\") { out += ch + (child[++i] || ""); continue; }
    if (quote) { out += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; }
    else if (ch === "&") { out += `:is(${parent})`; amp = true; }
    else out += ch;
  }
  return amp ? out : `:is(${parent}) :is(${child})`;
}
