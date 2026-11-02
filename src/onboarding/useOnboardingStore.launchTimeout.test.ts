import { afterEach, describe, expect, it, vi } from 'vitest';

// A runner chunk that never arrives, as on a stalled connection.
vi.mock('./TourRunner', () => new Promise(() => {}));

import { LAUNCH_LOAD_TIMEOUT_MS, useOnboardingStore } from './useOnboardingStore';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('launchGuide with a stalled chunk', () => {
  it('gives up after the timeout so the launch shield clears and hotkeys are released', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const launch = useOnboardingStore.getState().launchGuide('settings');
    await vi.advanceTimersByTimeAsync(1000);
    expect(useOnboardingStore.getState().launchPending).toBe('settings');
    await vi.advanceTimersByTimeAsync(LAUNCH_LOAD_TIMEOUT_MS);
    await expect(launch).resolves.toBe(false);
    expect(useOnboardingStore.getState()).toMatchObject({ launchPending: null, guide: null });
    expect(LAUNCH_LOAD_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
});
