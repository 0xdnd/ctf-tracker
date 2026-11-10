import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Type, 
  PanelLeft,
  Wand2} from 'lucide-react';
import { useNotesWorkspaceStore, resolvedTabId, clampDockWidth } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { NotesWorkspaceTabStrip } from './NotesWorkspaceTabStrip';
import { SnippetTabContent } from './SnippetTabContent';
import { DockQuickSwitcher } from './DockQuickSwitcher';
import { DockNotesList } from './DockNotesList';
import { DockBody } from './DockBody';
import { DockResizeHandle } from './DockResizeHandle';
import { ObsidianTabContent } from '../cheatsheet/ObsidianTabContent';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { TemplatizeNotesModal } from '../cheatsheet/TemplatizeNotesModal';
import { NewCptsNoteModal } from '../cheatsheet/NewCptsNoteModal';
import { NotesWorkspaceTargetBar } from './NotesWorkspaceTargetBar';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { useToastStore } from '../../store/useToastStore';
import { CptsNoteEntry, mergeUserNotePools } from '../../utils/obsidianManualUtils';

export const PersistentNotesWorkspace: React.FC = () => {
  const {
    isOpen,
    isPinned,
    dockSize,
    dockWidthPx,
    viewMode,
    language,
    fontSize,
    openTabIds,
    activeTabId,
    setIsOpen,
    toggleDockSize,
    setViewMode,
    setLanguage,
    setFontSize,
    openNote,
    setSwitcherOpen,
  } = useNotesWorkspaceStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      isPinned: s.isPinned,
      dockSize: s.dockSize,
      dockWidthPx: s.dockWidthPx,
      viewMode: s.viewMode,
      language: s.language,
      fontSize: s.fontSize,
      openTabIds: s.openTabIds,
      activeTabId: s.activeTabId,
      toggleOpen: s.toggleOpen,
      setIsOpen: s.setIsOpen,
      toggleDockSize: s.toggleDockSize,
      setViewMode: s.setViewMode,
      setLanguage: s.setLanguage,
      setFontSize: s.setFontSize,
      openNote: s.openNote,
      setActiveTab: s.setActiveTab,
      setSwitcherOpen: s.setSwitcherOpen,
    }))
  );

  const { globalVars, soundEnabled, customNotes, userNotes, cheatsheets, userNotesHydrated, addCustomNote, deleteNote } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      cheatsheets: s.cheatsheets,
      userNotesHydrated: s.userNotesHydrated,
      addCustomNote: s.addCustomNote,
      deleteNote: s.deleteNote,
    }))
  );
  const effectiveVars = useEffectiveGlobalVars(globalVars);

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
  // IP templating applies to notes only (snippet tabs are read-only catalog entries)
  const activeNote = activeTab?.kind === 'note' ? activeTab.note : null;

  // Drop tabs whose target is gone. Snippet tabs are checked immediately; note tabs only once the
  // IndexedDB vault has hydrated (the store enforces this), so a slow load never discards valid tabs.
  useEffect(() => {
    pruneUnresolvedTabs();
  }, [pruneUnresolvedTabs, userNotesHydrated, openTabIds, customNotes, userNotes, cheatsheets]);

  // Mobile sheet: the notes list is an on-demand overlay.
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const [templatizeOpen, setTemplatizeOpen] = useState(false);
  const [newNoteOpen, setNewNoteOpen] = useState(false);

  const allNotes = useMemo(() => mergeUserNotePools(customNotes, userNotes), [customNotes, userNotes]);
  const existingDirectories = useMemo(() => {
    const dirs = new Set<string>();
    for (const n of allNotes) {
      if (n.relPath && n.relPath.includes('/')) dirs.add(n.relPath.split('/').slice(0, -1).join('/'));
    }
    return Array.from(dirs).sort();
  }, [allNotes]);

  // Search reuses the dock's "Open anything" switcher (Alt+K is bound globally in useTacticalHotkeys).
  const openSearch = useCallback(() => setSwitcherOpen(true), [setSwitcherOpen]);

  // The menu entry already asks for confirmation before calling this.
  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote(noteId);
      useNotesWorkspaceStore.getState().closeTab(noteId);
      if (soundEnabled) playCyberSound('root');
    },
    [deleteNote, soundEnabled]
  );

  const handleSaveNewNote = useCallback(
    (note: Partial<CptsNoteEntry> & { title: string }) => {
      addCustomNote(note);
      // addCustomNote prepends the new note.
      const created = useCtfStore.getState().customNotes[0];
      if (created) openNote(created.id);
      setNewNoteOpen(false);
      if (soundEnabled) playCyberSound('root');
    },
    [addCustomNote, openNote, soundEnabled]
  );

  const activeCommands = activeNote?.commands ?? [];
  const handleCopyAll = useCallback(() => {
    const commands = (activeNote?.commands ?? []).filter((c) => c.trim());
    if (commands.length === 0) return;
    safeCopyToClipboard(commands.map((c) => interpolateCommand(c, effectiveVars)).join('\n'));
    if (soundEnabled) playCyberSound('copy');
    useToastStore.getState().addToast({
      type: 'success',
      message: `Copied ${commands.length} command${commands.length === 1 ? '' : 's'} with variables filled in`,
    });
  }, [activeNote, effectiveVars, soundEnabled]);

  // Workspace shortcuts: Alt combos the global hotkeys (Alt+K/N/S/E/F/O/P/T, Ctrl+K…) leave free.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      let action: (() => void) | null = null;
      if (e.code === 'Equal' || e.code === 'NumpadAdd') action = () => setNewNoteOpen(true);
      else if (e.code === 'KeyC') action = handleCopyAll;
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleCopyAll]);

  const targetBar = (
    <NotesWorkspaceTargetBar
      onSearch={openSearch}
      onNewNote={() => setNewNoteOpen(true)}
      onCopyAll={handleCopyAll}
      canCopyAll={activeCommands.some((c) => c.trim())}
    />
  );

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

  // The aside is a flex sibling of <main>, so its width alone reflows the page.
  const customWidth =
    dockWidthPx === null ? null : clampDockWidth(dockWidthPx, typeof window !== 'undefined' ? window.innerWidth : 1280);

  return (
    <>
      {/* ========================================================
          DESKTOP DOCKED SIDECAR WORKSPACE (>= 768px)
          Shares width side-by-side with <main> without full-screen modal takeover.
         ======================================================== */}
      <aside
        aria-label="Field Notes Workspace Dock"
        style={customWidth === null ? undefined : { width: customWidth, minWidth: 0, maxWidth: 'none' }}
        className={`relative hidden md:flex flex-col border-l border-subtle bg-surface-card z-20 flex-shrink-0 transition-[box-shadow,background-color,border-color,color] duration-200 overflow-hidden shadow-xl ${
          customWidth !== null
            ? ''
            : dockSize === 'expanded'
              ? 'w-[68vw] min-w-[540px] max-w-6xl'
              : 'w-[48vw] min-w-[420px] max-w-4xl'
        } [&[data-dock-dragging=true]_iframe]:pointer-events-none`}
      >
        <DockResizeHandle />
        <DockBody
          targetBar={targetBar}
          onNewNote={() => setNewNoteOpen(true)}
          onTemplatize={() => setTemplatizeOpen(true)}
          onCopyAll={handleCopyAll}
          onNavigateToNote={handleNavigateToNote}
          onDeleteNote={handleDeleteNote}
          openTabs={openTabs}
          activeResolvedId={activeResolvedId}
        />
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
              data-tour="notes-list-toggle"
              className={`active:scale-[0.97] p-1.5 rounded-md transition-interactive cursor-pointer ${
                mobileListOpen ? 'bg-accent-muted text-accent' : 'hover:bg-surface-hover text-muted hover:text-primary'
              }`}
              title={mobileListOpen ? 'Hide notes list' : 'Show notes list'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            {/* View Mode Switcher (Read | Raw) */}
            <div data-tour="notes-views" className="flex items-center p-0.5 rounded-md bg-surface-hover border border-subtle text-[10px]">
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

            {/* Replace hard-coded IPs with {TARGET}/{LHOST} */}
            <button
              type="button"
              onClick={() => setTemplatizeOpen(true)}
              disabled={!activeNote}
              aria-label="Replace IPs with placeholders"
              className="active:scale-[0.97] p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-interactive cursor-pointer disabled:opacity-40"
              title="Replace hard-coded IPs in this note with {TARGET} / {LHOST}"
            >
              <Wand2 className="w-3.5 h-3.5" />
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

        {targetBar}

        {/* Tab Strip */}
        <div data-tour="notes-tabs">
          <NotesWorkspaceTabStrip />
        </div>

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

      {activeNote && (
        <TemplatizeNotesModal
          open={templatizeOpen}
          onClose={() => setTemplatizeOpen(false)}
          noteIds={[activeNote.id]}
          scopeLabel={activeNote.title}
        />
      )}

      <NewCptsNoteModal
        isOpen={newNoteOpen}
        onClose={() => setNewNoteOpen(false)}
        onSave={handleSaveNewNote}
        existingDirectories={existingDirectories}
      />
    </>
  );
};
