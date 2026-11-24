import type { PipelineStatus } from '../types';

/** True for the two stages that mean the target is rooted ("System pwned" and "Completed"). */
const isRootStage = (status: PipelineStatus | undefined): boolean => status === 'root' || status === 'completed';

/**
 * True when a stage move newly reaches the rooted stages. Moving between "System pwned" and "Completed" (either
 * way) is not a new root, so it must not re-fire the celebration or log another root session.
 */
export const entersRootStage = (prev: PipelineStatus | undefined, next: PipelineStatus): boolean =>
  isRootStage(next) && !isRootStage(prev);

/** Pipeline order of the stages, first to last. */
export const STAGE_ORDER: readonly PipelineStatus[] = ['backlog', 'recon', 'foothold', 'root', 'completed'];

/** The stage names the board uses (lane titles, the card stage menu). */
export const STAGE_LABEL: Record<PipelineStatus, string> = {
  backlog: 'Backlog',
  recon: 'Active recon',
  foothold: 'Foothold',
  root: 'System pwned',
  completed: 'Completed',
};

/** Shorter stage names for tight spots (the machine summary strip). */
export const STAGE_SHORT_LABEL: Record<PipelineStatus, string> = {
  backlog: 'Backlog',
  recon: 'Recon',
  foothold: 'Foothold',
  root: 'Root',
  completed: 'Completed',
};
