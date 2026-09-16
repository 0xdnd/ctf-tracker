import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Flag, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Sparkles
} from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { formatDurationHuman, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { PlatformBadge } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { ShareLinkButton } from '../common/ShareLinkButton';

interface KanbanBoardProps {
  filteredMachines: Machine[];
}

interface LaneConfig {
  id: PipelineStatus;
  title: string;
  subtitle: string;
  accentColor: string;
  badgeClass: string;
  borderClass: string;
}

const LANES: LaneConfig[] = [
  {
    id: 'backlog',
    title: 'TARGET BACKLOG',
    subtitle: 'Queued & Scoped Labs',
    accentColor: '#94A3B8',
    badgeClass: 'text-slate-600 dark:text-gray-400 bg-slate-200 dark:bg-gray-900 border-slate-300 dark:border-gray-700',
    borderClass: 'border-cyber-border',
  },
  {
    id: 'recon',
    title: 'ACTIVE RECON',
    subtitle: 'Port & Web Enumeration',
    accentColor: '#06B6D4',
    badgeClass: 'text-cyber-cyan bg-cyber-cyan/10 border-cyber-cyan/30',
    borderClass: 'border-cyber-cyan/40',
  },
  {
    id: 'foothold',
    title: 'FOOTHOLD OBTAINED',
    subtitle: 'User Shell / Initial Access',
    accentColor: '#F59E0B',
    badgeClass: 'text-cyber-amber bg-cyber-amber/10 border-cyber-amber/30',
    borderClass: 'border-cyber-amber/40',
  },
  {
    id: 'root',
    title: 'SYSTEM PWNED',
    subtitle: 'Root / System Flag Captured',
    accentColor: '#EF4444',
    badgeClass: 'text-cyber-crimson bg-cyber-crimson/10 border-cyber-crimson/30',
    borderClass: 'border-cyber-crimson/40',
  },
  {
    id: 'completed',
    title: 'COMPLETED & LOGGED',
    subtitle: 'Writeup Archived & Retired',
    accentColor: '#10B981',
    badgeClass: 'text-cyber-emerald bg-cyber-emerald/10 border-cyber-emerald/30',
    borderClass: 'border-cyber-emerald/40',
  },
];

interface KanbanCardProps {
  machine: Machine;
  isActiveTarget: boolean;
  onSelect: (id: string) => void;
  onSetTarget: (e: React.MouseEvent, id: string) => void;
  onAdvance: (e: React.MouseEvent, m: Machine, nextStatus: PipelineStatus) => void;
  onRetreat: (e: React.MouseEvent, m: Machine, prevStatus: PipelineStatus) => void;
  onOpenReport: (id: string) => void;
  prevLane?: PipelineStatus;
  nextLane?: PipelineStatus;
}

const KanbanCard = React.memo<KanbanCardProps>(({
  machine: m,
  isActiveTarget,
  onSelect,
  onSetTarget,
  onAdvance,
  onRetreat,
  onOpenReport,
  prevLane,
  nextLane,
}) => {
  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);

  return (
    <div
      data-testid="kanban-card"
      onClick={() => onSelect(m.id)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
      className={`group relative p-3 rounded-lg border bg-cyber-card hover:bg-cyber-cardHover transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-0.5 cursor-pointer shadow-sm hover:will-change-transform ${
        isActiveTarget
          ? 'border-cyber-emerald shadow-glow-emerald/30 ring-1 ring-cyber-emerald/40'
          : 'border-cyber-border hover:border-cyber-cyan/50 hover:shadow-glow-cyan/20'
      }`}
    >
      {/* Top Badges */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <PlatformBadge platform={m.platform} size="sm" />

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <CategoryBadge machine={m} size="xs" />
          <OsBadge os={m.os} size="sm" />
          <DifficultyBadge difficulty={m.difficulty} size="sm" />
        </div>
      </div>

      {/* Machine Name & IP */}
      <div className="flex items-start justify-between gap-1.5">
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-base group-hover:text-cyber-cyan transition-colors leading-snug">
            {m.name}
          </div>
          <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="mt-0.5" />
        </div>

        {/* Active Target Engage Button */}
        <button
          onClick={(e) => onSetTarget(e, m.id)}
          className={`p-1.5 rounded transition-[transform,colors] duration-150 hover:scale-110 active:scale-95 ${
            isActiveTarget
              ? 'text-cyber-emerald bg-cyber-emerald/10 border border-cyber-emerald/40 shadow-glow-emerald/20'
              : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white bg-cyber-bg hover:bg-cyber-card border border-cyber-border'
          }`}
          title={isActiveTarget ? 'Currently Engaged' : 'Engage Target & Start Timer'}
        >
          <Crosshair className={`w-4 h-4 ${isActiveTarget ? 'animate-spin-slow' : ''}`} />
        </button>
      </div>

      {/* Flags & Time Spent Pill */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-cyber-border/70 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
              hasUser
                ? 'bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyber-cyan/10 dark:border-cyber-cyan/40 dark:text-cyber-cyan'
                : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-cyber-bg dark:border-cyber-border/60 dark:text-cyber-muted'
            }`}
            title={hasUser ? 'User Flag Captured' : 'User Flag Pending'}
          >
            <Flag className="w-3 h-3" /> U
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
              hasRoot
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-cyber-emerald/10 dark:border-cyber-emerald/40 dark:text-cyber-emerald'
                : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-cyber-bg dark:border-cyber-border/60 dark:text-cyber-muted'
            }`}
            title={hasRoot ? 'Root Flag Captured' : 'Root Flag Pending'}
          >
            <Flag className="w-3 h-3" /> R
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-700 dark:text-cyber-muted">
          <ShareLinkButton
            path={`/target/${m.id}`}
            title={m.name}
            iconOnly
            className="p-1 rounded bg-cyber-bg hover:bg-slate-200 dark:hover:bg-cyber-card border border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-cyber-cyan transition-colors"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReport(m.id);
            }}
            className="p-1 rounded bg-cyber-bg hover:bg-purple-100 dark:hover:bg-purple-950/60 border border-cyber-border hover:border-purple-300 dark:hover:border-purple-600 text-purple-700 dark:text-cyber-muted hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
            title="Open Pentest Pre-Report"
          >
            <FileText className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Certifications */}
      {m.certifications.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {m.certifications.map((cert) => (
            <span
              key={cert}
              className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 border border-purple-300 text-purple-900 dark:bg-cyber-purple/10 dark:border-cyber-purple/30 dark:text-cyber-purple font-bold"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Quick Move Across Lanes Action Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-dashed border-cyber-border/60">
        {prevLane ? (
          <button
            onClick={(e) => onRetreat(e, m, prevLane)}
            className="flex items-center gap-0.5 text-[10px] text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:-translate-x-0.5 transition-all"
            title="Move back"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : <div />}

        {nextLane ? (
          <button
            onClick={(e) => onAdvance(e, m, nextLane)}
            className="flex items-center gap-0.5 text-[10px] text-cyan-700 dark:text-cyber-cyan hover:underline hover:translate-x-0.5 transition-all font-semibold ml-auto"
            title="Advance stage"
          >
            Advance <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : <div />}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.machine === next.machine &&
    prev.isActiveTarget === next.isActiveTarget &&
    prev.prevLane === next.prevLane &&
    prev.nextLane === next.nextLane
  );
});

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ filteredMachines }) => {
  const {
    setSelectedMachineId,
    updateMachineStatus,
    activeTargetId,
    setActiveTarget,
    startTimer,
    soundEnabled,
    setReportMachineId,
    hideEmptyLanes,
  } = useCtfStore(
    useShallow((s) => ({
      setSelectedMachineId: s.setSelectedMachineId,
      updateMachineStatus: s.updateMachineStatus,
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      startTimer: s.startTimer,
      soundEnabled: s.soundEnabled,
      setReportMachineId: s.setReportMachineId,
      hideEmptyLanes: s.filters.hideEmptyLanes,
    }))
  );

  const [laneLimits, setLaneLimits] = React.useState<Record<string, number>>({});

  const handleAdvance = React.useCallback((e: React.MouseEvent, m: Machine, nextStatus: PipelineStatus) => {
    e.stopPropagation();
    updateMachineStatus(m.id, nextStatus);
    if (nextStatus === 'root' || nextStatus === 'completed') {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    } else {
      if (soundEnabled) playCyberSound('toggle');
    }
  }, [updateMachineStatus, soundEnabled]);

  const handleRetreat = React.useCallback((e: React.MouseEvent, m: Machine, prevStatus: PipelineStatus) => {
    e.stopPropagation();
    updateMachineStatus(m.id, prevStatus);
    if (soundEnabled) playCyberSound('toggle');
  }, [updateMachineStatus, soundEnabled]);

  const handleSetTarget = React.useCallback((e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    setActiveTarget(machineId);
    startTimer();
    if (soundEnabled) playCyberSound('timer');
  }, [setActiveTarget, startTimer, soundEnabled]);

  const visibleLanes = React.useMemo(() => {
    if (!hideEmptyLanes) return LANES;
    const populated = LANES.filter((lane) => filteredMachines.some((m) => m.status === lane.id));
    return populated.length > 0 ? populated : LANES;
  }, [hideEmptyLanes, filteredMachines]);

  const gridColsClass = React.useMemo(() => {
    const count = visibleLanes.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-5';
  }, [visibleLanes.length]);

  return (
    <div className={`grid ${gridColsClass} gap-3.5 items-start font-mono pb-8 transition-all`}>
      {visibleLanes.map((lane) => {
        const laneMachines = filteredMachines.filter((m) => m.status === lane.id);
        const limit = laneLimits[lane.id] ?? 40;

        // Active Target Hoisting: Ensure active target is always visible
        const displayedMachines = laneMachines.length <= limit 
          ? laneMachines 
          : (() => {
              let slice = laneMachines.slice(0, limit);
              if (activeTargetId && !slice.some((m) => m.id === activeTargetId)) {
                const activeM = laneMachines.find((m) => m.id === activeTargetId);
                if (activeM) {
                  slice = [activeM, ...slice.slice(0, limit - 1)];
                }
              }
              return slice;
            })();

        const handleLaneScroll = (e: React.UIEvent<HTMLDivElement>) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          if (scrollHeight - scrollTop - clientHeight < 160) {
            if (limit < laneMachines.length) {
              setLaneLimits(prev => ({ ...prev, [lane.id]: limit + 40 }));
            }
          }
        };

        const fullLaneIdx = LANES.findIndex((l) => l.id === lane.id);
        const prevLane = fullLaneIdx > 0 ? LANES[fullLaneIdx - 1].id : null;
        const nextLane = fullLaneIdx < LANES.length - 1 ? LANES[fullLaneIdx + 1].id : null;

        return (
          <div
            key={lane.id}
            className="flex flex-col rounded-xl border border-cyber-border bg-cyber-card/60 backdrop-blur-sm min-h-[550px] overflow-hidden shadow-lg transition-colors hover:border-cyber-borderGlow"
          >
            {/* Lane Header */}
            <div className={`border-b ${lane.borderClass} p-3 bg-cyber-bg/80`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-900 dark:text-white">
                  {lane.title}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${lane.badgeClass}`}>
                  {laneMachines.length}
                </span>
              </div>
              <div className="text-[10px] text-cyber-muted mt-0.5">{lane.subtitle}</div>
            </div>

            {/* Lane Cards Container */}
            <div 
              onScroll={handleLaneScroll}
              className="flex-1 p-2 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] scroll-smooth"
            >
              {displayedMachines.map((m) => {
                const isActiveTarget = activeTargetId === m.id;
                return (
                  <KanbanCard
                    key={m.id}
                    machine={m}
                    isActiveTarget={isActiveTarget}
                    prevLane={prevLane ?? undefined}
                    nextLane={nextLane ?? undefined}
                    onSelect={setSelectedMachineId}
                    onSetTarget={handleSetTarget}
                    onAdvance={handleAdvance}
                    onRetreat={handleRetreat}
                    onOpenReport={setReportMachineId}
                  />
                );
              })}

              {/* Lane Pagination / Load More Footer */}
              {laneMachines.length > displayedMachines.length && (
                <div className="pt-2.5 pb-1.5 px-2 flex flex-col items-center gap-2 border-t border-cyber-border/80 bg-cyber-bg/60 rounded-xl">
                  <div className="text-[10px] text-cyber-muted">
                    Showing <span className="text-white font-bold">{displayedMachines.length}</span> of <span className="text-cyber-cyan font-bold">{laneMachines.length}</span> targets
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: limit + 40 }))}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-cyber-card hover:bg-cyber-cyan/20 border border-cyber-border hover:border-cyber-cyan text-cyber-cyan text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Load +40 More
                    </button>
                    <button
                      onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                      className="py-1.5 px-3 rounded-lg bg-cyber-card hover:bg-cyber-cardHover border border-cyber-border text-cyber-muted hover:text-white text-[10px] transition-all font-semibold"
                      title="Render all targets in this lane"
                    >
                      All ({laneMachines.length})
                    </button>
                  </div>
                </div>
              )}

              {laneMachines.length === 0 && (
                <div className="p-6 text-center text-[11px] text-cyber-muted/60 border border-dashed border-cyber-border/50 rounded-lg">
                  No targets in this lane.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
