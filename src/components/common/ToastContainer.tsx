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
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-lg font-sans text-xs bg-white dark:bg-zinc-900 ${
              t.type === 'success'
                ? 'border-emerald-500/40 text-slate-900 dark:text-zinc-100'
                : t.type === 'error'
                ? 'border-rose-500/40 text-slate-900 dark:text-zinc-100'
                : t.type === 'warning'
                ? 'border-amber-500/40 text-slate-900 dark:text-zinc-100'
                : 'border-cyan-500/40 text-slate-900 dark:text-zinc-100'
            }`}
          >
            <div className="flex-shrink-0 pt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-cyan-500" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {t.title && <div className="font-semibold text-xs leading-tight mb-0.5">{t.title}</div>}
              <div className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">{t.message}</div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
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
