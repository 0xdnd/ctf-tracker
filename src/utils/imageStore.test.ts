import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { putImage, getImage, deleteImage, listImages, compressToWebp, newImageId } from './imageStore';

/**
 * In-memory IndexedDB double (fake-indexeddb is not a dependency): one object store with
 * put / get / delete / getAllKeys(range) and transaction oncomplete.
 */
function installFakeDb() {
  const opened: Array<{ name: string; version?: number }> = [];
  const records = new Map<string, unknown>();
  let closed = 0;

  const makeDb = () => ({
    objectStoreNames: { contains: () => false },
    createObjectStore: () => ({}),
    close: () => { closed++; },
    transaction: () => {
      const ops: Array<() => void> = [];
      const tx = {
        error: null as unknown,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: () => {
          const request = (run: (req: { result: unknown }) => void) => {
            const req = { result: undefined as unknown, error: null, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
            ops.push(() => { run(req); req.onsuccess?.(); });
            return req;
          };
          return {
            put: (value: unknown, key: string) => request(() => { records.set(key, value); }),
            get: (key: string) => request((r) => { r.result = records.get(key); }),
            delete: (key: string) => request(() => { records.delete(key); }),
            getAllKeys: (range: { lower: string; upper: string }) =>
              request((r) => {
                r.result = [...records.keys()].filter((k) => k >= range.lower && k <= range.upper).sort();
              }),
          };
        },
      };
      setTimeout(() => { ops.forEach((op) => op()); tx.oncomplete?.(); }, 0);
      return tx;
    },
  });

  vi.stubGlobal('indexedDB', {
    open: (name: string, version?: number) => {
      opened.push({ name, version });
      const request = {
        result: null as unknown,
        error: null,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => {
        request.result = makeDb();
        request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    },
  });
  vi.stubGlobal('IDBKeyRange', { bound: (lower: string, upper: string) => ({ lower, upper }) });
  return { opened, records, closedCount: () => closed };
}

describe('imageStore', () => {
  let db: ReturnType<typeof installFakeDb>;
  beforeEach(() => { db = installFakeDb(); });
  afterEach(() => vi.unstubAllGlobals());

  it('uses its own database at version 1, never the vault db', async () => {
    await putImage('p1', 'a', new Blob(['x']));
    expect(db.opened).toEqual([{ name: 'zerobox_images_db', version: 1 }]);
  });

  it('round-trips a blob keyed by profile and image id, and closes each connection', async () => {
    const blob = new Blob(['pixels'], { type: 'image/webp' });
    await putImage('p1', 'img-1', blob);
    expect([...db.records.keys()]).toEqual(['p1/img-1']);
    expect(await getImage('p1', 'img-1')).toBe(blob);
    expect(db.closedCount()).toBe(2);
  });

  it('isolates profiles and returns null for a missing image', async () => {
    await putImage('p1', 'img-1', new Blob(['a']));
    expect(await getImage('p2', 'img-1')).toBeNull();
    expect(await getImage('p1', 'nope')).toBeNull();
  });

  it('deletes an image', async () => {
    await putImage('p1', 'img-1', new Blob(['a']));
    await deleteImage('p1', 'img-1');
    expect(await getImage('p1', 'img-1')).toBeNull();
  });

  it('lists only the ids of the requested profile', async () => {
    await putImage('p1', 'b', new Blob(['1']));
    await putImage('p1', 'a', new Blob(['2']));
    await putImage('p10', 'c', new Blob(['3']));
    await putImage('p2', 'd', new Blob(['4']));
    expect(await listImages('p1')).toEqual(['a', 'b']);
    expect(await listImages('nobody')).toEqual([]);
  });

  it('rejects when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(getImage('p1', 'a')).rejects.toThrow(/not supported/);
  });

  it('generates ids that are safe inside a zerobox-img:// URL', () => {
    const a = newImageId();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newImageId()).not.toBe(a);
  });
});

describe('compressToWebp', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubCanvas = (encoded: (type: string) => Blob | null) => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb: (b: Blob | null) => void, type: string) => cb(encoded(type)),
    };
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'canvas' ? (canvas as unknown as HTMLCanvasElement) : realCreate(tag)) as typeof document.createElement);
    return { canvas, drawImage };
  };

  const stubBitmap = (width: number, height: number) => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
    return close;
  };

  it('downscales wide images to maxWidth, keeps aspect ratio, and encodes webp', async () => {
    const close = stubBitmap(3840, 2160);
    const { canvas, drawImage } = stubCanvas((type) => new Blob(['w'], { type }));
    const out = await compressToWebp(new Blob(['src']));
    expect(out.type).toBe('image/webp');
    expect([canvas.width, canvas.height]).toEqual([1920, 1080]);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalled();
  });

  it('never upscales small images', async () => {
    stubBitmap(400, 300);
    const { canvas } = stubCanvas((type) => new Blob(['w'], { type }));
    await compressToWebp(new Blob(['src']));
    expect([canvas.width, canvas.height]).toEqual([400, 300]);
  });

  it('falls back to png when webp encoding is unsupported', async () => {
    stubBitmap(100, 100);
    // Browsers without webp encoding silently return a PNG blob for the webp request.
    stubCanvas(() => new Blob(['p'], { type: 'image/png' }));
    const out = await compressToWebp(new Blob(['src']), 1920, 0.5);
    expect(out.type).toBe('image/png');
  });

  it('rejects when the image cannot be encoded at all', async () => {
    stubBitmap(100, 100);
    stubCanvas(() => null);
    await expect(compressToWebp(new Blob(['src']))).rejects.toThrow(/encode/);
  });
});
