import React from 'react';
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
  Award,
  Plus,
  Lock
} from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { formatDurationHuman, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
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
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyLine: string;
}

const LANES: LaneConfig[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    subtitle: 'Queued and scoped labs',
    dotClass: 'bg-surface-hover border border-strong',
    icon: Layers,
    emptyLine: 'No queued machines.',
  },
  {
    id: 'recon',
    title: 'Active recon',
    subtitle: 'Port and web enumeration',
    dotClass: 'bg-accent',
    icon: Radio,
    emptyLine: 'Drag a target here to start recon.',
  },
  {
    id: 'foothold',
    title: 'Foothold',
    subtitle: 'User shell and initial access',
    dotClass: 'bg-callout-warn-fg',
    icon: Key,
    emptyLine: 'Drag a target here once you have a user shell.',
  },
  {
    id: 'root',
    title: 'System pwned',
    subtitle: 'Root flag captured',
    dotClass: 'bg-callout-success-fg',
    icon: Zap,
    emptyLine: 'Drag a target here after capturing root.',
  },
  {
    id: 'completed',
    title: 'Completed',
    subtitle: 'Writeup archived and retired',
    dotClass: 'bg-callout-tip-fg',
    icon: Award,
    emptyLine: 'Move finished machines here to log writeups.',
  },
];

/** Cards rendered per lane initially, and added per scroll / "Load more" step (keeps the DOM small). */
const LANE_PAGE_SIZE = 24;

const LANE_DOT_BY_STATUS: Record<string, string> = Object.fromEntries(LANES.map((l) => [l.id, l.dotClass]));

/** Hover/focus reveal for secondary actions; always visible on touch. Opacity only, so keyboard focus still works. */
const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150';

const ICON_BTN =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

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

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: m.id,
    data: { machine: m },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  const flagChip = (captured: boolean, tone: 'warn' | 'success') =>
    `inline-flex h-5 items-center gap-1 rounded px-1.5 font-mono text-xs font-medium tabular-nums transition-colors ${
      captured
        ? tone === 'warn'
          ? 'bg-callout-warn-bg text-callout-warn-fg'
          : 'bg-callout-success-bg text-callout-success-fg'
        : 'bg-surface-sunken text-muted'
    }`;

  const metaBadges: React.ReactNode[] = [
    <OsBadge key="os" os={m.os} size="xs" />,
    <DifficultyBadge key="diff" difficulty={m.difficulty} size="xs" />,
    ...(m.certifications || []).map((cert) => (
      <span
        key={cert}
        className="inline-flex h-5 items-center rounded border border-subtle bg-surface-sunken px-1.5 text-xs font-medium text-secondary"
      >
        {cert}
      </span>
    )),
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      data-testid="kanban-card"
      onClick={() => onSelect(m.id)}
      className={`group cyber-kanban-contain relative cursor-pointer rounded-lg border p-3 transition-interactive duration-150 surface-card-depth machined-edge active:scale-[0.97] ${
        isActiveTarget
          ? 'border-accent bg-accent-muted ring-1 ring-accent/40'
          : 'border-subtle bg-surface-card hover:border-strong hover:bg-surface-hover'
      }`}
    >
      {/* Row 1: status dot, name, stage and engage controls */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${LANE_DOT_BY_STATUS[m.status] ?? LANE_DOT_BY_STATUS.backlog}`}
        />
        {/* Primary keyboard/drag activator: the card wrapper stays non-interactive so
            sibling controls are not nested inside a role="button" element. */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          className="block min-w-0 flex-1 cursor-pointer truncate rounded-xs border-0 bg-transparent p-0 text-left font-sans text-sm font-semibold leading-snug text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {m.name}
        </button>

        <div className={`flex shrink-0 items-center gap-0.5 ${REVEAL}`}>
          {prevLane && (
            <button
              type="button"
              onClick={(e) => onRetreat(e, m, prevLane)}
              className={ICON_BTN}
              title={`Move back to ${prevLane}`}
              aria-label={`Move ${m.name} back to ${prevLane}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {nextLane && (
            <button
              type="button"
              onClick={(e) => onAdvance(e, m, nextLane)}
              className={`${ICON_BTN} hover:text-accent`}
              title={`Advance stage to ${nextLane}`}
              aria-label={`Advance ${m.name} to ${nextLane}`}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => onSetTarget(e, m.id)}
          className={`${ICON_BTN} ${isActiveTarget ? 'text-accent' : REVEAL}`}
          title={isActiveTarget ? 'Currently engaged target' : 'Engage target and start timer'}
          aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>

      {/* Row 2: IP (telemetry) and time spent */}
      {m.isActive ? (
        <div className="mt-1.5 pl-4 text-[11px] text-muted font-mono flex items-center justify-between">
          <span className="flex items-center gap-1 text-callout-warn-fg">
            <Lock className="h-3 w-3 text-callout-warn-fg" /> HTB ToS Protected
          </span>
          <div className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted">
            <Clock className="h-3 w-3" />
            <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-1 flex items-center justify-between gap-2 pl-4">
            <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="font-mono text-xs tabular-nums" />
            <div className={`flex items-center gap-1 font-mono text-xs tabular-nums text-muted ${REVEAL}`}>
              <Clock className="h-3 w-3" />
              <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
            </div>
          </div>

          {/* Row 3: max two badges (+N), flags and utility actions on hover */}
          <div className="mt-2 flex items-center justify-between gap-2 pl-4">
            <BadgeOverflow badges={metaBadges} max={2} />
            <div className={`flex shrink-0 items-center gap-1 ${REVEAL}`}>
              <span
                className={flagChip(hasUser, 'warn')}
                title={hasUser ? 'User flag captured (initial foothold)' : 'User flag pending (foothold required)'}
                aria-label={hasUser ? `User flag captured for ${m.name}` : `User flag pending for ${m.name}`}
              >
                <Flag className="h-2.5 w-2.5" /> U
              </span>
              <span
                className={flagChip(hasRoot, 'success')}
                title={hasRoot ? 'Root flag captured (privesc complete)' : 'Root flag pending (privilege escalation required)'}
                aria-label={hasRoot ? `Root flag captured for ${m.name}` : `Root flag pending for ${m.name}`}
              >
                <Flag className="h-2.5 w-2.5" /> R
              </span>
              <ShareLinkButton
                path={`/target/${m.id}`}
                title={m.name}
                iconOnly
                className={`${ICON_BTN} hover:text-accent`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport(m.id);
                }}
                className={`${ICON_BTN} hover:text-accent`}
                title="Open pentest pre-report"
                aria-label={`Open pentest pre-report for ${m.name}`}
              >
                <FileText className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
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
        setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + LANE_PAGE_SIZE) }));
      }
    }
  };

  const LaneIcon = lane.icon;
  const setNewMachineModalOpen = useCtfStore((st) => st.setNewMachineModalOpen);

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
      {/* Lane header: sentence-case title, mono count */}
      <div className="border-b border-subtle px-3 py-2.5 bg-surface-card/90 flex-shrink-0 flex items-center justify-between font-sans">
        <div className="flex items-center gap-2 min-w-0">
          <LaneIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-primary truncate font-sans">
              {lane.title}
            </div>
            <div className="text-xs text-muted truncate font-sans">{lane.subtitle}</div>
            {laneMachines.length > limit && (
                <button
                  onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                  className="mt-1 text-xs px-1.5 py-0.5 rounded bg-accent-muted text-accent border border-accent/30 font-medium hover:bg-accent/20 transition-colors active:scale-[0.97] cursor-pointer font-sans whitespace-nowrap"
                  title="Render all targets in this lane immediately"
                >
                  Show all
                </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-mono text-xs font-medium text-muted tabular-nums select-none">
            {laneMachines.length}
          </span>
        </div>
      </div>

      <div 
        onScroll={handleLaneScroll}
        className="flex-1 p-2 space-y-2 md:overflow-y-auto scroll-smooth"
      >
        {displayedMachines.map((m, idx) => (
          <div
            key={m.id}
            className="card-enter"
            style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
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
          </div>
        ))}

        {laneMachines.length > displayedMachines.length && (
          <div className="pt-2 pb-1 px-2 flex flex-col items-center gap-2 border-t border-subtle bg-surface-sunken/60 rounded-lg machined-edge">
            <div className="text-xs text-muted font-sans">
              Showing <span className="font-mono text-primary font-medium tabular-nums">{displayedMachines.length}</span> of <span className="font-mono text-primary font-medium tabular-nums">{laneMachines.length}</span> targets
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: Math.min(laneMachines.length, limit + LANE_PAGE_SIZE) }))}
                className="flex-1 py-1.5 px-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle hover:border-accent text-accent text-xs font-medium transition-colors flex items-center justify-center gap-1 active:scale-[0.97] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Load +{LANE_PAGE_SIZE} More
              </button>
              {laneMachines.length > limit + LANE_PAGE_SIZE && (
                <button
                  onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                  className="py-1.5 px-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-secondary text-xs transition-colors font-medium active:scale-[0.97] cursor-pointer"
                  title="Render all remaining targets in this lane"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
        )}

        {laneMachines.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2.5 p-6 text-center border border-dashed border-subtle rounded-lg min-h-[120px]">
            <p className="text-sm text-muted font-sans max-w-[210px] leading-snug">
              {lane.emptyLine}
            </p>
            {lane.id === 'backlog' && (
              <button
                type="button"
                onClick={() => setNewMachineModalOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-subtle bg-surface-card px-3 text-xs font-medium text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11"
              >
                <Plus className="h-3.5 w-3.5" />
                Add machine
              </button>
            )}
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

  // One memo for every lane: stable per-lane arrays (full lane + displayed slice) so React.memo(KanbanLane) holds
  // across unrelated parent re-renders. The engaged target is pinned into the displayed slice.
  const laneData = React.useMemo(() => {
    const byLane = new Map<PipelineStatus, { laneMachines: Machine[]; displayedMachines: Machine[] }>();
    for (const lane of LANES) {
      byLane.set(lane.id, { laneMachines: [], displayedMachines: [] });
    }
    for (const m of filteredMachines) {
      byLane.get(m.status)?.laneMachines.push(m);
    }
    for (const lane of LANES) {
      const entry = byLane.get(lane.id)!;
      const all = entry.laneMachines;
      const limit = laneLimits[lane.id] ?? LANE_PAGE_SIZE;
      if (all.length <= limit) {
        entry.displayedMachines = all;
        continue;
      }
      let slice = all.slice(0, limit);
      if (activeTargetId && !slice.some((m) => m.id === activeTargetId)) {
        const activeM = all.find((m) => m.id === activeTargetId);
        if (activeM) {
          slice = [activeM, ...slice.slice(0, limit - 1)];
        }
      }
      entry.displayedMachines = slice;
    }
    return byLane;
  }, [filteredMachines, laneLimits, activeTargetId]);

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
      <div className="w-full pb-8">
      {/* 1. MOBILE RESPONSIVE STICKY LANE TABS (< lg) - Eliminates Nested Scroll Trap & Pinching */}
      <div className="lg:hidden sticky top-0 z-20 bg-surface-sunken/95 py-1.5 mb-2 backdrop-blur-md border-b border-subtle">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {visibleLanes.map((lane) => {
            const laneCount = laneData.get(lane.id)?.laneMachines.length ?? 0;
            const isSelected = mobileActiveLane === lane.id;
            return (
              <button
                key={lane.id}
                onClick={() => {
                  setMobileActiveLane(lane.id);
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors active:scale-[0.97] cursor-pointer ${
                  isSelected
                    ? 'bg-surface-card border border-accent text-accent'
                    : 'bg-surface-card text-tertiary border border-subtle'
                }`}
              >
                <span>{lane.title}</span>
                <span className="font-mono text-xs tabular-nums">
                  {laneCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RESPONSIVE GRID LAYOUT: Single un-trapped container on mobile, multi-column lane grid on desktop */}
      <div className={`grid ${gridColsClass} gap-3.5 items-start transition-colors`}>
        {visibleLanes.map((lane) => {
          const { laneMachines, displayedMachines } = laneData.get(lane.id)!;
          const limit = laneLimits[lane.id] ?? LANE_PAGE_SIZE;
          const isMobileActive = mobileActiveLane === lane.id;

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