import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmStore } from '../../store/useConfirmStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CyberButton } from './CyberButton';
import { TACTICAL_SPRING } from '../../utils/motionTokens';

const ConfirmCard: React.FC = () => {
  const pending = useConfirmStore((s) => s.pending);
  const settle = useConfirmStore((s) => s.settle);
  const titleId = useId();
  const bodyId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: !!pending,
    onClose: () => settle(false),
    autoFocusFirst: false,
  });
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  // Cache last pending so the exit animation can render after pending becomes null.
  const lastPendingRef = React.useRef(pending);
  if (pending) lastPendingRef.current = pending;
  const shown = pending ?? lastPendingRef.current;

  const id = pending?.id;
  const danger = shown?.options.tone === 'danger';
  React.useEffect(() => {
    if (id === undefined) return;
    (danger ? cancelRef.current : confirmRef.current)?.focus();
  }, [id, danger]);

  if (!shown) return null;
  const { title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = shown.options;

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      <motion.div
        ref={trapRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        className="w-full max-w-md rounded-2xl border border-subtle bg-surface-elevated p-5 shadow-xl"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: TACTICAL_SPRING }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      >
        <h2 id={titleId} className="text-base font-semibold text-primary">{title}</h2>
        {body && <p id={bodyId} className="mt-2 text-sm text-secondary">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <CyberButton ref={cancelRef} variant="secondary" className="rounded-lg" onClick={() => settle(false)}>
            {cancelLabel}
          </CyberButton>
          <CyberButton
            ref={confirmRef}
            variant={danger ? 'danger' : 'primary'}
            className="rounded-lg"
            onClick={() => settle(true)}
          >
            {confirmLabel}
          </CyberButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ConfirmDialog: React.FC = () => {
  const open = useConfirmStore((s) => !!s.pending);
  return <AnimatePresence>{open && <ConfirmCard key="confirm" />}</AnimatePresence>;
};
