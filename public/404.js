(function () {
  var d = document;
  var de = d.documentElement;
  var path = location.pathname;
  // Client routes of the app (keep in sync with <Route> in src/App.tsx; scripts/check-seo.cjs verifies it).
  // GitHub Pages has no folder for some of them (/target/<id>, /writeup/<id>, ...), so it serves this file and the app shell must boot here.
  var SPA = /^\/(?:tracker|methodology|reverse-shell|cheatsheets?|notes|field-manual|cpts(?:-manual)?|writeups?|analytics|exam(?:-simulator)?|vault|evidence|loot)\/?$|^\/targets?\/[^\/]+(?:\/focus)?\/?$|^\/writeup\/[^\/]+\/?$/i;
  if (SPA.test(path)) {
    de.hidden = true;
    fetch('/app-shell.html', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('shell ' + r.status); return r.text(); })
      .then(function (html) { d.open(); d.write(html); d.close(); })
      .catch(function () { de.hidden = false; });
    return;
  }
  // Edit distance, early-out above max (paths are capped at 80 characters, the list is ~130 entries).
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function norm(p) { return p.toLowerCase().replace(/\.html?$/, '').replace(/^\/+|\/+$/g, '').slice(0, 80); }
  function last(p) { return p.slice(p.lastIndexOf('/') + 1); }
  // Close spelling (whole path or last segment), or the nearest real parent page. Returns a real path or ''.
  function closest(list, requested) {
    var req = norm(requested), best = '', bestScore = 1, i, c, n, s, d, len;
    if (!req) return '';
    for (i = 0; i < list.length; i++) {
      c = list[i];
      n = norm(c);
      if (!n) continue;
      len = Math.max(req.length, n.length);
      d = dist(req, n, 3);
      s = d <= Math.max(1, Math.floor(len * 0.25)) && d <= 3 ? d / len : 1;
      var rs = last(req), cs = last(n);
      if (rs.length >= 4 && cs.length >= 4) {
        len = Math.max(rs.length, cs.length);
        d = dist(rs, cs, 3);
        if (d <= Math.max(1, Math.floor(len * 0.25)) && d <= 3) s = Math.min(s, d / len + 0.05);
        else if (Math.min(rs.length, cs.length) / len >= 0.6 && (rs.indexOf(cs) === 0 || cs.indexOf(rs) === 0)) s = Math.min(s, 0.3);
      }
      if (req.indexOf(n + '/') === 0) s = Math.min(s, 0.35 - n.length / 1000);
      if (s < bestScore) { bestScore = s; best = c; }
    }
    return best;
  }
  function suggest() {
    var box = d.querySelector('[data-nf-mean]');
    if (!box || !window.fetch) return;
    fetch('/404-paths.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('paths ' + r.status); return r.json(); })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        var hit = closest(list, path);
        if (!hit || typeof hit !== 'string' || hit.charAt(0) !== '/') return;
        var a = d.createElement('a');
        a.href = hit;
        a.textContent = hit;
        box.appendChild(d.createTextNode('Did you mean '));
        box.appendChild(a);
        box.appendChild(d.createTextNode('?'));
      })
      .catch(function () {});
  }
  // A very slight tilt that follows the pointer, only on hover-capable fine pointers and never under reduced motion.
  function tilt() {
    var mq = window.matchMedia;
    if (!mq || !mq('(hover: hover) and (pointer: fine)').matches || mq('(prefers-reduced-motion: reduce)').matches) return;
    var drop = d.querySelector('.nf-drop'), card = d.querySelector('.nf-card'), raf = 0, x = 0, y = 0;
    if (!drop || !card) return;
    function paint() {
      raf = 0;
      card.style.transform = 'rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg)';
    }
    drop.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      if (!raf) raf = requestAnimationFrame(paint);
    });
    drop.addEventListener('pointerleave', function () {
      x = 0; y = 0;
      if (!raf) raf = requestAnimationFrame(paint);
    });
  }
  function fill() {
    var shown = path.length > 80 ? path.slice(0, 79) + '…' : path;
    var els = d.querySelectorAll('[data-nf-path]');
    for (var i = 0; i < els.length; i++) els[i].textContent = shown;
    suggest();
    tilt();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fill); else fill();
})();
