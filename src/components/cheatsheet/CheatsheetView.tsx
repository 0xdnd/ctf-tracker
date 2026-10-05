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
} from '../../utils/obsidianManualUtils';
import { ObsidianNoteViewer } from './ObsidianNoteViewer';
import { SplitOrientation } from '../../types/workspace';
import { CptsTreeItem } from './CptsTreeItem';
import { NewCptsNoteModal } from './NewCptsNoteModal';
import { ReverseShellGenerator } from './ReverseShellGenerator';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
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
  const [expandedTreeFolders, setExpandedTreeFolders] = useState<Record<string, boolean>>({
    'folder-00 _Methodology': true,
    'folder-01 Information Gathering': true,
    'folder-02 Pre-Exploitation': true,
    'folder-03 Exploitation': true,
    'folder-04 Post-Exploitation': true,
    'folder-05 Lateral Movement': true,
    'folder-06 NetExec': true,
  });
  const [isNewCptsModalOpen, setIsNewCptsModalOpen] = useState(false);
  const [newNoteInitialDir, setNewNoteInitialDir] = useState<string | undefined>(undefined);
  const [cptsDisplayLayout, setCptsDisplayLayout] = useState<CptsDisplayLayout>('cards');
  const [cptsSortOrder, setCptsSortOrder] = useState<CptsSortOrder>('number');
  const [expandedIndexRows, setExpandedIndexRows] = useState<Record<string, boolean>>({});
  const [collapsedGroupSections, setCollapsedGroupSections] = useState<Record<string, boolean>>({});
  const [jumpDropdownOpen, setJumpDropdownOpen] = useState(false);
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
      const noteParam = params.get('note');
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return [found];
      }
    } catch {}
    return [];
  });
  const [activeObsidianNoteId, setActiveObsidianNoteId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(location.search);
      const noteParam = params.get('note');
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return found.id;
      }
    } catch {}
    return null;
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

  // Sync viewMode and activeObsidianNote when route or search query changes
  useEffect(() => {
    if (defaultMode) {
      setViewMode(defaultMode);
    } else if (location.pathname.includes('note') || location.pathname.includes('manual') || location.search.includes('manual') || location.search.includes('cpts')) {
      setViewMode('cpts-manual');
    }

    // Check for direct note opening via query parameter, e.g. ?note=cpts-...
    const params = new URLSearchParams(location.search);
    const noteParam = params.get('note');
    if (noteParam) {
      const found = getNoteById(noteParam, allActiveNotes.length > 0 ? allActiveNotes : undefined) || getNoteById(noteParam);
      if (found) {
        setActiveObsidianNote(found);
        setViewMode('cpts-manual');
      }
    }

    const catParam = params.get('category') || params.get('cat') || params.get('tab');
    if (catParam) {
      setSelectedCategory(catParam);
      setViewMode('tactical');
    }
  }, [defaultMode, location.pathname, location.search]);

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

  // Active Notes Pool (Reconciling user private notes, custom notes, and deleted notes)
  const allActiveNotes = useMemo(() => {
    const deletedSet = new Set(deletedNoteIds);
    const source = userNotes && userNotes.length > 0 ? userNotes : CPTS_NOTES;
    const baseline = source.filter((n) => !deletedSet.has(n.id));
    const activeCustom = customNotes.filter((n) => !deletedSet.has(n.id));
    return [...activeCustom, ...baseline];
  }, [deletedNoteIds, customNotes, userNotes]);

  // Hierarchical Directory Tree & Categories computed from all active notes
  const cptsFileTree = useMemo(() => buildCptsFileTree(allActiveNotes), [allActiveNotes]);
  const cptsCategories = useMemo(() => getCptsCategories(allActiveNotes), [allActiveNotes]);

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
            const popoutUrl = `${window.location.origin}${window.location.pathname}#/field-manual?note=${activeObsidianNote.id}&popout=true`;
            window.open(popoutUrl, `ZeroBoxFieldManual_${activeObsidianNote.id}`, 'width=1100,height=850,menubar=no,status=no,toolbar=no');
          }}
          isSplitView={isSplitView}
          splitOrientation={splitOrientation}
          onToggleSplit={handleToggleSplit}
          onMoveTabToOtherPane={(tabId) => handleMoveTabBetweenPanes(tabId, 'pane-primary')}
          paneId="pane-primary"
          isPaneActive={activePaneId === 'pane-primary'}
          onFocusPane={() => setActivePaneId('pane-primary')}
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
        className="fixed inset-0 w-full h-full min-h-screen bg-surface-sunken font-mono z-[99999] overflow-hidden flex flex-col"
      >
        {renderWorkspacePanes('popout')}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full font-mono pb-12">
      {/* Top Banner & Dynamic Variable Tuning Station */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={TACTICAL_SPRING}
        className="p-4 rounded-xl border border-subtle bg-surface-card dark:backdrop-blur-md machined-edge-subtle shadow-md flex flex-wrap items-center justify-between gap-4"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-primary tracking-wider flex items-center gap-2 select-none">
              {viewMode === 'cpts-manual' ? (
                <>
                  <BookOpen className="w-5 h-5 text-accent" />
                  <span>OFFENSIVE FIELD MANUAL & OBSIDIAN VAULT</span>
                </>
              ) : (
                <>
                  <Terminal className="w-5 h-5 text-callout-info-fg" />
                  <span>DYNAMIC TACTICAL SNIPPETS & PAYLOAD LAB</span>
                </>
              )}
            </h1>

            {/* Mode Switcher / Tactical Pill */}
            {viewMode === 'tactical' ? (
              <div className="flex items-center gap-2 select-none">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan font-mono font-semibold text-xs shadow-sm">
                  <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Tactical Snippets</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyber-cyan/20 text-cyber-cyan text-[10px] font-semibold tabular-nums">
                    {cheatsheets.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('cpts-manual');
                    navigate('/field-manual');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-[transform,background-color,border-color,color] cursor-pointer active:scale-[0.97]"
                  title="Switch to Obsidian Field Manual"
                >
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                  <span>Field Manual Vault →</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playCyberSound('click');
                    setNotesImportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent/40 bg-accent-muted hover:bg-accent-muted text-accent text-xs font-semibold transition-[transform,box-shadow,background-color,border-color,color] shadow-sm cursor-pointer active:scale-[0.97]"
                  title="Import your Obsidian Vault (.ZIP or folder)"
                >
                  <Upload className="w-3.5 h-3.5 text-accent" />
                  <span>Import Vault</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-subtle text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('tactical');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1 rounded font-semibold transition-[transform,color] flex items-center gap-1.5 text-muted hover:text-primary cursor-pointer active:scale-[0.97]"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Tactical Snippets (<span className="tabular-nums">{cheatsheets.length}</span>)</span>
                </button>
                <div className="px-3 py-1 rounded font-semibold flex items-center gap-1.5 bg-accent text-on-accent shadow-md shadow-accent/40">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Offensive Field Manual (<span className="tabular-nums">{allActiveNotes.length}</span>)</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playCyberSound('click');
                    setNotesImportModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-accent-muted hover:bg-accent-muted text-accent border border-accent/40 hover:border-accent/40 transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.97]"
                  title="Import or manage your local private offensive field notes vault (IndexedDB)"
                >
                  <Upload className="w-3 h-3 text-accent" />
                  <span>{userNotes.length > 0 ? `Vault (${userNotes.length})` : 'Import Notes'}</span>
                </button>

                {(userNotes.length > 0 || allActiveNotes.length > 0) && (
                  <button
                    type="button"
                    data-testid="header-delete-notes-btn"
                    onClick={handleWipeVaultConfirm}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1.5 shadow-sm border cursor-pointer active:scale-[0.97] ${
                      confirmWipeVault
                        ? 'bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border font-semibold animate-pulse'
                        : 'bg-callout-danger-bg hover:bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border hover:border-callout-danger-border'
                    }`}
                    title={
                      confirmWipeVault
                        ? 'Click again to permanently wipe and delete all notes from local vault'
                        : 'Delete / Wipe all notes from vault'
                    }
                  >
                    <Trash2 className="w-3 h-3 text-callout-danger-fg" />
                    <span>
                      {confirmWipeVault
                        ? `Confirm Delete (${allActiveNotes.length || userNotes.length})?`
                        : `Delete (${allActiveNotes.length || userNotes.length})`}
                    </span>
                  </button>
                )}

                {deletedNoteIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreDeletedNotes}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-callout-warn-bg hover:bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border hover:border-callout-warn-border transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.97]"
                    title="Restore deleted notes back to vault"
                  >
                    <RotateCcw className="w-3 h-3 text-callout-warn-fg" />
                    <span>Restore ({deletedNoteIds.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-muted">
            {viewMode === 'tactical'
              ? 'Real-time parameter injection across network scanning, web exploitation, Active Directory, and reverse shells.'
              : allActiveNotes.length > 0
              ? `Private local vault active (${allActiveNotes.length} notes) with dynamic parameter injection and Obsidian Markdown reading view.`
              : 'Private local-first field manual. Import your Obsidian vault JSON to access playbooks and commands with 0 network leakage.'}
          </p>
        </div>

        {/* Global Parameter Quick Tuning */}
        <div className="flex flex-wrap items-center gap-2 bg-surface-card p-1.5 px-3 rounded-lg border border-subtle text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[10px]">LHOST:</span>
            <input
              type="text"
              id="cheatsheet-lhost-input"
              name="cheatsheet-lhost"
              aria-label="Attacker Host LHOST"
              value={globalVars.lhost}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              className="font-mono w-28 bg-surface-card px-2 py-1 rounded border border-strong text-primary text-xs font-semibold tabular-nums focus:outline-none focus:border-cyber-cyan transition-[box-shadow,background-color,border-color,color] shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[10px]">LPORT:</span>
            <input
              type="text"
              id="cheatsheet-lport-input"
              name="cheatsheet-lport"
              aria-label="Attacker Port LPORT"
              value={globalVars.lport}
              onChange={(e) => setGlobalVars({ lport: e.target.value })}
              className="font-mono w-16 bg-surface-card px-2 py-1 rounded border border-strong text-primary text-xs font-semibold tabular-nums focus:outline-none focus:border-cyber-cyan transition-[box-shadow,background-color,border-color,color] shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[10px]">TARGET:</span>
            <input
              type="text"
              id="cheatsheet-target-input"
              name="cheatsheet-target"
              aria-label="Target IP Address"
              value={globalVars.targetIp}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              className="font-mono w-28 bg-surface-card px-2 py-1 rounded border border-strong text-callout-success-fg font-semibold text-xs tabular-nums focus:outline-none focus:border-callout-success-border transition-[box-shadow,background-color,border-color,color] shadow-sm"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 rounded bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black font-semibold transition-[box-shadow,background-color,border-color,color] ml-1 shadow-glow-cyan/20 cursor-pointer active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Snippet
          </motion.button>
        </div>
      </motion.div>

      {/* Main Cheatsheet Workspace: Sidebar Categories + Commands Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        
        {/* Left Column: Categories & Filters */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-subtle bg-surface-card shadow-md space-y-1 overflow-hidden">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted flex items-center justify-between select-none">
              <span>{viewMode === 'tactical' ? 'TACTICAL CATEGORIES' : 'FIELD MANUAL CATEGORIES'}</span>
              <span className="text-cyber-cyan font-mono font-semibold">{viewMode === 'tactical' ? cheatsheets.length : CPTS_NOTES.length}</span>
            </div>

            {viewMode === 'tactical' ? (
              <>
                {CHEATSHEET_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left relative select-none ${
                        isSelected
                          ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/40 font-semibold shadow-sm'
                          : 'text-secondary hover:text-primary hover:bg-surface-elevated border border-transparent'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                    </motion.button>
                  );
                })}

                <div className="pt-2 border-t border-subtle space-y-1">
                  <motion.button
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory('starred')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors text-left select-none ${
                      selectedCategory === 'starred'
                        ? 'bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border font-semibold shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-surface-elevated border border-transparent'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 text-callout-warn-fg fill-callout-warn-fg/20" />
                    <span>Starred Snippets</span>
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                {/* CPTS Field Manual Tree Explorer Header & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-accent/40">
                  <span className="text-[10px] text-accent font-semibold tracking-wider flex items-center gap-1.5 flex-shrink-0">
                    <FolderOpen className="w-3.5 h-3.5 text-accent" />
                    <span>TREE EXPLORER</span>
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExpandAllTreeFolders}
                      className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-accent-muted text-accent border border-strong text-[9px] font-mono hover:text-accent transition-colors cursor-pointer"
                      title="Expand all nested folders"
                    >
                      + All
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAllTreeFolders}
                      className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-accent-muted text-accent border border-strong text-[9px] font-mono hover:text-accent transition-colors cursor-pointer"
                      title="Collapse all folders"
                    >
                      - All
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewCptsModalOpen(true)}
                      className="px-2 py-0.5 rounded bg-accent hover:bg-accent-hover text-on-accent border border-accent text-[10px] font-semibold transition-[box-shadow,background-color,border-color,color] flex items-center gap-1 cursor-pointer flex-shrink-0 shadow-sm"
                      title="Create custom field manual note"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Note</span>
                    </button>
                  </div>
                </div>

                {/* "All Notes" Root Item */}
                <motion.button
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTreePath(null);
                    setSelectedCptsCategory('ALL');
                    setSelectedCptsSubCategory('ALL');
                    setCptsLimit(30);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    selectedTreePath === null && selectedCptsCategory === 'ALL'
                      ? 'bg-accent-muted text-accent border border-accent/40 font-semibold shadow-md'
                      : 'text-secondary hover:text-accent hover:bg-surface-elevated border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    <span>All Field Notes</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover border border-strong text-primary">
                    {allActiveNotes.length}
                  </span>
                </motion.button>

                {/* Restore Banner if any notes were deleted */}
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

                {/* Recursive Multi-Level Tree Explorer (Depths 1 to 6) */}
                <div className="space-y-0.5 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
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
                          className="w-full py-1.5 px-2.5 rounded bg-accent hover:bg-accent-hover text-on-accent font-semibold text-[10px] transition-[box-shadow,background-color,border-color,color] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
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
                          className="w-full py-1.5 px-2.5 rounded bg-surface-card hover:bg-accent-muted text-accent border border-accent/40 text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                        }}
                        onDeleteNote={handleDeleteNoteWithConfirm}
                        onAddNoteToFolder={(folderPath) => {
                          setNewNoteInitialDir(folderPath);
                          setIsNewCptsModalOpen(true);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        cptsLangMode={cptsLangMode}
                      />
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('tactical');
                      setSearchQuery('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-subtle text-muted hover:text-primary hover:bg-surface-sunken text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>← Back to Tactical Snippets</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Cheatsheet & Reverse Shell Builder OR CPTS Field Manual */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* SEARCH & REVSHELL SWITCHER */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
              <input
                type="text"
                id="cheatsheet-search-input"
                name="cheatsheet-search"
                aria-label="Search cheatsheets and field manual notes"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCptsLimit(30);
                }}
                placeholder={
                  viewMode === 'tactical'
                    ? 'Search commands, flags, tools (e.g. nmap, ffuf, bloodhound, impacket)...'
                    : allActiveNotes.length > 0
                    ? `Search ${allActiveNotes.length} field manual notes, tags, summaries, and commands (e.g. kerberoast, suid, bloodhound)...`
                    : 'Search field manual notes and commands...'
                }
                className="w-full pl-9 pr-4 py-2 bg-surface-card border border-strong rounded-lg text-xs text-primary placeholder:text-muted focus:outline-none focus:border-cyber-cyan transition-[box-shadow,background-color,border-color,color] shadow-sm"
              />
              {searchQuery && (
                <button aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-muted hover:text-primary"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* VIEW MODE 1: TACTICAL CHEATSHEETS */}
          {viewMode === 'tactical' && (
            <>
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
                        whileHover={{ y: -2 }}
                        className="cyber-snippet-contain p-3.5 rounded-xl border border-subtle bg-surface-card hover:border-cyber-cyan/40 hover:shadow-glow-cyan/15 transition-[box-shadow,background-color,border-color,color] shadow-sm group"
                      >
                        {/* Snippet Header */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary text-sm group-hover:text-cyber-cyan transition-colors">
                                {cmd.title}
                              </span>
                              {cmd.isCustom && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-semibold">
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
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleStarCommand(cmd.id)}
                              className="p-1 rounded text-muted hover:text-cyber-amber transition-colors"
                              title="Bookmark / Star Snippet"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  cmd.isStarred ? 'fill-cyber-amber text-cyber-amber' : ''
                                }`}
                              />
                            </motion.button>

                            {cmd.isCustom && (
                              <motion.button
                                whileHover={{ scale: 1.15 }}
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
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-xs ${
                                isCopied
                                  ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald'
                                  : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-cyber-cyan'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-cyber-emerald" />
                                  <span className="text-cyber-emerald">Copied!</span>
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
                          <pre className="p-3 rounded-lg bg-cyber-code border border-subtle text-xs text-white overflow-x-auto whitespace-pre-wrap break-all font-mono select-all">
                            {interpolated}
                          </pre>
                        </div>

                        {/* Tags */}
                        {cmd.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cmd.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-cyber-cyan"
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
            </>
          )}

          {/* VIEW MODE 2: CPTS FIELD MANUAL (HIERARCHICAL TOPIC NAVIGATION & ANTI-SCROLL MODES) */}
          {viewMode === 'cpts-manual' && (
            <div className="space-y-4">
              {/* Field Manual HUD Header with Jump Dropdown, Layout Mode, and Bilingual Switcher */}
              <div className="p-3.5 rounded-xl border border-accent/40 bg-accent-muted space-y-3 text-xs">
                {/* HUD Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-primary font-semibold tracking-wide">
                      OFFENSIVE FIELD MANUAL & CHEATS
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted text-accent font-mono">
                      {selectedCptsCategory === 'ALL'
                        ? allActiveNotes.length > 0
                          ? `ALL NOTES (${allActiveNotes.length})`
                          : 'VAULT EMPTY (0 NOTES)'
                        : selectedCptsCategory.toUpperCase()}
                    </span>
                    {selectedCptsSubCategory !== 'ALL' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-accent-muted border border-accent/40 text-accent font-mono flex items-center gap-1">
                        <span>📁 {selectedCptsSubCategory}</span>
                        <button aria-label="Clear subcategory filter"
                          type="button"
                          onClick={() => setSelectedCptsSubCategory('ALL')}
                          className="hover:text-accent text-accent ml-1 font-semibold"
                          title="Clear subcategory filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Controls Capsule */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Jump to Note Combobox */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setJumpDropdownOpen((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-surface-card border border-accent/40 text-accent hover:text-accent hover:border-accent/40 text-xs flex items-center gap-1.5 font-semibold transition-[box-shadow,background-color,border-color,color] shadow-sm"
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
                          <div className="absolute right-0 top-full mt-1.5 w-80 max-h-96 rounded-xl border border-accent/50 bg-surface-card/95 backdrop-blur-md shadow-2xl p-2 z-50 space-y-2 animate-fade-in font-mono">
                            <input
                              id="cpts-jump-search-input"
                              name="cpts-jump-search"
                              aria-label="Type note name, tag, or tool"
                              type="text"
                              autoFocus
                              value={jumpSearchQuery}
                              onChange={(e) => setJumpSearchQuery(e.target.value)}
                              placeholder="Type note name, tag, or tool..."
                              className="w-full bg-surface-card px-2.5 py-1.5 rounded-lg border border-accent/40 text-primary text-xs focus:outline-none focus:border-accent/40"
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
                                         if (soundEnabled) playCyberSound('root');
                                       }}
                                       className="flex-1 text-left px-1.5 py-1 rounded transition-colors flex flex-col min-w-0 cursor-pointer"
                                       title="Open full Obsidian note"
                                     >
                                       <div className="flex items-center justify-between gap-1">
                                         <span className="text-primary text-xs font-semibold group-hover:text-accent truncate flex-1">
                                           {note.titleEn || note.title}
                                         </span>
                                         <span className="text-[9px] font-mono px-1 rounded bg-surface-sunken text-accent flex-shrink-0">
                                           {note.category.split(' ')[0]}
                                         </span>
                                       </div>
                                       <span className="text-[10px] text-muted truncate block">
                                         {note.subCategory || note.category}
                                       </span>
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => handleJumpToNote(note)}
                                       className="px-2 py-1 rounded bg-surface-sunken border border-accent/30 text-accent hover:text-primary hover:bg-accent/60 text-[10px] font-mono flex-shrink-0 cursor-pointer"
                                       title="Scroll to note in page"
                                     >
                                       Jump
                                     </button>
                                   </div>
                                 ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sort Order Selector: Number Order / Topic / Title */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('number');
                          setSelectedTreePath(null);
                          setSelectedCptsCategory('ALL');
                          setSelectedCptsSubCategory('ALL');
                          setCptsLimit(30);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          cptsSortOrder === 'number'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Sort notes strictly by numerical sequence (00.01 to 06.xx) flat across all folders"
                      >
                        <Hash className="w-3.5 h-3.5 text-callout-warn-fg" />
                        <span>Number Order</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('topic');
                          setCptsLimit(30);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          cptsSortOrder === 'topic'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Group and filter by topic folders"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>By Topic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCptsSortOrder('title');
                          setCptsLimit(30);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          cptsSortOrder === 'title'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Sort notes alphabetically by title"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>A → Z</span>
                      </button>
                    </div>

                    {/* Display Layout Switcher */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        onClick={() => setCptsDisplayLayout('cards')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                          cptsDisplayLayout === 'cards'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Detailed cards view with expanded summaries and code blocks"
                      >
                        <LayoutList className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCptsDisplayLayout('quick-index')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                          cptsDisplayLayout === 'quick-index'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Ultra-compact terminal index table - view 50+ notes without scrolling"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Quick Index</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCptsDisplayLayout('grouped')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                          cptsDisplayLayout === 'grouped'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Grouped by Obsidian topic folders"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Grouped</span>
                      </button>
                    </div>

                    {/* Note Pane Docked / Modal layout toggle */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        data-testid="hud-toggle-dock-mode"
                        onClick={() => {
                          if (soundEnabled) playCyberSound('click');
                          handleToggleViewerMode();
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                          noteViewerMode === 'docked'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title={noteViewerMode === 'docked' ? "Docked side-by-side mode active · Click to switch to floating modal" : "Floating modal mode active · Click to switch to docked side-by-side"}
                      >
                        <PanelRight className="w-3.5 h-3.5 text-callout-info-fg" />
                        <span className="hidden md:inline">{noteViewerMode === 'docked' ? 'Docked Pane' : 'Floating Modal'}</span>
                      </button>
                    </div>

                    {/* 2-Way Language Selector: English or Hebrew */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        data-testid="cpts-lang-en"
                        onClick={() => {
                          if (soundEnabled) playCyberSound('click');
                          setCptsLangMode('en');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          cptsLangMode === 'en'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="English notes only"
                      >
                        <span>🇬🇧 EN</span>
                      </button>
                      <button
                        type="button"
                        data-testid="cpts-lang-he"
                        onClick={() => {
                          if (soundEnabled) playCyberSound('click');
                          setCptsLangMode('he');
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          cptsLangMode === 'he'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="עברית בלבד"
                      >
                        <span>🇮🇱 עב</span>
                      </button>
                    </div>

                    {/* RTL / LTR Direction Selector */}
                    <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-accent/40 text-xs">
                      <button
                        type="button"
                        onClick={() => setNotesTextDirection('auto')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                          notesTextDirection === 'auto'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Auto direction based on language"
                      >
                        <span>Auto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesTextDirection('ltr')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                          notesTextDirection === 'ltr'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Force Left-to-Right layout"
                      >
                        <span>LTR ➔</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesTextDirection('rtl')}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                          notesTextDirection === 'rtl'
                            ? 'bg-accent text-on-accent shadow-md shadow-accent/40'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Force Right-to-Left layout (עברית)"
                      >
                        <span>⬅️ RTL</span>
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

                {/* Top Interactive Topic Filter Chips Bar */}
                {activeCategoryTopicGroups.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-accent/30">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      <span className="text-[10px] text-accent font-semibold tracking-wider flex-shrink-0 flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        <span>TOPICS:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCptsSubCategory('ALL');
                          setCptsLimit(30);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 transition-colors ${
                          selectedCptsSubCategory === 'ALL'
                            ? 'bg-accent text-on-accent shadow-sm'
                            : 'bg-surface-elevated border border-strong text-secondary hover:text-primary'
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
                                ? 'bg-accent text-on-accent shadow-md shadow-accent/40 border border-accent/40'
                                : 'bg-surface-elevated border border-strong text-secondary hover:text-accent hover:border-accent/40'
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

                    {/* Sub-Topic Leaf Pills */}
                    {selectedCptsSubCategory !== 'ALL' && activeTopicLeaves.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pl-6 scrollbar-thin">
                        <span className="text-[9px] text-muted font-mono flex-shrink-0">
                          SUB-LEAVES:
                        </span>
                        {activeTopicLeaves.map((leaf) => (
                          <button
                            key={leaf.leaf}
                            type="button"
                            onClick={() => {
                              setSelectedCptsSubCategory(leaf.leaf);
                              setCptsLimit(30);
                            }}
                            className="px-2 py-0.2 rounded text-[10px] font-mono bg-accent-muted border border-accent/40 text-accent hover:text-accent hover:border-accent/40 transition-colors flex-shrink-0"
                          >
                            {leaf.leaf} ({leaf.count})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Telemetry Count */}
                <div className="flex items-center justify-between text-[11px] text-muted font-mono pt-1">
                  <div>
                    Showing <strong className="text-accent">{visibleCptsNotes.length}</strong> of <strong className="text-primary">{filteredCptsNotes.length}</strong> notes (<strong className="text-cyber-cyan">{totalCptsCommands}</strong> total commands)
                  </div>
                  {cptsDisplayLayout === 'quick-index' && (
                    <span className="text-accent text-[10px]">
                      ⚡ Terminal Quick Index Active · 1-Click Inline Command Expansion
                    </span>
                  )}
                </div>
              </div>

              {/* Main Content Area: Split View when Note is Docked, Full Width otherwise */}
              <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
                {/* Left Column: Index Table / Grouped List / Cards */}
                <div className={`w-full ${activeObsidianNote && noteViewerMode === 'docked' ? (isDockedMaximized ? 'hidden' : 'lg:w-[48%] xl:w-[42%] min-w-0') : 'w-full'} space-y-4`}>
                  {/* VIEW RENDERER 1: QUICK INDEX TABLE MODE (High-Density Anti-Scroll Table) */}
                  {cptsDisplayLayout === 'quick-index' && (
                <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-surface-sunken/95 border-b border-subtle text-muted text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 w-48">TOPIC / FOLDER</th>
                          <th className="py-2.5 px-3">TITLE / OBJECTIVE</th>
                          <th className="py-2.5 px-3 w-28 text-center">STAGE / LEVEL</th>
                          <th className="py-2.5 px-3 w-32 text-center">COMMANDS</th>
                          <th className="py-2.5 px-3 w-28 text-right pr-4">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle/40">
                        {allActiveNotes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center">
                              <div className="space-y-3 max-w-md mx-auto">
                                <div className="text-primary font-semibold text-sm">Vault Empty (0 Notes Loaded)</div>
                                <p className="text-secondary text-xs">
                                  ZeroBox keeps notes 100% client-side in browser IndexedDB. Import your personal Obsidian notes JSON to populate this quick index.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (soundEnabled) playCyberSound('click');
                                    setNotesImportModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent font-semibold rounded-lg text-xs font-mono inline-flex items-center gap-2 transition-[box-shadow,background-color,border-color,color] cursor-pointer shadow-md"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Import Notes Vault (.json)</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : visibleCptsNotes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-secondary text-xs">
                              No field manual notes matching "{searchQuery}".
                            </td>
                          </tr>
                        ) : (
                          visibleCptsNotes.map((note, idx) => {
                            const isRowExpanded = Boolean(expandedIndexRows[note.id]);
                            const { group, leaf } = parseSubCategory(note.subCategory);
                            const isHighlighted = highlightedNoteId === note.id;
                            const isRtl = notesTextDirection === 'rtl' || (notesTextDirection === 'auto' && cptsLangMode === 'he');

                            return (
                              <React.Fragment key={note.id}>
                                <tr
                                  id={`cpts-note-${note.id}`}
                                  className={`transition-colors hover:bg-accent/20 ${
                                    isHighlighted
                                      ? 'bg-accent/25 ring-1 ring-accent'
                                      : idx % 2 === 0
                                      ? 'bg-surface-card/50'
                                      : 'bg-surface-sunken/30'
                                  }`}
                                >
                                  {/* Sequential Index */}
                                  <td className="py-2.5 px-3 text-center text-muted text-[11px] font-mono">
                                    {String(idx + 1).padStart(2, '0')}
                                  </td>

                                  {/* Topic Folder */}
                                  <td className="py-2.5 px-3 font-mono">
                                    <div
                                      className="text-[11px] text-accent font-semibold truncate max-w-[180px]"
                                      title={note.subCategory || group}
                                    >
                                      📁 {group}
                                    </div>
                                    {leaf && leaf !== group && (
                                      <div className="text-[9px] text-muted truncate max-w-[180px]">
                                        › {leaf}
                                      </div>
                                    )}
                                  </td>

                                  {/* Title & Objective */}
                                  <td className="py-2.5 px-3">
                                    <div dir={isRtl ? 'rtl' : 'ltr'} className={isRtl ? 'text-right' : 'text-left'}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (soundEnabled) playCyberSound('click');
                                          setActiveObsidianNote(note);
                                        }}
                                        className="font-semibold text-primary text-xs hover:text-accent transition-colors inline-flex items-center gap-1.5 cursor-pointer text-left"
                                        title={cptsLangMode === 'he' ? "פתח הערה באובסידיאן" : "Open authentic Obsidian note"}
                                        dir={cptsLangMode === 'he' ? 'rtl' : 'ltr'}
                                      >
                                        <BookOpen className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                        <span>
                                          {cptsLangMode === 'he'
                                            ? note.titleHe || note.title
                                            : note.titleEn || note.title}
                                        </span>
                                        {formatNoteNumberBadge(note) && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border font-mono font-semibold">
                                            #{formatNoteNumberBadge(note)}
                                          </span>
                                        )}
                                      </button>
                                      <div
                                        className={`text-[10px] text-muted truncate max-w-md mt-0.5 ${
                                          cptsLangMode === 'he' ? 'font-sans text-right' : 'text-left'
                                        }`}
                                        dir={cptsLangMode === 'he' ? 'rtl' : 'ltr'}
                                      >
                                        {cptsLangMode === 'he'
                                          ? note.heSummary || note.summary || note.subCategory
                                          : note.enSummary || note.summary || note.subCategory}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Stage / Difficulty */}
                                  <td className="py-2.5 px-3 text-center">
                                    {note.stage ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-callout-info-bg text-callout-info-fg border border-callout-info-border">
                                        {note.stage}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-muted">
                                        {note.difficulty || 'Core'}
                                      </span>
                                    )}
                                  </td>

                                  {/* Commands Count & Inline Toggle */}
                                  <td className="py-2.5 px-3 text-center">
                                    {note.commands && note.commands.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedIndexRows((prev) => ({ ...prev, [note.id]: !prev[note.id] }))
                                        }
                                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                                          isRowExpanded
                                            ? 'bg-accent text-on-accent shadow-sm'
                                            : 'bg-accent-muted border border-accent/40 text-accent hover:bg-accent-muted'
                                        }`}
                                      >
                                        <span>
                                          {isRowExpanded ? '▴' : '▾'} {note.commands.length} cmd
                                          {note.commands.length > 1 ? 's' : ''}
                                        </span>
                                      </button>
                                    ) : (
                                      <span className="text-muted text-[10px]">Doc only</span>
                                    )}
                                  </td>

                                  {/* Quick Action: Open Note & Copy All */}
                                  <td className="py-2.5 px-3 text-right pr-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (soundEnabled) playCyberSound('click');
                                          setActiveObsidianNote(note);
                                        }}
                                        className="px-2 py-1 rounded text-[10px] font-semibold bg-accent-muted border border-accent/40 text-accent hover:text-accent hover:bg-accent-muted transition-colors inline-flex items-center gap-1 cursor-pointer"
                                        title="Open Obsidian personal note"
                                      >
                                        <BookOpen className="w-2.5 h-2.5" />
                                        <span>Note</span>
                                      </button>
                                      {note.commands && note.commands.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyAllNoteCommands(note)}
                                          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                            copiedId === `all-${note.id}`
                                              ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald'
                                              : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-accent/40'
                                          }`}
                                          title="Copy all commands in note"
                                        >
                                          {copiedId === `all-${note.id}` ? (
                                            <>
                                              <Check className="w-3 h-3 text-cyber-emerald" />
                                              <span>Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span>Copy All</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                      <button aria-label="Delete field note"
                                        type="button"
                                        onClick={() => handleDeleteNoteWithConfirm(note.id, note.titleEn || note.title)}
                                        className="p-1 rounded text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg transition-colors cursor-pointer"
                                        title="Delete field note"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Inline Expanded Terminal Commands */}
                                {isRowExpanded && note.commands && note.commands.length > 0 && (
                                  <tr className="bg-surface-sunken border-y border-accent/40">
                                    <td colSpan={6} className="p-3 pl-10 pr-4 space-y-2">
                                      <div className="flex items-center justify-between text-[10px] text-accent font-semibold border-b border-accent/30 pb-1">
                                        <span>COMMANDS FOR: {note.titleEn || note.title}</span>
                                        <span>{note.commands.length} EXECUTABLES</span>
                                      </div>
                                      <div className="space-y-1.5" dir="ltr">
                                        {note.commands.map((cmd, cIdx) => {
                                          const interpolated = interpolateCommand(cmd, globalVars);
                                          const cmdId = `${note.id}-${cIdx}`;
                                          const isCopied = copiedId === cmdId;
                                          return (
                                            <div
                                              key={cIdx}
                                              className="flex items-center justify-between gap-2 p-1.5 px-2 rounded bg-cyber-code border border-accent/30 text-xs font-mono"
                                            >
                                              <pre className="text-cyber-cyan overflow-x-auto whitespace-pre-wrap break-all flex-1 select-all">
                                                {interpolated}
                                              </pre>
                                              <button
                                                type="button"
                                                onClick={() => handleCopy(interpolated, cmdId)}
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 transition-colors ${
                                                  isCopied
                                                    ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald'
                                                    : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-cyber-cyan'
                                                }`}
                                              >
                                                {isCopied ? (
                                                  <Check className="w-2.5 h-2.5 text-cyber-emerald" />
                                                ) : (
                                                  <Copy className="w-2.5 h-2.5" />
                                                )}
                                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW RENDERER 2: GROUPED VIEW (Accordion Folders by Topic) */}
              {cptsDisplayLayout === 'grouped' && (
                <div className="space-y-4">
                  {allActiveNotes.length === 0 ? (
                    <div className="p-5 sm:p-6 text-center rounded-xl border border-dashed border-subtle bg-surface-card/60 space-y-3 max-w-lg mx-auto my-4 shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center mx-auto text-cyber-cyan shadow-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-cyber-text tracking-wide font-mono">
                          Private Local-First Field Manual Vault
                        </h3>
                        <p className="text-xs text-muted font-normal leading-relaxed">
                          ZeroBox keeps notes 100% private. Notes are never bundled or published online. Import your personal Obsidian vault export to access your offensive playbooks, methodologies, and commands offline.
                        </p>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playCyberSound('click');
                            setNotesImportModalOpen(true);
                          }}
                          className="px-4 py-2 bg-cyber-cyan hover:opacity-90 text-black font-semibold rounded-lg text-xs font-mono transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Your Notes Vault (.json)</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-muted font-mono flex items-center justify-center gap-1.5 pt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyber-emerald" />
                        <span>IndexedDB Browser Sandbox · 0 Network Calls · 0 Data Leakage</span>
                      </div>
                    </div>
                  ) : groupedCptsNotes.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-accent/40 bg-accent-muted text-secondary text-xs">
                      No field manual notes matching "{searchQuery}".
                    </div>
                  ) : (
                    groupedCptsNotes.map((grp) => {
                      const isCollapsed = Boolean(collapsedGroupSections[grp.group]);
                      return (
                        <div
                          key={grp.group}
                          className="rounded-xl border border-accent/30 bg-surface-card overflow-hidden shadow-md"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedGroupSections((prev) => ({ ...prev, [grp.group]: !prev[grp.group] }))
                            }
                            className="w-full p-3 bg-accent/30 hover:bg-accent/40 border-b border-accent/30 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-accent" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-accent" />
                              )}
                              <span className="font-semibold text-primary text-sm">📁 {grp.group}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-hover border border-accent/40 text-accent">
                                {grp.count} notes
                              </span>
                            </div>
                            <span className="text-[11px] text-muted font-mono">
                              {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                            </span>
                          </button>

                          {!isCollapsed && (
                            <div className="p-3 space-y-3">
                              {grp.notes.map((note) => {
                                const isNoteExpanded = Boolean(expandedNotes[note.id]);
                                const commandsToShow = isNoteExpanded
                                  ? note.commands
                                  : note.commands
                                  ? note.commands.slice(0, 2)
                                  : [];
                                const extraCommandsCount = note.commands
                                  ? Math.max(0, note.commands.length - 2)
                                  : 0;
                                const isRtlCard =
                                  notesTextDirection === 'rtl' ||
                                  (notesTextDirection === 'auto' && cptsLangMode === 'he');
                                const isHighlighted = highlightedNoteId === note.id;

                                return (
                                  <div
                                    key={note.id}
                                    id={`cpts-note-${note.id}`}
                                    dir={isRtlCard ? 'rtl' : 'ltr'}
                                    className={`p-3.5 rounded-xl border border-subtle bg-surface-sunken/40 hover:border-accent/50 hover:shadow-lg transition-[box-shadow,background-color,border-color,color] space-y-2.5 group ${
                                      isRtlCard ? 'text-right' : 'text-left'
                                    } ${isHighlighted ? 'ring-2 ring-accent bg-accent/30' : ''}`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1 flex-1 min-w-0">
                                         <button
                                           type="button"
                                           onClick={() => {
                                             if (soundEnabled) playCyberSound('click');
                                             setActiveObsidianNote(note);
                                           }}
                                            className="font-semibold text-primary text-xs group-hover:text-accent transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                            title={cptsLangMode === 'he' ? "פתח הערה באובסידיאן" : "Open authentic Obsidian note"}
                                            dir={cptsLangMode === 'he' ? 'rtl' : 'ltr'}
                                          >
                                            <BookOpen className="w-3 h-3 text-accent flex-shrink-0" />
                                            <span>
                                              {cptsLangMode === 'he'
                                                ? note.titleHe || note.title
                                                : note.titleEn || note.title}
                                            </span>
                                          </button>
                                          <p
                                            className={`text-[11px] text-muted line-clamp-2 ${
                                              cptsLangMode === 'he' ? 'font-sans text-right' : 'text-left'
                                            }`}
                                            dir={cptsLangMode === 'he' ? 'rtl' : 'ltr'}
                                          >
                                            {cptsLangMode === 'he'
                                              ? note.heSummary || note.summary || note.subCategory
                                              : note.enSummary || note.summary || note.subCategory}
                                          </p>
                                       </div>
                                       <div className="flex items-center gap-1.5 flex-shrink-0">
                                         <button
                                           type="button"
                                           onClick={() => {
                                             if (soundEnabled) playCyberSound('click');
                                             setActiveObsidianNote(note);
                                           }}
                                           className="px-2 py-1 rounded text-[10px] font-semibold bg-accent-muted border border-accent/40 text-accent hover:text-accent hover:bg-accent-muted transition-colors flex items-center gap-1 cursor-pointer"
                                           title="Open Obsidian personal note"
                                         >
                                           <BookOpen className="w-2.5 h-2.5" />
                                           <span>Note</span>
                                         </button>
                                         {note.commands && note.commands.length > 0 && (
                                           <button
                                             type="button"
                                             onClick={() => handleCopyAllNoteCommands(note)}
                                             className="px-2 py-1 rounded text-[10px] font-semibold bg-surface-elevated border border-strong text-accent hover:text-accent hover:border-accent/40 transition-colors flex items-center gap-1 cursor-pointer"
                                           >
                                             <Copy className="w-3 h-3" />
                                             <span>Copy All ({note.commands.length})</span>
                                           </button>
                                         )}
                                          <button aria-label="Delete field note"
                                            type="button"
                                            onClick={() => handleDeleteNoteWithConfirm(note.id, note.titleEn || note.title)}
                                            className="p-1 rounded text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg border border-subtle hover:border-callout-danger-border/50 transition-colors cursor-pointer"
                                            title="Delete field note"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                       </div>
                                    </div>

                                    {/* Commands preview */}
                                    {commandsToShow && commandsToShow.length > 0 && (
                                      <div className="space-y-1 pt-1 text-left" dir="ltr">
                                        {commandsToShow.map((cmd, cIdx) => {
                                          const interpolated = interpolateCommand(cmd, globalVars);
                                          return (
                                            <div
                                              key={cIdx}
                                              className="p-1.5 px-2 rounded bg-cyber-code border border-subtle text-xs font-mono text-cyber-cyan truncate select-all"
                                            >
                                              {interpolated}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VIEW RENDERER 3: DETAILED CARDS MODE (Default) */}
              {cptsDisplayLayout === 'cards' && (
                <div className="space-y-3">
                  {allActiveNotes.length === 0 ? (
                    <div className="p-5 sm:p-6 text-center rounded-xl border border-dashed border-subtle bg-surface-card/60 space-y-3 max-w-lg mx-auto my-4 shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center mx-auto text-cyber-cyan shadow-xs">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-cyber-text tracking-wide font-mono">
                          Private Local-First Field Manual Vault
                        </h3>
                        <p className="text-xs text-muted font-normal leading-relaxed">
                          ZeroBox keeps notes 100% private. Notes are never bundled or published online. Import your personal Obsidian vault export to access your offensive playbooks, methodologies, and commands offline.
                        </p>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playCyberSound('click');
                            setNotesImportModalOpen(true);
                          }}
                          className="px-4 py-2 bg-cyber-cyan hover:opacity-90 text-black font-semibold rounded-lg text-xs font-mono transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Import Your Notes Vault (.json)</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-muted font-mono flex items-center justify-center gap-1.5 pt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyber-emerald" />
                        <span>IndexedDB Browser Sandbox · 0 Network Calls · 0 Data Leakage</span>
                      </div>
                    </div>
                  ) : visibleCptsNotes.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-accent/40 bg-accent-muted text-secondary text-xs">
                      No field manual notes matching "{searchQuery}".
                    </div>
                  ) : (
                    visibleCptsNotes.map((note, noteIdx) => {
                      const isNoteExpanded = Boolean(expandedNotes[note.id]);
                      const commandsToShow = isNoteExpanded
                        ? note.commands
                        : note.commands
                        ? note.commands.slice(0, 2)
                        : [];
                      const extraCommandsCount = note.commands ? Math.max(0, note.commands.length - 2) : 0;
                      const isRtlCard =
                        notesTextDirection === 'rtl' || (notesTextDirection === 'auto' && cptsLangMode === 'he');
                      const isHighlighted = highlightedNoteId === note.id;

                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...TACTICAL_SPRING, delay: CASCADE_STAGGER_DELAY(noteIdx) }}
                          id={`cpts-note-${note.id}`}
                          dir={isRtlCard ? 'rtl' : 'ltr'}
                          className={`p-4 rounded-xl border border-subtle bg-surface-card hover:border-accent/50 hover:shadow-lg transition-[box-shadow,background-color,border-color,color] space-y-3 group ${
                            isRtlCard ? 'text-right' : 'text-left'
                          } ${isHighlighted ? 'ring-2 ring-accent bg-accent/30' : ''}`}
                        >
                          {/* Note Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Title based on cptsLangMode - ONLY ONE, NEVER BOTH */}
                              {cptsLangMode === 'he' ? (
                                <div className="text-right" dir="rtl">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (soundEnabled) playCyberSound('click');
                                      setActiveObsidianNote(note);
                                    }}
                                    className="font-semibold text-primary text-sm group-hover:text-accent transition-colors font-sans cursor-pointer inline-flex items-center gap-1.5"
                                    title="פתח רשימות אישיות מקיפות"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                    <span>{note.titleHe || note.title}</span>
                                    {formatNoteNumberBadge(note) && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border font-mono font-semibold">
                                        #{formatNoteNumberBadge(note)}
                                      </span>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (soundEnabled) playCyberSound('click');
                                      setActiveObsidianNote(note);
                                    }}
                                    className="font-semibold text-primary text-sm group-hover:text-accent transition-colors text-left cursor-pointer inline-flex items-center gap-1.5"
                                    title="Open authentic Obsidian note"
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                    <span>{note.titleEn || note.title}</span>
                                    {formatNoteNumberBadge(note) && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border font-mono font-semibold">
                                        #{formatNoteNumberBadge(note)}
                                      </span>
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Badges: Stage, Category, SubCategory Topic, Difficulty, Tools */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {note.stage && (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-callout-info-bg text-callout-info-fg border border-callout-info-border font-mono font-semibold">
                                    🎯 Stage: {note.stage}
                                  </span>
                                )}
                                <span className="text-[9px] px-2 py-0.5 rounded bg-accent-muted text-accent border border-accent/40 font-mono">
                                  {note.category}
                                </span>
                                {note.subCategory && (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-accent-muted text-accent border border-accent/40 font-mono">
                                    📁 {parseSubCategory(note.subCategory).group}
                                  </span>
                                )}
                                <span className="text-[9px] px-2 py-0.5 rounded bg-surface-elevated border border-strong text-secondary font-mono">
                                  {note.difficulty}
                                </span>
                                {note.tools &&
                                  note.tools.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-callout-success-bg text-callout-success-fg border border-callout-success-border font-mono"
                                    >
                                      🔧 {t}
                                    </span>
                                  ))}
                              </div>

                              {/* Summaries based on cptsLangMode - ONLY ONE, NEVER BOTH */}
                              {cptsLangMode === 'he' ? (
                                <div className="text-[11px] text-accent leading-relaxed font-sans text-right" dir="rtl">
                                  {note.heSummary || note.summary || note.subCategory}
                                </div>
                              ) : (
                                <div className="text-[11px] text-secondary leading-relaxed font-sans text-left" dir="ltr">
                                  {note.enSummary || note.summary || note.subCategory}
                                </div>
                              )}

                              {/* Tags */}
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {note.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[9px] px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-cyber-cyan"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions: Open Obsidian Note & Copy All Commands */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (soundEnabled) playCyberSound('click');
                                  setActiveObsidianNote(note);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-accent-muted border border-accent/40 text-accent hover:text-accent hover:bg-accent-muted hover:border-accent/40 transition-[box-shadow,background-color,border-color,color] cursor-pointer shadow-sm"
                                title="Open full authentic Obsidian personal note"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-accent" />
                                <span>Open Note</span>
                              </button>
                              {note.commands && note.commands.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAllNoteCommands(note)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] cursor-pointer shadow-xs ${
                                    copiedId === `all-${note.id}`
                                      ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald'
                                      : 'bg-surface-elevated border border-strong text-accent hover:border-accent/40 hover:text-accent'
                                  }`}
                                  title="Copy all commands in this note to clipboard"
                                >
                                  {copiedId === `all-${note.id}` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-cyber-emerald" />
                                      <span>All Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy All ({note.commands.length})</span>
                                    </>
                                  )}
                                </button>
                              )}
                              <button aria-label="Delete field note"
                                type="button"
                                onClick={() => handleDeleteNoteWithConfirm(note.id, note.titleEn || note.title)}
                                className="p-1.5 rounded-md text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg border border-subtle hover:border-callout-danger-border/50 transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
                                title="Delete field note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Note Commands Container (Always LTR for code) */}
                          {note.commands && note.commands.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-subtle/60 text-left" dir="ltr">
                              {commandsToShow.map((cmd, cIdx) => {
                                const interpolated = interpolateCommand(cmd, globalVars);
                                const cmdId = `${note.id}-${cIdx}`;
                                const isCopied = copiedId === cmdId;

                                return (
                                  <div
                                    key={cIdx}
                                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-cyber-code border border-subtle group-hover:border-accent/40 text-xs font-mono"
                                  >
                                    <pre className="text-cyber-cyan overflow-x-auto whitespace-pre-wrap break-all flex-1 select-all" title={interpolated}>
                                      {interpolated}
                                    </pre>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(interpolated, cmdId)}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold flex-shrink-0 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-xs ${
                                        isCopied
                                          ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald'
                                          : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-cyber-cyan'
                                      }`}
                                    >
                                      {isCopied ? (
                                        <>
                                          <Check className="w-3 h-3 text-cyber-emerald" />
                                          <span>Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}

                              {/* Expand / Collapse for notes with >2 commands */}
                              {extraCommandsCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedNotes((prev) => ({ ...prev, [note.id]: !prev[note.id] }))}
                                  className="text-[10px] text-accent hover:text-accent font-semibold flex items-center gap-1 pt-1"
                                >
                                  {isNoteExpanded ? (
                                    <>
                                      <ChevronUp className="w-3.5 h-3.5" />
                                      <span>Collapse Extra Commands</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3.5 h-3.5" />
                                      <span>+ View {extraCommandsCount} more command{extraCommandsCount > 1 ? 's' : ''} from this note</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Sliced Pagination Controls */}
              {visibleCptsNotes.length < filteredCptsNotes.length && (
                <div className="p-4 rounded-xl border border-subtle bg-surface-card flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCptsLimit((prev) => prev + 30)}
                    className="px-5 py-2 rounded-lg bg-accent/20 border border-accent/50 hover:bg-accent-hover hover:text-on-accent text-accent font-semibold text-xs transition-[box-shadow,background-color,border-color,color] shadow-md flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>LOAD NEXT 30 NOTES ({filteredCptsNotes.length - visibleCptsNotes.length} REMAINING)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCptsLimit(filteredCptsNotes.length)}
                    className="px-4 py-2 rounded-lg bg-surface-sunken border border-subtle hover:border-white text-muted hover:text-primary text-xs font-semibold transition-colors"
                  >
                    SHOW ALL ({filteredCptsNotes.length})
                  </button>
                </div>
              )}
                </div>

                {/* Right Column: Docked Split Field Manual Note Viewer */}
                {activeObsidianNote && noteViewerMode === 'docked' && (
                  <div 
                    data-testid="docked-note-viewer-pane"
                    className={`w-full ${isDockedMaximized ? 'w-full' : 'lg:w-[52%] xl:w-[58%]'} lg:sticky lg:top-4 h-[75vh] lg:h-[calc(100vh-2.5rem)] min-w-0 flex flex-col`}
                  >
                    {renderWorkspacePanes('docked')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* New Custom Command Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-subtle bg-surface-card shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-primary flex items-center gap-2">
              <Code className="w-4 h-4 text-cyber-cyan" /> ADD CUSTOM EXPLOITATION SNIPPET
            </h3>

            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div>
                <label htmlFor="custom-snippet-title" className="block text-muted tracking-wider mb-1 font-semibold">
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
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-category" className="block text-muted tracking-wider mb-1 font-semibold">
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
                <label htmlFor="custom-snippet-desc" className="block text-muted tracking-wider mb-1 font-semibold">
                  Description
                </label>
                <input
                  type="text"
                  id="custom-snippet-desc"
                  name="custom-snippet-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief note on exploit parameters..."
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-template" className="block text-muted tracking-wider mb-1 font-semibold">
                  Command Template (Supports &#123;TARGET_IP&#125;, &#123;LHOST&#125;, &#123;LPORT&#125;) *
                </label>
                <textarea
                  id="custom-snippet-template"
                  name="custom-snippet-template"
                  rows={3}
                  required
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="python3 exploit.py -t {TARGET_IP} -l {LHOST} -p {LPORT}"
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-cyber-cyan font-mono resize-none"
                />
              </div>

              <div>
                <label htmlFor="custom-snippet-tags" className="block text-muted tracking-wider mb-1 font-semibold">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  id="custom-snippet-tags"
                  name="custom-snippet-tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="rce, python, cve-2023-xxxx"
                  className="w-full bg-surface-sunken px-3 py-2 rounded-lg border border-subtle text-primary focus:outline-none focus:border-cyber-cyan"
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
                  className="px-4 py-2 rounded-lg bg-cyber-cyan text-black font-semibold text-xs hover:bg-cyber-cyan/90 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-xs"
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
