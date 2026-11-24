import React, { useEffect, useState } from 'react';
import { Bell, BellOff, type LucideIcon } from 'lucide-react';
import {
  NOTIF_PREF_EVENT,
  canNotify,
  disableDesktopNotifications,
  enableDesktopNotifications,
  notificationsSupported,
} from '../../utils/notificationPrefs';

export interface SettingsSwitchProps {
  checked: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  OnIcon: LucideIcon;
  OffIcon: LucideIcon;
  testId?: string;
}

const SW_BASE =
  'inline-flex items-center gap-2 rounded-full pl-2.5 pr-1.5 py-1 border text-[11px] font-medium transition-interactive active:scale-[0.97] cursor-pointer shrink-0 [@media(pointer:coarse)]:min-h-11';

/** Shared tactile sliding switch used across Operator settings rows. */
export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  checked,
  label,
  ariaLabel,
  onClick,
  OnIcon,
  OffIcon,
  testId,
}) => {
  const Icon = checked ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClick}
      className={`${SW_BASE} ${
        checked
          ? 'border-accent/40 bg-accent/[0.08] text-primary hover:border-accent/60'
          : 'border-subtle bg-surface-card text-muted hover:border-strong hover:text-secondary'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${checked ? 'text-accent' : 'text-muted'}`} aria-hidden />
      <span className="min-w-[3.25rem] text-left">{label}</span>
      <span
        aria-hidden
        className={`w-8 h-[18px] rounded-full p-0.5 border flex items-center transition-colors ${
          checked ? 'bg-accent border-transparent' : 'bg-surface-sunken dark:bg-surface-base border-strong'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full shadow-xs transition-transform ease-out ${
            checked
              ? 'translate-x-3.5 bg-[rgb(var(--accent-fg))]'
              : 'translate-x-0 bg-[rgb(var(--text-muted))]'
          }`}
        />
      </span>
    </button>
  );
};

interface DesktopNotificationsToggleProps {
  /** Renders flush inside a grouped settings list instead of as a standalone bordered card. */
  embedded?: boolean;
}

/** Settings row for opt-in browser notifications. Permission is requested only when the user turns it on. */
export const DesktopNotificationsToggle: React.FC<DesktopNotificationsToggleProps> = ({ embedded = false }) => {
  const [on, setOn] = useState(canNotify);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const sync = () => setOn(canNotify());
    window.addEventListener(NOTIF_PREF_EVENT, sync);
    return () => window.removeEventListener(NOTIF_PREF_EVENT, sync);
  }, []);

  if (!notificationsSupported()) return null;

  const toggle = async () => {
    if (on) {
      disableDesktopNotifications();
      setOn(false);
      return;
    }
    const result = await enableDesktopNotifications();
    setDenied(result !== 'enabled');
    setOn(result === 'enabled');
  };

  return (
    <div className={embedded ? 'px-3.5 py-2' : 'p-3.5 rounded-lg border border-subtle bg-surface-sunken/50'}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-xs text-primary">Desktop notifications</div>
          <div className="text-[11px] text-muted mt-0.5">
            Exam timer alerts and a daily reminder when reviews are due
          </div>
        </div>
        <SettingsSwitch
          checked={on}
          label={on ? 'On' : 'Off'}
          ariaLabel="Desktop notifications"
          testId="desktop-notifications-toggle"
          onClick={toggle}
          OnIcon={Bell}
          OffIcon={BellOff}
        />
      </div>
      {denied && (
        <p
          role="status"
          className="mt-2 rounded-md border border-callout-warn-border/60 bg-callout-warn-bg/60 px-2.5 py-1.5 text-[11px] text-callout-warn-fg"
        >
          Notifications are blocked. Allow them for this site in your browser settings, then try again.
        </p>
      )}
    </div>
  );
};
