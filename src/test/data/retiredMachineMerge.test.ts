import { describe, it, expect } from 'vitest';
import { appendActiveMachines } from '../../data/activeMachines';
import { STARTER_MACHINES } from '../../data/starterMachines';
import { mergeMachinesWithCatalog } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const catalog = () => appendActiveMachines(STARTER_MACHINES.map((m) => ({ ...m })));

describe('retired machine stored as active', () => {
  it('becomes isActive=false once the catalog lists it as a retired row', () => {
    const lame = STARTER_MACHINES.find((m) => m.id === 'htb-lame')!;
    expect(lame.isActive).not.toBe(true);
    // Stored while it was still active: sanitized, name-only, isActive=true.
    const stored: Machine = { ...lame, isActive: true, hint: undefined, status: 'recon', quickNotes: undefined };
    const merged = mergeMachinesWithCatalog([stored], false, catalog()).find((m) => m.id === 'htb-lame')!;
    expect(merged.isActive).toBe(false);
    expect(merged.status).toBe('recon');

    // Future edits are no longer stripped by the active-machine sanitizer.
    const again = mergeMachinesWithCatalog([{ ...merged, quickNotes: 'my notes' }], false, catalog()).find(
      (m) => m.id === 'htb-lame'
    )!;
    expect(again.quickNotes).toBe('my notes');
  });

  it('keeps a still-active catalog machine active', () => {
    const cat = catalog();
    const stream = cat.find((m) => m.name === 'Stream')!;
    const merged = mergeMachinesWithCatalog([{ ...stream, status: 'recon' }], false, cat).find((m) => m.id === stream.id)!;
    expect(merged.isActive).toBe(true);
  });

  it("keeps a genuine custom machine's explicit isActive flag", () => {
    const custom: Machine = {
      id: 'custom-lab-1',
      name: 'Lame',
      ip: '10.0.0.5',
      os: 'Linux',
      platform: 'Custom',
      difficulty: 'Easy',
      status: 'recon',
      tags: [],
      certifications: [],
      timeSpentSeconds: 0,
      isActive: true,
      isCustom: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const merged = mergeMachinesWithCatalog([custom], false, catalog()).find((m) => m.id === custom.id)!;
    expect(merged.isActive).toBe(true);
  });
});
