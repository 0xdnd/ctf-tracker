import type { Machine } from '../types';

/** HTB + THM + Proving Grounds + VulnHub rows. Checked against the data files in catalogCounts.test.ts. */
export const CATALOG_TOTAL = 1376;

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
