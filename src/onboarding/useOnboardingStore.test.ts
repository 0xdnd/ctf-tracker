import { beforeEach, describe, expect, it } from 'vitest';
import { ONBOARDING_STORAGE_KEY, loadOnboarding } from './onboardingStorage';
import { useOnboardingStore } from './useOnboardingStore';
import { FIRST_RUN_STEP_IDS, FULL_TOUR_STEP_IDS } from './guideMeta';
import { useCtfStore } from '../store/useCtfStore';
import type { Machine } from '../types';

const box = (id: string, status: Machine['status']): Machine => ({
  id, name: id, ip: '10.10.x.x', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status,
  tags: [], certifications: [], timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
});

const reset = () => {
  window.localStorage.clear();
  useOnboardingStore.setState({
    tourDone: false,
    dismissedHints: [],
    tipsOff: false,
    tourActive: false,
    stepIndex: 0,
    tourStepIds: [],
  });
  useCtfStore.setState({ machines: [box('htb-lame', 'backlog')] } as never);
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
    s.next();
    expect(useOnboardingStore.getState().stepIndex).toBe(1);
    s.back();
    s.back();
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
  });

  it('next on the last step finishes the tour and persists it', () => {
    const s = useOnboardingStore.getState();
    s.startTour('first-run');
    for (let i = 0; i < FIRST_RUN_STEP_IDS.length - 1; i += 1) s.next();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: true, stepIndex: FIRST_RUN_STEP_IDS.length - 1 });
    s.next();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, tourDone: true, stepIndex: 0, tourStepIds: [] });
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

  it('the full tour has 8 steps and the first run 5', () => {
    const s = useOnboardingStore.getState();
    s.startTour();
    expect(useOnboardingStore.getState()).toMatchObject({ tourKind: 'full', tourStepIds: [...FULL_TOUR_STEP_IDS] });
    expect(useOnboardingStore.getState().tourStepIds).toHaveLength(8);
    s.startTour('first-run');
    expect(useOnboardingStore.getState()).toMatchObject({ tourKind: 'first-run', tourStepIds: [...FIRST_RUN_STEP_IDS] });
    expect(useOnboardingStore.getState().tourStepIds).toHaveLength(5);
    s.replayTour();
    expect(useOnboardingStore.getState().tourStepIds).toHaveLength(8);
  });

  it('leaves the import step out when a machine is already solved', () => {
    useCtfStore.setState({ machines: [box('htb-lame', 'root')] } as never);
    useOnboardingStore.getState().startTour('first-run');
    expect(useOnboardingStore.getState().tourStepIds).toEqual(['welcome', 'sidebar', 'machine', 'final']);
    useOnboardingStore.getState().replayTour();
    expect(useOnboardingStore.getState().tourStepIds).not.toContain('import');
  });

  it('keeps the step list fixed while the tour runs, even after a box is solved', () => {
    const s = useOnboardingStore.getState();
    s.startTour('first-run');
    const importAt = FIRST_RUN_STEP_IDS.indexOf('import');
    useOnboardingStore.setState({ stepIndex: importAt });
    useCtfStore.setState({ machines: [box('htb-lame', 'completed')] } as never);
    s.next();
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: true, stepIndex: importAt + 1 });
    expect(useOnboardingStore.getState().tourStepIds).toEqual([...FIRST_RUN_STEP_IDS]);
    expect(useOnboardingStore.getState().tourStepIds[importAt + 1]).toBe('final');
  });

  it('advanceTourFrom only moves on from the named step', () => {
    const s = useOnboardingStore.getState();
    s.startTour('first-run');
    s.advanceTourFrom('import');
    expect(useOnboardingStore.getState().stepIndex).toBe(0);
    useOnboardingStore.setState({ stepIndex: FIRST_RUN_STEP_IDS.indexOf('import') });
    s.advanceTourFrom('import');
    expect(useOnboardingStore.getState().tourStepIds[useOnboardingStore.getState().stepIndex]).toBe('final');
    s.finishTour();
    s.advanceTourFrom('final');
    expect(useOnboardingStore.getState()).toMatchObject({ tourActive: false, stepIndex: 0 });
  });

  it('saves only the four onboarding fields', () => {
    const s = useOnboardingStore.getState();
    s.startTour('first-run');
    s.dismissHint('vault');
    useOnboardingStore.setState({ completedGuides: ['notes'] });
    s.finishTour();
    const saved = JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? '{}');
    expect(Object.keys(saved).sort()).toEqual(['completedGuides', 'dismissedHints', 'tipsOff', 'tourDone']);
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
