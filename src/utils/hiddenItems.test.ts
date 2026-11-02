import { describe, it, expect } from 'vitest';
import { MASTER_METHODOLOGY_FRAMEWORK, generateApplicablePhases } from '../data/methodologyFramework';
import { summarizeHiddenItems, hiddenItemsMessage } from './hiddenItems';
import type { Machine } from '../types';

const target = (os: string) => ({ id: 't', name: 't', os }) as unknown as Machine;
const count = (p: { subcategories: { items: unknown[] }[] }) => p.subcategories.reduce((n, s) => n + s.items.length, 0);

describe('hidden checklist items', () => {
  it('framework totals 54 items in the expected phase split', () => {
    expect(MASTER_METHODOLOGY_FRAMEWORK.map(count)).toEqual([4, 18, 4, 5, 4, 4, 11, 4]);
  });

  it('a Linux target with no open ports sees 49 and the OS is the only cause', () => {
    const phases = generateApplicablePhases(target('Linux'), []);
    expect(summarizeHiddenItems(phases)).toEqual({ total: 54, shown: 49, hidden: 5, osOnly: true });
    expect(hiddenItemsMessage(phases, 'Linux')).toBe(
      "Showing 49 of 54 items. 5 items are hidden because they don't apply to a Linux target."
    );
  });

  it('uses "an" before an OS name that starts with a vowel', () => {
    const phases = generateApplicablePhases(target('Android'), []);
    expect(hiddenItemsMessage(phases, 'Android')).toContain('because they don\'t apply to an Android target.');
  });

  it('names OS or open ports when ports hide branches too', () => {
    const phases = generateApplicablePhases(target('Linux'), [22]);
    const msg = hiddenItemsMessage(phases, 'Linux');
    expect(msg).toContain("this target's OS or open ports");
  });

  it('returns null when nothing is filtered', () => {
    expect(hiddenItemsMessage(MASTER_METHODOLOGY_FRAMEWORK)).toBeNull();
  });
});
