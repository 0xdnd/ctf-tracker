import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Copy,
  Check,
  Download,
  FileCode,
  X,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Sliders,
  Calendar,
  User,
  Hash,
  Sparkles,
  Archive,
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { ExamFindingsEditor } from './ExamFindingsEditor';
import { buildSubmissionBundle } from '../../utils/examSubmissionBundle';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useBoxesWithProofImages } from '../../hooks/useProofImage';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { sanitizeHtml } from '../../utils/securityUtils';
import { parseMarkdownToHtml } from '../../utils/writeupHtmlExporter';
import {
  ExamTrack,
  ExamSessionState,
  calculateExamScore,
  EXAM_TRACK_CONFIGS,
} from '../../utils/examComplianceUtils';
import {
  generateExamReportMarkdown,
  generateExamReportHtml,
  ExamReportOptions,
} from '../../utils/examReportGenerator';

const REPORT_TRACK_LABELS: Record<ExamTrack, { title: string; subtitle: string }> = {
  OSCP: { title: 'OffSec OSCP', subtitle: 'PEN-200 (70 pts)' },
  CPTS: { title: 'HTB CPTS', subtitle: '14 Flags (85 pts)' },
  CRTO: { title: 'ZPS CRTO', subtitle: '8 Objs (75 pts)' },
  OSEP: { title: 'OffSec OSEP', subtitle: 'PEN-300 (100 pts)' },
  CRTP: { title: 'Altered CRTP', subtitle: 'AD Lab (100 pts)' },
};

export interface ExamReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: ExamSessionState;
}

export const ExamReportModal: React.FC<ExamReportModalProps> = ({
  isOpen,
  onClose,
  session: propSession,
}) => {
  const store = useExamStore(
    useShallow((s) => ({
      id: s.id,
      track: s.track,
      status: s.status,
      boxes: s.boxes,
      startedAt: s.startedAt,
      examExpiresAt: s.examExpiresAt,
      totalDurationSeconds: s.totalDurationSeconds,
      timerPausedRemainingSeconds: s.timerPausedRemainingSeconds,
      scratchNotes: s.scratchNotes,
      includeBonusPoints: s.includeBonusPoints,
      findings: s.findings,
      candidateName: s.candidateName,
      candidateCallsign: s.candidateCallsign,
      osid: s.osid,
    }))
  );

  // Fallback to store if propSession is not provided
  const baseSession: ExamSessionState = useMemo(() => {
    if (propSession) return propSession.findings ? propSession : { ...propSession, findings: store.findings };
    return {
      id: store.id,
      track: store.track,
      candidateName: store.candidateName,
      candidateCallsign: store.candidateCallsign,
      osid: store.osid,
      examStartedAt: store.startedAt || Date.now(),
      examDurationSeconds: store.totalDurationSeconds,
      examExpiresAt: store.examExpiresAt,
      isTimerRunning: store.status === 'running',
      timerPausedRemainingSeconds: store.timerPausedRemainingSeconds,
      boxes: store.boxes,
      scratchNotes: store.scratchNotes,
      includeBonusPoints: store.includeBonusPoints,
      findings: store.findings,
    };
  }, [propSession, store]);

  // Candidate Details Inputs
  const [candidateName, setCandidateName] = useState<string>('');
  const [candidateCallsign, setCandidateCallsign] = useState<string>('');
  const [osid, setOsid] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [selectedTrack, setSelectedTrack] = useState<ExamTrack>('OSCP');
  const [includeBonusPoints, setIncludeBonusPoints] = useState<boolean>(false);
  const [includeScreenshots, setIncludeScreenshots] = useState<boolean>(true);
  const [includeRemediation, setIncludeRemediation] = useState<boolean>(true);

  // Preview Mode Tab: 'preview' (rendered HTML) vs 'raw' (markdown)
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

  // Button Feedback States
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [bundling, setBundling] = useState<boolean>(false);

  // Sync internal state when modal opens or baseSession changes
  useEffect(() => {
    if (isOpen) {
      setCandidateName(baseSession.candidateName || 'Daniel Dayan');
      setCandidateCallsign(baseSession.candidateCallsign || '0xdnd');
      setOsid(baseSession.osid || 'OS-94821');
      setSelectedTrack(baseSession.track || 'OSCP');
      setIncludeBonusPoints(Boolean(baseSession.includeBonusPoints));
      const today = new Date(baseSession.examStartedAt || Date.now()).toISOString().slice(0, 10);
      setExamDate(today);
      setCopied(false);
      setDownloadFeedback(null);
    }
  }, [isOpen, baseSession]);

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onClose,
  });

  // Effective report options
  const reportOptions: ExamReportOptions = useMemo(() => ({
    candidateName,
    candidateCallsign,
    osid,
    examDate,
    template: selectedTrack,
    includeBonusPoints,
    includeScreenshots,
    includeRemediation,
  }), [
    candidateName,
    candidateCallsign,
    osid,
    examDate,
    selectedTrack,
    includeBonusPoints,
    includeScreenshots,
    includeRemediation,
  ]);

  // Proof images live in IndexedDB; re-inline them as data URLs so the exported report embeds them
  const { boxes: reportBoxes, resolving: resolvingProofImages } = useBoxesWithProofImages(
    baseSession.boxes,
    isOpen && includeScreenshots
  );

  // Current session with user overrides
  const effectiveSession: ExamSessionState = useMemo(() => ({
    ...baseSession,
    boxes: reportBoxes,
    track: selectedTrack,
    candidateName,
    candidateCallsign,
    osid,
    includeBonusPoints,
  }), [baseSession, reportBoxes, selectedTrack, candidateName, candidateCallsign, osid, includeBonusPoints]);

  // Generated Markdown & HTML Preview
  const generatedMarkdown = useMemo(() => {
    return generateExamReportMarkdown(effectiveSession, reportOptions);
  }, [effectiveSession, reportOptions]);

  const sanitizedPreviewHtml = useMemo(() => {
    const rawHtml = parseMarkdownToHtml(generatedMarkdown);
    return sanitizeHtml(rawHtml);
  }, [generatedMarkdown]);

  // Score Calculation
  const scoreData = useMemo(() => {
    return calculateExamScore(selectedTrack, effectiveSession.boxes, {
      includeBonusPoints,
    });
  }, [selectedTrack, effectiveSession.boxes, includeBonusPoints]);

  // 1-Click Clipboard Copy
  const handleCopyMarkdown = async () => {
    const success = await safeCopyToClipboard(generatedMarkdown);
    if (success) {
      setCopied(true);
      playCyberSound('copy');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // 1-Click Download Markdown File
  const handleDownloadMarkdown = () => {
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeCallsign = (candidateCallsign || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = (examDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${selectedTrack}_EXAM_REPORT_${safeCallsign}_${safeDate}.md`;
    try {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
    URL.revokeObjectURL(url);
    playCyberSound('export');
    setDownloadFeedback('Markdown report (.md) downloaded.');
    setTimeout(() => setDownloadFeedback(null), 3000);
  };

  // 1-Click Export Standalone Air-Gapped HTML
  const handleExportHtml = () => {
    const htmlReport = generateExamReportHtml(effectiveSession, reportOptions);
    const blob = new Blob([htmlReport], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeCallsign = (candidateCallsign || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = (examDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${selectedTrack}_EXAM_REPORT_${safeCallsign}_${safeDate}.html`;
    try {
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
    URL.revokeObjectURL(url);
    playCyberSound('export');
    setDownloadFeedback('Air-gapped standalone HTML report (.html) downloaded.');
    setTimeout(() => setDownloadFeedback(null), 3000);
  };

  // Submission bundle (.zip): report.md, report.html, proofs/, findings.json, README.txt
  const handleDownloadBundle = async () => {
    setBundling(true);
    try {
      const { data, missingImages } = await buildSubmissionBundle(effectiveSession, reportOptions);
      const blob = new Blob([data as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeCallsign = (candidateCallsign || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeDate = (examDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${selectedTrack}_SUBMISSION_BUNDLE_${safeCallsign}_${safeDate}.zip`;
      try {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {}
      URL.revokeObjectURL(url);
      playCyberSound('export');
      setDownloadFeedback(
        missingImages > 0
          ? `Submission bundle (.zip) downloaded. ${missingImages} proof image(s) could not be loaded.`
          : 'Submission bundle (.zip) downloaded.'
      );
    } catch {
      setDownloadFeedback('Submission bundle export failed.');
    } finally {
      setBundling(false);
      setTimeout(() => setDownloadFeedback(null), 3000);
    }
  };

  const trackConfig = EXAM_TRACK_CONFIGS[selectedTrack] || EXAM_TRACK_CONFIGS.OSCP;

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      key="exam-report-modal"
      className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-3 sm:p-6"
      data-testid="exam-report-modal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      {/* Backdrop */}
      <div
        data-testid="exam-report-backdrop"
        className="fixed inset-0 bg-surface-inverse/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-report-modal-title"
        data-testid="exam-report-modal"
        className="relative w-full max-w-4xl bg-surface-card border border-subtle rounded-2xl shadow-2xl overflow-hidden z-10 text-primary machined-edge flex flex-col max-h-[92vh]"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: TACTICAL_SPRING }}
        exit={{ opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] } }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-subtle bg-surface-sunken flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent-muted border border-subtle text-accent">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="exam-report-modal-title"
                  className="text-sm sm:text-base font-semibold text-primary tracking-tight"
                >
                  Submission-Ready Exam Report Generator
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-surface-sunken text-secondary border border-subtle">
                  {selectedTrack}
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                OffSec OSCP, HTB CPTS & CRTO compliant • 1-Click Markdown & Standalone HTML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Score Pill */}
            <div className="px-3 py-1 rounded-lg bg-surface-card border border-subtle flex items-center gap-2">
              <span className="text-[11px] text-muted font-medium">Score:</span>
              <span
                data-testid="report-modal-score"
                className={`text-xs font-mono font-semibold tabular-nums ${
 scoreData.isPassing ? 'text-callout-success-fg' : 'text-callout-warn-fg'
 }`}
              >
                {scoreData.totalScore} / {scoreData.maxScore} PTS
              </span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
 scoreData.isPassing
 ? 'bg-callout-success-bg text-callout-success-fg'
 : 'bg-callout-warn-bg text-callout-warn-fg'
 }`}
              >
                {scoreData.isPassing ? 'PASSED' : 'IN PROGRESS'}
              </span>
            </div>

            <button
              type="button"
              data-testid="report-modal-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-[transform,background-color,border-color,color] active:scale-[0.97]"
              aria-label="Close report modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {downloadFeedback && (
          <div
            data-testid="report-feedback-toast"
            className="px-5 py-2.5 bg-callout-success-bg border-b border-callout-success-border text-callout-success-fg text-xs flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{downloadFeedback}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Template Selection & Candidate Parameters */}
          <div className="p-4 rounded-xl bg-surface-sunken border border-subtle space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent" />
                <span>1. Certification template and candidate details</span>
              </span>
              <span className="text-[11px] text-muted">
                Passing Threshold: {trackConfig.passThreshold} Pts
              </span>
            </div>

            {/* Track Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {(Object.keys(EXAM_TRACK_CONFIGS) as ExamTrack[]).map((t) => {
                const isSelected = selectedTrack === t;
                return (
                  <button
                    key={t}
                    type="button"
                    data-testid={`report-track-select-${t.toLowerCase()}`}
                    onClick={() => setSelectedTrack(t)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-[transform,background-color,border-color,color] active:scale-[0.97] ${
 isSelected
 ? 'bg-accent-muted border-accent text-accent'
 : 'bg-surface-card border-subtle text-muted hover:text-primary hover:border-strong'
 }`}
                  >
                    <div>{REPORT_TRACK_LABELS[t].title}</div>
                    <div className="text-[11px] font-normal text-muted mt-0.5">
                      {REPORT_TRACK_LABELS[t].subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label
                  htmlFor="report-candidate-name"
                  className="text-[11px] text-muted mb-1 flex items-center gap-1"
                >
                  <User className="w-3 h-3 text-accent" /> Candidate Name
                </label>
                <input
                  id="report-candidate-name"
                  data-testid="report-candidate-name"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent text-xs"
                  placeholder="Daniel Dayan"
                />
              </div>

              <div>
                <label
                  htmlFor="report-candidate-callsign"
                  className="text-[11px] text-muted mb-1 flex items-center gap-1"
                >
                  <Hash className="w-3 h-3 text-accent" /> Callsign / Handle
                </label>
                <input
                  id="report-candidate-callsign"
                  data-testid="report-candidate-callsign"
                  type="text"
                  value={candidateCallsign}
                  onChange={(e) => setCandidateCallsign(e.target.value)}
                  className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent text-xs"
                  placeholder="0xdnd"
                />
              </div>

              <div>
                <label
                  htmlFor="report-candidate-osid"
                  className="text-[11px] text-muted mb-1 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-accent" /> OSID / Student ID
                </label>
                <input
                  id="report-candidate-osid"
                  data-testid="report-candidate-osid"
                  type="text"
                  value={osid}
                  onChange={(e) => setOsid(e.target.value)}
                  className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent text-xs"
                  placeholder="OS-94821"
                />
              </div>

              <div>
                <label
                  htmlFor="report-exam-date"
                  className="text-[11px] text-muted mb-1 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-accent" /> Assessment Date
                </label>
                <input
                  id="report-exam-date"
                  data-testid="report-exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-accent text-xs"
                />
              </div>
            </div>

            {/* Report Options Toggles */}
            <div className="pt-2 border-t border-subtle flex flex-wrap items-center gap-4 text-xs text-secondary">
              {selectedTrack === 'OSCP' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="report-opt-bonus"
                    checked={includeBonusPoints}
                    onChange={(e) => setIncludeBonusPoints(e.target.checked)}
                    className="rounded border-subtle bg-surface-card accent-[rgb(var(--border-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  />
                  <span>+10 OffSec Bonus Labs (Legacy Pre-Nov 2024)</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="report-opt-screenshots"
                  checked={includeScreenshots}
                  onChange={(e) => setIncludeScreenshots(e.target.checked)}
                  className="rounded border-subtle bg-surface-card accent-[rgb(var(--border-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                />
                <span>Include Base64 proof screenshots</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="report-opt-remediation"
                  checked={includeRemediation}
                  onChange={(e) => setIncludeRemediation(e.target.checked)}
                  className="rounded border-subtle bg-surface-card accent-[rgb(var(--border-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                />
                <span>Include remediation guidance</span>
              </label>
            </div>
          </div>

          {/* Section 2: Structured findings (stored per exam session) */}
          <ExamFindingsEditor boxes={baseSession.boxes} />

          {/* Live Report Preview & Mode Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="report-tab-preview"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-[background-color,border-color,color] ${
 activeTab === 'preview'
 ? 'bg-accent-muted text-accent border border-accent'
 : 'text-muted hover:text-primary border border-transparent'
 }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Formatted preview</span>
                </button>

                <button
                  type="button"
                  data-testid="report-tab-raw"
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-[background-color,border-color,color] ${
 activeTab === 'raw'
 ? 'bg-accent-muted text-accent border border-accent'
 : 'text-muted hover:text-primary border border-transparent'
 }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Raw Markdown</span>
                </button>
              </div>

              <span className="text-[11px] text-muted font-mono tabular-nums">
                {generatedMarkdown.length} characters • {generatedMarkdown.split('\n').length} lines
              </span>
            </div>

            {/* Preview Pane Container */}
            <div
              data-testid="report-preview-pane"
              className="p-4 rounded-xl bg-surface-sunken border border-subtle max-h-72 sm:max-h-80 overflow-y-auto text-xs leading-relaxed"
            >
              {activeTab === 'preview' ? (
                <div
                  data-testid="report-rendered-preview"
                  className="max-w-none text-sm text-secondary space-y-3 [&_h1]:text-primary [&_h1]:text-base [&_h1]:font-semibold [&_h1]:border-b [&_h1]:border-subtle [&_h1]:pb-1 [&_h2]:text-primary [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:mt-4 [&_h3]:text-primary [&_h3]:font-medium [&_h4]:text-primary [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-subtle [&_th]:p-1.5 [&_th]:bg-surface-card [&_th]:text-primary [&_td]:border [&_td]:border-subtle [&_td]:p-1.5 [&_code]:font-mono [&_code]:text-accent [&_pre]:bg-surface-card [&_pre]:p-2 [&_pre]:rounded [&_pre]:border [&_pre]:border-subtle [&_pre]:font-mono"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewHtml }}
                />
              ) : (
                <pre
                  data-testid="report-raw-markdown"
                  className="whitespace-pre-wrap text-secondary select-all font-mono"
                >
                  {generatedMarkdown}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* 1-Click Action Footer */}
        <div className="px-5 py-3.5 border-t border-subtle bg-surface-sunken flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-callout-success-fg motion-safe:animate-pulse" />
            <span className="text-[11px]">
              {resolvingProofImages ? 'Loading proof images...' : 'Offline export, nothing leaves this device'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Markdown Button */}
            <button
              type="button"
              data-testid="report-copy-markdown-btn"
              onClick={handleCopyMarkdown}
              disabled={resolvingProofImages}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait ${
 copied
 ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
 : 'bg-surface-card hover:bg-surface-hover border-subtle text-primary'
 }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            {/* Download Markdown Button */}
            <button
              type="button"
              data-testid="report-download-md-btn"
              onClick={handleDownloadMarkdown}
              disabled={resolvingProofImages}
              className="px-3.5 py-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle hover:border-strong text-primary text-xs font-semibold flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Download (.md)</span>
            </button>

            {/* Export Standalone HTML Button */}
            <button
              type="button"
              data-testid="report-export-html-btn"
              onClick={handleExportHtml}
              disabled={resolvingProofImages}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
            >
              <FileCode className="w-3.5 h-3.5 fill-current" />
              <span>Export HTML (.html)</span>
            </button>

            {/* Download Submission Bundle (.zip) */}
            <button
              type="button"
              data-testid="report-download-bundle-btn"
              onClick={handleDownloadBundle}
              disabled={resolvingProofImages || bundling}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-semibold flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{bundling ? 'Building bundle...' : 'Download submission bundle (.zip)'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
