import { beforeEach, describe, expect, it } from 'vitest';
import { GUIDE_META, TOUR_STEP_COUNT, WELCOME_STEP } from './guideMeta';
import { SECTION_GUIDES, TOUR_STEPS, guideSteps } from './content';
import { GUIDE_COUNT, GUIDE_ORDER, guideAvailability, suggestNextGuide } from './guideRegistry';
import { ONBOARDING_STORAGE_KEY, loadOnboarding, saveOnboarding } from './onboardingStorage';
import { useOnboardingStore } from './useOnboardingStore';
import { DAMP_LIMIT_PX, DISMISS_VELOCITY, dampen, shouldDismiss } from './useSheetDrag';
import { holeFor } from './spotlightGeometry';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';

const reset = () => {
  window.localStorage.clear();
  useOnboardingStore.setState({
    tourDone: false,
    dismissedHints: [],
    completedGuides: [],
    tipsOff: false,
    tourActive: false,
    stepIndex: 0,
    guide: null,
    finishedGuide: null,
    guideCenterOpen: false,
    launchPending: null,
    handsOn: null,
  });
  useCtfStore.setState({ activeTargetId: null });
  useExamStore.setState({ status: 'idle' });
};

describe('completedGuides persistence', () => {
  beforeEach(reset);

  it('old saved state loads with no completed guides and no migration', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ tourDone: true, dismissedHints: ['vault'], tipsOff: true }),
    );
    expect(loadOnboarding()).toEqual({ tourDone: true, dismissedHints: ['vault'], tipsOff: true });
    useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState()).toMatchObject({
      tourDone: true,
      dismissedHints: ['vault'],
      tipsOff: true,
      completedGuides: [],
    });
  });

  it('round-trips under the same key and is left out of storage while empty', () => {
    saveOnboarding({ tourDone: false, dismissedHints: [], tipsOff: false, completedGuides: [] });
    expect(JSON.parse(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? '{}')).toEqual({
      tourDone: false,
      dismissedHints: [],
      tipsOff: false,
    });
    saveOnboarding({ tourDone: false, dismissedHints: [], tipsOff: false, completedGuides: ['vault'] });
    expect(loadOnboarding().completedGuides).toEqual(['vault']);
  });

  it('keeps only strings when the saved list is damaged, and ignores a non-list', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ completedGuides: ['a', 3, null, 'b'] }));
    expect(loadOnboarding().completedGuides).toEqual(['a', 'b']);
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ completedGuides: 'nope' }));
    expect(loadOnboarding().completedGuides).toBeUndefined();
    useOnboardingStore.getState().hydrate();
    expect(useOnboardingStore.getState().completedGuides).toEqual([]);
  });

  it('survives a reload through hydrate, and Reset tips keeps it', () => {
    const s = useOnboardingStore.getState();
    s.startGuide('vault');
    s.completeGuide();
    useOnboardingStore.setState({ completedGuides: [], guide: null, finishedGuide: null });
    s.hydrate();
    expect(useOnboardingStore.getState().completedGuides).toEqual(['vault']);
    s.resetTips();
    expect(useOnboardingStore.getState().completedGuides).toEqual(['vault']);
    expect(loadOnboarding().completedGuides).toEqual(['vault']);
  });
});

describe('Close versus finish', () => {
  beforeEach(reset);

  it('closeGuide marks a guide seen but not finished', () => {
    const s = useOnboardingStore.getState();
    s.startGuide('vault');
    s.nextGuideStep(3);
    s.closeGuide();
    expect(useOnboardingStore.getState()).toMatchObject({
      guide: null,
      finishedGuide: null,
      dismissedHints: ['vault'],
      completedGuides: [],
    });
    expect(loadOnboarding().completedGuides).toBeUndefined();
  });

  it('completeGuide records it, ends the steps and suggests the next guide', () => {
    const s = useOnboardingStore.getState();
    s.startGuide('methodology');
    s.completeGuide();
    expect(useOnboardingStore.getState()).toMatchObject({
      guide: null,
      dismissedHints: ['methodology'],
      completedGuides: ['methodology'],
      finishedGuide: { id: 'methodology', nextId: 'reverse-shells' },
    });
    expect(loadOnboarding().completedGuides).toEqual(['methodology']);
  });

  it('Next on the last step finishes rather than closes', () => {
    const s = useOnboardingStore.getState();
    s.startGuide('vault');
    s.nextGuideStep(1);
    expect(useOnboardingStore.getState().completedGuides).toEqual(['vault']);
  });

  it('finishing twice counts once, and closing the finish moment clears it', () => {
    const s = useOnboardingStore.getState();
    s.startGuide('vault');
    s.completeGuide();
    s.startGuide('vault');
    s.completeGuide();
    expect(useOnboardingStore.getState().completedGuides).toEqual(['vault']);
    s.closeGuide();
    expect(useOnboardingStore.getState().finishedGuide).toBeNull();
  });
});

describe('guide registry', () => {
  beforeEach(reset);

  it('lists all 22 guides exactly once, and every guide has metadata', () => {
    expect(GUIDE_COUNT).toBe(22);
    expect(new Set(GUIDE_ORDER).size).toBe(22);
    expect([...GUIDE_ORDER].sort()).toEqual(Object.keys(GUIDE_META).sort());
  });

  it('keeps the eager and lazy halves of the copy in step', () => {
    expect(TOUR_STEP_COUNT).toBe(TOUR_STEPS.length);
    expect(TOUR_STEPS[0]).toBe(WELCOME_STEP);
    for (const id of GUIDE_ORDER) expect(SECTION_GUIDES[id].steps, id).toBe(guideSteps(id));
  });

  it('gives every guide a real list of steps, so none can start with nothing to show', () => {
    for (const id of GUIDE_ORDER) expect(guideSteps(id).length, id).toBeGreaterThanOrEqual(2);
  });

  it('the exam room needs a running exam, and the exam setup guide steps aside for one', () => {
    expect(guideAvailability('exam-room').available).toBe(false);
    expect(guideAvailability('exam').available).toBe(true);
    useExamStore.setState({ status: 'paused' });
    expect(guideAvailability('exam-room').available).toBe(true);
    expect(guideAvailability('exam').available).toBe(false);
  });

  it('target guides need an active target', () => {
    for (const id of ['machine', 'focus', 'machine-quick']) {
      expect(guideAvailability(id).available, id).toBe(false);
    }
    useCtfStore.setState({ activeTargetId: 'box' });
    for (const id of ['machine', 'focus', 'machine-quick']) {
      expect(guideAvailability(id).available, id).toBe(true);
    }
  });

  it('suggests the next unfinished guide that can run, and nothing once all are done', () => {
    expect(suggestNextGuide('analytics', [])).toBe('exam');
    // exam-room and the three target guides cannot run, so they are skipped.
    expect(suggestNextGuide('exam', [])).toBe('graph');
    expect(suggestNextGuide('settings', ['methodology'])).toBe('reverse-shells');
    expect(suggestNextGuide('vault', GUIDE_ORDER)).toBeNull();
  });
});

describe('sheet physics', () => {
  it('damping gives way less the further you pull, and never reaches the limit', () => {
    const near = dampen(-20);
    const far = dampen(-200);
    expect(near).toBeLessThan(0);
    expect(Math.abs(far)).toBeGreaterThan(Math.abs(near));
    expect(Math.abs(far) - Math.abs(near)).toBeLessThan(180);
    expect(Math.abs(dampen(-100000))).toBeLessThan(DAMP_LIMIT_PX);
  });

  it('a fast flick dismisses from a short distance, a slow drag needs distance', () => {
    expect(shouldDismiss(20, DISMISS_VELOCITY + 0.1, 300)).toBe(true);
    expect(shouldDismiss(20, 0.05, 300)).toBe(false);
    expect(shouldDismiss(110, 0.05, 300)).toBe(true);
  });

  it('moving the wrong way never dismisses', () => {
    expect(shouldDismiss(-50, 5, 300)).toBe(false);
    expect(shouldDismiss(0, 5, 300)).toBe(false);
  });
});

describe('holeFor', () => {
  it('pads the target and stops at the sheet edge', () => {
    const bounds = { top: 0, left: 2, right: 373, bottom: 560 };
    expect(holeFor({ top: 100, left: 20, width: 100, height: 40 }, 4, bounds)).toEqual({ top: 96, left: 16, width: 108, height: 48 });
    const tall = holeFor({ top: 100, left: 20, width: 100, height: 600 }, 4, bounds);
    expect(tall.top + tall.height).toBe(560);
    const wide = holeFor({ top: 10, left: -4, width: 400, height: 40 }, 4, bounds);
    expect(wide.left).toBe(2);
    expect(wide.left + wide.width).toBe(373);
  });
});
