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
  ListTodo
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
      id: 'methodology',
      path: '/methodology',
      label: 'Attack Methodology',
      icon: Compass,
      sublabel: '8-Phase & Branches A-G',
    },
    {
      id: 'cheatsheet',
      path: '/cheatsheets',
      label: 'Tactical Snippets & Vault',
      icon: Terminal,
      sublabel: 'Commands, Payloads & Field Manual',
      badge: `${cheatsheets.length + (userNotes.length > 0 ? userNotes.length : 12)}`,
      badgeColor: 'text-cyan-800 dark:text-cyber-cyan bg-cyan-100 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/30',
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
      className={`hidden md:flex relative flex-col border-r border-slate-200 dark:border-cyber-border bg-white/95 dark:bg-cyber-bg text-slate-900 dark:text-cyber-text transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-cyber-border bg-cyber-card text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-cyan transition-all shadow-md"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Main Navigation List */}
      <div className="flex-1 px-2.5 py-4 space-y-1.5 font-mono">
        <div className={`px-2 text-[10px] uppercase font-bold tracking-wider text-cyber-muted mb-2 ${collapsed ? 'hidden' : 'block'}`}>
          OPERATIONS // MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            location.pathname === item.path || 
            (item.id === 'tracker' && (location.pathname === '/' || location.pathname.startsWith('/target'))) ||
            (item.id === 'cheatsheet' && (location.pathname.startsWith('/cheatsheets') || location.pathname.startsWith('/field-manual') || location.pathname.startsWith('/notes') || location.pathname.startsWith('/cpts')));
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors relative group ${
                isActive
                  ? 'bg-slate-100 dark:bg-cyber-card text-slate-900 dark:text-white border border-slate-300 dark:border-cyber-emerald/40 shadow-sm dark:shadow-glow-emerald/20 font-bold'
                  : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-cyber-card/50 border border-transparent'
              }`}
            >
              {isActive && (
                <motion.span 
                  layoutId="activeSidebarIndicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-cyber-emerald shadow-[0_0_10px_#10B981]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <motion.div
                whileHover={{ scale: 1.15 }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0"
              >
                <Icon className={`w-4 h-4 ${
                  isActive ? 'text-cyber-emerald' : 'text-cyber-muted group-hover:text-cyber-text'
                }`} />
              </motion.div>
              
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                  <span className="font-semibold truncate mr-2">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 font-mono font-bold whitespace-nowrap shadow-sm ${item.badgeColor}`}>
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
          <div className="mt-6 pt-4 border-t border-cyber-border/70">
            <div className="px-2 text-[10px] uppercase font-bold tracking-wider text-cyber-muted mb-2">
              LAYOUT MODES
            </div>
            <div className="grid grid-cols-4 gap-1 bg-cyber-card p-1 rounded-lg border border-cyber-border">
              <button
                onClick={() => {
                  setViewMode('kanban');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded text-[10px] transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold'
                    : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded text-[10px] transition-all ${
                  viewMode === 'table'
                    ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold'
                    : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded text-[10px] transition-all ${
                  viewMode === 'grid'
                    ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold'
                    : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
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
                className={`flex flex-col items-center justify-center py-1.5 rounded text-[10px] transition-all ${
                  viewMode === 'graph'
                    ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold'
                    : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Attack Topology Network Graph"
              >
                <Share2 className="w-3.5 h-3.5 mb-0.5" />
                <span>Graph</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Mission Readiness Stats */}
      {!collapsed ? (
        <div className="p-3 border-t border-cyber-border bg-cyber-card/40 font-mono text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-cyber-muted uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-cyber-amber" /> PWN PROGRESS
            </span>
            <span className="text-cyber-emerald font-bold">{pwnPercentage}%</span>
          </div>
          
          <div className="w-full bg-cyber-bg rounded-full h-1.5 border border-cyber-border overflow-hidden mb-2.5">
            <div
              className="h-full bg-gradient-to-r from-cyber-emerald via-cyber-cyan to-cyber-purple transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pwnPercentage))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="bg-cyber-bg/70 px-2 py-1 rounded border border-cyber-border/70 flex items-center justify-between">
              <span className="text-cyber-muted">Rooted:</span>
              <span className="text-cyber-emerald font-bold">{rootedMachines}</span>
            </div>
            <div className="bg-cyber-bg/70 px-2 py-1 rounded border border-cyber-border/70 flex items-center justify-between">
              <span className="text-cyber-muted">Footholds:</span>
              <span className="text-cyber-cyan font-bold">{footholdMachines}</span>
            </div>
          </div>

          {/* Lead Operator & Creator Profile Card */}
          <div className="mt-2.5 pt-2 border-t border-cyber-border/70 space-y-2">
            <div 
              onClick={() => {
                setOperatorModalOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-cyber-card border border-transparent hover:border-cyber-emerald/40 cursor-pointer transition-all group"
              title="Click to view Daniel Dayan's Operator Dossier"
            >
              <div className="w-7 h-7 rounded-lg bg-cyber-emerald/20 border border-cyber-emerald flex items-center justify-center text-[10px] font-bold text-cyber-emerald flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                DD
              </div>
              <div className="truncate flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white group-hover:text-cyber-emerald transition-colors leading-tight truncate flex items-center gap-1">
                  <span className="truncate">Daniel Dayan</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald flex-shrink-0" />
                </div>
                <div className="text-[9px] text-cyber-muted leading-none truncate">Creator & Pentester</div>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="grid grid-cols-3 gap-1">
              <a
                href="https://0xdnd.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 px-1 rounded bg-cyber-emerald/15 hover:bg-cyber-emerald/25 border border-cyber-emerald/40 hover:border-cyber-emerald text-cyber-emerald hover:text-white transition-all text-[9px] font-bold text-center flex items-center justify-center gap-0.5"
                title="Launch Daniel Dayan's Official Portfolio"
              >
                <span>PORTFOLIO</span>
              </a>
              <a
                href="https://www.linkedin.com/in/daniel-dayan-a66322352/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 px-1 rounded bg-[#0077B5]/15 hover:bg-[#0077B5]/25 border border-[#0077B5]/40 hover:border-[#0077B5] text-[#0077B5] hover:text-white transition-all text-[9px] font-bold text-center flex items-center justify-center gap-0.5"
                title="Daniel Dayan LinkedIn Profile"
              >
                <span>LINKEDIN</span>
              </a>
              <a
                href="https://github.com/0xdnd"
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 px-1 rounded bg-cyber-card hover:bg-white/10 border border-cyber-border hover:border-white text-cyber-muted hover:text-white transition-all text-[9px] font-bold text-center flex items-center justify-center gap-0.5"
                title="0xdnd GitHub Repositories"
              >
                <span>GITHUB</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-cyber-border flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setOperatorModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-8 h-8 rounded-lg bg-cyber-emerald/20 border border-cyber-emerald flex items-center justify-center text-[11px] font-black text-cyber-emerald hover:scale-105 transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            title="Daniel Dayan (Creator Dossier)"
          >
            DD
          </button>
          <a 
            href="https://0xdnd.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-cyber-card hover:bg-cyber-emerald/20 border border-cyber-border hover:border-cyber-emerald flex items-center justify-center text-cyber-muted hover:text-cyber-emerald transition-all"
            title="Daniel Dayan's Official Portfolio"
          >
            <Globe className="w-3.5 h-3.5" />
          </a>
          <a 
            href="https://www.linkedin.com/in/daniel-dayan-a66322352/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-cyber-card hover:bg-[#0077B5]/20 border border-cyber-border hover:border-[#0077B5] flex items-center justify-center text-cyber-muted hover:text-[#0077B5] transition-all"
            title="Daniel Dayan on LinkedIn"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
          </a>
          <a
            href="https://github.com/0xdnd"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-cyber-card hover:bg-white/10 border border-cyber-border hover:border-cyber-emerald flex items-center justify-center text-cyber-muted hover:text-white transition-all"
            title="0xdnd on GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          </a>
        </div>
      )}
    </aside>
  );
};
