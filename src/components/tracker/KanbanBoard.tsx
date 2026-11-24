import React from 'react';
import { useEngageTarget } from '../../hooks/useEngageTarget';
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
import { entersRootStage, STAGE_LABEL } from '../../utils/pipeline';
import { useShallow } from 'zustand/react/shallow';
import { formatDurationHuman, playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { CardIpBadge } from './CardIpBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { ShareLinkButton } from '../common/ShareLinkButton';
import { TargetTypeBadge } from '../common/TargetTypeBadge';
import { EmptyState } from '../common/EmptyState';
import { useMediaQuery, matchesQuery, LG_QUERY, PHONE_QUERY } from '../../hooks/useMediaQuery';
import { GridView } from './GridView';
import { machineChips } from './machineChips';
import { ScrollFade } from '../common/ScrollFade';

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
    title: STAGE_LABEL.backlog,
    subtitle: 'Queued and scoped labs',
    dotClass: 'bg-surface-hover border border-strong',
    icon: Layers,
    emptyLine: 'No queued machines.',
  },
  {
    id: 'recon',
    title: STAGE_LABEL.recon,
    subtitle: 'Port and web enumeration',
    dotClass: 'bg-accent',
    icon: Radio,
    emptyLine: 'Drag a target here to start recon.',
  },
  {
    id: 'foothold',
    title: STAGE_LABEL.foothold,
    subtitle: 'User shell and initial access',
    dotClass: 'bg-callout-warn-fg',
    icon: Key,
    emptyLine: 'Drag a target here once you have a user shell.',
  },
  {
    id: 'root',
    title: STAGE_LABEL.root,
    subtitle: 'Root flag captured',
    dotClass: 'bg-callout-success-fg',
    icon: Zap,
    emptyLine: 'Drag a target here after capturing root.',
  },
  {
    id: 'completed',
    title: STAGE_LABEL.completed,
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
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 touch:opacity-100 transition-opacity duration-150';

const ICON_BTN =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8 tap-target-sm';

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
    opacity: isDragging ? 0.5 : undefined,
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

  const { badges: metaBadges, labels: chipLabels } = machineChips(m, {
    order: ['platform', 'os', 'difficulty'],
    extras: m.certifications || [],
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      data-testid="kanban-card"
      role="presentation"
      onClick={() => onSelect(m.id)}
      className={`group cyber-kanban-contain relative cursor-pointer rounded-lg border p-3 transition-interactive duration-150 surface-card-depth machined-edge active:scale-[0.97] active:cursor-grabbing ${
        isDragging
          ? 'border-dashed border-accent/60 bg-surface-sunken'
          : isActiveTarget
          ? 'border-accent bg-accent-muted ring-1 ring-accent/40'
          : 'border-subtle bg-surface-card hover:border-strong hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:transform-none'
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
          className={`line-clamp-2 min-h-6 min-w-0 flex-1 cursor-pointer break-words rounded-xs ${isActiveTarget ? 'lg:pr-6' : ''} border-0 bg-transparent p-0 text-left font-sans text-sm font-semibold leading-snug text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
        >
          {m.name}
        </button>
        <TargetTypeBadge machine={m} />

        {/* From lg the stage and engage controls float over the card corner so they never squeeze the name. */}
        <div className="flex shrink-0 items-center gap-0.5 lg:absolute lg:right-1.5 lg:top-2 lg:rounded-md lg:group-hover:bg-surface-card lg:group-focus-within:bg-surface-card">
        <div className={`flex shrink-0 items-center gap-0.5 [@media(pointer:coarse)]:gap-3 ${REVEAL}`}>
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
      </div>

      {/* Row 2: IP (telemetry) and time spent */}
      {m.isActive ? (
        <div className="mt-1.5 pl-4 text-xs text-muted font-mono flex items-center justify-between">
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
            <CardIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="font-mono text-xs tabular-nums" />
            <div className={`flex items-center gap-1 font-mono text-xs tabular-nums text-muted ${REVEAL}`}>
              <Clock className="h-3 w-3" />
              <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
            </div>
          </div>

          {/* Row 3: platform/OS/difficulty badges (+N) (+N), flags and utility actions on hover */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-4">
            <BadgeOverflow
              badges={metaBadges}
              labels={chipLabels}
              max={3}
              className="flex-wrap"
            />
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
  /** Read once in KanbanBoard (one media-query listener for the board, not one per lane). */
  isPhone: boolean;
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
  lane, isPhone, isMobileActive, laneMachines, limit, setLaneLimits, displayedMachines, activeTargetId, prevLane, nextLane, setSelectedMachineId, handleSetTarget, handleAdvance, handleRetreat, setReportMachineId
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
          ? 'border-accent bg-accent/[0.10] ring-2 ring-accent/50' 
          : 'border-subtle bg-surface-card/60'
      } backdrop-blur-sm ${
        isMobileActive ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
      } lg:h-[var(--kanban-h,calc(100vh-270px))] lg:min-h-[480px] lg:snap-start ${
        laneMachines.length === 0 ? 'lg:w-40 lg:shrink-0' : 'lg:w-60 lg:min-w-[10.5rem] lg:max-w-[30rem] lg:flex-1'
      }`}
    >
      {/* Lane header: sentence-case title, mono count */}
      <div className={`border-b px-3 py-2.5 flex-shrink-0 flex items-center justify-between gap-3 font-sans transition-colors duration-150 ${isOver ? 'border-accent/60 bg-accent/15' : 'border-subtle bg-surface-card/90'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <LaneIcon className="w-3.5 h-3.5 shrink-0 text-muted" />
          <div className="min-w-0">
            <h2 className="text-[13px] xl:text-sm font-semibold text-primary font-sans whitespace-nowrap truncate">
              {lane.title}
            </h2>
            <div className={`text-xs text-muted truncate font-sans ${laneMachines.length === 0 ? 'lg:hidden' : 'lg:hidden xl:block'}`} title={lane.subtitle}>{lane.subtitle}</div>
            {laneMachines.length > limit && (
                <button
                  onClick={() => setLaneLimits(prev => ({ ...prev, [lane.id]: laneMachines.length }))}
                  className="mt-1 min-h-6 text-xs px-2 py-1 rounded bg-accent-muted text-accent border border-accent/30 font-medium hover:bg-accent/20 transition-colors active:scale-[0.97] cursor-pointer font-sans whitespace-nowrap"
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
        {isPhone ? (
          // Phones: the same compact row the Cards layout uses (6+ targets per screen); stage moves go through the flags.
          // Only the open lane is mounted; the others are display:none on a phone, so their cards would be dead DOM.
          isMobileActive ? <GridView filteredMachines={displayedMachines} /> : null
        ) : (
          displayedMachines.map((m, idx) => (
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
          ))
        )}

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
          <EmptyState
            compact
            title={lane.emptyLine}
            className="min-h-[120px] rounded-lg border border-dashed border-subtle"
            action={lane.id === 'backlog' ? { label: 'Add machine', icon: Plus, onClick: () => setNewMachineModalOpen(true) } : undefined}
          />
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
    soundEnabled,
    setReportMachineId,
    hideEmptyLanes,
  } = useCtfStore(
    useShallow((s) => ({
      setSelectedMachineId: s.setSelectedMachineId,
      updateMachineStatus: s.updateMachineStatus,
      activeTargetId: s.activeTargetId,
      soundEnabled: s.soundEnabled,
      setReportMachineId: s.setReportMachineId,
      hideEmptyLanes: s.filters.hideEmptyLanes,
    }))
  );

  const isPhone = useMediaQuery(PHONE_QUERY);
  const [laneLimits, setLaneLimits] = React.useState<Record<string, number>>({});
  const [mobileActiveLane, setMobileActiveLane] = React.useState<PipelineStatus>('backlog');

  // Fill the main scroll area: lane height = visible main height - board offset - 20px gap.
  // The wrapper's lg:-mb-7 cancels most of main's 48px bottom padding so no page-level scrollbar appears.
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [laneHeight, setLaneHeight] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const grid = gridRef.current;
    const main = grid?.closest('main') as HTMLElement | null;
    if (!grid || !main) return;
    const measure = () => {
      if (!matchesQuery(LG_QUERY)) {
        setLaneHeight((prev) => (prev === null ? prev : null));
        return;
      }
      const mainRect = main.getBoundingClientRect();
      const scale = main.offsetHeight > 0 ? mainRect.height / main.offsetHeight : 1;
      const top = (grid.getBoundingClientRect().top - mainRect.top) / (scale || 1) + main.scrollTop;
      const next = Math.max(480, Math.floor(main.clientHeight - top - 20));
      setLaneHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    let el: HTMLElement | null = grid.parentElement;
    ro.observe(main);
    while (el && el !== main) {
      ro.observe(el);
      el = el.parentElement;
    }
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [filteredMachines.length]);

  const handleAdvance = React.useCallback((e: React.MouseEvent, m: Machine, nextStatus: PipelineStatus) => {
    e.stopPropagation();
    updateMachineStatus(m.id, nextStatus);
    if (nextStatus === 'root' || nextStatus === 'completed') {
      if (entersRootStage(m.status, nextStatus)) triggerRootCelebration();
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

  const engage = useEngageTarget();
  const handleSetTarget = React.useCallback((e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    engage(machineId);
  }, [engage]);

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
      if (entersRootStage(machine.status, newStatus)) {
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
      <div style={laneHeight ? ({ '--kanban-h': `${laneHeight}px` } as React.CSSProperties) : undefined} className="w-full pb-8 lg:pb-0 lg:h-[calc(var(--kanban-h,calc(100vh-270px))-28px)] lg:min-h-[452px]">
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
      <ScrollFade
        ref={gridRef}
        unstyled
        fade="end"
        fadeSize="56px"
        role="region"
        aria-label="Kanban lanes, scroll horizontally"
        className="grid grid-cols-1 gap-3.5 lg:gap-2.5 items-start transition-colors lg:flex lg:overflow-x-auto lg:snap-x lg:snap-mandatory lg:pb-3 lg:scroll-pl-0 rounded-xl"
      >
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
              isPhone={isPhone}
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
      </ScrollFade>
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