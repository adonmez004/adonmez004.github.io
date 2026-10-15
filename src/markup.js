const ICON_PICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4 10 1.7-4.3L22 16Z"/></svg>';
const ICON_RULER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.42 12.713c-.136-.215-.204-.323-.242-.49a1.173 1.173 0 0 1 0-.446c.038-.167.106-.274.242-.49C3.546 9.505 6.895 5 12 5s8.455 4.505 9.58 6.287c.137.215.205.323.243.49.029.125.029.322 0 .446-.038.167-.106.274-.242.49C20.455 14.495 17.105 19 12 19c-5.106 0-8.455-4.505-9.58-6.287Z"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>';
const ICON_SIZE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
const ICON_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10a6 6 0 0 1 0 12H4M4 7l4-4M4 7l4 4"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

export const MARKUP = `
  <div class="ov" aria-hidden="true"></div>
  <div class="pick-surface" aria-hidden="true"></div>
  <div class="state" aria-hidden="true">Select an element · Esc to cancel</div>
  <button type="button" class="hd" aria-label="Adjust the element's width" title="Drag sideways, or Left/Right arrows (Shift: 10px)"></button>
  <button type="button" class="hreset" title="This element back to its own size, every CSS edit back">Reset</button>
  <div class="wblock" role="status"></div>
  <div class="sizetools" role="group" aria-label="Resize tool"><span class="wval"></span><button type="button" class="sundo" aria-label="Undo the last resize" title="Undo the last resize" disabled>${ICON_UNDO}</button><button type="button" class="sreset" title="Every resized element back to its own size">Reset sizes</button><button type="button" class="rreset" title="Every CSS edit in the panel back">Reset rules</button></div>
  <div class="launcher"><button class="fab" type="button" aria-expanded="false" aria-controls="panel">Show code</button>
  <button class="bye" type="button" aria-label="Remove the code inspector" title="Remove until the next page load">${ICON_X}</button></div>
  <section class="panel" id="panel" aria-label="Code">
    <div class="head">
      <button class="pickbtn" type="button" aria-pressed="false" aria-label="Select an element on the page" title="Select an element on the page">${ICON_PICK}</button>
      <div role="tablist" aria-label="Code views">
        <button class="tab" type="button" role="tab" id="tab-html" tabindex="0" aria-selected="true" aria-controls="view-html">HTML</button>
        <button class="tab" type="button" role="tab" id="tab-css" tabindex="-1" aria-selected="false" aria-controls="view-css">CSS</button>
      </div>
      <button class="sizebtn" type="button" aria-pressed="false" aria-label="Resize an element" title="Resize an element: click one on the page, then drag its handles">${ICON_SIZE}</button>
      <button class="measure" type="button" aria-pressed="false" aria-label="Show all sizes" title="Show all sizes: every element's size, padding, margin and border">${ICON_RULER}</button>
      <span class="spacer"></span>
      <button class="theme" type="button" aria-label="Switch the inspector's theme" title="Light / dark">${ICON_SUN}${ICON_MOON}</button>
      <button class="undo" type="button" aria-label="Undo the last CSS change" title="Undo the last change" disabled>${ICON_UNDO}</button>
      <button class="reset" type="button" title="Page CSS back, picks and pins cleared">Reset</button>
      <button class="close" type="button" aria-label="Hide code">${ICON_X}</button>
    </div>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="body">
      <div class="view" id="view-html" role="tabpanel" aria-labelledby="tab-html"></div>
      <div class="view" id="view-css" role="tabpanel" aria-labelledby="tab-css" hidden></div>
    </div>
  </section>
  ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}`;
