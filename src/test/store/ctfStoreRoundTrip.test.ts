/**
 * Characterization test for the main workspace store. The expected strings in ./fixtures/ctfStoreRoundTrip/ were
 * recorded from the store BEFORE it was split into slices; they must stay byte-identical across that refactor.
 * Re-record only on purpose: UPDATE_CTF_FIXTURES=1 npx vitest run src/test/store/ctfStoreRoundTrip.test.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, 'fixtures/ctfStoreRoundTrip');
const UPDATE = process.env.UPDATE_CTF_FIXTURES === '1';

const STORE_KEY = 'zerobox-tactical-store';
const PROFILE_ID = 'usr_roundtrip';
const PROFILE_KEY = `zerobox_operator_profile_${PROFILE_ID}`;
const FROZEN_NOW = '2026-03-01T12:00:00.000Z';

function expectFixture(name: string, actual: string) {
  const file = resolve(FIXTURE_DIR, name);
  if (UPDATE) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(file, actual);
  }
  // A CRLF checkout (autocrlf) must not matter: the recorded strings only differ in the trailing newline.
  expect(actual).toBe(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
}

const customMachine = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `custom-${n}`,
  name: `Lab ${n}`,
  ip: `10.10.10.${n}`,
  os: 'Linux',
  platform: 'Custom',
  difficulty: 'Medium',
  status: 'foothold',
  tags: ['web', 'sqli'],
  certifications: ['OSCP'],
  isCustom: true,
  userFlag: 'user-flag-value',
  userPwnedAt: '2026-02-10T09:00:00.000Z',
  timeSpentSeconds: 3725,
  timeToUserSeconds: 1800,
  rating: 4,
  quickNotes: 'nmap -sC -sV 10.10.10.5\nport 8080 looks interesting',
  writeupMarkdown: '## Foothold\nSQL injection on /login',
  skillsLearned: ['sqli', 'tunnelling'],
  openPorts: [22, 80, 8080],
  domain: 'lab.local',
  vhosts: ['dev.lab.local'],
  portTriage: { '8080': { status: 'key_vector', note: 'admin panel' } },
  findings: [
    {
      id: 'finding-1',
      title: 'SQL injection in login',
      severity: 'high',
      description: 'Boolean-based injection',
      createdAt: '2026-02-10T08:00:00.000Z',
      updatedAt: '2026-02-10T08:30:00.000Z',
    },
  ],
  timeline: [{ id: 'tl-1', at: '2026-02-10T08:00:00.000Z', kind: 'status_change', label: 'recon to foothold' }],
  solveIndependence: 'nudged',
  nextReviewAt: 1772000000000,
  reviewCount: 1,
  checklist: { items: { 'recon-nmap': { status: 'done', notes: 'full tcp scan' } }, activeItemId: 'recon-nmap' },
  createdAt: '2026-02-01T10:00:00.000Z',
  updatedAt: '2026-02-10T09:30:00.000Z',
  ...extra,
});

const customNotes = [
  {
    id: 'note-a',
    title: 'Kerberoasting',
    titleEn: 'Kerberoasting',
    category: 'Active Directory',
    rawCategory: 'Active Directory',
    subCategory: 'Roasting',
    tags: ['ad', 'kerberos'],
    difficulty: 'Medium',
    summary: 'Request service tickets and crack offline.',
    commands: ['impacket-GetUserSPNs -request'],
    relPath: 'custom/note-a.md',
    rawMarkdown: '# Kerberoasting\nimpacket-GetUserSPNs -request',
    dateModified: '2026-02-20T10:00:00.000Z',
  },
  {
    id: 'note-b',
    title: 'Port forwarding',
    titleEn: 'Port forwarding',
    category: 'Pivoting',
    rawCategory: 'Pivoting',
    subCategory: 'Tunnels',
    tags: ['pivot'],
    difficulty: 'Easy',
    summary: 'ssh -L cheat sheet.',
    commands: ['ssh -L 8080:127.0.0.1:80 user@host'],
    relPath: 'custom/note-b.md',
    rawMarkdown: '# Port forwarding',
    dateModified: '2026-02-21T10:00:00.000Z',
  },
];

function persistedState(overrides: Record<string, unknown> = {}) {
  return {
    currentProfileId: PROFILE_ID,
    appBrand: 'zerobox',
    themePreset: 'htb',
    userSolvesReset: true,
    customNotes,
    deletedNoteIds: ['note-gone'],
    notesEpoch: '2026-02-19T00:00:00.000Z',
    tombstonesEpoch: '2026-02-18T00:00:00.000Z',
    deletedMachineIds: [{ id: 'custom-9', deletedAt: '2026-02-15T00:00:00.000Z' }],
    machines: [
      customMachine(5),
      customMachine(6, { status: 'root', rootFlag: 'root-flag-value', rootPwnedAt: '2026-02-12T09:00:00.000Z' }),
    ],
    activeTargetId: 'custom-5',
    globalVars: {
      lhost: '10.10.14.7',
      lport: '9001',
      targetIp: '10.10.10.5',
      interface: 'tun0',
      domain: 'lab.local',
      dcIp: '10.10.10.10',
      user: 'svc',
      cred: 'hunter2',
      wordlist: '/usr/share/wordlists/rockyou.txt',
      customVars: { DOMAIN: 'lab.local', USER: 'svc', PASSWORD: 'hunter2' },
    },
    cheatsheets: [
      {
        id: 'cmd-1',
        title: 'Custom nmap',
        category: 'Recon',
        description: 'Full port scan',
        commandTemplate: 'nmap -p- {{targetIp}}',
        tags: ['nmap'],
        isCustom: true,
        isStarred: true,
      },
    ],
    activitySessions: [
      { id: 'sess-1', machineId: 'custom-5', machineName: 'Lab 5', date: '2026-02-10', durationSeconds: 3725, type: 'foothold' },
    ],
    viewMode: 'table',
    crtOverlay: true,
    soundEnabled: false,
    uiScale: 'large',
    ...overrides,
  };
}

/** The oldest shape migrate() still accepts: version 0, retired brand/theme/scale values, none of the later fields. */
function oldestPersistedState() {
  const { customNotes: _n, deletedNoteIds: _d, notesEpoch: _e, tombstonesEpoch: _t, deletedMachineIds: _m, ...rest } =
    persistedState({ appBrand: 'rootvector', themePreset: 'industrial', uiScale: 'auto', userSolvesReset: false });
  void [_n, _d, _e, _t, _m];
  return rest;
}

async function bootStore(blob: { state: unknown; version: number }) {
  localStorage.clear();
  localStorage.setItem(STORE_KEY, JSON.stringify(blob));
  vi.resetModules();
  return import('../../store/useCtfStore');
}

describe('useCtfStore persistence round trip (characterization)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(FROZEN_NOW));
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('hydrates a current-version blob and writes it back byte-identically', async () => {
    // The seeded blob carries a field partialize() drops, so a store that never wrote leaves different bytes behind.
    const seeded = { state: persistedState({ transientJunk: 'dropped-on-write' }), version: 3 };
    const { useCtfStore } = await bootStore(seeded);
    // Re-assert an already-persisted field: forces the persist layer to serialize the hydrated snapshot.
    useCtfStore.setState({ soundEnabled: false });
    const written = localStorage.getItem(STORE_KEY) as string;
    expect(written).not.toBe(JSON.stringify(seeded));
    expect(written).not.toContain('transientJunk');
    expect(JSON.parse(written).version).toBe(3);
    expectFixture('tactical-store-v3.expected.json', written);
  });

  it('persists the current schema version, and only the persisted fields', async () => {
    const { useCtfStore, SCHEMA_VERSION } = await bootStore({ state: persistedState(), version: 3 });
    expect(useCtfStore.persist.getOptions().version).toBe(SCHEMA_VERSION);
    expect(useCtfStore.persist.getOptions().name).toBe(STORE_KEY);
    const partial = useCtfStore.persist.getOptions().partialize?.(useCtfStore.getState()) as Record<string, unknown>;
    expect(Object.keys(partial)).toEqual([
      'currentProfileId',
      'appBrand',
      'themePreset',
      'userSolvesReset',
      'customNotes',
      'deletedNoteIds',
      'notesEpoch',
      'tombstonesEpoch',
      'deletedMachineIds',
      'machines',
      'activeTargetId',
      'globalVars',
      'cheatsheets',
      'activitySessions',
      'viewMode',
      'crtOverlay',
      'soundEnabled',
      'uiScale',
    ]);
  });

  it('migrates the oldest supported version and snapshots the migrated state', async () => {
    const oldest = oldestPersistedState();
    const { useCtfStore } = await bootStore({ state: oldest, version: 0 });
    const migrate = useCtfStore.persist.getOptions().migrate as (s: unknown, v: number) => unknown;
    const direct = migrate(JSON.parse(JSON.stringify(oldest)), 0);
    expectFixture('migrate-from-v0.expected.json', JSON.stringify(direct));

    // And the end-to-end path: hydrate from the v0 blob, then persist.
    useCtfStore.setState({ soundEnabled: false });
    const written = localStorage.getItem(STORE_KEY) as string;
    expect(JSON.parse(written).version).toBe(3);
    expectFixture('tactical-store-from-v0.expected.json', written);
  });

  it('writes the profile payload, loot and attack graph keys byte-identically', async () => {
    const { useCtfStore, flushProfileSave } = await bootStore({ state: persistedState(), version: 3 });
    useCtfStore.getState().setGraphNodePosition('custom-5', { x: 12, y: 34 });
    useCtfStore.getState().addGraphEdge({
      id: 'edge-1',
      sourceId: 'custom-5',
      targetId: 'custom-6',
      type: 'exploit',
      status: 'confirmed',
      createdAt: FROZEN_NOW,
    } as never);
    flushProfileSave();
    expectFixture('profile-payload.expected.json', localStorage.getItem(PROFILE_KEY) as string);
    const graphKey = Object.keys(localStorage).find((k) => k.includes('graph') && k.includes(PROFILE_ID));
    expect(graphKey).toBeTruthy();
    expectFixture('graph-state.expected.json', localStorage.getItem(graphKey as string) as string);
  });

  it('keeps the public store surface: state keys and the type of every member', async () => {
    const { useCtfStore } = await bootStore({ state: persistedState(), version: 3 });
    const state = useCtfStore.getState() as unknown as Record<string, unknown>;
    const surface = Object.keys(state)
      .sort()
      .map((k) => [k, typeof state[k]]);
    expectFixture('api-surface.expected.json', `${JSON.stringify(surface, null, 1)}\n`);
  });

  it('keeps the module exports other files import', async () => {
    const mod = (await bootStore({ state: persistedState(), version: 3 })) as Record<string, unknown>;
    const exports = Object.keys(mod)
      .sort()
      .map((k) => [k, typeof mod[k]]);
    expectFixture('module-exports.expected.json', `${JSON.stringify(exports, null, 1)}\n`);
  });
});
