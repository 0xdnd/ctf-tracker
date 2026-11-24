import { Profiler } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { OperatorProfileModal } from '../../components/auth/OperatorProfileModal';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

afterEach(() => cleanup());

describe('OperatorProfileModal subscriptions', () => {
  it('does not re-render when the running timer ticks', () => {
    let commits = 0;
    render(
      <Profiler id="modal" onRender={() => { commits += 1; }}>
        <OperatorProfileModal />
      </Profiler>
    );
    const afterMount = commits;

    for (let seconds = 1; seconds <= 5; seconds++) {
      act(() => useCtfStore.setState({ activeTimerSeconds: seconds }));
    }

    expect(commits).toBe(afterMount);
  });
});
