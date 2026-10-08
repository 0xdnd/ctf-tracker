import { describe, it, expect } from 'vitest';
import { nextSortKeys, buildComparator, sortByKeys, rangeIds, applySelectionClick, SortKey } from './tableSort';

type Row = { id: string; name: string; os: string; time: number | undefined };
const rows: Row[] = [
  { id: '1', name: 'b', os: 'Linux', time: 5 },
  { id: '2', name: 'a', os: 'Windows', time: 5 },
  { id: '3', name: 'c', os: 'Linux', time: 1 },
  { id: '4', name: 'd', os: 'Linux', time: 5 },
  { id: '5', name: 'e', os: 'Windows', time: undefined },
];
const ids = (r: Row[]) => r.map((x) => x.id);

describe('nextSortKeys', () => {
  it('plain click sets primary, then flips direction, dropping secondaries', () => {
    let k: SortKey[] = [];
    k = nextSortKeys(k, 'os', false);
    expect(k).toEqual([{ field: 'os', dir: 'asc' }]);
    k = nextSortKeys(k, 'os', false);
    expect(k).toEqual([{ field: 'os', dir: 'desc' }]);
    k = nextSortKeys([{ field: 'os', dir: 'asc' }, { field: 'name', dir: 'asc' }], 'time', false);
    expect(k).toEqual([{ field: 'time', dir: 'asc' }]);
  });

  it('shift click appends, toggles desc, then removes', () => {
    let k: SortKey[] = [{ field: 'os', dir: 'asc' }];
    k = nextSortKeys(k, 'time', true);
    expect(k).toEqual([{ field: 'os', dir: 'asc' }, { field: 'time', dir: 'asc' }]);
    k = nextSortKeys(k, 'time', true);
    expect(k[1]).toEqual({ field: 'time', dir: 'desc' });
    k = nextSortKeys(k, 'time', true);
    expect(k).toEqual([{ field: 'os', dir: 'asc' }]);
  });
});

describe('buildComparator / sortByKeys', () => {
  it('sorts by two keys (asc, asc) and breaks ties with the secondary', () => {
    const out = sortByKeys(rows, [{ field: 'os', dir: 'asc' }, { field: 'name', dir: 'asc' }]);
    expect(ids(out)).toEqual(['1', '3', '4', '2', '5']);
  });

  it('honours per-key direction (asc primary, desc secondary)', () => {
    const out = sortByKeys(rows, [{ field: 'os', dir: 'asc' }, { field: 'name', dir: 'desc' }]);
    expect(ids(out)).toEqual(['4', '3', '1', '5', '2']);
  });

  it('desc primary reverses group order', () => {
    const out = sortByKeys(rows, [{ field: 'os', dir: 'desc' }, { field: 'name', dir: 'asc' }]);
    expect(ids(out)).toEqual(['2', '5', '1', '3', '4']);
  });

  it('is stable on full ties and keeps nullish last in both directions', () => {
    const asc = sortByKeys(rows, [{ field: 'time', dir: 'asc' }]);
    expect(ids(asc)).toEqual(['3', '1', '2', '4', '5']);
    const desc = sortByKeys(rows, [{ field: 'time', dir: 'desc' }]);
    expect(ids(desc)).toEqual(['1', '2', '4', '3', '5']);
  });

  it('does not mutate input and keeps input order with no keys', () => {
    const copy = [...rows];
    expect(ids(sortByKeys(rows, []))).toEqual(ids(rows));
    sortByKeys(rows, [{ field: 'name', dir: 'desc' }]);
    expect(rows).toEqual(copy);
  });

  it('comparator returns 0 for ties', () => {
    const cmp = buildComparator<Row>([{ field: 'os', dir: 'asc' }]);
    expect(cmp(rows[0], rows[2])).toBe(0);
  });
});

describe('range selection', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];

  it('rangeIds is inclusive and direction-agnostic', () => {
    expect(rangeIds(order, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(rangeIds(order, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(rangeIds(order, 'c', 'c')).toEqual(['c']);
  });

  it('falls back to the target when the anchor is missing or stale', () => {
    expect(rangeIds(order, null, 'c')).toEqual(['c']);
    expect(rangeIds(order, 'zzz', 'c')).toEqual(['c']);
    expect(rangeIds(order, 'a', 'zzz')).toEqual([]);
  });

  it('plain click toggles one row and moves the anchor', () => {
    const r1 = applySelectionClick(new Set(), order, null, 'b', false);
    expect([...r1.selected]).toEqual(['b']);
    expect(r1.anchor).toBe('b');
    const r2 = applySelectionClick(r1.selected, order, r1.anchor, 'b', false);
    expect(r2.selected.size).toBe(0);
  });

  it('shift click selects the range from the anchor', () => {
    const r1 = applySelectionClick(new Set(), order, null, 'b', false);
    const r2 = applySelectionClick(r1.selected, order, r1.anchor, 'e', true);
    expect([...r2.selected].sort()).toEqual(['b', 'c', 'd', 'e']);
    expect(r2.anchor).toBe('e');
  });

  it('shift click on a selected row deselects the range', () => {
    const r = applySelectionClick(new Set(order), order, 'a', 'c', true);
    expect([...r.selected].sort()).toEqual(['d', 'e']);
  });
});
