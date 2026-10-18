import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Crosshair, 
  Flag, 
  Terminal, 
  Radio, 
  ChevronDown, 
  Zap, 
  X, 
  Plus,
  ChevronRight,
  ShieldAlert,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { CyberLogo } from '../common/CyberLogo';
import { PlatformIcon } from '../common/PlatformBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { formatSeconds, playCyberSound, triggerRootCelebration, safeCopyToClipboard } from '../../utils/helpers';
import { SettingsDropdown } from './SettingsDropdown';
import { ThemeToggle } from '../common/ThemeToggle';
import { ExamHeaderCapsule } from '../exam/ExamHeaderCapsule';
import { useAuthStore } from '../../store/useAuthStore';

const UnifiedHeaderTimerDisplay: React.FC = React.memo(() => {
  const activeTimerSeconds = useCtfStore((s) => s.activeTimerSeconds);
  return (
    <span className="text-[10px] font-semibold text-secondary font-mono tabular-nums">
      {formatSeconds(activeTimerSeconds)}
    </span>
  );
});

export const UnifiedHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    activeTargetId,
    setActiveTarget,
    machines,
    updateMachine,
    globalVars,
    setGlobalVars,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    soundEnabled,
    setRevShellModalOpen,
    setSnippetsDrawerOpen,
    setNewMachineModalOpen,
    setReconAutomationModalOpen,
    setReportMachineId,
    setCommandPaletteOpen,
  } = useCtfStore(
    useShallow((s) => ({
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      machines: s.machines,
      updateMachine: s.updateMachine,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resetTimer: s.resetTimer,
      soundEnabled: s.soundEnabled,
      setRevShellModalOpen: s.setRevShellModalOpen,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setReportMachineId: s.setReportMachineId,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
    }))
  );

  const user = useAuthStore((s) => s.user);
  const setOperatorProfileModalOpen = useAuthStore((s) => s.setOperatorProfileModalOpen);

  const operatorRootedCount = useMemo(() => {
    return machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
  }, [machines]);

  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [copiedVar, setCopiedVar] = useState<'lhost' | 'lport' | 'target' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyVar = (val: string | undefined, type: 'lhost' | 'lport' | 'target') => {
    if (!val || !val.trim()) return;
    const cleanVal = val.trim();
    safeCopyToClipboard(cleanVal);
    setCopiedVar(type);
    if (soundEnabled) playCyberSound('copy');
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedVar((prev) => (prev === type ? null : prev));
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const activeMachine = useMemo(() => {
    if (!activeTargetId) return null;
    return machines.find((m) => m.id === activeTargetId) || null;
  }, [activeTargetId, machines]);

  const routeName = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/tracker')) return 'Labs / Targets';
    if (p.startsWith('/vault') || p.startsWith('/evidence') || p.startsWith('/loot')) return 'Evidence Vault';
    if (p.startsWith('/cheatsheets') || p.startsWith('/notes') || p.startsWith('/cpts') || p.startsWith('/field-manual')) return 'Field Manual';
    if (p.startsWith('/writeup')) return 'Writeup Studio';
    if (p.startsWith('/analytics')) return 'Analytics';
    if (p.startsWith('/methodology')) return 'Methodology';
    if (p.startsWith('/exam')) return 'Exam Simulator';
    if (p.startsWith('/target')) return activeMachine ? activeMachine.name : 'Target Cockpit';
    if (p.startsWith('/theme')) return 'Theme Matrix';
    return 'Tracker';
  }, [location.pathname, activeMachine]);

  // Quick User Pwn Handler
  const handleQuickUserPwn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMachine) return;
    const now = new Date().toISOString();
    const isCurrentlyUser = Boolean(activeMachine.userPwnedAt || activeMachine.userFlag || activeMachine.status === 'foothold' || activeMachine.status === 'root' || activeMachine.status === 'completed');
    
    updateMachine(activeMachine.id, {
      userPwnedAt: isCurrentlyUser ? undefined : now,
      status: activeMachine.status === 'root' || activeMachine.status === 'completed'
        ? activeMachine.status
        : isCurrentlyUser ? 'recon' : 'foothold'
    });
    if (soundEnabled) playCyberSound('flag');
  };

  // Quick Root Pwn Handler
  const handleQuickRootPwn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMachine) return;
    const now = new Date().toISOString();
    const isRooted = Boolean(activeMachine.rootPwnedAt || activeMachine.rootFlag || activeMachine.status === 'root' || activeMachine.status === 'completed');
    
    updateMachine(activeMachine.id, {
      rootPwnedAt: isRooted ? undefined : now,
      userPwnedAt: activeMachine.userPwnedAt || now,
      status: isRooted ? (activeMachine.userPwnedAt ? 'foothold' : 'recon') : 'root'
    });
    
    if (!isRooted) {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    } else if (soundEnabled) {
      playCyberSound('click');
    }
  };

  // Filter machines for target selector dropdown
  const filteredTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return machines.slice(0, 10);
    return machines
      .filter((m) => m.name.toLowerCase().includes(q) || m.ip.includes(q))
      .slice(0, 10);
  }, [machines, targetSearch]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTargetDropdownOpen(false);
      }
    };
    if (targetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetDropdownOpen]);

  const ghostBtn =
    'items-center justify-center gap-1.5 h-8 px-2 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary text-xs font-medium transition-interactive active:scale-[0.97] flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const copyReveal =
    'p-0.5 rounded text-muted hover:text-primary transition-[opacity,color] cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100';
  const segmentCls = 'group flex items-center gap-1 h-6 px-1.5 rounded-md hover:bg-surface-hover focus-within:bg-surface-card';
  const segmentLabelCls = 'text-[10px] font-medium text-muted flex-shrink-0 cursor-pointer select-none';
  const segmentInputCls =
    'bg-transparent text-primary focus:outline-none placeholder:text-muted font-semibold text-[11px] font-mono tabular-nums truncate';
  const flagBtnBase =
    'px-2 py-0.5 rounded-md text-[11px] font-medium transition-[transform,background-color,border-color,color] flex items-center gap-1 active:scale-[0.97] cursor-pointer border';

  return (
    <header
      data-tauri-drag-region="true"
      className="h-[52px] px-3 sm:px-4 bg-surface-base border-b border-subtle flex items-center justify-between font-sans select-none z-40 transition-colors flex-shrink-0 whitespace-nowrap overflow-hidden"
    >
      {/* 1. Left: brand and route */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <Link
          to="/tracker"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 active:scale-[0.97]"
          title="ZeroBox"
        >
          <CyberLogo size="sm" />
          <div className="hidden sm:flex flex-col text-left leading-none" data-tauri-drag-region="false">
            <span className="font-semibold text-sm tracking-tight text-primary">
              ZERO<span className="text-accent">BOX</span>
            </span>
          </div>
        </Link>

        <div className="hidden 2xl:flex items-center gap-1 text-secondary text-xs pl-1">
          <ChevronRight className="w-3 h-3 text-muted" />
          <span className="text-secondary text-xs font-medium tracking-tight">{routeName}</span>
        </div>
      </div>

      {/* 2. Center: target switcher */}
      <div className="relative flex items-center gap-1.5 mx-1 sm:mx-2 min-w-0 flex-shrink" ref={dropdownRef}>
        <ExamHeaderCapsule />
        {activeMachine ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 h-8 rounded-lg bg-surface-card border border-subtle text-xs min-w-0 flex-shrink machined-edge">
            {/* Target name + switcher */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <PlatformIcon platform={activeMachine.platform} className="w-3.5 h-3.5 flex-shrink-0" />
              <Link
                to={`/target/${activeMachine.id}`}
                className="font-semibold text-primary hover:text-accent transition-colors truncate max-w-[60px] sm:max-w-[80px] md:max-w-[95px] xl:max-w-[120px] 2xl:max-w-[150px] min-w-0"
                title="View Target Command Center"
              >
                {activeMachine.name}
              </Link>
              <button
                onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                title="Switch Active Target"
                aria-label="Switch Active Target"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${targetDropdownOpen ? 'rotate-180 text-accent' : ''}`} />
              </button>
            </div>

            {/* Target IP */}
            <div className="hidden min-[2000px]:inline-block flex-shrink-0">
              <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip} size="xs" />
            </div>

            {/* Quick flags */}
            <div className="hidden sm:flex items-center gap-1 border-l border-subtle pl-1.5 flex-shrink-0">
              <button
                onClick={handleQuickUserPwn}
                className={`${flagBtnBase} ${
                  Boolean(activeMachine.userPwnedAt || activeMachine.userFlag || activeMachine.status === 'foothold' || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border/40'
                    : 'bg-transparent hover:bg-surface-hover text-muted hover:text-primary border-subtle'
                }`}
                title="1-Click: Toggle User Flag"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>USER</span>
              </button>

              <button
                onClick={handleQuickRootPwn}
                className={`${flagBtnBase} ${
                  Boolean(activeMachine.rootPwnedAt || activeMachine.rootFlag || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border/40'
                    : 'bg-transparent hover:bg-surface-hover text-muted hover:text-primary border-subtle'
                }`}
                title="1-Click: Toggle Root Flag (Celebration!)"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>ROOT</span>
              </button>
            </div>

            {/* Stopwatch */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-subtle flex-shrink-0">
              <button
                onClick={() => {
                  if (isTimerRunning) pauseTimer();
                  else startTimer();
                  if (soundEnabled) playCyberSound('timer');
                }}
                className="p-1 rounded-md hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer"
                title={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>

              <UnifiedHeaderTimerDisplay />

              <button
                onClick={() => {
                  resetTimer();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="hidden sm:inline-block p-1 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Target actions: pentest report and disengage (physically separated) */}
            <div className="flex items-center border-l border-subtle pl-1.5 flex-shrink-0" data-tauri-drag-region="false">
              <button
                type="button"
                onClick={() => {
                  setReportMachineId(activeMachine.id);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="hidden md:flex p-1.5 min-w-[24px] min-h-[24px] flex-shrink-0 items-center justify-center rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer"
                title={`Generate Pentest Report for ${activeMachine.name}`}
                aria-label={`Pentest Report for ${activeMachine.name}`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-[rgb(var(--border-strong))] mx-1" aria-hidden="true" />

              <button
                type="button"
                onClick={() => {
                  setActiveTarget(null);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1.5 min-w-[24px] min-h-[24px] flex-shrink-0 flex items-center justify-center rounded-md text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg transition-colors active:scale-[0.97] cursor-pointer"
                title={`Disengage ${activeMachine.name} — Release active engagement`}
                aria-label="Disengage Active Target"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-card border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] group cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors" />
            <span>Engage target</span>
            <ChevronDown className={`w-3 h-3 text-muted group-hover:text-accent transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Target selector popover */}
        {targetDropdownOpen && (
          <div className="fixed left-1/2 -translate-x-1/2 top-[54px] w-72 p-2.5 rounded-xl bg-surface-elevated border border-subtle shadow-xl machined-edge z-[60] text-xs space-y-2">
            <div className="text-[11px] text-muted px-1 font-medium flex items-center justify-between">
              <span>Engage target</span>
              <span className="text-secondary font-mono tabular-nums">{machines.length} total</span>
            </div>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Search target name or IP..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent tabular-nums"
              autoFocus
            />
            {activeTargetId && (
              <button
                type="button"
                onClick={() => {
                  setActiveTarget(null);
                  setTargetDropdownOpen(false);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="w-full p-1.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border/30 flex items-center justify-center gap-1.5 text-callout-danger-fg text-[11px] font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Disengage target</span>
              </button>
            )}
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredTargets.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveTarget(m.id);
                    startTimer();
                    setTargetDropdownOpen(false);
                    if (soundEnabled) playCyberSound('timer');
                  }}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-colors text-xs cursor-pointer ${
                    activeTargetId === m.id
                      ? 'bg-surface-hover border border-strong text-primary font-semibold'
                      : 'hover:bg-surface-hover text-secondary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-muted font-mono tabular-nums flex-shrink-0">{m.ip}</span>
                </button>
              ))}
              {filteredTargets.length === 0 && (
                <div className="text-center py-2 text-muted text-[11px]">No targets matching query</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: telemetry, tools, theme, operator */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0" data-tauri-drag-region="false">
        {/* Deploy box (secondary, icon-only) */}
        <button
          onClick={() => {
            setNewMachineModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`hidden xl:flex ${ghostBtn}`}
          title="Deploy Custom Lab Target"
          aria-label="Deploy Box - Deploy Custom Lab Target"
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden 2xl:inline">Deploy Box</span>
        </button>

        {/* Scans hub (secondary, icon-only) */}
        <button
          onClick={() => {
            setReconAutomationModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`hidden xl:flex ${ghostBtn}`}
          title="Recon & Scan Automation (Nmap / Rustscan / XML)"
          aria-label="Scans Hub"
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden 2xl:inline">Scans</span>
        </button>

        {/* Telemetry chip: LHOST | RHOST | LPORT */}
        <div
          aria-label="Tactical Variables (LHOST / RHOST / LPORT)"
          data-tauri-drag-region="false"
          className="hidden lg:flex items-center gap-0.5 h-8 px-1 rounded-lg bg-surface-sunken border border-subtle text-[11px] hover:border-strong transition-colors flex-shrink-0"
        >
          {/* L: attacker IP */}
          <div className={segmentCls} title="Attacker IP (Tun0 LHOST)">
            <label htmlFor="unified-lhost" className={segmentLabelCls}>
              L
            </label>
            <input
              id="unified-lhost"
              name="lhost"
              aria-label="Attacker IP (LHOST)"
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => {
                setGlobalVars({ lhost: e.target.value });
                if (copiedVar === 'lhost') {
                  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                  setCopiedVar(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="10.10.14.X"
              title={globalVars.lhost || '10.10.14.X'}
              className={`w-16 xl:w-20 ${segmentInputCls}`}
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.lhost, 'lhost')}
              className={copyReveal}
              title={copiedVar === 'lhost' ? 'Copied LHOST to clipboard!' : 'Copy LHOST'}
              aria-label="Copy LHOST"
            >
              {copiedVar === 'lhost' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="w-px h-3 bg-[rgb(var(--border-strong))]" aria-hidden="true" />

          {/* R: target IP */}
          <div className={segmentCls} title="Target IP (RHOST)">
            <label htmlFor="unified-target-ip" className={segmentLabelCls}>
              R
            </label>
            <input
              id="unified-target-ip"
              name="targetIp"
              aria-label="Target IP (RHOST)"
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => {
                setGlobalVars({ targetIp: e.target.value });
                if (copiedVar === 'target') {
                  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                  setCopiedVar(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="10.10.10.X"
              title={globalVars.targetIp || '10.10.10.X'}
              className={`w-16 xl:w-20 ${segmentInputCls}`}
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.targetIp, 'target')}
              className={copyReveal}
              title={copiedVar === 'target' ? 'Copied Target IP to clipboard!' : 'Copy Target IP (RHOST)'}
              aria-label="Copy Target IP"
            >
              {copiedVar === 'target' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="w-px h-3 bg-[rgb(var(--border-strong))]" aria-hidden="true" />

          {/* P: listener port */}
          <div className={segmentCls} title="Listener Port (LPORT)">
            <label htmlFor="unified-lport" className={segmentLabelCls}>
              P
            </label>
            <input
              id="unified-lport"
              name="lport"
              aria-label="Listener Port (LPORT)"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={globalVars.lport || ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (!digits) {
                  setGlobalVars({ lport: '' });
                } else {
                  const num = parseInt(digits, 10);
                  if (num <= 65535) {
                    setGlobalVars({ lport: String(num) });
                  }
                }
                if (copiedVar === 'lport') {
                  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                  setCopiedVar(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="4444"
              title={globalVars.lport || '4444'}
              className={`w-10 xl:w-11 ${segmentInputCls}`}
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.lport, 'lport')}
              className={copyReveal}
              title={copiedVar === 'lport' ? 'Copied LPORT to clipboard!' : 'Copy LPORT'}
              aria-label="Copy LPORT"
            >
              {copiedVar === 'lport' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Screen reader live announcement for copy operations */}
          <span className="sr-only" role="status" aria-live="polite">
            {copiedVar ? `Copied ${copiedVar === 'target' ? 'Target IP' : copiedVar.toUpperCase()} to clipboard` : ''}
          </span>
        </div>

        {/* RevShell */}
        <button
          onClick={() => {
            setRevShellModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`hidden xl:flex ${ghostBtn}`}
          title="Open Rapid Reverse Shell Crafter (Alt+P)"
          aria-label="RevShell - Open Rapid Reverse Shell Crafter"
        >
          <Radio className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="hidden min-[1650px]:inline">RevShell</span>
        </button>

        {/* Snippets */}
        <button
          onClick={() => {
            setSnippetsDrawerOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className={`hidden xl:flex ${ghostBtn}`}
          title="Open Snippets Drawer (Alt+S)"
          aria-label="Snippets - Open Tactical Snippets Drawer"
        >
          <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden 2xl:inline">Snippets</span>
        </button>

        {/* Command palette trigger */}
        <button
          onClick={() => {
            setCommandPaletteOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle hover:border-strong text-secondary hover:text-primary text-xs font-medium transition-interactive active:scale-[0.97] flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Open Command Palette (Ctrl+K)"
          aria-label="Open Command Palette"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden 2xl:inline">Search</span>
          <kbd className="hidden sm:inline-block px-1 text-[10px] font-medium font-mono rounded bg-surface-card text-muted border border-subtle">
            Ctrl+K
          </kbd>
        </button>

        {/* Light / Dark toggle */}
        <ThemeToggle size="sm" soundEnabled={soundEnabled} className="flex-shrink-0" />

        {/* Operator profile */}
        <button
          type="button"
          onClick={() => {
            setOperatorProfileModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="h-8 px-2 rounded-lg bg-transparent hover:bg-surface-hover border border-subtle hover:border-strong text-primary text-xs font-medium flex items-center gap-1.5 transition-interactive active:scale-[0.97] group flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
          title={`Active Operator: ${user?.callsign || user?.name || 'Local Operator'} (${user?.role || 'Offline Mode'}). Click to switch or log in (Alt+O)`}
        >
          {/* Avatar */}
          <div className="w-5 h-5 rounded bg-surface-hover border border-subtle flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
            {(user?.callsign || user?.name || 'OP').charAt(0).toUpperCase()}
          </div>

          <span className="hidden sm:inline-block font-medium text-xs max-w-[80px] xl:max-w-[120px] truncate text-primary">
            {user?.callsign || user?.name || 'Local Operator'}
          </span>

          {/* Rooted count: hidden below xl to save width */}
          <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary text-[10px] font-medium leading-none tabular-nums flex-shrink-0">
            <span className="font-mono tabular-nums">{operatorRootedCount}</span>
            <span>ROOT</span>
          </div>

          <ChevronDown className="w-3 h-3 text-muted group-hover:text-secondary transition-transform duration-200 flex-shrink-0" />
        </button>

        {/* Settings & workspace menu */}
        <SettingsDropdown />
      </div>
    </header>
  );
};
