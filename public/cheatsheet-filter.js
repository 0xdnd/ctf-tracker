/* Filter box for /cheatsheet-library/.
   Progressive enhancement: the page ships every topic card as plain HTML (.hub-grid > .hubcard). This script adds a search box above the cards
   (same .tf field styles as the machine list toolbar) and toggles `hidden` on cards whose text (topic, count and command titles) misses a word of the query.
   Without JS the full grid shows. No network, no storage. The pure helpers are also exported for tests (module.exports). */
(function () {
  'use strict';

  // Lowercase, separators (-, _, /) as one space, whitespace collapsed: "Web-Fuzzing" and "web fuzzing" compare equal.
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Every word of q must appear in hay (substring); an empty q matches everything.
  function matches(hay, q) {
    var words = norm(q).split(' ').filter(Boolean);
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) === -1) return false;
    return true;
  }

  function countText(shown, total) {
    return shown === total ? total + ' cheatsheets' : 'Showing ' + shown + ' of ' + total + ' cheatsheets';
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
    var grid = document.querySelector('main .hub-grid');
    if (!grid) return;
    var cards = [].slice.call(grid.querySelectorAll('.hubcard')).map(function (c) {
      return { el: c, hay: norm(c.textContent + ' ' + (c.getAttribute('data-q') || '')) };
    });
    if (cards.length < 2) return;

    var input = el('input', { id: 'ch-q', type: 'search', autocomplete: 'off', spellcheck: 'false', placeholder: 'Topic or command, e.g. nmap or sudo' });
    var field = el('div', { class: 'tf-field tf-search' });
    field.appendChild(el('label', { for: 'ch-q' }, 'Filter the cheatsheets'));
    field.appendChild(input);
    var controls = el('div', { class: 'tf-controls' });
    controls.appendChild(field);
    var count = el('p', { class: 'tf-count', 'aria-live': 'polite' }, countText(cards.length, cards.length));
    var empty = el('p', { class: 'tf-empty', hidden: '' }, 'No cheatsheet matches that search. Clear the box to see all topics.');
    var bar = el('div', { class: 'tf', role: 'search', 'aria-label': 'Filter the cheatsheets' });
    bar.appendChild(controls);
    bar.appendChild(count);
    grid.parentNode.insertBefore(bar, grid);
    grid.parentNode.insertBefore(empty, grid.nextSibling);

    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = matches(c.hay, input.value);
        if (ok) shown++;
        if (ok) c.el.removeAttribute('hidden');
        else c.el.setAttribute('hidden', '');
      });
      count.textContent = countText(shown, cards.length);
      if (shown) empty.setAttribute('hidden', '');
      else empty.removeAttribute('hidden');
    }
    input.addEventListener('input', apply);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
