import { motion } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Search,
  Layers,
  PanelRight,
  PanelLeft,
  Pin,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target
} from 'lucide-react';
import {
  CptsNoteEntry,
  getAllCptsNotes,
  getNoteById
} from '../../utils/obsidianManualUtils';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { NARROW_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { GlobalVariables } from '../../types';
import { SplitOrientation } from '../../types/workspace';
import { ObsidianTabContent } from './ObsidianTabContent';
import { NoteMoreMenu, NoteMoreMenuEntry } from '../notes/NoteMoreMenu';
import { handleWorkspaceLinkClick, scrollToHeadingAnchor } from '../../utils/workspaceLinkInterceptor';
import { useNotesWorkspaceStore, ObsidianViewMode } from '../../store/useNotesWorkspaceStore';
import { useToastStore } from '../../store/useToastStore';
import { buildNoteMenuEntries } from '../../utils/noteMenuEntries';

export type { ObsidianViewMode };
export type ObsidianNoteLanguage = 'en' | 'he';
/** 'page' is the full-screen workspace; 'popout' is a detached window. */
export type ObsidianDisplayMode = 'page' | 'popout';

export interface ObsidianNoteViewerProps {
  note: CptsNoteEntry;
  globalVars: GlobalVariables;
  soundEnabled: boolean;
  onClose: () => void;
  onNavigateToNote: (noteId: string) => void;
  onDeleteNote?: (noteId: string, noteTitle?: string) => void;
  defaultLanguage?: ObsidianNoteLanguage;
  openNotes?: CptsNoteEntry[];
  onSelectNote?: (noteId: string) => void;
  onCloseTab?: (noteId: string) => void;
  onNewTab?: (note: CptsNoteEntry) => void;
  onCloseAllTabs?: () => void;
  allAvailableNotes?: CptsNoteEntry[];
  displayMode?: ObsidianDisplayMode;
  onPopoutWindow?: () => void;
  /** Fired by the menu's language row, so the parent can switch tree and search titles too. */
  onLanguageChange?: (l: ObsidianNoteLanguage) => void;
  // Multi-Pane Split Workspace Props
  isSplitView?: boolean;
  splitOrientation?: SplitOrientation;
  onToggleSplit?: (orientation?: SplitOrientation) => void;
  onMoveTabToOtherPane?: (tabId: string) => void;
  paneId?: string;
  isPaneActive?: boolean;
  onFocusPane?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onSwitchToCards?: () => void;
  onTagClick?: (tag: string) => void;
  /** Search text to highlight in the active note once it renders. */
  highlightQuery?: string;
  /** 'shell' inside the full-screen workspace (popout always renders 'dock'). */
  variant?: 'dock' | 'shell';
  /** Scroll to this heading in the active tab. Acted on once per larger nonce. */
  headingRequest?: { slug: string; nonce: number };
  isRightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

export const ObsidianNoteViewer: React.FC<ObsidianNoteViewerProps> = ({
  note,
  globalVars,
  soundEnabled,
  onClose,
  onNavigateToNote,
  onDeleteNote,
  defaultLanguage = 'en',
  openNotes,
  onSelectNote,
  onCloseTab,
  onNewTab,
  onCloseAllTabs,
  allAvailableNotes,
  displayMode = 'page',
  onPopoutWindow,
  onLanguageChange,
  isSplitView = false,
  splitOrientation = 'horizontal',
  onToggleSplit,
  onMoveTabToOtherPane,
  paneId,
  isPaneActive = true,
  onFocusPane,
  isSidebarOpen = true,
  onToggleSidebar,
  onTagClick,
  highlightQuery,
  variant = 'dock',
  headingRequest,
  isRightPanelOpen = true,
  onToggleRightPanel,
}) => {
  const [viewMode, setViewMode] = useState<ObsidianViewMode>('reading');
  const tabVariant = variant;
  const [langMode, setLangMode] = useState<ObsidianNoteLanguage>(defaultLanguage);

  // Reader Font Size scaling ('sm' | 'base' | 'lg' | 'xl')
  const storeFontSize = useNotesWorkspaceStore((state) => state.fontSize);
  const setStoreFontSize = useNotesWorkspaceStore((state) => state.setFontSize);

  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('zerobox_note_font_size');
      if (saved === 'sm' || saved === 'base' || saved === 'lg' || saved === 'xl') return saved;
    } catch {}
    return storeFontSize || 'base';
  });

  const handleIncreaseFontSize = useCallback(() => {
    const next = fontSize === 'sm' ? 'base' : fontSize === 'base' ? 'lg' : 'xl';
    try { localStorage.setItem('zerobox_note_font_size', next); } catch {}
    setFontSize(next);
    setStoreFontSize(next);
  }, [fontSize, setStoreFontSize]);

  const handleDecreaseFontSize = useCallback(() => {
    const next = fontSize === 'xl' ? 'lg' : fontSize === 'lg' ? 'base' : 'sm';
    try { localStorage.setItem('zerobox_note_font_size', next); } catch {}
    setFontSize(next);
    setStoreFontSize(next);
  }, [fontSize, setStoreFontSize]);

  // Tab Strip horizontal scrolling buttons
  const handleScrollTabsLeft = useCallback(() => {
    if (tabStripScrollRef.current) {
      tabStripScrollRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  }, []);

  const handleScrollTabsRight = useCallback(() => {
    if (tabStripScrollRef.current) {
      tabStripScrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  }, []);

  // Tab Pinning state
  const [pinnedTabIds, setPinnedTabIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zerobox_pinned_tabs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinTab = useCallback((tabId: string) => {
    setPinnedTabIds((prev) => {
      const next = prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId];
      try {
        localStorage.setItem('zerobox_pinned_tabs_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  // Multi-tab quick picker state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);

  // Vertical Quick-Tabs Drawer state
  const [isTabsDrawerOpen, setIsTabsDrawerOpen] = useState(false);
  const tabsDrawerRef = useRef<HTMLDivElement>(null);

  // Tab strip scroll and active tab element ref for auto-scrolling
  const tabStripScrollRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLDivElement | null>(null);

  // Root container ref for link interception & heading anchor scrolling
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Outline clicks: a request is acted on once, and only when its nonce is newer than the last one
  // handled. A request that predates this mount is treated as handled, so remounting never re-scrolls.
  const lastHandledNonce = useRef(headingRequest?.nonce ?? 0);
  const [pendingHeading, setPendingHeading] = useState<{ slug: string; nonce: number } | null>(null);
  const requestNonce = headingRequest?.nonce;
  const requestSlug = headingRequest?.slug;
  useEffect(() => {
    if (requestNonce === undefined || requestSlug === undefined) return;
    if (requestNonce <= lastHandledNonce.current) return;
    lastHandledNonce.current = requestNonce;
    if (viewMode !== 'reading') setViewMode('reading');
    setPendingHeading({ slug: requestSlug, nonce: requestNonce });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNonce, requestSlug]);
  // Runs once the rendered body exists (never in raw mode). Keep-alive tabs hold hidden copies of the
  // same heading ids, so the lookup is scoped to the active tab.
  useEffect(() => {
    if (!pendingHeading || viewMode === 'raw') return;
    const frame = requestAnimationFrame(() => {
      const tab = Array.from(
        workspaceContainerRef.current?.querySelectorAll<HTMLElement>('[data-tab-note-id]') ?? [],
      ).find((el) => el.dataset.tabNoteId === note.id);
      if (tab) scrollToHeadingAnchor(tab, pendingHeading.slug);
      setPendingHeading(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingHeading, viewMode, note.id]);

  // Safe open notes array (strictly honoring authoritative openNotes)
  const safeOpenNotes = useMemo(() => {
    if (openNotes && openNotes.length > 0) {
      return openNotes;
    }
    return [note];
  }, [openNotes, note]);

  // Order tabs so pinned tabs appear first on the left
  const orderedTabs = useMemo(() => {
    return [...safeOpenNotes].sort((a, b) => {
      const aPinned = pinnedTabIds.includes(a.id);
      const bPinned = pinnedTabIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [safeOpenNotes, pinnedTabIds]);

  // Auto-scroll active tab horizontally into view inside tab strip without jumping outer page
  useEffect(() => {
    if (tabStripScrollRef.current && activeTabElementRef.current) {
      const container = tabStripScrollRef.current;
      const tab = activeTabElementRef.current;
      const tabLeft = tab.offsetLeft;
      const tabRight = tabLeft + tab.offsetWidth;
      if (tabLeft < container.scrollLeft) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ left: Math.max(0, tabLeft - 12), behavior: 'smooth' });
        } else {
          container.scrollLeft = Math.max(0, tabLeft - 12);
        }
      } else if (tabRight > container.scrollLeft + container.clientWidth) {
        if (typeof container.scrollTo === 'function') {
          container.scrollTo({ left: tabRight - container.clientWidth + 12, behavior: 'smooth' });
        } else {
          container.scrollLeft = tabRight - container.clientWidth + 12;
        }
      }
    }
  }, [note.id]);

  // Click-outside listener for quick note picker
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  // Click-outside listener for vertical quick-tabs drawer
  useEffect(() => {
    if (!isTabsDrawerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tabsDrawerRef.current && !tabsDrawerRef.current.contains(e.target as Node)) {
        setIsTabsDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTabsDrawerOpen]);

  // Auto-focus picker search input when opened
  useEffect(() => {
    if (isPickerOpen) {
      setTimeout(() => pickerInputRef.current?.focus(), 50);
    } else {
      setPickerSearch('');
    }
  }, [isPickerOpen]);

  // Filtered notes for quick picker
  const filteredPickerNotes = useMemo(() => {
    const list = allAvailableNotes || [];
    if (!pickerSearch.trim()) {
      return list.slice(0, 15);
    }
    const q = pickerSearch.toLowerCase().trim();
    return list.filter((n) => {
      const matchTitle = (n.titleEn || n.title || '').toLowerCase().includes(q);
      const matchHe = (n.titleHe || '').toLowerCase().includes(q);
      const matchCat = (n.category || '').toLowerCase().includes(q);
      const matchSub = (n.subCategory || '').toLowerCase().includes(q);
      const matchTag = n.tags && n.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchHe || matchCat || matchSub || matchTag;
    }).slice(0, 20);
  }, [allAvailableNotes, pickerSearch]);

  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-focus container so keyboard shortcuts always target the modal
  useEffect(() => {
    modalRef.current?.focus();
  }, [note.id]);

  const handleCloseSpecificTab = useCallback((tabId: string) => {
    if (pinnedTabIds.includes(tabId)) {
      // Pinned tabs require explicit unpinning before closing
      return;
    }
    if (safeOpenNotes.length <= 1) {
      if (onCloseTab) {
        onCloseTab(tabId);
      }
      onClose();
    } else {
      if (onCloseTab) {
        onCloseTab(tabId);
      } else {
        onClose();
      }
    }
  }, [safeOpenNotes.length, onCloseTab, onClose, pinnedTabIds]);

  // Keyboard navigation & tab cycling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against firing shortcuts when operator is typing in input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 1. Close the picker or drawer on Escape (or the popout window itself)
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (isPickerOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsPickerOpen(false);
          return;
        }
        if (isTabsDrawerOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsTabsDrawerOpen(false);
          return;
        }
        // Page mode never closes tabs on Escape; only a popout window closes itself.
        if (displayMode === 'popout') {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (isInput) return;

      // 3. Close active tab: Alt+W or Ctrl+Shift+W (or Ctrl+W / Cmd+W)
      if (
        (e.altKey && e.key.toLowerCase() === 'w') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w')
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleCloseSpecificTab(note.id);
        return;
      }

      // 3. Tab cycling: Alt+ArrowRight / Alt+] (next) and Alt+ArrowLeft / Alt+[ (previous)
      if (
        (e.altKey && (e.key === 'ArrowRight' || e.key === ']')) ||
        (e.ctrlKey && !e.shiftKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = safeOpenNotes.findIndex((n) => n.id === note.id);
        if (currentIndex !== -1 && safeOpenNotes.length > 1) {
          const nextIndex = (currentIndex + 1) % safeOpenNotes.length;
          onSelectNote?.(safeOpenNotes[nextIndex].id);
        }
        return;
      }

      if (
        (e.altKey && (e.key === 'ArrowLeft' || e.key === '[')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
        const currentIndex = safeOpenNotes.findIndex((n) => n.id === note.id);
        if (currentIndex !== -1 && safeOpenNotes.length > 1) {
          const prevIndex = (currentIndex - 1 + safeOpenNotes.length) % safeOpenNotes.length;
          onSelectNote?.(safeOpenNotes[prevIndex].id);
        }
        return;
      }

      // 4. Direct tab jump: Alt+1..9
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const tabNumber = parseInt(e.key, 10);
        if (tabNumber <= safeOpenNotes.length) {
          e.preventDefault();
          e.stopPropagation();
          onSelectNote?.(safeOpenNotes[tabNumber - 1].id);
          return;
        }
      }

      // 5. Open new tab picker: Alt+T or Ctrl+T
      if (
        (e.altKey && e.key.toLowerCase() === 't') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't')
      ) {
        e.preventDefault();
        e.stopPropagation();
        setIsPickerOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note.id, safeOpenNotes, onSelectNote, onClose, isPickerOpen, isTabsDrawerOpen, handleCloseSpecificTab, displayMode]);

  // Universal Link Interception Capture Handler
  const handleContainerLinkClick = useCallback((e: React.MouseEvent) => {
    handleWorkspaceLinkClick(e, {
      containerElement: workspaceContainerRef.current,
      onOpenNote: (targetNoteId, options) => {
        const pool = allAvailableNotes || getAllCptsNotes();
        const found = getNoteById(targetNoteId, pool);
        if (!found) return;

        if (options?.background) {
          // Open in background tab without shifting active focus
          if (onNewTab && !safeOpenNotes.some((n) => n.id === found.id)) {
            onNewTab(found);
            if (onSelectNote) onSelectNote(note.id); // keep active tab focused
          }
        } else {
          // Open and switch focus
          if (safeOpenNotes.some((n) => n.id === found.id)) {
            onSelectNote?.(found.id);
          } else if (onNewTab) {
            onNewTab(found);
          } else {
            onNavigateToNote(found.id);
          }
        }

        // If an anchor was requested, scroll to it after rendering
        if (options?.anchor && workspaceContainerRef.current) {
          setTimeout(() => {
            if (workspaceContainerRef.current && options.anchor) {
              scrollToHeadingAnchor(workspaceContainerRef.current, options.anchor);
            }
          }, 100);
        }
      },
      notesPool: allAvailableNotes || getAllCptsNotes(),
      currentNoteId: note.id,
    });
  }, [allAvailableNotes, safeOpenNotes, onNewTab, onSelectNote, onNavigateToNote, note.id]);

  const handleContainerAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Middle click
      handleContainerLinkClick(e);
    }
  }, [handleContainerLinkClick]);

  // Engaged target's IP wins over the global RHOST (shared precedence helper).
  const effectiveVars = useEffectiveGlobalVars(globalVars);

  const handleCopyAllCommands = useCallback(() => {
    if (!note.commands || note.commands.length === 0) return;
    const all = note.commands.map((cmd) => interpolateCommand(cmd, effectiveVars)).join('\n\n');
    safeCopyToClipboard(all);
    if (soundEnabled) playCyberSound('copy');
    useToastStore.getState().addToast({ type: 'success', message: 'Copied all commands' });
  }, [note.commands, effectiveVars, soundEnabled]);

  const isNarrow = useMediaQuery(NARROW_QUERY);
  const isPopout = displayMode === 'popout';
  // One right-panel toggle in a split view: the active pane's header owns it.
  const showRightPanelToggle = Boolean(onToggleRightPanel) && !isPopout && (!isSplitView || isPaneActive);

  const iconBtn =
    'inline-flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-150 motion-reduce:transition-none hover:bg-surface-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1';
  const segBtn =
    'cursor-pointer rounded-sm px-2.5 py-1 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ';
  const segOn = 'bg-accent font-semibold text-on-accent';
  const segOff = 'text-secondary hover:text-primary';

  const handleLanguageChange = useCallback(
    (l: ObsidianNoteLanguage) => {
      setLangMode(l);
      onLanguageChange?.(l);
    },
    [onLanguageChange],
  );

  // Copy, Export and Report read the live pool, so edits saved in another pane are included.
  const currentMarkdown = () =>
    getNoteById(note.id, allAvailableNotes)?.rawMarkdown ?? note.rawMarkdown ?? (note as any).content ?? '';

  const menuEntries: NoteMoreMenuEntry[] = buildNoteMenuEntries({
    note,
    soundEnabled,
    getMarkdown: currentMarkdown,
    onCopyCommands: handleCopyAllCommands,
    split: onToggleSplit
      ? {
          isSplitView,
          orientation: splitOrientation,
          onToggle: onToggleSplit,
        }
      : undefined,
    onMoveTab:
      isSplitView && onMoveTabToOtherPane && safeOpenNotes.length > 1 ? () => onMoveTabToOtherPane(note.id) : undefined,
    popout: isPopout ? undefined : { onOpen: onPopoutWindow },
    pin: isPopout
      ? undefined
      : {
          onSelect: () => {
            useNotesWorkspaceStore.getState().openNote(note.id);
            useNotesWorkspaceStore.getState().setIsOpen(true);
            useNotesWorkspaceStore.getState().setIsPinned(true);
            if (soundEnabled) playCyberSound('click');
            // The dock is hidden on this route, so the toast is the only feedback.
            useToastStore.getState().addToast({ type: 'success', message: 'Pinned. It stays open on other pages.' });
          },
        },
    onDeleteNote,
  });

  const innerCardContent = (
    <div
      onClick={onFocusPane}
      className={`h-full w-full flex flex-col bg-surface-base overflow-hidden transition-opacity duration-150 motion-reduce:transition-none ${
        isSplitView && !isPaneActive ? 'opacity-80' : ''
      }`}
    >
      {/* Multi-Tab Workspace Strip (Obsidian / VS Code style) */}
      <div 
        dir="ltr"
        className="flex items-center justify-between px-3 h-9 min-h-[36px] bg-surface-sunken border-b border-subtle select-none flex-shrink-0 overflow-hidden"
      >
        {/* Left scroll chevron */}
        <button
          type="button"
          onClick={handleScrollTabsLeft}
          className="flex-shrink-0 cursor-pointer rounded-sm p-1 text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={tabStripScrollRef}
          data-testid="tab-strip-scroll-container"
          dir="ltr"
          className="flex items-end gap-0.5 flex-1 min-w-0 overflow-x-auto no-scrollbar h-full"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {orderedTabs.map((tab) => {
            const isActive = tab.id === note.id;
            const isPinned = pinnedTabIds.includes(tab.id);

            return (
              <div
                key={tab.id}
                ref={isActive ? activeTabElementRef : undefined}
                role="tab"
                aria-selected={isActive}
                data-testid={`note-tab-${tab.id}`}
                dir="ltr"
                onClick={() => {
                  if (soundEnabled && !isActive) playCyberSound('click');
                  onSelectNote?.(tab.id);
                }}
                onAuxClick={(e) => {
                  if (e.button === 1 && !isPinned) {
                    e.preventDefault();
                    if (soundEnabled) playCyberSound('click');
                    handleCloseSpecificTab(tab.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  togglePinTab(tab.id);
                }}
                className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 rounded-t-md text-xs border border-b-0 cursor-pointer transition-colors duration-150 motion-reduce:transition-none max-w-[140px] md:max-w-[240px] flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ${
                  isActive
                    ? 'h-[31px] bg-surface-base border-subtle text-primary font-semibold'
                    : 'h-[30px] border-transparent text-muted hover:text-secondary hover:bg-surface-hover'
                }`}
                title={`${tab.titleEn || tab.title} (${tab.category})${isPinned ? ' [Pinned]' : ''}`}
              >
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={TACTICAL_SPRING}
                    aria-hidden="true"
                    data-testid="active-tab-line" className={`pointer-events-none absolute -top-px left-0 right-0 h-0 border-t-2 ${isSplitView && !isPaneActive ? 'border-strong' : 'border-accent'}`}
                  />
                )}
                {/* Pin indicator */}
                {isPinned ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinTab(tab.id);
                    }}
                    className="flex-shrink-0 cursor-pointer rounded-sm p-0.5 text-accent hover:text-callout-danger-fg transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                    title="Unpin tab"
                  >
                    <Pin className="w-3.5 h-3.5 fill-accent rotate-45" />
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-accent" aria-hidden="true">
                    {tab.stage ? <Target size={14} /> : <FileText size={14} />}
                  </span>
                )}

                <span className="truncate flex-1 text-left">
                  {tab.titleEn || tab.title}
                </span>

                {/* Close Button (Hidden on Pinned Tabs) */}
                {!isPinned && (
                  <button
                    type="button"
                    data-testid={`close-tab-${tab.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (soundEnabled) playCyberSound('click');
                      handleCloseSpecificTab(tab.id);
                    }}
                    className="flex-shrink-0 cursor-pointer rounded-sm p-0.5 text-muted opacity-60 transition-[opacity,background-color,color] duration-150 motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100 touch:opacity-100 hover:bg-callout-danger-bg hover:text-callout-danger-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                    title="Close tab (Alt+W)"
                    aria-label={`Close tab ${tab.titleEn || tab.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right scroll chevron */}
        <button
          type="button"
          onClick={handleScrollTabsRight}
          className="flex-shrink-0 cursor-pointer rounded-sm p-1 text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
          title="Scroll tabs right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Pinned New Tab (+) Button - Permanently visible outside scroll container */}
        <div className="relative flex-shrink-0 pl-1">
          <button
            type="button"
            data-testid="new-tab-button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            className="flex h-7 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-subtle px-2.5 text-xs text-secondary hover:bg-surface-hover hover:text-primary transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
            title="Open new tab (Ctrl+T / Alt+T)"
            aria-label="Open note in new tab"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline text-[11px] font-semibold">New Tab</span>
          </button>

          {/* Quick Note Picker Popover */}
          {isPickerOpen && (
            <div
              ref={pickerRef}
              data-testid="quick-note-picker"
              className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 sm:w-96 max-h-80 bg-surface-elevated border border-strong rounded-md shadow-xl z-[100] overflow-hidden flex flex-col p-2 space-y-2 animate-fadeIn motion-reduce:animate-none"
            >
              <div className="flex items-center justify-between px-2 pt-1 border-b border-subtle pb-1.5">
                <span className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-accent" />
                  Field manual quick picker
                </span>
                <span className="text-[10px] text-muted">
                  Esc to close
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={pickerInputRef}
                  type="text"
                  data-testid="picker-search-input"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setIsPickerOpen(false);
                    } else if (e.key === 'Enter' && filteredPickerNotes.length > 0) {
                      const first = filteredPickerNotes[0];
                      if (onNewTab) {
                        onNewTab(first);
                      } else if (onSelectNote) {
                        onSelectNote(first.id);
                      }
                      setIsPickerOpen(false);
                    }
                  }}
                  placeholder="Search manual notes (e.g. nmap, privesc, ad)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface-sunken border border-subtle focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 text-xs text-secondary placeholder:text-muted/60"
                />
              </div>

              <div className="overflow-y-auto max-h-56 space-y-1 pr-1 scrollbar-thin">
                {filteredPickerNotes.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted">
                    No field notes match "{pickerSearch}"
                  </div>
                ) : (
                  filteredPickerNotes.map((n) => {
                    const isOpen = safeOpenNotes.some((openTab) => openTab.id === n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        data-testid={`picker-note-${n.id}`}
                        onClick={() => {
                          if (isOpen && onSelectNote) {
                            onSelectNote(n.id);
                          } else if (onNewTab) {
                            onNewTab(n);
                          } else {
                            onNavigateToNote(n.id);
                          }
                          setIsPickerOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm text-left text-xs hover:bg-surface-hover hover:text-primary transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                      >
                        <div className="truncate flex-1">
                          <div className="font-semibold text-secondary truncate">
                            {n.titleEn || n.title}
                          </div>
                          <div className="text-[10px] text-muted truncate">
                            {n.category} {n.subCategory ? `› ${n.subCategory}` : ''}
                          </div>
                        </div>
                        {isOpen ? (
                          <span className="text-[10px] font-semibold text-callout-info-fg bg-accent-muted border border-subtle px-1.5 py-0.5 rounded flex-shrink-0">
                            Open
                          </span>
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-accent opacity-60 hover:opacity-100 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right tab strip controls */}
        <div 
          dir="ltr"
          className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 text-[10px] text-muted flex-shrink-0"
        >
          {/* Quick-Tabs Drawer / Popover Toggle */}
          <div className="relative" ref={tabsDrawerRef}>
            <button
              type="button"
              data-testid="toggle-tabs-drawer"
              onClick={() => setIsTabsDrawerOpen((prev) => !prev)}
              className={`h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ${
                isTabsDrawerOpen
                  ? 'bg-surface-hover border-strong text-primary'
                  : 'border-subtle text-secondary hover:bg-surface-hover hover:text-primary'
              }`}
              title="View and navigate all open tabs vertically"
              aria-label={`Open tabs list (${safeOpenNotes.length})`}
            >
              <Layers className="w-3 h-3 text-accent" />
              <span>{safeOpenNotes.length} {safeOpenNotes.length === 1 ? 'tab' : 'tabs'}</span>
            </button>

            {/* Vertical Quick-Tabs Popover */}
            {isTabsDrawerOpen && (
              <div
                data-testid="tabs-drawer-popover"
                className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 max-h-80 bg-surface-elevated border border-strong rounded-md shadow-xl z-[110] overflow-hidden flex flex-col p-2 space-y-2 animate-fadeIn motion-reduce:animate-none"
              >
                <div className="flex items-center justify-between px-2 pt-1 border-b border-subtle pb-1.5">
                  <span className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-accent" />
                    Active note tabs ({safeOpenNotes.length})
                  </span>
                  {safeOpenNotes.length > 1 && onCloseAllTabs && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseAllTabs();
                        setIsTabsDrawerOpen(false);
                      }}
                      className="cursor-pointer rounded-sm px-1 text-[10px] text-callout-danger-fg hover:underline transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                    >
                      Close All
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-56 space-y-1 pr-1 scrollbar-thin">
                  {safeOpenNotes.map((tab) => {
                    const isActive = tab.id === note.id;
                    const isPinned = pinnedTabIds.includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-sm border transition-colors duration-150 motion-reduce:transition-none ${
                          isActive
                            ? 'bg-surface-hover border-subtle text-primary font-semibold'
                            : 'border-transparent text-muted hover:text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        <button
                          type="button"
                          data-testid={`drawer-tab-item-${tab.id}`}
                          onClick={() => {
                            onSelectNote?.(tab.id);
                            setIsTabsDrawerOpen(false);
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 rounded-sm text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                        >
                          <span className="text-accent flex-shrink-0" aria-hidden="true">
                            {tab.stage ? <Target size={14} /> : <FileText size={14} />}
                          </span>
                          <span className="truncate text-xs">
                            {tab.titleEn || tab.title}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePinTab(tab.id)}
                            className={`cursor-pointer p-1 rounded-sm hover:bg-surface-hover transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 ${
                              isPinned ? 'text-accent' : 'text-muted'
                            }`}
                            title={isPinned ? 'Unpin tab' : 'Pin tab'}
                          >
                            <Pin className={`w-3 h-3 ${isPinned ? 'fill-accent rotate-45' : ''}`} />
                          </button>
                          {!isPinned && (
                            <button
                              type="button"
                              data-testid={`drawer-close-tab-${tab.id}`}
                              onClick={() => {
                                if (onCloseTab) {
                                  onCloseTab(tab.id);
                                } else {
                                  handleCloseSpecificTab(tab.id);
                                }
                              }}
                              className="cursor-pointer p-1 rounded-sm text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg transition-colors duration-150 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                              title="Close tab"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="hidden xl:inline text-muted/70">
            Alt+1..9 switch • Alt+W close
          </span>
          {safeOpenNotes.length > 1 && onCloseAllTabs && (
            <button
              type="button"
              data-testid="close-all-tabs-button"
              onClick={onCloseAllTabs}
              className="hidden sm:inline px-1.5 py-0.5 rounded-sm hover:bg-callout-danger-bg hover:text-callout-danger-fg border border-transparent hover:border-callout-danger-border transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
              title="Close all tabs"
            >
              Close All
            </button>
          )}
        </div>
      </div>

      {/* Note header: breadcrumb, Reading/Edit, the more menu, right-panel toggle */}
      <div
        dir="ltr"
        data-testid="note-header"
        className="flex h-9 min-h-[36px] flex-shrink-0 items-center justify-between gap-2 border-b border-subtle bg-surface-card px-3"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {onToggleSidebar && (
            <button
              type="button"
              data-testid="toggle-sidebar-button"
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                onToggleSidebar();
              }}
              className={iconBtn}
              title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft className={`h-[18px] w-[18px] ${isSidebarOpen ? 'text-accent' : ''}`} />
            </button>
          )}
          <nav
            aria-label="Breadcrumb"
            data-testid="note-breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-[13px] text-tertiary"
          >
            <span className="truncate">{note.category}</span>
            {note.subCategory && (
              <>
                <span aria-hidden="true" className="hidden flex-shrink-0 md:inline">/</span>
                <span className="hidden truncate md:inline">{note.subCategory}</span>
              </>
            )}
            <span aria-hidden="true" className="flex-shrink-0">/</span>
            <span className="truncate font-medium text-muted">{note.titleEn || note.title}</span>
          </nav>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <div className="flex items-center rounded-sm bg-surface-sunken p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('reading')}
              aria-pressed={viewMode === 'reading'}
              className={segBtn + (viewMode === 'reading' ? segOn : segOff)}
              title="Obsidian rich formatted reading mode"
            >
              Reading
            </button>
            <button
              type="button"
              onClick={() => setViewMode(isNarrow ? 'raw' : 'split')}
              aria-pressed={viewMode !== 'reading'}
              className={segBtn + (viewMode !== 'reading' ? segOn : segOff)}
              title="Switch to Edit View"
            >
              Edit
            </button>
          </div>

          <NoteMoreMenu
            entries={menuEntries}
            language={langMode}
            onLanguageChange={handleLanguageChange}
            fontSize={fontSize}
            onFontSmaller={handleDecreaseFontSize}
            onFontLarger={handleIncreaseFontSize}
          />

          {showRightPanelToggle && (
            <button
              type="button"
              data-testid="toggle-right-panel"
              aria-label="Toggle right sidebar"
              aria-expanded={isRightPanelOpen}
              title="Toggle right sidebar"
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                onToggleRightPanel?.();
              }}
              className={iconBtn}
            >
              <PanelRight className={`h-[18px] w-[18px] ${isRightPanelOpen ? 'text-accent' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* DOM Keep-Alive Tab Workspace Container with Universal Event Delegation */}
      <div
        ref={workspaceContainerRef}
        data-testid="workspace-keepalive-container"
        onClickCapture={handleContainerLinkClick}
        onAuxClickCapture={handleContainerAuxClick}
        className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-cyber-bg/50"
      >
        {safeOpenNotes.map((tabNote) => {
          const isActive = tabNote.id === note.id;
          return (
            <div
              key={tabNote.id}
              data-testid={`tab-content-${tabNote.id}`}
              data-tab-note-id={tabNote.id}
              className={isActive ? 'h-full w-full flex-1 min-h-0 overflow-y-auto' : 'hidden'}
              style={{ display: isActive ? undefined : 'none' }}
            >
              <ObsidianTabContent
                note={tabNote}
                isActive={isActive}
                globalVars={globalVars}
                soundEnabled={soundEnabled}
                onNavigateToNote={onNavigateToNote}
                onOpenNote={(targetNoteId, options) => {
                  const pool = allAvailableNotes || getAllCptsNotes();
                  const found = getNoteById(targetNoteId, pool);
                  if (!found) return;

                  if (options?.background) {
                    if (onNewTab && !safeOpenNotes.some((n) => n.id === found.id)) {
                      onNewTab(found);
                      if (onSelectNote) onSelectNote(note.id);
                    }
                  } else {
                    if (safeOpenNotes.some((n) => n.id === found.id)) {
                      onSelectNote?.(found.id);
                    } else if (onNewTab) {
                      onNewTab(found);
                    } else {
                      onNavigateToNote(found.id);
                    }
                  }

                  if (options?.anchor && workspaceContainerRef.current) {
                    setTimeout(() => {
                      if (workspaceContainerRef.current && options.anchor) {
                        scrollToHeadingAnchor(workspaceContainerRef.current, options.anchor);
                      }
                    }, 100);
                  }
                }}
                defaultLanguage={langMode}
                viewMode={viewMode}
                fontSize={fontSize}
                onTagClick={onTagClick}
                highlightQuery={isActive ? highlightQuery : undefined}
                variant={tabVariant}
                onOpenNotePicker={(query) => {
                  if (query) setPickerSearch(query);
                  setIsPickerOpen(true);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="region"
      aria-label="Field manual note viewer workspace"
      data-testid="obsidian-note-viewer-docked"
      data-pane-id={paneId}
      className="w-full h-full flex flex-col outline-none select-none"
    >
      {innerCardContent}
    </div>
  );
};
