import React, { useRef, useEffect } from 'react';
import {
  X,
  Plus,
  FileText,
  Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { useNotesWorkspaceStore, resolveTabById, resolvedTabId, type ResolvedTab } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
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

  return (
    <div className="relative flex items-center bg-surface-sunken border-b border-subtle px-2 h-10 select-none flex-shrink-0">
      {/* Scrollable Tab Container */}
      <div
        ref={tabStripRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2 py-1"
      >
        {tabs.map(({ id: tabId, tab }) => {
          const isActive = tabId === activeTabId;
          const title = tabTitle(tab);
          const TabIcon = tab.kind === 'cheat' ? Terminal : FileText;

          return (
            <div
              key={tabId}
              data-tab-kind={tab.kind}
              onClick={() => setActiveTab(tabId)}
              className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors border flex-shrink-0 max-w-[160px] sm:max-w-[200px] ${
                isActive
                  ? 'text-accent border-transparent'
                  : 'bg-transparent text-secondary border-transparent hover:bg-surface-hover hover:text-primary'
              }`}
              title={tab.kind === 'cheat' ? `Cheatsheet: ${title}` : title}
            >
              {isActive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={TACTICAL_SPRING}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-surface-card border border-accent/50 pointer-events-none"
                />
              )}
              <TabIcon className={`relative w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
              <span className="relative truncate text-[11px]">{title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tabId);
                }}
                className={`active:scale-[0.97] relative p-1 rounded-sm hover:bg-surface-hover text-muted hover:text-secondary transition-interactive flex-shrink-0 min-w-[20px] min-h-[20px] flex items-center justify-center cursor-pointer ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 touch:opacity-100'
                }`}
                title="Close Tab"
                aria-label={`Close tab ${title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
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
