import type { CptsNoteEntry } from './obsidianManualUtils';

interface CptsRawPayload {
  notes?: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
}

/**
 * Lazy registry for the bundled CPTS field-manual catalog.
 * The heavy JSON lives in its own chunk and is only fetched via loadCptsVault().
 * CPTS_NOTES is filled in place so earlier importers keep a valid reference.
 */
export const CPTS_NOTES: CptsNoteEntry[] = [];

let wikilinkMap: Record<string, string> = {};
let loaded = false;
let inflight: Promise<void> | null = null;

export function isCptsVaultLoaded(): boolean {
  return loaded;
}

export function getStaticWikilinkMap(): Record<string, string> {
  return wikilinkMap;
}

/** Idempotent. Concurrent callers share one import; a failed import can be retried. */
export function loadCptsVault(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (inflight) return inflight;
  inflight = import('../data/cptsNotesIndex.json')
    .then((mod) => {
      const raw = (mod.default ?? mod) as unknown as CptsRawPayload | CptsNoteEntry[];
      const list = Array.isArray(raw) ? raw : raw.notes || [];
      wikilinkMap = Array.isArray(raw) ? {} : raw.wikilinkMap || {};
      CPTS_NOTES.length = 0;
      for (const note of list) CPTS_NOTES.push(note);
      loaded = true;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
