import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCtfStore } from '../store/useCtfStore';
import { playCyberSound } from '../utils/helpers';

export interface EngageOptions {
  /** Runs only when switching targets, right before navigating (e.g. close a modal). */
  beforeNavigate?: () => void;
  /** Sound played when switching targets. Defaults to 'timer'. */
  sound?: 'timer' | 'engage';
}

/**
 * Shared "engage target" behaviour.
 * - New target: set it, start the timer, play a sound, open /target/:id.
 * - Already the active target: change nothing except resuming a paused timer.
 */
export function useEngageTarget() {
  const navigate = useNavigate();

  return useCallback(
    (machineId: string, opts: EngageOptions = {}) => {
      const state = useCtfStore.getState();
      if (state.activeTargetId === machineId) {
        if (!state.isTimerRunning) state.startTimer();
        return;
      }
      state.setActiveTarget(machineId);
      state.startTimer();
      if (state.soundEnabled) playCyberSound(opts.sound ?? 'timer');
      opts.beforeNavigate?.();
      navigate(`/target/${machineId}`);
    },
    [navigate]
  );
}
