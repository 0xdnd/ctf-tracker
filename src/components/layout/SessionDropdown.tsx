import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useCtfStore, selectTacticalVarsUnset } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';
import { afterFirstPaint } from '../../utils/afterFirstPaint';
import type { SessionField, SessionPanelPosition } from './SessionPanel';

// The panel is only needed once the button is used, so it loads as its own chunk. The request starts after the
// first paint has settled, so it is usually ready by the time the button is clicked.
const loadSessionPanel = () => import('./SessionPanel');
const SessionPanel = React.lazy(loadSessionPanel);

const PANEL_WIDTH = 320;
const EDGE = 8;

interface SessionDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Field that takes focus when the panel opens (set when it was opened from the "set RHOST" chip). */
  initialField?: SessionField;
}

/** One header button that holds the session tools: LHOST / RHOST / LPORT, the stopwatch, flag shortcuts and quick tools. */
export const SessionDropdown: React.FC<SessionDropdownProps> = ({ open, onOpenChange, initialField }) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<SessionPanelPosition | null>(null);
  const [instant, setInstant] = useState(false);
  const location = useLocation();

  const isTimerRunning = useCtfStore((s) => s.isTimerRunning);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const tacticalUnset = useCtfStore(selectTacticalVarsUnset);

  useEffect(() => {
    let live = true;
    void afterFirstPaint().then(() => {
      if (live) void loadSessionPanel();
    });
    return () => {
      live = false;
    };
  }, []);

  const close = useCallback(
    (restoreFocus: boolean) => {
      onOpenChange(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onOpenChange],
  );

  // Anchor the panel under the trigger, right-aligned and kept inside the viewport.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
      const left = Math.max(EDGE, Math.min(r.right - width, window.innerWidth - width - EDGE));
      setPosition({ top: r.bottom + 6, left, width, originX: r.left + r.width / 2 - left });
    };
    place();
    window.addEventListener('resize', place, { passive: true });
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // Close on an outside press, when focus leaves, on Escape from the trigger, and on route change.
  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) =>
      t instanceof Node && (panelRef.current?.contains(t) || triggerRef.current?.contains(t));
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!inside(e.target)) onOpenChange(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (panelRef.current && !inside(e.target)) onOpenChange(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Escape inside the panel is handled there; this covers focus that is still on the trigger.
      if (e.key === 'Escape' && !e.defaultPrevented && document.activeElement === triggerRef.current) {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange, close]);

  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only when the route changes
  }, [location.pathname]);

  const label = isTimerRunning ? 'Session, stopwatch running' : 'Session';

  return (
    <div className="relative flex-shrink-0 font-sans">
      <button
        ref={triggerRef}
        type="button"
        data-session-trigger
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title="Session: LHOST, LPORT, stopwatch, flags and quick tools"
        onClick={(e) => {
          setInstant(e.detail === 0);
          onOpenChange(!open);
          if (soundEnabled) playCyberSound('click');
        }}
        className={`relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 ${
          open
            ? 'border-strong bg-surface-hover text-primary'
            : `bg-surface-sunken text-secondary hover:border-strong hover:bg-surface-hover hover:text-primary ${
                tacticalUnset ? 'border-dashed border-callout-warn-border/60' : 'border-subtle'
              }`
        }`}
      >
        <Radio className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate max-sm:hidden">Session</span>
        {isTimerRunning && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface-base" />
        )}
      </button>

      {open && position && (
        <React.Suspense fallback={null}>
          <SessionPanel
            position={position}
            panelRef={panelRef}
            initialField={initialField}
            instant={instant}
            onClose={close}
          />
        </React.Suspense>
      )}
    </div>
  );
};
