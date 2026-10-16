const STROKE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICON_PICK = `<svg ${STROKE}><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4.5 10 1.8-4.2L22.5 16Z"/></svg>`;
const ICON_CODE = `<svg ${STROKE}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
const ICON_BRUSH = `<svg ${STROKE}><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>`;
const ICON_SIZE = `<svg ${STROKE}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
const ICON_RULER = `<svg ${STROKE}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`;
const ICON_CLEAR = `<svg ${STROKE}><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`;
const ICON_X = `<svg ${STROKE}><path d="M18 6 6 18M6 6l12 12"/></svg>`;

// The rail: one icon per tool on the screen's end edge (a strip along the foot on phones); a tool's own things live in its box or on the page
export const MARKUP = `
  <div class="ov" aria-hidden="true"></div>
  <div class="pick-surface" aria-hidden="true"></div>
  <div class="state" aria-hidden="true">Select an element · Esc to cancel</div>
  <button type="button" class="hd" aria-label="Adjust the element's width" title="Drag sideways, or Left/Right arrows (Shift: 10px)"></button>
  <button type="button" class="hreset" title="This element back to its own size, every CSS edit back">Reset</button>
  <nav class="rail" aria-label="Code inspector">
    <button class="pickbtn" type="button" aria-pressed="false" aria-label="Quick view" data-tip="Quick view">${ICON_PICK}</button>
    <button class="htmlbtn" type="button" aria-expanded="false" aria-controls="panel" aria-label="HTML" data-tip="HTML">${ICON_CODE}</button>
    <button class="cssbtn" type="button" aria-expanded="false" aria-controls="panel" aria-label="CSS" data-tip="CSS">${ICON_BRUSH}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="sizebtn" type="button" aria-pressed="false" aria-label="Resize" data-tip="Resize">${ICON_SIZE}</button>
    <button class="measure" type="button" aria-pressed="false" aria-label="Show all sizes" data-tip="Show all sizes">${ICON_RULER}</button>
    <button class="reset" type="button" aria-label="Clear all" data-tip="Clear all">${ICON_CLEAR}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="bye" type="button" aria-label="Remove" data-tip="Remove">${ICON_X}</button>
  </nav>
  <section class="panel" id="panel" aria-label="Code" tabindex="-1">
    <div class="head">
      <button class="vscope tbtn" type="button" aria-pressed="true">Selected Element</button>
      <button class="vall tbtn" type="button" aria-pressed="false">Show All</button>
      <span class="spacer"></span>
      <div class="blocks">
        <button class="vlimits tbtn" type="button" aria-pressed="false" hidden>Show Size</button>
        <button class="vcascade tbtn" type="button" aria-pressed="false" hidden>Show Inherited</button>
        <button class="vdefaults tbtn" type="button" aria-pressed="false" hidden>Show Defaults</button>
        <button class="vrender tbtn" type="button" aria-pressed="false" hidden>Show Computed</button>
        <button class="vinitials tbtn" type="button" aria-pressed="false" hidden>Show Initials</button>
        <button class="vparent tbtn" type="button" aria-pressed="false" hidden>Show Parent</button>
        <button class="vchildren tbtn" type="button" aria-pressed="false" hidden>Show Children</button>
        <button class="vsiblings tbtn" type="button" aria-pressed="false" hidden>Show Siblings</button>
        <button class="vcontent tbtn" type="button" aria-pressed="false" hidden>Show Content</button>
      </div>
      <button class="close" type="button" aria-label="Close">${ICON_X}</button>
    </div>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="body">
      <div class="view" id="view-html" role="region" aria-label="HTML"></div>
      <div class="view" id="view-css" role="region" aria-label="CSS" hidden></div>
      <div class="view quick" id="view-quick" role="region" aria-label="Quick view" hidden></div>
      <div class="view size" id="view-size" role="region" aria-label="Resize" hidden>
        <div class="qname"><span class="wval"></span></div>
        <div class="wnow"></div>
        <div class="wblock" role="status"></div>
        <div class="empty shint">Click an element on the page. Drag its corner handle sideways, or press Left / Right (Shift: 10px). The rule that holds a drag lights red in the CSS view and reads here.</div>
      </div>
    </div>
  </section>
  ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}
  <section class="panel second" id="panel2" aria-label="CSS" tabindex="-1" hidden>
    <div class="head"><span class="p2title"></span><button class="close p2close" type="button" aria-label="Close">${ICON_X}</button></div>
    <div class="body"></div>
  </section>`;
