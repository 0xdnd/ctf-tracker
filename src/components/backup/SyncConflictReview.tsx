import { AlertTriangle, GitMerge, Loader2 } from 'lucide-react';
import type { ConflictChoice, MachineSideSummary, SyncConflict } from '../../utils/syncMerge';

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  recon: 'Recon',
  foothold: 'Foothold',
  root: 'Root',
  completed: 'Completed',
};

const formatDuration = (s: number) => {
  if (s <= 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const describeSide = (s: MachineSideSummary): string => {
  const parts = [STATUS_LABEL[s.status] ?? s.status];
  const flags = [s.userFlag && 'user flag', s.rootFlag && 'root flag'].filter(Boolean);
  parts.push(flags.length ? flags.join(' + ') : 'no flags');
  parts.push(s.notesChars > 0 ? `notes ${s.notesChars} chars` : 'no notes');
  if (s.writeupChars > 0) parts.push(`writeup ${s.writeupChars} chars`);
  parts.push(`time ${formatDuration(s.timeSpentSeconds)}`);
  const edited = Date.parse(s.updatedAt);
  if (Number.isFinite(edited)) parts.push(`edited ${new Date(edited).toLocaleString()}`);
  return parts.join(' · ');
};

interface SyncConflictReviewProps {
  conflicts: SyncConflict[];
  resolutions: Record<string, ConflictChoice>;
  onChoose: (id: string, choice: ConflictChoice) => void;
  onApply: () => void;
  onCancel: () => void;
  busy: boolean;
}

/**
 * Lists machines changed on both devices since the last sync. Nothing is written until every row has a choice;
 * Cancel drops the pending merge without touching any data.
 */
export default function SyncConflictReview({ conflicts, resolutions, onChoose, onApply, onCancel, busy }: SyncConflictReviewProps) {
  const resolved = conflicts.filter((c) => resolutions[c.id]).length;
  const allResolved = resolved === conflicts.length;
  return (
    <section
      aria-labelledby="sync-conflicts-title"
      className="p-3 rounded-lg bg-callout-warn-bg border border-callout-warn-border space-y-3"
    >
      <div className="flex items-start gap-2 text-callout-warn-fg">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h4 id="sync-conflicts-title" className="font-semibold text-xs">
            {conflicts.length === 1 ? '1 machine changed on both devices' : `${conflicts.length} machines changed on both devices`}
          </h4>
          <p className="text-[11px] text-secondary mt-0.5">
            Choose which copy to keep for each one. Nothing is written until every machine has a choice.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {conflicts.map((c) => {
          const group = `sync-conflict-${c.id}`;
          return (
            <li key={c.id} className="p-2.5 rounded-lg bg-surface-card border border-subtle space-y-2">
              <fieldset>
                <legend className="font-semibold text-primary text-xs mb-1.5">{c.name}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['local', 'incoming'] as const).map((side) => {
                    const inputId = `${group}-${side}`;
                    return (
                      <div
                        key={side}
                        className={`flex items-start gap-2 p-2 rounded border text-[11px] transition-colors ${
                          resolutions[c.id] === side ? 'border-accent bg-surface-sunken' : 'border-subtle hover:border-strong'
                        }`}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name={group}
                          value={side}
                          checked={resolutions[c.id] === side}
                          onChange={() => onChoose(c.id, side)}
                          disabled={busy}
                          aria-describedby={`${inputId}-summary`}
                          className="mt-0.5 text-accent focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer"
                        />
                        <div>
                          <label htmlFor={inputId} className="block font-medium text-primary cursor-pointer">
                            {side === 'local' ? 'Keep local' : 'Keep incoming'}
                          </label>
                          <p id={`${inputId}-summary`} className="text-muted">
                            {describeSide(side === 'local' ? c.local : c.incoming)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-secondary" aria-live="polite">
          {resolved} of {conflicts.length} resolved
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle text-primary hover:border-strong transition-colors disabled:opacity-50"
          >
            Cancel merge
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!allResolved || busy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-110 active:scale-[0.97] transition-[opacity,filter,transform] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" /> : <GitMerge className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>Apply merge</span>
          </button>
        </div>
      </div>
    </section>
  );
}
