// Compare every background longhand: shorthand text can change after a CSSOM round trip.
function backgroundSignature(value) {
  const style = document.createElement('span').style;
  style.background = value;
  return JSON.stringify(['attachment','clip','color','image','origin','position','repeat','size']
    .map(part => style.getPropertyValue('background-' + part)));
}
const yellowBackground = backgroundSignature('yellow');
let reviewTrackTokens;
const output = document.querySelector("#results");
const assertions = [];
const reviewOptions = new URLSearchParams(location.search);
const inspectorSource = reviewOptions.get("build") === "baseline" ? "/baseline-inspector.js" :
  reviewOptions.get("source") === "v21"
    ? "/inspector-ref21.js"
    : reviewOptions.get("source") === "v20"
      ? "/inspector-ref20.js"
      : "/inspector.js";
const targetedNames = new Set([
  "Adopted source reordering follows the cascade",
  "Upward mobile drag does not close a short viewport",
]);
const regressionNames = new Set([
  "External CSSOM edits in another rule survive own-write acknowledgment",
  "External added declaration stays visible after editing its rule",
  "New adopted source is not swallowed by an unrelated edit",
  "Picker Escape cancels a valid active editor",
  "Picker Escape cancels an invalid active editor",
]);
const tick = (w) =>
  new Promise((resolve) =>
    w.requestAnimationFrame(() => w.requestAnimationFrame(resolve)),
  );
async function eventually(w, predicate, message) {
  const deadline = Date.now() + 1500;
  while (!predicate() && Date.now() < deadline) await tick(w);
  ok(predicate(), message);
}
function ok(value, message) {
  if (!value) throw new Error(message);
}
async function fixture(
  css,
  body = '<div id="target">Target</div>',
  width = 900,
  height = 700,
  beforeOpen,
) {
  const frame = document.createElement("iframe");
  frame.style.cssText = `width:${width}px;height:${height}px`;
  document.body.append(frame);
  const loaded = new Promise((resolve) =>
    frame.addEventListener("load", resolve, { once: true }),
  );
  const baseline = JSON.stringify(
    `<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`,
  ).replace(/</g, "\\u003c");
  const sourceStub = `<script>{const originalFetch=window.fetch.bind(window);const source=${baseline};window.fetch=(input,...args)=>String(input)==='about:srcdoc'?Promise.resolve(new Response(source,{headers:{'Content-Type':'text/html'}})):originalFetch(input,...args)}<\/script>`;
  frame.srcdoc = `<!doctype html><html><head><style>${css}</style></head><body>${body}${sourceStub}<script src="${inspectorSource}?build=${Date.now()}"><\/script></body></html>`;
  await loaded;
  const w = frame.contentWindow,
    doc = frame.contentDocument,
    i = doc.querySelector("fm-inspector");
  ok(i?.shadowRoot, "inspector mounted");
  const noMotion = doc.createElement("style");
  noMotion.textContent =
    "* { animation: none !important; transition: none !important; }";
  i.shadowRoot.append(noMotion);
  if (beforeOpen) beforeOpen({ w, doc, i });
  i.toggle(true);
  await i.load();
  await tick(w);
  return {
    frame,
    w,
    doc,
    i,
    t: doc.querySelector("#target"),
    d: (prop, head) =>
      i.store.allDecls.find(
        (d) => d.prop === prop && (!head || d.model.head === head),
      ),
  };
}
const finalExtraNames = new Set([
  "Explicit stylesheet marker updates source listing",
  "Undo skips a detached inline owner",
  "Reset retains duplicate fallback after an unrelated outside addition",
  "Undo retains edited duplicate identity after outside reconciliation",
]);
const engineCases=new Set(["Resize Undo preserves an unrelated outside color", "Resize Reset preserves an unrelated outside declaration", "Reset sizes preserves an unrelated CSS editor change", "Resize cancel preserves an unrelated outside color", "Resize Undo preserves a later outside size value", "Resize Undo preserves a later outside size priority", "Resize Reset preserves a later outside size value", "Cancel preserves an outside size followed by another own move", "Late outside size write is not recorded as own resize", "Removed resized node is not mutated by Reset all", "Resize preserves original inline important priority", "Vertical writing mode changes physical width", "Content-box resizing includes padding and borders", "Resize snaps at the parent content width", "Parent resize batch restores previously resized child", "Undo a per-element Reset retains original sizing baseline", "Resize Undo restores absence of style attribute", "Resize Reset restores exact original attribute when no outside change", "Keyboard width handle supports arrows and Undo", "Transformed target is not given a misleading pixel resize", "CSS Reset preserves a later resize on the same element", "CSS Undo preserves a later resize on the same element", "Parent resize cancel preserves a child outside color", "Resize Undo uses the latest outside value as its baseline", "Transform introduced during drag cancels sizing safely", "Removing target during drag prevents additional writes", "Sizing history is capped at 200 steps", "CSS Reset skips a detached inline owner", "CSS Reset skips a removed rule before polling", "Repeated script preserves the host class state and one input shield", "Repeated script after Bye keeps the inspector dismissed", "Resize Undo restores its written property after writing mode changes", "Reset followed by editing a pinned rule preserves outside background", "Extracted CSS preserves the HTML tree caret glyph"]);
async function test(name, css, fn, body, width, height, beforeOpen) {
 if(!engineCases.has(name))return;
 if (["Dynamic page modal with ID stays inspectable", "Dynamic page custom element stays inspectable", "Dynamic own hiding rules remain visible", "Adopted own hiding rules remain visible"].includes(name)) return;

 if (["Fold button exposes expanded state", "Folding an editor preserves keyboard focus", "Mobile sizing handle has a reachable touch area", "Mobile size toolbar warning and hint do not overlap"].includes(name)) return;

  let f;
  try {
    f = await fixture(css, body, width, height, beforeOpen);
    await fn(f);
    assertions.push({ name, status: "PASS" });
  } catch (e) {
    assertions.push({
      name,
      status: "FAIL",
      error: e.message,
      stack: e.stack,
      diagnostics: f
        ? {
            rules: [...f.doc.styleSheets[0].cssRules].map((r) => ({
              text: r.cssText,
              type: r.constructor.name,
              children: r.cssRules
                ? [...r.cssRules].map((c) => ({
                    text: c.cssText,
                    style: !!c.style,
                  }))
                : null,
            })),
            declarations: f.i.store.allDecls.map((d) => ({
              prop: d.prop,
              head: d.model.head,
            })),
          }
        : null,
    });
  } finally {
    f?.frame.remove();
  }
  output.textContent = JSON.stringify(assertions, null, 2);
}

const startDrag = (f, el = f.t) => {
  f.i.setSizing(true);
  f.i.chooseSize(el);
  const r = el.getBoundingClientRect();
  f.i.handle.dispatchEvent(
    new f.w.PointerEvent("pointerdown", {
      pointerId: 77,
      button: 0,
      buttons: 1,
      clientX: r.right,
      clientY: r.bottom,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  return { x: r.right, y: r.bottom };
};
const moveDrag = (f, from, dx) =>
  f.i.handle.dispatchEvent(
    new f.w.PointerEvent("pointermove", {
      pointerId: 77,
      button: 0,
      buttons: 1,
      clientX: from.x + dx,
      clientY: from.y,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
const endDrag = (f, from, cancel = false) =>
  f.i.handle.dispatchEvent(
    new f.w.PointerEvent(cancel ? "pointercancel" : "pointerup", {
      pointerId: 77,
      button: 0,
      clientX: from.x,
      clientY: from.y,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
const resize = (f, dx, el = f.t) => {
  const from = startDrag(f, el);
  moveDrag(f, from, dx);
  endDrag(f, from);
  return from;
};
const simple = "#target{width:100px;height:40px;box-sizing:border-box}";
const inline = '<div id="target" style="color:red">Target</div>';
document.querySelector("#run").addEventListener("click", async () => {
 reviewTrackTokens = (await import("/src/tools/size-explain.js")).trackTokens;

  assertions.length = 0;
  output.textContent = "Running";

  await test(
    "Resize Undo preserves an unrelated outside color",
    simple,
    (f) => {
      resize(f, 40);
      f.t.style.color = "blue";
      f.i.sizeUndo();
      ok(
        f.t.style.color === "blue" &&
          Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
        "outside color survives resize Undo",
      );
    },
    inline,
  );
  await test(
    "Resize Reset preserves an unrelated outside declaration",
    simple,
    (f) => {
      resize(f, 40);
      f.t.style.background = "yellow";
      f.i.sizeReset(f.t);
      ok(
        f.t.style.background === "yellow" &&
          Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
        "outside background survives Reset",
      );
    },
    inline,
  );
  await test(
    "Reset sizes preserves an unrelated CSS editor change",
    simple,
    async (f) => {
      resize(f, 40);
      await f.i.load();
      const color = f.i.store.allDecls.find(
        (d) => d.model.inlineEl === f.t && d.prop === "color",
      );
      f.i.cssView.change(color, "blue");
      f.i.sizeResetAll();
      ok(
        f.t.style.color === "blue",
        "CSS panel color stays when resetting sizes",
      );
    },
    inline,
  );
  await test(
    "Resize cancel preserves an unrelated outside color",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.style.color = "blue";
      endDrag(f, from, true);
      ok(
        f.t.style.color === "blue" &&
          Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
        "cancel only reverses resize",
      );
    },
    inline,
  );
  await test(
    "Resize Undo preserves a later outside size value",
    simple,
    (f) => {
      resize(f, 40);
      f.t.style.inlineSize = "175px";
      f.i.sizeUndo();
      ok(f.t.style.inlineSize === "175px", "outside size wins");
    },
  );
  await test(
    "Resize Undo preserves a later outside size priority",
    simple,
    (f) => {
      resize(f, 40);
      const value = f.t.style.inlineSize;
      f.t.style.setProperty("inline-size", value, "important");
      f.i.sizeUndo();
      ok(
        f.t.style.inlineSize === value &&
          f.t.style.getPropertyPriority("inline-size") === "important",
        "outside priority wins",
      );
    },
  );
  await test(
    "Resize Reset preserves a later outside size value",
    simple,
    (f) => {
      resize(f, 40);
      f.t.style.inlineSize = "175px";
      f.i.sizeReset(f.t);
      ok(f.t.style.inlineSize === "175px", "Reset keeps page-owned size");
    },
  );
  await test(
    "Cancel preserves an outside size followed by another own move",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.style.setProperty("inline-size", "175px", "important");
      moveDrag(f, from, 60);
      endDrag(f, from, true);
      ok(
        f.t.style.inlineSize === "175px" &&
          f.t.style.getPropertyPriority("inline-size") === "important",
        "cancel returns to latest outside value and priority",
      );
    },
  );
  await test(
    "Late outside size write is not recorded as own resize",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.style.inlineSize = "175px";
      endDrag(f, from);
      f.i.sizeUndo();
      ok(
        f.t.style.inlineSize === "175px",
        "late outside write not overwritten",
      );
    },
  );
  await test("Ending sizing cancels an active gesture", simple, (f) => {
    const from = startDrag(f);
    moveDrag(f, from, 40);
    f.i.setSizing(false);
    moveDrag(f, from, 80);
    ok(
      !f.i.sizeDrag &&
        !f.i.cancelGesture &&
        Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
      "ended tool cannot keep resizing",
    );
  });
  await test("Escape cancels an active resize gesture", simple, (f) => {
    const from = startDrag(f);
    moveDrag(f, from, 40);
    f.i.handle.dispatchEvent(
      new f.w.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    moveDrag(f, from, 80);
    ok(
      !f.i.sizing &&
        !f.i.sizeDrag &&
        Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
      "Escape restores and releases gesture",
    );
  });
  await test("Switching active tool cancels a resize gesture", simple, (f) => {
    const from = startDrag(f);
    moveDrag(f, from, 40);
    f.i.setPicking(true);
    moveDrag(f, from, 80);
    ok(
      f.i.picking &&
        f.i.sizing &&
        f.i.tools.active === "picking" &&
        !f.i.sizeDrag &&
        Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
      "picker takes clicks and cancels drag; sizing stays armed",
    );
  });
  await test(
    "Removed resized node is not mutated by Reset all",
    simple,
    (f) => {
      resize(f, 40);
      const written = f.t.getAttribute("style");
      f.t.remove();
      f.i.sizeResetAll();
      ok(f.t.getAttribute("style") === written, "detached node untouched");
    },
  );
  await test(
    "Resize preserves original inline important priority",
    simple,
    (f) => {
      resize(f, 40);
      ok(
        f.t.style.getPropertyPriority("inline-size") === "important",
        "own important retained",
      );
      f.i.sizeUndo();
      ok(
        f.t.style.inlineSize === "100px" &&
          f.t.style.getPropertyPriority("inline-size") === "important",
        "value and priority restored",
      );
    },
    '<div id="target" style="inline-size:100px!important;color:red">Target</div>',
  );
  await test(
    "Vertical writing mode changes physical width",
    simple + "#target{writing-mode:vertical-rl}",
    (f) => {
      const h = f.t.getBoundingClientRect().height;
      resize(f, 40);
      ok(
        Math.abs(f.t.getBoundingClientRect().width - 140) < 1 &&
          Math.abs(f.t.getBoundingClientRect().height - h) < 1,
        "horizontal handle changes physical width",
      );
    },
  );
  await test(
    "Content-box resizing includes padding and borders",
    "#target{width:100px;height:40px;padding:10px;border:2px solid;box-sizing:content-box}",
    (f) => {
      resize(f, 40);
      ok(
        Math.abs(f.t.getBoundingClientRect().width - 164) < 1,
        "outer width grows by exactly 40px",
      );
      f.i.sizeUndo();
      ok(
        Math.abs(f.t.getBoundingClientRect().width - 124) < 1,
        "original outer width restored",
      );
    },
  );
  await test(
    "Resize snaps at the parent content width",
    "#wrap{width:200px}#target{width:100px;height:40px;box-sizing:border-box}",
    (f) => {
      resize(f, 100);
      ok(
        f.t.style.inlineSize === "100%" &&
          Math.abs(f.t.getBoundingClientRect().width - 200) < 1,
        "100 percent parent width",
      );
    },
    '<section id="wrap"><div id="target">Target</div></section>',
  );
  await test(
    "Parent resize batch restores previously resized child",
    "#wrap{width:400px}#target{width:300px;height:100px}#kid{width:100px;height:40px}",
    (f) => {
      const kid = f.doc.querySelector("#kid");
      resize(f, 150, kid);
      const childBefore = kid.style.inlineSize;
      resize(f, -150);
      ok(
        kid.getBoundingClientRect().width <=
          f.t.getBoundingClientRect().width + 1,
        "child stays inside",
      );
      kid.style.color = "blue";
      f.i.sizeUndo();
      ok(
        kid.style.inlineSize === childBefore &&
          kid.style.color === "blue" &&
          Math.abs(f.t.getBoundingClientRect().width - 300) < 1,
        "one batch restores sizes only",
      );
    },
    '<section id="wrap"><div id="target"><div id="kid">Kid</div></div></section>',
  );
  await test(
    "Undo a per-element Reset retains original sizing baseline",
    simple,
    (f) => {
      resize(f, 40);
      f.i.sizeReset(f.t);
      f.i.sizeUndo();
      ok(
        Math.abs(f.t.getBoundingClientRect().width - 140) < 1,
        "Reset reversed",
      );
      f.t.style.color = "blue";
      f.i.sizeReset(f.t);
      ok(
        f.t.style.color === "blue" &&
          Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
        "subsequent Reset returns original size only",
      );
    },
  );
  await test("Resize Undo restores absence of style attribute", simple, (f) => {
    resize(f, 40);
    f.i.sizeUndo();
    ok(
      f.t.getAttribute("style") === null,
      "no empty style attribute left behind",
    );
  });
  await test(
    "Resize Reset restores exact original attribute when no outside change",
    simple,
    (f) => {
      const original = f.t.getAttribute("style");
      resize(f, 40);
      f.i.sizeReset(f.t);
      ok(
        f.t.getAttribute("style") === original,
        "original attribute formatting restored",
      );
    },
    '<div id="target" style=" color: red ; padding: 2px; ">Target</div>',
  );
  await test("Keyboard width handle supports arrows and Undo", simple, (f) => {
    f.i.setSizing(true);
    f.i.chooseSize(f.t);
    f.i.handle.dispatchEvent(
      new f.w.KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    ok(
      Math.abs(f.t.getBoundingClientRect().width - 110) < 1,
      "keyboard width +10",
    );
    f.i.sizeUndo();
    ok(
      Math.abs(f.t.getBoundingClientRect().width - 100) < 1,
      "keyboard action can Undo",
    );
  });
  await test(
    "Transformed target is not given a misleading pixel resize",
    simple + "#target{transform:scale(2);transform-origin:top left}",
    (f) => {
      const before = f.t.getAttribute("style");
      resize(f, 40);
      f.i.draw();
      ok(
        f.t.getAttribute("style") === before &&
          f.i.wblock.textContent.includes("transformed"),
        "unsupported resize explained without changing styles",
      );
    },
  );
  await test(
    "CSS Reset clears its history as specified",
    simple + "#target{color:red}",
    (f) => {
      const d = f.d("color");
      f.i.show("css");
      f.i.cssView.edit(d);
      f.i.editor.field.value = "blue";
      f.i.editor.field.dispatchEvent(new f.w.Event("input", { bubbles: true }));
      f.i.editor.finish(false);
      f.i.reset();
      f.i.undo();
      ok(
        !f.i.history.length &&
          f.i.undoBtn.disabled &&
          d.rule.style.color === "red",
        "Reset starts clean",
      );
    },
  );
  await test("Closing panel preserves armed tools", simple, (f) => {
    f.i.setPicking(true);
    f.i.setSizing(true);
    f.i.setMeasuring(true);
    f.i.toggle(false);
    ok(
      f.i.picking && f.i.sizing && f.i.measuring && f.i.tools.active === "sizing",
      "tools remain usable with panel hidden",
    );
  });
  await test("Ruler coexists with picker and sizing", simple, (f) => {
    f.i.setPicking(true);
    f.i.setSizing(true);
    f.i.setMeasuring(true);
    ok(
      f.i.picking && f.i.sizing && f.i.measuring,
      "all three states stay armed",
    );
    f.i.setSizing(false);
    ok(
      f.i.picking && f.i.tools.active === "picking" && f.i.measuring,
      "picker resumes when sizing ends",
    );
  });
  await test(
    "Mobile downward drag collapses without closing",
    simple,
    (f) => {
      f.i.head.dispatchEvent(
        new f.w.PointerEvent("pointerdown", {
          pointerId: 81,
          button: 0,
          clientX: 80,
          clientY: 300,
          bubbles: true,
        }),
      );
      f.w.dispatchEvent(
        new f.w.PointerEvent("pointermove", {
          pointerId: 81,
          buttons: 1,
          clientX: 80,
          clientY: 800,
        }),
      );
      f.w.dispatchEvent(
        new f.w.PointerEvent("pointerup", {
          pointerId: 81,
          clientX: 80,
          clientY: 800,
        }),
      );
      ok(
        f.i.hasAttribute("open") && f.i.sheetCollapsed(),
        "panel stays open at its head",
      );
    },
    undefined,
    390,
    844,
  );
  await test(
    "Two quick theme clicks do not collapse the phone sheet",
    simple,
    (f) => {
      f.i.themeBtn.click();
      f.i.themeBtn.click();
      ok(
        !f.i.sheetCollapsed(),
        "toolbar action does not count as double-tap on bare head",
      );
    },
    undefined,
    390,
    844,
  );
  await test(
    "Mobile controls stay inside header above the content",
    simple,
    (f) => {
      const h = f.i.head.getBoundingClientRect(),
        body = f.i.body.getBoundingClientRect();
      ok(body.top >= h.bottom - 1, "content begins below toolbar");
      for (const b of f.i.head.querySelectorAll("button")) {
        const r = b.getBoundingClientRect();
        ok(
          r.left >= 0 &&
            r.right <= f.w.innerWidth &&
            r.top >= h.top &&
            r.bottom <= h.bottom + 1,
          "toolbar button bounds",
        );
      }
    },
    undefined,
    320,
    568,
  );
  await test(
    "Mobile resize bar stays within viewport with a long identifier",
    simple,
    (f) => {
      f.t.id = "target-with-a-very-long-component-name-and-many-classes";
      f.i.setSizing(true);
      f.i.chooseSize(f.t);
      f.i.draw();
      const r = f.i.sizetools.getBoundingClientRect();
      ok(r.left >= 0 && r.right <= f.w.innerWidth, "resize bar contained");
    },
    undefined,
    320,
    568,
  );
  await test(
    "Grid token reader handles line names and comments",
    simple,
    (f) => {
      const tokens = reviewTrackTokens(
        "[start line] 100px /* gap */ repeat(2, [inner name] 1fr) [end]",
      );
      ok(
        JSON.stringify(tokens) === JSON.stringify(["100px", "1fr", "1fr"]),
        "line names and comments omitted safely",
      );
    },
  );
  await test("Grid token expansion is bounded", simple, (f) => {
    ok(
      reviewTrackTokens("repeat(100000, 1fr)").length <= 2048,
      "unbounded repeat cannot allocate huge token list",
    );
  });

  await test(
    "CSS Reset preserves a later resize on the same element",
    simple,
    async (f) => {
      const d = f.i.store.allDecls.find(
        (d) => d.model.inlineEl === f.t && d.prop === "color",
      );
      f.i.cssView.change(d, "blue");
      resize(f, 40);
      f.i.reset();
      ok(
        f.t.style.color === "red" &&
          Math.abs(f.t.getBoundingClientRect().width - 140) < 1,
        "Reset rules preserves sizing tool width",
      );
    },
    inline,
  );
  await test(
    "CSS Undo preserves a later resize on the same element",
    simple,
    (f) => {
      const d = f.i.store.allDecls.find(
        (d) => d.model.inlineEl === f.t && d.prop === "color",
      );
      const before = f.i.state(d);
      f.i.cssView.change(d, "blue");
      f.i.record([{ d, before, after: f.i.state(d) }]);
      resize(f, 40);
      f.i.undo();
      ok(
        f.t.style.color === "red" &&
          Math.abs(f.t.getBoundingClientRect().width - 140) < 1,
        "Undo rules only changes color",
      );
    },
    inline,
  );
  await test(
    "Parent resize cancel preserves a child outside color",
    "#wrap{width:400px}#target{width:300px;height:100px}#kid{width:100px;height:40px}",
    (f) => {
      const kid = f.doc.querySelector("#kid");
      resize(f, 150, kid);
      const before = kid.style.inlineSize,
        from = startDrag(f);
      moveDrag(f, from, -150);
      kid.style.color = "blue";
      endDrag(f, from, true);
      ok(
        kid.style.inlineSize === before &&
          kid.style.color === "blue" &&
          Math.abs(f.t.getBoundingClientRect().width - 300) < 1,
        "parent cancellation restores scoped child size",
      );
    },
    '<section id="wrap"><div id="target"><div id="kid">Kid</div></div></section>',
  );
  await test(
    "Resize Undo uses the latest outside value as its baseline",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.style.setProperty("inline-size", "175px", "important");
      moveDrag(f, from, 60);
      endDrag(f, from);
      f.i.sizeUndo();
      ok(
        f.t.style.inlineSize === "175px" &&
          f.t.style.getPropertyPriority("inline-size") === "important",
        "Undo returns to latest outside size and priority",
      );
    },
  );
  await test(
    "Transform introduced during drag cancels sizing safely",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.style.transform = "scale(2)";
      moveDrag(f, from, 80);
      ok(
        !f.i.sizeDrag &&
          f.t.style.transform === "scale(2)" &&
          !f.t.style.inlineSize &&
          f.i.wblock.textContent.includes("transformed"),
        "active drag released and only own size reverted",
      );
    },
  );
  await test(
    "Removing target during drag prevents additional writes",
    simple,
    (f) => {
      const from = startDrag(f);
      moveDrag(f, from, 40);
      f.t.remove();
      const written = f.t.getAttribute("style");
      moveDrag(f, from, 80);
      endDrag(f, from);
      ok(
        f.t.getAttribute("style") === written && !f.i.sizeDrag,
        "removed node never receives later writes",
      );
    },
  );
  await test("Sizing history is capped at 200 steps", simple, (f) => {
    f.i.setSizing(true);
    f.i.chooseSize(f.t);
    for (let k = 0; k < 205; k++)
      f.i.handle.dispatchEvent(
        new f.w.KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    ok(f.i.resize.history.length === 200, "bounded undo retention");
  });
  await test(
    "CSS Reset skips a detached inline owner",
    simple,
    (f) => {
      const d = f.i.store.allDecls.find(
        (d) => d.model.inlineEl === f.t && d.prop === "color",
      );
      f.i.cssView.change(d, "blue");
      f.t.remove();
      const written = f.t.getAttribute("style");
      f.i.reset();
      ok(
        f.t.getAttribute("style") === written,
        "Reset cannot mutate detached inline content",
      );
    },
    inline,
  );
  await test(
    "CSS Reset skips a removed rule before polling",
    simple + "#target{color:red}",
    (f) => {
      const d = f.d("color"),
        sheet = f.doc.styleSheets[0];
      f.i.cssView.change(d, "blue");
      const rule = d.rule;
      sheet.deleteRule(1);
      f.i.reset();
      ok(rule.style.color === "blue", "removed rule is untouched");
    },
  );

  await test(
    "Mobile sizing handle has a reachable touch area",
    simple,
    (f) => {
      resize(f, 40);
      f.i.draw();
      const h = f.i.handle.getBoundingClientRect(),
        r = f.i.hresetBtn.getBoundingClientRect();
      ok(
        h.width >= 44 &&
          h.height >= 44 &&
          h.left >= 0 &&
          h.right <= f.w.innerWidth &&
          h.top >= 0 &&
          h.bottom <= f.w.innerHeight,
        "44px handle stays reachable",
      );
      ok(
        r.height >= 44 &&
          r.left >= 0 &&
          r.right <= f.w.innerWidth &&
          r.top >= 0 &&
          r.bottom <= f.w.innerHeight,
        "Reset size touch target stays reachable",
      );
    },
    undefined,
    320,
    568,
  );
  await test(
    "Mobile size toolbar warning and hint do not overlap",
    simple,
    (f) => {
      f.i.setSizing(true);
      f.i.chooseSize(f.t);
      f.i.draw();
      const bar = f.i.sizetools.getBoundingClientRect();
      ok(
        f.i.stateText.getBoundingClientRect().top >= bar.bottom + 4,
        "hint follows toolbar",
      );
      f.i.setBlocked(
        null,
        "A very long example constraint from the page that wraps onto multiple lines on a phone",
      );
      f.i.draw();
      const warning = f.i.wblock.getBoundingClientRect();
      ok(
        warning.top >= bar.bottom + 4 &&
          f.i.stateText.getBoundingClientRect().top >= warning.bottom + 4,
        "warning and hint follow measured bar height",
      );
    },
    undefined,
    390,
    844,
  );
  await test(
    "Hidden panel still refreshes CSS while sizing is armed",
    simple,
    async (f) => {
      f.i.setSizing(true);
      f.i.toggle(false);
      f.doc.styleSheets[0].insertRule("#target{background:yellow}", 1);
      await eventually(
        f.w,
        () => !!f.d("background"),
        "active sizing observes CSSOM changes with the panel hidden",
      );
    },
  );
  await test(
    "Hidden panel still refreshes CSS while ruler is armed",
    simple,
    async (f) => {
      f.i.setMeasuring(true);
      f.i.toggle(false);
      f.doc.styleSheets[0].insertRule("#target{border:1px solid red}", 1);
      await eventually(
        f.w,
        () => !!f.d("border"),
        "active ruler observes CSSOM changes with the panel hidden",
      );
    },
  );

  const loadAgain = async f => {const script=f.doc.createElement('script');script.src='/inspector.js?duplicate='+Date.now();const ready=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject});f.doc.head.append(script);await ready;await tick(f.w);};
  await test('Repeated script preserves the host class state and one input shield',simple,async f=>{f.i.setSizing(true);const host=f.i,type=f.w.customElements.get('fm-inspector'),runtime=f.i.tools.runtime,style=f.t.getAttribute('style');await loadAgain(f);ok(f.doc.querySelectorAll('fm-inspector').length===1&&f.doc.querySelector('fm-inspector')===host&&f.w.customElements.get('fm-inspector')===type&&f.i.tools.runtime===runtime&&f.i.sizing&&f.t.getAttribute('style')===style,'second load keeps existing runtime and page state');});
  await test('Repeated script after Bye keeps the inspector dismissed',simple,async f=>{const type=f.w.customElements.get('fm-inspector');f.i.dismiss();await loadAgain(f);ok(!f.doc.querySelector('fm-inspector')&&f.w.customElements.get('fm-inspector')===type,'Bye stays in effect until a new page load');});
  await test('CSS and sizing histories remain independent',simple,f=>{const d=f.i.store.allDecls.find(d=>d.model.inlineEl===f.t&&d.prop==='color'),before=f.i.state(d);f.i.cssView.change(d,'blue');f.i.record([{d,before,after:f.i.state(d)}]);resize(f,40);ok(f.i.history!==f.i.resize.history&&f.i.history.length===1&&f.i.resize.history.length===1,'two independent histories');f.i.sizeUndo();ok(f.i.history.length===1&&f.t.style.color==='blue'&&Math.abs(f.t.getBoundingClientRect().width-100)<1,'size Undo preserves CSS history');f.i.undo();ok(f.t.style.color==='red','CSS Undo still available');},inline);
  await test('Resize Undo restores its written property after writing mode changes',simple,f=>{resize(f,40);f.t.style.writingMode='vertical-rl';f.i.sizeUndo();ok(f.t.style.inlineSize===''&&f.t.style.writingMode==='vertical-rl','history remembers the actual written property rather than current axis');});
  await test('Reset followed by editing a pinned rule preserves outside background',simple+'#target{color:red}',async f=>{let d=f.d('color');f.i.pins.add(d);f.i.cssView.change(d,'blue');d.rule.style.background='yellow';f.i.reset();await f.i.load();d=f.d('color');ok(backgroundSignature(d.rule.style.background)===yellowBackground,'Reset initially retains outside background');f.i.cssView.change(d,'green');ok(backgroundSignature(d.rule.style.background)===yellowBackground,'editing the pinned model after Reset must preserve outside background');});
  await test('Extracted CSS preserves the HTML tree caret glyph',simple,f=>{const caret=f.i.rows.get(f.doc.body).caret;ok(f.w.getComputedStyle(caret,'::before').content===JSON.stringify('\u25be'),'expanded caret should be the triangle glyph, not a literal CSS escape');});
  output.textContent = JSON.stringify(
    {
      passed: assertions.filter((x) => x.status === "PASS").length,
      failed: assertions.filter((x) => x.status === "FAIL").length,
      tests: assertions,
    },
    null,
    2,
  );
});
