import type { Machine } from '../types';
import { PRACTICE_TRACKS } from '../data/tracksData';
import { toCsv } from './csv';

const HEADERS = [
  'Name',
  'Platform',
  'OS',
  'Difficulty',
  'Status',
  'Tracks',
  'User pwned at',
  'Root pwned at',
  'Updated at',
  'Tags',
];

/** The machine list as CSV text (UTF-8 BOM, CRLF), one row per machine, in the order given. */
export function buildMachinesCsv(machines: Machine[]): string {
  const rows = machines.map((m) => [
    m.name,
    m.platform,
    m.os,
    m.difficulty,
    m.status,
    PRACTICE_TRACKS.filter((t) => t.filterFn(m))
      .map((t) => t.shortName)
      .join('; '),
    m.userPwnedAt,
    m.rootPwnedAt,
    m.updatedAt,
    (m.tags ?? []).join('; '),
  ]);
  return toCsv(HEADERS, rows);
}
