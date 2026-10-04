import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  User, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Check, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Terminal, 
  Target, 
  Flag, 
  Layers, 
  HardDrive, 
  ArrowRight,
  RefreshCw,
  Award,
  RotateCcw,
  Trophy,
  Lock,
  Unlock,
  Zap,
  Crown
} from 'lucide-react';
import { useAuthStore, DEFAULT_DANIEL_PROFILE } from '../../store/useAuthStore';
import { useCtfStore, safeLocalStorage, getProfileStorageKey } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';
import { OperatorLoginOptions } from '../../types/auth';
import { CYBER_AVATAR_PRESETS, getAvatarSvgDataUri } from '../../data/avatarPresets';
import { evaluateOperatorGamification, syncOperatorTrophies } from '../../utils/gamificationEngine';
import { TrophyCategory } from '../../types/gamification';

const ROLE_OPTIONS = [
  { id: 'Tactical CTF Operator', label: 'General CTF Operator', icon: Target },
  { id: 'Web Exploitation Specialist', label: 'Web Exploit Specialist', icon: Terminal },
  { id: 'Active Directory / Red Team', label: 'Active Directory / Red Team', icon: Layers },
  { id: 'Certification Candidate (OSCP/CPTS)', label: 'Cert Candidate (OSCP/CPTS)', icon: Award },
  { id: 'Reverse Engineer / Binary Ninja', label: 'Reverse Engineer / Pwn', icon: Sparkles },
];

const ACCENT_COLORS = [
  { id: 'emerald', name: 'Tactical Emerald', bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  { id: 'cyan', name: 'Electric Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/50' },
  { id: 'amber', name: 'Warning Amber', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/50' },
  { id: 'crimson', name: 'Red Team Crimson', bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/50' },
  { id: 'purple', name: 'Domain Purple', bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/50' },
];

export const OperatorProfileModal: React.FC = () => {
  const {
    user,
    profiles,
    operatorProfileModalOpen,
    setOperatorProfileModalOpen,
    loginAsOperator,
    switchProfile,
    renameProfile,
    updateProfile,
    deleteProfile,
    updateUserTrophies,
  } = useAuthStore();

  const { 
    machines, 
    soundEnabled, 
    userSolvesReset, 
    resetSolvesToZero, 
    restoreDanielSolves 
  } = useCtfStore();

  const [activeTab, setActiveTab] = useState<'roster' | 'new' | 'trophies'>('roster');
  const [operatorName, setOperatorName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('glitch-skull');
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0].id);
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [workspaceMode, setWorkspaceMode] = useState<'fresh' | 'clone'>('fresh');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isEditingActiveCallsign, setIsEditingActiveCallsign] = useState(false);
  const [activeCallsignInput, setActiveCallsignInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trophyCategoryFilter, setTrophyCategoryFilter] = useState<'all' | TrophyCategory>('all');

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Gamification & Trophies Evaluator
  const gamification = useMemo(() => {
    return evaluateOperatorGamification({
      machines,
      unlockedTrophies: user?.unlockedTrophies,
    });
  }, [machines, user?.unlockedTrophies]);

  // Synchronize newly unlocked trophies and save timestamps immutably
  useEffect(() => {
    if (!user) return;
    const { newlyUnlocked, updatedTrophies } = syncOperatorTrophies(
      user.unlockedTrophies,
      gamification.trophies
    );
    if (newlyUnlocked.length > 0) {
      updateUserTrophies(
        updatedTrophies,
        gamification.totalXp,
        gamification.currentRank.tier,
        gamification.currentRank.title
      );
    }
  }, [gamification.trophies, gamification.totalXp, gamification.currentRank, user, updateUserTrophies]);

  // Close on Escape & trap focus
  useEffect(() => {
    if (!operatorProfileModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOperatorProfileModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [operatorProfileModalOpen, setOperatorProfileModalOpen]);

  // Focus input when switching to "new" tab
  useEffect(() => {
    if (activeTab === 'new' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeTab]);

  // Machine status aggregations
  const currentRooted = useMemo(() => {
    return machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
  }, [machines]);

  const currentFootholds = useMemo(() => {
    return machines.filter((m) => m.status === 'foothold').length;
  }, [machines]);

  // Compute profile statistics
  const profileStatsMap = useMemo(() => {
    const stats: Record<string, { totalPwned: number; rooted: number; footholds: number }> = {};

    profiles.forEach((p) => {
      if (user && p.id === user.id) {
        const rooted = machines.filter((m) => m.status === 'root' || m.status === 'completed').length;
        const footholds = machines.filter((m) => m.status === 'foothold').length;
        stats[p.id] = { totalPwned: rooted + footholds, rooted, footholds };
      } else {
        const raw = safeLocalStorage.getItem(getProfileStorageKey(p.id));
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const machs = Array.isArray(data.machines) ? data.machines : [];
            const rooted = machs.filter((m: any) => m.status === 'root' || m.status === 'completed').length;
            const footholds = machs.filter((m: any) => m.status === 'foothold').length;
            stats[p.id] = { totalPwned: rooted + footholds, rooted, footholds };
          } catch {
            stats[p.id] = { totalPwned: 0, rooted: 0, footholds: 0 };
          }
        } else {
          // If no stored payload yet, default
          stats[p.id] = { totalPwned: 0, rooted: 0, footholds: 0 };
        }
      }
    });

    return stats;
  }, [profiles, user, machines]);

  const currentStats = user 
    ? profileStatsMap[user.id] || { totalPwned: currentRooted + currentFootholds, rooted: currentRooted, footholds: currentFootholds }
    : { totalPwned: currentRooted + currentFootholds, rooted: currentRooted, footholds: currentFootholds };

  const handleCreateOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = operatorName.trim().slice(0, 24);
    if (!clean) {
      setErrorMsg('Please enter an operator callsign or name');
      return;
    }

    setErrorMsg(null);
    const opts: OperatorLoginOptions = {
      name: clean,
      callsign: clean,
      avatarId: selectedAvatarId,
      role: selectedRole,
      badgeColor: selectedColor,
      startFresh: workspaceMode === 'fresh',
      cloneFromCurrent: workspaceMode === 'clone',
    };

    await loginAsOperator(opts);
    if (soundEnabled) playCyberSound('root');
    setOperatorName('');
    setOperatorProfileModalOpen(false);
  };

  const handleSwitchOperator = (profileId: string) => {
    if (user?.id === profileId) return;
    switchProfile(profileId);
    if (soundEnabled) playCyberSound('engage');
  };

  const handleSaveActiveCallsign = () => {
    const clean = activeCallsignInput.trim().slice(0, 24);
    if (clean && user) {
      updateProfile(user.id, {
        callsign: clean,
        name: clean,
      });
      if (soundEnabled) playCyberSound('root');
    }
    setIsEditingActiveCallsign(false);
  };

  const handleSaveRename = (profileId: string) => {
    const clean = editingName.trim().slice(0, 24);
    if (clean) {
      updateProfile(profileId, {
        name: clean,
        callsign: clean,
      });
      if (soundEnabled) playCyberSound('root');
    }
    setEditingProfileId(null);
  };

  const handleDeleteProfile = (profileId: string, name: string) => {
    if (profiles.length <= 1) {
      alert('Cannot delete the last active operator profile.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete profile "${name}"? All isolated progress for this operator will be permanently removed.`)) {
      deleteProfile(profileId);
      if (soundEnabled) playCyberSound('toggle');
    }
  };

  // Safe early exit placed immediately before JSX render to preserve strict hook execution order
  if (!operatorProfileModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={() => setOperatorProfileModalOpen(false)}
      />

      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Operator Identity and Profile Hub"
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c1222] border border-slate-300 dark:border-cyber-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] font-sans transition-[box-shadow,background-color,border-color,color] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-cyber-border/80 flex items-center justify-between bg-slate-50/80 dark:bg-cyber-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyber-cyan/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyber-cyan shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide text-slate-900 dark:text-white">
                  Operator Identity & Profiles
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-cyber-emerald border border-emerald-500/30 font-mono">
                  OFFLINE READY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-cyber-muted">
                100% offline project. Log in with your callsign, switch operators, or explore creator reference solves.
              </p>
            </div>
          </div>

          <button
            onClick={() => setOperatorProfileModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-cyber-bg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Operator Banner */}
        {user ? (
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent border-b border-slate-200 dark:border-cyber-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.avatarId ? (
                  <img
                    src={getAvatarSvgDataUri(user.avatarId)}
                    alt={user.callsign || user.name}
                    className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-emerald-500 p-0.5 object-contain shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-cyber-emerald font-bold text-sm shadow-sm font-mono">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1222]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isEditingActiveCallsign ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={activeCallsignInput}
                        maxLength={24}
                        onChange={(e) => setActiveCallsignInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveActiveCallsign();
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setIsEditingActiveCallsign(false);
                          }
                        }}
                        className="px-2 py-0.5 text-xs font-mono font-bold rounded-lg border border-cyan-500 bg-white dark:bg-cyber-bg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        autoFocus
                        placeholder="New Callsign"
                      />
                      <button
                        type="button"
                        onClick={handleSaveActiveCallsign}
                        className="p-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                        title="Save Callsign (Enter)"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingActiveCallsign(false)}
                        className="p-1 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Cancel (Esc)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {user.callsign || user.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingActiveCallsign(true);
                          setActiveCallsignInput(user.callsign || user.name);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-cyan-500 dark:hover:text-cyber-cyan hover:bg-slate-200/50 dark:hover:bg-cyber-bg transition-colors cursor-pointer"
                        title="Quick-Edit Active Callsign"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${gamification.currentRank.badgeColor} bg-black/30 border border-current font-mono`}>
                        [{gamification.currentRank.tier}] {gamification.currentRank.title}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-cyber-muted flex items-center gap-2">
                  <span>{user.role || 'Tactical Operator'}</span>
                  <span>•</span>
                  <span className="font-mono text-cyan-600 dark:text-cyber-cyan font-bold">{gamification.totalXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-right">
              <div>
                <div className="text-sm font-bold text-emerald-600 dark:text-cyber-emerald">
                  {currentStats?.rooted || 0} Rooted
                </div>
                <div className="text-[10px] text-slate-500 dark:text-cyber-muted">
                  {gamification.unlockedCount} / 16 Trophies
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 bg-gradient-to-r from-cyan-500/10 via-slate-500/5 to-transparent border-b border-slate-200 dark:border-cyber-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border flex items-center justify-center text-slate-700 dark:text-cyber-muted font-bold text-xs shadow-sm font-mono">
                OP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Local / Guest Operator
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyber-cyan border border-cyan-500/40">
                    AIR-GAPPED
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-cyber-muted">
                  Offline CTF workspace. Enter your callsign in "Login as New Operator" to save your personal profile.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-right">
              <div>
                <div className="text-sm font-bold text-emerald-600 dark:text-cyber-emerald">
                  {currentRooted} Rooted
                </div>
                <div className="text-[10px] text-slate-500 dark:text-cyber-muted">
                  {currentFootholds} Footholds
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Workspace Solves Lifecycle Banner */}
        <div className="px-5 py-2.5 bg-slate-100/80 dark:bg-cyber-bg/70 border-b border-slate-200 dark:border-cyber-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyber-cyan/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyber-cyan flex-shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Workspace Solves:</span>
                {userSolvesReset ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-mono">
                    Personal Practice (0 Solves)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-mono">
                    Creator Showcase (63 Solves)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-cyber-muted">
                {userSolvesReset
                  ? 'Tracking your own progress from 0%. All 929 targets ready.'
                  : 'Daniel Dayan\'s solved machines are loaded as reference walkthroughs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {userSolvesReset ? (
              <button
                type="button"
                onClick={() => {
                  restoreDanielSolves();
                  if (soundEnabled) playCyberSound('engage');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Load Daniel's 63 solved machines as a reference baseline"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Load Reference Solves (63)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all catalog solves to 0 so you can track your own progress? (You can restore reference solves anytime).')) {
                    resetSolvesToZero();
                    if (soundEnabled) playCyberSound('root');
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Start fresh at 0% to track your own CTF conquests"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reset to My Solves (0)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-cyber-border/60 bg-slate-100/60 dark:bg-cyber-bg/40 px-5 pt-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyber-cyan'
                : 'border-transparent text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Operator Roster ({profiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyber-cyan'
                : 'border-transparent text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Login as New Operator</span>
          </button>
          <button
            onClick={() => setActiveTab('trophies')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'trophies'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyber-cyan'
                : 'border-transparent text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Trophy Case & Ranks ({gamification.unlockedCount}/16)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'roster' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-cyber-muted flex items-center justify-between">
                <span>Select an operator to switch workspaces immediately:</span>
                <span className="font-mono text-[11px]">{profiles.length} Operator{profiles.length > 1 ? 's' : ''} Configured</span>
              </div>

              {profiles.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-cyber-border text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyber-cyan flex items-center justify-center mx-auto">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    No custom profiles created yet
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-cyber-muted max-w-sm mx-auto">
                    You are operating in local storage. Create your own named operator profile to track your solves, or explore Daniel's creator reference profile below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {profiles.map((p) => {
                  const isActive = user?.id === p.id;
                  const stats = profileStatsMap[p.id] || { totalPwned: 0, rooted: 0, footholds: 0 };
                  const isEditing = editingProfileId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border transition-colors flex flex-col justify-between ${
                        isActive
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/50 dark:border-cyber-emerald/50 shadow-sm'
                          : 'bg-slate-50 dark:bg-cyber-card/60 hover:bg-slate-100 dark:hover:bg-cyber-card border-slate-200 dark:border-cyber-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.avatarId ? (
                            <img
                              src={getAvatarSvgDataUri(p.avatarId)}
                              alt={p.name}
                              className={`w-8 h-8 rounded-lg p-0.5 object-contain flex-shrink-0 border ${
                                isActive ? 'border-emerald-500 bg-slate-900' : 'border-slate-300 dark:border-cyber-border bg-slate-100 dark:bg-cyber-bg'
                              }`}
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-mono flex-shrink-0 ${
                              isActive
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 dark:bg-cyber-bg text-slate-700 dark:text-slate-300'
                            }`}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingName}
                                  maxLength={24}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(p.id);
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      setEditingProfileId(null);
                                    }
                                  }}
                                  className="px-2 py-0.5 text-xs rounded border border-cyan-500 bg-white dark:bg-cyber-bg text-slate-900 dark:text-white font-mono focus:outline-none"
                                  autoFocus
                                  placeholder="Callsign"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(p.id)}
                                  className="p-1 rounded bg-cyan-500 text-white hover:bg-cyan-600 transition-colors cursor-pointer"
                                  title="Save Callsign (Enter)"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProfileId(null)}
                                  className="p-1 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                  title="Cancel (Esc)"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {p.callsign || p.name}
                                </span>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 dark:text-cyber-muted truncate">
                              {p.role || 'Tactical Operator'}
                            </div>
                          </div>
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingProfileId(p.id);
                                setEditingName(p.name);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Rename Call-sign"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {profiles.length > 1 && (
                              <button
                                onClick={() => handleDeleteProfile(p.id, p.name)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete Profile"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-cyber-border/40 flex items-center justify-between text-xs">
                        <div className="font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                          <span className="font-bold text-emerald-600 dark:text-cyber-emerald">{stats.rooted}</span> Rooted · <span className="text-amber-500">{stats.footholds}</span> Footholds
                        </div>

                        {isActive ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-cyber-emerald flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchOperator(p.id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-200 hover:bg-cyan-500 hover:text-white dark:bg-cyber-bg dark:hover:bg-cyber-cyan dark:hover:text-black transition-colors flex items-center gap-1"
                          >
                            <span>Switch</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Creator Showcase Reference Profile Card */}
                {!profiles.some((p) => p.id === 'usr_daniel' || p.name.toLowerCase() === 'daniel') && (
                  <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getAvatarSvgDataUri('terminal-sentinel')}
                          alt="Daniel Dayan"
                          className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-500/50 p-0.5 object-contain flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              Daniel Dayan
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40">
                              CREATOR SHOWCASE
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-cyber-muted truncate">
                            Lead Pentester · 63 Verified Solves
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-purple-500/20 flex items-center justify-between text-xs">
                      <div className="font-mono text-[11px] text-purple-700 dark:text-purple-300">
                        <span className="font-bold">63</span> Rooted Machines
                      </div>

                      <button
                        onClick={async () => {
                          await loginAsOperator(DEFAULT_DANIEL_PROFILE);
                          await restoreDanielSolves();
                          if (soundEnabled) playCyberSound('engage');
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 hover:bg-purple-500 hover:text-white dark:bg-purple-900/30 dark:hover:bg-purple-500 dark:hover:text-white text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Explore Showcase</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('new')}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-cyber-border/80 hover:border-cyan-500 dark:hover:border-cyber-cyan text-slate-600 dark:text-cyber-muted hover:text-cyan-600 dark:hover:text-cyber-cyan text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Log in as a Different / New Operator</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleCreateOrLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                  Operator Name or Callsign <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={24}
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Sarah, Alex, GhostNinja"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:focus:ring-cyber-cyan transition-[box-shadow,background-color,border-color,color]"
                  required
                />
                <span className="text-[10px] text-slate-400 dark:text-cyber-muted mt-0.5 block">
                  Entering an existing callsign logs directly into that operator's saved progress.
                </span>
              </div>

              {/* Tactical Avatar Preset Matrix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1.5 flex items-center justify-between">
                  <span>Tactical Avatar Preset</span>
                  <span className="text-[11px] font-mono text-cyan-600 dark:text-cyber-cyan">
                    {CYBER_AVATAR_PRESETS.find(p => p.id === selectedAvatarId)?.name || 'Glitch Skull'}
                  </span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {CYBER_AVATAR_PRESETS.map((avatar) => {
                    const isSelected = selectedAvatarId === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(avatar.id)}
                        className={`group relative p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500 shadow-md ring-2 ring-cyan-500/50 scale-105'
                            : 'bg-slate-50 dark:bg-cyber-bg/80 border-slate-200 dark:border-cyber-border hover:border-cyan-500/50'
                        }`}
                        title={`${avatar.name}: ${avatar.description}`}
                      >
                        <img
                          src={avatar.dataUri}
                          alt={avatar.name}
                          className="w-10 h-10 object-contain rounded-lg p-0.5 transition-transform group-hover:scale-105"
                        />
                        <span className="text-[9px] font-mono font-medium truncate w-full text-center text-slate-600 dark:text-zinc-300">
                          {avatar.name.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                  Tactical Role / Specialization
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ROLE_OPTIONS.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-2 rounded-lg text-left text-xs font-medium border transition-colors flex items-center gap-2 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyber-cyan font-bold'
                            : 'bg-slate-50 dark:bg-cyber-card border-slate-200 dark:border-cyber-border text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <r.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                  Callsign Theme Accent
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center transition-transform ${
                        selectedColor === c.id ? 'ring-2 ring-offset-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 mb-1">
                  Workspace Initialization (For New Operators)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setWorkspaceMode('fresh')}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      workspaceMode === 'fresh'
                        ? 'bg-cyan-500/10 border-cyan-500 dark:border-cyber-cyan'
                        : 'bg-slate-50 dark:bg-cyber-card border-slate-200 dark:border-cyber-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <span>🌟 Fresh Clean Slate</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-cyber-emerald">Recommended</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-cyber-muted mt-1 leading-snug">
                      929 targets loaded with 0 solved machines. Clean flags and notes for a fresh CTF journey.
                    </p>
                  </div>

                  <div
                    onClick={() => setWorkspaceMode('clone')}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      workspaceMode === 'clone'
                        ? 'bg-cyan-500/10 border-cyan-500 dark:border-cyber-cyan'
                        : 'bg-slate-50 dark:bg-cyber-card border-slate-200 dark:border-cyber-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                      <span>📋 Fork Current Progress</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-cyber-muted mt-1 leading-snug">
                      Clone active machines, solved flags, and notes to continue collaborating or testing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-cyber-border/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-cyber-muted hover:bg-slate-100 dark:hover:bg-cyber-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 dark:bg-cyber-cyan dark:hover:bg-cyan-400 text-white dark:text-black transition-[box-shadow,background-color,border-color,color] flex items-center gap-1.5 shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Log in as {operatorName.trim() || 'Operator'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'trophies' && (
            <div className="space-y-4">
              {/* Rank Progression Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border border-slate-700/60 text-white shadow-lg relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-cyan-500/50 flex items-center justify-center text-2xl shadow-inner font-mono">
                      🏆
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono tracking-wider text-cyan-400 font-bold uppercase">
                          OPERATOR STATUS
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gamification.currentRank.badgeColor} bg-black/40 border border-current font-mono`}>
                          [{gamification.currentRank.tier}]
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {gamification.currentRank.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {gamification.currentRank.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Total Experience</div>
                    <div className="text-xl font-black text-cyan-300">
                      {gamification.totalXp.toLocaleString()} <span className="text-xs text-cyan-500 font-semibold">XP</span>
                    </div>
                  </div>
                </div>

                {/* Progress to Next Rank */}
                <div className="mt-4 pt-3 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-400">
                      {gamification.nextRank ? `Next: [${gamification.nextRank.tier}] ${gamification.nextRank.title}` : 'Max Tactical Rank Achieved!'}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {gamification.nextRank ? `${gamification.rankProgressPct}%` : '100%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-colors duration-500 ease-out"
                      style={{ width: `${gamification.rankProgressPct}%` }}
                    />
                  </div>
                  {gamification.nextRank && (
                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                      <span>{gamification.currentRank.minXp.toLocaleString()} XP</span>
                      <span>{gamification.nextRank.minXp.toLocaleString()} XP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactical Stats Quick Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-cyber-card/60 border border-slate-200 dark:border-cyber-border text-center">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-cyber-muted uppercase">Rooted Targets</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-cyber-emerald font-mono">
                    {gamification.stats.rootedMachines}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-cyber-card/60 border border-slate-200 dark:border-cyber-border text-center">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-cyber-muted uppercase">Flags Captured</div>
                  <div className="text-base font-bold text-cyan-600 dark:text-cyber-cyan font-mono">
                    {gamification.stats.totalFlags}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-cyber-card/60 border border-slate-200 dark:border-cyber-border text-center">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-cyber-muted uppercase">Nmap Scans</div>
                  <div className="text-base font-bold text-amber-500 font-mono">
                    {gamification.stats.nmapScansCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-cyber-card/60 border border-slate-200 dark:border-cyber-border text-center">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-cyber-muted uppercase">Trophies Unlocked</div>
                  <div className="text-base font-bold text-purple-500 font-mono">
                    {gamification.unlockedCount} / 16
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(['all', 'combat', 'recon', 'ad', 'exam', 'mastery', 'lore'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTrophyCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${
                      trophyCategoryFilter === cat
                        ? 'bg-cyan-500 text-white dark:bg-cyber-cyan dark:text-black shadow-sm'
                        : 'bg-slate-100 dark:bg-cyber-card text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-cyber-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 16-Trophy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {gamification.trophies
                  .filter((t) => trophyCategoryFilter === 'all' || t.definition.category === trophyCategoryFilter)
                  .map((trophy) => {
                    const isUnlocked = trophy.unlocked;
                    const rarityColors: Record<string, string> = {
                      common: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
                      rare: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
                      epic: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
                      legendary: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
                    };
                    const badgeClass = rarityColors[trophy.definition.rarity] || rarityColors.common;

                    return (
                      <div
                        key={trophy.definition.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col justify-between ${
                          isUnlocked
                            ? 'bg-slate-900/60 dark:bg-cyber-card border-cyan-500/40 shadow-sm'
                            : 'bg-slate-100/50 dark:bg-cyber-bg/40 border-slate-200/80 dark:border-cyber-border/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${
                            isUnlocked
                              ? 'bg-slate-800 border-cyan-500/50 shadow-inner'
                              : 'bg-slate-200 dark:bg-cyber-bg border-slate-300 dark:border-cyber-border grayscale opacity-60'
                          }`}>
                            <Award className="w-5 h-5 text-cyan-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-bold ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}>
                                {trophy.definition.title}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${badgeClass}`}>
                                {trophy.definition.rarity}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-cyber-muted mt-0.5 line-clamp-2">
                              {trophy.definition.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-cyber-border/40 flex items-center justify-between text-xs">
                          <div className="font-mono text-[10px]">
                            {isUnlocked ? (
                              <span className="text-emerald-500 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>UNLOCKED {trophy.unlockedAt ? new Date(trophy.unlockedAt).toLocaleDateString() : ''}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>{trophy.currentCount} / {trophy.targetCount}</span>
                              </span>
                            )}
                          </div>

                          <div className="font-mono font-bold text-[11px] text-cyan-600 dark:text-cyber-cyan">
                            +{trophy.definition.xpReward} XP
                          </div>
                        </div>

                        {!isUnlocked && trophy.targetCount > 1 && (
                          <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-cyan-500"
                              style={{ width: `${trophy.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Air-gapped security note */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border/50 text-[11px] text-slate-500 dark:text-cyber-muted flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              <strong>Zero-Egress Isolation:</strong> All operator profiles and machine progress are partitioned in your local browser storage. Zero data is transmitted to external servers.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
