// Light or dark. The head's script applies a stored choice before first paint (no choice: the stylesheet follows the system).
// This keeps the button's words and the theme-color in step and stores a new choice.
(() => {
  const root = document.documentElement, button = document.getElementById('theme-toggle');
  if (!button) return;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const defaults = metas.map((m) => m.content);
  const shown = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  const sync = () => {
    const words = shown() === 'dark' ? 'Switch to light' : 'Switch to dark';
    button.setAttribute('aria-label', words);
    button.title = words;
    const chosen = root.dataset.theme;
    metas.forEach((m, i) => { m.content = chosen ? (chosen === 'dark' ? '#2E2A25' : '#FBF9F3') : defaults[i]; });
  };
  button.addEventListener('click', () => {
    const next = shown() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    sync();
  });
  system.addEventListener('change', sync);
  sync();
})();

// The hero headline changes its word (select, replace) and its phrase (backspace, retype) in turn. A part that stays the same is left alone.
(() => {
  const slots = [...document.querySelectorAll('[data-swap]')];
  if (slots.length !== 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const states = [['novel', 'chapter by chapter.'], ['play', 'act by act.'], ['novel', 'scene by scene.'], ['play', 'scene by scene.']];
  // Waits, and holds still while the tab is hidden.
  const wait = (ms) => new Promise((go) => setTimeout(() => {
    if (!document.hidden) return go();
    document.addEventListener('visibilitychange', function back() { document.removeEventListener('visibilitychange', back); go(); });
  }, ms));
  const type = async (node, text) => {
    for (let i = 1; i <= text.length; i++) { node.nodeValue = text.slice(0, i); await wait(55 + Math.random() * 45); }
  };
  // Line one: the word is selected, then replaced.
  const selectAndReplace = async (slot, text) => {
    const [node, caret] = [slot.firstChild, slot.lastChild];
    if (node.nodeValue === text) return;
    slot.classList.add('selected');
    await wait(650);
    slot.classList.remove('selected');
    node.nodeValue = '';
    caret.classList.add('on');
    await wait(220);
    await type(node, text);
    await wait(450);
    caret.classList.remove('on');
  };
  // Line two: backspaced, then retyped.
  const backspaceAndRetype = async (slot, text) => {
    const [node, caret] = [slot.firstChild, slot.lastChild];
    if (node.nodeValue === text) return;
    caret.classList.add('on');
    await wait(350);
    while (node.nodeValue) { node.nodeValue = node.nodeValue.slice(0, -1); await wait(28); }
    await wait(180);
    await type(node, text);
    await wait(500);
    caret.classList.remove('on');
  };
  (async () => {
    for (let at = 0; ; ) {
      await wait(4800);
      at = (at + 1) % states.length;
      await selectAndReplace(slots[0], states[at][0]);
      await wait(250);
      await backspaceAndRetype(slots[1], states[at][1]);
    }
  })();
})();

// The interactive preview: a drawing of the Mac app's window (Rozdzial/ in the app's repository) showing its sample novel
// (window.SAMPLE) or its sample play (window.SAMPLE_PLAY): the sidebar, a scene, the Board, and the Manuscript or the Script.
(() => {
  // The page opens on the novel's first scene: index.html holds the window as this script first draws it (tools/prerender.js),
  // and sample.js holds only the outline and that scene's text. Every other scene's text, the play and its page layout are
  // loaded once the window has drawn, or when the visitor first asks for them.
  const win = document.getElementById('app-window');
  if (!win || !window.SAMPLE) return;
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => matchMedia('(max-width: 820px)').matches;
  const fmt = (n) => n.toLocaleString('en-US');

  // h('div.class', {attr}, ...children)
  function h(spec, attrs, ...kids) {
    const [tag, ...classes] = spec.split('.');
    const node = document.createElement(tag || 'div');
    if (classes.length) node.className = classes.join(' ');
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('--')) node.style.setProperty(k, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
    return node;
  }

  // Icons drawn after the SF Symbols the app uses.
  const PATHS = {
    board: '<rect x="1.5" y="2.5" width="13" height="11" rx="2"/><path d="M5.8 2.5v11M10.2 2.5v11"/>',
    book: '<path d="M3.5 13.5V3a1.5 1.5 0 0 1 1.5-1.5h7.5v10.5H5a1.5 1.5 0 0 0-1.5 1.5Zm0 0A1.5 1.5 0 0 0 5 15h7.5M6.5 4.5h3.5M6.5 7h3.5"/>',
    stack: '<rect x="2.5" y="6" width="11" height="8.5" rx="2"/><path d="M4 3.8h8M5.5 1.5h5"/>',
    person: '<circle cx="8" cy="5" r="2.6"/><path d="M2.8 14.2c.4-2.8 2.5-4.4 5.2-4.4s4.8 1.6 5.2 4.4"/>',
    arcs: '<circle cx="3.2" cy="3.2" r="1.6"/><circle cx="12.8" cy="12.8" r="1.6"/><path d="M4.8 3.6c6.5.6 1 8.5 6.4 9"/>',
    place: '<circle cx="8" cy="4.8" r="2.4"/><path d="M8 7.2v5.6"/><ellipse cx="8" cy="12.9" rx="5.2" ry="1.7"/>',
    doc: '<path d="M4 1.8h5.2l3 3v9.4H4z"/><path d="M9 1.8v3.2h3.2M6 8h4.2M6 10.4h4.2M6 12.6h2.6"/>',
    plus: '<path d="M8 2.5v11M2.5 8h11"/>',
    chevron: '<path d="M6 3l5 5-5 5"/>',
    down: '<path d="M3 6l5 5 5-5"/>',
    left: '<path d="M10.5 3 5.5 8l5 5"/>',
    right: '<path d="m5.5 3 5 5-5 5"/>',
    sidebar: '<rect x="1.5" y="2.5" width="13" height="11" rx="2"/><path d="M6 2.5v11M3 5h1.5M3 7h1.5"/>',
    search: '<circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.5 3.5"/>',
    more: '<circle class="f" cx="3" cy="8" r="1.2"/><circle class="f" cx="8" cy="8" r="1.2"/><circle class="f" cx="13" cy="8" r="1.2"/>',
    x: '<path d="m4 4 8 8M12 4l-8 8"/>',
    play: '<path class="f" d="M4.5 2.8v10.4L13 8z"/>',
    focus: '<path d="M2 3.5h12M4.5 6.5h7M2 9.5h12M4.5 12.5h7"/>',
    target: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle class="f" cx="8" cy="8" r=".9"/>',
    bubble: '<path d="M2 3.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 14 3.5v6a1.5 1.5 0 0 1-1.5 1.5H7l-3 2.5V11h-.5A1.5 1.5 0 0 1 2 9.5z"/><path d="M5 5h6M5 7.8h4"/>',
    history: '<path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8"/><path d="M2.3 2.5v2.4h2.4M8 5v3.2l2 1.4"/>',
    pin: '<circle cx="8" cy="4.6" r="2.6"/><path d="M8 7.2v7"/>',
    check: '<circle cx="8" cy="8" r="6"/><path d="m5.3 8.2 1.9 1.9 3.6-4"/>',
    filter: '<path d="M2 4h12M4.5 8h7M7 12h2"/>',
  };
  const icon = (name) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('class', 'm-ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = PATHS[name]; return s; };

  // MARK: The sample, read as the app reads it

  const STATUS = { idea: 'Idea', draft: 'Draft', revised: 'In revision', done: 'Done' };
  const STATUS_ORDER = ['idea', 'draft', 'revised', 'done'];
  const st = (status) => `var(--${status})`;
  const swatch = (i) => ({ '--sw': `var(--c${i % 8})`, '--sl': `var(--l${i % 8})` });
  const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  function prepare(S) {
    const play = S.form === 'play';
    S.units = play ? S.acts : S.chapters;
    S.scenes = [];
    S.units.forEach((unit, u) => unit.scenes.forEach((scene, i) => { scene.unit = u; scene.position = i; scene.index = S.scenes.length; S.scenes.push(scene); }));
    S.words = S.scenes.reduce((n, s) => n + s.words, 0);
    S.wording = play
      ? { chapter: 'Act', chapterLower: 'act', manuscript: 'Script', location: 'Setting', locations: 'Settings', date: 'Time', timeHint: 'e.g. Morning, the present', spelled: 'ACT' }
      : { chapter: 'Chapter', chapterLower: 'chapter', manuscript: 'Manuscript', location: 'Location', locations: 'Locations', date: 'Date', timeHint: 'Time, e.g. Day 3, dusk', spelled: 'CHAPTER' };
    Object.defineProperty(S, 'layout', { get() { return this._layout || (this._layout = window.ScriptLayout.layOut(this)); } });
    return S;
  }
  const forms = { novel: prepare(window.SAMPLE), play: null };

  // MARK: Loading what the opening view does not need

  const version = '?v=play-demo';
  const scripts = {};
  const load = (src) => scripts[src] || (scripts[src] = new Promise((done, fail) => {
    const tag = document.createElement('script');
    tag.src = src + version;
    tag.onload = done;
    tag.onerror = () => { delete scripts[src]; tag.remove(); fail(new Error(`Could not load ${src}`)); };
    document.head.append(tag);
  }));
  let textReady = null, playReady = null;
  // Every scene's text, in book order.
  const novelText = () => textReady || (textReady = load('sample-novel-text.js').then(() => {
    forms.novel.scenes.forEach((scene, i) => { scene.paragraphs = scene.paragraphs || window.SAMPLE_TEXT[i]; });
  }).catch((e) => { textReady = null; throw e; }));
  // The play, and its pages laid out (a few milliseconds), off the first draw.
  const playData = () => playReady || (playReady = Promise.all([load('sample-play.js'), load('script-layout.js')]).then(() => new Promise((done) => setTimeout(() => {
    if (!forms.play) {
      forms.play = prepare(window.SAMPLE_PLAY);
      void forms.play.layout;
      state.scene.play = forms.play.scenes[0].id;
    }
    done();
  }, 0))).catch((e) => { playReady = null; throw e; }));
  // What a form and view need before they can be drawn whole: nothing is drawn half way.
  function need(form, view, sceneId) {
    if (form === 'play') return playData();
    const scene = forms.novel.scenes.find((s) => s.id === (sceneId || state.scene.novel));
    if (view === 'book' || (view === 'scene' && !scene.paragraphs)) return novelText();
    return Promise.resolve();
  }

  // "1 · A Haunted House Changes Hands"; an untitled act is "Act 1".
  const unitName = (S, u) => S.units[u].title ? `${u + 1} · ${S.units[u].title}` : `${S.wording.chapter} ${u + 1}`;
  const pagesPhrase = (n) => `${fmt(n)} ${n === 1 ? 'page' : 'pages'}`;
  const sceneLength = (S, scene) => S.form === 'play' ? pagesPhrase(S.layout.pagesInScene[scene.id]) : `${fmt(scene.words)} ${scene.words === 1 ? 'word' : 'words'}`;
  const unitLine = (S, unit) => {
    const n = unit.scenes.length, scenes = `${n} ${n === 1 ? 'scene' : 'scenes'}`;
    if (S.form === 'play') {
      const pages = unit.scenes.reduce((t, s) => t + S.layout.pagesInScene[s.id], 0);
      return `${scenes} · ${pagesPhrase(pages)}, ${window.ScriptLayout.runningTime(pages)}`;
    }
    return `${scenes} · ${fmt(unit.scenes.reduce((t, s) => t + s.words, 0))} words`;
  };
  const spellOut = (n) => ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'][n] || String(n);

  // MARK: State

  const params = new URLSearchParams(location.search);
  const state = {
    form: 'novel',  // what the window shows; ?form=play asks for the play once it is loaded
    view: ['board', 'book'].includes(params.get('view')) ? params.get('view') : 'scene',
    scene: { novel: forms.novel.scenes[0].id, play: null },
    collapsed: { novel: new Set(), play: new Set() },
    groups: new Set(),
    storyOpen: true,
    hideDetails: false,
    focus: false,
    versions: false,
    comment: false,
    sidebar: true,
  };
  const S = () => forms[state.form];
  const current = () => S().scenes.find((s) => s.id === state.scene[state.form]);

  // MARK: Titlebar

  const tbSidebar = $('#tb-sidebar'), tbMore = $('#tb-more');
  const tbButtons = win.querySelectorAll('.titlebar .tb-btn');
  [['sidebar', 0], ['left', 1], ['right', 2], ['search', 3], ['more', 4]].forEach(([name, i]) => tbButtons[i].replaceChildren(icon(name)));
  tbSidebar.addEventListener('click', () => {
    if (narrow()) { win.classList.toggle('show-sidebar'); tbSidebar.setAttribute('aria-pressed', String(win.classList.contains('show-sidebar'))); tbSidebar.setAttribute('aria-label', win.classList.contains('show-sidebar') ? 'Hide Sidebar' : 'Show Sidebar'); return; }
    state.sidebar = !state.sidebar;
    win.classList.toggle('no-sidebar', !state.sidebar);
    tbSidebar.setAttribute('aria-label', state.sidebar ? 'Hide Sidebar' : 'Show Sidebar');
    layoutScene();
  });
  const syncSidebarToggle = () => {
    const open = narrow() ? win.classList.contains('show-sidebar') : state.sidebar;
    tbSidebar.setAttribute('aria-label', open ? 'Hide Sidebar' : 'Show Sidebar');
    tbSidebar.setAttribute('aria-pressed', String(narrow() && open));
  };
  tbMore.addEventListener('click', () => { state.versions = !state.versions; renderScene(); });

  // MARK: Sidebar

  function ring(fraction) {
    const r = 5, c = 2 * Math.PI * r;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 12 12'); s.setAttribute('class', 'm-ring'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `<circle cx="6" cy="6" r="${r}" fill="none" stroke="var(--rule)" stroke-width="2"/><circle cx="6" cy="6" r="${r}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="${c * fraction} ${c}" transform="rotate(-90 6 6)"/>`;
    return s;
  }
  const chevron = (expanded, label, onclick) => h('button.m-cv', { type: 'button', 'aria-expanded': String(expanded), 'aria-label': label, onclick }, icon('chevron'));

  function renderSidebar() {
    const s = S(), w = s.wording, out = $('#m-outline');
    $('#m-name').replaceChildren(h('span', s.title), icon('down'));
    $('#m-saved').replaceChildren(icon('check'), 'Saved');
    const rows = [];
    const dest = (title, ic, view) => h('button.m-row.m-dest' + (state.view === view ? '.on' : ''), { type: 'button', 'aria-current': state.view === view ? 'page' : null, onclick: () => { setView(view); closeOverlay(); } },
      h('span.m-sp'), h('span.m-icon', icon(ic)), h('span.m-t', title));
    rows.push(dest('Board', 'board', 'board'), dest(w.manuscript, 'book', 'book'));
    rows.push(h('div.m-row.m-dest', chevron(state.storyOpen, 'Story', () => { state.storyOpen = !state.storyOpen; renderSidebar(); }), h('span.m-icon', icon('stack')), h('span.m-t', 'Story')));
    if (state.storyOpen) {
      const groups = [['characters', 'Characters', 'person', s.characters.map((c) => [c.name, c.color])],
        ['arcs', 'Arcs', 'arcs', s.arcs.map((a) => [a.name, a.color])],
        ['locations', w.locations, 'place', s.locations.map((l) => [l, null])],
        ['notes', 'Notes', 'doc', s.notes.map((n) => [n, null])]];
      for (const [key, title, ic, entries] of groups) {
        const open = state.groups.has(key);
        rows.push(h('div.m-row.m-group', { style: { paddingLeft: '16px' } },
          chevron(open, title, () => { open ? state.groups.delete(key) : state.groups.add(key); renderSidebar(); }),
          h('span.m-icon', icon(ic)), h('span.m-t', title), h('span.m-plus', { 'aria-hidden': 'true' }, icon('plus'))));
        if (open) for (const [name, color] of entries) {
          rows.push(h('div.m-row', { style: { paddingLeft: '32px' } }, h('span.m-sp'), color != null ? h('span.m-sw', swatch(color), h('i')) : null, h('span.m-t', name)));
        }
      }
    }
    const fraction = s.form === 'play' ? Math.min(1, s.layout.total / s.pageTarget) : Math.min(1, s.words / s.goal);
    rows.push(h('div.m-row.m-dest', h('span.m-sp'), h('span.m-icon', ring(fraction)), h('span.m-t', 'Progress')));
    rows.push(h('div.m-label', { role: 'heading', 'aria-level': '3' }, 'Outline'));
    s.units.forEach((unit, u) => {
      const open = !state.collapsed[state.form].has(u);
      const title = unit.title ? [h('span.m-num', String(u + 1)), unit.title] : [`${w.chapter} ${u + 1}`];
      rows.push(h('div.m-row', chevron(open, unit.title || `${w.chapter} ${u + 1}`, () => { const c = state.collapsed[state.form]; if (c.has(u)) c.delete(u); else c.add(u); renderSidebar(); }),
        h('span.m-t', ...title), h('span.m-plus', { 'aria-hidden': 'true' })));
      if (!open) return;
      for (const scene of unit.scenes) {
        const on = state.view === 'scene' && scene.id === state.scene[state.form];
        rows.push(h('button.m-row', { type: 'button', style: { paddingLeft: '36px' }, 'aria-current': on ? 'page' : null, title: STATUS[scene.status], onclick: () => { openScene(scene.id); closeOverlay(); } },
          h('span.m-t', scene.title), h('span.m-dot', { '--st': st(scene.status), 'aria-label': STATUS[scene.status], role: 'img' }, h('i'))));
      }
    });
    rows.push(h('div.m-row.m-add', { 'aria-hidden': 'true' }, h('span.m-sp', icon('plus')), h('span.m-t', `Add ${w.chapterLower}`)));
    const scroll = out.scrollTop;
    out.replaceChildren(...rows);
    out.scrollTop = scroll;
  }
  // On a narrow window the sidebar lies over the page: picking something closes it.
  function closeOverlay() { if (win.classList.contains('show-sidebar')) { win.classList.remove('show-sidebar'); syncSidebarToggle(); } }

  // MARK: Scene page

  const sceneView = $('#view-scene');
  let sceneParts = {};

  // A paragraph's text with its italic runs and the scene's comment highlighted where it falls.
  function runs(text, spans, quote) {
    const marks = new Array(text.length).fill(0);
    for (const [a, n] of spans || []) for (let i = a; i < a + n && i < text.length; i++) marks[i] |= 1;
    const at = quote ? text.indexOf(quote) : -1;
    if (at >= 0) for (let i = at; i < at + quote.length; i++) marks[i] |= 2;
    const out = [];
    let i = 0, markNode = null;
    while (i < text.length) {
      let j = i;
      while (j < text.length && marks[j] === marks[i]) j++;
      const piece = text.slice(i, j);
      const node = marks[i] & 1 ? h('i', piece) : document.createTextNode(piece);
      if (marks[i] & 2) { if (!markNode) { markNode = h('mark'); out.push(markNode); } markNode.append(node); }
      else { markNode = null; out.push(node); }
      i = j;
    }
    return out;
  }

  function chips(entries) {
    return entries.map(([name, color]) => h('span.m-chip', color != null ? swatch(color) : null, color != null ? h('i') : null, h('span', name), h('span.x', { 'aria-hidden': 'true' }, icon('x'))));
  }
  const addButton = (label) => h('span.m-addbtn', { role: 'img', 'aria-label': label }, icon('plus'));

  function properties(s, scene) {
    const w = s.wording;
    const prop = (label, ...value) => h('div.m-prop', h('dt', label), h('dd', ...value));
    const characters = scene.chars.map((i) => [s.characters[i].name, s.characters[i].color]);
    const arcs = scene.arcs.map((i) => [s.arcs[i].name, s.arcs[i].color]);
    const location = scene.location != null ? s.locations[scene.location] : null;
    return h('dl.m-props',
      prop('Status', h('span.m-pill', { '--st': st(scene.status) }, h('i'), STATUS[scene.status])),
      s.form === 'novel' ? prop('POV', scene.pov ? h('span', scene.pov) : h('span.ph', 'Whose point of view?')) : null,
      prop('Characters', ...chips(characters), addButton('Add character')),
      prop('Arcs', ...chips(arcs), addButton('Add arc')),
      prop(w.location, ...(location ? chips([[location, null]]) : []), addButton(location ? `Change ${w.location.toLowerCase()}` : `Set ${w.location.toLowerCase()}`)),
      prop(w.date, h('span.m-date', h('span', 'Set date'), scene.time ? h('span', scene.time) : h('span.ph', w.timeHint))),
      prop('Synopsis', scene.synopsis ? h('span', scene.synopsis) : h('span.ph', 'What happens in this scene?')));
  }

  function summary(s, scene) {
    const parts = [STATUS[scene.status]];
    if (s.form === 'novel' && scene.pov) parts.push(`POV: ${scene.pov}`);
    scene.chars.forEach((i) => parts.push(s.characters[i].name));
    scene.arcs.forEach((i) => parts.push(s.arcs[i].name));
    if (scene.location != null) parts.push(s.locations[scene.location]);
    if (scene.time) parts.push(scene.time);
    return h('div.m-summary', { title: parts.join(' · ') }, parts.join(' · '));
  }

  function sceneText(s, scene) {
    const quote = scene.comments[0] && scene.comments[0].quote;
    let found = false;
    const q = () => (found ? null : quote);
    if (s.form === 'novel') {
      return h('div.m-prose', scene.paragraphs.map(([text, spans, block, flush]) => {
        const kids = runs(text, spans, q());
        if (kids.some((k) => k.tagName === 'MARK')) found = true;
        return h('p' + (block ? '.block' : '') + (flush ? '.flush' : ''), kids);
      }));
    }
    return h('div.m-script', scene.paragraphs.map(([role, text, spans]) => {
      // A stage direction is stored bare and drawn in parentheses, as the editor draws it.
      let shown = text, sp = spans;
      if (role === 's' && !(/^\(.*\)$/.test(text.trim()) || /^\[.*\]$/.test(text.trim()))) { shown = `(${text})`; sp = (spans || []).map(([a, n]) => [a + 1, n]); }
      const kids = runs(shown, sp, q());
      if (kids.some((k) => k.tagName === 'MARK')) found = true;
      return h('p.' + ({ n: 'n', d: 'd', p: 'p', s: 's', t: 't' }[role] || 's'), kids);
    }));
  }

  const dateTime = () => {
    const d = new Date();
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };
  const commentStamp = dateTime();

  function renderScene() {
    const s = S(), scene = current(), w = s.wording;
    const comment = scene.comments[0];
    const page = h('div.m-scene' + (state.versions ? '.with-panel' : '') + (comment ? '.has-comment' : ''));
    const crumb = h('div.m-crumb', { role: 'navigation', 'aria-label': 'Breadcrumb' },
      h('button', { type: 'button', onclick: () => setView('board') }, 'Board'), h('span', { 'aria-hidden': 'true' }, '/'), h('span.last', unitName(s, scene.unit)));
    const detailsChevron = h('button.m-details-cv', { type: 'button', 'aria-label': 'Details', 'aria-expanded': String(!state.hideDetails), title: state.hideDetails ? 'Show Details' : 'Hide Details',
      onclick: () => { state.hideDetails = !state.hideDetails; renderScene(); } }, icon('chevron'));
    const head = h('div.m-head', h('h3.m-title', scene.title), h('div', { style: { position: 'relative' } }, detailsChevron, state.hideDetails ? summary(s, scene) : properties(s, scene)));
    const text = h('div.m-text', sceneText(s, scene));
    const margin = h('div.m-margin');
    const flow = h('div', { style: { position: 'relative' } }, text, margin);
    const editor = h('div.m-editor.m-fade', { tabindex: '0', 'aria-label': `${scene.title}, the scene's text` }, flow);
    const prev = s.scenes[scene.index - 1], next = s.scenes[scene.index + 1];
    const step = (label, ic, target) => h('button', { type: 'button', 'aria-label': target ? `${label}: ${target.title}` : label, title: target ? `${label}: ${target.title}` : label, disabled: !target, onclick: () => target && openScene(target.id) }, icon(ic));
    const bar = h('div.m-bar',
      h('span.m-steps', { role: 'group', 'aria-label': 'Scene navigation' }, step('Previous Scene', 'left', prev), step('Next Scene', 'right', next)),
      h('span', sceneLength(s, scene)),
      h('span.m-goal', icon('target'), `${fmt(s.dailyWords)} words to your daily goal`, h('span.m-meter', h('i', { style: { width: '0%' } }))),
      h('span.m-end', h('span.ses', icon('play'), 'Session'),
        h('button', { type: 'button', 'aria-pressed': String(state.focus), onclick: () => { state.focus = !state.focus; win.classList.toggle('focus', state.focus); renderScene(); } }, icon('focus'), state.focus ? 'Exit Focus' : 'Focus')));
    page.append(crumb, head, editor, bar);
    const parts = [page];
    if (state.versions) {
      const n = scene.words;
      parts.push(h('aside.m-slide', { 'aria-label': 'Version History' },
        h('header', h('h4', 'Version History'), h('button.tb-btn', { type: 'button', 'aria-label': 'Close', onclick: () => { state.versions = false; renderScene(); tbMore.focus(); } }, icon('x'))),
        h('div.m-slide-body',
          h('span.m-label', 'Save as v2'), h('div.m-field', 'Note (optional)'), h('span.m-primary', 'Save Version'), h('hr'),
          h('div.m-version', h('b', 'Current Draft'), h('small', `${fmt(n)} words`)),
          h('div.m-version', h('b', 'v1'), h('span', s.versionNote), h('small', `${fmt(n)} words`), h('div.acts', h('span', 'Compare'), h('span', 'Restore…'), h('span', 'Copy Text'), h('span', 'Delete…'))))));
    }
    sceneView.replaceChildren(...parts);
    tbMore.setAttribute('aria-expanded', String(state.versions));
    sceneParts = { page, editor, text, margin, flow, comment, mark: $('mark', text) };
    if (comment && sceneParts.mark) sceneParts.mark.addEventListener('click', () => selectComment(true));
    layoutScene();
  }

  // The text column and the comment margin, worked out as the app works them out (Theme.textColumn, MarginMode).
  function layoutScene() {
    const { page, text, margin, comment, mark, flow } = sceneParts;
    if (!page || !page.isConnected || sceneView.hidden) return;
    // The column itself is styles.css's (a container query): here only whether the margin holds cards or markers.
    const width = page.clientWidth - (parseFloat(getComputedStyle(page).paddingRight) || 0);
    const cards = width - 276 >= 412 + 48;
    margin.replaceChildren();
    if (!comment || !mark) return;
    const top = Math.max(24, mark.offsetTop - 2);
    const card = () => h('button.m-card' + (state.comment ? '.on' : ''), { type: 'button', onclick: () => selectComment(true, true) },
      h('q', comment.quote), comment.text, h('small', commentStamp));
    if (cards) {
      const c = card(); c.style.top = `${top}px`; margin.append(c);
    } else {
      margin.append(h('button.m-marker' + (state.comment ? '.on' : ''), { type: 'button', 'aria-label': `Comment: ${comment.text}`, 'aria-expanded': String(state.comment), style: { top: `${top}px` },
        onclick: () => selectComment(!state.comment) }, icon('bubble')));
      $('.m-pop', flow)?.remove();
      if (state.comment) { const pop = h('div.m-pop', { style: { top: `${top + 26}px` } }, card()); flow.append(pop); }
    }
  }

  function selectComment(on, reveal) {
    state.comment = on;
    sceneParts.mark?.classList.toggle('on', on);
    layoutScene();
    if (reveal && sceneParts.mark) {
      const { editor, mark } = sceneParts;
      editor.scrollTo({ top: Math.max(0, mark.offsetTop - editor.clientHeight / 3), behavior: reduced() ? 'auto' : 'smooth' });
    }
  }

  function openScene(id) { go(state.form, 'scene', id); }

  // MARK: Board

  const boardView = $('#view-board'), bookView = $('#view-book');

  function renderBoard() {
    const s = S(), w = s.wording, play = s.form === 'play';
    const counts = STATUS_ORDER.map((k) => s.scenes.filter((x) => x.status === k).length);
    const statusBar = h('span.m-statusbar', counts.map((n, i) => n ? h('i', { '--st': st(STATUS_ORDER[i]), style: { flex: String(n) } }) : null));
    const legend = counts.map((n, i) => `${n} ${STATUS[STATUS_ORDER[i]]}`).join(' · ');
    const metric = (label, ...value) => h('div.m-metric', h('span.m-label', label), ...value);
    let band;
    if (play) {
      const pages = s.layout.total, target = s.pageTarget, left = Math.max(0, target - pages);
      band = [metric('Length', h('b', `${fmt(pages)} / ${pagesPhrase(target)}`), h('span.m-meter', h('i', { style: { width: `${Math.min(100, pages / target * 100)}%` } })), h('small', window.ScriptLayout.runningTime(pages))),
        metric('Pages to go', h('b', left ? fmt(left) : 'Goal reached')),
        metric('Scenes', h('b', fmt(s.scenes.length)), statusBar)];
    } else {
      const left = Math.max(0, s.goal - s.words);
      // Est. finish: the words left at the last seven days' average, as the app projects it (DayLedger.projectedFinish).
      const week = s.history.filter(([ago]) => ago < 7).reduce((t, [, net]) => t + net, 0) / 7;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const finish = left === 0 ? today : week > 0 ? new Date(today.getTime() + Math.ceil(left / week) * 864e5) : null;
      band = [metric('Words', h('b', `${fmt(s.words)} / ${fmt(s.goal)}`), h('span.m-meter', h('i', { style: { width: `${Math.min(100, s.words / s.goal * 100)}%` } }))),
        metric('Words to go', h('b', left ? fmt(left) : 'Goal reached')),
        metric('Est. finish', h('b', finish ? finish.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—')),
        metric('Scenes', h('b', fmt(s.scenes.length)), statusBar)];
    }
    band[band.length - 1].title = legend;
    const bandNode = h('div.m-band', ...band);
    const lanes = h('div.m-lanes.m-fade', s.units.map((unit, u) => h('div.m-col', h('div.m-col-in',
      h('div.m-colhead', h('div', h('h5', unit.title ? [h('span.n', String(u + 1)), '  ' + unit.title] : `${w.chapter} ${u + 1}`), h('p', unitLine(s, unit))), h('span', { 'aria-hidden': 'true' }, icon('more'))),
      unit.scenes.map((scene) => card(s, scene)),
      h('div.m-addscene', { 'aria-hidden': 'true' }, icon('plus'), 'Add scene')))),
      h('div.m-addcol', { 'aria-hidden': 'true' }, icon('plus'), `Add ${w.chapterLower}`));
    boardView.replaceChildren(h('div.m-board',
      h('div.m-pagehead', h('h3.m-pagetitle', s.title)), bandNode,
      h('div.m-controls', { 'aria-hidden': 'true' }, h('span.acc', 'Color by: Status', icon('down')), h('span', icon('filter'), 'Filter')),
      lanes));
    fitBand();
  }

  // Four cards a row (a play's three), or two by two (a play's stacked) where the page is too narrow for each to be 160 wide.
  function fitBand() {
    const band = $('.m-band', boardView);
    if (!band) return;
    const n = band.children.length, width = band.clientWidth;
    const options = n === 4 ? [4, 2] : [3, 1];
    const cols = options.find((c) => c * 160 + (c - 1) * 12 <= width) || options[options.length - 1];
    band.style.setProperty('--cols', String(cols));
  }

  function card(s, scene) {
    const play = s.form === 'play';
    const people = scene.chars.map((i) => s.characters[i]);
    const location = scene.location != null ? s.locations[scene.location] : null;
    const facts = [h('span', play ? pagesPhrase(s.layout.pagesInScene[scene.id]) : fmt(scene.words))];
    if (people.length) facts.push(h('span.m-avatars', { 'aria-hidden': 'true' }, people.slice(0, 3).map((c) => h('span.m-av', swatch(c.color), initials(c.name))), people.length > 3 ? h('span.more', `+${people.length - 3}`) : null));
    if (scene.comments.length) facts.push(h('span.lab', icon('bubble'), String(scene.comments.length)));
    facts.push(h('span.lab.ver', { title: '1 saved version' }, icon('history'), '1'));
    const second = location || scene.time ? h('div', location ? h('span.lab.place', icon('pin'), location) : null, scene.time ? h('span', scene.time) : null) : null;
    const label = [scene.title, scene.synopsis, `Status: ${STATUS[scene.status]}`, sceneLength(s, scene), people.length ? `Characters: ${people.map((c) => c.name).join(', ')}` : '',
      location ? `${s.wording.location}: ${location}` : '', scene.comments.length ? `${scene.comments.length} open comments` : '', '1 saved version'].filter(Boolean).join('. ');
    return h('button.m-scard', { type: 'button', '--st': st(scene.status), title: STATUS[scene.status], 'aria-label': label, onclick: () => openScene(scene.id) },
      h('h6', scene.title), scene.synopsis ? h('p', scene.synopsis) : null, h('div.m-facts', h('div', facts), second));
  }

  // MARK: Manuscript and Script

  let reading = null;
  function renderBook() {
    const s = S(), play = s.form === 'play';
    const scroll = h('div.m-scroll.m-fade', { tabindex: '0', 'aria-label': play ? 'The whole play, as printed pages' : 'The whole novel, typeset as a book' });
    const compact = bookView.clientWidth < 1000;
    const rail = h('nav.m-rail' + (compact ? '.compact' : ''), { 'aria-label': 'Contents' }, compact ? null : h('span.m-label', 'Contents'));
    const targets = [];
    const link = (cls, kids, title, target, kind) => {
      const a = h('a.' + cls, { href: '#', title, onclick: (e) => { e.preventDefault(); scroll.scrollTo({ top: target().offsetTop - 24, behavior: reduced() ? 'auto' : 'smooth' }); } }, kids);
      targets.push({ a, target, kind });
      rail.append(a);
    };
    if (!play) {
      const book = h('div.m-book');
      s.units.forEach((unit, u) => {
        const label = h('p.ch-label' + (u === 0 ? '.one' : ''), `${s.wording.spelled} ${spellOut(u + 1)}`);
        book.append(label, h('p.ch-title', unit.title));
        const name = `${u + 1}  ${unit.title}`;
        link('ch', compact ? String(u + 1) : [h('span.n', String(u + 1)), unit.title], name, () => label, 'unit');
        unit.scenes.forEach((scene, i) => {
          if (i) book.append(h('p.break', '⁂'));
          let first = null;
          scene.paragraphs.forEach(([text, spans, block, flush], k) => {
            const p = h('p' + (k === 0 ? '.first' : '') + (block ? '.block' : '') + (flush ? '.flush' : ''), runs(text, spans));
            if (!k) first = p;
            book.append(p);
          });
          if (!compact) link('sc', scene.title, scene.title, () => first, 'scene');
        });
      });
      scroll.append(book);
    } else {
      const L = s.layout, sheets = h('div.m-sheets');
      const nodes = L.pages.map((page) => sheet(page, L.format));
      sheets.append(...nodes);
      scroll.append(sheets);
      let lastAct = -1;
      L.starts.forEach((start) => {
        const node = () => nodes[start.page];
        if (start.act !== lastAct) {
          lastAct = start.act;
          link('ch', compact ? String(start.act + 1) : [h('span', `${s.wording.chapter} ${start.act + 1}`), h('span.pg', String(start.number))], `${s.wording.chapter} ${start.act + 1}, page ${start.number}`, node, 'unit');
        }
        if (!compact) { const scene = s.acts[start.act].scenes[start.scene]; link('sc', [h('span', scene.title), h('span.pg', String(start.number))], `${scene.title}, page ${start.number}`, node, 'scene'); }
      });
    }
    bookView.replaceChildren(h('div.m-pagehead', h('h3.m-pagetitle', s.title)), h('div.m-reading', scroll, rail));
    reading = { scroll, targets, play, sheets: $('.m-sheets', scroll) };
    fitSheets();
    scroll.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // A sheet of the script: each line where the PDF prints it, the page's label at the top right.
  function sheet(page, F) {
    const inner = h('div');
    const label = page.label;
    if (label) inner.append(h('span', { style: { left: `${F.textRight - label.length * F.advance}px`, top: `${F.pageNumberTop}px` } }, label));
    for (const line of page.lines) {
      const it = line.item, start = line.start || 0;
      const span = h('span' + (it.underline ? '.u' : ''), { style: { left: `${line.x}px`, top: `${F.marginTop + line.row * F.lineHeight}px` } });
      const spans = (it.italic || []).map(([a, n]) => [a - start, n]).filter(([a, n]) => a + n > 0 && a < line.text.length).map(([a, n]) => [Math.max(0, a), n + Math.min(0, a)]);
      span.append(...runs(line.text, spans));
      inner.append(span);
    }
    return h('div.m-sheet', { role: 'img', 'aria-label': label ? `Page ${label}` : `${page.kind === 'title' ? 'Title' : page.kind === 'characters' ? 'Characters' : 'Setting and time'} page` }, inner);
  }

  function fitSheets() {
    if (!reading || !reading.sheets) return;
    const width = reading.scroll.clientWidth - 48;
    reading.sheets.style.setProperty('--s', String(Math.max(0.2, Math.min(1, width / 612))));
  }

  // Scroll-spy: the chapter or act being read and its scene, in the accent with a bar.
  function spy() {
    if (!reading) return;
    const y = reading.scroll.scrollTop + 60;
    let unit = null, scene = null;
    for (const t of reading.targets) {
      if (t.target().offsetTop <= y) { if (t.kind === 'unit') { unit = t; scene = null; } else scene = t; }
    }
    unit = unit || reading.targets[0];
    reading.targets.forEach((t) => t.a.classList.toggle('on', t === unit || t === scene));
  }

  // MARK: The sample choice and the caption

  const formTabs = [...document.querySelectorAll('[data-form]')];
  const note = $('#preview-note'), credits = $('#sample-credits');
  const CAPTIONS = {
    novel: ['Try it. Open a scene, the Board or the Manuscript.',
      'The story is Oscar Wilde’s <em>The Canterville Ghost</em>, from <a href="https://www.gutenberg.org/ebooks/14522">Project Gutenberg</a>. Scene titles, synopses and comments were added for this sample.'],
    play: ['Try it. Open a scene, the Board or the Script.',
      'The play is Oscar Wilde’s <em>The Importance of Being Earnest</em>, from <a href="https://www.gutenberg.org/ebooks/844">Project Gutenberg</a>. Scene titles, synopses and comments were added for this sample.'],
  };
  const views = { scene: sceneView, board: boardView, book: bookView };

  // Every change of form, view or scene: once what it needs is loaded, drawn whole; the latest request wins.
  let ticket = 0;
  function go(form, view, sceneId, focusTab) {
    const mine = ++ticket;
    win.setAttribute('aria-busy', 'true');
    need(form, view, sceneId).then(() => {
      if (mine !== ticket) return;
      win.removeAttribute('aria-busy');
      if (sceneId) { state.scene[form] = sceneId; state.comment = false; }
      if (form !== state.form || !drawn) applyForm(form, view); else applyView(view);
      drawn = true;
      if (focusTab) focusTab.focus();
      if (!window.__mockHydrated) window.__mockHydrated = performance.now();
    }, () => {
      if (mine !== ticket) return;
      win.removeAttribute('aria-busy');
      // What was asked for could not load: the window keeps working on the novel's first scene, which needs nothing more.
      if (!drawn) { applyForm('novel', 'scene'); drawn = true; window.__mockHydrated = window.__mockHydrated || performance.now(); }
    });
  }
  const setView = (view) => go(state.form, view);

  function applyView(view) {
    state.view = view;
    for (const [name, node] of Object.entries(views)) node.hidden = name !== view;
    tbMore.disabled = view !== 'scene';
    if (view !== 'scene' && state.focus) { state.focus = false; win.classList.remove('focus'); }
    renderSidebar();
    if (view === 'scene') renderScene();
    if (view === 'board') renderBoard();
    if (view === 'book') renderBook();
  }

  function applyForm(form, view) {
    state.form = form;
    state.versions = false;
    state.comment = false;
    state.groups.clear();
    formTabs.forEach((t) => {
      const on = t.dataset.form === form;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) win.setAttribute('aria-labelledby', t.id);
    });
    note.textContent = CAPTIONS[form][0];
    credits.innerHTML = CAPTIONS[form][1];
    $('#m-outline').scrollTop = 0;
    applyView(view);
  }

  const arrows = (tabs, pick) => tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', (e) => {
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      pick(tabs[(n + tabs.length) % tabs.length], true);
    });
  });
  arrows(formTabs, (t, focus) => go(t.dataset.form, state.view, null, focus ? t : null));
  // The play starts loading as soon as the visitor reaches for it.
  const warm = () => playData().catch(() => {});
  formTabs.find((t) => t.dataset.form === 'play').addEventListener('pointerenter', warm);
  formTabs.find((t) => t.dataset.form === 'play').addEventListener('focus', warm);
  formTabs.find((t) => t.dataset.form === 'play').addEventListener('touchstart', warm, { passive: true });

  // Widths: the text column and the comment margin, the band, the sheets and the rail follow the window.
  let lastWide = null;
  new ResizeObserver(() => {
    syncSidebarToggle();
    if (!narrow()) win.classList.remove('show-sidebar');
    if (state.view === 'scene') layoutScene();
    if (state.view === 'board') fitBand();
    if (state.view === 'book') {
      const wide = bookView.clientWidth >= 1000;
      if (lastWide !== null && wide !== lastWide) renderBook(); else fitSheets();
      lastWide = wide;
    }
  }).observe(win);

  // Draw the window (the same as index.html already shows for the novel's first scene), then fetch the rest of the novel.
  let drawn = false;
  go(params.get('form') === 'play' ? 'play' : 'novel', state.view);
  const later = () => (window.requestIdleCallback ? requestIdleCallback(() => novelText().catch(() => {}), { timeout: 3000 }) : setTimeout(() => novelText().catch(() => {}), 1000));
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
})();
