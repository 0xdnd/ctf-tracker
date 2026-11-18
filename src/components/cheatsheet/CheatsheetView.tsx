import { isTauriTarget } from '../../utils/runtimeTarget';
import { clearLegacyViewerPrefs } from '../../utils/notesViewerPrefs';
import React, { useState, useMemo, useEffect, useDeferredValue, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Terminal, 
  Search, 
  Star, 
  Plus, 
  BookOpen,
  Upload,
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  CHEATSHEET_CATEGORIES 
} from '../../data/cheatsheetsData';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import {
  CptsNoteEntry,
  CptsTreeNode,
  getCategoryTopicGroups,
  searchCptsNotes,
  getNoteById,
  buildCptsFileTree,
  CptsSortOrder,
  sortNotesByNumber,
  getAllCptsNotes,
  getBacklinksForNote,
  mergeUserNotePools,
} from '../../utils/obsidianManualUtils';
import { ObsidianNoteViewer } from './ObsidianNoteViewer';
import { FieldManualShell } from '../notes/FieldManualShell';
import { NARROW_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { NotesRibbon, type NotesRibbonPanel } from '../notes/NotesRibbon';
import { NotesLeftPanel } from '../notes/NotesLeftPanel';
import { NotesRightPanel } from '../notes/NotesRightPanel';
import { NotesStatusBar } from '../notes/NotesStatusBar';
import { countWords, getNoteOutline } from '../../utils/noteMeta';
import { isFullscreenNotesPath } from '../../utils/fullscreenRoutes';
import { getLastAppRoute } from '../../utils/lastAppRoute';
import { useNoteIndex } from '../../hooks/useNoteIndex';
import { SplitOrientation } from '../../types/workspace';
import { NewCptsNoteModal } from './NewCptsNoteModal';
import { YourDetailsCard } from './YourDetailsCard';
import { PageHeader } from '../common/PageHeader';
import { CyberButton } from '../common/CyberButton';
import { EmptyState } from '../common/EmptyState';
import { confirmAction } from '../../store/useConfirmStore';
import { useToastStore } from '../../store/useToastStore';
import { hasUnsavedNoteEdits } from '../../utils/unsavedNoteEdits';
import type { CptsLanguageMode, CptsDisplayLayout } from './workspace/types';
import { SNIPPET_PAGE_SIZE } from './workspace/constants';
import { FieldManualHeader } from './workspace/FieldManualHeader';
import { QuickIndexTable, NotesLoadMore } from './workspace/QuickIndexTable';
import { NotesCardsGallery } from './workspace/NotesCardsGallery';
import { EmptyWorkspace } from './workspace/EmptyWorkspace';
import { SnippetList } from './workspace/SnippetList';
import { AddSnippetModal } from './workspace/AddSnippetModal';

export type { CptsLanguageMode, CptsDisplayLayout };

interface CheatsheetViewProps {
  defaultMode?: 'tactical' | 'cpts-manual';
}

const CheatsheetViewContent: React.FC<CheatsheetViewProps> = ({ defaultMode }) => {
  const location = useLocation();
  const {
    cheatsheets,
    globalVars,
    addCustomCommand,
    deleteCustomCommand,
    toggleStarCommand,
    soundEnabled,
    customNotes = [],
    deletedNoteIds = [],
    addCustomNote,
    deleteNote,
    restoreDeletedNotes,
    userNotes = [],
    deleteNotes,
    setNotesImportModalOpen,
  } = useCtfStore(
    useShallow((s) => ({
      cheatsheets: s.cheatsheets,
      globalVars: s.globalVars,
      addCustomCommand: s.addCustomCommand,
      deleteCustomCommand: s.deleteCustomCommand,
      toggleStarCommand: s.toggleStarCommand,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      deletedNoteIds: s.deletedNoteIds,
      addCustomNote: s.addCustomNote,
      deleteNote: s.deleteNote,
      restoreDeletedNotes: s.restoreDeletedNotes,
      userNotes: s.userNotes,
      deleteNotes: s.deleteNotes,
      setNotesImportModalOpen: s.setNotesImportModalOpen,
    }))
  );

  // Engaged target's IP wins over the global RHOST (shared precedence helper).
  const effectiveVars = useEffectiveGlobalVars(globalVars);

  const navigate = useNavigate();
  // A full-screen path is always the field manual, whatever the stored view mode says.
  const isFullscreen = isFullscreenNotesPath(location.pathname);
  const isManualRoute = defaultMode === 'cpts-manual' || 
    location.pathname.includes('note') || 
    location.pathname.includes('manual') || 
    location.search.includes('manual') || 
    location.search.includes('cpts');

  const [viewModeState, setViewMode] = useState<'tactical' | 'cpts-manual'>(isManualRoute ? 'cpts-manual' : 'tactical');
  const viewMode: 'tactical' | 'cpts-manual' = isFullscreen ? 'cpts-manual' : viewModeState;
  const [cptsLangMode, setCptsLangMode] = useState<CptsLanguageMode>('en');
  // The modal and maximize viewer modes are gone: drop their stored values once.
  useEffect(() => {
    clearLegacyViewerPrefs();
  }, []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCptsCategory, setSelectedCptsCategory] = useState('ALL');
  const [selectedCptsSubCategory, setSelectedCptsSubCategory] = useState<string>('ALL');
  const [selectedTreePath, setSelectedTreePath] = useState<string | null>(null);
  const [expandedTreeFolders, setExpandedTreeFolders] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('zerobox_obsidian_expanded_folders');
      if (saved) return JSON.parse(saved);
    } catch { /* best effort */ }
    return {
      'folder-00 _Methodology': true,
      'folder-01 Information Gathering': true,
      'folder-01 Information Gathering/01.1 Port Scanning': true,
      'folder-02 Web & Application Enumeration': true,
      'folder-02 Web & Application Enumeration/02.1 Directory & VHost Fuzzing': true,
      'folder-03 Exploitation & Payloads': true,
      'folder-03 Exploitation & Payloads/03.1 Web Attacks': true,
      'folder-04 Linux Privilege Escalation': true,
      'folder-04 Linux Privilege Escalation/04.1 Linux PrivEsc': true,
      'folder-05 Windows & Active Directory': true,
      'folder-05 Windows & Active Directory/05.1 Local PrivEsc': true,
      'folder-05 Windows & Active Directory/05.2 Active Directory': true,
      'folder-05 Windows & Active Directory/05.3 Kerberos Attacks': true,
      'folder-06 Pivoting & Lateral Movement': true,
      'folder-06 Pivoting & Lateral Movement/06.1 Network Pivoting': true,
      'folder-07 Cryptography & Password Cracking': true,
      'folder-08 File Transfers & Exfiltration': true,
      'folder-09 Post-Exploitation & Shells': true,
    };
  });
  const [isNewCptsModalOpen, setIsNewCptsModalOpen] = useState(false);
  const [newNoteInitialDir, setNewNoteInitialDir] = useState<string | undefined>(undefined);
  const [cptsDisplayLayout, setCptsDisplayLayout] = useState<CptsDisplayLayout>('cards');
  const [cptsSortOrder, setCptsSortOrder] = useState<CptsSortOrder>('number');
  const [jumpDropdownOpen, setJumpDropdownOpen] = useState(false);
  const [jumpSearchQuery, setJumpSearchQuery] = useState('');
  const [cptsLimit, setCptsLimit] = useState(30);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-Tab Field Manual Workspace State
  const [openObsidianNotes, setOpenObsidianNotes] = useState<CptsNoteEntry[]>(() => {
    try {
      const params = new URLSearchParams(location.search);
      let noteParam = params.get('note');
      if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        noteParam = hashParams.get('note');
      }
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return [found];
      }
      const saved = localStorage.getItem('zerobox_obsidian_open_tabs');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const notes = ids.map((id) => getNoteById(id)).filter((n): n is CptsNoteEntry => Boolean(n));
        if (notes.length > 0) return notes;
      }
    } catch { /* best effort */ }
    const all = getAllCptsNotes();
    if (all.length > 0 && isManualRoute) return [all[0]];
    return [];
  });
  const [activeObsidianNoteId, setActiveObsidianNoteId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(location.search);
      let noteParam = params.get('note');
      if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        noteParam = hashParams.get('note');
      }
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return found.id;
      }
      const saved = localStorage.getItem('zerobox_obsidian_active_tab');
      if (saved) return saved;
    } catch { /* best effort */ }
    const all = getAllCptsNotes();
    return isManualRoute && all.length > 0 ? all[0].id : null;
  });

  // Check if current view is a detached standalone pop-out window
  const isPopout = useMemo(() => {
    return new URLSearchParams(location.search).get('popout') === 'true';
  }, [location.search]);

  // Obsidian Field Manual Workspace Sidebar & Navigation State
  const [isObsidianSidebarOpen, setIsObsidianSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zerobox_obsidian_sidebar_open');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Right sidebar (backlinks and outline): open state persists like the left one.
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_notes_right_panel_open') !== 'false';
    } catch {
      return true;
    }
  });
  const setRightPanelOpenPersisted = useCallback((open: boolean) => {
    setIsRightPanelOpen(open);
    try {
      localStorage.setItem('zerobox_notes_right_panel_open', String(open));
    } catch { /* best effort */ }
  }, []);
  // Under 768 px both sidebars are drawers: transient state, never persisted.
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  useEffect(() => {
    if (!isNarrow) {
      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isNarrow]);
  const closeDrawers = useCallback(() => {
    setLeftDrawerOpen(false);
    setRightDrawerOpen(false);
  }, []);
  const handleToggleRightPanel = useCallback(() => {
    if (isNarrow) {
      setRightDrawerOpen((prev) => !prev);
      setLeftDrawerOpen(false);
      return;
    }
    setIsRightPanelOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_notes_right_panel_open', String(next));
      } catch { /* best effort */ }
      return next;
    });
  }, [isNarrow]);
  // Outline click: addressed to the active pane's viewer, which acts once per larger nonce.
  const [headingRequest, setHeadingRequest] = useState<{ paneId: string; slug: string; nonce: number } | null>(null);

  const handleToggleObsidianSidebar = useCallback(() => {
    if (isNarrow) {
      setLeftDrawerOpen((prev) => !prev);
      setRightDrawerOpen(false);
      if (soundEnabled) playCyberSound('click');
      return;
    }
    setIsObsidianSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_obsidian_sidebar_open', String(next));
      } catch { /* best effort */ }
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled, isNarrow]);

  useEffect(() => {
    if (viewMode !== 'cpts-manual') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey) && (e.key === 'b' || e.key === 'B')) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleToggleObsidianSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleToggleObsidianSidebar]);

  const [obsidianNavView, setObsidianNavView] = useState<'files' | 'cards' | 'index'>('files');
  const [leftView, setLeftView] = useState<NotesRibbonPanel>('files');

  // Ribbon wiring: the ribbon picks the left panel view; the center view is separate.
  const [searchFocusTick, setSearchFocusTick] = useState(0);
  const setObsidianSidebarOpenPersisted = useCallback((open: boolean) => {
    setIsObsidianSidebarOpen(open);
    try {
      localStorage.setItem('zerobox_obsidian_sidebar_open', String(open));
    } catch { /* best effort */ }
  }, []);
  const leftOpenNow = isNarrow ? leftDrawerOpen : isObsidianSidebarOpen;
  const ribbonActivePanel: NotesRibbonPanel | null = leftOpenNow ? leftView : null;
  const handleRibbonSelectPanel = useCallback(
    (p: NotesRibbonPanel) => {
      if (p === ribbonActivePanel) {
        if (isNarrow) setLeftDrawerOpen(false);
        else setObsidianSidebarOpenPersisted(false);
        return;
      }
      setLeftView(p);
      // Never leave the user stuck on Cards or Table after picking a panel.
      setObsidianNavView('files');
      if (isNarrow) {
        setLeftDrawerOpen(true);
        setRightDrawerOpen(false);
      } else {
        setObsidianSidebarOpenPersisted(true);
      }
      if (p === 'search') setSearchFocusTick((n) => n + 1);
    },
    [ribbonActivePanel, isNarrow, setObsidianSidebarOpenPersisted],
  );
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const noteIndex = useNoteIndex();
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const deferredTreeQuery = useDeferredValue(treeSearchQuery);

  // Active Notes Pool: only the user's own notes (authored + imported), minus deleted ones
  const allActiveNotes = useMemo(() => {
    const deletedSet = new Set(deletedNoteIds);
    return mergeUserNotePools(customNotes, userNotes).filter((n) => !deletedSet.has(n.id));
  }, [deletedNoteIds, customNotes, userNotes]);
  // Restore only clears tombstones, so it can bring back only deleted notes this tab still holds.
  const restorableCount = useMemo(() => {
    if (deletedNoteIds.length === 0) return 0;
    const held = new Set([...customNotes, ...userNotes].map((n) => n.id));
    return deletedNoteIds.filter((id) => held.has(id)).length;
  }, [deletedNoteIds, customNotes, userNotes]);

  const activeObsidianNote = useMemo(() => {
    if (!activeObsidianNoteId) return null;
    return openObsidianNotes.find((n) => n.id === activeObsidianNoteId) || openObsidianNotes[0] || null;
  }, [openObsidianNotes, activeObsidianNoteId]);

  const handleOpenObsidianNote = useCallback((note: CptsNoteEntry) => {
    setOpenObsidianNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      if (!exists) {
        return [...prev, note];
      }
      return prev;
    });
    setActiveObsidianNoteId(note.id);
  }, []);

  const handleSelectObsidianTab = useCallback((noteId: string) => {
    setActiveObsidianNoteId(noteId);
  }, []);

  const handleCloseObsidianTab = useCallback((noteId: string) => {
    setOpenObsidianNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId);
      if (idx === -1) return prev;
      const nextNotes = prev.filter((n) => n.id !== noteId);
      setActiveObsidianNoteId((currentActive) => {
        if (currentActive === noteId) {
          if (nextNotes.length === 0) return null;
          const nextActive = nextNotes[Math.min(Math.max(0, idx), nextNotes.length - 1)];
          return nextActive ? nextActive.id : null;
        }
        return currentActive;
      });
      return nextNotes;
    });
  }, []);

  const handleCloseAllObsidianTabs = useCallback(() => {
    setOpenObsidianNotes([]);
    setActiveObsidianNoteId(null);
  }, []);

  // Search text at the moment a result row was opened, per note id. Clearing the
  // search box later leaves an existing highlight alone.
  const [highlightByNote, setHighlightByNote] = useState<Record<string, string>>({});

  const openFromResults = useCallback((note: CptsNoteEntry, query: string = deferredSearchQuery) => {
    const q = query.trim();
    setHighlightByNote((prev) => {
      if (q) return prev[note.id] === q ? prev : { ...prev, [note.id]: q };
      if (!(note.id in prev)) return prev;
      const rest = { ...prev };
      delete rest[note.id];
      return rest;
    });
    handleOpenObsidianNote(note);
  }, [deferredSearchQuery, handleOpenObsidianNote]);

  // Backward compatibility alias: sets active note or opens as tab
  const setActiveObsidianNote = useCallback((note: CptsNoteEntry | null) => {
    if (note) {
      handleOpenObsidianNote(note);
    } else {
      handleCloseAllObsidianTabs();
    }
  }, [handleOpenObsidianNote, handleCloseAllObsidianTabs]);

  // Persist open tabs and active tab to localStorage for seamless session resume
  useEffect(() => {
    try {
      localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(openObsidianNotes.map((n) => n.id)));
      if (activeObsidianNoteId) {
        localStorage.setItem('zerobox_obsidian_active_tab', activeObsidianNoteId);
      } else {
        localStorage.removeItem('zerobox_obsidian_active_tab');
      }
    } catch { /* best effort */ }
  }, [openObsidianNotes, activeObsidianNoteId]);

  // Synchronize active cheatsheet note to the persistent sidecar Notes workspace (staying closed unless already open)
  useEffect(() => {
    if (activeObsidianNoteId) {
      useNotesWorkspaceStore.getState().openNote(activeObsidianNoteId, { stayClosed: true });
    }
  }, [activeObsidianNoteId]);

  const exitingFromPathRef = useRef<string | null>(null);
  const renderWindowPath = typeof window !== 'undefined' ? window.location.pathname : null;

  // Sync viewMode and activeObsidianNote when route or search query changes
  useEffect(() => {
    if (exitingFromPathRef.current !== null) {
      if (exitingFromPathRef.current === location.pathname) return;
      exitingFromPathRef.current = null;
    }
    if (renderWindowPath !== null && typeof window !== 'undefined' && window.location.pathname !== renderWindowPath) {
      return;
    }
    const params = new URLSearchParams(location.search);
    const isManualParam = location.pathname.includes('note') || 
      location.pathname.includes('manual') || 
      location.search.includes('manual') || 
      location.search.includes('cpts') ||
      (typeof window !== 'undefined' && (window.location.hash.includes('manual') || window.location.hash.includes('cpts')));

    // Legacy routes that reach the field manual under full chrome move to the full-screen route.
    // The query (including ?note=) is kept; the remounted view opens the note and strips the param.
    if (!isFullscreen && /^\/cheatsheets?\/?$/i.test(location.pathname) && (params.has('note') || isManualParam)) {
      navigate({ pathname: '/field-manual', search: location.search, hash: location.hash }, { replace: true });
      return;
    }

    if (isFullscreen || isManualParam) {
      setViewMode('cpts-manual');
    } else if (defaultMode) {
      setViewMode(defaultMode);
    } else if (location.pathname.startsWith('/cheatsheets') || location.pathname === '/cheatsheet') {
      setViewMode('tactical');
    }

    // Check for direct note opening via query parameter, e.g. ?note=cpts-... (supporting both search & hash)
    let noteParam = params.get('note');
    let noteFromHash = false;
    if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      noteParam = hashParams.get('note');
      noteFromHash = Boolean(noteParam);
    }
    if (noteParam) {
      const found = getNoteById(noteParam, allActiveNotes.length > 0 ? allActiveNotes : undefined) || getNoteById(noteParam);
      if (found) {
        setActiveObsidianNote(found);
        setViewMode('cpts-manual');
        setObsidianNavView('files');
        // One-shot: drop `note` so later edits don't re-open it and the same link can be used again.
        if (noteFromHash) {
          const [hashPath, hashQuery = ''] = window.location.hash.split('?');
          const hashParams = new URLSearchParams(hashQuery);
          hashParams.delete('note');
          const restHash = hashParams.toString();
          window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hashPath}${restHash ? `?${restHash}` : ''}`);
        } else {
          params.delete('note');
          const rest = params.toString();
          navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '', hash: location.hash }, { replace: true });
        }
      }
    }

    const catParam = params.get('category') || params.get('cat') || params.get('tab');
    if (catParam === 'revshell') {
      // The generator moved to its own section; old deep links land there.
      navigate('/reverse-shell', { replace: true });
      return;
    }
    if (catParam && !isFullscreen) {
      setSelectedCategory(catParam);
      setViewMode('tactical');
    }
  // location.hash is only forwarded on redirect; re-running on hash changes would re-apply deep links.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMode, isFullscreen, location.pathname, location.search, allActiveNotes, setActiveObsidianNote, navigate]);

  // /notes?new=1 (from the dock's empty state) opens the new-note modal once, then drops the param.
  useEffect(() => {
    if (exitingFromPathRef.current !== null) {
      if (exitingFromPathRef.current === location.pathname) return;
      exitingFromPathRef.current = null;
    }
    if (renderWindowPath !== null && typeof window !== 'undefined' && window.location.pathname !== renderWindowPath) {
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('new') !== '1') return;
    setNewNoteInitialDir(undefined);
    setIsNewCptsModalOpen(true);
    params.delete('new');
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate, renderWindowPath]);

  // New Custom Command Form Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('linux-privesc');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newTags, setNewTags] = useState('');

  const handleCopy = (text: string, id: string) => {
    void safeCopyToClipboard(text);
    setCopiedId(id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };


  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTemplate.trim()) return;

    addCustomCommand({
      title: newTitle.trim(),
      category: newCategory,
      description: newDesc.trim(),
      commandTemplate: newTemplate.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    if (soundEnabled) playCyberSound('root');
    setIsNewModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewTemplate('');
    setNewTags('');
  };

  // Filter cheatsheet commands
  const [visibleCommandCount, setVisibleCommandCount] = useState(SNIPPET_PAGE_SIZE);
  useEffect(() => {
    setVisibleCommandCount(SNIPPET_PAGE_SIZE);
  }, [deferredSearchQuery, selectedCategory]);
  const filteredCommands = useMemo(() => {
    return cheatsheets.filter((cmd) => {
      if (selectedCategory === 'starred') {
        if (!cmd.isStarred) return false;
      } else if (selectedCategory === 'custom') {
        if (!cmd.isCustom) return false;
      } else if (selectedCategory !== 'all') {
        if (cmd.category !== selectedCategory) return false;
      }

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchTitle = cmd.title.toLowerCase().includes(q);
        const matchDesc = cmd.description.toLowerCase().includes(q);
        const matchCmd = cmd.commandTemplate.toLowerCase().includes(q);
        const matchTag = cmd.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCmd && !matchTag) return false;
      }

      return true;
    });
  }, [cheatsheets, selectedCategory, deferredSearchQuery]);

  // Hierarchical Directory Tree & Categories computed from active notes
  const tagFilteredNotes = useMemo(() => {
    if (!activeTag) return allActiveNotes;
    // A tag matches its own notes plus those of any nested child (a includes a/b).
    const ids = new Set<string>();
    for (const [key, noteIds] of noteIndex.tags) {
      if (key === activeTag || key.startsWith(`${activeTag}/`)) noteIds.forEach((id) => ids.add(id));
    }
    return allActiveNotes.filter((n) => ids.has(n.id));
  }, [allActiveNotes, activeTag, noteIndex]);

  // The Search panel looks at every note, ignoring the tag filter.
  const searchResults = useMemo(() => {
    if (!deferredTreeQuery.trim()) return [];
    const q = deferredTreeQuery.toLowerCase().trim();
    // Body text is only searched from 2 characters up; titles and tags match from 1.
    const searchBody = q.length >= 2;
    return allActiveNotes.filter((n) => {
      return (
        n.title.toLowerCase().includes(q) ||
        (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
        (n.titleHe && n.titleHe.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q) ||
        (n.subCategory && n.subCategory.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) ||
        (searchBody && n.rawMarkdown && n.rawMarkdown.toLowerCase().includes(q))
      );
    });
  }, [allActiveNotes, deferredTreeQuery]);

  const handleSelectTag = useCallback((tag: string | null) => {
    setActiveTag(tag);
    if (tag) {
      setObsidianNavView('files');
      setLeftView('files');
    }
  }, []);

  const cptsFileTree = useMemo(() => buildCptsFileTree(tagFilteredNotes), [tagFilteredNotes]);

  // Persist expanded tree folders
  useEffect(() => {
    try {
      localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(expandedTreeFolders));
    } catch { /* best effort */ }
  }, [expandedTreeFolders]);

  // List of all existing folder paths for new note modal
  const existingDirectories = useMemo(() => {
    const set = new Set<string>();
    for (const n of allActiveNotes) {
      if (n.relPath && n.relPath.includes('/')) {
        const parts = n.relPath.split('/');
        set.add(parts.slice(0, -1).join('/'));
      }
    }
    return Array.from(set).sort();
  }, [allActiveNotes]);

  // Multi-Pane Split Workspace State
  const [isSplitView, setIsSplitView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_workspace_is_split_v1') === 'true';
    } catch {
      return false;
    }
  });

  const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>(() => {
    try {
      const saved = localStorage.getItem('zerobox_workspace_split_orient_v1');
      return saved === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [secondaryOpenNotes, setSecondaryOpenNotes] = useState<CptsNoteEntry[]>(() => {
    try {
      const saved = localStorage.getItem('zerobox_workspace_secondary_tabs_v1');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const resolved = ids.map((id) => getNoteById(id)).filter(Boolean) as CptsNoteEntry[];
        if (resolved.length > 0) return resolved;
      }
    } catch { /* best effort */ }
    return [];
  });

  const [secondaryActiveNoteId, setSecondaryActiveNoteId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zerobox_workspace_secondary_active_v1') || null;
    } catch {
      return null;
    }
  });

  const [activePaneId, setActivePaneId] = useState<'pane-primary' | 'pane-secondary'>('pane-primary');

  useEffect(() => {
    try {
      localStorage.setItem('zerobox_workspace_is_split_v1', isSplitView ? 'true' : 'false');
      localStorage.setItem('zerobox_workspace_split_orient_v1', splitOrientation);
      localStorage.setItem('zerobox_workspace_secondary_tabs_v1', JSON.stringify(secondaryOpenNotes.map((n) => n.id)));
      if (secondaryActiveNoteId) {
        localStorage.setItem('zerobox_workspace_secondary_active_v1', secondaryActiveNoteId);
      } else {
        localStorage.removeItem('zerobox_workspace_secondary_active_v1');
      }
    } catch { /* best effort */ }
  }, [isSplitView, splitOrientation, secondaryOpenNotes, secondaryActiveNoteId]);

  const secondaryActiveNote = useMemo(() => {
    if (!secondaryActiveNoteId) return secondaryOpenNotes[0] || null;
    return secondaryOpenNotes.find((n) => n.id === secondaryActiveNoteId) || secondaryOpenNotes[0] || null;
  }, [secondaryOpenNotes, secondaryActiveNoteId]);

  // The right panel and status bar follow the active pane. Tab entries are snapshots taken at open
  // time, so the live copy comes from the shared index.
  const activePanelPaneId: 'pane-primary' | 'pane-secondary' =
    isSplitView && activePaneId === 'pane-secondary' && secondaryActiveNote ? 'pane-secondary' : 'pane-primary';
  const activePanelSnapshot = activePanelPaneId === 'pane-secondary' ? secondaryActiveNote : activeObsidianNote;
  const liveActiveNote = activePanelSnapshot ? (noteIndex.byId.get(activePanelSnapshot.id) ?? activePanelSnapshot) : null;
  const panelBacklinks = useMemo(
    () => (liveActiveNote ? getBacklinksForNote(liveActiveNote.id, noteIndex) : []),
    [liveActiveNote, noteIndex],
  );
  const panelOutline = useMemo(
    () => (liveActiveNote ? getNoteOutline(liveActiveNote.rawMarkdown ?? '', liveActiveNote) : []),
    [liveActiveNote],
  );

  const handleSelectSecondaryTab = useCallback((noteId: string) => {
    setSecondaryActiveNoteId(noteId);
  }, []);

  const handleOpenSecondaryNote = useCallback((note: CptsNoteEntry) => {
    setSecondaryOpenNotes((prev) => {
      if (!prev.some((n) => n.id === note.id)) {
        return [...prev, note];
      }
      return prev;
    });
    setSecondaryActiveNoteId(note.id);
  }, []);

  const handleCloseSecondaryTab = useCallback((noteId: string) => {
    setSecondaryOpenNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId);
      if (idx === -1) return prev;
      const nextNotes = prev.filter((n) => n.id !== noteId);
      setSecondaryActiveNoteId((current) => {
        if (current === noteId) {
          if (nextNotes.length === 0) return null;
          const nextActive = nextNotes[Math.min(Math.max(0, idx), nextNotes.length - 1)];
          return nextActive ? nextActive.id : null;
        }
        return current;
      });
      return nextNotes;
    });
  }, []);

  // A deleted note's tab closes, wherever it was deleted (this tab, bulk delete, or another tab via the storage
  // sync). A tab whose editor still holds unsaved edits stays open, with a one-time warning, so they are not lost.
  const warnedDeletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const dead = new Set(deletedNoteIds);
    for (const id of warnedDeletedRef.current) if (!dead.has(id)) warnedDeletedRef.current.delete(id);
    if (dead.size === 0) return;
    const closeDead = (notes: CptsNoteEntry[], close: (id: string) => void) => {
      for (const n of notes) {
        if (!dead.has(n.id)) continue;
        if (!hasUnsavedNoteEdits(n.id)) {
          close(n.id);
        } else if (!warnedDeletedRef.current.has(n.id)) {
          warnedDeletedRef.current.add(n.id);
          useToastStore.getState().addToast({
            type: 'warning',
            title: 'Open note was deleted',
            message: 'Its tab stays open with your unsaved edits; copy them before closing it, they cannot be saved.',
          });
        }
      }
    };
    closeDead(openObsidianNotes, handleCloseObsidianTab);
    closeDead(secondaryOpenNotes, handleCloseSecondaryTab);
  }, [deletedNoteIds, openObsidianNotes, secondaryOpenNotes, handleCloseObsidianTab, handleCloseSecondaryTab]);

  const handleCloseSecondaryPane = useCallback(() => {
    setOpenObsidianNotes((prev) => {
      const merged = [...prev];
      for (const sn of secondaryOpenNotes) {
        if (!merged.some((pn) => pn.id === sn.id)) {
          merged.push(sn);
        }
      }
      return merged;
    });
    setSecondaryOpenNotes([]);
    setSecondaryActiveNoteId(null);
    setIsSplitView(false);
  }, [secondaryOpenNotes]);

  const handleToggleSplit = useCallback((orientation?: SplitOrientation) => {
    setIsSplitView((prev) => {
      if (prev) {
        if (!orientation || orientation === splitOrientation) {
          setOpenObsidianNotes((currentPrimary) => {
            const merged = [...currentPrimary];
            for (const sn of secondaryOpenNotes) {
              if (!merged.some((pn) => pn.id === sn.id)) {
                merged.push(sn);
              }
            }
            return merged;
          });
          setSecondaryOpenNotes([]);
          setSecondaryActiveNoteId(null);
          return false;
        }
        setSplitOrientation(orientation);
        return true;
      }

      const nextOrient = orientation || 'horizontal';
      setSplitOrientation(nextOrient);

      if (secondaryOpenNotes.length === 0) {
        if (openObsidianNotes.length > 1) {
          const tabToMove = openObsidianNotes[openObsidianNotes.length - 1];
          setSecondaryOpenNotes([tabToMove]);
          setSecondaryActiveNoteId(tabToMove.id);
          setOpenObsidianNotes((p) => p.filter((t) => t.id !== tabToMove.id));
        } else {
          const alt = allActiveNotes.find((n) => n.id !== activeObsidianNote?.id) || allActiveNotes[0];
          if (alt) {
            setSecondaryOpenNotes([alt]);
            setSecondaryActiveNoteId(alt.id);
          }
        }
      }
      return true;
    });
  }, [splitOrientation, secondaryOpenNotes, openObsidianNotes, allActiveNotes, activeObsidianNote?.id]);

  const handleMoveTabBetweenPanes = useCallback((tabId: string, fromPane: 'pane-primary' | 'pane-secondary') => {
    if (fromPane === 'pane-primary') {
      const noteToMove = openObsidianNotes.find((n) => n.id === tabId);
      if (!noteToMove || openObsidianNotes.length <= 1) return;
      handleCloseObsidianTab(tabId);
      handleOpenSecondaryNote(noteToMove);
      setActivePaneId('pane-secondary');
    } else {
      const noteToMove = secondaryOpenNotes.find((n) => n.id === tabId);
      if (!noteToMove || secondaryOpenNotes.length <= 1) return;
      handleCloseSecondaryTab(tabId);
      handleOpenObsidianNote(noteToMove);
      setActivePaneId('pane-primary');
    }
  }, [openObsidianNotes, secondaryOpenNotes, handleCloseObsidianTab, handleOpenSecondaryNote, handleCloseSecondaryTab, handleOpenObsidianNote]);

  const renderWorkspacePanes = (mode: 'page' | 'popout') => {
    if (!activeObsidianNote) return null;
    // A popout closes its own window; clearing tabs there would also wipe the persisted tab list.
    const handleViewerClose = mode === 'popout' ? () => window.close() : handleCloseAllObsidianTabs;

    if (!isSplitView || !secondaryActiveNote) {
      return (
        <ObsidianNoteViewer
          note={activeObsidianNote}
          openNotes={openObsidianNotes}
          onSelectNote={handleSelectObsidianTab}
          onCloseTab={handleCloseObsidianTab}
          onNewTab={handleOpenObsidianNote}
          onCloseAllTabs={handleCloseAllObsidianTabs}
          allAvailableNotes={allActiveNotes}
          globalVars={effectiveVars}
          soundEnabled={soundEnabled}
          onClose={handleViewerClose}
          onNavigateToNote={(noteId) => {
            const found = getNoteById(noteId, allActiveNotes);
            if (found) handleOpenObsidianNote(found);
          }}
          onDeleteNote={(noteId) => {
            deleteNote(noteId);
            if (soundEnabled) playCyberSound('root');
            handleCloseObsidianTab(noteId);
          }}
          defaultLanguage={cptsLangMode}
          displayMode={mode}
          onLanguageChange={setCptsLangMode}
          onPopoutWindow={() => {
            const popoutUrl = (isTauriTarget() ? `${window.location.origin}${window.location.pathname}#/field-manual?note=${activeObsidianNote.id}&popout=true` : `${window.location.origin}/field-manual?note=${activeObsidianNote.id}&popout=true`);
            window.open(popoutUrl, `ZeroBoxFieldManual_${activeObsidianNote.id}`, 'width=1100,height=850,menubar=no,status=no,toolbar=no');
          }}
          isSplitView={isSplitView}
          splitOrientation={splitOrientation}
          onToggleSplit={handleToggleSplit}
          onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-primary')}
          paneId="pane-primary"
          isPaneActive={activePaneId === 'pane-primary'}
          onFocusPane={() => setActivePaneId('pane-primary')}
          isSidebarOpen={leftOpenNow}
          onToggleSidebar={mode === 'page' ? handleToggleObsidianSidebar : undefined}
          onSwitchToCards={() => setObsidianNavView('cards')}
          onTagClick={handleSelectTag}
          highlightQuery={highlightByNote[activeObsidianNote.id]}
          variant="shell"
          headingRequest={headingRequest?.paneId === 'pane-primary' ? headingRequest : undefined}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={handleToggleRightPanel}
        />
      );
    }

    const splitContent = (
      <div 
        data-testid="dual-split-workspace"
        className={`w-full h-full flex ${splitOrientation === 'horizontal' ? 'flex-col md:flex-row' : 'flex-col'} gap-2 overflow-hidden`}
      >
        <div className={`${splitOrientation === 'horizontal' ? 'w-full md:w-1/2' : 'w-full h-1/2'} min-h-0 flex flex-col`}>
          <ObsidianNoteViewer
            note={activeObsidianNote}
            openNotes={openObsidianNotes}
            onSelectNote={handleSelectObsidianTab}
            onCloseTab={handleCloseObsidianTab}
            onNewTab={handleOpenObsidianNote}
            onCloseAllTabs={handleCloseAllObsidianTabs}
            allAvailableNotes={allActiveNotes}
            globalVars={effectiveVars}
            soundEnabled={soundEnabled}
            onClose={handleViewerClose}
            onNavigateToNote={(noteId) => {
              const found = getNoteById(noteId, allActiveNotes);
              if (found) handleOpenObsidianNote(found);
            }}
            defaultLanguage={cptsLangMode}
            displayMode={mode}
            onLanguageChange={setCptsLangMode}
            isSplitView={true}
            splitOrientation={splitOrientation}
            onToggleSplit={handleToggleSplit}
            onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-primary')}
            paneId="pane-primary"
            isPaneActive={activePaneId === 'pane-primary'}
            onFocusPane={() => setActivePaneId('pane-primary')}
            isSidebarOpen={leftOpenNow}
            onToggleSidebar={mode === 'page' ? handleToggleObsidianSidebar : undefined}
            onSwitchToCards={() => setObsidianNavView('cards')}
            onTagClick={handleSelectTag}
            highlightQuery={highlightByNote[activeObsidianNote.id]}
            variant="shell"
            headingRequest={headingRequest?.paneId === 'pane-primary' ? headingRequest : undefined}
            isRightPanelOpen={isRightPanelOpen}
            onToggleRightPanel={handleToggleRightPanel}
          />
        </div>
        <div className={`${splitOrientation === 'horizontal' ? 'w-full md:w-1/2' : 'w-full h-1/2'} min-h-0 flex flex-col`}>
          <ObsidianNoteViewer
            note={secondaryActiveNote}
            openNotes={secondaryOpenNotes}
            onSelectNote={handleSelectSecondaryTab}
            onCloseTab={handleCloseSecondaryTab}
            onNewTab={handleOpenSecondaryNote}
            onCloseAllTabs={handleCloseSecondaryPane}
            allAvailableNotes={allActiveNotes}
            globalVars={effectiveVars}
            soundEnabled={soundEnabled}
            onClose={handleCloseSecondaryPane}
            onNavigateToNote={(noteId) => {
              const found = getNoteById(noteId, allActiveNotes);
              if (found) handleOpenSecondaryNote(found);
            }}
            defaultLanguage={cptsLangMode}
            displayMode={mode}
            onLanguageChange={setCptsLangMode}
            isSplitView={true}
            splitOrientation={splitOrientation}
            onToggleSplit={handleToggleSplit}
            onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-secondary')}
            paneId="pane-secondary"
            isPaneActive={activePaneId === 'pane-secondary'}
            onFocusPane={() => setActivePaneId('pane-secondary')}
            onTagClick={handleSelectTag}
            highlightQuery={highlightByNote[secondaryActiveNote.id]}
            variant="shell"
            headingRequest={headingRequest?.paneId === 'pane-secondary' ? headingRequest : undefined}
            isRightPanelOpen={isRightPanelOpen}
            onToggleRightPanel={handleToggleRightPanel}
          />
        </div>
      </div>
    );

    return splitContent;
  };

  const filteredCptsNotes = useMemo(() => {
    let pool = searchCptsNotes(deferredSearchQuery, selectedCptsCategory, selectedCptsSubCategory, allActiveNotes);

    if (selectedTreePath) {
      const normalizedSelected = selectedTreePath.replace(/\\/g, '/').toLowerCase();
      pool = pool.filter((n) => {
        const relNorm = (n.relPath || '').replace(/\\/g, '/').toLowerCase();
        const catNorm = (n.category || '').toLowerCase();
        return (
          relNorm === normalizedSelected ||
          relNorm.startsWith(normalizedSelected + '/') ||
          relNorm.includes('/' + normalizedSelected + '/') ||
          catNorm === normalizedSelected ||
          catNorm.startsWith(normalizedSelected)
        );
      });
    }

    if (cptsSortOrder === 'number') {
      return sortNotesByNumber(pool);
    } else if (cptsSortOrder === 'title') {
      return [...pool].sort((a, b) => (a.titleEn || a.title).localeCompare(b.titleEn || b.title));
    }

    return pool;
  }, [deferredSearchQuery, selectedCptsCategory, selectedCptsSubCategory, allActiveNotes, selectedTreePath, cptsSortOrder]);

  const activeCategoryTopicGroups = useMemo(() => {
    return getCategoryTopicGroups(selectedCptsCategory, allActiveNotes);
  }, [selectedCptsCategory, allActiveNotes]);



  const visibleCptsNotes = useMemo(() => {
    return filteredCptsNotes.slice(0, cptsLimit);
  }, [filteredCptsNotes, cptsLimit]);


  // Tree action handlers
  const handleSelectTreeFolder = (fullPath: string) => {
    if (selectedTreePath === fullPath) {
      setSelectedTreePath(null);
    } else {
      setSelectedTreePath(fullPath);
    }
    setSelectedCptsCategory('ALL');
    setSelectedCptsSubCategory('ALL');
    setCptsLimit(30);
    if (soundEnabled) playCyberSound('click');
  };

  const handleToggleTreeFolder = (nodeId: string) => {
    setExpandedTreeFolders((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
    if (soundEnabled) playCyberSound('click');
  };

  const handleExpandAllTreeFolders = () => {
    const all: Record<string, boolean> = {};
    const traverse = (nodes: CptsTreeNode[]) => {
      for (const n of nodes) {
        if (n.isFolder) {
          all[n.id] = true;
          traverse(n.children);
        }
      }
    };
    traverse(cptsFileTree);
    setExpandedTreeFolders(all);
    if (soundEnabled) playCyberSound('click');
  };

  const handleCollapseAllTreeFolders = () => {
    setExpandedTreeFolders({});
    if (soundEnabled) playCyberSound('click');
  };

  const handleDeleteNoteWithConfirm = async (noteId: string, noteTitle?: string) => {
    const title = noteTitle || 'this field note';
    if (await confirmAction({ title: `Delete field note "${title}"?`, body: 'This is permanent and cannot be undone.', tone: 'danger' })) {
      deleteNote(noteId);
      if (soundEnabled) playCyberSound('root');
    }
  };

  // The left panel asks for confirmation before calling this.
  const handleWipeVaultConfirm = () => {
    // Same as the per-note delete, for every note the button counts: tombstoned, not a whole-vault wipe.
    deleteNotes(allActiveNotes.map((n) => n.id));
    if (soundEnabled) playCyberSound('root');
    // Full-screen: stay in the shell and show its empty state.
    if (!isFullscreen) setViewMode('tactical');
  };

  const handleRestoreDeletedNotes = async () => {
    if (await confirmAction({ title: `Restore all ${restorableCount} deleted field notes?`, body: 'They will be moved back into your active manual.', tone: 'default' })) {
      restoreDeletedNotes();
      if (soundEnabled) playCyberSound('flag');
    }
  };

  const handleSaveCustomNote = (newNote: Partial<CptsNoteEntry> & { title: string }) => {
    addCustomNote(newNote);
    if (soundEnabled) playCyberSound('root');
  };


  // Standalone detached pop-out window view (e.g. secondary monitor or external browser window)
  if (isPopout && activeObsidianNote) {
    return (
      <div 
        data-testid="standalone-popout-window"
        className="fixed inset-0 w-full h-full min-h-screen bg-surface-sunken z-[99999] overflow-hidden flex flex-col"
      >
        {renderWorkspacePanes('popout')}
      </div>
    );
  }

  // Obsidian Field Manual Master Workspace Renderer
  const hasNotes = allActiveNotes.length > 0;
  const renderNotesLeft = () => (
    <NotesLeftPanel
      view={leftView}
      onCollapse={handleToggleObsidianSidebar}
      focusSignal={searchFocusTick}
      tree={cptsFileTree}
      expandedFolders={expandedTreeFolders}
      onToggleFolder={handleToggleTreeFolder}
      selectedPath={selectedTreePath}
      onSelectFolder={handleSelectTreeFolder}
      onSelectNote={(note) => {
        if (soundEnabled) playCyberSound('click');
        openFromResults(note, '');
        setObsidianNavView('files');
        if (isNarrow) closeDrawers();
      }}
      onDeleteNote={handleDeleteNoteWithConfirm}
      onAddNoteToFolder={(folderPath) => {
        setNewNoteInitialDir(folderPath);
        setIsNewCptsModalOpen(true);
        if (soundEnabled) playCyberSound('click');
      }}
      langMode={cptsLangMode}
      activeNoteId={activeObsidianNote?.id}
      onExpandAll={handleExpandAllTreeFolders}
      onCollapseAll={handleCollapseAllTreeFolders}
      onNewNote={() => {
        setNewNoteInitialDir(undefined);
        setIsNewCptsModalOpen(true);
        if (soundEnabled) playCyberSound('click');
      }}
      onImport={() => {
        if (soundEnabled) playCyberSound('click');
        setNotesImportModalOpen(true);
      }}
      activeTag={activeTag}
      onClearTag={() => setActiveTag(null)}
      query={treeSearchQuery}
      onQueryChange={setTreeSearchQuery}
      results={searchResults}
      resultsPending={deferredTreeQuery !== treeSearchQuery}
      onOpenResult={(note) => {
        if (soundEnabled) playCyberSound('click');
        openFromResults(note, treeSearchQuery);
        setObsidianNavView('files');
        if (isNarrow) closeDrawers();
      }}
      tags={noteIndex.tags}
      onSelectTag={handleSelectTag}
      deletedCount={restorableCount}
      onRestoreDeleted={handleRestoreDeletedNotes}
      wipeCount={allActiveNotes.length}
      onWipeVault={handleWipeVaultConfirm}
      onShowCards={() => {
        setObsidianNavView('cards');
        setCptsDisplayLayout('cards');
      }}
      onShowTable={() => {
        setObsidianNavView('index');
        setCptsDisplayLayout('quick-index');
      }}
      onBackToSnippets={() => {
        setViewMode('tactical');
        setSearchQuery('');
        navigate('/cheatsheets');
      }}
    />
  );

  const renderNotesMain = () => {
    return (
        /* Main Workspace Area (Obsidian Centerpiece) */
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-surface-card">
          {obsidianNavView === 'files' ? (
            activeObsidianNote ? (
              /* ACTIVE NOTE IN OBSIDIAN WORKSPACE (FULL WIDTH) */
              <div 
                data-testid="docked-note-viewer-pane"
                className="w-full h-full min-h-[600px] flex-1 flex flex-col min-w-0 overflow-hidden"
              >
                {renderWorkspacePanes('page')}
              </div>
            ) : (
              /* EMPTY OBSIDIAN WORKSPACE (NO ACTIVE NOTE) */
              <EmptyWorkspace
                allActiveNotes={allActiveNotes}
                soundEnabled={soundEnabled}
                setActiveObsidianNote={setActiveObsidianNote}
                setObsidianNavView={setObsidianNavView}
                setCptsDisplayLayout={setCptsDisplayLayout}
                leftOpenNow={leftOpenNow}
                handleToggleObsidianSidebar={handleToggleObsidianSidebar}
              />
            )
          ) : (
            /* CARDS GALLERY / QUICK INDEX TABLE (FULL WIDTH) */
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto lg:h-full max-h-[calc(100vh-10rem)]">
              {/* HUD Header Bar */}
              <FieldManualHeader
                handleToggleObsidianSidebar={handleToggleObsidianSidebar}
                leftOpenNow={leftOpenNow}
                selectedCptsCategory={selectedCptsCategory}
                selectedCptsSubCategory={selectedCptsSubCategory}
                setSelectedCptsSubCategory={setSelectedCptsSubCategory}
                allActiveNotes={allActiveNotes}
                filteredCptsNotes={filteredCptsNotes}
                jumpDropdownOpen={jumpDropdownOpen}
                setJumpDropdownOpen={setJumpDropdownOpen}
                jumpSearchQuery={jumpSearchQuery}
                setJumpSearchQuery={setJumpSearchQuery}
                setActiveObsidianNote={setActiveObsidianNote}
                obsidianNavView={obsidianNavView}
                setObsidianNavView={setObsidianNavView}
                soundEnabled={soundEnabled}
                cptsSortOrder={cptsSortOrder}
                setCptsSortOrder={setCptsSortOrder}
                setCptsLimit={setCptsLimit}
                setCptsDisplayLayout={setCptsDisplayLayout}
                selectedTreePath={selectedTreePath}
                setSelectedTreePath={setSelectedTreePath}
                activeCategoryTopicGroups={activeCategoryTopicGroups}
              />

              {/* VIEW 1: QUICK INDEX TABLE */}
              {(obsidianNavView === 'index' || cptsDisplayLayout === 'quick-index') ? (
                <QuickIndexTable
                visibleCptsNotes={visibleCptsNotes}
                openFromResults={openFromResults}
                setObsidianNavView={setObsidianNavView}
                isNarrow={isNarrow}
                closeDrawers={closeDrawers}
                deferredSearchQuery={deferredSearchQuery}
                />
              ) : (
                /* VIEW 2: FULL-WIDTH CARDS GALLERY */
                <NotesCardsGallery
                visibleCptsNotes={visibleCptsNotes}
                openFromResults={openFromResults}
                setObsidianNavView={setObsidianNavView}
                isNarrow={isNarrow}
                closeDrawers={closeDrawers}
                deferredSearchQuery={deferredSearchQuery}
                />
              )}

              {/* Sliced Pagination Controls */}
              <NotesLoadMore
                visibleCount={visibleCptsNotes.length}
                totalCount={filteredCptsNotes.length}
                setCptsLimit={setCptsLimit}
              />
            </div>
          )}
        </div>
    );
  };

  const switchBase =
    'inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11';
  const catBase =
    'flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-left text-[13px] transition-colors select-none cursor-pointer lg:min-h-8 lg:w-full';
  const catOn = 'border-accent bg-accent-muted font-medium text-primary lg:border-transparent lg:bg-surface-hover';
  const catOff = 'border-subtle text-secondary hover:bg-surface-hover hover:text-primary lg:border-transparent';

  return (
    <div className={`w-full ${viewMode === 'cpts-manual' ? 'h-full' : 'space-y-6 pb-12'} text-sm`}>
      {viewMode === 'cpts-manual' ? (
        <FieldManualShell
          resizeStorageKey="zerobox.notes.leftWidth.page"
          ribbon={
            <NotesRibbon
              activePanel={hasNotes ? ribbonActivePanel : null}
              onSelectPanel={handleRibbonSelectPanel}
              onOpenSwitcher={() => useNotesWorkspaceStore.getState().openNoteSwitcher()}
              onBack={() => {
                exitingFromPathRef.current = location.pathname;
                navigate(getLastAppRoute() ?? '/tracker');
              }}
            />
          }
          left={hasNotes ? renderNotesLeft() : null}
          right={
            hasNotes ? (
              <NotesRightPanel
                note={liveActiveNote}
                backlinks={panelBacklinks}
                outline={panelOutline}
                onOpenNote={(id) => {
                  const found = noteIndex.byId.get(id);
                  if (!found) return;
                  if (activePanelPaneId === 'pane-secondary') handleOpenSecondaryNote(found);
                  else handleOpenObsidianNote(found);
                  if (isNarrow) closeDrawers();
                }}
                onSelectHeading={(slug) => {
                  setHeadingRequest((prev) => ({ paneId: activePanelPaneId, slug, nonce: Math.max(Date.now(), (prev?.nonce ?? 0) + 1) }));
                  if (isNarrow) closeDrawers();
                }}
                onCollapse={() => (isNarrow ? setRightDrawerOpen(false) : setRightPanelOpenPersisted(false))}
              />
            ) : null
          }
          statusBar={
            hasNotes && liveActiveNote ? (
              <NotesStatusBar
                wordCount={countWords(liveActiveNote.rawMarkdown ?? '')}
                backlinkCount={panelBacklinks.length}
              />
            ) : null
          }
          isLeftOpen={hasNotes && leftOpenNow}
          isRightOpen={hasNotes && (isNarrow ? rightDrawerOpen : isRightPanelOpen)}
          isNarrow={isNarrow}
          onCloseDrawers={closeDrawers}
        >
          {hasNotes ? (
            renderNotesMain()
          ) : (
            <div data-testid="notes-empty-state" className="flex h-full items-center justify-center overflow-y-auto p-6">
              <div className="w-full max-w-xl rounded-md border border-subtle bg-surface-card">
                <EmptyState
                  icon={BookOpen}
                  title="No notes yet"
                  description="It shows your own Markdown notes, for example an Obsidian vault. You need to import them first."
                  action={{
                    label: 'Import your notes',
                    icon: Upload,
                    tourAnchor: 'notes-page-import',
                    onClick: () => {
                      if (soundEnabled) playCyberSound('click');
                      setNotesImportModalOpen(true);
                    },
                  }}
                  secondaryAction={{
                    label: 'New note',
                    onClick: () => {
                      setNewNoteInitialDir(undefined);
                      setIsNewCptsModalOpen(true);
                    },
                  }}
                />
                {restorableCount > 0 && (
                  <div className="flex justify-center pb-6">
                    <button
                      type="button"
                      onClick={handleRestoreDeletedNotes}
                      className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-callout-warn-fg hover:bg-callout-warn-bg"
                    >
                      Restore {restorableCount} deleted {restorableCount === 1 ? 'note' : 'notes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </FieldManualShell>
      ) : (
        <>
          <PageHeader
            title="Snippets"
            icon={<Terminal />}
            description="Ready-made commands for common hacking jobs, with your own details filled in."
            primaryAction={
              <CyberButton
                variant="primary"
                size="md"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setIsNewModalOpen(true)}
                data-tour="snippets-add"
                className="[@media(pointer:coarse)]:h-11"
              >
                Add snippet
              </CyberButton>
            }
            overflow={[
              {
                id: 'import-vault',
                label: 'Import vault',
                icon: <Upload className="h-4 w-4" />,
                onSelect: () => {
                  if (soundEnabled) playCyberSound('click');
                  setNotesImportModalOpen(true);
                },
              },
            ]}
          >
            <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0 max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)] max-sm:pr-14">
              <div className="flex min-w-max items-center gap-3 sm:min-w-0 sm:flex-wrap">
                <div
                  role="group"
                  data-tour="snippets-library"
                  aria-label="Library"
                  className="inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-sunken p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={true}
                    className={`${switchBase} bg-surface-card text-primary`}
                  >
                    <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Snippets</span>
                    <span className="tabular-nums text-muted">{cheatsheets.length}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={false}
                    onClick={() => {
                      setViewMode('cpts-manual');
                      navigate('/field-manual');
                    }}
                    title="Switch to your notes"
                    className={`${switchBase} text-muted hover:text-primary`}
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Notes</span>
                  </button>
                </div>
              </div>
            </div>
          </PageHeader>

          {/* LHOST / LPORT / target, shared with the Reverse shells page */}
          <YourDetailsCard tourAnchor="snippets-params" />

          {/* Main workspace: categories + commands panel */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">

            {/* Left column: categories */}
            <div className="space-y-1">
              <div className="items-center justify-between px-2 py-1 text-xs font-medium text-muted select-none hidden lg:flex">
                <span>Categories</span>
                <span className="tabular-nums">{cheatsheets.length}</span>
              </div>

              <div className="-mx-4 flex gap-1.5 overflow-x-auto no-scrollbar px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 max-lg:[mask-image:linear-gradient(to_right,black_85%,transparent)] max-lg:pr-14 lg:[mask-image:none]">
                {CHEATSHEET_CATEGORIES.filter((cat) => cat.id !== 'revshell').map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      aria-pressed={isSelected}
                      className={`${catBase} ${isSelected ? catOn : catOff}`}
                    >
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}

                <div className="flex flex-shrink-0 lg:mt-1 lg:border-t lg:border-subtle lg:pt-2">
                  <button
                    onClick={() => setSelectedCategory('starred')}
                    aria-pressed={selectedCategory === 'starred'}
                    className={`${catBase} ${selectedCategory === 'starred' ? catOn : catOff}`}
                  >
                    <Star className="h-3.5 w-3.5 text-callout-warn-fg" aria-hidden="true" />
                    <span>Starred Snippets</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: commands panel */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* SEARCH */}
              <div className="flex items-center gap-3">
                <div data-tour="snippets-search" className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    id="cheatsheet-search-input"
                    name="cheatsheet-search"
                    aria-label="Search cheatsheets and notes"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Search commands, flags, tools (e.g. nmap, ffuf, bloodhound, impacket)..."
                    className="h-11 w-full rounded-lg border border-subtle bg-surface-card pl-9 pr-9 text-sm text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-9"
                  />
                  {searchQuery && (
                    <button aria-label="Clear search"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center text-xs text-muted hover:text-primary"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* COMMAND SNIPPETS LIST with Scroll Entrance */}
              <SnippetList
                filteredCommands={filteredCommands}
                visibleCommandCount={visibleCommandCount}
                setVisibleCommandCount={setVisibleCommandCount}
                effectiveVars={effectiveVars}
                copiedId={copiedId}
                toggleStarCommand={toggleStarCommand}
                deleteCustomCommand={deleteCustomCommand}
                handleCopy={handleCopy}
              />
            </div>
          </div>
        </>
      )}

      {/* New Custom Command Modal */}
      <AddSnippetModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateCustom}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newDesc={newDesc}
        setNewDesc={setNewDesc}
        newTemplate={newTemplate}
        setNewTemplate={setNewTemplate}
        newTags={newTags}
        setNewTags={setNewTags}
      />

      {/* New note modal */}
      <NewCptsNoteModal
        isOpen={isNewCptsModalOpen}
        onClose={() => {
          setIsNewCptsModalOpen(false);
          setNewNoteInitialDir(undefined);
        }}
        onSave={handleSaveCustomNote}
        existingDirectories={existingDirectories}
        initialDirectory={newNoteInitialDir}
      />
    </div>
  );
};

/** The app ships no bundled notes, so the view mounts straight away with the user's own notes. */
export const CheatsheetView: React.FC<CheatsheetViewProps> = (props) => <CheatsheetViewContent {...props} />;
