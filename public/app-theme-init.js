// Synchronous pre-paint theme initializer for the SPA shell (Web + Tauri CSP 'self' safe).
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var mode = null;
  var preset = 'obsidian';
  try {
    var primary = localStorage.getItem('zerobox-theme-mode');
    var legacy = localStorage.getItem('zb-site-theme');
    mode = primary || legacy;
    if (!primary && (legacy === 'light' || legacy === 'dark')) {
      localStorage.setItem('zerobox-theme-mode', legacy);
    } else if (!legacy && (primary === 'light' || primary === 'dark')) {
      localStorage.setItem('zb-site-theme', primary);
    }
    var rawStore = localStorage.getItem('zerobox-tactical-store');
    if (rawStore) {
      var parsed = JSON.parse(rawStore);
      var p = String((parsed && parsed.state && parsed.state.themePreset) || '').toLowerCase().trim();
      if (p === 'htb' || p === 'hack the box' || p === 'hack-the-box') preset = 'htb';
      else if (p === 'offsec' || p === 'red-team' || p === 'monolith' || p === 'clean monolith' || p === 'clean-monolith' || p === 'light') preset = 'offsec';
    }
  } catch {
    /* localStorage unavailable */
  }
  var isLight =
    mode === 'light'
      ? true
      : mode === 'dark'
        ? false
        : Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);

  root.classList.toggle('dark', !isLight);
  root.classList.toggle('light', isLight);
  root.setAttribute('data-mode', isLight ? 'light' : 'dark');
  root.setAttribute('data-theme', preset);
  root.style.colorScheme = isLight ? 'light' : 'dark';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isLight ? '#fafafa' : '#09090b');
})();
