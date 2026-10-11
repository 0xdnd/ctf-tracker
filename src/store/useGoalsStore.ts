import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_WEEKLY_ROOT_TARGET = 99;

interface GoalsState {
  /** Boxes to root per week, or null when no goal is set. */
  weeklyRootTarget: number | null;
  setWeeklyRootTarget: (target: number | null) => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      weeklyRootTarget: null,
      setWeeklyRootTarget: (target) => {
        if (target === null || !Number.isFinite(target) || target < 1) {
          set({ weeklyRootTarget: null });
          return;
        }
        set({ weeklyRootTarget: Math.min(MAX_WEEKLY_ROOT_TARGET, Math.floor(target)) });
      },
    }),
    { name: 'zerobox-goals-v1' },
  ),
);
