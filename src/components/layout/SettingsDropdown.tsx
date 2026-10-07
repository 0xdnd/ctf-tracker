import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut, 
  Keyboard, 
  FileCode, 
  Download, 
  Upload, 
  Terminal,
  ShieldCheck, 
  SlidersHorizontal,
  Users,
  Film,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
import { useLocation } from 'react-router-dom';
import { ThemePresetDropdown } from '../common/ThemePresetDropdown';

export const SettingsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setShowcaseModalOpen,
    exportWorkspace,
    importWorkspace,
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
      setShowcaseModalOpen: s.setShowcaseModalOpen,
      exportWorkspace: s.exportWorkspace,
      importWorkspace: s.importWorkspace,
      unexportedChangesCount: s.unexportedChangesCount,
    }))
  );

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Close dropdown on route change
  const location = useLocation();
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importWorkspace(content);
        if (res.success) {
          if (soundEnabled) playCyberSound('root');
          toast.success(`Workspace restored successfully! ${res.count ?? 0} targets loaded.`, 'Workspace Restored');
        } else {
          toast.error(`Failed to import workspace: ${res.error}`, 'Import Failed');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsOpen(false);
  };

  const itemCls =
    'w-full px-2 py-1.5 rounded-lg hover:bg-surface-hover flex items-center justify-between text-left text-secondary hover:text-primary transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11';
  const iconCls = 'w-3.5 h-3.5 text-muted flex-shrink-0';
  const hintCls = 'text-[11px] text-muted';

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Settings trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('click');
        }}
        className={`h-8 w-8 rounded-lg border flex items-center justify-center group relative cursor-pointer transition-interactive active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${
          isOpen
            ? 'bg-surface-hover text-primary border-strong'
            : 'bg-transparent border-subtle text-secondary hover:bg-surface-hover hover:text-primary hover:border-strong'
        }`}
        title="Settings & Workspace Utilities"
        aria-label="Settings and options"
      >
        <Settings className="w-3.5 h-3.5 stroke-[1.8]" />
        {unexportedChangesCount > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-callout-warn-fg rounded-full border border-surface-base" />
        )}
      </button>

      {/* Hidden file input for 1-click workspace JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleJsonImport}
      />

      {isOpen && (
        <div className="fixed right-3 sm:right-4 top-[54px] w-64 p-2 rounded-xl bg-surface-elevated border border-subtle shadow-xl z-[60] text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100 machined-edge">
          <div className="px-2 py-1 text-[11px] font-medium text-muted flex items-center justify-between border-b border-subtle pb-1.5">
            <span>Preferences and tools</span>
            {unexportedChangesCount > 0 && (
              <span className="text-callout-warn-fg font-normal tabular-nums">{unexportedChangesCount} unsaved</span>
            )}
          </div>

          {/* Full settings and themes modal */}
          <button
            onClick={() => {
              setSettingsModalOpen(true);
              setIsOpen(false);
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

          {/* Theme palette */}
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-muted">Theme Preset</span>
            <ThemePresetDropdown />
          </div>

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
              setIsOpen(false);
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
              fileInputRef.current?.click();
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
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className={itemCls}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className={iconCls} />
              <span>Backup & Vault Manager</span>
            </span>
          </button>

          <div className="h-px bg-surface-hover my-1" />

          {/* Hotkeys */}
          <button
            onClick={() => {
              setShortcutsModalOpen(true);
              setIsOpen(false);
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
              setIsOpen(false);
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
              setIsOpen(false);
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

          {/* AI Video Showcase */}
          <button
            type="button"
            onClick={() => {
              setShowcaseModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className={itemCls}
            title="Watch 1080p ZeroBox Showcase Video generated with Google Nano Banana AI"
          >
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyber-emerald" />
              <span>Watch ZeroBox Reel</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
              AI 1080p
            </span>
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => {
              setOperatorModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className={itemCls}
          >
            <div className="flex items-center gap-2">
              <Terminal className={iconCls} />
              <span>About ZeroBox & Credits</span>
            </div>
            <span className="text-[11px] text-muted font-mono tabular-nums">v2.4</span>
          </button>

          {/* License */}
          <button
            type="button"
            onClick={() => {
              setLicenseModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className={itemCls}
          >
            <span className="flex items-center gap-2">
              <FileCode className={iconCls} />
              <span>Software License</span>
            </span>
          </button>

          <div className="h-px bg-surface-hover my-1" />

          {/* Offline footer */}
          <div className="px-2 py-1 text-[11px] text-muted flex items-center justify-between">
            <span>Offline, zero egress</span>
            <span className="text-callout-success-fg font-medium">Verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
