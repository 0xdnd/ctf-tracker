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
  Maximize, 
  Minimize, 
  Zap, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { CyberLogo } from '../common/CyberLogo';
import { PlatformIcon } from '../common/PlatformBadge';
import { formatSeconds, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { SettingsDropdown } from './SettingsDropdown';

export const UnifiedHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    activeTargetId,
    setActiveTarget,
    machines,
    globalVars,
    setGlobalVars,
    isTimerRunning,
    startTimer,
    pauseTimer,
    activeTimerSeconds,
    soundEnabled,
    focusMode,
    toggleFocusMode,
    setRevShellModalOpen,
    setSnippetsDrawerOpen,
    setSelectedMachineId,
  } = useCtfStore(
    useShallow((s) => ({
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      machines: s.machines,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      activeTimerSeconds: s.activeTimerSeconds,
      soundEnabled: s.soundEnabled,
      focusMode: s.focusMode,
      toggleFocusMode: s.toggleFocusMode,
      setRevShellModalOpen: s.setRevShellModalOpen,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      setSelectedMachineId: s.setSelectedMachineId,
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
    if (p.startsWith('/cheatsheets') || p.startsWith('/notes') || p.startsWith('/cpts')) return 'Field Manual';
    if (p.startsWith('/writeup')) return 'Writeup Studio';
    if (p.startsWith('/analytics')) return 'Analytics';
    if (p.startsWith('/methodology')) return 'Methodology';
    if (p.startsWith('/exam')) return 'Exam Sim';
    return 'Tracker';
  }, [location.pathname]);

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

  // Zen Mode minimal strip (strictly 28px)
  if (focusMode) {
    return (
      <header className="h-[28px] max-h-[28px] px-3 bg-zinc-950/95 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono select-none z-40">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-cyan-400 tracking-wider">ZEN MODE</span>
          {activeMachine ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-100 font-bold">{activeMachine.name}</span>
              <span className="text-zinc-500 font-mono">({activeMachine.ip})</span>
              <span className="text-emerald-400 font-mono font-bold">{formatSeconds(activeTimerSeconds)}</span>
            </div>
          ) : (
            <span className="text-zinc-500 text-[10px]">No active target engaged</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSnippetsDrawerOpen(true)}
            className="text-[10px] text-zinc-400 hover:text-cyan-400 flex items-center gap-1"
            title="Snippets (Alt+S)"
          >
            <Terminal className="w-3 h-3" />
            <span>Snippets</span>
          </button>
          <button
            onClick={toggleFocusMode}
            className="text-[10px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800"
            title="Exit Zen Mode (Alt+F)"
          >
            <Minimize className="w-3 h-3" />
            <span>Exit Zen</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="h-[50px] max-h-[52px] px-3 sm:px-4 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between font-mono select-none z-40 backdrop-blur-md">
      
      {/* 1. Left: Brand & Breadcrumb Route Indicator */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <Link 
          to="/tracker" 
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          title="ZEROBOX CTF Tracker"
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-sm shadow-cyan-500/20">
            <span className="text-[11px] font-black text-black">Z</span>
          </div>
          <span className="font-black text-sm tracking-tight text-zinc-100 hidden sm:inline">
            ZERO<span className="text-cyan-400">BOX</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 text-zinc-600 text-xs pl-1">
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-400 text-xs font-medium">{routeName}</span>
        </div>
      </div>

      {/* 2. Center: Active Target Pill & Telemetry */}
      <div className="relative flex items-center gap-2 mx-2" ref={dropdownRef}>
        {activeMachine ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-emerald-500/30 text-xs shadow-sm">
            {/* Target Selector Dropdown Toggle */}
            <button
              onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
              className="flex items-center gap-1.5 text-zinc-100 hover:text-emerald-400 font-bold transition-colors truncate max-w-[130px] sm:max-w-[180px]"
              title="Click to switch active target"
            >
              <PlatformIcon platform={activeMachine.platform} className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{activeMachine.name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {/* Target IP */}
            <span className="text-[10px] text-zinc-400 hidden lg:inline font-mono">
              {activeMachine.ip}
            </span>

            {/* Status Flag Badges */}
            <div className="hidden sm:flex items-center gap-1">
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                activeMachine.userPwnedAt ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-600'
              }`}>
                U
              </span>
              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                activeMachine.rootPwnedAt ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-600'
              }`}>
                R
              </span>
            </div>

            {/* Stopwatch Timer */}
            <div className="flex items-center gap-1 pl-1.5 border-l border-zinc-800">
              <button
                onClick={() => {
                  if (isTimerRunning) pauseTimer();
                  else startTimer();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="text-zinc-400 hover:text-emerald-400 transition-colors"
                title={isTimerRunning ? 'Pause Timer (T)' : 'Start Timer (T)'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3 text-emerald-400" /> : <Play className="w-3 h-3" />}
              </button>
              <span className="text-[10px] font-bold text-emerald-400 font-mono">
                {formatSeconds(activeTimerSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs">No Target Engaged</span>
            <ChevronDown className="w-3 h-3 text-zinc-600" />
          </button>
        )}

        {/* Target Selector Dropdown Popover */}
        {targetDropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-2 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 text-xs space-y-1.5 backdrop-blur-md">
            <div className="text-[10px] text-zinc-400 uppercase px-1 font-bold flex items-center justify-between">
              <span>ENGAGE TARGET</span>
              <span className="text-cyan-400">{machines.length} TOTAL</span>
            </div>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Search target name or IP..."
              className="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
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
                className="w-full p-1.5 rounded bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 flex items-center justify-center gap-1 text-red-400 text-[11px] font-bold transition-colors"
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
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-bold truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">{m.ip}</span>
                </button>
              ))}
              {filteredTargets.length === 0 && (
                <div className="text-center py-2 text-zinc-500 text-[10px]">No targets matching query</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: Compact Variables + Rapid Payload + Focus & Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* Compact Variable Inputs (Hidden on very small screens, responsive) */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px]">
          <div className="flex items-center gap-1 text-zinc-400" title="Attacker IP (Tun0)">
            <span className="font-bold text-zinc-500">L:</span>
            <input
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              placeholder="10.10.14.X"
              className="w-20 bg-transparent text-zinc-200 focus:outline-none focus:text-cyan-400 text-[11px] font-mono"
            />
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1 text-zinc-400" title="Listener Port">
            <span className="font-bold text-zinc-500">P:</span>
            <input
              type="text"
              value={globalVars.lport || ''}
              onChange={(e) => setGlobalVars({ lport: e.target.value })}
              placeholder="4444"
              className="w-11 bg-transparent text-zinc-200 focus:outline-none focus:text-cyan-400 text-[11px] font-mono"
            />
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1 text-zinc-400" title="Target IP (RHOST)">
            <span className="font-bold text-zinc-500">T:</span>
            <input
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              placeholder="10.10.10.X"
              className="w-20 bg-transparent text-zinc-200 focus:outline-none focus:text-emerald-400 text-[11px] font-mono"
            />
          </div>
        </div>

        {/* Quick RevShell Modal Button */}
        <button
          onClick={() => {
            setRevShellModalOpen(true);
            if (soundEnabled) playCyberSound('click');
          }}
          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          title="Open Rapid Reverse Shell Generator"
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
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
          title="Open Tactical Snippets Drawer (Alt+S)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Snippets</span>
        </button>

        {/* Focus / Zen Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Toggle Zen Mode (Alt+F)"
          aria-label="Toggle Zen Mode"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        {/* Top-Right Secondary Settings Kebab Menu */}
        <SettingsDropdown />
      </div>
    </header>
  );
};
