import { describe, it, expect, beforeAll } from 'vitest';
import pg from '../../data/catalogSources/pg.json';
import vulnhub from '../../data/catalogSources/vulnhub.json';
import { loadMachinesCatalog } from '../../data/loadMachinesCatalog';
import { mergeMachinesWithCatalog } from '../../store/useCtfStore';
import type { Machine } from '../../types';

let catalog: Machine[] = [];
beforeAll(async () => {
  catalog = await loadMachinesCatalog();
});

describe('catalog with PG and VulnHub', () => {
  it('appends both sources to the 1027 base rows', () => {
    expect(catalog.length).toBe(1027 + (pg as unknown[]).length + (vulnhub as unknown[]).length);
    expect(catalog.filter((m) => m.platform === 'PG')).toHaveLength((pg as unknown[]).length);
    expect(catalog.filter((m) => m.platform === 'VulnHub')).toHaveLength((vulnhub as unknown[]).length);
  });

  it('keeps a stored HTB edit and a Custom "Sar" apart, with one catalog "Sar" row', () => {
    const htb = catalog.find((m) => m.platform === 'HTB')!;
    const custom: Machine = {
      ...htb,
      id: 'custom-sar-1',
      name: 'Sar',
      platform: 'Custom',
      isCustom: true,
      status: 'foothold',
      tags: ['mine'],
    };
    const edited: Machine = { ...htb, status: 'completed', timeSpentSeconds: 99 };
    const out = mergeMachinesWithCatalog([edited, custom], false, catalog);
    expect(out.find((m) => m.id === htb.id)?.timeSpentSeconds).toBe(99);
    const customOut = out.find((m) => m.id === 'custom-sar-1');
    expect(customOut?.platform).toBe('Custom');
    expect(customOut?.tags).toEqual(['mine']);
    const sars = out.filter((m) => m.name === 'Sar' && m.platform !== 'Custom');
    expect(sars.length).toBeLessThanOrEqual(2);
    expect(new Set(sars.map((m) => m.id)).size).toBe(sars.length);
    expect(out.length).toBe(catalog.length + 1);
  });

  it('keeps a completed PG row completed after a reload merge', () => {
    const row = catalog.find((m) => m.platform === 'PG')!;
    const out = mergeMachinesWithCatalog([{ ...row, status: 'completed', timeSpentSeconds: 5 }], false, catalog);
    const merged = out.find((m) => m.id === row.id)!;
    expect(merged.status).toBe('completed');
    expect(merged.platform).toBe('PG');
    expect(out.filter((m) => m.id === row.id)).toHaveLength(1);
    expect(out.length).toBe(catalog.length);
  });

  it('never marks new rows active', () => {
    const out = mergeMachinesWithCatalog(undefined, false, catalog);
    expect(out.filter((m) => (m.platform === 'PG' || m.platform === 'VulnHub') && m.isActive)).toEqual([]);
  });
});
