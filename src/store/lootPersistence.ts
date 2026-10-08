/**
 * Per-profile credential / loot persistence.
 *
 * Deliberately NOT part of the zustand `persist` / `partialize` payload (same approach as the
 * attack graph): each profile owns one localStorage entry, written synchronously on every mutation.
 *
 *   zerobox_loot_v2_${profileId}  ->  { schemaVersion: 1, credentials, credAttempts, lootItems }
 *
 * This module is dependency-free with respect to the stores (no useCtfStore import) so it can be
 * evaluated first without circular-import hazards. Pure list helpers used by the store actions and
 * by backup import live here too, which keeps the store diff small and the logic unit-testable.
 */
import type {
  CredAttempt,
  CredAttemptResult,
  CredService,
  Credential,
  CredentialPatch,
  CredentialType,
  LootItem,
  LootItemCategory,
  LootItemPatch,
  LootState,
  NewCredAttemptInput,
  NewCredentialInput,
  NewLootItemInput,
} from '../types/loot';
import { identifyHash } from '../utils/hashIdentifier';

export const LOOT_SCHEMA_VERSION = 1;
export const LOOT_STORAGE_KEY_PREFIX = 'zerobox_loot_v2_';
/** Legacy unscoped key of the old EvidenceVaultPage custom loot (pre-profile era). */
export const LEGACY_LOOT_KEY = 'zerobox_vault_custom_loot_v1';
/** Global marker: the legacy unscoped key has been claimed by exactly one profile. */
export const LEGACY_LOOT_CLAIMED_KEY = 'zerobox_loot_legacy_claimed';
export const REDACTED = '[REDACTED]';

export const getLootStorageKey = (profileId?: string): string =>
  `${LOOT_STORAGE_KEY_PREFIX}${profileId || 'guest'}`;

export const getLegacyProfileLootKey = (profileId?: string): string =>
  `${LEGACY_LOOT_KEY}_${profileId || 'guest'}`;

export const emptyLootState = (): LootState => ({ credentials: [], credAttempts: [], lootItems: [] });

// ---------------------------------------------------------------------------
// Storage access (localStorage with an in-memory fallback, mirrors safeLocalStorage)
// ---------------------------------------------------------------------------

const memoryFallback = new Map<string, string>();

const lootStorage = {
  get(name: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const v = localStorage.getItem(name);
      return v !== null ? v : memoryFallback.get(name) ?? null;
    } catch {
      return memoryFallback.get(name) ?? null;
    }
  },
  set(name: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
      memoryFallback.delete(name);
    } catch (e: any) {
      memoryFallback.set(name, value);
      const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882;
      try {
        window.dispatchEvent(
          new CustomEvent('zerobox:storage', {
            detail: isQuota
              ? { kind: 'quota', message: 'Storage full — credentials and loot could not be saved. Export a backup now.' }
              : { kind: 'error', message: String(e?.message || e) },
          })
        );
      } catch {}
    }
  },
  remove(name: string): void {
    if (typeof window === 'undefined') return;
    memoryFallback.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

// ---------------------------------------------------------------------------
// Ids, validation, normalization
// ---------------------------------------------------------------------------

export function newLootId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

const CREDENTIAL_TYPES: readonly CredentialType[] = ['password', 'hash', 'ticket', 'key', 'token', 'other'];
const CRED_SERVICES: readonly CredService[] = [
  'smb', 'winrm', 'rdp', 'ssh', 'ldap', 'mssql', 'http', 'ftp', 'kerberos', 'other',
];
const ATTEMPT_RESULTS: readonly CredAttemptResult[] = ['tried', 'valid', 'invalid'];
const LOOT_CATEGORIES: readonly LootItemCategory[] = ['flag', 'service', 'file', 'note'];

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined;
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);
const isoOrNow = (v: unknown): string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString();

export function normalizeCredential(raw: unknown): Credential | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.username !== 'string' && typeof raw.secret !== 'string') return null;
  const type = oneOf(CREDENTIAL_TYPES, raw.type) ?? 'other';
  const secret = typeof raw.secret === 'string' ? raw.secret.trim() : '';
  const cred: Credential = {
    id: optStr(raw.id) ?? newLootId('cred'),
    type,
    username: typeof raw.username === 'string' ? raw.username.trim() : '',
    secret,
    createdAt: isoOrNow(raw.createdAt),
  };
  const domain = optStr(raw.domain);
  if (domain) cred.domain = domain;
  const hashType = type === 'hash' ? optStr(raw.hashType) : undefined;
  if (hashType) cred.hashType = hashType;
  const sourceMachineId = optStr(raw.sourceMachineId);
  if (sourceMachineId) cred.sourceMachineId = sourceMachineId;
  const notes = optStr(raw.notes);
  if (notes) cred.notes = notes;
  if (raw.redacted === true || secret === REDACTED) cred.redacted = true;
  return cred;
}

export function normalizeCredAttempt(raw: unknown): CredAttempt | null {
  if (!isRecord(raw)) return null;
  const credId = optStr(raw.credId);
  const machineId = optStr(raw.machineId);
  const result = oneOf(ATTEMPT_RESULTS, raw.result);
  if (!credId || !machineId || !result) return null;
  const attempt: CredAttempt = {
    id: optStr(raw.id) ?? newLootId('att'),
    credId,
    machineId,
    service: oneOf(CRED_SERVICES, raw.service) ?? 'other',
    result,
    at: isoOrNow(raw.at),
  };
  if (typeof raw.port === 'number' && Number.isInteger(raw.port) && raw.port >= 0 && raw.port <= 65535) {
    attempt.port = raw.port;
  }
  return attempt;
}

export function normalizeLootItem(raw: unknown): LootItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.title !== 'string' && typeof raw.value !== 'string') return null;
  const item: LootItem = {
    id: optStr(raw.id) ?? newLootId('loot'),
    category: oneOf(LOOT_CATEGORIES, raw.category) ?? 'note',
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    value: typeof raw.value === 'string' ? raw.value.trim() : '',
    createdAt: isoOrNow(raw.createdAt),
  };
  const username = optStr(raw.username);
  if (username) item.username = username;
  const notes = optStr(raw.notes);
  if (notes) item.notes = notes;
  const machineId = optStr(raw.machineId);
  if (machineId) item.machineId = machineId;
  return item;
}

const mapNormalized = <T>(raw: unknown, normalize: (r: unknown) => T | null): T[] =>
  Array.isArray(raw) ? raw.map(normalize).filter((x): x is T => x !== null) : [];

// ---------------------------------------------------------------------------
// Credential identity
// ---------------------------------------------------------------------------

/**
 * Dedupe key. Hash secrets compare case-insensitively (hex), everything else is case-sensitive on the
 * secret. sourceMachineId is intentionally NOT part of the key: the first capture wins.
 */
export function credKey(c: Pick<Credential, 'type' | 'username' | 'secret' | 'domain'>): string {
  const secret = c.type === 'hash' ? c.secret.trim().toLowerCase() : c.secret.trim();
  return `${c.type}|${c.username.trim().toLowerCase()}|${secret}|${(c.domain ?? '').trim().toLowerCase()}`;
}

const hasSecret = (c: Pick<Credential, 'secret'>): boolean => c.secret.trim() !== '';

/** Identity of a principal ignoring the secret; used to match a redacted placeholder. */
const credIdentity = (c: Pick<Credential, 'type' | 'username' | 'domain'>): string =>
  `${c.type}|${c.username.trim().toLowerCase()}|${(c.domain ?? '').trim().toLowerCase()}`;

/** Existing credential with the same id, or (for non-empty secrets only) the same credKey. */
export function findDuplicateCredential(list: Credential[], cred: Credential): Credential | undefined {
  const byId = list.find((c) => c.id === cred.id);
  if (byId) return byId;
  if (!hasSecret(cred)) return undefined;
  const key = credKey(cred);
  return list.find((c) => hasSecret(c) && credKey(c) === key);
}

function withHashType(cred: Credential): Credential {
  if (cred.type === 'hash' && !cred.hashType) {
    const top = identifyHash(cred.secret)[0];
    if (top) cred.hashType = top.name;
  }
  return cred;
}

export function buildCredential(input: NewCredentialInput): Credential {
  const cred = normalizeCredential({
    ...input,
    id: input.id ?? newLootId('cred'),
    createdAt: input.createdAt ?? new Date().toISOString(),
  }) as Credential;
  return withHashType(cred);
}

/**
 * Applies a patch to one credential. Returns the new list, or null when the id is unknown or the edit
 * would make the credential collide with a different real credential (callers treat null as "rejected").
 */
export function patchCredential(list: Credential[], id: string, patch: CredentialPatch): Credential[] | null {
  const existing = list.find((c) => c.id === id);
  if (!existing) return null;
  const raw: Record<string, unknown> = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt };
  // Re-entering a real secret clears the redaction flag; type/secret changes re-derive the hash type.
  if ('secret' in patch && patch.secret !== REDACTED && !('redacted' in patch)) delete raw.redacted;
  if (('secret' in patch || 'type' in patch) && !('hashType' in patch)) delete raw.hashType;
  const next = normalizeCredential(raw);
  if (!next) return null;
  withHashType(next);
  if (hasSecret(next) && !next.redacted) {
    const key = credKey(next);
    if (list.some((c) => c.id !== id && !c.redacted && hasSecret(c) && credKey(c) === key)) return null;
  }
  return list.map((c) => (c.id === id ? next : c));
}

// ---------------------------------------------------------------------------
// Attempts / loot items list helpers
// ---------------------------------------------------------------------------

/**
 * Upserts on (credId, machineId, service), keeping the latest result/at. An attempt older than the stored
 * one is ignored (out-of-order writes cannot regress a "valid" result). Returns the resulting attempt.
 */
export function upsertAttemptInList(
  list: CredAttempt[],
  input: NewCredAttemptInput
): { list: CredAttempt[]; attempt: CredAttempt } {
  const at = isoOrNow(input.at);
  const idx = list.findIndex(
    (a) => a.credId === input.credId && a.machineId === input.machineId && a.service === input.service
  );
  if (idx === -1) {
    const id = input.id && !list.some((a) => a.id === input.id) ? input.id : newLootId('att');
    const attempt: CredAttempt = {
      id,
      credId: input.credId,
      machineId: input.machineId,
      service: input.service,
      result: input.result,
      at,
    };
    if (input.port !== undefined) attempt.port = input.port;
    return { list: [...list, attempt], attempt };
  }
  const existing = list[idx];
  const existingMs = Date.parse(existing.at);
  if (!Number.isNaN(existingMs) && Date.parse(at) < existingMs) return { list, attempt: existing };
  const attempt: CredAttempt = { ...existing, result: input.result, at };
  if (input.port !== undefined) attempt.port = input.port;
  return { list: list.map((a, i) => (i === idx ? attempt : a)), attempt };
}

export function buildLootItem(input: NewLootItemInput): LootItem {
  return normalizeLootItem({
    ...input,
    id: input.id ?? newLootId('loot'),
    createdAt: input.createdAt ?? new Date().toISOString(),
  }) as LootItem;
}

export function patchLootItem(list: LootItem[], id: string, patch: LootItemPatch): LootItem[] | null {
  const existing = list.find((l) => l.id === id);
  if (!existing) return null;
  const next = normalizeLootItem({ ...existing, ...patch, id: existing.id, createdAt: existing.createdAt });
  return next ? list.map((l) => (l.id === id ? next : l)) : null;
}

// ---------------------------------------------------------------------------
// Redaction (backup export with redactSecrets)
// ---------------------------------------------------------------------------

// Same heuristic the rest of the redacted export uses for free-text fields.
const scrubText = (v?: string): string | undefined => (v && v.toLowerCase().includes('pass') ? REDACTED : v);

export function redactCredential(c: Credential): Credential {
  const out: Credential = { ...c, secret: REDACTED, redacted: true };
  if (out.notes !== undefined) out.notes = scrubText(out.notes);
  return out;
}

export function redactLootItem(l: LootItem): LootItem {
  const out: LootItem = { ...l };
  // Free-form note/file bodies are arbitrary user text; never trust the heuristic for them.
  out.value = (l.category === 'note' || l.category === 'file' ? REDACTED : scrubText(l.value)) ?? '';
  if (out.notes !== undefined) out.notes = scrubText(out.notes);
  return out;
}

export function redactLootState(state: LootState): LootState {
  return {
    credentials: state.credentials.map(redactCredential),
    credAttempts: state.credAttempts,
    lootItems: state.lootItems.map(redactLootItem),
  };
}

// ---------------------------------------------------------------------------
// Backup import merge
// ---------------------------------------------------------------------------

/**
 * Additively merges backup loot into the current workspace (union, existing data wins). Returns null when
 * the backup carries none of the loot fields, so the caller leaves current data untouched.
 *
 * Collision rules (a backup can never destroy or downgrade a real secret):
 *  - same id already present: skip (existing wins); the one exception is a redacted placeholder that is
 *    upgraded in place by a real credential carrying the same id or the same principal.
 *  - redacted incoming credential: skipped when any credential shares its id or its principal
 *    (type + username + domain, secret ignored); otherwise added as a visible placeholder.
 *  - real incoming credential: skipped when a real credential with the same credKey exists.
 *  - credentials with an empty secret never collide by credKey (only by id, so re-imports stay idempotent).
 * Attempts follow their credential (ids remapped to the surviving credential) and upsert by triple.
 */
export function mergeImportedLoot(
  existing: LootState,
  incoming: { credentials?: unknown; credAttempts?: unknown; lootItems?: unknown }
): LootState | null {
  const hasCreds = Array.isArray(incoming.credentials);
  const hasAttempts = Array.isArray(incoming.credAttempts);
  const hasItems = Array.isArray(incoming.lootItems);
  if (!hasCreds && !hasAttempts && !hasItems) return null;

  const credentials = [...existing.credentials];
  const idMap = new Map<string, string>();

  for (const c of mapNormalized(incoming.credentials, normalizeCredential)) {
    const sameId = credentials.findIndex((x) => x.id === c.id);
    if (sameId !== -1) {
      if (credentials[sameId].redacted && !c.redacted && hasSecret(c)) credentials[sameId] = withHashType(c);
      idMap.set(c.id, c.id);
      continue;
    }
    if (c.redacted) {
      const twin = credentials.find((x) => credIdentity(x) === credIdentity(c));
      if (twin) {
        idMap.set(c.id, twin.id);
        continue;
      }
    } else if (hasSecret(c)) {
      const key = credKey(c);
      const dup = credentials.find((x) => !x.redacted && hasSecret(x) && credKey(x) === key);
      if (dup) {
        idMap.set(c.id, dup.id);
        continue;
      }
      const placeholderIdx = credentials.findIndex((x) => x.redacted && credIdentity(x) === credIdentity(c));
      if (placeholderIdx !== -1) {
        // Keep the placeholder's id so attempts already recorded against it stay attached.
        const placeholderId = credentials[placeholderIdx].id;
        idMap.set(c.id, placeholderId);
        credentials[placeholderIdx] = withHashType({ ...c, id: placeholderId });
        continue;
      }
    }
    credentials.push(withHashType(c));
  }

  let credAttempts = [...existing.credAttempts];
  const known = new Set(credentials.map((c) => c.id));
  for (const a of mapNormalized(incoming.credAttempts, normalizeCredAttempt)) {
    const credId = idMap.get(a.credId) ?? a.credId;
    if (!known.has(credId)) continue;
    credAttempts = upsertAttemptInList(credAttempts, { ...a, credId }).list;
  }

  const lootItems = [...existing.lootItems];
  for (const item of mapNormalized(incoming.lootItems, normalizeLootItem)) {
    if (!lootItems.some((x) => x.id === item.id)) lootItems.push(item);
  }

  return { credentials, credAttempts, lootItems };
}

// ---------------------------------------------------------------------------
// Load / save / migrate
// ---------------------------------------------------------------------------

/** Parses a stored v2 payload. Returns null for corrupt JSON or a schema newer than this build understands. */
export function parseLootPayload(raw: string): LootState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > LOOT_SCHEMA_VERSION) return null;
    return {
      credentials: mapNormalized(parsed.credentials, normalizeCredential),
      credAttempts: mapNormalized(parsed.credAttempts, normalizeCredAttempt),
      lootItems: mapNormalized(parsed.lootItems, normalizeLootItem),
    };
  } catch {
    return null;
  }
}

export function saveLootState(profileId: string, state: LootState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      schemaVersion: LOOT_SCHEMA_VERSION,
      credentials: state.credentials,
      credAttempts: state.credAttempts,
      lootItems: state.lootItems,
    };
    lootStorage.set(getLootStorageKey(profileId), JSON.stringify(payload));
  } catch (err) {
    console.warn('[ZeroBox] Failed to save credentials/loot to storage:', err);
  }
}

/**
 * Wipes a profile's loot for "reset all progress". Writes an empty v2 payload instead of removing the key:
 * a missing v2 key would re-trigger the lazy migration and resurrect data from the (kept) legacy keys.
 * The profile's plaintext legacy copy is removed too so a reset really removes the secrets.
 */
export function clearLootState(profileId: string): void {
  lootStorage.remove(getLegacyProfileLootKey(profileId));
  saveLootState(profileId, emptyLootState());
}

const LEGACY_CRED_CATEGORIES: Record<string, CredentialType> = {
  password: 'password',
  hash: 'hash',
  ssh_key: 'key',
  token: 'token',
};

const LEGACY_DEFAULT_TITLES: Record<string, string> = {
  flag: 'Custom Flag',
  service: 'Service Endpoint',
};

/**
 * Maps the old EvidenceVaultPage custom-loot array (VaultEvidenceItem[], newest first) to the v2 shape:
 * password/hash/ssh_key/token become Credentials, everything else becomes a LootItem. Credentials are
 * deduplicated by credKey with the earliest capture winning. The old shape already carries `username`
 * and `secret` separately, so no "user:secret" splitting is attempted (it would corrupt passwords that
 * contain a colon).
 */
export function migrateLegacyItems(items: unknown[]): LootState {
  const out = emptyLootState();
  for (const raw of [...items].reverse()) {
    if (!isRecord(raw)) continue;
    const category = typeof raw.category === 'string' ? raw.category : '';
    const targetId = optStr(raw.targetId);
    const machineId = targetId && targetId !== 'global' ? targetId : undefined;
    const createdAt = isoOrNow(raw.discoveredAt);
    const credType = LEGACY_CRED_CATEGORIES[category];
    if (credType) {
      const cred = buildCredential({
        id: optStr(raw.id),
        type: credType,
        username: typeof raw.username === 'string' ? raw.username : '',
        secret: typeof raw.secret === 'string' ? raw.secret : '',
        sourceMachineId: machineId,
        notes: optStr(raw.notes),
        createdAt,
      });
      if (!findDuplicateCredential(out.credentials, cred)) out.credentials.push(cred);
    } else {
      const item = normalizeLootItem({
        id: raw.id,
        category,
        title: optStr(raw.typeLabel) ?? LEGACY_DEFAULT_TITLES[category] ?? 'Custom Loot',
        value: raw.secret,
        username: raw.username,
        notes: raw.notes,
        machineId,
        createdAt,
      });
      if (item && !out.lootItems.some((x) => x.id === item.id)) out.lootItems.push(item);
    }
  }
  return out;
}

const parseLegacyArray = (raw: string): unknown[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * One-time, per-profile migration of the old page-level loot. Runs only while the profile has no v2 payload:
 *  1. the profile's own `zerobox_vault_custom_loot_v1_${pid}` key, else
 *  2. the legacy unscoped `zerobox_vault_custom_loot_v1` key, but only if no profile has claimed it yet
 *     (the claim marker is set, so exactly one profile ever receives it).
 * Writes the v2 payload (before the marker, so a crash can duplicate but never lose data) and keeps all
 * legacy keys. Returns the migrated state, or null when there was nothing to do (already migrated / no source).
 */
export function migrateLegacyLoot(profileId: string): LootState | null {
  if (typeof window === 'undefined') return null;
  const pid = profileId || 'guest';
  if (lootStorage.get(getLootStorageKey(pid)) !== null) return null;

  let source = lootStorage.get(getLegacyProfileLootKey(pid));
  let claimedLegacy = false;
  if (source === null && lootStorage.get(LEGACY_LOOT_CLAIMED_KEY) === null) {
    const legacy = lootStorage.get(LEGACY_LOOT_KEY);
    if (legacy !== null) {
      source = legacy;
      claimedLegacy = true;
    }
  }
  if (source === null) return null;

  const state = migrateLegacyItems(parseLegacyArray(source));
  saveLootState(pid, state);
  if (claimedLegacy) lootStorage.set(LEGACY_LOOT_CLAIMED_KEY, pid);
  return state;
}

/** Loads a profile's credentials/loot, lazily migrating legacy data on first access. Never throws. */
export function loadLootState(profileId: string): LootState {
  if (typeof window === 'undefined') return emptyLootState();
  const pid = profileId || 'guest';
  try {
    const key = getLootStorageKey(pid);
    const raw = lootStorage.get(key);
    if (raw !== null) {
      const parsed = parseLootPayload(raw);
      if (parsed) return parsed;
      // Corrupt or newer-schema payload: keep a copy, then reset so we neither crash nor re-migrate stale data.
      console.warn(`[ZeroBox] Unreadable loot payload in '${key}'. Quarantining and starting empty.`);
      lootStorage.set(`${key}_corrupted_backup_${Date.now()}`, raw);
      saveLootState(pid, emptyLootState());
      return emptyLootState();
    }
    return migrateLegacyLoot(pid) ?? emptyLootState();
  } catch (err) {
    console.warn('[ZeroBox] Failed to load credentials/loot from storage:', err);
    return emptyLootState();
  }
}
