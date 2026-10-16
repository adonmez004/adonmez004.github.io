# Codex review of v0.1.70 (2026-10-14), rewritten file "v0.1.71" (pasted by Alper, not saved whole)

Taken into our v0.1.71 by cherry-pick: 1 (scoped size restores), 2 (priority-aware undo guards, !important kept), 3 (drag cancel on tool change/removal, dispose closes the ruler), 4 (modelAvailable in undo/reset), 7 (block-size in vertical writing modes), 8 (transform/zoom gate), 9 (trackTokens), 10 partly (button handle + arrows, touch box, bar width/ellipsis, double-tap fix; NO fold button), 11 (viewport-only ruler, cap, chip collision after clamp), 12 (poll while sizing/measuring), link() index, data-fm-inspector-ignore opt-out.
Not taken: 5 (extension filter removal), 6 (reconcileModel rewrite), the two-row head / fold button, the phone bar's full-width wrap, 44px hreset.
Our suites: everything passing; blocker/v0139 old lines read the same on v0.1.70 (stale expectations), test-measure stale.
