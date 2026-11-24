import { describe, it, expect } from 'vitest';
import { parseObsidianRawItems } from '../../utils/zipVaultImporter';

const item = (path: string, markdown: string) => ({ path, getText: async () => markdown });

describe('vault import wikilink map', () => {
  it('does not resolve a link to an inherited Object property', async () => {
    const result = await parseObsidianRawItems([item('a.md', '# A\n\nSee [[constructor]] and [[__proto__]].\n')]);
    expect(result.notes[0].outgoingWikilinks).toEqual([]);
  });

  it('can map notes titled like Object.prototype members', async () => {
    const result = await parseObsidianRawItems([
      item('one.md', '---\ntitle: constructor\n---\nBody\n'),
      item('two.md', '# Two\n\n[[constructor]]\n'),
    ]);
    expect(Object.getPrototypeOf(result.wikilinkMap)).toBeNull();
    const two = result.notes.find((n) => n.filename === 'two');
    const one = result.notes.find((n) => n.filename === 'one');
    expect(two?.outgoingWikilinks).toEqual([one?.id]);
  });
});
