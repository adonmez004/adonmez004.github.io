// Shared expectations: the native Playwright suites and the browser fixture run
// these same scenarios. Read visible DOM, not the inspector's filter state.
export function invariant(value, message) {
  if (!value) throw new Error(message);
}
const same = (actual, expected, message) => invariant(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
const pressed = (s, name) => same(s.links.filter(b => b.pressed).map(b => b.name), [name], 'Exactly one selected link');
const onlySource = (s, source) => { invariant(s.rows > 0, 'The filtered result must not be empty'); same(s.sources, [source], 'Visible sources'); };

export function sourceSnapshot(sh) {
  const view = sh.querySelector('#view-css');
  const rows = [...view.querySelectorAll('.d')];
  const row = prop => rows.filter(r => r.querySelector('.t')?.textContent.startsWith(`${prop}: `)).map(r => ({
    value: r.querySelector('.t').textContent.slice(prop.length + 2),
    source: [...r.classList].find(c => c.startsWith('src-'))?.slice(4),
    over: r.classList.contains('over'), note: r.querySelector('.src')?.textContent || '',
  }));
  return {
    head: view.querySelector('.grp .gh')?.textContent.trim() || null,
    links: [...view.querySelectorAll('.srcs .srcb')].map(b => ({ name: b.textContent, pressed: b.getAttribute('aria-pressed') === 'true' })),
    rows: rows.length, sources: [...new Set(rows.map(r => [...r.classList].find(c => c.startsWith('src-'))?.slice(4)))].sort(),
    struck: rows.filter(r => r.classList.contains('over')).length,
    note: view.querySelector('.srcnote')?.textContent || null,
    width: row('width'), bidi: row('unicode-bidi'), borderColor: row('border-top-color'), outlineColor: row('outline-color'),
    why: view.querySelector('.d.wo .why')?.textContent || null,
    author: rows.filter(r => r.classList.contains('src-author')).map(r => r.querySelector('.t').textContent.split(':')[0]),
    borderLeftWidth: row('border-left-width'), cornerRadius: row('border-top-left-radius'),
    active: sh.activeElement?.classList.contains('srcb') ? sh.activeElement.textContent : null,
    actualBidi: sh.host.lens.scope.css ? getComputedStyle(sh.host.lens.scope.css).unicodeBidi : null, // the browser's own value on the scoped element: Chromium and Firefox isolate a div and an li, WebKit leaves them normal
  };
}
export function sizeSnapshot(sh) {
  const view = sh.querySelector('#view-css');
  const lines = [...view.querySelectorAll('.lim')];
  return {
    links: [...view.querySelectorAll('.srcs .srcb')].map(b => ({ name: b.textContent, pressed: b.getAttribute('aria-pressed') === 'true' })),
    lines: lines.filter(n => !n.classList.contains('lhead')).length,
    heads: [...view.querySelectorAll('.lhead')].filter(n => n.textContent === 'up the tree').map(n => n.textContent),
    boxes: [...view.querySelectorAll('.lhead')].filter(n => n.textContent !== 'up the tree').map(n => n.textContent),
    words: [...new Set(lines.map(n => n.querySelector('.rp')?.textContent || n.textContent.trim()))],
    first: lines[0]?.textContent.replace(/\s+/g, ' ').trim() || null,
    rendered: lines.find(n => n.querySelector('.rp')?.textContent === 'rendered content')?.textContent.replace(/\s+/g, ' ').trim() || null,
    text: view.textContent.replace(/\s+/g, ' ').trim(),
    active: sh.activeElement?.classList.contains('srcb') ? sh.activeElement.textContent : null,
  };
}

export async function runSources(d) {
  const check = (name, verify) => d.check(name, () => d.read(sourceSnapshot), verify);
  const link = name => d.click('.srcs .srcb', name);
  await d.open('.box'); await d.click('.vinitials');
  await check('Initials: computed heading and exclusive All selection', s => { invariant(s.head?.includes('computed'), 'Computed heading exists'); pressed(s, 'All'); invariant(s.struck > 0 && !s.note, 'Overridden reference rows visible, no filter note'); });
  await check('Every visible source has a filter link', s => { invariant(s.sources.length > 1, 'Multiple sources present'); for (const src of s.sources) invariant(s.links.some(b => b.name.toLowerCase() === src), `Missing filter for ${src}`); });
  await check('Width keeps the overridden reference and the author winner', s => { invariant(s.width.some(r => r.source === 'initial' && r.over), 'Overridden initial width'); invariant(s.width.some(r => r.source === 'author' && r.value === '200px' && !r.over), 'Author width 200px wins'); });
  await check('unicode-bidi initial normal remains below the browser row', s => { invariant(s.bidi.some(r => r.source === 'initial' && r.value === 'normal' && r.over), 'Initial normal'); invariant(s.bidi.some(r => r.source === 'browser' && r.value === s.actualBidi && !r.over), `Browser row carries the computed ${s.actualBidi}`); });
  await check('Border shorthand supplies the winning color', s => invariant(s.borderColor.some(r => r.source === 'author' && r.value === 'rgb(10, 20, 30)' && !r.over), 'Author border color wins'));
  await check('currentcolor is one unstruck outline row', s => { same(s.outlineColor.length, 1, 'Outline row count'); const r = s.outlineColor[0]; invariant(r.source === 'currentcolor' && !r.over && /rgb\(10, 20, 30\)/.test(r.note), 'Outline follows color with an explanation'); });
  await link('Author');
  await check('Author filter returns nonempty winning author rows', s => { pressed(s, 'Author'); onlySource(s, 'author'); same(s.struck, 0, 'Initials removes overridden rows when filtered'); invariant(s.note && s.author.includes('width') && s.author.includes('color') && s.author.includes('padding-top'), 'Author note and expected properties'); same(s.active, 'Author', 'The clicked link keeps the focus through the re-render'); });
  await link('Author');
  await check('Repeating Author restores all sources and removes note', s => { pressed(s, 'All'); invariant(s.sources.length > 1 && !s.note && s.struck > 0, 'Full source stack restored'); });
  await link('Currentcolor');
  await check('Currentcolor filter names the actual inherited color', s => { pressed(s, 'Currentcolor'); onlySource(s, 'currentcolor'); invariant(/rgb\(10, 20, 30\)/.test(s.note), 'Filter explanation names color'); });
  await d.click('.d.src-currentcolor .whyb', undefined, true);
  await check('Why control expands an explanation', s => invariant(s.why?.trim().length > 5, 'Nonempty expanded explanation'));
  await link('Layout');
  await check('Layout filter returns only layout rows', s => { pressed(s, 'Layout'); onlySource(s, 'layout'); invariant(s.note, 'Layout explanation'); });
  await link('Initial');
  await check('Initial filter is nonempty and removes overridden rows', s => { pressed(s, 'Initial'); onlySource(s, 'initial'); same(s.struck, 0, 'No struck initial rows in filtered view'); });
  await d.open('.lb');
  await check('Logical border shorthands and corners read as the author\'s', s => { invariant(s.borderLeftWidth.some(r => r.source === 'author' && r.value === '3px' && !r.over), `border-left-width via border-inline: ${JSON.stringify(s.borderLeftWidth)}`); invariant(s.cornerRadius.some(r => r.source === 'author' && r.value === '17px' && !r.over), `border-top-left-radius via border-start-start-radius: ${JSON.stringify(s.cornerRadius)}`); });
  await d.open('.item');
  await check('New CSS scope resets the source filter', s => { pressed(s, 'All'); invariant(!s.note && s.sources.length > 1, 'Full stack restored for new scope'); invariant(s.bidi.some(r => r.value === s.actualBidi && r.source === 'browser'), `LI browser reference carries the computed ${s.actualBidi}`); });
  await d.open('.list'); await d.click('.vrender');
  await check('Computed omits initial rows but keeps overridden browser defaults', s => { pressed(s, 'All'); invariant(!s.sources.includes('initial') && s.struck > 0 && s.sources.includes('author'), 'Computed stack with overrides'); });
  await link('Browser');
  await check('Browser filter preserves overridden default rows in Computed', s => { pressed(s, 'Browser'); onlySource(s, 'browser'); invariant(s.struck > 0 && s.note, 'Overridden browser rows and reference note remain'); });
  await d.click('.vinitials');
  await check('Changing detail block resets the filter and its note', s => { pressed(s, 'All'); invariant(!s.note && s.sources.includes('initial'), 'Initials block starts unfiltered'); });
  await d.open('.box'); await link('Author');
  await d.replaceAuthorCSS('.box { width: 240px; }');
  await check('External stylesheet edit refreshes values while preserving a valid filter', s => {
    pressed(s, 'Author'); onlySource(s, 'author');
    invariant(s.width.some(r => r.value === '240px' && !r.over) && !s.width.some(r => r.value === '200px'), 'Live width replaces the stale value');
  });
  await d.replaceAuthorCSS('');
  await check('Removing the selected source restores All instead of an empty filter', s => {
    pressed(s, 'All'); invariant(s.rows > 0 && !s.sources.includes('author') && !s.note, 'Remaining sources visible, stale filter note removed'); same(s.active, 'All', 'The focus falls back to All when its link is gone');
  });
}
export async function runSizeLinks(d) {
  const check = (name, verify) => d.check(name, () => d.read(sizeSnapshot), verify);
  const link = name => d.click('.srcs .srcb', name);
  await d.open('.t'); await d.click('.vlimits');
  let fullLines;
  await check('Size ladder lists ancestors in order and selects All', s => { pressed(s, 'All'); same(s.links.map(b => b.name), ['All', 'Element', 'Parent', 'Grandparent', 'Great-grandparent', 'Body', 'Viewport'], 'Ancestor links'); same(s.heads, ['up the tree'], 'Ancestor heading'); fullLines = s.lines; });
  await check('Element details include all four quick measurements', s => { for (const word of ['content', 'rendered content', 'space', 'with margin']) invariant(s.words.includes(word), `Missing ${word}`); });
  await check('Viewport reports the actual fixture dimensions', s => invariant(/the browser window/.test(s.text) && /1280 × 900/.test(s.text), 'Window label and 1280 × 900'));
  await link('Parent');
  await check('Parent filter keeps exactly its width and height', s => { pressed(s, 'Parent'); same(s.lines, 2, 'Two parent measurements'); same(s.heads, [], 'No ancestor heading'); invariant(/div/.test(s.first) && !s.rendered, 'Parent div, no element-only details'); same(s.active, 'Parent', 'The clicked link keeps the focus through the re-render'); });
  await link('Element');
  await check('Element filter restores quick measurements', s => { pressed(s, 'Element'); invariant(s.rendered && s.words.includes('with margin'), 'Quick measurements restored'); });
  await check('Text measurement describes line count, alignment and free room', s => invariant(/1 line/.test(s.rendered) && /start-aligned/.test(s.rendered) && /free beside it/.test(s.rendered), 'Text layout explanation'));
  await link('Viewport');
  await check('Viewport filter excludes element and ancestor details', s => { pressed(s, 'Viewport'); same(s.lines, 2, 'Viewport width and height'); same(s.boxes.length, 1, 'One viewport box'); invariant(/1280 × 900/.test(s.first) && /the browser window/.test(s.text) && !s.rendered, 'Viewport dimensions only'); });
  await link('Viewport');
  await check('Repeating Viewport restores the complete ladder', s => { pressed(s, 'All'); same(s.lines, fullLines, 'Every line restored'); });
  await link('Body');
  await check('Body filter selects body width and height', s => { pressed(s, 'Body'); same(s.lines, 2, 'Two body measurements'); invariant(/body/.test(s.first), 'Body shown'); });
  await d.open('.box');
  await check('New scope resets size filter and shortens ancestor ladder', s => { pressed(s, 'All'); same(s.links.map(b => b.name), ['All', 'Element', 'Parent', 'Grandparent', 'Body', 'Viewport'], 'Shorter ancestor ladder'); invariant(s.lines < fullLines, 'Fewer ancestor measurements'); });
  await check('Container rendered content describes child boxes', s => invariant(/children|child/.test(s.rendered) && !/1 line/.test(s.rendered), 'Container reports child boxes, not text lines'));
  await link('Element'); await link('All');
  await check('Explicit All restores every ancestor after filtering', s => { pressed(s, 'All'); invariant(s.heads.includes('up the tree'), 'Whole ladder visible again'); });
}
