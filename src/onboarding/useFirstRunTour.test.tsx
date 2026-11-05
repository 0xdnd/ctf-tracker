import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { FIRST_RUN_KEY, useFirstRunTour } from './useFirstRunTour';
import { useOnboardingStore } from './useOnboardingStore';

describe('useFirstRunTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingStore.setState({ tourDone: false, tourActive: false, stepIndex: 0, guide: null });
  });

  it('starts the tour and sets the key on a first visit, once under StrictMode', () => {
    renderHook(() => useFirstRunTour(), { wrapper: StrictMode });
    expect(useOnboardingStore.getState().tourActive).toBe(true);
    expect(useOnboardingStore.getState().tourKind).toBe('first-run');
    expect(useOnboardingStore.getState().tourStepIds).toHaveLength(5);
    expect(localStorage.getItem(FIRST_RUN_KEY)).toBe('true');
  });

  it('does nothing when the key already exists', () => {
    localStorage.setItem(FIRST_RUN_KEY, 'true');
    renderHook(() => useFirstRunTour());
    expect(useOnboardingStore.getState().tourActive).toBe(false);
  });

  it('sets the key but skips the tour when it was already completed', () => {
    useOnboardingStore.setState({ tourDone: true });
    renderHook(() => useFirstRunTour());
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(localStorage.getItem(FIRST_RUN_KEY)).toBe('true');
  });

  it('does nothing when disabled (popout)', () => {
    renderHook(() => useFirstRunTour(false));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(localStorage.getItem(FIRST_RUN_KEY)).toBeNull();
  });
});
