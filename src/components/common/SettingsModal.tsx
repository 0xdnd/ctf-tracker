import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  Settings, 
  X, 
  Palette, 
  Sliders, 
  Terminal, 
  Flame, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Database, 
  Server, 
  Check, 
  Layers,
  Zap,
  Copy,
  ExternalLink,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useCtfStore, ThemePreset, normalizeThemePreset } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';

interface ThemeCardInfo {
  id: ThemePreset;
  name: string;
  tagline: string;
  badge: string;
  darkAccentHex: string;
  lightAccentHex: string;
  darkCardHex: string;
  lightCardHex: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_PRESETS: ThemeCardInfo[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark / Zinc',
    tagline: 'Cold zinc dark and clean zinc slate',
    badge: 'ZINC DARK',
    darkAccentHex: 'rgb(14 165 233)',
    lightAccentHex: 'rgb(2 132 199)',
    darkCardHex: 'rgb(18 18 21)',
    lightCardHex: 'rgb(255 255 255)',
    icon: Zap,
  },
  {
    id: 'monolith',
    name: 'Clean Monolith',
    tagline: 'Architectural off-white and crisp graphite',
    badge: 'MONOLITH',
    darkAccentHex: 'rgb(56 189 248)',
    lightAccentHex: 'rgb(2 132 199)',
    darkCardHex: 'rgb(39 39 42)',
    lightCardHex: 'rgb(255 255 255)',
    icon: Sun,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    tagline: 'OLED black and official HTB lime',
    badge: 'HTB OLED',
    darkAccentHex: 'rgb(159 239 0)',
    lightAccentHex: 'rgb(21 128 61)',
    darkCardHex: 'rgb(11 16 21)',
    lightCardHex: 'rgb(255 255 255)',
    icon: Terminal,
  },
];

const QUICK_DESIGN_TOKENS = [
  { name: 'Accent', varName: '--border-accent', role: 'Primary action, focus, selection' },
  { name: 'Success', varName: '--callout-success-fg', role: 'Rooted and healthy states' },
  { name: 'Warning', varName: '--callout-warn-fg', role: 'Caution and in-progress' },
  { name: 'Danger', varName: '--callout-danger-fg', role: 'Destructive and failed' },
  { name: 'Info', varName: '--callout-info-fg', role: 'Neutral information' },
  { name: 'Card surface', varName: '--surface-card', role: 'Component containers' },
  { name: 'Subtle border', varName: '--border-subtle', role: 'Structural dividers' },
];

export const SettingsModal: React.FC = () => {
  const { 
    settingsModalOpen, 
    setSettingsModalOpen, 
    themePreset, 
    setThemePreset, 
    soundEnabled, 
    toggleSound,
    uiScale,
    setUiScale,
    globalVars,
    setGlobalVars,
    setBackupModalOpen
  } = useCtfStore(
    useShallow((s) => ({
      settingsModalOpen: s.settingsModalOpen,
      setSettingsModalOpen: s.setSettingsModalOpen,
      themePreset: s.themePreset,
      setThemePreset: s.setThemePreset,
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      uiScale: s.uiScale,
      setUiScale: s.setUiScale,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      setBackupModalOpen: s.setBackupModalOpen,
    }))
  );

  const { isDark, setTheme } = useTheme();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const normalizedActivePreset: ThemePreset = normalizeThemePreset(themePreset);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: settingsModalOpen,
    onClose: () => setSettingsModalOpen(false),
  });

  const handleCopyToken = (varName: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(varName).catch(() => {});
      }
    } catch {
      // Graceful fallback for non-secure contexts
    }
    setCopiedToken(varName);
    if (soundEnabled) playCyberSound('click');
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inverse/70 font-sans"
      onClick={() => setSettingsModalOpen(false)}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings configuration modal"
        initial={{ scale: 0.98, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 8, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-2xl bg-surface-card border border-subtle rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-subtle flex items-center justify-between bg-surface-sunken">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <span>Operator settings</span>
                </h2>
                <p className="text-[11px] text-secondary">
                  Themes, design tokens, audio feedback, and defaults
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSettingsModalOpen(false);
                if (soundEnabled) playCyberSound('click');
              }}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              aria-label="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs text-secondary">
            
            {/* Section 1: Themes & Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-muted" />
                  <span>Theme presets</span>
                </span>
                <span className="text-[10px] text-muted font-semibold">
                  3 CANONICAL THEMES
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {THEME_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = normalizedActivePreset === preset.id;
                  const activeAccent = isDark ? preset.darkAccentHex : preset.lightAccentHex;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setThemePreset(preset.id);
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-surface-sunken border-accent ring-1 ring-accent/30'
                          : 'bg-surface-base/40 border-subtle hover:border-strong'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 w-full">
                        <div className="flex items-center gap-2">
                          {/* Dual Swatch (Dark & Light dots) */}
                          <div className="flex items-center -space-x-1 flex-shrink-0" title="Dark & Light accents">
                            <span 
                              className="w-4 h-4 rounded-full border border-strong z-10"
                              style={{ backgroundColor: preset.darkAccentHex }}
                            />
                            <span 
                              className="w-4 h-4 rounded-full border border-strong"
                              style={{ backgroundColor: preset.lightAccentHex }}
                            />
                          </div>

                          <div>
                            <div className="font-semibold text-xs text-primary flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-muted" />
                              <span>{preset.name}</span>
                            </div>
                            <span className="text-[10px] text-muted">
                              {preset.tagline}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="p-0.5 rounded-full bg-accent/15 text-accent flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-strong flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-subtle text-[10px] text-muted">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-strong" style={{ backgroundColor: activeAccent }} />Active accent</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-[10px] font-medium">
                          {preset.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Design Token Swatches Bar */}
            <div className="pt-2 border-t border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-muted" />
                  <span>Design tokens</span>
                </span>
                <span className="text-[10px] text-muted">
                  Click a swatch to copy its CSS variable
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {QUICK_DESIGN_TOKENS.map((token) => {
                  const tokenColor = `rgb(var(${token.varName}))`;
                  const isCopied = copiedToken === token.varName;

                  return (
                    <button
                      key={token.varName}
                      type="button"
                      onClick={() => handleCopyToken(token.varName)}
                      className="p-2 rounded-lg border border-subtle bg-surface-sunken hover:border-accent transition-colors text-left flex items-center gap-2 group"
                      title={`Click to copy ${token.varName}`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-md flex-shrink-0 border border-strong"
                        style={{ backgroundColor: tokenColor }}
                      />
                      <div className="truncate flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-primary truncate flex items-center justify-between">
                          <span>{token.name}</span>
                          {isCopied ? (
                            <span className="text-[10px] text-callout-success-fg font-medium">Copied</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted font-mono truncate">
                          {token.varName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Deep Link to Full Studio Matrix */}
              <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-xl bg-surface-sunken border border-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary flex-shrink-0">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-primary">Theme and color matrix</div>
                    <div className="text-[10px] text-muted">Inspect tokens, type scale and WCAG contrast</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsModalOpen(false);
                    window.location.hash = '#/theme';
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-strong text-primary font-medium text-xs flex items-center justify-center gap-1.5 transition-[box-shadow,background-color,border-color,color] shadow-sm group whitespace-nowrap"
                >
                  <span>Open Full Studio</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Section 2: Mode & Display Settings */}
            <div className="pt-2 border-t border-subtle space-y-3">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-muted" />
                <span>Display and mode</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dark / Light Toggle */}
                <div className="p-3 rounded-xl border border-subtle bg-surface-sunken flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-primary">Color Mode</div>
                    <div className="text-[10px] text-muted">
                      {isDark ? 'Dark mode active' : 'Light mode active'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-hover p-0.5 rounded-lg border border-strong">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('dark');
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-[box-shadow,background-color,border-color,color] ${
                        isDark 
                          ? 'bg-accent text-on-accent' 
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('light');
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-[box-shadow,background-color,border-color,color] ${
                        !isDark 
                          ? 'bg-accent text-on-accent' 
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                {/* Audio Feedback */}
                <div className="p-3 rounded-xl border border-subtle bg-surface-sunken flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-primary">Audio Feedback</div>
                    <div className="text-[10px] text-muted">
                      Interface sound effects
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSound()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                      soundEnabled
                        ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                        : 'border-strong bg-surface-card text-muted'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
                  </button>
                </div>
              </div>

              {/* UI Scaling */}
              <div className="p-3 rounded-xl border border-subtle bg-surface-sunken space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-primary flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-muted" />
                    <span>Interface scale</span>
                  </div>
                  <span className="text-[10px] text-muted font-semibold">
                    {uiScale || 'normal'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['tiny', 'compact', 'normal', 'large', 'huge'] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => {
                        setUiScale(scale);
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`py-1.5 rounded-lg border text-center font-semibold text-[10px] transition-colors ${
                        uiScale === scale
                          ? 'bg-surface-card border-accent text-primary'
                          : 'bg-surface-card border-subtle text-secondary hover:border-strong'
                      }`}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Attacker Variables Default */}
            <div className="pt-2 border-t border-subtle space-y-3">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Server className="w-4 h-4 text-muted" />
                <span>Default attacker variables</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted block mb-1">
                    Attacker IP (LHOST)
                  </label>
                  <input
                    type="text"
                    value={globalVars.lhost}
                    onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                    placeholder="10.10.14.x"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-base border border-strong text-xs text-primary focus:outline-none focus:border-accent font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-1">
                    Attacker Port (LPORT)
                  </label>
                  <input
                    type="text"
                    value={globalVars.lport}
                    onChange={(e) => setGlobalVars({ lport: e.target.value })}
                    placeholder="4444"
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-base border border-strong text-xs text-primary focus:outline-none focus:border-accent font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 bg-surface-sunken border-t border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsModalOpen(false);
                  setBackupModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-hover transition-colors flex items-center gap-1.5 border border-subtle"
              >
                <Database className="w-3.5 h-3.5 text-muted" />
                <span className="hidden sm:inline">Backup Database</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsModalOpen(false);
                  useCtfStore.getState().setLicenseModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-hover transition-colors flex items-center gap-1.5 border border-subtle"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-muted" />
                <span className="hidden sm:inline">License</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSettingsModalOpen(false);
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-hover text-on-accent transition-[background-color,border-color,color] active:scale-[0.97] cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
    </motion.div>
  );
};
