import React from 'react';
import { CoffeeLink } from '../common/CoffeeLink';
import {
  Settings,
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
  Users,
  BookOpen,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { APP_VERSION } from '../../utils/appVersion';
import { useCtfStore, normalizeThemePreset, type ThemePreset } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';
import { formatBackupAge, hasMeaningfulData, isBackupOverdue, useBackupReminderStore } from '../../utils/backupReminder';

interface SettingsDropdownMenuProps {
  onClose: () => void;
  /** Opens the file picker of the hidden workspace-import input that SettingsDropdown owns. */
  onPickFile: () => void;
}

const THEME_SHORT_LABEL: Record<ThemePreset, string> = {
  obsidian: 'Obsidian',
  htb: 'Hack The Box',
  offsec: 'Red Team / OffSec',
};

const SCALE_PERCENT: Record<string, string> = {
  tiny: '80%',
  compact: '90%',
  normal: '100%',
  large: '110%',
  huge: '122%',
};

const COARSE_BTN = '[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11';
const INSET_BG = 'border border-subtle bg-surface-sunken/70 dark:bg-surface-base';
const ROW_BASE =
  'group w-full px-2 flex items-center justify-between gap-2 text-left transition-interactive active:scale-[0.985] cursor-pointer [@media(pointer:coarse)]:min-h-11';
const ITEM_CLS = `${ROW_BASE} py-1.5 rounded-md hover:bg-surface-hover text-secondary hover:text-primary`;
const ICON_CLS = 'w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors shrink-0';
const CHIP_CLS = `inline-flex items-center justify-center rounded-xs px-1.5 font-mono text-[10px] font-medium text-secondary dark:text-muted ${INSET_BG}`;
const KBD_CLS = `${CHIP_CLS} h-5 min-w-[20px] shadow-xs [@media(pointer:coarse)]:hidden`;
const STEP_BTN_CLS = `inline-flex h-6 w-6 ${COARSE_BTN} items-center justify-center rounded-xs text-secondary hover:bg-surface-card hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-interactive active:scale-[0.95] cursor-pointer`;
const LINK_CLS = 'inline-flex min-h-6 items-center hover:text-primary underline-offset-2 hover:underline';
const DOT_CLS = 'w-1.5 h-1.5 rounded-full shrink-0';
const FLEX_LABEL_CLS = 'flex items-center gap-2 min-w-0';

const FOOTER_LINKS = [
  ['Privacy', 'https://ctftracker.com/privacy/'],
  ['Terms', 'https://ctftracker.com/terms/'],
] as const;

type RowTuple = readonly [label: string, Icon: LucideIcon, onClick: () => void, kbd?: string, badge?: string];

/** The open menu behind the header's settings button. Loaded the first time the button is used. */
const SettingsDropdownMenu: React.FC<SettingsDropdownMenuProps> = ({ onClose, onPickFile }) => {
  const { themePreset, soundEnabled, uiScale, unexportedChangesCount } = useCtfStore(
    useShallow((s) => ({
      themePreset: s.themePreset,
      soundEnabled: s.soundEnabled,
      uiScale: s.uiScale,
      unexportedChangesCount: s.unexportedChangesCount,
    }))
  );
  const ctf = useCtfStore.getState();

  const { isDark } = useTheme();
  const activePreset = normalizeThemePreset(themePreset);
  const activeScale = !uiScale || uiScale === 'auto' ? 'normal' : uiScale;
  const isCustomScale = activeScale !== 'normal';

  const backupReminder = useBackupReminderStore(
    useShallow((s) => ({
      lastBackupAt: s.lastBackupAt,
      firstActivityAt: s.firstActivityAt,
      snoozeUntil: s.snoozeUntil,
    }))
  );
  const lastBackupAt = backupReminder.lastBackupAt;
  const hasData = useCtfStore((s) => hasMeaningfulData(s));
  const backupOverdue = isBackupOverdue(backupReminder, Date.now(), hasData);

  const click = () => { if (soundEnabled) playCyberSound('click'); };
  const runAndClose = (fn: () => void) => { fn(); onClose(); click(); };

  const navRows: readonly RowTuple[] = [
    ['Keyboard Shortcuts', Keyboard, () => runAndClose(() => ctf.setShortcutsModalOpen(true)), '?'],
    ['Notes panel', BookOpen, () => runAndClose(() => useNotesWorkspaceStore.getState().toggleOpen()), 'Alt+N'],
    ['Switch profile or log in', Users, () => runAndClose(() => useAuthStore.getState().setOperatorProfileModalOpen(true)), 'Alt+O'],
    ['About ZeroBox & Credits', Terminal, () => runAndClose(() => ctf.setOperatorModalOpen(true)), undefined, `v${APP_VERSION}`],
    ['Software License', FileCode, () => runAndClose(() => ctf.setLicenseModalOpen(true))],
  ];

  const renderRow = ([label, Icon, onClick, kbd, badge]: RowTuple) => (
    <button key={label} type="button" onClick={onClick} className={ITEM_CLS}>
      <span className={FLEX_LABEL_CLS}>
        <Icon className={ICON_CLS} aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      {kbd && <kbd className={KBD_CLS}>{kbd}</kbd>}
      {badge && <span className={`${CHIP_CLS} py-0.5 tabular-nums shrink-0`}>{badge}</span>}
    </button>
  );

  const SoundIcon = soundEnabled ? Volume2 : VolumeX;

  return (
    <div className="fixed right-2 sm:right-4 top-[54px] w-[280px] max-w-[calc(100vw/var(--app-zoom,1)-16px)] max-h-[calc(100dvh/var(--app-zoom,1)-126px-env(safe-area-inset-bottom,0px))] md:max-h-[calc(100dvh/var(--app-zoom,1)-62px)] overflow-y-auto overscroll-contain rounded-xl bg-surface-elevated border border-subtle surface-elevated-depth z-[60] text-xs origin-top-right animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none">
      {/* Header strip */}
      <div className="px-3 pt-2.5 pb-2 border-b border-subtle flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted truncate">Preferences and tools</span>
        {unexportedChangesCount > 0 && (
          <span
            title="Changes since your last export. Your data is saved in this browser; the count resets when you export a backup."
            className="inline-flex items-center rounded-full border border-callout-warn-border/60 bg-callout-warn-bg px-1.5 py-0.5 text-[10px] font-medium text-callout-warn-fg tabular-nums shrink-0 whitespace-nowrap"
          >
            {unexportedChangesCount} not backed up
          </span>
        )}
      </div>

      {/* Primary gateway & quick preferences */}
      <div className="p-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => runAndClose(() => ctf.setSettingsModalOpen(true))}
          className={`${ROW_BASE} py-2 mb-1 rounded-lg bg-accent/[0.07] border border-accent/25 hover:bg-accent/[0.11] hover:border-accent/45`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-md bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
              <Settings className="w-3.5 h-3.5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-primary leading-tight truncate">
                All Settings &amp; Themes
              </span>
              <span className="flex items-center gap-1.5 mt-0.5 text-[11px] text-secondary dark:text-muted leading-tight">
                <span className={`${DOT_CLS} bg-accent`} aria-hidden />
                <span className="truncate">
                  {THEME_SHORT_LABEL[activePreset]} &middot; {isDark ? 'Dark' : 'Light'}
                </span>
              </span>
            </span>
          </span>
          <ChevronRight
            className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-interactive shrink-0"
            aria-hidden
          />
        </button>

        {/* Sound FX switch */}
        <button
          type="button"
          role="switch"
          aria-checked={soundEnabled}
          onClick={() => { ctf.toggleSound(); if (!soundEnabled) playCyberSound('click'); }}
          className={ITEM_CLS}
        >
          <span className={FLEX_LABEL_CLS}>
            <SoundIcon className={soundEnabled ? 'w-3.5 h-3.5 text-accent shrink-0' : ICON_CLS} aria-hidden />
            <span className="truncate">Sound effects</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] font-medium ${soundEnabled ? 'text-primary' : 'text-muted'}`}>
              {soundEnabled ? 'On' : 'Off'}
            </span>
            <span
              aria-hidden
              className={`w-8 h-[18px] rounded-full p-0.5 border flex items-center transition-colors ${
                soundEnabled ? 'bg-accent border-transparent' : 'bg-surface-sunken dark:bg-surface-base border-strong'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full shadow-xs transition-transform ease-out ${
                  soundEnabled
                    ? 'translate-x-3.5 bg-[rgb(var(--accent-fg))]'
                    : 'translate-x-0 bg-[rgb(var(--text-muted))]'
                }`}
              />
            </span>
          </span>
        </button>

        {/* UI zoom scale */}
        <div className="px-2 py-1.5 rounded-md flex items-center justify-between gap-2 text-secondary">
          <span className={FLEX_LABEL_CLS}>
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden />
            <span className="truncate">UI Scale</span>
          </span>
          <div className={`inline-flex items-center rounded-md p-0.5 shrink-0 ${INSET_BG}`}>
            <button
              type="button"
              disabled={activeScale === 'tiny'}
              onClick={() => { ctf.zoomOut(); click(); }}
              className={STEP_BTN_CLS}
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3 h-3" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => { ctf.setUiScale('normal'); click(); }}
              className={`inline-flex h-6 min-w-[44px] ${COARSE_BTN} items-center justify-center rounded-xs px-1.5 hover:bg-surface-card text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                isCustomScale ? 'font-semibold text-accent' : 'font-medium text-primary'
              }`}
              title="Reset zoom to 100%"
            >
              {SCALE_PERCENT[activeScale] ?? '100%'}
            </button>
            <button
              type="button"
              disabled={activeScale === 'huge'}
              onClick={() => { ctf.zoomIn(); click(); }}
              className={STEP_BTN_CLS}
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3 h-3" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Workspace & backups */}
      <div className="p-1.5 border-t border-subtle space-y-0.5">
        {renderRow([
          'Export Workspace (JSON)',
          Download,
          () => { ctf.exportWorkspace(); if (soundEnabled) playCyberSound('root'); onClose(); },
        ])}
        {renderRow(['Import Workspace (JSON)', Upload, onPickFile])}

        <button
          type="button"
          onClick={() => runAndClose(() => ctf.setBackupModalOpen(true))}
          className={`${ITEM_CLS} items-start`}
        >
          <span className="flex items-start gap-2 min-w-0">
            <ShieldCheck className={`${ICON_CLS} mt-0.5`} aria-hidden />
            <span className="flex flex-col items-start gap-0.5 min-w-0">
              <span className="truncate">Backup &amp; Vault Manager</span>
              <span
                data-testid="settings-last-backup"
                className={`inline-flex items-center gap-1.5 text-[11px] ${backupOverdue ? 'text-callout-warn-fg' : 'text-muted'}`}
              >
                <span
                  aria-hidden
                  className={`${DOT_CLS} ${
                    backupOverdue
                      ? 'bg-callout-warn-fg'
                      : lastBackupAt
                        ? 'bg-callout-success-fg'
                        : 'bg-[rgb(var(--border-strong))]'
                  }`}
                />
                <span>{lastBackupAt ? `Last backup: ${formatBackupAge(lastBackupAt, Date.now())}` : 'Never backed up'}</span>
              </span>
            </span>
          </span>
        </button>
      </div>

      {/* Shortcuts, navigation & info */}
      <div className="p-1.5 border-t border-subtle space-y-0.5">
        {navRows.map(renderRow)}
      </div>

      {/* Recessed footer */}
      <div className="px-3 py-2 border-t border-subtle bg-surface-sunken/60 space-y-1">
        <div className="text-[11px] text-muted flex flex-wrap items-center gap-x-3 gap-y-1 [@media(pointer:coarse)]:[&_a]:min-h-11">
          {FOOTER_LINKS.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              {label}
            </a>
          ))}
          <CoffeeLink />
        </div>
        <div className="text-[11px] text-muted flex items-center gap-1.5">
          <span className={`${DOT_CLS} bg-callout-success-fg`} aria-hidden />
          <span>Local-first, no telemetry</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsDropdownMenu;
