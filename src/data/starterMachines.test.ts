import { describe, expect, it } from 'vitest';
import { STARTER_MACHINES } from './starterMachines';
import { loadMachinesCatalog } from './loadMachinesCatalog';

describe('STARTER_MACHINES', () => {
  // The tracker shows these rows first, then merges the full catalog. Ties in a sort keep input order, so the
  // starters must already be in catalog order or they swap places when the catalog arrives.
  it('lists the starter rows in the same relative order as the full catalog', async () => {
    const catalog = await loadMachinesCatalog();
    const starterIds = new Set(STARTER_MACHINES.map((m) => m.id));
    const inCatalog = catalog.filter((m) => starterIds.has(m.id)).map((m) => m.id);
    expect(STARTER_MACHINES.map((m) => m.id)).toEqual(inCatalog);
  });
});
