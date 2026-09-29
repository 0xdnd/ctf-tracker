import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  Clock, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Coffee, 
  Pause,
  Play
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { formatSecondsToHms } from '../../utils/examPacingUtils';

export const ExamHeaderCapsule: React.FC = () => {
  const {
    status,
    track,
    activeBreak,
    remainingSeconds,
    isQuickDrawerOpen,
    toggleQuickDrawer,
    getRemainingSeconds,
    getBreakRemainingSeconds,
    getScore,
    getPassingStatus,
    tick,
  } = useExamStore(
    useShallow((s) => ({
      status: s.status,
      track: s.track,
      activeBreak: s.activeBreak,
      remainingSeconds: s.remainingSeconds,
      isQuickDrawerOpen: s.isQuickDrawerOpen,
      toggleQuickDrawer: s.toggleQuickDrawer,
      getRemainingSeconds: s.getRemainingSeconds,
      getBreakRemainingSeconds: s.getBreakRemainingSeconds,
      getScore: s.getScore,
      getPassingStatus: s.getPassingStatus,
      tick: s.tick,
    }))
  );

  // Only render when an exam session is actively in progress or paused/completed
  if (status === 'idle') {
    return null;
  }

  const remainingTime = getRemainingSeconds();
  const breakRemaining = getBreakRemainingSeconds();
  const score = getScore();
  const passingStatus = getPassingStatus();
  const isPassing = passingStatus === 'Passing';
  const isCritical = passingStatus === 'Critical';

  // Dynamic styling based on pass/critical status
  let containerStyle = 'bg-slate-100 dark:bg-cyber-card/90 border-slate-300 dark:border-cyber-border hover:border-cyan-500/50 dark:hover:border-cyber-cyan/50 text-slate-800 dark:text-cyber-text';
  if (isPassing) {
    containerStyle = 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 text-emerald-900 dark:text-cyber-emerald';
  } else if (isCritical) {
    containerStyle = 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/50 hover:border-rose-400 text-rose-900 dark:text-cyber-crimson';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="exam-header-capsule"
      onClick={toggleQuickDrawer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleQuickDrawer();
        }
      }}
      className={`group cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border font-mono text-xs transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] ${containerStyle}`}
      title="ZeroBox Persistent Exam HUD - Click to toggle Quick Actions (Alt+E)"
      aria-label={`${track} ${formatSecondsToHms(remainingTime)} ${score.totalScore}/${score.maxScore || 100} PTS - Exam Mission HUD Capsule`}
      aria-expanded={isQuickDrawerOpen}
    >
      {/* Track Badge */}
      <span
        data-testid="exam-capsule-track"
        className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex-shrink-0"
      >
        {track}
      </span>

      {/* Live Countdown Clock */}
      <div
        data-testid="exam-capsule-countdown"
        className="flex items-center gap-1 font-bold text-slate-900 dark:text-white flex-shrink-0"
      >
        {status === 'paused' ? (
          <Pause className="w-3 h-3 text-amber-500 dark:text-cyber-amber flex-shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-cyan-600 dark:text-cyber-cyan flex-shrink-0" />
        )}
        <span className="tabular-nums">{formatSecondsToHms(remainingTime)}</span>
        {status === 'paused' && (
          <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-cyber-amber font-semibold hidden md:inline">
            [PAUSED]
          </span>
        )}
      </div>

      <div className="w-px h-3 bg-slate-300 dark:bg-cyber-border flex-shrink-0" />

      {/* Points Counter: XX / 100 PTS */}
      <div
        data-testid="exam-capsule-score"
        className="flex items-center gap-0.5 flex-shrink-0"
      >
        <span
          className={`font-black tabular-nums ${
            isPassing
              ? 'text-emerald-600 dark:text-cyber-emerald'
              : isCritical
              ? 'text-rose-600 dark:text-cyber-crimson'
              : 'text-amber-600 dark:text-cyber-amber'
          }`}
        >
          {score.totalScore}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-zinc-400">
          / {score.maxScore || 100} PTS
        </span>
      </div>

      {/* Passing Status Badge */}
      <div className="hidden sm:flex items-center flex-shrink-0">
        {isPassing ? (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-cyber-emerald border border-emerald-500/30 flex items-center gap-1"
          >
            <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />
            <span>Passing</span>
          </span>
        ) : isCritical ? (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/15 text-rose-700 dark:text-cyber-crimson border border-rose-500/30 flex items-center gap-1 animate-pulse"
          >
            <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
            <span>Critical</span>
          </span>
        ) : (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-cyber-amber border border-amber-500/30 flex items-center gap-1"
          >
            <Zap className="w-2.5 h-2.5 text-cyber-cyan flex-shrink-0" />
            <span>In Progress</span>
          </span>
        )}
      </div>

      {/* Active Bio-Break Badge */}
      {activeBreak.isActive && (
        <span
          data-testid="exam-capsule-break"
          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-cyber-amber border border-amber-500/40 flex items-center gap-1 animate-pulse flex-shrink-0"
          title={`Active ${activeBreak.type} break`}
        >
          <Coffee className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="tabular-nums">{formatSecondsToHms(breakRemaining)}</span>
        </span>
      )}

      {/* Quick Action Chevron */}
      <ChevronDown
        className={`w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:text-cyan-500 dark:group-hover:text-cyber-cyan transition-transform duration-150 flex-shrink-0 ${
          isQuickDrawerOpen ? 'rotate-180' : ''
        }`}
      />
    </div>
  );
};
