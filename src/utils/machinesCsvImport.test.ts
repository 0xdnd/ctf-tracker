import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Machine } from '../types';
import { useCtfStore } from '../store/useCtfStore';
import { buildMachinesCsv } from './machinesCsv';
import { toCsv } from './csv';
import {
  MAX_CSV_ROWS,
  type ImportStoreData,
  applyMachinesImport,
  detectColumns,
  parseMachinesCsv,
  planMachinesImport,
  toImportRows,
} from './machinesCsvImport';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const NOW = '2026-11-12T10:00:00.000Z';

const box = (over: Partial<Machine>): Machine => ({
  id: 'x', name: 'X', ip: '10.10.x.x', os: 'Linux', platform: 'HTB', difficulty: 'Easy', status: 'backlog',
  tags: [], certifications: [], timeSpentSeconds: 0,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', ...over,
});

const seed = (): Machine[] => [
  box({ id: 'htb-lame', name: 'Lame', tags: ['smb', 'cve'] }),
  box({ id: 'htb-forest', name: 'Forest', difficulty: 'Medium' }),
  box({
    id: 'htb-sauna', name: 'Sauna', status: 'completed', rootPwnedAt: '2025-03-04T00:00:00.000Z',
    quickNotes: 'kerberoast first', timeSpentSeconds: 3600, rating: 4,
  }),
  box({ id: 'thm-retro', name: 'Retro', platform: 'THM' }),
  box({ id: 'htb-retro', name: 'Retro', platform: 'HTB' }),
  box({ id: 'pg-lame', name: 'Lame', platform: 'PG' }),
  box({ id: 'custom-1-my-lab', name: 'My Lab', platform: 'Custom', isCustom: true, status: 'recon' }),
  box({ id: 'custom-2-evil', name: '=evil', platform: 'Custom', isCustom: true }),
];

const plan = (csv: string, machines: Machine[] = seed(), data: ImportStoreData = {}) => {
  const parsed = parseMachinesCsv(csv);
  if (!parsed.ok) throw new Error(parsed.error);
  return planMachinesImport(toImportRows(parsed.rows, detectColumns(parsed.headers)), machines, NOW, data);
};

describe('detectColumns', () => {
  it('finds the export headings', () => {
    const headers = ['Name', 'Platform', 'OS', 'Difficulty', 'Status', 'Tracks', 'User pwned at', 'Root pwned at', 'Updated at', 'Tags'];
    expect(detectColumns(headers)).toEqual({
      name: 0, platform: 1, os: 2, difficulty: 3, status: 4, userPwnedAt: 6, rootPwnedAt: 7, tags: 9,
    });
  });

  it('accepts aliases in any case', () => {
    const map = detectColumns(['MACHINE', 'Source', 'state', ' Operating System ', 'labels']);
    expect(map).toMatchObject({ name: 0, platform: 1, status: 2, os: 3, tags: 4, difficulty: -1 });
  });

  it('reports no Name column when none matches', () => {
    expect(detectColumns(['Host', 'Notes']).name).toBe(-1);
  });
});

describe('parseMachinesCsv', () => {
  it('rejects empty files and files with only headings', () => {
    expect(parseMachinesCsv('')).toMatchObject({ ok: false });
    expect(parseMachinesCsv('Name,Status\r\n')).toMatchObject({ ok: false });
  });

  it('skips blank rows and sniffs a semicolon delimiter', () => {
    const r = parseMachinesCsv('Name;Status\n\nLame;done\n');
    expect(r).toEqual({ ok: true, headers: ['Name', 'Status'], rows: [['Lame', 'done']] });
  });

  it('rejects more than the row limit and accepts exactly the limit', () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => [`Box${i}`]);
    expect(parseMachinesCsv(toCsv(['Name'], rows(MAX_CSV_ROWS + 1)))).toMatchObject({ ok: false, error: expect.stringContaining('5,000') });
    expect(parseMachinesCsv(toCsv(['Name'], rows(MAX_CSV_ROWS)))).toMatchObject({ ok: true });
  });
});

describe('toImportRows', () => {
  it('maps status, os, difficulty, dates and tags, and removes the export formula guard', () => {
    const csv = toCsv(
      ['Name', 'Status', 'OS', 'Difficulty', 'User pwned at', 'Root pwned at', 'Tags'],
      [
        ['=evil', 'Done', 'windows', 'very easy', '2025-01-02', '2025-01-03T04:05:06Z', 'ad; smb, ad'],
        ['Odd', 'maybe', 'plan9', 'brutal', 'yesterday', '03/04/2025', ''],
      ]
    );
    const parsed = parseMachinesCsv(csv);
    if (!parsed.ok) throw new Error(parsed.error);
    const [a, b] = toImportRows(parsed.rows, detectColumns(parsed.headers));
    expect(a).toMatchObject({
      line: 2, name: '=evil', status: 'completed', statusUnknown: false, os: 'Windows', difficulty: 'Very Easy',
      userPwnedAt: '2025-01-02T00:00:00.000Z', rootPwnedAt: '2025-01-03T04:05:06.000Z', tags: ['ad', 'smb'],
    });
    expect(b).toMatchObject({
      line: 3, status: undefined, statusUnknown: true, os: 'Other', difficulty: 'Medium', userPwnedAt: undefined, rootPwnedAt: undefined, tags: [],
    });
  });
});

describe('planMachinesImport', () => {
  it('links a catalog machine that has no progress, with the status and dates from the file', () => {
    const p = plan('Name,Status,Root pwned at,Tags\nLame,root,2025-06-01,smb; web\n');
    expect(p.link).toEqual([
      {
        line: 2, machineId: 'htb-lame', name: 'Lame', platform: 'HTB', status: 'root',
        userPwnedAt: '2025-06-01T00:00:00.000Z', rootPwnedAt: '2025-06-01T00:00:00.000Z', addTags: ['web'],
      },
    ]);
    expect(p.add).toHaveLength(0);
    expect(p.skipped).toHaveLength(0);
  });

  it('uses the platform column to pick between machines with the same name', () => {
    const p = plan('Name,Platform,Status\nRetro,THM,root\nLame,PG,foothold\n');
    expect(p.link.map((l) => l.machineId)).toEqual(['thm-retro', 'pg-lame']);
  });

  it('does not match across platforms: a PG row never links to an HTB-only box', () => {
    const p = plan('Name,Platform,Status\nForest,PG,root\n');
    expect(p.link).toHaveLength(0);
    expect(p.add).toHaveLength(1);
    expect(p.add[0].draft).toMatchObject({ name: 'Forest', platform: 'PG', status: 'root' });
  });

  it('skips machines that already have progress, whatever the file says', () => {
    const p = plan('Name,Status\nSauna,backlog\n');
    expect(p.skipped).toEqual([{ line: 2, name: 'Sauna', platform: undefined, reason: 'Already tracked: your progress is kept' }]);
    expect(p.link).toHaveLength(0);
    expect(p.add).toHaveLength(0);
  });

  it('skips a custom machine of the same name, even one flagged with a formula guard', () => {
    const p = plan("Name,Platform\nMy Lab,Custom\n'=evil,Custom\nmy lab,\n");
    expect(p.skipped.map((s) => s.line)).toEqual([2, 3, 4]);
    expect(p.add).toHaveLength(0);
  });

  it('adds an unknown machine as custom with the file values, and falls back for unknown values', () => {
    const p = plan('Name,Platform,OS,Difficulty,Status,Tags,User pwned at\nNew Box,HTB,Windows,Hard,wat,"a, b",2025-02-02\n');
    expect(p.add).toHaveLength(1);
    expect(p.add[0].statusUnknown).toBe(true);
    expect(p.add[0].draft).toMatchObject({
      name: 'New Box', platform: 'HTB', os: 'Windows', difficulty: 'Hard', status: 'backlog', tags: ['a', 'b'], timeSpentSeconds: 0,
    });
    expect(p.add[0].draft.userPwnedAt).toBeUndefined();
  });

  it('puts the file dates on a new foothold or root machine, and falls back to now when there are none', () => {
    const p = plan('Name,Status,User pwned at\nA Box,foothold,2025-02-02\nB Box,done,\n');
    expect(p.add[0].draft).toMatchObject({ userPwnedAt: '2025-02-02T00:00:00.000Z', rootPwnedAt: undefined });
    expect(p.add[1].draft).toMatchObject({ userPwnedAt: NOW, rootPwnedAt: NOW });
  });

  it('does not treat a close spelling as a match', () => {
    const p = plan('Name\nForestry\n');
    expect(p.link).toHaveLength(0);
    expect(p.add.map((a) => a.draft.name)).toEqual(['Forestry']);
  });

  it('a loose spelling earlier in the file does not take the real machine from a later row', () => {
    const p = plan('Name,Status\nForestry,root\nForest,root\n');
    expect(p.add.map((a) => a.draft.name)).toEqual(['Forestry']);
    expect(p.link.map((l) => [l.line, l.machineId])).toEqual([[3, 'htb-forest']]);
    const reversed = plan('Name,Status\nForest,root\nForestry,root\n');
    expect(reversed.add.map((a) => a.draft.name)).toEqual(['Forestry']);
    expect(reversed.link.map((l) => l.machineId)).toEqual(['htb-forest']);
  });

  it('adds one custom per name even when the platform differs, so ids cannot collide', () => {
    const p = plan('Name,Platform\nNew Box,HTB\nNew Box,THM\nnew-box,\n');
    expect(p.add).toHaveLength(1);
    expect(p.skipped.map((s) => [s.line, s.reason])).toEqual([[3, 'Repeated in this file'], [4, 'Repeated in this file']]);
  });

  it('reports rows with errors and keeps going', () => {
    const p = plan('Name,Status\n,root\n!!!,root\nForest,root\n');
    expect(p.errors.map((e) => [e.line, e.message])).toEqual([
      [2, 'Name is empty.'],
      [3, 'Name has no letters or digits.'],
    ]);
    expect(p.link.map((l) => l.machineId)).toEqual(['htb-forest']);
  });

  it('skips repeated rows and rows for the same machine', () => {
    const p = plan('Name,Platform,Status\nForest,,root\nforest,,root\nHTB - Forest,,root\nForest,HTB,root\nNew,,\nnew,,\n');
    expect(p.link.map((l) => l.line)).toEqual([2]);
    expect(p.skipped.map((s) => s.line)).toEqual([3, 4, 5, 7]);
    expect(p.add).toHaveLength(1);
  });

  it('skips a catalog machine with nothing to apply', () => {
    const p = plan('Name,Status,Tags\nForest,backlog,\nLame,backlog,smb\n');
    expect(p.link).toHaveLength(0);
    expect(p.skipped.map((s) => s.reason)).toEqual(['Already in your tracker', 'Already in your tracker']);
  });
});

describe('applyMachinesImport', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCtfStore.setState({
      machines: seed(), isCatalogLoaded: true, loadCatalog: vi.fn(), soundEnabled: false,
      lootItems: [], credentials: [], credAttempts: [], activitySessions: [],
    } as never);
  });

  it('links, adds and skips, and never touches an existing machine with progress', () => {
    const before = useCtfStore.getState().machines;
    const sauna = before.find((m) => m.id === 'htb-sauna');
    const csv = toCsv(
      ['Name', 'Status', 'Root pwned at'],
      [
        ['Sauna', 'backlog', ''],
        ['My Lab', 'root', '2025-01-01'],
        ['Forest', 'root', '2025-06-01'],
        ['Brand New', 'foothold', ''],
      ]
    );
    const result = applyMachinesImport(plan(csv, before));
    expect(result).toEqual({ linked: 1, added: 1, skipped: 2 });

    const after = useCtfStore.getState().machines;
    expect(after.find((m) => m.id === 'htb-sauna')).toBe(sauna);
    expect(after.find((m) => m.id === 'custom-1-my-lab')).toBe(before.find((m) => m.id === 'custom-1-my-lab'));
    expect(after.find((m) => m.id === 'htb-forest')).toMatchObject({ status: 'root', rootPwnedAt: '2025-06-01T00:00:00.000Z' });
    expect(after.find((m) => m.name === 'Brand New')).toMatchObject({ status: 'foothold', isCustom: true, platform: 'Custom' });
    expect(after).toHaveLength(before.length + 1);
  });

  it('leaves a linked machine alone when it gained progress after the preview', () => {
    const p = plan('Name,Status\nForest,root\n');
    useCtfStore.setState((s) => ({ machines: s.machines.map((m) => (m.id === 'htb-forest' ? { ...m, quickNotes: 'mine' } : m)) }));
    const result = applyMachinesImport(p);
    expect(result).toEqual({ linked: 0, added: 0, skipped: 1 });
    expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-forest')).toMatchObject({ status: 'backlog', quickNotes: 'mine' });
  });

  describe('machines that only hold user data the progress check does not count', () => {
    const csv = 'Name,Status\nForest,root\n';
    const attempt = (data: ImportStoreData, edit?: (m: Machine) => Machine) => {
      const before = useCtfStore.getState().machines.map((m) => (m.id === 'htb-forest' && edit ? edit(m) : m));
      useCtfStore.setState({ machines: before, ...data } as never);
      const forest = before.find((m) => m.id === 'htb-forest');
      const p = plan(csv, before, data);
      expect(p.link).toHaveLength(0);
      expect(p.skipped.map((s) => s.line)).toEqual([2]);
      applyMachinesImport(p);
      expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-forest')).toBe(forest);
    };

    it('skips a machine with only a loot item', () => {
      attempt({ lootItems: [{ id: 'l1', category: 'note', title: 't', value: 'v', machineId: 'htb-forest', createdAt: NOW }] });
    });
    it('skips a machine with only a credential attempt', () => {
      attempt({ credAttempts: [{ id: 'a1', credId: 'c1', machineId: 'htb-forest', service: 'smb', result: 'tried', at: NOW }] });
    });
    it('skips a machine that only a credential points at', () => {
      attempt({ credentials: [{ id: 'c1', type: 'password', username: 'u', secret: 's', sourceMachineId: 'htb-forest', createdAt: NOW }] });
    });
    it('skips a machine with only a user-set IP', () => {
      attempt({}, (m) => ({ ...m, ip: '10.10.10.99' }));
    });
    it('skips a machine with only an activity session', () => {
      attempt({ activitySessions: [{ id: 's1', machineId: 'htb-forest', machineName: 'Forest', date: '2026-01-01', durationSeconds: 60, type: 'session' }] });
    });
    it('skips a machine with only a writeup link or a review schedule', () => {
      attempt({}, (m) => ({ ...m, writeupUrl: 'https://example.com/w' }));
      attempt({}, (m) => ({ ...m, nextReviewAt: 1 }));
    });
    it('a machine that gained loot after the preview is not written on apply', () => {
      const p = plan(csv);
      useCtfStore.setState({ lootItems: [{ id: 'l1', category: 'note', title: 't', value: 'v', machineId: 'htb-forest', createdAt: NOW }] } as never);
      expect(applyMachinesImport(p)).toEqual({ linked: 0, added: 0, skipped: 1 });
      expect(useCtfStore.getState().machines.find((m) => m.id === 'htb-forest')?.status).toBe('backlog');
    });
  });

  it('a tag-only link gets a new updatedAt and counts as an unexported change', () => {
    const before = useCtfStore.getState().unexportedChangesCount || 0;
    const result = applyMachinesImport(plan('Name,Tags\nForest,web\n'));
    expect(result).toEqual({ linked: 1, added: 0, skipped: 0 });
    const forest = useCtfStore.getState().machines.find((m) => m.id === 'htb-forest');
    expect(forest?.tags).toEqual(['web']);
    expect(forest?.updatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    expect(useCtfStore.getState().unexportedChangesCount).toBe(before + 1);
  });

  it('adds a large file in one write with unique ids', () => {
    const before = useCtfStore.getState().machines;
    const rows = Array.from({ length: 2000 }, (_, i) => [`Bulk Box ${i}`, 'foothold']);
    const result = applyMachinesImport(plan(toCsv(['Name', 'Status'], rows), before));
    expect(result).toEqual({ linked: 0, added: 2000, skipped: 0 });
    const after = useCtfStore.getState().machines;
    expect(after).toHaveLength(before.length + 2000);
    expect(new Set(after.map((m) => m.id)).size).toBe(after.length);
    expect(after[0].name).toBe('Bulk Box 0');
  });

  it('addCustomMachines keeps ids unique even for the same name in one batch', () => {
    const draft: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Same', ip: '', os: 'Linux', platform: 'Custom', difficulty: 'Easy', status: 'backlog', tags: [], certifications: [], timeSpentSeconds: 0,
    };
    useCtfStore.getState().addCustomMachines([draft, draft]);
    const ids = useCtfStore.getState().machines.filter((m) => m.name === 'Same').map((m) => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('an empty plan writes nothing', () => {
    const before = useCtfStore.getState().machines;
    applyMachinesImport(plan('Name\n!!!\n'));
    expect(useCtfStore.getState().machines).toBe(before);
  });
});

describe('export then import', () => {
  it('re-importing the app export into the same tracker changes nothing', () => {
    useCtfStore.setState({ machines: seed(), isCatalogLoaded: true, loadCatalog: vi.fn(), soundEnabled: false } as never);
    const before = useCtfStore.getState().machines;
    const snapshot = structuredClone(before);

    const p = plan(buildMachinesCsv(before), before);
    expect(p.link).toHaveLength(0);
    expect(p.add).toHaveLength(0);
    expect(p.errors).toHaveLength(0);
    expect(p.skipped).toHaveLength(before.length);

    const result = applyMachinesImport(p);
    expect(result).toEqual({ linked: 0, added: 0, skipped: before.length });
    expect(useCtfStore.getState().machines).toBe(before);
    expect(useCtfStore.getState().machines).toEqual(snapshot);
  });

  it('an export from another tracker brings over only what this one lacks', () => {
    const theirs = [
      box({ id: 'htb-forest', name: 'Forest', status: 'root', rootPwnedAt: '2025-05-05T00:00:00.000Z', difficulty: 'Medium' }),
      box({ id: 'custom-9-side', name: 'Side Quest', platform: 'Custom', os: 'Windows', difficulty: 'Hard', status: 'foothold', userPwnedAt: '2025-04-04T00:00:00.000Z', tags: ['ad'] }),
    ];
    const p = plan(buildMachinesCsv(theirs), seed());
    expect(p.link.map((l) => [l.machineId, l.status, l.rootPwnedAt])).toEqual([['htb-forest', 'root', '2025-05-05T00:00:00.000Z']]);
    expect(p.add[0].draft).toMatchObject({
      name: 'Side Quest', platform: 'Custom', os: 'Windows', difficulty: 'Hard', status: 'foothold', userPwnedAt: '2025-04-04T00:00:00.000Z', tags: ['ad'],
    });
  });
});
