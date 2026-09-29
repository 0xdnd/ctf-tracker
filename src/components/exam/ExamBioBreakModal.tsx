import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  Coffee, 
  Clock, 
  RotateCcw, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Utensils, 
  Moon, 
  Timer,
  Play
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatSecondsToHms } from '../../utils/examPacingUtils';

export interface ExamBioBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    tick,
  } = useExamStore(
    useShallow((s) => ({
      activeBreak: s.activeBreak,
      breakHistory: s.breakHistory,
      startBreak: s.startBreak,
      cancelBreak: s.cancelBreak,
      getBreakRemainingSeconds: s.getBreakRemainingSeconds,
      tick: s.tick,
    }))
  );

  const [customMinutes, setCustomMinutes] = useState<number>(45);

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const breakRemaining = getBreakRemainingSeconds();

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto font-mono flex items-center justify-center p-4 sm:p-6"
      data-testid="exam-bio-break-dialog-container"
    >
      {/* Backdrop */}
      <div
        data-testid="bio-break-backdrop"
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bio-break-title"
        data-testid="exam-bio-break-modal"
        className="relative w-full max-w-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border rounded-xl shadow-2xl overflow-hidden z-10 text-slate-100 dark:text-cyber-text"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 dark:border-cyber-border bg-slate-950/80 dark:bg-cyber-bg/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="bio-break-title"
                className="text-sm font-bold text-white tracking-wide uppercase"
              >
                Operator Bio-Break Manager
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-cyber-muted">
                OffSec & HTB endurance pacing • Dual-clock cyber monitor
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="break-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-zinc-800 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
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
              className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    {formatBreakTypeLabel(activeBreak.type)} ACTIVE
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                  Clock Running
                </span>
              </div>

              {/* Big Countdown Display */}
              <div className="text-center py-2">
                <div className="text-xs text-amber-300/80 uppercase font-semibold mb-1">
                  Remaining Break Duration
                </div>
                <div
                  data-testid="break-countdown"
                  className="text-4xl sm:text-5xl font-black text-amber-400 tracking-widest tabular-nums"
                >
                  {formatSecondsToHms(breakRemaining)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-amber-500/20 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Dual Exam Clock Telemetry</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your certification exam countdown continues in the background without penalty. An audible cyber alarm will trigger when this break expires.
                </p>
              </div>

              {/* Conclude Button */}
              <button
                type="button"
                data-testid="break-cancel-btn"
                onClick={handleCancelBreak}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider transition-[transform,box-shadow,background-color,border-color,color] flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Conclude Break & Resume Cockpit</span>
              </button>
            </div>
          ) : (
            /* Presets Selection */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Break Duration Preset
                </span>
                <span className="text-[10px] text-slate-500">
                  Runs in parallel with exam
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 15m Bio */}
                <button
                  type="button"
                  data-testid="break-preset-bio-15"
                  onClick={() => handleStartPreset('bio')}
                  className="p-3.5 rounded-xl bg-slate-950/80 dark:bg-cyber-bg/80 border border-slate-700 dark:border-cyber-border hover:border-amber-400/60 hover:bg-amber-500/10 text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      15m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    Quick Bio Break
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hydration, stretch & eye rest
                  </p>
                </button>

                {/* 30m Meal */}
                <button
                  type="button"
                  data-testid="break-preset-food-30"
                  onClick={() => handleStartPreset('food')}
                  className="p-3.5 rounded-xl bg-slate-950/80 dark:bg-cyber-bg/80 border border-slate-700 dark:border-cyber-border hover:border-amber-400/60 hover:bg-amber-500/10 text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Utensils className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      30m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    Meal / Nutrition
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Food intake & mental reset
                  </p>
                </button>

                {/* 2h Rest */}
                <button
                  type="button"
                  data-testid="break-preset-rest-120"
                  onClick={() => handleStartPreset('rest')}
                  className="p-3.5 rounded-xl bg-slate-950/80 dark:bg-cyber-bg/80 border border-slate-700 dark:border-cyber-border hover:border-amber-400/60 hover:bg-amber-500/10 text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Moon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      2h
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    Rest / Sleep Block
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cognitive recharge & power nap
                  </p>
                </button>
              </div>

              {/* Custom Duration Form */}
              <form
                onSubmit={handleStartCustom}
                className="p-3.5 rounded-xl bg-slate-950/60 dark:bg-cyber-bg/60 border border-slate-800 dark:border-cyber-border flex items-center gap-3"
              >
                <div className="flex-1">
                  <label
                    htmlFor="custom-break-input"
                    className="block text-[11px] font-semibold text-slate-300 mb-1"
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
                      onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-slate-500">
                      min
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  data-testid="break-preset-custom"
                  className="mt-5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase transition-[transform,background-color,border-color,color] flex items-center gap-1 active:scale-[0.98]"
                >
                  <Play className="w-3 h-3" />
                  <span>Start Break</span>
                </button>
              </form>
            </div>
          )}

          {/* Break History Log */}
          {breakHistory && breakHistory.length > 0 && (
            <div className="pt-3 border-t border-slate-800 dark:border-cyber-border/70 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Completed Break History ({breakHistory.length})
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1.5">
                {breakHistory.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-950/50 dark:bg-cyber-bg/50 border border-slate-800 text-[11px] flex items-center justify-between"
                  >
                    <span className="text-slate-300 capitalize">
                      {b.type} Break
                    </span>
                    <span className="text-slate-400 font-mono">
                      {Math.round(b.duration / 60)}m elapsed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 dark:border-cyber-border bg-slate-950/80 dark:bg-cyber-bg/80 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Esc</kbd> to dismiss
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
