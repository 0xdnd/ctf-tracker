/* Language filter, search and paging for /revshells/.
   Progressive enhancement: the page ships every shell as plain HTML (<section class="rs-lang"> per language, <div class="rs-item"> per shell).
   This script only adds a toolbar and toggles `hidden` on items, languages and jump chips, so Copy and the LHOST / LPORT fields (public/copy-code.js)
   keep working on whatever is visible. Shells are paged PAGE_SIZE at a time on the same URL (a shell is never split, "Unavailable" entries take no slot).
   Without JS the full list shows. No network, no storage. The pure helpers are also exported for tests (module.exports). */
(function () {
  'use strict';

  // Lowercase, whitespace collapsed. "Nc  -E" and "nc -e" compare equal.
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // item: { hay, lang }. state: { q, lang } - empty string means "any". Every word of q must appear in hay (substring).
  function matches(item, state) {
    if (state.lang && item.lang !== state.lang) return false;
    var words = norm(state.q).split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++) if (item.hay.indexOf(words[i]) === -1) return false;
    return true;
  }

  function countText(shown, total) {
    return 'Showing ' + shown + ' of ' + total + ' shells';
  }

  var PAGE_SIZE = 20; // shells per page

  // total counted shells, 1-based page (clamped into range). start/end are 1-based shell numbers on that page (0 when there are none).
  function pageSlice(total, page, size) {
    var pages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(pages, Math.max(1, Math.floor(Number(page)) || 1));
    return { page: p, pages: pages, start: total ? (p - 1) * size + 1 : 0, end: Math.min(total, p * size) };
  }

  // 1-based page that holds the shell at 0-based position index among the counted shells.
  function pageOf(index, size) {
    return Math.floor(index / size) + 1;
  }

  function rangeText(start, end, total) {
    return 'Showing ' + start + '-' + end + ' of ' + total + ' shells';
  }

  var api = { norm: norm, matches: matches, countText: countText, pageSlice: pageSlice, pageOf: pageOf, rangeText: rangeText, PAGE_SIZE: PAGE_SIZE };
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
    var sections = main.querySelectorAll('section.rs-lang');
    if (!sections.length) return;

    var chips = main.querySelector('.chips');
    var chipByLang = {};
    if (chips) {
      var anchors = chips.querySelectorAll('a[href^="#"]');
      for (var a = 0; a < anchors.length; a++) chipByLang[anchors[a].getAttribute('href').slice(1)] = anchors[a];
    }

    var langs = []; // { el, lang, label, chip, items: [{ el, hay, lang, off }] }
    var total = 0; // shells with a command; entries marked data-off ("Unavailable") are searched but not counted
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      var lang = sec.getAttribute('data-lang') || '';
      var h2 = sec.querySelector('h2');
      var chip = chipByLang[lang];
      var group = { el: sec, h2: h2, h2Text: h2 ? h2.textContent : '', lang: lang, label: chip ? chip.textContent : h2 ? h2.textContent : lang, chip: chip || null, items: [] };
      var nodes = sec.querySelectorAll('.rs-item');
      for (var j = 0; j < nodes.length; j++) {
        // Name, category, platform and notes, plus every command as served (data-template is the copy script's untouched copy).
        var text = (h2 ? h2.textContent : '') + ' ' + ((nodes[j].querySelector('h3')||{}).textContent||'');
        var notes = nodes[j].querySelectorAll('p');
        for (var n = 0; n < notes.length; n++) text += ' ' + notes[n].textContent;
        var codes = nodes[j].querySelectorAll('code');
        for (var c = 0; c < codes.length; c++) text += ' ' + (codes[c].getAttribute('data-template') || codes[c].textContent);
        var off = nodes[j].hasAttribute('data-off');
        group.items.push({ el: nodes[j], hay: norm(text), lang: lang, off: off });
        if (!off) total++;
      }
      langs.push(group);
    }
    if (!total) return;

    var state = { q: '', lang: '' };
    var page = 1;
    var toolbar = el('div', { class: 'tf rs-filter', role: 'search', 'aria-label': 'Search and filter reverse shells' });
    var controls = el('div', { class: 'tf-controls' });

    var searchWrap = el('div', { class: 'tf-field tf-search' });
    searchWrap.appendChild(el('label', { for: 'rsf-q' }, 'Search shells'));
    var search = el('input', { id: 'rsf-q', type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder: 'Name, platform or command, e.g. mkfifo' });
    searchWrap.appendChild(search);
    controls.appendChild(searchWrap);

    var langWrap = el('div', { class: 'tf-field' });
    langWrap.appendChild(el('label', { for: 'rsf-lang' }, 'Language'));
    var select = el('select', { id: 'rsf-lang' });
    select.appendChild(el('option', { value: '' }, 'All languages'));
    langs.forEach(function (g) {
      var opt = el('option', null, g.label);
      opt.value = g.lang;
      select.appendChild(opt);
    });
    langWrap.appendChild(select);
    controls.appendChild(langWrap);

    var reset = el('button', { type: 'button', class: 'btn btn-secondary btn-sm tf-reset' }, 'Reset');
    controls.appendChild(reset);
    toolbar.appendChild(controls);
    var count = el('p', { class: 'tf-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, countText(total, total));
    toolbar.appendChild(count);
    var empty = el('div', { class: 'tf-empty', hidden: '' });
    empty.appendChild(el('p', null, 'No shells match your search and language.'));
    var clear = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Clear search and language');
    empty.appendChild(clear);
    toolbar.appendChild(empty);
    var anchorEl = chips || langs[0].el;
    anchorEl.parentNode.insertBefore(toolbar, anchorEl);

    // Pager: one above the list and one below it. Focus goes to the list heading (tabindex -1); "Page X of Y" is announced through the count line.
    var head = el('h2', { class: 'rs-list-head', id: 'rs-list-head', tabindex: '-1', hidden: '' }, 'Reverse shells');
    langs[0].el.parentNode.insertBefore(head, langs[0].el);
    var pagers = [];
    function makePager(where) {
      var nav = el('nav', { class: 'rs-pager', 'aria-label': 'Reverse shell pages (' + where + ')', hidden: '' });
      var prev = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Previous');
      var label = el('span', { class: 'rs-pager-label' });
      var next = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Next');
      nav.appendChild(prev);
      nav.appendChild(label);
      nav.appendChild(next);
      prev.addEventListener('click', function () { goPage(page - 1, true); });
      next.addEventListener('click', function () { goPage(page + 1, true); });
      pagers.push({ nav: nav, prev: prev, next: next, label: label });
      return nav;
    }
    langs[0].el.parentNode.insertBefore(makePager('top'), langs[0].el);
    var lastEl = langs[langs.length - 1].el;
    lastEl.parentNode.insertBefore(makePager('bottom'), lastEl.nextSibling);

    // ?page=N only while no filter is active; replaceState, so Back leaves the page. Dropping the hash keeps a reload on the same page.
    function syncUrl() {
      try {
        var u = new URL(location.href);
        var filtered = !!(state.q || state.lang);
        if (!filtered && page > 1) u.searchParams.set('page', String(page));
        else u.searchParams.delete('page');
        u.hash = '';
        history.replaceState(history.state, '', u.pathname + u.search);
      } catch {
        /* the page works without it */
      }
    }

    // opts.url === false: leave the address bar alone (hash navigation owns it).
    function apply(opts) {
      var counted = 0;
      var lastPage = 1;
      langs.forEach(function (g) {
        g.first = null;
        g.items.forEach(function (it) {
          it.ok = matches(it, state);
          if (!it.ok) return;
          if (!it.off) {
            it.page = pageOf(counted, PAGE_SIZE);
            lastPage = it.page;
            counted++;
          } else it.page = lastPage; // shown on the page of the shell before it, takes no slot
          if (!g.first) g.first = it;
        });
      });
      var sl = pageSlice(counted, page, PAGE_SIZE);
      page = sl.page;
      var anyVisible = false;
      langs.forEach(function (g) {
        var onPage = 0;
        g.items.forEach(function (it) {
          var show = it.ok && it.page === page;
          it.el.hidden = !show;
          if (show) onPage++;
        });
        g.el.hidden = !onPage;
        if (g.chip) g.chip.hidden = !g.first;
        if (g.first) anyVisible = true;
        if (g.h2) {
          var cont = onPage && g.first.page !== page ? ' (continued)' : '';
          if (g.h2.textContent !== g.h2Text + cont) g.h2.textContent = g.h2Text + cont;
        }
      });
      var multi = sl.pages > 1;
      count.textContent = multi ? rangeText(sl.start, sl.end, counted) + '. Page ' + page + ' of ' + sl.pages : countText(counted, total);
      empty.hidden = anyVisible;
      head.hidden = !multi;
      pagers.forEach(function (p) {
        p.nav.hidden = !multi;
        p.label.textContent = 'Page ' + page + ' of ' + sl.pages;
        p.prev.disabled = page <= 1;
        p.next.disabled = page >= sl.pages;
      });
      if (!opts || opts.url !== false) syncUrl();
    }

    function goPage(n, focus) {
      page = n;
      apply();
      if (focus) head.focus();
    }

    function bring(node) {
      if (node && node.scrollIntoView) node.scrollIntoView();
    }

    // Opens the page that holds the language's first match, then scrolls to its heading.
    function goToLang(lang) {
      var g = null;
      for (var k = 0; k < langs.length; k++) if (langs[k].lang === lang) g = langs[k];
      if (!g || !g.first) return false;
      if (g.first.page !== page) {
        page = g.first.page;
        apply({ url: false });
      }
      bring(g.h2 || g.el);
      return true;
    }
    function hashLang() {
      try {
        return decodeURIComponent(location.hash.slice(1));
      } catch {
        return '';
      }
    }
    Object.keys(chipByLang).forEach(function (l) {
      chipByLang[l].addEventListener('click', function () { goToLang(l); });
    });
    window.addEventListener('hashchange', function () {
      if (hashLang()) goToLang(hashLang());
    });

    var timer = 0;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = search.value;
        page = 1;
        apply();
      }, 120);
    });
    select.addEventListener('change', function () {
      state.lang = select.value;
      page = 1;
      apply();
    });
    function clearAll() {
      clearTimeout(timer);
      state = { q: '', lang: '' };
      search.value = '';
      select.value = '';
      page = 1;
      apply();
    }
    reset.addEventListener('click', clearAll);
    clear.addEventListener('click', function () {
      clearAll();
      search.focus();
    });

    // Start: ?page=N (clamped), then an outside #lang link wins over it.
    var m = /[?&]page=(\d+)/.exec(location.search);
    if (m) page = parseInt(m[1], 10);
    apply({ url: false });
    if (hashLang()) goToLang(hashLang());
  }

  function start() {
    try {
      init();
    } catch {
      /* the list stays as served */
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
