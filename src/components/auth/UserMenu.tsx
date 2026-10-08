import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCtfStore } from '../../store/useCtfStore';
import { confirmAction } from '../../store/useConfirmStore';
import { toast } from '../../store/useToastStore';
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
  Globe, 
  Coffee,
  HardDrive,
  User,
  Settings,
  Trophy} from 'lucide-react';
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
            toast.error('Invalid backup JSON format.');
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleReset = async () => {
    const ok = await confirmAction({
      title: `Reset progress for "${activeName}"?`,
      body: 'All machine progress for this operator will be cleared.',
      confirmLabel: 'Reset progress',
      tone: 'danger',
    });
    if (ok) {
      resetAllProgress();
      setDropdownOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative font-sans text-xs flex-shrink-0">
      {/* Header button group: quick save + profile */}
      <div className="flex items-center gap-1.5 bg-surface-card border border-subtle rounded-xl p-1 flex-shrink-0">
        {/* Instant 1-Click Quick Save Button */}
        <button
          onClick={handleQuickSave}
          className={`flex items-center gap-1.5 px-2.5 py-1 max-sm:py-2.5 rounded-lg font-medium transition-[background-color,border-color,color] active:scale-[0.97] ${
 justSaved
 ? 'bg-accent text-on-accent'
 : 'bg-surface-card border border-subtle text-secondary hover:border-strong hover:bg-surface-hover'
 }`}
          title="Click to save all progress instantly to browser storage" aria-label="Save all progress"
        >
          {justSaved ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[11px]">Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Save</span>
            </>
          )}
        </button>

        {/* Profile / Local Operator Dropdown Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-surface-hover transition-colors group cursor-pointer"
          title={isAuthenticated && user ? `Operator: ${activeName} (${user.role || 'Tactical Operator'})` : 'Local Mode: Offline & Zero Cloud Egress'}
        >
          {user?.avatarId ? (
            <img
              src={getAvatarSvgDataUri(user.avatarId)}
              alt={activeName}
              className="w-5 h-5 rounded-md object-contain border border-subtle p-0.5 bg-surface-inverse flex-shrink-0"
            />
          ) : isAuthenticated && user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={activeName}
              className="w-5 h-5 rounded-full border border-subtle object-cover flex-shrink-0"
            />
          ) : isAuthenticated && user ? (
            <div className="w-5 h-5 rounded-full bg-surface-sunken border border-subtle flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
              {activeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-surface-sunken border border-subtle flex items-center justify-center text-muted flex-shrink-0">
              <User className="w-3 h-3" />
            </div>
          )}

          <span className="font-semibold text-primary text-xs max-w-[80px] sm:max-w-[110px] truncate transition-colors">
            {activeName}
          </span>

          <span className={`px-1 py-0.5 rounded text-[11px] font-semibold font-mono ${gamification.currentRank.badgeColor} bg-surface-inverse border border-current`}>
            {gamification.currentRank.tier}
          </span>

          <ChevronDown className="w-3 h-3 text-muted group-hover:text-primary transition-transform" />
        </button>
      </div>

      {/* Control Station Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl bg-surface-elevated border border-subtle shadow-2xl z-50 space-y-3"
          onMouseLeave={() => setDropdownOpen(false)}
        >
          {/* User Status Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-subtle">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.avatarId ? (
                <img
                  src={getAvatarSvgDataUri(user.avatarId)}
                  alt={activeName}
                  className="w-10 h-10 rounded-xl border border-subtle bg-surface-inverse p-1 object-contain flex-shrink-0"
                />
              ) : isAuthenticated && user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={activeName}
                  className="w-10 h-10 rounded-xl border border-subtle object-cover flex-shrink-0"
                />
              ) : isAuthenticated && user ? (
                <div className="w-10 h-10 rounded-xl bg-surface-card border border-subtle flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {activeName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-surface-sunken border border-subtle flex items-center justify-center text-muted flex-shrink-0">
                  <HardDrive className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-primary text-sm truncate flex items-center gap-1.5">
                  <span>{activeName}</span>
                </div>
                <div className="text-[11px] text-muted truncate flex items-center gap-1">
                  <span className={`font-semibold ${gamification.currentRank.badgeColor}`}>
                    {gamification.currentRank.tier} {gamification.currentRank.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                  <span className="text-secondary font-medium">
                    {gamification.totalXp.toLocaleString()} XP
                  </span>
                  <span className="text-muted">•</span>
                  <span className="text-secondary font-medium">
                    {gamification.unlockedCount}/16 trophies
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-primary font-mono tabular-nums">{rootedCount} / {totalCount}</div>
              <div className="text-[11px] text-muted">Pwned</div>
            </div>
          </div>

          {/* Quick Trophy Case & Rank Progress Pill */}
          <div 
            onClick={() => {
              setDropdownOpen(false);
              useAuthStore.getState().setOperatorProfileModalOpen(true);
            }}
            className="p-2.5 rounded-xl bg-surface-inverse border border-inverse hover:border-strong cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-on-inverse-muted group-hover:text-on-inverse flex items-center gap-1 font-medium">
                <Trophy className="w-3.5 h-3.5" />
                <span>Trophies and ranks</span>
              </span>
              <span className="text-on-inverse font-medium font-mono tabular-nums">
                {gamification.nextRank ? `${gamification.rankProgressPct}%` : 'Max'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-inverse-elevated overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-300"
                style={{ width: `${gamification.rankProgressPct}%` }}
              />
            </div>
          </div>

          {/* 1-Click Large Save Button */}
          <button
            onClick={handleQuickSave}
            className={`w-full py-2.5 px-3 rounded-xl font-medium text-xs transition-[background-color,border-color,color,transform] active:scale-[0.97] flex items-center justify-center gap-2 bg-accent text-on-accent hover:brightness-105`}
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to browser storage</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save progress</span>
              </>
            )}
          </button>

          {/* 1-Click Backup Export & Restore */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportBackup}
              className="p-2 max-sm:py-3 rounded-xl bg-surface-card hover:bg-surface-hover border border-subtle text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              title="Download backup file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export backup</span>
            </button>

            <button
              onClick={handleImportBackup}
              className="p-2 max-sm:py-3 rounded-xl bg-surface-card hover:bg-surface-hover border border-subtle text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              title="Upload backup file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import backup</span>
            </button>
          </div>

          {/* Operator & Creator Showcase */}
          <div className="p-2.5 rounded-xl bg-surface-sunken border border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-secondary truncate">
                  Built by Daniel Dayan
                </span>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setOperatorModalOpen(true);
                }}
                className="text-xs font-medium text-accent hover:underline"
              >
                Dossier
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <a
                href={CREATOR_PROFILE_LINKS.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-surface-card hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-[background-color,border-color,color] text-xs font-medium"
                title="Daniel Dayan's Official Portfolio"
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Portfolio</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-surface-card hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-[background-color,border-color,color] text-xs font-medium"
                title="Daniel Dayan LinkedIn Profile"
              >
                <svg className="w-3 h-3 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
                <span className="truncate">LinkedIn</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-surface-card hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-[background-color,border-color,color] text-xs font-medium"
                title="Buy Daniel Dayan a Coffee (buymeacoffee.com/0xdnd)"
              >
                <Coffee className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Coffee</span>
              </a>
            </div>
          </div>

          {/* Operator Profile Management & Sign Out */}
          <div className="pt-2 border-t border-subtle space-y-2">
            <div>
              <div className="text-[11px] text-muted mb-1.5 flex items-center justify-between">
                <span>Operator profile</span>
                <span className="text-[11px] text-muted">Local, offline</span>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  useAuthStore.getState().setOperatorProfileModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 max-sm:py-3 px-3 rounded-xl bg-surface-card hover:bg-surface-hover border border-subtle font-medium text-xs transition-[background-color,border-color,color] group text-primary"
                title="Switch or create local operator profiles"
              >
                <User className="w-3.5 h-3.5" />
                <span>Switch or manage profiles</span>
              </button>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
                className="w-full py-2 max-sm:py-3 px-3 rounded-xl bg-callout-danger-bg hover:brightness-110 border border-callout-danger-border text-callout-danger-fg font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out to guest</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setSettingsModalOpen(true);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="w-full py-1.5 max-sm:py-3 px-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-muted hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                title="Open Operator Settings"
              >
                <Settings className="w-3 h-3" />
                <span>Settings</span>
              </button>

              <button
                onClick={handleReset}
                className="w-full py-1.5 max-sm:py-3 px-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-muted hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                title="Reset all target progress"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset CTF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
