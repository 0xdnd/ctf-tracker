import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  ChevronRight,
  ChevronDown,
  Terminal,
  Trophy,
  Coffee,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  User,
  Shield,
  Layers,
  HelpCircle,
  ExternalLink,
  Flame,
  X
} from 'lucide-react';
import { useExamStore } from '../store/examStore';
import { OsBadge } from '../components/common/OsBadge';
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import { triggerRootCelebration } from '../utils/helpers';
import { playCyberAlert } from '../utils/audioAlerts';
import { 
  ExamTrack, 
  ExamBox, 
  ExamSessionState,
  EXAM_TRACK_CONFIGS,
  calculateExamScore, 
  generateExamReportMarkdown,
  validateFlagFormat,
  isActiveDirectoryBox,
  isDomainControllerBox
} from '../utils/examComplianceUtils';
import { computeExamPacing, formatSecondsToHms } from '../utils/examPacingUtils';
import { ExamEvidenceDropzone } from '../components/exam/ExamEvidenceDropzone';
import { ExamBioBreakModal } from '../components/exam/ExamBioBreakModal';
import { ExamReportModal } from '../components/exam/ExamReportModal';

export const ExamSimulatorPage: React.FC = () => {
  const {
    id,
    track,
    status,
    boxes,
    startedAt,
    examExpiresAt,
    totalDurationSeconds,
    timerPausedRemainingSeconds,
    remainingSeconds,
    activeBreak,
    breakHistory,
    milestones,
    scratchNotes,
    includeBonusPoints,
    candidateName,
    candidateCallsign,
    osid,
    startExam,
    pauseExam,
    resumeExam,
    resetExam,
    setTrack,
    shuffleTargets,
    submitFlag,
    togglePwn,
    setCandidateInfo,
    setScratchNotes,
    setIncludeBonusPoints,
    getRemainingSeconds,
    getBreakRemainingSeconds,
    getScore,
    getPassingStatus,
    tick,
  } = useExamStore(
    useShallow((s) => ({
      id: s.id,
      track: s.track,
      status: s.status,
      boxes: s.boxes,
      startedAt: s.startedAt,
      examExpiresAt: s.examExpiresAt,
      totalDurationSeconds: s.totalDurationSeconds,
      timerPausedRemainingSeconds: s.timerPausedRemainingSeconds,
      remainingSeconds: s.remainingSeconds,
      activeBreak: s.activeBreak,
      breakHistory: s.breakHistory,
      milestones: s.milestones,
      scratchNotes: s.scratchNotes,
      includeBonusPoints: s.includeBonusPoints,
      candidateName: s.candidateName,
      candidateCallsign: s.candidateCallsign,
      osid: s.osid,
      startExam: s.startExam,
      pauseExam: s.pauseExam,
      resumeExam: s.resumeExam,
      resetExam: s.resetExam,
      setTrack: s.setTrack,
      shuffleTargets: s.shuffleTargets,
      submitFlag: s.submitFlag,
      togglePwn: s.togglePwn,
      setCandidateInfo: s.setCandidateInfo,
      setScratchNotes: s.setScratchNotes,
      setIncludeBonusPoints: s.setIncludeBonusPoints,
      getRemainingSeconds: s.getRemainingSeconds,
      getBreakRemainingSeconds: s.getBreakRemainingSeconds,
      getScore: s.getScore,
      getPassingStatus: s.getPassingStatus,
      tick: s.tick,
    }))
  );

  // Expanded box card for evidence dropzones
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null);
  const [activeProofTab, setActiveProofTab] = useState<'user' | 'root'>('user');

  // Bio-Break Modal visibility
  const [isBioBreakModalOpen, setIsBioBreakModalOpen] = useState(false);

  // Exam Report Generator Modal visibility
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Victory celebration state
  const [showVictoryBanner, setShowVictoryBanner] = useState(false);
  const prevIsPassingRef = useRef(false);

  // Score & passing status
  const scoreData = useMemo(() => {
    return calculateExamScore(track, boxes, { includeBonusPoints });
  }, [track, boxes, includeBonusPoints]);

  const passingStatus = getPassingStatus();
  const currentRemaining = getRemainingSeconds();
  const trackConfig = EXAM_TRACK_CONFIGS[track] || EXAM_TRACK_CONFIGS.OSCP;

  // Dynamic Pacing Telemetry
  const pacing = useMemo(() => {
    return computeExamPacing(
      {
        examStartedAt: startedAt,
        examExpiresAt,
        timerPausedRemainingSeconds,
        totalDurationSeconds,
        boxes,
      },
      {
        totalScore: scoreData.totalScore,
        passThreshold: scoreData.passThreshold,
      }
    );
  }, [startedAt, examExpiresAt, timerPausedRemainingSeconds, totalDurationSeconds, boxes, scoreData]);

  // Victory Celebration Trigger when passing threshold is first reached
  useEffect(() => {
    if (scoreData.isPassing && !prevIsPassingRef.current && status !== 'idle') {
      setShowVictoryBanner(true);
      triggerRootCelebration();
      playCyberAlert('victory_fanfare');
    }
    prevIsPassingRef.current = scoreData.isPassing;
  }, [scoreData.isPassing, status]);

  // Open 1-Click Submission-Ready Exam Report Modal & trigger export
  const handleExportReport = () => {
    setIsReportModalOpen(true);
    const sessionPayload: ExamSessionState = {
      id,
      track,
      candidateName,
      candidateCallsign,
      osid,
      examStartedAt: startedAt || Date.now(),
      examDurationSeconds: totalDurationSeconds,
      examExpiresAt,
      isTimerRunning: status === 'running',
      timerPausedRemainingSeconds,
      boxes,
      scratchNotes,
      includeBonusPoints,
    };
    const md = generateExamReportMarkdown(sessionPayload);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track}_EXAM_REPORT_${candidateCallsign || 'candidate'}_${new Date().toISOString().slice(0, 10)}.md`;
    try {
      a.click();
    } catch {}
    URL.revokeObjectURL(url);
  };

  // Toggle Timer Play / Pause
  const handleToggleTimer = () => {
    if (status === 'running') {
      pauseExam();
    } else if (status === 'paused') {
      resumeExam();
    }
  };

  // Handle Starting the Exam from Pre-flight Setup
  const handleStartExam = () => {
    startExam(track, { candidateName, candidateCallsign, osid });
  };

  // Separate Active Directory boxes from Standalones
  const adBoxes = useMemo(() => {
    return boxes.filter((b) => isActiveDirectoryBox(b));
  }, [boxes]);

  const standaloneBoxes = useMemo(() => {
    return boxes.filter((b) => !isActiveDirectoryBox(b));
  }, [boxes]);

  return (
    <div
      className="w-full space-y-6 font-mono pb-12"
      data-testid="exam-simulator-page"
    >
      {/* ================================================================= */}
      {/* VICTORY CELEBRATION MODAL / BANNER                                */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showVictoryBanner && scoreData.isPassing && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            data-testid="exam-victory-banner"
            className="p-4 rounded-xl bg-[#18181b] border border-emerald-500 shadow-xs relative overflow-hidden font-mono"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md font-black uppercase tracking-widest bg-emerald-500 text-slate-950">
                      VICTORY CONFIRMED
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      {scoreData.totalScore} / {scoreData.maxScore} PTS ACHIEVED
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5 tracking-wide">
                    {track} PASSING THRESHOLD SURPASSED!
                  </h2>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Congratulations operator! Verify all proof screenshots, `whoami`, and network outputs before exporting your report.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Report (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVictoryBanner(false)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-[#27272a] active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  aria-label="Dismiss victory banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* 1. SETUP / PRE-FLIGHT VIEW (status === 'idle')                     */}
      {/* ================================================================= */}
      {status === 'idle' && (
        <div
          data-testid="exam-setup-view"
          className="space-y-6 animate-in fade-in duration-200"
        >
          {/* Header Banner */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-xs space-y-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    ZEROBOX // CERTIFICATION EXAM SIMULATOR
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    Authentic OffSec OSCP, HTB CPTS & CRTO hands-on lab environments with persistent scoring matrices & evidence engine.
                  </p>
                </div>
              </div>

              {/* Start Exam CTA */}
              <button
                type="button"
                data-testid="exam-start-btn"
                onClick={handleStartExam}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch {track} Exam Clock</span>
              </button>
            </div>
          </div>

          {/* Track Selection Cards */}
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                1. Select Certification Ruleset
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                Calibrated to authentic syllabus standards
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['OSCP', 'CPTS', 'CRTO'] as ExamTrack[]).map((t) => {
                const conf = EXAM_TRACK_CONFIGS[t];
                const isSelected = track === t;
                return (
                  <div
                    key={t}
                    role="button"
                    tabIndex={0}
                    data-testid={`exam-track-select-${t.toLowerCase()}`}
                    onClick={() => setTrack(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setTrack(t);
                      }
                    }}
                    className={`cursor-pointer p-4 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-[#18181b] border-2 border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-[#09090b] border-slate-200 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-[#3f3f46]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {t}
                      </span>
                      <span className="text-[11px] font-bold text-cyan-500 dark:text-cyan-400">
                        Pass: {conf.passThreshold} Pts
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{conf.name}</h3>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-3 mb-3 leading-relaxed">
                      {conf.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200 dark:border-[#27272a] text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                      <span>Duration: {Math.round(conf.durationSeconds / 3600)}h</span>
                      <span>{conf.targetSummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Candidate Profile & Configuration */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-xs space-y-4 font-mono">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>2. Candidate Identity & Lab Parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="candidate-name" className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                  Candidate Full Name
                </label>
                <input
                  id="candidate-name"
                  name="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateInfo({ candidateName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Daniel Dayan"
                />
              </div>

              <div>
                <label htmlFor="candidate-callsign" className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                  Candidate Callsign
                </label>
                <input
                  id="candidate-callsign"
                  name="candidateCallsign"
                  type="text"
                  value={candidateCallsign}
                  onChange={(e) => setCandidateInfo({ candidateCallsign: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="0xdnd"
                />
              </div>

              <div>
                <label htmlFor="candidate-osid" className="block text-[11px] text-slate-500 dark:text-zinc-400 mb-1">
                  OffSec OSID / HTB ID
                </label>
                <input
                  id="candidate-osid"
                  name="osid"
                  type="text"
                  value={osid}
                  onChange={(e) => setCandidateInfo({ osid: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="OS-94821"
                />
              </div>
            </div>

            {/* Bonus Points Option */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeBonusPoints}
                  onChange={(e) => setIncludeBonusPoints(e.target.checked)}
                  className="rounded-md border-slate-300 dark:border-[#27272a] bg-slate-50 dark:bg-[#09090b] text-cyan-500 focus:ring-0"
                />
                <span>
                  Include +10 Bonus Points (OffSec lab exercise completion & approved writeup)
                </span>
              </label>
            </div>
          </div>

          {/* Target Set Preview */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-xs space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>3. Generated Mock Target Set ({boxes.length} Machines)</span>
              </h2>
              <button
                type="button"
                onClick={shuffleTargets}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#09090b] hover:dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-slate-200 dark:border-[#27272a] flex items-center gap-1 active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Re-roll Mock Targets</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {boxes.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-xs space-y-1.5 font-mono shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{b.name}</span>
                    <DifficultyBadge difficulty={b.difficulty} size="xs" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                    <span>IP: <strong className="text-cyan-600 dark:text-cyan-400">{b.ip}</strong></span>
                    <OsBadge os={b.os} size="xs" />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-200 dark:border-[#27272a] flex items-center justify-between">
                    <span>{b.label}</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      {b.userPoints + b.rootPoints} PTS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. ACTIVE COCKPIT VIEW (status === 'running' | 'paused')          */}
      {/* ================================================================= */}
      {(status === 'running' || status === 'paused') && (
        <div
          data-testid="exam-active-cockpit"
          className="space-y-6 animate-in fade-in duration-200 font-mono"
        >
          {/* Top Telemetry & Control HUD */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-xs space-y-4 font-mono">
            {/* Header Identity Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#27272a]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                      {trackConfig.name} // ACTIVE COCKPIT
                    </h1>
                    <span
                      data-testid="exam-status-badge"
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        scoreData.isPassing
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : passingStatus === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {passingStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">
                    Candidate: <strong className="text-slate-800 dark:text-zinc-200">{candidateName} ({candidateCallsign})</strong> • OSID: {osid}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Bio-Break & Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="exam-open-bio-break-btn"
                  onClick={() => setIsBioBreakModalOpen(true)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1.5 active:scale-[0.98] shadow-xs ${
                    activeBreak.isActive
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#09090b] hover:dark:bg-slate-900 border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Open Operator Bio-Break Manager"
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{activeBreak.isActive ? 'Active Break' : 'Bio Break'}</span>
                  {activeBreak.isActive && (
                    <span className="font-mono text-amber-500 dark:text-amber-400">
                      ({formatSecondsToHms(getBreakRemainingSeconds())})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="exam-export-report-btn"
                  onClick={handleExportReport}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1.5 active:scale-[0.98] shadow-xs"
                  title="Download formal Markdown Exam Log"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Telemetry Numbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Score Counter */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                    Total Exam Score
                  </span>
                  <div
                    data-testid="exam-score-display"
                    className="flex items-baseline gap-1 mt-0.5"
                  >
                    <span
                      className={`text-2xl font-bold font-mono ${
                        scoreData.isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {scoreData.totalScore}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">/ {scoreData.maxScore} PTS</span>
                  </div>
                </div>
                <div className="text-right">
                  {scoreData.isPassing ? (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30">
                      PASSED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30">
                      {scoreData.pointsNeeded} PTS NEEDED
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Countdown Timer */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                    <span>Countdown Clock</span>
                  </span>
                  <div
                    data-testid="exam-countdown-timer"
                    className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-widest mt-0.5 tabular-nums"
                  >
                    {formatSecondsToHms(currentRemaining)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="exam-timer-toggle-btn"
                    onClick={handleToggleTimer}
                    className={`p-2 rounded-lg border transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-xs ${
                      status === 'running'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                        : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
                    }`}
                    title={status === 'running' ? 'Pause Exam' : 'Resume Exam'}
                  >
                    {status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    data-testid="exam-timer-reset-btn"
                    onClick={() => resetExam(track)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
                    title="Reset Exam Session"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Pacing Velocity */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Velocity Pacing</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {pacing.currentPacePtsPerHour}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">pts / hr current</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                  Required: {pacing.requiredPacePtsPerHour} pts/hr
                </div>
              </div>

              {/* Card 4: Unrooted Boxes & Time Budget */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] shadow-xs">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span>Target Budget</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {pacing.unrootedBoxesCount}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">unrooted targets</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                  ~{Math.round(pacing.timeRemainingPerUnrootedBoxSeconds / 60)}m per box
                </div>
              </div>
            </div>

            {/* Pacing Recommendation Strip */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-2 shadow-xs">
              <Zap className="w-4 h-4 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
              <span className="text-[11px] leading-snug">
                <strong>Tactical Guidance:</strong> {pacing.recommendation}
              </span>
            </div>

            {/* Compliance Warning if flags lack proofs */}
            {scoreData.complianceIssues.length > 0 && scoreData.totalScore > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>PROOF COMPLIANCE ALERT ({scoreData.complianceIssues.length} items missing)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200">
                      RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-0.5">
                    Certifications require verified proof screenshots, `whoami`, and network configuration (`ip a`/`ipconfig`) output for every flag! Expand targets below to attach evidence.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Inventory Sections */}
          <div className="space-y-4 font-mono">
            {/* Section A: Active Directory Set (for OSCP / AD tracks) */}
            {adBoxes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/40 font-mono">
                      Active Directory Set (40 PTS)
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      {scoreData.adSetCompromised ? '✓ Fully Compromised' : 'Chained domain privilege escalation'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {adBoxes.map((box) => renderTargetCard(box))}
                </div>
              </div>
            )}

            {/* Section B: Standalone Targets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-mono">
                    Standalone Machines ({standaloneBoxes.length} Boxes)
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    Independent Foothold & Root Flags
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {standaloneBoxes.map((box) => renderTargetCard(box))}
              </div>
            </div>
          </div>

          {/* Exam Scratchpad & Evidence Vault */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-none space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>OFFICIAL EXAM EVIDENCE VAULT & CREDENTIAL SCRATCHPAD</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                Embedded directly into exported exam reports
              </span>
            </div>
            <textarea
              id="exam-scratch-notes"
              data-testid="exam-scratch-notes"
              aria-label="Exam Scratchpad Notes"
              value={scratchNotes}
              onChange={(e) => setScratchNotes(e.target.value)}
              rows={6}
              className="w-full p-3.5 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 font-mono focus:outline-none focus:border-cyan-500 leading-relaxed shadow-none resize-none"
              placeholder="Record compromised credentials, active SOCKS5 tunnels, pivot routing tables, and Nmap discovery logs here..."
            />
          </div>

          {/* Operational Timeline / Milestones */}
          {milestones.length > 0 && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-none space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>OPERATIONAL MILESTONE AUDIT TRAIL ({milestones.length})</span>
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {milestones.slice().reverse().map((m, idx) => (
                  <div
                    key={`${m.id}_${idx}`}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-xs flex items-start justify-between gap-3"
                  >
                    <span className="text-slate-800 dark:text-zinc-300 font-mono">{m.notes}</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono flex-shrink-0">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. COMPLETION VIEW (status === 'completed')                        */}
      {/* ================================================================= */}
      {status === 'completed' && (
        <div
          data-testid="exam-completion-view"
          className="p-6 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-none space-y-6 text-center animate-in fade-in font-mono"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="inline-flex p-3 rounded-xl bg-slate-100 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-cyan-600 dark:text-cyan-400 mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-wider">
              EXAM SESSION CONCLUDED
            </h1>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Final score evaluation completed for candidate <strong>{candidateName} ({candidateCallsign})</strong>.
            </p>
          </div>

          {/* Final Score Card */}
          <div className="max-w-xs mx-auto p-4 rounded-xl bg-slate-50 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] space-y-2 shadow-none">
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-bold">Final Score</div>
            <div className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
              {scoreData.totalScore} / {scoreData.maxScore} PTS
            </div>
            <div>
              {scoreData.isPassing ? (
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                  PASSED (Threshold: {scoreData.passThreshold} pts)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
                  FAILED (Threshold: {scoreData.passThreshold} pts)
                </span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-[transform,box-shadow,background-color,border-color,color] shadow-none active:scale-[0.98]"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Submission Report (.md)</span>
            </button>
            <button
              type="button"
              onClick={() => resetExam(track)}
              className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#09090b] hover:dark:bg-slate-900 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-[#27272a] font-bold text-xs uppercase tracking-wider transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-none"
            >
              Start New Simulation
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* BIO-BREAK MANAGER MODAL                                           */}
      {/* ================================================================= */}
      <ExamBioBreakModal
        isOpen={isBioBreakModalOpen}
        onClose={() => setIsBioBreakModalOpen(false)}
      />

      {/* ================================================================= */}
      {/* 1-CLICK SUBMISSION-READY EXAM REPORT MODAL                         */}
      {/* ================================================================= */}
      <ExamReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );

  // Helper renderer for Target Cards in Cockpit
  function renderTargetCard(box: ExamBox) {
    const isExpanded = expandedBoxId === box.id;
    const isFullyPwned =
      (box.userPoints === 0 || box.userPwned) && (box.rootPoints === 0 || box.rootPwned);

    return (
      <div
        key={box.id}
        className={`p-4 rounded-xl border bg-white dark:bg-[#18181b] transition-[box-shadow,background-color,border-color,color] font-mono shadow-none ${
          isFullyPwned
            ? 'border-emerald-500'
            : 'border-slate-200 dark:border-[#27272a] hover:border-slate-300 dark:hover:border-[#3f3f46]'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#09090b] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#27272a]">
            {box.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a]">
              {box.userPoints + box.rootPoints} PTS TOTAL
            </span>
            <button
              type="button"
              onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#09090b] hover:dark:bg-slate-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-[transform,background-color,border-color,color] border border-slate-200 dark:border-[#27272a] active:scale-[0.98]"
              title={isExpanded ? 'Collapse evidence drawer' : 'Expand evidence drawer'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Identity & Difficulty */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{box.name}</h3>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
              <span>IP: <strong className="text-cyan-600 dark:text-cyan-400">{box.ip}</strong></span>
              <span>•</span>
              <OsBadge os={box.os} size="xs" />
            </div>
          </div>
          <DifficultyBadge difficulty={box.difficulty} size="xs" />
        </div>

        {/* Pwn Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {box.userPoints > 0 ? (
            <button
              type="button"
              onClick={() => togglePwn(box.id, 'user')}
              className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-none ${
                box.userPwned
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#09090b] hover:dark:bg-slate-900 border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                <span>User Flag</span>
              </span>
              <span>{box.userPwned ? `✓ +${box.userPoints}` : `+${box.userPoints}`}</span>
            </button>
          ) : <div />}

          {box.rootPoints > 0 ? (
            <button
              type="button"
              onClick={() => togglePwn(box.id, 'root')}
              className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] shadow-none ${
                box.rootPwned
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#09090b] hover:dark:bg-slate-900 border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Root Flag</span>
              </span>
              <span>{box.rootPwned ? `👑 +${box.rootPoints}` : `+${box.rootPoints}`}</span>
            </button>
          ) : <div />}
        </div>

        {/* Expandable Evidence Dropzone Component */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-200 dark:border-[#27272a] space-y-3"
            >
              {/* Flag Evidence Tabs (User vs Root) */}
              <div className="flex gap-2">
                {box.userPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveProofTab('user')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-bold border transition-[transform,box-shadow,background-color,border-color,color] shadow-none active:scale-[0.98] ${
                      activeProofTab === 'user'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-[#09090b] border-slate-200 dark:border-[#27272a] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    User Evidence ({box.userProof.flagText ? '✓' : '○'})
                  </button>
                )}

                {box.rootPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveProofTab('root')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-bold border transition-[transform,box-shadow,background-color,border-color,color] shadow-none active:scale-[0.98] ${
                      activeProofTab === 'root'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-[#09090b] border-slate-200 dark:border-[#27272a] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Root Evidence ({box.rootProof.flagText ? '✓' : '○'})
                  </button>
                )}
              </div>

              {/* Render Evidence Dropzone for selected tab */}
              <ExamEvidenceDropzone
                box={box}
                flagType={activeProofTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
};
