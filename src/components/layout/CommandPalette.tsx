import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sparkles, 
  Compass, 
  Zap, 
  Globe,
  Award,
  Radio,
  Keyboard 
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { CREATOR_PROFILE_LINKS } from '../../utils/helpers';

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
    }))
  );

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K / Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
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
        id: 'action-portfolio',
        label: "Launch Daniel Dayan's Portfolio",
        icon: Globe,
        colorClass: 'text-cyber-emerald',
        bgHoverClass: 'hover:bg-cyber-emerald/20 border-cyber-emerald/40',
        execute: () => {
          window.open(CREATOR_PROFILE_LINKS.portfolio, '_blank', 'noopener,noreferrer');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-dossier',
        label: 'View Operator Dossier (Daniel Dayan)',
        icon: Terminal,
        colorClass: 'text-cyber-cyan',
        bgHoverClass: 'hover:bg-cyber-cyan/15 hover:border-cyber-cyan/50',
        execute: () => {
          setCommandPaletteOpen(false);
          setOperatorModalOpen(true);
        },
      },
      {
        id: 'action-recon',
        label: 'Tactical Recon & Scan Automation',
        icon: Zap,
        colorClass: 'text-cyber-emerald',
        bgHoverClass: 'hover:bg-cyber-emerald/10 hover:border-cyber-emerald/40',
        execute: () => {
          setCommandPaletteOpen(false);
          setReconAutomationModalOpen(true);
        },
      },
      {
        id: 'action-add-box',
        label: 'Add Custom Box',
        icon: Plus,
        colorClass: 'text-cyber-emerald',
        bgHoverClass: 'hover:bg-cyber-emerald/10 hover:border-cyber-emerald/40',
        execute: () => {
          setCommandPaletteOpen(false);
          setNewMachineModalOpen(true);
        },
      },
      {
        id: 'action-methodology',
        label: 'Attack Methodology (8-Phases)',
        icon: Compass,
        colorClass: 'text-cyber-cyan',
        bgHoverClass: 'hover:bg-cyber-cyan/10 hover:border-cyber-cyan/40',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/methodology');
        },
      },
      {
        id: 'action-writeup',
        label: 'Open Writeup Studio',
        icon: FileText,
        colorClass: 'text-cyber-cyan',
        bgHoverClass: 'hover:bg-cyber-cyan/10 hover:border-cyber-cyan/40',
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
        colorClass: 'text-cyber-purple',
        bgHoverClass: 'hover:bg-cyber-purple/10 hover:border-cyber-purple/40',
        execute: () => {
          setCommandPaletteOpen(false);
          setBackupModalOpen(true);
        },
      },
      {
        id: 'theme-htb',
        label: 'Switch Theme: Hack The Box (Toxic Lime & Matte Dark)',
        icon: Palette,
        colorClass: 'text-[#9FEF00]',
        bgHoverClass: 'hover:bg-[#9FEF00]/10 hover:border-[#9FEF00]/40',
        execute: () => {
          setThemePreset('htb');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'theme-matrix',
        label: 'Switch Theme: Matrix Terminal (Phosphor Green & Black)',
        icon: Terminal,
        colorClass: 'text-[#00FF66]',
        bgHoverClass: 'hover:bg-[#00FF66]/10 hover:border-[#00FF66]/40',
        execute: () => {
          setThemePreset('matrix');
          setCommandPaletteOpen(false);
        },
      },
      {
        id: 'action-revshell',
        label: 'Reverse Shell Forge (Payload Crafter & Listener)',
        icon: Terminal,
        colorClass: 'text-cyber-cyan',
        bgHoverClass: 'hover:bg-cyber-cyan/10 hover:border-cyber-cyan/40',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/cheatsheets?tab=revshell');
        },
      },
      {
        id: 'action-flexcard',
        label: 'Export Operator Flex Card (Scorecard PNG)',
        icon: Award,
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgHoverClass: 'hover:bg-purple-500/10 hover:border-purple-500/40',
        execute: () => {
          setCommandPaletteOpen(false);
          setFlexCardModalOpen(true);
        },
      },
      {
        id: 'action-exam',
        label: 'War Room (24h OSCP / CPTS Exam Simulator)',
        icon: Radio,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgHoverClass: 'hover:bg-rose-500/10 hover:border-rose-500/40',
        execute: () => {
          setCommandPaletteOpen(false);
          navigate('/exam');
        },
      },
      {
        id: 'action-shortcuts',
        label: 'Combat Keyboard Shortcuts Reference [?]',
        icon: Keyboard,
        colorClass: 'text-cyan-600 dark:text-cyber-cyan',
        bgHoverClass: 'hover:bg-cyan-500/10 hover:border-cyan-500/40',
        execute: () => {
          setCommandPaletteOpen(false);
          setShortcutsModalOpen(true);
        },
      },
    ],
    [navigate, setCommandPaletteOpen, setOperatorModalOpen, setReconAutomationModalOpen, setNewMachineModalOpen, setActiveTab, setBackupModalOpen, setThemePreset, setFlexCardModalOpen, setShortcutsModalOpen]
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
    const activeEl = containerRef.current?.querySelector(`[data-palette-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-mono"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="w-full max-w-2xl rounded-xl border border-cyber-border bg-cyber-card shadow-2xl overflow-hidden shadow-glow-emerald/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-cyber-border px-4 py-3 bg-cyber-bg/50">
          <Search className="w-5 h-5 text-cyber-emerald flex-shrink-0" />
          <input
            id="command-palette-search-input"
            name="command-palette-search"
            aria-label="Command palette search input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, machine name, IP, tag, or quick action..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-cyber-muted focus:outline-none"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')} 
              className="text-cyber-muted hover:text-slate-900 dark:hover:text-white"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded text-[10px] bg-cyber-border/70 text-cyber-muted border border-cyber-border">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div ref={containerRef} className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-cyber-muted flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyber-cyan" /> QUICK ACTIONS
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
                      className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all group ${
                        isSelected 
                          ? 'ring-1 ring-cyber-cyan bg-cyber-cyan/20 border-cyber-cyan/80 shadow-glow-cyan/20' 
                          : `bg-cyber-bg border border-cyber-border ${action.bgHoverClass}`
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${action.colorClass} group-hover:scale-110 transition-transform`} />
                      <span className={`font-medium ${isSelected ? 'text-cyber-cyan font-bold' : 'text-slate-900 dark:text-white group-hover:text-cyber-cyan'}`}>
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
            <div className="px-2 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-cyber-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-cyber-emerald" /> LAB MACHINES
              </span>
              <span className="text-[10px] text-cyber-muted">Total matches: {filteredMachines.length}</span>
            </div>

            <div className="space-y-1">
              {filteredMachines.length === 0 ? (
                <div className="px-3 py-2 text-cyber-muted text-center">No matching machines found.</div>
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
                      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left group ${
                        isSelected
                          ? 'ring-1 ring-cyber-emerald bg-cyber-emerald/20 border-cyber-emerald/80 shadow-glow-emerald/20'
                          : 'hover:bg-cyber-bg border-transparent hover:border-cyber-border/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${
                          m.platform === 'HTB' ? 'bg-cyber-emerald' :
                          m.platform === 'THM' ? 'bg-cyber-crimson' : 'bg-cyber-cyan'
                        }`} />
                        <span className={`font-bold transition-colors ${isSelected ? 'text-cyber-emerald' : 'text-slate-900 dark:text-white group-hover:text-cyber-emerald'}`}>
                          {m.name}
                        </span>
                        <span className="text-[10px] text-cyber-muted font-mono">{m.ip}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted">
                          {m.os}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          m.difficulty === 'Easy' ? 'text-cyber-emerald bg-cyber-emerald/10' :
                          m.difficulty === 'Medium' ? 'text-cyber-amber bg-cyber-amber/10' :
                          m.difficulty === 'Hard' ? 'text-cyber-crimson bg-cyber-crimson/10' :
                          'text-purple-400 bg-purple-950/40'
                        }`}>
                          {m.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-cyber-muted group-hover:text-slate-900 dark:group-hover:text-white">
                        <span className="text-[10px] uppercase font-mono">{m.status}</span>
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
              <div className="px-2 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-cyber-muted flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-cyber-cyan" /> CHEATSHEET SNIPPETS
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
                      className={`w-full p-2 rounded-lg border transition-all text-left group ${
                        isSelected
                          ? 'ring-1 ring-cyber-cyan bg-cyber-cyan/20 border-cyber-cyan/80 shadow-glow-cyan/20'
                          : 'hover:bg-cyber-bg border-transparent hover:border-cyber-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold transition-colors ${isSelected ? 'text-cyber-cyan' : 'text-slate-900 dark:text-white group-hover:text-cyber-cyan'}`}>
                          {c.title}
                        </span>
                        <span className="text-[10px] text-cyber-muted">{c.category}</span>
                      </div>
                      <div className="font-mono text-[11px] text-cyber-muted truncate bg-black/40 px-2 py-1 rounded border border-cyber-border/40">
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
        <div className="border-t border-cyber-border bg-cyber-bg/70 px-4 py-2 flex items-center justify-between text-[10px] text-cyber-muted">
          <div className="flex items-center gap-3">
            <span>Navigate: <kbd className="bg-cyber-card px-1 py-0.5 rounded">↑</kbd> <kbd className="bg-cyber-card px-1 py-0.5 rounded">↓</kbd></span>
            <span>Select: <kbd className="bg-cyber-card px-1 py-0.5 rounded">Enter</kbd></span>
          </div>
          <span>ZEROBOX TACTICAL PALETTE</span>
        </div>
      </div>
    </div>
  );
};
