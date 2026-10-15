# adonmez004.github.io
Demos for frontendmentorsolutions.io

## inspector.js

The floating code inspector every demo page loads. It exists to explain a solution, not to export it; it will not grow copy or extract features.

### Source and build

`inspector.js` is BUILT; never edit it by hand. The source lives in `src/` and `build.mjs` (esbuild, a dev dependency only; the output has no runtime dependencies) bundles it into the one IIFE file the pages load:

```
npm install          # once; esbuild
npm run build        # src/ -> inspector.js (the version from package.json on line 1 and in data-version)
npm run test:unit    # browserless checks of the pure modules (test/*.test.mjs)
```

The Playwright suites that drive the built file in a browser live outside this repo (`~/demo-inspector/tests/`, `node run-all.mjs <label>` runs them all and writes each one's output under `runs/<label>/`; diff two labels to compare builds). `DECISIONS.md` records the behaviours a change must keep.

`src/` map:

- `main.js` — the `<fm-inspector>` element: the panel's chrome (open/fold/drag/resize, the tabs, the theme), the page watchers and the load cycle, the overlay's mark list and frame, the ruler, the CSS undo stack and the Resets; it wires the modules below through small `ui` hook objects and keeps a thin forwarder surface for them.
- `style.css` — the panel's own styles, inlined into the shadow root.
- `markup.js` — the shadow DOM markup and the inline icons.
- `util.js` — pure helpers: numbers, names, the padding/margin side map, `span()`.
- `foreign.js` — which nodes are not the page's own (the inspector, extensions, `data-fm-inspector-ignore`).
- `css/parse.js` — the CSS source reader (comments and blank lines kept) and its pairing with the CSSOM; pure, unit-tested.
- `css/model.js` — `CssStore`: every stylesheet read CSSOM-first, the declaration models, the inline styles, the poll's snapshot and the write path; it reaches the panel through a small `ui` hook set only.
- `panel/html-view.js` — `HtmlView`: the HTML tab's rows, folds and reveal.
- `panel/css-view.js` — `CssView`: the CSS tab's groups and rows, pins, hover, the value editor and the rows' write path.
- `tools.js` — `Tools`: the page-wide tools' arbitration (which are open, which one takes the page's input) and the shield.
- `tools/picker.js` — `Picker`: the picks, the probe, Alt's distance mode.
- `tools/resize.js` — `Resizer`: the resize tool's state, drag, write/restore paths, undo and Resets, the handle's painting.
- `tools/size-explain.js` — the resize tool's measurements and the reason a width did not land; `trackTokens` pure, unit-tested.
- `overlay/painter.js` — `Painter`: the overlay's boxes, bands, labels and chips, placed without covering a control or each other; it knows the overlay element alone.
- `overlay/draw.js` — the drawings over the Painter: a pick, the probe, the ruler, the Alt gap, a declaration's reach.
- `history.js` — `History`: one undo stack; the CSS edits and the resizes hold separate instances.
