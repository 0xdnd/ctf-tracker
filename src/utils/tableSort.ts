/**
 * Pure helpers for the tracker table: multi-key sorting and shift-range selection.
 * No React / store imports so they stay trivially testable.
 */

export type SortDir = 'asc' | 'desc';

export interface SortKey<F extends string = string> {
  field: F;
  dir: SortDir;
}

/**
 * Header click semantics.
 * - plain click (additive=false): this field becomes the only/primary key.
 *   If it is already the primary key its direction flips, otherwise it starts ascending.
 * - shift click (additive=true): edits the key list in place.
 *   absent -> appended asc, asc -> desc, desc -> removed.
 */
export function nextSortKeys<F extends string>(
  keys: readonly SortKey<F>[],
  field: F,
  additive: boolean,
): SortKey<F>[] {
  if (!additive) {
    const primary = keys[0];
    if (primary && primary.field === field) {
      return [{ field, dir: primary.dir === 'asc' ? 'desc' : 'asc' }];
    }
    return [{ field, dir: 'asc' }];
  }
  const idx = keys.findIndex((k) => k.field === field);
  if (idx === -1) return [...keys, { field, dir: 'asc' }];
  if (keys[idx].dir === 'asc') {
    return keys.map((k, i) => (i === idx ? { field, dir: 'desc' as SortDir } : k));
  }
  return keys.filter((_, i) => i !== idx);
}

const isNil = (v: unknown): v is null | undefined => v === null || v === undefined;

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return 0;
}

/**
 * Builds a comparator that walks the keys in priority order. Nullish values always sort last
 * (regardless of direction). Returns 0 on full ties so Array.prototype.sort (stable) preserves input order.
 */
export function buildComparator<T, F extends string = string>(
  keys: readonly SortKey<F>[],
  getValue: (item: T, field: F) => unknown = (item, field) => (item as Record<string, unknown>)[field],
): (a: T, b: T) => number {
  const frozen = keys.map((k) => ({ field: k.field, sign: k.dir === 'asc' ? 1 : -1 }));
  return (a, b) => {
    for (const { field, sign } of frozen) {
      const va = getValue(a, field);
      const vb = getValue(b, field);
      const aNil = isNil(va);
      const bNil = isNil(vb);
      if (aNil || bNil) {
        if (aNil && bNil) continue;
        return aNil ? 1 : -1;
      }
      const c = compareValues(va, vb);
      if (c !== 0) return c * sign;
    }
    return 0;
  };
}

/** Returns a sorted copy; the input is never mutated. With no keys the original order is kept. */
export function sortByKeys<T, F extends string = string>(
  items: readonly T[],
  keys: readonly SortKey<F>[],
  getValue?: (item: T, field: F) => unknown,
): T[] {
  const copy = [...items];
  if (keys.length === 0) return copy;
  return copy.sort(buildComparator<T, F>(keys, getValue));
}

/** Inclusive ids between anchor and target in display order. Falls back to [target] when the anchor is missing. */
export function rangeIds(orderedIds: readonly string[], anchorId: string | null, targetId: string): string[] {
  const t = orderedIds.indexOf(targetId);
  if (t === -1) return [];
  const a = anchorId === null ? -1 : orderedIds.indexOf(anchorId);
  if (a === -1) return [targetId];
  const [lo, hi] = a < t ? [a, t] : [t, a];
  return orderedIds.slice(lo, hi + 1);
}

/**
 * Applies a (shift-)click on a row checkbox. The target's toggled state is applied to the whole
 * range when shift is held and an anchor exists; otherwise only the target toggles.
 * Returns a new Set and the new anchor (always the clicked row).
 */
export function applySelectionClick(
  selected: ReadonlySet<string>,
  orderedIds: readonly string[],
  anchorId: string | null,
  targetId: string,
  shift: boolean,
): { selected: Set<string>; anchor: string } {
  const next = new Set(selected);
  const willSelect = !selected.has(targetId);
  const ids = shift ? rangeIds(orderedIds, anchorId, targetId) : [targetId];
  for (const id of ids) {
    if (willSelect) next.add(id);
    else next.delete(id);
  }
  return { selected: next, anchor: targetId };
}
