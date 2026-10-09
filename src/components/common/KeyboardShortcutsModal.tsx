import React from 'react';
import { motion } from 'framer-motion';
import { X, Keyboard, Command, Eye, Zap } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';

interface ShortcutEntry {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'system';
}

const SHORTCUTS: ShortcutEntry[] = [
  // Navigation
  { keys: ['1'], description: 'Switch to Kanban Board view', category: 'navigation' },
  { keys: ['2'], description: 'Switch to Cards view', category: 'navigation' },
  { keys: ['3'], description: 'Switch to Full Table view', category: 'navigation' },
  { keys: ['4'], description: 'Switch to Topology Graph view', category: 'navigation' },
  { keys: ['j', 'Alt+↓'], description: 'Select next target machine', category: 'navigation' },
  { keys: ['k', 'Alt+↑'], description: 'Select previous target machine', category: 'navigation' },
  { keys: ['Space'], description: 'Inspect active target details modal', category: 'navigation' },
  { keys: ['/'], description: 'Focus target search filter', category: 'navigation' },

  // Tactical Actions
  { keys: ['Ctrl', 'S'], description: 'Save to local storage and profile', category: 'actions' },
  { keys: ['Ctrl', 'P'], description: 'Generate pre-report PDF for active target', category: 'actions' },
  { keys: ['Alt', 'S'], description: 'Snippets and commands drawer (or Ctrl+Space)', category: 'actions' },
  { keys: ['Alt', 'E'], description: 'Toggle Exam Mission quick-action drawer', category: 'actions' },
  { keys: ['Alt', 'N'], description: 'Toggle Field Notes Workspace sidecar', category: 'actions' },
  { keys: ['Alt', 'R'], description: 'Open Reverse Shell Crafter (or Alt+P / Ctrl+Shift+R)', category: 'actions' },
  { keys: ['Alt', 'O'], description: 'Open Operator Profile switcher (or Ctrl+Shift+O)', category: 'actions' },
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

  const sections: { id: ShortcutEntry['category']; title: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'navigation', title: 'Navigation and views', Icon: Eye },
    { id: 'actions', title: 'Actions', Icon: Zap },
    { id: 'system', title: 'System', Icon: Command },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-inverse/70 font-sans"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-subtle bg-surface-card shadow-xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-3.5 border-b border-subtle bg-surface-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-center text-secondary">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-primary tracking-tight">Keyboard shortcuts</h2>
              <p className="text-[11px] text-muted">Navigate and operate ZeroBox without leaving the keyboard.</p>
            </div>
          </div>

          <button
            aria-label="Close keyboard shortcuts"
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 rounded-lg border border-subtle bg-surface-card text-muted hover:text-primary hover:border-strong active:scale-[0.97] transition-[transform,background-color,border-color,color] cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs scrollbar-thin">
          {sections.map(({ id, title, Icon }) => (
            <div key={id} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                <Icon className="w-3.5 h-3.5 text-muted" />
                <span>{title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SHORTCUTS.filter((s) => s.category === id).map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-between gap-2"
                  >
                    <span className="text-secondary text-[11px]">{s.description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-surface-card border border-strong text-primary text-[11px] font-medium font-mono"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 px-4 border-t border-subtle bg-surface-card flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted">
            Tip: press <kbd className="px-1.5 py-0.5 rounded-md bg-surface-sunken border border-strong text-primary font-mono">?</kbd> anywhere to open this sheet
          </span>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-surface-card border border-subtle text-primary hover:border-strong active:scale-[0.97] transition-[transform,background-color,border-color,color] cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
