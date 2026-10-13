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

export const imageBackupProvider: BackupImageProvider = {
  async exportImages() {
    const profileId = activeProfile();
    const out: BackupImageRecord[] = [];
    for (const id of await listImages(profileId)) {
      const blob = await getImage(profileId, id);
      if (blob) out.push({ id, mime: blob.type || 'image/webp', data: await blobToBase64(blob) });
    }
    return out;
  },
  async restoreImages(images) {
    const profileId = activeProfile();
    for (const rec of images) {
      if (typeof rec.id !== 'string' || typeof rec.data !== 'string') continue;
      const mime = typeof rec.mime === 'string' ? rec.mime : 'image/webp';
      await putImage(profileId, rec.id, base64ToBlob(rec.data, mime));
    }
  },
};
