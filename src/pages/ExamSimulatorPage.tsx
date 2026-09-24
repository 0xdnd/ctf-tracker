import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Play, 
  Pause, 
  RotateCcw, 
  Shuffle, 
  ShieldCheck, 
  AlertTriangle, 
  Flag, 
  Clock, 
  FileDown, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Server,
  Layers,
  Terminal,
  Trophy,
  Zap,
  CheckSquare,
  Square,
  Camera,
  FileCode,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { OsBadge } from '../components/common/OsBadge';
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import { playCyberSound, triggerRootCelebration } from '../utils/helpers';
import { 
  ExamTrack, 
  ExamBox, 
  ExamSessionState, 
  validateFlagFormat, 
  generateExamTargetsForTrack, 
  calculateExamScore, 
  generateExamReportMarkdown 
} from '../utils/examComplianceUtils';

const STORAGE_KEY = 'zerobox_exam_session_v2';

export const ExamSimulatorPage: React.FC = () => {
  const machines = useCtfStore((s) => s.machines);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  // Load initial session or create default
  const [session, setSession] = useState<ExamSessionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.boxes && parsed.boxes.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load exam session:', e);
    }

    const defaultTrack: ExamTrack = 'OSCP';
    const boxes = generateExamTargetsForTrack(defaultTrack, machines);
    return {
      track: defaultTrack,
      examStartedAt: Date.now(),
      examDurationSeconds: 24 * 3600,
      examExpiresAt: Date.now() + 24 * 3600 * 1000,
      isTimerRunning: false,
      timerPausedRemainingSeconds: 24 * 3600,
      boxes,
      scratchNotes: '# CANDIDATE LOG\n\n## Target Credential Vault\n- administrator : P@ssw0rd2024!\n\n## Active Tunnels\n- Chisel SOCKS5 proxy on 127.0.0.1:1080 -> 172.16.1.0/24',
      candidateName: 'Daniel Dayan',
      candidateCallsign: '0xdnd',
      osid: 'OS-94821',
    };
  });

  // Track expanded box IDs
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null);

  // Remaining seconds derived from absolute epoch timestamp to prevent drift
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!session.isTimerRunning) {
      return session.timerPausedRemainingSeconds ?? 24 * 3600;
    }
    if (!session.examExpiresAt) return 24 * 3600;
    return Math.max(0, Math.floor((session.examExpiresAt - Date.now()) / 1000));
  });

  // Persist session to localStorage with 400ms debouncing and flush on beforeunload
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (e) {
        console.error('Failed to persist exam session:', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  // Timer Tick (Driven by absolute epoch timestamp)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session.isTimerRunning && session.examExpiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.examExpiresAt! - Date.now()) / 1000));
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          setSession((prev) => ({ ...prev, isTimerRunning: false, timerPausedRemainingSeconds: 0 }));
        }
      }, 500);
    } else {
      if (session.timerPausedRemainingSeconds !== null) {
        setRemainingSeconds(session.timerPausedRemainingSeconds);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.isTimerRunning, session.examExpiresAt, session.timerPausedRemainingSeconds]);

  // Toggle Timer Run/Pause
  const toggleTimer = () => {
    if (session.isTimerRunning) {
      // Pause: capture remaining seconds
      const currentRemaining = Math.max(0, Math.floor(((session.examExpiresAt || Date.now()) - Date.now()) / 1000));
      setSession((prev) => ({
        ...prev,
        isTimerRunning: false,
        timerPausedRemainingSeconds: currentRemaining,
        examExpiresAt: null,
      }));
    } else {
      // Start: set absolute expiration from paused seconds
      const duration = session.timerPausedRemainingSeconds ?? 24 * 3600;
      setSession((prev) => ({
        ...prev,
        isTimerRunning: true,
        examExpiresAt: Date.now() + duration * 1000,
        timerPausedRemainingSeconds: null,
      }));
    }
    if (soundEnabled) playCyberSound('timer');
  };

  // Reset Timer to 24h
  const resetTimer = () => {
    const defaultDuration = session.track === 'CPTS' ? 48 * 3600 : 24 * 3600;
    setSession((prev) => ({
      ...prev,
      isTimerRunning: false,
      examDurationSeconds: defaultDuration,
      examExpiresAt: null,
      timerPausedRemainingSeconds: defaultDuration,
    }));
    setRemainingSeconds(defaultDuration);
    if (soundEnabled) playCyberSound('click');
  };

  // Switch Track
  const handleTrackChange = (newTrack: ExamTrack) => {
    if (newTrack === session.track) return;
    const newBoxes = generateExamTargetsForTrack(newTrack, machines);
    const duration = newTrack === 'CPTS' ? 48 * 3600 : 24 * 3600;
    setSession((prev) => ({
      ...prev,
      track: newTrack,
      boxes: newBoxes,
      examStartedAt: Date.now(),
      examDurationSeconds: duration,
      examExpiresAt: null,
      isTimerRunning: false,
      timerPausedRemainingSeconds: duration,
    }));
    setRemainingSeconds(duration);
    if (soundEnabled) playCyberSound('click');
  };

  // Reset Exam Session / Pick New Mock Set
  const handleNewMockSet = () => {
    const newBoxes = generateExamTargetsForTrack(session.track, machines);
    setSession((prev) => ({
      ...prev,
      boxes: newBoxes,
      examStartedAt: Date.now(),
    }));
    if (soundEnabled) playCyberSound('shuffle');
  };

  // Score & Compliance calculations
  const scoreData = useMemo(() => {
    return calculateExamScore(session.track, session.boxes);
  }, [session.track, session.boxes]);

  // Format Timer
  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Update Box Proof or Flag
  const updateBoxProof = (
    boxId: string,
    flagType: 'user' | 'root',
    field: 'flagText' | 'whoamiOutput' | 'ipconfigOutput' | 'screenshotTaken',
    val: any
  ) => {
    setSession((prev) => {
      const updatedBoxes = prev.boxes.map((b) => {
        if (b.id !== boxId) return b;
        const proofKey = flagType === 'user' ? 'userProof' : 'rootProof';
        const updatedProof = {
          ...b[proofKey],
          [field]: val,
        };

        // Automatically toggle pwned if valid flag is entered
        let willBePwned = flagType === 'user' ? b.userPwned : b.rootPwned;
        if (field === 'flagText') {
          const validation = validateFlagFormat(val);
          if (validation.valid && !willBePwned) {
            willBePwned = true;
            if (flagType === 'root') {
              triggerRootCelebration();
              if (soundEnabled) playCyberSound('root');
            } else {
              if (soundEnabled) playCyberSound('flag');
            }
          }
        }

        return {
          ...b,
          [flagType === 'user' ? 'userPwned' : 'rootPwned']: willBePwned,
          [proofKey]: updatedProof,
        };
      });
      return { ...prev, boxes: updatedBoxes };
    });
  };

  // Toggle Pwn Flag manually
  const togglePwn = (boxId: string, flagType: 'user' | 'root') => {
    setSession((prev) => {
      const updated = prev.boxes.map((b) => {
        if (b.id !== boxId) return b;
        const willBePwned = flagType === 'user' ? !b.userPwned : !b.rootPwned;
        if (willBePwned) {
          if (flagType === 'root') {
            triggerRootCelebration();
            if (soundEnabled) playCyberSound('root');
          } else {
            if (soundEnabled) playCyberSound('flag');
          }
        } else {
          if (soundEnabled) playCyberSound('toggle');
        }
        return {
          ...b,
          [flagType === 'user' ? 'userPwned' : 'rootPwned']: willBePwned,
        };
      });
      return { ...prev, boxes: updated };
    });
  };

  // Export OffSec Report (.md)
  const handleExportReport = () => {
    const md = generateExamReportMarkdown(session);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.track}_EXAM_REPORT_${session.candidateCallsign}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('export');
  };

  return (
    <div className="w-full space-y-5 font-mono">
      {/* 1. Exam Header & Telemetry Dashboard */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-cyber-bg border border-emerald-400/50 dark:border-cyber-emerald/40 shadow-glow-emerald/20 text-emerald-700 dark:text-cyber-emerald">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-wider">
                  OFFSEC // EXAM COMPLIANCE & SCORING ENGINE
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/30 text-emerald-900 dark:text-cyber-emerald">
                  {session.track} COMPLIANT
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-cyber-muted">
                Official scoring matrices, proof verification checklists, regex flag auditor, and report generator.
              </p>
            </div>
          </div>

          {/* Exam Track Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {(['OSCP', 'CPTS', 'CRTP'] as ExamTrack[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTrackChange(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  session.track === t
                    ? 'bg-emerald-100 dark:bg-cyber-emerald/20 border-emerald-500 dark:border-cyber-emerald text-emerald-950 dark:text-cyber-emerald shadow-glow-emerald/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t} ({t === 'CPTS' ? '85 Pts' : t === 'CRTP' ? '100 Pts' : '70 Pts'})
              </button>
            ))}
          </div>

        </div>

        {/* Telemetry Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-cyber-border/80">
          
          {/* Score Counter */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold tracking-wider">
                {session.track} EXAM SCORE
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-2xl font-black ${scoreData.isPassing ? 'text-emerald-700 dark:text-cyber-emerald' : 'text-amber-700 dark:text-cyber-amber'}`}>
                  {scoreData.totalScore}
                </span>
                <span className="text-slate-500 dark:text-cyber-muted text-xs">/ {scoreData.maxScore} PTS</span>
              </div>
            </div>

            <div className="text-right">
              {scoreData.isPassing ? (
                <div className="flex items-center gap-1.5 text-emerald-900 dark:text-cyber-emerald font-bold text-xs bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/30 px-2.5 py-1 rounded">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-cyber-emerald" />
                  <span>PASS CONFIRMED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-cyber-amber font-bold text-xs bg-amber-100 dark:bg-cyber-amber/10 border border-amber-300 dark:border-cyber-amber/30 px-2.5 py-1 rounded">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-cyber-amber" />
                  <span>{scoreData.pointsNeeded} PTS NEEDED</span>
                </div>
              )}
            </div>
          </div>

          {/* Exam Countdown Timer */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-600 dark:text-cyber-cyan" /> {session.track === 'CPTS' ? '48H' : '24H'} COUNTDOWN CLOCK
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-widest mt-0.5 font-mono">
                {formatTimer(remainingSeconds)}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleTimer}
                className={`p-2 rounded-lg border transition-all ${
                  session.isTimerRunning
                    ? 'bg-amber-100 dark:bg-cyber-amber/20 border-amber-400 dark:border-cyber-amber text-amber-950 dark:text-cyber-amber font-bold'
                    : 'bg-emerald-100 dark:bg-cyber-emerald/20 border-emerald-400 dark:border-cyber-emerald text-emerald-950 dark:text-cyber-emerald font-bold'
                }`}
                title={session.isTimerRunning ? 'Pause Exam Clock' : 'Start Exam Clock'}
              >
                {session.isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={resetTimer}
                className="p-2 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                title="Reset Clock"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Generator & Report Controls */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:col-span-2 lg:col-span-1">
            <button
              onClick={handleNewMockSet}
              className="flex-1 py-2 px-2.5 rounded-lg bg-white dark:bg-cyber-card border border-cyan-400/40 text-cyan-800 dark:text-cyber-cyan hover:bg-cyan-400 hover:text-black dark:hover:bg-cyber-cyan dark:hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              title="Pick random real boxes matching exam difficulty"
            >
              <Shuffle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">New Mock Set</span>
            </button>

            <button
              onClick={handleExportReport}
              className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/20 border border-emerald-300 dark:border-cyber-emerald/50 text-emerald-900 dark:text-cyber-emerald hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-glow-emerald/20"
              title="Download formal Markdown Exam Log"
            >
              <FileDown className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">Export Report</span>
            </button>
          </div>

        </div>

        {/* 2. Compliance Warning & Status Banner */}
        {scoreData.complianceIssues.length > 0 && scoreData.totalScore > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold flex items-center gap-2">
                <span>OFFSEC PROOF COMPLIANCE ALERT ({scoreData.complianceIssues.length} items missing)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-500/20 border border-amber-400 dark:border-amber-500/40 text-amber-950 dark:text-amber-200">
                  DISQUALIFICATION RISK
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-200/90 mt-0.5">
                Official OffSec regulations require an interactive shell with <code>whoami</code> and <code>ipconfig / ifconfig</code> outputs and proof screenshots. Points are rejected without verified proof artifacts!
              </p>
            </div>
          </div>
        )}

        {scoreData.isCompliant && scoreData.totalScore >= scoreData.passThreshold && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-bold">
              100% OFFSEC COMPLIANT: All mandatory screenshot checkpoints, whoami executions, and network proof commands verified!
            </span>
          </div>
        )}
      </div>

      {/* 3. Exam Targets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {session.boxes.map((box) => {
          const isExpanded = expandedBoxId === box.id;
          const isAd = box.type.startsWith('ad') || box.type.includes('dc');
          const isFullyPwned = (box.userPoints === 0 || box.userPwned) && (box.rootPoints === 0 || box.rootPwned);

          const userVal = validateFlagFormat(box.userProof?.flagText || "");
          const rootVal = validateFlagFormat(box.rootProof?.flagText || "");

          return (
            <div
              key={box.id}
              className={`p-4 rounded-xl border bg-white dark:bg-cyber-card/95 relative overflow-hidden transition-all shadow-sm ${
                isFullyPwned
                  ? 'border-emerald-500 dark:border-cyber-emerald shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'border-slate-200 dark:border-cyber-border hover:border-slate-300 dark:hover:border-cyber-borderGlow'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isAd ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-400 border border-purple-300 dark:border-purple-800/40' : 'bg-cyan-100 dark:bg-cyber-bg text-cyan-900 dark:text-cyber-cyan border border-cyan-300 dark:border-cyber-cyan/30'
                }`}>
                  {box.label}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                    {box.userPoints + box.rootPoints} PTS TOTAL
                  </span>
                  <button
                    onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
                    className="p-1 rounded bg-slate-100 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                    title={isExpanded ? 'Collapse proof checklist' : 'Expand proof checklist'}
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Box Identity */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{box.name}</h3>
                  <div className="text-[11px] text-slate-600 dark:text-cyber-muted font-mono flex items-center gap-2 mt-0.5">
                    <span>IP: <strong className="text-cyan-700 dark:text-cyber-cyan">{box.ip}</strong></span>
                    <span>•</span>
                    <OsBadge os={box.os} size="xs" />
                  </div>
                </div>

                <DifficultyBadge difficulty={box.difficulty} size="xs" />
              </div>

              {/* Quick Action Pwn Toggles */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {box.userPoints > 0 ? (
                  <button
                    onClick={() => togglePwn(box.id, 'user')}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      box.userPwned
                        ? 'bg-amber-100 dark:bg-cyber-amber/20 border-amber-400 dark:border-cyber-amber text-amber-950 dark:text-cyber-amber font-bold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Flag className="w-3 h-3" />
                      User Flag
                    </span>
                    <span>{box.userPwned ? `✓ +${box.userPoints}` : `+${box.userPoints}`}</span>
                  </button>
                ) : <div />}

                {box.rootPoints > 0 ? (
                  <button
                    onClick={() => togglePwn(box.id, 'root')}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      box.rootPwned
                        ? 'bg-emerald-100 dark:bg-cyber-emerald/20 border-emerald-400 dark:border-cyber-emerald text-emerald-950 dark:text-cyber-emerald font-bold shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3 h-3" />
                      Root Flag
                    </span>
                    <span>{box.rootPwned ? `👑 +${box.rootPoints}` : `+${box.rootPoints}`}</span>
                  </button>
                ) : <div />}
              </div>

              {/* Expandable Proof Checklist */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-slate-200 dark:border-cyber-border/70 space-y-4 text-xs"
                  >
                    {/* User Proof Section */}
                    {box.userPoints > 0 && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-800 dark:text-cyber-amber flex items-center gap-1.5">
                            <Flag className="w-3.5 h-3.5" />
                            USER PROOF (local.txt)
                          </span>
                          {box.userProof.flagText && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              userVal.valid ? 'bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald border border-emerald-300 dark:border-cyber-emerald/40' : 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-400 border border-red-300 dark:border-red-800'
                            }`}>
                              {userVal.label}
                            </span>
                          )}
                        </div>

                        {/* Flag Input */}
                        <div>
                          <input
                            id={`box-user-flag-${box.id}`}
                            name={`box-user-flag-${box.id}`}
                            aria-label="Captured user flag string or hash"
                            type="text"
                            value={box.userProof?.flagText || ""}
                            onChange={(e) => updateBoxProof(box.id, 'user', 'flagText', e.target.value)}
                            placeholder="Enter captured user flag string or hash..."
                            className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted text-xs font-mono focus:outline-none focus:border-amber-500 dark:focus:border-cyber-amber shadow-sm"
                          />
                        </div>

                        {/* Checklist items */}
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-gray-300">
                            <input
                              id={`box-user-screenshot-${box.id}`}
                              name={`box-user-screenshot-${box.id}`}
                              aria-label="Screenshot taken showing local.txt, whoami, and ipconfig"
                              type="checkbox"
                              checked={box.userProof?.screenshotTaken || false}
                              onChange={(e) => updateBoxProof(box.id, 'user', 'screenshotTaken', e.target.checked)}
                              className="rounded border-slate-300 dark:border-cyber-border bg-white dark:bg-cyber-card text-amber-600 dark:text-cyber-amber focus:ring-0"
                            />
                            <span className="flex items-center gap-1 text-[11px]">
                              <Camera className="w-3 h-3 text-amber-600 dark:text-cyber-amber" />
                              Mandatory Screenshot taken showing local.txt + whoami + ipconfig
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <input
                              id={`box-user-whoami-${box.id}`}
                              name={`box-user-whoami-${box.id}`}
                              aria-label="whoami command output"
                              type="text"
                              value={box.userProof?.whoamiOutput || ""}
                              onChange={(e) => updateBoxProof(box.id, 'user', 'whoamiOutput', e.target.value)}
                              placeholder="whoami command output..."
                              className="px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted font-mono focus:outline-none focus:border-amber-500 dark:focus:border-cyber-amber shadow-sm"
                            />
                            <input
                              id={`box-user-ipconfig-${box.id}`}
                              name={`box-user-ipconfig-${box.id}`}
                              aria-label="ipconfig / ifconfig output"
                              type="text"
                              value={box.userProof?.ipconfigOutput || ""}
                              onChange={(e) => updateBoxProof(box.id, 'user', 'ipconfigOutput', e.target.value)}
                              placeholder="ipconfig / ifconfig output..."
                              className="px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted font-mono focus:outline-none focus:border-amber-500 dark:focus:border-cyber-amber shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Root Proof Section */}
                    {box.rootPoints > 0 && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800 dark:text-cyber-emerald flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            ROOT / SYSTEM PROOF (proof.txt)
                          </span>
                          {box.rootProof.flagText && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              rootVal.valid ? 'bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald border border-emerald-300 dark:border-cyber-emerald/40' : 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-400 border border-red-300 dark:border-red-800'
                            }`}>
                              {rootVal.label}
                            </span>
                          )}
                        </div>

                        {/* Flag Input */}
                        <div>
                          <input
                            id={`box-root-flag-${box.id}`}
                            name={`box-root-flag-${box.id}`}
                            aria-label="Captured root flag string or hash"
                            type="text"
                            value={box.rootProof?.flagText || ""}
                            onChange={(e) => updateBoxProof(box.id, 'root', 'flagText', e.target.value)}
                            placeholder="Enter captured root flag string or hash..."
                            className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted text-xs font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald shadow-sm"
                          />
                        </div>

                        {/* Checklist items */}
                        <div className="space-y-1.5 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-gray-300">
                            <input
                              id={`box-root-screenshot-${box.id}`}
                              name={`box-root-screenshot-${box.id}`}
                              aria-label="Screenshot taken showing proof.txt, whoami, and ipconfig"
                              type="checkbox"
                              checked={box.rootProof?.screenshotTaken || false}
                              onChange={(e) => updateBoxProof(box.id, 'root', 'screenshotTaken', e.target.checked)}
                              className="rounded border-slate-300 dark:border-cyber-border bg-white dark:bg-cyber-card text-emerald-600 dark:text-cyber-emerald focus:ring-0"
                            />
                            <span className="flex items-center gap-1 text-[11px]">
                              <Camera className="w-3 h-3 text-emerald-600 dark:text-cyber-emerald" />
                              Mandatory Screenshot taken showing proof.txt + whoami + ipconfig
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <input
                              id={`box-root-whoami-${box.id}`}
                              name={`box-root-whoami-${box.id}`}
                              aria-label="whoami output (root / system)"
                              type="text"
                              value={box.rootProof?.whoamiOutput || ""}
                              onChange={(e) => updateBoxProof(box.id, 'root', 'whoamiOutput', e.target.value)}
                              placeholder="whoami output (root / system)..."
                              className="px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald shadow-sm"
                            />
                            <input
                              id={`box-root-ipconfig-${box.id}`}
                              name={`box-root-ipconfig-${box.id}`}
                              aria-label="ipconfig / ifconfig output"
                              type="text"
                              value={box.rootProof?.ipconfigOutput || ""}
                              onChange={(e) => updateBoxProof(box.id, 'root', 'ipconfigOutput', e.target.value)}
                              placeholder="ipconfig / ifconfig output..."
                              className="px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 4. Exam Scratchpad & Evidence Vault */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyber-cyan" />
            OFFICIAL EXAM EVIDENCE VAULT & CREDENTIAL SCRATCHPAD
          </span>
          <span className="text-[10px] text-slate-500 dark:text-cyber-muted">Persisted automatically in local storage • Embedded in exported report</span>
        </div>
        <textarea
          id="exam-scratch-notes"
          name="exam-scratch-notes"
          aria-label="Exam Scratchpad Notes"
          value={session.scratchNotes}
          onChange={(e) => setSession((prev) => ({ ...prev, scratchNotes: e.target.value }))}
          rows={6}
          className="w-full p-3 rounded-lg bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted font-mono focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan leading-relaxed shadow-inner"
          placeholder="Paste credentials, pivot routes, Nmap outputs, and command reproduction logs here..."
        />
      </div>
    </div>
  );
};
