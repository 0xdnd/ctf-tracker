import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Flag,
  Coffee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Terminal,
  Shield,
  Check,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { formatSecondsToHms } from '../../utils/examPacingUtils';
import { validateFlagFormat } from '../../utils/examComplianceUtils';
import { ExamReportModal } from './ExamReportModal';
import { DRAWER_SLIDE_TRANSITION } from '../../utils/motionTokens';

export const ExamQuickActionDrawer: React.FC = () => {
  const navigate = useNavigate();

  const {
    isQuickDrawerOpen,
    setQuickDrawerOpen,
    track,
    boxes,
    activeBreak,
    milestones,
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

  // Never carry the report modal across drawer close/reopen (store-driven close, navigation)
  useEffect(() => {
    if (!isQuickDrawerOpen) setIsReportModalOpen(false);
  }, [isQuickDrawerOpen]);

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

  const selectedBox = boxes.find((b) => b.id === selectedBoxId);
  const flagValidation = validateFlagFormat(flagInput.trim());
  const score = getScore();
  const passingStatus = getPassingStatus();
  const breakRemaining = getBreakRemainingSeconds();
  const isPassing = passingStatus === 'Passing';

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
    <>
    <AnimatePresence>
      {isQuickDrawerOpen && (
    <motion.div
      key="exam-quick-drawer"
      className="fixed inset-0 z-50 overflow-hidden"
      data-testid="exam-quick-action-drawer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
    >
      {/* Backdrop with click-to-dismiss */}
      <div
        data-testid="exam-drawer-backdrop"
        className="absolute inset-0 bg-surface-inverse/60 backdrop-blur-sm"
        onClick={() => setQuickDrawerOpen(false)}
      />

      {/* Slide-over panel from right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Exam Mission Quick Action Drawer"
          className="w-screen max-w-md md:max-w-lg bg-surface-card border-l border-subtle text-primary shadow-2xl flex flex-col machined-edge"
          initial={{ x: '100%' }}
          animate={{ x: 0, transition: DRAWER_SLIDE_TRANSITION.enter }}
          exit={{ x: '100%', transition: DRAWER_SLIDE_TRANSITION.exit }}
        >
          {/* 1. Header Bar */}
          <div className="p-4 border-b border-subtle bg-surface-sunken flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-card text-secondary border border-subtle">
                {track}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-tight text-primary truncate">
                  Mission quick actions
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="flex items-center gap-1 font-mono font-medium tabular-nums text-accent">
                    <Clock className="w-3 h-3" />
                    <span>{formatSecondsToHms(getRemainingSeconds())}</span>
                  </span>
                  <span>•</span>
                  <span
                    className={`font-mono font-medium tabular-nums ${
 isPassing ? 'text-callout-success-fg' : 'text-callout-warn-fg'
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
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-callout-success-bg hover:opacity-90 text-callout-success-fg border border-callout-success-border flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                title="1-Click Submission-Ready Exam Report Generator"
              >
                <FileDown className="w-3 h-3" />
                <span>Report</span>
              </button>

              <button
                data-testid="exam-drawer-open-cockpit"
                onClick={handleNavigateToExam}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent-muted hover:bg-surface-hover text-accent border border-accent flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                title="Navigate to full Certification Exam Simulator"
              >
                <span>Cockpit</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                data-testid="exam-drawer-close"
                onClick={() => setQuickDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97]"
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
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
 submissionFeedback.type === 'success'
 ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
 : 'bg-callout-danger-bg border-callout-danger-border text-callout-danger-fg'
 }`}
              >
                {submissionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span className="flex-1">{submissionFeedback.message}</span>
              </div>
            )}

            {/* 2. Rapid Flag Submission Tool */}
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
                  <Flag className="w-3 h-3" /> Rapid Flag Submission
                </span>
                <span className="text-[11px] text-muted">
                  {score.isPassing ? 'Passing criteria met!' : `${score.pointsNeeded} pts needed to pass`}
                </span>
              </div>

              <form onSubmit={handleFlagSubmit} className="space-y-3">
                {/* Target Box Selector */}
                <div>
                  <label className="block text-[11px] text-muted mb-1">
                    Select target box
                  </label>
                  <select
                    data-testid="exam-drawer-box-select"
                    value={selectedBoxId}
                    onChange={(e) => setSelectedBoxId(e.target.value)}
                    className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-accent"
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
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-[background-color,border-color,color] flex items-center justify-center gap-1.5 ${
 selectedFlagType === 'user'
 ? 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border'
 : 'bg-surface-card text-muted border-subtle hover:border-strong'
 }`}
                  >
                    <Flag className="w-3 h-3" />
                    <span>User Flag ({selectedBox?.userPoints || 10} pts)</span>
                    {selectedBox?.userPwned && <Check className="w-3 h-3 text-callout-success-fg ml-1" />}
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-flag-type-root"
                    onClick={() => setSelectedFlagType('root')}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-[background-color,border-color,color] flex items-center justify-center gap-1.5 ${
 selectedFlagType === 'root'
 ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
 : 'bg-surface-card text-muted border-subtle hover:border-strong'
 }`}
                  >
                    <Shield className="w-3 h-3" />
                    <span>Root / Sys ({selectedBox?.rootPoints || 10} pts)</span>
                    {selectedBox?.rootPwned && <Check className="w-3 h-3 text-callout-success-fg ml-1" />}
                  </button>
                </div>

                {/* Flag Input & Format Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-muted">
                      Flag Hash / String
                    </label>
                    {flagInput.trim().length > 0 && (
                      <span
                        data-testid="exam-flag-format-badge"
                        className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
 flagValidation.valid
 ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
 : 'bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border'
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
                    className="w-full bg-surface-card border border-subtle rounded-lg px-3 py-2 text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  data-testid="exam-drawer-submit-flag"
                  disabled={!flagInput.trim() || !flagValidation.valid}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover disabled:bg-surface-sunken disabled:text-muted disabled:cursor-not-allowed text-on-accent transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                >
                  Submit & Register Flag
                </button>
              </form>
            </div>

            {/* 3. Bio-Break & Endurance Controls */}
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-callout-warn-fg flex items-center gap-1.5">
                  <Coffee className="w-3 h-3" /> Operator Bio-Break Manager
                </span>
                {activeBreak.isActive && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border motion-safe:animate-pulse">
                    Break running
                  </span>
                )}
              </div>

              {activeBreak.isActive ? (
                <div className="p-3 rounded-lg bg-callout-warn-bg border border-callout-warn-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-callout-warn-fg">
                      {activeBreak.type} Break in Progress
                    </span>
                    <span
                      data-testid="exam-drawer-break-countdown"
                      className="text-base font-mono font-semibold text-callout-warn-fg tabular-nums"
                    >
                      {formatSecondsToHms(breakRemaining)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Dual exam clock continues. Audio cyber alarm will sound upon conclusion.
                  </p>
                  <button
                    type="button"
                    data-testid="exam-drawer-cancel-break"
                    onClick={cancelBreak}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-surface-card hover:bg-surface-hover text-callout-warn-fg border border-callout-warn-border transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>End or cancel break</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-testid="exam-drawer-start-bio-15"
                    onClick={() => startBreak('bio')}
                    className="p-2 rounded-lg bg-surface-card border border-subtle hover:border-accent hover:bg-surface-hover text-center transition-[transform,background-color,border-color,color] active:scale-[0.97] group"
                  >
                    <div className="text-[11px] text-muted group-hover:text-accent font-medium">15m Quick</div>
                    <div className="text-xs font-semibold text-primary mt-0.5">Bio break</div>
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-start-food-30"
                    onClick={() => startBreak('food')}
                    className="p-2 rounded-lg bg-surface-card border border-subtle hover:border-accent hover:bg-surface-hover text-center transition-[transform,background-color,border-color,color] active:scale-[0.97] group"
                  >
                    <div className="text-[11px] text-muted group-hover:text-accent font-medium">30m Meal</div>
                    <div className="text-xs font-semibold text-primary mt-0.5">Food break</div>
                  </button>

                  <button
                    type="button"
                    data-testid="exam-drawer-start-rest-120"
                    onClick={() => startBreak('rest')}
                    className="p-2 rounded-lg bg-surface-card border border-subtle hover:border-accent hover:bg-surface-hover text-center transition-[transform,background-color,border-color,color] active:scale-[0.97] group"
                  >
                    <div className="text-[11px] text-muted group-hover:text-accent font-medium">2h Rest</div>
                    <div className="text-xs font-semibold text-primary mt-0.5">Sleep block</div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Quick Milestone Logger */}
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle space-y-3">
              <span className="text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Quick Milestone Logger
              </span>

              {/* Quick shortcut milestone buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="exam-drawer-milestone-foothold"
                  onClick={() => handleQuickMilestone('initial_access', 'Foothold Shell')}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-card border border-subtle hover:border-accent text-[11px] text-secondary hover:text-primary text-left transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span className="truncate">+ Foothold Shell</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-privesc"
                  onClick={() => handleQuickMilestone('priv_esc', 'Lateral Pivot / PrivEsc')}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-card border border-subtle hover:border-accent text-[11px] text-secondary hover:text-primary text-left transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span className="truncate">+ Lateral Pivot</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-da"
                  onClick={() => handleQuickMilestone('domain_admin', 'Domain Admin Compromise')}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-card border border-subtle hover:border-accent text-[11px] text-secondary hover:text-primary text-left transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
                  <span className="truncate">+ Domain Admin</span>
                </button>

                <button
                  type="button"
                  data-testid="exam-drawer-milestone-root"
                  onClick={() => handleQuickMilestone('priv_esc', 'Root Hash Dumped')}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-card border border-subtle hover:border-accent text-[11px] text-secondary hover:text-primary text-left transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-accent" />
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
                  className="flex-1 bg-surface-card border border-subtle rounded-lg px-2.5 py-1 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  data-testid="exam-drawer-custom-milestone-submit"
                  disabled={!customMilestoneNote.trim()}
                  className="px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-hover disabled:bg-surface-sunken disabled:text-muted text-on-accent text-xs font-semibold transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                >
                  Log
                </button>
              </form>

              {/* Recent Milestones Timeline List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {milestones.length === 0 ? (
                  <p className="text-[11px] text-muted text-center py-1">
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
                        className="p-1.5 rounded bg-surface-card border border-subtle text-[11px] flex items-start justify-between gap-2"
                      >
                        <span className="text-secondary leading-snug">{m.notes}</span>
                        <span className="text-muted font-mono tabular-nums text-[11px] flex-shrink-0">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* 5. Exam Targets Mini Matrix */}
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-muted">
                Target Inventory Matrix ({boxes.length} Boxes)
              </span>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {boxes.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`exam-drawer-target-${b.id}`}
                    className="p-2 rounded bg-surface-card border border-subtle flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-primary truncate">{b.name}</div>
                      <div className="text-[11px] text-muted font-mono tabular-nums">{b.ip} • {b.type}</div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {b.userPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => togglePwn(b.id, 'user')}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-[background-color,border-color,color] ${
 b.userPwned
 ? 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border'
 : 'bg-surface-sunken text-muted border-subtle hover:text-primary'
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
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-[background-color,border-color,color] ${
 b.rootPwned
 ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
 : 'bg-surface-sunken text-muted border-subtle hover:text-primary'
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
          <div className="p-3 border-t border-subtle bg-surface-sunken flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted">
              Press <kbd className="px-1 py-0.5 rounded bg-surface-card border border-subtle text-secondary font-mono">Alt+E</kbd> or <kbd className="px-1 py-0.5 rounded bg-surface-card border border-subtle text-secondary font-mono">Esc</kbd> to toggle
            </span>

            <button
              type="button"
              onClick={handleNavigateToExam}
              className="text-xs font-semibold text-accent hover:text-primary flex items-center gap-1 transition-colors"
            >
              <span>Full simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>

      {/* 1-Click Submission-Ready Exam Report Modal */}
      {isQuickDrawerOpen && (
        <ExamReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </>
  );
};
