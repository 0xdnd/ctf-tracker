import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { computeReadiness } from '../../utils/readiness';
import { playCyberSound } from '../../utils/helpers';

const CARD = 'p-5 rounded-2xl border border-subtle bg-surface-card machined-edge';

/** Readiness score, weakest tags, suggested next machines and the spaced-repetition review queue. */
export const ReadinessSection: React.FC = () => {
  const machines = useCtfStore((s) => s.machines);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const setFilters = useCtfStore((s) => s.setFilters);
  const setSelectedMachineId = useCtfStore((s) => s.setSelectedMachineId);
  const navigate = useNavigate();
  const readiness = useMemo(() => computeReadiness(machines, Date.now()), [machines]);
  const due = readiness.dueItems.length;

  const showDueInTracker = () => {
    const rest = useCtfStore
      .getState()
      .filters.searchQuery.replace(/(^|\s)review:due(?=\s|$)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    setFilters({ searchQuery: `${rest} review:due`.trim() });
    if (soundEnabled) playCyberSound('click');
    navigate('/tracker');
  };

  return (
    <section aria-labelledby="readiness-heading" className={`${CARD} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted" aria-hidden="true" />
          <h2 id="readiness-heading" className="font-semibold text-primary text-sm">Readiness</h2>
        </div>
        <span className="text-xs text-muted">Solve rate, reduced by overdue reviews</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xl font-semibold font-mono text-primary tabular-nums tracking-tight" data-testid="readiness-score">
            {readiness.score}%
            <span className="ml-2 text-xs font-sans font-normal text-muted">
              {readiness.solved}/{readiness.attempted} solved
            </span>
          </div>
          {readiness.weakestTags.length > 0 && (
            <div className="text-xs text-secondary mt-1">
              Weakest:{' '}
              <span className="text-primary font-mono">
                {readiness.weakestTags.map((t) => `${t.tag} (${t.solved}/${t.attempted})`).join(', ')}
              </span>
            </div>
          )}
          {readiness.nextSuggested.length > 0 && (
            <div className="text-xs text-secondary mt-1">
              Next:{' '}
              {readiness.nextSuggested.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && ', '}
                  <button
                    type="button"
                    onClick={() => setSelectedMachineId(m.id)}
                    className="text-accent hover:underline cursor-pointer font-medium"
                  >
                    {m.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review queue */}
      <div id="review" className="scroll-mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-sunken border border-subtle px-3 py-2">
        <div className="text-xs text-secondary">
          <h3 className="inline font-semibold text-primary">Review queue:</h3>{' '}
          <span className="tabular-nums font-mono text-primary">{due}</span>{' '}
          {due === 1 ? 'machine is' : 'machines are'} due for review
        </div>
        <button
          type="button"
          onClick={showDueInTracker}
          disabled={due === 0}
          className="inline-flex items-center h-8 px-2.5 rounded-lg border border-subtle bg-surface-card text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
        >
          Show due in tracker
        </button>
      </div>
    </section>
  );
};
