import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, 
  Pin, 
  Maximize2, 
  Minimize2, 
  Type, 
  Layers} from 'lucide-react';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { NotesWorkspaceTabStrip } from './NotesWorkspaceTabStrip';
import { ObsidianTabContent } from '../cheatsheet/ObsidianTabContent';
import { playCyberSound } from '../../utils/helpers';

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
    }))
  );

  const { globalVars, soundEnabled, customNotes, userNotes } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      userNotes: s.userNotes,
    }))
  );

  const getActiveNote = useNotesWorkspaceStore((s) => s.getActiveNote);
  const getOpenNotes = useNotesWorkspaceStore((s) => s.getOpenNotes);
  const activeNote = useMemo(() => getActiveNote(), [activeTabId, customNotes, userNotes, getActiveNote]);
  const openNotes = useMemo(() => getOpenNotes(), [openTabIds, customNotes, userNotes, getOpenNotes]);

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
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
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
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
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
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
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
              className="px-2 py-1 rounded-md text-[10px] font-semibold hover:bg-surface-hover text-secondary hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-subtle"
              title="Toggle English / Hebrew"
            >
              {language === 'en' ? 'EN' : 'עב'}
            </button>

            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
              title={`Cycle font size (Current: ${fontSize.toUpperCase()})`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            {/* Width Toggle (Normal 48vw vs Expanded 68vw) */}
            <button
              type="button"
              onClick={toggleDockSize}
              className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
              title={dockSize === 'expanded' ? 'Collapse Width (50%)' : 'Expand Width (70%)'}
            >
              {dockSize === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Pin Toggle */}
            <button
              type="button"
              onClick={togglePinned}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
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
              className="p-1.5 rounded-md hover:bg-callout-danger-bg text-muted hover:text-callout-danger-fg transition-colors cursor-pointer ml-1"
              title="Close Notes Workspace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

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
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
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
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
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
              className="p-1.5 rounded-md hover:bg-surface-hover text-secondary cursor-pointer"
              title="Toggle Height"
            >
              {dockSize === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Font Size Toggle */}
            <button
              type="button"
              onClick={cycleFontSize}
              className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
              title={`Cycle font size (Current: ${fontSize.toUpperCase()})`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>

            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
              className="px-2 py-1 rounded-md text-[10px] font-semibold bg-surface-hover text-primary cursor-pointer"
              title="Toggle English / Hebrew"
            >
              {language === 'en' ? 'EN' : 'עב'}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-callout-danger-bg text-muted hover:text-callout-danger-fg cursor-pointer"
              title="Close Workspace"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
    </>
  );
};
