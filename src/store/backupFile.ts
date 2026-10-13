/**
 * backupFile.ts
 * The downloadable backup (format 3.0.0) and its verified import. exportBackup() builds the synchronous core
 * (including the exam snapshot); this module adds what needs async work: the IndexedDB notes, optional images from
 * a registered provider, and the SHA-256 checksum (WebCrypto). The checksum is computed on the plaintext; the UI
 * encrypts afterwards. Import verifies the checksum before anything is applied.
 */
import { useCtfStore } from './useCtfStore';
import { dumpVaultForBackup, upsertVaultNotesFromBackup } from '../utils/indexedDbVault';
import { validateWorkspacePayload } from '../utils/workspaceStorage';
import { isSchemaWriteGated } from '../utils/schemaWriteGate';
import {
  BACKUP_CHECKSUM_MISMATCH_MESSAGE,
  BACKUP_CHECKSUM_UNAVAILABLE_MESSAGE,
  BACKUP_FORMAT_VERSION,
  computeBackupChecksum,
  isChecksumAvailable,
  verifyBackupChecksum,
} from '../utils/backupChecksum';

/** One stored image, JSON-serializable. The provider owns the shape beyond `id`. */
export type BackupImageRecord = { id: string } & Record<string, unknown>;

export interface BackupImageProvider {
  exportImages: () => Promise<BackupImageRecord[]>;
  restoreImages: (images: BackupImageRecord[]) => Promise<void>;
}

let imageProvider: BackupImageProvider | null = null;

/** Lets a later module put images into `indexedDb.images` and restore them. Returns an unregister function. */
export function registerBackupImageProvider(provider: BackupImageProvider | null): () => void {
  imageProvider = provider;
  return () => {
    if (imageProvider === provider) imageProvider = null;
  };
}

export const BACKUP_GATED_MESSAGE =
  'Writes are blocked in this tab (another tab is restoring or merging, or ZeroBox was updated). Reload and try again.';
const INVALID_MESSAGE = 'Invalid backup format. Ensure it contains a valid "machines" array.';
const MALFORMED_MESSAGE = 'Malformed JSON syntax. Please check the imported text.';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The object validateWorkspacePayload reads (it accepts a `{ data: {...} }` wrapper). */
const payloadRoot = (raw: unknown): Record<string, unknown> | null => {
  if (!isPlainObject(raw)) return null;
  return isPlainObject(raw.data) ? raw.data : raw;
};

/** True for text that parses as a 3.0.0 backup (what needs the async, verified import). */
export function isV3BackupText(text: string): boolean {
  try {
    return payloadRoot(JSON.parse(text))?.version === BACKUP_FORMAT_VERSION;
  } catch {
    return false;
  }
}

/**
 * The full 3.0.0 backup as pretty JSON: exportBackup() plus `indexedDb` and `checksum`. The checksum is left out
 * only when WebCrypto is unavailable (insecure context). Rejects when the vault cannot be read.
 */
export async function buildBackupFile(options?: { redactSecrets?: boolean }): Promise<string> {
  const core = JSON.parse(useCtfStore.getState().exportBackup(options)) as Record<string, unknown>;
  const redact = options?.redactSecrets === true;
  if (redact) delete core.examState; // exam answers/notes can hold secrets
  const vault = await dumpVaultForBackup();
  const images = !redact && imageProvider ? await imageProvider.exportImages() : undefined;
  // Round-trip through JSON so the checksum covers exactly what an importer will parse.
  const payload = JSON.parse(
    JSON.stringify({
      ...core,
      indexedDb: {
        ...(redact ? {} : { notes: vault.notes }),
        wikilinkMap: vault.wikilinkMap,
        ...(images ? { images } : {}),
      },
    })
  ) as Record<string, unknown>;
  if (isChecksumAvailable()) payload.checksum = await computeBackupChecksum(payload);
  return JSON.stringify(payload, null, 2);
}

export type BackupImportFailure = 'malformed' | 'invalid' | 'checksum' | 'unverifiable' | 'gated';

export type BackupImportResult =
  | { ok: true; verified: boolean; warnings: string[] }
  | { ok: false; reason: BackupImportFailure; message: string };

const fail = (reason: BackupImportFailure, message: string): BackupImportResult => ({ ok: false, reason, message });

/** Checks a 3.0.0 file's checksum without applying anything (the Merge path). Null when it may proceed. */
export async function checkBackupIntegrity(text: string): Promise<Extract<BackupImportResult, { ok: false }> | null> {
  let root: Record<string, unknown> | null;
  try {
    root = payloadRoot(JSON.parse(text));
  } catch {
    return null; // the caller's own parser reports malformed text
  }
  if (!root || root.version !== BACKUP_FORMAT_VERSION) return null;
  const verdict = await verifyBackupChecksum(root);
  if (verdict === 'mismatch') return { ok: false, reason: 'checksum', message: BACKUP_CHECKSUM_MISMATCH_MESSAGE };
  if (verdict === 'unavailable') return { ok: false, reason: 'unverifiable', message: BACKUP_CHECKSUM_UNAVAILABLE_MESSAGE };
  return null;
}

/**
 * Replace-imports a backup. 2.0.0 and older go straight to importBackup() exactly as before. A 3.0.0 file is
 * refused while this tab is write-gated (it also writes exam storage and IndexedDB), its checksum is verified
 * before anything changes, then the core and exam snapshot are applied and the vault notes (and images, when a
 * provider is registered) are upserted. A failure after the core was applied is returned as a warning.
 */
export async function importBackupFile(text: string): Promise<BackupImportResult> {
  const store = useCtfStore.getState;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('malformed', MALFORMED_MESSAGE);
  }
  const root = payloadRoot(raw);
  if (!root || root.version !== BACKUP_FORMAT_VERSION) {
    return store().importBackup(text) ? { ok: true, verified: false, warnings: [] } : fail('invalid', INVALID_MESSAGE);
  }

  if (isSchemaWriteGated()) return fail('gated', BACKUP_GATED_MESSAGE);
  const verdict = await verifyBackupChecksum(root);
  if (verdict === 'mismatch') return fail('checksum', BACKUP_CHECKSUM_MISMATCH_MESSAGE);
  if (verdict === 'unavailable') return fail('unverifiable', BACKUP_CHECKSUM_UNAVAILABLE_MESSAGE);
  if (isSchemaWriteGated()) return fail('gated', BACKUP_GATED_MESSAGE); // engaged while hashing

  const verified = verdict === 'verified';
  const applied = store().importBackup(text, verified ? { verifiedChecksum: root.checksum as string } : undefined);
  if (!applied) return fail('invalid', INVALID_MESSAGE);

  const warnings: string[] = [];
  const idb = validateWorkspacePayload(raw).data?.indexedDb;
  if (idb) {
    try {
      await upsertVaultNotesFromBackup(idb.notes, idb.wikilinkMap);
    } catch (err) {
      console.warn('[ZeroBox] Backup restore: vault notes could not be written to IndexedDB.', err);
      warnings.push('Notes from the backup could not be written to IndexedDB.');
    }
    if (idb.images?.length) {
      if (!imageProvider) {
        warnings.push(`This backup holds ${idb.images.length} images this version cannot restore yet.`);
      } else {
        try {
          await imageProvider.restoreImages(idb.images as BackupImageRecord[]);
        } catch (err) {
          console.warn('[ZeroBox] Backup restore: images could not be restored.', err);
          warnings.push('Images from the backup could not be restored.');
        }
      }
    }
  }
  return { ok: true, verified, warnings };
}
