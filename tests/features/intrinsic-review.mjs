const output = document.querySelector('#results'), status = document.querySelector('#status'), button = document.querySelector('#run');
const tick = w => new Promise(done => w.requestAnimationFrame(() => w.requestAnimationFrame(done)));
const invariant = (value, message) => { if (!value) throw new Error(message); };
const modes = ['horizontal-tb', 'vertical-rl', 'vertical-lr', 'sideways-rl', 'sideways-lr'];
const rows = sh => [...sh.querySelectorAll('#view-css .d')].map(r => ({
  property: r.querySelector('.t')?.textContent.split(':')[0],
  source: [...r.classList].find(c => c.startsWith('src-'))?.slice(4),
  over: r.classList.contains('over'),
  note: r.querySelector('.src')?.textContent,
  text: r.querySelector('.t')?.textContent,
}));

async function fixture(mode, direction, declaration, origin) {
  const frame = document.createElement('iframe');
  const css = `body{margin:0}#target{width:180px;height:80px;writing-mode:${mode};direction:${direction};${origin === 'rule' ? declaration : ''}}`;
  const html = `<!doctype html><html><head><style>${css}</style></head><body><div id="target"${origin === 'inline' ? ` style="${declaration}"` : ''}>Target</div></body></html>`;
  const encoded = JSON.stringify(html).replace(/</g, '\\u003c');
  const build = '/inspector.js';
  frame.srcdoc = html.replace('</body>', `<script>window.fixtureErrors=[];addEventListener('error',e=>fixtureErrors.push(e.message));addEventListener('unhandledrejection',e=>fixtureErrors.push(String(e.reason)));const originalFetch=window.fetch.bind(window);window.fetch=(input,...args)=>String(input)==='about:srcdoc'?Promise.resolve(new Response(${encoded})):originalFetch(input,...args)<\/script><script src="${build}"><\/script></body>`);
  try {
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture load timeout')), 8000);
      frame.onload = () => { clearTimeout(timer); done(); };
      frame.onerror = () => { clearTimeout(timer); reject(new Error('Fixture load error')); };
      document.body.append(frame);
    });
    const w = frame.contentWindow, doc = frame.contentDocument, i = doc.querySelector('fm-inspector'), target = doc.querySelector('#target');
    invariant(i?.shadowRoot, 'Inspector mounted');
    i.lens.arm('css'); i.lens.choose('css', target); await i.load(); await tick(w);
    i.shadowRoot.querySelector('.vinitials').click(); await tick(w);
    return { frame, w, doc, i, target };
  } catch (error) { frame.remove(); throw error; }
}

button.addEventListener('click', async () => {
  button.disabled = true;
  const tests = [];
  for (const mode of modes) for (const direction of ['ltr', 'rtl']) for (const origin of ['rule', 'inline']) {
    for (const property of ['contain-intrinsic-width', 'contain-intrinsic-height', 'contain-intrinsic-inline-size', 'contain-intrinsic-block-size', 'contain-intrinsic-size']) {
      const name = `${mode} / ${direction} / ${origin} / ${property}`;
      let f;
      try {
        f = await fixture(mode, direction, `${property}:123px`, origin);
        if (!f.w.CSS.supports('writing-mode', mode) || !f.w.CSS.supports(property, '123px')) {
          tests.push({ name, status: 'SKIP', reason: 'Native browser does not support this case' });
          continue;
        }
        const computed = f.w.getComputedStyle(f.target);
        const physical = ['contain-intrinsic-width', 'contain-intrinsic-height'].filter(p => computed.getPropertyValue(p) === '123px');
        invariant(physical.length === (property === 'contain-intrinsic-size' ? 2 : 1), `Native physical mapping ${JSON.stringify(physical)}`);
        const initialRows = rows(f.i.shadowRoot);
        for (const p of physical) {
          const winning = initialRows.filter(r => r.property === p && !r.over);
          invariant(winning.length === 1 && winning[0].source === 'author', `Initials winning source for ${p}: ${JSON.stringify(winning)}`);
          if (p !== property) invariant(winning[0].note?.includes(`via ${property}`), `Exact source explanation for ${p}: ${winning[0].note}`);
        }
        const author = [...f.i.shadowRoot.querySelectorAll('.srcs .srcb')].find(b => b.textContent === 'Author');
        invariant(author, 'Author filter exists'); author.focus(); author.click(); await tick(f.w);
        const filtered = rows(f.i.shadowRoot);
        for (const p of physical) invariant(filtered.some(r => r.property === p && r.source === 'author' && !r.over), `Author filter includes ${p}`);
        invariant(filtered.every(r => r.source === 'author' && !r.over), 'Author filter excludes other sources');
        invariant(f.i.shadowRoot.activeElement?.textContent === 'Author', 'Author filter retains focus');
        invariant(!f.w.fixtureErrors.length, `No uncaught frame errors: ${f.w.fixtureErrors.join('; ')}`);
        tests.push({ name, status: 'PASS', physical, source: 'author', origin });
      } catch (error) { tests.push({ name, status: 'FAIL', error: error.message }); }
      finally { f?.frame.remove(); }
      status.textContent = `${tests.length} checks completed`;
    }
  }
  const result = {
    passed: tests.filter(t => t.status === 'PASS').length,
    failed: tests.filter(t => t.status === 'FAIL').length,
    skipped: tests.filter(t => t.status === 'SKIP').length,
    tests,
  };
  output.textContent = JSON.stringify(result, null, 2);
  status.textContent = `${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`;
  button.disabled = false;
});
