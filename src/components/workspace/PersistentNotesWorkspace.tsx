import React, { useMemo, useCallback, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  Pin, 
  Maximize2, 
  Minimize2, 
  Type, 
  Layers,
  PanelLeft} from 'lucide-react';
import { useNotesWorkspaceStore, resolvedTabId, type ResolvedTab } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { NotesWorkspaceTabStrip } from './NotesWorkspaceTabStrip';
import { SnippetTabContent } from './SnippetTabContent';
import { DockQuickSwitcher } from './DockQuickSwitcher';
import { DockNotesList } from './DockNotesList';
import { ObsidianTabContent } from '../cheatsheet/ObsidianTabContent';
import { playCyberSound } from '../../utils/helpers';

/** Below this dock width the Notes list no longer fits beside a note, so it opens as an overlay instead. */
const NARROW_DOCK_PX = 520;

export const PersistentNotesWorkspace: React.FC = () => {
  const {
    isOpen,
    isPinned,
    dockSize,
    viewMode,
    language,
    fontSize,
    openTabIds,
    activeTabId,
    setIsOpen,
    togglePinned,
    toggleDockSize,
    setViewMode,
    setLanguage,
    setFontSize,
    openNote,
    notesListCollapsed,
    toggleNotesList,
  } = useNotesWorkspaceStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      isPinned: s.isPinned,
      dockSize: s.dockSize,
      viewMode: s.viewMode,
      language: s.language,
      fontSize: s.fontSize,
      openTabIds: s.openTabIds,
      activeTabId: s.activeTabId,
      toggleOpen: s.toggleOpen,
      setIsOpen: s.setIsOpen,
      togglePinned: s.togglePinned,
      toggleDockSize: s.toggleDockSize,
      setViewMode: s.setViewMode,
      setLanguage: s.setLanguage,
      setFontSize: s.setFontSize,
      openNote: s.openNote,
      notesListCollapsed: s.notesListCollapsed,
      toggleNotesList: s.toggleNotesList,
      setActiveTab: s.setActiveTab,
    }))
  );

  const { globalVars, soundEnabled, customNotes, userNotes, cheatsheets, userNotesHydrated } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      cheatsheets: s.cheatsheets,
      userNotesHydrated: s.userNotesHydrated,
    }))
  );

  const getActiveTab = useNotesWorkspaceStore((s) => s.getActiveTab);
  const getOpenTabs = useNotesWorkspaceStore((s) => s.getOpenTabs);
  const pruneUnresolvedTabs = useNotesWorkspaceStore((s) => s.pruneUnresolvedTabs);
  // customNotes / userNotes / cheatsheets are listed so the lookups re-run when they change
  const activeTab = useMemo(
    () => getActiveTab(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTabId, openTabIds, customNotes, userNotes, cheatsheets, getActiveTab]
  );
  const openTabs = useMemo(
    () => getOpenTabs(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openTabIds, customNotes, userNotes, cheatsheets, getOpenTabs]
  );
  const activeResolvedId = activeTab ? resolvedTabId(activeTab) : null;
  const activeTitle = activeTab ? (activeTab.kind === 'note' ? activeTab.note.title : activeTab.entry.title) : null;

  // Drop tabs whose target is gone. Snippet tabs are checked immediately; note tabs only once the
  // IndexedDB vault has hydrated (the store enforces this), so a slow load never discards valid tabs.
  useEffect(() => {
    pruneUnresolvedTabs();
  }, [pruneUnresolvedTabs, userNotesHydrated, openTabIds, customNotes, userNotes, cheatsheets]);

  const renderTabContent = (tab: ResolvedTab, isActive: boolean) =>
    tab.kind === 'note' ? (
      <ObsidianTabContent
        note={tab.note}
        isActive={isActive}
        globalVars={globalVars}
        soundEnabled={soundEnabled}
        onNavigateToNote={handleNavigateToNote}
        onOpenNote={(targetId) => openNote(targetId)}
        defaultLanguage={language}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        fontSize={fontSize}
        isMaximized={dockSize === 'expanded'}
      />
    ) : (
      <SnippetTabContent entry={tab.entry} />
    );

  // Desktop: the list sits beside the note unless the dock is narrow (then it is an on-demand overlay).
  // Mobile sheet: always an on-demand overlay.
  const dockBodyRef = useRef<HTMLDivElement>(null);
  const [dockBodyWidth, setDockBodyWidth] = useState(0);
  const [overlayListOpen, setOverlayListOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  useLayoutEffect(() => {
    const el = dockBodyRef.current;
    if (!el) return;
    const measure = () => setDockBodyWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);
  // An unmeasured (0) width counts as wide, so the persisted preference applies until a real width is known.
  const isNarrowDock = dockBodyWidth > 0 && dockBodyWidth < NARROW_DOCK_PX;
  const listDocked = !isNarrowDock && !notesListCollapsed;
  const listToggled = isNarrowDock ? overlayListOpen : !notesListCollapsed;
  const toggleList = () => (isNarrowDock ? setOverlayListOpen((v) => !v) : toggleNotesList());

  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if ((isMobile || !isPinned) && isOpen) {
        setIsOpen(false);
      }
    }
  }, [location.pathname, isPinned, isOpen, setIsOpen]);

  const handleNavigateToNote = useCallback(
    (noteId: string) => {
      openNote(noteId);
      if (soundEnabled) playCyberSound('click');
    },
    [openNote, soundEnabled]
  );

  const cycleFontSize = useCallback(() => {
    const nextSize = fontSize === 'sm' ? 'base' : fontSize === 'base' ? 'lg' : fontSize === 'lg' ? 'xl' : 'sm';
    setFontSize(nextSize);
    if (soundEnabled) playCyberSound('click');
  }, [fontSize, setFontSize, soundEnabled]);

  if (!isOpen) return null;

  return (
    <>
      {/* ========================================================
          DESKTOP DOCKED SIDECAR WORKSPACE (>= 768px)
          Shares width side-by-side with <main> without full-screen modal takeover.
         ======================================================== */}
      <aside
        aria-label="Field Notes Workspace Dock"
        className={`hidden md:flex flex-col border-l border-subtle bg-surface-card z-20 flex-shrink-0 transition-[box-shadow,background-color,border-color,color] duration-200 overflow-hidden shadow-xl ${
          dockSize === 'expanded'
            ? 'w-[68vw] min-w-[540px] max-w-6xl'
            : 'w-[48vw] min-w-[420px] max-w-4xl'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-3 h-10 bg-surface-sunken border-b border-subtle flex-shrink-0 select-none">
          {/* Left Title & Status Indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleList}
              aria-pressed={listToggled}
              aria-label="Toggle notes list"
              data-testid="dock-list-toggle"
              className={`active:scale-[0.97] p-1.5 -ml-1 rounded-md transition-interactive cursor-pointer ${
                listToggled ? 'bg-accent-muted text-accent' : 'hover:bg-surface-hover text-muted hover:text-primary'
              }`}
              title={listToggled ? 'Hide notes list' : 'Show notes list'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Notes Workspace</span>
            </span>
            {isPinned && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                PINNED
              </span>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1">
            {/* Tri-Mode View Switcher (Read | Split | Raw) */}
            <div className="flex items-center p-0.5 rounded-md bg-surface-hover border border-subtle text-[10px]">
              <button
                type="button"
                onClick={() => setViewMode('reading')}
                className={`active:scale-[0.97] px-1.5 py-0.5 rounded transition-interactive cursor-pointer ${
                  viewMode === 'reading'
                    ? 'bg-accent-muted text-accent font-semibold border border-accent'
                    : 'text-muted hover:text-primary'
                }`}
                title="Rich Reading View"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`active:scale-[0.97] px-1.5 py-0.5 rounded transition-interactive cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-accent-muted text-accent font-semibold border border-accent'
                    : 'text-muted hover:text-primary'
                }`}
                title="Side-by-side Editor & Live Preview"
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`active:scale-[0.97] px-1.5 py-0.5 rounded transition-interactive cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-accent-muted text-accent font-semibold border border-accent'
                    : 'text-muted hover:text-primary'
                }`}
                title="Raw Markdown Editor"
              >
                Raw
              </button>
            </div>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
              className="active:scale-[0.97] px-2 py-1 rounded-md text-[10px] font-semibold hover:bg-surface-hover text-secondary hover:text-primary transition-interactive cursor-pointer border border-transparent hover:border-subtle"
              title="Toggle English / Hebrew"
            >
              {language === 'en' ? 'EN' : 'עב'}
            </button>

            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-interactive cursor-pointer"
              title={`Cycle font size (Current: ${fontSize.toUpperCase()})`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            {/* Width Toggle (Normal 48vw vs Expanded 68vw) */}
            <button
              type="button"
              onClick={toggleDockSize}
              className="active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-interactive cursor-pointer"
              title={dockSize === 'expanded' ? 'Collapse Width (50%)' : 'Expand Width (70%)'}
            >
              {dockSize === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={togglePinned}
              className={`active:scale-[0.97] p-1.5 rounded-md transition-interactive cursor-pointer ${
                isPinned
                  ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
                  : 'hover:bg-surface-hover text-muted'
              }`}
              title={isPinned ? 'Pinned: Notes stay open across all pages' : 'Unpinned: Close with page navigation'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Close Dock Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="active:scale-[0.97] p-1.5 rounded-md hover:bg-callout-danger-bg text-muted hover:text-callout-danger-fg transition-interactive cursor-pointer ml-1"
              title="Close Notes Workspace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Tab Strip */}
        <NotesWorkspaceTabStrip />

        <div ref={dockBodyRef} className="flex-1 min-h-0 flex relative">
        {listDocked && <DockNotesList className="w-56 flex-shrink-0 border-r border-subtle" />}
        {isNarrowDock && overlayListOpen && (
          <DockNotesList
            onOpened={() => setOverlayListOpen(false)}
            className="absolute inset-y-0 left-0 w-64 max-w-[85%] z-10 border-r border-strong shadow-2xl"
          />
        )}

        {/* Active Note Content Stage (DOM Keep-Alive) */}
        <div className="flex-1 min-w-0 overflow-y-auto min-h-0 relative bg-surface-card">
          {openTabs.length > 0 ? (
            openTabs.map((tab) => {
              const tabId = resolvedTabId(tab);
              const isActive = tabId === activeResolvedId;
              return (
                <div
                  key={tabId}
                  data-testid={`dock-tab-content-${tabId}`}
                  data-tab-note-id={tabId}
                  className={isActive ? 'h-full w-full flex-1 min-h-0 overflow-y-auto' : 'hidden'}
                  style={{ display: isActive ? undefined : 'none' }}
                >
                  {renderTabContent(tab, isActive)}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted">
              <div className="w-full max-w-sm space-y-3 text-left">
                <div className="text-center space-y-1">
                  <Layers className="w-8 h-8 text-secondary mx-auto" />
                  <div className="text-sm font-semibold text-secondary">Nothing open</div>
                  <div className="text-xs">Pick a note or cheatsheet to read it here beside the page you are on.</div>
                </div>
                <DockQuickSwitcher variant="inline" />
              </div>
            </div>
          )}
        </div>
        </div>
      </aside>

      {/* ========================================================
          MOBILE SLIDE-UP BOTTOM SHEET (< 768px)
          Large, spacious bottom sheet (75vh/88vh) with tabs, backdrop, and proper safe-area docking.
         ======================================================== */}
      {/* Mobile Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-30 bg-surface-inverse/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div
        aria-label="Mobile Notes Workspace"
        className={`md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-surface-card border-t border-subtle shadow-2xl flex flex-col transition-[box-shadow,background-color,border-color,color] duration-200 font-sans ${
          dockSize === 'expanded' ? 'h-[88vh] max-h-[calc(100dvh-4.5rem)]' : 'h-[75vh] max-h-[calc(100dvh-4.5rem)]'
        }`}
      >
        {/* Mobile Drag Header */}
        <div className="flex items-center justify-between px-3 h-10 bg-surface-sunken border-b border-subtle flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            <span className="text-xs font-semibold text-primary truncate max-w-[120px] sm:max-w-[180px]">
              {activeTitle || 'Field Notes'}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileListOpen((v) => !v)}
              aria-pressed={mobileListOpen}
              aria-label="Toggle notes list"
              className={`active:scale-[0.97] p-1.5 rounded-md transition-interactive cursor-pointer ${
                mobileListOpen ? 'bg-accent-muted text-accent' : 'hover:bg-surface-hover text-muted hover:text-primary'
              }`}
              title={mobileListOpen ? 'Hide notes list' : 'Show notes list'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            {/* View Mode Switcher (Read | Raw) */}
            <div className="flex items-center p-0.5 rounded-md bg-surface-hover border border-subtle text-[10px]">
              <button
                type="button"
                onClick={() => setViewMode('reading')}
                className={`active:scale-[0.97] px-1.5 py-0.5 rounded transition-interactive cursor-pointer ${
                  viewMode === 'reading'
                    ? 'bg-accent-muted text-accent font-semibold border border-accent'
                    : 'text-muted hover:text-primary'
                }`}
                title="Rich Reading View"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`active:scale-[0.97] px-1.5 py-0.5 rounded transition-interactive cursor-pointer ${
                  viewMode === 'raw' || viewMode === 'split'
                    ? 'bg-accent-muted text-accent font-semibold border border-accent'
                    : 'text-muted hover:text-primary'
                }`}
                title="Raw Markdown Editor"
              >
                Raw
              </button>
            </div>

            {/* Height Expand/Collapse */}
            <button
              type="button"
              onClick={toggleDockSize}
              className="transition-transform active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-secondary cursor-pointer"
              title="Toggle Height"
            >
              {dockSize === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-interactive cursor-pointer"
              title={`Cycle font size (Current: ${fontSize.toUpperCase()})`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
              className="transition-transform active:scale-[0.97] px-2 py-1 rounded-md text-[10px] font-semibold bg-surface-hover text-primary cursor-pointer"
              title="Toggle English / Hebrew"
            >
              {language === 'en' ? 'EN' : 'עב'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="transition-transform active:scale-[0.97] p-1.5 rounded-md hover:bg-callout-danger-bg text-muted hover:text-callout-danger-fg cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <NotesWorkspaceTabStrip />

        {/* Mobile Note Stage (DOM Keep-Alive) */}
        <div className="relative flex-1 min-h-0 bg-surface-card p-1 overflow-hidden flex flex-col">
          {mobileListOpen && (
            <DockNotesList
              onOpened={() => setMobileListOpen(false)}
              className="absolute inset-y-0 left-0 w-[min(18rem,88%)] z-10 border-r border-strong shadow-2xl"
            />
          )}
          {openTabs.length > 0 ? (
            openTabs.map((tab) => {
              const tabId = resolvedTabId(tab);
              const isActive = tabId === activeResolvedId;
              return (
                <div
                  key={tabId}
                  data-testid={`mobile-dock-tab-content-${tabId}`}
                  data-tab-note-id={tabId}
                  className={isActive ? 'h-full w-full flex-1 min-h-0 overflow-y-auto overscroll-contain' : 'hidden'}
                  style={{ display: isActive ? undefined : 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  {tab.kind === 'note' ? (
                    <ObsidianTabContent
                      note={tab.note}
                      isActive={isActive}
                      globalVars={globalVars}
                      soundEnabled={soundEnabled}
                      onNavigateToNote={handleNavigateToNote}
                      onOpenNote={(targetId) => openNote(targetId)}
                      defaultLanguage={language}
                      viewMode={viewMode === 'split' ? 'raw' : viewMode}
                      onViewModeChange={(m) => setViewMode(m === 'split' ? 'raw' : m)}
                      fontSize={fontSize}
                      isMaximized={dockSize === 'expanded'}
                    />
                  ) : (
                    <SnippetTabContent entry={tab.entry} />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-3 overflow-y-auto">
              <DockQuickSwitcher variant="inline" />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
