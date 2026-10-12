/**
 * Structured penetration-test findings attached to an exam session.
 * Scoring helpers live in src/utils/cvss.ts.
 */

export const FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  /** CVSS v3.1 base vector, e.g. `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`. */
  cvssVector?: string;
  /** Base score computed from `cvssVector` (0.0 - 10.0). */
  cvssScore?: number;
  /** Exam box names (or IPs) the finding applies to. */
  affectedHosts: string[];
  description: string;
  impact?: string;
  remediation?: string;
  /** Exam proof screenshot ids (`ScreenshotProof.id`). */
  evidenceRefs: string[];
}
