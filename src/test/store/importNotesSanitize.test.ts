import { describe, it, expect } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';

describe('importNotesFromJson key sanitising', () => {
  it('drops __proto__, constructor and prototype keys from notes, and __proto__ from the wikilink map', async () => {
    // JSON.parse creates these as own properties, which is how a hostile file can carry them.
    const json =
      '{"notes":[{"id":"n1","title":"One","commands":[],"__proto__":{"polluted":true},"constructor":{"x":1}}],' +
      '"wikilinkMap":{"one":"n1","__proto__":"bad","constructor":"bad","prototype":"bad"}}';

    const res = await useCtfStore.getState().importNotesFromJson(json);

    expect(res).toEqual({ success: true, count: 1 });
    const { userNotes, userWikilinkMap } = useCtfStore.getState();
    expect(Object.keys(userWikilinkMap).sort()).toEqual(['constructor', 'one', 'prototype']);
    expect(Object.keys(userNotes[0])).not.toContain('__proto__');
    expect(Object.keys(userNotes[0])).not.toContain('constructor');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
