import React, { useRef, useEffect } from 'react';
import {
  X,
  Plus,
  FileText,
  Terminal } from 'lucide-react';
import { m } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { useNotesWorkspaceStore, resolveTabById, resolvedTabId, type ResolvedTab } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { CompactIconButton } from '../common/CompactIconButton';
import { DockQuickSwitcher, DOCK_SWITCHER_SHORTCUT_LABEL } from './DockQuickSwitcher';

const tabTitle = (tab: ResolvedTab): string => (tab.kind === 'note' ? tab.note.title : tab.entry.title);

export const NotesWorkspaceTabStrip: React.FC = () => {
  const openTabIds = useNotesWorkspaceStore((s) => s.openTabIds);
  const storedActiveTabId = useNotesWorkspaceStore((s) => s.activeTabId);
  const isSwitcherOpen = useNotesWorkspaceStore((s) => s.isSwitcherOpen);
  const setSwitcherOpen = useNotesWorkspaceStore((s) => s.setSwitcherOpen);
  const setActiveTab = useNotesWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useNotesWorkspaceStore((s) => s.closeTab);
  const closeAllTabs = useNotesWorkspaceStore((s) => s.closeAllTabs);

  // Subscribed so the tab list re-resolves when notes or snippets change.
  const customNotes = useCtfStore((s) => s.customNotes);
  const userNotes = useCtfStore((s) => s.userNotes);
  const cheatsheets = useCtfStore((s) => s.cheatsheets);
  const tabs = React.useMemo(
    () =>
      openTabIds
        .map((id) => resolveTabById(id))
        .filter((t): t is ResolvedTab => t !== null)
        .map((tab) => ({ id: resolvedTabId(tab), tab })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openTabIds, customNotes, userNotes, cheatsheets]
  );

  // Highlight what the dock actually shows: the stored active id may not resolve yet (e.g. before hydration).
  const activeTabId = React.useMemo(() => {
    const active = useNotesWorkspaceStore.getState().getActiveTab();
    return active ? resolvedTabId(active) : storedActiveTabId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedActiveTabId, openTabIds, customNotes, userNotes, cheatsheets]);

  const hasActive = tabs.some(({ id }) => id === activeTabId);
  const switcherContainerRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const tabStripRef = useRef<HTMLDivElement>(null);

  const closeSwitcher = React.useCallback(() => {
    setSwitcherOpen(false);
    plusButtonRef.current?.focus?.();
  }, [setSwitcherOpen]);

  // Close the popover on outside click. The dock mounts a desktop and a mobile strip; a click inside either
  // switcher is not "outside", otherwise the hidden copy would close the visible one.
  useEffect(() => {
    if (!isSwitcherOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-dock-switcher-root]')) return;
      setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSwitcherOpen, setSwitcherOpen]);

  // After a tab closes, keyboard focus would fall back to <body>: move it to the new active tab, or to
  // "Open anything" when no tabs remain.
  const focusActiveTabSoon = () => {
    requestAnimationFrame(() => {
      const active = useNotesWorkspaceStore.getState().getActiveTab();
      const tabEls = tabStripRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
      const activeId = active ? resolvedTabId(active) : null;
      const target = (activeId && Array.from(tabEls ?? []).find((el) => el.dataset.tabId === activeId)) || tabEls?.[0];
      (target ?? plusButtonRef.current)?.focus();
    });
  };

  // Roving tabindex: arrows, Home and End move between tabs and select the one reached; Delete closes the focused tab.
  const onTablistKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const current = (e.target as HTMLElement).closest?.('[role="tab"]') as HTMLElement | null;
    if (!current || tabs.length === 0) return;
    const idx = tabs.findIndex(({ id }) => id === current.dataset.tabId);
    if (idx < 0) return;
    if (e.key === 'Delete') {
      e.preventDefault();
      closeTab(tabs[idx].id);
      focusActiveTabSoon();
      return;
    }
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    const nextId = tabs[next].id;
    setActiveTab(nextId);
    requestAnimationFrame(() => {
      tabStripRef.current?.querySelector<HTMLElement>(`[role="tab"][data-tab-id="${CSS.escape(nextId)}"]`)?.focus();
    });
  };

  return (
    <div className="relative flex items-center bg-surface-sunken border-b border-subtle px-2 h-10 select-none flex-shrink-0">
      {/* Scrollable tab container. A tablist may only own tabs and a button cannot nest inside role="tab", so the tabs
          and their close buttons are two layers on one shared column grid: the tablist is a real box (a subgrid
          holding only the tabs) and the close layer sits over it, each button over its own tab. */}
      <div ref={tabStripRef} className="overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2 py-1">
        <div
          className="grid w-max items-center gap-x-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, max-content)` }}
        >
          <div
            role="tablist"
            aria-label="Open notes"
            className="grid items-center"
            style={{ gridColumn: '1 / -1', gridRow: 1, gridTemplateColumns: 'subgrid' }}
          >
            {tabs.map(({ id: tabId, tab }, i) => {
              const isActive = tabId === activeTabId;
              const title = tabTitle(tab);
              const TabIcon = tab.kind === 'cheat' ? Terminal : FileText;
              return (
                <div
                  key={tabId}
                  data-tab-kind={tab.kind}
                  data-tab-id={tabId}
                  role="tab"
                  tabIndex={isActive || (i === 0 && !hasActive) ? 0 : -1}
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tabId)}
                  onKeyDown={(e) => {
                    onTablistKeyDown(e);
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setActiveTab(tabId);
                    }
                  }}
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                  className={`relative flex min-w-0 max-w-[160px] sm:max-w-[200px] items-center gap-1.5 rounded-md border border-transparent py-1 pl-2.5 pr-9 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive ? 'text-accent' : 'bg-transparent text-secondary hover:bg-surface-hover hover:text-primary'
                  }`}
                  title={tab.kind === 'cheat' ? `Cheatsheet: ${title}` : title}
                >
                  {isActive && (
                    <m.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={TACTICAL_SPRING}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-md bg-surface-card border border-accent/50 pointer-events-none"
                    />
                  )}
                  <TabIcon className={`relative w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
                  <span className="relative truncate text-[11px]">{title}</span>
                </div>
              );
            })}
          </div>
          <div
            role="presentation"
            className="pointer-events-none grid items-center"
            style={{ gridColumn: '1 / -1', gridRow: 1, gridTemplateColumns: 'subgrid' }}
          >
            {tabs.map(({ id: tabId, tab }, i) => {
              const isActive = tabId === activeTabId;
              return (
                <CompactIconButton
                  key={tabId}
                  tabIndex={isActive || (i === 0 && !hasActive) ? 0 : -1}
                  onClick={() => {
                    closeTab(tabId);
                    focusActiveTabSoon();
                  }}
                  style={{ gridColumn: i + 1, gridRow: 1, justifySelf: 'end' }}
                  className="pointer-events-auto z-10 mr-1"
                  title="Close Tab"
                  aria-label={`Close tab ${tabTitle(tab)}`}
                >
                  <X className="w-3 h-3" />
                </CompactIconButton>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Strip Controls (Open anything + Close All) */}
      <div className="flex items-center gap-1 flex-shrink-0 pl-1">
        <div className="relative" ref={switcherContainerRef} data-dock-switcher-root>
          <button
            ref={plusButtonRef}
            type="button"
            onClick={() => setSwitcherOpen(!isSwitcherOpen)}
            className="active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-interactive flex-shrink-0 cursor-pointer"
            title={`Open anything (${DOCK_SWITCHER_SHORTCUT_LABEL})`}
            aria-label="Open anything"
            aria-expanded={isSwitcherOpen}
            aria-haspopup="listbox"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {isSwitcherOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl bg-surface-card border border-strong shadow-2xl p-2.5 z-50 max-w-[calc(100vw-1.5rem)]">
              <DockQuickSwitcher variant="popover" onClose={closeSwitcher} />
            </div>
          )}
        </div>

        {/* Tab Strip Right Actions: Close All */}
        {tabs.length > 1 && (
          <button
            type="button"
            onClick={closeAllTabs}
            className="active:scale-[0.97] px-1.5 py-1 rounded-md text-[10px] text-muted hover:text-callout-danger-fg hover:bg-surface-hover transition-interactive flex-shrink-0 cursor-pointer"
            title="Close All Tabs"
          >
            Close All
          </button>
        )}
      </div>
    </div>
  );
};
