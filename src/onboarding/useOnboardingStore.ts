import { create } from 'zustand';
import { loadOnboarding, saveOnboarding } from './onboardingStorage';
import { guideAvailability, GUIDE_REGISTRY, suggestNextGuide } from './guideRegistry';
import { prepareGuidePage } from './guideLaunch';
import { isPhoneWidth } from './guideMotion';
import type { HandsOn } from './guideMeta';

export type BackupTab = 'backup' | 'bulk_pwn';

export interface ActiveGuide {
  id: string;
  stepIndex: number;
}

/** The moment after a guide's last step: its id and the guide to suggest next. */
export interface FinishedGuide {
  id: string;
  nextId: string | null;
}

interface OnboardingState {
  tourDone: boolean;
  /** Ids of section guides (and intro cards) the visitor has seen or dismissed. */
  dismissedHints: string[];
  /** Ids of section guides run to the end. Closing early does not count. */
  completedGuides: string[];
  tipsOff: boolean;
  tourActive: boolean;
  stepIndex: number;
  /** A running section mini-tour, or null. */
  guide: ActiveGuide | null;
  /** Set while the finish moment is on screen. */
  finishedGuide: FinishedGuide | null;
  /** Guide Center is open. */
  guideCenterOpen: boolean;
  /** The guide on its way to its page or panel, or null. */
  launchPending: string | null;
  /** Set by the runner while a hands-on step is showing; lets matching hotkeys through. */
  handsOn: HandsOn | null;
  /** Tab the Backup modal should open on, consumed when the modal mounts. */
  requestedBackupTab: BackupTab | null;
  /** Tab the open Backup modal is showing, so the right guide is offered. */
  backupTab: BackupTab | null;
  /** True while a section guide offer card is on screen (other cards wait). */
  hintShowing: boolean;

  startTour: () => void;
  next: (totalSteps: number) => void;
  back: () => void;
  skip: () => void;
  finishTour: () => void;
  dismissHint: (id: string) => void;
  setTipsOff: (off: boolean) => void;
  replayTour: () => void;
  resetTips: () => void;
  hydrate: () => void;
  startGuide: (id: string) => void;
  nextGuideStep: (totalSteps: number) => void;
  backGuideStep: () => void;
  /** Close, Escape and swipe: ends the guide and marks it seen, not finished. */
  closeGuide: () => void;
  /** The last step's button: records the guide as finished and shows the finish moment. */
  completeGuide: () => void;
  openGuideCenter: () => void;
  closeGuideCenter: () => void;
  /** Closes Guide Center, opens the guide's page or panel, waits for its first anchor, then starts it. */
  launchGuide: (id: string) => Promise<boolean>;
  cancelLaunch: () => void;
  setHandsOn: (mode: HandsOn | null) => void;
  requestBackupTab: (tab: BackupTab | null) => void;
  setBackupTab: (tab: BackupTab | null) => void;
  setHintShowing: (showing: boolean) => void;
}

const persist = (s: Pick<OnboardingState, 'tourDone' | 'dismissedHints' | 'tipsOff' | 'completedGuides'>) =>
  saveOnboarding({
    tourDone: s.tourDone,
    dismissedHints: s.dismissedHints,
    tipsOff: s.tipsOff,
    completedGuides: s.completedGuides,
  });

const loadState = () => {
  const saved = loadOnboarding();
  return { ...saved, completedGuides: saved.completedGuides ?? [] };
};

/** The newest launch wins; an older one finds it is no longer current and stops. */
let launchToken = 0;

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...loadState(),
  tourActive: false,
  stepIndex: 0,
  guide: null,
  finishedGuide: null,
  guideCenterOpen: false,
  launchPending: null,
  handsOn: null,
  requestedBackupTab: null,
  backupTab: null,
  hintShowing: false,

  startTour: () => set({ tourActive: true, stepIndex: 0, guide: null, finishedGuide: null, guideCenterOpen: false }),

  next: (totalSteps) => {
    const { stepIndex } = get();
    if (stepIndex + 1 >= totalSteps) get().finishTour();
    else set({ stepIndex: stepIndex + 1 });
  },

  back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

  skip: () => get().finishTour(),

  finishTour: () => {
    set({ tourActive: false, stepIndex: 0, tourDone: true, handsOn: null });
    persist(get());
  },

  dismissHint: (id) => {
    if (get().dismissedHints.includes(id)) return;
    set((s) => ({ dismissedHints: [...s.dismissedHints, id] }));
    persist(get());
  },

  setTipsOff: (off) => {
    set({ tipsOff: off });
    persist(get());
  },

  replayTour: () => set({ tourActive: true, stepIndex: 0, guide: null, finishedGuide: null, guideCenterOpen: false }),

  resetTips: () => {
    set({ dismissedHints: [], tipsOff: false, guide: null, finishedGuide: null });
    persist(get());
  },

  hydrate: () => set(loadState()),

  startGuide: (id) => set({ guide: { id, stepIndex: 0 }, finishedGuide: null }),

  nextGuideStep: (totalSteps) => {
    const g = get().guide;
    if (!g) return;
    if (g.stepIndex + 1 >= totalSteps) get().completeGuide();
    else set({ guide: { ...g, stepIndex: g.stepIndex + 1 } });
  },

  backGuideStep: () => {
    const g = get().guide;
    if (g) set({ guide: { ...g, stepIndex: Math.max(0, g.stepIndex - 1) } });
  },

  closeGuide: () => {
    const g = get().guide;
    set({ guide: null, handsOn: null, finishedGuide: null });
    if (g) get().dismissHint(g.id);
  },

  completeGuide: () => {
    const g = get().guide;
    if (!g) return;
    const { completedGuides, dismissedHints } = get();
    const completed = completedGuides.includes(g.id) ? completedGuides : [...completedGuides, g.id];
    set({
      guide: null,
      handsOn: null,
      completedGuides: completed,
      dismissedHints: dismissedHints.includes(g.id) ? dismissedHints : [...dismissedHints, g.id],
      finishedGuide: { id: g.id, nextId: suggestNextGuide(g.id, completed) },
    });
    persist(get());
  },

  openGuideCenter: () => set({ guideCenterOpen: true }),

  closeGuideCenter: () => set({ guideCenterOpen: false }),

  launchGuide: async (id) => {
    const entry = GUIDE_REGISTRY[id];
    if (!entry || !guideAvailability(id).available) return false;
    const token = ++launchToken;
    const stillCurrent = () => token === launchToken;
    set({ guideCenterOpen: false, launchPending: id, guide: null, finishedGuide: null, handsOn: null });
    try {
      const [{ guideSteps, resolveStep }] = await Promise.all([import('./content'), import('./TourRunner')]);
      const first = guideSteps(id)[0];
      const resolved = first ? resolveStep(first, isPhoneWidth()) : null;
      const firstAnchors = [resolved?.anchor, resolved?.altAnchor].filter((a): a is string => Boolean(a));
      await prepareGuidePage(entry, firstAnchors, { requestBackupTab: get().requestBackupTab }, stillCurrent);
    } catch (error) {
      // A chunk that will not load (stale deploy, offline) must not leave hotkeys blocked.
      console.error('ZeroBox could not start a guide:', error);
      if (stillCurrent()) set({ launchPending: null });
      return false;
    }
    if (!stillCurrent()) return false;
    // One update, so the launch shield and the runner's dim swap in the same frame.
    set({ launchPending: null, guide: { id, stepIndex: 0 }, finishedGuide: null });
    return true;
  },

  cancelLaunch: () => {
    launchToken += 1;
    set({ launchPending: null });
  },

  setHandsOn: (mode) => {
    if (get().handsOn !== mode) set({ handsOn: mode });
  },

  requestBackupTab: (tab) => set({ requestedBackupTab: tab }),

  setBackupTab: (tab) => {
    if (get().backupTab !== tab) set({ backupTab: tab });
  },

  setHintShowing: (showing) => {
    if (get().hintShowing !== showing) set({ hintShowing: showing });
  },
}));
