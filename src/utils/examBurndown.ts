/**
 * examBurndown.ts
 * Pure burn-down / velocity series builder for the Exam Simulator.
 *
 * The series is produced by REPLAYING `calculateExamScore` at every event
 * timestamp on boxes whose flags are masked to only those captured at or
 * before that timestamp. No scoring rule is re-derived here: OSCP's
 * Active Directory all-or-nothing rule, bonus points and caps all come from
 * calculateExamScore itself.
 *
 * Out-of-window policy:
 *  - events BEFORE startedAt are clamped to startedAt;
 *  - events AFTER expiresAt (when expiresAt is known) are EXCLUDED, since a
 *    flag captured after the clock ran out does not count toward the exam;
 *  - a flag marked pwned with no usable timestamp is treated as captured at
 *    startedAt so that the final step still agrees with the live score.
 */

import { calculateExamScore, ExamBox, ExamTrack } from './examComplianceUtils';

export interface BurndownPoint {
  /** Epoch milliseconds */
  t: number;
  /** Score at time t (as computed by calculateExamScore) */
  points: number;
  /** max(0, passThreshold - points) */
  remainingToPass: number;
}

export interface IdealPacePoint {
  t: number;
  points: number;
}

export interface BurndownSeries {
  /** Step series: value holds from one point's t until the next point's t */
  steps: BurndownPoint[];
  /** Straight pace line (startedAt, 0) -> (expiresAt, passThreshold) */
  ideal: IdealPacePoint[];
  startedAt: number;
  /** End of the exam window (null when unknown) */
  expiresAt: number | null;
  passThreshold: number;
}

export interface BurndownOptions {
  /** Defaults to 'OSCP' (the default exam track) */
  track?: ExamTrack;
  includeBonusPoints?: boolean;
}

function parseIso(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Time at which the user flag was captured (null if not pwned). */
function userFlagTime(box: ExamBox, startedAt: number): number | null {
  if (!box.userPwned) return null;
  return parseIso(box.userProof?.pwnedAt) ?? parseIso(box.initialAccessAt) ?? startedAt;
}

/** Time at which the root flag was captured (null if not pwned). */
function rootFlagTime(box: ExamBox, startedAt: number): number | null {
  if (!box.rootPwned) return null;
  return (
    parseIso(box.rootProof?.pwnedAt) ??
    parseIso(box.privEscAt) ??
    parseIso(box.domainCompromiseAt) ??
    startedAt
  );
}

/** Every timestamp carried by a box (used to place sample points). */
function boxEventTimes(box: ExamBox): (number | null)[] {
  return [
    parseIso(box.initialAccessAt),
    parseIso(box.privEscAt),
    parseIso(box.domainCompromiseAt),
    parseIso(box.userProof?.pwnedAt),
    parseIso(box.rootProof?.pwnedAt),
  ];
}

export function buildBurndownSeries(
  boxes: ExamBox[],
  startedAt: number,
  expiresAt: number | null,
  passThreshold: number,
  options: BurndownOptions = {}
): BurndownSeries {
  const track = options.track ?? 'OSCP';
  const scoreOpts = { includeBonusPoints: options.includeBonusPoints };
  const inWindow = (t: number) => expiresAt === null || t <= expiresAt;
  const clamp = (t: number) => Math.max(startedAt, t);

  // Resolve flag capture times once (clamped to the window start).
  const resolved = boxes.map((box) => {
    const u = userFlagTime(box, startedAt);
    const r = rootFlagTime(box, startedAt);
    return {
      box,
      userAt: u === null ? null : clamp(u),
      rootAt: r === null ? null : clamp(r),
    };
  });

  // Distinct, sorted sample timestamps: window start + every in-window event.
  const stamps = new Set<number>([startedAt]);
  boxes.forEach((box) => {
    boxEventTimes(box).forEach((raw) => {
      if (raw === null) return;
      const t = clamp(raw);
      if (inWindow(t)) stamps.add(t);
    });
  });
  resolved.forEach(({ userAt, rootAt }) => {
    if (userAt !== null && inWindow(userAt)) stamps.add(userAt);
    if (rootAt !== null && inWindow(rootAt)) stamps.add(rootAt);
  });
  const times = Array.from(stamps).sort((a, b) => a - b);

  const allSteps: BurndownPoint[] = times.map((t) => {
    const masked: ExamBox[] = resolved.map(({ box, userAt, rootAt }) => ({
      ...box,
      userPwned: userAt !== null && userAt <= t,
      rootPwned: rootAt !== null && rootAt <= t,
    }));
    const { totalScore } = calculateExamScore(track, masked, scoreOpts);
    return {
      t,
      points: totalScore,
      remainingToPass: Math.max(0, passThreshold - totalScore),
    };
  });

  // Collapse samples that do not change the score (keep the first point).
  const steps = allSteps.filter((p, i) => i === 0 || p.points !== allSteps[i - 1].points);

  const idealEnd =expiresAt ?? times[times.length - 1];
  const ideal: IdealPacePoint[] = [
    { t: startedAt, points: 0 },
    { t: Math.max(startedAt, idealEnd), points: passThreshold },
  ];

  return { steps, ideal, startedAt, expiresAt, passThreshold };
}

/** Latest timestamp carried by any box (null when none). */
export function latestBoxEventTime(boxes: ExamBox[]): number | null {
  let latest: number | null = null;
  for (const box of boxes) {
    const times = [
      ...boxEventTimes(box),
      box.userPwned ? userFlagTime(box, 0) : null,
      box.rootPwned ? rootFlagTime(box, 0) : null,
    ];
    for (const t of times) {
      if (t !== null && t > 0 && (latest === null || t > latest)) latest = t;
    }
  }
  return latest;
}

export interface ChartWindowInput {
  startedAt: number;
  /** Live expiry; null while paused. */
  examExpiresAt: number | null;
  /** Last non-null expiry observed (survives pause). */
  lastExpiresAt: number | null;
  totalDurationSeconds: number;
  timerPausedRemainingSeconds: number | null;
  /** Remaining seconds as reported by the store (running or paused). */
  currentRemainingSeconds: number;
  boxes: ExamBox[];
}

export interface ChartWindow {
  /** Stable end of the chart window (epoch ms) */
  end: number;
  /** Wall-clock "now" marker (epoch ms); equals the pause moment while paused */
  nowMs: number;
}

/**
 * Resolves the chart's end and "now" so they stay on the wall-clock axis that
 * flag timestamps use, including while the exam is paused (when examExpiresAt
 * is null and earlier pause time would otherwise be lost).
 */
export function resolveChartWindow(input: ChartWindowInput): ChartWindow {
  const { startedAt, examExpiresAt, lastExpiresAt, totalDurationSeconds, timerPausedRemainingSeconds, boxes } = input;
  const latestEvent = latestBoxEventTime(boxes);
  const paused = examExpiresAt === null;
  const end =
    examExpiresAt ??
    lastExpiresAt ??
    Math.max(startedAt + totalDurationSeconds * 1000, latestEvent ?? 0);
  const remaining = paused
    ? timerPausedRemainingSeconds ?? input.currentRemainingSeconds
    : input.currentRemainingSeconds;
  let nowMs = end - remaining * 1000;
  // Remaining is floored to whole seconds; never let "now" trail a captured flag.
  if (latestEvent !== null && latestEvent <= end) nowMs = Math.max(nowMs, latestEvent);
  nowMs = Math.max(startedAt, nowMs);
  return { end, nowMs };
}
