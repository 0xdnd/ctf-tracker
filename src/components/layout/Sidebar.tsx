import { APP_VERSION_SHORT } from "../../utils/appVersion";
import React, { useState, useMemo, useEffect } from 'react';
import { AnalyticsMonitorIcon } from '../common/icons/AnalyticsMonitorIcon';
import { stripTrailingSlash } from '../../utils/pathUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crosshair,
  Terminal,
  Kanban,
  Table,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Radio,
  KeyRound,
  Route,
  SquareTerminal,
  Code,
  NotebookPen,
  Timer,
  NotebookText
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useExamStore } from '../../store/examStore';
import { useOpenTabCount } from '../../hooks/useOpenTabCount';
import { useSnippetTotals } from '../../hooks/useSnippetTotals';
import { useTrackerCounts } from '../../hooks/useTrackerCounts';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { countDueReviews } from '../../utils/spacedRepetition';

const DUE_REFRESH_MS = 60_000;

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isNotesOpen = useNotesWorkspaceStore((s) => s.isOpen);
  // Track ids are already short (OSCP, CPTS, CRTO...), so the badge shows the track the setup screen is on
  const examTrack = useExamStore((s) => s.track);
  const openNotesCount = useOpenTabCount();
  const toggleNotesWorkspace = useNotesWorkspaceStore((s) => s.toggleOpen);

  const { 
    activeTab, 
    setActiveTab, 
    viewMode, 
    setViewMode, 
    machines, 
    soundEnabled,
    setOperatorModalOpen,
  } = useCtfStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      machines: s.machines,
      soundEnabled: s.soundEnabled,
      setOperatorModalOpen: s.setOperatorModalOpen,
    }))
  );

  const { totalMachines, rootedMachines, footholdMachines, pwnPercentage } = useTrackerCounts(machines);

  // Reviews due: recomputed when the machine list changes and as time passes, so a review that
  // comes due while the app stays open (or the tab sat in the background) shows up without a reload.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, DUE_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  const dueReviews = useMemo(() => countDueReviews(machines, now), [machines, now]);

  const { snippets: snippetCount, notes: noteCount, total: snippetTotal } = useSnippetTotals();
  const snippetsBadgeLabel =
    noteCount > 0 ? `${snippetCount} snippets + ${noteCount} ${noteCount === 1 ? 'note' : 'notes'}` : `${snippetCount} snippets`;

  const navItems = [
    {
      id: 'tracker',
      path: '/tracker',
      label: 'Lab & Target Tracker',
      icon: Crosshair,
      badge: `${rootedMachines}/${totalMachines}`,
    },
    {
      id: 'vault',
      path: '/vault',
      label: 'Vault',
      icon: KeyRound,
      badge: `${footholdMachines + rootedMachines}`,
    },
    {
      id: 'methodology',
      path: '/methodology',
      label: 'Attack Methodology',
      icon: Route,
    },
    {
      id: 'revshell',
      path: '/reverse-shell',
      label: 'Reverse Shells',
      icon: SquareTerminal,
    },
    {
      id: 'cheatsheet',
      path: '/cheatsheets',
      label: 'Snippets',
      icon: Code,
      badge: `${snippetTotal}`,
      badgeLabel: snippetsBadgeLabel,
    },
    {
      id: 'writeup',
      path: '/writeup',
      label: 'Writeup Studio',
      icon: NotebookPen,
    },
    {
      id: 'analytics',
      path: '/analytics',
      label: 'Skill Radar & Analytics',
      icon: AnalyticsMonitorIcon,
      dueBadge: dueReviews,
    },
    {
      id: 'exam',
      path: '/exam',
      label: '24h Exam Simulator',
      icon: Timer,
      badge: examTrack,
    },
  ] as const;

  const handleTabClick = (item: typeof navItems[number]) => {
    setActiveTab(item.id);
    if (item.id === 'analytics' && dueReviews > 0) navigate(item.path, { state: { scrollTo: 'review' } });
    else navigate(item.path);
    if (soundEnabled) playCyberSound('click');
  };

  const layoutModes = [
    { id: 'kanban', label: 'Kanban', title: 'Kanban Board View', Icon: Kanban },
    { id: 'table', label: 'Table', title: 'Data Table View', Icon: Table },
    { id: 'grid', label: 'Cards', title: 'Grid Cards View', Icon: LayoutGrid },
    { id: 'graph', label: 'Graph', title: 'Attack Topology Network Graph', Icon: Radio },
  ] as const;

  return (
    <aside
      className={`hidden md:flex relative flex-col border-r border-subtle bg-surface-card text-primary font-sans transition-[width,background-color,border-color] duration-300 z-30 h-full max-h-full ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-strong bg-surface-elevated text-secondary hover:text-primary transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" /> : <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>

      {/* Navigation */}
      <div data-tour="sidebar-nav" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin px-2.5 py-3 space-y-0.5">
        <div className={`px-2 text-[11px] font-medium text-muted mb-1.5 ${collapsed ? 'hidden' : 'block'}`}>
          Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            stripTrailingSlash(location.pathname) === item.path ||
            (item.id === 'tracker' && (stripTrailingSlash(location.pathname) === '/' || location.pathname.startsWith('/target'))) ||
            (item.id === 'cheatsheet' && (location.pathname.startsWith('/cheatsheet') || location.pathname.startsWith('/field-manual') || location.pathname.startsWith('/notes') || location.pathname.startsWith('/cpts'))) ||
            (item.id === 'vault' && (location.pathname.startsWith('/vault') || location.pathname.startsWith('/evidence') || location.pathname.startsWith('/loot')));
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTabClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? 'bg-surface-hover text-primary font-medium'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover/70'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-r" />
              )}
              <div className="flex-shrink-0">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted group-hover:text-secondary'}`} />
              </div>

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                  <span className="truncate mr-2">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span
                      title={'badgeLabel' in item ? item.badgeLabel : undefined}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted flex-shrink-0 font-mono font-medium whitespace-nowrap tabular-nums"
                    >
                      {'badgeLabel' in item ? (
                        <>
                          <span aria-hidden="true">{item.badge}</span>
                          <span className="sr-only">{item.badgeLabel}</span>
                        </>
                      ) : (
                        item.badge
                      )}
                    </span>
                  )}
                  {'dueBadge' in item && item.dueBadge > 0 && (
                    <span
                      data-testid="review-due-badge"
                      title={`${item.dueBadge} ${item.dueBadge === 1 ? 'review' : 'reviews'} due`}
                      className="text-[11px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning flex-shrink-0 font-mono font-bold whitespace-nowrap tabular-nums"
                    >
                      {item.dueBadge}
                      <span className="sr-only"> {item.dueBadge === 1 ? 'review' : 'reviews'} due</span>
                    </span>
                  )}
                </div>
              )}
              {collapsed && 'dueBadge' in item && item.dueBadge > 0 && (
                <span data-testid="review-due-dot" className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-warning">
                  <span className="sr-only">{item.dueBadge} {item.dueBadge === 1 ? 'review' : 'reviews'} due</span>
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Field Notes Workspace Sidecar Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            toggleNotesWorkspace();
            if (soundEnabled) playCyberSound('click');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            isNotesOpen
              ? 'bg-surface-hover text-primary font-medium'
              : 'text-secondary hover:text-primary hover:bg-surface-hover/70'
          }`}
          title={isNotesOpen ? 'Close Notes Workspace (Alt+N)' : 'Open Notes Workspace (Alt+N)'}
          aria-label="Notes Workspace"
        >
          {isNotesOpen && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-accent rounded-r" />
          )}
          <div className="flex-shrink-0 relative">
            <NotebookText className={`w-4 h-4 ${isNotesOpen ? 'text-accent' : 'text-muted group-hover:text-secondary'}`} />
            {openNotesCount > 0 && collapsed && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </div>

          {!collapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0 text-left">
              <span className="truncate mr-2">Notes</span>
              {openNotesCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted flex-shrink-0 font-mono font-medium whitespace-nowrap tabular-nums">
                  {openNotesCount} open
                </span>
              )}
            </div>
          )}
        </motion.button>

        {/* View switcher when in Tracker view */}
        {activeTab === 'tracker' && !collapsed && (
          <div className="mt-3 pt-2.5 border-t border-subtle">
            <div className="px-2 text-[11px] font-medium text-muted mb-1.5">Layout</div>
            <div data-tour="layout-switcher" className="grid grid-cols-4 gap-1 bg-surface-sunken p-1 rounded-lg border border-subtle">
              {layoutModes.map(({ id, label, title, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setViewMode(id);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-md text-[11px] transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    viewMode === id
                      ? 'bg-surface-card text-primary font-medium border border-strong shadow-xs'
                      : 'text-muted hover:text-primary border border-transparent'
                  }`}
                  title={title}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: progress and about */}
      {!collapsed ? (
        <div className="flex-shrink-0 border-t border-subtle p-3 text-xs overflow-hidden space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[11px] font-medium text-muted">Pwn progress</span>
              <span className="text-xs font-medium text-primary font-mono tabular-nums">
                {pwnPercentage}%
              </span>
            </div>

            <div className="w-full bg-surface-sunken rounded-full h-1 overflow-hidden mb-1.5">
              <div
                className="h-full w-full origin-left bg-accent transition-transform duration-300"
                style={{ transform: `scaleX(${Math.min(100, Math.max(0, pwnPercentage)) / 100})` }}
              />
            </div>

            <div className="flex items-center justify-between px-0.5 text-[11px] text-muted">
              <span>
                Rooted <span className="text-secondary font-mono tabular-nums">{rootedMachines}</span>
              </span>
              <span>
                Footholds <span className="text-secondary font-mono tabular-nums">{footholdMachines}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOperatorModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-hover text-secondary transition-[transform,background-color,color] active:scale-[0.97] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="About ZeroBox & Credits"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              <div className="truncate text-left leading-tight">
                <div className="text-xs font-medium text-primary">ZeroBox</div>
                <div className="text-[11px] text-muted">v{APP_VERSION_SHORT}, offline suite</div>
              </div>
            </div>
            <span className="text-[11px] text-muted flex-shrink-0 group-hover:text-secondary">About</span>
          </button>
          <div className="flex items-center gap-3 px-2 text-[11px] text-muted">
            <a href="https://ctftracker.com/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">Privacy</a>
            <a href="https://ctftracker.com/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">Terms</a>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-subtle p-2 flex flex-col items-center gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setOperatorModalOpen(true);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-8 h-8 rounded-lg bg-surface-hover border border-subtle flex items-center justify-center text-[11px] font-semibold text-primary hover:bg-surface-sunken transition-interactive active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
