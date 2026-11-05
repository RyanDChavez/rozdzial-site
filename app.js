// The interactive preview: a drawing of the Mac app's Scene, Board and Manuscript pages, filled with window.SAMPLE.
(() => {
  const S = window.SAMPLE;
  if (!S) return;
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const fmt = (n) => n.toLocaleString('en-US');
  const swatch = (node, i) => { node.style.setProperty('--sw', `var(--c${i})`); node.style.setProperty('--sl', `var(--l${i})`); return node; };
  const skip = new Set(['Sir', 'Mrs.', 'Mr.', 'Lord', 'The', 'de']);
  const initial = (name) => (name.split(' ').find((w) => !skip.has(w)) || name)[0];
  const avatar = (c) => { const a = swatch(el('span', 'avatar', initial(c.name)), c.color); a.setAttribute('aria-hidden', 'true'); return a; };

  // A paragraph, with the sample's one comment highlighted where it falls.
  const paragraph = (text, cls, comments = true) => {
    const p = el('p', cls);
    const q = S.comment.quote, at = comments ? text.indexOf(q) : -1;
    if (at < 0) { p.textContent = text; return p; }
    const mark = el('mark', null, q);
    mark.addEventListener('click', () => setCommentActive(true));
    p.append(text.slice(0, at), mark, text.slice(at + q.length));
    return p;
  };

  let current = S.scenes[0].id;
  let note = $('#preview-note');

  // Sidebar
  const sbScenes = $('#sb-scenes');
  S.scenes.forEach((scene) => {
    const row = el('button', 'sb-row sb-scene');
    row.dataset.scene = scene.id;
    row.append(el('span', null, scene.title));
    const dot = el('span', 'sdot'); dot.title = 'Done';
    row.append(dot);
    row.addEventListener('click', () => openScene(scene.id));
    sbScenes.append(row);
  });

  function setCommentActive(on) {
    document.querySelectorAll('#view-scene mark, .comment').forEach((n) => n.classList.toggle('active', on));
  }

  function openScene(id) {
    current = id;
    const scene = S.scenes.find((s) => s.id === id);
    $('#scene-title').textContent = scene.title;
    $('#scene-synopsis').textContent = scene.synopsis;
    $('#scene-chars').replaceChildren(...scene.chars.map((i) => {
      const c = S.characters[i];
      const chip = el('span', 'chip'); chip.title = c.role;
      chip.append(avatar(c), c.name);
      return chip;
    }));
    $('#scene-arcs').replaceChildren(...scene.arcs.map((i) => swatch(el('span', 'chip tag', S.arcs[i].name), S.arcs[i].color)));
    $('#scene-text').replaceChildren(...scene.paragraphs.map((t) => paragraph(t)));
    $('#scene-count').textContent = `Scene ${fmt(scene.words)}  ·  Chapter 1,492`;
    $('#version-words').textContent = `${fmt(scene.words)} words`;

    const comments = $('#comments');
    if (S.comment.scene === id) {
      const card = el('button', 'comment');
      card.append(el('q', null, S.comment.quote), S.comment.text);
      card.addEventListener('click', () => {
        setCommentActive(true);
        $('#view-scene mark')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      comments.replaceChildren(card);
    } else {
      comments.replaceChildren(el('p', 'no-comments', 'No comments yet. Select some text to add one.'));
    }
    document.querySelectorAll('.sb-scene').forEach((r) => r.setAttribute('aria-current', String(r.dataset.scene === id)));
    $('#view-scene .scroll').scrollTop = 0;
    setView('scene');
  }

  // Board, colored by arc.
  $('#board-cards').append(...S.scenes.map((scene) => {
    const card = swatch(el('button', 'card'), S.arcs[scene.arcs[0]].color);
    card.append(el('h5', null, scene.title), el('p', null, scene.synopsis));
    const foot = el('div', 'card-foot');
    scene.chars.slice(0, 4).forEach((i) => foot.append(avatar(S.characters[i])));
    if (scene.chars.length > 4) foot.append(el('span', null, ` +${scene.chars.length - 4}`));
    const meta = el('span', 'meta');
    if (S.comment.scene === scene.id) meta.append(el('span', null, '1 comment'));
    meta.append(el('span', null, `${fmt(scene.words)} words`));
    foot.append(meta);
    card.append(foot);
    card.setAttribute('aria-label', `${scene.title}, done, ${scene.words} words. Open scene.`);
    card.addEventListener('click', () => openScene(scene.id));
    return card;
  }));

  // Manuscript: typeset as a book. No indent on a scene's first paragraph, a centered asterism between scenes.
  const book = $('#book'), rail = $('#rail-scenes');
  const label = el('p', 'ch-label', 'CHAPTER ONE'); label.id = 'book-ch';
  book.append(label);
  S.scenes.forEach((scene, si) => {
    if (si) book.append(el('p', 'break', '⁂'));
    scene.paragraphs.forEach((t, pi) => {
      const p = paragraph(t, pi ? null : 'first', false);
      if (!pi) { p.id = `book-${scene.id}`; p.dataset.scene = scene.id; }
      book.append(p);
    });
    const link = el('a', 'sub', scene.title);
    link.href = `#book-${scene.id}`; link.dataset.target = `book-${scene.id}`;
    rail.append(link);
  });
  const bookScroll = $('#book-scroll');
  const railLinks = [...document.querySelectorAll('.rail a')];
  railLinks.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    bookScroll.scrollTo({ top: target.offsetTop - 24, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  const spy = () => {
    const y = bookScroll.scrollTop + 60;
    let on = railLinks[0];
    railLinks.forEach((a) => { if (document.getElementById(a.dataset.target).offsetTop <= y) on = a; });
    railLinks.forEach((a) => a.classList.toggle('on', a === on || (a.classList.contains('rail-ch'))));
  };
  bookScroll.addEventListener('scroll', spy, { passive: true });

  // Page tabs
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const notes = {
    scene: 'Pick a scene in the sidebar, or click the highlighted phrase to find its comment.',
    board: 'Each chapter is a column. Click a card to open its scene.',
    book: 'The whole draft, set as a book. The contents rail follows along.',
  };
  function setView(view, focus) {
    tabs.forEach((t) => {
      const on = t.dataset.view === view;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    note.textContent = notes[view];
    if (view === 'book') spy();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setView(t.dataset.view));
    t.addEventListener('keydown', (e) => {
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      setView(tabs[(n + tabs.length) % tabs.length].dataset.view, true);
    });
  });

  openScene(current);
  note.textContent = 'Pick a scene in the sidebar, or step back to the board.';
  // ?view=board or ?view=book opens that page directly.
  const start = new URLSearchParams(location.search).get('view');
  if (start === 'board' || start === 'book') setView(start);
})();
