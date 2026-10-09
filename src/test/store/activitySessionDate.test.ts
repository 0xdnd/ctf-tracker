import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';

describe('activity session date key', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it.each([
    ['Asia/Riyadh', '2026-03-02'],
    ['America/New_York', '2026-03-01'],
  ])('writes the local calendar date for a root session in %s', (tz, expected) => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T22:30:00Z'));
    useCtfStore.setState({
      machines: [{ id: 'm1', name: 'Box', status: 'recon', timeSpentSeconds: 60 }] as never,
      activitySessions: [],
      activeTargetId: null,
      activeTimerSeconds: 0,
    });
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    const sessions = useCtfStore.getState().activitySessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe(expected);
  });
});
