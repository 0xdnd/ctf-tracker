import type { Machine } from '../types';

/** HTB + THM + Proving Grounds + VulnHub rows. Auto-synced by scripts/update-catalog-counts.mjs & checked in catalogCounts.test.ts. */
export const CATALOG_TOTAL = 2186;
export const PHASE_COUNT = 8;
export const PHASE_COUNT_WORD = 'Eight';
export const EXAM_TRACK_COUNT = 7;
export const EXAM_TRACKS_LIST = 'OSCP, CPTS, CRTO, OSEP, CRTP, PNPT and OSWE';
export const SHELL_COUNT = 131;

export interface OwnerSolved {
  total: number;
  htb: number;
  thm: number;
}

/** The owner's solved roster: catalog rows seeded with status "completed". */
export function countOwnerSolved(machines: readonly Machine[]): OwnerSolved {
  const done = machines.filter((m) => m.status === 'completed');
  return {
    total: done.length,
    htb: done.filter((m) => m.platform === 'HTB').length,
    thm: done.filter((m) => m.platform === 'THM').length,
  };
}
