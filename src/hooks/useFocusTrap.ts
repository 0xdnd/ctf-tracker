import { useEffect, useRef } from 'react';

export interface UseFocusTrapOptions {
  isActive: boolean;
  onClose?: () => void;
  autoFocusFirst?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
) {
  const containerRef = useRef<T | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!options.isActive) return;

    // 1. Remember triggering element to restore focus on close
    previousActiveElementRef.current = (document.activeElement as HTMLElement) || null;

    const container = containerRef.current;
    if (!container) return;

    // 2. Shift initial focus into the trapped boundary
    if (options.autoFocusFirst !== false) {
      const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        // Prefer an element with autofocus attribute if present, else first focusable
        const autoFocusEl = Array.from(focusable).find((el) => el.hasAttribute('autofocus'));
        (autoFocusEl || focusable[0]).focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    }

    // 3. Tab trapping & Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (options.onClose) {
          e.preventDefault();
          e.stopPropagation();
          options.onClose();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const isJsdom = typeof window !== 'undefined' && (window.navigator?.userAgent?.includes('jsdom') || !('offsetParent' in HTMLElement.prototype));
      const focusable = Array.from(
        currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => {
        if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
        if (isJsdom) return true;
        return el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0;
      });

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: Wrap from first to last
        if (document.activeElement === firstEl || !currentContainer.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: Wrap from last to first
        if (document.activeElement === lastEl || !currentContainer.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      // 4. Restore focus to the triggering element
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function' &&
        document.body.contains(previousActiveElementRef.current)
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [options.isActive, options.onClose, options.autoFocusFirst]);

  return containerRef;
}
