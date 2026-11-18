import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { stripTrailingSlash } from '../../utils/pathUtils';
import { Crosshair, Zap, Menu, Route, Code, NotebookText } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useOpenTabCount } from '../../hooks/useOpenTabCount';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { afterFirstPaint } from '../../utils/afterFirstPaint';

// The slide-out menu behind "More" is only needed once someone opens it, so it loads as its own chunk. The request
// starts after the first paint has settled, so the menu is usually ready by the time it is tapped.
const loadMobileNavDrawer = () => import('./MobileNavDrawer');
const MobileNavDrawer = React.lazy(loadMobileNavDrawer);

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    setActiveTab,
    reconAutomationModalOpen,
    setReconAutomationModalOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      setActiveTab: s.setActiveTab,
      reconAutomationModalOpen: s.reconAutomationModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      mobileMenuOpen: s.mobileMenuOpen,
      setMobileMenuOpen: s.setMobileMenuOpen,
      soundEnabled: s.soundEnabled,
    }))
  );

  // Mounted from the first time the menu opens and kept, so the close animation still plays.
  const [drawerEverOpened, setDrawerEverOpened] = React.useState(mobileMenuOpen);
  if (mobileMenuOpen && !drawerEverOpened) setDrawerEverOpened(true);
  React.useEffect(() => {
    let live = true;
    void afterFirstPaint().then(() => {
      if (live) void loadMobileNavDrawer();
    });
    return () => {
      live = false;
    };
  }, []);

  const isNotesOpen = useNotesWorkspaceStore((s) => s.isOpen);
  const openNotesCount = useOpenTabCount();
  const toggleNotesWorkspace = useNotesWorkspaceStore((s) => s.toggleOpen);

  const handleNavClick = (path: string, tabId: Parameters<typeof setActiveTab>[0], state?: { scrollTo: string }) => {
    setActiveTab(tabId);
    navigate(path, state ? { state } : undefined);
    setMobileMenuOpen(false);
    useNotesWorkspaceStore.getState().setIsOpen(false);
    if (soundEnabled) playCyberSound('click');
  };

  const tabBase =
    'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-1 rounded-lg transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const tabState = (active: boolean) => (active ? 'text-primary font-medium' : 'text-muted hover:text-primary');
  const currentPath = stripTrailingSlash(location.pathname);
  const isTracker = currentPath === '/tracker' || currentPath === '/' || location.pathname.startsWith('/target');

  return (
    <>
      {/* Fixed mobile bottom navigation (screens < 768px) */}
      <nav data-testid="app-mobile-nav" data-tour="sidebar-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-card border-t border-subtle px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] font-sans">
        <div className="flex items-center justify-around">
          {/* Targets */}
          <button
            onClick={() => handleNavClick('/tracker', 'tracker')}
            aria-current={isTracker ? 'page' : undefined}
            className={`${tabBase} ${tabState(isTracker)}`}
          >
            <Crosshair className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Tracker</span>
            {isTracker && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-accent" aria-hidden="true" />}
          </button>

          {/* Methodology */}
          <button
            onClick={() => handleNavClick('/methodology', 'methodology')}
            aria-current={location.pathname.startsWith('/methodology') ? 'page' : undefined}
            className={`${tabBase} ${tabState(location.pathname.startsWith('/methodology'))}`}
          >
            <Route className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Method</span>
            {location.pathname.startsWith('/methodology') && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-accent" aria-hidden="true" />}
          </button>

          {/* Automations */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setReconAutomationModalOpen(true);
              if (soundEnabled) playCyberSound('engage');
            }}
            className={`${tabBase} ${tabState(reconAutomationModalOpen)}`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Auto</span>
          </motion.button>

          {/* Cheatsheets */}
          <button
            onClick={() => handleNavClick('/cheatsheets', 'cheatsheet')}
            aria-current={location.pathname.startsWith('/cheatsheet') ? 'page' : undefined}
            className={`${tabBase} ${tabState(location.pathname.startsWith('/cheatsheet'))}`}
          >
            <Code className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Snippets</span>
            {location.pathname.startsWith('/cheatsheet') && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-accent" aria-hidden="true" />}
          </button>

          {/* Notes workspace */}
          <button
            onClick={() => {
              toggleNotesWorkspace();
              if (soundEnabled) playCyberSound('click');
            }}
            className={`${tabBase} ${tabState(isNotesOpen)}`}
          >
            <div className="relative">
              <NotebookText className="w-4 h-4" />
              {openNotesCount > 0 && (
                <span aria-label={`${openNotesCount} open`} className="absolute -top-1.5 -right-2.5 min-w-[14px] text-center text-[10px] leading-[14px] px-1 rounded-full bg-accent text-on-accent font-medium tabular-nums">
                  {openNotesCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5">Notes</span>
          </button>

          {/* More */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              if (soundEnabled) playCyberSound('toggle');
            }}
            aria-expanded={mobileMenuOpen}
            className={`${tabBase} ${tabState(mobileMenuOpen)}`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-out drawer: loaded when the menu is first opened, then kept mounted so it can animate closed */}
      {drawerEverOpened && (
        <React.Suspense fallback={null}>
          <MobileNavDrawer onNavigate={handleNavClick} />
        </React.Suspense>
      )}
    </>
  );
};
