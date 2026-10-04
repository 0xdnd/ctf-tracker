import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Flag, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Sparkles,
  Layers,
  Radio,
  Key,
  Zap,
  Award
} from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { formatDurationHuman, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { TACTICAL_SPRING, CASCADE_STAGGER_DELAY } from '../../utils/motionTokens';
import { PlatformBadge } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { ShareLinkButton } from '../common/ShareLinkButton';

import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';


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
  icon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptySubtitle: string;
  emptyHint: string;
}

const LANES: LaneConfig[] = [
  {
    id: 'backlog',
    title: 'BACKLOG',
    subtitle: 'Queued & Scoped Labs',
    accentColor: '#71717A',
    badgeClass: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
    borderClass: 'border-zinc-200 dark:border-zinc-800',
    icon: Layers,
    emptyTitle: 'BACKLOG EMPTY',
    emptySubtitle: 'No queued machines in scope',
    emptyHint: 'Select tracks or add custom targets from catalog',
  },
  {
    id: 'recon',
    title: 'ACTIVE RECON',
    subtitle: 'Port & Web Enumeration',
    accentColor: '#0ea5e9',
    badgeClass: 'text-[#0ea5e9] bg-[#0ea5e9]/10 border-[#0ea5e9]/30',
    borderClass: 'border-zinc-200 dark:border-zinc-800 hover:border-[#0ea5e9]/40',
    icon: Radio,
    emptyTitle: 'RECON STAGE IDLE',
    emptySubtitle: 'No targets undergoing active scanning',
    emptyHint: 'Advance or drag a backlog target here to start recon',
  },
  {
    id: 'foothold',
    title: 'FOOTHOLD',
    subtitle: 'User Shell / Initial Access',
    accentColor: '#f59e0b',
    badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    borderClass: 'border-zinc-200 dark:border-zinc-800 hover:border-amber-500/30',
    icon: Key,
    emptyTitle: 'NO ACTIVE FOOTHOLDS',
    emptySubtitle: 'Awaiting initial low-priv access',
    emptyHint: 'Drag target here when user shell is secured',
  },
  {
    id: 'root',
    title: 'SYSTEM PWNED',
    subtitle: 'Root / System Flag Captured',
    accentColor: '#10b981',
    badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    borderClass: 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/30',
    icon: Zap,
    emptyTitle: 'NO PENDING ROOT PWNS',
    emptySubtitle: 'All privilege escalations complete',
    emptyHint: 'Drag target here upon system flag capture',
  },
  {
    id: 'completed',
    title: 'COMPLETED',
    subtitle: 'Writeup Archived & Retired',
    accentColor: '#8b5cf6',
    badgeClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
    borderClass: 'border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30',
    icon: Award,
    emptyTitle: 'NO ARCHIVED LABS',
    emptySubtitle: 'Post-exploitation writeups archived here',
    emptyHint: 'Move completed machines here to log writeups',
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

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: m.id,
    data: { machine: m },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid="kanban-card"
      onClick={() => onSelect(m.id)}
      className={`group cyber-kanban-contain relative p-3 rounded-lg border transition-all duration-150 cursor-pointer surface-card-depth machined-edge active:scale-[0.97] ${
        isActiveTarget
          ? 'bg-accent/[0.03] border-accent ring-1 ring-accent/40 shadow-xs'
          : 'bg-surface-card border-subtle hover:border-strong hover:bg-surface-hover'
      }`}
    >
      {/* Top Badges: De-cluttered (Difficulty + OS) */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <OsBadge os={m.os} size="xs" variant="hardware" />
        </div>
        <DifficultyBadge difficulty={m.difficulty} size="xs" variant="hardware" className="shrink-0" />
      </div>

      {/* Machine Name & IP */}
      <div className="flex items-start justify-between gap-2 mt-1">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-snug font-sans truncate transition-colors text-primary group-hover:text-accent">
            {m.name}
          </div>
          <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" variant="hardware" className="mt-1 font-mono text-[11px] tabular-nums" />
        </div>

        {/* Active Target Engage Button */}
        <button
          onClick={(e) => onSetTarget(e, m.id)}
          className={`p-1.5 rounded-xs transition-all active:scale-[0.97] flex-shrink-0 cursor-pointer ${
            isActiveTarget
              ? 'text-accent bg-accent/10 border border-accent/50 shadow-xs'
              : 'text-muted hover:text-primary bg-surface-card hover:bg-surface-hover border border-subtle'
          }`}
          title={isActiveTarget ? 'Currently Engaged Target' : 'Engage Target & Start Timer'}
          aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
        >
          <Crosshair className={`w-4 h-4 ${isActiveTarget ? 'animate-spin-slow text-accent' : ''}`} />
        </button>
      </div>

      {/* Flags & Time Spent Pill */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-subtle text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border text-[10px] font-bold font-mono transition-colors tabular-nums ${
              hasUser
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-surface-sunken border-subtle text-muted'
            }`}
            title={hasUser ? 'User Flag Captured (Initial Foothold)' : 'User Flag Pending (Foothold required)'}
            aria-label={hasUser ? `User flag captured for ${m.name}` : `User flag pending for ${m.name}`}
          >
            <Flag className="w-2.5 h-2.5" /> U
          </span>
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs border text-[10px] font-bold font-mono transition-colors tabular-nums ${
              hasRoot
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-surface-sunken border-subtle text-muted'
            }`}
            title={hasRoot ? 'Root / System Flag Captured (PrivEsc complete)' : 'Root Flag Pending (Privilege escalation required)'}
            aria-label={hasRoot ? `Root flag captured for ${m.name}` : `Root flag pending for ${m.name}`}
          >
            <Flag className="w-2.5 h-2.5" /> R
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-muted">
          <ShareLinkButton
            path={`/target/${m.id}`}
            title={m.name}
            iconOnly
            className="p-1 rounded-xs bg-surface-card hover:bg-surface-hover border border-subtle text-muted hover:text-accent transition-all active:scale-[0.97] cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReport(m.id);
            }}
            className="p-1 rounded-xs bg-surface-card hover:bg-surface-hover border border-subtle text-muted hover:text-accent transition-all active:scale-[0.97] cursor-pointer"
            title="Open Pentest Pre-Report"
            aria-label={`Open pentest pre-report for ${m.name}`}
          >
            <FileText className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted">
            <Clock className="w-3 h-3 text-muted" />
            <span className="tabular-nums">{formatDurationHuman(m.timeSpentSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Certifications */}
      {m.certifications.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {m.certifications.map((cert) => (
            <span
              key={cert}
              className="text-[9px] px-1.5 py-0.5 rounded-[2px] bg-surface-sunken border border-subtle text-secondary font-mono tracking-wider uppercase font-semibold"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Quick Move Across Lanes Action Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-subtle opacity-60 group-hover:opacity-100 transition-opacity">
        {prevLane ? (
          <button
            onClick={(e) => onRetreat(e, m, prevLane)}
            className="flex items-center gap-0.5 text-[10px] text-muted hover:text-primary transition-all active:scale-[0.97] cursor-pointer font-medium font-mono"
            title={`Move back to ${prevLane}`}
            aria-label={`Move ${m.name} back to ${prevLane}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : <div />}

        {nextLane ? (
          <button
            onClick={(e) => onAdvance(e, m, nextLane)}
            className="flex items-center gap-0.5 text-[10px] text-accent hover:underline transition-all active:scale-[0.97] font-semibold ml-auto cursor-pointer font-mono"
            title={`Advance stage to ${nextLane}`}
            aria-label={`Advance ${m.name} to ${nextLane}`}
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


interface KanbanLaneProps {
  lane: LaneConfig;
  isMobileActive: boolean;
  laneMachines: Machine[];
  limit: number;
  setLaneLimits: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  displayedMachines: Machine[];
  activeTargetId: string | null;
  prevLane: PipelineStatus | undefined;
  nextLane: PipelineStatus | undefined;
  setSelectedMachineId: (id: string) => void;
  handleSetTarget: (e: React.MouseEvent, id: string) => void;
  handleAdvance: (e: React.MouseEvent, m: Machine, nextStatus: PipelineStatus) => void;
  handleRetreat: (e: React.MouseEvent, m: Machine, prevStatus: PipelineStatus) => void;
  setReportMachineId: (id: string) => void;
}

const KanbanLane = React.memo<KanbanLaneProps>(({
  lane, isMobileActive, laneMachines, limit, setLaneLimits, displayedMachines, activeTargetId, prevLane, nextLane, setSelectedMachineId, handleSetTarget, handleAdvance, handleRetreat, setReportMachineId
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
    data: { lane },
  });

  const handleLaneScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 400) {
      if (limit < laneMachines.length) {
        setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + 60) }));
      }
    }
  };

  const LaneIcon = lane.icon;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-colors duration-150 machined-edge overflow-hidden surface-card-depth ${
        isOver 
          ? 'border-accent bg-accent/[0.04] ring-1 ring-accent/40' 
          : 'border-subtle bg-surface-card/60'
      } backdrop-blur-sm ${
        isMobileActive ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
      } lg:h-[calc(100vh-270px)] lg:min-h-[480px]`}
    >
      {/* Milled Hardware Rail Header */}
      <div className="border-b border-subtle px-3 py-2 bg-surface-card/90 flex-shrink-0 flex items-center justify-between machined-edge font-sans">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-5 h-5 rounded-md flex items-center justify-center border text-xs flex-shrink-0 bg-surface-sunken border-subtle text-secondary"
          >
            <LaneIcon className="w-3 h-3" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wider text-primary truncate uppercase font-sans">
              {lane.title}
            </div>
            <div className="text-[10px] text-muted truncate font-sans">{lane.subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {laneMachines.length > limit && (
            <button
              onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
              className="text-[9px] px-1.5 py-0.5 rounded-xs bg-accent/10 text-accent border border-accent/30 font-bold hover:bg-accent/20 transition-colors active:scale-[0.97] cursor-pointer font-mono"
              title="Render all targets in this lane immediately"
            >
              All ({laneMachines.length})
            </button>
          )}
          {/* Tabular hardware brackets: [ 866 ], [ 0 ], [ 57 ] */}
          <span className="font-mono text-[11px] font-bold tracking-wider text-muted tabular-nums select-none">
            [ {laneMachines.length} ]
          </span>
        </div>
      </div>

      <div 
        onScroll={handleLaneScroll}
        className="flex-1 p-2 space-y-2 md:overflow-y-auto scroll-smooth"
      >
        {displayedMachines.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...TACTICAL_SPRING,
              delay: CASCADE_STAGGER_DELAY(idx),
            }}
          >
            <KanbanCard
              machine={m}
              isActiveTarget={activeTargetId === m.id}
              prevLane={prevLane}
              nextLane={nextLane}
              onSelect={setSelectedMachineId}
              onSetTarget={handleSetTarget}
              onAdvance={handleAdvance}
              onRetreat={handleRetreat}
              onOpenReport={setReportMachineId}
            />
          </motion.div>
        ))}

        {laneMachines.length > displayedMachines.length && (
          <div className="pt-2 pb-1 px-2 flex flex-col items-center gap-2 border-t border-subtle bg-surface-sunken/60 rounded-lg machined-edge">
            <div className="text-[10px] text-muted font-mono">
              Showing <span className="text-primary font-bold tabular-nums">{displayedMachines.length}</span> of <span className="text-accent font-bold tabular-nums">{laneMachines.length}</span> targets
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + 60) }))}
                className="flex-1 py-1.5 px-2 rounded-xs bg-surface-card hover:bg-surface-hover border border-subtle hover:border-accent text-accent text-[11px] font-bold font-mono transition-colors flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Load +60 More
              </button>
              {laneMachines.length > limit + 60 && (
                <button
                  onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + 180) }))}
                  className="py-1.5 px-3 rounded-xs bg-surface-card hover:bg-surface-hover border border-subtle text-secondary text-[10px] font-mono transition-colors font-semibold active:scale-[0.97] cursor-pointer"
                  title="Expand by larger batch (up to +180) with DOM protection"
                >
                  Load +180
                </button>
              )}
            </div>
          </div>
        )}

        {laneMachines.length === 0 && (
          <div className="group flex flex-col items-center justify-center p-6 text-center border border-dashed border-subtle rounded-lg min-h-[160px] bg-surface-sunken/40 transition-colors duration-200 machined-edge">
            <div className="relative mb-2.5">
              <div 
                className="w-9 h-9 rounded-md flex items-center justify-center border border-subtle bg-surface-card text-muted shadow-xs"
              >
                <LaneIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xs font-bold uppercase font-mono tracking-wider text-secondary transition-colors">
              [ {lane.emptyTitle} ]
            </div>
            <div className="text-[10px] text-muted font-mono mt-1 max-w-[210px] leading-relaxed">
              {lane.emptySubtitle}
            </div>
            <div className="text-[9px] font-mono text-muted mt-1.5 px-2 py-0.5 rounded-xs bg-surface-sunken border border-subtle">
              {lane.emptyHint}
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [mobileActiveLane, setMobileActiveLane] = React.useState<PipelineStatus>('backlog');

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

  // If the active mobile lane is hidden by empty-lanes filter, fallback to first visible lane
  React.useEffect(() => {
    if (hideEmptyLanes && !visibleLanes.some((l) => l.id === mobileActiveLane)) {
      if (visibleLanes[0]) {
        setMobileActiveLane(visibleLanes[0].id);
      }
    }
  }, [hideEmptyLanes, visibleLanes, mobileActiveLane]);

  const gridColsClass = React.useMemo(() => {
    const count = visibleLanes.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 lg:grid-cols-2';
    if (count === 3) return 'grid-cols-1 lg:grid-cols-3';
    if (count === 4) return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4';
    return 'grid-cols-1 lg:grid-cols-3 xl:grid-cols-5';
  }, [visibleLanes.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const [activeDragMachine, setActiveDragMachine] = React.useState<Machine | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragMachine(e.active.data.current?.machine || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragMachine(null);
    const { active, over } = e;
    if (!over) return;

    const machine = active.data.current?.machine as Machine;
    const newStatus = over.id as PipelineStatus;

    if (machine && newStatus && machine.status !== newStatus) {
      if (soundEnabled) playCyberSound('flag');
      updateMachineStatus(machine.id, newStatus);
      if (newStatus === 'root' || newStatus === 'completed') {
        triggerRootCelebration();
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="w-full font-mono pb-8">
      {/* 1. MOBILE RESPONSIVE STICKY LANE TABS (< lg) - Eliminates Nested Scroll Trap & Pinching */}
      <div className="lg:hidden sticky top-0 z-20 bg-zinc-50/95 dark:bg-zinc-950/95 py-1.5 mb-2 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {visibleLanes.map((lane) => {
            const laneCount = filteredMachines.filter((m) => m.status === lane.id).length;
            const isSelected = mobileActiveLane === lane.id;
            return (
              <button
                key={lane.id}
                onClick={() => {
                  setMobileActiveLane(lane.id);
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1.5 rounded-[3px] text-xs font-mono font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-none active:scale-[0.97] machined-edge cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 border border-[#0ea5e9] text-[#0ea5e9] dark:bg-zinc-900 dark:border-[#0ea5e9] dark:text-[#0ea5e9]'
                    : 'bg-white dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <span>{lane.title}</span>
                <span className="font-mono text-[10px] font-bold tabular-nums">
                  [ {laneCount} ]
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RESPONSIVE GRID LAYOUT: Single un-trapped container on mobile, multi-column lane grid on desktop */}
      <div className={`grid ${gridColsClass} gap-3.5 items-start transition-colors`}>
        {visibleLanes.map((lane) => {
          const laneMachines = filteredMachines.filter((m) => m.status === lane.id);
          const limit = laneLimits[lane.id] ?? 60;
          const isMobileActive = mobileActiveLane === lane.id;

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

          const fullLaneIdx = LANES.findIndex((l) => l.id === lane.id);
          const prevLane = fullLaneIdx > 0 ? LANES[fullLaneIdx - 1].id : undefined;
          const nextLane = fullLaneIdx < LANES.length - 1 ? LANES[fullLaneIdx + 1].id : undefined;

          return (
            <KanbanLane
              key={lane.id}
              lane={lane}
              isMobileActive={isMobileActive}
              laneMachines={laneMachines}
              limit={limit}
              setLaneLimits={setLaneLimits}
              displayedMachines={displayedMachines}
              activeTargetId={activeTargetId}
              prevLane={prevLane}
              nextLane={nextLane}
              setSelectedMachineId={setSelectedMachineId}
              handleSetTarget={handleSetTarget}
              handleAdvance={handleAdvance}
              handleRetreat={handleRetreat}
              setReportMachineId={setReportMachineId}
            />
          );
        })}
      </div>
      </div>
      <DragOverlay>
        {activeDragMachine ? (
          <div aria-hidden="true" className="rotate-2 scale-105 rounded-lg surface-elevated-depth shadow-2xl ring-1 ring-accent/30 opacity-90 cursor-grabbing pointer-events-none">
            <KanbanCard
              machine={activeDragMachine}
              isActiveTarget={activeTargetId === activeDragMachine.id}
              onSelect={() => {}}
              onSetTarget={() => {}}
              onAdvance={() => {}}
              onRetreat={() => {}}
              onOpenReport={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};