import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useEngageTarget } from '../../hooks/useEngageTarget';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

function makeMachine(id: string, ip = '10.10.10.3'): Machine {
  return {
    id, name: id, ip, os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'recon',
    tags: [], certifications: [], roomUrl: '', timeSpentSeconds: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as Machine;
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/tracker']}>{children}</MemoryRouter>
);

function setup() {
  return renderHook(() => ({ engage: useEngageTarget(), path: useLocation().pathname }), { wrapper });
}

describe('useEngageTarget', () => {
  beforeEach(() => {
    useCtfStore.setState({
      machines: [makeMachine('a'), makeMachine('b', '10.10.10.X')],
      activeTargetId: null, isTimerRunning: false, soundEnabled: false,
      unexportedChangesCount: 0, assignIpMachineId: null, selectedMachineId: null,
    });
  });

  it('first engage sets the target, starts the timer and navigates', () => {
    const { result } = setup();
    act(() => result.current.engage('a'));
    const st = useCtfStore.getState();
    expect(st.activeTargetId).toBe('a');
    expect(st.isTimerRunning).toBe(true);
    expect(result.current.path).toBe('/target/a');
  });

  it('runs beforeNavigate only when switching targets', () => {
    const { result } = setup();
    let calls = 0;
    act(() => result.current.engage('a', { beforeNavigate: () => { calls++; } }));
    act(() => result.current.engage('a', { beforeNavigate: () => { calls++; } }));
    expect(calls).toBe(1);
  });

  it('re-click on the active target with a running timer changes nothing', () => {
    const { result } = setup();
    act(() => result.current.engage('b'));
    act(() => { useCtfStore.setState({ assignIpMachineId: null }); });
    const before = useCtfStore.getState().unexportedChangesCount;
    act(() => { useCtfStore.setState({ activeTargetId: 'b' }); });
    // navigate away to prove no re-navigation
    const pathBefore = result.current.path;
    act(() => result.current.engage('b'));
    const st = useCtfStore.getState();
    expect(st.unexportedChangesCount).toBe(before);
    expect(st.assignIpMachineId).toBeNull();
    expect(st.isTimerRunning).toBe(true);
    expect(result.current.path).toBe(pathBefore);
  });

  it('re-click on the active target with a paused timer resumes it only', () => {
    const { result } = setup();
    act(() => result.current.engage('a'));
    act(() => useCtfStore.getState().pauseTimer());
    expect(useCtfStore.getState().isTimerRunning).toBe(false);
    const before = useCtfStore.getState().unexportedChangesCount;
    act(() => result.current.engage('a'));
    const st = useCtfStore.getState();
    expect(st.isTimerRunning).toBe(true);
    expect(st.unexportedChangesCount).toBe(before);
    expect(st.assignIpMachineId).toBeNull();
  });
});
