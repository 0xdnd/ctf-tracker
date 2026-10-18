import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFakeIndexedDb } from '../exam/fakeIndexedDb';
import { loadDeepProfileData } from '../../utils/indexedDbDeepStorage';

afterEach(() => vi.unstubAllGlobals());

describe('loadDeepProfileData tells "no record" from "could not read"', () => {
  it('resolves null when the profile has no deep record', async () => {
    installFakeIndexedDb();
    await expect(loadDeepProfileData('nobody')).resolves.toBeNull();
  });

  it('rejects when the database cannot be opened', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        const req: { error: Error; onerror: (() => void) | null } = { error: new Error('open failed'), onerror: null };
        setTimeout(() => req.onerror?.(), 0);
        return req;
      },
    });
    await expect(loadDeepProfileData('guest')).rejects.toThrow('open failed');
  });
});
