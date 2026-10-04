import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { confirmAction } from '../store/useConfirmStore';
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
import { ExamBurndownChart } from '../components/exam/ExamBurndownChart';
import { buildBurndownSeries, resolveChartWindow } from '../utils/examBurndown';
import { ExamBioBreakModal } from '../components/exam/ExamBioBreakModal';
import { ExamReportModal } from '../components/exam/ExamReportModal';
import { TACTICAL_SPRING } from '../utils/motionTokens';

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

  const handleResetExam = async () => {
    const ok = await confirmAction({
      title: 'Reset this exam session?',
      body: 'Timer, flags, screenshots and notes for the current simulation will be cleared. This cannot be undone.',
      confirmLabel: 'Reset exam',
      tone: 'danger',
    });
    if (ok) resetExam(track);
  };

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

  // Burn-down series: memoized on boxes/session only (NOT on the 1Hz tick) so the
  // step path never re-renders; only the "now" marker moves.
  // While paused examExpiresAt is null; remember the last live expiry so the chart
  // window stays on the wall-clock axis (prior pause time included).
  const lastExpiresAtRef = useRef<number | null>(null);
  if (!startedAt) lastExpiresAtRef.current = null;
  else if (examExpiresAt !== null) lastExpiresAtRef.current = examExpiresAt;
  const chartWindow = startedAt
    ? resolveChartWindow({
        startedAt,
        examExpiresAt,
        lastExpiresAt: lastExpiresAtRef.current,
        totalDurationSeconds,
        timerPausedRemainingSeconds,
        currentRemainingSeconds: currentRemaining,
        boxes,
      })
    : null;
  const chartExpiresAt = chartWindow ? chartWindow.end : null;
  const burndownSeries = useMemo(() => {
    if (!startedAt || !chartExpiresAt) return null;
    return buildBurndownSeries(boxes, startedAt, chartExpiresAt, scoreData.passThreshold, {
      track,
      includeBonusPoints,
    });
  }, [boxes, startedAt, chartExpiresAt, scoreData.passThreshold, track, includeBonusPoints]);
  const chartNowMs = chartWindow ? chartWindow.nowMs : 0;

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
      className="w-full space-y-6 pb-12"
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
            transition={TACTICAL_SPRING}
            data-testid="exam-victory-banner"
            className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-callout-success-border shadow-md machined-edge relative overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg flex-shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-accent text-on-accent">
                      VICTORY CONFIRMED
                    </span>
                    <span className="text-xs text-callout-success-fg font-semibold tabular-nums font-mono">
                      {scoreData.totalScore} / {scoreData.maxScore} PTS ACHIEVED
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-primary mt-0.5 tracking-wide">
                    {track} PASSING THRESHOLD SURPASSED!
                  </h2>
                  <p className="text-xs text-secondary mt-0.5">
                    Congratulations operator! Verify all proof screenshots, `whoami`, and network outputs before exporting your report.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs flex items-center gap-1.5 active:scale-[0.97] transition shadow-sm machined-edge"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Report (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVictoryBanner(false)}
                  className="p-2 rounded-lg bg-surface-sunken hover:bg-surface-hover text-muted hover:text-primary border border-subtle active:scale-[0.97] transition machined-edge"
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
          <div className="p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-callout-tip-bg border border-callout-tip-border text-callout-tip-fg flex-shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-primary flex items-center gap-2">
                    ZEROBOX // CERTIFICATION EXAM SIMULATOR
                  </h1>
                  <p className="text-xs text-muted mt-1">
                    Authentic OffSec OSCP, HTB CPTS & CRTO hands-on lab environments with persistent scoring matrices & evidence engine.
                  </p>
                </div>
              </div>

              {/* Start Exam CTA */}
              <button
                type="button"
                data-testid="exam-start-btn"
                onClick={handleStartExam}
                className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs flex items-center gap-2 shadow-sm active:scale-[0.97] transition machined-edge"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch {track} Exam Clock</span>
              </button>
            </div>
          </div>

          {/* Track Selection Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-secondary">
                1. Select Certification Ruleset
              </h2>
              <span className="text-[10px] text-muted">
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
                    className={`cursor-pointer p-4 rounded-2xl border text-left transition active:scale-[0.97] machined-edge ${
                      isSelected
                        ? 'bg-surface-sunken border-2 border-accent shadow-sm'
                        : 'bg-surface-card border-subtle hover:border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-callout-tip-bg text-callout-tip-fg border border-callout-tip-border">
                        {t}
                      </span>
                      <span className="text-[11px] font-semibold text-accent font-mono tabular-nums">
                        Pass: {conf.passThreshold} Pts
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-primary mb-1">{conf.name}</h3>
                    <p className="text-[11px] text-muted line-clamp-3 mb-3 leading-relaxed">
                      {conf.description}
                    </p>

                    <div className="pt-2 border-t border-subtle text-[10px] text-muted flex items-center justify-between">
                      <span className="font-mono tabular-nums">Duration: {Math.round(conf.durationSeconds / 3600)}h</span>
                      <span>{conf.targetSummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Candidate Profile & Configuration */}
          <div className="p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-4">
            <h2 className="text-xs font-semibold text-secondary flex items-center gap-1.5">
              <User className="w-4 h-4 text-accent" />
              <span>2. Candidate Identity & Lab Parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="candidate-name" className="block text-[11px] text-muted mb-1">
                  Candidate Full Name
                </label>
                <input
                  id="candidate-name"
                  name="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateInfo({ candidateName: e.target.value })}
                  className="w-full bg-surface-sunken border border-subtle rounded-lg px-3 py-1.5 text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  placeholder="Daniel Dayan"
                />
              </div>

              <div>
                <label htmlFor="candidate-callsign" className="block text-[11px] text-muted mb-1">
                  Candidate Callsign
                </label>
                <input
                  id="candidate-callsign"
                  name="candidateCallsign"
                  type="text"
                  value={candidateCallsign}
                  onChange={(e) => setCandidateInfo({ candidateCallsign: e.target.value })}
                  className="w-full bg-surface-sunken border border-subtle rounded-lg px-3 py-1.5 text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  placeholder="0xdnd"
                />
              </div>

              <div>
                <label htmlFor="candidate-osid" className="block text-[11px] text-muted mb-1">
                  OffSec OSID / HTB ID
                </label>
                <input
                  id="candidate-osid"
                  name="osid"
                  type="text"
                  value={osid}
                  onChange={(e) => setCandidateInfo({ osid: e.target.value })}
                  className="w-full bg-surface-sunken border border-subtle rounded-lg px-3 py-1.5 text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  placeholder="OS-94821"
                />
              </div>
            </div>

            {/* Bonus Points Option */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary">
                <input
                  type="checkbox"
                  checked={includeBonusPoints}
                  onChange={(e) => setIncludeBonusPoints(e.target.checked)}
                  className="rounded border-strong bg-surface-sunken text-accent focus:ring-0"
                />
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-callout-warn-fg">[Legacy Pre-Nov 2024]</span>
                  <span>Include +10 OffSec Bonus Lab Points</span>
                </span>
              </label>
              <p className="mt-1 text-[11px] text-muted pl-6">
                ⚠️ OffSec officially eliminated the 10-point bonus starting November 1, 2024 (OSCP+). Current rubric requires 70+ pts scored exclusively on exam targets.
              </p>
            </div>
          </div>

          {/* Target Set Preview */}
          <div className="p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                <Target className="w-4 h-4 text-callout-success-fg" />
                <span>3. Generated Mock Target Set ({boxes.length} Machines)</span>
              </h2>
              <button
                type="button"
                onClick={shuffleTargets}
                className="px-2.5 py-1 rounded-lg bg-surface-sunken hover:bg-surface-hover text-accent text-xs font-semibold border border-subtle flex items-center gap-1 active:scale-[0.97] transition shadow-xs machined-edge"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Re-roll Mock Targets</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {boxes.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg bg-surface-sunken border border-subtle text-xs space-y-1.5 shadow-xs machined-edge"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary truncate">{b.name}</span>
                    <DifficultyBadge difficulty={b.difficulty} size="xs" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>IP: <strong className="text-accent font-mono tabular-nums">{b.ip}</strong></span>
                    <OsBadge os={b.os} size="xs" />
                  </div>
                  <div className="text-[10px] text-muted pt-1 border-t border-subtle flex items-center justify-between">
                    <span>{b.label}</span>
                    <span className="font-semibold text-secondary font-mono tabular-nums">
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
          className="space-y-6 animate-in fade-in duration-200"
        >
          {/* Top Telemetry & Control HUD */}
          <div className="p-4 sm:p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-4">
            {/* Header Identity Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-callout-tip-bg border border-callout-tip-border text-callout-tip-fg flex-shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-semibold text-primary tracking-wide">
                      {trackConfig.name} // ACTIVE COCKPIT
                    </h1>
                    <span
                      data-testid="exam-status-badge"
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        scoreData.isPassing
                          ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
                          : passingStatus === 'Critical'
                          ? 'bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border animate-pulse'
                          : 'bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border'
                      }`}
                    >
                      {passingStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Candidate: <strong className="text-secondary">{candidateName} ({candidateCallsign})</strong> • OSID: {osid}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Bio-Break & Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="exam-open-bio-break-btn"
                  onClick={() => setIsBioBreakModalOpen(true)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 active:scale-[0.97] shadow-xs machined-edge ${
                    activeBreak.isActive
                      ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg animate-pulse'
                      : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-secondary hover:text-primary'
                  }`}
                  title="Open Operator Bio-Break Manager"
                >
                  <Coffee className="w-3.5 h-3.5 text-callout-warn-fg" />
                  <span>{activeBreak.isActive ? 'Active Break' : 'Bio Break'}</span>
                  {activeBreak.isActive && (
                    <span className="font-mono text-callout-warn-fg tabular-nums">
                      ({formatSecondsToHms(getBreakRemainingSeconds())})
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="exam-export-report-btn"
                  onClick={handleExportReport}
                  className="px-3 py-1.5 rounded-lg bg-callout-success-bg hover:bg-callout-success-border/30 border border-callout-success-border text-callout-success-fg font-semibold text-xs transition flex items-center gap-1.5 active:scale-[0.97] shadow-xs machined-edge"
                  title="Download formal Markdown Exam Log"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Telemetry Numbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Score Counter */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-between shadow-xs machined-edge">
                <div>
                  <span className="text-[10px] text-muted font-semibold">
                    Total Exam Score
                  </span>
                  <div
                    data-testid="exam-score-display"
                    className="flex items-baseline gap-1 mt-0.5"
                  >
                    <span
                      className={`text-2xl font-semibold font-mono tabular-nums ${
                        scoreData.isPassing ? 'text-callout-success-fg' : 'text-callout-warn-fg'
                      }`}
                    >
                      {scoreData.totalScore}
                    </span>
                    <span className="text-muted text-xs font-mono tabular-nums">/ {scoreData.maxScore} PTS</span>
                  </div>
                </div>
                <div className="text-right">
                  {scoreData.isPassing ? (
                    <span className="text-[10px] font-semibold text-callout-success-fg px-2 py-0.5 rounded bg-callout-success-bg border border-callout-success-border">
                      PASSED
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-callout-warn-fg px-2 py-0.5 rounded bg-callout-warn-bg border border-callout-warn-border font-mono tabular-nums">
                      {scoreData.pointsNeeded} PTS NEEDED
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Countdown Timer */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-between shadow-xs machined-edge">
                <div>
                  <span className="text-[10px] text-muted font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-accent" />
                    <span>Countdown Clock</span>
                  </span>
                  <div
                    data-testid="exam-countdown-timer"
                    className="text-xl sm:text-2xl font-semibold font-mono text-primary mt-0.5 tabular-nums flex-shrink-0"
                  >
                    {formatSecondsToHms(currentRemaining)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="exam-timer-toggle-btn"
                    onClick={handleToggleTimer}
                    className={`p-2 rounded-lg border transition active:scale-[0.97] shadow-xs machined-edge ${
                      status === 'running'
                        ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
                        : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                    }`}
                    title={status === 'running' ? 'Pause Exam' : 'Resume Exam'}
                    aria-label={status === 'running' ? 'Pause exam' : 'Resume exam'}
                  >
                    {status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    data-testid="exam-timer-reset-btn"
                    onClick={handleResetExam}
                    className="p-2 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-muted hover:text-primary active:scale-[0.97] transition shadow-xs machined-edge"
                    title="Reset Exam Session"
                    aria-label="Reset exam session"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Pacing cards + burn-down chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:col-span-1">
              {/* Card 3: Pacing Velocity */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle shadow-xs machined-edge">
                <span className="text-[10px] text-muted font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-callout-warn-fg" />
                  <span>Velocity Pacing</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-semibold font-mono text-primary tabular-nums">
                    {pacing.currentPacePtsPerHour}
                  </span>
                  <span className="text-[11px] text-muted">pts / hr current</span>
                </div>
                <div className="text-[10px] text-muted mt-1">
                  Required: <span className="font-mono tabular-nums">{pacing.requiredPacePtsPerHour}</span> pts/hr
                </div>
              </div>

              {/* Card 4: Unrooted Boxes & Time Budget */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle shadow-xs machined-edge">
                <span className="text-[10px] text-muted font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-callout-tip-fg" />
                  <span>Target Budget</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-semibold font-mono text-primary tabular-nums">
                    {pacing.unrootedBoxesCount}
                  </span>
                  <span className="text-[11px] text-muted">unrooted targets</span>
                </div>
                <div className="text-[10px] text-muted mt-1">
                  ~<span className="font-mono tabular-nums">{Math.round(pacing.timeRemainingPerUnrootedBoxSeconds / 60)}</span>m per box
                </div>
              </div>
              </div>

              {/* Burn-down / velocity chart */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle shadow-xs machined-edge lg:col-span-2">
                <span className="text-[10px] text-muted font-semibold flex items-center gap-1 mb-2">
                  <Target className="w-3 h-3 text-accent" />
                  <span>Burn-down to Pass</span>
                </span>
                {burndownSeries ? (
                  <ExamBurndownChart
                    series={burndownSeries}
                    nowMs={chartNowMs}
                    currentPoints={scoreData.totalScore}
                    remainingSeconds={currentRemaining}
                  />
                ) : null}
              </div>
            </div>

            {/* Pacing Recommendation Strip */}
            <div className="p-2.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-secondary flex items-center gap-2 shadow-xs machined-edge">
              <Zap className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-[11px] leading-snug">
                <strong>Tactical Guidance:</strong> {pacing.recommendation}
              </span>
            </div>

            {/* Compliance Warning if flags lack proofs */}
            {scoreData.complianceIssues.length > 0 && scoreData.totalScore > 0 && (
              <div className="p-3 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg text-xs flex items-start gap-2.5 shadow-xs machined-edge">
                <AlertTriangle className="w-4 h-4 text-callout-warn-fg flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span>PROOF COMPLIANCE ALERT ({scoreData.complianceIssues.length} items missing)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg">
                      RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-callout-warn-fg mt-0.5">
                    Certifications require verified proof screenshots, `whoami`, and network configuration (`ip a`/`ipconfig`) output for every flag! Expand targets below to attach evidence.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Inventory Sections */}
          <div className="space-y-4">
            {/* Section A: Active Directory Set (for OSCP / AD tracks) */}
            {adBoxes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-callout-tip-bg text-callout-tip-fg border border-callout-tip-border">
                      Active Directory Set (40 PTS)
                    </span>
                    <span className="text-xs text-muted">
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-callout-info-bg text-accent border border-callout-info-border">
                    Standalone Machines ({standaloneBoxes.length} Boxes)
                  </span>
                  <span className="text-xs text-muted">
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
          <div className="p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent" />
                <span>OFFICIAL EXAM EVIDENCE VAULT & CREDENTIAL SCRATCHPAD</span>
              </span>
              <span className="text-[10px] text-muted">
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
              className="w-full p-3.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent leading-relaxed resize-none"
              placeholder="Record compromised credentials, active SOCKS5 tunnels, pivot routing tables, and Nmap discovery logs here..."
            />
          </div>

          {/* Operational Timeline / Milestones */}
          {milestones.length > 0 && (
            <div className="p-5 rounded-2xl border border-subtle bg-surface-card shadow-sm machined-edge space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-callout-tip-fg" />
                  <span>OPERATIONAL MILESTONE AUDIT TRAIL ({milestones.length})</span>
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {milestones.slice().reverse().map((m, idx) => (
                  <div
                    key={`${m.id}_${idx}`}
                    className="p-2 rounded-lg bg-surface-sunken border border-subtle text-xs flex items-start justify-between gap-3 font-mono tabular-nums machined-edge"
                  >
                    <span className="text-secondary">{m.notes}</span>
                    <span className="text-[10px] text-muted font-mono flex-shrink-0 tabular-nums">
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
          className="p-6 rounded-2xl border border-subtle bg-surface-card shadow-lg machined-edge space-y-6 text-center animate-in fade-in"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-surface-sunken border border-subtle text-accent mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-primary">
              EXAM SESSION CONCLUDED
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Final score evaluation completed for candidate <strong>{candidateName} ({candidateCallsign})</strong>.
            </p>
          </div>

          {/* Final Score Card */}
          <div className="max-w-xs mx-auto p-4 rounded-2xl bg-surface-sunken border border-subtle space-y-2 shadow-xs machined-edge">
            <div className="text-[11px] text-muted font-semibold">Final Score</div>
            <div className="text-3xl font-semibold font-mono text-primary tabular-nums">
              {scoreData.totalScore} / {scoreData.maxScore} PTS
            </div>
            <div>
              {scoreData.isPassing ? (
                <span className="px-3 py-1 rounded text-xs font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                  PASSED (Threshold: {scoreData.passThreshold} pts)
                </span>
              ) : (
                <span className="px-3 py-1 rounded text-xs font-semibold bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border">
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
              className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-[0.97] machined-edge"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Submission Report (.md)</span>
            </button>
            <button
              type="button"
              onClick={handleResetExam}
              className="px-5 py-2.5 rounded-lg bg-surface-sunken hover:bg-surface-hover text-secondary border border-subtle font-semibold text-xs transition active:scale-[0.97] shadow-xs machined-edge"
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
        className={`p-4 rounded-2xl border bg-surface-card transition shadow-xs machined-edge ${
          isFullyPwned
            ? 'border-callout-success-border ring-1 ring-callout-success-border'
            : 'border-subtle hover:border-strong'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-surface-sunken text-secondary border border-subtle">
            {box.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-surface-sunken border border-subtle font-mono tabular-nums">
              {box.userPoints + box.rootPoints} PTS TOTAL
            </span>
            <button aria-label={isExpanded ? 'Collapse evidence drawer' : 'Expand evidence drawer'}
              type="button"
              onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
              className="p-1 rounded-lg bg-surface-sunken hover:bg-surface-hover text-muted hover:text-primary transition border border-subtle active:scale-[0.97] machined-edge"
              title={isExpanded ? 'Collapse evidence drawer' : 'Expand evidence drawer'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Identity & Difficulty */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-primary tracking-wide">{box.name}</h3>
            <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
              <span>IP: <strong className="text-accent font-mono tabular-nums">{box.ip}</strong></span>
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
              className={`p-2 rounded-lg border text-xs flex items-center justify-between transition active:scale-[0.97] font-mono tabular-nums shadow-none machined-edge ${
                box.userPwned
                  ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg font-semibold'
                  : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-muted hover:text-primary'
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
              className={`p-2 rounded-lg border text-xs flex items-center justify-between transition active:scale-[0.97] font-mono tabular-nums shadow-none machined-edge ${
                box.rootPwned
                  ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg font-semibold'
                  : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-muted hover:text-primary'
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
              transition={TACTICAL_SPRING}
              className="pt-3 border-t border-subtle space-y-3"
            >
              {/* Flag Evidence Tabs (User vs Root) */}
              <div className="flex gap-2">
                {box.userPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveProofTab('user')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition shadow-none active:scale-[0.97] machined-edge ${
                      activeProofTab === 'user'
                        ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
                        : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
                    }`}
                  >
                    User Evidence ({box.userProof.flagText ? '✓' : '○'})
                  </button>
                )}

                {box.rootPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveProofTab('root')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition shadow-none active:scale-[0.97] machined-edge ${
                      activeProofTab === 'root'
                        ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                        : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
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
