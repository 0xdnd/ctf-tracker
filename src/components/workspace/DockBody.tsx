import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Layers, Maximize2, Minimize2, PanelRight, Pin, Plus, X, Expand } from 'lucide-react';
import {
  useNotesWorkspaceStore,
  resolvedTabId,
  resolveTabById,
  type NotesPanelView,
  type ResolvedTab,
} from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { FieldManualShell } from '../notes/FieldManualShell';
import { NotesRibbon } from '../notes/NotesRibbon';
import { NotesRightPanel } from '../notes/NotesRightPanel';
import { NotesStatusBar } from '../notes/NotesStatusBar';
import { NoteMoreMenu, type NoteMoreMenuEntry } from '../notes/NoteMoreMenu';
import { ObsidianTabContent } from '../cheatsheet/ObsidianTabContent';
import { NotesWorkspaceTabStrip } from './NotesWorkspaceTabStrip';
import { SnippetTabContent } from './SnippetTabContent';
import { DockQuickSwitcher } from './DockQuickSwitcher';
import { DockNotesList } from './DockNotesList';
import { DockSearchPanel } from './DockSearchPanel';
import { NoteTagsPanel } from '../notes/NoteTagsPanel';
import { useNoteIndex } from '../../hooks/useNoteIndex';
import { getBacklinksForNote, type CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { countWords, getNoteOutline } from '../../utils/noteMeta';
import { buildNoteMenuEntries } from '../../utils/noteMenuEntries';
import { playCyberSound } from '../../utils/helpers';

const RIBBON_PX = 44;
const MIN_NOTE_COLUMN_PX = 300;
/**
 * The left sidebar sits beside the note from this dock body width (ribbon + list + a 300px note column, so it
 * stays inline in the normal-width dock on 1366/1440 laptops); below it, it slides over the note.
 */
export const DOCK_LEFT_INLINE_PX = RIBBON_PX + 260 + MIN_NOTE_COLUMN_PX;
/** The right sidebar (outline, backlinks) sits beside the note from this width. */
export const DOCK_RIGHT_INLINE_PX = 1000;
/** Edit opens the editor beside a live preview from this width, else the plain editor. */
const DOCK_SPLIT_EDIT_PX = 1000;
const DOCK_SIDEBAR_PX = 260;

const iconBtn =
  'inline-flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40';
const ribbonBtn =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
const segBtn =
  'cursor-pointer rounded-sm px-2 py-0.5 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ';
const segOn = 'bg-accent font-semibold text-on-accent';
const segOff = 'text-secondary hover:text-primary';

export interface DockBodyProps {
  /** The engaged-target bar, rendered between the header and the body. */
  targetBar: React.ReactNode;
  onNewNote: () => void;
  onTemplatize: () => void;
  /** Copies the active note's commands (the dock's own rules: empty lines skipped, variables filled in). */
  onCopyAll: () => void;
  onNavigateToNote: (noteId: string) => void;
  /** Adds "Delete note" to the more menu; the menu entry asks for confirmation before calling it. */
  onDeleteNote?: (noteId: string, noteTitle?: string) => void;
  openTabs: ResolvedTab[];
  activeResolvedId: string | null;
}

/** Desktop dock: header, target bar, then the field manual shell (ribbon, sidebars, tabs, note, status bar). */
export const DockBody: React.FC<DockBodyProps> = ({
  targetBar,
  onNewNote,
  onTemplatize,
  onCopyAll,
  onNavigateToNote,
  onDeleteNote,
  openTabs,
  activeResolvedId,
}) => {
  const navigate = useNavigate();
  const {
    isPinned,
    dockSize,
    viewMode,
    language,
    fontSize,
    dockLeftView,
    dockRightOpen,
    setIsOpen,
    togglePinned,
    toggleDockSize,
    setViewMode,
    setLanguage,
    setFontSize,
    openNote,
    toggleDockLeftView,
    setDockLeftView,
    openCheat,
    toggleDockRight,
    setDockRightOpen,
  } = useNotesWorkspaceStore(
    useShallow((s) => ({
      isPinned: s.isPinned,
      dockSize: s.dockSize,
      viewMode: s.viewMode,
      language: s.language,
      fontSize: s.fontSize,
      dockLeftView: s.dockLeftView,
      dockRightOpen: s.dockRightOpen,
      setIsOpen: s.setIsOpen,
      togglePinned: s.togglePinned,
      toggleDockSize: s.toggleDockSize,
      setViewMode: s.setViewMode,
      setLanguage: s.setLanguage,
      setFontSize: s.setFontSize,
      openNote: s.openNote,
      toggleDockLeftView: s.toggleDockLeftView,
      setDockLeftView: s.setDockLeftView,
      openCheat: s.openCheat,
      toggleDockRight: s.toggleDockRight,
      setDockRightOpen: s.setDockRightOpen,
    }))
  );
  const { globalVars, soundEnabled } = useCtfStore(
    useShallow((s) => ({ globalVars: s.globalVars, soundEnabled: s.soundEnabled }))
  );

  // Body width decides which sidebars fit beside the note. An unmeasured (0) width counts as wide.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setBodyWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const measured = bodyWidth > 0;
  const leftOverlay = measured && bodyWidth < DOCK_LEFT_INLINE_PX;
  const rightOverlay = measured && bodyWidth < DOCK_RIGHT_INLINE_PX;
  const editMode = !measured || bodyWidth >= DOCK_SPLIT_EDIT_PX ? 'split' : 'raw';

  // Inline sidebars follow the persisted choice; overlay drawers are transient and start closed.
  const [overlayLeft, setOverlayLeft] = useState<NotesPanelView | null>(null);
  const [overlayRight, setOverlayRight] = useState(false);
  const leftView = leftOverlay ? overlayLeft : dockLeftView;
  const rightOpen = rightOverlay ? overlayRight : dockRightOpen;

  const closeOverlays = useCallback(() => {
    setOverlayLeft(null);
    setOverlayRight(false);
  }, []);
  const closeLeftOverlay = useCallback(() => {
    if (leftOverlay) setOverlayLeft(null);
  }, [leftOverlay]);

  // Search takes focus only when the user picks it, never when the dock opens on a persisted Search view.
  const [searchFocusSignal, setSearchFocusSignal] = useState(0);
  const selectPanel = useCallback(
    (p: NotesPanelView) => {
      if (soundEnabled) playCyberSound('click');
      if (p === 'search') setSearchFocusSignal((n) => n + 1);
      if (leftOverlay) {
        setOverlayRight(false);
        setOverlayLeft((v) => (v === p ? null : p));
      } else {
        toggleDockLeftView(p);
      }
    },
    [leftOverlay, soundEnabled, toggleDockLeftView]
  );
  const showPanel = useCallback(
    (p: NotesPanelView) => {
      if (leftOverlay) {
        setOverlayRight(false);
        setOverlayLeft(p);
      } else setDockLeftView(p);
    },
    [leftOverlay, setDockLeftView]
  );
  const toggleRight = useCallback(() => {
    if (soundEnabled) playCyberSound('click');
    if (rightOverlay) {
      setOverlayLeft(null);
      setOverlayRight((v) => !v);
    } else toggleDockRight();
  }, [rightOverlay, soundEnabled, toggleDockRight]);
  const collapseRight = useCallback(
    () => (rightOverlay ? setOverlayRight(false) : setDockRightOpen(false)),
    [rightOverlay, setDockRightOpen]
  );

  const activeTab = useMemo(
    () => openTabs.find((t) => resolvedTabId(t) === activeResolvedId) ?? null,
    [openTabs, activeResolvedId]
  );
  const activeNote: CptsNoteEntry | null = activeTab?.kind === 'note' ? activeTab.note : null;

  const noteIndex = useNoteIndex();
  const liveNote = activeNote ? (noteIndex.byId.get(activeNote.id) ?? activeNote) : null;
  const backlinks = useMemo(
    () => (liveNote ? getBacklinksForNote(liveNote.id, noteIndex) : []),
    [liveNote, noteIndex]
  );
  const outline = useMemo(
    () => (liveNote ? getNoteOutline(liveNote.rawMarkdown ?? '', liveNote) : []),
    [liveNote]
  );

  // Tag filter on the Files list (a tag also matches its nested tags: a includes a/b).
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const tagNoteIds = useMemo(() => {
    if (!activeTag) return null;
    const ids = new Set<string>();
    for (const [key, noteIds] of noteIndex.tags) {
      if (key === activeTag || key.startsWith(`${activeTag}/`)) noteIds.forEach((id) => ids.add(id));
    }
    return ids;
  }, [activeTag, noteIndex]);
  const selectTag = useCallback(
    (tag: string | null) => {
      setActiveTag(tag);
      if (tag) showPanel('files');
    },
    [showPanel]
  );

  // Search hit: the note opened from Search highlights the query once it renders.
  const [highlight, setHighlight] = useState<{ noteId: string; query: string } | null>(null);
  // Dropped once the hit's tab is no longer active, so returning to it never scrolls to the hit again.
  useEffect(() => {
    if (highlight && activeResolvedId !== highlight.noteId) setHighlight(null);
  }, [activeResolvedId, highlight]);

  // Outline clicks: addressed to one note and acted on by that tab only while active, once per larger nonce.
  // The note id keeps a request from reaching a tab that becomes active later.
  const [headingRequest, setHeadingRequest] = useState<{ noteId: string; slug: string; nonce: number } | null>(null);

  const openFullScreen = useCallback(() => {
    if (!activeNote) return;
    if (soundEnabled) playCyberSound('click');
    navigate(`/field-manual?note=${encodeURIComponent(activeNote.id)}`);
  }, [activeNote, navigate, soundEnabled]);

  const fontSmaller = useCallback(
    () => setFontSize(fontSize === 'xl' ? 'lg' : fontSize === 'lg' ? 'base' : 'sm'),
    [fontSize, setFontSize]
  );
  const fontLarger = useCallback(
    () => setFontSize(fontSize === 'sm' ? 'base' : fontSize === 'base' ? 'lg' : 'xl'),
    [fontSize, setFontSize]
  );

  const menuEntries: NoteMoreMenuEntry[] = activeNote
    ? buildNoteMenuEntries({
        note: activeNote,
        soundEnabled,
        getMarkdown: () => {
          const live = resolveTabById(activeNote.id);
          return (live?.kind === 'note' ? live.note.rawMarkdown : activeNote.rawMarkdown) ?? '';
        },
        onCopyCommands: onCopyAll,
        layoutItems: [
          {
            kind: 'item',
            id: 'templatize',
            label: 'Replace IPs with placeholders',
            testId: 'dock-menu-templatize',
            onSelect: onTemplatize,
          },
          {
            kind: 'item',
            id: 'fullscreen',
            label: 'Open in full screen',
            testId: 'dock-menu-open-fullscreen',
            onSelect: openFullScreen,
          },
        ],
        popout: {},
        pin: { label: isPinned ? 'Unpin from all pages' : 'Pin to all pages', onSelect: togglePinned },
        onDeleteNote,
      })
    : [];

  const renderLeft = () => {
    if (!leftView) return null;
    return (
      <div className="flex h-full flex-col" style={{ width: DOCK_SIDEBAR_PX }} data-dock-left-view={leftView}>
        {leftView === 'search' ? (
          <DockSearchPanel
            focusSignal={searchFocusSignal}
            onOpenNote={(id, query) => {
              openNote(id);
              setHighlight({ noteId: id, query });
              closeLeftOverlay();
            }}
            onOpenCheat={(id) => {
              openCheat(id);
              closeLeftOverlay();
            }}
          />
        ) : leftView === 'tags' ? (
          <div className="h-full overflow-y-auto bg-surface-card p-1.5" data-testid="dock-tags-panel">
            <NoteTagsPanel tags={noteIndex.tags} activeTag={activeTag} onSelectTag={selectTag} />
          </div>
        ) : (
          <DockNotesList
            onOpened={closeLeftOverlay}
            className="h-full"
            tagNoteIds={tagNoteIds}
            activeTag={activeTag}
            onClearTag={() => setActiveTag(null)}
          />
        )}
      </div>
    );
  };

  const header = (
    <div className="flex h-9 flex-shrink-0 select-none items-center justify-between gap-2 border-b border-subtle bg-surface-sunken px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-primary">
          <Layers className="h-3.5 w-3.5 flex-shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">Notes Workspace</span>
        </span>
        {isPinned && (
          <span className="rounded-md border border-callout-success-border bg-callout-success-bg px-1.5 text-[10px] font-semibold text-callout-success-fg">
            PINNED
          </span>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <div data-tour="notes-views" className="flex items-center rounded-sm bg-surface-hover p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('reading')}
            aria-pressed={viewMode === 'reading'}
            data-testid="dock-view-reading"
            className={segBtn + (viewMode === 'reading' ? segOn : segOff)}
            title="Reading view"
          >
            Reading
          </button>
          <button
            type="button"
            onClick={() => setViewMode(editMode)}
            aria-pressed={viewMode !== 'reading'}
            data-testid="dock-view-edit"
            className={segBtn + (viewMode !== 'reading' ? segOn : segOff)}
            title={editMode === 'split' ? 'Edit beside a live preview' : 'Edit the note text'}
          >
            Edit
          </button>
        </div>
        <button
          type="button"
          onClick={toggleDockSize}
          className={iconBtn}
          aria-label={dockSize === 'expanded' ? 'Narrow the dock' : 'Widen the dock'}
          title={dockSize === 'expanded' ? 'Collapse Width (50%)' : 'Expand Width (70%)'}
        >
          {dockSize === 'expanded' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={togglePinned}
          aria-pressed={isPinned}
          aria-label="Keep open on all pages"
          className={`${iconBtn} ${isPinned ? 'bg-callout-success-bg text-callout-success-fg hover:text-callout-success-fg' : ''}`}
          title={isPinned ? 'Pinned: Notes stay open across all pages' : 'Unpinned: Close with page navigation'}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close Notes Workspace"
          className={`${iconBtn} ml-1 hover:bg-callout-danger-bg hover:text-callout-danger-fg`}
          title="Close Notes Workspace"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  const noteHeader = activeTab && (
    <div
      data-testid="dock-note-header"
      className="flex h-9 flex-shrink-0 items-center justify-between gap-2 border-b border-subtle bg-surface-card px-3"
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px] text-tertiary">
        {activeTab.kind === 'note' ? (
          <>
            <span className="truncate">{activeTab.note.category}</span>
            {activeTab.note.subCategory && (
              <>
                <span aria-hidden="true" className="flex-shrink-0">/</span>
                <span className="truncate">{activeTab.note.subCategory}</span>
              </>
            )}
            <span aria-hidden="true" className="flex-shrink-0">/</span>
            <span className="truncate font-medium text-muted">{activeTab.note.titleEn || activeTab.note.title}</span>
          </>
        ) : (
          <>
            <span className="truncate">Cheatsheets</span>
            <span aria-hidden="true" className="flex-shrink-0">/</span>
            <span className="truncate font-medium text-muted">{activeTab.entry.title}</span>
          </>
        )}
      </nav>
      {activeTab.kind === 'note' && (
        <div className="flex flex-shrink-0 items-center gap-1">
          <NoteMoreMenu
            entries={menuEntries}
            language={language}
            onLanguageChange={setLanguage}
            fontSize={fontSize}
            onFontSmaller={fontSmaller}
            onFontLarger={fontLarger}
          />
          <button
            type="button"
            data-testid="dock-toggle-right-panel"
            aria-label="Toggle outline and backlinks"
            aria-expanded={rightOpen}
            title="Outline and backlinks"
            onClick={toggleRight}
            className={iconBtn}
          >
            <PanelRight className={`h-[18px] w-[18px] ${rightOpen ? 'text-accent' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );

  const renderTab = (tab: ResolvedTab, isActive: boolean) =>
    tab.kind === 'note' ? (
      <ObsidianTabContent
        note={tab.note}
        isActive={isActive}
        globalVars={globalVars}
        soundEnabled={soundEnabled}
        onNavigateToNote={onNavigateToNote}
        onOpenNote={(targetId) => openNote(targetId)}
        defaultLanguage={language}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        fontSize={fontSize}
        isMaximized={dockSize === 'expanded'}
        variant="shell"
        headingRequest={isActive && headingRequest?.noteId === tab.note.id ? headingRequest : undefined}
        highlightQuery={isActive && highlight?.noteId === tab.note.id ? highlight.query : undefined}
        onTagClick={selectTag}
      />
    ) : (
      <SnippetTabContent entry={tab.entry} />
    );

  const ribbonFooter = (
    <>
      <button
        type="button"
        aria-label="New note"
        title="New note (Alt+=)"
        data-testid="dock-ribbon-new-note"
        onClick={onNewNote}
        className={ribbonBtn}
      >
        <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Open in full screen"
        title={activeNote ? 'Open this note in the full-screen field manual' : 'Open a note to view it full screen'}
        data-testid="dock-open-fullscreen"
        disabled={!activeNote}
        onClick={openFullScreen}
        className={ribbonBtn}
      >
        <Expand className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    </>
  );

  const hasTabs = openTabs.length > 0;

  return (
    <>
      {header}
      {targetBar}
      <div ref={bodyRef} data-testid="dock-body" className="relative flex min-h-0 flex-1">
        <FieldManualShell
          ribbon={
            <NotesRibbon
              activePanel={leftView}
              onSelectPanel={selectPanel}
              onOpenSwitcher={() => useNotesWorkspaceStore.getState().openNoteSwitcher()}
              footer={ribbonFooter}
              panelButtonProps={{ files: { 'data-testid': 'dock-list-toggle', 'data-tour': 'notes-list-toggle' } }}
            />
          }
          left={renderLeft()}
          right={
            liveNote ? (
              <NotesRightPanel
                note={liveNote}
                backlinks={backlinks}
                outline={outline}
                className="w-[260px]"
                onOpenNote={(id) => {
                  openNote(id);
                  if (rightOverlay) setOverlayRight(false);
                }}
                onSelectHeading={(slug) => {
                  setHeadingRequest((prev) => ({
                    noteId: liveNote.id,
                    slug,
                    nonce: Math.max(Date.now(), (prev?.nonce ?? 0) + 1),
                  }));
                  if (rightOverlay) setOverlayRight(false);
                }}
                onCollapse={collapseRight}
              />
            ) : null
          }
          statusBar={
            liveNote ? (
              <NotesStatusBar wordCount={countWords(liveNote.rawMarkdown ?? '')} backlinkCount={backlinks.length} />
            ) : null
          }
          isLeftOpen={leftView !== null}
          isRightOpen={Boolean(liveNote) && rightOpen}
          isNarrow={false}
          narrowLeft={leftOverlay}
          narrowRight={rightOverlay}
          sidebarWidth={DOCK_SIDEBAR_PX}
          resizeStorageKey="zerobox.notes.leftWidth.dock"
          onCloseDrawers={closeOverlays}
        >
          <div data-tour="notes-tabs">
            <NotesWorkspaceTabStrip />
          </div>
          {noteHeader}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-surface-card">
            {hasTabs ? (
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
                    {renderTab(tab, isActive)}
                  </div>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted">
                <div className="w-full max-w-sm space-y-3 text-left">
                  <div className="space-y-1 text-center">
                    <Layers className="mx-auto h-8 w-8 text-secondary" />
                    <div className="text-sm font-semibold text-secondary">Nothing open</div>
                    <div className="text-xs">Pick a note or cheatsheet to read it here beside the page you are on.</div>
                  </div>
                  <DockQuickSwitcher variant="inline" />
                </div>
              </div>
            )}
          </div>
        </FieldManualShell>
      </div>
    </>
  );
};

export default DockBody;
