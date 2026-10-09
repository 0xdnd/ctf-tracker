import React, { useState, useMemo } from 'react';
import { Key, Server, Terminal, Eye, EyeOff, Copy, Check, Trash2, ShieldCheck, Layers, Clock } from 'lucide-react';
import { 
  VaultEvidenceItem, 
  formatIsoTimestamp 
} from '../../pages/EvidenceVaultPage';
import { CyberBadge } from '../common/CyberBadge';
import { playCyberSound } from '../../utils/helpers';

export interface LootTimelineProps {
  items: VaultEvidenceItem[];
  revealedIds: Record<string, boolean>;
  onToggleReveal: (id: string) => void;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onDeleteCustom?: (id: string) => void;
  soundEnabled?: boolean;
}

export type TimelineGrouping = 'phase' | 'chronological';

interface KillChainPhase {
  id: string;
  phaseNum: number;
  name: string;
  subtitle: string;
  accentColor: string;
  borderAccent: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PHASES: KillChainPhase[] = [
  {
    id: 'recon',
    phaseNum: 1,
    name: 'Reconnaissance & Attack Surface',
    subtitle: 'Discovered services, open ports, software banners & CVE candidates',
    accentColor: 'text-muted',
    borderAccent: 'border-subtle',
    badgeBg: 'bg-surface-sunken text-secondary border-subtle',
    icon: Server,
  },
  {
    id: 'foothold',
    phaseNum: 2,
    name: 'Initial Foothold & Access',
    subtitle: 'User proof flags, compromised web passwords & application credentials',
    accentColor: 'text-muted',
    borderAccent: 'border-subtle',
    badgeBg: 'bg-surface-sunken text-secondary border-subtle',
    icon: Key,
  },
  {
    id: 'pivot',
    phaseNum: 3,
    name: 'Lateral Movement & Pivoting',
    subtitle: 'SSH private keys, internal tokens, Kerberos tickets & routing relays',
    accentColor: 'text-muted',
    borderAccent: 'border-subtle',
    badgeBg: 'bg-surface-sunken text-secondary border-subtle',
    icon: Terminal,
  },
  {
    id: 'privesc',
    phaseNum: 4,
    name: 'Privilege Escalation & Root Pwn',
    subtitle: 'Root/System flags, extracted password hashes & administrative proofs',
    accentColor: 'text-muted',
    borderAccent: 'border-subtle',
    badgeBg: 'bg-surface-sunken text-secondary border-subtle',
    icon: ShieldCheck,
  },
];

function assignKillChainPhase(item: VaultEvidenceItem): string {
  if (item.category === 'service') return 'recon';
  if (item.category === 'ssh_key' || item.category === 'token') return 'pivot';
  if (item.category === 'flag') {
    const isRoot = item.typeLabel.toLowerCase().includes('root') || item.username.toLowerCase() === 'system' || item.username.toLowerCase() === 'root';
    return isRoot ? 'privesc' : 'foothold';
  }
  if (item.category === 'hash') return 'privesc';
  if (item.category === 'password') {
    const isRoot = item.username.toLowerCase() === 'administrator' || item.username.toLowerCase() === 'root';
    return isRoot ? 'privesc' : 'foothold';
  }
  return 'foothold';
}

export const LootTimeline: React.FC<LootTimelineProps> = ({
  items,
  revealedIds,
  onToggleReveal,
  copiedId,
  onCopy,
  onDeleteCustom,
  soundEnabled = false,
}) => {
  const [groupingMode, setGroupingMode] = useState<TimelineGrouping>('phase');
  const [filterTarget, setFilterTarget] = useState<string>('all');

  // Extract unique targets for filtering
  const targetOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    items.forEach((it) => {
      if (!map.has(it.targetId)) {
        map.set(it.targetId, { id: it.targetId, name: it.targetName });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterTarget === 'all') return items;
    return items.filter((it) => it.targetId === filterTarget);
  }, [items, filterTarget]);

  // Chronologically sorted items (newest to oldest)
  const chronologicalItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const timeA = new Date(a.discoveredAt).getTime() || 0;
      const timeB = new Date(b.discoveredAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [filteredItems]);

  // Phase-grouped items
  const phaseGroupedItems = useMemo(() => {
    const groups: Record<string, VaultEvidenceItem[]> = {
      recon: [],
      foothold: [],
      pivot: [],
      privesc: [],
    };

    filteredItems.forEach((it) => {
      const phaseId = assignKillChainPhase(it);
      if (groups[phaseId]) {
        groups[phaseId].push(it);
      } else {
        groups.foothold.push(it);
      }
    });

    // Sort items within each phase by discovery time
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const timeA = new Date(a.discoveredAt).getTime() || 0;
        const timeB = new Date(b.discoveredAt).getTime() || 0;
        return timeA - timeB;
      });
    });

    return groups;
  }, [filteredItems]);

  const handleGroupingToggle = (mode: TimelineGrouping) => {
    setGroupingMode(mode);
    if (soundEnabled) playCyberSound('click');
  };

  return (
    <div className="space-y-5" data-testid="loot-timeline-view">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-surface-sunken border border-subtle">
            <button
              type="button"
              onClick={() => handleGroupingToggle('phase')}
              className={`flex items-center gap-1.5 px-3 h-8 max-sm:h-11 rounded-md text-xs font-medium transition-interactive active:scale-[0.97] cursor-pointer ${
 groupingMode === 'phase'
 ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'
 }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kill-chain phases</span>
            </button>
            <button
              type="button"
              onClick={() => handleGroupingToggle('chronological')}
              className={`flex items-center gap-1.5 px-3 h-8 max-sm:h-11 rounded-md text-xs font-medium transition-interactive active:scale-[0.97] cursor-pointer ${
 groupingMode === 'chronological'
 ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'
 }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chronological stream</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted">
            Target
          </label>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="px-2.5 h-8 max-sm:h-11 rounded-lg bg-surface-card border border-subtle text-primary text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent cursor-pointer"
          >
            <option value="all">All targets ({items.length} items)</option>
            {targetOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-subtle">
          <ShieldCheck className="w-10 h-10 text-dim mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-primary">No artifacts in this scope</h3>
          <p className="text-xs text-tertiary mt-1">
            Log a flag or credential, or import a scan, to populate the timeline.
          </p>
          {filterTarget !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterTarget('all')}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-card hover:bg-surface-hover text-primary border border-subtle cursor-pointer transition-colors"
            >
              Show all targets
            </button>
          )}
        </div>
      ) : groupingMode === 'phase' ? (
        /* ================= Phase View ================= */
        <div className="space-y-6">
          {PHASES.map((phase) => {
            const phaseItems = phaseGroupedItems[phase.id] || [];
            const PhaseIcon = phase.icon;

            return (
              <div 
                key={phase.id} 
                className="space-y-3.5 sm:p-5 sm:rounded-2xl sm:border sm:border-subtle sm:bg-surface-card/60"
              >
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${phase.badgeBg} flex items-center justify-center`}>
                      <PhaseIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${phase.accentColor}`}>
                          Phase {phase.phaseNum}
                        </span>
                        <h2 className="text-sm sm:text-base font-semibold text-primary">
                          {phase.name}
                        </h2>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-surface-sunken border border-subtle text-muted font-medium tabular-nums">
                          {phaseItems.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {phase.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phase Items Grid */}
                {phaseItems.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-surface-base/50 border border-dashed border-subtle text-xs text-tertiary">
                    No artifacts logged for this phase yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {phaseItems.map((item) => (
                      <TimelineCard
                        key={item.id}
                        item={item}
                        isRevealed={Boolean(revealedIds[item.id])}
                        onToggleReveal={() => onToggleReveal(item.id)}
                        isCopied={copiedId === item.id}
                        onCopy={() => onCopy(item.secret, item.id)}
                        onDelete={item.isCustom && onDeleteCustom ? () => onDeleteCustom(item.id) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= Chronological Stream View ================= */
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-px before:bg-surface-hover">
          {chronologicalItems.map((item) => {
            const isRevealed = Boolean(revealedIds[item.id]);
            const isCopied = copiedId === item.id;
            const phaseId = assignKillChainPhase(item);
            const phaseMeta = PHASES.find((p) => p.id === phaseId) || PHASES[0];

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node bullet */}
                <div className="absolute -left-6 sm:-left-8 top-4 -translate-x-1/2 w-4 h-4 rounded-full bg-surface-card border-2 border-strong flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>

                <TimelineCard
                  item={item}
                  isRevealed={isRevealed}
                  onToggleReveal={() => onToggleReveal(item.id)}
                  isCopied={isCopied}
                  onCopy={() => onCopy(item.secret, item.id)}
                  onDelete={item.isCustom && onDeleteCustom ? () => onDeleteCustom(item.id) : undefined}
                  showTimestamp
                  phaseTag={`Phase ${phaseMeta.phaseNum}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TimelineCardProps {
  item: VaultEvidenceItem;
  isRevealed: boolean;
  onToggleReveal: () => void;
  isCopied: boolean;
  onCopy: () => void;
  onDelete?: () => void;
  showTimestamp?: boolean;
  phaseTag?: string;
}

const TimelineCard: React.FC<TimelineCardProps> = React.memo(({
  item,
  isRevealed,
  onToggleReveal,
  isCopied,
  onCopy,
  onDelete,
  showTimestamp = true,
  phaseTag,
}) => {
  const isService = item.category === 'service';

  const categoryVariant: 'success' | 'warning' | 'info' | 'neutral' =
    item.category === 'flag' ? 'success' : item.category === 'password' ? 'warning' : item.category === 'ssh_key' || item.category === 'token' ? 'info' : 'neutral';

  return (
    <div className="group p-3.5 sm:p-4 rounded-2xl bg-surface-card border border-subtle hover:border-strong transition-colors machined-edge space-y-2.5">
      {/* Header: Target Name, IP, Type, and Tag */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CyberBadge variant={categoryVariant} size="sm">{item.typeLabel}</CyberBadge>
            {phaseTag && (
              <span className="text-xs text-muted">
                {phaseTag}
              </span>
            )}
            {item.isCustom && (
              <CyberBadge variant="warning" size="xs">Custom</CyberBadge>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="text-xs font-semibold text-primary truncate">
              {item.targetName}
            </h4>
            <span className="text-xs font-mono text-muted tabular-nums">
              {item.targetIp}
            </span>
          </div>
        </div>

        {/* Action Buttons: Mask/Reveal, Copy, Delete */}
        <div className="flex items-center gap-1 shrink-0 [@media(hover:hover)_and_(min-width:640px)]:opacity-0 [@media(hover:hover)_and_(min-width:640px)]:group-hover:opacity-100 [@media(hover:hover)_and_(min-width:640px)]:group-focus-within:opacity-100 transition-opacity">
          {!isService && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="p-1.5 max-sm:p-3 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer"
              title={isRevealed ? 'Mask secret' : 'Reveal secret'}
              aria-label={isRevealed ? 'Mask secret' : 'Reveal secret'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={onCopy}
            className={`p-1.5 max-sm:p-3 rounded-lg text-xs font-medium transition-interactive flex items-center gap-1 active:scale-[0.97] cursor-pointer ${
 isCopied
 ? 'bg-callout-success-bg text-callout-success-fg px-2'
 : 'text-muted hover:text-primary hover:bg-surface-hover'
 }`}
            title="Copy secret to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 max-sm:p-3 rounded-lg text-muted hover:text-callout-danger-fg hover:bg-callout-danger-bg transition-colors active:scale-[0.97] cursor-pointer"
              title="Delete custom loot"
              aria-label="Delete custom loot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Secret Display Box */}
      <div className="p-2.5 rounded-xl bg-surface-sunken border border-subtle text-xs flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted mb-0.5">
            User: <strong className="font-medium text-secondary">{item.username}</strong>
          </div>
          <div className="truncate select-all text-primary font-mono">
            {isService ? (
              <span className="text-secondary font-mono tabular-nums">{item.secret}</span>
            ) : isRevealed ? (
              <span className="font-mono tabular-nums font-medium text-primary">
                {item.secret}
              </span>
            ) : (
              <span className="font-mono text-muted select-none">
                ••••••••••••••••••••
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notes and Discovery Timestamp */}
      <div className="flex items-center justify-between gap-3 text-xs text-muted pt-1">
        <span className="truncate max-w-[260px] text-muted" title={item.notes}>
          {item.notes}
        </span>
        {showTimestamp && (
          <span className="shrink-0 font-mono tabular-nums text-muted">
            {formatIsoTimestamp(item.discoveredAt)}
          </span>
        )}
      </div>
    </div>
  );
});

export default LootTimeline;
