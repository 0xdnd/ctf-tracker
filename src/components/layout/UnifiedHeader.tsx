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
  ShieldAlert
} from 'lucide-react';
import { CyberLogo } from '../common/CyberLogo';
import { PlatformIcon } from '../common/PlatformBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { formatSeconds, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { SettingsDropdown } from './SettingsDropdown';

const UnifiedHeaderTimerDisplay: React.FC = React.memo(() => {
  const activeTimerSeconds = useCtfStore((s) => s.activeTimerSeconds);
  return (
    <span className="text-[10px] font-bold text-emerald-700 dark:text-cyber-emerald font-mono">
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
    }))
  );

  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
    };
    if (targetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [targetDropdownOpen]);

  return (
    <header className="h-[52px] px-3 sm:px-4 bg-white/95 dark:bg-cyber-card/95 border-b border-slate-200 dark:border-cyber-border flex items-center justify-between font-mono select-none z-40 backdrop-blur-md transition-colors flex-shrink-0">
      
      {/* 1. Left: Brand & Breadcrumb Route Indicator */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <Link 
          to="/tracker" 
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          title="ZEROBOX Tactical CTF Dashboard"
        >
          <CyberLogo size="sm" />
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
              ZERO<span className="text-cyan-600 dark:text-cyber-cyan">BOX</span>
            </span>
            <span className="text-[9px] text-slate-500 dark:text-cyber-muted font-sans font-medium tracking-tight">
              Tactical Cyber Ops
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1 text-slate-400 dark:text-zinc-600 text-xs pl-1">
          <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-600" />
          <span className="text-slate-600 dark:text-zinc-300 text-xs font-semibold">{routeName}</span>
        </div>
      </div>

      {/* 2. Center: Active Target Pill & Mission Telemetry */}
      <div className="relative flex items-center gap-2 mx-1 sm:mx-2" ref={dropdownRef}>
        {activeMachine ? (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-emerald-500/40 dark:border-cyber-emerald/50 text-xs shadow-sm">
            {/* Target Dropdown Toggle & Name */}
            <div className="flex items-center gap-1.5">
              <PlatformIcon platform={activeMachine.platform} className="w-3.5 h-3.5 flex-shrink-0" />
              <Link
                to={`/target/${activeMachine.id}`}
                className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyber-cyan transition-colors truncate max-w-[100px] sm:max-w-[140px]"
                title="View Target Command Center"
              >
                {activeMachine.name}
              </Link>
              <button
                onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-cyber-card text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Switch Active Target"
                aria-label="Switch Active Target"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${targetDropdownOpen ? 'rotate-180 text-cyan-600 dark:text-cyber-cyan' : ''}`} />
              </button>
            </div>

            {/* Target IP */}
            <div className="hidden xl:inline-block">
              <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip} size="xs" />
            </div>

            {/* Quick Flags (Clickable) */}
            <div className="flex items-center gap-1 border-l border-slate-300 dark:border-cyber-border pl-1.5">
              <button
                onClick={handleQuickUserPwn}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all flex items-center gap-0.5 ${
                  Boolean(activeMachine.userPwnedAt || activeMachine.userFlag || activeMachine.status === 'foothold' || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-amber-500/20 text-amber-600 dark:text-cyber-amber border border-amber-500/40'
                    : 'bg-white dark:bg-cyber-card hover:bg-amber-500/20 text-slate-500 dark:text-cyber-muted hover:text-amber-600 dark:hover:text-cyber-amber border border-slate-300 dark:border-cyber-border'
                }`}
                title="1-Click: Toggle User Flag"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>USER</span>
              </button>

              <button
                onClick={handleQuickRootPwn}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all flex items-center gap-0.5 ${
                  Boolean(activeMachine.rootPwnedAt || activeMachine.rootFlag || activeMachine.status === 'root' || activeMachine.status === 'completed')
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-cyber-emerald border border-emerald-500/40 shadow-sm'
                    : 'bg-white dark:bg-cyber-card hover:bg-rose-500/20 text-slate-500 dark:text-cyber-muted hover:text-rose-600 dark:hover:text-cyber-crimson border border-slate-300 dark:border-cyber-border'
                }`}
                title="1-Click: Toggle Root Flag (Celebration!)"
              >
                <Flag className="w-2.5 h-2.5" />
                <span>ROOT</span>
              </button>
            </div>

            {/* Stopwatch Timer & Controls */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300 dark:border-cyber-border">
              <button
                onClick={() => {
                  if (isTimerRunning) pauseTimer();
                  else startTimer();
                  if (soundEnabled) playCyberSound('timer');
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-card text-emerald-600 dark:text-cyber-emerald transition-colors"
                title={isTimerRunning ? 'Pause Stopwatch' : 'Start Stopwatch'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3 text-amber-500 dark:text-cyber-amber" /> : <Play className="w-3 h-3" />}
              </button>

              <UnifiedHeaderTimerDisplay />

              <button
                onClick={() => {
                  resetTimer();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-card text-slate-400 dark:text-cyber-muted hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Target Actions: Pentest Report & Disengage */}
            <div className="flex items-center gap-0.5 border-l border-slate-300 dark:border-cyber-border pl-1">
              <button
                onClick={() => {
                  setReportMachineId(activeMachine.id);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 transition-colors"
                title={`Generate Pentest Report for ${activeMachine.name}`}
              >
                <ShieldAlert className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  setActiveTarget(null);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 dark:text-cyber-muted hover:text-rose-500 transition-colors"
                title="Disengage Active Target"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border hover:border-cyan-500 dark:hover:border-cyber-cyan text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-sm group"
          >
            <Crosshair className="w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted group-hover:text-cyan-500 dark:group-hover:text-cyber-cyan transition-colors" />
            <span>ENGAGE TARGET</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 dark:text-cyber-muted group-hover:text-cyan-500 transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Target Selector Dropdown Popover */}
        {targetDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-2 rounded-xl bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border shadow-2xl z-50 text-xs space-y-1.5 backdrop-blur-md">
            <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase px-1 font-bold flex items-center justify-between">
              <span>ENGAGE TARGET</span>
              <span className="text-cyan-600 dark:text-cyber-cyan">{machines.length} TOTAL</span>
            </div>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Search target name or IP..."
              className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-emerald-500"
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
                className="w-full p-1.5 rounded bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 flex items-center justify-center gap-1 text-rose-500 text-[11px] font-bold transition-colors"
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
                  className={`w-full p-1.5 rounded flex items-center justify-between text-left transition-colors text-xs ${
                    activeTargetId === m.id
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                      : 'hover:bg-slate-100 dark:hover:bg-cyber-bg text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-bold truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono flex-shrink-0">{m.ip}</span>
                </button>
              ))}
              {filteredTargets.length === 0 && (
                <div className="text-center py-2 text-slate-500 dark:text-zinc-500 text-[10px]">No targets matching query</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: Quick Actions + Compact Variables + Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        
        {/* Quick Action: Deploy Box */}
        <button
          onClick={() => {
            setNewMachineModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-700 dark:text-cyber-emerald text-xs font-semibold transition-all shadow-sm active:scale-95"
          title="Deploy Custom Lab Target"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Deploy Box</span>
        </button>

        {/* Quick Action: Scans Hub */}
        <button
          onClick={() => {
            setReconAutomationModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border hover:border-cyan-500 dark:hover:border-cyber-cyan text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan text-xs font-semibold transition-all shadow-sm active:scale-95"
          title="Tactical Recon & Scan Automation (Nmap / Rustscan / XML)"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
          <span className="hidden md:inline">Scans</span>
        </button>

        {/* Compact Variable Inputs (Hidden on narrower screens, responsive) */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-[11px]">
          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400" title="Attacker IP (Tun0)">
            <label htmlFor="unified-lhost" className="font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">L:</label>
            <input
              id="unified-lhost"
              name="lhost"
              aria-label="Attacker IP (LHOST)"
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              placeholder="10.10.14.X"
              className="w-20 bg-transparent text-slate-900 dark:text-zinc-200 focus:outline-none focus:text-cyan-600 dark:focus:text-cyber-cyan text-[11px] font-mono"
            />
          </div>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400" title="Listener Port">
            <label htmlFor="unified-lport" className="font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">P:</label>
            <input
              id="unified-lport"
              name="lport"
              aria-label="Listener Port (LPORT)"
              type="text"
              value={globalVars.lport || ''}
              onChange={(e) => setGlobalVars({ lport: e.target.value })}
              placeholder="4444"
              className="w-11 bg-transparent text-slate-900 dark:text-zinc-200 focus:outline-none focus:text-cyan-600 dark:focus:text-cyber-cyan text-[11px] font-mono"
            />
          </div>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400" title="Target IP (RHOST)">
            <label htmlFor="unified-target-ip" className="font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">T:</label>
            <input
              id="unified-target-ip"
              name="targetIp"
              aria-label="Target IP (RHOST)"
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              placeholder="10.10.10.X"
              className="w-20 bg-transparent text-slate-900 dark:text-zinc-200 focus:outline-none focus:text-emerald-600 dark:focus:text-cyber-emerald text-[11px] font-mono"
            />
          </div>
        </div>

        {/* Quick RevShell Modal Button */}
        <button
          onClick={() => {
            setRevShellModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="px-2 sm:px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-600 dark:text-cyber-cyan font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          title="Open Rapid Reverse Shell Crafter"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">&gt;_ RevShell</span>
        </button>

        {/* Quick Snippets Slide-Over Button */}
        <button
          onClick={() => {
            setSnippetsDrawerOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-slate-100 dark:bg-cyber-bg hover:bg-slate-200 dark:hover:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs flex items-center gap-1 transition-all"
          title="Open Tactical Snippets Drawer (Alt+S)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
          <span className="hidden lg:inline">Snippets</span>
        </button>

        {/* Secondary Settings & Profile Menu */}
        <SettingsDropdown />
      </div>
    </header>
  );
};
