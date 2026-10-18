/**
 * Pasted writeup screenshots, kept as compressed blobs in their own IndexedDB database so they never
 * touch the notes vault (zerobox_vault_db). Records are keyed `<profileId>/<imageId>`; the writeup
 * references them as `zerobox-img://<imageId>`.
 */

const DB_NAME = 'zerobox_images_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export const IMAGE_URL_SCHEME = 'zerobox-img://';

interface ImageRecord {
  blob: Blob;
  createdAt: number;
}

const keyOf = (profileId: string, id: string) => `${profileId}/${id}`;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open image database'));
    } catch (err) {
      reject(err);
    }
  });
}

/** Run one request in its own transaction; resolves after the transaction settles, closes the connection. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let result: T;
    const done = (err?: unknown) => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch { /* already closed */ }
      if (err) reject(err);
      else resolve(result);
    };
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const req = run(tx.objectStore(STORE_NAME));
      req.onsuccess = () => { result = req.result; };
      req.onerror = () => done(req.error || new Error('Image request failed'));
      tx.oncomplete = () => done();
      tx.onerror = () => done(tx.error || new Error('Image transaction failed'));
      tx.onabort = () => done(tx.error || new Error('Image transaction aborted'));
    } catch (err) {
      done(err);
    }
  });
}

/** A fresh image id; only [A-Za-z0-9-] so it round-trips through the Markdown `zerobox-img://` URL. */
export function newImageId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function putImage(profileId: string, id: string, blob: Blob): Promise<void> {
  const record: ImageRecord = { blob, createdAt: Date.now() };
  await withStore('readwrite', (s) => s.put(record, keyOf(profileId, id)));
}

export async function getImage(profileId: string, id: string): Promise<Blob | null> {
  const record = await withStore<ImageRecord | undefined>('readonly', (s) => s.get(keyOf(profileId, id)));
  return record?.blob ?? null;
}

export async function deleteImage(profileId: string, id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(keyOf(profileId, id)));
}

/** Image ids stored for one profile. */
export async function listImages(profileId: string): Promise<string[]> {
  const prefix = `${profileId}/`;
  const range = IDBKeyRange.bound(prefix, `${prefix}￿`);
  const keys = await withStore<IDBValidKey[]>('readonly', (s) => s.getAllKeys(range));
  return keys.map((k) => String(k).slice(prefix.length));
}

const loadBitmap = async (blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> => {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(blob);
    return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close?.() };
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** DoS guard: pasted/dropped images larger than this are rejected before decoding. */
export const MAX_PASTE_BYTES = 15 * 1024 * 1024;
/** DoS guard: canvas output height is clamped to this (scaled proportionally). */
export const MAX_IMAGE_HEIGHT = 4096;

/**
 * Downscale to `maxWidth` (never upscale) and re-encode as WebP; falls back to PNG when the
 * browser cannot encode WebP (it then returns a different type than requested).
 * Rejects blobs larger than MAX_PASTE_BYTES and clamps output height to MAX_IMAGE_HEIGHT.
 * Throws on oversize so callers (e.g. WriteupStudio handlePaste, which already catches) can warn.
 */
export async function compressToWebp(blob: Blob, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  if (blob.size > MAX_PASTE_BYTES) {
    throw new Error('Image too large (max 15 MB)');
  }
  const { source, width, height, release } = await loadBitmap(blob);
  try {
    if (!width || !height) throw new Error('Image has no dimensions');
    const scale = Math.min(
      width > maxWidth ? maxWidth / width : 1,
      height > MAX_IMAGE_HEIGHT ? MAX_IMAGE_HEIGHT / height : 1
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const webp = await canvasToBlob(canvas, 'image/webp', quality);
    if (webp && webp.type === 'image/webp') return webp;
    const png = await canvasToBlob(canvas, 'image/png');
    if (!png) throw new Error('Could not encode image');
    return png;
  } finally {
    release();
  }
}
