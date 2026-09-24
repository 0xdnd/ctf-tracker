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
  Settings
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
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
    if (soundEnabled) playCyberSound('click');
  };

  const handleCopyVar = async (val: string, field: 'lhost' | 'lport') => {
    if (!val) return;
    await safeCopyToClipboard(val);
    setCopiedVar(field);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <>
      {/* Fixed Tactical Mobile Bottom Navigation Bar (Screens < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-cyber-bg/95 backdrop-blur-lg border-t border-cyber-border/80 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] font-mono shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around">
          {/* Targets */}
          <button
            onClick={() => handleNavClick('/tracker', 'tracker')}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all relative ${
              location.pathname === '/tracker' || location.pathname === '/' || location.pathname.startsWith('/target')
                ? 'text-cyber-emerald font-bold'
                : 'text-cyber-muted hover:text-white'
            }`}
          >
            <div className="relative">
              <Crosshair className="w-4 h-4" />
              <span className="absolute -top-1 -right-2 text-[8px] px-1 rounded-full bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 font-bold">
                {rootedMachines}
              </span>
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Targets</span>
          </button>

          {/* Methodology */}
          <button
            onClick={() => handleNavClick('/methodology', 'methodology')}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
              location.pathname.startsWith('/methodology')
                ? 'text-cyber-cyan font-bold'
                : 'text-cyber-muted hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Method</span>
          </button>

          {/* Automations (Glowing Center Orb) */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              setReconAutomationModalOpen(true);
              if (soundEnabled) playCyberSound('engage');
            }}
            className="flex flex-col items-center justify-center p-1 -mt-3.5"
          >
            <div className="w-10 h-10 rounded-full bg-cyber-bg border-2 border-cyber-emerald shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center text-cyber-emerald">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[9px] mt-0.5 text-cyber-emerald font-bold tracking-tight">Auto</span>
          </motion.button>

          {/* Cheatsheets */}
          <button
            onClick={() => handleNavClick('/cheatsheets', 'cheatsheet')}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
              location.pathname.startsWith('/cheatsheets')
                ? 'text-purple-400 font-bold'
                : 'text-cyber-muted hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Cheats</span>
          </button>

          {/* Writeup Studio */}
          <button
            onClick={() => handleNavClick('/writeup', 'writeup')}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
              location.pathname.startsWith('/writeup')
                ? 'text-cyber-amber font-bold'
                : 'text-cyber-muted hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Writeup</span>
          </button>

          {/* Mobile Drawer Menu Toggle */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              if (soundEnabled) playCyberSound('toggle');
            }}
            className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all ${
              mobileMenuOpen ? 'text-cyber-cyan' : 'text-cyber-muted hover:text-white'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-out Mobile Tactical Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex font-mono">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative ml-auto w-[85%] max-w-sm h-full bg-cyber-card border-l border-cyber-border shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-cyber-border flex items-center justify-between bg-cyber-bg">
                <div className="flex items-center gap-2.5">
                  <CyberLogo size="md" />
                  <div>
                    <div className="font-bold text-white text-xs tracking-wider">
                      ZEROBOX // MOBILE
                    </div>
                    <div className="text-[10px] text-cyber-muted">Tactical CTF & Lab Suite</div>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg border border-cyber-border bg-cyber-card text-cyber-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
                {/* 1-Click Save Progress Card */}
                <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold text-cyber-muted">
                      ACCOUNT: <span className="text-white font-bold">{user ? user.name : 'Google Guest'}</span>
                    </div>
                    <div className="text-[10px] text-cyber-emerald font-bold">
                      {rootedMachines} / {totalMachines} Pwned
                    </div>
                  </div>
                  <button
                    onClick={handleMobileQuickSave}
                    className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      justSavedMobile
                        ? 'bg-cyber-emerald text-black shadow-glow-emerald/30'
                        : 'bg-cyber-emerald/15 border border-cyber-emerald text-cyber-emerald hover:bg-cyber-emerald hover:text-black'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{justSavedMobile ? '✓ ALL DATA SAVED!' : '1-CLICK SAVE DATA'}</span>
                  </button>
                </div>

                {/* 1. Mobile Payload Variables Hub */}
                <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border space-y-2">
                  <div className="text-[10px] uppercase font-bold text-cyber-cyan flex items-center gap-1.5">
                    <Server className="w-3 h-3" /> PAYLOAD TUNING (LHOST:LPORT)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-cyber-muted">LHOST (tun0):</span>
                      <div className={`flex items-center gap-1 mt-0.5 bg-cyber-card px-2 py-1 rounded border transition-all ${
                        copiedVar === 'lhost' ? 'border-cyber-emerald bg-cyber-emerald/10' : 'border-cyber-border'
                      }`}>
                        <input
                          type="text"
                          id="mobile-lhost-input"
                          name="mobile-lhost"
                          aria-label="Attacker Host LHOST"
                          value={globalVars.lhost}
                          onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyVar(globalVars.lhost, 'lhost')}
                          className={`p-1 rounded transition-all flex items-center gap-0.5 ${
                            copiedVar === 'lhost'
                              ? 'bg-cyber-emerald text-black font-bold shadow-glow-emerald px-1.5'
                              : 'text-cyber-muted hover:text-cyber-cyan'
                          }`}
                          title="Copy LHOST"
                        >
                          {copiedVar === 'lhost' ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span className="text-[8px] uppercase font-bold text-black">COPIED</span>
                            </>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-cyber-muted">LPORT:</span>
                      <div className={`flex items-center gap-1 mt-0.5 bg-cyber-card px-2 py-1 rounded border transition-all ${
                        copiedVar === 'lport' ? 'border-cyber-emerald bg-cyber-emerald/10' : 'border-cyber-border'
                      }`}>
                        <input
                          type="text"
                          id="mobile-lport-input"
                          name="mobile-lport"
                          aria-label="Attacker Port LPORT"
                          value={globalVars.lport}
                          onChange={(e) => setGlobalVars({ lport: e.target.value })}
                          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyVar(globalVars.lport, 'lport')}
                          className={`p-1 rounded transition-all flex items-center gap-0.5 ${
                            copiedVar === 'lport'
                              ? 'bg-cyber-emerald text-black font-bold shadow-glow-emerald px-1.5'
                              : 'text-cyber-muted hover:text-cyber-cyan'
                          }`}
                          title="Copy LPORT"
                        >
                          {copiedVar === 'lport' ? (
                            <>
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span className="text-[8px] uppercase font-bold text-black">COPIED</span>
                            </>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Operations & Modules */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-cyber-muted px-1 mb-1">
                    TACTICAL MODULES
                  </div>

                  <button
                    onClick={() => handleNavClick('/exam', 'exam')}
                    className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition-colors ${
                      location.pathname === '/exam'
                        ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan font-bold'
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-cyber-cyan" />
                      <span>24h Exam Simulator (OSCP)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleNavClick('/analytics', 'analytics')}
                    className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition-colors ${
                      location.pathname === '/analytics'
                        ? 'bg-cyber-emerald/10 border-cyber-emerald text-cyber-emerald font-bold'
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyber-emerald" />
                      <span>Pwn Analytics & Radar</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="w-full p-2.5 rounded-lg bg-cyber-bg border border-cyber-border flex items-center justify-between text-left text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-cyber-emerald" />
                      <span>Command Search (Ctrl+K)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-card border border-cyber-border">⌘K</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setNewMachineModalOpen(true);
                    }}
                    className="w-full p-2.5 rounded-lg bg-cyber-bg border border-cyber-border flex items-center justify-between text-left text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-cyber-cyan" />
                      <span>Deploy Custom Target</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBackupModalOpen(true);
                    }}
                    className="w-full p-2.5 rounded-lg bg-cyber-bg border border-cyber-border flex items-center justify-between text-left text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span>Backup / Restore JSON</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. Tactical Environment Toggles */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-cyber-muted px-1">
                    ENVIRONMENT & THEME
                  </div>
                  {/* Theme Switcher (Real Moon / Radiant Sun) */}
                  <div className="p-3 rounded-lg border border-cyber-border bg-cyber-bg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Celestial Theme</span>
                      </div>
                      <div className="text-[10px] text-cyber-muted">Real Moon / Radiant Sun</div>
                    </div>
                    <ThemeToggle size="sm" showLabel />
                  </div>

                  {/* Theme Presets (Minimalist Black & Blue, OLED, Slate, Light) */}
                  <div className="p-3 rounded-lg border border-cyber-border bg-cyber-bg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>Minimalist Theme</span>
                      </div>
                      <div className="text-[10px] text-cyber-muted">Black & Blue, OLED, Slate, Light</div>
                    </div>
                    <ThemePresetDropdown />
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSettingsModalOpen(true);
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className="w-full p-2.5 rounded-lg border border-cyber-border bg-cyber-bg hover:border-cyber-cyan/50 text-slate-700 dark:text-cyber-text hover:text-cyber-cyan flex items-center justify-between text-xs font-mono transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-cyber-cyan" />
                      <span className="font-bold">Operator Settings & Themes</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-cyber-muted" />
                  </button>

                  <button
                    onClick={toggleSound}
                    className={`w-full p-2.5 rounded-lg border flex items-center justify-center gap-2 text-left transition-colors ${
                      soundEnabled 
                        ? 'bg-cyber-emerald/15 border-cyber-emerald text-cyber-emerald font-bold' 
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{soundEnabled ? 'Cyber Audio Enabled' : 'Cyber Audio Muted'}</span>
                  </button>
                </div>

                {/* 4. Creator & Support Card */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyber-card via-cyber-bg to-[#0d1527] border border-cyber-border/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-cyber-emerald/20 border border-cyber-emerald/50 flex items-center justify-center text-cyber-emerald text-[10px] font-black">
                        DD
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-white font-bold text-xs">Daniel Dayan</div>
                        <div className="text-[10px] text-cyber-muted">@0xdnd • Creator & Architect</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setOperatorModalOpen(true);
                      }}
                      className="text-[10px] text-cyber-emerald hover:underline font-bold"
                    >
                      Dossier ↗
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <a
                      href={CREATOR_PROFILE_LINKS.coffee}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#FFDD00]/15 hover:bg-[#FFDD00]/25 border border-[#FFDD00]/40 text-[#FFDD00] hover:text-white flex items-center justify-center gap-1.5 font-bold text-[11px] transition-all"
                    >
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Buy a Coffee</span>
                    </a>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLicenseModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1 text-[11px] font-bold transition-all"
                    >
                      <Scale className="w-3.5 h-3.5 text-cyber-amber" />
                      <span>License</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-3 border-t border-cyber-border bg-cyber-bg text-center text-[10px] text-cyber-muted">
                ZEROBOX SUITE • MOBILE OPERATING SYSTEM
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
