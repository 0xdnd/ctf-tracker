import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { TACTICAL_SPRING } from '../../utils/motionTokens';

export interface OverflowItem {
  id: string;
  label: string;
  /** Full accessible name when the visible label is short; it must contain the visible label. */
  ariaLabel?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface OverflowMenuProps {
  items: OverflowItem[];
  /** Accessible name for the trigger button. */
  label?: string;
  /** Which edge of the trigger the menu aligns to (also the transform origin). */
  align?: 'left' | 'right';
  className?: string;
  /** Replaces the icon-only trigger content, e.g. a text label with a chevron. */
  triggerContent?: React.ReactNode;
  /** Classes for the trigger when `triggerContent` is used. */
  triggerClassName?: string;
  /**
   * Render the menu in document.body, positioned from the trigger (flips above when short of room), so a parent with
   * overflow-hidden or CSS containment cannot clip it. It closes on scroll and resize.
   */
  portal?: boolean;
}

/**
 * OverflowMenu - "more actions" button with a keyboard-accessible menu.
 * - aria-haspopup="menu", role="menu"/"menuitem", roving focus with arrow keys.
 * - Escape closes and restores focus to the trigger; outside press closes.
 * - Enter: TACTICAL_SPRING from the trigger edge. Exit: <= 150ms.
 * - Keyboard-triggered opens skip the animation entirely.
 */
export const OverflowMenu: React.FC<OverflowMenuProps> = ({
  items,
  label = 'More actions',
  align = 'right',
  className = '',
  triggerContent,
  triggerClassName,
  portal = false,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [instant, setInstant] = useState(false);
  const reduceMotion = useReducedMotion();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<DOMRect | null>(null);

  const getEnabledItems = useCallback((): HTMLButtonElement[] => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    );
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Move focus into the menu on open.
  useEffect(() => {
    if (!open || (portal && !pos)) return;
    getEnabledItems()[0]?.focus();
  }, [open, portal, pos, getEnabledItems]);

  // Portal mode: place the menu from the trigger's rect before paint.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!portal) return;
    if (!open || !trigger || !menu) {
      setPos(null);
      return;
    }
    const r = trigger.getBoundingClientRect();
    anchorRef.current = r;
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const topInset = 8;
    const bottomInset = window.innerWidth < 640 ? 72 : 12;
    const maxBottom = window.innerHeight - bottomInset;
    const left = Math.max(8, Math.min(align === 'right' ? r.right - w : r.left, window.innerWidth - w - 8));
    let top: number;
    if (r.bottom + 4 + h <= maxBottom) {
      top = r.bottom + 4;
    } else if (r.top - 4 - h >= topInset) {
      top = r.top - 4 - h;
    } else {
      top = Math.max(topInset, maxBottom - h);
    }
    setPos({ top, left });
  }, [portal, open, align]);

  // Close on outside press (the portal menu lives outside the root, so it counts as inside).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    // A detached menu would drift away from its trigger, so it closes on a resize or once the trigger has moved.
    const onResize = () => setOpen(false);
    const onScroll = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      const was = anchorRef.current;
      if (!r || !was || Math.abs(r.top - was.top) > 1 || Math.abs(r.left - was.left) > 1) setOpen(false);
    };
    if (portal) {
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, portal, close]);

  if (items.length === 0) return null;

  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // detail === 0 means the click came from the keyboard (Enter/Space).
    setInstant(e.detail === 0);
    setOpen((o) => !o);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setInstant(true);
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = getEnabledItems();
    const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        enabled[(current + 1) % enabled.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        enabled[(current - 1 + enabled.length) % enabled.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        enabled[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        enabled[enabled.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        // A portal menu sits at the end of the page, so Tab continues from the trigger instead.
        close(portal);
        break;
      default:
        break;
    }
  };

  const skipMotion = instant || Boolean(reduceMotion);
  const wrap = (node: React.ReactElement) => (portal ? createPortal(node, document.body) : node);
  const originClass = align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left';

  return (
    <div
      ref={rootRef}
      data-escape-consumer={open ? 'true' : undefined}
      data-escape-open={open ? 'true' : undefined}
      className={`relative inline-flex ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={
          triggerContent
            ? triggerClassName
            : 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-secondary transition-[background-color,color,transform] duration-150 hover:bg-surface-hover hover:text-primary active:scale-[0.97] aria-expanded:bg-surface-hover aria-expanded:text-primary [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11'
        }
      >
        {triggerContent ?? <MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
      </button>

      {wrap(
      <AnimatePresence>
        {open && (
          <m.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            data-escape-consumer="true"
            onKeyDown={handleMenuKeyDown}
            onClick={portal ? (e) => e.stopPropagation() : undefined}
            style={portal ? { top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' } : undefined}
            initial={skipMotion ? false : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: skipMotion ? 0 : 0.12, ease: 'easeOut' } }}
            transition={skipMotion ? { duration: 0 } : TACTICAL_SPRING}
            className={`${portal ? 'fixed z-popover max-h-[min(60vh,calc(100vh-5.5rem))] overflow-y-auto overscroll-contain' : `absolute top-full mt-1 z-[100] ${originClass}`} min-w-[180px] max-w-[260px] rounded-xl border border-subtle bg-surface-elevated p-1 shadow-lg machined-edge`}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                aria-label={item.ariaLabel}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  triggerRef.current?.focus();
                  item.onSelect();
                }}
                className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors duration-100 focus:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:h-11 ${
                  item.danger
                    ? 'text-callout-danger-fg hover:bg-callout-danger-bg focus:bg-callout-danger-bg'
                    : 'text-secondary hover:bg-surface-hover hover:text-primary focus:text-primary'
                }`}
              >
                {item.icon && (
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
      )}
    </div>
  );
};
