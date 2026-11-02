import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ONBOARDING_STORAGE_KEY,
  defaultOnboarding,
  loadOnboarding,
  saveOnboarding,
} from './onboardingStorage';

describe('onboardingStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadOnboarding()).toEqual(defaultOnboarding());
  });

  it('round-trips saved state under the versioned key', () => {
    saveOnboarding({ tourDone: true, dismissedHints: ['vault'], tipsOff: true });
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toContain('"tourDone":true');
    expect(loadOnboarding()).toEqual({ tourDone: true, dismissedHints: ['vault'], tipsOff: true });
  });

  it('returns defaults for corrupt JSON', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '{not json');
    expect(loadOnboarding()).toEqual(defaultOnboarding());
  });

  it('returns defaults for non-object payloads', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '[1,2]');
    expect(loadOnboarding()).toEqual(defaultOnboarding());
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '"x"');
    expect(loadOnboarding()).toEqual(defaultOnboarding());
  });

  it('coerces wrong field types to safe values', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ tourDone: 'yes', dismissedHints: ['a', 3, null, 'b'], tipsOff: 1 }),
    );
    expect(loadOnboarding()).toEqual({ tourDone: false, dismissedHints: ['a', 'b'], tipsOff: false });
  });

  it('does not throw when reading is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadOnboarding()).toEqual(defaultOnboarding());
  });

  it('does not throw when writing is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveOnboarding(defaultOnboarding())).not.toThrow();
  });
});
