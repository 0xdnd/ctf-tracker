import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';
import { isPhoneWidth } from './guideMotion';
import { samePath, type GuideEntry, type GuideOpenContext } from './guideRegistry';

export interface GuideNavigator {
  navigate: (path: string) => void;
  pathname: () => string;
}

/** Stores cannot reach the router, so the onboarding layer lends its navigate here while mounted. */
let guideNavigator: GuideNavigator | null = null;

export function registerGuideNavigator(next: GuideNavigator): () => void {
  guideNavigator = next;
  return () => {
    if (guideNavigator === next) guideNavigator = null;
  };
}

const POLL_MS = 40;
/** Modals animate out before they unmount. Past this, go on regardless. */
const SURFACE_EXIT_MS = 700;
/** A route chunk on a slow connection. Past this, the runner shows a centered card instead. */
const ANCHOR_WAIT_MS = 4000;
/** Lets the modal that owns the anchor run its effects, so its focus trap sits below the guide's. */
const SETTLE_MS = 34;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function waitUntil(test: () => boolean, timeoutMs: number, stillCurrent: () => boolean): Promise<void> {
  const startedAt = performance.now();
  while (stillCurrent() && !test() && performance.now() - startedAt < timeoutMs) {
    await delay(POLL_MS);
  }
}

/** Closes whatever could sit on top of the guide. Each of these owns a focus trap or a tap shield. */
function closeHostSurfaces(keepNotes: boolean): void {
  const ctf = useCtfStore.getState();
  ctf.setSettingsModalOpen(false);
  ctf.setShortcutsModalOpen(false);
  ctf.setCommandPaletteOpen(false);
  ctf.setBackupModalOpen(false);
  ctf.setNewMachineModalOpen(false);
  ctf.setNotesImportModalOpen(false);
  ctf.setRevShellModalOpen(false);
  ctf.setSnippetsDrawerOpen(false);
  ctf.setReconAutomationModalOpen(false);
  ctf.setReportMachineId(null);
  ctf.setOperatorModalOpen(false);
  ctf.setLicenseModalOpen(false);
  ctf.setFlexCardModalOpen(false);
  ctf.setMobileMenuOpen(false);
  ctf.setSelectedMachineId(null);
  useAuthStore.getState().setOperatorProfileModalOpen(false);
  useExamStore.getState().setQuickDrawerOpen(false);
  // On a phone the notes panel takes the whole screen; on desktop it sits beside the page and can stay.
  if (isPhoneWidth() && !keepNotes) useNotesWorkspaceStore.getState().setIsOpen(false);
}

const foreignDialogOpen = () =>
  document.querySelector('[role="dialog"][aria-modal="true"]:not([data-guide-surface])') !== null;

export const anchorSelector = (anchor: string) => `[data-tour="${anchor}"]`;

/**
 * Gets the page ready for a guide: closes what is open, navigates or opens the host, and waits for the
 * first anchor. AnimatePresence mode="wait" keeps the old page mounted through its exit, and some anchors
 * exist on two routes, so an element that was already there before navigating does not count.
 */
export async function prepareGuidePage(
  entry: GuideEntry,
  firstAnchors: string[],
  ctx: GuideOpenContext,
  stillCurrent: () => boolean,
): Promise<void> {
  closeHostSurfaces(entry.id === 'notes');
  await waitUntil(() => !foreignDialogOpen(), SURFACE_EXIT_MS, stillCurrent);
  if (!stillCurrent()) return;

  const selector = firstAnchors.length > 0 ? firstAnchors.map(anchorSelector).join(', ') : entry.ready;
  const route = entry.route?.() ?? null;
  const willNavigate = Boolean(route && guideNavigator && !samePath(guideNavigator.pathname(), route));
  const stale = new Set<Element>(willNavigate && selector ? Array.from(document.querySelectorAll(selector)) : []);

  if (willNavigate && route) guideNavigator?.navigate(route);
  entry.open?.(ctx);

  if (selector) {
    await waitUntil(
      () => Array.from(document.querySelectorAll(selector)).some((el) => el.isConnected && !stale.has(el)),
      ANCHOR_WAIT_MS,
      stillCurrent,
    );
  }
  await delay(SETTLE_MS);
}
