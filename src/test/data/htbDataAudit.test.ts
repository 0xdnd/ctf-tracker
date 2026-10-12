import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';

// Values corrected by the HTB data audit (0xdf post badges + IppSec dataset); guards against regressions.
const CORRECTED: Array<{ id: string; name: string; os?: string; difficulty?: string }> = [
  { id: 'htb-escapetwo', name: 'EscapeTwo', difficulty: 'Easy' },
  { id: 'htb-bastion', name: 'Bastion', difficulty: 'Easy' },
  { id: 'htb-flight', name: 'Flight', difficulty: 'Hard' },
  { id: 'htb-jarmis', name: 'Jarmis', difficulty: 'Medium' },
  { id: 'htb-luke', name: 'Luke', os: 'BSD' },
  { id: 'htb-sunday', name: 'Sunday', os: 'Other' },
  { id: 'htb-codeparttwo', name: 'CodePartTwo', os: 'Linux', difficulty: 'Easy' },
];

describe('HTB data audit corrections', () => {
  it.each(CORRECTED)('$name keeps its corrected values', ({ id, name, os, difficulty }) => {
    const m = INITIAL_MACHINES.find((r) => r.id === id);
    expect(m, id).toBeDefined();
    expect(m?.platform).toBe('HTB');
    expect(m?.name).toBe(name);
    if (os) expect(m?.os).toBe(os);
    if (difficulty) expect(m?.difficulty).toBe(difficulty);
  });

  it('CodePartTwo uses its official HTB name and room link, with no CodeTwo row left', () => {
    const m = INITIAL_MACHINES.find((r) => r.id === 'htb-codeparttwo');
    expect(m?.roomUrl).toBe('https://app.hackthebox.com/machines/CodePartTwo');
    expect(INITIAL_MACHINES.some((r) => r.id === 'htb-codetwo' || r.name.toLowerCase() === 'codetwo')).toBe(false);
  });

  it('Spectra stays Linux', () => {
    expect(INITIAL_MACHINES.find((r) => r.id === 'htb-spectra')?.os).toBe('Linux');
  });
});
