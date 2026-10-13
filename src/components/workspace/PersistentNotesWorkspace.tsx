import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  Pin, 
  Maximize2, 
  Minimize2, 
  Type, 
  Layers,
  Wand2} from 'lucide-react';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { NotesWorkspaceTabStrip } from './NotesWorkspaceTabStrip';
import { ObsidianTabContent } from '../cheatsheet/ObsidianTabContent';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { TemplatizeNotesModal } from '../cheatsheet/TemplatizeNotesModal';
import { NewCptsNoteModal } from '../cheatsheet/NewCptsNoteModal';
import { NotesWorkspaceTargetBar } from './NotesWorkspaceTargetBar';
import { NotesSearchPalette } from './NotesSearchPalette';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { useToastStore } from '../../store/useToastStore';
import { CptsNoteEntry, mergeUserNotePools } from '../../utils/obsidianManualUtils';

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
    searchQuery,
    isSearchOpen,
    setSearchQuery,
    setIsSearchOpen,
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
      setActiveTab: s.setActiveTab,
      searchQuery: s.searchQuery,
      isSearchOpen: s.isSearchOpen,
      setSearchQuery: s.setSearchQuery,
      setIsSearchOpen: s.setIsSearchOpen,
    }))
  );

  const { globalVars, soundEnabled, customNotes, userNotes, addCustomNote } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      addCustomNote: s.addCustomNote,
    }))
  );
  const effectiveVars = useEffectiveGlobalVars(globalVars);

  const getActiveNote = useNotesWorkspaceStore((s) => s.getActiveNote);
  const getOpenNotes = useNotesWorkspaceStore((s) => s.getOpenNotes);
  // customNotes / userNotes are listed so the lookups re-run when the user's notes change
  const activeNote = useMemo(() => getActiveNote(), [activeTabId, openTabIds, customNotes, userNotes, getActiveNote]);
  const openNotes = useMemo(() => getOpenNotes(), [openTabIds, customNotes, userNotes, getOpenNotes]);

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

  const openSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchOpen(true);
  }, [setSearchQuery, setIsSearchOpen]);

  const handleSearchSelect = useCallback(
    (noteId: string) => {
      openNote(noteId);
      setIsSearchOpen(false);
      setSearchQuery('');
      if (soundEnabled) playCyberSound('click');
    },
    [openNote, setIsSearchOpen, setSearchQuery, soundEnabled]
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

  // Workspace shortcuts: Alt combos the global hotkeys (Alt+N/S/E/F/O/P/T, Ctrl+K…) leave free.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      let action: (() => void) | null = null;
      if (e.code === 'KeyK') action = openSearch;
      else if (e.code === 'Equal' || e.code === 'NumpadAdd') action = () => setNewNoteOpen(true);
      else if (e.code === 'KeyC') action = handleCopyAll;
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, openSearch, handleCopyAll]);

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

        {targetBar}

        {/* Multi-Tab Strip */}
        <NotesWorkspaceTabStrip />

        {/* Active Note Content Stage (DOM Keep-Alive) */}
        <div className="flex-1 overflow-y-auto min-h-0 relative bg-surface-card">
          {openNotes.length > 0 ? (
            openNotes.map((tabNote) => {
              const isActive = tabNote.id === activeNote?.id;
              return (
                <div
                  key={tabNote.id}
                  data-testid={`dock-tab-content-${tabNote.id}`}
                  data-tab-note-id={tabNote.id}
                  className={isActive ? 'h-full w-full flex-1 min-h-0 overflow-y-auto' : 'hidden'}
                  style={{ display: isActive ? undefined : 'none' }}
                >
                  <ObsidianTabContent
                    note={tabNote}
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
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted space-y-3">
              <Layers className="w-10 h-10 text-secondary" />
              <div className="text-sm font-semibold text-secondary">
                No note selected
              </div>
              <div className="text-xs max-w-sm">
                Open a note from the tab strip above, click any field manual link, or browse cheatsheets to view notes here side-by-side.
              </div>
            </div>
          )}
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
              {activeNote?.title || 'Field Notes'}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
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
        <NotesWorkspaceTabStrip />

        {/* Mobile Note Stage (DOM Keep-Alive) */}
        <div className="flex-1 min-h-0 bg-surface-card p-1 overflow-hidden flex flex-col">
          {openNotes.length > 0 ? (
            openNotes.map((tabNote) => {
              const isActive = tabNote.id === activeNote?.id;
              return (
                <div
                  key={tabNote.id}
                  data-testid={`mobile-dock-tab-content-${tabNote.id}`}
                  data-tab-note-id={tabNote.id}
                  className={isActive ? 'h-full w-full flex-1 min-h-0 overflow-y-auto overscroll-contain' : 'hidden'}
                  style={{ display: isActive ? undefined : 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  <ObsidianTabContent
                    note={tabNote}
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
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted text-xs">
              No active note selected
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

      <NotesSearchPalette
        open={isSearchOpen}
        notes={allNotes}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSelect={handleSearchSelect}
        onClose={() => setIsSearchOpen(false)}
      />

      <NewCptsNoteModal
        isOpen={newNoteOpen}
        onClose={() => setNewNoteOpen(false)}
        onSave={handleSaveNewNote}
        existingDirectories={existingDirectories}
      />
    </>
  );
};
