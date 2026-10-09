(function () {
  var d = document;
  var de = d.documentElement;
  var path = location.pathname;
  // Client routes of the app (keep in sync with <Route> in src/App.tsx; scripts/check-seo.cjs verifies it).
  // GitHub Pages has no folder for some of them (/target/<id>, /writeup/<id>, ...), so it serves this file and the app shell must boot here.
  var SPA = /^\/(?:tracker|methodology|cheatsheets?|notes|field-manual|cpts(?:-manual)?|writeups?|analytics|exam(?:-simulator)?|vault|evidence|loot)\/?$|^\/targets?\/[^\/]+(?:\/focus)?\/?$|^\/writeup\/[^\/]+\/?$/;
  if (SPA.test(path)) {
    de.hidden = true;
    fetch('/app-shell.html', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('shell ' + r.status); return r.text(); })
      .then(function (html) { d.open(); d.write(html); d.close(); })
      .catch(function () { de.hidden = false; });
    return;
  }
  function fill() {
    var shown = path.length > 80 ? path.slice(0, 79) + '…' : path;
    var els = d.querySelectorAll('[data-nf-path]');
    for (var i = 0; i < els.length; i++) els[i].textContent = shown;
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fill); else fill();
})();
