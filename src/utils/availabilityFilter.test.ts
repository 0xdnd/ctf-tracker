import { describe, it, expect } from 'vitest';
import { matchesAvailability } from './availabilityFilter';

describe('matchesAvailability', () => {
  const active = { isActive: true };
  const retired = { isActive: false };
  const unset = {};

  it('treats missing or ALL as pass-through', () => {
    for (const m of [active, retired, unset]) {
      expect(matchesAvailability(m, undefined)).toBe(true);
      expect(matchesAvailability(m, 'ALL')).toBe(true);
    }
  });

  it('ACTIVE keeps only isActive === true', () => {
    expect(matchesAvailability(active, 'ACTIVE')).toBe(true);
    expect(matchesAvailability(retired, 'ACTIVE')).toBe(false);
    expect(matchesAvailability(unset, 'ACTIVE')).toBe(false);
  });

  it('RETIRED keeps everything not active, including unset', () => {
    expect(matchesAvailability(active, 'RETIRED')).toBe(false);
    expect(matchesAvailability(retired, 'RETIRED')).toBe(true);
    expect(matchesAvailability(unset, 'RETIRED')).toBe(true);
  });
});
