# Decisions

The standing decisions behind `inspector.js`, by area. They are the contract a refactor must keep: a change that alters one of these is a product change and needs Alper's call, not a code-quality one. CHANGELOG.md tells when each landed; this file tells what stands today and why. Items marked REFUSED were asked for by outside reviews (six Codex passes between v0.1.17 and v0.1.71) and declined every time; do not re-add them unprompted.

## Scope

- The inspector explains a solution, it does not export one. No copy, download or extract features (README, v0.1.1).
- One file, `inspector.js`, served at the demo site's root and loaded by every solution with one `<script defer>`. Zero runtime dependencies, nothing fetched but the page's own sources. The source may live in several files, the built output is that one file and is never edited by hand.
- The file's first line is `// inspector.js vX.Y.Z`, the host element carries `data-version`, the copyright line closes the file (v0.1.21). The version is shown nowhere on screen (v0.1.4).
- Every batch that reaches the copy page bumps the PATCH; minor and major bumps are Alper's call.

## Head and panel

- Head order, one row: picker · HTML · CSS · resize · eye (Show all sizes) · spacer · theme · undo · Reset · close. Sizes: head 33px (32 + its rule), tabs 32px, icon buttons 24px, Reset 22px (v0.1.11). Panel height `min(70vh, 40rem)` on desktop, the user's own resize is the only thing that changes it (v0.1.16). Smallest width 344px, where the nine controls still fit (v0.1.44).
- REFUSED: a fold ▾ button and a refresh ↻ button, and the two-row head that made room for them. The head click folds; the page is watched (DOM mutations + a 500 ms CSSOM poll while the panel is open, a pin stands or a tool is armed), so there is nothing to refresh (v0.1.19, v0.1.20, v0.1.71).
- REFUSED: a keyboard path for folding the panel (asked five times; still Alper's call).
- The whole head drags the open panel, tabs and buttons included; a press that moves past 4px is a drag and swallows its click (v0.1.23). A drag never starts a click on a button and never steals a tab's focus (v0.1.17).
- Theme: a sun/moon button switches the inspector's own light/dark, remembered in localStorage; untouched it follows the OS (v0.1.10). The page's theme is never touched.
- The closed state is a "Show code" pill in the bottom end corner (bottom centre on phones), words alone, no icon (v0.1.8, v0.1.12). An "Inspect code" wording was asked for and withdrawn. Hovering it reveals a corner x (always shown on touch) that resets the page's CSS and removes the inspector until the next load (v0.1.0).
- The status line under the head (`role="status"`) carries edit errors and tool notes; it is the only text channel besides the resize bar.

## Phones (≤480px)

- The open panel is a bottom sheet: full width, rounded top, a grip over the head, at most half the screen (v0.1.14, v0.1.15). No drag, no resize there, ever (v0.1.17).
- A pull down shrinks the sheet and stops at the head; it NEVER closes. Only the close button closes it (reopen = full height). A double tap on the head drops the sheet to its head, another raises it (v0.1.42). Two quick taps on two head buttons are two clicks, not a double tap (v0.1.71).
- Closing the sheet does not disarm the picker: taps on the page keep measuring (v0.1.40).
- The resize tool's bar and state pill: the pill moves under the bar on phones (v0.1.46). REFUSED: a full-width wrap of the bar (v0.1.71).

## Picker

- Armed by its head button; the page's clicks are taken by a transparent shield in the shadow root, so the page's own handlers never fire on a pick, hit testing finds the element through the shield, a touch pan still scrolls (v0.1.20). The page cursor is a crosshair while armed (v0.1.18).
- A pick lights the element's HTML row and, on the CSS tab, the SELECTOR of every rule that selects it in the pick's hue, scrolled to the element's own rule past the universal resets (v0.1.2). No left bar on the group (v0.1.26), no property-row highlight. Picks come from a five-step cool palette (v0.1.3); a chip is the element's name alone, no number, no size (v0.1.5).
- The picker stays armed after a pick. Escape, its button or Reset end it, and the picks go with it, like the ruler (v0.1.38, v0.1.39). A tab switch keeps them. Escape cancels an open value edit first and leaves the picker armed; the next Escape disarms (v0.1.24).
- Alt while picking measures the gap to the hovered element in red (v0.1.3).

## Resize tool

- Armed by its head button; a page click chooses an element. A bottom-right corner handle drags the WIDTH only, the height follows content (v0.1.45, v0.1.55). The handle is a button: Left/Right arrows step 1px, Shift 10px; 44px touch box, 16px face (v0.1.71). A corner past the viewport keeps the handle reachable at the edge.
- The value is written inline as `inline-size` (v0.1.59; `block-size` in a vertical writing mode, v0.1.71), a FIXED px value (v0.1.63, Alper: no percentage) UNTIL the drag reaches the parent's content box, where it becomes `100%` so the element follows the parent from then on (v0.1.65; `calc(100% - Npx)` for content-box elements; the content pass stays px). The snap threshold is half a pixel (v0.1.71). An `!important` already on the size is kept.
- The layout wins: never past the parent's content box, a grid item stays in a declared fixed track, never narrower than its own content (an element that clips or scrolls its overflow is exempt), the parent narrows children resized earlier with it, each refitted from its drag-start size on every step, as one undo step (v0.1.52, v0.1.54, v0.1.59, v0.1.63). A transformed or zoomed element gets a disabled handle and a note (v0.1.71).
- When a drag meets a limit, the held declaration's row turns red in the CSS tab, the tab opens and scrolls to it; that is the whole message (v0.1.73, the red badge beside the bar is gone). The element's own `max-`/`min-` rule is checked before the parent and content caps (v0.1.73). When the hold comes from outside the element, the holding area is framed red dashed on the page with the reason on a red chip (v0.1.74). Warnings are short: `held by max-width: 320px`, `held by content: img`, `grid track: 100px 100px`, `main: width: 600px`, `body grid: place-items: center`, `main: content-sized` (v0.1.62). The warning rises mid-drag and clears when the limit is left (v0.1.53). A visually hidden `role="status"` keeps the reason for assistive tech.
- Top-centre bar while the tool is on: `name W × H` · undo · Reset sizes · Reset rules (v0.1.48, v0.1.57). "Click an element" before a choice. Never wider than the screen, a long name ellipsized.
- A small Reset sits beside the handle once the element was resized: this element's size back AND every CSS edit made in the panel back; other resized elements, picks and pins stay (v0.1.50, v0.1.70).
- Resize undo, the handle's Reset, Reset sizes and a cancelled drag restore the SIZE PROPERTY only, not the whole `style=""`, through the property the tool wrote at the time; a size the page overwrote since (another value, another priority) stands and the step is skipped with a bar note, the element its own again (v0.1.71, v0.1.76: the handle's Reset and Reset sizes skip too). A size the page writes between a drag's last move and its release is the page's, not the tool's (v0.1.76).
- The inline lines the tool wrote wear a 7% amber row tint in the CSS tab; the page's own inline lines stay untinted (v0.1.64, "hafif"). No `inline-size: 100%` chip on the element (lived v0.1.66 to v0.1.72, gone in v0.1.73).

## Tools together

- The picker and the resize tool COMPOSE: arming one keeps the other's state (chosen element, handle, bar, picks); the one armed last takes the page clicks and the state pill; the other resumes when that one ends; closing a tool closes only its own things (v0.1.65, Alper: "select to element e basinca her sey sifirlandi, oyle olmasin"). One shield, owned by the arbitration, with two facts kept apart: which tools are OPEN and which one is ACTIVE (takes the page clicks).
- A running drag ends cleanly when the tool changes hands, closes, or the element leaves the page (v0.1.71).

## Show all sizes (the eye)

- Paints every element in the viewport (at most 300, one rect cache per frame): frame, one DevTools chip `name | W × Hpx`, margin/border/padding bands with values; no width/height lines (v0.1.33, "çok karışık oldu"). Chips never land on a control; a chip with no free spot is dropped (v0.1.71).
- It also hatches unused room: a block-level box in a block container leaving space beside itself gets a grey diagonal strip from its margin edge to the parent's content edge, with an `unused Npx` chip when ≥72px (v0.1.65).
- It touches nothing else: picks, pins, the armed picker stay (v0.1.43, reversing v0.1.34's exclusivity).
- It closes on ANY click elsewhere, EXCEPT: the picker and resize toggles (v0.1.65), and a page click an armed tool takes through its shield, a pick or a resize choice (v0.1.69). Reset turns it off.

## CSS tab

- ALWAYS the whole stylesheet, every sheet in cascade order, CSSOM-first: the live rules show at once, the sources are fetched afterwards only to bring back comments and blank lines (v0.1.10, v0.1.19). The matched-only view, the inherited section and the `sheet:line` labels are gone (v0.1.5, v0.1.10).
- Nested rules, `@layer`, `@container`, `@scope`, `@import` are real rows; the browser judges a nested/scoped/container rule's reach via a marker property in an adopted sheet (v0.1.19). A rule in a disabled sheet, a non-matching `<link media>` or an inactive `@media`/`@supports` lights and paints nothing (v0.1.17, v0.1.20).
- Inline `style=""` groups render in amber ABOVE the element's first matching rule, past the `*` resets; with no such rule they lead the list (v0.1.61).
- A tick removes a declaration live; a value edit is judged by `CSS.supports`; an invalid value stays red with a status line, Escape cancels from anywhere (v0.1.17, v0.1.20, v0.1.38). A change rebuilds the rule's style block from source order so shorthands resolve as the sheet would; an edit writes only the properties it changes, so the page's later additions stay (v0.1.17, v0.1.20).
- A hovered or pinned declaration paints its reach on the page in the fuchsia family, without the name chip (v0.1.7). Colour values carry a swatch; an unticked declaration reads struck through (v0.1.3).
- The page's styles are followed: `<style>` text, `style=""`, added subtrees and late `<link>`s via mutations; CSSOM edits and adopted sheets via the 500 ms poll (v0.1.20). The poll's record keeps cascade order and repeats (v0.1.25, v0.1.29). An own edit refreshes only its own top-level rule's entry, and only when that entry still matched the rule's text (v0.1.24, v0.1.25). When the page changes a rule holding a property twice, the live entry takes the row that carries its value, so an edited fallback line keeps its row and its undo (v0.1.76).

## HTML tab

- The live DOM as rows with fold carets; text-only rows show a 24-character slice while folded; tags blue, attributes purple; the picked row on a wash with an accent bar (v0.1.3). Rows are real buttons (caret and tag separately); Enter/Space picks; folds and the focused row survive a refresh (v0.1.17, v0.1.19).
- A click on a row measures the element on the page (v0.1.0).

## Undo and Reset

- TWO undo stacks with TWO buttons: the head's undo steps CSS changes back (a tick, a whole edit session, one step each; a cancelled edit records nothing; last 200 steps); the resize bar's undo steps resizes back (v0.1.27, v0.1.46). They are not merged. A step the page overwrote since is skipped, judged against the snapshot the step took (value, on, priority), never against the model as the page may have changed it since (v0.1.37, v0.1.71, v0.1.76); a step on a rule or inline owner no longer on the page is skipped (v0.1.71).
- Reset (head) = the page's CSS back, picks and pins cleared, the picker off, the ruler off, every resize back, and the undo history CLEARED (v0.1.9, v0.1.62, reversing v0.1.27's undo-able reset). Reset sizes and Reset rules (resize bar) each do their half; picks and pins stay (v0.1.57).
- Reset puts a rule's style block back to its exact original text and an inline `style=""` back verbatim once the live style equals it (v0.1.19, v0.1.71). A rule the page added to since the edit keeps the addition: Reset rebuilds its rows from the live text, so a later edit leaves the page's lines alone (v0.1.76).

## Extensions and foreign nodes

- Nodes that browser extensions add are left out of the HTML tab, the CSS tab and the picker: the page's own HTML source is fetched once; a top-level node absent from it that has an id, a hyphenated name or a shadow root counts as foreign (`<style>`, `<link>`, `<script>` never do); a few extensions are known by name for when the source cannot be read (v0.1.28, v0.1.37). Ad-blocker cosmetic sheets (≥10 hide-only rules with filter-list selectors, not in the source) are dropped (v0.1.27, v0.1.37). `data-fm-inspector-ignore` marks a page's own helper node (v0.1.71); set or removed while the panel is open, it is a page change: the pick, the resize target and the inline group go with the mark, the rows return when it goes (v0.1.76).
- ACCEPTED trade-off: an id'd modal or custom element the page's own script adds at runtime is hidden too. REFUSED: removing the filter (v0.1.71).

## Lifecycle

- Loading the script twice is a no-op (the custom element guard). Removing the host unbinds every window listener and observer and closes the ruler; reinserting binds them again (v0.1.17, v0.1.71). The dismiss x resets the page's CSS first.
- The overlay draws at most once per frame (v0.1.17).

## Browsers

- Chromium and Firefox 155 checked headless (v0.1.72). Safari, physical touch and big-page performance (the poll) are untested.
