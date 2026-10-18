/**
 * Backup image provider: puts the active profile's pasted writeup images (imageStore) into the backup as
 * base64 data and restores them on import. Optional by design: no images means nothing is exported or written.
 */
import { useCtfStore } from '../store/useCtfStore';
import { getImage, listImages, putImage } from './imageStore';
import type { BackupImageProvider, BackupImageRecord } from '../store/backupFile';

const activeProfile = () => useCtfStore.getState().currentProfileId || 'guest';

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const base64ToBlob = (data: string, mime: string): Blob => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

/** Restore/export DoS guards: bounded count and payload size, no backup format change. */
export const MAX_BACKUP_IMAGES = 50;
/** Max base64 chars per image on restore (~7.5 MB of raw bytes). */
export const MAX_BACKUP_IMAGE_DATA_CHARS = 10 * 1024 * 1024;
/** Max total raw bytes exported into a backup file. */
export const MAX_BACKUP_EXPORT_TOTAL_BYTES = 50 * 1024 * 1024;
const ALLOWED_BACKUP_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const isBase64Like = (data: string): boolean => {
  if (!data) return false;
  const stripped = data.replace(/\s+/g, '');
  if (!stripped || stripped.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(stripped);
};

export const imageBackupProvider: BackupImageProvider = {
  async exportImages() {
    const profileId = activeProfile();
    const out: BackupImageRecord[] = [];
    const ids = await listImages(profileId);
    if (ids.length > MAX_BACKUP_IMAGES) {
      console.warn(
        `[backupImageProvider] Capping exported images to ${MAX_BACKUP_IMAGES} of ${ids.length}.`
      );
    }
    let totalBytes = 0;
    for (const id of ids.slice(0, MAX_BACKUP_IMAGES)) {
      const blob = await getImage(profileId, id);
      if (!blob) continue;
      if (totalBytes + blob.size > MAX_BACKUP_EXPORT_TOTAL_BYTES) {
        console.warn(
          `[backupImageProvider] Export budget exceeded (${MAX_BACKUP_EXPORT_TOTAL_BYTES} bytes); skipping remaining images.`
        );
        break;
      }
      totalBytes += blob.size;
      out.push({ id, mime: blob.type || 'image/webp', data: await blobToBase64(blob) });
    }
    return out;
  },
  async restoreImages(images) {
    const profileId = activeProfile();
    if (!Array.isArray(images)) throw new Error('Invalid image backup payload');
    if (images.length > MAX_BACKUP_IMAGES) {
      throw new Error(`Image backup holds too many images (max ${MAX_BACKUP_IMAGES})`);
    }
    // Phase 1: validate + decode everything before any write, so a failure
    // leaves the store untouched (atomic restore, no partial writes).
    // Records missing a string id/data are legacy-tolerant skips (older backups
    // may carry non-image rows); records that DO carry image payloads but are
    // corrupt (bad mime, oversize, undecodable base64) abort the whole restore.
    const pending: { id: string; blob: Blob }[] = [];
    for (const rec of images) {
      if (typeof rec?.id !== 'string' || typeof rec?.data !== 'string') continue;
      const id = rec.id;
      const data = rec.data;
      if (!id) throw new Error('Image record has an empty id');
      if (data.length > MAX_BACKUP_IMAGE_DATA_CHARS) {
        throw new Error(`Image ${id} exceeds the 10 MB backup limit`);
      }
      let mime: string;
      if (typeof rec.mime === 'string' && rec.mime) {
        if (!ALLOWED_BACKUP_MIMES.has(rec.mime)) {
          throw new Error(`Image ${id} has an unsupported mime type`);
        }
        mime = rec.mime;
      } else if (isBase64Like(data)) {
        mime = 'image/webp';
      } else {
        throw new Error(`Image ${id} has a missing mime type and corrupt data`);
      }
      let blob: Blob;
      try {
        blob = base64ToBlob(data, mime);
      } catch {
        throw new Error(`Image ${id} has corrupt base64 data`);
      }
      pending.push({ id, blob });
    }
    // Phase 2: all records validated — now write.
    for (const { id, blob } of pending) {
      await putImage(profileId, id, blob);
    }
  },
};
