/**
 * The first-visit welcome card is also painted from the page's HTML (scripts/lib/welcome-static.cjs), so a new
 * visitor reads it before the app has loaded. React's own card replaces it the moment it is in the DOM.
 */
export type StaticWelcomeIntent = 'start' | 'skip' | 'import';

type IntentWindow = Window & { __zbWelcomeIntent?: string };

const CARD = '[data-zb-welcome]';

/**
 * Hides the HTML card once React's identical card is on screen, but keeps it in the DOM. Removing it first can
 * discard its largest-contentful-paint candidate (Chrome only reports a paint after the frame is presented, and a
 * busy main thread delays that), which would leave the page's LCP at the React card instead.
 */
export function hideStaticWelcome(): void {
  const el = document.querySelector<HTMLElement>(CARD);
  if (el) el.style.visibility = 'hidden';
}

/** Drops the HTML copy of the welcome card, if the page has one. */
export function removeStaticWelcome(): void {
  document.querySelector(CARD)?.remove();
}

/** The button the visitor pressed on the HTML card before the app was ready, once. */
export function takeStaticWelcomeIntent(): StaticWelcomeIntent | null {
  const w = window as IntentWindow;
  const intent = w.__zbWelcomeIntent;
  delete w.__zbWelcomeIntent;
  return intent === 'start' || intent === 'skip' || intent === 'import' ? intent : null;
}
