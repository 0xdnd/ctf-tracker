import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
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
  Coffee, 
  Github, 
  Award, 
  ShieldCheck, 
  Tv, 
  SlidersHorizontal 
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { CREATOR_PROFILE_LINKS, playCyberSound } from '../../utils/helpers';
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
    crtOverlay,
    toggleCrtOverlay,
    setShortcutsModalOpen,
    setOperatorModalOpen,
    setLicenseModalOpen,
    setBackupModalOpen,
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
      crtOverlay: s.crtOverlay,
      toggleCrtOverlay: s.toggleCrtOverlay,
      setShortcutsModalOpen: s.setShortcutsModalOpen,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setLicenseModalOpen: s.setLicenseModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
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
          alert(`Workspace restored successfully! ${res.count ?? 0} targets loaded.`);
        } else {
          alert(`Failed to import workspace: ${res.error}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsOpen(false);
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      {/* Kebab trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('click');
        }}
        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
            : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border-zinc-800/80 hover:border-zinc-700'
        }`}
        title="Settings & Workspace Utilities"
        aria-label="Settings and options"
      >
        <MoreVertical className="w-4 h-4" />
        {unexportedChangesCount > 5 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-zinc-950 animate-pulse" />
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

          {/* CRT Overlay Toggle */}
          <button
            onClick={() => {
              toggleCrtOverlay();
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left text-zinc-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Tv className="w-3.5 h-3.5 text-purple-400" />
              <span>Retro CRT Scanlines</span>
            </span>
            <span className={`text-[10px] font-bold ${crtOverlay ? 'text-purple-400' : 'text-zinc-500'}`}>
              {crtOverlay ? 'ON' : 'OFF'}
            </span>
          </button>

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

          {/* Operator Dossier */}
          <button
            onClick={() => {
              setOperatorModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center gap-2 text-left text-zinc-300 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Operator Profile & Stats</span>
          </button>

          {/* License */}
          <button
            onClick={() => {
              setLicenseModalOpen(true);
              setIsOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="w-full px-2 py-1.5 rounded-lg hover:bg-zinc-900 flex items-center gap-2 text-left text-zinc-300 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            <span>Software License</span>
          </button>

          <div className="h-px bg-zinc-800/80 my-1" />

          {/* Social Links */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <a
              href={CREATOR_PROFILE_LINKS.coffee}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Coffee className="w-3 h-3" />
              <span>Buy Coffee</span>
            </a>
            <a
              href={CREATOR_PROFILE_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="GitHub Repository"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
