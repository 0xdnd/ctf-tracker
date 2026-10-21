import { describe, it, expect } from 'vitest';
import { computeChecklistProgress, computeChecklistProgressForMachine } from './checklistProgress';
import { generateApplicablePhases } from '../data/methodologyFramework';

const phases = [
  {
    subcategories: [
      { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
      { items: [{ id: 'd' }, { id: 'e' }] },
    ],
  },
  { subcategories: [{ items: [{ id: 'f' }] }] },
] as any;

describe('computeChecklistProgress', () => {
  it('counts each status', () => {
    const r = computeChecklistProgress(phases, {
      a: { status: 'done' },
      b: { status: 'done' },
      c: { status: 'in_progress' },
      d: { status: 'na' },
    });
    expect(r).toMatchObject({ total: 6, completed: 2, inProgress: 1, na: 1, activeTotal: 5 });
  });

  it('computes percentage over total minus na', () => {
    const r = computeChecklistProgress(phases, {
      a: { status: 'done' },
      b: { status: 'na' },
      c: { status: 'na' },
      d: { status: 'na' },
      e: { status: 'na' },
    });
    expect(r.activeTotal).toBe(2);
    expect(r.percentage).toBe(50);
  });

  it('returns 0 when everything is na or the list is empty', () => {
    const allNa = Object.fromEntries('abcdef'.split('').map((id) => [id, { status: 'na' }]));
    expect(computeChecklistProgress(phases, allNa as any).percentage).toBe(0);
    expect(computeChecklistProgress([], {})).toEqual({
      total: 0, completed: 0, inProgress: 0, na: 0, activeTotal: 0, percentage: 0,
    });
  });

  it('treats undefined itemsState as all todo', () => {
    const r = computeChecklistProgress(phases, undefined);
    expect(r).toMatchObject({ total: 6, completed: 0, inProgress: 0, na: 0, percentage: 0 });
  });
});

describe('computeChecklistProgressForMachine', () => {
  it('matches the core fn over the machine phases', () => {
    const base = { id: 'm', name: 'M', os: 'Linux', openPorts: [80] } as any;
    const first = generateApplicablePhases(base, [80])[0].subcategories[0].items[0].id;
    const machine = { ...base, checklist: { itemsState: { [first]: { status: 'done' } } } } as any;
    const expected = computeChecklistProgress(
      generateApplicablePhases(machine, [80]),
      machine.checklist.itemsState
    );
    expect(computeChecklistProgressForMachine(machine)).toEqual(expected);
    expect(expected.completed).toBe(1);
  });
});
