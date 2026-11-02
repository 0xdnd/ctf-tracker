export const ONBOARDING_STORAGE_KEY = 'zerobox_onboarding_v1';

export interface OnboardingPersisted {
  tourDone: boolean;
  dismissedHints: string[];
  tipsOff: boolean;
  /** Guides run to the end. Absent until the first one is finished, so old saved state stays valid. */
  completedGuides?: string[];
}

export const defaultOnboarding = (): OnboardingPersisted => ({
  tourDone: false,
  dismissedHints: [],
  tipsOff: false,
});

const onlyStrings = (value: unknown[]): string[] => value.filter((h): h is string => typeof h === 'string');

/** Reads the saved state. Missing, corrupt or blocked storage yields defaults. */
export function loadOnboarding(): OnboardingPersisted {
  const fallback = defaultOnboarding();
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    const p = parsed as Record<string, unknown>;
    return {
      tourDone: p.tourDone === true,
      dismissedHints: Array.isArray(p.dismissedHints) ? onlyStrings(p.dismissedHints) : [],
      tipsOff: p.tipsOff === true,
      ...(Array.isArray(p.completedGuides) ? { completedGuides: onlyStrings(p.completedGuides) } : {}),
    };
  } catch {
    return fallback;
  }
}

/** Writes the saved state. Failures are ignored; the guide just starts over next visit. */
export function saveOnboarding(state: OnboardingPersisted): void {
  try {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        tourDone: state.tourDone,
        dismissedHints: state.dismissedHints,
        tipsOff: state.tipsOff,
        ...(state.completedGuides?.length ? { completedGuides: state.completedGuides } : {}),
      }),
    );
  } catch {
    /* storage blocked or full */
  }
}
