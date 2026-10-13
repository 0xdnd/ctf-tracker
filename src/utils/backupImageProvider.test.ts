import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, Blob>();
vi.mock('./imageStore', () => ({
  listImages: vi.fn(async (p: string) =>
    [...store.keys()].filter((k) => k.startsWith(`${p}/`)).map((k) => k.slice(p.length + 1))
  ),
  getImage: vi.fn(async (p: string, id: string) => store.get(`${p}/${id}`) ?? null),
  putImage: vi.fn(async (p: string, id: string, blob: Blob) => {
    store.set(`${p}/${id}`, blob);
  }),
}));

import { imageBackupProvider } from './backupImageProvider';
import { useCtfStore } from '../store/useCtfStore';

const readBytes = (blob: Blob) =>
  new Promise<number[]>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(Array.from(new Uint8Array(r.result as ArrayBuffer)));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });

describe('backup image provider', () => {
  beforeEach(() => {
    store.clear();
    useCtfStore.setState({ currentProfileId: 'p1' } as never);
  });

  it('exports nothing when the profile has no images', async () => {
    store.set('other/x', new Blob(['zz'], { type: 'image/png' }));
    expect(await imageBackupProvider.exportImages()).toEqual([]);
  });

  it('round-trips the active profile images as base64 with their mime type', async () => {
    store.set('p1/a', new Blob([new Uint8Array([0, 1, 2, 250, 255])], { type: 'image/webp' }));
    store.set('other/b', new Blob(['no'], { type: 'image/png' }));
    const exported = await imageBackupProvider.exportImages();
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ id: 'a', mime: 'image/webp' });
    expect(typeof exported[0].data).toBe('string');

    store.clear();
    useCtfStore.setState({ currentProfileId: 'p2' } as never);
    await imageBackupProvider.restoreImages(JSON.parse(JSON.stringify(exported)));
    const restored = store.get('p2/a');
    expect(restored?.type).toBe('image/webp');
    expect(await readBytes(restored as Blob)).toEqual([0, 1, 2, 250, 255]);
  });

  it('skips malformed records on restore', async () => {
    await imageBackupProvider.restoreImages([{ id: 'bad' }, { id: 'ok', data: btoa('hi') }]);
    expect([...store.keys()]).toEqual(['p1/ok']);
  });
});
