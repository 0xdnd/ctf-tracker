import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';

export interface PhaseNavEntry {
  id: string;
  phaseNumber: number;
  title: string;
}

export interface PhaseNavProgress {
  done: number;
  total: number;
}

export interface PhaseNavProps {
  phases: PhaseNavEntry[];
  mode: 'playbook' | 'checklist';
  selected: number | 'all';
  onSelectPhase: (value: number | 'all') => void;
  /** Checklist mode only: expand the matching accordion section when a phase is picked. */
  onExpandPhase?: (phaseId: string) => void;
  /** Checklist mode only: done/total for the applicable items in each phase. */
  progress?: Record<string, PhaseNavProgress>;
  getSectionId: (phaseId: string) => string;
  className?: string;
}

/** DOM id used for the scrollable/observable section tied to a given phase. */
export const phaseSectionId = (phaseId: string): string => `phase-section-${phaseId}`;

const entryBase =
  'inline-flex min-h-11 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] sm:min-h-8 cursor-pointer lg:flex lg:w-full lg:items-start lg:justify-between lg:whitespace-normal lg:text-left';
const entryOn = 'border-accent bg-accent-muted text-primary';
const entryOff = 'border-subtle bg-surface-card text-secondary hover:border-strong hover:text-primary';

export const PhaseNav: React.FC<PhaseNavProps> = ({
  phases,
  mode,
  selected,
  onSelectPhase,
  onExpandPhase,
  progress,
  getSectionId,
  className = '',
}) => {
  const [inViewId, setInViewId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const elements = phases
      .map((p) => document.getElementById(getSectionId(p.id)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        );
        setInViewId(topMost.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [phases, getSectionId]);

  const handleSelect = (entry: PhaseNavEntry | 'all') => {
    if (entry === 'all') {
      onSelectPhase('all');
      return;
    }
    onSelectPhase(entry.phaseNumber);
    onExpandPhase?.(entry.id);
    document.getElementById(getSectionId(entry.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isEntryActive = useMemo(
    () => (entry: PhaseNavEntry | 'all') => {
      if (entry === 'all') {
        return selected === 'all' && !inViewId;
      }
      if (selected !== 'all') return entry.phaseNumber === selected;
      return inViewId === getSectionId(entry.id);
    },
    [selected, inViewId, getSectionId]
  );

  const renderEntry = (entry: PhaseNavEntry | 'all') => {
    const active = isEntryActive(entry);
    const stats = entry !== 'all' && progress ? progress[entry.id] : undefined;
    const isComplete = mode === 'checklist' && Boolean(stats) && stats!.total > 0 && stats!.done === stats!.total;

    return (
      <button
        key={entry === 'all' ? 'all' : entry.id}
        type="button"
        onClick={() => handleSelect(entry)}
        aria-current={active ? 'true' : undefined}
        className={`${entryBase} ${active ? entryOn : entryOff}`}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0 lg:items-start">
          {entry !== 'all' && (
            <span className="font-mono text-[11px] tabular-nums text-muted flex-shrink-0 lg:leading-snug">
              0{entry.phaseNumber}
            </span>
          )}
          <span title={entry === 'all' ? undefined : entry.title} className="max-lg:truncate lg:line-clamp-2 lg:break-words lg:leading-snug">{entry === 'all' ? 'All phases' : entry.title}</span>
        </span>
        {mode === 'checklist' && stats && (
          <span className="inline-flex flex-shrink-0 items-center gap-1 lg:leading-snug text-[11px] font-mono tabular-nums text-muted">
            {isComplete && <Check className="h-3 w-3 text-callout-success-fg" aria-hidden="true" />}
            <span>{stats.done}/{stats.total}</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <nav aria-label="Phase navigator" className={`${className ?? ""} lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
      {/* Mobile / tablet: horizontally scrollable chip row with fade mask */}
      <div className="lg:hidden -mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0 max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)] max-sm:pr-14">
        <div className="flex min-w-max items-center gap-1.5 py-0.5">
          {renderEntry('all')}
          {phases.map((p) => renderEntry(p))}
        </div>
      </div>

      {/* Desktop: sticky vertical list in the left column */}
      <div className="hidden lg:flex lg:flex-col lg:gap-1">
        {renderEntry('all')}
        {phases.map((p) => renderEntry(p))}
      </div>
    </nav>
  );
};

export default PhaseNav;
