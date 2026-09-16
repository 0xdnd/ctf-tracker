import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check, Sparkles, Terminal, Shield, Flame } from 'lucide-react';
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';

interface ThemeOption {
  id: ThemePreset;
  name: string;
  tagline: string;
  dotColor: string;
  borderGlow: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'zerobox',
    name: 'ZEROBOX (Default)',
    tagline: 'Original clean dark tactical palette',
    dotColor: 'bg-[#06B6D4]',
    borderGlow: 'hover:border-cyber-cyan/40',
    icon: Sparkles,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    tagline: 'Matte dark slate with HTB green accents',
    dotColor: 'bg-[#9FEF00]',
    borderGlow: 'hover:border-[#9FEF00]/40',
    icon: Flame,
  },
  {
    id: 'matrix',
    name: 'Terminal Green',
    tagline: 'Subtle monospace green on dark slate',
    dotColor: 'bg-[#22C55E]',
    borderGlow: 'hover:border-[#22C55E]/40',
    icon: Terminal,
  },
  {
    id: 'kali',
    name: 'OffSec Crimson',
    tagline: 'Matte carbon dark with crimson accents',
    dotColor: 'bg-[#EF4444]',
    borderGlow: 'hover:border-[#EF4444]/40',
    icon: Shield,
  },
];

interface ThemePresetDropdownProps {
  compact?: boolean;
}

export const ThemePresetDropdown: React.FC<ThemePresetDropdownProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const themePreset = useCtfStore((s) => s.themePreset || 'zerobox');
  const setThemePreset = useCtfStore((s) => s.setThemePreset);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const activeTheme = THEME_OPTIONS.find((t) => t.id === themePreset) || THEME_OPTIONS[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (preset: ThemePreset) => {
    setThemePreset(preset);
    setIsOpen(false);
    if (soundEnabled) playCyberSound('click');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('toggle');
        }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono text-xs transition-all shadow-sm active:scale-95 ${
          isOpen
            ? 'bg-cyber-card border-cyber-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]'
            : 'bg-slate-100 dark:bg-cyber-card border-slate-300 dark:border-cyber-border text-slate-700 dark:text-cyber-text hover:border-cyber-cyan'
        }`}
        title={`Active Theme: ${activeTheme.name} (Click to switch vibe)`}
        aria-label="Theme Presets Selector"
        aria-expanded={isOpen}
      >
        <span className={`w-2 h-2 rounded-full ${activeTheme.dotColor} shadow-[0_0_6px_currentColor] flex-shrink-0`} />
        <Palette className="w-3.5 h-3.5 text-cyber-muted" />
        {!compact && (
          <span className="hidden md:inline font-semibold text-[11px] truncate max-w-[90px]">
            {activeTheme.name}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-cyber-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-1.5 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border shadow-2xl z-50 font-mono text-xs space-y-1 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase px-2 py-1 font-bold border-b border-slate-100 dark:border-cyber-border/60 flex items-center justify-between">
            <span>HACKER THEME PRESETS</span>
            <span className="text-cyber-cyan font-mono text-[9px]">v2.0</span>
          </div>

          <div className="space-y-0.5 pt-0.5">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.id === themePreset;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all group ${opt.borderGlow} ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-cyber-bg border border-cyber-cyan/50 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-cyber-bg/60 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${opt.dotColor} flex-shrink-0`} />
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-xs">{opt.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-cyber-muted truncate">
                        {opt.tagline}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-cyber-cyan stroke-[3] flex-shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
