import { useLayoutEffect } from 'react';
import { useOnboardingStore } from './useOnboardingStore';

export const FIRST_RUN_KEY = 'zerobox_onboarding_completed';

/**
 * First visit (no completion key): start the guided tour once and write the key. The key is written
 * synchronously, so a StrictMode double-run or a remount never starts it twice.
 */
export function useFirstRunTour(enabled = true): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(FIRST_RUN_KEY)) return;
      localStorage.setItem(FIRST_RUN_KEY, 'true');
    } catch {
      return;
    }
    const s = useOnboardingStore.getState();
    if (!s.tourDone) s.startTour();
  }, [enabled]);
}
