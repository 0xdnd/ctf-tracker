import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ListChecks, Route, X } from 'lucide-react';
import type { PracticeTrack } from '../../data/tracksData';
import type { TrackProgress } from '../../utils/trackProgress';

interface TrackPickerProps {
  tracks: readonly PracticeTrack[];
  progress: ReadonlyMap<string, TrackProgress>;
  /** Ids of every selected track (empty, one, or several). */
  selectedTrackIds: readonly string[];
  /** Called with the single track to select, or null to clear the selection. */
  onSelect: (trackId: string | null) => void;
  /** Opens the filter drawer, where several tracks are picked. */
  onOpenMulti: () => void;
  /** Classes for the trigger button, so it matches the toolbar buttons around it. */
  buttonClassName: string;
  className?: string;
}

const EDGE_GAP = 8;

const ITEM_BASE =
  'flex w-full flex-shrink-0 items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors duration-100 focus:outline-none focus:bg-surface-hover [@media(pointer:coarse)]:min-h-11';

/**
 * Compact "Tracks" control for the tracker toolbar. One button, one menu of practice tracks with progress.
 * - Trigger: aria-haspopup="menu" and aria-expanded. Enter, Space, ArrowDown and ArrowUp open it.
 * - Menu: role="menu" with menuitemradio rows, arrow keys / Home / End move focus, Escape closes and
 *   returns focus to the trigger, an outside press closes it.
 * - Fits the viewport: the menu is clamped horizontally and scrolls vertically when it is long.
 */
export const TrackPicker: React.FC<TrackPickerProps> = ({
  tracks,
  progress,
  selectedTrackIds,
  onSelect,
  onOpenMulti,
  buttonClassName,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const count = selectedTrackIds.length;
  const single = count === 1 ? tracks.find((t) => t.id === selectedTrackIds[0]) : undefined;
  const singleProgress = single ? progress.get(single.id) : undefined;

  let label = 'Tracks';
  let ariaLabel = 'Tracks';
  if (single) {
    label = single.shortName;
    ariaLabel = singleProgress
      ? `Tracks: ${single.shortName} ${singleProgress.done}/${singleProgress.total}`
      : `Tracks: ${single.shortName}`;
  } else if (count > 1) {
    label = `${count} tracks`;
    ariaLabel = `Tracks: ${count} selected`;
  }

  const getItems = useCallback((): HTMLButtonElement[] => {
    if (!menuRef.current) return [];
    return Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'));
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Move focus into the menu on open: the selected track when there is one, otherwise the first row.
  useEffect(() => {
    if (!open) return;
    const items = getItems();
    const checked = items.find((el) => el.getAttribute('aria-checked') === 'true');
    (checked ?? items[0])?.focus();
  }, [open, getItems]);

  // Keep the menu inside the viewport on narrow screens.
  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setShiftX(0);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const base = rect.left - shiftX;
    const right = rect.right - shiftX;
    const viewport = window.innerWidth;
    let next = 0;
    if (right > viewport - EDGE_GAP) next = viewport - EDGE_GAP - right;
    if (base + next < EDGE_GAP) next = EDGE_GAP - base;
    if (next !== shiftX) setShiftX(next);
    // shiftX is derived from the measurement itself, so it must not retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside press.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(current + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(current - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  const choose = (action: () => void) => {
    close(true);
    action();
  };

  return (
    <div ref={rootRef} className={`relative inline-flex min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        title={single ? single.name : 'Practice tracks'}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={`${buttonClassName} min-w-0 ${count > 0 ? 'border-accent text-accent' : ''}`}
      >
        <Route className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
        {singleProgress && (
          <span className="hidden sm:inline font-mono tabular-nums text-xs text-muted flex-shrink-0">
            {singleProgress.done}/{singleProgress.total}
          </span>
        )}
        <ChevronDown className="w-3 h-3 flex-shrink-0 text-tertiary" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Practice tracks"
          onKeyDown={handleMenuKeyDown}
          style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }}
          className="absolute left-0 top-full z-[100] mt-1 w-[19rem] max-w-[calc(100vw-1rem)] flex flex-col max-h-[min(26rem,calc(100vh-8rem))] rounded-xl border border-subtle bg-surface-elevated p-1 shadow-lg machined-edge"
        >
          {count > 0 && (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => choose(() => onSelect(null))}
              className={`${ITEM_BASE} h-8 text-secondary hover:bg-surface-hover hover:text-primary`}
            >
              <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>{count === 1 ? 'Clear track' : 'Clear tracks'}</span>
            </button>
          )}

          <div role="none" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {tracks.map((track) => {
            const p = progress.get(track.id);
            const checked = selectedTrackIds.includes(track.id);
            return (
              <button
                key={track.id}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                title={track.name}
                onClick={() => choose(() => onSelect(track.id))}
                className={`${ITEM_BASE} flex-col items-stretch gap-1 py-1.5 ${
                  checked ? 'text-accent' : 'text-secondary hover:text-primary'
                } hover:bg-surface-hover`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center" aria-hidden="true">
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="truncate flex-1 min-w-0">{track.shortName}</span>
                  {p && (
                    <span className="font-mono tabular-nums text-xs text-muted flex-shrink-0">
                      {p.done}/{p.total}
                    </span>
                  )}
                </span>
                {p && (
                  <span
                    aria-hidden="true"
                    className="ml-[22px] block h-1 rounded-full bg-surface-hover overflow-hidden"
                  >
                    <span className="block h-full bg-accent" style={{ width: `${p.percent}%` }} />
                  </span>
                )}
              </button>
            );
          })}
          </div>

          <div className="my-1 border-t border-subtle" role="separator" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(onOpenMulti)}
            className={`${ITEM_BASE} h-8 text-secondary hover:bg-surface-hover hover:text-primary`}
          >
            <ListChecks className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>Pick several…</span>
          </button>
        </div>
      )}
    </div>
  );
};

