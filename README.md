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
npm run test:browser # the Playwright suites in tests/ (see below)
```

The Playwright suites that drive the built file in a browser live in `tests/` (their own package: `cd tests && npm install && npx playwright install chromium` once). `npm run test:browser -- <label>` (or `node tests/run-all.mjs <label>`) runs them all and writes each one's output under `tests/runs/<label>/`; `node tests/compare.mjs <a> <b>` diffs two labels to compare builds; one suite runs alone as `node tests/test-<name>.mjs`. Four suites ASSERT (sources, sizelinks, v021, intrinsic-review: the scenarios in `tests/lib/feature-scenarios.mjs`, every DOM read retried by `tests/lib/check.mjs` until the expected state), and so does the outside reviewer's harness in `tests/review/` (run by `test-review-regressions`); the other suites are observational: their lines carry `(expect …)` notes, exit 0 means the script ran through, and a regression shows as a diff against the last good label. `npm run test:browser:critical` runs the critical four, sources, sizelinks, v021 and review-regressions (no QR checkout needed; intrinsic-review runs with the full set); `npm run test:features:serve` serves the feature fixtures to a normal browser without Playwright (open the printed URL, press Run feature checks). `run-all` exits 1 when a suite fails or the selection is empty and writes `_summary.json`; `compare` exits 1 on a difference. Most suites load the QR solution: the live demo page over the network, or the `qr-code-component` checkout beside this repo (`QR_DIR=<dir>` elsewhere); `INSPECTOR=<path>` points them at another build, `PW_BROWSER=firefox|webkit` at another engine. Every release runs three engines: the full set on Chromium and the critical four on Firefox and WebKit (`npm run test:browser:engines -- <label>`, which writes `runs/ff-<label>/` and `runs/wk-<label>/`); the four pass on both since v0.2.5 (the harness's nesting case records a SKIP on Firefox, a browser limit, see CHANGELOG v0.2.5). `DECISIONS.md` records the behaviours a change must keep.

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
