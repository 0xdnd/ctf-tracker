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
import { buildBurndownSeries, resolveChartWindow, persistChartExpiry, readPersistedChartExpiry } from '../utils/examBurndown';
import { PageHeader } from '../components/common/PageHeader';
import { CyberButton } from '../components/common/CyberButton';
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
      },
      Date.now(),
      trackConfig
    );
  }, [startedAt, examExpiresAt, timerPausedRemainingSeconds, totalDurationSeconds, boxes, scoreData, trackConfig]);

  // Burn-down series: memoized on boxes/session only (NOT on the 1Hz tick) so the
  // step path never re-renders; only the "now" marker moves.
  // While paused examExpiresAt is null; remember the last live expiry so the chart
  // window stays on the wall-clock axis (prior pause time included).
  const lastExpiresAtRef = useRef<number | null>(null);
  if (!startedAt) lastExpiresAtRef.current = null;
  else if (examExpiresAt !== null) {
    lastExpiresAtRef.current = examExpiresAt;
    persistChartExpiry(startedAt, examExpiresAt);
  } else if (lastExpiresAtRef.current === null) {
    // Reloaded while paused: recover the expiry persisted before the pause.
    lastExpiresAtRef.current = readPersistedChartExpiry(startedAt);
  }
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
            className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-callout-success-border machined-edge relative overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg flex-shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-accent text-on-accent">
                      Victory confirmed
                    </span>
                    <span className="text-xs text-callout-success-fg font-semibold tabular-nums font-mono">
                      {scoreData.totalScore} / {scoreData.maxScore} pts achieved
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-primary mt-0.5 tracking-[-0.01em]">
                    {track} passing threshold surpassed
                  </h2>
                  <p className="text-xs text-secondary mt-0.5">
                    Verify every proof screenshot, `whoami` and network output before you export your report.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-4 py-2 max-sm:py-3 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-medium text-xs flex items-center gap-1.5 active:scale-[0.97] transition-interactive"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export report (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVictoryBanner(false)}
                  className="p-2 max-sm:p-3 rounded-lg bg-surface-sunken hover:bg-surface-hover text-muted hover:text-primary border border-subtle active:scale-[0.97] transition-interactive"
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
          <PageHeader
            title="Certification exam simulator"
            description="Timed OSCP, CPTS and CRTO practice with scoring, pacing and an evidence checklist."
            icon={<GraduationCap />}
            primaryAction={
              <CyberButton
                variant="primary"
                size="md"
                data-testid="exam-start-btn"
                className="max-sm:h-11 max-sm:flex-1"
                iconLeft={<Play className="w-3.5 h-3.5 fill-current" />}
                onClick={handleStartExam}
              >
                Launch {track} exam clock
              </CyberButton>
            }
          />

          {/* Track Selection Cards */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h2 className="text-sm font-semibold text-primary">
                1. Select certification ruleset
              </h2>
              <span className="text-[11px] text-muted">
                Matches the official syllabus scoring
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {(Object.keys(EXAM_TRACK_CONFIGS) as ExamTrack[]).map((t) => {
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
                    className={`cursor-pointer p-4 rounded-2xl border text-left transition-interactive active:scale-[0.97] machined-edge ${
 isSelected
 ? 'bg-surface-sunken border-accent ring-1 ring-accent'
 : 'bg-surface-card border-subtle hover:border-strong'
 }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-sunken text-secondary border border-subtle">
                        {t}
                      </span>
                      <span className="text-[11px] font-medium text-muted font-mono tabular-nums">
                        Pass: {conf.passThreshold} pts
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-primary mb-1">{conf.name}</h3>
                    <p className="text-[11px] text-muted line-clamp-3 mb-3 leading-relaxed">
                      {conf.description}
                    </p>

                    <div className="pt-2 border-t border-subtle text-[11px] text-muted flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="font-mono tabular-nums">Duration: {Math.round(conf.durationSeconds / 3600)}h</span>
                      <span>{conf.targetSummary}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Candidate Profile & Configuration */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <User className="w-4 h-4 text-muted" />
              <span>2. Candidate identity and lab parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="candidate-name" className="block text-[11px] text-muted mb-1">
                  Candidate full name
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
                  Candidate callsign
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
                  OffSec OSID or HTB ID
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
                  <span className="font-medium text-secondary">Legacy rubric (before Nov 2024):</span>
                  <span>include +10 OffSec bonus lab points</span>
                </span>
              </label>
              <p className="mt-1 text-[11px] text-muted pl-6 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px text-callout-warn-fg" aria-hidden="true" />
                <span>OffSec removed the 10-point bonus on November 1, 2024 (OSCP+). The current rubric requires 70+ pts scored on exam targets only.</span>
              </p>
            </div>
          </div>

          {/* Target Set Preview */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Target className="w-4 h-4 text-muted" />
                <span>3. Mock target set ({boxes.length} machines)</span>
              </h2>
              <button
                type="button"
                onClick={shuffleTargets}
                className="px-2.5 py-1 max-sm:py-3 rounded-lg bg-surface-sunken hover:bg-surface-hover text-secondary text-xs font-medium border border-subtle flex items-center gap-1 active:scale-[0.97] transition-interactive"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Re-roll targets</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {boxes.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg bg-surface-sunken border border-subtle text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary truncate">{b.name}</span>
                    <DifficultyBadge difficulty={b.difficulty} size="xs" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>IP: <strong className="font-medium text-primary font-mono tabular-nums">{b.ip}</strong></span>
                    <OsBadge os={b.os} size="xs" />
                  </div>
                  <div className="text-[11px] text-muted pt-1 border-t border-subtle flex items-center justify-between">
                    <span>{b.label}</span>
                    <span className="font-semibold text-secondary font-mono tabular-nums">
                      {b.userPoints + b.rootPoints} pts
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
          <div className="space-y-4">
            <PageHeader
              title={trackConfig.name}
              description={`Candidate ${candidateName} (${candidateCallsign}) · OSID ${osid}`}
              icon={<GraduationCap />}
              actions={
                <CyberButton
                  variant="secondary"
                  size="md"
                  data-testid="exam-open-bio-break-btn"
                  onClick={() => setIsBioBreakModalOpen(true)}
                  title="Open the bio-break manager"
                  iconLeft={<Coffee className="w-3.5 h-3.5" />}
                >
                  <span>{activeBreak.isActive ? 'Active break' : 'Bio break'}</span>
                  {activeBreak.isActive && (
                    <span className="ml-1 font-mono tabular-nums text-callout-warn-fg">
                      ({formatSecondsToHms(getBreakRemainingSeconds())})
                    </span>
                  )}
                </CyberButton>
              }
              primaryAction={
                <CyberButton
                  variant="primary"
                  size="md"
                  data-testid="exam-export-report-btn"
                  className="max-sm:h-11 max-sm:flex-1"
                  onClick={handleExportReport}
                  title="Download the exam log as Markdown"
                  iconLeft={<FileDown className="w-3.5 h-3.5" />}
                >
                  Export report
                </CyberButton>
              }
              overflow={[
                {
                  id: 'bio-break',
                  label: activeBreak.isActive ? 'Active break' : 'Bio break',
                  icon: <Coffee className="w-3.5 h-3.5" />,
                  onSelect: () => setIsBioBreakModalOpen(true),
                },
              ]}
            >
              <span
                data-testid="exam-status-badge"
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium border ${
 scoreData.isPassing
 ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
 : passingStatus === 'Critical'
 ? 'bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border'
 : 'bg-surface-sunken text-secondary border-subtle'
 }`}
              >
                {passingStatus}
              </span>
            </PageHeader>

            {/* Telemetry Numbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Score Counter */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-between shadow-xs machined-edge">
                <div>
                  <span className="text-xs text-muted font-medium">
                    Total exam score
                  </span>
                  <div
                    data-testid="exam-score-display"
                    className="flex items-baseline gap-1 mt-0.5"
                  >
                    <span
                      className={`text-2xl font-semibold font-mono tabular-nums ${
 scoreData.isPassing ? 'text-callout-success-fg' : 'text-primary'
 }`}
                    >
                      {scoreData.totalScore}
                    </span>
                    <span className="text-muted text-xs font-mono tabular-nums">/ {scoreData.maxScore} pts</span>
                  </div>
                </div>
                <div className="text-right">
                  {scoreData.isPassing ? (
                    <span className="text-xs font-medium text-callout-success-fg px-2 py-0.5 rounded bg-callout-success-bg border border-callout-success-border">
                      Passed
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-secondary px-2 py-0.5 rounded bg-surface-card border border-subtle font-mono tabular-nums">
                      {scoreData.pointsNeeded} pts needed
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Countdown Timer */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle flex items-center justify-between shadow-xs machined-edge">
                <div>
                  <span className="text-xs text-muted font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Countdown clock</span>
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
                    className={`p-2 max-sm:p-3 rounded-lg border transition-interactive active:scale-[0.97] ${
 status === 'running'
 ? 'bg-surface-card border-subtle text-secondary hover:bg-surface-hover'
 : 'bg-accent border-accent text-on-accent'
 }`}
                    title={status === 'running' ? 'Pause exam' : 'Resume exam'}
                    aria-label={status === 'running' ? 'Pause exam' : 'Resume exam'}
                  >
                    {status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    data-testid="exam-timer-reset-btn"
                    onClick={handleResetExam}
                    className="p-2 max-sm:p-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-muted hover:text-primary active:scale-[0.97] transition-interactive"
                    title="Reset exam session"
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
                <span className="text-xs text-muted font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  <span>Velocity pacing</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-semibold font-mono text-primary tabular-nums">
                    {pacing.currentPacePtsPerHour}
                  </span>
                  <span className="text-[11px] text-muted">pts / hr current</span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  Required: <span className="font-mono tabular-nums">{pacing.requiredPacePtsPerHour}</span> pts/hr
                </div>
              </div>

              {/* Card 4: Unrooted Boxes & Time Budget */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle shadow-xs machined-edge">
                <span className="text-xs text-muted font-medium flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>Target budget</span>
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-semibold font-mono text-primary tabular-nums">
                    {pacing.unrootedBoxesCount}
                  </span>
                  <span className="text-[11px] text-muted">unrooted targets</span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  ~<span className="font-mono tabular-nums">{Math.round(pacing.timeRemainingPerUnrootedBoxSeconds / 60)}</span>m per box
                </div>
              </div>
              </div>

              {/* Burn-down / velocity chart */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle shadow-xs machined-edge lg:col-span-2">
                <span className="text-xs text-muted font-medium flex items-center gap-1 mb-2">
                  <Target className="w-3 h-3" />
                  <span>Burn-down to pass</span>
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
            <div className="p-2.5 rounded-lg bg-surface-sunken border border-subtle text-xs text-secondary flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted flex-shrink-0" />
              <span className="text-[11px] leading-snug">
                <strong className="font-medium">Guidance:</strong> {pacing.recommendation}
              </span>
            </div>

            {/* Compliance Warning if flags lack proofs */}
            {scoreData.complianceIssues.length > 0 && scoreData.totalScore > 0 && (
              <div className="p-3 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-callout-warn-fg flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    <span>Proof compliance: {scoreData.complianceIssues.length} items missing</span>
                  </div>
                  <p className="text-[11px] text-callout-warn-fg mt-0.5">
                    Every flag needs a proof screenshot plus `whoami` and network configuration (`ip a` or `ipconfig`) output. Expand a target below to attach evidence.
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
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-sunken text-secondary border border-subtle">
                      Active Directory set (40 pts)
                    </span>
                    <span className="text-xs text-muted">
                      {scoreData.adSetCompromised ? '✓ Fully compromised' : 'Chained domain privilege escalation'}
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
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-sunken text-secondary border border-subtle">
                    Standalone machines ({standaloneBoxes.length})
                  </span>
                  <span className="text-xs text-muted">
                    Independent user and root flags
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {standaloneBoxes.map((box) => renderTargetCard(box))}
              </div>
            </div>
          </div>

          {/* Exam Scratchpad & Evidence Vault */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-sm font-semibold text-primary flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted" />
                <span>Evidence and credential scratchpad</span>
              </span>
              <span className="text-[11px] text-muted">
                Included in the exported report
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-muted" />
                  <span>Milestones ({milestones.length})</span>
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {milestones.slice().reverse().map((m, idx) => (
                  <div
                    key={`${m.id}_${idx}`}
                    className="p-2 rounded-lg bg-surface-sunken border border-subtle text-xs flex items-start justify-between gap-3"
                  >
                    <span className="text-secondary">{m.notes}</span>
                    <span className="text-xs text-muted font-mono flex-shrink-0 tabular-nums">
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
          className="p-6 rounded-2xl border border-subtle bg-surface-card machined-edge space-y-6 text-center animate-in fade-in"
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-surface-sunken border border-subtle text-accent mb-2">
              <Trophy className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-primary">
              Exam session concluded
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Final score evaluation completed for candidate <strong>{candidateName} ({candidateCallsign})</strong>.
            </p>
          </div>

          {/* Final Score Card */}
          <div className="max-w-xs mx-auto p-4 rounded-2xl bg-surface-sunken border border-subtle space-y-2 shadow-xs machined-edge">
            <div className="text-xs text-muted font-medium">Final score</div>
            <div className="text-3xl font-semibold font-mono text-primary tabular-nums">
              {scoreData.totalScore} / {scoreData.maxScore} pts
            </div>
            <div>
              {scoreData.isPassing ? (
                <span className="px-3 py-1 rounded text-xs font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                  Passed (threshold: {scoreData.passThreshold} pts)
                </span>
              ) : (
                <span className="px-3 py-1 rounded text-xs font-semibold bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border">
                  Failed (threshold: {scoreData.passThreshold} pts)
                </span>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-5 py-2.5 max-sm:py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-medium text-xs flex items-center gap-1.5 transition-interactive active:scale-[0.97]"
            >
              <FileDown className="w-4 h-4" />
              <span>Export submission report (.md)</span>
            </button>
            <button
              type="button"
              onClick={handleResetExam}
              className="px-5 py-2.5 max-sm:py-3.5 rounded-lg bg-surface-sunken hover:bg-surface-hover text-secondary border border-subtle font-medium text-xs transition-interactive active:scale-[0.97]"
            >
              Start new simulation
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
    const effectiveProofTab: 'user' | 'root' =
      box.userPoints === 0 ? 'root' : box.rootPoints === 0 ? 'user' : activeProofTab;

    return (
      <div
        key={box.id}
        className={`p-4 rounded-2xl border bg-surface-card transition-interactive machined-edge ${
 isFullyPwned
 ? 'border-callout-success-border'
 : 'border-subtle hover:border-strong'
 }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-surface-sunken text-secondary border border-subtle">
            {box.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded bg-surface-sunken border border-subtle font-mono tabular-nums">
              {box.userPoints + box.rootPoints} pts total
            </span>
            <button aria-label={isExpanded ? 'Collapse evidence drawer' : 'Expand evidence drawer'}
              type="button"
              onClick={() => setExpandedBoxId(isExpanded ? null : box.id)}
              className="p-1 max-sm:p-3 rounded-lg bg-surface-sunken hover:bg-surface-hover text-muted hover:text-primary transition-interactive border border-subtle active:scale-[0.97]"
              title={isExpanded ? 'Collapse evidence drawer' : 'Expand evidence drawer'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Identity & Difficulty */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-primary tracking-[-0.01em]">{box.name}</h3>
            <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
              <span>IP: <strong className="font-medium text-primary font-mono tabular-nums">{box.ip}</strong></span>
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
              className={`p-2 max-sm:p-3 rounded-lg border text-xs flex items-center justify-between transition-interactive active:scale-[0.97] ${
 box.userPwned
 ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg font-medium'
 : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-muted hover:text-primary'
 }`}
            >
              <span className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                <span>User Flag</span>
              </span>
              <span className="font-mono tabular-nums">{box.userPwned ? `✓ +${box.userPoints}` : `+${box.userPoints}`}</span>
            </button>
          ) : <div />}

          {box.rootPoints > 0 ? (
            <button
              type="button"
              onClick={() => togglePwn(box.id, 'root')}
              className={`p-2 max-sm:p-3 rounded-lg border text-xs flex items-center justify-between transition-interactive active:scale-[0.97] ${
 box.rootPwned
 ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg font-medium'
 : 'bg-surface-sunken hover:bg-surface-hover border-subtle text-muted hover:text-primary'
 }`}
            >
              <span className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Root Flag</span>
              </span>
              <span className="font-mono tabular-nums">{box.rootPwned ? `✓ +${box.rootPoints}` : `+${box.rootPoints}`}</span>
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
                    className={`flex-1 py-1 max-sm:py-3 px-2 rounded-lg text-xs font-medium border transition-interactive active:scale-[0.97] ${
                      effectiveProofTab === 'user'
                        ? 'bg-accent-muted border-accent text-accent'
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
                    className={`flex-1 py-1 max-sm:py-3 px-2 rounded-lg text-xs font-medium border transition-interactive active:scale-[0.97] ${
                      effectiveProofTab === 'root'
                        ? 'bg-accent-muted border-accent text-accent'
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
                flagType={effectiveProofTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
};
