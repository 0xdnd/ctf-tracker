import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  Copy, 
  Layers, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  Terminal, 
  ArrowRight,
  Gauge,
  Laptop
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme, ThemeMode } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';

export const ThemeShowcaseDemo: React.FC = () => {
  const { theme, effectiveTheme, isDark, setTheme, toggleTheme, prefersReducedMotion, systemTheme } = useTheme();
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'specs'>('preview');

  const handleCopyCode = () => {
    const codeSnippet = `import { ThemeToggle } from './components/common/ThemeToggle';
import { useTheme } from './hooks/useTheme';

export function NavigationBar() {
  const { isDark } = useTheme();
  
  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-bold">App Brand</h1>
      <ThemeToggle size="md" showLabel soundEnabled />
    </header>
  );
}`;
    navigator.clipboard.writeText(codeSnippet);
    setCopiedCode(true);
    playCyberSound('copy');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCornerRipple = (corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') => {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (corner === 'top-left') {
      clientX = 30;
      clientY = 30;
    } else if (corner === 'top-right') {
      clientX = window.innerWidth - 30;
      clientY = 30;
    } else if (corner === 'bottom-left') {
      clientX = 30;
      clientY = window.innerHeight - 30;
    } else if (corner === 'bottom-right') {
      clientX = window.innerWidth - 30;
      clientY = window.innerHeight - 30;
    }

    // Synthesize a MouseEvent with the desired client coordinates
    const syntheticEvent = {
      clientX,
      clientY,
      preventDefault: () => {},
    } as unknown as React.MouseEvent;

    toggleTheme(syntheticEvent);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-500 py-8 px-3 sm:px-6 lg:px-10 ${
        isDark
          ? 'bg-[#0B0F19] text-[#E2E8F0]'
          : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Hero */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b transition-colors duration-300 border-opacity-30 border-gray-500">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl border shadow-sm transition-colors duration-300 ${
                  isDark
                    ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-400'
                    : 'bg-amber-100 border-amber-300 text-amber-600'
                }`}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                Liquid Celestial Theme Toggle
              </h1>
            </div>
            <p className="text-sm font-sans max-w-xl opacity-80 leading-relaxed">
              Production-grade dark/light mode toggle with organic spring physics (damping: 18, stiffness: 220),
              squash-and-stretch thumb dynamics, custom celestial SVG morphing, and liquid circular ripple reveals.
            </p>
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span
              className={`px-3 py-1 rounded-full border transition-colors ${
                isDark
                  ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                  : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}
            >
              Framer Motion 11
            </span>
            <span
              className={`px-3 py-1 rounded-full border transition-colors ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              WCAG 2.1 AA
            </span>
            <span
              className={`px-3 py-1 rounded-full border transition-colors ${
                isDark
                  ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              View Transitions API
            </span>
          </div>
        </header>

        {/* Interactive Playground Control Center */}
        <section
          className={`rounded-2xl p-6 sm:p-8 border shadow-xl transition-all duration-300 ${
            isDark
              ? 'bg-[#111827] border-gray-800 shadow-indigo-950/20'
              : 'bg-white border-slate-200 shadow-slate-200/50'
          }`}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Live Size Variants */}
            <div className="flex flex-col sm:flex-row items-center gap-8 w-full lg:w-auto justify-around">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider opacity-60">Small (56px)</span>
                <ThemeToggle size="sm" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider opacity-60">Medium (68px)</span>
                <ThemeToggle size="md" showLabel />
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider opacity-60">Large (84px)</span>
                <ThemeToggle size="lg" />
              </div>
            </div>

            {/* Mode & Preference Selectors */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                    : 'bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 hover:text-amber-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                    : 'bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-900/60 hover:text-indigo-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-2 ring-purple-400'
                    : 'bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-900/60 hover:text-purple-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>System ({systemTheme})</span>
              </button>
            </div>
          </div>

          {/* Liquid Ripple Origin Trigger Pad */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Liquid Ripple Reveal Coordinate Triggers</span>
                </h3>
                <p className="text-xs opacity-70 font-sans">
                  Click any origin anchor below to test the circular color-flood reveal animation expanding from that exact coordinate.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => handleCornerRipple('top-left')}
                  className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                >
                  ↖ Top-Left
                </button>
                <button
                  type="button"
                  onClick={() => handleCornerRipple('top-right')}
                  className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                >
                  ↗ Top-Right
                </button>
                <button
                  type="button"
                  onClick={() => handleCornerRipple('center')}
                  className="px-2.5 py-1 rounded bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all cursor-pointer font-bold"
                >
                  ⦿ Center
                </button>
                <button
                  type="button"
                  onClick={() => handleCornerRipple('bottom-left')}
                  className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                >
                  ↙ Bottom-Left
                </button>
                <button
                  type="button"
                  onClick={() => handleCornerRipple('bottom-right')}
                  className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                >
                  ↘ Bottom-Right
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Live UI Components Showcase Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-sans tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span>Adaptive UI Surface Verification</span>
            </h2>
            <span className="text-xs font-mono opacity-60">
              Active Mode: <strong className="uppercase">{effectiveTheme}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Metric & Operations HUD */}
            <motion.div
              layout
              className={`rounded-2xl p-6 border transition-all duration-300 ${
                isDark
                  ? 'bg-[#111827] border-gray-800 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 shadow-md shadow-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-xs font-mono font-bold text-indigo-500 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
                  <span>PWN TELEMETRY</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-sans">55 / 931</span>
                  <span className="text-xs font-mono text-emerald-500 font-bold">+100% Verified</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 w-[5.9%]" />
                </div>
                <div className="flex justify-between text-xs font-mono opacity-70">
                  <span>HTB: 37 Solved</span>
                  <span>THM: 18 Solved</span>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Typography & Readability */}
            <motion.div
              layout
              className={`rounded-2xl p-6 border transition-all duration-300 ${
                isDark
                  ? 'bg-[#111827] border-gray-800 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 shadow-md shadow-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-xs font-mono font-bold text-purple-500 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" />
                  <span>TYPOGRAPHY SPECS</span>
                </span>
                <span className="text-[11px] font-mono opacity-60">WCAG AAA</span>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-base font-bold font-sans">Adaptive Contrast Hierarchy</h4>
                <p className="text-xs font-sans opacity-75 leading-relaxed">
                  Headings, sublines, and muted body copy dynamically shift contrast levels to prevent eye strain in dark environments while maintaining crisp sunlight legibility.
                </p>
                <div className="pt-2">
                  <code className="text-[11px] font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-purple-600 dark:text-purple-400">
                    contrast-ratio: 12.4:1
                  </code>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Button States & Actions */}
            <motion.div
              layout
              className={`rounded-2xl p-6 border transition-all duration-300 ${
                isDark
                  ? 'bg-[#111827] border-gray-800 shadow-lg shadow-black/40'
                  : 'bg-white border-slate-200 shadow-md shadow-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-xs font-mono font-bold text-sky-500 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>ACTION PALETTE</span>
                </span>
                <span className="text-[11px] font-mono opacity-60">Tokens</span>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => playCyberSound('root')}
                  className="w-full py-2 px-3 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Primary Execution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => playCyberSound('click')}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    isDark
                      ? 'bg-transparent border-gray-700 text-gray-200 hover:bg-gray-800/80 hover:border-gray-600'
                      : 'bg-transparent border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                  }`}
                >
                  Secondary Action
                </button>

                <div className="flex items-center justify-between pt-1 text-xs font-mono opacity-80">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Focus-Visible Ready</span>
                  </span>
                  <span>44px Tap Target</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Integration Code & Architecture Specs Tabs */}
        <section
          className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            isDark
              ? 'bg-[#111827] border-gray-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-xs font-mono font-bold pb-1 cursor-pointer transition-colors border-b-2 ${
                  activeTab === 'preview'
                    ? 'border-indigo-500 text-indigo-500'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                Architecture & Physics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`text-xs font-mono font-bold pb-1 cursor-pointer transition-colors border-b-2 ${
                  activeTab === 'code'
                    ? 'border-indigo-500 text-indigo-500'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                Quickstart Code
              </button>
            </div>

            {activeTab === 'code' && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer font-bold"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-6 font-mono text-xs leading-relaxed">
            {activeTab === 'preview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-indigo-400">1. Micro-Interactions & Physics</h4>
                  <ul className="list-disc list-inside space-y-1.5 opacity-80">
                    <li>Spring: <code className="text-purple-400">damping: 18, stiffness: 220, mass: 0.8</code></li>
                    <li>Squash & Stretch: <code className="text-purple-400">scaleX: 1.18, scaleY: 0.88</code> on drag/tap</li>
                    <li>Pill dynamic gradient: Light sky to deep midnight navy</li>
                    <li>Cloud layers: 3-bubble pillowy layers with gentle drift</li>
                    <li>Twinkling stars: Staggered opacity keyframes (2.2s - 3.1s loop)</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-indigo-400">2. Celestial SVG Morphing & Transitions</h4>
                  <ul className="list-disc list-inside space-y-1.5 opacity-80">
                    <li>8 Sun Rays: Contract inward with -45° rotation & scale: 0</li>
                    <li>Dynamic SVG Mask: Sweeps in from top-right to form crescent</li>
                    <li>Moon craters: 3 lunar spots fade in during dark mode</li>
                    <li>Liquid Circular Reveal: 650ms expanding radial clip-path</li>
                    <li>A11y: <code className="text-emerald-400">prefers-reduced-motion</code> instant fallback</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <pre className="p-4 rounded-xl bg-gray-900 text-gray-200 overflow-x-auto text-[12px] border border-gray-800">
{`import { ThemeToggle } from './components/common/ThemeToggle';
import { useTheme } from './hooks/useTheme';

export function NavigationBar() {
  const { isDark, theme, setTheme } = useTheme();
  
  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-bold">App Brand</h1>
      <ThemeToggle size="md" showLabel soundEnabled />
    </header>
  );
}`}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
