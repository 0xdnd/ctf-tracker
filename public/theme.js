(function () {
  var KEY = 'zb-site-theme';
  var root = document.documentElement;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(light) { if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme'); }
  apply(stored() === 'light');
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
          apply(light);
          try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) {}
          var all = document.querySelectorAll('[data-theme-toggle]');
          for (var j = 0; j < all.length; j++) sync(all[j]);
        });
      })(btns[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
