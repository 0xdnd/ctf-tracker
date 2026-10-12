import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';

// Retired HTB machines added as lean metadata-only rows (name, OS, difficulty, room link).
const RETIRED_METADATA_ONLY: Array<[string, 'Linux' | 'Windows', 'Easy' | 'Medium']> = [
  ['Logging', 'Windows', 'Medium'],
  ['CCTV', 'Linux', 'Easy'],
  ['DevArea', 'Linux', 'Medium'],
  ['Facts', 'Linux', 'Easy'],
  ['Eighteen', 'Windows', 'Easy'],
  ['Browsed', 'Linux', 'Medium'],
  ['Expressway', 'Linux', 'Easy'],
  ['Signed', 'Windows', 'Medium'],
  ['Editor', 'Linux', 'Easy'],
  ['Outbound', 'Linux', 'Easy'],
  ['Voleur', 'Windows', 'Medium'],
  ['TombWatcher', 'Windows', 'Medium'],
  ['Puppy', 'Windows', 'Medium'],
  ['Fluffy', 'Windows', 'Easy'],
  ['TheFrizz', 'Windows', 'Medium'],
  ['Dog', 'Linux', 'Easy'],
  ['Titanic', 'Linux', 'Easy'],
  ['LinkVortex', 'Linux', 'Easy'],
  ['Certified', 'Windows', 'Medium'],
  ['Cicada', 'Windows', 'Easy'],
  ['Editorial', 'Linux', 'Easy'],
  ['BoardLight', 'Linux', 'Easy'],
];

const SPOILER_FIELDS = [
  'hint',
  'officialSynopsis',
  'officialPdf',
  'officialWalkthrough',
  'writeupUrl',
  'writeupMarkdown',
  'skillsLearned',
  'userFlag',
  'rootFlag',
  'openPorts',
  'services',
] as const;

describe('metadata-only retired HTB rows', () => {
  it.each(RETIRED_METADATA_ONLY)('%s is a single lean, non-active HTB row', (name, os, difficulty) => {
    const rows = INITIAL_MACHINES.filter((m) => m.name.toLowerCase() === name.toLowerCase());
    expect(rows).toHaveLength(1);
    const m = rows[0];
    expect(m.id).toBe(`htb-${name.toLowerCase()}`);
    expect(m.platform).toBe('HTB');
    expect(m.os).toBe(os);
    expect(m.difficulty).toBe(difficulty);
    expect(m.status).toBe('backlog');
    expect(m.isActive).toBe(false);
    expect(m.tags).toEqual([]);
    expect(m.certifications).toEqual([]);
    expect(m.roomUrl).toBe(`https://app.hackthebox.com/machines/${name}`);
    for (const f of SPOILER_FIELDS) expect(m[f], `${name}.${f}`).toBeUndefined();
  });

  it('none of them is on the active list, so merging keeps them retired', () => {
    const active = new Set(ACTIVE_MACHINES.machines.map((a) => a.name.toLowerCase()));
    const merged = appendActiveMachines(INITIAL_MACHINES);
    for (const [name] of RETIRED_METADATA_ONLY) {
      expect(active.has(name.toLowerCase()), name).toBe(false);
      expect(merged.filter((m) => m.name === name).map((m) => m.isActive)).toEqual([false]);
    }
  });
});
