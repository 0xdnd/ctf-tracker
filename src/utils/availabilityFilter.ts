import type { Machine } from '../types';

export type AvailabilityValue = 'ALL' | 'ACTIVE' | 'RETIRED';

/**
 * Availability filter predicate. A missing filter value means 'ALL'; a machine without `isActive`
 * counts as retired.
 */
export const matchesAvailability = (
  m: Pick<Machine, 'isActive'>,
  filter: AvailabilityValue | undefined,
): boolean => {
  if (!filter || filter === 'ALL') return true;
  return filter === 'ACTIVE' ? m.isActive === true : m.isActive !== true;
};

export const AVAILABILITY_LABELS: Record<AvailabilityValue, string> = {
  ALL: 'All',
  ACTIVE: 'Active',
  RETIRED: 'Retired',
};
