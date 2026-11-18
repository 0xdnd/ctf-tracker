// Synchronous pre-paint theme initializer for the SPA shell (Web + Tauri CSP 'self' safe).
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var mode = null;
  var preset = 'obsidian';
  function mapPreset(raw) {
    var p = String(raw || '').toLowerCase().trim();
    if (p === 'htb' || p === 'hackthebox' || p === 'hack-the-box' || p === 'htb-oled' || p === 'hack the box') return 'htb';
    if (
      p === 'offsec' ||
      p === 'red-team' ||
      p === 'redteam' ||
      p === 'red team' ||
      p === 'crimson' ||
      p === 'monolith' ||
      p === 'clean monolith' ||
      p === 'clean-monolith' ||
      p === 'light'
    ) {
      return 'offsec';
    }
    return 'obsidian';
  }
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
      preset = mapPreset(parsed && parsed.state && parsed.state.themePreset);
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
