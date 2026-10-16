// The browser's own default rules for an element, as the HTML spec's rendering section suggests them (Chromium's html.css reads the same for
// these): no stylesheet carries them, so the CSS box lists them from this table, read-only, under the author's rules. Tags not listed have no
// default beyond `display: inline`. Values are the spec's; a browser may round them.
const BLOCK = "display: block; unicode-bidi: isolate"; // the spec's bidi section isolates every block-level element, html and body aside
const H = (size, margin) => `${BLOCK}; font-size: ${size}; font-weight: bold; margin-block: ${margin}`;
export const DEFAULTS = {
  html: "display: block",
  body: "display: block; margin: 8px",
  main: BLOCK, section: BLOCK, article: BLOCK, nav: BLOCK, aside: BLOCK, header: BLOCK, footer: BLOCK, div: BLOCK, address: `${BLOCK}; font-style: italic`,
  p: `${BLOCK}; margin-block: 1em`,
  h1: H("2em", "0.67em"), h2: H("1.5em", "0.83em"), h3: H("1.17em", "1em"), h4: H("1em", "1.33em"), h5: H("0.83em", "1.67em"), h6: H("0.67em", "2.33em"),
  blockquote: `${BLOCK}; margin-block: 1em; margin-inline: 40px`,
  figure: `${BLOCK}; margin-block: 1em; margin-inline: 40px`, figcaption: BLOCK,
  hr: `${BLOCK}; color: gray; border-style: inset; border-width: 1px; margin-block: 0.5em; margin-inline: auto; overflow: hidden`,
  pre: `${BLOCK}; font-family: monospace; white-space: pre; margin-block: 1em`,
  ul: `${BLOCK}; list-style-type: disc; margin-block: 1em; padding-inline-start: 40px`,
  ol: `${BLOCK}; list-style-type: decimal; margin-block: 1em; padding-inline-start: 40px`,
  menu: `${BLOCK}; list-style-type: disc; margin-block: 1em; padding-inline-start: 40px`,
  li: "display: list-item; text-align: match-parent; unicode-bidi: isolate",
  dl: `${BLOCK}; margin-block: 1em`, dt: BLOCK, dd: `${BLOCK}; margin-inline-start: 40px`,
  table: "display: table; box-sizing: border-box; border-spacing: 2px; border-collapse: separate; text-indent: initial; unicode-bidi: isolate",
  caption: "display: table-caption; text-align: center; unicode-bidi: isolate", thead: "display: table-header-group; vertical-align: middle; unicode-bidi: isolate", tbody: "display: table-row-group; vertical-align: middle; unicode-bidi: isolate",
  tfoot: "display: table-footer-group; vertical-align: middle; unicode-bidi: isolate", tr: "display: table-row; vertical-align: inherit; unicode-bidi: isolate", td: "display: table-cell; padding: 1px; vertical-align: inherit; unicode-bidi: isolate",
  th: "display: table-cell; padding: 1px; font-weight: bold; text-align: center; vertical-align: inherit; unicode-bidi: isolate",
  a: "color: -webkit-link; text-decoration: underline; cursor: pointer",
  b: "font-weight: bold", strong: "font-weight: bold", i: "font-style: italic", em: "font-style: italic", cite: "font-style: italic", var: "font-style: italic", dfn: "font-style: italic",
  code: "font-family: monospace", kbd: "font-family: monospace", samp: "font-family: monospace", tt: "font-family: monospace",
  small: "font-size: smaller", big: "font-size: larger", sub: "vertical-align: sub; font-size: smaller", sup: "vertical-align: super; font-size: smaller",
  u: "text-decoration: underline", ins: "text-decoration: underline", s: "text-decoration: line-through", strike: "text-decoration: line-through", del: "text-decoration: line-through",
  mark: "background-color: yellow; color: black", abbr: "text-decoration: underline dotted", q: "display: inline",
  img: "display: inline; overflow: clip; overflow-clip-margin: content-box", picture: "display: inline", video: "display: inline-block; object-fit: contain", audio: "display: none", canvas: "display: inline-block", iframe: "border: 2px inset",
  input: "display: inline-block; appearance: auto; font: -webkit-small-control; letter-spacing: normal; word-spacing: normal; line-height: normal; text-transform: none; text-indent: 0; text-shadow: none; text-align: start; margin: 0; padding: 1px 0; border: 2px inset; cursor: text; background-color: field; color: fieldtext",
  button: "display: inline-block; appearance: auto; font: -webkit-small-control; letter-spacing: normal; word-spacing: normal; line-height: normal; text-transform: none; text-indent: 0; text-shadow: none; text-align: center; align-items: flex-start; box-sizing: border-box; margin: 0; padding: 1px 6px; border: 2px outset buttonborder; background-color: buttonface; color: buttontext; cursor: default",
  select: "display: inline-block; appearance: auto; font: -webkit-small-control; box-sizing: border-box; margin: 0; border: 1px solid; border-radius: 0; white-space: pre; cursor: default; background-color: field; color: fieldtext",
  textarea: "display: inline-block; appearance: auto; font: -webkit-small-control; margin: 0; padding: 2px; border: 1px solid; white-space: pre-wrap; resize: auto; cursor: text; background-color: field; color: fieldtext",
  label: "cursor: default", fieldset: `${BLOCK}; margin-inline: 2px; padding-block: 0.35em 0.625em; padding-inline: 0.75em; border: 2px groove threedface; min-inline-size: min-content`,
  legend: `${BLOCK}; padding-inline: 2px`, details: "display: block", summary: "display: list-item; cursor: default", dialog: "position: absolute; inset-inline: 0; inline-size: fit-content; block-size: fit-content; margin: auto; border: solid; padding: 1em; background-color: canvas; color: canvastext",
  span: "display: inline", br: "display: inline", wbr: "display: inline",
};
export const defaultDecls = (tag) => (DEFAULTS[tag] || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => { const at = s.indexOf(":"); return { type: "decl", prop: s.slice(0, at).trim(), value: s.slice(at + 1).trim(), important: false, on: true, live: false }; });
