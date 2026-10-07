import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  Search, 
  Terminal, 
  ShieldAlert, 
  Plus, 
  Database, 
  Palette, 
  FileText, 
  X, 
  ChevronRight, 
  Sliders, 
  Sun,
  Compass, 
  Zap, 
  Globe,
  Award,
  Radio,
  Crosshair,
  Copy,
  Settings,
  Users,
  Keyboard,
  Film,
  BookOpen
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { CREATOR_PROFILE_LINKS, safeCopyToClipboard, playCyberSound } from '../../utils/helpers';

interface PaletteItem {
  id: string;
  type: 'action' | 'machine' | 'cheat';
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
    setShowcaseModalOpen,
    globalVars,
    activeTargetId,
    setSnippetsDrawerOpen,
    setRevShellModalOpen,
    soundEnabled,
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
      setShowcaseModalOpen: s.setShowcaseModalOpen,
      globalVars: s.globalVars,
      activeTargetId: s.activeTargetId,
      setSnippetsDrawerOpen: s.setSnippetsDrawerOpen,
      setRevShellModalOpen: s.setRevShellModalOpen,
      soundEnabled: s.soundEnabled,
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

  // Keyboard shortcut listener for Ctrl+K / Cmd+K / Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (e.repeat) return;
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Filtered results
  const filteredMachines = useMemo(() => {
    if (!query.trim()) return machines.slice(0, 6);
    const q = query.toLowerCase();
    return machines
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.ip.includes(q) ||
          m.os.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      )
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
        icon: Terminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setSnippetsDrawerOpen(true);
        },
      },
      {
        id: 'action-notes-workspace',
        label: 'Toggle Field Notes Workspace Sidecar (Alt+N)',
        icon: BookOpen,
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
        icon: ShieldAlert,
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
        icon: Database,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/vault');
        },
      },
      {
        id: 'action-switch-operator',
        label: 'Switch Operator / Log In Profile (Alt+O)',
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
        label: 'View Creator Dossier (Daniel Dayan)',
        icon: Terminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setOperatorModalOpen(true);
        },
      },
      {
        id: 'action-showcase-video',
        label: 'Watch ZeroBox Reel / Demo Video (Nano Banana AI 1080p)',
        icon: Film,
        colorClass: 'text-cyber-emerald',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setShowcaseModalOpen(true);
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
        id: 'action-methodology',
        label: 'Attack Methodology (8-Phases)',
        icon: Compass,
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
        icon: FileText,
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
        label: 'Backup / Restore JSON',
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
        label: 'Open Operator Settings & Themes',
        icon: Settings,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setSettingsModalOpen(true);
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
        id: 'theme-monolith',
        label: 'Switch theme: Clean Monolith',
        icon: Sun,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setThemePreset('monolith');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-revshell-forge',
        label: 'Reverse shell forge (payloads and listener)',
        icon: Terminal,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/cheatsheets?tab=revshell');
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
        id: 'action-vault-view',
        label: 'Evidence and loot vault',
        icon: Database,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          setActiveTab('vault');
          navigate('/vault');
        },
      },
      {
        id: 'action-exam-view',
        label: '24h Exam Simulator (OSCP / CPTS)',
        icon: Radio,
        colorClass: 'text-muted',
        bgHoverClass: 'hover:bg-surface-hover',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/exam');
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
    ],
    [navigate, setCommandPaletteOpen, setOperatorModalOpen, setReconAutomationModalOpen, setNewMachineModalOpen, setActiveTab, setBackupModalOpen, setThemePreset, setFlexCardModalOpen, setShortcutsModalOpen, setSettingsModalOpen, globalVars, soundEnabled, setSnippetsDrawerOpen, setRevShellModalOpen]
  );

  // Filter actions based on search
  const filteredActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter((a) => a.label.toLowerCase().includes(q));
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

    filteredCheats.forEach((c) => {
      list.push({
        id: `cheat-${c.id}`,
        type: 'cheat',
        execute: () => {
          setActiveTab('cheatsheet');
          setCommandPaletteOpen(false);
          navigate('/cheatsheets');
        },
      });
    });

    return list;
  }, [filteredActions, filteredMachines, filteredCheats, setSelectedMachineId, setCommandPaletteOpen, setActiveTab, navigate]);

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
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, commandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-surface-inverse/70 font-sans"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div 
            ref={trapRef}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.28 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-2xl rounded-xl border border-subtle bg-surface-elevated shadow-xl overflow-hidden machined-edge"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-subtle px-4 py-3 bg-surface-card">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            id="command-palette-search-input"
            name="command-palette-search"
            aria-label="Command palette search input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, machines, IPs, tags..."
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')} 
              className="text-muted hover:text-primary"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded text-[10px] bg-surface-sunken text-muted border border-subtle font-mono">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div ref={containerRef} className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center gap-1.5">
                <Sliders className="w-3 h-3" /> Quick actions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredActions.map((action) => {
                  const itemIndex = allItems.findIndex((i) => i.id === action.id);
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
          )}

          {/* Machine Hits */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" /> Lab machines
              </span>
              <span className="text-[10px] text-muted tabular-nums">{filteredMachines.length} matches</span>
            </div>

            <div className="space-y-1">
              {filteredMachines.length === 0 ? (
                <div className="px-3 py-2 text-muted text-center">No matching machines found.</div>
              ) : (
                filteredMachines.map((m) => {
                  const itemIndex = allItems.findIndex((i) => i.id === `machine-${m.id}`);
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
                        <span className="text-[11px] text-muted font-mono tabular-nums">{m.ip}</span>
                        <span className="text-[11px] text-muted">
                          {m.os}
                        </span>
                        <span className="text-[11px] text-muted">
                          {m.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted group-hover:text-primary">
                        <span className="text-[11px]">{m.status}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Cheatsheet Commands */}
          {filteredCheats.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-medium text-muted flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Cheatsheet snippets
              </div>

              <div className="space-y-1">
                {filteredCheats.map((c) => {
                  const itemIndex = allItems.findIndex((i) => i.id === `cheat-${c.id}`);
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={c.id}
                      data-palette-index={itemIndex}
                      onClick={() => {
                        setActiveTab('cheatsheet');
                        setCommandPaletteOpen(false);
                        navigate('/cheatsheets');
                      }}
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
      </motion.div>
    </motion.div>
    )}
  </AnimatePresence>
  );
};
