import React, { useRef, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/layout/Header';
import { FloatingPayloadBar } from './components/common/FloatingPayloadBar';
import { SnippetsDrawer } from './components/layout/SnippetsDrawer';
import { RevShellModal } from './components/modals/RevShellModal';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { ScrollProgressBar } from './components/common/ScrollProgressBar';
import { BackToTopButton } from './components/common/BackToTopButton';
import { ScrollProvider, useScrollActions } from './context/ScrollContext';
import { TrackerView } from './components/tracker/TrackerView';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { ThemeRippleOverlay } from './components/common/ThemeRippleOverlay';
import { useTacticalHotkeys } from './hooks/useTacticalHotkeys';
import { ThemeProvider } from './hooks/useTheme';
import { useCtfStore, mergeMachinesWithCatalog } from './store/useCtfStore';

// Code-Split Overlay Modals (Zero initial bundle overhead)
const MachineDetailModal = lazy(() => import('./components/tracker/MachineDetailModal').then(m => ({ default: m.MachineDetailModal })));
const NewMachineModal = lazy(() => import('./components/tracker/NewMachineModal').then(m => ({ default: m.NewMachineModal })));
const PentestReportModal = lazy(() => import('./components/writeup/PentestReportModal').then(m => ({ default: m.PentestReportModal })));
const OperatorDossierModal = lazy(() => import('./components/common/OperatorDossierModal').then(m => ({ default: m.OperatorDossierModal })));
const LicenseModal = lazy(() => import('./components/common/LicenseModal').then(m => ({ default: m.LicenseModal })));
const NotesImportModal = lazy(() => import('./components/cheatsheet/NotesImportModal').then(m => ({ default: m.NotesImportModal })));
const OperatorFlexCardModal = lazy(() => import('./components/common/OperatorFlexCardModal').then(m => ({ default: m.OperatorFlexCardModal })));
const QuickAssignIpModal = lazy(() => import('./components/common/QuickAssignIpModal').then(m => ({ default: m.QuickAssignIpModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/common/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const BackupModal = lazy(() => import('./components/backup/BackupModal').then(m => ({ default: m.BackupModal })));
const ReconAutomationModal = lazy(() => import('./components/automation/ReconAutomationModal').then(m => ({ default: m.ReconAutomationModal })));
const SettingsModal = lazy(() => import('./components/common/SettingsModal').then(m => ({ default: m.SettingsModal })));

// Code-Split Route Modules (Zero-overhead on initial tracker load)
const CheatsheetView = lazy(() => import('./components/cheatsheet/CheatsheetView').then(m => ({ default: m.CheatsheetView })));
const WriteupStudio = lazy(() => import('./components/writeup/WriteupStudio').then(m => ({ default: m.WriteupStudio })));
const AnalyticsView = lazy(() => import('./components/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const TargetDetailPage = lazy(() => import('./pages/TargetDetailPage').then(m => ({ default: m.TargetDetailPage })));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage').then(m => ({ default: m.MethodologyPage })));
const ExamSimulatorPage = lazy(() => import('./pages/ExamSimulatorPage').then(m => ({ default: m.ExamSimulatorPage })));
const ThemeShowcaseDemo = lazy(() => import('./components/common/ThemeShowcaseDemo').then(m => ({ default: m.ThemeShowcaseDemo })));

const CyberRouteLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 font-mono">
    <div className="relative flex items-center justify-center">
      <div className="w-10 h-10 rounded border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
    </div>
    <div className="text-center space-y-1">
      <div className="text-xs tracking-wider text-slate-700 dark:text-slate-300 font-semibold uppercase">
        Loading module...
      </div>
      <div className="text-[10px] text-slate-500 tracking-wider">
        Local offline datastore
      </div>
    </div>
  </div>
);

const TimerController: React.FC = () => {
  const isTimerRunning = useCtfStore((s) => s.isTimerRunning);
  const tickTimer = useCtfStore((s) => s.tickTimer);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  return null;
};

const MainAppContent: React.FC = () => {
  const { setScrollElement } = useScrollActions();
  const location = useLocation();
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
  const commandPaletteOpen = useCtfStore((s) => s.commandPaletteOpen);
  const focusMode = useCtfStore((s) => s.focusMode);
  const setFocusMode = useCtfStore((s) => s.setFocusMode);
  const uiScale = useCtfStore((s) => s.uiScale || 'normal');

  // Tactical keyboard hotkeys engine
  useTacticalHotkeys();

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
          licenseModalOpen ||
          notesImportModalOpen ||
          flexCardModalOpen ||
          shortcutsModalOpen ||
          settingsModalOpen
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
    licenseModalOpen,
    notesImportModalOpen,
    flexCardModalOpen,
    shortcutsModalOpen,
    settingsModalOpen,
  ]);

  // Handle global UI scale (Tiny: 80%, Compact: 90%, Normal: 100%, Large: 110%, Huge: 122%)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const zoomMap: Record<string, string> = {
        tiny: '0.80',
        compact: '0.90',
        normal: '1.0',
        large: '1.10',
        huge: '1.22',
      };
      const zoomVal = zoomMap[uiScale] || '1.0';
      (document.documentElement.style as any).zoom = zoomVal;
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
    } else if (path.startsWith('/cheatsheets') || path.startsWith('/notes') || path.startsWith('/cpts')) {
      setActiveTab('cheatsheet');
    } else if (path.startsWith('/writeup')) {
      setActiveTab('writeup');
    } else if (path.startsWith('/analytics')) {
      setActiveTab('analytics');
    } else if (path.startsWith('/exam')) {
      setActiveTab('exam');
    } else if (path.startsWith('/theme')) {
      setActiveTab('theme');
    } else {
      setActiveTab('tracker');
    }
  }, [location.pathname, setActiveTab]);

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-cyber-bg text-slate-900 dark:text-cyber-text flex flex-col font-mono selection:bg-cyan-500/25 selection:text-current dark:selection:bg-cyan-400/25 dark:selection:text-white relative">
      {/* Top glowing laser scroll progress bar */}
      <ScrollProgressBar />

      {/* Global Liquid Theme Transition Ripple Overlay */}
      <ThemeRippleOverlay />

      {/* Floating Tactical Thruster Back to Top */}
      <BackToTopButton />

      {/* Floating Zen Focus Mode Recovery Banner */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-slate-900/90 dark:bg-zinc-900/95 text-white border border-cyan-500/50 dark:border-cyan-400/60 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs font-mono"
          >
            <span className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ZEN FOCUS MODE
            </span>
            <span className="text-zinc-400 text-[11px] hidden sm:inline">Press Esc or</span>
            <button
              onClick={() => setFocusMode(false)}
              className="px-3 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
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
          {backupModalOpen && <BackupModal />}
          {reconAutomationModalOpen && <ReconAutomationModal />}
          {selectedMachineId && <MachineDetailModal />}
          {assignIpMachineId && <QuickAssignIpModal />}
          {newMachineModalOpen && <NewMachineModal />}
          {reportMachineId && (
            <PentestReportModal
              machineId={reportMachineId}
              isOpen={Boolean(reportMachineId)}
              onClose={() => setReportMachineId(null)}
            />
          )}
          {operatorModalOpen && <OperatorDossierModal />}
          {licenseModalOpen && <LicenseModal />}
          {notesImportModalOpen && <NotesImportModal />}
          {flexCardModalOpen && <OperatorFlexCardModal />}
          {shortcutsModalOpen && <KeyboardShortcutsModal />}
          {settingsModalOpen && <SettingsModal />}
        </Suspense>
      </RouteErrorBoundary>

      {/* Background Timer Controller (Zero-Lag 1Hz Clock Isolation) */}
      <TimerController />

      {/* Slide-over Cheatsheet & Snippets Drawer (Alt+S) */}
      <SnippetsDrawer />

      {/* Rapid Reverse Shell Crafter Modal */}
      <RevShellModal />

      {/* Tactical Top Header */}
      {!focusMode && <Header />}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Responsive Collapsible Sidebar - Hidden in Focus Mode */}
        {!focusMode && <Sidebar />}

        {/* Main Stage View */}
        <main
          ref={setScrollElement}
          className={`flex-1 overflow-y-auto min-h-0 p-3 pb-24 sm:p-4 md:p-6 md:pb-6 relative bg-slate-50/70 dark:bg-cyber-bg transition-all ${
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
              <RouteErrorBoundary>
                <Suspense fallback={<CyberRouteLoader />}>
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Navigate to="/tracker" replace />} />
                    <Route path="/tracker" element={<TrackerView />} />
                    <Route path="/target/:id" element={<TargetDetailPage />} />
                    <Route path="/methodology" element={<MethodologyPage />} />
                    <Route path="/cheatsheets" element={<CheatsheetView />} />
                    <Route path="/cheatsheet" element={<Navigate to="/cheatsheets" replace />} />
                    <Route path="/notes" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/field-manual" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/cpts" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/cpts-manual" element={<CheatsheetView defaultMode="cpts-manual" />} />
                    <Route path="/writeup" element={<WriteupStudio />} />
                    <Route path="/writeup/:id" element={<WriteupStudio />} />
                    <Route path="/writeups" element={<Navigate to="/writeup" replace />} />
                    <Route path="/analytics" element={<AnalyticsView />} />
                    <Route path="/exam" element={<ExamSimulatorPage />} />
                    <Route path="/exam-simulator" element={<Navigate to="/exam" replace />} />
                    <Route path="/theme-demo" element={<ThemeShowcaseDemo />} />
                    <Route path="/theme" element={<ThemeShowcaseDemo />} />
                    <Route path="/dark-mode" element={<ThemeShowcaseDemo />} />
                    <Route path="*" element={<Navigate to="/tracker" replace />} />
                  </Routes>
                </Suspense>
              </RouteErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Floating LHOST/LPORT Payload Bar */}
      <FloatingPayloadBar />

      {/* Tactical Mobile Bottom Navigation Bar (md:hidden) */}
      {!focusMode && <MobileNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollProvider>
        <ThemeProvider>
          <MainAppContent />
        </ThemeProvider>
      </ScrollProvider>
    </HashRouter>
  );
};

export default App;

