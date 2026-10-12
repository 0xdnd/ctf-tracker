import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isSchemaWriteGated } from '../utils/schemaWriteGate';

export const MAX_WEEKLY_ROOT_TARGET = 99;
export const GOALS_STORAGE_KEY = 'zerobox-goals-v1';

interface GoalsState {
  /** Boxes to root per week, or null when no goal is set. */
  weeklyRootTarget: number | null;
  setWeeklyRootTarget: (target: number | null) => void;
}

// Same bytes as the default localStorage persistence, but silent while the schema write gate is engaged
// (goals are part of the pre-update snapshot, so a restore elsewhere must not be overwritten).
const gatedLocalStorage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (!isSchemaWriteGated()) localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (!isSchemaWriteGated()) localStorage.removeItem(name);
  },
}));

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
    { name: GOALS_STORAGE_KEY, storage: gatedLocalStorage },
  ),
);
