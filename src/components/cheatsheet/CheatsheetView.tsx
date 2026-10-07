import { isTauriTarget } from '../../utils/runtimeTarget';
import React, { useState, useMemo, useEffect, useDeferredValue, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  Star, 
  Plus, 
  Trash2, 
  Radio, 
  Code,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Compass,
  FileText,
  Languages,
  ArrowRightLeft,
  Folder,
  FolderOpen,
  Table,
  LayoutList,
  Zap,
  Filter,
  ShieldCheck,
  Upload,
  Hash,
  ArrowUpDown,
  RotateCcw,
  PanelRight,
  PanelLeft,
  SlidersHorizontal,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  CHEATSHEET_CATEGORIES 
} from '../../data/cheatsheetsData';
import { interpolateCommand, playCyberSound } from '../../utils/helpers';
import { 
  CPTS_NOTES, 
  CptsNoteEntry, 
  CptsTopicGroup,
  CptsTreeNode,
  getCptsCategories, 
  getCategoryTopicGroups,
  parseSubCategory,
  searchCptsNotes,
  getNoteById,
  buildCptsFileTree,
  getAllNotesInTreeNode,
  CptsSortOrder,
  sortNotesByNumber,
  formatNoteNumberBadge,
  getAllCptsNotes,
} from '../../utils/obsidianManualUtils';
import { ObsidianNoteViewer } from './ObsidianNoteViewer';
import { SplitOrientation } from '../../types/workspace';
import { CptsTreeItem } from './CptsTreeItem';
import { NewCptsNoteModal } from './NewCptsNoteModal';
import { ReverseShellGenerator } from './ReverseShellGenerator';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { PageHeader } from '../common/PageHeader';
import { SyntaxHighlightedCommand } from '../common/SyntaxHighlightedCommand';
import { CyberButton } from '../common/CyberButton';
import { TACTICAL_SPRING, CASCADE_STAGGER_DELAY } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';

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

export const CheatsheetView: React.FC<CheatsheetViewProps> = ({ defaultMode }) => {
  const location = useLocation();
  const {
    cheatsheets,
    globalVars,
    setGlobalVars,
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
    clearUserNotes,
    setNotesImportModalOpen,
  } = useCtfStore(
    useShallow((s) => ({
      cheatsheets: s.cheatsheets,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
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
      clearUserNotes: s.clearUserNotes,
      setNotesImportModalOpen: s.setNotesImportModalOpen,
    }))
  );

  const navigate = useNavigate();
  const isManualRoute = defaultMode === 'cpts-manual' || 
    location.pathname.includes('note') || 
    location.pathname.includes('manual') || 
    location.search.includes('manual') || 
    location.search.includes('cpts');

  const [viewMode, setViewMode] = useState<'tactical' | 'cpts-manual'>(isManualRoute ? 'cpts-manual' : 'tactical');
  const [cptsLangMode, setCptsLangMode] = useState<CptsLanguageMode>('en');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCptsCategory, setSelectedCptsCategory] = useState('ALL');
  const [selectedCptsSubCategory, setSelectedCptsSubCategory] = useState<string>('ALL');
  const [expandedSidebarCategories, setExpandedSidebarCategories] = useState<Record<string, boolean>>({
    '01 Information Gathering & Recon': true,
  });
  const [selectedTreePath, setSelectedTreePath] = useState<string | null>(null);
  const [expandedTreeFolders, setExpandedTreeFolders] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('zerobox_obsidian_expanded_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
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
  const [expandedIndexRows, setExpandedIndexRows] = useState<Record<string, boolean>>({});
  const [collapsedGroupSections, setCollapsedGroupSections] = useState<Record<string, boolean>>({});
  const [jumpDropdownOpen, setJumpDropdownOpen] = useState(false);
  const [hudOptionsOpen, setHudOptionsOpen] = useState(false);
  const [jumpSearchQuery, setJumpSearchQuery] = useState('');
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [cptsLimit, setCptsLimit] = useState(30);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
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
    } catch {}
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
    } catch {}
    const all = getAllCptsNotes();
    return isManualRoute && all.length > 0 ? all[0].id : null;
  });

  // Check if current view is a detached standalone pop-out window
  const isPopout = useMemo(() => {
    return new URLSearchParams(location.search).get('popout') === 'true';
  }, [location.search]);

  // Dual-mode viewing state: 'docked' (in-page side-by-side split) vs 'modal' (floating centered dialog)
  const [noteViewerMode, setNoteViewerMode] = useState<'docked' | 'modal'>(() => {
    try {
      const saved = localStorage.getItem('zerobox_note_viewer_mode');
      return saved === 'modal' ? 'modal' : 'docked';
    } catch {
      return 'docked';
    }
  });

  const handleToggleViewerMode = useCallback(() => {
    setNoteViewerMode((prev) => {
      const next = prev === 'docked' ? 'modal' : 'docked';
      try {
        localStorage.setItem('zerobox_note_viewer_mode', next);
      } catch {}
      return next;
    });
  }, []);

  // Obsidian Field Manual Workspace Sidebar & Navigation State
  const [isObsidianSidebarOpen, setIsObsidianSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zerobox_obsidian_sidebar_open');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleObsidianSidebar = useCallback(() => {
    setIsObsidianSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_obsidian_sidebar_open', String(next));
      } catch {}
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

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
  const [treeSearchQuery, setTreeSearchQuery] = useState('');

  // Docked Note Viewer Maximize state
  const [isDockedMaximized, setIsDockedMaximized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_docked_maximized') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDockedMaximize = useCallback(() => {
    setIsDockedMaximized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_docked_maximized', String(next));
      } catch {}
      if (next) {
        setIsObsidianSidebarOpen(false);
      } else {
        setIsObsidianSidebarOpen(true);
      }
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  // Modal Note Viewer Maximize state
  const [isModalMaximized, setIsModalMaximized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_modal_maximized') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleModalMaximize = useCallback(() => {
    setIsModalMaximized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zerobox_modal_maximized', String(next));
      } catch {}
      return next;
    });
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  // Active Notes Pool (Reconciling user private notes, custom notes, and deleted notes)
  const allActiveNotes = useMemo(() => {
    const deletedSet = new Set(deletedNoteIds);
    const source = userNotes && userNotes.length > 0 ? userNotes : CPTS_NOTES;
    const baseline = source.filter((n) => !deletedSet.has(n.id));
    const activeCustom = customNotes.filter((n) => !deletedSet.has(n.id));
    return [...activeCustom, ...baseline];
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
    } catch {}
  }, [openObsidianNotes, activeObsidianNoteId]);

  // Sync viewMode and activeObsidianNote when route or search query changes
  useEffect(() => {
    const isManualParam = location.pathname.includes('note') || 
      location.pathname.includes('manual') || 
      location.search.includes('manual') || 
      location.search.includes('cpts') ||
      (typeof window !== 'undefined' && (window.location.hash.includes('manual') || window.location.hash.includes('cpts')));

    if (isManualParam) {
      setViewMode('cpts-manual');
    } else if (defaultMode) {
      setViewMode(defaultMode);
    } else if (location.pathname.startsWith('/cheatsheets') || location.pathname === '/cheatsheet') {
      setViewMode('tactical');
    }

    // Check for direct note opening via query parameter, e.g. ?note=cpts-... (supporting both search & hash)
    const params = new URLSearchParams(location.search);
    let noteParam = params.get('note');
    if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      noteParam = hashParams.get('note');
    }
    if (noteParam) {
      const found = getNoteById(noteParam, allActiveNotes.length > 0 ? allActiveNotes : undefined) || getNoteById(noteParam);
      if (found) {
        setActiveObsidianNote(found);
        setViewMode('cpts-manual');
        setObsidianNavView('files');
      }
    }

    const catParam = params.get('category') || params.get('cat') || params.get('tab');
    if (catParam) {
      setSelectedCategory(catParam);
      setViewMode('tactical');
    }
  }, [defaultMode, location.pathname, location.search, allActiveNotes, setActiveObsidianNote]);

  // New Custom Command Form Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('linux-privesc');
  const [newDesc, setNewDesc] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [newTags, setNewTags] = useState('');
  const [notesTextDirection, setNotesTextDirection] = useState<'auto' | 'rtl' | 'ltr'>('auto');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleCopyAllNoteCommands = (note: CptsNoteEntry) => {
    if (!note.commands || note.commands.length === 0) return;
    const interpolated = note.commands.map(cmd => interpolateCommand(cmd, globalVars)).join('\n\n');
    handleCopy(interpolated, `all-${note.id}`);
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
      } else if (selectedCategory !== 'all' && selectedCategory !== 'revshell') {
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
  const filteredTreeNotes = useMemo(() => {
    if (!treeSearchQuery.trim()) return allActiveNotes;
    const q = treeSearchQuery.toLowerCase().trim();
    return allActiveNotes.filter((n) => {
      return (
        n.title.toLowerCase().includes(q) ||
        (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
        (n.titleHe && n.titleHe.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q) ||
        (n.subCategory && n.subCategory.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [allActiveNotes, treeSearchQuery]);

  const cptsFileTree = useMemo(() => buildCptsFileTree(filteredTreeNotes), [filteredTreeNotes]);
  const cptsCategories = useMemo(() => getCptsCategories(allActiveNotes), [allActiveNotes]);

  // Persist expanded tree folders
  useEffect(() => {
    try {
      localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(expandedTreeFolders));
    } catch {}
  }, [expandedTreeFolders]);

  // Auto-expand tree folders when a filter query is typed so matching files are immediately visible
  useEffect(() => {
    if (treeSearchQuery.trim()) {
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
      setExpandedTreeFolders((prev) => ({ ...prev, ...all }));
    }
  }, [treeSearchQuery, cptsFileTree]);

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
    } catch {}
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
    } catch {}
  }, [isSplitView, splitOrientation, secondaryOpenNotes, secondaryActiveNoteId]);

  const secondaryActiveNote = useMemo(() => {
    if (!secondaryActiveNoteId) return secondaryOpenNotes[0] || null;
    return secondaryOpenNotes.find((n) => n.id === secondaryActiveNoteId) || secondaryOpenNotes[0] || null;
  }, [secondaryOpenNotes, secondaryActiveNoteId]);

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

  const renderWorkspacePanes = (mode: 'docked' | 'modal' | 'popout') => {
    if (!activeObsidianNote) return null;

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
          globalVars={globalVars}
          soundEnabled={soundEnabled}
          onClose={handleCloseAllObsidianTabs}
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
          onToggleDisplayMode={handleToggleViewerMode}
          isMaximized={mode === 'docked' ? isDockedMaximized : isModalMaximized}
          onToggleMaximize={mode === 'docked' ? handleToggleDockedMaximize : handleToggleModalMaximize}
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
          isSidebarOpen={isObsidianSidebarOpen}
          onToggleSidebar={handleToggleObsidianSidebar}
          onSwitchToCards={() => setObsidianNavView('cards')}
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
            globalVars={globalVars}
            soundEnabled={soundEnabled}
            onClose={handleCloseAllObsidianTabs}
            onNavigateToNote={(noteId) => {
              const found = getNoteById(noteId, allActiveNotes);
              if (found) handleOpenObsidianNote(found);
            }}
            defaultLanguage={cptsLangMode}
            displayMode="docked"
            onToggleDisplayMode={handleToggleViewerMode}
            isMaximized={mode === 'docked' ? isDockedMaximized : false}
            onToggleMaximize={mode === 'docked' ? handleToggleDockedMaximize : undefined}
            isSplitView={true}
            splitOrientation={splitOrientation}
            onToggleSplit={handleToggleSplit}
            onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-primary')}
            paneId="pane-primary"
            isPaneActive={activePaneId === 'pane-primary'}
            onFocusPane={() => setActivePaneId('pane-primary')}
            isSidebarOpen={isObsidianSidebarOpen}
            onToggleSidebar={handleToggleObsidianSidebar}
            onSwitchToCards={() => setObsidianNavView('cards')}
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
            globalVars={globalVars}
            soundEnabled={soundEnabled}
            onClose={handleCloseSecondaryPane}
            onNavigateToNote={(noteId) => {
              const found = getNoteById(noteId, allActiveNotes);
              if (found) handleOpenSecondaryNote(found);
            }}
            defaultLanguage={cptsLangMode}
            displayMode="docked"
            onToggleDisplayMode={handleToggleViewerMode}
            isMaximized={mode === 'docked' ? isDockedMaximized : false}
            onToggleMaximize={mode === 'docked' ? handleToggleDockedMaximize : undefined}
            isSplitView={true}
            splitOrientation={splitOrientation}
            onToggleSplit={handleToggleSplit}
            onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-secondary')}
            paneId="pane-secondary"
            isPaneActive={activePaneId === 'pane-secondary'}
            onFocusPane={() => setActivePaneId('pane-secondary')}
          />
        </div>
      </div>
    );

    if (mode === 'modal') {
      return (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Field Manual Split View Workspace"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn outline-none"
        >
          <div className="w-full max-w-[98vw] 2xl:max-w-7xl max-h-[94vh] h-[94vh] flex flex-col outline-none">
            {splitContent}
          </div>
        </div>
      );
    }

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

  const activeTopicLeaves = useMemo(() => {
    if (selectedCptsSubCategory === 'ALL') return [];
    const group = activeCategoryTopicGroups.find(g => g.group === selectedCptsSubCategory);
    return group ? group.leaves : [];
  }, [activeCategoryTopicGroups, selectedCptsSubCategory]);

  const groupedCptsNotes = useMemo(() => {
    if (cptsDisplayLayout !== 'grouped') return [];
    const map: Record<string, CptsNoteEntry[]> = {};
    for (const note of filteredCptsNotes) {
      const { group } = parseSubCategory(note.subCategory);
      if (!map[group]) map[group] = [];
      map[group].push(note);
    }
    return Object.entries(map).map(([group, notes]) => ({
      group,
      count: notes.length,
      notes
    })).sort((a, b) => b.count - a.count);
  }, [filteredCptsNotes, cptsDisplayLayout]);

  const visibleCptsNotes = useMemo(() => {
    return filteredCptsNotes.slice(0, cptsLimit);
  }, [filteredCptsNotes, cptsLimit]);

  const totalCptsCommands = useMemo(() => {
    return filteredCptsNotes.reduce((sum, n) => sum + (n.commands ? n.commands.length : 0), 0);
  }, [filteredCptsNotes]);

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
    if (await confirmAction({ title: `Delete field note "${title}"?`, body: 'You can restore deleted notes at any time using the restore button in the sidebar.', tone: 'danger' })) {
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

  const handleWipeVaultConfirm = async () => {
    if (!confirmWipeVault) {
      setConfirmWipeVault(true);
      return;
    }

    await clearUserNotes();
    if (soundEnabled) playCyberSound('root');
    setConfirmWipeVault(false);
    setViewMode('tactical');
  };

  const handleRestoreDeletedNotes = async () => {
    if (await confirmAction({ title: `Restore all ${deletedNoteIds.length} deleted field notes?`, body: 'They will be moved back into your active manual.', tone: 'default' })) {
      restoreDeletedNotes();
      if (soundEnabled) playCyberSound('flag');
    }
  };

  const handleSaveCustomNote = (newNote: Partial<CptsNoteEntry> & { title: string }) => {
    addCustomNote(newNote);
    if (soundEnabled) playCyberSound('root');
  };

  const handleJumpToNote = (note: CptsNoteEntry) => {
    setJumpDropdownOpen(false);
    setJumpSearchQuery('');
    setHighlightedNoteId(note.id);
    if (soundEnabled) playCyberSound('root');

    // If note is in another category or subcategory, switch so it is visible
    if (selectedCptsCategory !== 'ALL' && selectedCptsCategory !== note.category) {
      setSelectedCptsCategory(note.category);
      setSelectedCptsSubCategory('ALL');
    } else if (selectedCptsSubCategory !== 'ALL') {
      const { group } = parseSubCategory(note.subCategory);
      if (selectedCptsSubCategory !== group) {
        setSelectedCptsSubCategory('ALL');
      }
    }

    // Ensure note is within pagination window
    setCptsLimit((prev) => Math.max(prev, 60));

    // Auto expand row if in quick-index mode
    if (cptsDisplayLayout === 'quick-index') {
      setExpandedIndexRows((prev) => ({ ...prev, [note.id]: true }));
    }

    // Scroll smoothly to element
    setTimeout(() => {
      const el = document.getElementById(`cpts-note-${note.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    setTimeout(() => {
      setHighlightedNoteId(null);
    }, 3000);
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
  const renderObsidianWorkspace = () => {
    return (
      <div className="w-full flex flex-col lg:flex-row items-stretch gap-3 min-h-[calc(100vh-10rem)] lg:h-[calc(100vh-10rem)]">
        {/* Left Obsidian File Explorer Sidebar */}
        <div 
          className={`transition-[width,opacity] duration-200 flex-shrink-0 flex flex-col rounded-2xl border border-subtle bg-surface-card overflow-hidden shadow-sm lg:h-full ${
            isObsidianSidebarOpen ? 'w-full lg:w-80 2xl:w-88' : 'hidden'
          }`}
        >
          {/* Obsidian Vault Header */}
          <div className="p-3 border-b border-subtle flex items-center justify-between gap-1.5 bg-surface-sunken/60">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="font-semibold text-xs text-primary truncate">FIELD MANUAL</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-muted text-accent font-semibold">
                {allActiveNotes.length}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setNewNoteInitialDir(undefined);
                  setIsNewCptsModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-colors cursor-pointer"
                title="Create new field note"
                aria-label="Create new field note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberSound('click');
                  setNotesImportModalOpen(true);
                }}
                className="p-1 rounded hover:bg-surface-hover text-muted hover:text-accent transition-colors cursor-pointer"
                title="Import notes directory"
                aria-label="Import notes directory"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExpandAllTreeFolders}
                className="px-1 py-0.5 rounded hover:bg-surface-hover text-muted hover:text-primary text-[10.5px] font-mono transition-colors cursor-pointer"
                title="Expand all folders"
              >
                +All
              </button>
              <button
                type="button"
                onClick={handleCollapseAllTreeFolders}
                className="px-1 py-0.5 rounded hover:bg-surface-hover text-muted hover:text-primary text-[10.5px] font-mono transition-colors cursor-pointer"
                title="Collapse all folders"
              >
                -All
              </button>
              <button
                type="button"
                onClick={handleToggleObsidianSidebar}
                className="p-1 rounded hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
                title="Collapse explorer (Ctrl+B)"
                aria-label="Collapse explorer sidebar"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Real-Time Tree Filter */}
          <div className="p-2 border-b border-subtle bg-surface-card">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={treeSearchQuery}
                onChange={(e) => setTreeSearchQuery(e.target.value)}
                placeholder="Search files & folders..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              {treeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTreeSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Views & Language Pill Switcher */}
          <div className="px-2 py-1.5 border-b border-subtle flex items-center justify-between text-xs bg-surface-card">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setObsidianNavView('files')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  obsidianNavView === 'files'
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-primary hover:bg-surface-hover'
                }`}
                title="Obsidian Note Reader"
              >
                Notes
              </button>
              <button
                type="button"
                onClick={() => {
                  setObsidianNavView('cards');
                  setCptsDisplayLayout('cards');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  obsidianNavView === 'cards' || (obsidianNavView !== 'files' && cptsDisplayLayout === 'cards')
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-primary hover:bg-surface-hover'
                }`}
                title="Cards Gallery"
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => {
                  setObsidianNavView('index');
                  setCptsDisplayLayout('quick-index');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  obsidianNavView === 'index' || (obsidianNavView !== 'files' && cptsDisplayLayout === 'quick-index')
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-primary hover:bg-surface-hover'
                }`}
                title="Quick Index Table"
              >
                Table
              </button>
            </div>

            <div className="flex items-center gap-0.5 bg-surface-sunken p-0.5 rounded-md border border-subtle">
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberSound('click');
                  setCptsLangMode('en');
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  cptsLangMode === 'en' ? 'bg-accent text-on-accent' : 'text-muted hover:text-primary'
                }`}
                title="English Playbooks"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (soundEnabled) playCyberSound('click');
                  setCptsLangMode('he');
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  cptsLangMode === 'he' ? 'bg-accent text-on-accent' : 'text-muted hover:text-primary'
                }`}
                title="עברית"
              >
                עב
              </button>
            </div>
          </div>

          {/* Tree Body */}
          <div className="flex-1 min-h-[480px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {/* All Field Notes Root Item */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedTreePath(null);
                setSelectedCptsCategory('ALL');
                setSelectedCptsSubCategory('ALL');
                setCptsLimit(30);
              }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                selectedTreePath === null && selectedCptsCategory === 'ALL'
                  ? 'bg-accent-muted text-accent border border-accent/40 font-semibold'
                  : 'text-secondary hover:text-accent hover:bg-surface-hover border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-accent" />
                <span className="font-medium">All Field Notes</span>
              </div>
              <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle">
                {allActiveNotes.length}
              </span>
            </motion.button>

            {/* Tree Items */}
            {cptsFileTree.length === 0 ? (
              <div className="p-4 rounded-lg bg-accent-muted border border-accent/40 text-center space-y-2.5 my-2">
                <FolderOpen className="w-8 h-8 text-accent mx-auto" />
                <div className="text-xs font-semibold text-primary">Vault Empty (0 Notes)</div>
                <p className="text-[10px] text-secondary">
                  Import your notes directory from disk or create a custom note.
                </p>
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playCyberSound('click');
                      setNotesImportModalOpen(true);
                    }}
                    className="w-full py-1.5 px-2.5 rounded bg-accent hover:bg-accent-hover text-on-accent font-semibold text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Import Notes Directory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewNoteInitialDir(undefined);
                      setIsNewCptsModalOpen(true);
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className="w-full py-1.5 px-2.5 rounded bg-surface-card hover:bg-surface-hover text-accent border border-accent/40 text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Custom Note</span>
                  </button>
                </div>
              </div>
            ) : (
              cptsFileTree.map((rootNode) => (
                <CptsTreeItem
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  expandedFolders={expandedTreeFolders}
                  onToggleFolder={handleToggleTreeFolder}
                  selectedPath={selectedTreePath}
                  onSelectFolder={handleSelectTreeFolder}
                  onSelectNote={(note) => {
                    if (soundEnabled) playCyberSound('click');
                    setActiveObsidianNote(note);
                    setObsidianNavView('files');
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsObsidianSidebarOpen(false);
                    }
                  }}
                  onDeleteNote={handleDeleteNoteWithConfirm}
                  onAddNoteToFolder={(folderPath) => {
                    setNewNoteInitialDir(folderPath);
                    setIsNewCptsModalOpen(true);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  cptsLangMode={cptsLangMode}
                  activeNoteId={activeObsidianNote?.id}
                />
              ))
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-2 border-t border-subtle bg-surface-sunken/40 flex flex-col gap-1.5">
            {deletedNoteIds.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreDeletedNotes}
                className="w-full p-1.5 px-2 rounded-lg bg-callout-danger-bg border border-callout-danger-border/40 hover:bg-callout-danger-bg text-callout-danger-fg text-[10px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
                title="Click to restore all deleted field notes"
              >
                <span>↺ {deletedNoteIds.length} Deleted Notes</span>
                <span className="underline">Restore</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setViewMode('tactical');
                setSearchQuery('');
                navigate('/cheatsheets');
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-subtle text-muted hover:text-primary hover:bg-surface-card text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-muted" />
              <span>← Back to snippets</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Area (Obsidian Centerpiece) */}
        <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-subtle bg-surface-card overflow-hidden shadow-sm lg:h-full">
          {obsidianNavView === 'files' ? (
            activeObsidianNote && noteViewerMode === 'docked' ? (
              /* ACTIVE NOTE IN OBSIDIAN WORKSPACE (FULL WIDTH) */
              <div 
                data-testid="docked-note-viewer-pane"
                className="w-full h-full min-h-[600px] flex-1 flex flex-col min-w-0 overflow-hidden"
              >
                {renderWorkspacePanes('docked')}
              </div>
            ) : activeObsidianNote && noteViewerMode === 'modal' ? (
              <div 
                className="w-full h-full min-h-[600px] flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface-card"
              >
                <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-accent/40 flex items-center justify-center text-accent shadow-glow-sm">
                  <Maximize2 className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-semibold text-primary">Note Floating in Modal</h3>
                  <p className="text-xs text-muted">
                    This note is open in a floating dialog. Press <kbd className="px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle font-mono text-[11px]">Alt+M</kbd> or click Dock in the dialog header to restore to workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleViewerMode()}
                  className="px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Dock Note to Workspace
                </button>
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
                  {!isObsidianSidebarOpen && (
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
                      title={isObsidianSidebarOpen ? "Collapse explorer (Ctrl+B)" : "Expand explorer (Ctrl+B)"}
                      aria-label={isObsidianSidebarOpen ? "Collapse explorer" : "Expand explorer"}
                    >
                      <PanelLeft className={`w-4 h-4 ${isObsidianSidebarOpen ? 'text-accent' : 'text-muted'}`} />
                    </button>
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-primary font-semibold">
                      Field manual notes
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted text-accent font-semibold">
                      {selectedCptsCategory === 'ALL'
                        ? allActiveNotes.length > 0
                          ? `All notes (${allActiveNotes.length})`
                          : 'Vault empty'
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
                                setActiveObsidianNote(note);
                                setObsidianNavView('files');
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                  setIsObsidianSidebarOpen(false);
                                }
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
                                    setActiveObsidianNote(note);
                                    setObsidianNavView('files');
                                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                      setIsObsidianSidebarOpen(false);
                                    }
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
                        setActiveObsidianNote(note);
                        setObsidianNavView('files');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setIsObsidianSidebarOpen(false);
                        }
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
      </div>
    );
  };

  const switchBase =
    'inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11';
  const varInputBase =
    'h-9 w-full rounded-md border border-subtle bg-surface-sunken px-2 font-mono text-xs tabular-nums text-primary transition-colors focus:border-accent focus:outline-none sm:h-8';
  const catBase =
    'flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-left text-[13px] transition-colors select-none cursor-pointer lg:min-h-8 lg:w-full';
  const catOn = 'border-accent bg-accent-muted font-medium text-primary lg:border-transparent lg:bg-surface-hover';
  const catOff = 'border-subtle text-secondary hover:bg-surface-hover hover:text-primary lg:border-transparent';

  return (
    <div className={`w-full ${viewMode === 'cpts-manual' ? 'space-y-3 pb-2' : 'space-y-5 pb-12'} text-sm`}>
      <PageHeader
        title={viewMode === 'cpts-manual' ? 'Field manual' : 'Snippets & payloads'}
        icon={viewMode === 'cpts-manual' ? <BookOpen /> : <Terminal />}
        description={
          viewMode === 'tactical'
            ? 'Commands and reverse shells with your LHOST, LPORT and target filled in.'
            : undefined
        }
        className={viewMode === 'cpts-manual' ? 'mb-1' : ''}
        primaryAction={
          viewMode === 'tactical' ? (
            <CyberButton
              variant="primary"
              size="md"
              iconLeft={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsNewModalOpen(true)}
              className="[@media(pointer:coarse)]:h-11"
            >
              Add snippet
            </CyberButton>
          ) : (
            <CyberButton
              variant="primary"
              size="md"
              iconLeft={<Upload className="h-3.5 w-3.5" />}
              title="Import or manage your local private offensive field notes vault (IndexedDB)"
              onClick={() => {
                if (soundEnabled) playCyberSound('click');
                setNotesImportModalOpen(true);
              }}
              className="[@media(pointer:coarse)]:h-11"
            >
              {userNotes.length > 0 ? `Vault (${userNotes.length})` : 'Import notes'}
            </CyberButton>
          )
        }
        overflow={
          viewMode === 'tactical'
            ? [
                {
                  id: 'import-vault',
                  label: 'Import vault',
                  icon: <Upload className="h-4 w-4" />,
                  onSelect: () => {
                    if (soundEnabled) playCyberSound('click');
                    setNotesImportModalOpen(true);
                  },
                },
              ]
            : [
                {
                  id: 'new-note',
                  label: 'New note',
                  icon: <Plus className="h-4 w-4" />,
                  onSelect: () => {
                    setNewNoteInitialDir(undefined);
                    setIsNewCptsModalOpen(true);
                  },
                },
                {
                  id: 'add-snippet',
                  label: 'Add snippet',
                  icon: <Terminal className="h-4 w-4" />,
                  onSelect: () => setIsNewModalOpen(true),
                },
              ]
        }
      >
        <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-3 sm:min-w-0 sm:flex-wrap">
            <div
              role="group"
              aria-label="Library"
              className="inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-sunken p-0.5"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'tactical'}
                onClick={() => {
                  if (viewMode === 'tactical') return;
                  setViewMode('tactical');
                  setSearchQuery('');
                  navigate('/cheatsheets');
                }}
                className={`${switchBase} ${
                  viewMode === 'tactical'
                    ? 'bg-surface-card text-primary'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Snippets</span>
                <span className="tabular-nums text-muted">{cheatsheets.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'cpts-manual'}
                onClick={() => {
                  if (viewMode === 'cpts-manual') return;
                  setViewMode('cpts-manual');
                  navigate('/field-manual');
                }}
                title="Switch to Obsidian Field Manual"
                className={`${switchBase} ${
                  viewMode === 'cpts-manual'
                    ? 'bg-surface-card text-primary'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Field manual</span>
                {viewMode === 'cpts-manual' && (
                  <span className="tabular-nums text-muted">{allActiveNotes.length}</span>
                )}
              </button>
            </div>

            {viewMode === 'cpts-manual' && (userNotes.length > 0 || allActiveNotes.length > 0) && (
              <button
                type="button"
                data-testid="header-delete-notes-btn"
                onClick={handleWipeVaultConfirm}
                className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11 ${
                  confirmWipeVault
                    ? 'border border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg'
                    : 'text-muted hover:bg-callout-danger-bg hover:text-callout-danger-fg'
                }`}
                title={
                  confirmWipeVault
                    ? 'Click again to permanently wipe and delete all notes from local vault'
                    : 'Delete / Wipe all notes from vault'
                }
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {confirmWipeVault
                    ? `Confirm Delete (${allActiveNotes.length || userNotes.length})?`
                    : `Delete (${allActiveNotes.length || userNotes.length})`}
                </span>
              </button>
            )}

            {viewMode === 'cpts-manual' && deletedNoteIds.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreDeletedNotes}
                className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium text-callout-warn-fg transition-[transform,background-color] hover:bg-callout-warn-bg active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11"
                title="Restore deleted notes back to vault"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restore ({deletedNoteIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </PageHeader>

      {viewMode === 'cpts-manual' ? (
        renderObsidianWorkspace()
      ) : (
        <>
          {/* Parameter injection: LHOST / LPORT / target */}
          <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] items-end gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
            <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-lhost-input">
              <span>LHOST</span>
              <input
                type="text"
                id="cheatsheet-lhost-input"
                name="cheatsheet-lhost"
                aria-label="Attacker Host LHOST"
                value={globalVars.lhost}
                onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                className={`${varInputBase} sm:w-32`}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-lport-input">
              <span>LPORT</span>
              <input
                type="text"
                id="cheatsheet-lport-input"
                name="cheatsheet-lport"
                aria-label="Attacker Port LPORT"
                value={globalVars.lport}
                onChange={(e) => setGlobalVars({ lport: e.target.value })}
                className={`${varInputBase} sm:w-20`}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-target-input">
              <span>TARGET</span>
              <input
                type="text"
                id="cheatsheet-target-input"
                name="cheatsheet-target"
                aria-label="Target IP Address"
                value={globalVars.targetIp}
                onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
                className={`${varInputBase} sm:w-32`}
              />
            </label>
          </div>

          {/* Main workspace: categories + commands panel */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">

            {/* Left column: categories */}
            <div className="space-y-1">
              <div className="items-center justify-between px-2 py-1 text-xs font-medium text-muted select-none hidden lg:flex">
                <span>Categories</span>
                <span className="tabular-nums">{cheatsheets.length}</span>
              </div>

              <div className="-mx-4 flex gap-1.5 overflow-x-auto no-scrollbar px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
                {CHEATSHEET_CATEGORIES.map((cat) => {
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
                <div className="relative flex-1">
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

              {/* DEDICATED REVERSE SHELL GENERATOR & PENTESTMONKEY ARSENAL */}
              {(selectedCategory === 'all' || selectedCategory === 'revshell') && !searchQuery && (
                <ReverseShellGenerator />
              )}

              {/* COMMAND SNIPPETS LIST with Scroll Entrance */}
              <div className="space-y-3">
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-subtle bg-surface-card/50 text-muted text-xs">
                    No command snippets matching this query.
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const interpolated = interpolateCommand(cmd.commandTemplate, globalVars);
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

      {/* Authentic Obsidian Personal Note Viewer Modal (Modal Mode) */}
      {activeObsidianNote && noteViewerMode === 'modal' && renderWorkspacePanes('modal')}

      {/* New Custom CPTS Note Modal */}
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
