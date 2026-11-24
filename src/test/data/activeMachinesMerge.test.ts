import { describe, it, expect } from 'vitest';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';
import { loadMachinesCatalog } from '../../data/loadMachinesCatalog';
import { STARTER_MACHINES } from '../../data/starterMachines';
import { mergeMachinesWithCatalog, useCtfStore } from '../../store/useCtfStore';
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

const SPOILER_FIELDS = ['hint', 'officialSynopsis', 'officialPdf', 'officialWalkthrough', 'writeupUrl', 'userFlag', 'rootFlag'] as const;
const CATALOG = appendActiveMachines(STARTER_MACHINES);
// Pick live entries from activeMachines.json so weekly HTB rotations never break these tests.
const SAMPLE_A = ACTIVE_MACHINES.machines[0];
const SAMPLE_B = ACTIVE_MACHINES.machines[1] ?? SAMPLE_A;
const SAMPLE_C = ACTIVE_MACHINES.machines[2] ?? SAMPLE_A;
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const SAMPLE_A_ID = `htb-${slugOf(SAMPLE_A.name)}`;
const SAMPLE_B_ID = `htb-${slugOf(SAMPLE_B.name)}`;
const SAMPLE_C_ID = `htb-${slugOf(SAMPLE_C.name)}`;
const SPACED_SAMPLE_A =
  SAMPLE_A.name.length > 2 ? `${SAMPLE_A.name.slice(0, 2)} ${SAMPLE_A.name.slice(2)}` : `${SAMPLE_A.name} `;

describe('appendActiveMachines', () => {
  it('adds one metadata-only HTB row per active machine', () => {
    // Fresh copy: merges sanitize catalog rows in place.
    const added = appendActiveMachines(STARTER_MACHINES).slice(STARTER_MACHINES.length);
    expect(added).toHaveLength(ACTIVE_MACHINES.machines.length);
    const sample = added.find((m) => m.name === SAMPLE_A.name)!;
    expect(sample).toMatchObject({
      id: SAMPLE_A_ID,
      platform: 'HTB',
      os: SAMPLE_A.os,
      difficulty: SAMPLE_A.difficulty,
      status: 'backlog',
      isActive: true,
      ip: '10.10.10.x',
      tags: [],
      roomUrl: `https://app.hackthebox.com/machines/${SAMPLE_A.name}`,
    });
    for (const m of added) {
      for (const f of SPOILER_FIELDS) expect(m[f], `${m.name}.${f}`).toBeUndefined();
      expect(m.skillsLearned).toBeUndefined();
      expect(m.tags).toEqual([]);
    }
  });

  it('dedupes by normalized name and never reuses a taken id', () => {
    const catalog = [
      box({ id: SAMPLE_A_ID, name: 'Some Other Box' }),
      box({ id: 'htb-existing-upper', name: SAMPLE_B.name.toUpperCase() }),
    ];
    const out = appendActiveMachines(catalog);
    expect(out.filter((m) => m.name.toLowerCase() === SAMPLE_B.name.toLowerCase())).toHaveLength(1);
    const sample = out.find((m) => m.name === SAMPLE_A.name)!;
    expect(sample.id).toBe(`htb-active-${slugOf(SAMPLE_A.name)}`);
    expect(new Set(out.map((m) => m.id)).size).toBe(out.length);
  });

  it('the loaded full catalog includes the active rows once with unique ids', async () => {
    const full = await loadMachinesCatalog();
    expect(new Set(full.map((m) => m.id)).size).toBe(full.length);
    for (const e of ACTIVE_MACHINES.machines) {
      expect(full.filter((m) => m.name === e.name), e.name).toHaveLength(1);
    }
  });
});

describe('merging active catalog rows with stored machines', () => {
  it('a custom machine sharing an active name stays custom with its progress and is not folded into the catalog row', () => {
    const custom = box({
      id: `custom-1700000000000-${slugOf(SAMPLE_A.name)}`,
      name: SAMPLE_A.name,
      isCustom: true,
      status: 'foothold',
      timeSpentSeconds: 3600,
    });
    const merged = mergeMachinesWithCatalog([custom], false, CATALOG);
    const mine = merged.find((m) => m.id === custom.id)!;
    expect(mine.isCustom).toBe(true);
    expect(mine.status).toBe('foothold');
    expect(mine.timeSpentSeconds).toBe(3600);
    // The operator's own target is never flagged active by name alone.
    expect(mine.isActive).toBeFalsy();
    const catalogRow = merged.find((m) => m.id === SAMPLE_A_ID)!;
    expect(catalogRow.isCustom).toBeFalsy();
    expect(catalogRow.status).toBe('backlog');
    expect(catalogRow.timeSpentSeconds).toBe(0);
    // Customs are anchored first.
    expect(merged[0].id).toBe(custom.id);
  });

  it('a custom target keeps notes, flags and tags across merge and updateMachine even if it matches an active name', () => {
    const custom = box({
      id: `custom-1700000000001-${slugOf(SAMPLE_B.name)}`,
      name: SAMPLE_B.name,
      isCustom: true,
      status: 'root',
      tags: ['internal'],
      quickNotes: 'my own notes',
      userFlag: 'FLAG{u}',
      rootFlag: 'FLAG{r}',
      ip: '192.168.56.10',
    });
    const merged = mergeMachinesWithCatalog([custom], false, CATALOG);
    const mine = merged.find((m) => m.id === custom.id)!;
    expect(mine).toMatchObject({ isCustom: true, tags: ['internal'], quickNotes: 'my own notes', userFlag: 'FLAG{u}', rootFlag: 'FLAG{r}', ip: '192.168.56.10' });
    expect(mine.isActive).toBeFalsy();

    useCtfStore.setState({ machines: merged });
    useCtfStore.getState().updateMachine(custom.id, { quickNotes: 'updated notes' });
    const updated = useCtfStore.getState().machines.find((m) => m.id === custom.id)!;
    expect(updated).toMatchObject({ quickNotes: 'updated notes', userFlag: 'FLAG{u}', tags: ['internal'], ip: '192.168.56.10' });
    expect(updated.isActive).toBeFalsy();
  });

  it('addCustomMachine does not flag a custom by name, but honours an explicit isActive', () => {
    useCtfStore.setState({ machines: [] });
    const input = {
      name: SAMPLE_B.name, ip: '192.168.56.10', os: 'Linux' as const, platform: 'Custom' as const,
      difficulty: 'Easy' as const, status: 'backlog' as const, tags: ['internal'], certifications: [], timeSpentSeconds: 0,
    };
    useCtfStore.getState().addCustomMachine(input);
    const plain = useCtfStore.getState().machines[0];
    expect(plain.isActive).toBeFalsy();
    expect(plain.tags).toEqual(['internal']);
    expect(plain.ip).toBe('192.168.56.10');

    useCtfStore.getState().addCustomMachine({ ...input, isActive: true });
    const explicit = useCtfStore.getState().machines[0];
    expect(explicit.isActive).toBe(true);
    expect(explicit.tags).toEqual([]);
    expect(explicit.ip).toBe('');
  });

  it('the catalog active row is still sanitized, including stored progress fields', () => {
    const stored = box({ id: SAMPLE_B_ID, name: SAMPLE_B.name, status: 'recon', quickNotes: 'spoiler', userFlag: 'HTB{x}', tags: ['sqli'] });
    const merged = mergeMachinesWithCatalog([stored], false, appendActiveMachines(STARTER_MACHINES));
    const row = merged.find((m) => m.id === SAMPLE_B_ID)!;
    expect(row).toMatchObject({ isActive: true, status: 'recon', quickNotes: '', userFlag: '', tags: [], ip: '' });
  });

  it('a THM room sharing an active HTB name is not flagged active and does not block the HTB row', () => {
    const thmId = `thm-${slugOf(SAMPLE_A.name)}`;
    const thm = box({ id: thmId, name: SAMPLE_A.name, platform: 'THM', quickNotes: 'room notes', tags: ['web'] });
    const catalog = appendActiveMachines([thm]);
    expect(catalog.find((m) => m.id === SAMPLE_A_ID)).toBeDefined();
    const merged = mergeMachinesWithCatalog([{ ...thm, status: 'recon' }], false, catalog);
    const room = merged.find((m) => m.id === thmId)!;
    expect(room.isActive).toBeFalsy();
    expect(room).toMatchObject({ quickNotes: 'room notes', tags: ['web'], status: 'recon' });
    expect(merged.find((m) => m.id === SAMPLE_A_ID)!.isActive).toBe(true);
  });

  it('an HTB catalog row with spaces in an active name matches by slug and is sanitized', () => {
    const row = box({ id: 'htb-spaced-active', name: SPACED_SAMPLE_A, hint: 'spoiler', tags: ['ad'] });
    const merged = mergeMachinesWithCatalog(
      [{ ...row, status: 'recon', quickNotes: 'notes', userFlag: 'HTB{x}' }],
      false,
      [row]
    );
    expect(merged[0]).toMatchObject({ isActive: true, status: 'recon', hint: '', tags: [], quickNotes: '', userFlag: '' });
  });

  it('a catalog-matched active row keeps its user progress', () => {
    const stored = box({ id: SAMPLE_A_ID, name: SAMPLE_A.name, status: 'recon', timeSpentSeconds: 1200, rating: 4 });
    const merged = mergeMachinesWithCatalog([stored], false, CATALOG);
    const rows = merged.filter((m) => m.name === SAMPLE_A.name);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: SAMPLE_A_ID, status: 'recon', timeSpentSeconds: 1200, rating: 4, isActive: true });
    expect(rows[0].isCustom).toBeFalsy();
    expect(rows[0].roomUrl).toBe(`https://app.hackthebox.com/machines/${SAMPLE_A.name}`);
  });

  it('before the full catalog loads (starter only), an active row with progress is kept and never stamped custom', () => {
    const stored = box({ id: SAMPLE_C_ID, name: SAMPLE_C.name, os: SAMPLE_C.os, status: 'recon', timeSpentSeconds: 600 });
    const boot = mergeMachinesWithCatalog([stored], false, STARTER_MACHINES);
    const atBoot = boot.find((m) => m.id === SAMPLE_C_ID)!;
    expect(atBoot.isCustom).toBeFalsy();
    expect(atBoot.status).toBe('recon');

    const later = mergeMachinesWithCatalog(boot, false, CATALOG);
    const rows = later.filter((m) => m.name === SAMPLE_C.name);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: SAMPLE_C_ID, status: 'recon', timeSpentSeconds: 600 });
    expect(rows[0].isCustom).toBeFalsy();
  });
});
