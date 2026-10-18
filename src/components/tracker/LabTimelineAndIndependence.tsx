import React from 'react';
import { Award, History, Check } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { Machine, SolveIndependence } from '../../types';
import { isDueForReview } from '../../utils/spacedRepetition';
import { playCyberSound } from '../../utils/helpers';

interface LabTimelineAndIndependenceProps {
  machine: Machine;
  className?: string;
}

const INDEPENDENCE_MODES: { value: SolveIndependence; label: string; description: string }[] = [
  { value: 'solo', label: 'Solo (Unassisted)', description: 'Solved completely independently without hints or writeups' },
  { value: 'nudged', label: 'Nudged (Hints)', description: 'Checked nudges or forum hints to overcome blockers' },
  { value: 'assisted', label: 'Assisted (Walkthrough)', description: 'Followed writeup or video solution closely' },
];

export const LabTimelineAndIndependence: React.FC<LabTimelineAndIndependenceProps> = ({
  machine,
  className = '',
}) => {
  const setSolveIndependence = useCtfStore((s) => s.setSolveIndependence);
  const markReviewed = useCtfStore((s) => s.markReviewed);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const currentIndependence = machine.solveIndependence;
  const isDue = isDueForReview(machine, Date.now());
  const reviewCount = machine.reviewCount || 0;
  const timeline = [...(machine.timeline || [])].sort((a, b) => b.at - a.at); // newest first

  const handleSelectIndependence = (mode: SolveIndependence) => {
    setSolveIndependence(machine.id, mode);
    if (soundEnabled) playCyberSound('engage');
  };

  const handleMarkReviewed = () => {
    markReviewed(machine.id);
    if (soundEnabled) playCyberSound('root');
  };

  const formatReviewDate = (epochMs?: number) => {
    if (!epochMs) return 'Not scheduled';
    const d = new Date(epochMs);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatEventDate = (epochMs: number) => {
    const d = new Date(epochMs);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Solve Independence & Spaced Repetition Card */}
      <div className="rounded-xl border border-subtle bg-surface-card p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-callout-warn-fg" />
            <h3 className="text-xs font-semibold text-primary">Solve Independence &amp; Spaced Review</h3>
          </div>

          {machine.nextReviewAt && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                  isDue
                    ? 'bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border'
                    : 'bg-surface-sunken text-muted'
                }`}
              >
                {isDue ? 'Review Due' : `Next review: ${formatReviewDate(machine.nextReviewAt)}`}
              </span>
              <button
                type="button"
                onClick={handleMarkReviewed}
                className="px-2 py-0.5 rounded bg-surface-sunken hover:bg-surface-hover border border-subtle text-xs font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Mark reviewed now and advance spaced repetition interval"
              >
                Complete Review ({reviewCount} done)
              </button>
            </div>
          )}
        </div>

        {/* 3-State Independence Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INDEPENDENCE_MODES.map((mode) => {
            const isSelected = currentIndependence === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleSelectIndependence(mode.value)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-accent bg-accent-muted ring-1 ring-accent/30'
                    : 'border-subtle bg-surface-sunken/60 hover:bg-surface-hover hover:border-strong'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-primary'}`}>
                    {mode.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent stroke-[3]" />}
                </div>
                <div className="text-[11px] text-muted leading-tight">{mode.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Section */}
      <div className="rounded-xl border border-subtle bg-surface-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-callout-info-fg" />
            <h3 className="text-xs font-semibold text-primary">Lab Engagement Timeline ({timeline.length})</h3>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="text-center py-5 text-xs text-muted">
            No milestones logged yet. Changes to flags, findings, and reviews will appear here automatically.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {timeline.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-lg border border-subtle bg-surface-sunken/50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span className="font-medium text-secondary truncate">{evt.label}</span>
                </div>
                <span className="font-mono text-[11px] text-muted whitespace-nowrap tabular-nums">
                  {formatEventDate(evt.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
