import { describe, it, expect } from 'vitest';
import {
  isIgnoredVaultPath,
  parseObsidianVaultDirectory,
} from './directoryVaultImporter';

describe('directoryVaultImporter', () => {
  it('correctly uses isIgnoredVaultPath from zipVaultImporter', () => {
    expect(isIgnoredVaultPath('.obsidian/workspace.json')).toBe(true);
    expect(isIgnoredVaultPath('.git/HEAD')).toBe(true);
    expect(isIgnoredVaultPath('01 Recon/nmap.md')).toBe(false);
  });

  it('parses array of File objects and ignores non-markdown files', async () => {
    const mdFile1 = new File(
      ['---\ntitle: Enum Note\n---\n# Recon'],
      'enum.md',
      { type: 'text/markdown' }
    );
    Object.defineProperty(mdFile1, 'webkitRelativePath', {
      value: 'MyVault/01 Recon/enum.md',
    });

    const pngFile = new File(['fake-image-bytes'], 'diagram.png', {
      type: 'image/png',
    });
    Object.defineProperty(pngFile, 'webkitRelativePath', {
      value: 'MyVault/01 Recon/diagram.png',
    });

    const mdFile2 = new File(
      ['# Privesc note'],
      'privesc.markdown',
      { type: 'text/markdown' }
    );
    Object.defineProperty(mdFile2, 'webkitRelativePath', {
      value: 'MyVault/02 Priv/privesc.markdown',
    });

    const result = await parseObsidianVaultDirectory([mdFile1, pngFile, mdFile2]);
    expect(result.notes.length).toBe(2);
    expect(result.notes[0].filename).toBe('enum');
    expect(result.notes[1].filename).toBe('privesc');
  });

  it('throws an error if no markdown files are found in directory', async () => {
    const pngFile = new File(['fake-image-bytes'], 'diagram.png', {
      type: 'image/png',
    });
    Object.defineProperty(pngFile, 'webkitRelativePath', {
      value: 'Vault/diagram.png',
    });

    await expect(parseObsidianVaultDirectory([pngFile])).rejects.toThrow(
      'No markdown (.md or .markdown) notes were found in the selected directory.'
    );
  });
});
