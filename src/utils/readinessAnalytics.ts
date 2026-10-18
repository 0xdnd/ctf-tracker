/**
 * readinessAnalytics.ts
 * Tactical Offensive Readiness Analytics & Spaced Repetition Engine.
 * Features 6-axis competency vector scoring, independence weighting,
 * SM-2 retention decay modeling, gap analysis, and catalog recommendations.
 * 100% Client-Side, Deterministic, and Offline-First.
 */

import { Machine, Difficulty } from '../types';

export type CompetencyAxis =
  | 'Active Directory'
  | 'Web Exploitation'
  | 'Linux PrivEsc'
  | 'Windows PrivEsc'
  | 'Network & Pivoting'
  | 'Binary & Pwn';

export type SolveIndependence = 'solo' | 'hint' | 'walkthrough';

export interface UserMachineEngagement {
  machineId: string;
  solvedAt: string; // ISO date string
  independence: SolveIndependence;
  perceivedDifficulty?: Difficulty;
  reviewCount?: number;
  lastReviewedAt?: string;
}

export interface CompetencyScore {
  axis: CompetencyAxis;
  solvedCount: number;
  weightedScore: number;
  maxBenchScore: number;
  readinessPercentage: number;
  proficiencyLevel: 'Novice' | 'Apprentice' | 'Proficient' | 'Advanced' | 'Master';
}

export interface SpacedRepetitionTarget {
  machine: Machine;
  engagement: UserMachineEngagement;
  retentionScore: number; // 0 to 100
  isDueForReview: boolean;
  daysSinceSolve: number;
  recommendedReviewDate: string;
}

export interface ReadinessOverviewReport {
  overallScore: number; // 0 - 100
  competencies: Record<CompetencyAxis, CompetencyScore>;
  weakestAxis: CompetencyAxis;
  strongestAxis: CompetencyAxis;
  repetitionTargets: SpacedRepetitionTarget[];
  recommendedCatalogTargets: Machine[];
}

const AXIS_BENCHMARKS: Record<CompetencyAxis, number> = {
  'Active Directory': 500,
  'Web Exploitation': 500,
  'Linux PrivEsc': 450,
  'Windows PrivEsc': 450,
  'Network & Pivoting': 400,
  'Binary & Pwn': 300,
};

const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  'Very Easy': 10,
  'Easy': 25,
  'Medium': 50,
  'Hard': 85,
  'Insane': 120,
};

const INDEPENDENCE_MULTIPLIERS: Record<SolveIndependence, number> = {
  solo: 1.0,
  hint: 0.65,
  walkthrough: 0.35,
};

/**
 * Classifies a machine's tags, name, and notes into corresponding competency vectors.
 */
export function classifyMachineCompetencies(machine: Machine): CompetencyAxis[] {
  const text = `${machine.name} ${machine.tags.join(' ')} ${machine.hint || ''} ${machine.officialSynopsis || ''}`.toLowerCase();
  const matchedAxes = new Set<CompetencyAxis>();

  if (
    text.includes('ad') ||
    text.includes('active directory') ||
    text.includes('kerberos') ||
    text.includes('ldap') ||
    text.includes('bloodhound') ||
    text.includes('gpo') ||
    text.includes('adcs') ||
    text.includes('dcsync')
  ) {
    matchedAxes.add('Active Directory');
  }

  if (
    text.includes('web') ||
    text.includes('http') ||
    text.includes('sqli') ||
    text.includes('sql') ||
    text.includes('ssti') ||
    text.includes('ssrf') ||
    text.includes('rfi') ||
    text.includes('lfi') ||
    text.includes('deserialization') ||
    text.includes('xss') ||
    text.includes('api') ||
    text.includes('php')
  ) {
    matchedAxes.add('Web Exploitation');
  }

  if (
    machine.os === 'Linux' &&
    (text.includes('privesc') ||
      text.includes('suid') ||
      text.includes('sudo') ||
      text.includes('kernel') ||
      text.includes('cron') ||
      text.includes('capabilities') ||
      text.includes('linpeas'))
  ) {
    matchedAxes.add('Linux PrivEsc');
  }

  if (
    machine.os === 'Windows' &&
    (text.includes('privesc') ||
      text.includes('potato') ||
      text.includes('seimpersonate') ||
      text.includes('unquoted') ||
      text.includes('token') ||
      text.includes('uac') ||
      text.includes('sam') ||
      text.includes('lsass') ||
      text.includes('winpeas'))
  ) {
    matchedAxes.add('Windows PrivEsc');
  }

  if (
    text.includes('pivot') ||
    text.includes('pivoting') ||
    text.includes('tunnel') ||
    text.includes('tunneling') ||
    text.includes('chisel') ||
    text.includes('ligolo') ||
    text.includes('proxychains') ||
    text.includes('port forward') ||
    text.includes('network') ||
    text.includes('smb')
  ) {
    matchedAxes.add('Network & Pivoting');
  }

  if (
    text.includes('bof') ||
    text.includes('buffer overflow') ||
    text.includes('rop') ||
    text.includes('pwn') ||
    text.includes('binary') ||
    text.includes('shellcode') ||
    text.includes('ghidra') ||
    text.includes('reverse engineering')
  ) {
    matchedAxes.add('Binary & Pwn');
  }

  // Default fallback if no tag matches: based on OS
  if (matchedAxes.size === 0) {
    if (machine.os === 'Linux') matchedAxes.add('Linux PrivEsc');
    else if (machine.os === 'Windows') matchedAxes.add('Windows PrivEsc');
    else matchedAxes.add('Web Exploitation');
  }

  return Array.from(matchedAxes);
}

/**
 * Computes SM-2 retention score (0-100) and review due date based on solve date and independence.
 */
export function calculateSpacedRepetition(
  engagement: UserMachineEngagement,
  now: Date = new Date()
): { retentionScore: number; isDueForReview: boolean; daysSinceSolve: number; recommendedReviewDate: string } {
  const solvedDate = new Date(engagement.solvedAt);
  const diffMs = Math.max(0, now.getTime() - solvedDate.getTime());
  const daysSinceSolve = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const reviewsDone = engagement.reviewCount ?? 0;
  const independenceFactor = INDEPENDENCE_MULTIPLIERS[engagement.independence];

  // Base intervals: 7 days, 21 days, 60 days, 120 days
  const baseIntervals = [7, 21, 60, 120];
  const selectedBase = baseIntervals[Math.min(reviewsDone, baseIntervals.length - 1)];

  // Walkthrough solves decay significantly faster than solo solves
  const effectiveIntervalDays = Math.max(2, Math.round(selectedBase * independenceFactor));

  // Retention score modeled via exponential decay: R = e^(-t / S)
  const halfLife = effectiveIntervalDays * 1.5;
  const retentionScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-daysSinceSolve / halfLife))));

  const isDueForReview = daysSinceSolve >= effectiveIntervalDays || retentionScore < 50;

  const nextReviewDateObj = new Date(solvedDate.getTime() + effectiveIntervalDays * 24 * 60 * 60 * 1000);
  const recommendedReviewDate = nextReviewDateObj.toISOString().split('T')[0];

  return {
    retentionScore,
    isDueForReview,
    daysSinceSolve,
    recommendedReviewDate,
  };
}

/**
 * Tactical Master Readiness & Gap Analysis Engine.
 */
export function computeReadinessReport(
  allMachines: Machine[],
  engagements: UserMachineEngagement[],
  now: Date = new Date()
): ReadinessOverviewReport {
  const machineMap = new Map<string, Machine>(allMachines.map((m) => [m.id, m]));

  const axisScores: Record<CompetencyAxis, { solved: number; rawScore: number }> = {
    'Active Directory': { solved: 0, rawScore: 0 },
    'Web Exploitation': { solved: 0, rawScore: 0 },
    'Linux PrivEsc': { solved: 0, rawScore: 0 },
    'Windows PrivEsc': { solved: 0, rawScore: 0 },
    'Network & Pivoting': { solved: 0, rawScore: 0 },
    'Binary & Pwn': { solved: 0, rawScore: 0 },
  };

  const repetitionTargets: SpacedRepetitionTarget[] = [];
  const solvedMachineIds = new Set<string>();

  for (const eng of engagements) {
    const machine = machineMap.get(eng.machineId);
    if (!machine) continue;

    solvedMachineIds.add(machine.id);
    const multiplier = INDEPENDENCE_MULTIPLIERS[eng.independence];
    const basePts = DIFFICULTY_POINTS[machine.difficulty] ?? 25;
    const weightedPts = basePts * multiplier;

    const categories = classifyMachineCompetencies(machine);
    for (const axis of categories) {
      axisScores[axis].solved += 1;
      axisScores[axis].rawScore += weightedPts;
    }

    const rep = calculateSpacedRepetition(eng, now);
    repetitionTargets.push({
      machine,
      engagement: eng,
      retentionScore: rep.retentionScore,
      isDueForReview: rep.isDueForReview,
      daysSinceSolve: rep.daysSinceSolve,
      recommendedReviewDate: rep.recommendedReviewDate,
    });
  }

  // Sort repetition targets: lowest retention (most due) first
  repetitionTargets.sort((a, b) => a.retentionScore - b.retentionScore);

  // Compile competencies summary
  const competencies = {} as Record<CompetencyAxis, CompetencyScore>;
  let totalPercent = 0;
  const axes = Object.keys(AXIS_BENCHMARKS) as CompetencyAxis[];

  for (const axis of axes) {
    const bench = AXIS_BENCHMARKS[axis];
    const currentRaw = axisScores[axis].rawScore;
    const pct = Math.min(100, Math.round((currentRaw / bench) * 100));
    totalPercent += pct;

    let proficiency: CompetencyScore['proficiencyLevel'] = 'Novice';
    if (pct >= 85) proficiency = 'Master';
    else if (pct >= 65) proficiency = 'Advanced';
    else if (pct >= 45) proficiency = 'Proficient';
    else if (pct >= 20) proficiency = 'Apprentice';

    competencies[axis] = {
      axis,
      solvedCount: axisScores[axis].solved,
      weightedScore: Math.round(currentRaw),
      maxBenchScore: bench,
      readinessPercentage: pct,
      proficiencyLevel: proficiency,
    };
  }

  // Identify weakest and strongest axes
  let weakestAxis: CompetencyAxis = axes[0];
  let strongestAxis: CompetencyAxis = axes[0];
  let lowestPct = 999;
  let highestPct = -1;

  for (const axis of axes) {
    const p = competencies[axis].readinessPercentage;
    if (p < lowestPct) {
      lowestPct = p;
      weakestAxis = axis;
    }
    if (p > highestPct) {
      highestPct = p;
      strongestAxis = axis;
    }
  }

  const overallScore = Math.round(totalPercent / axes.length);

  // Recommender: Find top 5 unsolved machines matching weakestAxis
  const recommendations: Machine[] = [];
  for (const candidate of allMachines) {
    if (solvedMachineIds.has(candidate.id)) continue;
    const candidateAxes = classifyMachineCompetencies(candidate);
    if (candidateAxes.includes(weakestAxis)) {
      recommendations.push(candidate);
      if (recommendations.length >= 5) break;
    }
  }

  return {
    overallScore,
    competencies,
    weakestAxis,
    strongestAxis,
    repetitionTargets,
    recommendedCatalogTargets: recommendations,
  };
}
