import { useEffect, useRef, useState } from 'react';
import { useExamStore } from '../store/examStore';
import { useCtfStore } from '../store/useCtfStore';
import { useToastStore } from '../store/useToastStore';
import { checkRabbitHole } from '../utils/examPacingUtils';
import { playCyberSound } from '../utils/helpers';
import { RABBIT_HOLE_THRESHOLDS } from '../utils/rabbitHoleConfig';

export interface ExamRabbitHoleState {
  boxId: string | null;
  isRabbitHole: boolean;
  timeSpentSeconds: number;
}

const IDLE: ExamRabbitHoleState = { boxId: null, isRabbitHole: false, timeSpentSeconds: 0 };

/**
 * Evaluates the active exam box against the rabbit-hole threshold once per second while the
 * exam runs. Toasts + plays the alert cue once per box-session (re-armed by a new flag or an
 * expired snooze). Returns the current state for inline indicators.
 */
export function useExamRabbitHole(): ExamRabbitHoleState {
  const status = useExamStore((s) => s.status);
  const [state, setState] = useState<ExamRabbitHoleState>(IDLE);
  const warnedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'running') {
      setState((prev) => (prev === IDLE ? prev : IDLE));
      return;
    }
    const evaluate = () => {
      const s = useExamStore.getState();
      const box = s.activeBoxId ? s.boxes.find((b) => b.id === s.activeBoxId) : undefined;
      if (!box) {
        setState((prev) => (prev === IDLE ? prev : IDLE));
        return;
      }
      const now = Date.now();
      const fullyPwned =
        (box.userPoints === 0 || box.userPwned) && (box.rootPoints === 0 || box.rootPwned);
      const result = checkRabbitHole(
        box.id,
        box.name,
        s.activeBoxSince,
        fullyPwned,
        RABBIT_HOLE_THRESHOLDS.examMinutes,
        now
      );
      const snoozed = s.rabbitHoleSnoozeUntil !== null && now < s.rabbitHoleSnoozeUntil;
      const active = result.isRabbitHole && !snoozed;
      if (active) {
        const key = `${box.id}:${s.activeBoxSince}:${s.rabbitHoleSnoozeUntil}`;
        if (warnedKeyRef.current !== key) {
          warnedKeyRef.current = key;
          useToastStore.getState().addToast({
            type: 'warning',
            title: 'Rabbit hole',
            message: result.message ?? `Long time on ${box.name}. Consider pivoting.`,
            durationMs: 10000,
          });
          if (useCtfStore.getState().soundEnabled) playCyberSound('alert');
        }
      }
      const timeSpentSeconds = result.timeSpentSeconds;
      setState((prev) =>
        prev.boxId === box.id && prev.isRabbitHole === active && prev.timeSpentSeconds === timeSpentSeconds
          ? prev
          : { boxId: box.id, isRabbitHole: active, timeSpentSeconds }
      );
    };
    evaluate();
    const timer = setInterval(evaluate, 1000);
    return () => clearInterval(timer);
  }, [status]);

  return state;
}
