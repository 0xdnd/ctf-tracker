import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inlineIndexedDbImages, blobToDataUrl } from './imageExportInliner';
import * as imageStore from './imageStore';

describe('imageExportInliner', () => {
  const profileId = 'default';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns original markdown when no zerobox-img scheme is present', async () => {
    const md = '# Executive Report\n\nNo screenshots here.';
    const result = await inlineIndexedDbImages(md, profileId);
    expect(result).toBe(md);
  });

  it('converts Blob to data URL correctly', async () => {
    const blob = new Blob(['sample-image-bytes'], { type: 'image/webp' });
    const dataUrl = await blobToDataUrl(blob);
    expect(dataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it('inlines indexeddb images with base64 data URLs', async () => {
    const fakeBlob = new Blob(['fake-png-bytes'], { type: 'image/webp' });
    vi.spyOn(imageStore, 'getImage').mockImplementation(async (_pid, id) => {
      if (id === 'img-123') return fakeBlob;
      return null;
    });

    const md = 'Here is the proof:\n\n![Foothold](zerobox-img://img-123)\n\nEnd of report.';
    const result = await inlineIndexedDbImages(md, profileId);

    expect(result).toContain('![Foothold](data:image/webp;base64,');
    expect(result).toContain('End of report.');
    expect(result).not.toContain('zerobox-img://img-123');
  });

  it('preserves reference when image is missing from IndexedDB', async () => {
    vi.spyOn(imageStore, 'getImage').mockResolvedValue(null);

    const md = 'Missing: ![Missing](zerobox-img://non-existent-id)';
    const result = await inlineIndexedDbImages(md, profileId);

    expect(result).toBe(md);
  });

  it('handles multiple images and repeated occurrences', async () => {
    const blobA = new Blob(['bytes-a'], { type: 'image/webp' });
    const blobB = new Blob(['bytes-b'], { type: 'image/webp' });

    vi.spyOn(imageStore, 'getImage').mockImplementation(async (_pid, id) => {
      if (id === 'img-a') return blobA;
      if (id === 'img-b') return blobB;
      return null;
    });

    const md = `![A1](zerobox-img://img-a) and ![B](zerobox-img://img-b) and ![A2](zerobox-img://img-a)`;
    const result = await inlineIndexedDbImages(md, profileId);

    expect(result).not.toContain('zerobox-img://img-a');
    expect(result).not.toContain('zerobox-img://img-b');
    expect(result).toContain('![A1](data:image/webp;base64,');
    expect(result).toContain('![B](data:image/webp;base64,');
    expect(result).toContain('![A2](data:image/webp;base64,');
  });

  it('caps inlined images at MAX_INLINE_IMAGES, leaving the rest intact', async () => {
    const { MAX_INLINE_IMAGES } = await import('./imageExportInliner');
    const blob = new Blob(['tiny'], { type: 'image/webp' });
    vi.spyOn(imageStore, 'getImage').mockResolvedValue(blob);

    const ids = Array.from({ length: MAX_INLINE_IMAGES + 5 }, (_, i) => `cap-${String(i).padStart(2, '0')}`);
    const md = ids.map((id) => `![x](zerobox-img://${id})`).join('\n');
    const result = await inlineIndexedDbImages(md, profileId);

    for (const id of ids.slice(0, MAX_INLINE_IMAGES)) {
      expect(result).not.toContain(`zerobox-img://${id})`);
    }
    for (const id of ids.slice(MAX_INLINE_IMAGES)) {
      expect(result).toContain(`zerobox-img://${id})`);
    }
  });

  it('degrades gracefully (no throw) when the total byte budget is exceeded', async () => {
    // ~1 MB blobs inline to ~1.3 MB data URLs; 10 of them exceed the 8 MB budget.
    const big = new Blob([new Uint8Array(1024 * 1024)], { type: 'image/webp' });
    vi.spyOn(imageStore, 'getImage').mockResolvedValue(big);

    const ids = Array.from({ length: 10 }, (_, i) => `big-${i}`);
    const md = ids.map((id) => `![x](zerobox-img://${id})`).join('\n');
    let result: string | undefined;
    await expect(
      (async () => {
        result = await inlineIndexedDbImages(md, profileId);
      })()
    ).resolves.toBeUndefined();
    expect(result).toContain('data:image/webp;base64,');
    // Budget exhausted: at least the last reference stays intact.
    expect(result).toContain('zerobox-img://');
  });
});
