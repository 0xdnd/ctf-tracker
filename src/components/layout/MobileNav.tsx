import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Compass, 
  Terminal, 
  FileText, 
  Zap, 
  Menu, 
  X, 
  BarChart3, 
  GraduationCap, 
  Volume2, 
  VolumeX, 
  Database, 
  Plus, 
  Search,
  Server,
  Copy,
  Check,
  ChevronRight,
  Save,
  Coffee,
  Scale,
  Settings,
  User,
  BookOpen
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../store/useAuthStore';
import { playCyberSound, safeCopyToClipboard, CREATOR_PROFILE_LINKS } from '../../utils/helpers';
import { CyberLogo } from '../common/CyberLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { ThemePresetDropdown } from '../common/ThemePresetDropdown';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeTab,
    setActiveTab,
    machines,
    reconAutomationModalOpen,
    setReconAutomationModalOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    setCommandPaletteOpen,
    setNewMachineModalOpen,
    setBackupModalOpen,
    soundEnabled,
    toggleSound,
    globalVars,
    setGlobalVars,
    saveProfileData,
    currentProfileId,
    setOperatorModalOpen,
    setLicenseModalOpen,
    setSettingsModalOpen,
  } = useCtfStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      machines: s.machines,
      reconAutomationModalOpen: s.reconAutomationModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      mobileMenuOpen: s.mobileMenuOpen,
      setMobileMenuOpen: s.setMobileMenuOpen,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      soundEnabled: s.soundEnabled,
      toggleSound: s.toggleSound,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      saveProfileData: s.saveProfileData,
      currentProfileId: s.currentProfileId,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setLicenseModalOpen: s.setLicenseModalOpen,
      setSettingsModalOpen: s.setSettingsModalOpen,
    }))
  );

  const user = useAuthStore((s) => s.user);
  const [copiedVar, setCopiedVar] = React.useState<'lhost' | 'lport' | null>(null);
  const [justSavedMobile, setJustSavedMobile] = React.useState(false);

  const isNotesOpen = useNotesWorkspaceStore((s) => s.isOpen);
  const openNotesCount = useNotesWorkspaceStore((s) => s.openTabIds.length);
  const toggleNotesWorkspace = useNotesWorkspaceStore((s) => s.toggleOpen);

  const { totalMachines, rootedMachines } = React.useMemo(() => {
    let rooted = 0;
    for (let i = 0; i < machines.length; i++) {
      const s = machines[i].status;
      if (s === 'root' || s === 'completed') rooted++;
    }
    return { totalMachines: machines.length, rootedMachines: rooted };
  }, [machines]);

  const handleMobileQuickSave = () => {
    saveProfileData(currentProfileId);
    setJustSavedMobile(true);
    if (soundEnabled) playCyberSound('root');
    setTimeout(() => setJustSavedMobile(false), 2000);
  };

  const handleNavClick = (path: string, tabId: any) => {
    setActiveTab(tabId);
    navigate(path);
    setMobileMenuOpen(false);
    useNotesWorkspaceStore.getState().setIsOpen(false);
    if (soundEnabled) playCyberSound('click');
  };

  const handleCopyVar = async (val: string, field: 'lhost' | 'lport') => {
    if (!val) return;
    await safeCopyToClipboard(val);
    setCopiedVar(field);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const tabBase =
    'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-1 rounded-lg transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const tabState = (active: boolean) => (active ? 'text-primary font-medium' : 'text-muted hover:text-primary');
  const rowBase =
    'w-full min-h-[44px] px-3 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const rowState = (active: boolean) =>
    active
      ? 'bg-surface-hover text-primary font-medium'
      : 'text-secondary hover:bg-surface-hover hover:text-primary';
  const sectionLabel = 'text-[11px] font-medium text-muted px-1 mb-1';
  const iconCls = 'w-4 h-4 text-muted flex-shrink-0';

  const isTracker = location.pathname === '/tracker' || location.pathname === '/' || location.pathname.startsWith('/target');

  return (
    <>
      {/* Fixed mobile bottom navigation (screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-subtle px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] font-sans">
        <div className="flex items-center justify-around">
          {/* Targets */}
          <button
            onClick={() => handleNavClick('/tracker', 'tracker')}
            aria-current={isTracker ? 'page' : undefined}
            className={`${tabBase} ${tabState(isTracker)}`}
          >
            <Crosshair className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Targets</span>
            {isTracker && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-accent" aria-hidden="true" />}
          </button>

          {/* Methodology */}
          <button
            onClick={() => handleNavClick('/methodology', 'methodology')}
            aria-current={location.pathname.startsWith('/methodology') ? 'page' : undefined}
            className={`${tabBase} ${tabState(location.pathname.startsWith('/methodology'))}`}
          >
            <Compass className="w-4 h-4" />
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
            <Terminal className="w-4 h-4" />
            <span className="text-[11px] mt-0.5">Cheats</span>
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
              <BookOpen className="w-4 h-4" />
              {openNotesCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[14px] text-center text-[10px] leading-[14px] px-1 rounded-full bg-accent text-on-accent font-medium tabular-nums">
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

      {/* Slide-out drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-surface-inverse/70"
            />

            {/* Sliding panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%', transition: { duration: 0.15, ease: 'easeOut' } }}
              transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
              className="relative ml-auto w-[85%] max-w-sm h-full bg-surface-card border-l border-subtle shadow-xl flex flex-col z-10 overflow-hidden"
            >
              {/* Drawer header */}
              <div className="p-4 border-b border-subtle flex items-center justify-between bg-surface-card">
                <div className="flex items-center gap-2.5">
                  <CyberLogo size="md" />
                  <div>
                    <div className="font-semibold text-primary text-sm tracking-tight">
                      ZERO<span className="text-accent">BOX</span>
                    </div>
                    <div className="text-[11px] text-muted">Lab and CTF suite</div>
                  </div>
                </div>

                <button
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm scrollbar-thin">
                {/* Operator and save */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs text-muted">
                      Operator <span className="text-primary font-medium">{user ? user.name : 'Local Operator'}</span>
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      <span className="font-mono tabular-nums text-secondary">{rootedMachines} / {totalMachines}</span> pwned
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleMobileQuickSave}
                      className={`min-h-[44px] px-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        justSavedMobile
                          ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                          : 'bg-surface-base border-subtle text-primary hover:bg-surface-hover'
                      }`}
                    >
                      {justSavedMobile ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{justSavedMobile ? 'Saved' : 'Save data'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        useAuthStore.getState().setOperatorProfileModalOpen(true);
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className="min-h-[44px] px-2 rounded-lg font-medium text-sm bg-accent text-on-accent hover:bg-accent-hover transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profiles</span>
                    </button>
                  </div>
                </div>

                {/* Payload variables */}
                <div className="space-y-2">
                  <div className={`${sectionLabel} flex items-center gap-1.5`}>
                    <Server className="w-3 h-3" /> Payload tuning (LHOST:LPORT)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-muted">LHOST (tun0)</span>
                      <div className={`flex items-center gap-1 mt-0.5 bg-surface-sunken px-2 min-h-[44px] rounded-lg border transition-colors ${
                        copiedVar === 'lhost' ? 'border-callout-success-border' : 'border-subtle'
                      }`}>
                        <input
                          type="text"
                          id="mobile-lhost-input"
                          name="mobile-lhost"
                          aria-label="Attacker Host LHOST"
                          value={globalVars.lhost}
                          onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                          className="w-full bg-transparent text-primary font-mono tabular-nums text-xs focus:outline-none"
                        />
                        <button
                          aria-label="Copy LHOST"
                          onClick={() => handleCopyVar(globalVars.lhost, 'lhost')}
                          className="p-1.5 rounded transition-colors flex items-center gap-0.5 text-muted hover:text-primary cursor-pointer"
                          title="Copy LHOST"
                        >
                          {copiedVar === 'lhost' ? (
                            <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted">LPORT</span>
                      <div className={`flex items-center gap-1 mt-0.5 bg-surface-sunken px-2 min-h-[44px] rounded-lg border transition-colors ${
                        copiedVar === 'lport' ? 'border-callout-success-border' : 'border-subtle'
                      }`}>
                        <input
                          type="text"
                          id="mobile-lport-input"
                          name="mobile-lport"
                          aria-label="Attacker Port LPORT"
                          value={globalVars.lport}
                          onChange={(e) => setGlobalVars({ lport: e.target.value })}
                          className="w-full bg-transparent text-primary font-mono tabular-nums text-xs focus:outline-none"
                        />
                        <button
                          aria-label="Copy LPORT"
                          onClick={() => handleCopyVar(globalVars.lport, 'lport')}
                          className="p-1.5 rounded transition-colors flex items-center gap-0.5 text-muted hover:text-primary cursor-pointer"
                          title="Copy LPORT"
                        >
                          {copiedVar === 'lport' ? (
                            <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div className="space-y-0.5">
                  <div className={sectionLabel}>Modules</div>

                  <button
                    onClick={() => handleNavClick('/vault', 'vault')}
                    className={`${rowBase} ${rowState(location.pathname.startsWith('/vault') || location.pathname.startsWith('/evidence') || location.pathname.startsWith('/loot'))}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className={iconCls} />
                      <span>Evidence & Loot Vault</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={() => handleNavClick('/writeup', 'writeup')}
                    className={`${rowBase} ${rowState(location.pathname.startsWith('/writeup'))}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={iconCls} />
                      <span>Writeup Studio</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={() => handleNavClick('/exam', 'exam')}
                    className={`${rowBase} ${rowState(location.pathname === '/exam')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className={iconCls} />
                      <span>24h Exam Simulator (OSCP)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={() => handleNavClick('/analytics', 'analytics')}
                    className={`${rowBase} ${rowState(location.pathname === '/analytics')}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className={iconCls} />
                      <span>Pwn Analytics & Radar</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className={`${rowBase} ${rowState(false)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className={iconCls} />
                      <span>Command Search (Ctrl+K)</span>
                    </div>
                    <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle">Ctrl+K</kbd>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setNewMachineModalOpen(true);
                    }}
                    className={`${rowBase} ${rowState(false)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className={iconCls} />
                      <span>Deploy Custom Target</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBackupModalOpen(true);
                    }}
                    className={`${rowBase} ${rowState(false)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className={iconCls} />
                      <span>Backup / Restore JSON</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>
                </div>

                {/* Environment and theme */}
                <div className="space-y-1">
                  <div className={sectionLabel}>Environment and theme</div>
                  <div className="px-3 min-h-[56px] rounded-lg bg-surface-base border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-primary">Appearance</div>
                      <div className="text-[11px] text-muted">Light or dark</div>
                    </div>
                    <ThemeToggle size="sm" showLabel />
                  </div>

                  <div className="px-3 min-h-[56px] rounded-lg bg-surface-base border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-primary">Theme Preset</div>
                      <div className="text-[11px] text-muted">Obsidian, Clean Monolith, Hack The Box</div>
                    </div>
                    <ThemePresetDropdown />
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSettingsModalOpen(true);
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className={`${rowBase} ${rowState(false)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className={iconCls} />
                      <span>Operator Settings & Themes</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <button
                    onClick={toggleSound}
                    className={`${rowBase} ${rowState(false)}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? <Volume2 className={iconCls} /> : <VolumeX className={iconCls} />}
                      <span>{soundEnabled ? 'Audio on' : 'Audio muted'}</span>
                    </div>
                    <span className={`text-[11px] font-medium ${soundEnabled ? 'text-callout-success-fg' : 'text-muted'}`}>
                      {soundEnabled ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                {/* Creator and support */}
                <div className="pt-3 border-t border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-surface-hover border border-subtle flex items-center justify-center text-primary text-[11px] font-semibold">
                        DD
                      </div>
                      <div>
                        <div className="text-primary font-medium text-sm">Daniel Dayan</div>
                        <div className="text-[11px] text-muted">@0xdnd, creator and architect</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setOperatorModalOpen(true);
                      }}
                      className="min-h-[44px] px-2 text-xs text-accent hover:underline font-medium cursor-pointer"
                    >
                      Dossier
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={CREATOR_PROFILE_LINKS.coffee}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] rounded-lg bg-surface-base hover:bg-surface-hover border border-subtle text-secondary hover:text-primary flex items-center justify-center gap-1.5 font-medium text-xs transition-colors"
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Buy a Coffee</span>
                    </a>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLicenseModalOpen(true);
                      }}
                      className="min-h-[44px] rounded-lg bg-surface-base hover:bg-surface-hover border border-subtle text-secondary hover:text-primary flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>License</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer footer */}
              <div className="p-3 border-t border-subtle bg-surface-card text-center text-[11px] text-muted">
                ZeroBox mobile
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
