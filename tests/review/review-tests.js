let reviewTrackTokens;
const output = document.querySelector("#results");
const assertions = [];
const reviewOptions = new URLSearchParams(location.search);
const inspectorSource=reviewOptions.get("build")==="baseline"?"/baseline-inspector.js":"/inspector.js";
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
  height = 720,
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
async function test(name, css, fn, body, width, height, beforeOpen) {
 if(reviewOptions.get("case") && reviewOptions.get("case")!==name)return;
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
            actual: {attr:f.t.getAttribute("style"),width:f.t.getBoundingClientRect().width}, rules: [...f.doc.styleSheets[0].cssRules].map((r) => ({
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


const facts=[];
const open=(f,which='css',el=f.t)=>{f.i.lens.arm(which);f.i.lens.choose(which,el);};
const core='body{margin:0;font:16px system-ui}main{width:500px}#target{width:160px;height:60px;background:#eef;color:rgb(10,20,30)}';
const body='<main><section id="target" class="card"><p class="one">First paragraph</p><p class="two">Second paragraph</p></section><button class="btn">Action</button></main>';
const computed=(f,prop)=>f.i.cssView.cascade_(f.t).find(r=>r.prop===prop&&!r.over);
document.querySelector('#run').addEventListener('click',async()=>{
 assertions.length=0;facts.length=0;
 await test('Rail exposes seven labelled tool buttons',core,f=>{const bs=[...f.i.rail.querySelectorAll('button')];ok(bs.length===7&&bs.every(b=>b.getAttribute('aria-label')),'seven accessible rail buttons');},body);
 await test('Arming a lens does not open its box',core,f=>{f.i.toggle(false);f.i.lens.arm('html');ok(!f.i.hasAttribute('open')&&f.i.lens.armed==='html','lens waits for a page choice');},body);
 await test('HTML lens scopes to the chosen subtree',core,f=>{open(f,'html');f.i.loadHtml();ok(f.i.htmlView.scope===f.t&&f.i.rows.has(f.t)&&!f.i.rows.has(f.doc.body),'subtree only');},body);
 await test('Show All widens the HTML context',core,f=>{open(f,'html');f.i.allBtn.click();f.i.loadHtml();ok(f.i.mode.html==='all'&&f.i.rows.has(f.doc.body),'whole tree shown');},body);
 for(const kind of ['parent','children','siblings','content'])await test('HTML context '+kind,core,f=>{open(f,'html');f.i.aroundBtns[kind].click();f.i.loadHtml();ok(f.i.htmlView.around===kind,'context state active');if(kind==='content')ok(f.i.views.html.textContent.includes('First paragraph'),'content visible');if(kind==='parent')ok(f.i.rows.has(f.t.parentElement),'parent present');if(kind==='siblings')ok(!f.i.rows.has(f.t.parentElement)&&f.i.rows.has(f.doc.querySelector('.btn')),'siblings without parent tag');},body);
 await test('Selected Element returns from an HTML context',core,f=>{open(f,'html');f.i.aroundBtns.parent.click();f.i.scopeBtn.click();ok(!f.i.htmlView.around&&f.i.mode.html==='scope','own subtree restored');},body);
 await test('CSS lens includes matching rules and excludes unrelated rules',core+'.other{opacity:.5}',f=>{open(f);const text=f.i.views.css.textContent;ok(text.includes('#target')&&!text.includes('.other'),'only matching rules');},body);
 await test('Only one CSS detail block remains selected',core,f=>{open(f);f.i.initialsBtn.click();f.i.limitsBtn.click();ok(f.i.cssView.limits&&!f.i.cssView.initials&&!f.i.cssView.overrides,'one CSS detail block');},body);
 await test('Show Size has Element and Viewport links',core,f=>{open(f);f.i.limitsBtn.click();const words=[...f.i.views.css.querySelectorAll('.srcb')].map(b=>b.textContent);ok(words.includes('Element')&&words.includes('Viewport'),'size ladder navigation');},body);
 await test('Show Size can narrow to the element then widen',core,f=>{open(f);f.i.limitsBtn.click();const el=[...f.i.views.css.querySelectorAll('.srcb')].find(b=>b.textContent==='Element');el.click();ok(f.i.cssView.sizePick===0&&f.i.views.css.textContent.includes('rendered content'),'element details');[...f.i.views.css.querySelectorAll('.srcb')].find(b=>b.textContent==='All').click();ok(f.i.cssView.sizePick===null,'whole ladder restored');},body);
 await test('Show Initials includes author values and currentcolor',core+'#target{border:2px solid}',f=>{open(f);f.i.initialsBtn.click();ok(f.i.views.css.querySelector('.src-author')&&f.i.views.css.querySelector('.src-currentcolor'),'source classes present');},body);
 await test('Source filter selects Author and toggles back to All',core,f=>{open(f);f.i.initialsBtn.click();let b=[...f.i.views.css.querySelectorAll('.srcb')].find(b=>b.textContent==='Author');b.click();ok(f.i.cssView.source==='author'&&[...f.i.views.css.querySelectorAll('.d')].every(r=>r.classList.contains('src-author')),'author only');b=[...f.i.views.css.querySelectorAll('.srcb')].find(b=>b.textContent==='Author');b.click();ok(f.i.cssView.source===null,'source filter resets');},body);
 await test('Changing element resets source filter',core,f=>{open(f);f.i.initialsBtn.click();[...f.i.views.css.querySelectorAll('.srcb')].find(b=>b.textContent==='Author').click();open(f,'css',f.doc.querySelector('.one'));ok(f.i.cssView.source===null,'new selection widens sources');},body);
 await test('Show Computed presents overridden browser values',core+'#target{display:flex}',f=>{open(f);f.i.renderBtn.click();ok(f.i.views.css.querySelector('.d.src-browser.over')&&f.i.views.css.querySelector('.d.src-author'),'browser and author rows');},body);
 await test('Quick view and resize are exclusive',core,f=>{f.i.setPicking(true);f.i.setSizing(true);ok(!f.i.picking&&f.i.sizing&&f.i.tools.active==='sizing','new tool releases old');},body);
 await test('Resize opens its box after selection',core,f=>{f.i.toggle(false);f.i.setSizing(true);ok(!f.i.hasAttribute('open'),'arming alone opens nothing');f.i.chooseSize(f.t);ok(f.i.hasAttribute('open')&&f.i.view==='size','selection opens resize box');},body);
 await test('Second CSS box closes without ending resize',core,f=>{f.i.setSizing(true);f.i.chooseSize(f.t);f.i.openSecond(f.t);ok(f.i.second,'second open');f.i.closeSecond();ok(!f.i.second&&f.i.sizing&&f.i.view==='size','only second closed');},body);
 await test('Clear all restores rules and closes tool boxes',core,f=>{open(f);f.i.cssView.change(f.d('color'),'blue');f.i.resetAll();ok(f.w.getComputedStyle(f.t).color==='rgb(10, 20, 30)'&&!f.i.hasAttribute('open')&&!f.i.tools.active,'baseline restored and tools closed');},body);
 await test('320px mobile rail stays within viewport',core,f=>{const r=f.i.rail.getBoundingClientRect();ok(r.left>=0&&r.right<=320.5&&r.bottom<=568.5,'rail fits phone');for(const b of f.i.rail.querySelectorAll('button')){const x=b.getBoundingClientRect();ok(x.left>=0&&x.right<=320.5,'button reachable');}},body,320,568);
 for(const [label,css,prop,want] of [
 ['RTL start maps to physical right','direction:rtl;padding-inline-start:24px','padding-right','author'],
 ['RTL unused left is not attributed to inline-start','direction:rtl;padding-inline-start:24px','padding-left','initial'],
 ['Vertical block start maps to right','writing-mode:vertical-rl;padding-block-start:24px','padding-right','author'],
 ['Vertical block size sets physical width','writing-mode:vertical-rl;block-size:120px','width','author'],
 ['all unset is an author declaration','all:unset','display','author']
 ])await test('Computed source: '+label,'#target{'+css+'}',f=>{open(f);const row=computed(f,prop);facts.push({name:label,row});ok(row?.src===want,'expected '+want+' for '+prop+', got '+JSON.stringify(row));});
 await test('Resize box leaves a right-side handle usable','body{margin:0}#target{position:absolute;right:65px;top:260px;width:150px;height:80px;box-sizing:border-box}',async f=>{f.i.toggle(false);f.i.setSizing(true);f.i.chooseSize(f.t);await tick(f.w);f.i.draw();const h=f.i.handle.getBoundingClientRect(),p=f.i.panel.getBoundingClientRect();facts.push({name:'resize-overlap',handle:{left:h.left,top:h.top,right:h.right,bottom:h.bottom},panel:{left:p.left,top:p.top,right:p.right,bottom:p.bottom}});ok(!(h.left<p.right&&h.right>p.left&&h.top<p.bottom&&h.bottom>p.top),'resize box must not cover the handle');f.i.handle.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',shiftKey:true,bubbles:true,composed:true,cancelable:true}));f.i.draw();const reset=f.i.hresetBtn.getBoundingClientRect();ok(!(reset.left<p.right&&reset.right>p.left&&reset.top<p.bottom&&reset.bottom>p.top),'resize box must not cover the adjacent Reset');},undefined,1280,900);
 for(const mode of ['cancel-no-move','cancel-after-first-move','undo-after-first-move','reset-after-first-move'])await test('First resize session protects page write: '+mode,simple,f=>{const from=startDrag(f);f.t.style.setProperty('inline-size','175px','important');if(mode!=='cancel-no-move')moveDrag(f,from,60);endDrag(f,from,mode.startsWith('cancel'));if(mode==='undo-after-first-move')f.i.sizeUndo();if(mode==='reset-after-first-move')f.i.sizeReset(f.t);facts.push({name:mode,style:f.t.getAttribute('style'),width:f.t.getBoundingClientRect().width});ok(f.t.style.inlineSize==='175px'&&f.t.style.getPropertyPriority('inline-size')==='important','outside first write preserved');});
 output.textContent=JSON.stringify({passed:assertions.filter(t=>t.status==='PASS').length,failed:assertions.filter(t=>t.status==='FAIL').length,tests:assertions,facts},null,2);
});
