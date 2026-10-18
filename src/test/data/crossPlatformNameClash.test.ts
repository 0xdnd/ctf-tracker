import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { matchCandidateNamesToCatalog } from '../../utils/bulkPwnImporter';
import { mergeMachinesWithCatalog } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const box = (over: Partial<Machine>): Machine => ({
  id: 'x',
  name: 'X',
  ip: '10.10.x.x',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...over,
});

// THM listed first for Retro, HTB first for Reset: mirrors the real catalog order.
const catalog = (): Machine[] => [
  box({ id: 'thm-retro', name: 'Retro', platform: 'THM', os: 'Windows', difficulty: 'Hard' }),
  box({ id: 'htb-reset', name: 'Reset', platform: 'HTB' }),
  box({ id: 'htb-retro', name: 'Retro', platform: 'HTB', os: 'Windows' }),
  box({ id: 'thm-resetui', name: 'Reset', platform: 'THM' }),
  // Pre-existing pair on main: THM Blue listed before HTB Blue, so HTB Blue won name-only lookups.
  box({ id: 'thm-blue', name: 'Blue', platform: 'THM' }),
  box({ id: 'htb-blue', name: 'Blue', platform: 'HTB', os: 'Windows' }),
];

describe('cross-platform name clashes (Retro, Watcher, Reset, Compiled)', () => {
  it('the real catalog lists each clashing name once per platform', () => {
    for (const name of ['Retro', 'Watcher', 'Reset', 'Compiled']) {
      const platforms = INITIAL_MACHINES.filter((m) => m.name === name).map((m) => m.platform).sort();
      expect(platforms, name).toEqual(['HTB', 'THM']);
    }
  });

  describe('bulk pwn importer', () => {
    const matchOne = (raw: string) => matchCandidateNamesToCatalog([raw], catalog()).allMatches[0]?.machineId;

    it('uses the platform named in the candidate prefix', () => {
      expect(matchOne('HTB - Retro')).toBe('htb-retro');
      expect(matchOne('[THM] Retro')).toBe('thm-retro');
      expect(matchOne('tryhackme: Reset')).toBe('thm-resetui');
      expect(matchOne('hackthebox Reset')).toBe('htb-reset');
    });

    it('matches an exact catalog id before the shared name', () => {
      expect(matchOne('htb-retro')).toBe('htb-retro');
      expect(matchOne('thm-retro')).toBe('thm-retro');
    });

    it('falls back to the first row in catalog order for the new pairs, deterministically', () => {
      expect(matchOne('Retro')).toBe('thm-retro');
      expect(matchOne('Reset')).toBe('htb-reset');
    });

    it("keeps main's winner (HTB) for a pre-existing pair like Blue, and shows the platform", () => {
      const [match] = matchCandidateNamesToCatalog(['Blue'], catalog()).allMatches;
      expect(match.machineId).toBe('htb-blue');
      expect(match.platform).toBe('HTB');
      expect(matchOne('[THM] Blue')).toBe('thm-blue');
    });
  });

  describe('mergeMachinesWithCatalog', () => {
    // The stored row is folded into the catalog row it matched, replacing it; report which catalog id it took.
    const mergedRow = (stored: Partial<Machine>) => {
      const row = { ...box({ status: 'completed', timeSpentSeconds: 77 }), ...stored } as Machine;
      const out = new Set(mergeMachinesWithCatalog([row], false, catalog()).map((m) => m.id));
      if (catalog().some((c) => c.id === row.id)) return [row.id];
      return catalog().map((c) => c.id).filter((id) => !out.has(id));
    };

    it('a legacy row without a platform stays on the THM row, not the HTB one', () => {
      const legacy = { id: 'legacy-retro', name: 'Retro', platform: undefined as unknown as Machine['platform'] };
      expect(mergedRow(legacy)).toEqual(['thm-retro']);
      const reset = { id: 'legacy-reset', name: 'Reset', platform: undefined as unknown as Machine['platform'] };
      expect(mergedRow(reset)).toEqual(['thm-resetui']);
    });

    it('a legacy platform-less "Blue" with an unprefixed id still resolves to htb-blue, as on main', () => {
      const legacy = { id: 'blue-old', name: 'Blue', platform: undefined as unknown as Machine['platform'] };
      expect(mergedRow(legacy)).toEqual(['htb-blue']);
    });

    it('never overwrites existing thm-blue progress', () => {
      const thmBlue = { ...box({ id: 'thm-blue', name: 'Blue', platform: 'THM', status: 'completed', timeSpentSeconds: 4242 }) };
      const legacy = { ...box({ id: 'blue-old', name: 'Blue', status: 'foothold', timeSpentSeconds: 77 }), platform: undefined as unknown as Machine['platform'] };
      const out = mergeMachinesWithCatalog([thmBlue, legacy], false, catalog());
      const thm = out.filter((m) => m.platform === 'THM' && m.name === 'Blue');
      expect(thm).toHaveLength(1);
      expect(thm[0].timeSpentSeconds).toBe(4242);
      expect(thm[0].status).toBe('completed');
      // The legacy row was folded into htb-blue (that catalog row was replaced), not into thm-blue.
      const ids = new Set(out.map((m) => m.id));
      expect(catalog().map((c) => c.id).filter((id) => !ids.has(id))).toEqual(['htb-blue']);
    });

    it('prefers an exact id, then the stored platform (or a legacy htb-/thm- id prefix)', () => {
      expect(mergedRow({ id: 'htb-retro', name: 'Retro', platform: 'HTB' })).toEqual(['htb-retro']);
      expect(mergedRow({ id: 'old-retro', name: 'Retro', platform: 'HTB' })).toEqual(['htb-retro']);
      const prefixed = { id: 'htb-retro-old', name: 'Retro', platform: undefined as unknown as Machine['platform'] };
      expect(mergedRow(prefixed)).toEqual(['htb-retro']);
    });
  });
});
