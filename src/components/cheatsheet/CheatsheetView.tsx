import { isTauriTarget } from '../../utils/runtimeTarget';
import { clearLegacyViewerPrefs } from '../../utils/notesViewerPrefs';
import React, { useState, useMemo, useEffect, useDeferredValue, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  Star, 
  Plus, 
  Trash2, 
  Code,
  BookOpen,
  Sparkles,
  ChevronDown,
  Folder,
  FolderOpen,
  Table,
  LayoutList,
  Upload,
  Hash,
  ArrowUpDown,
  PanelLeft,
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  CHEATSHEET_CATEGORIES 
} from '../../data/cheatsheetsData';
import { interpolateCommand, playCyberSound } from '../../utils/helpers';
import { useEffectiveGlobalVars } from '../../hooks/useActiveTargetIp';
import { useSnippetTotals } from '../../hooks/useSnippetTotals';
import {
  CptsNoteEntry,
  CptsTreeNode,
  getCategoryTopicGroups,
  searchCptsNotes,
  getNoteById,
  buildCptsFileTree,
  CptsSortOrder,
  sortNotesByNumber,
  formatNoteNumberBadge,
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
import { NoteMatchSnippets } from './NoteMatchSnippets';
import { SplitOrientation } from '../../types/workspace';
import { NewCptsNoteModal } from './NewCptsNoteModal';
import { YourDetailsCard } from './YourDetailsCard';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { PageHeader } from '../common/PageHeader';
import { SyntaxHighlightedCommand } from '../common/SyntaxHighlightedCommand';
import { CyberButton } from '../common/CyberButton';
import { EmptyState } from '../common/EmptyState';
import { TACTICAL_SPRING, CASCADE_STAGGER_DELAY } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';
import { useToastStore } from '../../store/useToastStore';
import { hasUnsavedNoteEdits } from '../../utils/unsavedNoteEdits';

const SNIPPET_CATEGORIES: CyberSelectOption[] = [
  { value: 'network', label: '01. Network Discovery & Port Scanning' },
  { value: 'web', label: '02. Web Enumeration & Fuzzing' },
  { value: 'exploitation', label: '03. Exploitation & Payloads' },
  { value: 'linux-privesc', label: '04. Linux PrivEsc & TTY' },
  { value: 'active-directory', label: '05. Windows & Active Directory' },
  { value: 'pivoting', label: '06. Pivoting & Tunneling' },
  { value: 'file-transfer', label: '07. File Transfers' },
];

export type CptsLanguageMode = 'en' | 'he';
export type CptsDisplayLayout = 'cards' | 'quick-index' | 'grouped';

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
  const totals = useSnippetTotals();

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
      const { [note.id]: _dropped, ...rest } = prev;
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

  // Sync viewMode and activeObsidianNote when route or search query changes
  useEffect(() => {
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
  }, [defaultMode, isFullscreen, location.pathname, location.search, allActiveNotes, setActiveObsidianNote, navigate]);

  // /notes?new=1 (from the dock's empty state) opens the new-note modal once, then drops the param.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') !== '1') return;
    setNewNoteInitialDir(undefined);
    setIsNewCptsModalOpen(true);
    params.delete('new');
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  // New Custom Command Form Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('linux-privesc');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newTags, setNewTags] = useState('');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
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

  const [confirmWipeVault, setConfirmWipeVault] = useState(false);

  useEffect(() => {
    if (confirmWipeVault) {
      const timer = setTimeout(() => setConfirmWipeVault(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [confirmWipeVault]);

  const handleWipeVaultConfirm = () => {
    if (!confirmWipeVault) {
      setConfirmWipeVault(true);
      return;
    }

    // Same as the per-note delete, for every note the button counts: tombstoned, not a whole-vault wipe.
    deleteNotes(allActiveNotes.map((n) => n.id));
    if (soundEnabled) playCyberSound('root');
    setConfirmWipeVault(false);
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
      wipeArmed={confirmWipeVault}
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
              <div 
                data-testid="empty-obsidian-workspace"
                className="w-full h-full min-h-[600px] flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 bg-surface-card"
              >
                <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-accent/40 flex items-center justify-center text-accent shadow-glow-sm">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-semibold text-primary">No Note Open</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Select a playbook from the Obsidian Vault Explorer on the left, or open a playbook to get started.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {allActiveNotes.length > 0 && (
                    <button
                      type="button"
                      data-testid="empty-state-open-first-note"
                      onClick={() => {
                        if (soundEnabled) playCyberSound('click');
                        setActiveObsidianNote(allActiveNotes[0]);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open First Playbook ({allActiveNotes[0].titleEn || allActiveNotes[0].title})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playCyberSound('click');
                      setObsidianNavView('cards');
                      setCptsDisplayLayout('cards');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface-sunken hover:bg-surface-hover border border-subtle text-primary text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LayoutList className="w-3.5 h-3.5 text-muted" />
                    <span>Browse Cards Gallery</span>
                  </button>
                  {!leftOpenNow && (
                    <button
                      type="button"
                      onClick={handleToggleObsidianSidebar}
                      className="px-3.5 py-2 rounded-xl bg-surface-sunken hover:bg-surface-hover border border-accent/40 text-accent text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <PanelLeft className="w-3.5 h-3.5" />
                      <span>Open File Explorer (Ctrl+B)</span>
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            /* CARDS GALLERY / QUICK INDEX TABLE (FULL WIDTH) */
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto lg:h-full max-h-[calc(100vh-10rem)]">
              {/* HUD Header Bar */}
              <div className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      data-testid="hud-toggle-sidebar-button"
                      onClick={handleToggleObsidianSidebar}
                      className="p-1 mr-1 rounded-lg hover:bg-surface-hover text-muted hover:text-accent transition-colors flex-shrink-0 cursor-pointer"
                      title={leftOpenNow ? "Collapse explorer (Ctrl+B)" : "Expand explorer (Ctrl+B)"}
                      aria-label={leftOpenNow ? "Collapse explorer" : "Expand explorer"}
                    >
                      <PanelLeft className={`w-4 h-4 ${leftOpenNow ? 'text-accent' : 'text-muted'}`} />
                    </button>
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-primary font-semibold">
                      Your notes
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted text-accent font-semibold">
                      {selectedCptsCategory === 'ALL'
                        ? allActiveNotes.length > 0
                          ? `All notes (${allActiveNotes.length})`
                          : 'No notes yet'
                        : selectedCptsCategory}
                    </span>
                    {selectedCptsSubCategory !== 'ALL' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted border border-accent/40 text-accent flex items-center gap-1 font-semibold">
                        <span>📁 {selectedCptsSubCategory}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCptsSubCategory('ALL')}
                          className="hover:text-primary text-accent ml-1 font-semibold"
                          title="Clear subcategory filter"
                          aria-label="Clear subcategory filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Jump to Note Combobox */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setJumpDropdownOpen((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-surface-card border border-accent/40 text-accent hover:text-accent text-xs flex items-center gap-1.5 font-semibold transition-colors"
                        title="Quick search and jump to any note directly"
                      >
                        <Search className="w-3.5 h-3.5 text-accent" />
                        <span>Jump to Note...</span>
                        <ChevronDown className="w-3 h-3 text-accent" />
                      </button>

                      {jumpDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setJumpDropdownOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 rounded-xl border border-accent/50 bg-surface-card/95 backdrop-blur-md shadow-2xl p-2 z-50 space-y-2 animate-fade-in">
                            <input
                              id="cpts-jump-search-input"
                              name="cpts-jump-search"
                              aria-label="Type note name, tag, or tool"
                              type="text"
                              autoFocus
                              value={jumpSearchQuery}
                              onChange={(e) => setJumpSearchQuery(e.target.value)}
                              placeholder="Type note name, tag, or tool..."
                              className="w-full bg-surface-card px-2.5 py-1.5 rounded-lg border border-accent/40 text-primary text-xs focus:outline-none focus:border-accent"
                            />
                            <div className="max-h-72 overflow-y-auto space-y-1 divide-y divide-subtle/30">
                              {(jumpSearchQuery.trim() ? allActiveNotes : filteredCptsNotes)
                                .filter((n) => {
                                  if (!jumpSearchQuery.trim()) return true;
                                  const q = jumpSearchQuery.toLowerCase();
                                  return (
                                    n.title.toLowerCase().includes(q) ||
                                    (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
                                    (n.titleHe && n.titleHe.toLowerCase().includes(q)) ||
                                    (n.subCategory && n.subCategory.toLowerCase().includes(q)) ||
                                    (n.tools && n.tools.some((t) => t.toLowerCase().includes(q)))
                                  );
                                })
                                .slice(0, 40)
                                .map((note) => (
                                  <div
                                    key={note.id}
                                    className="flex items-center gap-1 w-full rounded hover:bg-accent/40 transition-colors p-1 group"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setJumpDropdownOpen(false);
                                        setActiveObsidianNote(note);
                                        setObsidianNavView('files');
                                        if (soundEnabled) playCyberSound('root');
                                      }}
                                      className="flex-1 text-left px-1.5 py-1 rounded transition-colors flex flex-col min-w-0 cursor-pointer"
                                      title="Open full Obsidian note"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-primary text-xs font-semibold group-hover:text-accent truncate flex-1">
                                          {note.titleEn || note.title}
                                        </span>
                                        <span className="text-[9px] px-1 rounded bg-surface-sunken text-accent flex-shrink-0">
                                          {note.category.split(' ')[0]}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-muted truncate block">
                                        {note.subCategory || note.category}
                                      </span>
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sort Order Selector */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('number');
                          setCptsLimit(30);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          cptsSortOrder === 'number'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>Number</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('topic');
                          setCptsLimit(30);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          cptsSortOrder === 'topic'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Topic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('title');
                          setCptsLimit(30);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          cptsSortOrder === 'title'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>A → Z</span>
                      </button>
                    </div>

                    {/* Display Layout Switcher */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setObsidianNavView('files');
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          (obsidianNavView as string) === 'files'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Switch to Obsidian Note Reader"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Notes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsDisplayLayout('cards');
                          setObsidianNavView('cards');
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          obsidianNavView === 'cards'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsDisplayLayout('quick-index');
                          setObsidianNavView('index');
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          obsidianNavView === 'index'
                            ? 'bg-accent text-on-accent'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Folder Filter Indicator */}
                {selectedTreePath && (
                  <div className="flex items-center justify-between p-2 px-3 rounded-lg bg-accent-muted border border-accent/40 text-xs">
                    <div className="flex items-center gap-2 text-accent truncate">
                      <FolderOpen className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="truncate">
                        Folder: <strong className="text-primary font-mono">{selectedTreePath.split('/').pop()?.replace(/^\d+[\s_.-]*/, '') || selectedTreePath}</strong> (<strong className="text-accent">{filteredCptsNotes.length} notes</strong>)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTreePath(null)}
                      className="text-[10px] text-accent hover:text-accent underline font-semibold flex-shrink-0 cursor-pointer ml-2"
                    >
                      ✕ Clear Filter
                    </button>
                  </div>
                )}

                {/* Topic Filter Chips */}
                {activeCategoryTopicGroups.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin pt-1 border-t border-accent/20">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCptsSubCategory('ALL');
                        setCptsLimit(30);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors ${
                        selectedCptsSubCategory === 'ALL'
                          ? 'bg-accent text-on-accent'
                          : 'bg-surface-elevated border border-subtle text-secondary hover:text-primary'
                      }`}
                    >
                      ALL ({filteredCptsNotes.length})
                    </button>
                    {activeCategoryTopicGroups.map((tg) => {
                      const isGroupActive = selectedCptsSubCategory === tg.group;
                      return (
                        <button
                          key={tg.group}
                          type="button"
                          onClick={() => {
                            setSelectedCptsSubCategory(isGroupActive ? 'ALL' : tg.group);
                            setCptsLimit(30);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors flex items-center gap-1.5 ${
                            isGroupActive
                              ? 'bg-accent text-on-accent border border-accent/40'
                              : 'bg-surface-elevated border border-subtle text-secondary hover:text-accent'
                          }`}
                        >
                          <span>📁 {tg.group}</span>
                          <span className={`text-[9px] px-1 rounded-full ${isGroupActive ? 'bg-accent text-on-accent' : 'bg-surface-hover text-accent'}`}>
                            {tg.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* VIEW 1: QUICK INDEX TABLE */}
              {(obsidianNavView === 'index' || cptsDisplayLayout === 'quick-index') ? (
                <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-sunken/95 border-b border-subtle text-muted text-[10px] sticky top-0 z-10 backdrop-blur">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 w-48">Topic / folder</th>
                          <th className="py-2.5 px-3">Title / objective</th>
                          <th className="py-2.5 px-3 w-28 text-center">Stage / level</th>
                          <th className="py-2.5 px-3 w-32 text-center">Commands</th>
                          <th className="py-2.5 px-3 w-28 text-right pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle/40">
                        {visibleCptsNotes.map((note, index) => {
                          return (
                            <tr 
                              key={note.id}
                              id={`cpts-note-${note.id}`}
                              onClick={() => {
                                openFromResults(note);
                                setObsidianNavView('files');
                                if (isNarrow) closeDrawers();
                              }}
                              className="hover:bg-accent-muted/40 transition-colors cursor-pointer group"
                            >
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-muted">
                                {formatNoteNumberBadge(note) || String(index + 1).padStart(2, '0')}
                              </td>
                              <td className="py-2 px-3 text-muted text-[11px] truncate max-w-48">
                                {note.subCategory || note.category}
                              </td>
                              <td className="py-2 px-3 font-medium text-primary group-hover:text-accent">
                                {note.titleEn || note.title}
                                <NoteMatchSnippets markdown={note.rawMarkdown} query={deferredSearchQuery} />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-sunken text-muted">
                                  {note.stage || 'General'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-accent">
                                {note.commands?.length || 0}
                              </td>
                              <td className="py-2 px-3 text-right pr-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openFromResults(note);
                                    setObsidianNavView('files');
                                    if (isNarrow) closeDrawers();
                                  }}
                                  className="px-2.5 py-1 rounded bg-accent text-on-accent text-[11px] font-semibold hover:bg-accent-hover transition-colors"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* VIEW 2: FULL-WIDTH CARDS GALLERY */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleCptsNotes.map((note) => (
                    <div
                      key={note.id}
                      id={`cpts-note-${note.id}`}
                      onClick={() => {
                        openFromResults(note);
                        setObsidianNavView('files');
                        if (isNarrow) closeDrawers();
                      }}
                      className="p-4 rounded-xl border border-subtle bg-surface-card hover:border-accent transition-colors cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-primary group-hover:text-accent transition-colors">
                            {note.titleEn || note.title}
                          </h4>
                          {formatNoteNumberBadge(note) && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle flex-shrink-0">
                              #{formatNoteNumberBadge(note)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted line-clamp-2">
                          {note.summary || 'Playbook documentation and operational commands.'}
                        </p>
                        <NoteMatchSnippets markdown={note.rawMarkdown} query={deferredSearchQuery} />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-subtle/50 text-[11px]">
                        <span className="text-muted">
                          📁 {note.subCategory || note.category.split(' ')[0]}
                        </span>
                        <div className="flex items-center gap-2">
                          {note.commands && note.commands.length > 0 && (
                            <span className="font-mono text-accent">
                              {note.commands.length} cmds
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold group-hover:bg-accent group-hover:text-on-accent transition-colors">
                            Read ›
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sliced Pagination Controls */}
              {visibleCptsNotes.length < filteredCptsNotes.length && (
                <div className="p-4 rounded-xl border border-subtle bg-surface-card flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCptsLimit((prev) => prev + 30)}
                    className="px-5 py-2 rounded-lg bg-accent/20 border border-accent/50 hover:bg-accent-hover hover:text-on-accent text-accent font-semibold text-xs transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load next 30 notes ({filteredCptsNotes.length - visibleCptsNotes.length} remaining)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCptsLimit(filteredCptsNotes.length)}
                    className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary text-xs font-semibold transition-colors"
                  >
                    Show all ({filteredCptsNotes.length})
                  </button>
                </div>
              )}
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
              onBack={() => navigate(getLastAppRoute() ?? '/tracker')}
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
                  title="Your field manual is empty"
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
            title="Snippets & payloads"
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
                    title="Switch to Obsidian Field Manual"
                    className={`${switchBase} text-muted hover:text-primary`}
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Field manual</span>
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
              {totals.notes > 0 && (
                <p data-testid="snippets-scope-note" className="px-2 pb-1 text-xs text-muted">
                  {totals.snippets} snippets here. The sidebar badge also counts your {totals.notes}{' '}
                  {totals.notes === 1 ? 'note' : 'notes'} ({totals.total} in total).
                </p>
              )}
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
                    aria-label="Search cheatsheets and field manual notes"
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
              <div className="space-y-3">
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-subtle bg-surface-card/50 text-muted text-xs">
                    No command snippets matching this query.
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const interpolated = interpolateCommand(cmd.commandTemplate, effectiveVars);
                    const isCopied = copiedId === cmd.id;

                    return (
                      <motion.div
                        key={cmd.id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-30px' }}
                        transition={{ ...TACTICAL_SPRING, delay: CASCADE_STAGGER_DELAY(idx) }}
                        className="cyber-snippet-contain p-3.5 rounded-xl border border-subtle bg-surface-card hover:border-strong transition-colors group"
                      >
                        {/* Snippet Header */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary text-sm">
                                {cmd.title}
                              </span>
                              {cmd.isCustom && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-secondary font-semibold">
                                  CUSTOM
                                </span>
                              )}
                              {cmd.platform && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-muted">
                                  {cmd.platform}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted mt-0.5">{cmd.description}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <motion.button aria-label="Star snippet"
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleStarCommand(cmd.id)}
                              className="p-1 rounded text-muted hover:text-callout-warn-fg transition-colors"
                              title="Bookmark / Star Snippet"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  cmd.isStarred ? 'fill-current text-callout-warn-fg' : ''
                                }`}
                              />
                            </motion.button>

                            {cmd.isCustom && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={async () => {
                                  if (await confirmAction({ title: 'Delete this custom snippet?', body: 'This custom command will be permanently removed.', confirmLabel: 'Delete snippet', tone: 'danger' })) {
                                    deleteCustomCommand(cmd.id);
                                  }
                                }}
                                className="p-1 rounded text-muted hover:text-callout-danger-fg transition-colors"
                                title="Delete Snippet"
                                aria-label="Delete snippet"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            )}

                            <button
                              type="button"
                              onClick={() => useNotesWorkspaceStore.getState().openCheat(cmd.id)}
                              className="p-1 rounded text-muted hover:text-primary transition-colors"
                              title="Open in Notes"
                              aria-label={`Open ${cmd.title} in Notes`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleCopy(interpolated, cmd.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] ${
                                isCopied
                                  ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
                                  : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-strong'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-callout-success-fg" />
                                  <span className="text-callout-success-fg">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Rendered Command Code Box */}
                        <div className="relative">
                          <pre className="p-3 rounded-lg bg-surface-inverse text-xs text-on-inverse overflow-x-auto whitespace-pre-wrap break-all font-mono tabular-nums select-all">
                            {interpolated.includes('\n') ? (
                              interpolated
                            ) : (
                              <SyntaxHighlightedCommand command={interpolated} className="!bg-transparent !p-0 !rounded-none" />
                            )}
                          </pre>
                        </div>

                        {/* Tags */}
                        {cmd.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cmd.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Custom Command Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-subtle bg-surface-card shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-primary flex items-center gap-2">
              <Code className="w-4 h-4 text-muted" /> Add custom snippet
            </h3>

            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div>
                <label htmlFor="custom-snippet-title" className="block text-muted mb-1 font-semibold">
                  Command Title *
                </label>
                <input
                  type="text"
                  id="custom-snippet-title"
                  name="custom-snippet-title"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Chamilo LMS RCE Exploit"
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-category" className="block text-muted mb-1 font-semibold">
                  Category
                </label>
                <CyberSelect
                  id="custom-snippet-category"
                  name="custom-snippet-category"
                  value={newCategory}
                  onChange={setNewCategory}
                  options={SNIPPET_CATEGORIES}
                  variant="default"
                  size="md"
                  className="w-full"
                  triggerClassName="w-full bg-surface-sunken"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-desc" className="block text-muted mb-1 font-semibold">
                  Description
                </label>
                <input
                  type="text"
                  id="custom-snippet-desc"
                  name="custom-snippet-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief note on exploit parameters..."
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-template" className="block text-muted mb-1 font-semibold">
                  Command Template (Supports &#x7B;TARGET_IP&#x7D;, &#x7B;LHOST&#x7D;, &#x7B;LPORT&#x7D;) *
                </label>
                <textarea
                  id="custom-snippet-template"
                  name="custom-snippet-template"
                  rows={3}
                  required
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="python3 exploit.py -t {TARGET_IP} -l {LHOST} -p {LPORT}"
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent font-mono resize-none"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-tags" className="block text-muted mb-1 font-semibold">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  id="custom-snippet-tags"
                  name="custom-snippet-tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="rce, python, cve-2023-xxxx"
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle text-muted hover:text-primary text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent text-on-accent font-semibold text-xs hover:bg-accent/90 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98]"
                >
                  Save Snippet
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
