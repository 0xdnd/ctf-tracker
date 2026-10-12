import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Machine } from '../types';
import {
  coversMachine,
  losesProgress,
  machineFingerprint,
  mergeWorkspaces,
  resolveSyncBaseline,
  type SyncBaseline,
  type SyncMergeSummary,
  type SyncWorkspace,
} from './syncMerge';

/** Applying the result would change nothing (re-importing the same file). */
const isNoopMerge = (s: SyncMergeSummary): boolean => Object.values(s).every((n) => n === 0);

const T = (h: number) => new Date(Date.UTC(2026, 9, 1) + h * 3_600_000).toISOString(); // hours after 2026-10-01Z
const CATALOG_TS = '2024-01-01T00:00:00.000Z';

const machine = (id: string, extra: Partial<Machine> = {}): Machine =>
  ({
    id,
    name: id,
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: CATALOG_TS,
    updatedAt: CATALOG_TS,
    ...extra,
  }) as Machine;

const ws = (machines: Machine[], extra: Partial<SyncWorkspace> = {}): SyncWorkspace => ({ machines, ...extra });
const byId = (list: Machine[], id: string) => list.find((m) => m.id === id);

/** Both devices last synced at 10:00; every edit after that is "new" on its side. */
const BASE: SyncBaseline = { localBase: T(10), remoteBase: T(10) };

describe('mergeWorkspaces: machines', () => {
  it('disjoint edits: each side keeps the machine it changed', () => {
    const local = ws([
      machine('htb-a', { status: 'root', rootFlag: 'r', updatedAt: T(11) }),
      machine('htb-b', { status: 'recon', updatedAt: T(9) }),
    ]);
    const remote = ws([
      machine('htb-a', { status: 'recon', updatedAt: T(9) }),
      machine('htb-b', { status: 'foothold', userFlag: 'u', updatedAt: T(12) }),
    ]);
    const { merged, conflicts, summary } = mergeWorkspaces(local, remote, BASE);
    expect(conflicts).toEqual([]);
    expect(byId(merged.machines, 'htb-a')!.status).toBe('root');
    expect(byId(merged.machines, 'htb-b')!.status).toBe('foothold');
    expect(summary.updated).toBe(1);
  });

  it('the same machine edited on both sides is a conflict and nothing is chosen for it', () => {
    const l = machine('htb-a', { status: 'foothold', quickNotes: 'local notes', updatedAt: T(11) });
    const r = machine('htb-a', { status: 'foothold', quickNotes: 'remote notes', updatedAt: T(12) });
    const { conflicts, merged } = mergeWorkspaces(ws([l]), ws([r]), BASE);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      id: 'htb-a',
      local: { status: 'foothold', notesChars: 11 },
      incoming: { status: 'foothold', notesChars: 12 },
    });
    expect(byId(merged.machines, 'htb-a')).toBe(l); // placeholder is local, but the caller must not write
  });

  it('a conflict is applied exactly as resolved', () => {
    const l = machine('htb-a', { status: 'root', rootFlag: 'x', updatedAt: T(11) });
    const r = machine('htb-a', { status: 'foothold', quickNotes: 'remote', updatedAt: T(12) });
    const incoming = mergeWorkspaces(ws([l]), ws([r]), BASE, { resolutions: { 'htb-a': 'incoming' } });
    expect(incoming.conflicts).toEqual([]);
    expect(incoming.summary.conflictsResolved).toBe(1);
    expect(byId(incoming.merged.machines, 'htb-a')!.status).toBe('foothold');
    const kept = mergeWorkspaces(ws([l]), ws([r]), BASE, { resolutions: { 'htb-a': 'local' } });
    expect(byId(kept.merged.machines, 'htb-a')).toBe(l);
  });

  it('both changed but one side is a superset: no conflict, the superset wins', () => {
    const l = machine('htb-a', { status: 'foothold', userFlag: 'u', updatedAt: T(11) });
    const r = machine('htb-a', { status: 'root', userFlag: 'u', rootFlag: 'r', updatedAt: T(12) });
    const res = mergeWorkspaces(ws([l]), ws([r]), BASE);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.rootFlag).toBe('r');
    const back = mergeWorkspaces(ws([r]), ws([l]), BASE);
    expect(back.conflicts).toEqual([]);
    expect(byId(back.merged.machines, 'htb-a')).toBe(r);
  });

  it('only the incoming side changed but it would downgrade local progress: conflict (invariant 1)', () => {
    const l = machine('htb-a', { status: 'root', rootFlag: 'r', updatedAt: T(9) });
    const r = machine('htb-a', { status: 'recon', updatedAt: T(12) });
    const { conflicts } = mergeWorkspaces(ws([l]), ws([r]), BASE);
    expect(conflicts.map((c) => c.id)).toEqual(['htb-a']);
  });

  it('a pristine local catalog row adopts incoming progress; empty incoming never replaces local work', () => {
    const local = ws([machine('htb-a'), machine('htb-b', { status: 'root', rootFlag: 'r', updatedAt: T(9) })]);
    const remote = ws([machine('htb-a', { status: 'root', updatedAt: T(12) }), machine('htb-b', { updatedAt: T(12) })]);
    const res = mergeWorkspaces(local, remote, { localBase: null, remoteBase: null });
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.status).toBe('root');
    expect(byId(res.merged.machines, 'htb-b')!.status).toBe('root');
  });

  it('a machine only in the file is added; pristine catalog rows only in the file are skipped', () => {
    const remote = ws([
      machine('custom-1-box', { platform: 'Custom', isCustom: true, updatedAt: T(12) }),
      machine('htb-zzz'),
    ]);
    const res = mergeWorkspaces(ws([]), remote, BASE);
    expect(res.merged.machines.map((m) => m.id)).toEqual(['custom-1-box']);
    expect(res.summary.added).toBe(1);
  });
});

describe('mergeWorkspaces: deletions (tombstones)', () => {
  const custom = (h: number, extra: Partial<Machine> = {}) =>
    machine('custom-9-box', { platform: 'Custom', isCustom: true, status: 'recon', updatedAt: T(h), ...extra });

  it('deleted here after the other side edited it: stays deleted', () => {
    const local = ws([], { deletedMachineIds: [{ id: 'custom-9-box', deletedAt: T(13) }] });
    const res = mergeWorkspaces(local, ws([custom(12)]), BASE);
    expect(res.merged.machines).toEqual([]);
    expect(res.merged.deletedMachineIds.map((t) => t.id)).toEqual(['custom-9-box']);
  });

  it('deleted here before the other side edited it: the edit brings it back and the tombstone goes', () => {
    const local = ws([], { deletedMachineIds: [{ id: 'custom-9-box', deletedAt: T(11) }] });
    const res = mergeWorkspaces(local, ws([custom(12)]), BASE);
    expect(res.merged.machines.map((m) => m.id)).toEqual(['custom-9-box']);
    expect(res.merged.deletedMachineIds).toEqual([]);
  });

  it('deleted on the other side after the local edit: removed here', () => {
    const remote = ws([], { deletedMachineIds: [{ id: 'custom-9-box', deletedAt: T(13) }] });
    const res = mergeWorkspaces(ws([custom(12, { quickNotes: 'x' })]), remote, BASE);
    expect(res.merged.machines).toEqual([]);
    expect(res.summary.removed).toBe(1);
    expect(res.merged.deletedMachineIds.map((t) => t.id)).toEqual(['custom-9-box']);
  });

  it('deleted on the other side before the local edit: kept here', () => {
    const remote = ws([], { deletedMachineIds: [{ id: 'custom-9-box', deletedAt: T(11) }] });
    const res = mergeWorkspaces(ws([custom(12)]), remote, BASE);
    expect(res.merged.machines.map((m) => m.id)).toEqual(['custom-9-box']);
    expect(res.merged.deletedMachineIds).toEqual([]);
  });

  it('expired tombstones are pruned', () => {
    const now = Date.parse(T(12));
    const local = ws([], { deletedMachineIds: [{ id: 'old', deletedAt: new Date(now - 181 * 86_400_000).toISOString() }] });
    expect(mergeWorkspaces(local, ws([]), BASE, { now }).merged.deletedMachineIds).toEqual([]);
  });
});

describe('mergeWorkspaces: idempotency (invariant 4)', () => {
  it('merging the same file twice changes nothing the second time', () => {
    const local = ws(
      [machine('htb-a', { status: 'root', updatedAt: T(11) }), machine('custom-1-x', { platform: 'Custom', updatedAt: T(11) })],
      {
        customNotes: [{ id: 'n1', title: 'n1', rawMarkdown: 'a', dateModified: T(11) } as never],
        activitySessions: [{ id: 's1', machineId: 'htb-a', machineName: 'a', date: '2026-10-01', durationSeconds: 5, type: 'root' }],
      }
    );
    const remote = ws(
      [machine('htb-b', { status: 'foothold', updatedAt: T(12) }), machine('custom-2-y', { platform: 'Custom', updatedAt: T(12) })],
      {
        deviceId: 'dev-remote',
        syncedAt: T(12),
        deletedMachineIds: [{ id: 'custom-1-x', deletedAt: T(12) }],
        customNotes: [{ id: 'n2', title: 'n2', rawMarkdown: 'b', dateModified: T(12) } as never],
        activitySessions: [{ id: 's2', machineId: 'htb-b', machineName: 'b', date: '2026-10-01', durationSeconds: 9, type: 'session' }],
        graphEdges: [{ id: 'e1', sourceId: 'htb-a', targetId: 'htb-b', type: 'pivot-ssh', status: 'potential', createdAt: T(12) }],
        credentials: [{ id: 'c1', type: 'password', username: 'u', secret: 's', createdAt: T(12) }],
      }
    );
    const first = mergeWorkspaces(local, remote, BASE);
    expect(first.conflicts).toEqual([]);
    expect(isNoopMerge(first.summary)).toBe(false);
    const afterFirst = { ...local, ...first.merged };
    const second = mergeWorkspaces(afterFirst, remote, { localBase: BASE.localBase, remoteBase: remote.syncedAt! });
    expect(second.conflicts).toEqual([]);
    expect(isNoopMerge(second.summary)).toBe(true);
    expect(second.merged).toEqual(first.merged);
  });

  it('re-merging a file after keeping the local side of a conflict does not ask again', () => {
    const l = machine('htb-a', { status: 'foothold', quickNotes: 'mine', updatedAt: T(11) });
    const r = machine('htb-a', { status: 'foothold', quickNotes: 'theirs', updatedAt: T(12) });
    const first = mergeWorkspaces(ws([l]), ws([r]), BASE, { resolutions: { 'htb-a': 'local' } });
    const second = mergeWorkspaces(ws(first.merged.machines), ws([r]), { localBase: T(10), remoteBase: T(12) });
    expect(second.conflicts).toEqual([]);
    expect(byId(second.merged.machines, 'htb-a')!.quickNotes).toBe('mine');
  });
});

describe('mergeWorkspaces: redacted files and loot', () => {
  it('redacted flags and loot secrets never overwrite real local values', () => {
    const local = ws([machine('htb-a', { status: 'foothold', userFlag: 'HTB{real}', updatedAt: T(9) })], {
      credentials: [{ id: 'c1', type: 'password', username: 'admin', secret: 'S3cret!', createdAt: T(9) }],
      lootItems: [{ id: 'l1', category: 'note', title: 'keys', value: 'real body', createdAt: T(9) }],
    });
    const remote = ws([machine('htb-a', { status: 'root', userFlag: '[REDACTED]', rootFlag: '[REDACTED]', updatedAt: T(12) })], {
      isRedacted: true,
      credentials: [
        { id: 'c1', type: 'password', username: 'admin', secret: '[REDACTED]', redacted: true, createdAt: T(9) },
        { id: 'c9', type: 'password', username: 'admin', secret: '[REDACTED]', redacted: true, createdAt: T(9) },
      ],
      lootItems: [{ id: 'l1', category: 'note', title: 'keys', value: '[REDACTED]', createdAt: T(9) }],
    });
    const { merged, conflicts } = mergeWorkspaces(local, remote, BASE);
    expect(conflicts).toEqual([]);
    const m = byId(merged.machines, 'htb-a')!;
    expect(m.status).toBe('root');
    expect(m.userFlag).toBe('HTB{real}');
    expect(m.rootFlag).toBeUndefined();
    expect(merged.credentials).toEqual([local.credentials![0]]);
    expect(merged.lootItems[0].value).toBe('real body');
  });
});

describe('mergeWorkspaces: legacy backups (invariant 5)', () => {
  it('a backup without sync fields merges as a non-conflicting union', () => {
    const local = ws([
      machine('htb-a', { status: 'root', rootFlag: 'r', quickNotes: 'local', updatedAt: T(11) }),
      machine('htb-b', { status: 'recon', quickNotes: 'keep me', timeSpentSeconds: 100, updatedAt: T(11) }),
    ]);
    const legacy = ws([
      machine('htb-a', { status: 'foothold', userFlag: 'u', updatedAt: T(5) }),
      machine('htb-b', { status: 'foothold', userFlag: 'u2', timeSpentSeconds: 50, openPorts: [22], updatedAt: T(5) }),
      machine('custom-7-new', { platform: 'Custom', status: 'recon', updatedAt: T(5) }),
    ]);
    const baseline = resolveSyncBaseline({ deviceId: 'me' }, legacy);
    expect(baseline).toBeNull();
    const { merged, conflicts, summary } = mergeWorkspaces(local, legacy, baseline);
    expect(conflicts).toEqual([]);
    expect(summary.removed).toBe(0);
    const a = byId(merged.machines, 'htb-a')!;
    expect(a).toMatchObject({ status: 'root', rootFlag: 'r', userFlag: 'u', quickNotes: 'local' });
    const b = byId(merged.machines, 'htb-b')!;
    expect(b).toMatchObject({ status: 'foothold', userFlag: 'u2', quickNotes: 'keep me', timeSpentSeconds: 100, openPorts: [22] });
    expect(byId(merged.machines, 'custom-7-new')).toBeDefined();
    // ...and it is idempotent too
    const again = mergeWorkspaces(ws(merged.machines), legacy, null);
    expect(isNoopMerge(again.summary)).toBe(true);
  });

  it.each(['quickNotes', 'writeupMarkdown', 'userFlag', 'rootFlag', 'scanSummary', 'rawScanOutput'] as const)(
    'different non-empty %s on both sides is a conflict, never a silent union',
    (key) => {
      const l = machine('htb-a', { status: 'root', timeSpentSeconds: 60, [key]: 'local text', updatedAt: T(11) });
      const r = machine('htb-a', { status: 'foothold', openPorts: [22], [key]: 'incoming text', updatedAt: T(5) });
      const res = mergeWorkspaces(ws([l]), ws([r]), null);
      expect(res.conflicts.map((c) => c.id)).toEqual(['htb-a']);
      const kept = mergeWorkspaces(ws([l]), ws([r]), null, { resolutions: { 'htb-a': 'incoming' } });
      expect(byId(kept.merged.machines, 'htb-a')![key]).toBe('incoming text');
    }
  );

  it('different pwned-at timestamps alone still union without a conflict', () => {
    const l = machine('htb-a', { status: 'root', userFlag: 'u', userPwnedAt: T(11), quickNotes: 'n', updatedAt: T(11) });
    const r = machine('htb-a', { status: 'foothold', userFlag: 'u', userPwnedAt: T(4), openPorts: [80], updatedAt: T(5) });
    const res = mergeWorkspaces(ws([l]), ws([r]), null);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')).toMatchObject({ status: 'root', userPwnedAt: T(11), openPorts: [80], quickNotes: 'n' });
  });
});

describe('mergeWorkspaces: clock skew', () => {
  // Baselines are compared in the clock that produced them: remote updatedAt against remoteBase (remote clock),
  // local updatedAt against localBase (local clock). A skewed peer therefore never hides a genuine edit.
  it.each([
    ['remote clock 1h ahead', 1],
    ['remote clock 1h behind', -1],
  ])('%s: an edit made only on the remote is still taken', (_label, skew) => {
    const l = machine('htb-a', { status: 'recon', updatedAt: T(9) });
    const r = machine('htb-a', { status: 'foothold', userFlag: 'u', updatedAt: T(10.5 + skew) });
    const baseline: SyncBaseline = { localBase: T(10), remoteBase: T(10 + skew) };
    const res = mergeWorkspaces(ws([l]), ws([r]), baseline);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.status).toBe('foothold');
  });

  it.each([1, -1])('remote clock off by %ih: a local edit plus a remote edit is still a conflict', (skew) => {
    const l = machine('htb-a', { status: 'foothold', quickNotes: 'mine', updatedAt: T(10.2) });
    const r = machine('htb-a', { status: 'foothold', quickNotes: 'theirs', updatedAt: T(10.2 + skew) });
    const res = mergeWorkspaces(ws([l]), ws([r]), { localBase: T(10), remoteBase: T(10 + skew) });
    expect(res.conflicts.map((c) => c.id)).toEqual(['htb-a']);
  });

  it('a single shared lastSyncedAt string is accepted (both bases equal)', () => {
    const l = machine('htb-a', { status: 'recon', updatedAt: T(9) });
    const r = machine('htb-a', { status: 'foothold', updatedAt: T(11) });
    expect(byId(mergeWorkspaces(ws([l]), ws([r]), T(10)).merged.machines, 'htb-a')!.status).toBe('foothold');
  });
});

describe('mergeWorkspaces: notes, sessions, edges', () => {
  const note = (id: string, body: string, h?: number) =>
    ({ id, title: id, rawMarkdown: body, ...(h !== undefined ? { dateModified: T(h) } : {}) }) as never;

  it('unions by id and respects deletedNoteIds', () => {
    const local = ws([], { customNotes: [note('a', 'a'), note('b', 'b')], deletedNoteIds: ['x'] });
    const remote = ws([], {
      deviceId: 'r',
      customNotes: [note('c', 'c'), note('x', 'x')],
      deletedNoteIds: ['b'],
      userNotes: [note('v1', 'vault')],
    });
    const { merged } = mergeWorkspaces(local, remote, BASE);
    expect(merged.customNotes.map((n) => n.id)).toEqual(['a', 'c']);
    expect(merged.userNotes.map((n) => n.id)).toEqual(['v1']);
    expect(new Set(merged.deletedNoteIds)).toEqual(new Set(['x', 'b']));
  });

  it('a note edited here since the last sync survives a remote deletion', () => {
    const { merged } = mergeWorkspaces(ws([], { customNotes: [note('a', 'edited', 11)] }), ws([], { deletedNoteIds: ['a'] }), BASE);
    expect(merged.customNotes.map((n) => n.id)).toEqual(['a']);
    expect(merged.deletedNoteIds).toEqual([]);
  });

  it('the later edit of the same note wins', () => {
    const { merged } = mergeWorkspaces(ws([], { customNotes: [note('a', 'old', 9)] }), ws([], { customNotes: [note('a', 'new', 12)] }), BASE);
    expect(merged.customNotes[0].rawMarkdown).toBe('new');
  });

  it('sessions and edges union by id, local wins on id collisions', () => {
    const s = (id: string, d: number) => ({ id, machineId: 'm', machineName: 'm', date: '2026-10-01', durationSeconds: d, type: 'session' as const });
    const { merged, summary } = mergeWorkspaces(
      ws([], { activitySessions: [s('s1', 1)] }),
      ws([], { activitySessions: [s('s1', 99), s('s2', 2)], graphEdges: [{ id: 'e', sourceId: 'a', targetId: 'b' } as never, { id: 'bad' } as never] }),
      BASE
    );
    expect(merged.activitySessions.map((x) => x.durationSeconds)).toEqual([1, 2]);
    expect(merged.graphEdges.map((e) => e.id)).toEqual(['e']);
    expect(summary).toMatchObject({ sessionsAdded: 1, edgesAdded: 1 });
  });
});

describe('mergeWorkspaces: fingerprint base (common ancestor)', () => {
  const v1 = machine('htb-a', { status: 'foothold', quickNotes: 'v1', updatedAt: T(9) });
  const first = mergeWorkspaces(ws([]), ws([v1], { deviceId: 'laptop' }), { localBase: null, remoteBase: null });
  const base = { localBase: null, remoteBase: T(9), machineBase: first.machineBase };

  it('records a base for every incoming machine with work in it', () => {
    expect(Object.keys(first.machineBase)).toEqual(['htb-a']);
  });

  it('one-way sync: a text edit on the other device arrives without a conflict, whatever the clocks say', () => {
    // updatedAt even earlier than remoteBase (skewed clock): content decides
    const v2 = { ...v1, quickNotes: 'v2', updatedAt: T(1) };
    const res = mergeWorkspaces(ws(first.merged.machines), ws([v2], { deviceId: 'laptop' }), base);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.quickNotes).toBe('v2');
  });

  it('a local edit since the base is kept when the other device did not touch the machine', () => {
    const mine = { ...v1, quickNotes: 'mine', updatedAt: T(1) };
    const res = mergeWorkspaces(ws([mine]), ws([v1], { deviceId: 'laptop' }), base);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.quickNotes).toBe('mine');
  });

  it('edits on both sides since the base are a conflict', () => {
    const mine = { ...v1, quickNotes: 'mine', updatedAt: T(1) };
    const theirs = { ...v1, quickNotes: 'theirs', updatedAt: T(1) };
    expect(mergeWorkspaces(ws([mine]), ws([theirs]), base).conflicts.map((c) => c.id)).toEqual(['htb-a']);
  });
});

describe('mergeWorkspaces: tags (editable on catalog machines too)', () => {
  it('an incoming tags-only change on a catalog machine arrives', () => {
    const l = machine('htb-a', { status: 'root', tags: ['linux'], updatedAt: T(9) });
    const r = machine('htb-a', { status: 'root', tags: ['linux', 'web'], updatedAt: T(12) });
    const res = mergeWorkspaces(ws([l]), ws([r]), BASE);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.tags).toEqual(['linux', 'web']);
    expect(res.summary.updated).toBe(1);
  });

  it('a tags-only change on a machine without progress arrives too', () => {
    const l = machine('htb-a', { tags: [], updatedAt: T(9) });
    const r = machine('htb-a', { tags: ['todo-next'], updatedAt: T(12) });
    expect(byId(mergeWorkspaces(ws([l]), ws([r]), BASE).merged.machines, 'htb-a')!.tags).toEqual(['todo-next']);
  });

  it('tags edited on both sides are unioned, not a conflict', () => {
    const l = machine('htb-a', { status: 'root', tags: ['linux', 'mine'], updatedAt: T(11) });
    const r = machine('htb-a', { status: 'root', tags: ['linux', 'theirs'], updatedAt: T(12) });
    const res = mergeWorkspaces(ws([l]), ws([r]), BASE);
    expect(res.conflicts).toEqual([]);
    expect(byId(res.merged.machines, 'htb-a')!.tags).toEqual(['linux', 'mine', 'theirs']);
    // a superset of progress on one side still keeps the other side's tags
    const r2 = machine('htb-a', { status: 'root', rootFlag: 'r', tags: ['theirs'], updatedAt: T(12) });
    const res2 = mergeWorkspaces(ws([l]), ws([r2]), BASE);
    expect(byId(res2.merged.machines, 'htb-a')).toMatchObject({ rootFlag: 'r', tags: ['theirs', 'linux', 'mine'] });
  });

  it('tag order alone is not a change', () => {
    const l = machine('htb-a', { status: 'root', tags: ['a', 'b'], updatedAt: T(11) });
    const r = machine('htb-a', { status: 'root', tags: ['b', 'a'], updatedAt: T(12) });
    expect(machineFingerprint(l)).toBe(machineFingerprint(r));
  });
});

describe('resolveSyncBaseline', () => {
  it('reads both clocks from the peer maps', () => {
    expect(
      resolveSyncBaseline({ deviceId: 'me', syncPeers: { them: T(8) } }, { deviceId: 'them', syncPeers: { me: T(7), other: T(1) } })
    ).toEqual({ remoteBase: T(8), localBase: T(7) });
    expect(resolveSyncBaseline({ deviceId: 'me' }, { deviceId: 'them' })).toEqual({ remoteBase: null, localBase: null });
  });
});

describe('invariant 1: a merge never reduces local progress unless chosen in the conflict UI', () => {
  const statusArb = fc.constantFrom('backlog', 'recon', 'foothold', 'root', 'completed') as fc.Arbitrary<Machine['status']>;
  const sideArb = fc.record({
    status: statusArb,
    userFlag: fc.option(fc.constantFrom('u1', 'u2'), { nil: undefined }),
    rootFlag: fc.option(fc.constantFrom('r1', 'r2'), { nil: undefined }),
    quickNotes: fc.option(fc.constantFrom('n1', 'n2'), { nil: undefined }),
    timeSpentSeconds: fc.constantFrom(0, 60, 600),
    openPorts: fc.subarray([22, 80, 445]),
    rating: fc.option(fc.constantFrom(1, 5), { nil: undefined }),
    hour: fc.integer({ min: 5, max: 15 }),
  });
  type Side = typeof sideArb extends fc.Arbitrary<infer U> ? U : never;
  const toMachine = (s: Side) =>
    machine('htb-p', { ...s, updatedAt: T(s.hour) } as Partial<Machine>);
  const baseArb = fc.option(
    fc.record({
      localBase: fc.option(fc.integer({ min: 5, max: 15 }).map(T), { nil: null }),
      remoteBase: fc.option(fc.integer({ min: 5, max: 15 }).map(T), { nil: null }),
    }),
    { nil: null }
  );

  it('holds for arbitrary machine pairs and baselines', () => {
    fc.assert(
      fc.property(sideArb, sideArb, baseArb, (ls, rs, baseline) => {
        const l = toMachine(ls);
        const r = toMachine(rs);
        const res = mergeWorkspaces(ws([l]), ws([r]), baseline);
        if (res.conflicts.length) return true; // nothing may be written until the user resolves it
        const out = byId(res.merged.machines, 'htb-p')!;
        return !losesProgress(l, out);
      }),
      { numRuns: 500 }
    );
  });

  it('covers/fingerprint sanity', () => {
    const a = machine('htb-x', { status: 'root', userFlag: 'u', checklist: { openPorts: [], activeItemId: null, itemsState: {} } });
    const b = machine('htb-x', { status: 'root', userFlag: 'u', checklist: undefined, tags: [] });
    expect(machineFingerprint(a)).toBe(machineFingerprint(b));
    expect(coversMachine(a, b)).toBe(true);
  });
});
