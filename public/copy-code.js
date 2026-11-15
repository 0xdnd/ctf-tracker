/* Copy buttons for the code blocks of the static content pages (loaded only on pages whose body has a <pre> block).
   Progressive enhancement: the pages ship plain <pre><code> blocks; this script wraps each block and adds a "Copy" button.
   On /revshells/ it also reveals the LHOST/LPORT fields (hidden without JS) and swaps the {LHOST} / {LPORT} placeholders in every
   block as the user types; each block keeps its original template, so clearing a field restores the placeholder.
   No network, no storage. */
(function () {
  'use strict';

  var RESET_MS = 1500;

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
      code.setAttribute('data-template', code.textContent);
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
      var apply = function () {
        var h = lhost.value.trim();
        var p = lport.value.trim();
        codes.forEach(function (code) {
          var t = code.getAttribute('data-template') || '';
          // One pass with a replacer function: typed values are literal text and are never substituted again.
          code.textContent = t.replace(/\{LHOST\}|\{LPORT\}/g, function (m) { return m === '{LHOST}' ? (h || m) : (p || m); });
        });
      };
      lhost.addEventListener('input', apply);
      lport.addEventListener('input', apply);
      apply();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
