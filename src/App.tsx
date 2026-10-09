import React, { useRef, useEffect, Suspense, lazy, useMemo } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { UnifiedHeader } from './components/layout/UnifiedHeader';
import { FloatingPayloadBar } from './components/common/FloatingPayloadBar';
import { SnippetsDrawer } from './components/layout/SnippetsDrawer';
import { RevShellModal } from './components/common/RevShellModal';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { ScrollProgressBar } from './components/common/ScrollProgressBar';
import { BackToTopButton } from './components/common/BackToTopButton';
import { ScrollProvider, useScrollActions } from './context/ScrollContext';
import { TrackerView } from './components/tracker/TrackerView';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { ViewSkeleton } from './components/common/Skeleton';
import { useTacticalHotkeys } from './hooks/useTacticalHotkeys';
import { ThemeProvider } from './hooks/useTheme';
import { useCtfStore, mergeMachinesWithCatalog, UiScale } from './store/useCtfStore';
import { useExamStore } from './store/examStore';
import { useAuthStore } from './store/useAuthStore';
import { EphemeralStorageBanner } from './components/common/EphemeralStorageBanner';
import { ExamQuickActionDrawer } from './components/exam/ExamQuickActionDrawer';
import { PersistentNotesWorkspace } from './components/workspace/PersistentNotesWorkspace';
import { ensurePersistence, bindExportGuard } from './utils/resilientStorage';
import { StartCleanModal } from './components/common/StartCleanModal';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { AlertTriangle, Database } from 'lucide-react';
import { isTauriTarget } from './utils/runtimeTarget';
import { useRouteMeta } from './hooks/useRouteMeta';

// Code-Split Overlay Modals (Zero initial bundle overhead)
const MachineDetailModal = lazy(() => import('./components/tracker/MachineDetailModal').then(m => ({ default: m.MachineDetailModal })));
const NewMachineModal = lazy(() => import('./components/tracker/NewMachineModal').then(m => ({ default: m.NewMachineModal })));
const PentestReportModal = lazy(() => import('./components/writeup/PentestReportModal').then(m => ({ default: m.PentestReportModal })));
const OperatorDossierModal = lazy(() => import('./components/common/OperatorDossierModal').then(m => ({ default: m.OperatorDossierModal })));
const OperatorProfileModal = lazy(() => import('./components/auth/OperatorProfileModal').then(m => ({ default: m.OperatorProfileModal })));
const LicenseModal = lazy(() => import('./components/common/LicenseModal').then(m => ({ default: m.LicenseModal })));
const NotesImportModal = lazy(() => import('./components/cheatsheet/NotesImportModal').then(m => ({ default: m.NotesImportModal })));
const OperatorFlexCardModal = lazy(() => import('./components/common/OperatorFlexCardModal').then(m => ({ default: m.OperatorFlexCardModal })));
const QuickAssignIpModal = lazy(() => import('./components/common/QuickAssignIpModal').then(m => ({ default: m.QuickAssignIpModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/common/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const BackupModal = lazy(() => import('./components/backup/BackupModal').then(m => ({ default: m.BackupModal })));
const ReconAutomationModal = lazy(() => import('./components/automation/ReconAutomationModal').then(m => ({ default: m.ReconAutomationModal })));
const SettingsModal = lazy(() => import('./components/common/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ZeroBoxShowcaseModal = lazy(() => import('./components/common/ZeroBoxShowcaseModal').then(m => ({ default: m.ZeroBoxShowcaseModal })));

// Code-Split Route Modules (Zero-overhead on initial tracker load)
const CheatsheetView = lazy(() => import('./components/cheatsheet/CheatsheetView').then(m => ({ default: m.CheatsheetView })));
const WriteupStudio = lazy(() => import('./components/writeup/WriteupStudio').then(m => ({ default: m.WriteupStudio })));
const AnalyticsView = lazy(() => import('./components/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const TargetDetailPage = lazy(() => import('./pages/TargetDetailPage').then(m => ({ default: m.TargetDetailPage })));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then(m => ({ default: m.MethodologyPage })));
const ExamSimulatorPage = lazy(() => import('./pages/ExamSimulatorPage').then(m => ({ default: m.ExamSimulatorPage })));
const EvidenceVaultPage = lazy(() => import('./pages/EvidenceVaultPage').then(m => ({ default: m.EvidenceVaultPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const CyberRouteLoader: React.FC = () => <ViewSkeleton />;

const TimerController: React.FC = () => {
  const isTimerRunning = useCtfStore((s) => s.isTimerRunning);
  const tickTimer = useCtfStore((s) => s.tickTimer);
  const isExamActive = useExamStore((s) => s.status === 'running' || s.activeBreak.isActive);
  const tickExam = useExamStore((s) => s.tick);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  useEffect(() => {
    if (!isExamActive) return;
    const interval = setInterval(() => {
      tickExam();
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamActive, tickExam]);

  return null;
};

const MainAppContent: React.FC = () => {
  const { setScrollElement } = useScrollActions();
  const location = useLocation();
  useRouteMeta();
  const isPopout = useMemo(() => new URLSearchParams(location.search).get('popout') === 'true', [location.search]);
  const setActiveTab = useCtfStore((s) => s.setActiveTab);
  const selectedMachineId = useCtfStore((s) => s.selectedMachineId);
  const backupModalOpen = useCtfStore((s) => s.backupModalOpen);
  const reconAutomationModalOpen = useCtfStore((s) => s.reconAutomationModalOpen);
  const assignIpMachineId = useCtfStore((s) => s.assignIpMachineId);
  const newMachineModalOpen = useCtfStore((s) => s.newMachineModalOpen);
  const reportMachineId = useCtfStore((s) => s.reportMachineId);
  const setReportMachineId = useCtfStore((s) => s.setReportMachineId);
  const operatorModalOpen = useCtfStore((s) => s.operatorModalOpen);
  const licenseModalOpen = useCtfStore((s) => s.licenseModalOpen);
  const notesImportModalOpen = useCtfStore((s) => s.notesImportModalOpen);
  const flexCardModalOpen = useCtfStore((s) => s.flexCardModalOpen);
  const shortcutsModalOpen = useCtfStore((s) => s.shortcutsModalOpen);
  const settingsModalOpen = useCtfStore((s) => s.settingsModalOpen);
  const showcaseModalOpen = useCtfStore((s) => s.showcaseModalOpen);
  const commandPaletteOpen = useCtfStore((s) => s.commandPaletteOpen);
  const operatorProfileModalOpen = useAuthStore((s) => s.operatorProfileModalOpen);
  const focusMode = useCtfStore((s) => s.focusMode);
  const setFocusMode = useCtfStore((s) => s.setFocusMode);
  const uiScale = useCtfStore((s) => s.uiScale || 'auto');
  const isHydrated = useCtfStore((s) => s.isHydrated);

  // First-run workspace setup detection
  const [showOnboarding, setShowOnboarding] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('zerobox_onboarding_completed');
  });

  // Storage quota / error notification banner
  const [storageAlert, setStorageAlert] = React.useState<{ kind: string; message: string } | null>(null);

  useEffect(() => {
    const handleStorageEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setStorageAlert(detail);
        setTimeout(() => setStorageAlert(null), 9000);
      }
    };
    window.addEventListener('zerobox:storage', handleStorageEvent);
    return () => window.removeEventListener('zerobox:storage', handleStorageEvent);
  }, []);

  // Tactical keyboard hotkeys engine
  useTacticalHotkeys();

  // Request durable persistent storage and bind beforeunload unexported guard
  useEffect(() => {
    ensurePersistence().catch(() => {});
  }, []);

  useEffect(() => {
    const unbind = bindExportGuard(() => useCtfStore.getState().unexportedChangesCount || 0);
    return () => unbind();
  }, []);

  // Escape key handler to easily exit Zen Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        const isAnyModalOpen = Boolean(
          selectedMachineId ||
          commandPaletteOpen ||
          newMachineModalOpen ||
          backupModalOpen ||
          reconAutomationModalOpen ||
          reportMachineId ||
          operatorModalOpen ||
          operatorProfileModalOpen ||
          licenseModalOpen ||
          notesImportModalOpen ||
          flexCardModalOpen ||
          shortcutsModalOpen ||
          settingsModalOpen ||
          showcaseModalOpen
        );
        if (!isAnyModalOpen) {
          setFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusMode,
    setFocusMode,
    selectedMachineId,
    commandPaletteOpen,
    newMachineModalOpen,
    backupModalOpen,
    reconAutomationModalOpen,
    reportMachineId,
    operatorModalOpen,
    operatorProfileModalOpen,
    licenseModalOpen,
    notesImportModalOpen,
    flexCardModalOpen,
    shortcutsModalOpen,
    settingsModalOpen,
  ]);

  // Handle global UI scale with Viewport-Aware Auto-Resolution Engine
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const zoomMap: Record<Exclude<UiScale, 'auto'>, string> = {
      tiny: '0.80',
      compact: '0.90',
      normal: '1.0',
      large: '1.10',
      huge: '1.22',
    };

    const getAutoZoom = (width: number): string => {
      if (width >= 1200) return '1.0';
      if (width >= 1024) return '0.90';
      if (width >= 768) return '0.85';
      return '1.0';
    };

    if (uiScale === 'auto') {
      let rafId: number | null = null;
      const applyAutoZoom = () => {
        const zoom = getAutoZoom(window.innerWidth);
        (document.documentElement.style as CSSStyleDeclaration & { zoom?: string }).zoom = zoom;
        document.documentElement.style.setProperty('--app-zoom', zoom);
      };

      applyAutoZoom();

      const handleResize = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          applyAutoZoom();
          rafId = null;
        });
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    } else {
      const zoomVal = zoomMap[uiScale] || '1.0';
      (document.documentElement.style as CSSStyleDeclaration & { zoom?: string }).zoom = zoomVal;
      document.documentElement.style.setProperty('--app-zoom', zoomVal);
    }
  }, [uiScale]);

  // Guarantee that all 45 completed HTB targets are populated in active state and profile,
  // and force brand to ZEROBOX if still set to legacy rootvector or specter
  useEffect(() => {
    const state = useCtfStore.getState();
    const current = state.machines;
    const merged = mergeMachinesWithCatalog(current, state.userSolvesReset);
    const updates: Partial<typeof state> = { machines: merged };
    if (state.appBrand !== 'zerobox') {
      updates.appBrand = 'zerobox';
    }
    useCtfStore.setState(updates);
    useCtfStore.getState().saveProfileData();
    // Auto-hydrate private field manual notes and wikilinks from local IndexedDB
    useCtfStore.getState().loadUserNotesFromDb();
    // Asynchronously hydrate full master catalog in background without blocking cold boot TTI
    useCtfStore.getState().loadCatalog();
  }, []);

  // Sync store activeTab with route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/methodology')) {
      setActiveTab('methodology');
    } else if (path.startsWith('/field-manual')) {
      setActiveTab('field-manual');
    } else if (path.startsWith('/cheatsheet') || path.startsWith('/notes') || path.startsWith('/cpts')) {
      setActiveTab('cheatsheet');
    } else if (path.startsWith('/writeup')) {
      setActiveTab('writeup');
    } else if (path.startsWith('/analytics')) {
      setActiveTab('analytics');
    } else if (path.startsWith('/exam')) {
      setActiveTab('exam');
    } else if (path.startsWith('/vault') || path.startsWith('/evidence') || path.startsWith('/loot')) {
      setActiveTab('vault');
    } else if (path.startsWith('/theme')) {
      setActiveTab('theme');
    } else {
      setActiveTab('tracker');
    }
  }, [location.pathname, setActiveTab]);

  // Close slide-over drawers when navigating between routes
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      useCtfStore.getState().setSnippetsDrawerOpen(false);
      useExamStore.getState().setQuickDrawerOpen(false);
    }
  }, [location.pathname]);

  if (!isHydrated) {
    return <CyberRouteLoader />;
  }

  return (
    <div 
      style={{
        height: 'calc(100vh / var(--app-zoom, 1))',
        maxHeight: 'calc(100vh / var(--app-zoom, 1))',
      }}
      className="w-full overflow-hidden bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-cyber-text flex flex-col font-sans selection:bg-cyan-500/25 selection:text-current dark:selection:bg-cyan-400/25 dark:selection:text-white relative"
    >
      {/* Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Back to Top */}
      <BackToTopButton />

      {/* Zen Focus Mode Recovery Banner */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3 py-1.5 bg-cyber-card text-cyber-text border border-cyber-cyan rounded-md shadow-sm text-xs font-mono"
          >
            <span className="flex items-center gap-1.5 text-cyber-cyan font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
              ZEN FOCUS MODE
            </span>
            <span className="text-cyber-muted text-[11px] hidden sm:inline">Press Esc or</span>
            <button
              onClick={() => setFocusMode(false)}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyber-cyan text-black hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
              title="Exit Zen Focus Mode"
            >
              ✕ Exit Zen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Quick Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Heavy Tactical Modals (Deferred Lazy Loading - Fetched strictly when triggered) */}
      <RouteErrorBoundary>
        <Suspense fallback={null}>
          <AnimatePresence>
            {backupModalOpen && <BackupModal key="backup-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {reconAutomationModalOpen && <ReconAutomationModal key="recon-automation-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {selectedMachineId && <MachineDetailModal key="machine-detail-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {assignIpMachineId && <QuickAssignIpModal key="quick-assign-ip-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {newMachineModalOpen && <NewMachineModal key="new-machine-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {reportMachineId && (
              <PentestReportModal
                key="pentest-report-modal"
                machineId={reportMachineId}
                isOpen={Boolean(reportMachineId)}
                onClose={() => setReportMachineId(null)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {operatorModalOpen && <OperatorDossierModal key="operator-dossier-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {operatorProfileModalOpen && <OperatorProfileModal key="operator-profile-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {licenseModalOpen && <LicenseModal key="license-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {notesImportModalOpen && <NotesImportModal key="notes-import-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {flexCardModalOpen && <OperatorFlexCardModal key="flex-card-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {shortcutsModalOpen && <KeyboardShortcutsModal key="shortcuts-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {settingsModalOpen && <SettingsModal key="settings-modal" />}
          </AnimatePresence>
          <AnimatePresence>
            {showcaseModalOpen && <ZeroBoxShowcaseModal key="showcase-modal" />}
          </AnimatePresence>
        </Suspense>
      </RouteErrorBoundary>

      {/* Background Timer Controller (Zero-Lag 1Hz Clock Isolation) */}
      <TimerController />

      {/* Slide-over Cheatsheet & Snippets Drawer (Alt+S) */}
      <SnippetsDrawer />

      {/* Slide-over Exam Mission Quick Action Drawer (Alt+E) */}
      <ExamQuickActionDrawer />

      {/* Rapid Reverse Shell Crafter Modal */}
      <RevShellModal />

      {/* Ephemeral Memory Fallback Storage Alert Banner */}
      <EphemeralStorageBanner />

      {/* First-Run Start Clean Workspace Setup Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <StartCleanModal
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      {/* Storage Quota Alert Banner with 1-Click Export Action */}
      <AnimatePresence>
        {storageAlert && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-slate-900 border border-amber-500/80 shadow-2xl text-xs font-mono max-w-md flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
              <span>STORAGE ALERT</span>
            </div>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              {storageAlert.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  useCtfStore.getState().exportWorkspace();
                  setStorageAlert(null);
                }}
                className="px-3 py-1 bg-cyber-emerald text-black font-bold rounded-lg text-xs hover:brightness-110 active:scale-[0.97] transition-all flex items-center gap-1.5 cursor-pointer shadow-glow-emerald"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Export Backup Now</span>
              </button>
              <button
                type="button"
                onClick={() => setStorageAlert(null)}
                className="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactical Top Header (Unified Single Bar Cockpit) */}
      {!focusMode && !isPopout && <UnifiedHeader />}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Responsive Collapsible Sidebar - Hidden in Focus Mode and Popout Mode */}
        {!focusMode && !isPopout && <Sidebar />}

        {/* Main Stage View */}
        <main
          ref={setScrollElement}
          className={`flex-1 overflow-y-auto min-h-0 relative bg-slate-50/70 dark:bg-cyber-bg transition-colors ${
            isPopout ? 'p-0 pb-0' : 'p-3 pb-24 sm:p-4 md:p-6 md:pb-12'
          } ${
            focusMode ? 'max-w-7xl mx-auto w-full' : ''
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              <RouteErrorBoundary resetKey={location.pathname}>
                <Suspense fallback={<CyberRouteLoader />}>
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Navigate to="/tracker/" replace />} />
                    <Route path="/tracker" element={<TrackerView />} />
                    <Route path="/target/:id" element={<TargetDetailPage />} />
                    <Route path="/target/:id/focus" element={<TargetDetailPage />} />
                    <Route path="/targets/:id" element={<TargetDetailPage />} />
                    <Route path="/targets/:id/focus" element={<TargetDetailPage />} />
                    <Route path="/methodology" element={<MethodologyPage />} />
                    <Route path="/cheatsheets" element={<CheatsheetView />} />
                    <Route path="/cheatsheet" element={<CheatsheetView />} />
                    <Route path="/notes" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/field-manual" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/cpts" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/cpts-manual" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/writeup" element={<WriteupStudio />} />
                    <Route path="/writeup/:id" element={<WriteupStudio />} />
                    <Route path="/writeups" element={<Navigate to="/writeup" replace />} />
                    <Route path="/analytics" element={<AnalyticsView />} />
                    <Route path="/exam" element={<ExamSimulatorPage />} />
                    <Route path="/exam-simulator" element={<ExamSimulatorPage />} />
                    <Route path="/vault" element={<EvidenceVaultPage />} />
                    <Route path="/evidence" element={<EvidenceVaultPage />} />
                    <Route path="/loot" element={<EvidenceVaultPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </RouteErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Global Persistent Multi-Tab Notes Workspace Sidecar (Non-blocking) */}
        {!isPopout && <PersistentNotesWorkspace />}
      </div>

      {/* Global Floating LHOST/LPORT Payload Bar - Hidden in Popout Mode */}
      {!isPopout && <FloatingPayloadBar />}

      {/* Tactical Mobile Bottom Navigation Bar (md:hidden) */}
      {!focusMode && !isPopout && <MobileNav />}

      {/* Global Non-Blocking In-App Toast Container */}
      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
};

export const App: React.FC = () => {
  // Desktop (Tauri) keeps hash routing; the web build uses clean URLs.
  const Router = isTauriTarget() ? HashRouter : BrowserRouter;
  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <ScrollProvider>
          <ThemeProvider>
            <MainAppContent />
          </ThemeProvider>
        </ScrollProvider>
      </Router>
    </MotionConfig>
  );
};

export default App;

