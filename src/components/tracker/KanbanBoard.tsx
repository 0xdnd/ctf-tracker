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
}

const LANES: LaneConfig[] = [
  {
    id: 'backlog',
    title: 'TARGET BACKLOG',
    subtitle: 'Queued & Scoped Labs',
    accentColor: '#71717A',
    badgeClass: 'text-slate-600 dark:text-cyber-muted bg-slate-100 dark:bg-cyber-card border-slate-200 dark:border-cyber-border',
    borderClass: 'border-slate-200 dark:border-cyber-border',
  },
  {
    id: 'recon',
    title: 'ACTIVE RECON',
    subtitle: 'Port & Web Enumeration',
    accentColor: '#06B6D4',
    badgeClass: 'text-cyan-700 dark:text-cyber-cyan bg-cyan-50 dark:bg-cyber-cyan/10 border-cyan-200 dark:border-cyber-cyan/30',
    borderClass: 'border-slate-200 dark:border-cyber-border hover:border-cyan-500/30 dark:hover:border-cyber-cyan/30',
  },
  {
    id: 'foothold',
    title: 'FOOTHOLD OBTAINED',
    subtitle: 'User Shell / Initial Access',
    accentColor: '#F59E0B',
    badgeClass: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    borderClass: 'border-slate-200 dark:border-cyber-border hover:border-amber-500/30',
  },
  {
    id: 'root',
    title: 'SYSTEM PWNED',
    subtitle: 'Root / System Flag Captured',
    accentColor: '#10B981',
    badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    borderClass: 'border-slate-200 dark:border-cyber-border hover:border-emerald-500/30',
  },
  {
    id: 'completed',
    title: 'COMPLETED & LOGGED',
    subtitle: 'Writeup Archived & Retired',
    accentColor: '#71717A',
    badgeClass: 'text-slate-600 dark:text-cyber-muted bg-slate-100 dark:bg-cyber-card border-slate-200 dark:border-cyber-border',
    borderClass: 'border-slate-200 dark:border-cyber-border',
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
    opacity: isDragging ? 0.4 : undefined,
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
      className={`group cyber-kanban-contain relative p-4 rounded-xl border transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-0.5 cursor-pointer shadow-sm hover:will-change-transform ${
        isActiveTarget
          ? 'bg-white dark:bg-cyber-card border-emerald-600 dark:border-cyber-emerald shadow-md shadow-emerald-500/15 dark:shadow-glow-emerald/30 ring-1 ring-emerald-500/40 dark:ring-cyber-emerald/40'
          : 'bg-white dark:bg-cyber-card/90 border-slate-200 dark:border-cyber-border hover:border-slate-300 dark:hover:border-cyber-borderGlow hover:bg-slate-50/80 dark:hover:bg-cyber-cardHover'
      }`}
    >
      {/* Top Badges */}
      <div className="flex flex-col gap-1.5 mb-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between gap-2 [&_span]:!border-transparent">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PlatformBadge platform={m.platform} size="sm" className="shrink-0 !border-transparent" />
            <OsBadge os={m.os} size="sm" className="!border-transparent" />
          </div>
          <DifficultyBadge difficulty={m.difficulty} size="sm" className="!border-transparent shrink-0" />
        </div>
        <div className="flex items-center [&_span]:!border-transparent">
          <CategoryBadge machine={m} size="xs" className="!border-transparent" />
        </div>
      </div>

      {/* Machine Name & IP */}
      <div className="flex items-start justify-between gap-1.5">
        <div>
          <div className="font-bold text-base transition-colors leading-snug text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan">
            {m.name}
          </div>
          <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="mt-1 !bg-slate-100 dark:!bg-gray-900/50 !border-transparent shadow-inner" />
        </div>

        {/* Active Target Engage Button */}
        <button
          onClick={(e) => onSetTarget(e, m.id)}
          className={`p-1.5 rounded-lg transition-[transform,colors] duration-150 hover:scale-110 active:scale-95 ${
            isActiveTarget
              ? 'text-emerald-700 dark:text-cyber-emerald bg-emerald-50 dark:bg-cyber-emerald/15 border border-emerald-300 dark:border-cyber-emerald/40 shadow-sm'
              : 'text-slate-400 dark:text-cyber-muted hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-cyber-bg/80 hover:bg-slate-200 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border'
          }`}
          title={isActiveTarget ? 'Currently Engaged' : 'Engage Target & Start Timer'}
        >
          <Crosshair className={`w-4 h-4 ${isActiveTarget ? 'animate-spin-slow' : ''}`} />
        </button>
      </div>

      {/* Flags & Time Spent Pill */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-cyber-border/60 text-xs opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
              hasUser
                ? 'bg-cyan-50 dark:bg-cyber-cyan/10 border-cyan-200 dark:border-cyber-cyan/30 text-cyan-700 dark:text-cyber-cyan'
                : 'bg-slate-100 dark:bg-cyber-bg/60 border-slate-200 dark:border-cyber-border text-slate-400 dark:text-cyber-muted'
            }`}
            title={hasUser ? 'User Flag Captured' : 'User Flag Pending'}
          >
            <Flag className="w-3 h-3" /> U
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
              hasRoot
                ? 'bg-rose-50 dark:bg-cyber-crimson/10 border-rose-200 dark:border-cyber-crimson/30 text-rose-700 dark:text-cyber-crimson'
                : 'bg-slate-100 dark:bg-cyber-bg/60 border-slate-200 dark:border-cyber-border text-slate-400 dark:text-cyber-muted'
            }`}
            title={hasRoot ? 'Root Flag Captured' : 'Root Flag Pending'}
          >
            <Flag className="w-3 h-3" /> R
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-cyber-muted">
          <ShareLinkButton
            path={`/target/${m.id}`}
            title={m.name}
            iconOnly
            className="p-1 rounded bg-slate-100 dark:bg-cyber-bg/60 hover:bg-slate-200 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border text-slate-500 dark:text-cyber-muted hover:text-cyan-600 dark:hover:text-cyber-cyan transition-colors"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReport(m.id);
            }}
            className="p-1 rounded bg-slate-100 dark:bg-cyber-bg/60 hover:bg-slate-200 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border text-slate-500 dark:text-cyber-muted hover:text-purple-600 dark:hover:text-cyber-purple transition-colors"
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
        <div className="flex items-center gap-1 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
          {m.certifications.map((cert) => (
            <span
              key={cert}
              className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted font-semibold"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Quick Move Across Lanes Action Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-dashed border-slate-200 dark:border-cyber-border/60 opacity-50 group-hover:opacity-100 transition-opacity">
        {prevLane ? (
          <button
            onClick={(e) => onRetreat(e, m, prevLane)}
            className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-cyber-muted hover:text-slate-800 dark:hover:text-white hover:-translate-x-0.5 transition-all"
            title="Move back"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : <div />}

        {nextLane ? (
          <button
            onClick={(e) => onAdvance(e, m, nextLane)}
            className="flex items-center gap-0.5 text-[10px] text-cyan-600 dark:text-cyber-cyan hover:underline hover:translate-x-0.5 transition-all font-semibold ml-auto"
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

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-colors ${
        isOver 
          ? 'border-cyan-500 dark:border-cyber-cyan bg-cyan-50/50 dark:bg-cyber-cyan/10' 
          : 'border-slate-200 dark:border-cyber-border bg-white/80 dark:bg-cyber-card/60'
      } backdrop-blur-sm overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-cyber-borderGlow ${
        isMobileActive ? 'flex flex-col' : 'hidden md:flex md:flex-col'
      } md:h-[calc(100vh-270px)] md:min-h-[480px]`}
    >
      <div className={`border-b border-slate-200 dark:border-cyber-border/80 p-2.5 bg-slate-50/90 dark:bg-cyber-bg/80 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-slate-800 dark:text-cyber-text">
            {lane.title}
          </span>
          <div className="flex items-center gap-1.5">
            {laneMachines.length > limit && (
              <button
                onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyber-cyan/10 text-cyan-700 dark:text-cyber-cyan border border-cyan-200 dark:border-cyber-cyan/30 font-bold hover:bg-cyan-100 dark:hover:bg-cyber-cyan/20 transition-all"
                title="Render all targets in this lane immediately"
              >
                All ({laneMachines.length})
              </button>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${lane.badgeClass}`}>
              {laneMachines.length}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-cyber-muted mt-0.5">{lane.subtitle}</div>
      </div>

      <div 
        onScroll={handleLaneScroll}
        className="flex-1 p-2 space-y-2.5 md:overflow-y-auto scroll-smooth"
      >
        {displayedMachines.map((m) => (
          <KanbanCard
            key={m.id}
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
        ))}

        {laneMachines.length > displayedMachines.length && (
          <div className="pt-2.5 pb-1.5 px-2 flex flex-col items-center gap-2 border-t border-slate-200 dark:border-cyber-border/80 bg-slate-50 dark:bg-cyber-bg/60 rounded-xl">
            <div className="text-[10px] text-slate-500 dark:text-cyber-muted">
              Showing <span className="text-slate-900 dark:text-white font-bold">{displayedMachines.length}</span> of <span className="text-cyan-600 dark:text-cyber-cyan font-bold">{laneMachines.length}</span> targets
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + 60) }))}
                className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-cyber-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border hover:border-cyan-500/50 dark:hover:border-cyber-cyan text-cyan-600 dark:text-cyber-cyan text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Load +60 More
              </button>
              <button
                onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                className="py-1.5 px-3 rounded-lg bg-white dark:bg-cyber-card hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white text-[10px] transition-all font-semibold shadow-sm"
                title="Render all targets in this lane"
              >
                Scroll All ({laneMachines.length})
              </button>
            </div>
          </div>
        )}

        {laneMachines.length === 0 && (
          <div className="group flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-300 dark:border-cyber-border/60 hover:border-cyan-400 dark:hover:border-cyber-cyan/60 rounded-xl h-36 bg-slate-50/50 dark:bg-cyber-bg/30 opacity-80 hover:opacity-100 transition-all">
            <div className="relative mb-3 group-hover:scale-110 transition-transform">
              <div className="absolute inset-0 bg-cyan-400/20 dark:bg-cyber-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Crosshair className="w-8 h-8 text-slate-400 dark:text-cyber-muted/80 group-hover:text-cyan-500 dark:group-hover:text-cyber-cyan relative z-10 transition-colors" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider group-hover:text-cyan-600 dark:group-hover:text-cyber-cyan transition-colors">No targets in this lane</div>
            <div className="text-[10px] text-slate-500 dark:text-cyber-muted mt-1.5 max-w-[200px]">Advance a target to this stage to track progress</div>
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
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-3 xl:grid-cols-5';
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
      {/* 1. MOBILE RESPONSIVE STICKY LANE TABS (< md) - Eliminates Nested Scroll Trap */}
      <div className="md:hidden sticky top-0 z-20 bg-slate-50/95 dark:bg-cyber-bg/95 py-1.5 mb-2 backdrop-blur-md">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-sm ${
                  isSelected
                    ? 'bg-cyan-600 dark:bg-cyber-cyan text-white dark:text-black font-black'
                    : 'bg-white dark:bg-cyber-card text-slate-600 dark:text-cyber-muted border border-slate-200 dark:border-cyber-border'
                }`}
              >
                <span>{lane.title.replace('TARGET ', '')}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected 
                    ? 'bg-black/20 text-white dark:text-black' 
                    : 'bg-slate-100 dark:bg-cyber-bg text-slate-700 dark:text-cyber-muted'
                }`}>
                  {laneCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RESPONSIVE GRID LAYOUT: Single un-trapped container on mobile, multi-column lane grid on desktop */}
      <div className={`grid ${gridColsClass} gap-3.5 items-start transition-all`}>
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
          <div className="rotate-2 scale-105 shadow-2xl shadow-cyan-500/20 opacity-90 cursor-grabbing">
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