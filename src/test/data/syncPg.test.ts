import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM script without types
import { buildRows, guardRows, protectedRows, normalizeDoc, collectLabs, hostsFromConfig, pickSearchKey, fetchLabs } from '../../../scripts/sync-pg.mjs';

type Lab = { name: string; tier: string; difficulty: string; os_family: string; content_id: string };
type Row = { id: string; name: string; certifications: string[] };
const lab = (name: string, content_id: string): Lab => ({ name, tier: 'Practice', difficulty: 'Intermediate', os_family: 'Linux', content_id });
const old = (id: string, name: string): Record<string, unknown> => ({
  id, name, ip: '10.10.x.x', os: 'Linux', platform: 'PG', difficulty: 'Medium', status: 'backlog', tags: ['PG-Practice'],
  certifications: [], roomUrl: 'https://portal.offsec.com/labs/practice', writeupUrl: '', hint: '', timeSpentSeconds: 0,
  createdAt: '2026-10-28T00:00:00.000Z', updatedAt: '2026-10-28T00:00:00.000Z',
});

describe('sync-pg: ids that already shipped stay protected', () => {
  it('keeps a renamed lab on its id and keeps a lab that leaves the list', () => {
    const legacy = [old('pg-base', 'Base')];
    const first = buildRows([lab('Base', '1'), lab('Alpha', '2'), lab('Beta', '3')], legacy, {}, new Set(), []);
    const alphaId = (first.rows as Row[]).find((r) => r.name === 'Alpha')!.id;
    const betaId = (first.rows as Row[]).find((r) => r.name === 'Beta')!.id;

    const shipped = protectedRows(legacy, first.rows);
    const second = buildRows([lab('Base', '1'), lab('Alpha Renamed', '2')], shipped, first.idMap, new Set(), []);
    const byId = new Map((second.rows as Row[]).map((r) => [r.id, r]));
    expect(byId.has(alphaId)).toBe(true);
    expect(byId.get(alphaId)!.name).toBe('Alpha'); // existing rows keep their name
    expect((second.rows as Row[]).filter((r) => r.name.startsWith('Alpha'))).toHaveLength(1);
    expect(byId.has(betaId)).toBe(true);
    expect(second.stats.legacyKept).toContain('Beta');
    expect(guardRows(second.rows, shipped)).toBeNull();
    expect(guardRows((second.rows as Row[]).filter((r) => r.id !== betaId), shipped)).toMatch(/missing/);
  });
});

const doc = (name: string, groups: string[], extra: Record<string, unknown> = {}) => ({
  name, difficulty: 2, level: '200', primaryOsName: 'Ubuntu', primaryOsFamily: 'Linux', points: 20, completionCount: 5,
  contentCode: 'PG_Play_1', releaseDate: '2024-05-06T00:00:00Z', description: 'd', contentId: 77,
  labGroups: groups.map((g) => ({ name: g })), ...extra,
});

describe('sync-pg: live fetch helpers (no network)', () => {
  it('normalises a document to the raw record shape and selects tiers from the lab groups', () => {
    const [rec] = normalizeDoc(doc('Alpha', ['Offensive Cyber Range', 'Play']));
    expect(Object.keys(rec)).toEqual(['name', 'difficulty', 'difficulty_level', 'level', 'os', 'os_family', 'xp', 'solves', 'release_date', 'description', 'groups', 'content_code', 'content_id', 'source', 'tier']);
    expect(rec).toMatchObject({ difficulty: 'Intermediate', difficulty_level: 2, os_family: 'Linux', xp: 20, release_date: '2024-05-06', content_id: '77', tier: 'Play' });
    expect(normalizeDoc(doc('Both', ['Play', 'Practice'])).map((r: { tier: string }) => r.tier)).toEqual(['Play', 'Practice']);
    expect(normalizeDoc(doc('Other', ['Offensive Cyber Range']))).toEqual([]);
  });

  it('dedupes by content id and tier and sorts by tier then name', () => {
    const out = collectLabs([doc('b', ['Practice'], { contentId: 2 }), doc('a', ['Play'], { contentId: 1 }), doc('a', ['Play'], { contentId: 1 })]);
    expect(out.map((r: { name: string; tier: string }) => r.tier + ':' + r.name)).toEqual(['Play:a', 'Practice:b']);
  });

  it('reads hosts and the visibility key', () => {
    expect(hostsFromConfig({ TYPESENSE_CONFIG: { nearestNode: { host: 'n' }, nodes: [{ host: 'n' }, { host: 'm' }] } })).toEqual(['n', 'm']);
    expect(() => hostsFromConfig({})).toThrow(/host/);
    expect(pickSearchKey([{ collection: 'all-content', apiKeys: [{ type: 'other', key: 'x' }, { type: 'visibility', key: 'k' }] }])).toBe('k');
    expect(() => pickSearchKey([])).toThrow(/key/);
  });

  it('pages through the search endpoint and falls back to the next host', async () => {
    const calls: string[] = [];
    const fake = async (url: string) => {
      calls.push(url);
      if (url.endsWith('/config.json')) return { TYPESENSE_CONFIG: { nodes: [{ host: 'bad' }, { host: 'good' }] } };
      if (url.includes('scoped-search-keys')) return [{ collection: 'all-content', apiKeys: [{ type: 'visibility', key: 'k' }] }];
      if (url.includes('//bad/')) throw new Error('down');
      const page = new URL(url).searchParams.get('page');
      return { found: 251, hits: [{ document: doc('Lab' + page, ['Play'], { contentId: Number(page) }) }] };
    };
    const labs = await fetchLabs(fake, async () => {});
    expect(labs.map((r: { name: string }) => r.name)).toEqual(['Lab1', 'Lab2']);
    await expect(fetchLabs(async (u: string) => { if (u.endsWith('/config.json')) return { TYPESENSE_CONFIG: { nodes: [{ host: 'bad' }] } }; if (u.includes('scoped')) return [{ collection: 'all-content', apiKeys: [{ type: 'visibility', key: 'k' }] }]; throw new Error('down'); }, async () => {})).rejects.toThrow(/all search hosts failed/);
  });
});
