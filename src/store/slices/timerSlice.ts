import type { StateCreator } from 'zustand';
import {
  withTimeSpent,
  TIMER_CHECKPOINT_SECONDS,
  foldActiveTimer,
  timerSecondsFor,
} from '../ctfMachineHelpers';
import { flushPendingProfileSave } from '../ctfStore';
import { CtfStoreState, CtfBootData } from '../ctfStoreTypes';

/** Workspace store slice: active target and the running timer. */

export interface TimerSliceState {
  activeTargetId: string | null;
  // Timer State
  isTimerRunning: boolean;
  activeTimerSeconds: number;
  timerLastTick: number | null;
  // Active Target & Timer Actions
  setActiveTarget: (id: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (machineId?: string) => void;
  tickTimer: () => void;
}

export const createTimerSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], TimerSliceState> => (set) => ({
  activeTargetId: boot.initialProfileData?.activeTargetId || null,

  isTimerRunning: false,

  activeTimerSeconds: 0,

  timerLastTick: null,

  setActiveTarget: (id) => {
    set((state) => {
      // Flush current timer to active target before switching
      let updatedMachines = state.machines;
      if (state.activeTargetId) {
        updatedMachines = foldActiveTimer(state);
      }

      if (!id) {
        return {
          machines: updatedMachines,
          activeTargetId: null,
          isTimerRunning: false,
          activeTimerSeconds: 0,
          unexportedChangesCount: (state.unexportedChangesCount || 0) + (updatedMachines !== state.machines ? 1 : 0),
        };
      }

      const m = updatedMachines.find((x) => x.id === id);
      const isPlaceholderIp = Boolean(m && !m.isActive && (!m.ip || m.ip.toLowerCase().includes('x') || m.ip === '10.10.10.X'));
      return {
        machines: updatedMachines,
        activeTargetId: id,
        activeTimerSeconds: m?.timeSpentSeconds || 0,
        assignIpMachineId: isPlaceholderIp ? id : null,
        globalVars: {
          ...state.globalVars,
          targetIp: m?.ip && !m.isActive && !m.ip.toLowerCase().includes('x') && m.ip !== '10.10.10.X' ? m.ip : state.globalVars.targetIp,
        },
        // Counts only a real data change (the timer fold), not a bare target switch.
        unexportedChangesCount: (state.unexportedChangesCount || 0) + (updatedMachines !== state.machines ? 1 : 0),
      };
    });
    flushPendingProfileSave();
  },

  startTimer: () => set({ isTimerRunning: true, timerLastTick: Date.now() }),

  pauseTimer: () => {
    set((state) => {
      if (!state.activeTargetId) return { isTimerRunning: false, timerLastTick: null };
      const now = Date.now();
      const extra = state.timerLastTick ? Math.round((now - state.timerLastTick) / 1000) : 0;
      // Never below the saved time (another tab or a sync may have saved more).
      const finalSeconds = Math.max(
        state.activeTimerSeconds + (extra > 0 ? extra : 0),
        timerSecondsFor(state.machines, state.activeTargetId)
      );
      return {
        machines: foldActiveTimer(state, finalSeconds),
        activeTimerSeconds: finalSeconds,
        isTimerRunning: false,
        timerLastTick: null,
      };
    });
    // Stopping is a save point. Pausing a running timer was already written by the store subscription
    // (running -> stopped); this only covers whatever is still pending, so a pause writes exactly once.
    flushPendingProfileSave();
  },

  resetTimer: (machineId) => {
    set((state) => {
      const targetId = machineId || state.activeTargetId;
      if (!targetId) return { isTimerRunning: false, activeTimerSeconds: 0, timerLastTick: null };
      const updated = state.machines.map((m) =>
        m.id === targetId ? withTimeSpent(m, 0) : m
      );
      return {
        machines: updated,
        activeTimerSeconds: targetId === state.activeTargetId ? 0 : state.activeTimerSeconds,
        isTimerRunning: false,
        timerLastTick: null,
      };
    });
    flushPendingProfileSave();
  },

  tickTimer: () => {
    let checkpointed = false;
    set((state) => {
      if (!state.isTimerRunning || !state.activeTargetId) return {};
      const now = Date.now();
      const last = state.timerLastTick || now;
      const deltaSeconds = Math.max(1, Math.round((now - last) / 1000));
      const seconds = state.activeTimerSeconds + deltaSeconds;
      // Checkpoint: once the shown time is a minute ahead of the saved time, fold it into the machine so a
      // crash or killed tab loses at most TIMER_CHECKPOINT_SECONDS. Plain ticks never touch persisted state.
      const saved = timerSecondsFor(state.machines, state.activeTargetId);
      if (seconds - saved >= TIMER_CHECKPOINT_SECONDS) {
        checkpointed = true;
        return {
          activeTimerSeconds: seconds,
          timerLastTick: now,
          machines: foldActiveTimer(state, seconds),
        };
      }
      return {
        activeTimerSeconds: seconds,
        timerLastTick: now,
      };
    });
    if (checkpointed) flushPendingProfileSave();
  },
});
