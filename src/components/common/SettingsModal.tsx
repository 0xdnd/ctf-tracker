import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import {
  Settings,
  X,
  Palette,
  Terminal,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Database,
  Server,
  Check,
  Zap,
  Copy,
  Sparkles,
  ShieldCheck,
  Crosshair,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { useCtfStore, ThemePreset, normalizeThemePreset } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme, extractCoordinates } from '../../hooks/useTheme';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { GuideControls } from '../../onboarding/GuideControls';
import { DesktopNotificationsToggle, SettingsSwitch } from './DesktopNotificationsToggle';

type PaletteTuple = readonly [base: string, card: string, border: string, accent: string];
type ThemePresetTuple = readonly [
  id: ThemePreset,
  name: string,
  tagline: string,
  badge: string,
  Icon: React.ComponentType<{ className?: string }>,
  dark: PaletteTuple,
  light: PaletteTuple,
];

const THEME_PRESETS: readonly ThemePresetTuple[] = [
  [
    'obsidian',
    'Obsidian Dark / Zinc',
    'Cold zinc dark and clean zinc slate',
    'Zinc dark',
    Zap,
    ['#09090b', '#121215', '#27272a', '#0ea5e9'],
    ['#f4f4f5', '#fff', '#d4d4d8', '#075985'],
  ],
  [
    'htb',
    'Hack The Box',
    'OLED black and official HTB lime',
    'HTB OLED',
    Terminal,
    ['#000', '#0b1015', '#1c2633', '#9fef00'],
    ['#f1f5f9', '#fff', '#cbd5e1', '#125f2e'],
  ],
  [
    'offsec',
    'Red Team / OffSec',
    'Carbon charcoal and tactical crimson',
    'Red Team',
    Crosshair,
    ['#09090c', '#101015', '#272730', '#ff5252'],
    ['#f8fafc', '#fff', '#cbd5e1', '#991b1b'],
  ],
];

const QUICK_DESIGN_TOKENS = [
  ['Accent', '--border-accent'],
  ['Success', '--callout-success-fg'],
  ['Warning', '--callout-warn-fg'],
  ['Danger', '--callout-danger-fg'],
  ['Info', '--callout-info-fg'],
  ['Card surface', '--surface-card'],
  ['Subtle border', '--border-subtle'],
  ['Primary text', '--text-primary'],
] as const;

const SCALE_STOPS = [
  ['tiny', '80%'],
  ['compact', '90%'],
  ['normal', '100%'],
  ['large', '110%'],
  ['huge', '122%'],
] as const;

const MODE_OPTIONS = [
  ['dark', 'Dark', Moon],
  ['light', 'Light', Sun],
] as const;

const VAR_FIELDS = [
  ['settings-lhost', 'Attacker IP (LHOST)', '10.10.14.x', 'lhost', false],
  ['settings-lport', 'Attacker Port (LPORT)', '4444', 'lport', true],
] as const;

const PRESS_CLS = 'transition-interactive active:scale-[0.97] cursor-pointer';
const TAP_CLS = '[@media(pointer:coarse)]:min-h-11';
const SECTION_CLS = 'pt-3.5 border-t border-subtle space-y-2';
const BETWEEN_CLS = 'flex items-center justify-between gap-2';
const HEADING_CLS = 'text-xs font-semibold text-primary flex items-center gap-2';
const LABEL_CLS = 'font-semibold text-xs text-primary';
const MUTED_SM = 'text-[11px] text-muted';
const PANEL_CLS = 'rounded-lg border border-subtle bg-surface-sunken/50';
const ROW_CLS = 'px-3.5 py-2 flex items-center justify-between gap-3';
const MINI_CARD_CLS = 'h-3.5 rounded-[3px] border px-1.5 flex items-center gap-1';
const ICON_MUTED = 'w-3.5 h-3.5 text-muted shrink-0';
const SWATCH_DOT = 'w-3 h-3 rounded-full border border-strong';
const INSET_CLS = 'border border-subtle bg-surface-sunken/80 dark:bg-surface-base';
const BAR_CLS = 'sticky z-10 px-5 sm:px-6 bg-surface-card flex items-center justify-between';
const INPUT_CLS =
  'w-full h-8 px-2.5 rounded-md bg-surface-card dark:bg-surface-base border border-subtle hover:border-strong text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-mono tabular-nums transition-colors';
const FOOTER_BTN_CLS = `px-3 py-1.5 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-hover hover:border-strong flex items-center justify-center gap-1.5 border border-subtle bg-surface-sunken/50 [@media(pointer:coarse)]:min-w-11 ${PRESS_CLS} ${TAP_CLS}`;

export const SettingsModal: React.FC = () => {
  const { settingsModalOpen, themePreset, soundEnabled, uiScale, globalVars } = useCtfStore(
    useShallow((s) => ({
      settingsModalOpen: s.settingsModalOpen,
      themePreset: s.themePreset,
      soundEnabled: s.soundEnabled,
      uiScale: s.uiScale,
      globalVars: s.globalVars,
    }))
  );
  const ctf = useCtfStore.getState();

  const { isDark, setTheme } = useTheme();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const click = () => { if (soundEnabled) playCyberSound('click'); };
  const close = () => { ctf.setSettingsModalOpen(false); click(); };

  const normalizedActivePreset: ThemePreset = normalizeThemePreset(themePreset);
  const activeScale = !uiScale || uiScale === 'auto' ? 'normal' : uiScale;
  const activeScalePct = SCALE_STOPS.find(([id]) => id === activeScale)?.[1] ?? '100%';
  const previewMuted = isDark ? '#71717a' : '#94a3b8';

  const handleCopyToken = (varName: string) => {
    void safeCopyToClipboard(varName);
    setCopiedToken(varName);
    click();
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedToken(null);
      copyTimerRef.current = null;
    }, 1500);
  };

  const rowTitle = (title: string, sub: string) => (
    <div className="min-w-0">
      <div className={LABEL_CLS}>{title}</div>
      <div className={`${MUTED_SM} mt-0.5`}>{sub}</div>
    </div>
  );

  return (
    <Modal
      open={settingsModalOpen}
      onClose={() => ctf.setSettingsModalOpen(false)}
      ariaLabel="Settings configuration modal"
      size="xl"
      panelClassName="surface-elevated-depth !max-h-[calc(90dvh/var(--app-zoom,1))]"
    >
      <div className="flex flex-col">
        {/* Sticky Header Bar (Modal owns the single scroll container) */}
        <div className={`${BAR_CLS} top-0 py-3 border-b border-subtle gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
              <Settings className="w-4 h-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-primary leading-tight">
                Operator settings
              </h2>
              <p className="text-xs text-muted mt-0.5 truncate">
                Themes, design tokens, audio feedback, and defaults
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className={`w-8 h-8 rounded-md border border-subtle bg-surface-card text-muted hover:text-primary hover:bg-surface-hover hover:border-strong flex items-center justify-center shrink-0 [@media(pointer:coarse)]:min-w-11 ${PRESS_CLS} ${TAP_CLS}`}
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 sm:px-6 py-3.5 space-y-3.5 text-xs text-secondary">
          {/* Section 1: Theme Presets */}
          <div data-tour="settings-themes" className="space-y-2">
            <div className={BETWEEN_CLS}>
              <h3 className={HEADING_CLS}>
                <Palette className={ICON_MUTED} aria-hidden />
                <span>Theme presets</span>
              </h3>
              <span className={`${MUTED_SM} font-medium`}>3 canonical themes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THEME_PRESETS.map(([id, name, tagline, badge, Icon, dark, light]) => {
                const isSelected = normalizedActivePreset === id;
                const [base, card, border, accent] = isDark ? dark : light;
                const cardStyle = { backgroundColor: card, borderColor: border };
                const accentStyle = { backgroundColor: accent };
                const mutedStyle = { backgroundColor: previewMuted };

                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => { ctf.setThemePreset(id); click(); }}
                    className={`group p-2.5 rounded-lg border text-left transition-interactive active:scale-[0.985] cursor-pointer flex flex-col gap-2 bg-surface-card ${
                      isSelected
                        ? 'dark:bg-surface-sunken/80 border-accent ring-1 ring-accent/35 shadow-xs'
                        : 'border-subtle hover:border-strong hover:bg-surface-sunken/30'
                    }`}
                  >
                    {/* Live miniature ZeroBox workspace preview */}
                    <div
                      aria-hidden
                      className="h-10 w-full rounded-sm border p-1.5 flex flex-col justify-between overflow-hidden"
                      style={{ backgroundColor: base, borderColor: border }}
                    >
                      <div className={BETWEEN_CLS}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-1 rounded-full" style={accentStyle} />
                          <span className="w-7 h-1 rounded-full opacity-45" style={mutedStyle} />
                        </div>
                        <span className="w-2.5 h-1 rounded-full opacity-35" style={mutedStyle} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className={MINI_CARD_CLS} style={cardStyle}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={accentStyle} />
                          <span className="h-1 flex-1 rounded-full opacity-40" style={mutedStyle} />
                        </div>
                        <div className={MINI_CARD_CLS} style={cardStyle}>
                          <span className="h-1 w-2/3 rounded-full opacity-35" style={mutedStyle} />
                        </div>
                      </div>
                    </div>

                    {/* Preset title, selection check & tagline */}
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`${LABEL_CLS} flex items-center gap-1.5 min-w-0`}>
                          <Icon
                            aria-hidden
                            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-muted group-hover:text-secondary'}`}
                          />
                          <span className="truncate">{name}</span>
                        </span>
                        {isSelected && (
                          <span aria-hidden className="w-4 h-4 rounded-full bg-accent text-on-accent flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className={`${MUTED_SM} leading-snug mt-0.5`}>{tagline}</p>
                    </div>

                    {/* Dual dark/light swatches + canonical badge */}
                    <div className={`${BETWEEN_CLS} pt-1.5 mt-auto border-t border-subtle`}>
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center -space-x-1" title="Dark & Light accents">
                          <span className={`${SWATCH_DOT} z-10`} style={{ backgroundColor: dark[3] }} />
                          <span className={SWATCH_DOT} style={{ backgroundColor: light[3] }} />
                        </span>
                        {isSelected && <span className="text-[10px] font-semibold text-accent">Active</span>}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-medium text-secondary ${INSET_CLS}`}>
                        {badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible Design Token Swatches (no overflow-hidden so keyboard focus ring on summary never clips) */}
          <details className={`${PANEL_CLS} group/tokens`}>
            <summary className={`${BETWEEN_CLS} px-3.5 py-2 rounded-lg group-open/tokens:rounded-b-none cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-surface-hover/50 transition-colors ${TAP_CLS}`}>
              <span className="flex items-center gap-2 min-w-0">
                <Sparkles className={ICON_MUTED} aria-hidden />
                <span className={LABEL_CLS}>Design tokens</span>
                <span className={`${MUTED_SM} font-normal`}>(CSS variables)</span>
              </span>
              <span className="flex items-center gap-2.5 shrink-0">
                <span className="hidden sm:flex items-center -space-x-0.5" aria-hidden>
                  {QUICK_DESIGN_TOKENS.slice(0, 5).map(([, varName]) => (
                    <span
                      key={varName}
                      className="w-2.5 h-2.5 rounded-full border border-surface-card"
                      style={{ backgroundColor: `rgb(var(${varName}))` }}
                    />
                  ))}
                </span>
                <ChevronDown
                  className="w-4 h-4 text-muted transition-transform ease-out group-open/tokens:rotate-180"
                  aria-hidden
                />
              </span>
            </summary>

            <div className="px-3.5 pb-3 pt-2.5 border-t border-subtle grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {QUICK_DESIGN_TOKENS.map(([name, varName]) => {
                const isCopied = copiedToken === varName;
                return (
                  <button
                    key={varName}
                    type="button"
                    onClick={() => handleCopyToken(varName)}
                    className={`group px-2.5 py-1.5 rounded-md border border-subtle bg-surface-card hover:border-strong transition-interactive active:scale-[0.985] cursor-pointer text-left flex items-center gap-2.5 ${TAP_CLS}`}
                    title={`Click to copy ${varName}`}
                  >
                    <span
                      className="w-4 h-4 rounded-xs shrink-0 border border-strong/70"
                      style={{ backgroundColor: `rgb(var(${varName}))` }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className={BETWEEN_CLS}>
                        <span className="text-[11px] font-semibold text-primary leading-tight">{name}</span>
                        {isCopied ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-callout-success-fg shrink-0">
                            <Check className="w-3 h-3" aria-hidden />
                            <span>Copied</span>
                          </span>
                        ) : (
                          <Copy
                            className="w-3 h-3 text-muted opacity-50 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shrink-0"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="text-[10.5px] sm:text-[11px] text-secondary font-mono whitespace-nowrap mt-0.5 leading-tight">
                        {varName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </details>

          {/* Section 2: Display and Mode */}
          <div data-tour="settings-display" className={SECTION_CLS}>
            <h3 className={HEADING_CLS}>
              <Sun className={ICON_MUTED} aria-hidden />
              <span>Display and mode</span>
            </h3>

            <div className={`${PANEL_CLS} divide-y divide-subtle`}>
              {/* Color Mode */}
              <div className={ROW_CLS}>
                {rowTitle('Color Mode', isDark ? 'Dark mode active' : 'Light mode active')}
                <div role="group" aria-label="Color Mode" className={`inline-flex items-center gap-0.5 p-0.5 rounded-md shrink-0 ${INSET_CLS}`}>
                  {MODE_OPTIONS.map(([id, label, Icon]) => {
                    const active = id === 'dark' ? isDark : !isDark;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={(e) => { setTheme(id, extractCoordinates(e)); click(); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-medium ${TAP_CLS} ${PRESS_CLS} ${
                          active ? 'bg-accent text-on-accent shadow-xs' : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Feedback */}
              <div className={ROW_CLS}>
                {rowTitle('Audio Feedback', 'Interface sound effects')}
                <SettingsSwitch
                  checked={soundEnabled}
                  label={soundEnabled ? 'Enabled' : 'Muted'}
                  ariaLabel="Audio Feedback"
                  onClick={() => {
                    const next = !soundEnabled;
                    ctf.toggleSound();
                    if (next) playCyberSound('click');
                  }}
                  OnIcon={Volume2}
                  OffIcon={VolumeX}
                />
              </div>

              {/* Desktop Notifications (returns null cleanly if unsupported, leaving no grid gap) */}
              <DesktopNotificationsToggle embedded />

              {/* Interface Scale */}
              <div className="px-3.5 py-2 space-y-2">
                <div className={BETWEEN_CLS}>
                  {rowTitle('Interface scale', 'Adjust text and control density')}
                  {activeScale === 'normal' ? (
                    <span className={`${MUTED_SM} font-mono tabular-nums shrink-0`}>100%</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { ctf.setUiScale('normal'); click(); }}
                      className={`inline-flex items-center px-1.5 text-[11px] font-medium text-accent hover:underline cursor-pointer shrink-0 tabular-nums ${TAP_CLS}`}
                    >
                      Reset ({activeScalePct})
                    </button>
                  )}
                </div>
                <div className={`flex items-stretch gap-1 sm:grid sm:grid-cols-5 p-1 rounded-md ${INSET_CLS}`}>
                  {SCALE_STOPS.map(([id, pct]) => {
                    const isActive = activeScale === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => { ctf.setUiScale(id); click(); }}
                        className={`flex-auto sm:flex-none min-w-0 py-1.5 px-1 rounded-xs border text-center flex flex-col items-center justify-center gap-0.5 ${PRESS_CLS} ${TAP_CLS} ${
                          isActive
                            ? 'bg-surface-card border-accent text-primary shadow-xs'
                            : 'border-transparent text-secondary hover:text-primary hover:bg-surface-hover/60'
                        }`}
                      >
                        <span className="capitalize font-semibold text-[10px] sm:text-[11px] leading-tight">{id}</span>
                        <span className={`text-[10px] font-mono tabular-nums leading-tight ${isActive ? 'text-accent' : 'text-muted'}`}>
                          {pct}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Default Attacker Variables */}
          <div data-tour="settings-vars" className={SECTION_CLS}>
            <div className={BETWEEN_CLS}>
              <h3 className={HEADING_CLS}>
                <Server className={ICON_MUTED} aria-hidden />
                <span>Default attacker variables</span>
              </h3>
              <span className={MUTED_SM}>Used in command templates</span>
            </div>

            <div className={`${PANEL_CLS} p-3 grid grid-cols-1 sm:grid-cols-2 gap-3`}>
              {VAR_FIELDS.map(([id, label, placeholder, key, numeric]) => (
                <div key={id}>
                  <label htmlFor={id} className="text-[11px] font-medium text-secondary block mb-1">
                    {label}
                  </label>
                  <input
                    id={id}
                    type="text"
                    inputMode={numeric ? 'numeric' : undefined}
                    value={globalVars[key]}
                    onChange={(e) => ctf.setGlobalVars({ [key]: e.target.value })}
                    placeholder={placeholder}
                    className={INPUT_CLS}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Guide */}
          <div className={SECTION_CLS}>
            <div className={BETWEEN_CLS}>
              <h3 className={HEADING_CLS}>
                <BookOpen className={ICON_MUTED} aria-hidden />
                <span>Guide</span>
              </h3>
              <span className={MUTED_SM}>Tours and page tips</span>
            </div>
            <div className={`${PANEL_CLS} px-3.5 py-2.5 space-y-2`}>
              <p className={MUTED_SM}>
                Replay the full tour, or show the one-time page tips again.
              </p>
              <GuideControls onBeforeReplay={() => ctf.setSettingsModalOpen(false)} />
            </div>
          </div>
        </div>

        {/* Sticky Footer Bar */}
        <div className={`${BAR_CLS} bottom-0 py-2.5 border-t border-subtle gap-2`}>
          <div className="flex items-center gap-2">
            {(
              [
                ['Backup Database', 'Backup database', Database, () => ctf.setBackupModalOpen(true)],
                ['License', 'View license', ShieldCheck, () => ctf.setLicenseModalOpen(true)],
              ] as const
            ).map(([label, aria, Icon, open]) => (
              <button key={label} aria-label={aria} type="button" onClick={() => { close(); open(); }} className={FOOTER_BTN_CLS}>
                <Icon className={ICON_MUTED} aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={close}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent shadow-xs ${PRESS_CLS} ${TAP_CLS}`}
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
