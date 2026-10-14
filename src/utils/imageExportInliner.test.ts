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
});
