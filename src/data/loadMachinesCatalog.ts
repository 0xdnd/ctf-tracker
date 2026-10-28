import type { Machine } from '../types';
import { appendActiveMachines } from './activeMachines';

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
          ...(pg.default as unknown as Machine[]),
          ...(vulnhub.default as unknown as Machine[]),
        ];
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
