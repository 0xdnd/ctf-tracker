import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';

// Small limits so the tests do not have to build a 200 MB archive.
vi.mock('../../utils/importLimits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/importLimits')>()),
  MAX_ZIP_ENTRIES: 5,
  MAX_ZIP_UNCOMPRESSED_BYTES: 1000,
}));

import { parseObsidianVaultZip } from '../../utils/zipVaultImporter';
import { ImportLimitError, assertJsonFileWithinLimit, MAX_JSON_IMPORT_BYTES } from '../../utils/importLimits';

const makeZip = async (files: Record<string, string>): Promise<ArrayBuffer> => {
  const zip = new JSZip();
  for (const [name, body] of Object.entries(files)) zip.file(name, body);
  return zip.generateAsync({ type: 'arraybuffer' });
};

describe('ZIP import limits', () => {
  it('rejects an archive with too many entries, with a friendly message', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 6; i++) files[`n${i}.md`] = '# n';
    await expect(parseObsidianVaultZip(await makeZip(files))).rejects.toThrow(ImportLimitError);
    await expect(parseObsidianVaultZip(await makeZip(files))).rejects.toThrow(/holds 6 entries/);
  });

  it('rejects an archive that unpacks to more than the total size limit', async () => {
    const zip = await makeZip({ 'big.md': '# big\n' + 'a'.repeat(5000) });
    await expect(parseObsidianVaultZip(zip)).rejects.toThrow(ImportLimitError);
    await expect(parseObsidianVaultZip(zip)).rejects.toThrow(/unpacks to/);
  });

  it('accepts an archive inside both limits', async () => {
    const result = await parseObsidianVaultZip(await makeZip({ 'a.md': '# A', 'b.md': '# B' }));
    expect(result.notes).toHaveLength(2);
  });
});

describe('JSON import limit', () => {
  it('rejects a file larger than the limit before it is read', () => {
    expect(() => assertJsonFileWithinLimit({ size: MAX_JSON_IMPORT_BYTES + 1 })).toThrow(ImportLimitError);
  });

  it('accepts a file exactly at the limit', () => {
    expect(() => assertJsonFileWithinLimit({ size: MAX_JSON_IMPORT_BYTES })).not.toThrow();
  });
});
