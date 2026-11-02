import { beforeEach, describe, expect, it } from 'vitest';
import { ONBOARDING_STORAGE_KEY, loadOnboarding } from './onboardingStorage';
import { useOnboardingStore } from './useOnboardingStore';

const reset = () => {
  window.localStorage.clear();
  useOnboardingStore.setState({
    tourDone: false,
    dismissedHints: [],
    tipsOff: false,
    tourActive: false,
    stepIndex: 0,
  });
};

describe('useOnboardingStore', () => {
  beforeEach(reset);

  it('startTour activates the tour at step 0', () => {
    useOnboardingStore.setState({ stepIndex: 3 });
    useOnboardingStore.getState().startTour();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: true, stepIndex: 0 });
  });

  it('next advances and back never goes below 0', () => {
    const s = useOnboardingStore.getState();
    s.startTour();
    s.next(6);
    expect(useOnboardingStore.getState().stepIndex).toBe(1);
    s.back();
    s.back();
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
  });

  it('next on the last step finishes the tour and persists it', () => {
    const s = useOnboardingStore.getState();
    s.startTour();
    s.next(2);
    s.next(2);
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true, stepIndex: 0 });
    expect(loadOnboarding().tourDone).toBe(true);
  });

  it('skip ends the tour and marks it done', () => {
    const s = useOnboardingStore.getState();
    s.startTour();
    s.skip();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true });
    expect(loadOnboarding().tourDone).toBe(true);
  });

  it('dismissHint stores each id once and persists', () => {
    const s = useOnboardingStore.getState();
    s.dismissHint('vault');
    s.dismissHint('vault');
    expect(useOnboardingStore.getState().dismissedHints).toEqual(['vault']);
    expect(loadOnboarding().dismissedHints).toEqual(['vault']);
  });

  it('setTipsOff persists', () => {
    useOnboardingStore.getState().setTipsOff(true);
    expect(useOnboardingStore.getState().tipsOff).toBe(true);
    expect(loadOnboarding().tipsOff).toBe(true);
  });

  it('replayTour restarts at step 0 without clearing tourDone', () => {
    useOnboardingStore.setState({ tourDone: true, stepIndex: 4 });
    useOnboardingStore.getState().replayTour();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: true, stepIndex: 0, tourDone: true });
  });

  it('resetTips clears dismissed hints and tipsOff but keeps tourDone', () => {
    const s = useOnboardingStore.getState();
    s.finishTour();
    s.dismissHint('exam');
    s.setTipsOff(true);
    s.resetTips();
    expect(useOnboardingStore.getState()).toMatchObject({ dismissedHints: [], tipsOff: false, tourDone: true });
    expect(JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? '{}')).toEqual({
      tourDone: true,
      dismissedHints: [],
      tipsOff: false,
    });
  });

  it('hydrate reloads from storage', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ tourDone: true, dismissedHints: ['writeup'], tipsOff: false }),
    );
    useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState()).toMatchObject({ tourDone: true, dismissedHints: ['writeup'] });
  });
});
