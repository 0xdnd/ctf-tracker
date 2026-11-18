(function () {
  var PRIMARY_KEY = 'zerobox-theme-mode';
  var LEGACY_KEY = 'zb-site-theme';
  var root = document.documentElement;
  function readStored() {
    try {
      var primary = localStorage.getItem(PRIMARY_KEY);
      var legacy = localStorage.getItem(LEGACY_KEY);
      var mode = primary || legacy;
      if (!primary && (legacy === 'light' || legacy === 'dark')) {
        localStorage.setItem(PRIMARY_KEY, legacy);
      } else if (!legacy && (primary === 'light' || primary === 'dark')) {
        localStorage.setItem(LEGACY_KEY, primary);
      }
      return mode;
    } catch {
      return null;
    }
  }
  function resolveLight(mode) {
    if (mode === 'light') return true;
    if (mode === 'dark') return false;
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  }
  function apply(light) {
    if (light) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', light ? '#fafafa' : '#09090b');
  }
  apply(resolveLight(readStored()));
  function sync(btn) {
    var light = root.getAttribute('data-theme') === 'light';
    btn.setAttribute('aria-pressed', light ? 'true' : 'false');
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  function wire() {
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        sync(btn);
        btn.addEventListener('click', function () {
          var light = root.getAttribute('data-theme') !== 'light';
          var next = light ? 'light' : 'dark';
          var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!rm && !document.startViewTransition) {
            root.classList.add('theme-anim');
            setTimeout(function () { root.classList.remove('theme-anim'); }, 300);
          }
          if (!rm && document.startViewTransition) document.startViewTransition(function () { apply(light); });
          else apply(light);
          try {
            localStorage.setItem(PRIMARY_KEY, next);
            localStorage.setItem(LEGACY_KEY, next);
          } catch { /* storage unavailable */ }
          var all = document.querySelectorAll('[data-theme-toggle]');
          for (var j = 0; j < all.length; j++) sync(all[j]);
        });
      })(btns[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
