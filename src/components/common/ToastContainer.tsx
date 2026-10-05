import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="status"
            aria-live="polite"
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-lg font-sans text-xs bg-surface-card ${
              t.type === 'success'
                ? 'border-callout-success-border/40 text-primary'
                : t.type === 'error'
                ? 'border-callout-danger-border/40 text-primary'
                : t.type === 'warning'
                ? 'border-callout-warn-border/40 text-primary'
                : 'border-accent/40 text-primary'
            }`}
          >
            <div className="flex-shrink-0 pt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-callout-success-fg" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-callout-danger-fg" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-callout-warn-fg" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-callout-info-fg" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {t.title && <div className="font-semibold text-xs leading-tight mb-0.5">{t.title}</div>}
              <div className="text-[11px] text-secondary leading-snug">{t.message}</div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-muted hover:text-primary transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
