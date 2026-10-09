/**
 * Single source of truth for rabbit-hole thresholds.
 * Exam simulator (per-box wall time) and the methodology checklist (per-item time) read from here.
 */
export const RABBIT_HOLE_THRESHOLDS = {
  /** Minutes on one exam box with no new flag before the simulator warns. */
  examMinutes: 90,
  /** Minutes on one checklist item before the checklist suggests a fallback. */
  checklistMinutes: 30,
  /** Default snooze for the exam rabbit-hole warning. */
  snoozeMinutes: 30,
} as const;
