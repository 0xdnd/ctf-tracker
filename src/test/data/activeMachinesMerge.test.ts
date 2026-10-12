import { describe, it, expect } from 'vitest';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';
import { loadMachinesCatalog } from '../../data/loadMachinesCatalog';
import { STARTER_MACHINES } from '../../data/starterMachines';
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

const SPOILER_FIELDS = ['hint', 'officialSynopsis', 'officialPdf', 'officialWalkthrough', 'writeupUrl', 'userFlag', 'rootFlag'] as const;
const CATALOG = appendActiveMachines(STARTER_MACHINES);

describe('appendActiveMachines', () => {
  it('adds one metadata-only HTB row per active machine', () => {
    // Fresh copy: merges sanitize catalog rows in place.
    const added = appendActiveMachines(STARTER_MACHINES).slice(STARTER_MACHINES.length);
    expect(added).toHaveLength(ACTIVE_MACHINES.machines.length);
    const stream = added.find((m) => m.name === 'Stream')!;
    expect(stream).toMatchObject({
      id: 'htb-stream',
      platform: 'HTB',
      os: 'Linux',
      difficulty: 'Medium',
      status: 'backlog',
      isActive: true,
      ip: '10.10.10.x',
      tags: [],
      roomUrl: 'https://app.hackthebox.com/machines/Stream',
    });
    for (const m of added) {
      for (const f of SPOILER_FIELDS) expect(m[f], `${m.name}.${f}`).toBeUndefined();
      expect(m.skillsLearned).toBeUndefined();
      expect(m.tags).toEqual([]);
    }
  });

  it('dedupes by normalized name and never reuses a taken id', () => {
    const catalog = [box({ id: 'htb-stream', name: 'Some Other Box' }), box({ id: 'htb-nimbus-old', name: 'NIMBUS' })];
    const out = appendActiveMachines(catalog);
    expect(out.filter((m) => m.name.toLowerCase() === 'nimbus')).toHaveLength(1);
    const stream = out.find((m) => m.name === 'Stream')!;
    expect(stream.id).toBe('htb-active-stream');
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
  it('a custom "Stream" stays custom with its progress and is not folded into htb-stream', () => {
    const custom = box({
      id: 'custom-1700000000000-stream',
      name: 'Stream',
      isCustom: true,
      status: 'foothold',
      timeSpentSeconds: 3600,
    });
    const merged = mergeMachinesWithCatalog([custom], false, CATALOG);
    const mine = merged.find((m) => m.id === custom.id)!;
    expect(mine.isCustom).toBe(true);
    expect(mine.status).toBe('foothold');
    expect(mine.timeSpentSeconds).toBe(3600);
    // Name-based AUP §8.2 enforcement still marks it active (spoiler fields stripped).
    expect(mine.isActive).toBe(true);
    const catalogRow = merged.find((m) => m.id === 'htb-stream')!;
    expect(catalogRow.isCustom).toBeFalsy();
    expect(catalogRow.status).toBe('backlog');
    expect(catalogRow.timeSpentSeconds).toBe(0);
    // Customs are anchored first.
    expect(merged[0].id).toBe(custom.id);
  });

  it('a catalog-matched active row keeps its user progress', () => {
    const stored = box({ id: 'htb-stream', name: 'Stream', status: 'recon', timeSpentSeconds: 1200, rating: 4 });
    const merged = mergeMachinesWithCatalog([stored], false, CATALOG);
    const rows = merged.filter((m) => m.name === 'Stream');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'htb-stream', status: 'recon', timeSpentSeconds: 1200, rating: 4, isActive: true });
    expect(rows[0].isCustom).toBeFalsy();
    expect(rows[0].roomUrl).toBe('https://app.hackthebox.com/machines/Stream');
  });

  it('before the full catalog loads (starter only), an active row with progress is kept and never stamped custom', () => {
    const stored = box({ id: 'htb-touch', name: 'Touch', os: 'Windows', status: 'recon', timeSpentSeconds: 600 });
    const boot = mergeMachinesWithCatalog([stored], false, STARTER_MACHINES);
    const atBoot = boot.find((m) => m.id === 'htb-touch')!;
    expect(atBoot.isCustom).toBeFalsy();
    expect(atBoot.status).toBe('recon');

    const later = mergeMachinesWithCatalog(boot, false, CATALOG);
    const rows = later.filter((m) => m.name === 'Touch');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'htb-touch', status: 'recon', timeSpentSeconds: 600 });
    expect(rows[0].isCustom).toBeFalsy();
  });
});
