import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  Clock, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Coffee, 
  Pause} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { formatSecondsToHms } from '../../utils/examPacingUtils';

export const ExamHeaderCapsule: React.FC = () => {
  const {
    status,
    track,
    activeBreak,
    isQuickDrawerOpen,
    toggleQuickDrawer,
    getRemainingSeconds,
    getBreakRemainingSeconds,
    getScore,
    getPassingStatus,
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
  let containerStyle = 'bg-surface-card border-subtle hover:border-accent text-primary';
  if (isPassing) {
    containerStyle = 'bg-callout-success-bg border-callout-success-border hover:border-callout-success-fg text-callout-success-fg';
  } else if (isCritical) {
    containerStyle = 'bg-callout-danger-bg border-callout-danger-border hover:border-callout-danger-fg text-callout-danger-fg';
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
      className={`group cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border font-sans text-xs transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.97] machined-edge-subtle shadow-xs ${containerStyle}`}
      title="ZeroBox Persistent Exam HUD - Click to toggle Quick Actions (Alt+E)"
      aria-label={`${track} ${formatSecondsToHms(remainingTime)} ${score.totalScore}/${score.maxScore || 100} PTS - Exam Mission HUD Capsule`}
      aria-expanded={isQuickDrawerOpen}
    >
      {/* Track Badge */}
      <span
        data-testid="exam-capsule-track"
        className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface-sunken text-secondary border border-subtle flex-shrink-0"
      >
        {track}
      </span>

      {/* Live Countdown Clock */}
      <div
        data-testid="exam-capsule-countdown"
        className="flex items-center gap-1 font-mono font-semibold text-primary flex-shrink-0"
      >
        {status === 'paused' ? (
          <Pause className="w-3 h-3 text-callout-warn-fg flex-shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-accent flex-shrink-0" />
        )}
        <span className="font-mono tabular-nums">{formatSecondsToHms(remainingTime)}</span>
        {status === 'paused' && (
          <span className="text-[11px] text-callout-warn-fg font-semibold hidden md:inline">
            [PAUSED]
          </span>
        )}
      </div>

      <div className="h-3 border-l border-strong flex-shrink-0" />

      {/* Points Counter: XX / 100 PTS */}
      <div
        data-testid="exam-capsule-score"
        className="flex items-center gap-0.5 flex-shrink-0"
      >
        <span
          className={`font-mono font-semibold tabular-nums ${
 isPassing
 ? 'text-callout-success-fg'
 : isCritical
 ? 'text-callout-danger-fg'
 : 'text-callout-warn-fg'
 }`}
        >
          {score.totalScore}
        </span>
        <span className="text-[11px] text-muted font-mono tabular-nums">
          / {score.maxScore || 100} PTS
        </span>
      </div>

      {/* Passing Status Badge */}
      <div className="hidden sm:flex items-center flex-shrink-0">
        {isPassing ? (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border flex items-center gap-1"
          >
            <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />
            <span>Passing</span>
          </span>
        ) : isCritical ? (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border flex items-center gap-1 motion-safe:animate-pulse"
          >
            <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
            <span>Critical</span>
          </span>
        ) : (
          <span
            data-testid="exam-capsule-status"
            className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border flex items-center gap-1"
          >
            <Zap className="w-2.5 h-2.5 text-accent flex-shrink-0" />
            <span>In Progress</span>
          </span>
        )}
      </div>

      {/* Active Bio-Break Badge */}
      {activeBreak.isActive && (
        <span
          data-testid="exam-capsule-break"
          className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border flex items-center gap-1 motion-safe:animate-pulse flex-shrink-0"
          title={`Active ${activeBreak.type} break`}
        >
          <Coffee className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="font-mono tabular-nums">{formatSecondsToHms(breakRemaining)}</span>
        </span>
      )}

      {/* Quick Action Chevron */}
      <ChevronDown
        className={`w-3 h-3 text-muted group-hover:text-accent transition-transform duration-150 flex-shrink-0 ${
 isQuickDrawerOpen ? 'rotate-180' : ''
 }`}
      />
    </div>
  );
};
