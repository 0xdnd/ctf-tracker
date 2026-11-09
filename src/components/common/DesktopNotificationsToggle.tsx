import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  NOTIF_PREF_EVENT,
  canNotify,
  disableDesktopNotifications,
  enableDesktopNotifications,
  notificationsSupported,
} from '../../utils/notificationPrefs';

/** Settings row for opt-in browser notifications. Permission is requested only when the user turns it on. */
export const DesktopNotificationsToggle: React.FC = () => {
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
    <div className="p-3 rounded-xl border border-subtle bg-surface-sunken">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-xs text-primary">Desktop notifications</div>
          <div className="text-[10px] text-muted">Exam timer alerts and a daily reminder when reviews are due</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Desktop notifications"
          data-testid="desktop-notifications-toggle"
          onClick={toggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            on
              ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
              : 'border-strong bg-surface-card text-muted'
          }`}
        >
          {on ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          <span>{on ? 'On' : 'Off'}</span>
        </button>
      </div>
      {denied && (
        <p role="status" className="mt-2 text-[10px] text-callout-warn-fg">
          Notifications are blocked. Allow them for this site in your browser settings, then try again.
        </p>
      )}
    </div>
  );
};
