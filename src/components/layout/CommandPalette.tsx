import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  Search,
  Terminal,
  ShieldAlert,
  Plus,
  Database,
  X,
  ChevronRight,
  Sliders,
  Zap,
  Award,
  Crosshair,
  Copy,
  Settings,
  Users,
  Keyboard,
  KeyRound,
  Route,
  SquareTerminal,
  Code,
  NotebookPen,
  Timer,
  NotebookText,
  GraduationCap,
  Calculator
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { PHASE_COUNT } from '../../data/catalogStats';
import { useShallow } from 'zustand/react/shallow';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { parseSearchQuery, matchesSearchQuery } from '../../utils/searchQuery';
import { isDueForReview } from '../../utils/spacedRepetition';
import { getSearchIndex, searchDocs, type Range, type SearchHit, type SearchSection } from '../../utils/searchIndex';
import { isPlaceholderIp } from '../../utils/ipInput';

const PALETTE_STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  recon: 'Recon',
  foothold: 'Foothold',
  root: 'Rooted',
  completed: 'Completed',
};

/** Renders text with <mark> around the given ranges (token-styled, no raw HTML). */
const Highlight: React.FC<{ text: string; ranges: Range[] }> = ({ text, ranges }) => {
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([a, b], i) => {
    if (a > cursor) parts.push(text.slice(cursor, a));
    parts.push(
      <mark key={i} className="bg-accent-muted text-primary rounded-sm px-0.5">
        {text.slice(a, b)}
      </mark>
    );
    cursor = b;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
};

const SEARCH_SECTIONS: { key: SearchSection; label: string }[] = [
  { key: 'notes', label: 'Notes' },
  { key: 'writeups', label: 'Writeups' },
  { key: 'vault', label: 'Evidence Vault' },
];

const ACTION_GROUP_ORDER = ['Pages', 'Actions', 'Appearance and help'] as const;
type ActionGroup = (typeof ACTION_GROUP_ORDER)[number];
const ACTION_GROUPS: Record<string, ActionGroup> = {
  'action-exam': 'Pages',
  'action-vault': 'Pages',
  'action-reverse-shells': 'Pages',
  'action-methodology': 'Pages',
  'action-writeup': 'Pages',
  'action-oscp-points-calculator': 'Pages',
  'theme-offsec': 'Appearance and help',
  'theme-htb': 'Appearance and help',
  'theme-obsidian': 'Appearance and help',
  'action-settings': 'Appearance and help',
  'action-shortcuts': 'Appearance and help',
  'action-replay-tour': 'Appearance and help',
};
const groupOfAction = (id: string): ActionGroup => ACTION_GROUPS[id] ?? 'Actions';

interface PaletteItem {
  id: string;
  type: 'action' | 'machine' | 'cheat' | 'note' | 'writeup' | 'vault';
  execute: () => void;
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    machines,
    cheatsheets,
    setSelectedMachineId,
    setActiveTab,
    setNewMachineModalOpen,
    setBackupModalOpen,
    setReconAutomationModalOpen,
    setOperatorModalOpen,
    setThemePreset,
    setFlexCardModalOpen,
    setShortcutsModalOpen,
    setSettingsModalOpen,
    globalVars,
    setSnippetsDrawerOpen,
    setRevShellModalOpen,
    soundEnabled,
    customNotes,
    userNotes,
    lootItems,
    credentials,
  } = useCtfStore(
    useShallow((s) => ({
      commandPaletteOpen: s.commandPaletteOpen,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      machines: s.machines,
      cheatsheets: s.cheatsheets,
      setSelectedMachineId: s.setSelectedMachineId,
      setActiveTab: s.setActiveTab,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setThemePreset: s.setThemePreset,
      setFlexCardModalOpen: s.setFlexCardModalOpen,
      setShortcutsModalOpen: s.setShortcutsModalOpen,
      setSettingsModalOpen: s.setSettingsModalOpen,
      globalVars: s.globalVars,
      activeTargetId: s.activeTargetId,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      setRevShellModalOpen: s.setRevShellModalOpen,
      soundEnabled: s.soundEnabled,
      customNotes: s.customNotes,
      userNotes: s.userNotes,
      lootItems: s.lootItems,
      credentials: s.credentials,
    }))
  );

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: commandPaletteOpen,
    onClose: () => setCommandPaletteOpen(false),
    autoFocusFirst: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Ctrl+K toggling lives in useTacticalHotkeys; Esc is handled by useFocusTrap.

  // Filtered results
  const filteredMachines = useMemo(() => {
    if (!query.trim()) return machines.slice(0, 6);
    const parsed = parseSearchQuery(query);
    const now = Date.now();
    return machines
      .filter((m) => matchesSearchQuery(m, parsed, { isDue: (x) => !x.isActive && isDueForReview(x, now) }))
      .slice(0, 8);
  }, [query, machines]);

  const filteredCheats = useMemo(() => {
    if (!query.trim()) return cheatsheets.slice(0, 4);
    const q = query.toLowerCase();
    return cheatsheets
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.commandTemplate.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query, cheatsheets]);

  // Full-text hits. The index is built lazily (palette open + non-empty query) and memoized on state identity.
  // Notes come only from the user's own authored and imported notes.
  const searchHits = useMemo<SearchHit[]>(() => {
    const q = query.trim();
    if (!commandPaletteOpen || q.length < 2) return [];
    const index = getSearchIndex({
      machines,
      customNotes,
      userNotes,
      lootItems,
      credentials,
    });
    return searchDocs(index, q, 5);
  }, [commandPaletteOpen, query, machines, customNotes, userNotes, lootItems, credentials]);

  const executeHit = React.useCallback(
    (hit: SearchHit) => {
      const ref = hit.doc.ref;
      setCommandPaletteOpen(false);
      if (ref.kind === 'note') {
        useNotesWorkspaceStore.getState().openNote(ref.id);
      } else if (ref.kind === 'machine-note') {
        setSelectedMachineId(ref.id);
        navigate(`/target/${ref.id}`);
      } else if (ref.kind === 'writeup') {
        setSelectedMachineId(ref.id);
        setActiveTab('writeup');
        navigate(`/writeup/${ref.id}`);
      } else {
        setActiveTab('vault');
        navigate('/vault');
      }
    },
    [navigate, setCommandPaletteOpen, setSelectedMachineId, setActiveTab]
  );

  // Snippet hits open as a read-only tab in the notes dock instead of leaving the current page.
  const openCheatInDock = React.useCallback(
    (cheatId: string) => {
      setCommandPaletteOpen(false);
      useNotesWorkspaceStore.getState().openCheat(cheatId);
    },
    [setCommandPaletteOpen]
  );

  // Define Quick Actions
  const quickActions = useMemo(
    () => [
      {
        id: 'action-copy-lhost',
        label: `Copy LHOST / Attacker IP (${globalVars.lhost || '10.10.14.X'})`,
        icon: Copy,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          safeCopyToClipboard(globalVars.lhost || '10.10.14.X');
          if (soundEnabled) playCyberSound('click');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-copy-target',
        label: `Copy Active Target IP (${globalVars.targetIp || '10.10.10.X'})`,
        icon: Crosshair,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          safeCopyToClipboard(globalVars.targetIp || '10.10.10.X');
          if (soundEnabled) playCyberSound('click');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-snippets',
        label: 'Open snippets drawer (Alt+S)',
        icon: Code,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setSnippetsDrawerOpen(true);
        },
      },
      {
        id: 'action-notes-workspace',
        label: 'Open or close the notes panel (Alt+N)',
        keywords: ['field notes', 'workspace', 'sidecar', 'notes'],
        icon: NotebookText,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          useNotesWorkspaceStore.getState().toggleOpen();
        },
      },
      {
        id: 'action-revshell',
        label: 'Open reverse shell generator',
        icon: Zap,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setRevShellModalOpen(true);
        },
      },
      {
        id: 'action-exam',
        label: 'Jump to Exam Simulator (Alt+E)',
        keywords: ['oscp','cpts','simulator'],
        icon: Timer,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/exam');
        },
      },
      {
        id: 'action-vault',
        label: 'Jump to Evidence & Loot Vault',
        keywords: ['evidence','loot'],
        icon: KeyRound,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/vault');
        },
      },
      {
        id: 'action-switch-operator',
        label: 'Switch profile or log in (Alt+O)',
        keywords: ['operator', 'profile', 'login'],
        icon: Users,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          useAuthStore.getState().setOperatorProfileModalOpen(true);
        },
      },
      {
        id: 'action-dossier',
        label: 'About ZeroBox and its creator',
        keywords: ['dossier', 'daniel', 'dayan', 'creator', 'about'],
        icon: Terminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setOperatorModalOpen(true);
        },
      },
      {
        id: 'action-recon',
        label: 'Recon and scan automation',
        icon: Zap,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setReconAutomationModalOpen(true);
        },
      },
      {
        id: 'action-add-box',
        label: 'Add Custom Box',
        icon: Plus,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setNewMachineModalOpen(true);
        },
      },
      {
        id: 'action-reverse-shells',
        label: 'Reverse Shells',
        keywords: ['forge','payloads','listener','revshell'],
        icon: SquareTerminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/reverse-shell');
        },
      },
      {
        id: 'action-methodology',
        label: `Attack Methodology (${PHASE_COUNT}-Phases)`,
        icon: Route,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/methodology');
        },
      },
      {
        id: 'action-writeup',
        label: 'Open Writeup Studio',
        icon: NotebookPen,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setActiveTab('writeup');
          navigate('/writeup');
        },
      },
      {
        id: 'action-backup',
        label: 'Backup and restore',
        keywords: ['json', 'export', 'import', 'backup'],
        icon: Database,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setBackupModalOpen(true);
        },
      },
      {
        id: 'action-settings',
        label: 'Open settings and themes',
        keywords: ['operator', 'settings', 'themes', 'preferences'],
        icon: Settings,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setSettingsModalOpen(true);
        },
      },
      {
        id: 'theme-offsec',
        label: 'Switch theme: Red Team / OffSec',
        icon: Crosshair,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setThemePreset('offsec');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'theme-htb',
        label: 'Switch theme: Hack The Box',
        icon: Terminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setThemePreset('htb');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'theme-obsidian',
        label: 'Switch theme: Obsidian',
        icon: Zap,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setThemePreset('obsidian');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-flexcard',
        label: 'Export operator flex card (PNG)',
        icon: Award,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setFlexCardModalOpen(true);
        },
      },
      {
        id: 'action-share-passed',
        label: 'Share that I passed',
        keywords: ['passed', 'exam', 'certification', 'oscp', 'cpts', 'crto', 'oswe', 'card', 'png'],
        icon: Award,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setFlexCardModalOpen(true, 'passed');
        },
      },
      {
        id: 'action-oscp-points-calculator',
        label: 'OSCP points calculator',
        icon: Calculator,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/oscp-points-calculator');
        },
      },
      {
        id: 'action-shortcuts',
        label: 'Keyboard shortcuts (?)',
        icon: Keyboard,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setShortcutsModalOpen(true);
        },
      },
      {
        id: 'action-replay-tour',
        label: 'Replay the tour',
        keywords: ['tour', 'help', 'guide', 'welcome'],
        icon: GraduationCap,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          // The tour waits for the palette dialog to close before it shows.
          setCommandPaletteOpen(false);
          useOnboardingStore.getState().replayTour('full');
        },
      },
    ],
    [navigate, setCommandPaletteOpen, setOperatorModalOpen, setReconAutomationModalOpen, setNewMachineModalOpen, setActiveTab, setBackupModalOpen, setThemePreset, setFlexCardModalOpen, setShortcutsModalOpen, setSettingsModalOpen, globalVars, soundEnabled, setSnippetsDrawerOpen, setRevShellModalOpen]
  );

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? quickActions.filter((a) => a.label.toLowerCase().includes(q) || a.keywords?.some((k) => k.includes(q)))
      : quickActions;
    // Sorted by group so keyboard order matches the grouped display
    return [...matched].sort((a, b) => ACTION_GROUP_ORDER.indexOf(groupOfAction(a.id)) - ACTION_GROUP_ORDER.indexOf(groupOfAction(b.id)));
  }, [query, quickActions]);

  // Unified items list for keyboard navigation
  const allItems = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];

    filteredActions.forEach((a) => {
      list.push({ id: a.id, type: 'action', execute: a.execute });
    });

    filteredMachines.forEach((m) => {
      list.push({
        id: `machine-${m.id}`,
        type: 'machine',
        execute: () => {
          setSelectedMachineId(m.id);
          setCommandPaletteOpen(false);
          setActiveTab('tracker');
          navigate('/tracker');
        },
      });
    });

    searchHits.forEach((h) => {
      list.push({
        id: `hit-${h.doc.id}`,
        type: h.doc.section === 'notes' ? 'note' : h.doc.section === 'writeups' ? 'writeup' : 'vault',
        execute: () => executeHit(h),
      });
    });

    filteredCheats.forEach((c) => {
      list.push({
        id: `cheat-${c.id}`,
        type: 'cheat',
        execute: () => openCheatInDock(c.id),
      });
    });

    return list;
  }, [filteredActions, filteredMachines, searchHits, executeHit, filteredCheats, openCheatInDock, setSelectedMachineId, setCommandPaletteOpen, setActiveTab, navigate]);

  const itemIndexById = useMemo(() => {
    const map = new Map<string, number>();
    allItems.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [allItems]);

  // Reset selectedIndex to 0 on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Clamp selectedIndex when list items change
  useEffect(() => {
    if (selectedIndex >= allItems.length) {
      setSelectedIndex(Math.max(0, allItems.length - 1));
    }
  }, [allItems.length, selectedIndex]);

  // Handle arrow keys and Enter
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handlePaletteKeyNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].execute();
        }
      }
    };

    window.addEventListener('keydown', handlePaletteKeyNav);
    return () => window.removeEventListener('keydown', handlePaletteKeyNav);
  }, [commandPaletteOpen, allItems, selectedIndex]);

  // Auto scroll active item into view
  useEffect(() => {
    if (!commandPaletteOpen) return;
    const activeEl = trapRef.current?.querySelector(`[data-palette-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
    }
  }, [selectedIndex, commandPaletteOpen, trapRef]);

  // z-popover (130): above Modal's z-modal/z-modalNested, so Ctrl+K inside Settings or MachineDetail renders
  // on top of the dialog that its focus trap now outranks; below toasts. Instant, no animation.
  const palette = commandPaletteOpen ? (
        <div
          data-command-palette-backdrop
          role="presentation"
          className="fixed inset-0 z-popover flex items-start justify-center pt-20 p-4 bg-surface-inverse/70 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommandPaletteOpen(false);
          }}
        >
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-2xl rounded-xl border border-subtle bg-surface-elevated shadow-xl overflow-hidden machined-edge"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-subtle px-4 py-3 bg-surface-card focus-within:ring-2 focus-within:ring-inset focus-within:ring-accent/60">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            id="command-palette-search-input"
            name="command-palette-search"
            aria-label="Command palette search input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, targets, notes"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded text-[10px] bg-surface-sunken text-muted border border-subtle font-mono">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div ref={containerRef} className="max-h-[60vh] overflow-y-auto overscroll-contain p-3 space-y-4 text-xs">
          
          {/* Quick actions, grouped under headings */}
          {ACTION_GROUP_ORDER.map((group) => {
            const groupActions = filteredActions.filter((a) => groupOfAction(a.id) === group);
            if (groupActions.length === 0) return null;
            return (
              <div key={group} role="group" aria-label={group}>
                <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center gap-1.5">
                  <Sliders className="w-3 h-3" aria-hidden="true" /> {group}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {groupActions.map((action) => {
                    const itemIndex = itemIndexById.get(action.id) ?? -1;
                    const isSelected = itemIndex === selectedIndex;
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        data-palette-index={itemIndex}
                        onClick={() => action.execute()}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition-[transform,background-color,border-color,color] active:scale-[0.97] group cursor-pointer ${
                          isSelected
                            ? 'bg-surface-hover ring-1 ring-accent border-transparent'
                            : `bg-transparent border border-transparent ${action.bgHoverClass}`
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${action.colorClass}`} />
                        <span className="font-medium text-primary">
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Machine Hits */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" /> Targets
              </span>
              <span className="text-[10px] text-muted tabular-nums">{filteredMachines.length} matches</span>
            </div>

            <div className="space-y-1">
              {filteredMachines.length === 0 ? (
                <div className="px-3 py-2 text-muted text-center">No matching machines found.</div>
              ) : (
                filteredMachines.map((m) => {
                  const itemIndex = itemIndexById.get(`machine-${m.id}`) ?? -1;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={m.id}
                      data-palette-index={itemIndex}
                      onClick={() => {
                        setSelectedMachineId(m.id);
                        setCommandPaletteOpen(false);
                        setActiveTab('tracker');
                        navigate('/tracker');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-[transform,background-color,border-color,color] active:scale-[0.97] text-left group cursor-pointer ${
                        isSelected
                          ? 'bg-surface-hover ring-1 ring-accent border-transparent'
                          : 'hover:bg-surface-hover border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-primary">
                          {m.name}
                        </span>
                        {m.ip && !isPlaceholderIp(m.ip) && (
                          <span className="text-[11px] text-muted font-mono tabular-nums">{m.ip}</span>
                        )}
                        <span className="text-[11px] text-muted">
                          {m.os}
                        </span>
                        <span className="text-[11px] text-muted">
                          {m.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted group-hover:text-primary">
                        <span className="text-[11px]">{PALETTE_STATUS_LABELS[m.status] || m.status}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Full-text hits: Notes, Writeups, Vault */}
          {SEARCH_SECTIONS.map(({ key, label }) => {
            const sectionHits = searchHits.filter((h) => h.doc.section === key);
            if (sectionHits.length === 0) return null;
            return (
              <div key={key} role="group" aria-label={label}>
                <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-[10px] text-muted tabular-nums">{sectionHits.length} matches</span>
                </div>
                <div className="space-y-1">
                  {sectionHits.map((h) => {
                    const itemIndex = itemIndexById.get(`hit-${h.doc.id}`) ?? -1;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={h.doc.id}
                        data-palette-index={itemIndex}
                        onClick={() => executeHit(h)}
                        className={`w-full p-2 rounded-lg border transition-[transform,background-color,border-color,color] active:scale-[0.97] text-left cursor-pointer ${
                          isSelected
                            ? 'bg-surface-hover ring-1 ring-accent border-transparent'
                            : 'hover:bg-surface-hover border-transparent'
                        }`}
                      >
                        <div className="font-medium text-primary truncate">
                          <Highlight text={h.doc.title} ranges={h.titleRanges} />
                        </div>
                        {h.snippet && (
                          <div className="text-[11px] text-muted truncate">
                            <Highlight text={h.snippet} ranges={h.snippetRanges} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cheatsheet Commands */}
          {filteredCheats.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Cheatsheet snippets
              </div>

              <div className="space-y-1">
                {filteredCheats.map((c) => {
                  const itemIndex = itemIndexById.get(`cheat-${c.id}`) ?? -1;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={c.id}
                      data-palette-index={itemIndex}
                      onClick={() => openCheatInDock(c.id)}
                      className={`w-full p-2 rounded-lg border transition-[transform,background-color,border-color,color] active:scale-[0.97] text-left group cursor-pointer ${
                        isSelected
                          ? 'bg-surface-hover ring-1 ring-accent border-transparent'
                          : 'hover:bg-surface-hover border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary">
                          {c.title}
                        </span>
                        <span className="text-[10px] text-muted">{c.category}</span>
                      </div>
                      <div className="font-mono tabular-nums text-[11px] text-on-inverse truncate bg-surface-inverse px-2 py-1 rounded border border-inverse">
                        {c.commandTemplate}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-subtle bg-surface-card px-4 py-2 flex items-center justify-between text-[10px] text-muted">
          <div className="flex items-center gap-3">
            <span>Navigate <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">↑</kbd> <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">↓</kbd></span>
            <span>Select <kbd className="bg-surface-sunken px-1 py-0.5 rounded font-mono">Enter</kbd></span>
          </div>
          <span>ZeroBox command palette</span>
        </div>
      </div>
    </div>
  ) : null;

  // Portaled to <body> like Modal, so no ancestor stacking context can trap it below a modal.
  return typeof document !== 'undefined' ? createPortal(palette, document.body) : palette;
};
