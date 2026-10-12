import type { Machine } from '../types';

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
    inflight = import('./machinesCatalog')
      .then((mod) => {
        cached = mod.INITIAL_MACHINES;
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
