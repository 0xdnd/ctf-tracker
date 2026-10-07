import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Palette, ChevronDown, Check, Zap, Terminal, Moon, Sun } from 'lucide-react';
import { useCtfStore, ThemePreset, normalizeThemePreset } from '../../store/useCtfStore';
import { useTheme } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';

interface ThemeOption {
  id: ThemePreset;
  name: string;
  tagline: string;
  darkHex: string;
  lightHex: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark / Zinc',
    tagline: 'Cold zinc dark and clean zinc slate',
    darkHex: 'rgb(14 165 233)',
    lightHex: 'rgb(2 132 199)',
    icon: Zap,
  },
  {
    id: 'monolith',
    name: 'Clean Monolith',
    tagline: 'Architectural off-white and crisp graphite',
    darkHex: 'rgb(56 189 248)',
    lightHex: 'rgb(2 132 199)',
    icon: Sun,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    tagline: 'OLED black and official HTB lime',
    darkHex: 'rgb(159 239 0)',
    lightHex: 'rgb(21 128 61)',
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
  const navigate = useNavigate();
  
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
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (soundEnabled) playCyberSound('toggle');
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
          isOpen
            ? 'bg-surface-card border-accent text-primary'
            : 'bg-surface-card border-subtle text-primary hover:border-strong'
        }`}
        title={`Active Theme: ${activeTheme.name} (${isDark ? 'Dark Mode' : 'Light Mode'})`}
        aria-label={activeTheme.name}
        aria-expanded={isOpen}
      >
        <span 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: isDark ? activeTheme.darkHex : activeTheme.lightHex }}
        />
        <Palette className="w-3.5 h-3.5 text-muted" />
        {!compact && (
          <span className="hidden md:inline font-semibold text-[11px] truncate max-w-[95px]">
            {activeTheme.name}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 p-2.5 rounded-xl bg-surface-card border border-subtle shadow-xl z-50 text-xs space-y-2 animate-in fade-in duration-100 machined-edge">
          
          {/* Header */}
          <div className="text-[10px] text-muted px-2 py-0.5 font-semibold border-b border-subtle flex items-center justify-between">
            <span>Theme presets</span>
            <span className="text-secondary text-[10px] font-medium">{THEME_OPTIONS.length} themes</span>
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
                      ? 'bg-surface-hover border border-strong text-primary'
                      : 'hover:bg-surface-hover text-muted hover:text-primary border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Dual Swatch (Dark & Light dots) */}
                    <div className="flex items-center -space-x-1 flex-shrink-0" title="Dark & Light accents">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-strong z-10"
                        style={{ backgroundColor: opt.darkHex }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-strong"
                        style={{ backgroundColor: opt.lightHex }}
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-muted flex-shrink-0" />
                        <span className="font-medium text-xs">{opt.name}</span>
                      </div>
                      <span className="text-[10px] text-muted truncate">
                        {opt.tagline}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary stroke-[2.5] flex-shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Clean Dark / Light Mode Switcher Strip */}
          <div className="pt-1.5 border-t border-subtle">
            <div className="text-[10px] font-semibold text-muted mb-1.5 px-1 flex items-center justify-between">
              <span>Color mode</span>
              <span className="text-secondary font-medium">{isDark ? 'Dark active' : 'Light active'}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface-sunken border border-subtle">
              <button
                type="button"
                onClick={(e) => handleModeChange('dark', e)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  isDark
                    ? 'bg-surface-card text-primary border border-strong shadow-sm'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleModeChange('light', e)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer ${
                  !isDark
                    ? 'bg-surface-card text-primary border border-strong shadow-sm'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Quick link to Full Theme & Color Matrix */}
          <div className="pt-1.5 border-t border-subtle">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/theme');
                if (soundEnabled) playCyberSound('click');
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle hover:border-strong text-secondary hover:text-primary font-medium text-[11px] flex items-center justify-center gap-1.5 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] cursor-pointer group"
            >
              <Palette className="w-3.5 h-3.5 text-muted" />
              <span>Full Color & Theme Matrix</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
