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
  Users
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
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
      exportWorkspace: s.exportWorkspace,
      importWorkspace: s.importWorkspace,
      unexportedChangesCount: s.unexportedChangesCount,
    }))
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* Settings trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('click');
        }}
        className={`h-8 w-8 rounded-[6px] border flex items-center justify-center group relative cursor-pointer shadow-xs machined-edge transition-all active:scale-[0.96] ${
          isOpen
            ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.25)]'
            : 'bg-slate-100 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-800 text-slate-600 dark:text-tertiary hover:text-slate-900 dark:hover:text-zinc-100 hover:border-slate-400 dark:hover:border-zinc-700'
        }`}
        title="Settings & Workspace Utilities"
        aria-label="Settings and options"
      >
        <Settings className={`w-3.5 h-3.5 stroke-[1.8] transition-transform duration-300 ${isOpen ? 'rotate-90 text-callout-info-fg' : 'group-hover:rotate-45'}`} />
        {unexportedChangesCount > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full border border-white dark:border-zinc-950 shadow-[0_0_5px_rgba(251,191,36,0.9)] animate-pulse" />
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
        <div className="absolute right-0 top-full mt-1.5 w-64 p-2 rounded-xl bg-zinc-950/95 border border-zinc-800/80 shadow-2xl z-50 text-xs backdrop-blur-md space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
            <span>PREFERENCES & TOOLS</span>
            {unexportedChangesCount > 0 && (
              <span className="text-amber-400 font-normal">{unexportedChangesCount} unsaved</span>
            )}
          </div>

          {/* Full Operator Settings & Themes Modal Trigger */}
          <button
            onClick={() => {
              setSettingsModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 flex items-center justify-between text-left text-cyan-300 font-semibold transition-colors group"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>All Settings & Themes</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Open &rarr;</span>
          </button>

          {/* Theme Palette */}
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-zinc-400">Theme Preset</span>
            <ThemePresetDropdown />
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={() => {
              toggleSound();
              if (!soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
              <span>Cyber Sound FX</span>
            </span>
            <span className={`text-[10px] font-bold ${soundEnabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* UI Zoom Scale */}
          <div className="px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>UI Scale</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  zoomOut();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setUiScale('normal');
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-cyan-400"
                title="Reset Zoom"
              >
                {uiScale === 'normal' ? '100%' : uiScale}
              </button>
              <button
                onClick={() => {
                  zoomIn();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="h-px bg-zinc-800/80 my-1" />

          {/* 1-Click Workspace Export */}
          <button
            onClick={() => {
              exportWorkspace();
              if (soundEnabled) playCyberSound('root');
              setIsOpen(false);
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Workspace (JSON)</span>
            </span>
            <span className="text-[10px] text-zinc-500">1-Click</span>
          </button>

          {/* 1-Click Workspace Import */}
          <button
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Workspace (JSON)</span>
            </span>
            <span className="text-[10px] text-zinc-500">Restore</span>
          </button>

          {/* Full Backup Modal */}
          <button
            onClick={() => {
              setBackupModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center gap-2 text-left text-zinc-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Backup & Vault Manager</span>
          </button>

          <div className="h-px bg-zinc-800/80 my-1" />

          {/* Hotkeys Cheatsheet */}
          <button
            onClick={() => {
              setShortcutsModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              <span>Keyboard Shortcuts</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">?</span>
          </button>

          {/* Switch Operator */}
          <button
            onClick={() => {
              useAuthStore.getState().setOperatorProfileModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Switch Operator / Log In</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Alt+O</span>
          </button>

          {/* About ZeroBox & Credits */}
          <button
            type="button"
            onClick={() => {
              setOperatorModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 flex items-center justify-between text-left text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
              <span>About ZeroBox & Credits</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">v2.4</span>
          </button>

          {/* Software License */}
          <button
            type="button"
            onClick={() => {
              setLicenseModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 flex items-center gap-2 text-left text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
            <span>Software License</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-zinc-800/80 my-1" />

          {/* Clean App Architecture Footer Badge */}
          <div className="px-2 py-1 text-[10px] text-slate-400 dark:text-zinc-500 font-mono flex items-center justify-between">
            <span>OFFLINE ZERO-EGRESS</span>
            <span className="text-emerald-600 dark:text-cyber-emerald font-semibold">VERIFIED</span>
          </div>
        </div>
      )}
    </div>
  );
};
