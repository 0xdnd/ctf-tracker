import { describe, it, expect } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';
import { parseBackupIndexedDb, validateWorkspacePayload } from '../../utils/workspaceStorage';

// A note can be titled "constructor" or "prototype", so those are valid wikilink map keys. Only __proto__ is unsafe.
describe('wikilink maps keep Object.prototype-named titles', () => {
  it('JSON notes import keeps constructor/prototype keys and drops only __proto__', async () => {
    const json =
      '{"notes":[{"id":"n1","title":"constructor","commands":[]}],' +
      '"wikilinkMap":{"constructor":"n1","prototype":"n1","one":"n1","__proto__":"bad","num":5}}';

    const res = await useCtfStore.getState().importNotesFromJson(json);

    expect(res).toEqual({ success: true, count: 1 });
    const map = useCtfStore.getState().userWikilinkMap;
    expect(Object.keys(map).sort()).toEqual(['constructor', 'one', 'prototype']);
    expect(Object.getOwnPropertyDescriptor(map, 'constructor')?.value).toBe('n1');
    expect(Object.getPrototypeOf(map)).toBeNull();
    expect(({} as Record<string, unknown>).bad).toBeUndefined();
  });

  it('backup indexedDb.wikilinkMap keeps them too', () => {
    const parsed = parseBackupIndexedDb(
      JSON.parse('{"notes":[],"wikilinkMap":{"constructor":"n1","__proto__":"bad","prototype":"n2"}}')
    );
    expect(Object.keys(parsed?.wikilinkMap ?? {}).sort()).toEqual(['constructor', 'prototype']);
    expect(Object.getPrototypeOf(parsed?.wikilinkMap)).toBeNull();
  });

  it('workspace userWikilinkMap keeps them too', () => {
    const res = validateWorkspacePayload(
      JSON.parse('{"machines":[],"userWikilinkMap":{"constructor":"n1","__proto__":"bad"}}')
    );
    const map = res.data?.userWikilinkMap ?? {};
    expect(Object.keys(map)).toEqual(['constructor']);
    expect(Object.getPrototypeOf(map)).toBeNull();
  });
});
