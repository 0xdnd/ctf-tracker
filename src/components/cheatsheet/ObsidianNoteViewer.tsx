import { motion } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  BookOpen, 
  Plus, 
  Search, 
  Layers, 
  ExternalLink, 
  PanelRight, 
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  Pin,
  Trash2,
  MoveRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  CptsNoteEntry, 
  getAllCptsNotes,
  getNoteById 
} from '../../utils/obsidianManualUtils';
import { interpolateCommand, playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { GlobalVariables } from '../../types';
import { OpenNoteOptions, SplitOrientation } from '../../types/workspace';
import { ShareLinkButton } from '../common/ShareLinkButton';
import { ObsidianTabContent } from './ObsidianTabContent';
import { handleWorkspaceLinkClick, scrollToHeadingAnchor } from '../../utils/workspaceLinkInterceptor';
import { useNotesWorkspaceStore, ObsidianViewMode } from '../../store/useNotesWorkspaceStore';

export type { ObsidianViewMode };
export type ObsidianNoteLanguage = 'en' | 'he';
export type ObsidianDisplayMode = 'modal' | 'docked' | 'popout';

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
  onToggleDisplayMode?: () => void;
  onPopoutWindow?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  // Multi-Pane Split Workspace Props
  isSplitView?: boolean;
  splitOrientation?: SplitOrientation;
  onToggleSplit?: (orientation?: SplitOrientation) => void;
  onMoveTabToOtherPane?: (tabId: string) => void;
  paneId?: string;
  isPaneActive?: boolean;
  onFocusPane?: () => void;
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
  displayMode = 'modal',
  onToggleDisplayMode,
  onPopoutWindow,
  isMaximized = false,
  onToggleMaximize,
  isSplitView = false,
  splitOrientation = 'horizontal',
  onToggleSplit,
  onMoveTabToOtherPane,
  paneId,
  isPaneActive = true,
  onFocusPane,
}) => {
  const [viewMode, setViewMode] = useState<ObsidianViewMode>('reading');
  const [langMode, setLangMode] = useState<ObsidianNoteLanguage>(defaultLanguage);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Maximize / Focus Mode state fallback if not managed by parent
  const [internalMaximized, setInternalMaximized] = useState(false);
  const effectiveMaximized = onToggleMaximize ? isMaximized : internalMaximized;

  const handleToggleMaximize = useCallback(() => {
    if (onToggleMaximize) {
      onToggleMaximize();
    } else {
      setInternalMaximized((prev) => !prev);
    }
    if (soundEnabled) playCyberSound('click');
  }, [onToggleMaximize, soundEnabled]);

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

  // Auto-scroll active tab into view whenever note changes
  useEffect(() => {
    if (activeTabElementRef.current && typeof activeTabElementRef.current.scrollIntoView === 'function') {
      activeTabElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
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

      // 1. Close modal or picker or drawer on Escape key
      if (e.key === 'Escape') {
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
        e.preventDefault();
        onClose();
        return;
      }

      if (isInput) return;

      // 2. Toggle dock / modal viewing mode: Alt+M
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        e.stopPropagation();
        if (onToggleDisplayMode) {
          if (soundEnabled) playCyberSound('click');
          onToggleDisplayMode();
        }
        return;
      }

      // 2b. Toggle Maximize / Zen focus mode: Alt+F
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        handleToggleMaximize();
        return;
      }

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

      // 6. Toggle Maximize / Full-Width Focus Mode: Alt+F
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        handleToggleMaximize();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note.id, safeOpenNotes, onSelectNote, onClose, isPickerOpen, isTabsDrawerOpen, handleCloseSpecificTab, handleToggleMaximize]);

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

  const handleCopyAllCommands = useCallback(() => {
    if (!note.commands || note.commands.length === 0) return;
    const all = note.commands.map((cmd) => interpolateCommand(cmd, globalVars)).join('\n\n');
    safeCopyToClipboard(all);
    setCopiedId('all-cmds-' + note.id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId(null), 2000);
  }, [note.commands, note.id, globalVars, soundEnabled]);

  const handleCopyRawMarkdown = useCallback(() => {
    const raw = note.rawMarkdown || (note as any).content || '';
    safeCopyToClipboard(raw);
    setCopiedId('raw-md-' + note.id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId(null), 2000);
  }, [note.rawMarkdown, (note as any).content, note.id, soundEnabled]);

  const innerCardContent = (
    <div
      onClick={onFocusPane}
      className={`h-full w-full flex flex-col bg-cyber-card border rounded-2xl overflow-hidden shadow-2xl transition-[box-shadow,background-color,border-color,color] ${
        isPaneActive ? 'border-accent ring-1 ring-accent' : 'border-subtle opacity-95'
      }`}
    >
      {/* Multi-Tab Workspace Strip (Obsidian / VS Code style) */}
      <div 
        dir="ltr"
        className="flex items-center justify-between px-3 h-10 min-h-[40px] bg-surface-elevated border-b border-subtle select-none flex-shrink-0 overflow-hidden"
      >
        {/* Left scroll chevron */}
        <button
          type="button"
          onClick={handleScrollTabsLeft}
          className="p-1 rounded hover:bg-accent-muted text-cyber-muted hover:text-primary transition-colors flex-shrink-0"
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={tabStripScrollRef}
          data-testid="tab-strip-scroll-container"
          dir="ltr"
          className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar py-1 h-full"
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
                className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 h-8 rounded-lg text-xs font-mono border cursor-pointer transition-colors max-w-[200px] sm:max-w-[240px] flex-shrink-0 ${
                  isActive
                    ? 'bg-accent-muted border-accent text-primary font-semibold shadow-md ring-1 ring-accent'
                    : 'bg-surface-sunken border-subtle text-cyber-muted hover:text-secondary hover:bg-accent-muted hover:border-subtle'
                }`}
                title={`${tab.titleEn || tab.title} (${tab.category})${isPinned ? ' [Pinned]' : ''}`}
              >
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={TACTICAL_SPRING}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-2 right-2 h-[2px] bg-accent rounded-full"
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
                    className="text-accent hover:text-callout-danger-fg transition-colors flex-shrink-0 p-0.5"
                    title="Unpin tab"
                  >
                    <Pin className="w-3.5 h-3.5 fill-accent rotate-45" />
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-accent text-xs">
                    {tab.stage ? '🎯' : '📝'}
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
                    className="p-0.5 rounded opacity-60 group-hover:opacity-100 hover:bg-callout-danger-bg hover:text-callout-danger-fg text-cyber-muted transition-[opacity,background-color,border-color,color] cursor-pointer flex-shrink-0"
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
          className="p-1 rounded hover:bg-accent-muted text-cyber-muted hover:text-primary transition-colors flex-shrink-0"
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
            className="h-8 px-2.5 rounded-lg bg-accent-muted hover:bg-accent-muted border border-accent text-accent hover:text-primary transition-[box-shadow,background-color,border-color,color] flex items-center gap-1.5 text-xs font-mono cursor-pointer flex-shrink-0 shadow-sm"
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
              className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 sm:w-96 max-h-80 bg-cyber-card border border-accent rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col p-2 space-y-2 backdrop-blur-xl animate-fadeIn"
            >
              <div className="flex items-center justify-between px-2 pt-1 border-b border-subtle pb-1.5">
                <span className="text-[11px] font-mono font-semibold text-accent flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-accent" />
                  FIELD MANUAL QUICK PICKER
                </span>
                <span className="text-[10px] font-mono text-cyber-muted">
                  Esc to close
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-cyber-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
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
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-sunken border border-subtle focus:border-accent focus:outline-none text-xs font-mono text-secondary placeholder:text-cyber-muted/60"
                />
              </div>

              <div className="overflow-y-auto max-h-56 space-y-1 pr-1 scrollbar-thin">
                {filteredPickerNotes.length === 0 ? (
                  <div className="py-4 text-center text-xs font-mono text-cyber-muted">
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
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-mono hover:bg-accent-muted hover:text-primary transition-colors border border-transparent hover:border-accent cursor-pointer"
                      >
                        <div className="truncate flex-1">
                          <div className="font-semibold text-secondary truncate">
                            {n.titleEn || n.title}
                          </div>
                          <div className="text-[10px] text-cyber-muted truncate">
                            {n.category} {n.subCategory ? `› ${n.subCategory}` : ''}
                          </div>
                        </div>
                        {isOpen ? (
                          <span className="text-[10px] font-semibold text-cyber-cyan bg-accent-muted border border-subtle px-1.5 py-0.5 rounded flex-shrink-0">
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
          className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 text-[10px] font-mono text-cyber-muted flex-shrink-0"
        >
          {/* Quick-Tabs Drawer / Popover Toggle */}
          <div className="relative" ref={tabsDrawerRef}>
            <button
              type="button"
              data-testid="toggle-tabs-drawer"
              onClick={() => setIsTabsDrawerOpen((prev) => !prev)}
              className={`h-7 px-2.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTabsDrawerOpen
                  ? 'bg-accent-muted border-accent text-primary shadow-md'
                  : 'bg-accent-muted hover:bg-accent-muted border-subtle hover:border-accent text-accent hover:text-primary'
              }`}
              title="View and navigate all open tabs vertically"
              aria-label={`Open tabs list (${safeOpenNotes.length})`}
            >
              <Layers className="w-3 h-3 text-accent" />
              <span>{safeOpenNotes.length} {safeOpenNotes.length === 1 ? 'TAB' : 'TABS'}</span>
            </button>

            {/* Vertical Quick-Tabs Popover */}
            {isTabsDrawerOpen && (
              <div
                data-testid="tabs-drawer-popover"
                className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 max-h-80 bg-cyber-card border border-accent rounded-xl shadow-2xl z-[110] overflow-hidden flex flex-col p-2 space-y-2 backdrop-blur-xl animate-fadeIn"
              >
                <div className="flex items-center justify-between px-2 pt-1 border-b border-subtle pb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-accent flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-accent" />
                    ACTIVE NOTE TABS ({safeOpenNotes.length})
                  </span>
                  {safeOpenNotes.length > 1 && onCloseAllTabs && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseAllTabs();
                        setIsTabsDrawerOpen(false);
                      }}
                      className="text-[10px] text-callout-danger-fg hover:text-callout-danger-fg transition-colors cursor-pointer"
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
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isActive
                            ? 'bg-accent-muted border-accent text-primary font-semibold'
                            : 'bg-surface-sunken border-subtle text-cyber-muted hover:text-secondary hover:bg-accent-muted'
                        }`}
                      >
                        <button
                          type="button"
                          data-testid={`drawer-tab-item-${tab.id}`}
                          onClick={() => {
                            onSelectNote?.(tab.id);
                            setIsTabsDrawerOpen(false);
                          }}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <span className="text-accent text-xs flex-shrink-0">
                            {tab.stage ? '🎯' : '📝'}
                          </span>
                          <span className="truncate text-xs">
                            {tab.titleEn || tab.title}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePinTab(tab.id)}
                            className={`p-1 rounded hover:bg-surface-card ${
                              isPinned ? 'text-accent' : 'text-cyber-muted'
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
                              className="p-1 rounded text-cyber-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg"
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

          <span className="hidden xl:inline text-cyber-muted/70">
            Alt+1..9 switch • Alt+W close
          </span>
          {safeOpenNotes.length > 1 && onCloseAllTabs && (
            <button
              type="button"
              data-testid="close-all-tabs-button"
              onClick={onCloseAllTabs}
              className="hidden sm:inline px-1.5 py-0.5 rounded hover:bg-callout-danger-bg hover:text-callout-danger-fg border border-transparent hover:border-callout-danger-border transition-colors cursor-pointer"
              title="Close all tabs"
            >
              Close All
            </button>
          )}
        </div>
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyber-bg/95 border-b border-subtle flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono truncate max-w-sm sm:max-w-md lg:max-w-xl min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent-muted border border-accent text-accent font-semibold flex-shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">OFFENSIVE FIELD MANUAL</span>
            <span className="sm:hidden">MANUAL</span>
          </div>
          <span className="text-cyber-muted flex-shrink-0">/</span>
          <span className="text-cyber-muted truncate">{note.category}</span>
          {note.subCategory && (
            <>
              <span className="text-cyber-muted flex-shrink-0">/</span>
              <span className="text-accent truncate hidden md:inline">{note.subCategory}</span>
            </>
          )}
          <span className="text-cyber-muted flex-shrink-0">/</span>
          <span className="text-primary font-semibold truncate">{note.titleEn || note.title}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Reading / Split / Raw Toggle */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-surface-sunken border border-subtle text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode('reading')}
              className={'px-2.5 py-1 rounded transition-colors cursor-pointer ' + (
                viewMode === 'reading'
                  ? 'bg-accent text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              title="Obsidian rich formatted reading mode"
            >
              Reading
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={'px-2.5 py-1 rounded transition-colors cursor-pointer ' + (
                viewMode === 'split'
                  ? 'bg-accent text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              title="Split side-by-side editor and live preview"
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={'px-2.5 py-1 rounded transition-colors cursor-pointer ' + (
                viewMode === 'raw'
                  ? 'bg-accent text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              title="View raw Obsidian markdown"
            >
              Raw MD
            </button>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-sunken border border-subtle text-[11px] font-mono">
            <button
              type="button"
              data-testid="modal-lang-en"
              onClick={() => setLangMode('en')}
              className={'px-2.5 py-1 rounded transition-colors cursor-pointer ' + (
                langMode === 'en'
                  ? 'bg-accent text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              title="English technical playbook only"
            >
              🇬🇧 EN
            </button>
            <button
              type="button"
              data-testid="modal-lang-he"
              onClick={() => setLangMode('he')}
              className={'px-2.5 py-1 rounded transition-colors cursor-pointer ' + (
                langMode === 'he'
                  ? 'bg-accent text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              title="רשימות אישיות בעברית בלבד"
            >
              🇮🇱 עב
            </button>
          </div>

          {/* Reader Font Size Scaling (A- / A+) */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-sunken border border-subtle text-[11px] font-mono">
            <button
              type="button"
              data-testid="decrease-font-size-button"
              onClick={handleDecreaseFontSize}
              disabled={fontSize === 'sm'}
              className="px-2 py-1 rounded text-secondary hover:text-primary disabled:opacity-40 disabled:hover:text-cyber-muted transition-colors cursor-pointer"
              title="Decrease note font size"
              aria-label="Decrease note font size"
            >
              A-
            </button>
            <span 
              data-testid="font-size-indicator"
              className="px-1.5 py-0.5 text-[10px] font-semibold text-accent "
            >
              {fontSize}
            </span>
            <button
              type="button"
              data-testid="increase-font-size-button"
              onClick={handleIncreaseFontSize}
              disabled={fontSize === 'xl'}
              className="px-2 py-1 rounded text-secondary hover:text-primary disabled:opacity-40 disabled:hover:text-cyber-muted transition-colors cursor-pointer"
              title="Increase note font size"
              aria-label="Increase note font size"
            >
              A+
            </button>
          </div>

          {/* Copy Commands */}
          {note.commands && note.commands.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAllCommands}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-accent-muted border border-accent text-accent hover:text-accent hover:bg-accent-muted text-xs font-semibold transition-colors cursor-pointer"
              title="Copy all commands in note"
            >
              {copiedId === 'all-cmds-' + note.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-cyber-emerald" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Cmds ({note.commands.length})</span>
                </>
              )}
            </button>
          )}

          <ShareLinkButton
            path={`/cheatsheets?note=${note.id}`}
            title={note.titleEn || note.title}
            label="Share"
            className="px-2.5 py-1"
          />

          <button
            type="button"
            onClick={handleCopyRawMarkdown}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-sunken border border-cyber-border text-cyber-muted hover:text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer"
            title="Copy raw markdown to paste into your Obsidian vault"
          >
            {copiedId === 'raw-md-' + note.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-cyber-emerald" />
                <span>MD Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy MD</span>
              </>
            )}
          </button>

          {/* Multi-Pane Split View Actions */}
          {onToggleSplit && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="toggle-split-horizontal"
                onClick={() => {
                  if (soundEnabled) playCyberSound('click');
                  onToggleSplit('horizontal');
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                  isSplitView && splitOrientation === 'horizontal'
                    ? 'bg-accent-muted border-accent text-accent shadow-sm'
                    : 'bg-surface-sunken border-cyber-border text-cyber-muted hover:text-accent hover:border-accent'
                }`}
                title={isSplitView ? "Close Split View" : "Split Workspace Horizontally"}
                aria-label="Split Workspace Horizontally"
              >
                <Columns className="w-3.5 h-3.5 text-accent" />
                <span className="hidden 2xl:inline">{isSplitView && splitOrientation === 'horizontal' ? 'Close Split' : 'Split H'}</span>
              </button>

              <button
                type="button"
                data-testid="toggle-split-vertical"
                onClick={() => {
                  if (soundEnabled) playCyberSound('click');
                  onToggleSplit('vertical');
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                  isSplitView && splitOrientation === 'vertical'
                    ? 'bg-accent-muted border-accent text-accent shadow-sm'
                    : 'bg-surface-sunken border-cyber-border text-cyber-muted hover:text-accent hover:border-accent'
                }`}
                title={isSplitView ? "Close Split View" : "Split Workspace Vertically"}
                aria-label="Split Workspace Vertically"
              >
                <Rows className="w-3.5 h-3.5 text-accent" />
                <span className="hidden 2xl:inline">{isSplitView && splitOrientation === 'vertical' ? 'Close Split' : 'Split V'}</span>
              </button>
            </div>
          )}

          {/* Move tab to other pane if split view is active */}
          {isSplitView && onMoveTabToOtherPane && safeOpenNotes.length > 1 && (
            <button
              type="button"
              data-testid="move-tab-other-pane"
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                onMoveTabToOtherPane(note.id);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-surface-sunken border border-accent text-accent hover:text-primary hover:border-accent text-xs font-semibold transition-colors cursor-pointer"
              title="Move active tab to other pane"
              aria-label="Move tab to other pane"
            >
              <MoveRight className="w-3.5 h-3.5 text-accent" />
              <span className="hidden 2xl:inline">Move Pane</span>
            </button>
          )}

          {/* Global Workspace Dock (Pin across all pages) */}
          <button
            type="button"
            data-testid="pin-to-global-workspace"
            onClick={() => {
              useNotesWorkspaceStore.getState().openNote(note.id);
              useNotesWorkspaceStore.getState().setIsOpen(true);
              useNotesWorkspaceStore.getState().setIsPinned(true);
              if (soundEnabled) playCyberSound('click');
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-accent-muted border border-accent text-accent hover:text-accent hover:bg-accent-muted text-xs font-semibold transition-[box-shadow,background-color,border-color,color] cursor-pointer shadow-sm"
            title="Dock to all pages (Stays open while navigating between pages)"
            aria-label="Dock to all pages"
          >
            <Pin className="w-3.5 h-3.5 text-accent" />
            <span className="hidden xl:inline">Pin to All Pages</span>
          </button>

          {/* Display Mode Toggle: Dock to Side / Floating Modal */}
          {onToggleDisplayMode && (
            <button
              type="button"
              data-testid="toggle-dock-mode"
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                onToggleDisplayMode();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-accent-muted border border-accent text-accent hover:text-accent hover:bg-accent-muted text-xs font-semibold transition-[box-shadow,background-color,border-color,color] cursor-pointer shadow-sm"
              title={displayMode === 'docked' ? "Float in Modal (Alt+M)" : "Dock Side-by-Side in Page (Alt+M)"}
              aria-label={displayMode === 'docked' ? "Float in Modal" : "Dock Side-by-Side in Page"}
            >
              {displayMode === 'docked' ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden xl:inline">Modal</span>
                </>
              ) : (
                <>
                  <PanelRight className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden xl:inline">Dock</span>
                </>
              )}
            </button>
          )}

          {/* Maximize / Restore Focus Mode (Alt+F) */}
          <button
            type="button"
            data-testid="toggle-maximize-button"
            onClick={handleToggleMaximize}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-accent-muted border border-accent text-accent hover:text-accent hover:bg-accent-muted text-xs font-semibold transition-[box-shadow,background-color,border-color,color] cursor-pointer shadow-sm"
            title={effectiveMaximized ? "Restore view (Alt+F)" : "Maximize full-width workspace (Alt+F)"}
            aria-label={effectiveMaximized ? "Restore view" : "Maximize workspace"}
          >
            {effectiveMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-accent" />
                <span className="hidden xl:inline">Restore</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-accent" />
                <span className="hidden xl:inline">Maximize</span>
              </>
            )}
          </button>

          {/* Standalone Pop-Out Window Button */}
          <button
            type="button"
            data-testid="popout-window-button"
            onClick={() => {
              if (soundEnabled) playCyberSound('click');
              if (onPopoutWindow) {
                onPopoutWindow();
              } else {
                const popoutUrl = `${window.location.origin}${window.location.pathname}#/field-manual?note=${note.id}&popout=true`;
                window.open(popoutUrl, `ZeroBoxFieldManual_${note.id}`, 'width=1100,height=850,menubar=no,status=no,toolbar=no');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-sunken border border-cyber-border text-cyber-muted hover:text-accent hover:border-accent text-xs font-semibold transition-colors cursor-pointer"
            title="Pop out note into standalone window"
            aria-label="Open in standalone window"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent" />
            <span className="hidden xl:inline">Pop Out</span>
          </button>

          {onDeleteNote && (
            <button
              type="button"
              onClick={async () => {
                const title = note.titleEn || note.title;
                const ok = await confirmAction({
                  title: `Delete custom note "${title}"?`,
                  body: 'You can restore deleted notes at any time using the restore button in the sidebar.',
                  confirmLabel: 'Delete',
                  tone: 'danger',
                });
                if (ok) {
                  onDeleteNote(note.id, title);
                }
              }}
              className="p-1.5 rounded hover:bg-callout-danger-bg text-cyber-muted hover:text-callout-danger-fg border border-transparent hover:border-callout-danger-border transition-colors cursor-pointer"
              title="Delete custom note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent-muted text-cyber-muted hover:text-primary transition-colors cursor-pointer"
            title="Close viewer (Escape)"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
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
                onViewModeChange={setViewMode}
                fontSize={fontSize}
                isMaximized={effectiveMaximized}
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

  // In docked or popout mode, render directly in container without overlay backdrop
  if (displayMode === 'docked' || displayMode === 'popout') {
    return (
      <div 
        ref={modalRef}
        tabIndex={-1}
        role="region"
        aria-label="Field manual note viewer workspace"
        data-testid="obsidian-note-viewer-docked"
        className="w-full h-full flex flex-col outline-none select-none"
      >
        {innerCardContent}
      </div>
    );
  }

  // Modal mode: render via React Portal into document.body as focused overlay
  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      data-testid="obsidian-note-viewer-modal"
      aria-label={`Field Manual: ${note.titleEn || note.title}`}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        effectiveMaximized ? 'p-0 bg-surface-sunken' : 'p-2 sm:p-4 bg-surface-sunken'
      } backdrop-blur-md animate-fadeIn outline-none`}
    >
      <div 
        className={`w-full ${
          effectiveMaximized
            ? 'max-w-none max-h-none h-full rounded-none'
            : 'w-[96vw] max-w-[1440px] max-h-[95vh] h-[95vh]'
        } flex flex-col outline-none transition-colors duration-200`}
      >
        {innerCardContent}
      </div>
    </div>,
    document.body
  );
};
