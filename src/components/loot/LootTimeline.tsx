import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Flag, 
  Server, 
  Terminal, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Crosshair, 
  Layers, 
  Clock, 
  Lock, 
  Unlock,
  Radio,
  Search,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  VaultEvidenceItem, 
  EvidenceCategory, 
  formatIsoTimestamp 
} from '../../pages/EvidenceVaultPage';
import { PlatformBadge } from '../common/PlatformBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';

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
    accentColor: 'text-callout-info-fg',
    borderAccent: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/10 text-callout-info-fg border-sky-500/30',
    icon: Server,
  },
  {
    id: 'foothold',
    phaseNum: 2,
    name: 'Initial Foothold & Access',
    subtitle: 'User proof flags, compromised web passwords & application credentials',
    accentColor: 'text-callout-warn-fg',
    borderAccent: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/10 text-callout-warn-fg border-amber-500/30',
    icon: Key,
  },
  {
    id: 'pivot',
    phaseNum: 3,
    name: 'Lateral Movement & Pivoting',
    subtitle: 'SSH private keys, internal tokens, Kerberos tickets & routing relays',
    accentColor: 'text-callout-info-fg',
    borderAccent: 'border-cyan-500/30',
    badgeBg: 'bg-cyan-500/10 text-callout-info-fg border-cyan-500/30',
    icon: Terminal,
  },
  {
    id: 'privesc',
    phaseNum: 4,
    name: 'Privilege Escalation & Root Pwn',
    subtitle: 'Root/System flags, extracted password hashes & administrative proofs',
    accentColor: 'text-callout-success-fg',
    borderAccent: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10 text-callout-success-fg border-emerald-500/30',
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-card border border-subtle machined-edge">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-surface-base border border-subtle machined-edge">
            <button
              type="button"
              onClick={() => handleGroupingToggle('phase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] cursor-pointer ${
                groupingMode === 'phase'
                  ? 'bg-cyber-emerald text-black shadow-xs'
                  : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>KILL-CHAIN PHASES</span>
            </button>
            <button
              type="button"
              onClick={() => handleGroupingToggle('chronological')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] cursor-pointer ${
                groupingMode === 'chronological'
                  ? 'bg-cyber-emerald text-black shadow-xs'
                  : 'text-tertiary hover:text-slate-900 dark:hover:text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>CHRONOLOGICAL STREAM</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase font-bold text-tertiary tracking-wider">
            FILTER TARGET:
          </label>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-base border border-subtle text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-cyber-cyan cursor-pointer"
          >
            <option value="all">All Targets ({items.length} items)</option>
            {targetOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-subtle bg-surface-card/40 machined-edge">
          <ShieldCheck className="w-10 h-10 text-tertiary mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Artifacts in Selected Scope</h3>
          <p className="text-xs text-tertiary mt-1">
            Log flags, extracted credentials, or run recon scans to populate the loot timeline.
          </p>
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
                className="space-y-3.5 p-4 sm:p-5 rounded-2xl border border-subtle bg-surface-card/60 machined-edge"
              >
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${phase.badgeBg} machined-edge flex items-center justify-center`}>
                      <PhaseIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${phase.accentColor}`}>
                          PHASE 0{phase.phaseNum}
                        </span>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {phase.name}
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-base border border-subtle text-slate-600 dark:text-zinc-300 font-bold tabular-nums">
                          {phaseItems.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-tertiary mt-0.5">
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
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyber-emerald before:via-cyan-500 before:to-purple-500">
          {chronologicalItems.map((item, index) => {
            const isRevealed = Boolean(revealedIds[item.id]);
            const isCopied = copiedId === item.id;
            const phaseId = assignKillChainPhase(item);
            const phaseMeta = PHASES.find((p) => p.id === phaseId) || PHASES[0];

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node bullet */}
                <div className="absolute -left-6 sm:-left-8 top-4 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyber-emerald flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse" />
                </div>

                <TimelineCard
                  item={item}
                  isRevealed={isRevealed}
                  onToggleReveal={() => onToggleReveal(item.id)}
                  isCopied={isCopied}
                  onCopy={() => onCopy(item.secret, item.id)}
                  onDelete={item.isCustom && onDeleteCustom ? () => onDeleteCustom(item.id) : undefined}
                  showTimestamp
                  phaseTag={`Phase ${phaseMeta.phaseNum}: ${phaseMeta.name.split(' ')[0]}`}
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
  const isFlag = item.category === 'flag';
  const isService = item.category === 'service';
  const isHash = item.category === 'hash';

  const categoryColor = useMemo(() => {
    switch (item.category) {
      case 'flag':
        return 'border-emerald-500/40 bg-emerald-500/5 text-callout-success-fg';
      case 'password':
        return 'border-amber-500/40 bg-amber-500/5 text-callout-warn-fg';
      case 'hash':
        return 'border-purple-500/40 bg-purple-500/5 text-callout-tip-fg';
      case 'ssh_key':
        return 'border-cyan-500/40 bg-cyan-500/5 text-callout-info-fg';
      case 'token':
        return 'border-blue-500/40 bg-blue-500/5 text-callout-info-fg';
      case 'service':
        return 'border-slate-500/40 bg-slate-500/5 text-tertiary';
      default:
        return 'border-subtle bg-surface-base text-tertiary';
    }
  }, [item.category]);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-card border border-subtle hover:border-slate-400 dark:hover:border-zinc-700 transition-colors shadow-xs machined-edge space-y-2.5">
      {/* Header: Target Name, IP, Type, and Tag */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${categoryColor}`}>
              {item.typeLabel}
            </span>
            {phaseTag && (
              <span className="text-[10px] font-mono text-tertiary">
                · {phaseTag}
              </span>
            )}
            {item.isCustom && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-purple-500/10 text-callout-tip-fg border border-purple-500/30 font-bold uppercase">
                Custom Loot
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {item.targetName}
            </h4>
            <span className="text-[11px] font-mono text-tertiary tabular-nums">
              {item.targetIp}
            </span>
          </div>
        </div>

        {/* Action Buttons: Mask/Reveal, Copy, Delete */}
        <div className="flex items-center gap-1 shrink-0">
          {!isService && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="p-1.5 rounded-lg text-tertiary hover:text-slate-900 dark:hover:text-primary hover:bg-surface-base transition-colors active:scale-[0.97] cursor-pointer"
              title={isRevealed ? 'Mask Secret' : 'Reveal Secret'}
              aria-label={isRevealed ? 'Mask secret' : 'Reveal secret'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={onCopy}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-[0.97] cursor-pointer ${
              isCopied
                ? 'bg-cyber-emerald text-black px-2'
                : 'text-tertiary hover:text-slate-900 dark:hover:text-primary hover:bg-surface-base'
            }`}
            title="Copy Secret to Clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px]">COPIED</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-tertiary hover:text-callout-danger-fg hover:bg-rose-500/10 transition-colors active:scale-[0.97] cursor-pointer"
              title="Delete Custom Loot"
              aria-label="Delete custom loot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Secret Display Box */}
      <div className="p-2.5 rounded-xl bg-surface-base border border-subtle font-mono text-xs flex items-center justify-between gap-2 machined-edge">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-0.5">
            IDENTITY / USER: <strong className="text-slate-700 dark:text-zinc-200">{item.username}</strong>
          </div>
          <div className="truncate select-all text-slate-900 dark:text-white">
            {isService ? (
              <span className="text-slate-700 dark:text-zinc-300 font-mono tabular-nums">{item.secret}</span>
            ) : isRevealed ? (
              <span className={`tabular-nums ${isFlag ? 'text-cyber-emerald font-bold' : isHash ? 'text-callout-tip-fg font-bold' : 'text-callout-warn-fg font-bold'}`}>
                {item.secret}
              </span>
            ) : (
              <span className="text-tertiary tracking-widest select-none">
                ••••••••••••••••••••
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notes and Discovery Timestamp */}
      <div className="flex items-center justify-between text-[10px] text-tertiary font-mono pt-1">
        <span className="truncate max-w-[260px] text-tertiary" title={item.notes}>
          {item.notes}
        </span>
        {showTimestamp && (
          <span className="shrink-0 tabular-nums text-tertiary">
            {formatIsoTimestamp(item.discoveredAt)}
          </span>
        )}
      </div>
    </div>
  );
});

export default LootTimeline;
