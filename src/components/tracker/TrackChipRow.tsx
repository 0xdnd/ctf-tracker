import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { PracticeTrack } from '../../data/tracksData';
import type { Machine } from '../../types';
import type { TrackProgress } from '../../utils/trackProgress';

const CHIP_BASE =
  'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10';
const CHIP_ON = 'border-accent bg-surface-card text-accent';
const CHIP_OFF = 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary';

interface TrackChipRowProps {
  tracks: readonly PracticeTrack[];
  progress: ReadonlyMap<string, TrackProgress>;
  /** Id of the single selected track, or null when none or several are selected. */
  activeTrackId: string | null;
  /** Ids of every selected track; those chips show as pressed too. */
  selectedTrackIds: readonly string[];
  /** Called with the track to select, or null to clear it (the active chip was tapped again). */
  onSelect: (trackId: string | null) => void;
  onOpenMachine: (machineId: string) => void;
  /** Opens the filter drawer, where several tracks are picked. Shown as a MULTI chip while more than one is selected. */
  onOpenMulti: () => void;
  /** True while only unsolved machines are listed. */
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
}

export const TrackChipRow: React.FC<TrackChipRowProps> = ({
  tracks,
  progress,
  activeTrackId,
  selectedTrackIds,
  onSelect,
  onOpenMachine,
  onOpenMulti,
  hideCompleted,
  onToggleHideCompleted,
}) => {
  const activeTrack = activeTrackId ? tracks.find((t) => t.id === activeTrackId) : undefined;
  const activeProgress = activeTrack ? progress.get(activeTrack.id) : undefined;
  const next: Machine | null = activeProgress?.next ?? null;

  return (
    <section aria-label="Practice tracks" className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Choose a practice track">
        {tracks.map((track) => {
          const p = progress.get(track.id);
          const pressed = selectedTrackIds.includes(track.id);
          return (
            <button
              key={track.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(activeTrackId === track.id ? null : track.id)}
              title={track.name}
              className={`${CHIP_BASE} ${pressed ? CHIP_ON : CHIP_OFF}`}
            >
              <span>{track.shortName}</span>
              {p && (
                <span className="font-mono tabular-nums text-xs text-muted">
                  {p.done}/{p.total}
                </span>
              )}
            </button>
          );
        })}
        {selectedTrackIds.length > 1 && (
          <button
            type="button"
            aria-pressed={true}
            onClick={onOpenMulti}
            title="Several tracks are selected. Open the filters to change them."
            className={`${CHIP_BASE} ${CHIP_ON}`}
          >
            <span>MULTI ({selectedTrackIds.length})</span>
          </button>
        )}
      </div>

      {activeTrack && activeProgress && (
        <div className="flex flex-col gap-2 rounded-xl border border-subtle bg-surface-card p-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold text-primary">{activeTrack.name}</h2>
            {(activeTrack.source || activeTrack.asOf) && (
              <p className="text-xs text-muted">
                {activeTrack.source && <span>Source: {activeTrack.source}</span>}
                {activeTrack.source && activeTrack.asOf && <span> · </span>}
                {activeTrack.asOf && <span>As of {activeTrack.asOf}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={`${activeTrack.shortName} progress`}
              aria-valuemin={0}
              aria-valuemax={activeProgress.total}
              aria-valuenow={activeProgress.done}
              className="flex-1 min-w-0 bg-surface-sunken h-2 rounded-full border border-subtle overflow-hidden"
            >
              <div className="h-full bg-accent" style={{ width: `${activeProgress.percent}%` }} />
            </div>
            <span className="font-mono tabular-nums text-xs text-secondary whitespace-nowrap">
              {activeProgress.done}/{activeProgress.total} · {activeProgress.percent}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {next ? (
              <button
                type="button"
                onClick={() => onOpenMachine(next.id)}
                className="inline-flex items-center gap-1.5 self-start h-8 px-3 rounded-lg border border-subtle bg-surface-sunken text-xs font-medium text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-10"
              >
                <span>Next: {next.name}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              activeProgress.total > 0 && <p className="text-xs text-muted">Every machine in this track is done.</p>
            )}
            <button
              type="button"
              aria-pressed={hideCompleted}
              onClick={onToggleHideCompleted}
              className={`${CHIP_BASE} ${hideCompleted ? CHIP_ON : CHIP_OFF}`}
            >
              <span>Hide completed</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
