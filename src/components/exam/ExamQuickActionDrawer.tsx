import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  X,
  ExternalLink,
  Flag,
  Coffee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  Terminal,
  Shield,
  Check,
  Pause,
  Play,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatSecondsToHms } from '../../utils/examPacingUtils';
import { validateFlagFormat, EXAM_TRACK_CONFIGS } from '../../utils/examComplianceUtils';
import { ExamReportModal } from './ExamReportModal';

export const ExamQuickActionDrawer: React.FC = () => {
  const navigate = useNavigate();

  const {
    isQuickDrawerOpen,
    setQuickDrawerOpen,
    track,
    status,
    boxes,
    activeBreak,
    milestones,
    remainingSeconds,
    getRemainingSeconds,
    getBreakRemainingSeconds,
    getScore,
    getPassingStatus,
    submitFlag,
    togglePwn,
    startBreak,
    cancelBreak,
    addMilestone,
  } = useExamStore(
    useShallow((s) => ({
      isQuickDrawerOpen: s.isQuickDrawerOpen,
      setQuickDrawerOpen: s.setQuickDrawerOpen,
      track: s.track,
      status: s.status,
      boxes: s.boxes,
      activeBreak: s.activeBreak,
      milestones: s.milestones,
      remainingSeconds: s.remainingSeconds,
      getRemainingSeconds: s.getRemainingSeconds,
      getBreakRemainingSeconds: s.getBreakRemainingSeconds,
      getScore: s.getScore,
      getPassingStatus: s.getPassingStatus,
      submitFlag: s.submitFlag,
      togglePwn: s.togglePwn,
      startBreak: s.startBreak,
      cancelBreak: s.cancelBreak,
      addMilestone: s.addMilestone,
    }))
  );

  // Quick Flag Submission Form State
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [selectedFlagType, setSelectedFlagType] = useState<'user' | 'root'>('user');
  const [flagInput, setFlagInput] = useState<string>('');
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Quick Milestone State
  const [customMilestoneNote, setCustomMilestoneNote] = useState<string>('');

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const flagInputRef = useRef<HTMLInputElement>(null);

  // Ensure a box is selected by default if available
  useEffect(() => {
    if (boxes.length > 0 && !selectedBoxId) {
      setSelectedBoxId(boxes[0].id);
    }
  }, [boxes, selectedBoxId]);

  // Focus trap for accessibility and Escape key handling
  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isQuickDrawerOpen,
    onClose: () => setQuickDrawerOpen(false),
  });

  // Focus flag input on open
  useEffect(() => {
    if (isQuickDrawerOpen) {
      const timer = setTimeout(() => {
        flagInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isQuickDrawerOpen]);

  if (!isQuickDrawerOpen) {
    return null;
  }

  const selectedBox = boxes.find((b) => b.id === selectedBoxId);
  const flagValidation = validateFlagFormat(flagInput.trim());
  const score = getScore();
  const passingStatus = getPassingStatus();
  const trackConfig = EXAM_TRACK_CONFIGS[track] || EXAM_TRACK_CONFIGS.OSCP;
  const breakRemaining = getBreakRemainingSeconds();
  const isPassing = passingStatus === 'Passing';
  const isCritical = passingStatus === 'Critical';

  // Handle Flag Submission
  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoxId || !flagInput.trim()) return;

    if (!flagValidation.valid) {
      setSubmissionFeedback({
        type: 'error',
        message: 'Invalid flag format: must be 32-char hex (MD5) or recognized CTF flag string.',
      });
      return;
    }

    const ok = submitFlag(selectedBoxId, selectedFlagType, flagInput.trim());
    if (ok) {
      setSubmissionFeedback({
        type: 'success',
        message: `Registered ${selectedFlagType.toUpperCase()} flag on ${selectedBox?.name || 'target'}! Points updated.`,
      });
      setFlagInput('');
      setTimeout(() => setSubmissionFeedback(null), 3500);
    } else {
      setSubmissionFeedback({
        type: 'error',
        message: 'Submission rejected: check target, flag format, or verify if already claimed.',
      });
    }
  };

  // Quick milestone shortcut logger
  const handleQuickMilestone = (type: 'initial_access' | 'priv_esc' | 'domain_admin', label: string) => {
    const targetName = selectedBox?.name || 'Target';
    addMilestone(selectedBoxId || 'exam', type, `${label} logged on ${targetName}`);
    setSubmissionFeedback({
      type: 'success',
      message: `Milestone logged: ${label} on ${targetName}`,
    });
    setTimeout(() => setSubmissionFeedback(null), 2500);
  };

  const handleCustomMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMilestoneNote.trim()) return;

    addMilestone(selectedBoxId || 'exam', 'initial_access', customMilestoneNote.trim());
    setCustomMilestoneNote('');
    setSubmissionFeedback({
      type: 'success',
      message: 'Custom operational milestone logged.',
    });
    setTimeout(() => setSubmissionFeedback(null), 2500);
  };

  const handleNavigateToExam = () => {
    setQuickDrawerOpen(false);
    navigate('/exam');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-mono" data-testid="exam-quick-action-drawer">
      {/* Backdrop with click-to-dismiss */}
      <div
        data-testid="exam-drawer-backdrop"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={() => setQuickDrawerOpen(false)}
      />

      {/* Slide-over panel from right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Exam Mission Quick Action Drawer"
          className="w-screen max-w-md md:max-w-lg bg-slate-900/95 dark:bg-cyber-card/95 border-l border-slate-800 dark:border-cyber-border text-slate-100 dark:text-cyber-text shadow-2xl flex flex-col backdrop-blur-md"
        >
          {/* 1. Header Bar */}
          <div className="p-4 border-b border-slate-800 dark:border-cyber-border bg-slate-950/80 dark:bg-cyber-bg/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {track}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-white truncate">
                  MISSION QUICK ACTIONS
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-400">
                  <span className="flex items-center gap-1 font-bold text-cyan-400 dark:text-cyber-cyan">
                    <Clock className="w-3 h-3" />
                    <span>{formatSecondsToHms(getRemainingSeconds())}</span>
                  </span>
                  <span>•</span>
                  <span
                    className={`font-bold ${
                      isPassing ? 'text-emerald-400 dark:text-cyber-emerald' : 'text-amber-400 dark:text-cyber-amber'
                    }`}
                  >
                    {score.totalScore} / {score.maxScore || 100} PTS
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                data-testid="exam-drawer-export-report"
                onClick={() => setIsReportModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 dark:text-cyber-emerald border border-emerald-500/30 hover:border-emerald-400/50 flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                title="1-Click Submission-Ready Exam Report Generator"
              >
                <FileDown className="w-3 h-3" />
                <span>Report</span>
              </button>

              <button
                data-testid="exam-drawer-open-cockpit"
                onClick={handleNavigateToExam}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 dark:text-cyber-cyan border border-cyan-500/30 hover:border-cyan-400/50 flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                title="Navigate to full Certification Exam Simulator"
              >
                <span>Cockpit</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                data-testid="exam-drawer-close"
                onClick={() => setQuickDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-zinc-800 text-slate-400 hover:text-white transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Feedback Banner */}
            {submissionFeedback && (
              <div
                data-testid="exam-drawer-feedback"
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                  submissionFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                {submissionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <span className="flex-1">{submissionFeedback.message}</span>
              </div>
            )}

            {/* 2. Rapid Flag Submission Tool */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 dark:bg-cyber-bg/60 border border-slate-800 dark:border-cyber-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 dark:text-cyber-cyan flex items-center gap-1.5">
                  <Flag className="w-3 h-3" /> Rapid Flag Submission
                </span>
                <span className="text-[10px] text-slate-400">
                  {score.isPassing ? 'Passing criteria met!' : `${score.pointsNeeded} pts needed to pass`}
                </span>
              </div>

              <form onSubmit={handleFlagSubmit} className="space-y-3">
                {/* Target Box Selector */}
                <div>
                  <label className="block text-[11px] text-slate-400 dark:text-zinc-400 mb-1">
                    Select Target Box
                  </label>
                  <select
                    data-testid="exam-drawer-box-select"
                    value={selectedBoxId}
                    onChange={(e) => setSelectedBoxId(e.target.value)}
                    className="w-full bg-slate-900 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {boxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.ip}) - {b.userPwned ? '✓ User' : '○ User'} | {b.rootPwned ? '✓ Root' : '○ Root'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Flag Type Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="exam-drawer-flag-type-user"
                    onClick={() => setSelectedFlagType('user')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      selectedFlagType === 'user'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900/50 dark:bg-cyber-card/50 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>User Flag ({selectedBox?.userPoints || 10} pts)</span>
                    {selectedBox?.userPwned && <Check className="w-3 h-3 text-emerald-400 ml-1" />}
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-flag-type-root"
                    onClick={() => setSelectedFlagType('root')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      selectedFlagType === 'root'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900/50 dark:bg-cyber-card/50 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Root / Sys ({selectedBox?.rootPoints || 10} pts)</span>
                    {selectedBox?.rootPwned && <Check className="w-3 h-3 text-emerald-400 ml-1" />}
                  </button>
                </div>

                {/* Flag Input & Format Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 dark:text-zinc-400">
                      Flag Hash / String
                    </label>
                    {flagInput.trim().length > 0 && (
                      <span
                        data-testid="exam-flag-format-badge"
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          flagValidation.valid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {flagValidation.valid ? `✓ ${flagValidation.label}` : '⚠ Format unrecognized'}
                      </span>
                    )}
                  </div>
                  <input
                    ref={flagInputRef}
                    data-testid="exam-drawer-flag-input"
                    type="text"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="e.g. 7c4a8d09ca3762af61e59520943dc264 or HTB{...}"
                    className="w-full bg-slate-900 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  data-testid="exam-drawer-submit-flag"
                  disabled={!flagInput.trim() || !flagValidation.valid}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 transition-[transform,box-shadow,background-color,border-color,color] shadow-md active:scale-[0.98]"
                >
                  Submit & Register Flag
                </button>
              </form>
            </div>

            {/* 3. Bio-Break & Endurance Controls */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 dark:bg-cyber-bg/60 border border-slate-800 dark:border-cyber-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 dark:text-cyber-amber flex items-center gap-1.5">
                  <Coffee className="w-3 h-3" /> Operator Bio-Break Manager
                </span>
                {activeBreak.isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                    BREAK RUNNING
                  </span>
                )}
              </div>

              {activeBreak.isActive ? (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase">
                      {activeBreak.type} Break in Progress
                    </span>
                    <span
                      data-testid="exam-drawer-break-countdown"
                      className="text-base font-black text-amber-400 tabular-nums"
                    >
                      {formatSecondsToHms(breakRemaining)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dual exam clock continues. Audio cyber alarm will sound upon conclusion.
                  </p>
                  <button
                    type="button"
                    data-testid="exam-drawer-cancel-break"
                    onClick={cancelBreak}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-[transform,background-color,border-color,color] active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Conclude / Cancel Break</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-testid="exam-drawer-start-bio-15"
                    onClick={() => startBreak('bio')}
                    className="p-2 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-center transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                  >
                    <div className="text-[10px] text-slate-400 group-hover:text-amber-400 font-bold">15m Quick</div>
                    <div className="text-xs font-bold text-white mt-0.5">Bio Break</div>
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-start-food-30"
                    onClick={() => startBreak('food')}
                    className="p-2 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-center transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                  >
                    <div className="text-[10px] text-slate-400 group-hover:text-amber-400 font-bold">30m Meal</div>
                    <div className="text-xs font-bold text-white mt-0.5">Food Break</div>
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-start-rest-120"
                    onClick={() => startBreak('rest')}
                    className="p-2 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-center transition-[transform,background-color,border-color,color] active:scale-[0.98] group"
                  >
                    <div className="text-[10px] text-slate-400 group-hover:text-amber-400 font-bold">2h Rest</div>
                    <div className="text-xs font-bold text-white mt-0.5">Sleep Block</div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Quick Milestone Logger */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 dark:bg-cyber-bg/60 border border-slate-800 dark:border-cyber-border space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 dark:text-purple-300 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Quick Milestone Logger
              </span>

              {/* Quick shortcut milestone buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="exam-drawer-milestone-foothold"
                  onClick={() => handleQuickMilestone('initial_access', 'Foothold Shell')}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-white text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-purple-400" />
                  <span className="truncate">+ Foothold Shell</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-privesc"
                  onClick={() => handleQuickMilestone('priv_esc', 'Lateral Pivot / PrivEsc')}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-white text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-purple-400" />
                  <span className="truncate">+ Lateral Pivot</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-da"
                  onClick={() => handleQuickMilestone('domain_admin', 'Domain Admin Compromise')}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-white text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-purple-400" />
                  <span className="truncate">+ Domain Admin</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-root"
                  onClick={() => handleQuickMilestone('priv_esc', 'Root Hash Dumped')}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-cyber-card border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-white text-left transition-[transform,background-color,border-color,color] active:scale-[0.98] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-purple-400" />
                  <span className="truncate">+ Root Hash Dump</span>
                </button>
              </div>

              {/* Custom Milestone Form */}
              <form onSubmit={handleCustomMilestoneSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  data-testid="exam-drawer-custom-milestone-input"
                  value={customMilestoneNote}
                  onChange={(e) => setCustomMilestoneNote(e.target.value)}
                  placeholder="Custom milestone note..."
                  className="flex-1 bg-slate-900 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  data-testid="exam-drawer-custom-milestone-submit"
                  disabled={!customMilestoneNote.trim()}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold transition-[transform,background-color,border-color,color] active:scale-[0.98]"
                >
                  Log
                </button>
              </form>

              {/* Recent Milestones Timeline List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {milestones.length === 0 ? (
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500 text-center py-1">
                    No milestones logged yet.
                  </p>
                ) : (
                  milestones
                    .slice()
                    .reverse()
                    .slice(0, 5)
                    .map((m) => (
                      <div
                        key={m.id}
                        data-testid="exam-drawer-milestone-item"
                        className="p-1.5 rounded bg-slate-900/60 dark:bg-cyber-card/40 border border-slate-800 text-[10px] flex items-start justify-between gap-2"
                      >
                        <span className="text-slate-300 dark:text-zinc-300 leading-snug">{m.notes}</span>
                        <span className="text-slate-500 text-[9px] flex-shrink-0">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* 5. Exam Targets Mini Matrix */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 dark:bg-cyber-bg/60 border border-slate-800 dark:border-cyber-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                Target Inventory Matrix ({boxes.length} Boxes)
              </span>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {boxes.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`exam-drawer-target-${b.id}`}
                    className="p-2 rounded bg-slate-900/80 dark:bg-cyber-card border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-white truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.ip} • {b.type}</div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.userPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => togglePwn(b.id, 'user')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                            b.userPwned
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title="Toggle User Flag"
                        >
                          USER
                        </button>
                      )}

                      {b.rootPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => togglePwn(b.id, 'root')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                            b.rootPwned
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}
                          title="Toggle Root Flag"
                        >
                          ROOT
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-3 border-t border-slate-800 dark:border-cyber-border bg-slate-950/80 dark:bg-cyber-bg/80 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-500">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Alt+E</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">Esc</kbd> to toggle
            </span>

            <button
              type="button"
              onClick={handleNavigateToExam}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Full Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Submission-Ready Exam Report Modal */}
      <ExamReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
