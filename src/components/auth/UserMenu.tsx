import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, CREATOR_PROFILE_LINKS } from '../../utils/helpers';
import { 
  Save, 
  Check, 
  ChevronDown, 
  Download, 
  Upload, 
  RotateCcw, 
  LogOut, 
  ShieldCheck, 
  Globe, 
  Coffee,
  HardDrive,
  User,
  Settings,
  Trophy,
  Award
} from 'lucide-react';
import { getAvatarSvgDataUri } from '../../data/avatarPresets';
import { evaluateOperatorGamification } from '../../utils/gamificationEngine';

export const UserMenu: React.FC = () => {
  const { 
    user, 
    isAuthenticated,
    logout 
  } = useAuthStore();

  const { 
    machines, 
    currentProfileId, 
    saveProfileData, 
    exportBackup, 
    importBackup, 
    resetAllProgress,
    setOperatorModalOpen,
    setSettingsModalOpen,
    soundEnabled
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      currentProfileId: s.currentProfileId,
      saveProfileData: s.saveProfileData,
      exportBackup: s.exportBackup,
      importBackup: s.importBackup,
      resetAllProgress: s.resetAllProgress,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setSettingsModalOpen: s.setSettingsModalOpen,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const gamification = React.useMemo(() => {
    return evaluateOperatorGamification({
      machines,
      unlockedTrophies: user?.unlockedTrophies,
    });
  }, [machines, user?.unlockedTrophies]);

  const activeName = user?.callsign || user?.name || 'Local Operator';
  const rootedCount = machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
  const totalCount = machines.length;

  // 1-Click Save Data Handler
  const handleQuickSave = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    saveProfileData(currentProfileId);
    setJustSaved(true);
    playCyberSound('root');
    setTimeout(() => setJustSaved(false), 2500);
    playCyberSound('export');
  };



  // 1-Click Export JSON
  const handleExportBackup = () => {
    const jsonStr = exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ctf-tracker-${activeName.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playCyberSound('export');
  };

  // 1-Click Import JSON
  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const ok = importBackup(text);
          if (ok) {
            playCyberSound('root');
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2000);
          } else {
            alert('Invalid backup JSON format.');
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm(`Reset all machine progress for "${activeName}"?`)) {
      resetAllProgress();
      setDropdownOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative font-mono text-xs flex-shrink-0">
      {/* Header Button Group: 1-Click Save + Profile / Local Operator Badge */}
      <div className="flex items-center gap-1.5 bg-cyber-card/90 border border-cyber-border rounded-xl p-1 shadow-sm flex-shrink-0">
        {/* Instant 1-Click Quick Save Button */}
        <button
          onClick={handleQuickSave}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-[box-shadow,background-color,border-color,color] ${
            justSaved
              ? 'bg-cyber-emerald text-black shadow-glow-emerald/40'
              : 'bg-cyber-bg border border-cyber-border text-cyber-emerald hover:border-cyber-emerald/60 hover:bg-cyber-emerald/10'
          }`}
          title="Click to save all progress instantly to browser storage"
        >
          {justSaved ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[11px]">Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-cyber-emerald" />
              <span className="text-[11px] hidden sm:inline">Save</span>
            </>
          )}
        </button>

        {/* Profile / Local Operator Dropdown Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-cyber-bg transition-colors group cursor-pointer"
          title={isAuthenticated && user ? `Operator: ${activeName} (${user.role || 'Tactical Operator'})` : 'Local Mode: Offline & Zero Cloud Egress'}
        >
          {user?.avatarId ? (
            <img
              src={getAvatarSvgDataUri(user.avatarId)}
              alt={activeName}
              className="w-5 h-5 rounded-md object-contain border border-cyber-emerald/60 p-0.5 bg-slate-900 flex-shrink-0"
            />
          ) : isAuthenticated && user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={activeName}
              className="w-5 h-5 rounded-full border border-cyber-emerald/60 object-cover flex-shrink-0"
            />
          ) : isAuthenticated && user ? (
            <div className="w-5 h-5 rounded-full bg-cyber-emerald/20 border border-cyber-emerald flex items-center justify-center text-[9px] font-bold text-cyber-emerald flex-shrink-0">
              {activeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/50 flex items-center justify-center text-cyber-cyan flex-shrink-0">
              <User className="w-3 h-3" />
            </div>
          )}

          <span className="font-bold text-slate-900 dark:text-white text-xs max-w-[80px] sm:max-w-[110px] truncate group-hover:text-cyber-cyan transition-colors">
            {activeName}
          </span>

          <span className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono ${gamification.currentRank.badgeColor} bg-black/40 border border-current`}>
            [{gamification.currentRank.tier}]
          </span>

          <ChevronDown className="w-3 h-3 text-cyber-muted group-hover:text-slate-900 dark:group-hover:text-white transition-transform" />
        </button>
      </div>

      {/* Control Station Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 p-3.5 rounded-2xl bg-cyber-card border border-cyber-border shadow-2xl z-50 space-y-3 backdrop-blur-md"
          onMouseLeave={() => setDropdownOpen(false)}
        >
          {/* User Status Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-cyber-border/70">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatarId ? (
                <img
                  src={getAvatarSvgDataUri(user.avatarId)}
                  alt={activeName}
                  className="w-10 h-10 rounded-xl border border-cyber-border bg-slate-900 p-1 object-contain shadow-sm flex-shrink-0"
                />
              ) : isAuthenticated && user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={activeName}
                  className="w-10 h-10 rounded-xl border border-cyber-border object-cover flex-shrink-0"
                />
              ) : isAuthenticated && user ? (
                <div className="w-10 h-10 rounded-xl bg-cyber-bg border border-cyber-border flex items-center justify-center text-sm font-bold text-cyber-emerald font-mono flex-shrink-0">
                  {activeName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-cyber-card border border-cyber-border flex items-center justify-center text-cyber-cyan flex-shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                  <span>{activeName}</span>
                </div>
                <div className="text-[10px] text-cyber-muted truncate flex items-center gap-1">
                  <span className={`font-mono font-bold ${gamification.currentRank.badgeColor}`}>
                    [{gamification.currentRank.tier}] {gamification.currentRank.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                  <span className="text-cyan-400 font-bold">
                    {gamification.totalXp.toLocaleString()} XP
                  </span>
                  <span className="text-cyber-muted">•</span>
                  <span className="text-purple-400 font-bold">
                    {gamification.unlockedCount}/16 🏆
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-cyber-emerald">{rootedCount} / {totalCount}</div>
              <div className="text-[9px] text-cyber-muted uppercase">Pwned</div>
            </div>
          </div>

          {/* Quick Trophy Case & Rank Progress Pill */}
          <div 
            onClick={() => {
              setDropdownOpen(false);
              useAuthStore.getState().setOperatorProfileModalOpen(true);
            }}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 group-hover:text-cyan-400 flex items-center gap-1 font-bold">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span>Trophy Case & Ranks</span>
              </span>
              <span className="text-cyan-400 font-bold">
                {gamification.nextRank ? `${gamification.rankProgressPct}%` : 'MAX'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-colors duration-300"
                style={{ width: `${gamification.rankProgressPct}%` }}
              />
            </div>
          </div>

          {/* 1-Click Large Save Button */}
          <button
            onClick={handleQuickSave}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-[box-shadow,background-color,border-color,color] flex items-center justify-center gap-2 shadow-md ${
              justSaved
                ? 'bg-cyber-emerald text-black shadow-glow-emerald/30'
                : 'bg-cyber-emerald hover:bg-cyber-emerald/90 text-black shadow-glow-emerald/20'
            }`}
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>SAVED TO BROWSER STORAGE!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>1-CLICK SAVE PROGRESS</span>
              </>
            )}
          </button>

          {/* 1-Click Backup Export & Restore */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="p-2 rounded-xl bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-slate-900 dark:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Download backup file"
            >
              <Download className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Export Backup</span>
            </button>

            <button
              onClick={handleImportBackup}
              className="p-2 rounded-xl bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-slate-900 dark:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Upload backup file"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>Import Backup</span>
            </button>
          </div>

          {/* Operator & Creator Showcase */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyber-emerald/10 via-cyber-card to-cyber-cyan/10 border border-cyber-emerald/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-slate-900 dark:text-white tracking-wider truncate">
                  BUILT BY DANIEL DAYAN
                </span>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setOperatorModalOpen(true);
                }}
                className="text-[9px] font-bold text-cyber-emerald hover:underline"
              >
                DOSSIER ↗
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <a
                href={CREATOR_PROFILE_LINKS.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald hover:text-white border border-cyber-emerald/50 transition-[box-shadow,background-color,border-color,color] text-[10px] font-bold shadow-sm"
                title="Daniel Dayan's Official Portfolio"
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">PORTFOLIO</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#0077B5]/20 hover:bg-[#0077B5]/30 text-[#0077B5] hover:text-white border border-[#0077B5]/50 transition-[box-shadow,background-color,border-color,color] text-[10px] font-bold shadow-sm"
                title="Daniel Dayan LinkedIn Profile"
              >
                <svg className="w-3 h-3 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
                <span className="truncate">LINKEDIN</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#FFDD00]/20 hover:bg-[#FFDD00]/30 text-[#FFDD00] hover:text-white border border-[#FFDD00]/50 transition-[box-shadow,background-color,border-color,color] text-[10px] font-bold shadow-sm"
                title="Buy Daniel Dayan a Coffee (buymeacoffee.com/0xdnd)"
              >
                <Coffee className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">COFFEE</span>
              </a>
            </div>
          </div>

          {/* Operator Profile Management & Sign Out */}
          <div className="pt-2 border-t border-cyber-border/70 space-y-2">
            <div>
              <div className="text-[10px] text-cyber-muted mb-1.5 flex items-center justify-between">
                <span>OPERATOR PROFILE:</span>
                <span className="text-[9px] text-cyber-emerald">LOCAL OFFLINE</span>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  useAuthStore.getState().setOperatorProfileModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyber-bg hover:bg-cyber-card border border-cyber-border font-bold text-xs transition-[box-shadow,background-color,border-color,color] shadow-md group text-slate-900 dark:text-white"
                title="Switch or create local operator profiles"
              >
                <User className="w-3.5 h-3.5 text-cyber-emerald" />
                <span>Switch / Manage Profiles</span>
              </button>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-cyber-crimson/15 hover:bg-cyber-crimson border border-cyber-crimson/30 hover:border-cyber-crimson text-cyber-crimson hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SIGN OUT TO GUEST</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setSettingsModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                title="Open Operator Settings"
              >
                <Settings className="w-3 h-3 text-cyber-cyan" />
                <span>Settings</span>
              </button>

              <button
                onClick={handleReset}
                className="w-full py-1.5 px-2 rounded-lg bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                title="Reset all target progress"
              >
                <RotateCcw className="w-3 h-3 text-cyber-amber" />
                <span>Reset CTF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
