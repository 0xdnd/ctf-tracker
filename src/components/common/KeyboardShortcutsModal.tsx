import React from 'react';
import { motion } from 'framer-motion';
import { X, Keyboard, Command, Eye, Zap, Flame, Clock, Flag, Download } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';

interface ShortcutEntry {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'system';
}

const SHORTCUTS: ShortcutEntry[] = [
  // Navigation
  { keys: ['1'], description: 'Switch to Kanban Board view', category: 'navigation' },
  { keys: ['2'], description: 'Switch to Tactical Grid view', category: 'navigation' },
  { keys: ['3'], description: 'Switch to Full Table view', category: 'navigation' },
  { keys: ['4'], description: 'Switch to DMZ Topology Graph view', category: 'navigation' },
  { keys: ['j', 'Alt+↓'], description: 'Select next target machine', category: 'navigation' },
  { keys: ['k', 'Alt+↑'], description: 'Select previous target machine', category: 'navigation' },
  { keys: ['Space'], description: 'Inspect selected target details modal', category: 'navigation' },
  { keys: ['/'], description: 'Focus target search filter', category: 'navigation' },

  // Tactical Actions
  { keys: ['Ctrl', 'S'], description: 'Tactical 1-Click Save to Local Storage & Profile', category: 'actions' },
  { keys: ['Ctrl', 'P'], description: 'Executive Pre-Report PDF Generator for active target', category: 'actions' },
  { keys: ['Alt', 'S'], description: 'Slide-over Snippets & Commands Drawer (or Ctrl+Space)', category: 'actions' },
  { keys: ['Alt', 'F'], description: 'Toggle Zen / Focus Mode (maximize board real-estate)', category: 'actions' },
  { keys: ['t'], description: 'Toggle active target stopwatch timer', category: 'actions' },
  { keys: ['u'], description: 'Quick-pwn User flag on active target', category: 'actions' },
  { keys: ['r'], description: 'Quick-pwn Root / SYSTEM flag on active target', category: 'actions' },
  { keys: ['p'], description: 'Open Scan Importer & Payload Crafter', category: 'actions' },
  { keys: ['v'], description: '1-Click Export Obsidian Vault (.zip)', category: 'actions' },

  // System & Zoom
  { keys: ['-'], description: 'Zoom Out (Make UI Smaller: 90%, 80%)', category: 'system' },
  { keys: ['+'], description: 'Zoom In (Make UI Larger: 110%, 122%)', category: 'system' },
  { keys: ['0'], description: 'Reset UI Display Scale to 100%', category: 'system' },
  { keys: ['Ctrl', 'K'], description: 'Open Global Command Palette', category: 'system' },
  { keys: ['?'], description: 'Open Keyboard Shortcuts cheat sheet', category: 'system' },
  { keys: ['Esc'], description: 'Close any active modal or flyout', category: 'system' },
];

export const KeyboardShortcutsModal: React.FC = () => {
  const shortcutsModalOpen = useCtfStore((s) => s.shortcutsModalOpen);
  const setShortcutsModalOpen = useCtfStore((s) => s.setShortcutsModalOpen);

  React.useEffect(() => {
    if (!shortcutsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShortcutsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsModalOpen, setShortcutsModalOpen]);

  if (!shortcutsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-mono"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-cyber-cyan/40 bg-cyber-card shadow-2xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-cyber-border bg-cyber-bg/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  TACTICAL HOTKEYS // SHORTCUTS
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan font-bold">
                  PRO OPERATOR
                </span>
              </div>
              <p className="text-[11px] text-cyber-muted">
                Lightning-fast keyboard navigation and combat operations across ZeroBox.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 rounded-lg border border-cyber-border bg-cyber-bg text-cyber-muted hover:text-white hover:border-cyber-borderGlow transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs scrollbar-thin">
          {/* Navigation Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-cyber-cyan uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5" />
              <span>Target Navigation & View Switching</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.category === 'navigation').map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-cyber-bg border border-cyber-border/80 flex items-center justify-between gap-2"
                >
                  <span className="text-gray-300 text-[11px]">{s.description}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-white text-[11px] font-bold shadow-inner"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical Actions Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-cyber-emerald uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Combat & Operational Triggers</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.category === 'actions').map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-cyber-bg border border-cyber-border/80 flex items-center justify-between gap-2"
                >
                  <span className="text-gray-300 text-[11px]">{s.description}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-cyber-emerald text-[11px] font-bold shadow-inner"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
              <Command className="w-3.5 h-3.5" />
              <span>System & Global Palettes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHORTCUTS.filter((s) => s.category === 'system').map((s, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-cyber-bg border border-cyber-border/80 flex items-center justify-between gap-2"
                >
                  <span className="text-gray-300 text-[11px]">{s.description}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-purple-300 text-[11px] font-bold shadow-inner"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 px-4 border-t border-cyber-border bg-cyber-bg flex items-center justify-between text-xs">
          <span className="text-[11px] text-cyber-muted">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-cyber-card border border-cyber-border text-white">?</kbd> anywhere to open this sheet
          </span>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-cyber-card border border-cyber-border text-white hover:border-cyber-cyan transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
