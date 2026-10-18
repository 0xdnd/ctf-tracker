import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { TACTICAL_SPRING } from '../../utils/motionTokens';

export interface OverflowItem {
  id: string;
  label: string;
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
}) => {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const reduceMotion = useReducedMotion();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!open) return;
    getEnabledItems()[0]?.focus();
  }, [open, getEnabledItems]);

  // Close on outside press.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

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
        close(false);
        break;
      default:
        break;
    }
  };

  const skipMotion = instant || Boolean(reduceMotion);
  const originClass = align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left';

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-secondary transition-[background-color,color,transform] duration-150 hover:bg-surface-hover hover:text-primary active:scale-[0.97] aria-expanded:bg-surface-hover aria-expanded:text-primary [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            initial={skipMotion ? false : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: skipMotion ? 0 : 0.12, ease: 'easeOut' } }}
            transition={skipMotion ? { duration: 0 } : TACTICAL_SPRING}
            className={`absolute top-full z-[100] mt-1 min-w-[180px] max-w-[260px] rounded-xl border border-subtle bg-surface-elevated p-1 shadow-lg machined-edge ${originClass}`}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OverflowMenu;
