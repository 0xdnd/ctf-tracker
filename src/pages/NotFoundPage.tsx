import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Home, 
  Search, 
  ArrowLeft, 
  Terminal, 
  BookOpen, 
  ShieldAlert, 
  Sparkles, 
  Compass, 
  Activity, 
  GraduationCap, 
  Layers,
  CornerDownRight
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { playCyberSound } from '../utils/helpers';

interface SuggestedRoute {
  path: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const MODULE_ROUTES: SuggestedRoute[] = [
  { path: '/tracker', name: 'Mission Control Tracker', description: '929 HTB/THM Machines & 5-Stage Kanban', icon: Home },
  { path: '/methodology', name: 'Methodology Framework', description: 'Attack Lifecycle, Recon & Privilege Escalation', icon: Layers },
  { path: '/cheatsheets', name: 'Cheatsheet & Shell Crafter', description: 'Dynamic LHOST/LPORT commands & reverse shells', icon: Terminal },
  { path: '/field-manual', name: 'CPTS Field Manual', description: 'Searchable Obsidian Notes Vault & Wikilinks', icon: BookOpen },
  { path: '/writeup', name: 'Pentest Writeup Studio', description: 'Dual-pane markdown reporting & export', icon: ShieldAlert },
  { path: '/exam', name: '24-Hour Exam Simulator', description: 'CPTS & OSCP mock testing environment', icon: GraduationCap },
  { path: '/analytics', name: 'Proficiency Skill Radar', description: 'Vector radar charts & 90-day activity matrix', icon: Activity },
];

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const setCommandPaletteOpen = useCtfStore((s) => s.setCommandPaletteOpen);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  // Normalize current path and hash
  const currentUnresolved = useMemo(() => {
    const raw = (location.pathname + location.hash).replace(/^#\/?/, '/');
    return raw || '/unknown';
  }, [location.pathname, location.hash]);

  // Intelligent fuzzy match detection based on route segments
  const suggestedMatch = useMemo<SuggestedRoute | null>(() => {
    const lower = currentUnresolved.toLowerCase();
    
    if (lower.includes('cheat') || lower.includes('shell') || lower.includes('payload') || lower.includes('rev')) {
      return MODULE_ROUTES.find(r => r.path === '/cheatsheets') || null;
    }
    if (lower.includes('manual') || lower.includes('note') || lower.includes('cpts') || lower.includes('obsidian') || lower.includes('vault')) {
      return MODULE_ROUTES.find(r => r.path === '/field-manual') || null;
    }
    if (lower.includes('method') || lower.includes('recon') || lower.includes('framework') || lower.includes('ptes')) {
      return MODULE_ROUTES.find(r => r.path === '/methodology') || null;
    }
    if (lower.includes('write') || lower.includes('report') || lower.includes('doc')) {
      return MODULE_ROUTES.find(r => r.path === '/writeup') || null;
    }
    if (lower.includes('exam') || lower.includes('oscp') || lower.includes('cert') || lower.includes('mock')) {
      return MODULE_ROUTES.find(r => r.path === '/exam') || null;
    }
    if (lower.includes('stat') || lower.includes('radar') || lower.includes('analytic') || lower.includes('metric')) {
      return MODULE_ROUTES.find(r => r.path === '/analytics') || null;
    }
    if (lower.includes('box') || lower.includes('machine') || lower.includes('target') || lower.includes('htb') || lower.includes('thm')) {
      return MODULE_ROUTES.find(r => r.path === '/tracker') || null;
    }
    return null;
  }, [currentUnresolved]);

  // Keyboard shortcut listeners (T: Tracker, Esc: Step Back, Ctrl+K: Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (soundEnabled) playCyberSound('click');
        navigate('/tracker');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (soundEnabled) playCyberSound('click');
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, soundEnabled]);

  const handleReturnHome = () => {
    if (soundEnabled) playCyberSound('click');
    navigate('/tracker');
  };

  const handleOpenPalette = () => {
    if (soundEnabled) playCyberSound('click');
    setCommandPaletteOpen(true);
  };

  const handleGoBack = () => {
    if (soundEnabled) playCyberSound('click');
    navigate(-1);
  };

  const handleNavigateSuggested = (path: string) => {
    if (soundEnabled) playCyberSound('click');
    navigate(path);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 font-mono relative">
      {/* Background Ambience Radial Cyber Field */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(6,182,212,0.1),transparent_70%)]" />

      {/* Main Glassmorphic Elevation Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="relative z-10 w-full max-w-2xl bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Status Protocol Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-bold tracking-wider">
              TARGET_VECTOR_UNMAPPED
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
            <span className="hidden sm:inline">SECURITY PROTOCOL:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold border border-slate-200 dark:border-slate-700 tabular-nums">
              0x404_NOT_FOUND
            </span>
          </div>
        </div>

        {/* Central Tactical Beacon */}
        <div className="py-6 sm:py-8 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-cyan-500/30 flex items-center justify-center shadow-lg dark:shadow-[0_0_25px_rgba(6,182,212,0.18)]">
              <Compass className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-[spin_10s_linear_infinite]" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>SIGNAL LOST</span>
            <span className="text-cyan-500 dark:text-cyan-400 font-mono text-xl sm:text-2xl font-light opacity-80">
              // 404
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-md mt-2 leading-relaxed">
            The target vector or endpoint does not exist in the active telemetry registry.
          </p>

          {/* Unresolved Route Badge */}
          <div className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 max-w-full overflow-hidden">
            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">UNRESOLVED TARGET:</span>
            <code className="text-amber-600 dark:text-amber-400 font-bold truncate">
              {currentUnresolved}
            </code>
          </div>
        </div>

        {/* Fuzzy Intelligent Match Recommendation (UX Heuristic H9) */}
        <AnimatePresence>
          {suggestedMatch && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                  <suggestedMatch.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Intelligent Route Match Detected
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                    Did you intend to access <span className="font-bold text-slate-900 dark:text-white">{suggestedMatch.name}</span>?
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavigateSuggested(suggestedMatch.path)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Jump to Route</span>
                <CornerDownRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Action Button Suite (Apple direct manipulation + Emil micro-details) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Action 1: Mission Control (Tracker) */}
          <button
            onClick={handleReturnHome}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>MISSION CONTROL</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-emerald-700/30 text-[10px] text-emerald-950 font-sans font-bold">
              T
            </kbd>
          </button>

          {/* Action 2: Command Palette */}
          <button
            onClick={handleOpenPalette}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-white font-semibold text-xs tracking-wider transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
            <span>COMMAND PALETTE</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-sans font-bold">
              Ctrl+K
            </kbd>
          </button>

          {/* Action 3: Step Back */}
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 active:scale-95 text-slate-700 dark:text-slate-300 font-semibold text-xs tracking-wider transition-all border border-slate-200 dark:border-slate-700/60 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>STEP BACK</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-sans font-bold">
              Esc
            </kbd>
          </button>
        </div>

        {/* Tactical Module Launchpad (UX Heuristic H3 User Freedom) */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tracking-wider mb-2.5 font-bold uppercase flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-500" />
            <span>Tactical Module Launchpad:</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {MODULE_ROUTES.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigateSuggested(item.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95 cursor-pointer"
                title={item.description}
              >
                <item.icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
