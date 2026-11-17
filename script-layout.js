// A play laid out on printed pages, as the app's Script page shows it: a port of the app's Core/ScriptFormat.swift
// (the US submission format) and Core/ScriptLayout.swift (the breaking rules), for the elements the sample play uses.
// Courier is monospaced, so lines break by counting characters, exactly as the app breaks them.
(() => {
  const inch = 72;
  const F = {
    paperWidth: 8.5 * inch, paperHeight: 11 * inch,
    marginTop: inch, marginBottom: inch, marginLeft: 1.5 * inch, marginRight: inch,
    fontSize: 12, advance: 7.2, lineHeight: 13.6, pageNumberTop: 0.5 * inch,
    centre: 8.5 * inch / 2, titleTop: 3.75 * inch, titleGap: 2, characterDescriptionLeft: 1.5 * inch + 2.5 * inch,
  };
  F.textLeft = F.marginLeft;
  F.textRight = F.paperWidth - F.marginRight;
  F.rows = Math.floor((F.paperHeight - F.marginTop - F.marginBottom) / F.lineHeight + 1e-9);
  const L = F.textLeft, R = F.textRight;
  const style = (o) => Object.assign({ left: L, right: R, align: 'left', hang: 0, before: 0, after: 0, caps: false, underline: false, wrap: null }, o);
  const S = {
    name: style({ align: 'center', before: 1, caps: true }),
    dialogue: style({}),
    parenthetical: style({ left: 3.5 * inch, hang: 1, wrap: ['(', ')'] }),
    direction: style({ left: 3 * inch, hang: 1, before: 1, after: 1, wrap: ['(', ')'] }),
    transition: style({ align: 'right', before: 1, after: 1, caps: true }),
    verse: style({ hang: 2 }),
    lyric: style({ left: L + 0.5 * inch, hang: 2, caps: true }),
    heading: style({ align: 'center', before: 1, after: 1 }),
    actHeading: style({ align: 'center', caps: true, underline: true }),
    actTitle: style({ align: 'center' }),
    sceneHeading: style({ align: 'center', after: 1, underline: true }),
    sceneTitle: style({ align: 'center', after: 1 }),
    endOfPlay: style({ align: 'center', before: 2, caps: true }),
    titleLine: style({ align: 'center' }),
    frontHeading: style({ align: 'center', after: 1, underline: true }),
    characterEntry: style({ before: 1 }),
    settingLine: style({ align: 'center' }),
  };
  const roman = (n) => {
    const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
    return s;
  };
  const cells = (left, right) => Math.max(1, Math.floor((right - left) / F.advance + 1e-6));

  // An item: a paragraph before it is broken into lines. `spans` are italic runs as [start, length] in the text.
  function item(kind, text, st, spans = []) {
    let t = text.replace(/[\t\n\v\f\r\x85\u2028\u2029]/g, ' ');
    if (st.caps) t = t.toUpperCase();
    const lead = t.length - t.replace(/^ +/, '').length;
    t = t.trim().replace(/ +$/, '');
    spans = spans.map(([a, n]) => [a - lead, n]);
    const hasText = /\S/.test(t);
    let italic = spans;
    if (st.wrap && t && !((t.startsWith(st.wrap[0]) && t.endsWith(st.wrap[1])) || (t.startsWith('[') && t.endsWith(']')))) {
      t = st.wrap[0] + t + st.wrap[1];
      italic = spans.map(([a, n]) => [a + 1, n]);
    }
    let firstLeft, left, right;
    if (st.align === 'left') { firstLeft = st.left; left = st.left + st.hang * F.advance; right = st.right; }
    else if (st.align === 'center') {
      const half = Math.max(F.advance, Math.min(F.centre - st.left, st.right - F.centre));
      firstLeft = left = F.centre - half; right = F.centre + half;
    } else { firstLeft = left = st.left; right = st.right; }
    return { kind, text: t, italic, firstLeft, left, right, align: st.align, before: st.before, after: st.after,
             underline: st.underline, inSpeech: false, speaker: null, hasText, scene: null };
  }

  // Lines of at most `first` characters, then `rest`: each ends at the last space that lets it fit (spaces there belong to
  // no line), or at the line's width when one word is longer than the line. Returns [start, end] pairs.
  function breakLines(text, first, rest) {
    const out = [];
    let i = 0;
    const n = text.length;
    while (i < n && text[i] === ' ') i++;
    while (i < n) {
      const width = out.length ? rest : first;
      if (n - i <= width) { out.push([i, n]); break; }
      let cut = -1;
      for (let j = i + width; j > i; j--) if (text[j] === ' ') { cut = j; break; }
      let end, next;
      if (cut > i) { end = cut; while (end > i && text[end - 1] === ' ') end--; next = cut; }
      else { end = i + width; next = end; }
      out.push([i, end]);
      i = next;
      while (i < n && text[i] === ' ') i++;
    }
    return out;
  }
  const laid = (it) => breakLines(it.text, cells(it.firstLeft, it.right), cells(it.left, it.right));

  // Where a line of `it` sits across the page.
  function lineX(it, k, len) {
    const w = len * F.advance;
    if (it.align === 'center') return (it.left + it.right) / 2 - w / 2;
    if (it.align === 'right') return it.right - w;
    return k === 0 ? it.firstLeft : it.left;
  }

  function Paginator(kind, emit) {
    const p = { blocks: [], row: 0, blankAfterLast: 0, number: 0, act: null, scene: null, pageAct: null, pageScene: null, speaker: null };
    const atTop = () => p.blocks.length === 0;
    function flush() {
      if (!p.blocks.length) return;
      const page = { kind, lines: p.blocks.flat() };
      if (kind === 'script') {
        p.number += 1;
        page.number = p.number;
        page.act = p.pageAct; page.scene = p.pageScene;
        page.label = p.pageAct != null && p.pageScene != null ? `${roman(p.pageAct)}-${p.pageScene}-${p.number}` : `${p.number}.`;
      }
      emit(page);
      p.blocks = []; p.row = 0; p.blankAfterLast = 0;
      p.pageAct = p.act; p.pageScene = p.scene;
    }
    function block(it, lines, from, to, firstRow) {
      const out = [];
      for (let k = from; k < to; k++) {
        const [a, b] = lines[k];
        out.push({ row: firstRow + (k - from), x: lineX(it, k, b - a), text: it.text.slice(a, b), start: a, item: it });
      }
      out.kind = it.kind;
      return out;
    }
    function append(b, after) { p.blocks.push(b); p.row = b[0].row + b.length; p.blankAfterLast = after; }
    function newPage(continuing) {
      flush();
      if (!continuing || !p.speaker) return;
      const it = item('continuedName', `${p.speaker} (Cont.)`, Object.assign({}, S.name, { caps: false }));
      const lines = laid(it);
      if (lines.length < F.rows) append(block(it, lines, 0, lines.length, 0), 0);
    }
    const keepsWithNext = (b) => ['actHeading', 'actTitle', 'sceneHeading', 'sceneTitle', 'heading', 'characterName', 'continuedName'].includes(b.kind);
    const gap = (a, b) => b.inSpeech ? 0 : Math.max(a.after, b.before);
    const splits = (k) => k === 'dialogue' || k === 'direction' || k === 'settingLine' || k === 'heading';
    function heads(items, counts) {
      const need = items.map(() => 1);
      for (let i = items.length - 1; i >= 0; i--) {
        const lines = counts[i], j = i + 1 < items.length ? i + 1 : null, k = items[i].kind;
        if (k === 'characterName') need[i] = lines + (j != null && (items[j].inSpeech || items[j].kind === 'characterName') ? need[j] : 0);
        else if (k === 'parenthetical' && items[i].inSpeech) need[i] = lines + (j != null && items[j].inSpeech && items[j].kind === 'dialogue' ? 1 : 0);
        else if (['verse', 'lyric', 'parenthetical', 'transition', 'endOfPlay', 'characterEntry', 'continuedName'].includes(k)) need[i] = lines;
        else if (['actHeading', 'actTitle', 'sceneHeading', 'sceneTitle', 'heading', 'frontHeading'].includes(k)) need[i] = lines + (j != null ? gap(items[i], items[j]) + need[j] : 0);
        else need[i] = 1;
      }
      return need;
    }
    return {
      begin(act, scene, fresh) {
        p.act = act; p.scene = scene; p.speaker = null;
        if (fresh) flush();
        if (atTop()) { p.pageAct = act; p.pageScene = scene; }
      },
      finish: flush,
      place(items) {
        const all = items.map(laid);
        const need = heads(items, all.map((l) => l.length));
        items.forEach((it, i) => {
          const lines = all[i];
          if (it.kind === 'characterName') p.speaker = it.speaker; else if (!it.inSpeech) p.speaker = null;
          let g = atTop() ? 0 : (it.inSpeech ? 0 : Math.max(p.blankAfterLast, it.before));
          if (!atTop() && p.row + g + need[i] > F.rows && !(p.blocks.every(keepsWithNext) && p.row + g < F.rows)) { newPage(it.inSpeech); g = 0; }
          let start = 0, blank = g;
          while (start < lines.length) {
            const free = F.rows - (p.row + blank), left = lines.length - start;
            if (left <= free) { append(block(it, lines, start, lines.length, p.row + blank), it.after); break; }
            const alone = atTop() || (p.blocks.length === 1 && p.blocks[0].kind === 'continuedName');
            if (free > 0 && (splits(it.kind) || alone)) { append(block(it, lines, start, start + free, p.row + blank), it.after); start += free; }
            newPage(it.inSpeech);
            blank = 0;
          }
        });
      },
    };
  }

  // A scene's paragraphs as items: [role, text, italics] with n name, d dialogue, p parenthetical, s direction, t transition.
  function sceneItems(paragraphs, sceneIndex) {
    const out = [];
    let speaker = null;
    paragraphs.forEach(([role, text, spans = []], index) => {
      let it;
      if (role === 'n') {
        let name = text.trim().toUpperCase();
        if (name.length > 1 && name.endsWith('.')) name = name.slice(0, -1);
        speaker = name;
        it = item('characterName', name, S.name);
      } else if (role === 'd') { it = item('dialogue', text, S.dialogue, spans); it.inSpeech = speaker != null; }
      else if (role === 'p') { it = item('parenthetical', text, S.parenthetical, spans); it.inSpeech = speaker != null; }
      else if (role === 'v') { it = item('verse', text, S.verse, spans); it.inSpeech = speaker != null; }
      else if (role === 'l') { it = item('lyric', text, S.lyric, spans); it.inSpeech = speaker != null; }
      else if (role === 't') it = item('transition', text, S.transition, spans);
      else if (role === 'h') it = item('heading', text, S.heading, spans);
      else it = item('direction', text, S.direction, spans);
      if (!it.inSpeech && role !== 'n') speaker = null;
      it.speaker = it.kind === 'characterName' || it.inSpeech ? speaker : null;
      it.scene = sceneIndex;
      it.paragraph = index;
      if (it.hasText) out.push(it);
    });
    return out;
  }

  // "Key: value" lines, a line with no key continuing the entry above (the app's FrontMatterNote).
  function frontNote(lines) {
    const keys = ['title', 'credit', 'author', 'authors', 'source', 'draft date', 'date', 'contact', 'copyright', 'notes', 'subtitle', 'genre', 'setting', 'place', 'time'];
    const map = {};
    let current = null;
    for (const line of lines) {
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (m && keys.includes(m[1].trim().toLowerCase())) { current = m[1].trim().toLowerCase(); map[current] = m[2] ? [m[2]] : []; }
      else if (current) map[current].push(line);
    }
    return map;
  }

  // Every page of the play: the title page, the characters page, the setting and time page, then the script.
  function layOut(play) {
    const pages = [];
    const emit = (page) => pages.push(page);
    const note = frontNote(play.titlePage || []);
    // Title page.
    {
      const lines = [];
      let row = Math.min(F.rows - 1, Math.max(0, Math.floor((F.titleTop - F.marginTop) / F.lineHeight + 1e-9))), lastEnd = null;
      const centred = [play.title, (note.subtitle || []).join(' '), `by ${(note.author || ['']).join(' ')}`].filter((t) => t.trim() && t !== 'by ');
      centred.forEach((text, i) => {
        if (i > 0) row = lastEnd + F.titleGap;
        const it = item('title', text, S.titleLine), ls = laid(it);
        ls.forEach(([a, b], k) => lines.push({ row: row + k, x: lineX(it, k, b - a), text: it.text.slice(a, b), item: it }));
        lastEnd = row + ls.length;
      });
      emit({ kind: 'title', lines });
    }
    // Characters page.
    const front = Paginator('characters', emit);
    const people = play.characters.map((c) => ({ name: c.name.trim(), description: (c.role || '').trim() })).filter((c) => c.name);
    if (people.length) {
      const column = cells(F.textLeft, F.characterDescriptionLeft);
      const items = [item('frontHeading', 'CHARACTERS', S.frontHeading)];
      for (const c of people) {
        const name = c.name.toUpperCase();
        let text = name;
        if (c.description) text += ':' + ' '.repeat(Math.max(1, column - name.length - 1)) + c.description;
        const it = item('characterEntry', text, S.characterEntry);
        it.left = F.characterDescriptionLeft;
        items.push(it);
      }
      front.place(items);
      front.finish();
    }
    // Setting and time page.
    const setting = note.setting || note.place || [];
    const time = (note.time || []).join(' ');
    if (setting.length || time) {
      const pg = Paginator('setting', emit), items = [];
      if (setting.length) { items.push(item('frontHeading', 'Setting', S.frontHeading)); setting.forEach((s) => items.push(item('settingLine', s, S.settingLine))); }
      if (time) {
        const h = item('frontHeading', 'Time', S.frontHeading);
        if (items.length) h.before = 1;
        items.push(h, item('settingLine', time, S.settingLine));
      }
      pg.place(items);
      pg.finish();
    }
    // The script.
    const script = Paginator('script', emit);
    const starts = [];
    let sceneIndex = 0, any = false;
    play.acts.forEach((act, a) => {
      let opened = false;
      act.scenes.forEach((scene, s) => {
        const items = sceneItems(scene.paragraphs, sceneIndex++);
        if (!items.length) return;
        script.begin(a + 1, s + 1, true);
        const heads = [];
        if (!opened) {
          heads.push(item('actHeading', `ACT ${roman(a + 1)}`, S.actHeading));
          if (act.title) heads.push(item('actTitle', act.title, S.actTitle));
        }
        heads.push(item('sceneHeading', `Scene ${s + 1}`, S.sceneHeading));
        if (scene.title) heads.push(item('sceneTitle', scene.title, S.sceneTitle));
        const before = pages.length;
        script.place(heads.concat(items));
        starts.push({ act: a, scene: s, id: scene.id, page: before });
        opened = true;
        any = true;
      });
    });
    if (any) script.place([item('endOfPlay', 'END OF PLAY', S.endOfPlay)]);
    script.finish();
    // A start's page is the first page emitted after the scene began (scenes start pages of their own).
    const firstScript = pages.findIndex((p) => p.kind === 'script');
    starts.forEach((st) => { st.index = st.page; st.number = pages[st.page].number; });
    const sceneStarts = starts.map((s) => s.number);
    const last = pages[pages.length - 1].number;
    const sceneId = [];
    play.acts.forEach((act) => act.scenes.forEach((sc) => sceneId.push(sc.id)));
    const pagesInScene = {};
    starts.forEach((st, i) => { pagesInScene[st.id] = (i + 1 < starts.length ? sceneStarts[i + 1] : last + 1) - st.number; });
    return { format: F, pages, starts, firstScript, total: last, pagesInScene };
  }

  // "about 1 h 45 min": whole minutes under ten, else to the nearest five (a page plays for about a minute).
  function runningTime(pages) {
    const m = pages >= 10 ? Math.floor((pages + 2) / 5) * 5 : Math.max(0, pages);
    const h = Math.floor(m / 60), rest = m % 60;
    if (h === 0) return `about ${rest} min`;
    return rest === 0 ? `about ${h} h` : `about ${h} h ${rest} min`;
  }

  const api = { layOut, runningTime, format: F, roman };
  if (typeof window !== 'undefined') window.ScriptLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
