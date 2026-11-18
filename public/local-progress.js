/* Local progress bridge for static certification and track pages.
   Reads ZeroBox localStorage profiles on the same origin (zero network requests).
   When the visitor has solved machines in their browser that appear on the current page,
   highlights those rows and shows a quiet summary banner without altering table cell text or filter counts. */
(function () {
  'use strict';

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function collectSolvedKeys() {
    var solved = {};
    var count = 0;
    function addMachine(m) {
      if (!m || !m.name) return;
      var isSolved = m.status === 'root' || m.status === 'completed' || Boolean(m.rootPwnedAt);
      if (!isSolved) return;
      var k = norm(m.name);
      if (!k) return;
      if (!solved[k]) count++;
      solved[k] = true;
      if (m.platform) solved[norm(m.platform) + ':' + k] = true;
    }

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        if (key === 'zerobox-tactical-store' || key.indexOf('zerobox_profile_') === 0) {
          var raw = localStorage.getItem(key);
          if (!raw) continue;
          var parsed = JSON.parse(raw);
          var list = (parsed && parsed.machines) || (parsed && parsed.state && parsed.state.machines);
          if (Array.isArray(list)) {
            for (var j = 0; j < list.length; j++) addMachine(list[j]);
          }
        }
      }
    } catch {
      return null;
    }
    return count > 0 ? solved : null;
  }

  function init() {
    var solved = collectSolvedKeys();
    if (!solved) return;

    var main = document.getElementById('main') || document.body;
    var rows = main.querySelectorAll('table.list tbody tr, table tbody tr');
    if (!rows.length) return;

    var matched = 0;
    var total = 0;
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var name = tr.getAttribute('data-name');
      var plat = tr.getAttribute('data-platform') || '';
      if (!name) {
        var firstCell = tr.cells && tr.cells[0];
        if (!firstCell) continue;
        var link = firstCell.querySelector('a');
        name = (link ? link.textContent : firstCell.textContent || '').trim();
      }
      var k = norm(name);
      if (!k) continue;
      total++;
      var hit = plat ? Boolean(solved[norm(plat) + ':' + k] || solved[k]) : Boolean(solved[k]);
      if (hit) {
        matched++;
        tr.setAttribute('data-local-solved', 'true');
      }
    }

    if (!matched || !total) return;

    var note = document.createElement('p');
    note.className = 'lp-summary';
    note.setAttribute('role', 'status');
    note.textContent = 'Solved in your browser: ' + matched + ' of ' + total + ' on this page.';
    var anchor = main.querySelector('.tf') || main.querySelector('table');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(note, anchor);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
