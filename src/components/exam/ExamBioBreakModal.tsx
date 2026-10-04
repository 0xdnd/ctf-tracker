import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee,
  Clock,
  RotateCcw,
  X,
  AlertTriangle,
  Utensils,
  Moon,
  Play,
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatSecondsToHms } from '../../utils/examPacingUtils';
import { TACTICAL_SPRING } from '../../utils/motionTokens';

export interface ExamBioBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { testId: 'break-preset-bio-15', type: 'bio', Icon: Coffee, tag: '15m', title: 'Quick Bio Break', sub: 'Hydration, stretch & eye rest' },
  { testId: 'break-preset-food-30', type: 'food', Icon: Utensils, tag: '30m', title: 'Meal / Nutrition', sub: 'Food intake & mental reset' },
  { testId: 'break-preset-rest-120', type: 'rest', Icon: Moon, tag: '2h', title: 'Rest / Sleep Block', sub: 'Cognitive recharge & power nap' },
] as const;

export const ExamBioBreakModal: React.FC<ExamBioBreakModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeBreak,
    breakHistory,
    startBreak,
    cancelBreak,
    getBreakRemainingSeconds,
    getRemainingSeconds,
  } = useExamStore(
    useShallow((s) => ({
      activeBreak: s.activeBreak,
      breakHistory: s.breakHistory,
      startBreak: s.startBreak,
      cancelBreak: s.cancelBreak,
      getBreakRemainingSeconds: s.getBreakRemainingSeconds,
      getRemainingSeconds: s.getRemainingSeconds,
      // Subscribing to remainingSeconds keeps both clocks ticking while open.
      remainingSeconds: s.remainingSeconds,
    }))
  );

  const [customMinutes, setCustomMinutes] = useState<number>(45);

  // Focus trap, Escape and focus restore are gated on isOpen inside the hook.
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  const breakRemaining = getBreakRemainingSeconds();
  const examRemaining = getRemainingSeconds();

  const handleStartPreset = (type: 'bio' | 'food' | 'rest') => {
    startBreak(type);
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMinutes > 0) {
      startBreak('custom', customMinutes);
    }
  };

  const handleCancelBreak = () => {
    cancelBreak();
  };

  const formatBreakTypeLabel = (type: string) => {
    switch (type) {
      case 'bio':
        return '15-Minute Bio Break';
      case 'food':
        return '30-Minute Food / Meal Break';
      case 'rest':
        return '2-Hour Rest / Sleep Block';
      case 'custom':
        return 'Custom Paced Break';
      default:
        return 'Operator Break';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="exam-bio-break"
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6"
          data-testid="exam-bio-break-dialog-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
        >
          {/* Backdrop */}
          <div
            data-testid="bio-break-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Dialog */}
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bio-break-title"
            data-testid="exam-bio-break-modal"
            className="relative w-full max-w-lg bg-surface-card border border-subtle rounded-2xl shadow-2xl overflow-hidden z-10 text-primary machined-edge"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: TACTICAL_SPRING }}
            exit={{
              opacity: 0,
              scale: 0.98,
              y: 4,
              transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-subtle bg-surface-sunken flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="bio-break-title"
                    className="text-sm font-semibold text-primary tracking-tight"
                  >
                    Operator Bio-Break Manager
                  </h2>
                  <p className="text-[11px] text-muted">
                    OffSec & HTB endurance pacing • Dual-clock cyber monitor
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="break-modal-close"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                aria-label="Close bio-break modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5">
              {/* Active Break State */}
              {activeBreak.isActive ? (
                <div
                  data-testid="active-break-panel"
                  className="p-4 rounded-xl bg-callout-warn-bg border border-callout-warn-border space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-callout-warn-fg motion-safe:animate-ping" />
                      <span className="text-xs font-semibold tracking-wide text-callout-warn-fg">
                        {formatBreakTypeLabel(activeBreak.type)} ACTIVE
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-surface-card text-callout-warn-fg border border-callout-warn-border font-semibold">
                      Clock Running
                    </span>
                  </div>

                  {/* Primary clock: break countdown */}
                  <div className="text-center py-2">
                    <div className="text-xs text-secondary font-medium mb-1">
                      Remaining Break Duration
                    </div>
                    <div
                      data-testid="break-countdown"
                      className="font-mono text-5xl sm:text-6xl font-semibold text-callout-warn-fg tracking-tight tabular-nums"
                    >
                      {formatSecondsToHms(breakRemaining)}
                    </div>
                  </div>

                  {/* Secondary clock: exam countdown */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-sunken border border-subtle">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Exam clock (running)</span>
                    </span>
                    <span
                      data-testid="break-exam-clock"
                      className="font-mono text-sm font-medium text-secondary tabular-nums"
                    >
                      {formatSecondsToHms(examRemaining)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-sunken border border-subtle text-xs text-secondary space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-callout-warn-fg text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Dual Exam Clock Telemetry</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Your certification exam countdown continues in the background without penalty. An audible cyber alarm will trigger when this break expires.
                    </p>
                  </div>

                  {/* Conclude Button */}
                  <button
                    type="button"
                    data-testid="break-cancel-btn"
                    onClick={handleCancelBreak}
                    className="w-full py-2.5 px-4 rounded-lg bg-surface-card hover:bg-surface-hover text-callout-warn-fg border border-callout-warn-border text-xs font-semibold tracking-wide transition-[transform,background-color,border-color,color] flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Conclude Break & Resume Cockpit</span>
                  </button>
                </div>
              ) : (
                /* Presets Selection */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      Select Break Duration Preset
                    </span>
                    <span className="text-[10px] text-muted">
                      Runs in parallel with exam
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PRESETS.map(({ testId, type, Icon, tag, title, sub }) => (
                      <button
                        key={testId}
                        type="button"
                        data-testid={testId}
                        onClick={() => handleStartPreset(type)}
                        className="p-3.5 rounded-xl bg-surface-sunken border border-subtle hover:border-accent hover:bg-surface-hover text-left transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-4 h-4 text-accent" />
                          <span className="text-[10px] font-medium font-mono tabular-nums px-1.5 py-0.5 rounded bg-surface-card text-secondary border border-subtle">
                            {tag}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-primary">{title}</div>
                        <p className="text-[10px] text-muted mt-1">{sub}</p>
                      </button>
                    ))}
                  </div>

                  {/* Custom Duration Form */}
                  <form
                    onSubmit={handleStartCustom}
                    className="p-3.5 rounded-xl bg-surface-sunken border border-subtle flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <label
                        htmlFor="custom-break-input"
                        className="block text-[11px] font-medium text-secondary mb-1"
                      >
                        Custom Break Duration (Minutes)
                      </label>
                      <div className="relative">
                        <input
                          id="custom-break-input"
                          type="number"
                          min={1}
                          max={720}
                          value={customMinutes}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            if (isNaN(parsed)) {
                              setCustomMinutes(1);
                              return;
                            }
                            setCustomMinutes(Math.min(720, Math.max(1, parsed)));
                          }}
                          className="w-full bg-surface-card border border-subtle rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                        />
                        <span className="absolute right-3 top-1.5 text-xs text-muted">
                          min
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      data-testid="break-preset-custom"
                      className="mt-5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold transition-[transform,background-color,border-color,color] flex items-center gap-1 active:scale-[0.97]"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Break</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Break History Log */}
              {breakHistory && breakHistory.length > 0 && (
                <div className="pt-3 border-t border-subtle space-y-2">
                  <span className="text-[11px] font-semibold text-muted">
                    Completed Break History ({breakHistory.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5">
                    {breakHistory.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-surface-sunken border border-subtle text-[11px] flex items-center justify-between"
                      >
                        <span className="text-secondary capitalize">
                          {b.type} Break
                        </span>
                        <span className="text-muted font-mono tabular-nums">
                          {Math.round(b.duration / 60)}m elapsed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-subtle bg-surface-sunken flex items-center justify-between text-xs">
              <span className="text-[10px] text-muted">
                Press <kbd className="px-1 py-0.5 rounded bg-surface-card border border-subtle text-secondary font-mono">Esc</kbd> to dismiss
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg border border-subtle hover:bg-surface-hover text-secondary hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
