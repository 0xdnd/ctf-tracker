import React from 'react';
import { CoffeeLink } from '../common/CoffeeLink';
import { Settings, Volume2, VolumeX, ZoomIn, ZoomOut, Keyboard, FileCode, Download, Upload, Terminal, ShieldCheck, SlidersHorizontal, Users, BookOpen } from 'lucide-react';
import { APP_VERSION } from '../../utils/appVersion';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { formatBackupAge, hasMeaningfulData, isBackupOverdue, useBackupReminderStore } from '../../utils/backupReminder';

interface SettingsDropdownMenuProps {
  onClose: () => void;
  /** Opens the file picker of the hidden workspace-import input that SettingsDropdown owns. */
  onPickFile: () => void;
}

/** The open menu behind the header's settings button. Loaded the first time the button is used. */
const SettingsDropdownMenu: React.FC<SettingsDropdownMenuProps> = ({ onClose, onPickFile }) => {
  const {
    soundEnabled,
    toggleSound,
    zoomIn,
    zoomOut,
    setUiScale,
    uiScale,
    setShortcutsModalOpen,
    setOperatorModalOpen,
    setLicenseModalOpen,
    setBackupModalOpen,
    setSettingsModalOpen,
    exportWorkspace,
    unexportedChangesCount,
  } = useCtfStore(
    useShallow((s) => ({
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      setUiScale: s.setUiScale,
      uiScale: s.uiScale,
      setShortcutsModalOpen: s.setShortcutsModalOpen,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setLicenseModalOpen: s.setLicenseModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      setSettingsModalOpen: s.setSettingsModalOpen,
      exportWorkspace: s.exportWorkspace,
      unexportedChangesCount: s.unexportedChangesCount,
    }))
  );

  const backupReminder = useBackupReminderStore(useShallow((s) => ({ lastBackupAt: s.lastBackupAt, firstActivityAt: s.firstActivityAt, snoozeUntil: s.snoozeUntil })));
  const lastBackupAt = backupReminder.lastBackupAt;
  const hasData = useCtfStore((s) => hasMeaningfulData(s));
  const backupOverdue = isBackupOverdue(backupReminder, Date.now(), hasData);

  const itemCls =
    'w-full px-2 py-1.5 rounded-lg hover:bg-surface-hover flex items-center justify-between text-left text-secondary hover:text-primary transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11';
  const iconCls = 'w-3.5 h-3.5 text-muted flex-shrink-0';
  const hintCls = 'text-[11px] text-muted';

  return (
      <div className="fixed right-2 sm:right-4 top-[54px] w-64 max-w-[calc(100vw-16px)] max-h-[calc(100dvh-54px-72px-env(safe-area-inset-bottom,0px))] md:max-h-[calc(100dvh-54px-8px)] overflow-y-auto overscroll-contain p-2 rounded-xl bg-surface-elevated border border-subtle shadow-xl z-[60] text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100 machined-edge">
        <div className="px-2 py-1 text-[11px] font-medium text-muted flex items-center justify-between border-b border-subtle pb-1.5">
          <span>Preferences and tools</span>
          {unexportedChangesCount > 0 && (
            <span
              title="Changes since your last export. Your data is saved in this browser; the count resets when you export a backup."
              className="text-callout-warn-fg font-normal tabular-nums"
            >
              {unexportedChangesCount} not backed up
            </span>
          )}
        </div>

        {/* Full settings and themes modal */}
        <button
          onClick={() => {
            setSettingsModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className="w-full px-2 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-sunken border border-subtle flex items-center justify-between text-left text-primary font-medium transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-accent" />
            <span>All Settings & Themes</span>
          </span>
          <span className={hintCls}>Open &rarr;</span>
        </button>

        {/* Sound FX toggle */}
        <button
          onClick={() => {
            toggleSound();
            if (!soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            {soundEnabled ? <Volume2 className={iconCls} /> : <VolumeX className={iconCls} />}
            <span>Sound effects</span>
          </span>
          <span className={`text-[11px] font-medium ${soundEnabled ? 'text-callout-success-fg' : 'text-muted'}`}>
            {soundEnabled ? 'On' : 'Off'}
          </span>
        </button>

        {/* UI zoom scale */}
        <div className="px-2 py-1.5 rounded-lg flex items-center justify-between text-secondary">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className={iconCls} />
            <span>UI Scale</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                zoomOut();
                if (soundEnabled) playCyberSound('click');
              }}
              className="p-1 rounded bg-surface-sunken hover:bg-surface-hover text-secondary hover:text-primary cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setUiScale('normal');
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-1.5 py-0.5 rounded bg-surface-sunken hover:bg-surface-hover text-[11px] font-medium text-primary tabular-nums cursor-pointer"
              title="Reset Zoom"
            >
              {uiScale === 'normal' ? '100%' : uiScale}
            </button>
            <button
              onClick={() => {
                zoomIn();
                if (soundEnabled) playCyberSound('click');
              }}
              className="p-1 rounded bg-surface-sunken hover:bg-surface-hover text-secondary hover:text-primary cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="h-px bg-surface-hover my-1" />

        {/* Workspace export */}
        <button
          onClick={() => {
            exportWorkspace();
            if (soundEnabled) playCyberSound('root');
            onClose();
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <Download className={iconCls} />
            <span>Export Workspace (JSON)</span>
          </span>
        </button>

        {/* Workspace import */}
        <button
          onClick={() => {
            onPickFile();
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <Upload className={iconCls} />
            <span>Import Workspace (JSON)</span>
          </span>
        </button>

        {/* Full backup modal */}
        <button
          onClick={() => {
            setBackupModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="flex items-center gap-2">
              <ShieldCheck className={iconCls} />
              <span>Backup & Vault Manager</span>
            </span>
            <span
              data-testid="settings-last-backup"
              className={`pl-[22px] text-[11px] ${backupOverdue ? 'text-callout-warn-fg' : 'text-muted'}`}
            >
              {lastBackupAt ? `Last backup: ${formatBackupAge(lastBackupAt, Date.now())}` : 'Never backed up'}
            </span>
          </span>
        </button>

        <div className="h-px bg-surface-hover my-1" />

        {/* Hotkeys */}
        <button
          onClick={() => {
            setShortcutsModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <Keyboard className={iconCls} />
            <span>Keyboard Shortcuts</span>
          </span>
          <kbd className="text-[11px] text-muted font-mono">?</kbd>
        </button>

        {/* Field notes workspace */}
        <button
          onClick={() => {
            useNotesWorkspaceStore.getState().toggleOpen();
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <BookOpen className={iconCls} />
            <span>Notes Workspace Sidecar</span>
          </span>
          <kbd className="text-[11px] text-muted font-mono">Alt+N</kbd>
        </button>

        {/* Switch operator */}
        <button
          onClick={() => {
            useAuthStore.getState().setOperatorProfileModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <Users className={iconCls} />
            <span>Switch Operator / Log In</span>
          </span>
          <kbd className="text-[11px] text-muted font-mono">Alt+O</kbd>
        </button>

        {/* About */}
        <button
          type="button"
          onClick={() => {
            setOperatorModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <div className="flex items-center gap-2">
            <Terminal className={iconCls} />
            <span>About ZeroBox & Credits</span>
          </div>
          <span className="text-[11px] text-muted font-mono tabular-nums">v{APP_VERSION}</span>
        </button>

        {/* License */}
        <button
          type="button"
          onClick={() => {
            setLicenseModalOpen(true);
            onClose();
            if (soundEnabled) playCyberSound('click');
          }}
          className={itemCls}
        >
          <span className="flex items-center gap-2">
            <FileCode className={iconCls} />
            <span>Software License</span>
          </span>
        </button>

        <div className="px-2 py-1 text-[11px] text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href="https://ctftracker.com/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline-offset-2 hover:underline">Privacy</a>
          <a href="https://ctftracker.com/terms/" target="_blank" rel="noopener noreferrer" className="hover:text-primary underline-offset-2 hover:underline">Terms</a>
          <CoffeeLink />
        </div>

        <div className="h-px bg-surface-hover my-1" />

        {/* Offline footer */}
        <div className="px-2 py-1 text-[11px] text-muted flex items-center justify-between">
          <span>Local-first, no telemetry</span>
          <span className="text-callout-success-fg font-medium">Verified</span>
        </div>
      </div>
  );
};

export default SettingsDropdownMenu;
