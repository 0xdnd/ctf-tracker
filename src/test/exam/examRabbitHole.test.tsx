import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const playCyberSound = vi.fn();
vi.mock('../../utils/helpers', async (orig) => ({
  ...(await orig<typeof import('../../utils/helpers')>()),
  playCyberSound: (...a: unknown[]) => playCyberSound(...a),
}));

import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { useExamRabbitHole } from '../../hooks/useExamRabbitHole';
import { RABBIT_HOLE_THRESHOLDS } from '../../utils/rabbitHoleConfig';

const MIN = 60_000;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('exam rabbit-hole wiring', () => {
  let boxId: string;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    playCyberSound.mockClear();
    useToastStore.setState({ toasts: [] });
    useCtfStore.setState({ soundEnabled: true });
    useExamStore.getState().resetExam('OSCP');
    useExamStore.getState().startExam('OSCP');
    boxId = useExamStore.getState().boxes.find((b) => b.userPoints > 0 && b.rootPoints > 0)!.id;
    useExamStore.getState().setActiveBox(boxId);
  });
  afterEach(() => vi.useRealTimers());

  it('shares one threshold source', () => {
    expect(RABBIT_HOLE_THRESHOLDS.examMinutes).toBe(90);
    expect(RABBIT_HOLE_THRESHOLDS.checklistMinutes).toBe(30);
  });

  it('no warning at 89m, one warning + one sound at 91m', () => {
    const { result } = renderHook(() => useExamRabbitHole());
    advance(89 * MIN);
    expect(result.current.isRabbitHole).toBe(false);
    expect(playCyberSound).not.toHaveBeenCalled();
    advance(MIN + 2000);
    expect(result.current.isRabbitHole).toBe(true);
    expect(useToastStore.getState().toasts.filter((t) => t.type === 'warning')).toHaveLength(1);
    advance(5 * MIN);
    expect(playCyberSound).toHaveBeenCalledTimes(1);
    expect(playCyberSound).toHaveBeenCalledWith('alert');
  });

  it('respects the sound setting', () => {
    useCtfStore.setState({ soundEnabled: false });
    renderHook(() => useExamRabbitHole());
    advance(90 * MIN + 2000);
    expect(playCyberSound).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.length).toBeGreaterThan(0);
  });

  it('capturing a flag resets the clock', () => {
    const { result } = renderHook(() => useExamRabbitHole());
    advance(80 * MIN);
    act(() => { useExamStore.getState().togglePwn(boxId, 'user'); });
    advance(50 * MIN);
    expect(result.current.isRabbitHole).toBe(false);
    advance(41 * MIN);
    expect(result.current.isRabbitHole).toBe(true);
  });

  it('pause stops the clock', () => {
    const { result } = renderHook(() => useExamRabbitHole());
    advance(60 * MIN);
    act(() => { useExamStore.getState().pauseExam(); });
    advance(120 * MIN);
    act(() => { useExamStore.getState().resumeExam(); });
    advance(20 * MIN);
    expect(result.current.isRabbitHole).toBe(false);
    advance(11 * MIN);
    expect(result.current.isRabbitHole).toBe(true);
  });

  it('snooze suppresses for 30m then re-warns', () => {
    const { result } = renderHook(() => useExamRabbitHole());
    advance(91 * MIN);
    expect(playCyberSound).toHaveBeenCalledTimes(1);
    act(() => { useExamStore.getState().snoozeRabbitHole(); });
    advance(29 * MIN);
    expect(result.current.isRabbitHole).toBe(false);
    advance(2 * MIN);
    expect(result.current.isRabbitHole).toBe(true);
    expect(playCyberSound).toHaveBeenCalledTimes(2);
  });

  it('reset clears the active box', () => {
    useExamStore.getState().resetExam('OSCP');
    expect(useExamStore.getState().activeBoxId).toBeNull();
  });
});
