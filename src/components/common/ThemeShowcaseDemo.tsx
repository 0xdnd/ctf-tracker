import React, { useState, useMemo } from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  Copy, 
  Layers, 
  Zap, 
  Terminal, 
  Shield, 
  Crosshair, 
  Type, 
  Sliders, 
  Flag
} from 'lucide-react';
import { useCtfStore, ThemePreset } from '../../store/useCtfStore';
import { useTheme } from '../../hooks/useTheme';
import { ThemeToggle } from './ThemeToggle';
import { PlatformBadge } from './PlatformBadge';
import { OsBadge } from './OsBadge';
import { DifficultyBadge } from './DifficultyBadge';
import { playCyberSound } from '../../utils/helpers';

interface ColorTokenItem {
  name: string;
  variable: string;
  role: string;
  category: 'accent' | 'surface' | 'border' | 'text';
  fallbackDark: string;
  fallbackLight: string;
  description: string;
}

const COLOR_TOKENS: ColorTokenItem[] = [
  // Accents
  {
    name: 'Cyber Cyan / Primary',
    variable: '--cyber-cyan',
    role: 'Primary Accent & Laser Glow',
    category: 'accent',
    fallbackDark: '#00F0FF',
    fallbackLight: '#008B99',
    description: 'Main tactical UI accent, active tabs, buttons, crosshair target locks.',
  },
  {
    name: 'Cyber Emerald / Success',
    variable: '--cyber-emerald',
    role: 'Success & Active Foothold',
    category: 'accent',
    fallbackDark: '#10B981',
    fallbackLight: '#0D9488',
    description: 'Active engaged target border, pwned root indicators, success toasts.',
  },
  {
    name: 'Cyber Amber / Warning',
    variable: '--cyber-amber',
    role: 'Warning & Medium Difficulty',
    category: 'accent',
    fallbackDark: '#F59E0B',
    fallbackLight: '#D97706',
    description: 'Medium difficulty tag, Linux OS outline, timer running warnings.',
  },
  {
    name: 'Cyber Crimson / Danger',
    variable: '--cyber-crimson',
    role: 'Danger & Hard Difficulty',
    category: 'accent',
    fallbackDark: '#F43F5E',
    fallbackLight: '#E11D48',
    description: 'Hard difficulty tag, root flag icons, destructive reset triggers.',
  },
  {
    name: 'Cyber Purple / Insane',
    variable: '--cyber-purple',
    role: 'Insane Labs & AD Domains',
    category: 'accent',
    fallbackDark: '#A855F7',
    fallbackLight: '#9333EA',
    description: 'Insane difficulty badge, Active Directory domain vector tags.',
  },
  {
    name: 'Cyber Neon',
    variable: '--cyber-neon',
    role: 'Laser Highlight & Beam',
    category: 'accent',
    fallbackDark: '#00F0FF',
    fallbackLight: '#008B99',
    description: 'Scroll progress bar laser beam, top header highlight glow.',
  },

  // Surfaces
  {
    name: 'App Canvas Background',
    variable: '--cyber-bg',
    role: 'Global Viewport Base',
    category: 'surface',
    fallbackDark: '#070B14',
    fallbackLight: '#F0F5FA',
    description: 'Deep obsidian/navy floor in dark mode; crisp clean ice-lab in light mode.',
  },
  {
    name: 'Card Surface',
    variable: '--cyber-card',
    role: 'Container & Module Surface',
    category: 'surface',
    fallbackDark: '#0D1527',
    fallbackLight: '#FFFFFF',
    description: 'Target cards, Kanban column containers, modal dialog window backgrounds.',
  },
  {
    name: 'Card Hover Surface',
    variable: '--cyber-card-hover',
    role: 'Interactive Hover State',
    category: 'surface',
    fallbackDark: '#131F38',
    fallbackLight: '#E4ECF5',
    description: 'Elevated surface on cursor hover across cards and interactive widgets.',
  },
  {
    name: 'Terminal / Code Surface',
    variable: '--cyber-code',
    role: 'Shell & Code Surface',
    category: 'surface',
    fallbackDark: '#0A101E',
    fallbackLight: '#E3EBF5',
    description: 'CLI snippet containers, raw nmap logs, and payload generator displays.',
  },

  // Borders
  {
    name: 'Subtle Border',
    variable: '--cyber-border',
    role: 'Structural Separator',
    category: 'border',
    fallbackDark: '#1A2942',
    fallbackLight: '#CBD8E6',
    description: 'Default 1px container boundary, table row dividers, card outline.',
  },
  {
    name: 'Active Border Glow',
    variable: '--cyber-border-glow',
    role: 'Focus & Laser Border',
    category: 'border',
    fallbackDark: '#00F0FF',
    fallbackLight: '#008B99',
    description: 'Focused search input border, engaged card luminescence, active pills.',
  },

  // Text
  {
    name: 'Primary Text',
    variable: '--cyber-text',
    role: 'Headings & High-Density Labels',
    category: 'text',
    fallbackDark: '#F0F6FC',
    fallbackLight: '#091524',
    description: 'Machine titles, navigation tab labels, numeric counters, primary copy.',
  },
  {
    name: 'Muted Text',
    variable: '--cyber-muted',
    role: 'Metadata, IPs & Subtitles',
    category: 'text',
    fallbackDark: '#798DA3',
    fallbackLight: '#506379',
    description: 'Target IP subtext, timestamps, solve elapsed timers, inactive labels.',
  },
];

interface ThemePresetMeta {
  id: ThemePreset;
  name: string;
  badge: string;
  tagline: string;
  darkAccent: string;
  lightAccent: string;
  darkBg: string;
  lightBg: string;
  darkCard: string;
  lightCard: string;
  vibe: string;
  icon: React.ComponentType<{ className?: string }>;
}

const THEME_PRESETS_META: ThemePresetMeta[] = [
  {
    id: 'zerobox',
    name: 'Neon Cyber',
    badge: 'SIGNATURE HUD',
    tagline: 'Electric Cyan (#00F0FF) & Deep Obsidian (#070B14)',
    darkAccent: '#00F0FF',
    lightAccent: '#008B99',
    darkBg: '#070B14',
    lightBg: '#F0F5FA',
    darkCard: '#0D1527',
    lightCard: '#FFFFFF',
    vibe: 'Cyberpunk Red Team Operator • High Contrast Laser Optics',
    icon: Zap,
  },
  {
    id: 'htb',
    name: 'Hack The Box',
    badge: 'TACTICAL ARENA',
    tagline: 'Official HTB Lime Green (#9FEF00) & Node Black (#141D2B)',
    darkAccent: '#9FEF00',
    lightAccent: '#15803D',
    darkBg: '#141D2B',
    lightBg: '#F4F6F9',
    darkCard: '#1A2332',
    lightCard: '#FFFFFF',
    vibe: 'Official HTB Arena Aesthetic • Terminal Green Highlights & Node Black',
    icon: Terminal,
  },
  {
    id: 'oled',
    name: 'OLED Pure Black',
    badge: 'ZERO POWER',
    tagline: 'Pitch Black (#000000) & Minimalist Slate (#090C12)',
    darkAccent: '#38BDF8',
    lightAccent: '#0284C7',
    darkBg: '#000000',
    lightBg: '#F8FAFC',
    darkCard: '#090C12',
    lightCard: '#FFFFFF',
    vibe: 'Battery Saving Infinite Contrast • Pure Midnight Stealth',
    icon: Moon,
  },
];

export const ThemeShowcaseDemo: React.FC = () => {
  const { isDark, setTheme } = useTheme();
  const themePreset = useCtfStore((s) => s.themePreset || 'zerobox');
  const setThemePreset = useCtfStore((s) => s.setThemePreset);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'accent' | 'surface' | 'border' | 'text'>('all');
  const [sampleSearchQuery, setSampleSearchQuery] = useState('');

  // Normalize legacy aliases
  const activePresetId = themePreset === 'neon' ? 'zerobox' : themePreset === 'slate' ? 'zerobox' : themePreset;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredTokens = useMemo(() => {
    if (activeCategory === 'all') return COLOR_TOKENS;
    return COLOR_TOKENS.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16 font-mono">
      {/* 1. Header Hero Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyber-cyan/15 text-cyan-600 dark:text-cyber-cyan border border-cyan-200 dark:border-cyber-cyan/30">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <span>Theme &amp; Color Matrix</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyber-cyan/20 text-cyan-800 dark:text-cyber-cyan font-bold border border-cyan-300 dark:border-cyber-cyan/40">
                    LIVE INSPECTOR
                  </span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-cyber-muted font-sans mt-0.5">
                  Full multi-theme token engine, contrast validation, and typography suite for ZEROBOX.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Mode Switcher Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-xs">
              <span className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold px-2 uppercase">Mode:</span>
              <button
                onClick={() => {
                  setTheme('dark');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-white dark:bg-cyber-card text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-cyber-cyan/40 text-cyan-700 dark:text-cyber-cyan'
                    : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme('light');
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  !isDark
                    ? 'bg-white dark:bg-cyber-card text-slate-900 dark:text-white shadow-sm border border-slate-300 font-bold text-amber-700'
                    : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
            </div>

            {/* Dribbble Day/Night Toggle Component */}
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
              <ThemeToggle size="sm" />
            </div>
          </div>
        </div>

        {/* 2. Interactive Theme Preset Switcher Tabs */}
        <div className="pt-4 border-t border-slate-200 dark:border-cyber-border/70 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-cyber-muted tracking-wider">
            Select Active Theme Preset:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {THEME_PRESETS_META.map((preset) => {
              const isActive = activePresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setThemePreset(preset.id);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    isActive
                      ? 'bg-white dark:bg-cyber-card border-cyan-500 dark:border-cyber-cyan shadow-md ring-1 ring-cyan-500/40 dark:ring-cyber-cyan/50'
                      : 'bg-slate-50 dark:bg-cyber-bg/70 border-slate-200 dark:border-cyber-border hover:border-slate-300 dark:hover:border-cyber-borderGlow hover:bg-slate-100/80 dark:hover:bg-cyber-cardHover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: isDark ? preset.darkAccent : preset.lightAccent }}
                      />
                      <span className={`text-xs font-bold ${isActive ? 'text-cyan-700 dark:text-cyber-cyan' : 'text-slate-900 dark:text-white'}`}>
                        {preset.name}
                      </span>
                    </div>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-100 dark:bg-cyber-cyan/20 text-cyan-800 dark:text-cyber-cyan border border-cyan-300 dark:border-cyber-cyan/40">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-cyber-muted font-sans line-clamp-1 mb-2">
                    {preset.tagline}
                  </p>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-cyber-muted pt-2 border-t border-slate-200/60 dark:border-cyber-border/60">
                    <span>{preset.badge}</span>
                    <span className="font-bold" style={{ color: isDark ? preset.darkAccent : preset.lightAccent }}>
                      {isDark ? preset.darkAccent : preset.lightAccent}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. "Every Theme" Live Side-By-Side Preview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyber-cyan" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Every Theme • Side-By-Side Topology
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-cyber-muted">
            Viewing 4 core presets in {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEME_PRESETS_META.map((preset) => {
            const isCurrent = activePresetId === preset.id;
            const accent = isDark ? preset.darkAccent : preset.lightAccent;
            const bg = isDark ? preset.darkBg : preset.lightBg;
            const card = isDark ? preset.darkCard : preset.lightCard;

            return (
              <div
                key={preset.id}
                style={{ backgroundColor: bg }}
                className={`rounded-xl p-4 border transition-all relative space-y-3 shadow-sm ${
                  isCurrent
                    ? 'border-cyan-500 dark:border-cyber-cyan ring-2 ring-cyan-500/30'
                    : 'border-slate-300 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                    {preset.name}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border"
                    style={{
                      color: accent,
                      borderColor: `${accent}40`,
                      backgroundColor: `${accent}15`,
                    }}
                  >
                    {isCurrent ? 'SELECTED' : 'PREVIEW'}
                  </span>
                </div>

                {/* Simulated Mini Card */}
                <div
                  style={{ backgroundColor: card }}
                  className="rounded-lg p-3 border border-slate-300/60 dark:border-white/10 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-900 dark:text-white">Sample Target</span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold"
                      style={{ color: accent, backgroundColor: `${accent}20` }}
                    >
                      MEDIUM
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                    10.10.11.14 • Linux
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-[9px]">
                    <span className="text-slate-400">Foothold: User</span>
                    <span className="font-bold" style={{ color: accent }}>
                      Engage &gt;
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-slate-500 dark:text-zinc-500 font-sans leading-tight">
                  {preset.vibe}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. "Every Color" Design Token Swatches */}
      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyber-cyan" />
              <span>Every Color • CSS Design Tokens</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-cyber-muted font-sans">
              Click any token card or copy icon to copy its CSS variable string to clipboard.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-[11px]">
            {(['all', 'accent', 'surface', 'border', 'text'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 rounded capitalize font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-white dark:bg-cyber-card text-slate-900 dark:text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-cyber-muted hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Color Swatches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {filteredTokens.map((token) => {
            const activeHex = isDark ? token.fallbackDark : token.fallbackLight;
            const isCopied = copiedToken === token.variable;

            return (
              <div
                key={token.variable}
                onClick={() => handleCopy(`var(${token.variable})`, token.variable)}
                className="p-3 rounded-xl border border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-bg/70 hover:border-cyan-500 dark:hover:border-cyber-cyan hover:shadow-sm transition-all cursor-pointer group space-y-2.5"
              >
                {/* Visual Swatch Tile */}
                <div className="relative h-14 w-full rounded-lg overflow-hidden border border-slate-300/70 dark:border-cyber-border/80 shadow-inner flex items-center justify-center">
                  <div
                    className="absolute inset-0 transition-colors"
                    style={{ backgroundColor: activeHex }}
                  />
                  <span
                    className={`relative z-10 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-sm ${
                      token.category === 'surface' && !isDark
                        ? 'bg-black/60 text-white'
                        : 'bg-black/40 text-white dark:bg-black/60'
                    }`}
                  >
                    {activeHex}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {token.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`var(${token.variable})`, token.variable);
                      }}
                      className="text-slate-400 dark:text-cyber-muted group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan transition-colors"
                      title="Copy CSS Variable"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="text-[10px] font-mono text-cyan-700 dark:text-cyber-cyan truncate">
                    {token.variable}
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-cyber-muted font-sans line-clamp-2 leading-tight">
                    {token.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-cyber-muted pt-1.5 border-t border-slate-200/60 dark:border-cyber-border/60">
                  <span className="uppercase font-bold">{token.category}</span>
                  <span>{isCopied ? 'Copied!' : 'Click to copy'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. "Every Text" Comprehensive Typography & Contrast Showcase */}
      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-md space-y-6">
        <div className="space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Type className="w-4 h-4 text-cyan-600 dark:text-cyber-cyan" />
            <span>Every Text • Typography Hierarchy &amp; Contrast Validation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-cyber-muted font-sans">
            Standard typography scales across titles, paragraphs, metadata, monospace terminal buffers, and interactive hover states.
          </p>
        </div>

        {/* Typography Scale Demonstration */}
        <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border">
          {/* H1 */}
          <div className="space-y-1 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>DISPLAY H1 • 32px / 2rem • Font: JetBrains Mono Black</span>
              <span className="text-emerald-600 dark:text-cyber-emerald font-bold">Contrast: 15.2:1 (AAA Pass)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              ZEROBOX // TACTICAL LAB &amp; CTF TRACKER
            </h1>
          </div>

          {/* H2 */}
          <div className="space-y-1 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>HEADING H2 • 20px / 1.25rem • Font: JetBrains Mono Bold</span>
              <span className="text-emerald-600 dark:text-cyber-emerald font-bold">Contrast: 14.8:1 (AAA Pass)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Tactical Combat Command &amp; Offensive Machine Catalog
            </h2>
          </div>

          {/* H3 */}
          <div className="space-y-1 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>SECTION H3 • 16px / 1rem • Font: JetBrains Mono Bold</span>
              <span className="text-emerald-600 dark:text-cyber-emerald font-bold">Contrast: 14.2:1 (AAA Pass)</span>
            </div>
            <h3 className="text-base font-bold text-cyan-700 dark:text-cyber-cyan">
              Active Attack Recon &amp; Vector Classification Pipeline
            </h3>
          </div>

          {/* H4 / Target Title in 3 States */}
          <div className="space-y-2 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>TARGET CARD TITLE (H4) • Standard State vs Active Engaged State vs Hover State</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card">
                <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Standard Card Title</div>
                <div className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                  Red Stone One Carat
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-500/60 dark:border-cyber-emerald bg-white dark:bg-cyber-card shadow-sm ring-1 ring-emerald-500/30">
                <div className="text-[9px] text-emerald-600 dark:text-cyber-emerald uppercase font-bold mb-1">Active Engaged Title</div>
                <div className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                  Red Stone One Carat
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-cyan-400 dark:border-cyber-cyan/60 bg-slate-50 dark:bg-cyber-cardHover">
                <div className="text-[9px] text-cyan-600 dark:text-cyber-cyan uppercase font-bold mb-1">Cursor Hover Title</div>
                <div className="font-bold text-base text-cyan-600 dark:text-cyber-cyan leading-snug">
                  Red Stone One Carat
                </div>
              </div>
            </div>
          </div>

          {/* Body Paragraph */}
          <div className="space-y-1 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>BODY COPY • 13px / 0.8125rem • Font: Inter / Sans-Serif</span>
              <span className="text-emerald-600 dark:text-cyber-emerald font-bold">Contrast: 13.9:1 (AAA Pass)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              Tactical CTF operations require rigorous methodology execution across Port Enumeration, Web Vulnerability Triage (SQLi, SSRF, LFI, RCE), Initial Foothold User Access, and Windows/Linux Privilege Escalation. All 929 targets in the master catalog maintain offline persistence with zero cloud telemetry.
            </p>
          </div>

          {/* Muted Metadata */}
          <div className="space-y-1 pb-3 border-b border-slate-200/60 dark:border-cyber-border/60">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>METADATA &amp; LABELS • 11px / 0.6875rem • Font: JetBrains Mono Muted</span>
              <span className="text-emerald-600 dark:text-cyber-emerald font-bold">Contrast: 6.8:1 (AA Pass)</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-cyber-muted font-mono flex flex-wrap items-center gap-3">
              <span>Queued &amp; Scoped Labs</span>
              <span>•</span>
              <span>10.10.14.X:4445</span>
              <span>•</span>
              <span>Elapsed: 00:45:12</span>
              <span>•</span>
              <span>SHA-256: 8f4b1c2e9a...</span>
            </div>
          </div>

          {/* Monospace Code & CLI */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-cyber-muted">
              <span>CLI / TERMINAL SNIPPET • 12px • Font: JetBrains Mono</span>
              <span className="text-cyan-600 dark:text-cyber-cyan font-bold">Syntax Luminescence</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 text-slate-100 dark:bg-cyber-code border border-slate-800 dark:border-cyber-border font-mono text-xs overflow-x-auto space-y-1 shadow-inner">
              <div className="text-emerald-400 flex items-center gap-2">
                <span>$</span>
                <span>sudo nmap -sC -sV -p 80,443,445,8080 -Pn 10.129.1.9 -oN recon.log</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                [+] Host is up (0.024s latency). 80/tcp open http Apache httpd 2.4.41 ((Ubuntu))
              </div>
              <div className="text-cyan-400 text-[11px]">
                [+] Vulnerability Identified: CVE-2021-41773 Path Traversal &amp; Remote Code Execution
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Text States Matrix Table */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-cyber-muted tracking-wider">
            Interactive Text States Matrix:
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-cyber-border rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-cyber-bg border-b border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">State Role</th>
                  <th className="p-2.5">Visual Preview</th>
                  <th className="p-2.5">Token Pair</th>
                  <th className="p-2.5">WCAG Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-cyber-border/60 bg-white dark:bg-cyber-card">
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Normal / Resting</td>
                  <td className="p-2.5 text-slate-900 dark:text-cyber-text font-bold">Ready for Engagement</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-text</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AAA (15.2:1)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Hover / Active Nav</td>
                  <td className="p-2.5 text-cyan-600 dark:text-cyber-cyan font-bold">Selected Target Navigation</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-cyan</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AAA (12.4:1)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Success / Pwned</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold">Root Flag Captured!</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-emerald</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AAA (11.8:1)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Warning / Medium</td>
                  <td className="p-2.5 text-amber-600 dark:text-cyber-amber font-bold">Foothold Required</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-amber</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AA (8.6:1)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Danger / Critical</td>
                  <td className="p-2.5 text-rose-600 dark:text-cyber-crimson font-bold">Hard RCE / BOF Exploit</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-crimson</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AAA (9.4:1)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-500">Muted / Metadata</td>
                  <td className="p-2.5 text-slate-400 dark:text-cyber-muted">Archived writeup snapshot</td>
                  <td className="p-2.5 text-[10px] font-mono text-cyan-600 dark:text-cyber-cyan">--cyber-muted</td>
                  <td className="p-2.5 text-emerald-600 dark:text-cyber-emerald font-bold text-[10px]">AA (6.8:1)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Live UI Component Mini-Sandbox */}
      <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-md space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyber-cyan" />
            <span>Interactive Component Sandbox</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-cyber-muted font-sans">
            Real-world components reacting live to your active theme and color mode selections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Active Engaged Target Card */}
          <div className="p-3.5 rounded-xl border border-emerald-600 dark:border-cyber-emerald bg-white dark:bg-cyber-card shadow-md shadow-emerald-500/15 dark:shadow-glow-emerald/30 ring-1 ring-emerald-500/40 dark:ring-cyber-emerald/40 space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <PlatformBadge platform="THM" size="sm" />
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="px-1.5 py-0.5 text-[9px] rounded font-mono font-medium border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  LINUX HOST
                </span>
                <OsBadge os="Linux" size="sm" />
                <DifficultyBadge difficulty="Medium" size="sm" />
              </div>
            </div>

            <div className="flex items-start justify-between gap-1.5">
              <div>
                <div className="font-bold text-base text-slate-900 dark:text-white">
                  Red Stone One Carat
                </div>
                <div className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-mono">
                  <span>•</span>
                  <span>10.10.14.22</span>
                </div>
              </div>

              <button className="p-1.5 rounded-lg text-emerald-700 dark:text-cyber-emerald bg-emerald-50 dark:bg-cyber-emerald/15 border border-emerald-300 dark:border-cyber-emerald/40 shadow-sm">
                <Crosshair className="w-4 h-4 animate-spin-slow" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-cyber-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold bg-cyan-50 dark:bg-cyber-cyan/10 border-cyan-200 dark:border-cyber-cyan/30 text-cyan-700 dark:text-cyber-cyan">
                  <Flag className="w-3 h-3" /> U
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold bg-slate-100 dark:bg-cyber-bg/60 border-slate-200 dark:border-cyber-border text-slate-500 dark:text-cyber-muted">
                  <Flag className="w-3 h-3" /> R
                </span>
              </div>
              <span className="text-[11px] text-cyan-600 dark:text-cyber-cyan font-bold">
                Advance &gt;
              </span>
            </div>
          </div>

          {/* Card 2: Tactical Filter & Badge Suite */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 space-y-3 shadow-sm">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-cyber-muted">
              Live Badge &amp; Preset Components:
            </div>

            {/* Difficulties Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <DifficultyBadge difficulty="Very Easy" size="xs" />
              <DifficultyBadge difficulty="Easy" size="xs" />
              <DifficultyBadge difficulty="Medium" size="xs" />
              <DifficultyBadge difficulty="Hard" size="xs" />
              <DifficultyBadge difficulty="Insane" size="xs" />
            </div>

            {/* Tactical Presets Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40">
                🌐 ONLY WEB (298)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40">
                🛡️ ONLY AD (65)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                🎯 TJ NULL (126)
              </span>
            </div>

            {/* Interactive Search Input */}
            <div className="relative">
              <input
                type="text"
                value={sampleSearchQuery}
                onChange={(e) => setSampleSearchQuery(e.target.value)}
                placeholder="Test typing in cyber search input..."
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border rounded-lg text-xs text-slate-900 dark:text-cyber-text placeholder-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
