/* Local progress bridge for static certification and track pages.
   Reads ZeroBox localStorage for the active operator profile on the same origin (zero network requests).
   When the visitor has solved machines in their browser that appear on the current page,
   highlights those rows and shows a quiet summary banner without altering table cell text or filter counts. */
(function () {
  'use strict';

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function resolveActiveProfileId() {
    try {
      var tacticalRaw = localStorage.getItem('zerobox-tactical-store');
      if (tacticalRaw) {
        var tactical = JSON.parse(tacticalRaw);
        var pid = tactical && tactical.state && tactical.state.currentProfileId;
        if (typeof pid === 'string' && pid.trim()) return pid.trim();
      }
    } catch { /* ignore */ }
    try {
      var authRaw = localStorage.getItem('rootvector_auth_session');
      if (authRaw) {
        var auth = JSON.parse(authRaw);
        var uid = auth && auth.state && auth.state.user && auth.state.user.id;
        if (typeof uid === 'string' && uid.trim()) return uid.trim();
      }
    } catch { /* ignore */ }
    return 'guest';
  }

  function collectSolvedKeys() {
    var byId = {};
    var byPlatform = {};
    var byName = {};
    var count = 0;

    function addMachine(m) {
      if (!m || !m.name) return;
      var isSolved = m.status === 'root' || m.status === 'completed' || Boolean(m.rootPwnedAt);
      if (!isSolved) return;
      var k = norm(m.name);
      if (!k) return;
      var platKey = m.platform ? norm(m.platform) : '';
      var uniqueKey = (m.id ? String(m.id).toLowerCase() : (platKey ? platKey + ':' + k : k));
      if (!byId[uniqueKey]) count++;
      if (m.id) byId[String(m.id).toLowerCase()] = true;
      if (platKey) byPlatform[platKey + ':' + k] = true;
      byName[k] = true;
    }

    function readBlob(raw) {
      if (!raw) return;
      var parsed = JSON.parse(raw);
      var root = (parsed && parsed.state) || parsed;
      if (!root || Boolean(root.userSolvesReset) && !Array.isArray(root.machines)) return;
      var list = root.machines;
      if (Array.isArray(list)) {
        for (var j = 0; j < list.length; j++) addMachine(list[j]);
      }
    }

    try {
      var profileId = resolveActiveProfileId();
      var candidates = [
        'zerobox_operator_profile_' + profileId,
        'specter_ctf_profile_' + profileId,
        'zerobox_profile_' + profileId,
      ];
      for (var i = 0; i < candidates.length; i++) {
        var raw = localStorage.getItem(candidates[i]);
        if (raw) {
          readBlob(raw);
          break;
        }
      }
      var tacticalRaw = localStorage.getItem('zerobox-tactical-store');
      if (tacticalRaw) {
        var tacticalParsed = JSON.parse(tacticalRaw);
        var tacticalPid = (tacticalParsed && tacticalParsed.state && tacticalParsed.state.currentProfileId) || 'guest';
        if (tacticalPid === profileId) {
          readBlob(tacticalRaw);
        }
      }
    } catch {
      return null;
    }

    return count > 0 ? { byId: byId, byPlatform: byPlatform, byName: byName } : null;
  }

  function init() {
    var solved = collectSolvedKeys();
    if (!solved) return;

    var main = document.getElementById('main') || document.body;
    var rows = main.querySelectorAll('table.list tbody tr, table tbody tr');
    if (!rows.length) return;

    var matched = 0;
    var total = 0;
    var seenRowKeys = {};
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var machineId = (tr.getAttribute('data-machine-id') || '').trim().toLowerCase();
      var name = tr.getAttribute('data-name');
      var plat = tr.getAttribute('data-platform') || '';
      if (!name) {
        var firstCell = tr.cells && tr.cells[0];
        if (!firstCell) continue;
        var link = firstCell.querySelector('a');
        name = (link ? link.textContent : firstCell.textContent || '').trim();
      }
      var k = norm(name);
      if (!k && !machineId) continue;

      var platNorm = plat ? norm(plat) : '';
      var hit = false;
      if (machineId) {
        hit = Boolean(solved.byId[machineId]);
      } else if (platNorm) {
        // Strict platform match when the row declares its platform: never mark THM "Blue" solved for HTB "Blue".
        hit = Boolean(solved.byPlatform[platNorm + ':' + k]);
      } else {
        hit = Boolean(solved.byName[k]);
      }

      if (hit) {
        tr.setAttribute('data-local-solved', 'true');
      }

      var dedupeKey = machineId || (platNorm ? platNorm + ':' + k : 'row:' + i + ':' + k);
      if (!seenRowKeys[dedupeKey]) {
        seenRowKeys[dedupeKey] = true;
        total++;
        if (hit) matched++;
      }
    }

    if (!matched || !total) return;

    var existingNote = main.querySelector('.lp-summary');
    if (existingNote && existingNote.parentNode) existingNote.parentNode.removeChild(existingNote);

    var note = document.createElement('p');
    note.className = 'lp-summary';
    note.setAttribute('role', 'status');
    note.textContent = 'Solved in your browser: ' + matched + ' of ' + total + ' on this page.';
    var anchor = main.querySelector('.tf:not(.vars-bar)') || main.querySelector('table.list, table');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(note, anchor);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
