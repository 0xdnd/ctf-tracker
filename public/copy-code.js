/* Copy buttons for the code blocks of the static content pages (loaded only on pages whose body has a <pre> block).
   Progressive enhancement: the pages ship plain <pre><code> blocks; this script wraps each block and adds a "Copy" button.
   On /revshells/ it also reveals the LHOST/LPORT fields (hidden without JS), syncs them with ZeroBox's localStorage globalVars,
   and swaps the {LHOST} / {LPORT} placeholders in every block as the user types; each block keeps its original template, so
   clearing a field restores the placeholder. No network requests. */
(function () {
  'use strict';

  var RESET_MS = 1500;
  var STATIC_VARS_KEY = 'zerobox-static-vars';
  var APP_STORE_KEY = 'zerobox-tactical-store';

  function isPlaceholder(v) {
    if (!v) return true;
    var s = String(v).trim();
    return !s || /10\.10\.\d+\.x/i.test(s) || /^10\.10\.x\.x$/i.test(s);
  }

  function resolveProfileKey() {
    var profileId = 'guest';
    try {
      var appRaw = localStorage.getItem(APP_STORE_KEY);
      if (appRaw) {
        var parsed = JSON.parse(appRaw);
        var pid = parsed && parsed.state && parsed.state.currentProfileId;
        if (typeof pid === 'string' && pid.trim()) profileId = pid.trim();
      }
    } catch { /* ignore */ }
    return 'zerobox_operator_profile_' + profileId;
  }

  function readShellVars() {
    var out = { lhost: '', lport: '' };
    var applyGv = function (gv) {
      if (!gv || typeof gv !== 'object') return;
      if (!isPlaceholder(gv.lhost)) out.lhost = String(gv.lhost).trim();
      if (gv.lport && String(gv.lport).trim() !== '4444') out.lport = String(gv.lport).trim();
    };
    try {
      var profRaw = localStorage.getItem(resolveProfileKey());
      if (profRaw) {
        var prof = JSON.parse(profRaw);
        applyGv(prof && (prof.globalVars || (prof.state && prof.state.globalVars)));
      }
    } catch { /* ignore */ }
    try {
      var appRaw = localStorage.getItem(APP_STORE_KEY);
      if (appRaw) {
        var parsed = JSON.parse(appRaw);
        applyGv(parsed && parsed.state && parsed.state.globalVars);
      }
    } catch { /* ignore */ }
    try {
      var svRaw = localStorage.getItem(STATIC_VARS_KEY);
      var sv = svRaw ? JSON.parse(svRaw) : null;
      if (sv && typeof sv.lhost === 'string' && sv.lhost) out.lhost = sv.lhost;
      if (sv && typeof sv.lport === 'string' && sv.lport) out.lport = sv.lport;
    } catch { /* ignore */ }
    return out;
  }

  function persistShellVars(h, p) {
    try {
      var prevRaw = localStorage.getItem(STATIC_VARS_KEY);
      var prev = prevRaw ? JSON.parse(prevRaw) : {};
      prev.lhost = h;
      prev.lport = p;
      localStorage.setItem(STATIC_VARS_KEY, JSON.stringify(prev));
    } catch { /* storage unavailable */ }
    var patchBlob = function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        var gv = (parsed && parsed.state && parsed.state.globalVars) || (parsed && parsed.globalVars);
        if (gv && typeof gv === 'object') {
          gv.lhost = h || '10.10.14.x';
          gv.lport = p || '4444';
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
    };
    patchBlob(APP_STORE_KEY);
    patchBlob(resolveProfileKey());
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Resolves true when the text reached the clipboard.
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function init() {
    var main = document.getElementById('main') || document.body;
    var blocks = main.querySelectorAll('pre');
    if (!blocks.length) return;

    var live = document.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);

    var codes = [];
    Array.prototype.forEach.call(blocks, function (pre) {
      var code = pre.querySelector('code') || pre;
      if (!code.hasAttribute('data-template')) {
        code.setAttribute('data-template', code.textContent);
      }
      codes.push(code);

      var wrap = document.createElement('div');
      wrap.className = 'cc-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      pre.classList.add('cc');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-btn';
      btn.setAttribute('aria-label', 'Copy code');
      btn.textContent = 'Copy';
      var timer = 0;
      btn.addEventListener('click', function () {
        copyText(code.textContent).then(function (ok) {
          var msg = ok ? 'Copied' : 'Copy failed';
          btn.textContent = msg;
          live.textContent = msg;
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.textContent = 'Copy';
            live.textContent = '';
          }, RESET_MS);
        });
      });
      wrap.appendChild(btn);
    });

    var box = document.getElementById('rs-fill');
    var lhost = document.getElementById('rs-lhost');
    var lport = document.getElementById('rs-lport');
    if (box && lhost && lport) {
      box.removeAttribute('hidden');
      var saved = readShellVars();
      if (saved.lhost && !lhost.value) lhost.value = saved.lhost;
      if (saved.lport && !lport.value) lport.value = saved.lport;
      var apply = function () {
        var h = lhost.value.trim();
        var p = lport.value.trim();
        codes.forEach(function (code) {
          var t = code.getAttribute('data-template') || '';
          // One pass with a replacer function: typed values are literal text and are never substituted again.
          code.textContent = t.replace(/\{LHOST\}|\{LPORT\}/g, function (m) { return m === '{LHOST}' ? (h || m) : (p || m); });
        });
      };
      lhost.addEventListener('input', function () { apply(); persistShellVars(lhost.value.trim(), lport.value.trim()); });
      lport.addEventListener('input', function () { apply(); persistShellVars(lhost.value.trim(), lport.value.trim()); });
      apply();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
