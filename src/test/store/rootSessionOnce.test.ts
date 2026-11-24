import { beforeEach, describe, expect, it } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';

const seed = (status: string) =>
  useCtfStore.setState({
    machines: [{ id: 'm1', name: 'Box', status, timeSpentSeconds: 60 }] as never,
    activitySessions: [],
    activeTargetId: null,
    activeTimerSeconds: 0,
  });

describe('root activity session is logged once per entry into the root stage', () => {
  beforeEach(() => seed('recon'));

  it('logs one session when a target first reaches root', () => {
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    expect(useCtfStore.getState().activitySessions).toHaveLength(1);
  });

  it('does not log another session for root -> completed or completed -> root', () => {
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    useCtfStore.getState().updateMachineStatus('m1', 'completed');
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    expect(useCtfStore.getState().activitySessions).toHaveLength(1);
  });

  it('logs again after the target leaves root and re-enters it', () => {
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    useCtfStore.getState().updateMachineStatus('m1', 'foothold');
    useCtfStore.getState().updateMachineStatus('m1', 'root');
    expect(useCtfStore.getState().activitySessions).toHaveLength(2);
  });
});
