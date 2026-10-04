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
    <span className="text-[10px] font-bold text-callout-success-fg dark:text-cyber-emerald font-mono tabular-nums">
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

  return (
    <header
      data-tauri-drag-region="true"
      className="h-[52px] px-3 sm:px-4 bg-surface-base border-b border-subtle machined-edge flex items-center justify-between font-sans select-none z-40 transition-colors flex-shrink-0 whitespace-nowrap overflow-hidden"
    >
      
      {/* 1. Left: Brand & Breadcrumb Route Indicator */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <Link 
          to="/tracker" 
          className="flex items-center gap-2 group transition-opacity hover:opacity-90 active:scale-[0.97]"
          title="ZEROBOX Tactical CTF Dashboard"
        >
          <CyberLogo size="sm" />
          <div className="hidden sm:flex flex-col text-left leading-none" data-tauri-drag-region="false">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100">
              ZERO<span className="text-callout-info-fg dark:text-cyber-cyan">BOX</span>
            </span>
            <span className="text-[9px] text-tertiary font-sans font-medium tracking-tight">
              Tactical Cyber Ops
            </span>
          </div>
        </Link>

        <div className="hidden 2xl:flex items-center gap-1 text-tertiary dark:text-zinc-600 text-xs pl-1">
          <ChevronRight className="w-3 h-3 text-tertiary dark:text-zinc-600" />
          <span className="text-slate-600 dark:text-zinc-300 text-xs font-semibold tracking-tight">{routeName}</span>
        </div>
      </div>

      {/* 2. Center: Active Target Pill & Mission Telemetry */}
      <div className="relative flex items-center gap-1.5 mx-1 sm:mx-2 min-w-0 flex-shrink" ref={dropdownRef}>
        <ExamHeaderCapsule />
        {activeMachine ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0 h-8.5 rounded-lg bg-surface-elevated border border-slate-300 dark:border-cyber-border text-xs min-w-0 flex-shrink shadow-xs machined-edge">
            {/* Target Dropdown Toggle & Name */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <PlatformIcon platform={activeMachine.platform} className="w-3.5 h-3.5 flex-shrink-0" />
              <Link
                to={`/target/${activeMachine.id}`}
                className="font-bold text-slate-900 dark:text-white hover:text-callout-info-fg dark:hover:text-cyber-cyan transition-colors truncate max-w-[60px] sm:max-w-[80px] md:max-w-[95px] xl:max-w-[120px] 2xl:max-w-[150px] min-w-0"
                title="View Target Command Center"
              >
                {activeMachine.name}
              </Link>
              <button
                onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-tertiary dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
                title="Switch Active Target"
                aria-label="Switch Active Target"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${targetDropdownOpen ? 'rotate-180 text-callout-info-fg dark:text-cyber-cyan' : ''}`} />
              </button>
            </div>

            {/* Target IP */}
            <div className="hidden min-[2000px]:inline-block flex-shrink-0">
              <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip} size="xs" />
            </div>

            {/* Quick Flags (Clickable) */}
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-300 dark:border-cyber-border pl-1.5 flex-shrink-0">
              <button
                onClick={handleQuickUserPwn}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-[transform,background-color,border-color,color] flex items-center gap-1 active:scale-[0.97] cursor-pointer ${
                  Boolean(activeMachine.userPwnedAt || activeMachine.userFlag || activeMachine.status === 'foothold' || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-amber-500/20 text-callout-warn-fg dark:text-cyber-amber border border-amber-500/40 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 hover:bg-amber-500/20 text-tertiary dark:text-cyber-muted hover:text-callout-warn-fg dark:hover:text-cyber-amber border border-slate-300 dark:border-cyber-border'
                }`}
                title="1-Click: Toggle User Flag"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>USER</span>
              </button>

              <button
                onClick={handleQuickRootPwn}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-[transform,background-color,border-color,color] flex items-center gap-1 active:scale-[0.97] cursor-pointer ${
                  Boolean(activeMachine.rootPwnedAt || activeMachine.rootFlag || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-emerald-500/20 text-callout-success-fg dark:text-cyber-emerald border border-emerald-500/40 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 hover:bg-rose-500/20 text-tertiary dark:text-cyber-muted hover:text-callout-danger-fg dark:hover:text-cyber-crimson border border-slate-300 dark:border-cyber-border'
                }`}
                title="1-Click: Toggle Root Flag (Celebration!)"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>ROOT</span>
              </button>
            </div>

            {/* Stopwatch Timer & Controls */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300 dark:border-cyber-border flex-shrink-0">
              <button
                onClick={() => {
                  if (isTimerRunning) pauseTimer();
                  else startTimer();
                  if (soundEnabled) playCyberSound('timer');
                }}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-cyber-card text-callout-success-fg dark:text-cyber-emerald transition-colors cursor-pointer"
                title={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3 text-callout-warn-fg dark:text-cyber-amber" /> : <Play className="w-3 h-3" />}
              </button>

              <UnifiedHeaderTimerDisplay />

              <button
                onClick={() => {
                  resetTimer();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="hidden sm:inline-block p-1 rounded-md hover:bg-slate-200 dark:hover:bg-cyber-card text-tertiary dark:text-cyber-muted hover:text-slate-700 dark:hover:text-primary transition-colors cursor-pointer"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Target Actions: Pentest Report & Disengage (Safe Separation - H5 Error Prevention) */}
            <div className="flex items-center border-l border-slate-300 dark:border-cyber-border pl-1.5 flex-shrink-0" data-tauri-drag-region="false">
              <button
                type="button"
                onClick={() => {
                  setReportMachineId(activeMachine.id);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="hidden md:flex p-1.5 min-w-[24px] min-h-[24px] flex-shrink-0 items-center justify-center rounded-md text-tertiary hover:text-callout-info-fg dark:hover:text-cyber-cyan hover:bg-slate-200/80 dark:hover:bg-zinc-800 transition-colors active:scale-[0.96] cursor-pointer"
                title={`Generate Pentest Report for ${activeMachine.name}`}
                aria-label={`Pentest Report for ${activeMachine.name}`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-slate-300 dark:bg-zinc-800 mx-1" aria-hidden="true" />

              <button
                type="button"
                onClick={() => {
                  setActiveTarget(null);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1.5 min-w-[24px] min-h-[24px] flex-shrink-0 flex items-center justify-center rounded-md text-tertiary hover:text-callout-danger-fg hover:bg-rose-500/10 transition-colors active:scale-[0.95] cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#18181b] border border-slate-300 dark:border-[#27272a] hover:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-mono font-semibold transition-[transform,background-color,border-color,color] active:scale-[0.97] group cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-tertiary dark:text-cyber-muted group-hover:text-cyber-cyan transition-colors" />
            <span>ENGAGE TARGET</span>
            <ChevronDown className={`w-3 h-3 text-tertiary dark:text-cyber-muted group-hover:text-cyber-cyan transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Target Selector Dropdown Popover */}
        {targetDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-slate-300 dark:border-[#27272a] shadow-xl machined-edge z-50 text-xs space-y-2">
            <div className="text-[10px] text-tertiary dark:text-cyber-muted uppercase px-1 font-bold flex items-center justify-between">
              <span>ENGAGE TARGET</span>
              <span className="text-callout-info-fg dark:text-cyber-cyan font-mono font-bold tabular-nums">{machines.length} TOTAL</span>
            </div>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Search target name or IP..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-300 dark:border-[#27272a] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan tabular-nums"
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
                className="w-full p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 flex items-center justify-center gap-1.5 text-callout-danger-fg text-[11px] font-bold transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>DISENGAGE TARGET</span>
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
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-callout-success-fg font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-[#09090b] text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-bold truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-tertiary font-mono flex-shrink-0">{m.ip}</span>
                </button>
              ))}
              {filteredTargets.length === 0 && (
                <div className="text-center py-2 text-tertiary text-[10px]">No targets matching query</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: Quick Actions + Variables + Settings */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        
        {/* Quick Action: Deploy Box */}
        <button
          onClick={() => {
            setNewMachineModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-slate-100 dark:bg-surface-elevated hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 border border-slate-300 dark:border-zinc-800 hover:border-emerald-500/50 text-slate-800 dark:text-zinc-200 hover:text-callout-success-fg dark:hover:text-cyber-emerald text-xs font-mono font-semibold transition-all active:scale-[0.96] flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title="Deploy Custom Lab Target"
          aria-label="Deploy Box - Deploy Custom Lab Target"
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0 text-callout-success-fg" />
          <span className="hidden 2xl:inline">Deploy Box</span>
        </button>

        {/* Quick Action: Scans Hub */}
        <button
          onClick={() => {
            setReconAutomationModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-slate-100 dark:bg-surface-elevated hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-primary text-xs font-mono font-semibold transition-all active:scale-[0.96] flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title="Tactical Recon & Scan Automation (Nmap / Rustscan / XML)"
          aria-label="Scans Hub"
        >
          <Zap className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
          <span className="hidden 2xl:inline">Scans</span>
        </button>

        {/* Tactical Inline Variables Capsule (L | R | P) */}
        <div
          aria-label="Tactical Variables (LHOST / RHOST / LPORT)"
          data-tauri-drag-region="false"
          className="hidden lg:flex items-center gap-1 h-8 px-2 rounded-[6px] bg-slate-100 dark:bg-surface-elevated border border-slate-300/80 dark:border-zinc-800 text-[11px] font-mono group hover:border-zinc-700 dark:hover:border-zinc-600 transition-colors flex-shrink-0 shadow-xs machined-edge"
        >
          {/* L: Attacker IP (Tun0 LHOST) */}
          <div className="flex items-center gap-1" title="Attacker IP (Tun0 LHOST) - Click icon to copy">
            <label
              htmlFor="unified-lhost"
              className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-callout-info-fg dark:text-cyber-cyan border border-cyan-500/30 flex-shrink-0 cursor-pointer select-none"
            >
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
              className="w-16 xl:w-20 bg-transparent text-slate-900 dark:text-zinc-100 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600 font-semibold text-[11px] font-mono tabular-nums tracking-tight truncate"
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.lhost, 'lhost')}
              className="p-0.5 text-tertiary hover:text-callout-info-fg dark:hover:text-cyber-cyan transition-colors cursor-pointer"
              title={copiedVar === 'lhost' ? 'Copied LHOST to clipboard!' : 'Copy LHOST'}
              aria-label="Copy LHOST"
            >
              {copiedVar === 'lhost' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="w-px h-3 bg-slate-300 dark:bg-zinc-800 mx-0.5" aria-hidden="true" />

          {/* R: Target IP (RHOST) */}
          <div className="flex items-center gap-1" title="Target IP (RHOST) - Click icon to copy">
            <label
              htmlFor="unified-target-ip"
              className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-callout-success-fg dark:text-cyber-emerald border border-emerald-500/30 flex-shrink-0 cursor-pointer select-none"
            >
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
              className="w-16 xl:w-20 bg-transparent text-slate-900 dark:text-zinc-100 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600 font-semibold text-[11px] font-mono tabular-nums tracking-tight truncate"
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.targetIp, 'target')}
              className="p-0.5 text-tertiary hover:text-callout-success-fg dark:hover:text-cyber-emerald transition-colors cursor-pointer"
              title={copiedVar === 'target' ? 'Copied Target IP to clipboard!' : 'Copy Target IP (RHOST)'}
              aria-label="Copy Target IP"
            >
              {copiedVar === 'target' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="w-px h-3 bg-slate-300 dark:bg-zinc-800 mx-0.5" aria-hidden="true" />

          {/* P: Listener Port (LPORT) */}
          <div className="flex items-center gap-1" title="Listener Port (LPORT) - Click icon to copy">
            <label
              htmlFor="unified-lport"
              className="px-1 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-callout-tip-fg border border-purple-500/30 flex-shrink-0 cursor-pointer select-none"
            >
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
              className="w-10 xl:w-11 bg-transparent text-slate-900 dark:text-zinc-100 focus:outline-none placeholder-slate-400 dark:placeholder-zinc-600 font-semibold text-[11px] font-mono tabular-nums tracking-tight truncate"
            />
            <button
              type="button"
              onClick={() => handleCopyVar(globalVars.lport, 'lport')}
              className="p-0.5 text-tertiary hover:text-callout-tip-fg transition-colors cursor-pointer"
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

        {/* Quick RevShell Modal Button */}
        <button
          onClick={() => {
            setRevShellModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 hover:border-cyber-cyan/60 text-cyber-cyan font-mono font-bold text-xs transition-all active:scale-[0.96] flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title="Open Rapid Reverse Shell Crafter (Alt+P)"
          aria-label="RevShell - Open Rapid Reverse Shell Crafter"
        >
          <Radio className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="hidden min-[1650px]:inline"><span aria-hidden="true">&gt;_ </span>RevShell</span>
        </button>

        {/* Quick Snippets Slide-Over Button */}
        <button
          onClick={() => {
            setSnippetsDrawerOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-slate-100 dark:bg-surface-elevated hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-primary font-mono font-semibold text-xs transition-all active:scale-[0.96] flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title="Open Tactical Snippets Drawer (Alt+S)"
          aria-label="Snippets - Open Tactical Snippets Drawer"
        >
          <Terminal className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
          <span className="hidden 2xl:inline">Snippets</span>
        </button>

        {/* Command Palette Launcher Pill */}
        <button
          onClick={() => {
            setCommandPaletteOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="hidden xl:flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] bg-slate-100 dark:bg-surface-elevated hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-primary font-mono font-semibold text-xs transition-all active:scale-[0.96] flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title="Open Command Palette (Ctrl+K)"
          aria-label="Open Command Palette"
        >
          <Search className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
          <span className="hidden 2xl:inline">Palette</span>
          <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-bold rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-tertiary border border-slate-300 dark:border-zinc-700">
            Ctrl+K
          </kbd>
        </button>

        {/* Light / Dark Mode Toggle directly in page header */}
        <ThemeToggle size="sm" soundEnabled={soundEnabled} className="flex-shrink-0" />

        {/* Active Operator Profile Switcher Pill */}
        <button
          type="button"
          onClick={() => {
            setOperatorProfileModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="h-8 px-2 rounded-[6px] bg-slate-100 dark:bg-surface-elevated hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-primary text-xs font-sans font-medium flex items-center gap-1.5 transition-all active:scale-[0.96] group flex-shrink-0 cursor-pointer shadow-xs machined-edge"
          title={`Active Operator: ${user?.callsign || user?.name || 'Local Operator'} (${user?.role || 'Offline Mode'}). Click to switch or log in (Alt+O)`}
        >
          {/* Avatar chip with concentric 3px radius and active micro-LED */}
          <div className="w-5 h-5 rounded-[3px] bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-callout-success-fg font-mono flex-shrink-0 relative">
            {(user?.callsign || user?.name || 'OP').charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white dark:border-zinc-950 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
          </div>

          {/* Operator Name with dual-mode high contrast */}
          <span className="hidden sm:inline-block font-semibold text-xs max-w-[80px] xl:max-w-[120px] truncate group-hover:text-callout-success-fg dark:group-hover:text-cyber-emerald transition-colors text-slate-800 dark:text-zinc-200">
            {user?.callsign || user?.name || 'Local Operator'}
          </span>

          {/* Root Badge: Hidden at 1024px to free 65px width budget; visible at >= 1280px (xl) */}
          <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-callout-success-fg font-mono text-[10px] font-bold leading-none tabular-nums flex-shrink-0 shadow-xs">
            <Crosshair className="w-2.5 h-2.5 text-callout-success-fg flex-shrink-0" />
            <span>{operatorRootedCount}</span>
            <span className="text-[8px] font-semibold text-callout-success-fg tracking-wider">ROOT</span>
          </div>

          <ChevronDown className="w-3 h-3 text-tertiary group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-transform duration-200 flex-shrink-0" />
        </button>

        {/* Secondary Settings & Profile Menu */}
        <SettingsDropdown />
      </div>
    </header>
  );
};
