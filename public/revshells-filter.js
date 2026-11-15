/* Language filter and search for /revshells/.
   Progressive enhancement: the page ships every shell as plain HTML (<section class="rs-lang"> per language, <div class="rs-item"> per shell).
   This script only adds a toolbar and toggles `hidden` on items, languages and jump chips, so Copy and the LHOST / LPORT fields (public/copy-code.js)
   keep working on whatever is visible. Without JS the full list shows. No network, no storage. The pure helpers are also exported for tests (module.exports). */
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

  var api = { norm: norm, matches: matches, countText: countText };
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
      var group = { el: sec, lang: lang, label: chip ? chip.textContent : h2 ? h2.textContent : lang, chip: chip || null, items: [] };
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

    function apply() {
      var shown = 0;
      var anyVisible = false;
      langs.forEach(function (g) {
        var visibleItems = 0;
        g.items.forEach(function (it) {
          var ok = matches(it, state);
          it.el.hidden = !ok;
          if (ok) {
            visibleItems++;
            if (!it.off) shown++;
          }
        });
        g.el.hidden = !visibleItems;
        if (g.chip) g.chip.hidden = !visibleItems;
        if (visibleItems) anyVisible = true;
      });
      count.textContent = countText(shown, total);
      empty.hidden = anyVisible;
    }

    var timer = 0;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = search.value;
        apply();
      }, 120);
    });
    select.addEventListener('change', function () {
      state.lang = select.value;
      apply();
    });
    function clearAll() {
      clearTimeout(timer);
      state = { q: '', lang: '' };
      search.value = '';
      select.value = '';
      apply();
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
      /* the list stays as served */
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
