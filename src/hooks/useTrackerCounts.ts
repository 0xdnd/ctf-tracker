import { useMemo } from 'react';
import { Machine, PipelineStatus } from '../types';

export interface TrackerCounts {
  totalMachines: number;
  rootedMachines: number;
  footholdMachines: number;
  pwnPercentage: number;
}

/** A machine counts as "rooted" once it's fully solved, however the pipeline labelled that. */
export function isRootedStatus(status: PipelineStatus): boolean {
  return status === 'root' || status === 'completed';
}

/**
 * Single source of truth for the tracker's total/rooted/foothold counts, so the sidebar badge and
 * the header's engaged-target counter can never disagree (they previously each recomputed this
 * with their own copy of the same loop).
 */
export function computeTrackerCounts(machines: readonly Machine[]): TrackerCounts {
  const total = machines.length;
  let rooted = 0;
  let foothold = 0;
  for (let i = 0; i < total; i++) {
    const status = machines[i].status;
    if (isRootedStatus(status)) rooted++;
    else if (status === 'foothold') foothold++;
  }
  const pwnPercentage = total > 0 ? Math.round((rooted / total) * 100) : 0;
  return { totalMachines: total, rootedMachines: rooted, footholdMachines: foothold, pwnPercentage };
}

export function useTrackerCounts(machines: readonly Machine[]): TrackerCounts {
  return useMemo(() => computeTrackerCounts(machines), [machines]);
}
