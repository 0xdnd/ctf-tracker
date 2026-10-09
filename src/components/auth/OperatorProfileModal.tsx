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
  Layers, 
  ArrowRight,
  Award,
  RotateCcw,
  Trophy,
  Lock} from 'lucide-react';
import { useAuthStore, DEFAULT_DANIEL_PROFILE } from '../../store/useAuthStore';
import { useCtfStore, safeLocalStorage, getProfileStorageKey } from '../../store/useCtfStore';
import { confirmAction } from '../../store/useConfirmStore';
import { toast } from '../../store/useToastStore';
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
  { id: 'emerald', name: 'Tactical Emerald', bg: 'bg-callout-success-fg', text: 'text-callout-success-fg', border: 'border-callout-success-border' },
  { id: 'cyan', name: 'Electric Cyan', bg: 'bg-accent', text: 'text-accent', border: 'border-subtle' },
  { id: 'amber', name: 'Warning Amber', bg: 'bg-callout-warn-fg', text: 'text-callout-warn-fg', border: 'border-callout-warn-border' },
  { id: 'crimson', name: 'Red Team Crimson', bg: 'bg-callout-danger-fg', text: 'text-callout-danger-fg', border: 'border-callout-danger-border' },
  { id: 'purple', name: 'Domain Purple', bg: 'bg-callout-tip-fg', text: 'text-callout-tip-fg', border: 'border-callout-tip-border' },
];

export const OperatorProfileModal: React.FC = () => {
  const {
    user,
    profiles,
    operatorProfileModalOpen,
    setOperatorProfileModalOpen,
    loginAsOperator,
    switchProfile,
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

  const handleDeleteProfile = async (profileId: string, name: string) => {
    if (profiles.length <= 1) {
      toast.error('Cannot delete the last active operator profile.');
      return;
    }
    const ok = await confirmAction({
      title: `Delete profile "${name}"?`,
      body: 'All isolated progress for this operator will be permanently removed.',
      confirmLabel: 'Delete profile',
      tone: 'danger',
    });
    if (ok) {
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
        className="fixed inset-0 bg-surface-inverse/60 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={() => setOperatorProfileModalOpen(false)}
      />

      {/* Modal Dialog */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Operator Identity and Profile Hub"
        className="relative w-full max-w-2xl bg-surface-card border border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] font-sans transition-[box-shadow,background-color,border-color,color] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-subtle flex items-center justify-between bg-surface-base backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-sunken border border-subtle flex items-center justify-center text-accent">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-primary">
                  Operator identity & profiles
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-sunken text-secondary border border-subtle">
                  Offline
                </span>
              </div>
              <p className="text-xs text-tertiary">
                Everything stays on this device. Switch operators or explore the creator's reference solves.
              </p>
            </div>
          </div>

          <button aria-label="Close operator profiles"
            onClick={() => setOperatorProfileModalOpen(false)}
            className="p-1.5 max-sm:p-3 rounded-lg text-tertiary hover:text-primary hover:bg-surface-sunken transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Operator Banner */}
        {user ? (
          <div className="px-5 py-3 border-b border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user.avatarId ? (
                  <img
                    src={getAvatarSvgDataUri(user.avatarId)}
                    alt={user.callsign || user.name}
                    className="w-10 h-10 rounded-xl bg-surface-inverse border border-subtle p-0.5 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-surface-sunken border border-subtle flex items-center justify-center text-primary font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-callout-success-fg border-2 border-strong" />
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
                        className="px-2 py-0.5 text-xs font-medium rounded-lg border border-strong bg-surface-card text-primary focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                        autoFocus
                        placeholder="New Callsign"
                      />
                      <button aria-label="Save callsign"
                        type="button"
                        onClick={handleSaveActiveCallsign}
                        className="p-1 rounded-md bg-accent hover:brightness-105 text-on-accent transition-colors cursor-pointer"
                        title="Save Callsign (Enter)"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button aria-label="Cancel rename"
                        type="button"
                        onClick={() => setIsEditingActiveCallsign(false)}
                        className="p-1 rounded-md bg-surface-hover text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                        title="Cancel (Esc)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-primary">
                        {user.callsign || user.name}
                      </span>
                      <button aria-label="Quick-edit active callsign"
                        type="button"
                        onClick={() => {
                          setIsEditingActiveCallsign(true);
                          setActiveCallsignInput(user.callsign || user.name);
                        }}
                        className="p-1 rounded-md text-tertiary hover:text-accent hover:bg-surface-hover transition-colors cursor-pointer"
                        title="Quick-Edit Active Callsign"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${gamification.currentRank.badgeColor} bg-surface-inverse border border-current`}>
                        {gamification.currentRank.tier} {gamification.currentRank.title}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-tertiary flex items-center gap-2">
                  <span>{user.role || 'Tactical Operator'}</span>
                  <span>•</span>
                  <span className="font-mono tabular-nums text-secondary font-medium">{gamification.totalXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-sm font-semibold text-primary">
                  <span className="font-mono tabular-nums">{currentStats?.rooted || 0}</span> rooted
                </div>
                <div className="text-[11px] text-tertiary">
                  <span className="font-mono tabular-nums">{gamification.unlockedCount} / 16</span> trophies
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-hover border border-strong flex items-center justify-center text-secondary font-semibold text-xs">
                OP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    Local / Guest Operator
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-sunken text-secondary border border-subtle">
                    Local-first
                  </span>
                </div>
                <div className="text-xs text-tertiary">
                  Offline CTF workspace. Create an operator under "New operator" to save your own profile.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-sm font-semibold text-primary">
                  <span className="font-mono tabular-nums">{currentRooted}</span> rooted
                </div>
                <div className="text-[11px] text-tertiary">
                  <span className="font-mono tabular-nums">{currentFootholds}</span> footholds
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Offline Workspace Solves Lifecycle Banner */}
        <div className="px-5 py-2.5 bg-surface-sunken border-b border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-muted flex-shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Workspace solves:</span>
                {userSolvesReset ? (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-card text-secondary border border-subtle">
                    Personal practice (0 solves)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-card text-secondary border border-subtle">
                    Creator showcase (63 solves)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-tertiary">
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
                className="px-2.5 py-1 max-sm:py-2.5 rounded-lg text-xs font-medium bg-surface-card text-secondary border border-subtle hover:bg-surface-hover transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Load Daniel's 63 solved machines as a reference baseline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load reference solves (63)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: 'Reset all catalog solves to 0?',
                    body: 'Track your own progress from scratch. You can restore reference solves anytime.',
                    confirmLabel: 'Reset solves',
                    tone: 'danger',
                  });
                  if (ok) {
                    resetSolvesToZero();
                    if (soundEnabled) playCyberSound('root');
                  }
                }}
                className="px-2.5 py-1 max-sm:py-2.5 rounded-lg text-xs font-medium bg-surface-card text-secondary border border-subtle hover:bg-surface-hover transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Start fresh at 0% to track your own CTF conquests"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to my solves (0)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-subtle bg-surface-sunken px-3 sm:px-5 pt-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
 activeTab === 'roster'
 ? 'border-accent text-primary'
 : 'border-transparent text-tertiary hover:text-primary '
 }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({profiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
 activeTab === 'new'
 ? 'border-accent text-primary'
 : 'border-transparent text-tertiary hover:text-primary '
 }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New operator</span>
          </button>
          <button
            onClick={() => setActiveTab('trophies')}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
 activeTab === 'trophies'
 ? 'border-accent text-primary'
 : 'border-transparent text-tertiary hover:text-primary '
 }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Trophies ({gamification.unlockedCount}/16)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'roster' && (
            <div className="space-y-3">
              <div className="text-xs text-tertiary flex items-center justify-between">
                <span>Select an operator to switch workspaces immediately:</span>
                <span className="text-[11px]"><span className="font-mono tabular-nums">{profiles.length}</span> operator{profiles.length > 1 ? 's' : ''}</span>
              </div>

              {profiles.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-strong text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-surface-sunken text-muted flex items-center justify-center mx-auto">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-secondary">
                    No custom profiles created yet
                  </div>
                  <p className="text-[11px] text-tertiary max-w-sm mx-auto">
                    Progress is stored locally. Create a named operator to track your solves, or explore Daniel's reference profile below.
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
 ? 'bg-accent-muted border-accent'
 : 'bg-surface-base hover:bg-surface-sunken border-subtle'
 }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.avatarId ? (
                            <img
                              src={getAvatarSvgDataUri(p.avatarId)}
                              alt={p.name}
                              className={`w-8 h-8 rounded-lg p-0.5 object-contain flex-shrink-0 border ${
 isActive ? 'border-accent bg-surface-inverse' : 'border-strong bg-surface-sunken'
 }`}
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${
 isActive
 ? 'bg-accent text-on-accent'
 : 'bg-surface-hover text-secondary'
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
                                  className="px-2 py-0.5 text-xs rounded border border-strong bg-surface-card text-primary focus:outline-none focus:border-accent"
                                  autoFocus
                                  placeholder="Callsign"
                                />
                                <button aria-label="Save callsign"
                                  type="button"
                                  onClick={() => handleSaveRename(p.id)}
                                  className="p-1 rounded bg-accent text-on-accent hover:brightness-105 transition-colors cursor-pointer"
                                  title="Save Callsign (Enter)"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button aria-label="Cancel rename"
                                  type="button"
                                  onClick={() => setEditingProfileId(null)}
                                  className="p-1 rounded bg-surface-hover text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                                  title="Cancel (Esc)"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-primary truncate">
                                  {p.callsign || p.name}
                                </span>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
                                )}
                              </div>
                            )}
                            <div className="text-[11px] text-tertiary truncate">
                              {p.role || 'Tactical Operator'}
                            </div>
                          </div>
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <button aria-label="Rename callsign"
                              onClick={() => {
                                setEditingProfileId(p.id);
                                setEditingName(p.name);
                              }}
                              className="p-1 rounded text-tertiary hover:text-muted transition-colors"
                              title="Rename Call-sign"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {profiles.length > 1 && (
                              <button aria-label="Delete profile"
                                onClick={() => handleDeleteProfile(p.id, p.name)}
                                className="p-1 rounded text-tertiary hover:text-callout-danger-fg transition-colors"
                                title="Delete Profile"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between text-xs">
                        <div className="text-[11px] text-muted">
                          <span className="font-mono tabular-nums font-semibold text-primary">{stats.rooted}</span> rooted · <span className="font-mono tabular-nums text-secondary">{stats.footholds}</span> footholds
                        </div>

                        {isActive ? (
                          <span className="text-[11px] font-medium text-accent flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchOperator(p.id)}
                            className="px-2 py-1 max-sm:py-2.5 rounded-lg text-xs font-medium bg-surface-hover hover:bg-surface-hover text-secondary hover:text-primary transition-colors flex items-center gap-1"
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
                  <div className="p-3 rounded-xl border border-subtle bg-surface-sunken flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getAvatarSvgDataUri('terminal-sentinel')}
                          alt="Daniel Dayan"
                          className="w-8 h-8 rounded-lg bg-surface-sunken border border-subtle p-0.5 object-contain flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-primary truncate">
                              Daniel Dayan
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface-sunken text-secondary border border-subtle">
                              Creator showcase
                            </span>
                          </div>
                          <div className="text-[11px] text-tertiary truncate">
                            Lead pentester, 63 verified solves
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-subtle flex items-center justify-between text-xs">
                      <div className="text-[11px] text-secondary">
                        <span className="font-mono tabular-nums font-semibold">63</span> rooted machines
                      </div>

                      <button
                        onClick={async () => {
                          await loginAsOperator(DEFAULT_DANIEL_PROFILE);
                          await restoreDanielSolves();
                          if (soundEnabled) playCyberSound('engage');
                        }}
                        className="px-2.5 py-1 max-sm:py-2.5 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-secondary hover:text-primary border border-subtle transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-secondary" />
                        <span>Explore showcase</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('new')}
                  className="w-full py-2.5 max-sm:py-3.5 rounded-xl border border-dashed border-strong hover:border-accent text-muted hover:text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Log in as a different operator</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleCreateOrLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Operator name or callsign <span className="text-callout-danger-fg">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={24}
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Sarah, Alex, GhostNinja"
                  className="w-full px-3 py-2 max-sm:py-3 rounded-xl bg-surface-base border border-strong text-primary text-sm font-medium focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 transition-[box-shadow,background-color,border-color,color]"
                  required
                />
                <span className="text-[11px] text-tertiary mt-0.5 block">
                  Entering an existing callsign logs directly into that operator's saved progress.
                </span>
              </div>

              {/* Tactical Avatar Preset Matrix */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5 flex items-center justify-between">
                  <span>Avatar</span>
                  <span className="text-[11px] text-muted">
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
 ? 'bg-surface-sunken border-subtle ring-2 ring-accent scale-105'
 : 'bg-surface-base border-subtle hover:border-accent'
 }`}
                        title={`${avatar.name}: ${avatar.description}`}
                      >
                        <img
                          src={avatar.dataUri}
                          alt={avatar.name}
                          className="w-10 h-10 object-contain rounded-lg p-0.5 transition-transform group-hover:scale-105"
                        />
                        <span className="text-[11px] font-medium truncate w-full text-center text-muted">
                          {avatar.name.split(' ')[0]}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-on-accent flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Role
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
 ? 'bg-accent-muted border-accent text-primary font-semibold'
 : 'bg-surface-base border-subtle text-secondary hover:border-strong '
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
                <label className="block text-xs font-medium text-secondary mb-1">
                  Accent color
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center transition-transform ${
 selectedColor === c.id ? 'ring-2 ring-offset-2 ring-offset-surface-card ring-accent scale-110' : 'opacity-80 hover:opacity-100'
 }`}
                      title={c.name}
                    >
                      {selectedColor === c.id && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Workspace for new operators
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setWorkspaceMode('fresh')}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
 workspaceMode === 'fresh'
 ? 'bg-surface-sunken border-subtle '
 : 'bg-surface-base border-subtle opacity-70 hover:opacity-100'
 }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-primary">
                      <span>Fresh start</span>
                      <span className="text-[11px] px-1 rounded bg-surface-card text-secondary border border-subtle">Recommended</span>
                    </div>
                    <p className="text-[11px] text-tertiary mt-1 leading-snug">
                      All 929 targets loaded with 0 solves and empty flags and notes.
                    </p>
                  </div>

                  <div
                    onClick={() => setWorkspaceMode('clone')}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
 workspaceMode === 'clone'
 ? 'bg-surface-sunken border-subtle '
 : 'bg-surface-base border-subtle opacity-70 hover:opacity-100'
 }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-primary">
                      <span>Copy current progress</span>
                    </div>
                    <p className="text-[11px] text-tertiary mt-1 leading-snug">
                      Copies your machines, flags and notes into the new operator.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2 max-sm:py-3 rounded-xl text-xs font-medium text-muted hover:bg-surface-sunken transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 max-sm:py-3 rounded-xl text-xs font-medium bg-accent hover:bg-accent-hover text-on-accent transition-[background-color,border-color,color,transform] active:scale-[0.97] flex items-center gap-1.5"
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
              <div className="p-4 rounded-2xl border border-inverse bg-surface-inverse text-on-inverse relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-inverse-elevated border border-inverse flex items-center justify-center text-on-inverse">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-inverse-muted font-medium">
                          Operator status
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${gamification.currentRank.badgeColor} bg-surface-inverse border border-current`}>
                          {gamification.currentRank.tier}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-on-inverse">
                        {gamification.currentRank.title}
                      </h3>
                      <p className="text-[11px] text-on-inverse-muted">
                        {gamification.currentRank.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-on-inverse-muted">Total experience</div>
                    <div className="text-xl font-semibold text-on-inverse font-mono tabular-nums">
                      {gamification.totalXp.toLocaleString()} <span className="text-xs text-on-inverse-muted font-medium">XP</span>
                    </div>
                  </div>
                </div>

                {/* Progress to Next Rank */}
                <div className="mt-4 pt-3 border-t border-inverse">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-on-inverse-muted">
                      {gamification.nextRank ? `Next: ${gamification.nextRank.tier} ${gamification.nextRank.title}` : 'Top rank reached'}
                    </span>
                    <span className="text-on-inverse font-medium font-mono tabular-nums">
                      {gamification.nextRank ? `${gamification.rankProgressPct}%` : '100%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-inverse-elevated overflow-hidden border border-inverse">
                    <div
                      className="h-full w-full origin-left bg-accent transition-transform duration-500 ease-out"
                      style={{ transform: `scaleX(${gamification.rankProgressPct / 100})` }}
                    />
                  </div>
                  {gamification.nextRank && (
                    <div className="text-[11px] text-on-inverse-muted mt-1 flex justify-between font-mono tabular-nums">
                      <span>{gamification.currentRank.minXp.toLocaleString()} XP</span>
                      <span>{gamification.nextRank.minXp.toLocaleString()} XP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactical Stats Quick Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-surface-base border border-subtle text-center">
                  <div className="text-xs text-muted">Rooted targets</div>
                  <div className="text-base font-semibold text-primary font-mono tabular-nums">
                    {gamification.stats.rootedMachines}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-base border border-subtle text-center">
                  <div className="text-xs text-muted">Flags captured</div>
                  <div className="text-base font-semibold text-primary font-mono tabular-nums">
                    {gamification.stats.totalFlags}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-base border border-subtle text-center">
                  <div className="text-xs text-muted">Nmap scans</div>
                  <div className="text-base font-semibold text-primary font-mono tabular-nums">
                    {gamification.stats.nmapScansCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-base border border-subtle text-center">
                  <div className="text-xs text-muted">Trophies unlocked</div>
                  <div className="text-base font-semibold text-primary font-mono tabular-nums">
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
                    className={`px-2.5 py-1 max-sm:py-2.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 ${
 trophyCategoryFilter === cat
 ? 'bg-accent text-on-accent '
 : 'bg-surface-sunken text-muted hover:text-primary border border-subtle '
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
                      common: 'text-secondary border-strong bg-surface-hover',
                      rare: 'text-secondary border-subtle bg-surface-sunken',
                      epic: 'text-secondary border-subtle bg-surface-sunken',
                      legendary: 'text-callout-warn-fg border-callout-warn-border bg-callout-warn-bg',
                    };
                    const badgeClass = rarityColors[trophy.definition.rarity] || rarityColors.common;

                    return (
                      <div
                        key={trophy.definition.id}
                        className={`p-3 rounded-xl border transition-colors flex flex-col justify-between ${
 isUnlocked
 ? 'bg-surface-card border-subtle'
 : 'bg-surface-sunken border-subtle opacity-70'
 }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${
 isUnlocked
 ? 'bg-surface-sunken border-subtle'
 : 'bg-surface-hover border-strong grayscale opacity-60'
 }`}>
                            <Award className="w-5 h-5 text-secondary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-semibold ${isUnlocked ? 'text-primary ' : 'text-tertiary'}`}>
                                {trophy.definition.title}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium capitalize border ${badgeClass}`}>
                                {trophy.definition.rarity}
                              </span>
                            </div>
                            <p className="text-[11px] text-tertiary mt-0.5 line-clamp-2">
                              {trophy.definition.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-subtle flex items-center justify-between text-xs">
                          <div className="text-[11px]">
                            {isUnlocked ? (
                              <span className="text-callout-success-fg font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Unlocked {trophy.unlockedAt ? new Date(trophy.unlockedAt).toLocaleDateString() : ''}</span>
                              </span>
                            ) : (
                              <span className="text-tertiary flex items-center gap-1">
                                <Lock className="w-3 h-3 text-tertiary" />
                                <span>{trophy.currentCount} / {trophy.targetCount}</span>
                              </span>
                            )}
                          </div>

                          <div className="font-mono tabular-nums font-medium text-[11px] text-secondary">
                            +{trophy.definition.xpReward} XP
                          </div>
                        </div>

                        {!isUnlocked && trophy.targetCount > 1 && (
                          <div className="w-full h-1 rounded-full bg-surface-hover overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-accent"
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

          {/* Local-first privacy note */}
          <div className="p-3 rounded-xl bg-surface-base border border-subtle text-[11px] text-tertiary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-callout-success-fg flex-shrink-0" />
            <span>
              <strong className="font-medium">Local-first. No telemetry.</strong> Profiles and progress live in local browser storage. Optional AI uses your own key and only runs when you send.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
