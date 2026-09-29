import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Palette, ChevronDown, Check, Zap, Terminal, Moon, Sun } from 'lucide-react';
import { useCtfStore, ThemePreset, normalizeThemePreset } from '../../store/useCtfStore';
import { useTheme } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';

interface ThemeOption {
  id: ThemePreset;
  name: string;
  tagline: string;
  darkDot: string;
  lightDot: string;
  darkHex: string;
  lightHex: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark / Zinc',
    tagline: 'Cold Zinc Dark & Clean Zinc Slate (#0ea5e9)',
    darkDot: 'bg-[#0ea5e9]',
    lightDot: 'bg-[#0284c7]',
    darkHex: '#0ea5e9',
    lightHex: '#0284c7',
    icon: Zap,
  },
  {
    id: 'monolith',
    name: 'Clean Monolith',
    tagline: 'Architectural Off-White & Crisp Graphite (#fafafa)',
    darkDot: 'bg-[#38bdf8]',
    lightDot: 'bg-[#0284c7]',
    darkHex: '#38bdf8',
    lightHex: '#0284c7',
    icon: Sun,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    tagline: 'OLED Pitch Black (#000000) & Official HTB Lime (#9fef00)',
    darkDot: 'bg-[#9fef00]',
    lightDot: 'bg-[#15803d]',
    darkHex: '#9fef00',
    lightHex: '#15803d',
    icon: Terminal,
  },
];

interface ThemePresetDropdownProps {
  compact?: boolean;
}

export const ThemePresetDropdown: React.FC<ThemePresetDropdownProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  const themePreset = useCtfStore((s) => s.themePreset || 'obsidian');
  const setThemePreset = useCtfStore((s) => s.setThemePreset);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const { isDark, setTheme } = useTheme();

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Normalize legacy aliases
  const activePresetId: ThemePreset = normalizeThemePreset(themePreset);

  const activeTheme = THEME_OPTIONS.find((t) => t.id === activePresetId) || THEME_OPTIONS[0];

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
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
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (preset: ThemePreset) => {
    setThemePreset(preset);
    setIsOpen(false);
    if (soundEnabled) playCyberSound('click');
  };

  const handleModeChange = (mode: 'dark' | 'light', e: React.MouseEvent) => {
    e.stopPropagation();
    setTheme(mode);
    if (soundEnabled) playCyberSound('toggle');
  };

  return (
    <div className="relative font-mono" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('toggle');
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
          isOpen
            ? 'bg-cyber-card border-cyber-cyan text-cyber-text'
            : 'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-borderGlow'
        }`}
        title={`Active Theme: ${activeTheme.name} (${isDark ? 'Dark Mode' : 'Light Mode'})`}
        aria-label={activeTheme.name}
        aria-expanded={isOpen}
      >
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: isDark ? activeTheme.darkHex : activeTheme.lightHex }}
        />
        <Palette className="w-3.5 h-3.5 text-cyber-muted" />
        {!compact && (
          <span className="hidden md:inline font-semibold text-[11px] truncate max-w-[95px]">
            {activeTheme.name}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-cyber-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 p-2.5 rounded-xl bg-cyber-card border border-cyber-border shadow-2xl z-50 text-xs space-y-2 animate-in fade-in duration-100">
          
          {/* Header */}
          <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase px-2 py-0.5 font-bold border-b border-slate-100 dark:border-cyber-border/60 flex items-center justify-between">
            <span>THEME PRESETS</span>
            <span className="text-cyber-cyan font-mono text-[9px] font-bold">{THEME_OPTIONS.length} THEMES</span>
          </div>

          {/* Theme List */}
          <div className="space-y-1">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.id === activePresetId;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'bg-cyber-bg border border-cyber-cyan text-cyber-text'
                      : 'hover:bg-cyber-cardHover text-cyber-muted hover:text-cyber-text border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Dual Swatch (Dark & Light dots) */}
                    <div className="flex items-center -space-x-1 flex-shrink-0" title="Dark & Light accents">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/30 z-10"
                        style={{ backgroundColor: opt.darkHex }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/60"
                        style={{ backgroundColor: opt.lightHex }}
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-cyber-cyan flex-shrink-0" />
                        <span className="font-bold text-xs">{opt.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-cyber-muted truncate">
                        {opt.tagline}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-cyber-cyan stroke-[2.5] flex-shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean Dark / Light Mode Switcher Strip */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-cyber-border/60">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-cyber-muted mb-1.5 px-1 flex items-center justify-between">
              <span>COLOR MODE</span>
              <span className="text-cyber-cyan font-bold">{isDark ? 'DARK ACTIVE' : 'LIGHT ACTIVE'}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border/80">
              <button
                type="button"
                onClick={(e) => handleModeChange('dark', e)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 text-cyber-cyan border border-cyber-cyan/40 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleModeChange('light', e)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  !isDark
                    ? 'bg-white text-cyber-cyan border border-cyber-cyan/50 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Quick link to Full Theme & Color Matrix */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-cyber-border/60">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.location.hash = '#/theme';
                if (soundEnabled) playCyberSound('click');
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-cyber-bg hover:bg-cyber-cyan/10 border border-slate-200 dark:border-cyber-border hover:border-cyber-cyan/40 text-slate-700 dark:text-cyber-text hover:text-cyber-cyan font-bold text-[11px] flex items-center justify-center gap-1.5 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] cursor-pointer shadow-sm group"
            >
              <Palette className="w-3.5 h-3.5 text-cyber-cyan group-hover:rotate-12 transition-transform" />
              <span>Full Color & Theme Matrix</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
