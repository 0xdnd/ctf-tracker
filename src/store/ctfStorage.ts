import { Machine, AttackGraphEdge, AttackNodePosition, AttackGraphPersistedState } from '../types';
import { isGenuineCustom } from './machineNormalization';
import { stripDeepFieldsFromMachines } from '../utils/indexedDbDeepStorage';
import { isSchemaWriteGated } from '../utils/schemaWriteGate';
import { DEMO_SOLVED_ROSTER } from '../data/demoSolvedRoster';

/** Workspace store: localStorage wrapper plus the profile, attack graph and custom machine storage helpers. */

export const getProfileStorageKey = (profileId: string) => {
  const id = profileId || 'guest';
  const modernKey = `zerobox_operator_profile_${id}`;
  if (typeof window !== 'undefined') {
    const modernExists = safeLocalStorage.getItem(modernKey);
    if (modernExists) return modernKey;
    const legacyKey = `specter_ctf_profile_${id}`;
    const legacyExists = safeLocalStorage.getItem(legacyKey);
    if (legacyExists) return legacyKey;
  }
  return modernKey;
};

export const getWriteProfileStorageKey = (profileId: string) => `zerobox_operator_profile_${profileId || 'guest'}`;

export const inMemoryFallbackStorage = new Map<string, string>();

let isStorageEphemeral = false;

export const STORAGE_FULL_MESSAGE = 'Storage is full — changes are kept in memory only; export a backup.';

/** Keys whose last write failed; the alert fires once per key until a write to it succeeds again. */
const failingStorageKeys = new Set<string>();

// Every write below is a no-op while the schema write gate is engaged (newer ZeroBox in another tab, or restore).
export const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    // A value held in memory is newer than the disk copy (its write failed), so it wins.
    const held = inMemoryFallbackStorage.get(name);
    if (held !== undefined) return held;
    try {
      return localStorage.getItem(name);
    } catch {
      isStorageEphemeral = true;
      return null;
    }
  },
  /** Disk write only: true once it landed (any memory-held copy is dropped). No fallback, no alert. */
  tryWrite: (name: string, value: string): boolean => {
    if (typeof window === 'undefined' || isSchemaWriteGated()) return false;
    try {
      localStorage.setItem(name, value);
      inMemoryFallbackStorage.delete(name);
      failingStorageKeys.delete(name);
      return true;
    } catch {
      return false;
    }
  },
  /** Returns false when the value could only be kept in memory (quota or storage error); the user is alerted. */
  setItem: (name: string, value: string): boolean => {
    if (typeof window === 'undefined' || isSchemaWriteGated()) return false;
    try {
      localStorage.setItem(name, value);
      inMemoryFallbackStorage.delete(name);
      failingStorageKeys.delete(name);
      return true;
    } catch (err: unknown) {
      const e = err as { name?: string; code?: number; number?: number; message?: string } | null | undefined;
      isStorageEphemeral = true;
      inMemoryFallbackStorage.set(name, value);
      if (failingStorageKeys.has(name)) return false;
      failingStorageKeys.add(name);
      const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882;
      try {
        window.dispatchEvent(
          new CustomEvent('zerobox:storage', {
            detail: isQuota
              ? { kind: 'quota', message: STORAGE_FULL_MESSAGE, sticky: true }
              : { kind: 'error', message: `Could not save to browser storage (${String(e?.message || e)}). Changes are kept in memory only; export a backup.`, sticky: true },
          })
        );
      } catch { /* event dispatch is best-effort; the in-memory fallback already holds the value */ }
      return false;
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined' || isSchemaWriteGated()) return;
    inMemoryFallbackStorage.delete(name);
    failingStorageKeys.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {
      isStorageEphemeral = true;
    }
  },
  isEphemeral: (): boolean => {
    if (isStorageEphemeral) return true;
    if (typeof window === 'undefined' || isSchemaWriteGated()) return false;
    try {
      const test = '__zb_storage_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return false;
    } catch {
      isStorageEphemeral = true;
      return true;
    }
  }
};

const profileSaveStamps = new Map<string, { content: string; savedAt: string }>();

/**
 * Writes a profile payload to its key. On quota it retries without writeup/quick-note bodies (those also live in
 * IndexedDB deep storage); if that fails too the full payload is held in memory (and the user alerted) and this
 * returns false so callers don't treat it as saved. The legacy specter_ctf_profile_* mirror is still read
 * (getProfileStorageKey fallback, backups), so it is kept in step, best effort: a mirror that can't be replaced is
 * removed rather than left stale.
 */
export function writeProfilePayload(
  profileId: string,
  payload: { machines: Machine[] } & Record<string, unknown>
): { saved: boolean; savedAt: string } {
  const key = getWriteProfileStorageKey(profileId);
  const content = JSON.stringify(payload);
  // savedAt only moves when the content does, so re-saving unchanged data writes byte-identical copies.
  const prev = profileSaveStamps.get(key);
  const savedAt = prev && prev.content === content ? prev.savedAt : new Date().toISOString();
  profileSaveStamps.set(key, { content, savedAt });
  const serialized = `${content.slice(0, -1)},"savedAt":${JSON.stringify(savedAt)}}`;
  let written = serialized;
  if (!safeLocalStorage.tryWrite(key, serialized)) {
    const lean = JSON.stringify({ ...payload, machines: stripDeepFieldsFromMachines(payload.machines), savedAt });
    if (!safeLocalStorage.tryWrite(key, lean)) {
      safeLocalStorage.setItem(key, serialized);
      return { saved: false, savedAt };
    }
    console.warn('[ZeroBox] LocalStorage quota reached: saved the profile without writeup bodies (kept in IndexedDB).');
    written = lean;
  }
  const mirror = `specter_ctf_profile_${profileId || 'guest'}`;
  if (!safeLocalStorage.tryWrite(mirror, written)) safeLocalStorage.removeItem(mirror);
  return { saved: true, savedAt };
}

export const ATTACK_GRAPH_STORAGE_KEY = 'zerobox-attack-graph-state';

/** Each profile's own graph key. The guest profile's key is the original unscoped one. */
export const getAttackGraphStorageKey = (profileId: string = 'guest'): string => {
  const id = profileId || 'guest';
  return id === 'guest' ? ATTACK_GRAPH_STORAGE_KEY : `zerobox_graph_state_${id}`;
};

/** Set once the one-time legacy graph claim (claimLegacyAttackGraphOnce) has run; it never runs again. */
export const GRAPH_LEGACY_CLAIMED_KEY = 'zerobox_graph_legacy_claimed';

/** Set when the guest profile saves its graph under this build: from then on the unscoped key is guest's own data. */
export const GRAPH_GUEST_WRITTEN_KEY = 'zerobox_graph_guest_written_v2';

/**
 * Older builds wrote every profile's graph to the unscoped key as well, and read it when a profile key was missing.
 * Once, globally: hand that graph to the profile the persisted store blob was last on (the profile that wrote it
 * last), if that profile has no graph key of its own and guest hasn't saved to the unscoped key under this build.
 * Every other profile, and every later boot, ignores the unscoped key; it stays guest's key.
 */
export function claimLegacyAttackGraphOnce(): string | null {
  // Runs after hydration, so a newer-schema blob or a restore has engaged the write gate first (then: next boot).
  if (typeof window === 'undefined' || isSchemaWriteGated() || safeLocalStorage.getItem(GRAPH_LEGACY_CLAIMED_KEY)) {
    return null;
  }
  let claimedFor: string | null = null;
  try {
    const legacy = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    let blobProfileId: unknown = null;
    try {
      blobProfileId = JSON.parse(safeLocalStorage.getItem('zerobox-tactical-store') || 'null')?.state?.currentProfileId;
    } catch { /* unreadable or corrupt blob; leave blobProfileId as null */ }
    if (
      legacy &&
      typeof blobProfileId === 'string' &&
      blobProfileId &&
      blobProfileId !== 'guest' &&
      !safeLocalStorage.getItem(GRAPH_GUEST_WRITTEN_KEY) &&
      !safeLocalStorage.getItem(getAttackGraphStorageKey(blobProfileId))
    ) {
      if (safeLocalStorage.setItem(getAttackGraphStorageKey(blobProfileId), legacy)) claimedFor = blobProfileId;
    }
  } finally {
    safeLocalStorage.setItem(GRAPH_LEGACY_CLAIMED_KEY, '1');
  }
  return claimedFor;
}

export function loadInitialAttackGraphState(profileId: string = 'guest'): AttackGraphPersistedState {
  if (typeof window === 'undefined') {
    return { graphNodePositions: {}, graphEdges: [] };
  }
  try {
    const raw = safeLocalStorage.getItem(getAttackGraphStorageKey(profileId));
    if (raw) {
      const parsed = JSON.parse(raw);
      const positions = parsed.graphNodePositions !== undefined ? parsed.graphNodePositions : (parsed.nodePositions || {});
      const edges = Array.isArray(parsed.graphEdges)
        ? parsed.graphEdges
        : Array.isArray(parsed.edges)
        ? parsed.edges
        : [];
      return {
        graphNodePositions: positions,
        graphEdges: edges,
      };
    }
  } catch (err) {
    console.warn('[ZeroBox] Failed to parse attack graph state from storage:', err);
  }
  return { graphNodePositions: {}, graphEdges: [] };
}

export function saveAttackGraphState(
  positions: Record<string, AttackNodePosition>,
  edges: AttackGraphEdge[],
  profileId: string = 'guest'
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      graphNodePositions: positions,
      graphEdges: edges,
      nodePositions: positions,
      edges,
    };
    // Only this profile's key: writing the shared unscoped key too let one profile's graph leak into others.
    const id = profileId || 'guest';
    if (id === 'guest' && !safeLocalStorage.getItem(GRAPH_LEGACY_CLAIMED_KEY)) {
      safeLocalStorage.setItem(GRAPH_GUEST_WRITTEN_KEY, '1');
    }
    safeLocalStorage.setItem(getAttackGraphStorageKey(id), JSON.stringify(payload));
  } catch (err) {
    console.warn('[ZeroBox] Failed to save attack graph state to storage:', err);
  }
}

export const getInitialProfileId = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const auth = safeLocalStorage.getItem('rootvector_auth_session');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed.state?.user?.id) {
          return parsed.state.user.id;
        }
      }
    } catch { /* unreadable auth blob; fall back to the guest profile */ }
  }
  return 'guest';
};

export const CUSTOM_MACHINES_STORAGE_KEY = 'zerobox_custom_machines_v1';

export const getCustomMachinesStorageKey = (profileId: string = 'guest'): string => {
  return `${CUSTOM_MACHINES_STORAGE_KEY}_${profileId}`;
};

export const loadCustomMachinesFromStorage = (profileId: string = 'guest'): Machine[] => {
  if (typeof window === 'undefined') return [];
  try {
    const specificKey = getCustomMachinesStorageKey(profileId);
    const rawSpecific = safeLocalStorage.getItem(specificKey);
    if (rawSpecific) {
      const parsed = JSON.parse(rawSpecific);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Global fallback
    const rawGlobal = safeLocalStorage.getItem(CUSTOM_MACHINES_STORAGE_KEY);
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[ZeroBox] Failed to load custom machines from storage:', err);
  }
  return [];
};

export const saveCustomMachinesToStorage = (machines: Machine[], profileId: string = 'guest'): void => {
  if (typeof window === 'undefined') return;
  try {
    const customOnly = machines.filter(
      (m) => m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))
    );
    const serialized = JSON.stringify(customOnly);
    safeLocalStorage.setItem(getCustomMachinesStorageKey(profileId), serialized);
    safeLocalStorage.setItem(CUSTOM_MACHINES_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[ZeroBox] Failed to save custom machines to storage:', err);
  }
};

/**
 * One-time cleanup of the isolated custom-machine keys: older builds stamped catalog machines with progress as
 * `isCustom` and mirrored their full (heavy) catalog payload here. Only rows that are now present in `machines` as
 * normal catalog rows are candidates. `beforeWrite` (a profile flush) runs first, and the prune aborts (returns -1,
 * nothing written) unless the profile key actually on disk (raw localStorage, not the in-memory quota fallback)
 * contains every row about to be removed. Genuine customs are never touched.
 */
export const pruneMisstampedCustomMachines = (
  machines: Machine[],
  profileId: string = 'guest',
  beforeWrite?: () => void
): number => {
  if (typeof window === 'undefined' || !Array.isArray(machines) || isSchemaWriteGated()) return -1;
  const normalizedCatalogIds = new Set(
    machines.filter((m) => m && !m.isCustom && !isGenuineCustom(m)).map((m) => m.id)
  );
  const plans: { key: string; kept: Machine[]; removedIds: string[] }[] = [];
  for (const key of [getCustomMachinesStorageKey(profileId), CUSTOM_MACHINES_STORAGE_KEY]) {
    try {
      const raw = safeLocalStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      const isStale = (m: Machine) =>
        Boolean(m && typeof m.id === 'string' && !isGenuineCustom(m) && normalizedCatalogIds.has(m.id));
      const removedIds = parsed.filter(isStale).map((m: Machine) => m.id);
      if (removedIds.length > 0) plans.push({ key, kept: parsed.filter((m: Machine) => !isStale(m)), removedIds });
    } catch (err) {
      console.warn('[ZeroBox] Failed to read custom machines for pruning:', err);
    }
  }
  if (plans.length === 0) return 0;

  beforeWrite?.();
  // Verify the replacement copy really reached disk before deleting anything.
  let onDisk: Set<string>;
  try {
    if (safeLocalStorage.isEphemeral()) return -1;
    const raw = localStorage.getItem(getWriteProfileStorageKey(profileId));
    const parsed = raw ? JSON.parse(raw) : null;
    onDisk = new Set(
      (Array.isArray(parsed?.machines) ? parsed.machines : [])
        .filter((m: Machine) => m && typeof m.id === 'string')
        .map((m: Machine) => m.id)
    );
  } catch {
    return -1;
  }
  if (!plans.every((p) => p.removedIds.every((id) => onDisk.has(id)))) {
    console.warn('[ZeroBox] Profile save not confirmed on disk; keeping isolated custom copies.');
    return -1;
  }

  let removed = 0;
  for (const p of plans) {
    try {
      localStorage.setItem(p.key, JSON.stringify(p.kept));
      removed += p.removedIds.length;
    } catch (err) {
      console.warn('[ZeroBox] Failed to prune mis-stamped custom machines:', err);
    }
  }
  return removed;
};

export const loadInitialProfileData = (profileId: string) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = safeLocalStorage.getItem(getProfileStorageKey(profileId));
      let state = raw ? JSON.parse(raw) : null;
      if (state && (typeof state !== 'object' || Array.isArray(state))) {
        state = null;
      }
      if (!state) {
        const legacy = safeLocalStorage.getItem('specter_ctf_store_v2');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            const candidate = parsed && typeof parsed === 'object' ? (parsed.state || parsed) : null;
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
              state = candidate;
            }
          } catch { /* unreadable legacy blob; ignore it and keep the default state */ }
        }
      }

      if (!state && profileId === 'usr_daniel') {
        state = { machines: DEMO_SOLVED_ROSTER, userSolvesReset: false };
      }

      // Re-integrate any isolated custom machines in case of partial reset or fresh profile
      const storedCustom = loadCustomMachinesFromStorage(profileId);
      if (Array.isArray(storedCustom) && storedCustom.length > 0) {
        const validCustom = storedCustom.filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string');
        if (!state) {
          state = { machines: validCustom };
        } else {
          const rawExisting = Array.isArray(state.machines) ? state.machines : [];
          const validExisting = rawExisting.filter((m: Machine) => m !== null && typeof m === 'object' && typeof m.id === 'string');
          const existingIds = new Set(validExisting.map((m: Machine) => m.id));
          const missingCustom = validCustom.filter((m) => !existingIds.has(m.id));
          state.machines = [...missingCustom, ...validExisting];
        }
      }

      return state;
    } catch { /* unreadable stored profile; fall through and report none found */ }
  }
  return null;
};
