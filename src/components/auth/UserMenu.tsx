import React, { useState } from 'react';
import { useAuthStore, PUBLIC_GOOGLE_CLIENT_ID } from '../../store/useAuthStore';
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
  ExternalLink
} from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { 
    user, 
    isAuthenticated,
    googleClientId,
    loginWithGoogleUserInfo,
    logout 
  } = useAuthStore();

  const { 
    machines, 
    currentProfileId, 
    saveProfileData, 
    exportBackup, 
    importBackup, 
    resetAllProgress,
    setOperatorModalOpen
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      currentProfileId: s.currentProfileId,
      saveProfileData: s.saveProfileData,
      exportBackup: s.exportBackup,
      importBackup: s.importBackup,
      resetAllProgress: s.resetAllProgress,
      setOperatorModalOpen: s.setOperatorModalOpen,
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

  const activeName = user?.name || 'Local Operator';
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

  // Launch Official Google Sign-In Popup
  const handleLaunchGoogleSignIn = () => {
    const activeId = (googleClientId || PUBLIC_GOOGLE_CLIENT_ID).trim();

    if (typeof window !== 'undefined') {
      const w = window as any;

      // 1. Google Identity Services standard token client
      if (w.google?.accounts?.oauth2) {
        try {
          const client = w.google.accounts.oauth2.initTokenClient({
            client_id: activeId,
            scope: 'openid profile email',
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.access_token) {
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const userInfo = await res.json();
                  await loginWithGoogleUserInfo(userInfo, tokenResponse.access_token);
                  setDropdownOpen(false);
                  playCyberSound('root');
                } catch (e) {
                  console.error('Google userinfo fetch failed:', e);
                }
              }
            },
          });
          client.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (err) {
          console.error('Error initiating Google OAuth:', err);
        }
      }

      // 2. Direct browser Google OAuth 2.0 popup window
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        activeId
      )}&redirect_uri=${encodeURIComponent(
        window.location.origin
      )}&response_type=token&scope=${encodeURIComponent('openid profile email')}&prompt=select_account`;

      window.open(authUrl, '_blank', 'width=520,height=620,menubar=no,status=no,toolbar=no');
    }
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
    <div ref={menuRef} className="relative font-mono text-xs">
      {/* Header Button Group: 1-Click Save + Profile / Local Operator Badge */}
      <div className="flex items-center gap-1.5 bg-cyber-card/90 border border-cyber-border rounded-xl p-1 shadow-sm">
        {/* Instant 1-Click Quick Save Button */}
        <button
          onClick={handleQuickSave}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
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
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-cyber-bg transition-colors group"
          title={isAuthenticated && user ? `Google Account: ${user.name} (${user.email})` : 'Local Mode: Offline & Zero Cloud Egress'}
        >
          {isAuthenticated && user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={activeName}
              className="w-5 h-5 rounded-full border border-cyber-emerald/60 object-cover"
            />
          ) : isAuthenticated && user ? (
            <div className="w-5 h-5 rounded-full bg-cyber-emerald/20 border border-cyber-emerald flex items-center justify-center text-[9px] font-bold text-cyber-emerald">
              {activeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/50 flex items-center justify-center text-cyber-cyan">
              <User className="w-3 h-3" />
            </div>
          )}

          <span className="font-bold text-slate-900 dark:text-white text-xs max-w-[100px] truncate group-hover:text-cyber-cyan transition-colors">
            {isAuthenticated && user ? activeName : 'Local Operator'}
          </span>

          <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated ? 'bg-cyber-emerald' : 'bg-cyber-cyan'} animate-pulse`} />

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
              {isAuthenticated && user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={activeName}
                  className="w-10 h-10 rounded-full border-2 border-cyber-emerald shadow-[0_0_8px_rgba(16,185,129,0.3)] object-cover"
                />
              ) : isAuthenticated && user ? (
                <div className="w-10 h-10 rounded-full bg-cyber-bg border-2 border-cyber-emerald flex items-center justify-center text-sm font-bold text-cyber-emerald">
                  {activeName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyber-cyan/15 border-2 border-cyber-cyan/60 flex items-center justify-center text-cyber-cyan">
                  <HardDrive className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {isAuthenticated && user ? activeName : 'LOCAL OPERATOR (PRIVATE)'}
                </div>
                <div className="text-[10px] text-cyber-muted truncate">
                  {isAuthenticated && user?.email ? user.email : 'Local Storage · Zero Egress'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {isAuthenticated ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyber-emerald bg-cyber-emerald/10 border border-cyber-emerald/30 px-1.5 py-0.2 rounded">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      GOOGLE AUTHENTICATED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-1.5 py-0.2 rounded">
                      <HardDrive className="w-2.5 h-2.5" />
                      LOCAL / OFFLINE MODE
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-cyber-emerald">{rootedCount} / {totalCount}</div>
              <div className="text-[9px] text-cyber-muted uppercase">Pwned</div>
            </div>
          </div>

          {/* 1-Click Large Save Button */}
          <button
            onClick={handleQuickSave}
            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
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
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald hover:text-white border border-cyber-emerald/50 transition-all text-[10px] font-bold shadow-sm"
                title="Daniel Dayan's Official Portfolio"
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">PORTFOLIO</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#0077B5]/20 hover:bg-[#0077B5]/30 text-[#0077B5] hover:text-white border border-[#0077B5]/50 transition-all text-[10px] font-bold shadow-sm"
                title="Daniel Dayan LinkedIn Profile"
              >
                <svg className="w-3 h-3 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.7a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"/></svg>
                <span className="truncate">LINKEDIN</span>
              </a>
              <a
                href={CREATOR_PROFILE_LINKS.coffee}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#FFDD00]/20 hover:bg-[#FFDD00]/30 text-[#FFDD00] hover:text-white border border-[#FFDD00]/50 transition-all text-[10px] font-bold shadow-sm"
                title="Buy Daniel Dayan a Coffee (buymeacoffee.com/xxdndxx)"
              >
                <Coffee className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">COFFEE</span>
              </a>
            </div>
          </div>

          {/* Google Auth Option: Connect or Sign Out */}
          <div className="pt-2 border-t border-cyber-border/70 space-y-2">
            {!isAuthenticated ? (
              <div>
                <div className="text-[10px] text-cyber-muted mb-1.5 flex items-center justify-between">
                  <span>OPTIONAL CLOUD SYNC:</span>
                  <span className="text-[9px] text-cyber-emerald">MULTI-DEVICE</span>
                </div>
                <button
                  onClick={handleLaunchGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-gray-100 text-gray-800 dark:bg-cyber-bg dark:hover:bg-cyber-card dark:text-gray-100 dark:border-cyber-border font-bold text-xs transition-all shadow-md border border-gray-300 group"
                  title="Optionally sign in with your Google account for cloud synchronization"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google (Optional)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-cyber-crimson/15 hover:bg-cyber-crimson border border-cyber-crimson/30 hover:border-cyber-crimson text-cyber-crimson hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SIGN OUT FROM GOOGLE</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="w-full py-1.5 px-2 rounded-lg bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3 text-cyber-amber" />
              <span>Reset CTF Progress</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
