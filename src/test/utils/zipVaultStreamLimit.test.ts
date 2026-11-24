import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';

// A tiny limit so a few KB of text can stand in for a zip bomb.
vi.mock('../../utils/importLimits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/importLimits')>()),
  MAX_ZIP_UNCOMPRESSED_BYTES: 20_000,
}));

import { parseObsidianVaultZip } from '../../utils/zipVaultImporter';
import { ImportLimitError } from '../../utils/importLimits';

/** Rewrites the uncompressed size in every central-directory record, as a malicious archive could. */
function lieAboutSize(bytes: Uint8Array, declared: number): Uint8Array {
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  for (let i = 0; i < out.length - 28; i++) {
    if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, declared, true);
  }
  return out;
}

describe('parseObsidianVaultZip size guard', () => {
  it('aborts while inflating when an entry is bigger than its header declares', async () => {
    const zip = new JSZip();
    zip.file('big.md', '# Big\n\n' + 'a'.repeat(200_000));
    const honest = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const forged = lieAboutSize(honest, 100);

    const err = await parseObsidianVaultZip(forged.buffer as ArrayBuffer).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImportLimitError);
    expect((err as Error).message).toMatch(/over the .* limit/);
  });

  it('still imports a small archive', async () => {
    const zip = new JSZip();
    zip.file('a.md', '# A\n\nHello café\n');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const result = await parseObsidianVaultZip(bytes.buffer as ArrayBuffer);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].rawMarkdown).toContain('Hello café');
  });
});
