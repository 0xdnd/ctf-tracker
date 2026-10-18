import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { DURATION, EASE_OUT } from '../../utils/motion';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalZIndex = 'modal' | 'modalNested' | 'critical';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** One of ariaLabel | labelledBy is required (dev warning otherwise). */
  ariaLabel?: string;
  labelledBy?: string;
  describedBy?: string;
  size?: ModalSize;
  /** No enter/exit animation; use for keyboard-opened surfaces. */
  instant?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** 'top' for palette-style surfaces. */
  placement?: 'center' | 'top';
  /** Extra classes for the backdrop. */
  className?: string;
  /** Extra classes for the panel (keeps bespoke styling during migrations). */
  panelClassName?: string;
  zIndex?: ModalZIndex;
  children: React.ReactNode;
}

// Literal class strings so Tailwind can see them. Widths match existing modals:
// confirm=md, quick-assign=lg, settings/shortcuts/start-clean=2xl, flex card=4xl.
const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  full: 'max-w-6xl',
};

const Z_CLASS: Record<ModalZIndex, string> = {
  modal: 'z-modal',
  modalNested: 'z-modalNested',
  critical: 'z-critical',
};

// Ref-counted body scroll lock so nested modals don't unlock early.
let scrollLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

type SurfaceProps = Omit<ModalProps, 'open' | 'instant'> & { animated: boolean };

// Mounted only while the modal is open (or exiting), so focus trap lifetime
// equals presence. Esc is routed through useFocusTrap's module-level stack,
// which guarantees only the topmost modal handles it.
const ModalSurface: React.FC<SurfaceProps> = ({
  onClose,
  ariaLabel,
  labelledBy,
  describedBy,
  size = 'lg',
  closeOnBackdrop = true,
  closeOnEsc = true,
  initialFocusRef,
  placement = 'center',
  className = '',
  panelClassName = '',
  zIndex = 'modal',
  animated,
  children,
}) => {
  const isPresent = useIsPresent();

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isPresent,
    onClose: closeOnEsc ? onClose : undefined,
    autoFocusFirst: !initialFocusRef,
  });

  useEffect(() => {
    if (!isPresent) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [isPresent]);

  useEffect(() => {
    if (isPresent) initialFocusRef?.current?.focus();
  }, [isPresent, initialFocusRef]);

  const backdropClass = [
    'fixed inset-0 flex justify-center pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface-inverse/70 font-sans',
    placement === 'top' ? 'items-start pt-[12dvh]' : 'items-center',
    Z_CLASS[zIndex],
    className,
  ].join(' ');

  const panelClass = [
    'relative w-full mx-3 bg-surface-card border border-subtle rounded-2xl shadow-xl',
    'overflow-hidden flex flex-col max-h-[90dvh]',
    SIZE_CLASS[size],
    panelClassName,
  ].join(' ');

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose();
  };

  const panelProps = {
    ref: trapRef,
    role: 'dialog',
    'aria-modal': true as const,
    'aria-label': ariaLabel,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    className: panelClass,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  const body = <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>;

  if (!animated) {
    return (
      <div className={backdropClass} onClick={handleBackdropClick} data-modal-backdrop>
        <div {...panelProps}>{body}</div>
      </div>
    );
  }

  // Enter: ease-out, slow (200ms). Exit is faster (150ms). Transform + opacity only.
  return (
    <motion.div
      className={backdropClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT } }}
      exit={{ opacity: 0, transition: { duration: DURATION.normal, ease: EASE_OUT } }}
      onClick={handleBackdropClick}
      data-modal-backdrop
    >
      <motion.div
        {...panelProps}
        initial={{ opacity: 0, transform: 'translateY(8px) scale(0.96)' }}
        animate={{
          opacity: 1,
          transform: 'translateY(0px) scale(1)',
          transition: { duration: DURATION.slow, ease: EASE_OUT },
        }}
        exit={{
          opacity: 0,
          transform: 'translateY(8px) scale(0.96)',
          transition: { duration: DURATION.normal, ease: EASE_OUT },
        }}
      >
        {body}
      </motion.div>
    </motion.div>
  );
};

export const Modal: React.FC<ModalProps> = ({ open, instant = false, ...rest }) => {
  const unlabeled = !rest.ariaLabel && !rest.labelledBy;
  useEffect(() => {
    if (import.meta.env.DEV && open && unlabeled) {
      console.warn('[Modal] Provide ariaLabel or labelledBy so the dialog has an accessible name.');
    }
  }, [open, unlabeled]);

  if (typeof document === 'undefined') return null;

  if (instant) {
    return createPortal(open ? <ModalSurface {...rest} animated={false} /> : null, document.body);
  }

  return createPortal(
    <AnimatePresence>{open && <ModalSurface key="modal" {...rest} animated />}</AnimatePresence>,
    document.body
  );
};

export default Modal;
