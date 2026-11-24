import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Flame, PlusCircle, Sparkles, X } from 'lucide-react';
import { Modal } from './Modal';
import { useUpdateUiStore } from '../../store/useUpdateUiStore';
import { useCtfStore } from '../../store/useCtfStore';
import type { CatalogMachineSummary } from '../../utils/whatsNewDiff';

type MachineBucket = 'added' | 'active' | 'retired';

const BUCKET_META: Record<
  MachineBucket,
  { label: string; emptyLabel: string; badgeCls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  added: {
    label: 'Added',
    emptyLabel: 'No newly added catalog machines in this update.',
    badgeCls: 'border-callout-success-border/40 bg-callout-success-bg text-callout-success-fg',
    icon: PlusCircle,
  },
  active: {
    label: 'Now Active',
    emptyLabel: 'No newly active seasonal machines in this update.',
    badgeCls: 'border-callout-warn-border/40 bg-callout-warn-bg text-callout-warn-fg',
    icon: Flame,
  },
  retired: {
    label: 'Retired',
    emptyLabel: 'No machines retired from the active pool in this update.',
    badgeCls: 'border-subtle bg-surface-sunken text-secondary',
    icon: Archive,
  },
};

/**
 * Concise post-update What's New dialog showing short release highlights and Added / Now Active / Retired machines.
 */
export const WhatsNewModal: React.FC = () => {
  const open = useUpdateUiStore((s) => s.whatsNewOpen);
  const payload = useUpdateUiStore((s) => s.whatsNewPayload);
  const close = useUpdateUiStore((s) => s.closeWhatsNew);

  const machines = useCtfStore((s) => s.machines);
  const setSelectedMachineId = useCtfStore((s) => s.setSelectedMachineId);
  const setFilters = useCtfStore((s) => s.setFilters);
  const navigate = useNavigate();

  const defaultBucket: MachineBucket = useMemo(() => {
    if (!payload) return 'active';
    if (payload.added.length > 0) return 'added';
    if (payload.active.length > 0) return 'active';
    if (payload.retired.length > 0) return 'retired';
    return 'active';
  }, [payload]);

  const [selectedBucket, setSelectedBucket] = useState<MachineBucket | null>(null);
  const activeBucket = selectedBucket ?? defaultBucket;

  if (!payload) return null;

  const buckets: Record<MachineBucket, CatalogMachineSummary[]> = {
    added: payload.added,
    active: payload.active,
    retired: payload.retired,
  };
  const totalMachineChanges = payload.added.length + payload.active.length + payload.retired.length;
  const visibleMachines = buckets[activeBucket];

  const handleJumpToMachine = (item: CatalogMachineSummary) => {
    const match =
      (item.id ? machines.find((m) => m.id === item.id) : undefined) ??
      machines.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
    close();
    setSelectedBucket(null);
    navigate('/tracker');
    if (match) {
      setSelectedMachineId(match.id);
    } else {
      setFilters({ searchQuery: item.name });
    }
  };

  const handleClose = () => {
    setSelectedBucket(null);
    close();
  };

  const subtitle = payload.previousVersion && payload.previousVersion !== payload.version
    ? `Updated v${payload.previousVersion} → v${payload.version}`
    : payload.catalogAsOf
      ? `v${payload.version} · Catalog synced ${payload.catalogAsOf}`
      : `ZeroBox v${payload.version}`;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      labelledBy="whats-new-title"
      size="lg"
      panelClassName="text-primary"
    >
      <div className="flex max-h-[86dvh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="whats-new-title" className="text-sm font-semibold text-primary">
                What&apos;s new in ZeroBox
              </h2>
              <p className="text-[11px] text-muted">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close What's New"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 text-xs scrollbar-thin">
          {payload.highlights.length > 0 && (
            <section aria-label="Release highlights" className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                In short
              </h3>
              <ul className="space-y-1.5 rounded-xl border border-subtle bg-surface-sunken p-3 text-secondary leading-relaxed">
                {payload.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Machine catalog updates" className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Machine catalog
              </h3>
              {payload.activePoolCount > 0 && (
                <span className="text-[11px] text-muted tabular-nums">
                  {payload.activePoolCount} HTB active in pool
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Catalog update categories">
              {(['added', 'active', 'retired'] as MachineBucket[]).map((key) => {
                const meta = BUCKET_META[key];
                const Icon = meta.icon;
                const count = buckets[key].length;
                const isSelected = activeBucket === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedBucket(key)}
                    className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-primary'
                        : 'border-subtle bg-surface-sunken text-secondary hover:bg-surface-hover hover:text-primary'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{meta.label}</span>
                    <span className="rounded-full bg-surface-card px-1.5 text-[10px] font-semibold tabular-nums text-primary">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {totalMachineChanges === 0 || visibleMachines.length === 0 ? (
              <div className="rounded-xl border border-subtle bg-surface-sunken px-3 py-4 text-center text-[11px] text-muted">
                {BUCKET_META[activeBucket].emptyLabel}
              </div>
            ) : (
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-subtle bg-surface-sunken p-2.5">
                {visibleMachines.map((item) => (
                  <button
                    key={`${item.platform}-${item.id || item.name}`}
                    type="button"
                    onClick={() => handleJumpToMachine(item)}
                    title={`Open ${item.name} in Tracker`}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${BUCKET_META[activeBucket].badgeCls}`}
                  >
                    <span className="font-semibold">{item.name}</span>
                    <span className="font-normal">
                      {item.platform}
                      {item.difficulty ? ` · ${item.difficulty}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-subtle bg-surface-card px-4 py-3">
          <span className="text-[11px] text-muted">
            Tip: reopen anytime from About → What&apos;s new
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 cursor-pointer rounded-lg bg-accent px-4 text-xs font-semibold text-on-accent transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};

