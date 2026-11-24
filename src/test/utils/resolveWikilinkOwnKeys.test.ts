import { beforeEach, describe, expect, it } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { resolveWikilink } from '../../utils/obsidianManualUtils';

describe('resolveWikilink only reads own keys of the wikilink map', () => {
  beforeEach(() => {
    useCtfStore.setState({ userWikilinkMap: {} });
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'])('[[%s]] does not resolve to an Object.prototype member', (name) => {
    const out = resolveWikilink(name, []);
    expect(out.exists).toBe(false);
    expect(out.targetNoteId).toBeUndefined();
  });

  it('still resolves real keys in a non-empty map, including a note literally titled "constructor"', () => {
    useCtfStore.setState({ userWikilinkMap: { nmap: 'note-1', constructor: 'note-2' } });
    expect(resolveWikilink('Nmap', [])).toMatchObject({ exists: true, targetNoteId: 'note-1' });
    expect(resolveWikilink('constructor', [])).toMatchObject({ exists: true, targetNoteId: 'note-2' });
    expect(resolveWikilink('toString', []).exists).toBe(false);
  });
});
