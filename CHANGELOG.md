# Changelog

The code inspector on the demo pages (`inspector.js`). Versions follow semver; the version also sits on the first line of the file; the copyright line closes it.

## v0.2.5 (2026-10-16)

Later the same day, the outside review's fourth round (Codex, of the v0.2.4 tarball, run in a real Firefox 158 and Safari 27 on his Mac: 401 of 402 and 402 of 402 fixture checks; Alper: "bunları bir incele", then "yap"). Tests only, no product change, the built file stands:

- His harness fixture waits for the tool's first source read and the CSS refresh it queues before a case measures anything (`fixtureSourceReady`, then `!i.loading && i.refreshFrame == null`): the four Firefox cases left open in the morning (the three own-write "no rebuild" cases, the ten hiding rules) were that race, not the product. On this build his harness reads Firefox 84 passed, 1 skipped; WebKit 85; Chromium 84 + 1 skip. His background assertions compare the eight background longhands instead of the shorthand text; the nesting case keeps our SKIP where the browser does not restyle.
- The sources checkpoints read the browser's `unicode-bidi` off the scoped element (`lens.scope.css`, his form) instead of fixture class names.
- A fifth asserting suite, `test-intrinsic-review` (his 100-scenario matrix: five writing modes, both directions, the min/max/contain-intrinsic twins through the panel), and his `nested-repro.html` under `tests/review/` (the Firefox nested-declarations limit reproduced with and without the tool, `?mode=native`).
- Not taken: his `run-cross-engine-review.mjs` (ours runs the engines), the Python native runner, his report files.


The first run of the asserting suites on Firefox 155 and WebKit 26.6 (Playwright's builds; every run before this was Chromium 153 alone; Alper: "bunları webkit ve firefox için test ettin mi", then "ok" to the plan). Two product changes, the rest test expectations that assumed Chromium:

- A drag gesture ends on a lost pointer capture only when that gesture took the capture itself. Headless Firefox sends no `pointerup` for a release outside the viewport, so the gesture stayed open; the next press ended it (as a cancel), and the release of its capture arrived a moment later at the NEW gesture's `lostpointercapture` listener, which ended that one too: the second drag snapped back to its start. Any gesture whose `pointerup` never arrives (a release outside the window, a tab switch) had the same next-drag problem.
- A declaration the page added as a shorthand goes back into the baseline as that shorthand: `rebaseBaseline` diffed longhands and wrote them one by one, which WebKit re-serializes in another form (`background: yellow` came back as `background: 0% 0% repeat yellow`; the value was kept, the text was not). The shorthand is written whole only when every longhand it sets changed; a partial change still lands longhand by longhand, so a page's `margin-left` write never drags the tool's edited `margin-top` into the baseline.
- Tests: the v021 drag stays inside the viewport (every engine delivers that release); the sources checkpoints compare the browser's `unicode-bidi` row with the browser's own computed value (WebKit computes `normal` on a div and an li, Chromium and Firefox `isolate`); the harness's native-nesting case records a SKIP where a write to a `CSSNestedDeclarations` rule changes the text but not the rendering (Firefox 155), the adoption-order pattern.
- Results: Chromium: the critical four pass (core-tests 84 passed, 1 skipped), full run-all 64 of 64 (`tests/runs/v025`). WebKit: the critical four pass, core-tests 85 of 85 (no skip: WebKit reorders adopted sheets). Firefox: sources, sizelinks and v021 pass; core-tests 80 passed, 4 failed, 1 skipped: the three own-write "no rebuild" cases and "Authored ten hiding rules remain visible" fail inside the harness but not in direct probes on the same build (the harness's srcdoc frames and the tool's `readSource` fetch are the suspects), left open. `test:browser:critical` stays a Chromium gate; since the same day every release also runs the critical four on Firefox and WebKit (`npm run test:browser:engines -- <label>`, `tests/run-engines.mjs`).

## v0.2.4 (2026-10-16)

The outside review's third round, of the v0.2.3 tarball (Codex, "yaklaşık 9,4/10": the three v0.2.3 fixes confirmed on his side, one regression found):

- `contain-intrinsic-width` / `-height` lost their logical twins in v0.2.3: the width/height twin branch of `candidates()` was narrowed to `min-` and `max-` (to keep a `border-left-width` from reading as a `border-left-inline-size`), and the contain-intrinsic family went with the nonsense, so `contain-intrinsic-inline-size: 123px` left `contain-intrinsic-width` reading `resolved by the layout` (v0.2.2 read it as the author's). The twin branch names its size families now: `min-`, `max-`, `contain-intrinsic-`, in every writing mode and direction. The reviewer's patch, taken as written, with his test folded into `test/css-candidates.test.mjs` (five writing modes × two directions × three families, both ways, the border/outline exclusion kept; 31 unit tests).
- The feature runner page no longer names a checkpoint count (it said 30, the sources suite has 19 and the size suite 12).
- Full run-all against this build: 64 of 64 exit 0, no page errors (`tests/runs/v024b`); against v0.2.3's run only the version lines and the timing buckets differ.
## v0.2.3 (2026-10-16)

The second round of the same outside review, of the v0.2.2 tarball (Codex, "yaklaşık 9,2/10"; three findings, each reproduced here first; Alper: "kontrol et", then "bunlarla birlikte göndereceğin yeni versiyon varsa gönder"):

- Logical border shorthands and corners read as the author's: `candidates()` lacked the shorthand chain over a logical border longhand (`border-inline-start-width` reached `border-inline-start`, `border-width` and `border`, never `border-inline-width` or `border-inline`), so `border-inline: 3px solid` left `border-left-width: 3px` reading `resolved by the layout`; and no corner mapping existed, so `border-start-start-radius: 17px` left `border-top-left-radius` the layout's too. Two SHORTHANDS rows add the `border-inline-width` / `border-inline` (block likewise) rungs; a corner maps by its two sides through the writing-mode table (`border-top-left-radius` ↔ `border-start-start-radius` in ltr, `border-start-end-radius` in rtl, `border-end-start-radius` in vertical-rl) instead of the side-word replacement, which also made the nonsense `border-block-start-left-radius`; and the width/height twins apply to `min-`/`max-` alone (a `border-left-width` is no `border-left-inline-size`). The unit test covers the chain, the corners in three modes and the nonsense names; the sources suite opens a `border-inline` + `border-start-start-radius` element and reads both rows as the author's (19 checkpoints now).
- A source or size link click dropped the keyboard focus to the page: `render()` empties the view and only a declaration's row kept its focus through the rebuild. A `.srcb` link with the focus is re-found by its word on the new links, or the focus goes to All when its link is gone (the Author link after the author's rules left the page). Only a focus already inside the view is moved, never one outside. The sources suite checks the active element after the Author click and after the rules' removal, the size suite after Parent; the in-browser runner focuses before it clicks, as a real click does.
- The review harness's "Adopted source reordering follows the cascade" case was skipped by name for every browser: the skip is conditional now, measured at run time (the colour after the reorder), recorded as a `SKIP` with its reason and counted apart (`skipped` in the result; the driver prints it), so Firefox, WebKit and a Chromium past the 153 limit run the case. Here: 84 passed, 0 failed, 1 skipped.
- Full run-all against this build: 64 of 64 exit 0, no page errors (`tests/runs/v023c`); against v0.2.2's run the differences are the version lines, the timing buckets, the sources suite's new checkpoint and the harness's SKIP line. Unit tests: 30.
## v0.2.2 (2026-10-16)

An outside review of v0.2.1 (Codex, "yaklaşık 9/10"; its fixes arrived as a v0.2.2 package, then a second pass over the three suites added that morning) taken where it held, reworded where it spoke for the tool (Alper: "bunları incele, raporla, gerekli gördüğün değişiklikleri yap"):

- Source attribution follows the element's writing mode and direction: `candidates(prop, style)` in css-view.js builds the physical/logical twin table from the computed `writing-mode` and `direction` (vertical-rl/lr, sideways-rl/lr, rtl), so `direction: rtl; padding-inline-start: 24px` reads as the author's `padding-right` and not the layout's, and a vertical box's `block-size` is the author's width. `all` is a candidate for every property it resets (not direction, unicode-bidi or a custom property), so a `display` under `all: unset` reads as the author's, via all. The function is exported for its unit test (`test/css-candidates.test.mjs`).
- The resize box opened over the handle of an element near the end edge at 1280 (the suites parked the box with `park()`; a user had no handle): `avoidResizeHandle()` in main.js runs on each new choice, desktop only, and when the box covers the handle or its Reset seat it moves to the nearest free spot (beside, above, below, the corner), kept left of the rail; a choice whose handle is clear leaves the box where the user put it. Probed: a button at the end edge, the box lands with its right edge 8px left of the handle; a second choice with a clear handle does not move it; phones unchanged.
- A page write between a drag's start and the tool's first write was lost (the earlier reviews' open P2): `start()` records every node's style attribute as an OBSERVATION (`wrote` entries carry `written: false`, a real write sets it true), a cancelled press that wrote nothing restores nothing, and the undo entry lists only the nodes the tool wrote. The page's `inline-size: 175px !important` survives a cancel, an Undo and a Reset in all four of the reviewer's flows (his resize-engine checks, 34 of 34).
- The tag-default table is named as a reference: the Show Defaults view opens with a note, "The defaults as this tool's table knows them. The browser's own sheet adds rules by attribute and state (an input's type, a disabled control), and browsers differ.", and the Browser source note says the same in one line (the reviewer's wording rewritten in the panel's voice).
- The runner: `run-all.mjs` exits 1 when a suite fails or the selection matches nothing and writes `_summary.json` beside `_summary.txt` (it exited 0 over a failing child, so a CI would have read success); `compare.mjs` reads both directions, counts the missing files and exits 1 on a difference. Unit tests for both (`test/browser-runner.test.mjs`, `test/browser-compare.test.mjs`).
- The three v0.2.1 suites (sources, sizelinks, v021) ASSERT now instead of printing `(expect …)` lines: the scenarios live in `tests/lib/feature-scenarios.mjs` (18 source checkpoints, 12 size checkpoints, two cases new: an author rule edited under the Author filter refreshes the value and keeps the filter, the filter's source removed from the page returns the stack to All), `tests/lib/check.mjs` retries a DOM read until the expected state or 3 s (no fixed sleeps), `tests/lib/v021-expectations.mjs` holds the Escape / drag / hold / overlay asserts (the drag must travel, not merely end where the other ends; the overlay labels are checked against the element's real rect), `tests/features/` carries the fixtures and an in-browser runner (`npm run test:features:serve`, no Playwright needed: open the printed URL, press Run feature checks), the browser and the server close in `finally`. The reviewer's own harness comes along as `tests/review/` + `test-review-regressions.mjs` (32 UI, 84 CSS-core and 34 resize-engine checks). `npm run test:browser:critical` runs the four. `test/browser-check.test.mjs` proves the checks fail on wrong data (a stationary panel, a lost focus, a doubled `!important`, a wrong height label). Unit tests: 29.
- Found while running his package: the three Playwright drivers had never been launched (`host.waitFor()` waits for visibility and the host is never visible; `{ state: "attached" }` now), and the harness's "Adopted source reordering follows the cascade" asserts the BROWSER first: Playwright's Chromium 153.0.8010.12 keeps the first adoption order when the same adopted sheets are reordered (probed without the inspector: `[a, b]` then `[b, a]` stays blue, a fresh `[b, a]` is red), so that one case is skipped there with the reason on its line. The suite reads 32 / 84 / 34 passed here.
- Full run-all against this build: 64 of 64 suites exit 0, no page errors (`tests/runs/v022e`); against v0.2.1's run the differences are the version lines, the timing buckets (bigpage rerun alone: the same shape as v0.2.1, loadHtml 1.7 s, CSS render 85 ms), a favicon 404 gone from merge, and the three rewritten suites' new PASS lines.
- Not taken: the reviewer's README text and his TEST-REVIEW files (this entry and DECISIONS are the record), his built file (rebuilt here from src with the reworded notes), the "local review build" wording.
- The browser suites moved INTO the repo, `tests/` (2026-10-16 morning, Alper's call: the repo tarball and a separate suites tarball were two downloads, "evet o şekilde yap, tek'e düşür"): the 63 suites, `lib/browser.mjs`, `run-all.mjs`, `compare.mjs`, the `site/` and `site2/` fixtures and the `other/` scratch scripts, with their own `tests/package.json` (Playwright) beside the repo's; `tests/node_modules`, `tests/runs`, the screenshots and logs are ignored. Every absolute path left the suites: the build under test is the repo's own `inspector.js` (`INSPECTOR=<path>` for another), the browser is Playwright's own Chromium (`CHROME=<binary>` for another), the QR solution is the checkout beside the repo (`QR_DIR=<dir>` elsewhere). `npm run test:browser -- <label>` runs them all. No change to the built file.

## v0.2.1 (2026-10-16)

The browser suites rewritten for the rail, and what they found (Alper: "bence suit'lere de bakabilirsin çünkü yeni bir çok özellik ekledik"):

- The suites drive v0.2 now: `lib/browser.mjs` gained `openBox(page, host, which, { all, at })` (the rail's lens armed, a page element clicked 12px inside its corner, Show All pressed), `park(page)` (the box to the left edge, out of a right-side element's handle) and `shadow()`. Of the 62 suites 60 stand, ported or rewritten to the new shape (the quick view, the resize box and its second box, Clear all, the head-click fold, the rail on phones, seven visual states with new baselines); `test-theme` (the theme toggle is gone) and `test-ver2` (the head's version label is gone) are deleted. A full `run-all` against this build: 60 of 60 pass (`tests/runs/v021`, 2026-10-16 01:20). Three suites added the same morning for the v0.2 features no suite read, `test-sources` (the source links and the currentcolor row on Show Initials / Show Computed), `test-sizelinks` (Show Size's box links and the Element box's lines) and `test-v021` (this release's three fixes, failing on the v0.2.0 build and passing here): 63 of 63 pass (`tests/runs/v021b`).
- Found and fixed by the port: a 3000-element page paid the old rows' layout again inside every HTML rebuild (`rendered()` reads forced it while the stale rows still stood): the view is emptied before the build, and the big-page buckets are back beside v0.1.82's; the `:has()` selectors on every HTML and CSS row became classes (`.row.nc`, `.d.wn`, `.d.wo`), a cost that grows with the page. An Escape-cancelled value edit re-rendered the CSS view and dropped the focus to the page, so the next Escape never closed the box: a re-render keeps the focus on the same declaration's row. A phone sheet pull (or a head drag) that left the box while a lens stood lost its moves to the tool's shield: the shield leaves the host's own gestures alone. The hold line's words: `width: 150px !important` reads whole with its tick, `div: [x] max-inline-size: 320px` and `grid track: [x] …` keep their colon (the parent's name read without it, the grid track read twice).
- Left standing, noted: the resize box opens over a right-side element's handle at desktop widths (the suites park it); a double tap on the phone head's centre lands on the Show All button now and does not toggle the sheet (the spacer still does).

## v0.2.0 (2026-10-15), the rail

Alper's redesign, built step by step on main through 2026-10-15, each step a commit, released at his call ("tamam, şimdi v0.2.0 olarak yeni versiyona geç"):

- The rail (step 1): the "Show code" pill, the tabbed head, the fold and the head's buttons are gone. A vertical rail on the screen's right edge (a strip along the foot on phones) holds the icons alone: Select element, HTML, CSS · Resize, Show all sizes (a ruler mark again, Alper's call: the eye path had stood under the ruler's name since v0.1.4x), Clear all · Remove. One box opens beside the rail (a sheet above the strip on phones) with a bare grab bar and a close; it takes the focus on open so Escape closes it; the overlay's labels keep off the rail and the open box.
- The lens (step 1): HTML and CSS are page-wide tools like the resize tool (tools/lens.js). The icon arms a choice (crosshair, the state pill, the shield), a hover names the element, a click opens the box with that element's HTML (its subtree) or the rules that reach it; the tool stays armed, the next click chooses again; Escape or the icon ends it; the armed icon pressed again also closes the box (step 4); arming the other lens while the box is open switches the box to that view, so one rail icon is lit at a time (Alper's call). The chosen element stays framed and named on the page while its code shows.
- A right click on the page closes everything standing at once: the armed tools, the ruler and the open box (Alper's call: not one thing per click). Clear all closes the box too and forgets the chosen elements, and a hand from one tool to another (picker, resize, a lens) closes the open box.
- The picker is the QUICK VIEW (Alper's name): a hover tool, the element under the pointer painted with its margin, border and padding bands, its frame, sizes and name; a page click chooses nothing (the HTML rows' pick buttons still pick). It has its OWN BOX (Alper's ask): a page CLICK opens the box on that element (arming alone opens nothing, and the hover does not move it: it opened on arming and followed the pointer for an hour, Alper: "hoverlayınca değil tıklayınca göstersin"), the element's name and size over two lines, `width Wpx: <what sets it>` and `height Hpx: <what sets it>`, a rule (`max-inline-size: 288px`, `aspect-ratio: 1/1, from its width`) or a note (`its content`, `fills main`, `its intrinsic ratio (…)`, `stretches to …`); `widthWhy`/`heightWhy` in tools/size-explain.js (the width one is the ladder's, lifted out), returned as coloured parts; under them two more lines (Alper's ask): `content W × Hpx: the box inside the padding` and `space W × Hpx: padding W × Hpx, border W × Hpx`, the element's size minus its content box, padding and border per axis, `none, the content fills the element` when both are zero; and `with margin W × Hpx: margin W × Hpx, the room it takes in the layout`, the element plus its margins (Alper: "margin'ler normalde sayılmıyor ama width ve height'a margin'ler eklenmiş şekilde ne oluyor onları da hesapla"), `no margin, the element alone` when none; and, right under the content line (Alper: "rendered content'i content'in altına koy"), `rendered content W × Hpx`, what the text or the children actually cover inside the element, off a Range over its contents: `3 lines, centered, 5.14px free beside it` for text, `the children's boxes together` for block children, the free room measured in the content box (Alper: "rendered text'in ne kadar width olduğu hesaplanabilir mi … o kısmı rendered text olarak yaz ve göster", then "rendered content de olur hangisi uyarsa"; replaced elements and empty ones carry no line). Between the head and the lines sits the element's BOX MODEL, DevTools' picture (Alper's ask): margin, border and padding layers around the content box, each side's value on its edge, `–` for none, in the overlay bands' colours; the picture follows the box's width (a fixed 22rem form lived an hour, Alper: "hoş olmadı"). The box closes with the tool.
- The ruler paints the element under the pointer LAST, so its chip and band values sit on top of the crowd (a quiet form, corner size chips and no band values or names, lived an hour: Alper, "çok kötü olmuş, padding margin değerleri yok, element adı yok"; every element keeps its name chip and values).
- ONE TOOL AT A TIME (Alper's call): arming the quick view, a lens, the resize tool or the ruler turns every other one off and closes the open box; the v0.1 composing of picker + resize is gone.
- The resize tool owns a BOX too (Alper's call: "resize'ın üstteki navigator'ı kaldır, onun yerine box açılsın, hata aldığında vs. o box üzerinde gösterilsin, uyarı mesajı da o box'ta görünsün, böylece bütün tool'lar kendilerine ait bir box ile gereken işlemleri yapmış olsun"): the small fixed bar at the top centre of the page is gone; the first click on an element opens the box on `#view-size` (not the arm itself, Alper: "resize'a basar basmaz box'ın açılmasına gerek yok, elemente tıklayınca box açılsın"), the tool's end (Escape, the rail icon, another tool) closes it. The view: a hint while no element is chosen (click an element, drag the corner handle or press Left / Right), then the element's size as the tool first chose it, `name W × Hpx` in the accent, and the size now on a second line with the difference per axis, `226 × 79.22px −30 × 0px`, `288 × 288px 0 × 0px` while nothing changed (Alper: "ilk değeri en üstte dursun, değişiklik olunca aşağıda görünsün ve farkı da yazsın, + - şeklinde", then "eşit olduğunda da hesaplama yapılsın ve 0 0 olsun fark"; the hold's line sits under it, never in its seat), and the reason a drag was held in the hold's red (`held by max-inline-size: 288px`, `transformed: edit the CSS value instead`, …), visible now; when a RULE holds, the holding declaration itself sits in the line with its tick, `held by [x] max-inline-size: 288px` (or `div [x] max-inline-size: 320px` for a parent's, `grid track [x] …`): untick it and the next step is free of it, no trip to the CSS view (Alper: "buraya o bloklayan property'yi getirip on off yaptırabiliriz, böylece CSS'e gitmesine gerek kalmaz"; the tick is an undo step like the CSS view's); and a `Go to this element` door (Alper: "go to this property yerine de go to this element gibi bir şey yazıp elemente ait bütün değerleri gösterebiliriz"; `Go to this property` lived an hour) opens a SECOND BOX beside the first (Alper: "ayrı bir box olarak açılsın"), the CSS view scoped to the chosen element, its whole CSS, the holding row centred when it is there, editable, its own head `CSS · img` and close, draggable by its head; Escape or its X closes it alone, the resize box and the tool stand and the drag goes on; the first box's close takes it along, and the rail's CSS icon brings the view back to the first box. While a resize changed the element its width and height also read on the page, a line along each edge with its number (Alper: "değişen width ve height değerleri elementin üzerinde de yazsın", then "line üzerinde number'lar gösterilsin"; a centre chip lived minutes); it was a screen-reader-only line while the bar stood. A hold no longer switches the box to the CSS view (the held row still lights red there for a visit); the handle's own Reset stays beside it on the page. No scope buttons on this view. The bar's Undo / Reset sizes / Reset rules row moved into the view and left it within the hour (Alper: "bu kısmı kaldır"): the rail's Clear all still puts every size and every edit back, the handle's Reset this element's, and the resize undo waits for the box's own undo.
- A click on a box's head folds it down to the head alone, the next click raises it (Alper's call: "box'ların üstüne basınca box küçülsün, sadece üst tarafı kalsın"): the bare head only, a button in it keeps its own job, a drag stays a drag; both boxes fold; a closed box reopens whole, and the resize edges go with the body. Not on phones, where the sheet's pull and double tap stand.
- Show Children on an element with no child elements says so (`h1 has no child elements.`) instead of listing the element again; a closing tag's (or a text row's) text lines up with its opening tag (the caret's width added to caret-less rows).
- The box's controls in words (steps 2–4): "Selected Element" (the default, pressed) and "Show All"; on the CSS view also "Show Limits", "Show Inherited" (named "Show cascade" for a day), "Show Defaults", "Show Initials" (Title Case, Alper's call) on their own second row under the scope pair (the row hides on the HTML view). Icons were tried and dropped there: words, Alper's call. The head wraps in a narrow box, the close pinned to its corner; the default box is 30rem wide.
- The CSS box reads top-down in cascade order under a scope (step 5): `/* browser defaults */` (Show defaults: the browser's own rules for the tag, css/defaults.js, read-only), `/* inherited from … */` per ancestor, the farthest first (Show inherited: the ancestors' rules with their inheritable lines alone, a rule that reaches the element itself not repeated), then `/* size, up the tree */` (Show Size, named Show limits for a day; Alper's design: the element's `name W × Hpx` head, then `width Wpx: <what sets it>` and `height Hpx: <what sets it>`, then, under a rule, an `up the tree` head with one short line ("The boxes around the element, up to the viewport."; no `/* size, up the tree */` comment over the block, Alper's call), and the same for each parent up to the body, each head marked `parent` / `grandparent` / `great-grandparent` / `ancestor N`, and the viewport as the last box, `viewport W × Hpx`, the browser window; the element's own box carries the quick view's lines under its width and height, content / rendered content / space / with margin (Alper: "Show Size'ın içine quick view'daki gibi elementin size'ı ile ilgili olan şeyleri getir"; the parents keep their two lines); BOX LINKS over the ladder, `All · Element · Parent · Grandparent · … · Body · Viewport`, All lit at rest, a click shows that one box alone, a second click or All the whole ladder (Alper's ask: "burayı da All Element Parent Grand-Parent Body Viewport vs olacak şekilde kategorize et"); a max/min/width rule, a percentage, a grid track, hugging its content under a centred grid or a flex, filling its parent, the viewport; for the height a rule, an aspect ratio, a replaced element's intrinsic ratio, a stretch, else its content; the reasons are coloured parts, property / value / element name in the rows' own colours; above the own rules, Alper's call), then `/* computed: the author's values over the browser's defaults */` (Show Computed, Alper's ask, named Show Render for an hour: the properties where the author's rules override a browser default, the default struck through under the author's value, the initial rows left out, nothing else), then `/* every property, with what sets it and what it overrides */` (Show Initials: EVERY standard property as a STACK, Alper's design: the initial value first, then what overrides it, the winner last; the overridden rows struck through, the rows coloured by source, the author's in the accent, the browser's amber, the inherited purple (a faint-overridden form lived an hour: "pek belli etmiyor"), e.g. `aspect-ratio: auto (initial)` faint over `aspect-ratio: 1 / 1 (set by the author)`, or `display: inline (initial)` over `display: block (set by the browser)` on a div; notes `(set by the author)`, `(set by the author via margin)` when a shorthand or a logical twin set the longhand, `(set by the browser)`, `(inherited from body)`, `(resolved by the layout)` in teal for an auto width in px (the probe sets `direction` and `unicode-bidi` by hand, the two properties `all` skips: `unicode-bidi: normal` read as resolved by the layout for an hour, Alper: "anlamlı mı bu şekilde"; and the browser defaults carry the spec's `unicode-bidi: isolate` on block-level elements, so it reads `set by the browser`), a colour property with no colour of its own as ONE magenta row, not struck: `prop: currentcolor (from color: rgb(…))` with the `!` explanation (a two-row form, the keyword row over the resolved `rgb(…) (computed)` row, lived the evening: "bunlar aynı renk olsun … pembe olsun", then "bu şekilde çok gürültülü"; the narrowed stack's Currentcolor line names the colour too), `(initial)`, and `(initial, set by the OS)` in green for the platform's defaults, the font family and size, the text colour, the accent (Alper's ask); the browser, layout, currentcolor and OS notes carry a small `!` mark whose click opens a one-line explanation under the row, like a tooltip, one at a time (Alper's ask, the four lines agreed with him); a note that does not fit beside its declaration drops whole to a second line, never broken mid-note, the `!` travelling with it; the explanation sits under the row itself (it opened inside the nowrap note for an hour and landed off the row: "açıklamalar çalışmıyor"), and the stack's rows carry no "unsupported or read-only" title; a browser default equal to the initial adds no row; under the stack's `computed` head an `All` link lit at rest, then one SOURCE LINK per source present, each in its colour (All, Author, Browser, Inherited, OS, Layout, Currentcolor, Initial; All leads and is the lit one by default, Alper's call: "en başta All olsun, default o görünsün"; Alper's ask: "computed'in altında linkler olsun, kendi renklerinde … tıklayınca sadece ilgili şeyleri göstersin"): a click narrows the stack to that source's rows and opens it with one or two sentences on what they are ("bir tık daha detaylı açıklama ama çok değil"), a second click or a new scope or block widens it again, Show Computed keeps its struck browser rows under its Browser link; the layout explanation reads "The layout worked the value out from the box, in pixels." (Alper's pick over "an auto size in pixels"); the initial values come off a probe with `all: initial` in a hidden box; sorted, read-only), then the element's own rules (a rule that does not reach the element still shows the nested rules in it that do, under its head; its inline style="" leads its section). The four Show buttons are one pick (Alper's call): a press shows that block ALONE, in place of the element's own rules; a second press on the lit one brings the rules back.
- The HTML box has the same row (Alper's call, "CSS'teki gibi mantıkla"): Show Parent (the parent's tag around all its children, the others folded, the chosen element open; it showed the element alone inside the parent for a few hours, Alper: "parent'ın sahip olduğu diğer etiketleri de göstersin"), Show Children (the element with each child folded to a line), Show Siblings (the parent's children side by side, the others folded, no parent tag), Show Content (Alper's ask: what the element holds, by kind: an image shown with its source, alt and natural size; a link with its address and text; media with its source; a field with its value; anything else with its text and the images and links inside it); one pick, a second press returns to the element's subtree, and so does Selected Element (on the CSS view it lets a lit block go the same way); the chosen element's row wears an accent edge in every context, and a context opens in its own folds.
- The rail without undo and theme (step 3): the theme follows the system alone (the override and its localStorage key are gone); the CSS undo keeps its stack, its button will come with the CSS box's own controls. The Reset icon read as an undo: it is "Clear all" with an eraser (step 4). The rail's icons name themselves on hover or keyboard focus (step 4).
- A pick paints its padding and margin bands with their values, as the eye does; a right click is an Escape: it ends the armed tool (an open edit cancels first), with no tool it closes the open box, with neither the browser's menu opens (step 7).

Left for later, after the release: the CSS box's own undo button (the undo stack and the resize undo both stand, no control wears them yet); hiding the `*` resets under "Selected Element"; the rail's pin and auto-hide; the browser suites are NOT rewritten yet: a full `run-all` against this build (62 suites, 2026-10-16 00:30) fails ALL 62, almost every one at its first step, a click on the v0.1 `Show code` pill (`.fab`) that no longer exists, so the suite says nothing about v0.2 either way (v0.1.82 ran 57/62); this release was verified with per-feature headless checks instead; the suites were rewritten the same night, see v0.2.1; DECISIONS.md's head/panel/picker sections still describe v0.1 in places.

## v0.1.82 (2026-10-15)

A third outside review (Codex, of v0.1.81: about 9/10, 158/158 of its earlier checks passing); its three findings taken:

- A chain of three or more lines of one property keeps the source's order through a reconcile (`color: red; color: green; color: blue;` came back as red, blue, green, and an unrelated edit then wrote the green); a kept line now goes before the first kept line that followed it in the source.
- The rows add up to the live rule after a reconcile and after a Reset: a kept line that would beat the page's own value goes off, struck, the user can turn it back on. Before, the page replacing `color: red !important` with a normal `green` left the red line on, and an unrelated edit wrote the red back.
- A size the page writes between two moves of a drag is the Reset's record too, not only the undo's: the handle's Reset, Reset sizes and an undo followed by Reset all return to the page's value and priority.

## v0.1.81 (2026-10-15)

A second outside review (Codex, of v0.1.79: 8.9/10, the build reproduced byte for byte from `src/`); its two runtime findings taken:

- A size the page writes DURING a drag is the page's. The step after it starts from that write (the drag's record is rebased to it), so a cancel or a later undo returns to the page's value and priority, not to the drag's start; a page write after the last move stands through a cancel. v0.1.76 covered the page writing before a release and after a finish, not the moves in between.
- A rule the page has changed keeps its model across loads and reconciles, instead of being rebuilt from the CSSOM text once nothing (a pin, an edit, an undo step) points at it anymore: that rebuild lost every line the CSSOM collapses (`color: red !important; color: blue;` reads back as the red alone), so a Reset after the page had added to such a rule dropped the blue line and unticking the red then removed the colour altogether. A clean model is still rebuilt from the source when the source matches the live rule (the comments come back once the sources are fetched). On a reconcile a chain keeps its lines in the source's order, a changed live value lands on the line the cascade let win (the last of its priority), and a line whose value did not change keeps its own original.
- Declined for now: moving the browser suites into the repo (they live beside it, in `~/demo-inspector/tests/`, with Playwright; Alper's call whether the Pages repo should carry them). (Moved in on 2026-10-16, see v0.2.2.) Noted: the eye's frame on a 3000-element page is about 70 ms in the reviewer's browser; node reuse and a spatial index for the chips are the next steps if it ever matters on a real demo.

## v0.1.80 (2026-10-15)

- Completes v0.1.79. Not writing the `100%` against a hugging parent left a container with no upper bound: dragged wider inside a content-sized `main`, the card grew without limit and without a warning, since `main` just grew with it (v0.1.78 at least stopped it at the body grid). The tool now bounds the element by the nearest ancestor that does NOT grow with it, walking up to the body: a hugging `main` follows the drag freely, and once the card reaches the body's content box it stops and frames the body grid with the reason, as before. A container grown wider keeps its px width instead of snapping to `100%`, the intended consequence of v0.1.79: a hugging parent has no box to be 100% of.

## v0.1.79 (2026-10-15)

- A parent that hugs its content never gets the `100%` (Alper's call, after the keyboard suite showed it): the QR card sits in a content-sized `main`, so shrinking it shrank `main` with it, and the first step back up reached "the parent's box" and was written as `100%`, which the card's `max-inline-size` resolved to 320 again, a 1px step jumping to the max. The tool writes the px value first and looks at the parent: a content box that moved with the element belongs to a hugging parent, and that parent gets no `100%` for the rest of the drag. A parent with a width of its own behaves as before.

## v0.1.78 (2026-10-15)

Four suites added outside the repo (visual signatures of six overlay states, phones with real touch input, the keyboard paths, a 3000-element page) and the one thing the big page found, fixed:

- The overlay lays out ONCE per frame. The chips and line labels used to be placed one by one, each spot read back from the browser after every write, so a frame with the eye on (300 chips, up to 1500 labels) forced thousands of layouts: 80 seconds a frame on a 3000-element page, the page frozen. The Painter now collects the labels, reads every size and transform in one pass and computes the spots in numbers; the same frame takes about a second, and every label lands exactly where it did (the six visual signatures are identical, the 57 suites read the same).
- Recorded, not changed: opening the panel on that page costs about 7 s (3 s of it the 6000 HTML rows), a pick about 1 s, the poll's snapshot 7 ms; the eye's 300-element cap holds (301 marks with a pick).

## v0.1.77 (2026-10-15)

Internal only; the built file behaves as v0.1.76 did (every suite reads the same). The element's file, `src/main.js`, went from 1659 lines to about 720: the four bodies the v0.1.75 cut left in it are modules of their own now, each behind a small `ui` hook set, and the element keeps a thin surface of forwarders (the methods and fields the panel's wiring and the test drivers reach: `chooseSize`, `resizeStart`, `pick`, `picks`, `rowOf`, `apply`, …) so nothing outside had to change:

- `tools/size-explain.js` — the resize tool's measurements and the reason a width did not land (`sizeLimits`, `parentBase`, `contentNeed`, `overflow`, `explainSize` returning `{ d, text, area }` instead of acting; `trackTokens` pure and unit-tested). Nothing in it touches the inspector's state.
- `tools/resize.js` — `Resizer`: the tool's state (the chosen element, the sized map, the last-write map, the drag, the cap, the held row, its own `History`), the handle's drag and keys, the write and restore paths, undo and the two Resets, the handle's and the held area's painting.
- `tools/picker.js` — `Picker`: the picks, the focus element, the probe and Alt, select and clear, the crosshair.
- `panel/html-view.js` — `HtmlView`: the DOM rows, folds, the open tag, reveal, the picked-row marks.
- `panel/css-view.js` — `CssView`: the rule groups and declaration rows, pins and hover, the value editor, `apply` (the write path from the rows), the hits and the scroll to them.
- `overlay/draw.js` — the overlay's drawings as free functions over the `Painter` (a pick, the probe, the ruler's bands and unused room, the Alt gap, a declaration's reach and size line); `marks()` and `draw()` stay in the element, they read every tool's state.

## v0.1.76 (2026-10-15)

An outside review (Codex) of the v0.1.75 build; its findings checked against the source one by one, five taken, one kept as the standing trade-off:

- The HTML tab's fold carets are glyphs again. The v0.1.75 move of the panel's CSS from a JS template string to `src/style.css` left the string's `\\25BE` escape in the CSS, where it read as a backslash and four letters; the glyphs sit in the source CSS now. The suites never looked at a caret; the new one does.
- The resize tool knows its own last write per element (`inline-size` or `block-size`, the attribute as it left it): a size the page wrote since stands against the handle's Reset and Reset sizes, as it already did against undo (`resize skipped: the page changed it`); a size the page writes between the drag's last move and its release is not recorded as the tool's; and a step is undone through the property it wrote, so a writing mode the page changes after the resize does not redirect it.
- Reset rebuilds a rule the page added to since the edit from its live text, so the page's additions are in the model and the next edit leaves them alone. (The review's case kept the addition on v0.1.75 as well in our runs; the path is explicit now.)
- The CSS undo judges a step against the snapshot it took (value, on, priority): a declaration the page raised to `!important` since the edit is the page's, the step is skipped; v0.1.75 recomputed the priority from the refreshed model and undid the page's write.
- A rule holding the same property twice (`color: red; color: blue;`): when the page changes the rule and the rows are rebuilt from the live text, the live entry takes the old row that carries its value, so the edited fallback line keeps its identity and its undo; the first same-named row took it before and the undo found nothing.
- `data-fm-inspector-ignore` set on or removed from an element while the panel is open is a page change: the pick, the resize target and the inline group leave with the mark and the rows come back when it goes; before, the mutation record counted as the inspector's own and nothing moved.
- Kept as it is (DECISIONS.md, Extensions and foreign nodes): an id'd node or custom element the page's own script adds at runtime is left out as foreign; the review asked for the filter to go, as every review has.

## v0.1.75 (2026-10-15)

The source is modular now; the file the pages load is the same single IIFE, built, with no behaviour change (every Playwright suite reads as it did on v0.1.74, plus a new lifecycle suite: the script loaded twice, the host removed and reattached, Escape in the middle of a resize drag, a page style change under the open panel, the three Resets kept apart):

- `src/` holds the code, `build.mjs` (esbuild, a dev dependency only) bundles it into `inspector.js`; the version comes from `package.json` alone, onto line 1 and into `data-version`. `inspector.js` is never edited by hand anymore.
- Cut out of the element, each behind a small interface: the CSS reader (`css/parse.js`, pure, unit-tested), the CSS model with the poll and the write path (`css/model.js`, `CssStore`), the overlay's drawing primitives (`overlay/painter.js`, `Painter`), the page-wide tools' arbitration and shield (`tools.js`, `Tools`: which tools are open, which one takes the page's input), the undo stack (`history.js`, `History`; the CSS edits and the resizes keep separate instances, as before), the extension filter (`foreign.js`), the pure helpers (`util.js`), the panel's styles (`style.css`) and markup (`markup.js`).
- `DECISIONS.md` records the standing behaviours a change must keep, by area; `README.md` carries the build and the `src/` map. The built file carries no comments (esbuild drops them); the source does.

## v0.1.74 (2026-10-14)

- When the hold came from outside the element (Alper's call: its own rule first, else the parent), the holding AREA is framed on the page: a red dashed frame on the parent (its width rule, a grid track, the grandparent's grid or flex, or a content-sized parent with no rule at all) or on the child whose content reaches furthest, with the reason on a red chip above it (`main: content-sized`, `body grid: place-items: center`, `div: max-inline-size: 320px`). An element held by its own `max-`/`min-` rule gets the red row alone, as before. The frame goes when the limit is left.

## v0.1.73 (2026-10-14)

- The red warning badge beside the resize bar is gone (Alper's call): when a drag is held, the held declaration's row turns red in the CSS tab, the tab opens and scrolls to it, and that is the whole message. The reason still lives in a visually hidden `role="status"` for assistive tech.
- The held row is the right one (Alper's ask): the element's own `max-`/`min-` rule is checked before the parent and content caps, so a paragraph stopped by its own `max-inline-size: 256px` lights that row, not the card's 320px it would have met next.
- The `inline-size: 100%` chip on the element is gone (Alper's call); the CSS tab's amber inline line says what was written.

## v0.1.72 (2026-10-14)

- Checked under Firefox 155 (Playwright's build, the system libraries installed on the droplet): 19 suites read the same as under Chromium, the panel's `light-dark()`, `color-mix()`, `:has()` and `backdrop-filter` all render, light and dark, desktop and phone. One tolerance widened on the way: the content pass treats a 1px `scrollWidth` overshoot as rounding (Firefox rounds both sides to integers), so an element at its parent's edge no longer reads `held by content` there.

## v0.1.71 (2026-10-14)

An outside review (Codex) of v0.1.70 with a rewritten file; its findings taken into this file one by one, Alper's standing decisions kept (the single-row head without a fold button, the extension filter, the phone bar's pill):

- A resize undo, the handle's Reset, Reset sizes and a cancelled drag put back the SIZE PROPERTY only, not the whole `style=""`: a colour the page (or the panel) wrote onto the element after the resize stays. The attribute itself returns verbatim once the live style equals it, so an element that had none loses it again.
- An undo step whose size the page has overwritten since (another value or priority) is skipped and the bar says so (`1 resize skipped: the page changed it`); an `!important` already on the size is kept by the drag. The CSS undo's guard compares the priority too.
- A running drag ends cleanly when the tool changes hands, closes, or the element leaves the page; resized elements and the chosen element are dropped with their nodes; removing the inspector closes the ruler as well.
- CSS undo and Reset skip a rule or an inline owner no longer on the page (`modelAvailable`).
- The resize writes `block-size` in a vertical writing mode (the logical property that is the physical width); the handle is disabled, with a note, on an element under a transform or a CSS zoom.
- The grid track parser handles bracketed line names, comments and nested functions, and caps an unrolled `repeat()` at 2048 tokens.
- The handle is a button: Left/Right arrows step the width by 1px, Shift by 10px; a 44px touch box on coarse pointers, the 16px face unchanged. The resize bar never runs wider than the screen, a long element name is ellipsized.
- Show all sizes paints the elements in the viewport only, at most 300, from one rect cache per frame; a name chip collides after being clamped into view and is dropped when no spot is free, so it never lands on a control.
- The CSSOM poll runs while the resize tool or the ruler is on with the panel hidden. Two quick taps on a head button on a phone are two clicks, not a double tap on the head. Stylesheet linking indexes the rule heads once. `data-fm-inspector-ignore` marks a page's own helper node as not-the-page's-code.
- The 100% snap threshold is half a pixel from the parent's edge (it was one pixel: a 1px keyboard step at the edge stayed at 100%).
- NOT taken: the fold button and two-row head (refused six times now), the removal of the extension filter (Alper's accepted trade-off), the phone bar's full-width wrap, the reconcile rewrite for duplicate fallback declarations (deferred, a rare page-script case).

## v0.1.70 (2026-10-14)

- The Reset beside the handle puts the CSS edits back too, not only this element's size (Alper's call): every declaration unticked or edited in the panel returns, as the bar's Reset rules does; the other resized elements, the picks and the pins stay.

## v0.1.69 (2026-10-14)

- A pick (or a resize choice) no longer turns the eye off (Alper's catch: "picker ile bir seyler secince mevcut seyler yine gidiyor"): a page click an armed tool takes through its shield leaves Show all sizes standing; a click on the panel or anywhere else still closes it.

## v0.1.68 (2026-10-14)

- The `inline-size: 100%` chip reads on any ground (Alper's catch: amber on the blue image was invisible): a translucent white chip with amber text and a faint amber border. Its fallback spots stay clear of the resize tool's own bar and warning, start below the bar when the element runs up behind it, and try the element's top-left corner too.

## v0.1.67 (2026-10-14)

- The `inline-size: 100%` chip is quiet and translucent (Alper's call: less attention, see-through) and sits beside the element instead of on it: right-aligned just above its top edge, below it when the top is off screen or taken, inside its top-right corner only as a last resort.

## v0.1.66 (2026-10-14)

- When a resize reaches the parent and is written as `100%`, the resize tool says so on the element itself (Alper's ask): an amber `inline-size: 100%` chip in the element's top-right corner, on every resized element at a percentage while the tool is on; it goes with the tool, with Reset sizes and with the handle's Reset.

## v0.1.65 (2026-10-14)

- The resize is written in px until it reaches the parent's content box; there it is written as `100%` (Alper's call), so the element follows the parent from then on, growing and shrinking with it (a content-box element keeps its padding and border out of the percentage with a `calc`). The content pass (never narrower than its own content) stays in px: a `100%` against a content-sized parent is cyclic and opened the element to its max-content.
- The picker and the resize tool stand together (Alper's call: arming one must not reset the other): the one armed last takes the page's clicks and the state pill, the other keeps its state (the chosen element with its handle and bar, the picks) and takes the clicks back when that one ends; closing a tool closes its own things only. The eye (Show all sizes) survives a click on the two tool toggles beside it; any other click still closes it.
- The eye hatches the room a block-level box leaves unused beside itself in a block container (Alper's ask: the card's image at 299px in a 536px content box): a grey diagonal-striped strip from the box's margin edge to the parent's content edge, with an `unused Npx` chip when it is wide enough.

## v0.1.64 (2026-10-14)

- The lines the resize tool writes into an element's inline `style=""` (its `inline-size`) stand out lightly in the CSS tab (Alper's ask, "hafif"): a 7% tint of the inline group's amber on the row; the page's own inline declarations stay untinted, and a Reset takes the tint with the line.

## v0.1.63 (2026-10-14)

- The resize is written as a fixed px `inline-size` again (Alper's call): `inline-size: 200px`, no percentage of the parent anymore, so a resized element keeps its own width when the parent changes. The parent's content box still caps a drag where it is a plain limit, with the same warnings.
- Within one drag, the children resized earlier are refitted from their drag-start size on every step, each against its own parent's content box, so a step that narrowed them is undone by a wider one and a crushed child no longer leaves the parent reporting a content overflow.

## v0.1.62 (2026-10-14)

- Shorter warnings (Alper's call): `held by max-width: 320px`, `held by content: h1`, `grid track: 100px 100px`, `main: width: 600px`. When the parent has no width rule, the warning names what sizes the parent instead: its own parent's grid or flex (`body grid: place-items: center`, that row lit) or its content.
- A reset starts clean (Alper's call): the head's Reset and the bar's Reset rules clear the undo history too, as Reset sizes already did; the undo buttons dim.

## v0.1.61 (2026-10-14)

- An element's inline `style=""` (the resizes land there) lists right above the first rule that selects it, in its own amber colour with a bar on its edge, instead of in an "Inline styles" section at the end (Alper's call); with no such rule it leads the list.
- The "held by the parent" warning is back for a percentage resize: a size past the parent's content box is capped at 100% and said so (it went quiet in v0.1.60). It names the parent and, when the parent has no width rule of its own, says it is sized by its content and to resize it first (the QR card inside its centred `main`).

## v0.1.60 (2026-10-14)

- A resized element keeps answering its parent (Alper's call): the resize is written as a percentage of the parent's content box (`inline-size: 62.5%`), so the element grows and shrinks with the parent afterwards. Where a percentage would be circular, a grid item in an auto track or a positioned element, it stays in px.

## v0.1.59 (2026-10-14)

- The resize writes `inline-size` (Alper's call), so the page's own `max-width` rules hold again (an inline `max-width` had overridden them in v0.1.56). The parent always wins: narrowing a parent narrows the children resized earlier with it, as one undo step.
- The holding declaration is marked harder in the CSS tab: a red row with a red outline, its name and value in red, its selector in red too.

## v0.1.58 (2026-10-14)

- When the "held by" warning points at a declaration while the HTML tab is showing, the panel switches to the CSS tab and brings that row into view (Alper's ask).

## v0.1.57 (2026-10-14)

- The resize tool's bar ends in two resets (Alper's call): "Reset sizes" puts every resized element back, "Reset rules" puts every CSS edit made in the panel back; picks and pins stay either way.

## v0.1.56 (2026-10-14)

- The resize writes `max-width` instead of `width` (Alper's call): a block in flow follows it both ways, a shrink-to-fit element only narrows, and the warning says so ("held by its own width (max-width only narrows)", with the width rule when there is one).

## v0.1.55 (2026-10-14)

- The resize handle changes the width alone; the height follows the content, as the layout would have it (Alper's call). The handle keeps its corner, its cursor is the horizontal one.

## v0.1.54 (2026-10-14)

- A resize never makes an element smaller than its own content either (Alper's call): its children and its wrapped text stay inside, and the warning names the child that holds it ("width held by its content (h1)"), lighting that child's own inline size when it was resized. An element that clips or scrolls its overflow keeps that rule instead.

## v0.1.53 (2026-10-14)

- The "held by" warning shows the moment the drag meets a limit and clears the moment it leaves it; it no longer waits for the pointer to be released (Alper's call).

## v0.1.52 (2026-10-14)

- A resize follows the layout's rules (Alper's call): the element never grows past its parent's content box, and a grid item stays inside its track (a row track that does not grow with it caps the height too). When the handle asks for more, the warning names what held it: the grid track or the parent, with the parent's own declaration when there is one.

## v0.1.51 (2026-10-14)

- The "held by" note is a warning badge of its own, right of the resize tool's bar (under it on phones), not text inside the bar (Alper's call).

## v0.1.50 (2026-10-14)

- A small Reset sits beside the corner handle once the chosen element has been resized (Alper's ask): the element goes back to its own size, as one undo step, and can be resized on; it hides while the element is untouched and jumps to the handle's other side against the viewport's edge.

## v0.1.49 (2026-10-14)

- When a resize does not land, the property that held it is named in the top bar ("width held by max-width: 320px") and its row is lit red in the CSS tab (Alper's ask): a max or min size, a `!important` width or height, `display: inline`, flex-shrink or flex-grow in a flex container, the grid track, or both insets on an absolute element. The mark clears on the next choice, resize, undo or Reset.
- The top bar's per-element Reset is gone (Alper's call): the undo covers it. The bar reads: the element's size, undo, Reset all sizes.


## v0.1.48 (2026-10-14)

- The resize tool's top bar holds everything now (Alper's call): the chosen element's name and live size, the undo, that element's Reset and Reset all sizes; the separate bar above the element is gone, only the corner handle marks it. Before a choice the bar reads "Click an element".

## v0.1.47 (2026-10-14)

- The resize tool's top bar reads "Reset all sizes" (Alper's call).

## v0.1.46 (2026-10-14)

- While the resize tool is armed a small bar sits at the top centre of the page (Alper's ask): an undo for the last resize (the element's own Reset counts as one) and Reset all, every resized element back. On phones the tool's state pill moves under it.

## v0.1.45 (2026-10-14)

- The resize tool works from the element's bottom-right corner (Alper's call): a handle there drags the width and height together, inline px, border-box sizes; the bar above keeps the live `W × H` and the element's own Reset, the slider is gone. A corner past the viewport's edge keeps its handle reachable at the edge.

## v0.1.44 (2026-10-14)

- A resize tool, beside the picker's tools in the head (Alper's ask): armed, a click on the page chooses an element and a bar appears above it with a slider for its width (1px to the viewport, starting at its own width), the live value and a Reset for that element alone. The width is written inline, so the HTML and CSS tabs show it; the bar stays where it is until another element is chosen or the tool ends (Escape or its button). The head's Reset puts every resized element back too. The picker and the resize tool share the page shield, one at a time.
- The panel's smallest width is 344px, where the head's nine controls still fit.

## v0.1.43 (2026-10-14)

- Show all sizes touches nothing else (Alper's call, reversing v0.1.34): the picks, pins and the armed picker stay as they are under it; it paints every element's size and goes on the next click anywhere, as before.

## v0.1.42 (2026-10-14)

- Phones (Alper's calls): pulling the sheet down never closes it, it stops at the head alone; only the close button closes it and brings the Show code pill back; a double tap on the head drops the sheet to its head, another double tap raises it to its full height.

## v0.1.41 (2026-10-14)

- A narrow panel keeps its head on one line: the tabs no longer wrap under each other, and the panel's smallest width is 320px, where every head button still fits (Alper's screenshot).

## v0.1.40 (2026-10-14)

- Closing the panel no longer disarms the picker (Alper's call, phones first): with the sheet away the page can be tapped and every tap measures; only Escape or the picker's own button ends it, and Reset still does.

## v0.1.39 (2026-10-14)

- The picker works like the ruler: whenever it closes (Escape, a second press on its button, the panel closing, Reset), the picked elements go with it (Alper's call).

## v0.1.38 (2026-10-14)

- Escape while the picker is armed disarms it and clears the picked elements too (Alper's call); pins stay.
- An edit left standing with an invalid value answers Escape wherever the focus is, on the page included; it used to need the focus back in the field. The listener lives only as long as the edit, so a later Escape closes the panel as before.

## v0.1.37 (2026-10-14)

Fixes from an outside review of v0.1.29:

- Undo after Reset lands on the live rows: a rule the undo history still refers to keeps its model through a rebuild, so the page, the panel and the value Reset returns to agree (an edit, Reset, Undo, another edit and Reset ends on the page's original value).
- Undo leaves a property the page wrote itself after the step: the step is compared with the live value and skipped when they differ.
- The page's own `<style>` and `<link>` elements are never taken for an extension's, whatever id they carry; a runtime stylesheet lists as before.
- The ad-blocker sheet filter needs ten or more hide-only rules whose selectors read like a filter list (links by address, ad/banner/sponsor names), and a `<style>` the page's source carries is never dropped; a page's own utility `.hidden` rules stay.
- The undo history holds the last 200 steps.

## v0.1.36 (2026-10-14)

- The ruler button is "Show all sizes" now and wears the Untitled UI eye (Alper's call); the set square is gone.

## v0.1.35 (2026-10-14)

- Any click anywhere but the Measurement button, on the page or in the panel, turns the ruler off (Alper's call); the page still receives its click.

## v0.1.34 (2026-10-14)

- Measurement and the other tools never run together (Alper's call): turning the ruler on disarms the picker and clears every pick and pin; arming the picker, picking a row or an element, or pinning a declaration turns the ruler off; a hovered declaration paints nothing while the ruler is on. CSS edits are untouched either way.

## v0.1.33 (2026-10-14)

- Measurement draws, per element, the frame, one DevTools-style chip (`div.card | 256 × 52.8px`) and the margin, border and padding bands with their values; the width and height lines and their separate labels are gone (Alper's call: "çok karışık oldu"). The size chips read `W × H` with px everywhere now.

## v0.1.32 (2026-10-14)

- The Measurement button wears a set square (a right-angled triangle with its inner cut-out), Alper's call.

## v0.1.31 (2026-10-14)

- The Measurement button wears a straight, square-cornered ruler with tick marks (Alper's call; the diagonal rounded one is gone).

## v0.1.30 (2026-10-14)

- A ruler button, Measurement, sits beside the CSS tab (Alper's ask): pressed, every element on the page gets its frame, its width and height lines with sizes, its name chip, and its margin, border and padding bands with their values wherever they are not zero; pressed again, it all goes. Reset turns it off too. Nothing else changes: picks, pins and the picker work as before on top of it.

## v0.1.29 (2026-10-14)

- A stylesheet adopted more than once lists at its last position, where it cascades, and the poll's record keeps the repeats, so `[A, B]` becoming `[A, B, A]` refreshes the panel (an outside review's finding; the first position used to win and the change went unseen).

## v0.1.28 (2026-10-14)

- Nodes that browser extensions add to the page (a translation popup, a password manager's overlay, Grammarly's element) stay out of the HTML tab, the Inline styles section and the picker: the inspector reads the page's own HTML source once and treats a top-level node of html, head or body the source never had as an extension's when it carries an id, a custom element name or a shadow root. A plain element the solution's own script adds (a toast, a modal) stays. A few extensions are known by name for when the source cannot be read (file://, offline). The picker finds the element under an extension's full-page overlay.

## v0.1.27 (2026-10-14)

- An Undo button sits beside Reset again (Alper's call): it steps the CSS changes back one at a time, a tick, a whole edit session (arrows included) or a Reset as one step; a cancelled edit records nothing; it is dimmed while there is nothing to undo.
- A browser extension's cosmetic filter sheet (an ad blocker's page-level `<style>` of many `display: none !important` rules) is left out of the CSS tab and the poll; the solution's own hide rules stay.

## v0.1.26 (2026-10-14)

- A rule lit by a pick no longer draws a vertical bar down the group's left edge; the lit selector alone marks it.

## v0.1.25 (2026-10-14)

Fixes from the outside re-review of v0.1.24:

- An own edit refreshes the poll's entry for its top-level rule only when that entry still matched the rule's text before the write, so a change the page made to a sibling rule in the same `@media` or nesting block, or a declaration it added a moment before two quick edits, keeps the entry stale and the panel rebuilds.
- The poll's record keeps the stylesheets' cascade order; reordering adopted stylesheets (no DOM mutation) refreshes the panel now.
- A drag that starts on a head button ends only on the head's own loss of pointer capture; a child's capture loss bubbling through it (a touch's implicit capture on the button) no longer cancels the drag.
- Phones: a still press on a head button keeps its focus, as on desktop; only a bare-surface press prevents the default.
- Phones: the sheet closes only on a pull down, and the closing height scales with a short screen (a quarter of it, at most 120px), so pushing up on a 200px-tall viewport no longer closes it.

## v0.1.24 (2026-10-14)

Two regressions an outside review of v0.1.21 caught, both from that version's own additions:

- After an own edit the CSS poll's record is refreshed for that one top-level rule alone, and only when the page had not touched the rule since the last write; it used to re-record every stylesheet, so a change the page made to another rule, a declaration it added to the same rule or a stylesheet it adopted right before the edit went unnoticed until the panel was reopened. The per-keystroke cost drops from a whole-document serialisation to one rule's.
- Escape while the picker is armed cancels an open value edit first (valid or invalid) and leaves the picker armed; the next Escape disarms. It used to disarm and move the focus, and the blur committed the edit instead of cancelling it.

## v0.1.23 (2026-10-14)

- The whole head drags the open panel, the tabs and buttons included: a press that moves past 4px is a drag and its click is swallowed, a still press stays a click. Until now only the bare strip between the tabs and the theme button dragged. The phone sheet pulls from the tabs the same way; the pointer is captured only once a drag has begun, so a plain click still lands on its button.

## v0.1.22 (2026-10-14)

- Phones: the sheet stays at the height it was pulled to; since v0.1.19 it sprang back to half the screen on release. A pull under 120px closes it as before.

## v0.1.21 (2026-10-14)

- The copyright line moves from the top of the file to its end; the version comment is the first line now.

## v0.1.20 (2026-10-14)

Fixes from an outside pass over v0.1.19, taken where they held up:

- The picker covers the page with a transparent shield while it is armed: the page's own handlers (click, pointerdown, mousedown, hover effects) never fire on a pick, the element under the pointer is found by hit testing through the shield, and a touch pan still scrolls the page. Escape disarms wherever the focus is.
- An edit writes only the properties it changes, so declarations the page adds to the same rule in the meantime stay; Reset and an Escape-cancelled edit keep the page's later additions, changes and removals too, and an inline `style=""` goes back to its original text when nothing else touched it.
- The CSS tab follows the page's styles: a `<style>` text change, a `style=""` change, a stylesheet in an added subtree and a late-loading `<link>` all refresh it; CSSOM edits and adopted stylesheets, which raise no DOM mutation, are polled every 500 ms while the panel is open, a pin stands or the picker is armed. Reopening the panel refreshes as well, so there is no refresh button.
- An invalid value on Enter or blur keeps the field, marks it red and says so under the head; Escape cancels. Closing or folding the panel cancels an unfinished edit.
- A rule in a disabled stylesheet, a `<link media>` that does not match or a removed `<style>` lights nothing and paints nothing.
- The sun shows under an OS dark scheme with no override (it showed the moon).
- Home and End move between the tabs.
- Removing a text or comment node from the page no longer throws in the mutation observer.
- Not taken: the fold and refresh head buttons and the tighter phone paddings that made room for them. The inspector's own writes no longer trigger a rebuild of the CSS view (the hovered reach stuck to the page after one).

## v0.1.19 (2026-10-14)

A merge of an outside rewrite of the CSS layer and the lifecycle, kept where it was better:

- The CSS tab reads the live CSSOM first and shows at once; the stylesheet sources are fetched afterwards only to bring back comments and blank lines, so a sheet that cannot be fetched still lists every rule.
- Nested rules (`& .btn`, `.card { .title {} }`), `@layer`, `@container`, `@scope` and `@import`ed sheets are real rows: every declaration can be ticked, edited and pinned. The browser itself judges which elements a nested, scoped or container rule reaches (a temporary marker property in an adopted stylesheet), so the lit groups and the painted reach are exact.
- Inline `style=""` attributes list under "Inline styles"; Reset restores the attribute as it was.
- Reset puts a rule's style block back to its exact original text; the parsed source is used for the rows only when re-serialising it reproduces the browser's own text, otherwise the rows come from the CSSOM (the selector carries a note).
- Selectors are matched to the CSSOM through the browser's own serialisation, so spacing and formatting differences in the source no longer break the pairing.
- The HTML tab follows the page: elements added, removed or changed show up by themselves, folds and the focused row survive the refresh, and a stylesheet added later reloads the CSS tab.
- Drag, resize and the phone sheet share one gesture helper with pointer capture; a cancelled gesture puts the box back.
- HTML rows are real buttons (the caret and the tag separately), so keyboard and screen readers get them for free.
- A value edit marks an unparseable value in red instead of silently keeping the last good one.
- Kept from before: the head's layout and sizes, the crosshair cursor, the phone sheet. The outside version's fold and refresh buttons were not taken (the head click folds, the page is watched).

## v0.1.18 (2026-10-14)

- While the picker is armed the page cursor is a crosshair, so the armed state shows at the pointer itself and a click is known to pick; the inspector's own controls keep their cursors, and disarming restores the page's.

## v0.1.17 (2026-10-14)

Fixes from two outside reviews (a code reading of v0.1.13 and a live run of v0.1.16):

- A change to a declaration rebuilds its rule's whole style block from the source order, so shorthands, longhands and repeated properties resolve as the stylesheet would; Reset restores every touched rule the same way.
- A value is judged by the browser's own parser (`CSS.supports`): `28.0px` passes, nonsense is refused.
- The CSS reader keeps a nested rule as a note, a custom property holding a block as one value, and a rule the browser dropped (a bad selector) no longer shifts the pairing of the rules after it.
- A declaration inside an inactive `@media` / `@supports` paints nothing, and the lit groups refresh on resize.
- Logical sides and sizes (`padding-inline-start`, `inline-size`) follow the element's direction and writing mode.
- Removing the element from the DOM unbinds its window listeners and observers; reinserting it binds them again.
- The overlay draws at most once per frame.
- Phones: the closed pill centres without transforming the host, so the overlay keeps its place after the sheet closes; resize is off on phones for good (the handles and the pointer); a desktop resize no longer narrows the sheet.
- The left resize edge is full height again (its class no longer collided with the measure lines).
- A drag never starts on a button, so the tabs keep their focus; the selected tab alone is in the tab order; HTML rows take focus and pick on Enter or Space; the fold caret reports `aria-expanded`.
- The host carries `data-version`; a comment after a declaration shows beside it.

## v0.1.16 (2026-10-13)

- The panel keeps one height on both tabs (70vh up to 40rem on desktop, half the screen on phones); only the user's own resize changes it, and nothing resizes while the panel is folded to its head.
- On phones the closed pill sits at the bottom centre.

## v0.1.15 (2026-10-13)

- The phone sheet takes at most half the screen; pulling its head down shrinks it, a deep pull closes it, pushing up grows it back.

## v0.1.14 (2026-10-13)

- On phones the open panel is a sheet fixed to the screen's foot: full width, rounded top corners, a grip bar over the head, sliding up from below; it neither drags nor resizes there. The pill, the head and the tabs are unchanged.

## v0.1.13 (2026-10-13)

- Labels never sit on each other: a size label with no room along its line steps above or below it until it is clear, and every label stays inside the viewport.

## v0.1.12 (2026-10-13)

- The Show code pill is back in the bottom end corner.

## v0.1.11 (2026-10-13)

- The head bar is 32px tall (its 1px rule under it): tabs 32px, the icon buttons 24px, Reset 22px.

## v0.1.10 (2026-10-13)

- A light / dark button beside Reset switches the inspector's own theme (sun while dark, moon while light), remembered in this browser; untouched, it follows the OS.
- The Show code pill starts at the bottom centre of the page; the panel still opens in the bottom end corner.
- The CSS tab always shows every stylesheet in source order; a pick lights the rules that select it in the pick's hue (an accent bar on the group, the selector on a wash) and scrolls to the element's own rule, the other rules staying where they are. The matched-only view and its inherited section are gone.

## v0.1.9 (2026-10-13)

- Reset clears everything: the page's CSS back, every pick and pinned declaration gone, the picker off; it shows on both tabs.

## v0.1.8 (2026-10-13)

- Reset is back, a quiet text button in the head beside the close, shown on the CSS tab.
- The Show code pill is the words alone, no code icon.
- The element under the picker shows what a pick shows: frame, width/height lines with their sizes and the name chip (the size left the chip).

## v0.1.7 (2026-10-13)

- Hovering or pinning a CSS declaration paints its reach on the page without the name / size chip.
- That reach, its size line and the declaration's row in the panel speak one fuchsia family, apart from the picks' blues.

## v0.1.6 (2026-10-13)

- The page-foot pill while the picker is armed reads `Show code`, nothing else: no hint, no dot.

## v0.1.5 (2026-10-13)

- The CSS group heads show the selector alone; the `sheet:line` source label is gone.
- The pick chips lost their order numbers: the chip is the element's name in the pick's hue.
- The Undo button left the head too; with it the change history. Unticking or editing a declaration is undone by ticking or editing it back, and the dismiss badge still puts the whole page back.

## v0.1.4 (2026-10-13)

- A pick draws its frame, the width/height lines with their px labels and the numbered name chip (the chip no longer repeats the size); the margin / padding / content bands and their m / p chips are gone.
- The foot is gone with its legend and the Reset button; Undo is an icon in the head beside the close.
- The version label left the head (the version stays on line 2 of the file and here).

## v0.1.3 (2026-10-13)

The Inspect Mode design, applied in full:

- Panel: ink tabs under an accent rule, the version between the tabs and the close button, a foot with the margin / padding / content legend, Undo and a boxed Reset.
- HTML tab: the body as full-width rows with fold carets (text-only rows show a slice while folded), tags in blue and attributes in purple, the picked row on a wash with an accent bar.
- CSS tab: with a pick, the rules that select it (most specific first, each with its `sheet:line`) and the inheritable declarations of its ancestors' rules under `Inherited from <parent>`; without a pick, every stylesheet in the same row form. Color values carry a swatch, an unticked declaration reads struck through.
- Overlay: a hovered element wears a frame and a dark `name | W × H` chip (flex/grid noted in amber); a pick wears a frame, a hue fill and a numbered chip from a five-step cool palette; the last pick adds the margin / padding / content bands, `m` and `p` chips and dashed guide lines; Alt while picking measures the gap to the hovered element in red.
- A page-foot pill reads `Inspect on · Esc to exit` while the picker is armed.

## v0.1.2 (2026-10-13)

- An element picker left of the tabs (Chrome's select-an-element button): armed, the element under the pointer wears a dashed outline with its name and sizes; a click picks it (the page never sees that click), lights its HTML row and opens the CSS tab with the SELECTOR of every rule that selects it marked in the pick's hue, scrolled to the element's own rule past the universal resets. The picker stays armed until its button, Escape or the panel's close; clicking a picked element again unpicks it.
- The version label centers on the head bar.

## v0.1.1 (2026-10-13)

- The panel head shows the running version (`inspector v0.1.1`, muted mono between the tabs and the buttons), so an update is visible on the page itself.
- README: the inspector explains a solution, it does not export one.

## v0.1.0 (2026-10-13)

First versioned release of the inspector that the demo pages already load: HTML tab (the live DOM as rows, a click measures the element on the page), CSS tab (every declaration of the page's stylesheets with a tick that removes it live, value editing, undo, reset, a hovered or pinned declaration shows where it lands), a floating panel that drags, resizes, folds and shrinks to a pill.

Since the first copy on GitHub:

- A picked HTML element shows its outline, width/height lines with sizes and its name only; the content wash and the padding/margin bands no longer paint on a pick (the CSS declaration hover keeps its bands).
- Hovering the closed Show code pill reveals an x on its corner (always shown on touch); a click resets the page's CSS and removes the inspector until the next page load.
