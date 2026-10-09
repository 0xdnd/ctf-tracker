/**
 * cvss.ts
 * Pure CVSS v3.1 base-score calculator (FIRST specification, section 7) and severity mapping.
 */

import type { Finding, FindingSeverity } from '../types/findings';

export type CvssMetricKey = 'AV' | 'AC' | 'PR' | 'UI' | 'S' | 'C' | 'I' | 'A';

export type CvssMetrics = Record<CvssMetricKey, string>;

const ALLOWED: Record<CvssMetricKey, readonly string[]> = {
  AV: ['N', 'A', 'L', 'P'],
  AC: ['L', 'H'],
  PR: ['N', 'L', 'H'],
  UI: ['N', 'R'],
  S: ['U', 'C'],
  C: ['H', 'L', 'N'],
  I: ['H', 'L', 'N'],
  A: ['H', 'L', 'N'],
};

const METRIC_KEYS = Object.keys(ALLOWED) as CvssMetricKey[];

const AV_WEIGHT: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC_WEIGHT: Record<string, number> = { L: 0.77, H: 0.44 };
const UI_WEIGHT: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA_WEIGHT: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };
const PR_WEIGHT_UNCHANGED: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
const PR_WEIGHT_CHANGED: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 };

/**
 * Parses a CVSS v3.x base vector. An optional `CVSS:3.0/` or `CVSS:3.1/` prefix is accepted.
 * Returns null unless all eight base metrics are present exactly once with valid values.
 */
export function parseCvssVector(vector: string): CvssMetrics | null {
  if (typeof vector !== 'string') return null;
  const parts = vector.trim().split('/').filter((p) => p.length > 0);
  if (parts.length > 0 && /^CVSS:/i.test(parts[0])) {
    if (!/^CVSS:3\.[01]$/i.test(parts[0])) return null;
    parts.shift();
  }
  const found: Partial<CvssMetrics> = {};
  for (const part of parts) {
    const [key, value, ...rest] = part.split(':');
    if (rest.length > 0 || !key || !value) return null;
    const metric = key.toUpperCase() as CvssMetricKey;
    const val = value.toUpperCase();
    if (!ALLOWED[metric] || !ALLOWED[metric].includes(val) || found[metric] !== undefined) return null;
    found[metric] = val;
  }
  return METRIC_KEYS.every((k) => found[k] !== undefined) ? (found as CvssMetrics) : null;
}

/** CVSS v3.1 Roundup: smallest number, to 1 decimal place, that is >= the input (float-safe). */
export function cvssRoundUp(input: number): number {
  const intInput = Math.round(input * 100000);
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
}

/** Base score (0.0 - 10.0) for a vector string or parsed metrics; null when the vector is invalid. */
export function calculateCvssScore(vectorOrMetrics: string | CvssMetrics): number | null {
  const m = typeof vectorOrMetrics === 'string' ? parseCvssVector(vectorOrMetrics) : vectorOrMetrics;
  if (!m) return null;

  const scopeChanged = m.S === 'C';
  const iss = 1 - (1 - CIA_WEIGHT[m.C]) * (1 - CIA_WEIGHT[m.I]) * (1 - CIA_WEIGHT[m.A]);
  const impact = scopeChanged
    ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
    : 6.42 * iss;
  const pr = (scopeChanged ? PR_WEIGHT_CHANGED : PR_WEIGHT_UNCHANGED)[m.PR];
  const exploitability = 8.22 * AV_WEIGHT[m.AV] * AC_WEIGHT[m.AC] * pr * UI_WEIGHT[m.UI];

  if (impact <= 0) return 0;
  return scopeChanged
    ? cvssRoundUp(Math.min(1.08 * (impact + exploitability), 10))
    : cvssRoundUp(Math.min(impact + exploitability, 10));
}

/** 0 = info, 0.1-3.9 low, 4.0-6.9 medium, 7.0-8.9 high, 9.0-10.0 critical. */
export function scoreToSeverity(score: number): FindingSeverity {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return 'info';
}

const SEVERITY_RANK: Record<FindingSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/** Returns a new array ordered critical -> info, then by CVSS score (desc), then original order. */
export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return findings
    .map((f, index) => ({ f, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.f.severity] - SEVERITY_RANK[b.f.severity] ||
        (b.f.cvssScore ?? -1) - (a.f.cvssScore ?? -1) ||
        a.index - b.index
    )
    .map(({ f }) => f);
}
