import type { Difficulty, Machine, OperatingSystem, PgRow, VulnhubPackedRow, VulnhubRow } from '../types';
import { appendActiveMachines } from './activeMachines';

/** Fixed stamp of the PG catalog rows (same value as PG_STAMP in scripts/lib/pg-pack.cjs). */
const PG_STAMP = '2026-10-28T00:00:00.000Z';
const PG_TIER_URL = { Play: 'https://portal.offsec.com/labs/play', Practice: 'https://portal.offsec.com/labs/practice' } as const;

/** Expands the compact rows of catalogSources/pg.json into full Machine rows (same output as scripts/lib/pg-pack.cjs unpackRows). */
export function expandPgRows(compact: readonly PgRow[]): Machine[] {
  return compact.map((c) => ({
    id: c.id,
    name: c.name,
    ip: '10.10.x.x',
    os: c.os,
    platform: 'PG',
    difficulty: c.difficulty,
    status: 'backlog',
    tags: c.tags ? [...c.tags] : [`PG-${c.tier}`],
    certifications: c.certifications ? [...c.certifications] : [],
    roomUrl: c.roomUrl || PG_TIER_URL[c.tier],
    writeupUrl: '',
    hint: '',
    timeSpentSeconds: 0,
    createdAt: c.stamp ? c.stamp[0] : PG_STAMP,
    updatedAt: c.stamp ? c.stamp[1] : PG_STAMP,
  }));
}

/** Fixed stamp of the VulnHub catalog rows (the date the source was first imported). */
const VULNHUB_STAMP = '2026-10-28T00:00:00.000Z';

const VH_ENTRY = 'https://www.vulnhub.com/entry/';
const VH_DIFFS: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const VH_OSES: OperatingSystem[] = ['Linux', 'Windows', 'BSD', 'Android', 'macOS', 'Other'];
const vhSlugOf = (name: string) => name.toLowerCase().replace(/\s*:\s*/, '_').replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').replace(/-+/g, '-');

/** Decodes the packed rows of catalogSources/vulnhub.json (same layout as scripts/lib/vulnhub-pack.cjs). */
export function unpackVulnhubRows(packed: readonly VulnhubPackedRow[]): VulnhubRow[] {
  return packed.map(([name, link, d, o = 0, x = {}]) => {
    const entry = typeof link === 'number' || !link.startsWith('http');
    const tail = typeof link === 'number' ? `${vhSlugOf(name)},${link}` : link;
    const row: VulnhubRow = {
      id: x.id || `vulnhub-${entry ? tail.slice(0, tail.indexOf(',')) : ''}`,
      name,
      os: VH_OSES[o],
      difficulty: VH_DIFFS[d === 5 ? 2 : d],
      roomUrl: entry ? `${VH_ENTRY}${tail}/` : (link as string),
    };
    if (d === 5) row.difficultyUnrated = true;
    if (x.tags) row.tags = x.tags;
    if (x.certifications) row.certifications = x.certifications;
    return row;
  });
}

/** Expands the packed rows of catalogSources/vulnhub.json into full Machine rows. */
export function expandVulnhubRows(packed: readonly VulnhubPackedRow[]): Machine[] {
  return unpackVulnhubRows(packed).map((r) => ({
    id: r.id,
    name: r.name,
    ip: '10.10.x.x',
    os: r.os,
    platform: 'VulnHub',
    difficulty: r.difficulty,
    status: 'backlog',
    tags: r.tags ? [...r.tags] : [],
    certifications: r.certifications ? [...r.certifications] : [],
    roomUrl: r.roomUrl,
    writeupUrl: '',
    hint: '',
    timeSpentSeconds: 0,
    createdAt: VULNHUB_STAMP,
    updatedAt: VULNHUB_STAMP,
  }));
}

let cached: Machine[] | null = null;
let inflight: Promise<Machine[]> | null = null;

/** Synchronous access to the catalog if it has already been loaded, else null. */
export function getLoadedMachinesCatalog(): Machine[] | null {
  return cached;
}

/**
 * Loads the full machine catalog (separate `catalog-data` chunk) on first call
 * and caches it. Concurrent callers share one import; failures are not cached.
 */
export function loadMachinesCatalog(): Promise<Machine[]> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = Promise.all([
      import('./machinesCatalog'),
      import('./catalogSources/pg.json'),
      import('./catalogSources/vulnhub.json'),
    ])
      .then(([mod, pg, vulnhub]) => {
        // Active HTB machines (activeMachines.json) join as metadata-only rows, then PG and VulnHub sources.
        cached = [
          ...appendActiveMachines(mod.INITIAL_MACHINES),
          ...expandPgRows(pg.default as unknown as PgRow[]),
          ...expandVulnhubRows(vulnhub.default as unknown as VulnhubPackedRow[]),
        ];
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
