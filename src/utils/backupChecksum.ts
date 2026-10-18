/**
 * backupChecksum.ts
 * Integrity checksum of a backup v3 file: SHA-256 (WebCrypto) over a canonical JSON of the payload with the
 * `checksum` field removed. Canonical = object keys sorted recursively, array order kept, no whitespace, so the
 * value does not depend on key order or pretty-printing. It is computed on the plaintext, before backupCrypto
 * encrypts the file. A checksum detects corruption and hand edits; it is not a signature (anyone can recompute it).
 */

export const BACKUP_FORMAT_VERSION = '3.0.0';

export const BACKUP_CHECKSUM_MISMATCH_MESSAGE =
  'Checksum mismatch: this backup was changed or corrupted after it was exported. Nothing was imported.';
export const BACKUP_CHECKSUM_UNAVAILABLE_MESSAGE =
  'This backup carries a checksum, but this page cannot verify it (it is not in a secure context). Open ZeroBox over HTTPS or on localhost and import again. Nothing was imported.';

/** Keys sorted recursively. Null-prototype objects keep a literal `__proto__` key as data instead of a prototype. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export const canonicalJson = (value: unknown): string => JSON.stringify(sortKeysDeep(value)) ?? 'null';

export const isChecksumAvailable = (): boolean =>
  typeof globalThis.crypto?.subtle?.digest === 'function' && typeof TextEncoder !== 'undefined';

/** SHA-256 hex of the canonical payload without its `checksum` field. Rejects when WebCrypto is unavailable. */
export async function computeBackupChecksum(payload: Record<string, unknown>): Promise<string> {
  if (!isChecksumAvailable()) throw new Error('WebCrypto is unavailable');
  const { checksum: _omit, ...rest } = payload;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(rest)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type BackupChecksumVerdict = 'verified' | 'absent' | 'mismatch' | 'unavailable';

/** 'absent': no checksum to check (a 3.0.0 core from exportBackup() or a sync file). */
export async function verifyBackupChecksum(payload: Record<string, unknown>): Promise<BackupChecksumVerdict> {
  const declared = payload.checksum;
  if (declared === undefined) return 'absent';
  if (typeof declared !== 'string' || !/^[0-9a-f]{64}$/.test(declared)) return 'mismatch';
  if (!isChecksumAvailable()) return 'unavailable';
  return (await computeBackupChecksum(payload)) === declared ? 'verified' : 'mismatch';
}
