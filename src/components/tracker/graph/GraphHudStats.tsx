import React, { useState } from 'react';
import { ChevronDown, Minimize2, Share2 } from 'lucide-react';
import { SCOPED_CLUSTER_CAP, formatShowMoreLabel } from '../graphScopedVisibility';

interface GraphHudStatsProps {
  title?: string;
  visibleCount: number;
  universeCount: number;
  subnetCount: number;
  linkCount: number;
  showAllNodes: boolean;
  filterActive: boolean;
  /** "+N more" control state for machines beyond the scoped cap. */
  showMoreControl: boolean;
  hiddenCount: number;
  /** Name of the open subnet hub (collapsible hubs only). */
  expandedHubName?: string;
  /** Optional toggle on Tracker Graph to hide untouched catalog rows and focus on personal/engaged targets. */
  personalOnly?: boolean;
  personalCount?: number;
  onTogglePersonalOnly?: () => void;
  /** Optional extra controls rendered inside the HUD bar (e.g. "+ Add internal host" in Exam mode). */
  extraActions?: React.ReactNode;
  onToggleShowAll: () => void;
  onShowAll: () => void;
  onCollapseHub: () => void;
}

const CHIP = 'text-xs font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md bg-surface-sunken border border-subtle';

/**
 * Stats row of the top HUD. Wide canvases show the full chip bar; phones show a one-line summary pill
 * ("48 machines · 6 subnets") whose chips open on tap, so nothing wraps or clips at 375px.
 */
export const GraphHudStats: React.FC<GraphHudStatsProps> = ({
  title = 'Machine graph',
  visibleCount,
  universeCount,
  subnetCount,
  linkCount,
  showAllNodes,
  filterActive,
  showMoreControl,
  hiddenCount,
  expandedHubName,
  personalOnly = false,
  personalCount,
  onTogglePersonalOnly,
  extraActions,
  onToggleShowAll,
  onShowAll,
  onCollapseHub,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const chips = (
    <>
      <span
        className={`${CHIP} text-accent`}
        title={showAllNodes ? 'Every machine is placed in its subnet group' : `The first ${SCOPED_CLUSTER_CAP} machines are grouped by subnet; use Show all to see the rest`}
      >
        {visibleCount} of {universeCount} machines
      </span>
      {universeCount > SCOPED_CLUSTER_CAP && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className={`inline-flex min-h-6 items-center text-xs font-semibold font-mono px-2 py-0.5 rounded-md border transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
            showAllNodes
              ? 'bg-accent text-on-accent border-accent shadow-xs'
              : 'bg-surface-sunken text-accent border-subtle hover:border-accent/40'
          }`}
          title={showAllNodes ? `Back to the compact layout: first ${SCOPED_CLUSTER_CAP} grouped by subnet, the rest hidden` : 'Place every machine in its subnet group (larger canvas)'}
          aria-label={showAllNodes ? 'Compact layout' : 'Group all by subnet'}
        >
          {showAllNodes ? 'Compact layout' : 'Group all by subnet'}
        </button>
      )}
      <span
        className={`${CHIP} text-callout-tip-fg`}
        title={showAllNodes ? 'Subnet groups across every machine' : `Subnet groups among the first ${SCOPED_CLUSTER_CAP} machines`}
      >
        {plural(subnetCount, 'subnet', 'subnets')}
      </span>
      {!showAllNodes && showMoreControl && (
        <button
          type="button"
          data-testid="graph-grid-overflow"
          onClick={onShowAll}
          className="inline-flex min-h-6 items-center text-xs font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md border border-subtle bg-surface-sunken text-accent hover:border-accent/40 transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Only the first machines are drawn here. Show all places every machine in its subnet group."
        >
          {formatShowMoreLabel(hiddenCount, filterActive)}
        </button>
      )}
      <span className={`${CHIP} text-callout-success-fg`} title="Pivot links you drew between machines. Use the connect tool to add one; none yet means no attack paths are drawn.">
        {plural(linkCount, 'pivot link', 'pivot links')}
      </span>
      {onTogglePersonalOnly && (
        <button
          type="button"
          data-testid="graph-personal-only-btn"
          aria-pressed={personalOnly}
          onClick={onTogglePersonalOnly}
          className={`inline-flex min-h-6 items-center gap-1 text-xs font-semibold font-mono px-2 py-0.5 rounded-md border transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            personalOnly
              ? 'bg-accent text-on-accent border-accent shadow-xs'
              : 'bg-surface-sunken text-secondary border-subtle hover:border-accent/40 hover:text-primary'
          }`}
          title="Filter the graph to your custom, active, in-progress, and linked targets only"
        >
          <span>{personalOnly ? 'Personal only' : 'Personal / Engaged'}</span>
          {typeof personalCount === 'number' && (
            <span className="tabular-nums">({personalCount})</span>
          )}
        </button>
      )}
      {extraActions}
      {expandedHubName !== undefined && (
        <button
          type="button"
          data-testid="graph-hub-collapse"
          onClick={onCollapseHub}
          className="flex min-h-6 items-center gap-1 text-xs font-semibold font-mono px-2 py-0.5 rounded-md border border-accent/40 bg-accent/15 text-accent hover:bg-accent hover:text-on-accent transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer"
          title={expandedHubName ? `Collapse ${expandedHubName}` : 'Collapse the open subnet'}
        >
          <Minimize2 className="w-3 h-3" />
          Collapse
        </button>
      )}
    </>
  );

  return (
    <div data-graph-hud="stats" className="flex min-w-0 max-w-full flex-wrap items-center gap-2 pointer-events-auto">
      <div className="sm:hidden flex max-w-full flex-col items-start gap-1.5">
        <button
          type="button"
          data-testid="graph-hud-summary"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((o) => !o)}
          className="flex max-w-full items-center gap-2 rounded-xl border border-subtle bg-surface-elevated/95 px-3 py-2 text-xs font-semibold text-primary shadow-xs backdrop-blur-sm transition-transform active:scale-[0.97] machined-edge cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
          <span className="truncate font-mono tabular-nums">
            {`${plural(visibleCount, 'machine', 'machines')} · ${plural(subnetCount, 'subnet', 'subnets')}`}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-muted transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {detailsOpen && (
          <div
            data-testid="graph-hud-details"
            className="flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-subtle bg-surface-elevated/95 p-2 shadow-xs backdrop-blur-sm machined-edge"
          >
            {chips}
          </div>
        )}
      </div>
      <div className="hidden sm:flex flex-wrap px-3 py-1.5 rounded-xl bg-surface-elevated/95 border border-subtle backdrop-blur-sm shadow-xs items-center gap-2 machined-edge [&>*]:whitespace-nowrap">
        <Share2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-primary font-sans">{title}</span>
        {chips}
      </div>
    </div>
  );
};
