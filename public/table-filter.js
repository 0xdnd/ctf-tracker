/* Search, filter and sort for the static machine list tables (/machines/ and the certification list pages).
   Progressive enhancement: the pages ship complete tables; this script only adds a toolbar and toggles `hidden` on rows,
   headings and jump chips. Rows carry data-name, data-os, data-difficulty, data-platform and data-tags (cleaned tags joined by "|").
   Two URL parameters are read on load, never written: ?tag=<tag> preselects the Tag filter (the tag links on the site point there) and
   ?q=<text> fills the search box (the 404 page's search points there); without them nothing changes. No network, no storage. The pure helpers at the top are also exported for tests (module.exports). */
(function () {
  'use strict';

  var DIFFICULTY_ORDER = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
  // Above this many distinct tags, tags used by one machine only are left out of the Tag select (search still finds them).
  var TAG_LIST_LIMIT = 80;

  // Lowercase, separators (-, _, /) as one space: "SQL-Injection" and "sql injection" compare equal.
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseTags(s) {
    return s ? String(s).split('|').filter(Boolean) : [];
  }

  // row: { name, os, difficulty, platform, tags[] }. A row gets its search text once, as `hay`.
  function makeRow(data, idx) {
    var tags = parseTags(data.tags);
    return {
      name: data.name || '',
      os: data.os || '',
      difficulty: data.difficulty || '',
      platform: data.platform || '',
      tags: tags,
      tagKeys: tags.map(norm),
      hay: norm((data.name || '') + ' ' + tags.join(' ')),
      idx: idx,
    };
  }

  // state: { q, os, difficulty, platform, tag } - empty string means "any".
  function matches(row, state) {
    if (state.os && row.os !== state.os) return false;
    if (state.difficulty && row.difficulty !== state.difficulty) return false;
    if (state.platform && row.platform !== state.platform) return false;
    if (state.tag && row.tagKeys.indexOf(norm(state.tag)) === -1) return false;
    var q = norm(state.q);
    return !q || row.hay.indexOf(q) !== -1;
  }

  function diffRank(d) {
    var i = DIFFICULTY_ORDER.indexOf(d);
    return i === -1 ? DIFFICULTY_ORDER.length : i;
  }

  function byName(a, b) {
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) || a.idx - b.idx;
  }

  // Returns a new array; the sort is stable on source order. mode: "" (source order), "name-asc", "name-desc", "difficulty".
  function sortRows(rows, mode) {
    var out = rows.slice();
    if (mode === 'name-asc') out.sort(byName);
    else if (mode === 'name-desc') out.sort(function (a, b) { return -byName(a, b) || a.idx - b.idx; });
    else if (mode === 'difficulty') out.sort(function (a, b) { return diffRank(a.difficulty) - diffRank(b.difficulty) || a.idx - b.idx; });
    else out.sort(function (a, b) { return a.idx - b.idx; });
    return out;
  }

  // Distinct values of one field, sorted. field: "os" | "difficulty" | "platform". Difficulty keeps the easiest-first order.
  function distinct(rows, field) {
    var seen = {};
    var out = [];
    rows.forEach(function (r) {
      var v = r[field];
      if (v && !seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    });
    return field === 'difficulty'
      ? out.sort(function (a, b) { return diffRank(a) - diffRank(b) || a.localeCompare(b); })
      : out.sort(function (a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
  }

  // Tags for the Tag select: every tag on the page, or only those on two or more machines when the page has many.
  function tagOptions(rows) {
    var counts = {};
    var label = {};
    rows.forEach(function (r) {
      r.tags.forEach(function (t, i) {
        var k = r.tagKeys[i];
        counts[k] = (counts[k] || 0) + 1;
        if (!label[k]) label[k] = t;
      });
    });
    var keys = Object.keys(counts);
    if (keys.length > TAG_LIST_LIMIT) keys = keys.filter(function (k) { return counts[k] > 1; });
    return keys
      .map(function (k) { return label[k]; })
      .sort(function (a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
  }

  // The tag as the rows spell it (compared with norm) when some row carries it, else "". Used to preselect the Tag filter from ?tag=.
  function findTag(rows, wanted) {
    var k = norm(wanted);
    if (!k) return '';
    for (var i = 0; i < rows.length; i++) {
      var at = rows[i].tagKeys.indexOf(k);
      if (at !== -1) return rows[i].tags[at];
    }
    return '';
  }

  // Difficulty sort is only useful when some table mixes difficulties (on the grouped pages difficulty is the heading).
  function mixesDifficulty(groups) {
    return groups.some(function (rows) {
      return distinct(rows, 'difficulty').length > 1;
    });
  }

  function countText(shown, total) {
    return 'Showing ' + shown + ' of ' + total + ' machines';
  }

  var api = { norm: norm, makeRow: makeRow, matches: matches, sortRows: sortRows, distinct: distinct, tagOptions: tagOptions, findTag: findTag, mixesDifficulty: mixesDifficulty, countText: countText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function init() {
    var main = document.getElementById('main') || document.body;
    var tables = main.querySelectorAll('table.list');
    var groups = []; // one per table: { table, body, heading, rows: [{ el, ...row }] }
    var all = [];
    var idx = 0;
    for (var i = 0; i < tables.length; i++) {
      var body = tables[i].tBodies[0];
      if (!body) continue;
      var group = { table: tables[i], body: body, heading: null, rows: [] };
      var prev = tables[i].previousElementSibling;
      if (prev && /^H[23]$/.test(prev.tagName)) group.heading = prev;
      for (var j = 0; j < body.rows.length; j++) {
        var tr = body.rows[j];
        if (tr.getAttribute('data-name') == null) continue;
        var row = makeRow({ name: tr.getAttribute('data-name'), os: tr.getAttribute('data-os'), difficulty: tr.getAttribute('data-difficulty'), platform: tr.getAttribute('data-platform'), tags: tr.getAttribute('data-tags') }, idx++);
        row.el = tr;
        group.rows.push(row);
        all.push(row);
      }
      if (group.rows.length) groups.push(group);
    }
    if (!all.length) return;

    // Where the toolbar goes: before the first list section (its heading and, when it has one, the h2 above that).
    var anchor = groups[0].heading || groups[0].table;
    var above = anchor.previousElementSibling;
    if (anchor.tagName === 'H3' && above && above.tagName === 'H2') anchor = above;

    // An h2 that directly introduces list sections (the platform headings on /machines/) hides with them.
    groups.forEach(function (g) {
      var n = g.table.previousElementSibling;
      while (n && n.tagName !== 'H2') n = n.previousElementSibling;
      g.section = n;
    });

    var state = { q: '', os: '', difficulty: '', platform: '', tag: '' };
    var sortMode = '';
    var fields = {};
    var uid = 'tf';

    function field(key, labelText, control, cls) {
      var wrap = el('div', { class: 'tf-field' + (cls ? ' ' + cls : '') });
      control.id = uid + '-' + key;
      wrap.appendChild(el('label', { for: control.id }, labelText));
      wrap.appendChild(control);
      fields[key] = control;
      return wrap;
    }
    function select(options, anyLabel) {
      var s = el('select');
      s.appendChild(el('option', { value: '' }, anyLabel));
      options.forEach(function (o) {
        var opt = el('option', null, o.label || o);
        opt.value = o.value || o;
        s.appendChild(opt);
      });
      return s;
    }

    var toolbar = el('div', { class: 'tf', role: 'search', 'aria-label': 'Search and filter machines' });
    var controls = el('div', { class: 'tf-controls' });
    var search = el('input', { type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder: 'Name or tag' });
    controls.appendChild(field('q', 'Search', search, 'tf-search'));
    var filterDefs = [['os', 'OS', 'All OS'], ['difficulty', 'Difficulty', 'All difficulties'], ['platform', 'Platform', 'All platforms']];
    filterDefs.forEach(function (d) {
      var opts = distinct(all, d[0]);
      if (d[0] === 'platform' ? opts.length > 1 : opts.length > 0) controls.appendChild(field(d[0], d[1], select(opts, d[2])));
    });
    var tags = tagOptions(all);
    if (tags.length) controls.appendChild(field('tag', 'Tag', select(tags, 'All tags')));
    var sortOptions = [{ value: 'name-asc', label: 'Name A-Z' }, { value: 'name-desc', label: 'Name Z-A' }];
    if (mixesDifficulty(groups.map(function (g) { return g.rows; }))) sortOptions.push({ value: 'difficulty', label: 'Difficulty, easiest first' });
    controls.appendChild(field('sort', 'Sort', select(sortOptions, 'Default order')));
    var reset = el('button', { type: 'button', class: 'btn btn-secondary btn-sm tf-reset' }, 'Reset');
    controls.appendChild(reset);
    toolbar.appendChild(controls);
    var count = el('p', { class: 'tf-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, countText(all.length, all.length));
    toolbar.appendChild(count);
    var empty = el('div', { class: 'tf-empty', hidden: '' });
    empty.appendChild(el('p', null, 'No machines match your search and filters.'));
    var clear = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Clear search and filters');
    empty.appendChild(clear);
    toolbar.appendChild(empty);
    anchor.parentNode.insertBefore(toolbar, anchor);

    var chipLinks = [];
    var links = main.querySelectorAll('.chips a[href^="#"]');
    for (var c = 0; c < links.length; c++) {
      var id = decodeURIComponent(links[c].getAttribute('href').slice(1));
      var target = id && document.getElementById(id);
      if (target && /^H[23]$/.test(target.tagName)) chipLinks.push({ a: links[c], target: target });
    }

    function applyFilters() {
      var shown = 0;
      var secEls = [];
      var secVisible = [];
      groups.forEach(function (g) {
        var visible = 0;
        g.rows.forEach(function (r) {
          var ok = matches(r, state);
          if (r.el.hidden === ok) r.el.hidden = !ok;
          if (ok) visible++;
        });
        shown += visible;
        g.table.hidden = !visible;
        if (g.heading) g.heading.hidden = !visible;
        if (g.section) {
          var at = secEls.indexOf(g.section);
          if (at === -1) at = secEls.push(g.section) - 1;
          secVisible[at] = (secVisible[at] || 0) + visible;
        }
      });
      secEls.forEach(function (h, k) {
        h.hidden = !secVisible[k];
        // A one-line intro right under the heading (class sec-note) goes with it.
        var intro = h.nextElementSibling;
        if (intro && intro.className === 'sec-note') intro.hidden = h.hidden;
      });
      chipLinks.forEach(function (l) { l.a.hidden = l.target.hidden; });
      // A chip row whose links are all gone hides too, with a heading that only introduces it ("Jump to difficulty").
      var rowsSeen = [];
      chipLinks.forEach(function (l) {
        var box = l.a.parentNode;
        if (rowsSeen.indexOf(box) !== -1) return;
        rowsSeen.push(box);
        var anyShown = false;
        for (var k = 0; k < box.children.length; k++) if (!box.children[k].hidden) anyShown = true;
        box.hidden = !anyShown;
        var h = box.previousElementSibling;
        if (h && /^H[23]$/.test(h.tagName) && !h.getAttribute('id')) h.hidden = !anyShown;
      });
      count.textContent = countText(shown, all.length);
      empty.hidden = shown !== 0;
    }

    function applySort() {
      groups.forEach(function (g) {
        sortRows(g.rows, sortMode).forEach(function (r) { g.body.appendChild(r.el); });
      });
    }

    var timer = 0;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = search.value;
        applyFilters();
      }, 120);
    });
    ['os', 'difficulty', 'platform', 'tag'].forEach(function (k) {
      var s = fields[k];
      if (s) s.addEventListener('change', function () { state[k] = s.value; applyFilters(); });
    });
    fields.sort.addEventListener('change', function () {
      sortMode = fields.sort.value;
      applySort();
    });
    function clearAll() {
      clearTimeout(timer);
      state = { q: '', os: '', difficulty: '', platform: '', tag: '' };
      sortMode = '';
      search.value = '';
      Object.keys(fields).forEach(function (k) { fields[k].value = ''; });
      applyFilters();
      applySort();
    }
    // ?tag=<tag> preselects the Tag filter. A tag used by one machine only is not in the select on big pages, so its option is added.
    var wanted = '';
    var wantedQ = '';
    try {
      var params = new URLSearchParams(location.search);
      wanted = params.get('tag') || '';
      wantedQ = (params.get('q') || '').slice(0, 100);
    } catch {
      wanted = '';
      wantedQ = '';
    }
    var wantedLabel = wanted && fields.tag ? findTag(all, wanted) : '';
    if (wantedLabel) {
      var sel = fields.tag;
      var at = -1;
      for (var o = 1; o < sel.options.length; o++) if (norm(sel.options[o].value) === norm(wantedLabel)) at = o;
      if (at === -1) {
        var extra = el('option', null, wantedLabel);
        extra.value = wantedLabel;
        var before = null;
        for (var p = 1; p < sel.options.length && !before; p++) if (sel.options[p].value.localeCompare(wantedLabel, 'en', { sensitivity: 'base' }) > 0) before = sel.options[p];
        sel.insertBefore(extra, before);
        sel.value = wantedLabel;
        state.tag = wantedLabel;
      } else {
        sel.selectedIndex = at;
        state.tag = sel.options[at].value;
      }
      applyFilters();
    }
    // ?q=<text> fills the search box and filters on it, together with any ?tag=.
    if (wantedQ.trim()) {
      search.value = wantedQ;
      state.q = wantedQ;
      applyFilters();
    }
    reset.addEventListener('click', clearAll);
    clear.addEventListener('click', function () {
      clearAll();
      search.focus();
    });
  }

  function start() {
    try {
      init();
    } catch {
      /* the tables stay as served */
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
