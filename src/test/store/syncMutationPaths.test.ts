/**
 * Every way a machine can change must survive "edit here -> export -> merge on a peer that did not touch it".
 * Rule 4 of syncMerge (incoming unchanged since the baseline -> keep local) relies on that: a mutation that
 * does not stamp updatedAt would look unchanged and be dropped on the peer.
 *
 * Each path also merges into a brand-new peer (first contact: no fingerprint base, no baselines, clock rule).
 * Each path runs two merges on the peer:
 *  (a) clock rule only: baseline = { remoteBase: F0.syncedAt, localBase: far future } (the peer is untouched),
 *      so the edit arrives only if the mutation stamped updatedAt after F0 was exported;
 *  (b) the real one-way flow: the peer adopted F0 with mergeWorkspaces and merges F1 with the baseline it
 *      would have stored (per-peer syncedAt + machine fingerprint base).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Machine } from '../../types';

const deepDb = vi.hoisted(() => ({ profiles: new Map<string, unknown>() }));
vi.mock('../../utils/indexedDbDeepStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/indexedDbDeepStorage')>();
  return { ...actual, loadDeepProfileData: async (pid: string) => (deepDb.profiles.get(pid) ?? null) as never };
});

import { useCtfStore, getWriteProfileStorageKey } from '../../store/useCtfStore';
import { parseSyncPayload } from '../../utils/syncFile';
import { mergeWorkspaces, resolveSyncBaseline, type SyncWorkspace } from '../../utils/syncMerge';

const OLD = '2026-01-01T00:00:00.000Z';
const FUTURE = '2099-01-01T00:00:00.000Z';
const ID = 'custom-1-alpha';
const get = () => useCtfStore.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const alpha = (): Machine =>
  ({
    id: ID,
    name: 'Alpha',
    ip: '10.10.10.9',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 60,
    quickNotes: 'first notes',
    writeupMarkdown: '# first writeup',
    isCustom: true,
    checklist: { openPorts: [22], activeItemId: null, itemsState: { 'nmap-full': { status: 'in_progress' } } },
    openPorts: [22],
    createdAt: OLD,
    updatedAt: OLD,
  }) as Machine;

const exportParsed = async () => parseSyncPayload(await get().exportSyncFile())!;

async function roundTrip(apply: () => void | Promise<void>, pick: (m: Machine[]) => Machine | undefined = (ms) => ms.find((m) => m.id === ID)) {
  const f0 = await exportParsed();
  // The peer adopts F0 (its first sync with this device).
  const fresh: SyncWorkspace = { deviceId: 'peer-device', syncPeers: {}, machines: [] };
  const adopt = mergeWorkspaces(fresh, f0, resolveSyncBaseline(fresh, f0));
  expect(adopt.conflicts).toEqual([]);
  const peer: SyncWorkspace = {
    deviceId: 'peer-device',
    syncPeers: { [f0.deviceId!]: f0.syncedAt! },
    machines: adopt.merged.machines,
    deletedMachineIds: adopt.merged.deletedMachineIds,
  };
  const peerBases = { [f0.deviceId!]: adopt.machineBase };

  await sleep(5); // every edit below happens strictly after F0 was exported
  await apply();
  const f1 = await exportParsed();

  const clockOnly = mergeWorkspaces(peer, f1, { remoteBase: f0.syncedAt!, localBase: FUTURE });
  // First merge ever from this device on a new peer: no fingerprint base, no peer baselines (clock-rule path).
  expect(resolveSyncBaseline(fresh, f1)).toEqual({ remoteBase: null, localBase: null });
  const newPeer = mergeWorkspaces(fresh, f1, resolveSyncBaseline(fresh, f1));
  const realFlow = mergeWorkspaces(peer, f1, resolveSyncBaseline({ ...peer, peerMachineBases: peerBases }, f1));
  return {
    clockOnly: { conflicts: clockOnly.conflicts, machine: pick(clockOnly.merged.machines), merged: clockOnly.merged },
    realFlow: { conflicts: realFlow.conflicts, machine: pick(realFlow.merged.machines), merged: realFlow.merged },
    newPeer: { conflicts: newPeer.conflicts, machine: pick(newPeer.merged.machines) },
  };
}

beforeEach(async () => {
  deepDb.profiles.clear();
  await get().loadCatalog();
  const catalog = get().machines.filter((m) => !m.id.startsWith('custom-'));
  useCtfStore.setState({
    machines: [alpha(), ...catalog],
    deletedMachineIds: [],
    activeTargetId: null,
    activeTimerSeconds: 0,
    isTimerRunning: false,
    timerLastTick: null,
    currentProfileId: 'guest',
  });
});

type Path = [name: string, apply: () => void | Promise<void>, expectOnPeer: (m: Machine) => void];

const PATHS: Path[] = [
  ['writeup save (updateMachine)', () => get().updateMachine(ID, { writeupMarkdown: '# edited writeup' }), (m) => expect(m.writeupMarkdown).toBe('# edited writeup')],
  [
    'writeup kept only in IndexedDB deep storage (quota-pruned)',
    () => {
      get().updateMachine(ID, { writeupMarkdown: '# deep only' });
      deepDb.profiles.set('guest', { writeups: { [ID]: { writeupMarkdown: '# deep only' } }, customNotes: [], updatedAt: 'x' });
      // what a reload after a quota-pruned save looks like: the body is gone from memory, updatedAt is not
      useCtfStore.setState((s) => ({ machines: s.machines.map((m) => (m.id === ID ? { ...m, writeupMarkdown: undefined } : m)) }));
    },
    (m) => expect(m.writeupMarkdown).toBe('# deep only'),
  ],
  ['quickNotes', () => get().updateMachine(ID, { quickNotes: 'edited notes' }), (m) => expect(m.quickNotes).toBe('edited notes')],
  ['checklist status', () => get().setChecklistItemStatus(ID, 'nmap-full', 'done'), (m) => expect(m.checklist?.itemsState['nmap-full'].status).toBe('done')],
  ['checklist notes', () => get().setChecklistItemNotes(ID, 'nmap-full', 'found 8080'), (m) => expect(m.checklist?.itemsState['nmap-full'].notes).toBe('found 8080')],
  ['checklist active item', () => get().setActiveChecklistItem(ID, 'web-enum'), (m) => expect(m.checklist?.activeItemId).toBe('web-enum')],
  ['open ports', () => get().setMachineOpenPorts(ID, [22, 80, 445]), (m) => expect(m.openPorts).toEqual([22, 80, 445])],
  [
    'scan import (services, ports, summary, raw output)',
    () =>
      get().updateMachine(ID, {
        services: [{ port: 80, protocol: 'tcp', state: 'open', service: 'http', version: 'nginx' }],
        openPorts: [22, 80],
        scanSummary: 'NMAP · 2 Open Ports Discovered',
        rawScanOutput: '80/tcp open http nginx',
        tags: ['web'],
      }),
    (m) => expect(m).toMatchObject({ services: [expect.objectContaining({ port: 80 })], openPorts: [22, 80], rawScanOutput: '80/tcp open http nginx' }),
  ],
  ['user flag', () => get().toggleUserFlag(ID, 'HTB{user}'), (m) => expect(m).toMatchObject({ userFlag: 'HTB{user}', status: 'foothold' })],
  ['root flag', () => get().toggleRootFlag(ID, 'HTB{root}'), (m) => expect(m).toMatchObject({ rootFlag: 'HTB{root}', status: 'root' })],
  ['status change', () => get().updateMachineStatus(ID, 'foothold'), (m) => expect(m.status).toBe('foothold')],
  ['bulk status change', () => get().batchUpdateMachineStatus([{ machineId: ID, status: 'completed' }]), (m) => expect(m.status).toBe('completed')],
  ['tags', () => get().updateMachine(ID, { tags: ['ad', 'kerberos'] }), (m) => expect(m.tags).toEqual(expect.arrayContaining(['ad', 'kerberos']))],
  ['rating / perceived difficulty', () => get().updateMachine(ID, { rating: 4, perceivedDifficulty: 'Hard' }), (m) => expect(m).toMatchObject({ rating: 4, perceivedDifficulty: 'Hard' })],
  [
    'timer (pause flushes time)',
    () => {
      useCtfStore.setState({ activeTargetId: ID, activeTimerSeconds: 900, isTimerRunning: true, timerLastTick: Date.now() });
      get().pauseTimer();
    },
    (m) => expect(m.timeSpentSeconds).toBeGreaterThanOrEqual(900),
  ],
  [
    'timer (switching target flushes time)',
    () => {
      useCtfStore.setState({ activeTargetId: ID, activeTimerSeconds: 1200 });
      get().setActiveTarget(null);
    },
    (m) => expect(m.timeSpentSeconds).toBe(1200),
  ],
  [
    'timer still running at export',
    () => {
      useCtfStore.setState({ activeTargetId: ID, activeTimerSeconds: 1500, isTimerRunning: true, timerLastTick: Date.now() });
    },
    (m) => expect(m.timeSpentSeconds).toBe(1500),
  ],
  [
    'target IP set through global vars',
    () => {
      useCtfStore.setState({ activeTargetId: ID });
      get().setGlobalVars({ targetIp: '10.10.11.42' });
    },
    (m) => expect(m.ip).toBe('10.10.11.42'),
  ],
  [
    'cross-tab apply (another tab saved an edit)',
    () => {
      const edited = { ...alpha(), quickNotes: 'edited in another tab', updatedAt: new Date().toISOString() };
      const key = getWriteProfileStorageKey('guest');
      const newValue = JSON.stringify({ machines: [edited], userSolvesReset: get().userSolvesReset });
      window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
    },
    (m) => expect(m.quickNotes).toBe('edited in another tab'),
  ],
];

describe('every machine mutation path reaches an untouched peer', () => {
  it.each(PATHS)('%s', async (_name, apply, expectOnPeer) => {
    const { clockOnly, realFlow, newPeer } = await roundTrip(apply);
    expect(newPeer.conflicts).toEqual([]);
    expectOnPeer(newPeer.machine!);
    expect(clockOnly.conflicts).toEqual([]);
    expectOnPeer(clockOnly.machine!);
    expect(realFlow.conflicts).toEqual([]);
    expectOnPeer(realFlow.machine!);
  });

  it('a new machine (scan import creating a host) arrives', async () => {
    let newId = '';
    const { clockOnly, realFlow } = await roundTrip(
      () => {
        get().addCustomMachine({
          name: 'Scanned Host',
          ip: '10.10.10.77',
          os: 'Linux',
          platform: 'Custom',
          difficulty: 'Medium',
          status: 'recon',
          tags: [],
          certifications: [],
          timeSpentSeconds: 0,
        } as never);
        newId = get().machines[0].id;
      },
      (ms) => ms.find((m) => m.id === newId)
    );
    expect(clockOnly.machine?.name).toBe('Scanned Host');
    expect(realFlow.machine?.name).toBe('Scanned Host');
  });

  it('a catalog machine edited here arrives too', async () => {
    const catalogId = get().machines.find((m) => !m.id.startsWith('custom-') && m.status === 'backlog' && !m.isActive)!.id;
    const { clockOnly, realFlow } = await roundTrip(
      () => get().updateMachineStatus(catalogId, 'foothold'),
      (ms) => ms.find((m) => m.id === catalogId)
    );
    expect(clockOnly.machine?.status).toBe('foothold');
    expect(realFlow.machine?.status).toBe('foothold');
  });

  it('a deletion here (tombstone) removes the machine on the peer', async () => {
    const { clockOnly, realFlow } = await roundTrip(() => get().deleteMachine(ID));
    expect(clockOnly.machine).toBeUndefined();
    expect(realFlow.machine).toBeUndefined();
  });
});
