import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crosshair, 
  Terminal, 
  FileText, 
  BarChart3, 
  Kanban, 
  Table, 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight,
  Flame,
  Radio,
  Compass,
  GraduationCap,
  Share2,
  BookOpen,
  ListTodo,
  Palette,
  Database
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { 
    activeTab, 
    setActiveTab, 
    viewMode, 
    setViewMode, 
    machines, 
    soundEnabled,
    setOperatorModalOpen,
    userNotes = [],
    cheatsheets = [],
  } = useCtfStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      machines: s.machines,
      soundEnabled: s.soundEnabled,
      setOperatorModalOpen: s.setOperatorModalOpen,
      userNotes: s.userNotes,
      cheatsheets: s.cheatsheets,
    }))
  );

  const { totalMachines, rootedMachines, footholdMachines, pwnPercentage } = useMemo(() => {
    const total = machines.length;
    let rooted = 0;
    let foothold = 0;
    for (let i = 0; i < total; i++) {
      const s = machines[i].status;
      if (s === 'root' || s === 'completed') rooted++;
      else if (s === 'foothold') foothold++;
    }
    const pct = total > 0 ? Math.round((rooted / total) * 100) : 0;
    return { totalMachines: total, rootedMachines: rooted, footholdMachines: foothold, pwnPercentage: pct };
  }, [machines]);

  const navItems = [
    {
      id: 'tracker',
      path: '/tracker',
      label: 'Lab & Target Tracker',
      icon: Crosshair,
      badge: `${rootedMachines}/${totalMachines}`,
      badgeColor: 'text-cyber-emerald bg-cyber-emerald/10 border-cyber-emerald/30',
    },
    {
      id: 'vault',
      path: '/vault',
      label: 'Evidence & Loot Vault',
      icon: Database,
      sublabel: 'Creds, Hashes, Flags & Keys',
      badge: `${footholdMachines + rootedMachines}`,
      badgeColor: 'text-callout-warn-fg bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'methodology',
      path: '/methodology',
      label: 'Attack Methodology',
      icon: Compass,
      sublabel: '8-Phase & Branches A-G',
    },
    {
      id: 'cheatsheet',
      path: '/cheatsheets',
      label: 'Snippets & Vault',
      icon: Terminal,
      sublabel: 'Commands, Payloads & Field Manual',
      badge: `${cheatsheets.length + userNotes.length}`,
      badgeColor: 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/30',
    },
    {
      id: 'writeup',
      path: '/writeup',
      label: 'Writeup Studio',
      icon: FileText,
      sublabel: 'Obsidian / GitBook',
    },
    {
      id: 'analytics',
      path: '/analytics',
      label: 'Skill Radar & Analytics',
      icon: BarChart3,
      sublabel: 'Heatmap & Matrix',
    },
    {
      id: 'exam',
      path: '/exam',
      label: '24h Exam Simulator',
      icon: GraduationCap,
      badge: 'OSCP',
      badgeColor: 'text-callout-tip-fg bg-purple-100 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800/50',
    },
  ] as const;

  const handleTabClick = (item: typeof navItems[number]) => {
    setActiveTab(item.id);
    navigate(item.path);
    if (soundEnabled) playCyberSound('click');
  };

  return (
    <aside
      className={`hidden md:flex relative flex-col border-r border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-[width,background-color,border-color] duration-300 z-30 h-full max-h-full ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-700 dark:text-tertiary hover:text-slate-900 dark:hover:text-primary transition-colors cursor-pointer shadow-sm"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" /> : <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>

      {/* Middle Scrollable Section: Operations & Layout Modes */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin px-2.5 py-3 space-y-1 font-mono">
        <div className={`px-2 text-[10px] uppercase font-bold tracking-wider text-tertiary mb-1.5 ${collapsed ? 'hidden' : 'block'}`}>
          OPERATIONS // MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            location.pathname === item.path || 
            (item.id === 'tracker' && (location.pathname === '/' || location.pathname.startsWith('/target'))) ||
            (item.id === 'cheatsheet' && (location.pathname.startsWith('/cheatsheet') || location.pathname.startsWith('/field-manual') || location.pathname.startsWith('/notes') || location.pathname.startsWith('/cpts'))) ||
            (item.id === 'vault' && (location.pathname.startsWith('/vault') || location.pathname.startsWith('/evidence') || location.pathname.startsWith('/loot')));
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors relative group cursor-pointer ${
                isActive
                  ? 'bg-slate-100 dark:bg-[#18181b] text-slate-900 dark:text-white border border-slate-300 dark:border-[#27272a] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-tertiary hover:text-slate-900 dark:hover:text-primary hover:bg-slate-100/70 dark:hover:bg-[#18181b]/50 border border-transparent'
              }`}
            >
              {isActive && (
                <span 
                  className="absolute left-0 top-1 bottom-1 w-0.5 bg-emerald-500 rounded-r"
                />
              )}
              <div
                className="flex-shrink-0"
              >
                <Icon className={`w-4 h-4 ${
                  isActive ? 'text-callout-success-fg' : 'text-tertiary group-hover:text-zinc-300'
                }`} />
              </div>
              
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                  <span className="font-semibold truncate mr-2">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 flex-shrink-0 font-mono font-bold whitespace-nowrap tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}

        {/* View switcher when in Tracker view */}
        {activeTab === 'tracker' && !collapsed && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#27272a]">
            <div className="px-2 text-[10px] uppercase font-bold tracking-wider text-tertiary mb-1.5">
              LAYOUT MODES
            </div>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#18181b] p-1 rounded-lg border border-slate-200 dark:border-[#27272a] machined-edge">
              <button
                onClick={() => {
                  setViewMode('kanban');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
                }`}
                title="Kanban Board View"
              >
                <Kanban className="w-3.5 h-3.5 mb-0.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('table');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
                }`}
                title="Data Table View"
              >
                <Table className="w-3.5 h-3.5 mb-0.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('grid');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5 mb-0.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('graph');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
                  viewMode === 'graph'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
                }`}
                title="Attack Topology Network Graph"
              >
                <Radio className="w-3.5 h-3.5 mb-0.5" />
                <span>Graph</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Permanently Pinned Bottom Viewport Capsule: Pwn Progress & Lead Operator Card */}
      {/* Footer System Telemetry & Profile */}
      {!collapsed ? (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] p-3 font-mono text-xs overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-callout-warn-fg" /> PWN PROGRESS
            </span>
            <span className="text-xs font-bold text-callout-success-fg font-mono tabular-nums">
              {pwnPercentage}%
            </span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-[#09090b] rounded-full h-1.5 border border-slate-300 dark:border-[#27272a] overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, pwnPercentage))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
            <div className="bg-slate-100 dark:bg-[#09090b] px-2 py-1 rounded-md border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <span className="text-tertiary">Rooted:</span>
              <span className="text-callout-success-fg font-bold tabular-nums">{rootedMachines}</span>
            </div>
            <div className="bg-slate-100 dark:bg-[#09090b] px-2 py-1 rounded-md border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <span className="text-tertiary">Footholds:</span>
              <span className="text-callout-info-fg font-bold tabular-nums">{footholdMachines}</span>
            </div>
          </div>

          {/* Refined Tactical Shell Footer: Operational Telemetry & About ZeroBox Trigger */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#27272a] space-y-2">
            <button
              type="button"
              onClick={() => {
                setOperatorModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-[#09090b] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 text-slate-700 dark:text-zinc-300 transition-[transform,background-color,border-color,color] active:scale-[0.97] group cursor-pointer"
              title="About ZeroBox & Credits"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-[4px] bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-callout-info-fg dark:text-cyber-cyan flex-shrink-0">
                  <Terminal className="w-3 h-3" />
                </div>
                <div className="truncate text-left leading-none">
                  <div className="text-[11px] font-bold text-slate-900 dark:text-zinc-200">ZeroBox</div>
                  <div className="text-[9px] text-tertiary">v2.4 • Offline Suite</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-tertiary border border-slate-300 dark:border-zinc-700 flex-shrink-0">
                ABOUT
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] p-2 flex flex-col items-center gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setOperatorModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-callout-info-fg dark:text-cyber-cyan hover:bg-cyan-500/20 transition-all active:scale-[0.97] cursor-pointer"
            title="About ZeroBox & Credits"
            aria-label="About ZeroBox & Credits"
          >
            ZB
          </button>
        </div>
      )}
    </aside>
  );
};
