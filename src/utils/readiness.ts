import type { Machine } from '../types';
import { isDueForReview } from './spacedRepetition';

export type ReadinessMachine = Pick<Machine, 'id' | 'name' | 'status' | 'tags' | 'difficulty'> &
  Partial<Pick<Machine, 'nextReviewAt' | 'isActive' | 'solveIndependence'>>;

export interface WeakTag {
  tag: string;
  solved: number;
  attempted: number;
  /** solved (weighted by solveIndependence) / attempted, 0..1 */
  rate: number;
}

export interface ReadinessSummary {
  /** 0..100. Solve rate over started machines, reduced when solved ones are overdue for review. */
  score: number;
  solved: number;
  attempted: number;
  weakestTags: WeakTag[];
  dueItems: ReadinessMachine[];
  nextSuggested: ReadinessMachine[];
}

export interface ReadinessOptions {
  /** Tags need at least this many attempts to be ranked. */
  minTagAttempts?: number;
  maxWeakTags?: number;
  maxSuggested?: number;
}

const DIFFICULTY_WEIGHT: Record<string, number> = {
  'Very Easy': 1,
  Easy: 2,
  Medium: 3,
  Hard: 4,
  Insane: 5,
};

const INDEPENDENCE_WEIGHT: Record<string, number> = {
  solo: 1.0,
  nudged: 0.65,
  assisted: 0.35,
};

const getSolveWeight = (m: ReadinessMachine): number => {
  if (!isSolved(m)) return 0;
  if (!m.solveIndependence) return 1.0;
  return INDEPENDENCE_WEIGHT[m.solveIndependence] ?? 1.0;
};

// Auto-added by scan imports; says nothing about a skill area.
const IGNORED_TAGS = new Set(['nmap-scanned']);

const isSolved = (m: ReadinessMachine) => m.status === 'root' || m.status === 'completed';

/** Pure summary of how ready the operator is, from the item list alone. */
export function computeReadiness(
  machines: ReadinessMachine[],
  now: number,
  opts: ReadinessOptions = {},
): ReadinessSummary {
  const { minTagAttempts = 2, maxWeakTags = 3, maxSuggested = 3 } = opts;

  const started = machines.filter((m) => m.status !== 'backlog');
  const solvedList = started.filter(isSolved);
  const dueItems = machines.filter((m) => isDueForReview(m, now));

  let score = 0;
  if (started.length > 0) {
    const solvedWeighted = solvedList.reduce((acc, m) => acc + getSolveWeight(m), 0);
    const base = solvedWeighted / started.length;
    const overdueShare = solvedList.length > 0 ? Math.min(1, dueItems.length / solvedList.length) : 0;
    score = Math.round(100 * base * (1 - 0.5 * overdueShare));
  }

  const tagStats = new Map<string, { solved: number; attempted: number; weighted: number }>();
  for (const m of started) {
    for (const tag of new Set(m.tags)) {
      if (IGNORED_TAGS.has(tag.toLowerCase())) continue;
      const s = tagStats.get(tag) ?? { solved: 0, attempted: 0, weighted: 0 };
      s.attempted += 1;
      if (isSolved(m)) {
        s.solved += 1;
        s.weighted += getSolveWeight(m);
      }
      tagStats.set(tag, s);
    }
  }
  const allTags: WeakTag[] = [...tagStats.entries()]
    .filter(([, s]) => s.attempted >= minTagAttempts)
    .map(([tag, s]) => ({ tag, solved: s.solved, attempted: s.attempted, rate: s.weighted / s.attempted }));
  const weakestTags = allTags
    .filter((t) => t.rate < 1)
    .sort((a, b) => a.rate - b.rate || b.attempted - a.attempted || a.tag.localeCompare(b.tag))
    .slice(0, maxWeakTags);

  const weakSet = new Set(weakestTags.map((t) => t.tag));
  const rank = (m: ReadinessMachine): number => {
    const weakHits = m.tags.filter((t) => weakSet.has(t)).length;
    const inProgress = m.status === 'recon' || m.status === 'foothold' ? 3 : 0;
    return weakHits * 2 + inProgress - (DIFFICULTY_WEIGHT[m.difficulty] ?? 3) * 0.5;
  };
  const nextSuggested = machines
    .filter((m) => !isSolved(m))
    .map((m) => ({ m, r: rank(m) }))
    .sort((a, b) => b.r - a.r || a.m.name.localeCompare(b.m.name))
    .slice(0, maxSuggested)
    .map((x) => x.m);

  return { score, solved: solvedList.length, attempted: started.length, weakestTags, dueItems, nextSuggested };
}
