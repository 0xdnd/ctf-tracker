import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { PracticeTrack } from '../../data/tracksData';
import type { TrackProgress } from '../../utils/trackProgress';

interface TrackStripProps {
  /** The single active track. */
  track: PracticeTrack;
  progress: TrackProgress;
  onOpenMachine: (machineId: string) => void;
  /** True while only unsolved machines are listed. */
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
}

const BTN =
  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10';

/** One compact line under the toolbar for the single active track: progress, next machine, hide completed. */
export const TrackStrip: React.FC<TrackStripProps> = ({
  track,
  progress,
  onOpenMachine,
  hideCompleted,
  onToggleHideCompleted,
}) => {
  const next = progress.next;
  const origin = [track.source && `Source: ${track.source}`, track.asOf && `As of ${track.asOf}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <section
      aria-label={`${track.shortName} track progress`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-subtle bg-surface-card px-3 py-1.5 min-w-0"
    >
      <h2 className="text-xs font-semibold text-primary truncate max-w-full" title={track.name}>
        {track.name}
      </h2>

      <div className="flex items-center gap-2 min-w-[9rem] flex-1 sm:flex-none sm:w-52">
        <div
          role="progressbar"
          aria-label={`${track.shortName} progress`}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          className="flex-1 min-w-0 bg-surface-sunken h-1.5 rounded-full border border-subtle overflow-hidden"
        >
          <div className="h-full bg-accent" style={{ width: `${progress.percent}%` }} />
        </div>
        <span className="font-mono tabular-nums text-xs text-secondary whitespace-nowrap">
          {progress.done}/{progress.total} · {progress.percent}%
        </span>
      </div>

      {next ? (
        <button
          type="button"
          onClick={() => onOpenMachine(next.id)}
          className={`${BTN} border-subtle bg-surface-sunken text-primary hover:bg-surface-hover`}
        >
          <span className="truncate max-w-[14rem]">Next: {next.name}</span>
          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        </button>
      ) : (
        progress.total > 0 && <span className="text-xs text-muted">Every machine in this track is done.</span>
      )}

      <button
        type="button"
        aria-pressed={hideCompleted}
        onClick={onToggleHideCompleted}
        className={`${BTN} ${
          hideCompleted
            ? 'border-accent bg-surface-card text-accent'
            : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
        }`}
      >
        Hide completed
      </button>

      {origin && (
        <p className="text-xs text-muted truncate min-w-0 max-w-full md:ml-auto" title={origin}>
          {origin}
        </p>
      )}
    </section>
  );
};
