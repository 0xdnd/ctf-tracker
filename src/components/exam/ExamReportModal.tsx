import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';
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
      candidateName: s.candidateName,
      candidateCallsign: s.candidateCallsign,
      osid: s.osid,
    }))
  );

  // Fallback to store if propSession is not provided
  const baseSession: ExamSessionState = useMemo(() => {
    if (propSession) return propSession;
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

  // Current session with user overrides
  const effectiveSession: ExamSessionState = useMemo(() => ({
    ...baseSession,
    track: selectedTrack,
    candidateName,
    candidateCallsign,
    osid,
    includeBonusPoints,
  }), [baseSession, selectedTrack, candidateName, candidateCallsign, osid, includeBonusPoints]);

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

  if (!isOpen) return null;

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

  const trackConfig = EXAM_TRACK_CONFIGS[selectedTrack] || EXAM_TRACK_CONFIGS.OSCP;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto font-mono flex items-center justify-center p-3 sm:p-6"
      data-testid="exam-report-modal-container"
    >
      {/* Backdrop */}
      <div
        data-testid="exam-report-backdrop"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-report-modal-title"
        data-testid="exam-report-modal"
        className="relative w-full max-w-4xl bg-slate-900 dark:bg-cyber-card border border-slate-700/80 dark:border-cyber-border rounded-2xl shadow-2xl overflow-hidden z-10 text-slate-100 dark:text-cyber-text flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 dark:border-cyber-border bg-slate-950/90 dark:bg-cyber-bg/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="exam-report-modal-title"
                  className="text-sm sm:text-base font-black text-white tracking-wide uppercase"
                >
                  Submission-Ready Exam Report Generator
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {selectedTrack}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-cyber-muted mt-0.5">
                OffSec OSCP, HTB CPTS & CRTO compliant • 1-Click Markdown & Standalone HTML
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Score Pill */}
            <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Score:</span>
              <span
                data-testid="report-modal-score"
                className={`text-xs font-black ${
                  scoreData.isPassing ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {scoreData.totalScore} / {scoreData.maxScore} PTS
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  scoreData.isPassing
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {scoreData.isPassing ? 'PASSED' : 'IN PROGRESS'}
              </span>
            </div>

            <button
              type="button"
              data-testid="report-modal-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
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
            className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{downloadFeedback}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Template Selection & Candidate Parameters */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Certification Template & Candidate Parameters</span>
              </span>
              <span className="text-[10px] text-slate-500">
                Passing Threshold: {trackConfig.passThreshold} Pts
              </span>
            </div>

            {/* Track Selector Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(['OSCP', 'CPTS', 'CRTO'] as ExamTrack[]).map((t) => {
                const isSelected = selectedTrack === t;
                return (
                  <button
                    key={t}
                    type="button"
                    data-testid={`report-track-select-${t.toLowerCase()}`}
                    onClick={() => setSelectedTrack(t)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-[transform,background-color,border-color,color] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan'
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-cyber-text hover:border-cyber-borderGlow'
                    }`}
                  >
                    <div>{t === 'OSCP' ? 'OffSec OSCP' : t === 'CPTS' ? 'HTB CPTS' : 'ZPS CRTO'}</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      {t === 'OSCP' ? 'PEN-200 (70 pts)' : t === 'CPTS' ? '14 Flags (85 pts)' : '8 Objs (75 pts)'}
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
                  className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1"
                >
                  <User className="w-3 h-3 text-cyan-400" /> Candidate Name
                </label>
                <input
                  id="report-candidate-name"
                  data-testid="report-candidate-name"
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  placeholder="Daniel Dayan"
                />
              </div>

              <div>
                <label
                  htmlFor="report-candidate-callsign"
                  className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1"
                >
                  <Hash className="w-3 h-3 text-cyan-400" /> Callsign / Handle
                </label>
                <input
                  id="report-candidate-callsign"
                  data-testid="report-candidate-callsign"
                  type="text"
                  value={candidateCallsign}
                  onChange={(e) => setCandidateCallsign(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  placeholder="0xdnd"
                />
              </div>

              <div>
                <label
                  htmlFor="report-candidate-osid"
                  className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" /> OSID / Student ID
                </label>
                <input
                  id="report-candidate-osid"
                  data-testid="report-candidate-osid"
                  type="text"
                  value={osid}
                  onChange={(e) => setOsid(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  placeholder="OS-94821"
                />
              </div>

              <div>
                <label
                  htmlFor="report-exam-date"
                  className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-cyan-400" /> Assessment Date
                </label>
                <input
                  id="report-exam-date"
                  data-testid="report-exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-400 text-xs"
                />
              </div>
            </div>

            {/* Report Options Toggles */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {selectedTrack === 'OSCP' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="report-opt-bonus"
                    checked={includeBonusPoints}
                    onChange={(e) => setIncludeBonusPoints(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span>+10 OffSec Bonus Labs</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="report-opt-screenshots"
                  checked={includeScreenshots}
                  onChange={(e) => setIncludeScreenshots(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Include Base64 Proof Screenshots</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="report-opt-remediation"
                  checked={includeRemediation}
                  onChange={(e) => setIncludeRemediation(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Include Strategic Remediation</span>
              </label>
            </div>
          </div>

          {/* Section 2: Live Report Preview & Mode Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="report-tab-preview"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Formatted Preview</span>
                </button>

                <button
                  type="button"
                  data-testid="report-tab-raw"
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'raw'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Raw Markdown</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-500">
                {generatedMarkdown.length} characters • {generatedMarkdown.split('\n').length} lines
              </span>
            </div>

            {/* Preview Pane Container */}
            <div
              data-testid="report-preview-pane"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-72 sm:max-h-80 overflow-y-auto text-xs font-mono leading-relaxed"
            >
              {activeTab === 'preview' ? (
                <div
                  data-testid="report-rendered-preview"
                  className="prose prose-invert prose-sm max-w-none text-slate-300 space-y-3 [&_h1]:text-cyan-400 [&_h1]:text-base [&_h1]:border-b [&_h1]:border-slate-800 [&_h1]:pb-1 [&_h2]:text-emerald-400 [&_h2]:text-sm [&_h2]:mt-4 [&_h3]:text-purple-300 [&_h4]:text-slate-200 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-800 [&_th]:p-1.5 [&_th]:bg-slate-900 [&_th]:text-cyan-400 [&_td]:border [&_td]:border-slate-800 [&_td]:p-1.5 [&_code]:text-emerald-300 [&_pre]:bg-slate-900 [&_pre]:p-2 [&_pre]:rounded [&_pre]:border [&_pre]:border-slate-800"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewHtml }}
                />
              ) : (
                <pre
                  data-testid="report-raw-markdown"
                  className="whitespace-pre-wrap text-slate-300 select-all font-mono"
                >
                  {generatedMarkdown}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* 1-Click Action Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 dark:border-cyber-border bg-slate-950/90 dark:bg-cyber-bg/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">Strict Zero-Egress Air-Gapped Export</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Markdown Button */}
            <button
              type="button"
              data-testid="report-copy-markdown-btn"
              onClick={handleCopyMarkdown}
              className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.98] ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            {/* Download Markdown Button */}
            <button
              type="button"
              data-testid="report-download-md-btn"
              onClick={handleDownloadMarkdown}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download (.md)</span>
            </button>

            {/* Export Standalone HTML Button */}
            <button
              type="button"
              data-testid="report-export-html-btn"
              onClick={handleExportHtml}
              className="px-4 py-2 rounded-xl bg-cyber-emerald hover:opacity-90 text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-[transform,background-color,border-color,color] active:scale-[0.98]"
            >
              <FileCode className="w-3.5 h-3.5 fill-current" />
              <span>Export HTML (.html)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
