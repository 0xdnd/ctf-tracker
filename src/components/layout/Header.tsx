import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Search, 
  Plus, 
  Volume2, 
  VolumeX, 
  Database, 
  ChevronDown, 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  Copy, 
  Check, 
  Crosshair, 
  Flag, 
  Server, 
  Sparkles, 
  Zap,
  ZoomIn,
  ZoomOut,
  Scale,
  Globe,
  ShieldCheck,
  ShieldAlert,
  X,
  Coffee,
  Award,
  Keyboard,
  Layers,
  DownloadCloud,
  RefreshCw
} from 'lucide-react';
import { CyberLogo } from '../common/CyberLogo';
import { PlatformIcon } from '../common/PlatformBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { playCyberSound, formatSeconds, triggerRootCelebration, safeCopyToClipboard, CREATOR_PROFILE_LINKS } from '../../utils/helpers';
import { UserMenu } from '../auth/UserMenu';
import { ThemeToggle } from '../common/ThemeToggle';
import { ThemePresetDropdown } from '../common/ThemePresetDropdown';
import { useDesktopUpdater } from '../../hooks/useDesktopUpdater';

const ZEROBOX_BRAND = { 
  id: 'zerobox', 
  namePrefix: 'ZERO', 
  nameSuffix: 'BOX', 
  suffixColor: 'text-cyber-cyan', 
  tagline: 'Tactical Cyber Operations Suite' 
};
const BRAND_THEMES = [ZEROBOX_BRAND];

const MissionStopwatchDisplay: React.FC = () => {
  const activeTimerSeconds = useCtfStore((s) => s.activeTimerSeconds);
  return (
    <span className="text-[10px] text-cyber-emerald font-bold px-1 py-0.2 rounded bg-cyber-bg border border-cyber-emerald/30 font-mono">
      {formatSeconds(activeTimerSeconds)}
    </span>
  );
};

const TargetSelectorDropdown: React.FC<{
  onClose: () => void;
  onSelect: (id: string | null) => void;
  soundEnabled: boolean;
  activeTargetId?: string | null;
}> = ({ onClose, onSelect, soundEnabled, activeTargetId }) => {
  const machines = useCtfStore((s) => s.machines);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return machines.slice(0, 10);
    return machines
      .filter((m) => m.name.toLowerCase().includes(term) || m.ip.includes(term))
      .slice(0, 10);
  }, [machines, searchTerm]);

  return (
    <div 
      className="absolute left-0 top-full mt-2 w-72 p-2 rounded-xl bg-cyber-card border border-cyber-border shadow-2xl z-50 font-mono text-xs space-y-1.5 backdrop-blur-md"
      onMouseLeave={onClose}
    >
      <div className="text-[10px] text-cyber-muted uppercase px-1 font-bold flex items-center justify-between">
        <span>ENGAGE MACHINE</span>
        <span className="text-cyber-cyan">{machines.length} TARGETS</span>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Type box name or IP..."
        className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-cyber-emerald"
        autoFocus
      />
      {activeTargetId && (
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className="w-full p-1.5 rounded bg-cyber-crimson/10 border border-cyber-crimson/30 hover:bg-cyber-crimson/20 flex items-center justify-center gap-1.5 text-cyber-crimson text-[11px] font-bold transition-colors"
        >
          <X className="w-3 h-3" />
          <span>DISENGAGE / CLOSE ACTIVE TARGET</span>
        </button>
      )}
      <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              onSelect(m.id);
              onClose();
              if (soundEnabled) playCyberSound('toggle');
            }}
            className="w-full p-1.5 rounded hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center justify-between text-left transition-colors text-xs"
          >
            <div className="flex items-center justify-between gap-2 min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <PlatformIcon platform={m.platform} className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white truncate">{m.name}</span>
              </div>
              <span className="text-[10px] text-cyber-muted flex-shrink-0 font-mono">{m.ip}</span>
            </div>
            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
              m.status === 'root' || m.status === 'completed' ? 'text-cyber-emerald' :
              m.status === 'foothold' ? 'text-cyber-amber' : 'text-cyber-muted'
            }`}>
              {m.status.toUpperCase()}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-2 text-cyber-muted text-[10px]">No targets matching query</div>
        )}
      </div>
    </div>
  );
};

export const Header: React.FC = () => {
  const {
    activeTargetId,
    setActiveTarget,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    soundEnabled,
    toggleSound,
    globalVars,
    setGlobalVars,
    appBrand,
    setAppBrand,
    updateMachine,
    setCommandPaletteOpen,
    setNewMachineModalOpen,
    setBackupModalOpen,
    setReconAutomationModalOpen,
    setOperatorModalOpen,
    setLicenseModalOpen,
    setFlexCardModalOpen,
    setShortcutsModalOpen,
    setReportMachineId,
    uiScale,
    cycleUiScale,
    zoomIn,
    zoomOut,
  } = useCtfStore(
    useShallow((s) => ({
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resetTimer: s.resetTimer,
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      appBrand: s.appBrand,
      setAppBrand: s.setAppBrand,
      updateMachine: s.updateMachine,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setLicenseModalOpen: s.setLicenseModalOpen,
      setFlexCardModalOpen: s.setFlexCardModalOpen,
      setShortcutsModalOpen: s.setShortcutsModalOpen,
      setReportMachineId: s.setReportMachineId,
      uiScale: s.uiScale,
      cycleUiScale: s.cycleUiScale,
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
    }))
  );

  const activeMachine = useCtfStore((s) => 
    s.activeTargetId ? s.machines.find((m) => m.id === s.activeTargetId) || null : null
  );

  const { user } = useAuthStore();
  const updater = useDesktopUpdater();
  const navigate = useNavigate();
  const location = useLocation();

  const [targetSelectorOpen, setTargetSelectorOpen] = useState(false);
  const [copiedTargetIp, setCopiedTargetIp] = useState(false);
  const [copiedVar, setCopiedVar] = useState<'lhost' | 'lport' | 'target' | null>(null);
  const [tacticalArsenalOpen, setTacticalArsenalOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setTacticalArsenalOpen(false);
    setTargetSelectorOpen(false);
  }, [location.pathname]);

  const activeBrand = BRAND_THEMES.find((b) => b.id === 'zerobox') || BRAND_THEMES[0];

  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));

  useEffect(() => {
    if (uiScale !== 'auto') return;
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uiScale]);

  const getAutoZoomPercent = (width: number): string => {
    if (width >= 1600) return '100%';
    if (width >= 1360) return '90%';
    if (width >= 1150) return '82%';
    if (width >= 960) return '75%';
    if (width >= 768) return '70%';
    return '100%';
  };

  useEffect(() => {
    if (appBrand !== 'zerobox') {
      setAppBrand('zerobox');
    }
  }, [appBrand, setAppBrand]);

  const handleQuickUserPwn = () => {
    if (!activeMachine) return;
    updateMachine(activeMachine.id, {
      status: activeMachine.status === 'root' || activeMachine.status === 'completed' ? activeMachine.status : 'foothold',
      userPwnedAt: new Date().toISOString(),
      userFlag: activeMachine.userFlag || 'FLAG{USER_CAPTURED_VIA_COMBAT_HUD}'
    });
    if (soundEnabled) playCyberSound('flag');
  };

  const handleQuickRootPwn = () => {
    if (!activeMachine) return;
    updateMachine(activeMachine.id, {
      status: 'root',
      rootPwnedAt: new Date().toISOString(),
      rootFlag: activeMachine.rootFlag || 'FLAG{ROOT_CAPTURED_VIA_COMBAT_HUD}'
    });
    pauseTimer();
    triggerRootCelebration();
    if (soundEnabled) playCyberSound('root');
  };

  const handleCopyTargetIp = async () => {
    if (!activeMachine) return;
    await safeCopyToClipboard(activeMachine.ip);
    setCopiedTargetIp(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedTargetIp(false), 2000);
  };

  const handleCopyVar = async (val: string, field: 'lhost' | 'lport' | 'target') => {
    if (!val) return;
    await safeCopyToClipboard(val);
    setCopiedVar(field);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-cyber-border bg-white/95 dark:bg-cyber-bg/95 text-slate-900 dark:text-cyber-text backdrop-blur-md transition-colors">
      
      {/* Tier 1: Primary Bar (Brand on Left, Centered Global Search, Tools & Profile on Right) */}
      <div className="w-full px-4 xl:px-6 py-2 border-b border-slate-200/60 dark:border-cyber-border/40 flex items-center justify-between gap-2 xl:gap-3 overflow-x-clip">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <div className="relative">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Link to="/tracker" className="flex items-center gap-3 group flex-shrink-0">
                <CyberLogo size="lg" />
                <div className="text-left whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-mono font-extrabold text-lg tracking-wider text-slate-900 dark:text-white">
                      {activeBrand.namePrefix}
                      <span className={activeBrand.suffixColor}>{activeBrand.nameSuffix}</span>
                    </span>
                  </div>
                  <div className="hidden sm:flex text-[11px] font-mono text-slate-500 dark:text-cyber-muted tracking-tight items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-cyber-emerald inline-block shadow-[0_0_8px_#10B981]" />
                    <span>{activeBrand.tagline}</span>
                  </div>
                </div>
              </Link>

              {/* Creator & Social Operations Capsule (Responsive Tiering) */}
              <div className="hidden lg:flex items-center gap-1.5 ml-1.5 pl-2 border-l border-slate-300 dark:border-cyber-border/70 font-mono text-xs flex-shrink-0">
                {/* Creator Avatar & Dossier Trigger */}
                <button
                  onClick={() => {
                    setOperatorModalOpen(true);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-cyber-card/90 hover:bg-cyber-emerald/10 border border-slate-300 dark:border-cyber-border hover:border-cyber-emerald text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-all group shadow-sm flex-shrink-0"
                  title="View Creator Dossier & Portfolio (Daniel Dayan)"
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyber-emerald/30 via-cyber-card to-cyber-cyan/30 border border-cyber-emerald/60 flex items-center justify-center text-[10px] font-black text-cyber-emerald shadow-[0_0_6px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform flex-shrink-0">
                    DD
                  </div>
                  <div className="flex flex-col text-left leading-none">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-900 dark:text-white group-hover:text-cyber-emerald transition-colors text-[11px]">
                        Daniel Dayan
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse" />
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-cyber-muted tracking-tight group-hover:text-cyber-cyan transition-colors">
                      @0xdnd
                    </span>
                  </div>
                </button>

                {/* Direct Quick Action Links (2xl+ viewport only to prevent header wrap on 1024px-1440px) */}
                <div className="hidden 2xl:flex items-center gap-1">
                  {/* Portfolio */}
                  <a
                    href={CREATOR_PROFILE_LINKS.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-card hover:bg-cyber-emerald/20 border border-slate-300 dark:border-cyber-border hover:border-cyber-emerald text-emerald-700 dark:text-cyber-emerald transition-all hover:scale-105 shadow-sm group"
                    title="Daniel Dayan Official Portfolio Website (0xdnd.github.io)"
                  >
                    <Globe className="w-3.5 h-3.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                  </a>

                  {/* LinkedIn */}
                  <a
                    href={CREATOR_PROFILE_LINKS.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-card hover:bg-[#0077B5]/25 border border-slate-300 dark:border-cyber-border hover:border-[#0077B5] text-[#0077B5] hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 shadow-sm group"
                    title="Daniel Dayan on LinkedIn"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/>
                    </svg>
                  </a>

                  {/* GitHub */}
                  <a
                    href={CREATOR_PROFILE_LINKS.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-card hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-300 dark:border-cyber-border hover:border-slate-500 dark:hover:border-white text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 shadow-sm group"
                    title="0xdnd on GitHub"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  </a>
                </div>

              </div>

              {/* Compact Mobile / Tablet Creator Trigger */}
              <button
                onClick={() => {
                  setOperatorModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="hidden sm:flex lg:hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-cyber-emerald/10 border border-cyber-emerald/40 text-cyber-emerald text-[10px] font-bold ml-1 hover:bg-cyber-emerald/20 transition-all flex-shrink-0"
                title="View Creator Dossier & Portfolio (Daniel Dayan)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald" />
                <span className="text-slate-900 dark:text-white font-bold">Daniel Dayan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: Quick Command Search (Ctrl+K) */}
        <div className="hidden xl:flex items-center justify-center flex-1 min-w-0 max-w-xs 2xl:max-w-sm mx-auto">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full max-w-[240px] 2xl:max-w-[280px] flex items-center justify-between px-3 py-1.5 text-xs font-mono rounded-lg bg-cyber-card/80 border border-cyber-border text-cyber-muted hover:text-cyber-text hover:border-cyber-cyan/50 transition-all shadow-inner group flex-shrink-0"
            title="Global Quick Search (Ctrl+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-cyber-emerald group-hover:text-cyber-cyan transition-colors flex-shrink-0" />
              <span className="text-[10px] 2xl:text-[11px] text-slate-500 dark:text-cyber-muted group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">
                Search...
              </span>
            </div>
            <kbd className="hidden lg:inline-block px-1 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-cyan font-bold shadow-sm flex-shrink-0 ml-1">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Tactical Toggles & GOOGLE PROFILE (PERMANENTLY PINNED TOP RIGHT) */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {/* Tactical Utilities (Theme, CRT, Sound, Backup) */}
          <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-200 dark:border-cyber-border/80 pr-2 flex-shrink-0">
            <ThemeToggle size="sm" soundEnabled={soundEnabled} className="flex-shrink-0" />
            <div className="flex-shrink-0">
              <ThemePresetDropdown />
            </div>

            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-md border transition-all flex-shrink-0 ${
                soundEnabled 
                  ? 'bg-slate-100 dark:bg-cyber-card border-slate-300 dark:border-cyber-border text-cyber-emerald hover:border-cyber-emerald/50' 
                  : 'bg-slate-100 dark:bg-cyber-card border-slate-300 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title={soundEnabled ? 'Mute Cyber Audio FX' : 'Enable Cyber Audio FX'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setBackupModalOpen(true)}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-purple transition-all flex-shrink-0"
              title="Backup & Restore JSON State"
            >
              <Database className="w-3.5 h-3.5" />
            </button>

            {/* Tactical Display Scale / Zoom Controls (Zoom Out, Badge, Zoom In) */}
            <div 
              className="flex items-center rounded-md border border-slate-300 dark:border-cyber-border bg-slate-100 dark:bg-cyber-card/90 p-0.5 shadow-sm text-xs font-mono flex-shrink-0"
              data-testid="ui-zoom-controller"
            >
              {/* Zoom Out / Make Smaller Button */}
              <button
                onClick={() => {
                  zoomOut();
                  if (soundEnabled) playCyberSound('click');
                }}
                disabled={uiScale === 'tiny'}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Make UI Smaller (Zoom Out: 122% → 110% → 100% → 90% → 80%)"
                aria-label="Make UI smaller"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Current Zoom Percentage (Click to cycle or reset) */}
              <button
                onClick={() => {
                  cycleUiScale();
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                  uiScale !== 'normal'
                    ? 'bg-cyber-cyan/20 text-cyan-800 dark:text-cyber-cyan border border-cyber-cyan/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                }`}
                title={`Display Scale: ${
                  uiScale === 'auto'
                    ? `Auto-Resolution (${getAutoZoomPercent(windowWidth)} dynamic)`
                    : uiScale === 'tiny'
                    ? '80% (Tiny)'
                    : uiScale === 'compact'
                    ? '90% (Compact)'
                    : uiScale === 'large'
                    ? '110% (Large)'
                    : uiScale === 'huge'
                    ? '122% (Huge)'
                    : '100% (Normal)'
                }. Click to cycle.`}
              >
                {uiScale === 'auto'
                  ? `AUTO ${getAutoZoomPercent(windowWidth)}`
                  : uiScale === 'tiny'
                  ? '80%'
                  : uiScale === 'compact'
                  ? '90%'
                  : uiScale === 'large'
                  ? '110%'
                  : uiScale === 'huge'
                  ? '122%'
                  : '100%'}
              </button>

              {/* Zoom In / Make Bigger Button */}
              <button
                onClick={() => {
                  zoomIn();
                  if (soundEnabled) playCyberSound('click');
                }}
                disabled={uiScale === 'huge'}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Make UI Bigger (Zoom In: 80% → 90% → 100% → 110% → 122%)"
                aria-label="Make UI bigger"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop Auto-Updater Widget (Active only in Electron) */}
            {updater.isElectron && (
              <div className="flex items-center flex-shrink-0" data-testid="desktop-updater-widget">
                {updater.status === 'downloaded' ? (
                  <button
                    onClick={updater.quitAndInstall}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] animate-bounce shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
                    title={`Update v${updater.latestVersion} ready. Click to restart and install.`}
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>Restart to Apply</span>
                  </button>
                ) : updater.status === 'downloading' ? (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyber-card border border-cyber-cyan/50 text-cyber-cyan text-[11px] font-mono shadow-sm"
                    title="Downloading latest update from GitHub Releases"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin text-cyber-cyan" />
                    <span>Updating {updater.progressPercent}%</span>
                  </div>
                ) : updater.status === 'available' ? (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyber-card border border-cyber-amber/50 text-cyber-amber text-[11px] font-mono"
                    title={`Found update v${updater.latestVersion}, preparing download...`}
                  >
                    <DownloadCloud className="w-3 h-3 text-cyber-amber animate-pulse" />
                    <span>v{updater.latestVersion} Available</span>
                  </div>
                ) : updater.status === 'checking' ? (
                  <div 
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyber-card border border-cyber-border text-cyber-muted text-[10px] font-mono"
                    title="Checking GitHub for new releases..."
                  >
                    <RefreshCw className="w-3 h-3 animate-spin text-cyber-muted" />
                    <span className="hidden xl:inline">Checking</span>
                  </div>
                ) : (
                  <button
                    onClick={() => updater.checkForUpdates()}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-all text-[11px] font-mono cursor-pointer"
                    title={`ZeroBox Desktop v${updater.version || '2.0.0'}. Click to check GitHub for updates.`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden xl:inline">v{updater.version || '2.0.0'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Profile & 1-Click Save Station */}
          <div className="flex-shrink-0">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Tier 2: Tactical Operations Strip (Combat HUD, Automations, Add Box & Payload Vars) */}
      <div className="w-full px-3 xl:px-5 py-1 bg-cyber-card/40 flex items-center justify-between gap-2 text-xs font-mono relative z-20">
        
        {/* Left: Active Target HUD / Quick Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeMachine ? (
            <div className="flex items-center gap-2 bg-cyber-card border border-cyber-emerald/50 px-2.5 py-1 rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.25)] relative">
              <PlatformIcon platform={activeMachine.platform} className="w-4 h-4 flex-shrink-0" />
              
              {/* Machine Name & IP */}
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/target/${activeMachine.id}`}
                  className="font-bold text-slate-900 dark:text-white hover:text-cyber-cyan transition-colors truncate max-w-[110px]"
                  title="Open Mission Command Center"
                >
                  {activeMachine.name}
                </Link>

                {/* Editable Target IP Badge */}
                <EditableIpBadge machineId={activeMachine.id} initialIp={activeMachine.ip} size="xs" />
              </div>

              {/* 1-Click Quick Flags */}
              <div className="flex items-center gap-1 border-l border-cyber-border pl-1.5">
                {Boolean(activeMachine.userPwnedAt || activeMachine.userFlag || activeMachine.status === 'foothold' || activeMachine.status === 'root' || activeMachine.status === 'completed') ? (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 flex items-center gap-0.5"
                    title="User flag captured!"
                  >
                    ✓ USER
                  </span>
                ) : (
                  <button
                    onClick={handleQuickUserPwn}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyber-bg hover:bg-cyber-amber hover:text-black text-cyber-amber border border-cyber-amber/50 transition-all flex items-center gap-0.5"
                    title="1-Click: Log User Foothold Pwn"
                  >
                    <Flag className="w-2.5 h-2.5" /> +USER
                  </button>
                )}

                {Boolean(activeMachine.rootPwnedAt || activeMachine.rootFlag || activeMachine.status === 'root' || activeMachine.status === 'completed') ? (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 shadow-glow-emerald/20 flex items-center gap-0.5"
                    title="System rooted!"
                  >
                    👑 ROOT
                  </span>
                ) : (
                  <button
                    onClick={handleQuickRootPwn}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyber-bg hover:bg-cyber-crimson hover:text-white text-cyber-crimson border border-cyber-crimson/60 animate-pulse transition-all flex items-center gap-0.5"
                    title="1-Click: Log Root Pwn (Celebration!)"
                  >
                    <Flag className="w-2.5 h-2.5" /> +ROOT
                  </button>
                )}
              </div>

              {/* Mission Stopwatch */}
              <div className="flex items-center gap-1 border-l border-cyber-border pl-1.5">
                <MissionStopwatchDisplay />
                {isTimerRunning ? (
                  <button
                    onClick={() => {
                      pauseTimer();
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className="p-1 rounded hover:bg-cyber-bg text-cyber-amber transition-colors"
                    title="Pause Stopwatch"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startTimer();
                      if (soundEnabled) playCyberSound('timer');
                    }}
                    className="p-1 rounded hover:bg-cyber-bg text-cyber-emerald transition-colors"
                    title="Start Stopwatch"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => {
                    resetTimer();
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-cyber-bg text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Reset Stopwatch"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Target Controls: Pentest Report, Switch & Close/Disengage */}
              <div className="flex items-center gap-0.5 border-l border-slate-300 dark:border-cyber-border pl-1">
                <button
                  onClick={() => {
                    setReportMachineId(activeMachine.id);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                  title={`Generate CVSS 3.1 & Pentest Report for ${activeMachine.name}`}
                  aria-label="Generate Pentest Report"
                >
                  <ShieldAlert className="w-3 h-3" />
                </button>

                <button
                  onClick={() => setTargetSelectorOpen(!targetSelectorOpen)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-cyber-bg text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Switch Target Box"
                  aria-label="Switch Target Box"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${targetSelectorOpen ? 'rotate-180 text-cyber-cyan' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setActiveTarget(null);
                    setTargetSelectorOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="p-1 rounded hover:bg-cyber-crimson/20 hover:text-cyber-crimson text-cyber-muted transition-colors"
                  title="Close / Disengage Active Target HUD"
                  aria-label="Close active target"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Target Selector Dropdown */}
              {targetSelectorOpen && (
                <TargetSelectorDropdown
                  onClose={() => setTargetSelectorOpen(false)}
                  onSelect={setActiveTarget}
                  soundEnabled={soundEnabled}
                  activeTargetId={activeTargetId}
                />
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setTargetSelectorOpen(!targetSelectorOpen)}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border hover:border-cyber-cyan text-slate-800 dark:text-white text-xs font-semibold transition-all shadow-sm group"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-cyber-muted group-hover:bg-cyber-cyan transition-colors" />
                <span>ENGAGE TARGET</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-cyber-muted group-hover:text-cyber-cyan transition-transform ${targetSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Target Selector Dropdown */}
              {targetSelectorOpen && (
                <TargetSelectorDropdown
                  onClose={() => setTargetSelectorOpen(false)}
                  onSelect={setActiveTarget}
                  soundEnabled={soundEnabled}
                  activeTargetId={activeTargetId}
                />
              )}
            </div>
          )}

          {/* Primary Action: Deploy Target Box */}
          <button
            onClick={() => {
              setNewMachineModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/15 hover:bg-emerald-200 dark:hover:bg-cyber-emerald/25 text-emerald-900 dark:text-cyber-emerald border border-emerald-300 dark:border-cyber-emerald/40 hover:border-emerald-400 dark:hover:border-cyber-emerald font-mono text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
            title="Deploy Custom Lab Box (Create Target)"
            aria-label="Deploy Custom Lab Box"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Deploy Box</span>
          </button>

          {/* Quick Action: Tactical Recon & Scan Importer */}
          <button
            onClick={() => {
              setReconAutomationModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyber-bg border border-cyber-border hover:border-cyber-cyan text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan font-mono text-xs font-semibold transition-all shadow-sm active:scale-95 flex-shrink-0"
            title="Tactical Automation Hub (Nmap, Masscan, Rustscan, Nessus multi-format scan parser)"
            aria-label="Open Scans Automation Hub"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
            <span className="hidden sm:inline">Scans</span>
          </button>

          {/* Consolidated Tactical Arsenal Dropdown Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setTacticalArsenalOpen(!tacticalArsenalOpen);
                if (soundEnabled) playCyberSound('click');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all shadow-sm active:scale-95 border ${
                tacticalArsenalOpen
                  ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-cyber-bg border-cyber-border hover:border-cyber-cyan text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan'
              }`}
              title="Tactical Operations Arsenal (Flex Scorecard, Shortcuts, Pentest Reports, Payloads)"
              aria-label="Open Tactical Arsenal Menu"
              aria-expanded={tacticalArsenalOpen}
            >
              <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden md:inline">Arsenal</span>
              <ChevronDown className={`w-3 h-3 text-cyber-muted transition-transform duration-200 ${tacticalArsenalOpen ? 'rotate-180 text-cyber-cyan' : ''}`} />
            </button>

            {/* Tactical Arsenal Popover Dropdown */}
            {tacticalArsenalOpen && (
              <div 
                className="absolute left-0 top-full mt-2 w-64 p-1.5 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border shadow-2xl z-50 font-mono text-xs space-y-1 backdrop-blur-md"
                onMouseLeave={() => setTacticalArsenalOpen(false)}
              >
                <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase px-2 py-1 font-bold border-b border-slate-100 dark:border-cyber-border/60 flex items-center justify-between">
                  <span>TACTICAL ARSENAL</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono text-[9px]">v2.0</span>
                </div>

                {/* Reverse Shell Forge */}
                <button
                  onClick={() => {
                    navigate('/cheatsheets?tab=revshell');
                    setTacticalArsenalOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:text-cyber-cyan transition-colors group"
                >
                  <Terminal className="w-4 h-4 text-cyan-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">Reverse Shell Forge</span>
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted">Generate dynamic one-liners</span>
                  </div>
                </button>

                {/* Operator Flex Card Modal */}
                <button
                  onClick={() => {
                    setFlexCardModalOpen(true);
                    setTacticalArsenalOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:text-purple-400 transition-colors group"
                >
                  <Award className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">Operator Flex Card</span>
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted">Verifiable scorecard export</span>
                  </div>
                </button>

                {/* Pentest Report Generator */}
                <button
                  onClick={() => {
                    const targetId = activeMachine?.id || useCtfStore.getState().machines[0]?.id || null;
                    if (targetId) {
                      setReportMachineId(targetId);
                    }
                    setTacticalArsenalOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:text-rose-400 transition-colors group"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">Pentest Report (CVSS 3.1)</span>
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted">Executive finding documentation</span>
                  </div>
                </button>

                {/* Tactical Shortcuts */}
                <button
                  onClick={() => {
                    setShortcutsModalOpen(true);
                    setTacticalArsenalOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:text-amber-400 transition-colors group"
                >
                  <Keyboard className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">Keyboard Shortcuts</span>
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted">Press ? for tactical hotkeys</span>
                  </div>
                </button>

                {/* State Backup */}
                <button
                  onClick={() => {
                    setBackupModalOpen(true);
                    setTacticalArsenalOpen(false);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-cyber-bg flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:text-emerald-400 transition-colors group"
                >
                  <Database className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">Backup & Restore</span>
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted">JSON database state snapshot</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tier 2 Right: Live Variable Injection Hub (LHOST, LPORT, TARGET) & RevShell */}
        <div className="hidden sm:flex items-center gap-1.5 bg-cyber-card/80 border border-cyber-border/80 rounded-lg p-1 px-2 font-mono text-xs flex-shrink-0">
          <span className="text-[10px] uppercase font-semibold text-cyber-cyan tracking-wider flex items-center gap-1 mr-1">
            <Server className="w-3 h-3" />
            <span className="hidden xl:inline">VARS</span>
          </span>

          {/* LHOST */}
          <div className={`flex items-center gap-1 bg-cyber-bg px-1.5 py-0.5 rounded border transition-all ${copiedVar === 'lhost' ? 'border-cyber-emerald bg-cyber-emerald/10' : 'border-cyber-border focus-within:border-cyber-cyan'}`}>
            <span className="text-[10px] text-cyber-muted font-bold flex-shrink-0">L:</span>
            <input
              type="text"
              id="header-lhost-input"
              name="header-lhost"
              aria-label="Attacker Listening Host IP"
              value={globalVars.lhost}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="w-[90px] bg-transparent text-slate-900 dark:text-white font-mono text-[11px] tracking-tight focus:outline-none"
              placeholder="10.10.14.x"
            />
            <button onClick={() => handleCopyVar(globalVars.lhost, 'lhost')} className="p-0.5 text-cyber-muted hover:text-cyber-cyan">
              {copiedVar === 'lhost' ? <Check className="w-3 h-3 text-cyber-emerald" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* LPORT */}
          <div className={`flex items-center gap-1 bg-cyber-bg px-1.5 py-0.5 rounded border transition-all ${copiedVar === 'lport' ? 'border-cyber-emerald bg-cyber-emerald/10' : 'border-cyber-border focus-within:border-cyber-cyan'}`}>
            <span className="text-[10px] text-cyber-muted font-bold flex-shrink-0">P:</span>
            <input
              type="text"
              id="header-lport-input"
              name="header-lport"
              aria-label="Attacker Listening Port"
              value={globalVars.lport}
              onChange={(e) => setGlobalVars({ lport: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="w-[40px] bg-transparent text-slate-900 dark:text-white font-mono text-[11px] text-center tracking-tight focus:outline-none"
              placeholder="4444"
            />
            <button onClick={() => handleCopyVar(globalVars.lport, 'lport')} className="p-0.5 text-cyber-muted hover:text-cyber-cyan">
              {copiedVar === 'lport' ? <Check className="w-3 h-3 text-cyber-emerald" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* TARGET */}
          <div className={`flex items-center gap-1 bg-cyber-bg px-1.5 py-0.5 rounded border transition-all ${copiedVar === 'target' ? 'border-cyber-emerald bg-cyber-emerald/10' : 'border-cyber-border focus-within:border-cyber-emerald'}`}>
            <span className="text-[10px] text-cyber-emerald font-bold flex-shrink-0">T:</span>
            <input
              type="text"
              id="header-target-ip-input"
              name="header-target-ip"
              aria-label="Target Host IP"
              data-testid="header-target-ip-input"
              value={globalVars.targetIp}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              onFocus={(e) => e.target.select()}
              className="w-[90px] bg-transparent text-emerald-800 dark:text-cyber-emerald font-mono text-[11px] font-semibold tracking-tight focus:outline-none"
              placeholder="10.10.10.x"
            />
            <button onClick={() => handleCopyVar(globalVars.targetIp, 'target')} className="p-0.5 text-cyber-muted hover:text-cyber-emerald">
              {copiedVar === 'target' ? <Check className="w-3 h-3 text-cyber-emerald" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Quick Launch: Reverse Shell Forge */}
          <button
            onClick={() => {
              navigate('/cheatsheets?tab=revshell');
              if (soundEnabled) playCyberSound('click');
            }}
            className="flex items-center gap-1 bg-cyber-bg hover:bg-cyan-500/15 text-cyan-700 dark:text-cyber-cyan px-2 py-0.5 rounded border border-cyber-border hover:border-cyber-cyan transition-all text-[11px] font-semibold flex-shrink-0"
            title="Launch Reverse Shell Forge with active LHOST/LPORT"
            aria-label="Reverse Shell Forge"
          >
            <Terminal className="w-3 h-3" />
            <span className="hidden lg:inline">RevShell</span>
          </button>
        </div>
      </div>

    </header>
  );
};
