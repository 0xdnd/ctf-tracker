/* Live {TARGET_IP} / {LHOST} / {LPORT} / {DOMAIN} fill-in bar for static cheatsheet, methodology and technique pages.
   Progressive enhancement: pages ship complete <pre><code> templates; this script injects a compact fill-in bar only when
   at least one code block carries a supported placeholder, substitutes values live as the user types, and syncs with the
   ZeroBox app's localStorage variables (no network requests). */
(function () {
  'use strict';

  var STORAGE_KEY = 'zerobox-static-vars';
  var APP_STORE_KEY = 'zerobox-tactical-store';
  var TOKEN_RE = /\{TARGET_IP\}|<TARGET_IP>|\{RHOST\}|<RHOST>|\{LHOST\}|<LHOST>|\{LPORT\}|<LPORT>|\{DOMAIN\}|<DOMAIN>/g;
  var DOMAIN_RE = /\{DOMAIN\}|<DOMAIN>/;

  function isPlaceholder(v) {
    if (!v) return true;
    var s = String(v).trim();
    return !s || /10\.10\.\d+\.x/i.test(s) || /^target\.htb$/i.test(s);
  }

  function readSaved() {
    var out = { targetIp: '', lhost: '', lport: '', domain: '' };
    try {
      var appRaw = localStorage.getItem(APP_STORE_KEY);
      if (appRaw) {
        var parsed = JSON.parse(appRaw);
        var gv = parsed && parsed.state && parsed.state.globalVars;
        if (gv) {
          if (!isPlaceholder(gv.targetIp)) out.targetIp = String(gv.targetIp).trim();
          if (!isPlaceholder(gv.lhost)) out.lhost = String(gv.lhost).trim();
          if (gv.lport && String(gv.lport).trim() !== '4444') out.lport = String(gv.lport).trim();
          if (!isPlaceholder(gv.domain)) out.domain = String(gv.domain).trim();
        }
      }
    } catch { /* ignore */ }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var sv = JSON.parse(raw);
        if (sv && typeof sv === 'object') {
          if (typeof sv.targetIp === 'string' && sv.targetIp) out.targetIp = sv.targetIp;
          if (typeof sv.lhost === 'string' && sv.lhost) out.lhost = sv.lhost;
          if (typeof sv.lport === 'string' && sv.lport) out.lport = sv.lport;
          if (typeof sv.domain === 'string' && sv.domain) out.domain = sv.domain;
        }
      }
    } catch { /* ignore */ }
    return out;
  }

  function writeSaved(vals) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
    } catch { /* ignore */ }
    try {
      var appRaw = localStorage.getItem(APP_STORE_KEY);
      if (appRaw) {
        var parsed = JSON.parse(appRaw);
        if (parsed && parsed.state && parsed.state.globalVars) {
          if (vals.targetIp) parsed.state.globalVars.targetIp = vals.targetIp;
          if (vals.lhost) parsed.state.globalVars.lhost = vals.lhost;
          if (vals.lport) parsed.state.globalVars.lport = vals.lport;
          if (vals.domain) parsed.state.globalVars.domain = vals.domain;
          localStorage.setItem(APP_STORE_KEY, JSON.stringify(parsed));
        }
      }
    } catch { /* ignore */ }
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function init() {
    if (document.getElementById('rs-fill') || document.getElementById('zb-vars-bar')) return;
    var main = document.getElementById('main') || document.body;
    var pres = main.querySelectorAll('pre');
    if (!pres.length) return;

    var codes = [];
    var hasAnyToken = false;
    var hasDomain = false;
    for (var i = 0; i < pres.length; i++) {
      var code = pres[i].querySelector('code') || pres[i];
      var tpl = code.getAttribute('data-template');
      if (tpl == null) {
        tpl = code.textContent || '';
        code.setAttribute('data-template', tpl);
      }
      TOKEN_RE.lastIndex = 0;
      if (TOKEN_RE.test(tpl)) {
        hasAnyToken = true;
        if (DOMAIN_RE.test(tpl)) hasDomain = true;
        codes.push(code);
      }
    }
    if (!hasAnyToken) return;

    var saved = readSaved();
    var bar = el('div', { class: 'tf vars-bar', id: 'zb-vars-bar', role: 'region', 'aria-label': 'Fill in command placeholders' });
    var controls = el('div', { class: 'tf-controls' });

    function makeField(id, label, placeholder, val, numeric) {
      var wrap = el('div', { class: 'tf-field' });
      wrap.appendChild(el('label', { for: id }, label));
      var attrs = { id: id, type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: placeholder };
      if (numeric) attrs.inputmode = 'numeric';
      var input = el('input', attrs);
      input.value = val || '';
      wrap.appendChild(input);
      controls.appendChild(wrap);
      return input;
    }

    var inTarget = makeField('vb-target', 'TARGET_IP', '10.10.11.24', saved.targetIp, false);
    var inLhost = makeField('vb-lhost', 'LHOST', '10.10.14.5', saved.lhost, false);
    var inLport = makeField('vb-lport', 'LPORT', '4444', saved.lport, true);
    var inDomain = hasDomain ? makeField('vb-domain', 'DOMAIN', 'corp.local', saved.domain, false) : null;

    var resetBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Clear values');
    controls.appendChild(resetBtn);
    bar.appendChild(controls);

    var anchor = main.querySelector('h2') || pres[0];
    anchor.parentNode.insertBefore(bar, anchor);

    function apply(persist) {
      var vals = {
        targetIp: inTarget.value.trim(),
        lhost: inLhost.value.trim(),
        lport: inLport.value.trim(),
        domain: inDomain ? inDomain.value.trim() : saved.domain,
      };
      codes.forEach(function (code) {
        var tpl = code.getAttribute('data-template') || '';
        code.textContent = tpl.replace(TOKEN_RE, function (m) {
          var upper = m.toUpperCase();
          if (upper.indexOf('TARGET_IP') !== -1 || upper.indexOf('RHOST') !== -1) return vals.targetIp || m;
          if (upper.indexOf('LHOST') !== -1) return vals.lhost || m;
          if (upper.indexOf('LPORT') !== -1) return vals.lport || m;
          if (upper.indexOf('DOMAIN') !== -1) return vals.domain || m;
          return m;
        });
      });
      if (persist) writeSaved(vals);
    }

    [inTarget, inLhost, inLport, inDomain].forEach(function (inp) {
      if (inp) inp.addEventListener('input', function () { apply(true); });
    });

    resetBtn.addEventListener('click', function () {
      inTarget.value = '';
      inLhost.value = '';
      inLport.value = '';
      if (inDomain) inDomain.value = '';
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      apply(false);
    });

    if (saved.targetIp || saved.lhost || saved.lport || (inDomain && saved.domain)) {
      apply(false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
