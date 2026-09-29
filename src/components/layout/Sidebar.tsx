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
  Award,
  Radio,
  Compass,
  GraduationCap,
  Globe,
  Share2,
  BookOpen,
  ListTodo,
  Palette,
  Coffee,
  Database
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, CREATOR_PROFILE_LINKS } from '../../utils/helpers';

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
      badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
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
      badgeColor: 'text-purple-900 bg-purple-100 border-purple-300 dark:text-purple-400 dark:bg-purple-950/40 dark:border-purple-800/50',
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
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" /> : <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>

      {/* Middle Scrollable Section: Operations & Layout Modes */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin px-2.5 py-3 space-y-1 font-mono">
        <div className={`px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 ${collapsed ? 'hidden' : 'block'}`}>
          OPERATIONS // MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            location.pathname === item.path || 
            (item.id === 'tracker' && (location.pathname === '/' || location.pathname.startsWith('/target'))) ||
            (item.id === 'cheatsheet' && (location.pathname.startsWith('/cheatsheets') || location.pathname.startsWith('/field-manual') || location.pathname.startsWith('/notes') || location.pathname.startsWith('/cpts'))) ||
            (item.id === 'vault' && (location.pathname.startsWith('/vault') || location.pathname.startsWith('/evidence') || location.pathname.startsWith('/loot')));
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors relative group cursor-pointer ${
                isActive
                  ? 'bg-slate-100 dark:bg-[#18181b] text-slate-900 dark:text-white border border-slate-300 dark:border-[#27272a] font-bold shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#18181b]/50 border border-transparent'
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
                  isActive ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-zinc-300'
                }`} />
              </div>
              
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                  <span className="font-semibold truncate mr-2">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 flex-shrink-0 font-mono font-bold whitespace-nowrap">
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
            <div className="px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
              LAYOUT MODES
            </div>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#18181b] p-1 rounded-lg border border-slate-200 dark:border-[#27272a]">
              <button
                onClick={() => {
                  setViewMode('kanban');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-mono transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  viewMode === 'graph'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-zinc-300 dark:border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> PWN PROGRESS
            </span>
            <span className="text-xs font-bold text-emerald-500 font-mono">
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
              <span className="text-slate-500 dark:text-zinc-500">Rooted:</span>
              <span className="text-emerald-500 font-bold">{rootedMachines}</span>
            </div>
            <div className="bg-slate-100 dark:bg-[#09090b] px-2 py-1 rounded-md border border-slate-200 dark:border-[#27272a] flex items-center justify-between">
              <span className="text-slate-500 dark:text-zinc-500">Footholds:</span>
              <span className="text-cyan-500 font-bold">{footholdMachines}</span>
            </div>
          </div>

          {/* Lead Operator & Creator Profile Card */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#27272a] space-y-1.5">
            {/* Buy Me a Coffee Sponsor Banner */}
            <a
              href={CREATOR_PROFILE_LINKS.coffee}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-[#09090b] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 text-amber-700 dark:text-amber-400 transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
              title="Buy Daniel Dayan a Coffee / Support ZeroBox Development"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <Coffee className="w-3.5 h-3.5" />
                </div>
                <div className="truncate text-left">
                  <div className="text-[11px] font-bold text-slate-900 dark:text-zinc-200 leading-tight">Buy Me a Coffee</div>
                  <div className="text-[9px] text-slate-500 dark:text-zinc-500 leading-none">Support @0xdnd</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
                ☕
              </span>
            </a>

            <div 
              onClick={() => {
                setOperatorModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#09090b] border border-transparent hover:border-[#27272a] cursor-pointer transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
              title="Click to view Daniel Dayan's Operator Dossier"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-500 flex-shrink-0">
                DD
              </div>
              <div className="truncate flex-1 min-w-0">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors leading-tight truncate flex items-center gap-1">
                  <span className="truncate">Daniel Dayan</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                </div>
                <div className="text-[9px] text-slate-600 dark:text-zinc-500 leading-none truncate">Creator & Pentester</div>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="grid grid-cols-3 gap-1">
              <a
                href="https://0xdnd.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[28px] py-1 px-1 rounded-md bg-slate-100 dark:bg-[#09090b] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 text-emerald-600 dark:text-emerald-400 transition-[transform,background-color,border-color,color] active:scale-[0.98] text-[10px] font-mono font-bold text-center flex items-center justify-center gap-0.5"
                title="Launch Daniel Dayan's Official Portfolio"
              >
                <span>PORTFOLIO</span>
              </a>
              <a
                href="https://www.linkedin.com/in/daniel-dayan-a66322352/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[28px] py-1 px-1 rounded-md bg-slate-100 dark:bg-[#09090b] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 text-[#0a66c2] dark:text-[#38bdf8] transition-[transform,background-color,border-color,color] active:scale-[0.98] text-[10px] font-mono font-bold text-center flex items-center justify-center gap-0.5"
                title="Daniel Dayan LinkedIn Profile"
              >
                <span>LINKEDIN</span>
              </a>
              <a
                href="https://github.com/0xdnd"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[28px] py-1 px-1 rounded-md bg-slate-100 dark:bg-[#09090b] hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98] text-[10px] font-mono font-bold text-center flex items-center justify-center gap-0.5"
                title="0xdnd GitHub Repositories"
              >
                <span>GITHUB</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] p-2 flex flex-col items-center gap-2 overflow-hidden">
          <button
            onClick={() => {
              setOperatorModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-[11px] font-black text-emerald-500 hover:bg-emerald-500/20 transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
            title="Daniel Dayan (Creator Dossier)"
            aria-label="Daniel Dayan (Creator Dossier)"
          >
            DD
          </button>
          <a 
            href={CREATOR_PROFILE_LINKS.coffee}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-center text-amber-600 dark:text-amber-400 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            title="Buy Daniel Dayan a Coffee (buymeacoffee.com/0xdnd)"
          >
            <Coffee className="w-3.5 h-3.5" />
          </a>
          <a 
            href="https://0xdnd.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#09090b] hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            title="Daniel Dayan's Official Portfolio"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
          <a 
            href="https://www.linkedin.com/in/daniel-dayan-a66322352/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#09090b] hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            title="Daniel Dayan on LinkedIn"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
          </a>
          <a
            href="https://github.com/0xdnd"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#09090b] hover:bg-zinc-800 border border-slate-200 dark:border-[#27272a] hover:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            title="0xdnd on GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          </a>
        </div>
      )}
    </aside>
  );
};
