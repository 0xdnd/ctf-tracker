import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  Settings, 
  X, 
  Palette, 
  Sliders, 
  Terminal, 
  Shield, 
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
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
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
    id: 'zerobox',
    name: 'Neon Cyber',
    tagline: 'Electric Cyan & Emerald (#00F0FF / #008B99)',
    badge: 'CYBER',
    darkAccentHex: '#00F0FF',
    lightAccentHex: '#008B99',
    darkCardHex: '#0D1527',
    lightCardHex: '#FFFFFF',
    icon: Zap,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    tagline: 'Authentic HTB Lime Green & Slate (#9FEF00 / #15803D)',
    badge: 'HTB',
    darkAccentHex: '#9FEF00',
    lightAccentHex: '#15803D',
    darkCardHex: '#1A2332',
    lightCardHex: '#FFFFFF',
    icon: Terminal,
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    tagline: 'Deep Navy & Electric Sky Blue (#38BDF8 / #0284C7)',
    badge: 'NAVY',
    darkAccentHex: '#38BDF8',
    lightAccentHex: '#0284C7',
    darkCardHex: '#0A1122',
    lightCardHex: '#FFFFFF',
    icon: Shield,
  },
  {
    id: 'oled',
    name: 'OLED Pure Black',
    tagline: '100% Pitch Black & Ice Blue (#000000 / #18181B)',
    badge: 'OLED',
    darkAccentHex: '#38BDF8',
    lightAccentHex: '#18181B',
    darkCardHex: '#090C12',
    lightCardHex: '#FAFAFA',
    icon: Moon,
  },
];

const QUICK_DESIGN_TOKENS = [
  { name: 'Primary Cyan', varName: '--cyber-cyan', role: 'Laser Glow & Tab Active', darkHex: '#00F0FF', lightHex: '#008B99' },
  { name: 'Foothold Emerald', varName: '--cyber-emerald', role: 'Target Active Engagement', darkHex: '#10B981', lightHex: '#0D9488' },
  { name: 'Warning Amber', varName: '--cyber-amber', role: 'Linux OS & Medium Labs', darkHex: '#F59E0B', lightHex: '#D97706' },
  { name: 'Danger Crimson', varName: '--cyber-crimson', role: 'Hard Labs & Destructive', darkHex: '#F43F5E', lightHex: '#E11D48' },
  { name: 'Domain Purple', varName: '--cyber-purple', role: 'AD Vectors & Insane Labs', darkHex: '#A855F7', lightHex: '#9333EA' },
  { name: 'Card Surface', varName: '--cyber-card', role: 'Component Containers', darkHex: '#0D1527', lightHex: '#FFFFFF' },
  { name: 'Tactical Border', varName: '--cyber-border', role: 'Structural Dividers', darkHex: '#1E293B', lightHex: '#E2E8F0' },
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

  const normalizedActivePreset = 
    themePreset === 'neon' ? 'zerobox' : 
    themePreset === 'slate' ? 'zerobox' : 
    themePreset || 'zerobox';

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

  if (!settingsModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Settings configuration modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-cyber-border flex items-center justify-between bg-slate-50 dark:bg-cyber-bg/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan shadow-sm">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>OPERATOR SETTINGS</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30">
                    PREFERENCES
                  </span>
                </h2>
                <p className="text-[11px] text-slate-600 dark:text-cyber-muted">
                  Themes, design token swatches, audio feedback, and tactical defaults
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSettingsModalOpen(false);
                if (soundEnabled) playCyberSound('click');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-cyber-bg transition-colors"
              aria-label="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-cyber-text">
            
            {/* Section 1: Themes & Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-cyber-cyan" />
                  <span>Tactical Theme Presets</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-cyber-muted font-bold">
                  4 CANONICAL THEMES
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-cyber-bg border-cyber-cyan shadow-sm ring-1 ring-cyber-cyan/30'
                          : 'bg-white dark:bg-cyber-bg/40 border-slate-200 dark:border-cyber-border hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 w-full">
                        <div className="flex items-center gap-2">
                          {/* Dual Swatch (Dark & Light dots) */}
                          <div className="flex items-center -space-x-1 flex-shrink-0" title="Dark & Light accents">
                            <span 
                              className="w-4 h-4 rounded-full border border-black/30 z-10 shadow-sm"
                              style={{ backgroundColor: preset.darkAccentHex }}
                            />
                            <span 
                              className="w-4 h-4 rounded-full border border-white/60 shadow-sm"
                              style={{ backgroundColor: preset.lightAccentHex }}
                            />
                          </div>

                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-cyber-cyan" />
                              <span>{preset.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-cyber-muted">
                              {preset.tagline}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="p-0.5 rounded-full bg-cyber-cyan/20 text-cyber-cyan flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-cyber-border flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-cyber-border/40 text-[9px] text-slate-500 dark:text-cyber-muted">
                        <span className="font-mono">Active Accent: {activeAccent}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-[8px] font-bold">
                          {preset.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Design Token Swatches Bar */}
            <div className="pt-2 border-t border-slate-200 dark:border-cyber-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyber-cyan" />
                  <span>Design Token Palette (1-Click Copy)</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-cyber-muted">
                  Click any swatch to copy CSS variable
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {QUICK_DESIGN_TOKENS.map((token) => {
                  const tokenColor = isDark ? token.darkHex : token.lightHex;
                  const isCopied = copiedToken === token.varName;

                  return (
                    <button
                      key={token.varName}
                      type="button"
                      onClick={() => handleCopyToken(token.varName)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/50 hover:border-cyber-cyan transition-all text-left flex items-center gap-2 group"
                      title={`Click to copy ${token.varName} (${tokenColor})`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-md flex-shrink-0 shadow-sm border border-black/20"
                        style={{ backgroundColor: tokenColor }}
                      />
                      <div className="truncate flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                          <span>{token.name}</span>
                          {isCopied ? (
                            <span className="text-[9px] text-cyber-emerald font-bold">COPIED!</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-cyber-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-cyber-muted font-mono truncate">
                          {tokenColor}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Deep Link to Full Studio Matrix */}
              <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-cyber-bg/40 border border-slate-200 dark:border-cyber-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan flex-shrink-0">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Full Theme & Color Matrix Inspector</div>
                    <div className="text-[10px] text-slate-500 dark:text-cyber-muted">Inspect 17 tokens, typography scale & WCAG contrast audit</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsModalOpen(false);
                    window.location.hash = '#/theme';
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyber-cyan/15 hover:bg-cyan-100 dark:hover:bg-cyber-cyan/25 border border-cyan-400 dark:border-cyber-cyan/40 text-cyan-800 dark:text-cyber-cyan font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm group whitespace-nowrap"
                >
                  <span>Open Full Studio</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Section 2: Mode & Display Settings */}
            <div className="pt-2 border-t border-slate-200 dark:border-cyber-border space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-cyber-cyan" />
                <span>Display & Mode</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dark / Light Toggle */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Color Mode</div>
                    <div className="text-[10px] text-slate-400 dark:text-cyber-muted">
                      {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-cyber-card p-0.5 rounded-lg border border-slate-300 dark:border-cyber-border">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('dark');
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        isDark 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
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
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        !isDark 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                  </div>
                </div>

                {/* Audio Feedback */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Audio Feedback</div>
                    <div className="text-[10px] text-slate-400 dark:text-cyber-muted">
                      Web Audio tactical SFX
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSound()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all ${
                      soundEnabled
                        ? 'border-cyber-emerald bg-cyber-emerald/15 text-cyber-emerald'
                        : 'border-slate-300 dark:border-cyber-border bg-white dark:bg-cyber-card text-slate-400'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
                  </button>
                </div>
              </div>

              {/* UI Scaling */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Interface Scaling</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-cyber-muted uppercase font-bold">
                    Active: {uiScale || 'normal'}
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
                      className={`py-1.5 rounded-lg border text-center font-bold text-[10px] uppercase transition-all ${
                        uiScale === scale
                          ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-sm'
                          : 'bg-white dark:bg-cyber-card border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:border-slate-400'
                      }`}
                    >
                      {scale}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Attacker Variables Default */}
            <div className="pt-2 border-t border-slate-200 dark:border-cyber-border space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyber-emerald" />
                <span>Default Attacker Variables</span>
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-cyber-muted block mb-1">
                    Attacker IP (LHOST)
                  </label>
                  <input
                    type="text"
                    value={globalVars.lhost}
                    onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                    placeholder="10.10.14.x"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-cyber-muted block mb-1">
                    Attacker Port (LPORT)
                  </label>
                  <input
                    type="text"
                    value={globalVars.lport}
                    onChange={(e) => setGlobalVars({ lport: e.target.value })}
                    placeholder="4444"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyber-cyan font-mono"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-cyber-bg/80 border-t border-slate-200 dark:border-cyber-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsModalOpen(false);
                  setBackupModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-cyber-card transition-all flex items-center gap-1.5 border border-slate-200 dark:border-cyber-border"
              >
                <Database className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">Backup Database</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsModalOpen(false);
                  useCtfStore.getState().setLicenseModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-cyber-card transition-all flex items-center gap-1.5 border border-slate-200 dark:border-cyber-border"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">License</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSettingsModalOpen(false);
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyber-cyan hover:bg-cyan-400 text-black shadow-sm transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
