/**
 * examStore.ts
 * ZeroBox Tactical Certification Exam Simulator & Mission HUD State Store
 * 
 * Zustand 5 Store with Persist Middleware (key: 'zerobox_exam_state_v1'):
 * - Drift-free absolute epoch clock (examExpiresAt)
 * - Session lifecycle: startExam, pauseExam, resumeExam, resetExam
 * - Flag submission, evidence proof validation, and auto-milestone logging
 * - Dual-clock bio-break management with audio cyber alarms
 * - Soak endurance invariant: 1Hz clock ticks NEVER trigger localStorage writes
 * - Passing status indicator: Passing / In Progress / Critical
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ExamTrack,
  ExamBox,
  ScreenshotProof,
  ExamTargetProof,
  PassingStatus,
  EXAM_TRACK_CONFIGS,
  generateExamTargetsForTrack,
  calculateExamScore,
  getPassingStatus as calculatePassingStatus,
  validateFlagFormat,
  isDomainControllerBox,
} from '../utils/examComplianceUtils';
import { playCyberAlert } from '../utils/audioAlerts';

let examAlertChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    examAlertChannel = new BroadcastChannel('zerobox_exam_alerts');
  } catch {}
}

function playDedupedAlarm() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const lastPlayed = parseInt(localStorage.getItem('zerobox_last_alarm_played_at') || '0', 10);
  if (now - lastPlayed < 4000) return; // Debounce alarm across tabs
  try {
    localStorage.setItem('zerobox_last_alarm_played_at', String(now));
    examAlertChannel?.postMessage({ type: 'ALARM_PLAYED', timestamp: now });
  } catch {}
  playCyberAlert('alarm');
}

export type ExamStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface ExamBreakState {
  isActive: boolean;
  type: 'bio' | 'food' | 'rest' | 'custom';
  startedAt: number | null;
  durationSeconds: number;
  remainingSeconds: number;
  expiresAt: number | null;
}

export interface ExamMilestone {
  id: string;
  targetId: string;
  type: 'initial_access' | 'priv_esc' | 'domain_admin' | 'break_start' | 'break_end' | 'pass_achieved';
  timestamp: string;
  notes: string;
}

export interface ExamSessionState {
  id: string;
  track: ExamTrack;
  candidateName: string;
  candidateCallsign: string;
  osid: string;
  status: ExamStatus;
  startedAt: number | null;
  examExpiresAt: number | null;
  totalDurationSeconds: number;
  timerPausedRemainingSeconds: number | null;
  remainingSeconds: number;
  boxes: ExamBox[];
  activeBreak: ExamBreakState;
  breakHistory: Array<{ type: string; duration: number; timestamp: string }>;
  milestones: ExamMilestone[];
  isQuickDrawerOpen: boolean;
  scratchNotes: string;
  includeBonusPoints: boolean;
}

export interface ExamStoreActions {
  // Session Lifecycle
  startExam: (track?: ExamTrack, config?: Partial<{ candidateName: string; candidateCallsign: string; osid: string }>) => void;
  pauseExam: () => void;
  resumeExam: () => void;
  resetExam: (track?: ExamTrack) => void;
  setTrack: (track: ExamTrack) => void;
  shuffleTargets: () => void;

  // Flag & Proofs
  submitFlag: (boxId: string, flagType: 'user' | 'root', flagText: string) => boolean;
  togglePwn: (boxId: string, flagType: 'user' | 'root') => void;
  updateProof: (boxId: string, flagType: 'user' | 'root', proof: Partial<ExamTargetProof>) => void;
  addScreenshot: (boxId: string, flagType: 'user' | 'root', screenshot: ScreenshotProof) => void;
  removeScreenshot: (boxId: string, flagType: 'user' | 'root', screenshotId: string) => void;

  // Bio-Break Manager
  startBreak: (type: 'bio' | 'food' | 'rest' | 'custom', customMinutes?: number) => void;
  cancelBreak: () => void;
  endBreak: () => void;

  // Milestones & Candidate Data
  addMilestone: (targetId: string, type: ExamMilestone['type'], notes: string) => void;
  setCandidateInfo: (info: { candidateName?: string; candidateCallsign?: string; osid?: string }) => void;
  setScratchNotes: (notes: string) => void;
  setIncludeBonusPoints: (include: boolean) => void;

  // UI State
  setQuickDrawerOpen: (open: boolean) => void;
  toggleQuickDrawer: () => void;

  // Clock Synchronization (In-memory derived tick, zero storage write)
  tick: () => void;
  checkTimeThresholds: () => void;

  // Computed Getters
  getRemainingSeconds: () => number;
  getBreakRemainingSeconds: () => number;
  getScore: () => ReturnType<typeof calculateExamScore>;
  getPassingStatus: () => PassingStatus;
}

export type ExamStore = ExamSessionState & ExamStoreActions;

export const EXAM_STORAGE_KEY = 'zerobox_exam_state_v1';

const DEFAULT_BREAK_STATE: ExamBreakState = {
  isActive: false,
  type: 'bio',
  startedAt: null,
  durationSeconds: 0,
  remainingSeconds: 0,
  expiresAt: null,
};

function createInitialSession(track: ExamTrack = 'OSCP'): ExamSessionState {
  const config = EXAM_TRACK_CONFIGS[track] || EXAM_TRACK_CONFIGS.OSCP;
  const boxes = generateExamTargetsForTrack(track);

  return {
    id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    track,
    candidateName: 'Daniel Dayan',
    candidateCallsign: '0xdnd',
    osid: 'OS-94821',
    status: 'idle',
    startedAt: null,
    examExpiresAt: null,
    totalDurationSeconds: config.durationSeconds,
    timerPausedRemainingSeconds: null,
    remainingSeconds: config.durationSeconds,
    boxes,
    activeBreak: { ...DEFAULT_BREAK_STATE },
    breakHistory: [],
    milestones: [],
    isQuickDrawerOpen: false,
    scratchNotes: `# CANDIDATE LOG // ZEROBOX OPERATIONAL NOTES\n\n## Target Credential Vault\n- administrator : P@ssw0rd2024!\n\n## Active Tunnels & Pivots\n- Chisel SOCKS5 proxy on 127.0.0.1:1080 -> 172.16.1.0/24`,
    includeBonusPoints: false,
  };
}

/**
 * Selective Storage Engine:
 * Prevents 1Hz clock tick write amplification to localStorage.
 * Only invokes disk I/O when discrete state payload strings actually change.
 */
let lastStoredPayload = '';

const selectiveExamStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(name);
      lastStoredPayload = val || '';
      return val;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    if (value === lastStoredPayload) {
      return; // Deduplicate identical discrete state; 0 disk write!
    }
    try {
      localStorage.setItem(name, value);
      lastStoredPayload = value;
    } catch (err) {
      console.warn('[ExamStore] Failed to write to localStorage:', err);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
      lastStoredPayload = '';
    } catch {}
  },
};

export const useExamStore = create<ExamStore>()(
  persist(
    (set, get) => ({
      ...createInitialSession('OSCP'),

      startExam: (track, config) => {
        const selectedTrack = track || get().track;
        const trackConfig = EXAM_TRACK_CONFIGS[selectedTrack] || EXAM_TRACK_CONFIGS.OSCP;
        const now = Date.now();
        const duration = trackConfig.durationSeconds;
        const expiresAt = now + duration * 1000;
        const boxes = generateExamTargetsForTrack(selectedTrack);

        set({
          id: `exam_${now}_${Math.random().toString(36).substring(2, 7)}`,
          track: selectedTrack,
          status: 'running',
          startedAt: now,
          examExpiresAt: expiresAt,
          totalDurationSeconds: duration,
          timerPausedRemainingSeconds: null,
          remainingSeconds: duration,
          boxes,
          candidateName: config?.candidateName || get().candidateName,
          candidateCallsign: config?.candidateCallsign || get().candidateCallsign,
          osid: config?.osid || get().osid,
          activeBreak: { ...DEFAULT_BREAK_STATE },
          breakHistory: [],
          milestones: [
            {
              id: `ms_${now}_start`,
              targetId: 'exam',
              type: 'initial_access',
              timestamp: new Date(now).toISOString(),
              notes: `Exam session initiated for ${trackConfig.name}`,
            },
          ],
        });

        playCyberAlert('flag_captured');
      },

      pauseExam: () => {
        const state = get();
        if (state.status !== 'running') return;

        const now = Date.now();
        const remaining = state.examExpiresAt
          ? Math.max(0, Math.floor((state.examExpiresAt - now) / 1000))
          : state.remainingSeconds;

        set({
          status: 'paused',
          examExpiresAt: null,
          timerPausedRemainingSeconds: remaining,
          remainingSeconds: remaining,
        });

        playCyberAlert('tick');
      },

      resumeExam: () => {
        const state = get();
        if (state.status !== 'paused') return;

        const remaining = state.timerPausedRemainingSeconds ?? state.remainingSeconds;
        const now = Date.now();
        const expiresAt = now + remaining * 1000;

        set({
          status: 'running',
          examExpiresAt: expiresAt,
          timerPausedRemainingSeconds: null,
          remainingSeconds: remaining,
        });

        playCyberAlert('tick');
      },

      resetExam: (track) => {
        const targetTrack = track || get().track;
        set(createInitialSession(targetTrack));
        playCyberAlert('tick');
      },

      setTrack: (track) => {
        if (get().status === 'running') {
          console.warn('[ExamStore] Cannot switch track while an exam is actively running.');
          return;
        }
        set(createInitialSession(track));
      },

      shuffleTargets: () => {
        const currentTrack = get().track;
        const newBoxes = generateExamTargetsForTrack(currentTrack);
        set({ boxes: newBoxes });
        playCyberAlert('tick');
      },

      submitFlag: (boxId, flagType, flagText) => {
        const trimmed = (flagText || '').trim();
        const validation = validateFlagFormat(trimmed);
        if (!validation.valid) return false;

        const state = get();
        const box = state.boxes.find((b) => b.id === boxId);
        if (!box) return false;

        const scoreBefore = calculateExamScore(state.track, state.boxes, {
          includeBonusPoints: state.includeBonusPoints,
        });

        const now = new Date().toISOString();
        let wasAlreadyPwned = flagType === 'user' ? box.userPwned : box.rootPwned;

        const updatedBoxes = state.boxes.map((b) => {
          if (b.id !== boxId) return b;

          if (flagType === 'user') {
            return {
              ...b,
              userPwned: true,
              initialAccessAt: b.initialAccessAt || now,
              userProof: {
                ...b.userProof,
                flagText: trimmed,
                pwnedAt: now,
              },
            };
          } else {
            const isDc = isDomainControllerBox(b);
            return {
              ...b,
              rootPwned: true,
              privEscAt: b.privEscAt || now,
              domainCompromiseAt: isDc ? b.domainCompromiseAt || now : b.domainCompromiseAt,
              rootProof: {
                ...b.rootProof,
                flagText: trimmed,
                pwnedAt: now,
              },
            };
          }
        });

        // Add milestone if not previously pwned
        const newMilestones = [...state.milestones];
        if (!wasAlreadyPwned) {
          if (flagType === 'user') {
            newMilestones.push({
              id: `ms_${Date.now()}_user`,
              targetId: box.id,
              type: 'initial_access',
              timestamp: now,
              notes: `Foothold user flag submitted on ${box.name} (+${box.userPoints} pts)`,
            });
          } else {
            const isDc = isDomainControllerBox(box);
            newMilestones.push({
              id: `ms_${Date.now()}_root`,
              targetId: box.id,
              type: isDc ? 'domain_admin' : 'priv_esc',
              timestamp: now,
              notes: isDc
                ? `Domain Controller fully compromised on ${box.name} (+${box.rootPoints} pts)`
                : `Root/SYSTEM privileges achieved on ${box.name} (+${box.rootPoints} pts)`,
            });
          }
        }

        const scoreAfter = calculateExamScore(state.track, updatedBoxes, {
          includeBonusPoints: state.includeBonusPoints,
        });

        // Triumphant fanfare if passing threshold just reached
        if (!scoreBefore.isPassing && scoreAfter.isPassing) {
          newMilestones.push({
            id: `ms_${Date.now()}_pass`,
            targetId: 'exam',
            type: 'pass_achieved',
            timestamp: now,
            notes: `PASSING THRESHOLD ACHIEVED: ${scoreAfter.totalScore} / ${scoreAfter.maxScore} PTS!`,
          });
          playCyberAlert('victory_fanfare');
        } else if (!wasAlreadyPwned) {
          playCyberAlert('flag_captured');
        }

        set({
          boxes: updatedBoxes,
          milestones: newMilestones,
        });

        return true;
      },

      togglePwn: (boxId, flagType) => {
        const state = get();
        const now = new Date().toISOString();

        const updatedBoxes = state.boxes.map((b) => {
          if (b.id !== boxId) return b;
          if (flagType === 'user') {
            const nextPwned = !b.userPwned;
            return {
              ...b,
              userPwned: nextPwned,
              initialAccessAt: nextPwned ? b.initialAccessAt || now : undefined,
              userProof: {
                ...b.userProof,
                pwnedAt: nextPwned ? now : undefined,
              },
            };
          } else {
            const nextPwned = !b.rootPwned;
            const isDc = isDomainControllerBox(b);
            return {
              ...b,
              rootPwned: nextPwned,
              privEscAt: nextPwned ? b.privEscAt || now : undefined,
              domainCompromiseAt: nextPwned && isDc ? b.domainCompromiseAt || now : undefined,
              rootProof: {
                ...b.rootProof,
                pwnedAt: nextPwned ? now : undefined,
              },
            };
          }
        });

        const scoreBefore = calculateExamScore(state.track, state.boxes, {
          includeBonusPoints: state.includeBonusPoints,
        });
        const scoreAfter = calculateExamScore(state.track, updatedBoxes, {
          includeBonusPoints: state.includeBonusPoints,
        });

        if (!scoreBefore.isPassing && scoreAfter.isPassing) {
          playCyberAlert('victory_fanfare');
        } else {
          playCyberAlert('tick');
        }

        set({ boxes: updatedBoxes });
      },

      updateProof: (boxId, flagType, proofUpdate) => {
        set((state) => ({
          boxes: state.boxes.map((b) => {
            if (b.id !== boxId) return b;
            const key = flagType === 'user' ? 'userProof' : 'rootProof';
            return {
              ...b,
              [key]: {
                ...b[key],
                ...proofUpdate,
              },
            };
          }),
        }));
      },

      addScreenshot: (boxId, flagType, screenshot) => {
        set((state) => ({
          boxes: state.boxes.map((b) => {
            if (b.id !== boxId) return b;
            const key = flagType === 'user' ? 'userProof' : 'rootProof';
            const currentProof = b[key];
            const currentScreenshots = currentProof.screenshots || [];
            return {
              ...b,
              [key]: {
                ...currentProof,
                screenshotTaken: true,
                screenshots: [...currentScreenshots, screenshot],
              },
            };
          }),
        }));
        playCyberAlert('tick');
      },

      removeScreenshot: (boxId, flagType, screenshotId) => {
        set((state) => ({
          boxes: state.boxes.map((b) => {
            if (b.id !== boxId) return b;
            const key = flagType === 'user' ? 'userProof' : 'rootProof';
            const currentProof = b[key];
            const filtered = (currentProof.screenshots || []).filter((sc) => sc.id !== screenshotId);
            return {
              ...b,
              [key]: {
                ...currentProof,
                screenshotTaken: filtered.length > 0,
                screenshots: filtered,
              },
            };
          }),
        }));
      },

      startBreak: (type, customMinutes) => {
        const now = Date.now();
        let durationSeconds = 900; // 15m bio
        if (type === 'food') durationSeconds = 1800; // 30m meal
        else if (type === 'rest') durationSeconds = 7200; // 2h rest
        else if (type === 'custom' && customMinutes) {
          const safeMinutes = Math.min(720, Math.max(1, customMinutes));
          durationSeconds = safeMinutes * 60;
        }

        const expiresAt = now + durationSeconds * 1000;

        set((state) => ({
          activeBreak: {
            isActive: true,
            type,
            startedAt: now,
            durationSeconds,
            remainingSeconds: durationSeconds,
            expiresAt,
          },
          milestones: [
            ...state.milestones,
            {
              id: `ms_${now}_break_start`,
              targetId: 'break',
              type: 'break_start',
              timestamp: new Date(now).toISOString(),
              notes: `Operator initiated ${type} break (${Math.round(durationSeconds / 60)} minutes)`,
            },
          ],
        }));

        playCyberAlert('tick');
      },

      cancelBreak: () => {
        const state = get();
        if (!state.activeBreak.isActive) return;

        const now = Date.now();
        const duration = state.activeBreak.startedAt
          ? Math.max(0, Math.floor((now - state.activeBreak.startedAt) / 1000))
          : 0;

        set({
          activeBreak: { ...DEFAULT_BREAK_STATE },
          breakHistory: [
            ...state.breakHistory,
            {
              type: state.activeBreak.type,
              duration,
              timestamp: new Date(now).toISOString(),
            },
          ],
          milestones: [
            ...state.milestones,
            {
              id: `ms_${now}_break_end`,
              targetId: 'break',
              type: 'break_end',
              timestamp: new Date(now).toISOString(),
              notes: `Break concluded. Elapsed: ${Math.round(duration / 60)}m`,
            },
          ],
        });

        playCyberAlert('tick');
      },

      endBreak: () => {
        get().cancelBreak();
      },

      addMilestone: (targetId, type, notes) => {
        const now = new Date().toISOString();
        set((state) => ({
          milestones: [
            ...state.milestones,
            {
              id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              targetId,
              type,
              timestamp: now,
              notes,
            },
          ],
        }));
      },

      setCandidateInfo: (info) => {
        set((state) => ({
          candidateName: info.candidateName !== undefined ? info.candidateName : state.candidateName,
          candidateCallsign: info.candidateCallsign !== undefined ? info.candidateCallsign : state.candidateCallsign,
          osid: info.osid !== undefined ? info.osid : state.osid,
        }));
      },

      setScratchNotes: (scratchNotes) => {
        set({ scratchNotes });
      },

      setIncludeBonusPoints: (includeBonusPoints) => {
        set({ includeBonusPoints });
      },

      setQuickDrawerOpen: (isQuickDrawerOpen) => {
        set({ isQuickDrawerOpen });
      },

      toggleQuickDrawer: () => {
        set((state) => ({ isQuickDrawerOpen: !state.isQuickDrawerOpen }));
      },

      // 1Hz tick: Pure in-memory derivation, excluded from partialize and selective storage
      tick: () => {
        const state = get();
        const now = Date.now();

        // 1. Update exam countdown
        let remaining = state.remainingSeconds;
        let newStatus = state.status;
        if (state.status === 'running' && state.examExpiresAt) {
          remaining = Math.max(0, Math.floor((state.examExpiresAt - now) / 1000));
          if (remaining <= 0) {
            newStatus = 'completed';
            remaining = 0;
            playDedupedAlarm();
          }
        }

        // 2. Update break countdown if active
        let updatedBreak = state.activeBreak;
        let updatedBreakHistory = state.breakHistory;
        let updatedMilestones = state.milestones;

        if (state.activeBreak.isActive && state.activeBreak.expiresAt) {
          const breakRemaining = Math.max(0, Math.floor((state.activeBreak.expiresAt - now) / 1000));
          if (breakRemaining <= 0) {
            // Alarm trigger once on break conclusion and mark completed/inactive
            playDedupedAlarm();
            const duration = state.activeBreak.startedAt
              ? Math.max(0, Math.floor((now - state.activeBreak.startedAt) / 1000))
              : state.activeBreak.durationSeconds;

            updatedBreak = {
              ...DEFAULT_BREAK_STATE,
            };
            updatedBreakHistory = [
              ...state.breakHistory,
              {
                type: state.activeBreak.type,
                duration,
                timestamp: new Date(now).toISOString(),
              },
            ];
            updatedMilestones = [
              ...state.milestones,
              {
                id: `ms_${now}_break_end`,
                targetId: 'break',
                type: 'break_end',
                timestamp: new Date(now).toISOString(),
                notes: `Break concluded. Elapsed: ${Math.round(duration / 60)}m`,
              },
            ];
          } else {
            updatedBreak = {
              ...state.activeBreak,
              remainingSeconds: breakRemaining,
            };
          }
        }

        // In-memory update
        set({
          status: newStatus,
          remainingSeconds: remaining,
          activeBreak: updatedBreak,
          breakHistory: updatedBreakHistory,
          milestones: updatedMilestones,
        });
      },

      checkTimeThresholds: () => {
        get().tick();
      },

      getRemainingSeconds: () => {
        const state = get();
        if (state.status === 'completed') {
          return 0;
        }
        if (state.status === 'running' && state.examExpiresAt) {
          return Math.max(0, Math.floor((state.examExpiresAt - Date.now()) / 1000));
        }
        if (state.status === 'paused') {
          return state.timerPausedRemainingSeconds ?? state.remainingSeconds;
        }
        return state.totalDurationSeconds;
      },

      getBreakRemainingSeconds: () => {
        const breakState = get().activeBreak;
        if (!breakState.isActive || !breakState.expiresAt) return 0;
        return Math.max(0, Math.floor((breakState.expiresAt - Date.now()) / 1000));
      },

      getScore: () => {
        const state = get();
        return calculateExamScore(state.track, state.boxes, {
          includeBonusPoints: state.includeBonusPoints,
        });
      },

      getPassingStatus: () => {
        const state = get();
        const scoreData = calculateExamScore(state.track, state.boxes, {
          includeBonusPoints: state.includeBonusPoints,
        });
        const remaining = get().getRemainingSeconds();
        const isExpired = state.status === 'completed' || (state.status === 'running' && remaining <= 0);
        const requiresAdAndMissing = state.track === 'OSCP' && !scoreData.isPassing && !scoreData.adSetCompromised;

        return calculatePassingStatus(
          scoreData.totalScore,
          scoreData.passThreshold,
          remaining,
          isExpired,
          requiresAdAndMissing
        );
      },
    }),
    {
      name: EXAM_STORAGE_KEY,
      storage: createJSONStorage(() => selectiveExamStorage),
      // Crucial: Only persist discrete state mutations!
      // Exclude rapid transient in-memory properties so 1Hz ticks do not cause write amplification
      partialize: (state) => ({
        id: state.id,
        track: state.track,
        candidateName: state.candidateName,
        candidateCallsign: state.candidateCallsign,
        osid: state.osid,
        status: state.status,
        startedAt: state.startedAt,
        examExpiresAt: state.examExpiresAt,
        totalDurationSeconds: state.totalDurationSeconds,
        timerPausedRemainingSeconds: state.timerPausedRemainingSeconds,
        boxes: state.boxes,
        activeBreak: {
          isActive: state.activeBreak.isActive,
          type: state.activeBreak.type,
          startedAt: state.activeBreak.startedAt,
          durationSeconds: state.activeBreak.durationSeconds,
          expiresAt: state.activeBreak.expiresAt,
          remainingSeconds: 0,
        },
        breakHistory: state.breakHistory,
        milestones: state.milestones,
        scratchNotes: state.scratchNotes,
        includeBonusPoints: state.includeBonusPoints,
        isQuickDrawerOpen: state.isQuickDrawerOpen,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const now = Date.now();
        if (state.status === 'running' && state.examExpiresAt) {
          state.remainingSeconds = Math.max(0, Math.floor((state.examExpiresAt - now) / 1000));
        }
        if (state.activeBreak && state.activeBreak.isActive && state.activeBreak.expiresAt) {
          state.activeBreak.remainingSeconds = Math.max(0, Math.floor((state.activeBreak.expiresAt - now) / 1000));
        }
      },
    }
  )
);

