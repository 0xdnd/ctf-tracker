/**
 * examPacingUtils.ts
 * ZeroBox Tactical Certification Exam Simulator & Mission HUD
 * 
 * Dynamic Pacing Engine, Bio-Break Management & Rabbit Hole Detection:
 * - Dynamic pts/hr calculation, projected score, and endurance recommendations
 * - Dual-clock bio-break countdown calculations
 * - >90-minute rabbit hole detector to alert stuck operators to pivot
 */

import { ExamBox, ExamTrackConfig } from './examComplianceUtils';
import { RABBIT_HOLE_THRESHOLDS } from './rabbitHoleConfig';

/** Track parameters the pacing engine scales against (defaults to the 24h / 100-pt OSCP exam). */
export type PacingTrackConfig = Pick<ExamTrackConfig, 'maxScore' | 'durationSeconds'>;

const DEFAULT_PACING_TRACK: PacingTrackConfig = { maxScore: 100, durationSeconds: 86400 };

export interface PacingAnalysis {
  elapsedSeconds: number;
  remainingSeconds: number;
  currentScore: number;
  passThreshold: number;
  pointsNeeded: number;
  requiredPacePtsPerHour: number;
  currentPacePtsPerHour: number;
  projectedFinalScore: number;
  pacingStatus: 'PASSED' | 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'CRITICAL';
  recommendation: string;
  timeRemainingPerUnrootedBoxSeconds: number;
  unrootedBoxesCount: number;
}

export interface RabbitHoleWarning {
  isRabbitHole: boolean;
  activeTargetId?: string;
  activeTargetName?: string;
  timeSpentSeconds: number;
  thresholdSeconds: number;
  message?: string;
}

export interface BreakCountdownResult {
  remainingSeconds: number;
  isExpired: boolean;
  formattedTime: string;
}

/**
 * Computes dynamic exam pacing, velocity, projected score, and tactical recommendations.
 * Thresholds scale with the track's duration and max score (pass EXAM_TRACK_CONFIGS[track]);
 * omitted, they default to the 24h / 100-pt OSCP exam.
 */
export function computeExamPacing(
  session: {
    examStartedAt: number | null;
    examExpiresAt: number | null;
    timerPausedRemainingSeconds: number | null;
    examDurationSeconds?: number;
    totalDurationSeconds?: number;
    boxes: ExamBox[];
  },
  scoreData: {
    totalScore: number;
    passThreshold: number;
  },
  currentTime: number = Date.now(),
  trackConfig: PacingTrackConfig = DEFAULT_PACING_TRACK
): PacingAnalysis {
  const { maxScore, durationSeconds: trackDurationSeconds } = trackConfig;
  const startedAt = session.examStartedAt || currentTime;
  const elapsedSeconds = Math.max(1, Math.floor((currentTime - startedAt) / 1000));

  let remainingSeconds: number;
  if (session.examExpiresAt) {
    remainingSeconds = Math.max(0, Math.floor((session.examExpiresAt - currentTime) / 1000));
  } else if (session.timerPausedRemainingSeconds !== null) {
    remainingSeconds = Math.max(0, session.timerPausedRemainingSeconds);
  } else {
    remainingSeconds = session.totalDurationSeconds ?? session.examDurationSeconds ?? trackDurationSeconds;
  }

  const currentScore = scoreData.totalScore;
  const passThreshold = scoreData.passThreshold;
  const pointsNeeded = Math.max(0, passThreshold - currentScore);

  const remainingHours = Math.max(0.01, remainingSeconds / 3600);
  const elapsedHours = Math.max(0.01, elapsedSeconds / 3600);

  const requiredPacePtsPerHour = Number((pointsNeeded / remainingHours).toFixed(2));
  const currentPacePtsPerHour = Number((currentScore / elapsedHours).toFixed(2));
  const projectedFinalScore = Math.min(
    maxScore,
    Math.round(currentScore + currentPacePtsPerHour * remainingHours)
  );

  // Unrooted boxes calculation
  const unrootedBoxes = session.boxes.filter(
    (b) => (b.userPoints > 0 && !b.userPwned) || (b.rootPoints > 0 && !b.rootPwned)
  );
  const unrootedBoxesCount = unrootedBoxes.length;
  const timeRemainingPerUnrootedBoxSeconds =
    unrootedBoxesCount > 0 ? Math.floor(remainingSeconds / unrootedBoxesCount) : remainingSeconds;

  let pacingStatus: 'PASSED' | 'ON_TRACK' | 'BEHIND_SCHEDULE' | 'CRITICAL' = 'ON_TRACK';
  let recommendation = 'Pacing is healthy. Continue systematically through enumeration checklist.';

  if (currentScore >= passThreshold) {
    pacingStatus = 'PASSED';
    recommendation =
      'PASSING THRESHOLD ACHIEVED. Verify all screenshot proofs, whoami logs, and begin report generation!';
  } else if (remainingSeconds <= trackDurationSeconds * 0.25 && pointsNeeded > maxScore * 0.2) {
    pacingStatus = 'CRITICAL';
    recommendation = `CRITICAL TIME PRESSURE: ${(remainingSeconds / 3600).toFixed(1)}h remaining. Focus on highest-yield targets immediately!`;
  } else if (
    (currentPacePtsPerHour > 0 && requiredPacePtsPerHour > currentPacePtsPerHour * 1.5) ||
    (currentPacePtsPerHour === 0 && elapsedSeconds >= trackDurationSeconds * 0.15)
  ) {
    pacingStatus = 'BEHIND_SCHEDULE';
    recommendation = `Pacing alert: Required pace is ${requiredPacePtsPerHour.toFixed(1)} pts/hr. If stuck on current target, pivot immediately!`;
  }

  return {
    elapsedSeconds,
    remainingSeconds,
    currentScore,
    passThreshold,
    pointsNeeded,
    requiredPacePtsPerHour,
    currentPacePtsPerHour,
    projectedFinalScore,
    pacingStatus,
    recommendation,
    timeRemainingPerUnrootedBoxSeconds,
    unrootedBoxesCount,
  };
}

/**
 * Detects whether operator has spent > threshold (default 90m) on a single box without progress
 */
export function checkRabbitHole(
  targetId: string,
  targetName: string,
  targetActiveSinceMs: number | null,
  isPwned: boolean = false,
  thresholdMinutes: number = RABBIT_HOLE_THRESHOLDS.examMinutes,
  currentTime: number = Date.now()
): RabbitHoleWarning {
  const thresholdSeconds = thresholdMinutes * 60;

  if (!targetActiveSinceMs || isPwned) {
    return {
      isRabbitHole: false,
      activeTargetId: targetId,
      activeTargetName: targetName,
      timeSpentSeconds: 0,
      thresholdSeconds,
    };
  }

  const timeSpentSeconds = Math.max(0, Math.floor((currentTime - targetActiveSinceMs) / 1000));
  const isRabbitHole = timeSpentSeconds >= thresholdSeconds;

  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const hours = Math.floor(minutesSpent / 60);
  const mins = minutesSpent % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const message = isRabbitHole
    ? `⚠️ RABBIT HOLE DETECTED: ${timeStr} spent on target "${targetName}" with 0 progress. Recommendation: Reset machine, take a 10m walk, or pivot to another target.`
    : undefined;

  return {
    isRabbitHole,
    activeTargetId: targetId,
    activeTargetName: targetName,
    timeSpentSeconds,
    thresholdSeconds,
    message,
  };
}

/**
 * Calculates remaining bio-break time and formatted countdown
 */
export function calculateBreakCountdown(
  startedAt: number | null,
  durationSeconds: number,
  now: number = Date.now()
): BreakCountdownResult {
  if (!startedAt) {
    return {
      remainingSeconds: durationSeconds,
      isExpired: false,
      formattedTime: formatSecondsToHms(durationSeconds),
    };
  }

  const expiresAt = startedAt + durationSeconds * 1000;
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const isExpired = remainingSeconds <= 0;

  return {
    remainingSeconds,
    isExpired,
    formattedTime: formatSecondsToHms(remainingSeconds),
  };
}

/**
 * Formats seconds into HH:MM:SS
 */
export function formatSecondsToHms(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds into human-readable hours and minutes (e.g., "3h 45m" or "25m")
 */
export function formatSecondsToHoursMinutes(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}
