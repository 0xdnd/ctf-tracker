import React, { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useNotesWorkspaceStore } from '../store/useNotesWorkspaceStore';
import { guideIdForPath } from './guideMeta';
import { guideTipAvailability } from './guideRegistry';
import { registerGuideNavigator } from './guideLaunch';
import { CARD_SHADOW, CLOSE_MS, DIM, cardSurface } from './guideMotion';
import { WelcomeCard } from './WelcomeCard';
import { PageHint } from './PageHint';
import { useAnyModalOpen } from './useAnyModalOpen';
import { useOnboardingStore } from './useOnboardingStore';

// The runner, Guide Center and all the guide steps only load when one of them is actually used.
const TourRunner = lazy(() => import('./TourRunner'));
const GuideCenter = lazy(() => import('./GuideCenter'));

interface RunnerBoundaryProps {
  mode: 'tour' | 'guide' | 'center';
  children: ReactNode;
}

/**
 * A failed lazy chunk (stale deploy, offline) or a runner crash must not take the app down or leave
 * tourActive / guide set, which would block every hotkey. Renders nothing and ends the tour or guide.
 */
class RunnerErrorBoundary extends Component<RunnerBoundaryProps, { hasError: boolean }> {
  public state = { hasError: false };

  public static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.error('ZeroBox onboarding runner failed:', error);
    const store = useOnboardingStore.getState();
    if (this.props.mode === 'tour') store.finishTour();
    else if (this.props.mode === 'center') store.closeGuideCenter();
    else store.closeGuide();
    store.setHandsOn(null);
  }

  public render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Shown while the runner chunk loads, so the welcome screen never waits on the network. */
const WelcomeFallback: React.FC = () => {
  const next = useOnboardingStore((st) => st.next);
  const finishTour = useOnboardingStore((st) => st.finishTour);
  return (
    <div className="fixed inset-0 z-critical" data-testid="tour-overlay">
      <div className="absolute inset-0 bg-surface-inverse/80" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          data-testid="tour-welcome-fallback"
          style={{ boxShadow: CARD_SHADOW }}
          className={`max-h-full w-[28rem] max-w-full overflow-y-auto p-5 md:p-7 ${cardSurface}`}
        >
          <WelcomeCard onStart={() => next()} onSkip={finishTour} />
        </div>
      </div>
    </div>
  );
};

/** Keeps something mounted for a moment after it stops being active, so it can animate away. */
function useLingering<T>(live: T | null): { value: T | null; closing: boolean } {
  const [lingering, setLingering] = useState<T | null>(live);
  useEffect(() => {
    if (live !== null) {
      setLingering(live);
      return;
    }
    const timer = window.setTimeout(() => setLingering(null), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [live]);
  return { value: live ?? lingering, closing: live === null && lingering !== null };
}

export const OnboardingLayer: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tourActive = useOnboardingStore((s) => s.tourActive);
  const tipsOff = useOnboardingStore((s) => s.tipsOff);
  const dismissed = useOnboardingStore((s) => s.dismissedHints);
  const guide = useOnboardingStore((s) => s.guide);
  const finishedGuide = useOnboardingStore((s) => s.finishedGuide);
  const centerOpen = useOnboardingStore((s) => s.guideCenterOpen);
  const launchPending = useOnboardingStore((s) => s.launchPending);
  const handsOn = useOnboardingStore((s) => s.handsOn);
  const modalOpen = useAnyModalOpen();
  const backupOpen = useCtfStore((st) => st.backupModalOpen);
  const backupTab = useOnboardingStore((st) => st.backupTab);
  const paletteOpen = useCtfStore((st) => st.commandPaletteOpen);
  const newMachineOpen = useCtfStore((st) => st.newMachineModalOpen);
  const notesImportOpen = useCtfStore((st) => st.notesImportModalOpen);
  const settingsOpen = useCtfStore((st) => st.settingsModalOpen);
  const quickMachineOpen = useCtfStore((st) => Boolean(st.selectedMachineId));
  const revShellOpen = useCtfStore((st) => st.revShellModalOpen);
  const snippetsOpen = useCtfStore((st) => st.snippetsDrawerOpen);
  const viewMode = useCtfStore((st) => st.viewMode);
  const notesOpen = useNotesWorkspaceStore((st) => st.isOpen);
  const examStatus = useExamStore((st) => st.status);
  const stepIndex = useOnboardingStore((st) => st.stepIndex);
  const examLive = examStatus === 'running' || examStatus === 'paused';
  const routeGuideId = guideIdForPath(pathname, examLive);
  // Subscribed so the route's tip appears or goes away on its own, for example when the catalog finishes loading.
  const routeTipOk = useCtfStore(() => (routeGuideId ? guideTipAvailability(routeGuideId, pathname).available : false));

  // launchGuide lives in the store, which has no router of its own.
  const routerRef = useRef({ navigate, pathname });
  routerRef.current = { navigate, pathname };
  useEffect(
    () =>
      registerGuideNavigator({
        navigate: (path) => routerRef.current.navigate(path),
        pathname: () => routerRef.current.pathname,
      }),
    [],
  );

  // A launch on its way to its page can be called off.
  useEffect(() => {
    if (!launchPending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        useOnboardingStore.getState().cancelLaunch();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [launchPending]);

  // A tour started from a modal (Settings, shortcuts) waits for that modal to close, then stays up.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!tourActive) setArmed(false);
    else if (!modalOpen) setArmed(true);
  }, [tourActive, modalOpen]);

  // Which section guide is waiting, in priority order. Intros owned by a modal show over that modal;
  // the notes panel, graph view and route guides wait for a free screen, and the next one appears once
  // one is dismissed.
  const ordered: string[] = [];
  if (backupOpen) ordered.push(backupTab === 'bulk_pwn' ? 'bulk-import' : 'backup');
  if (paletteOpen) ordered.push('palette');
  if (newMachineOpen) ordered.push('new-machine');
  if (notesImportOpen) ordered.push('notes-import');
  if (settingsOpen) ordered.push('settings');
  if (quickMachineOpen) ordered.push('machine-quick');
  if (revShellOpen) ordered.push('revshell');
  if (snippetsOpen) ordered.push('snippets-drawer');
  if (!modalOpen) {
    if (notesOpen) ordered.push('notes');
    if (viewMode === 'graph' && /^\/tracker\/?$/.test(pathname)) ordered.push('graph');
    if (routeGuideId) ordered.push(routeGuideId);
  }
  // A tip never offers a guide that cannot run here (a missing machine, an exam past its setup screen).
  const tipCanRun = (id: string) => (id === routeGuideId ? routeTipOk : guideTipAvailability(id, pathname).available);
  const candidate = ordered.find((id) => !dismissed.includes(id) && tipCanRun(id)) ?? null;

  const guideSurfaceUp = guide !== null || finishedGuide !== null || centerOpen || launchPending !== null;

  const free = !tipsOff && !tourActive && !guideSurfaceUp;
  const showCard = free && candidate !== null;
  const showTour = tourActive && armed;

  // Pages and modals listen for keys on their own: under a guide, the command palette would run its selected
  // result on Enter. Keys stop here, in the window's capture phase, but only for a surface actually on screen.
  // Focus traps listen at this same level, so Tab and Escape still reach them, and a focused button still gets
  // its click. A hands-on step wants the keys.
  const blockPageKeys = (showTour || guideSurfaceUp) && handsOn === null;
  useEffect(() => {
    if (!blockPageKeys) return;
    const stop = (e: KeyboardEvent) => e.stopPropagation();
    window.addEventListener('keydown', stop, true);
    return () => window.removeEventListener('keydown', stop, true);
  }, [blockPageKeys]);

  const setHintShowing = useOnboardingStore((st) => st.setHintShowing);
  // Other cards (the backup reminder) wait for this, whichever onboarding surface is up.
  const holdOtherCards = showCard || centerOpen || launchPending !== null || finishedGuide !== null;
  useEffect(() => {
    setHintShowing(holdOtherCards);
    return () => setHintShowing(false);
  }, [holdOtherCards, setHintShowing]);
  const showGuide = !tourActive && (guide !== null || finishedGuide !== null);

  const runner = useLingering<'tour' | 'guide'>(showTour ? 'tour' : showGuide ? 'guide' : null);
  const center = useLingering<true>(centerOpen ? true : null);

  // A runner that lands from a launch inherits the shield's dim instead of fading its own in.
  const landedFromLaunch = useRef(false);
  if (launchPending) landedFromLaunch.current = true;
  else if (!runner.value) landedFromLaunch.current = false;

  return (
    <>
      {runner.value && (
        <RunnerErrorBoundary key={runner.value} mode={runner.value}>
          <Suspense
            fallback={
              showTour && stepIndex === 0 ? (
                <WelcomeFallback />
              ) : landedFromLaunch.current ? (
                <div aria-hidden="true" className="fixed inset-0 z-critical" style={{ background: DIM }} />
              ) : null
            }
          >
            <TourRunner
              mode={runner.value}
              closing={runner.closing}
              handoff={launchPending !== null}
              landed={landedFromLaunch.current}
            />
          </Suspense>
        </RunnerErrorBoundary>
      )}
      {center.value && (
        <RunnerErrorBoundary key="center" mode="center">
          <Suspense fallback={null}>
            <GuideCenter closing={center.closing} handoff={launchPending !== null} />
          </Suspense>
        </RunnerErrorBoundary>
      )}
      {launchPending && (
        // Holds the dim and blocks taps while the page changes underneath, so nothing flashes. A launch
        // always starts from a dimmed screen, so this takes over at full strength with no fade.
        <div
          aria-hidden="true"
          data-testid="guide-launch-shield"
          className="fixed inset-0 z-critical"
          style={{ background: DIM }}
        />
      )}
      {showCard && candidate && <PageHint key={candidate} guideId={candidate} pathname={pathname} />}
    </>
  );
};
