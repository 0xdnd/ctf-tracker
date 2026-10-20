import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { appendActiveMachines } from '../../data/activeMachines';
import { PRACTICE_TRACKS } from '../../data/tracksData';
import type { Machine } from '../../types';
import type { FilterState } from '../../store/useCtfStore';
import { isActiveDirectory, matchesCategory, matchesDomain } from '../../utils/categoryUtils';
import { createMachineFilter, matchesFilters, isCompleted } from '../../utils/machineFilter';

const STATUSES: Machine['status'][] = ['backlog', 'recon', 'foothold', 'root', 'completed'];
// Catalog as the app sees it, with a deterministic spread of statuses and active rows.
const CATALOG: Machine[] = appendActiveMachines(INITIAL_MACHINES).map((m, i) => ({
  ...m,
  status: STATUSES[i % STATUSES.length],
}));

const BASE: FilterState = {
  searchQuery: '',
  selectedPlatform: 'ALL',
  selectedDifficulty: 'ALL',
  selectedCert: 'ALL',
  selectedOs: 'ALL',
  selectedAvailability: 'ALL',
  selectedCategory: 'ALL',
  selectedVulnCategory: 'ALL',
  excludeActiveDirectory: false,
  selectedTrack: 'ALL',
  selectedTracks: [],
  selectedStatus: 'ALL',
  selectedLanguage: 'ALL',
  selectedAreaOfInterest: 'ALL',
  selectedTechnique: 'ALL',
  selectedTags: [],
  sortBy: 'default',
  sortDirection: 'asc',
  hideEmptyLanes: false,
};

const ids = (list: Machine[]) => list.map((m) => m.id);

describe('isCompleted', () => {
  it('is true for root and completed only', () => {
    expect(STATUSES.map((s) => isCompleted({ status: s }))).toEqual([false, false, false, true, true]);
  });
});

describe('matchesFilters', () => {
  const pick = (f: Partial<FilterState>, ctx?: Parameters<typeof matchesFilters>[2]) =>
    CATALOG.filter((m) => matchesFilters(m, { ...BASE, ...f }, ctx));

  it('default filters match the whole catalog', () => {
    expect(pick({})).toHaveLength(CATALOG.length);
  });

  it('platform, difficulty and os are exact matches', () => {
    expect(pick({ selectedPlatform: 'HTB' }).every((m) => m.platform === 'HTB')).toBe(true);
    expect(pick({ selectedDifficulty: 'Easy' }).every((m) => m.difficulty === 'Easy')).toBe(true);
    const win = pick({ selectedOs: 'Windows' });
    expect(win.length).toBeGreaterThan(0);
    expect(win.every((m) => m.os === 'Windows')).toBe(true);
  });

  it('availability splits the catalog into disjoint halves', () => {
    const active = pick({ selectedAvailability: 'ACTIVE' });
    const retired = pick({ selectedAvailability: 'RETIRED' });
    expect(active.length + retired.length).toBe(CATALOG.length);
  });

  it('status buckets: uncompleted excludes root/completed, completed keeps only them', () => {
    const un = pick({ selectedStatus: 'UNCOMPLETED' });
    const done = pick({ selectedStatus: 'COMPLETED' });
    const foot = pick({ selectedStatus: 'FOOTHOLD' });
    expect(un.some(isCompleted)).toBe(false);
    expect(done.every(isCompleted)).toBe(true);
    expect(foot.every((m) => m.status === 'foothold')).toBe(true);
    expect(un.length + done.length).toBe(CATALOG.length);
  });

  it('cert and tags (AND) narrow the result', () => {
    expect(pick({ selectedCert: 'OSCP' }).every((m) => m.certifications.includes('OSCP'))).toBe(true);
    const tag = CATALOG.find((m) => m.tags.length >= 2)!;
    const [a, b] = tag.tags;
    const both = pick({ selectedTags: [a, b] });
    expect(both.every((m) => m.tags.includes(a) && m.tags.includes(b))).toBe(true);
    expect(both.map((m) => m.id)).toContain(tag.id);
  });

  it('tracks are OR-ed; the single track is used only when the multi-select is empty', () => {
    const a = PRACTICE_TRACKS[0];
    const b = PRACTICE_TRACKS[1];
    const union = pick({ selectedTracks: [a.id, b.id], selectedTrack: 'MULTI' });
    expect(ids(union)).toEqual(ids(CATALOG.filter((m) => a.filterFn(m) || b.filterFn(m))));
    expect(ids(pick({ selectedTrack: a.id }))).toEqual(ids(CATALOG.filter(a.filterFn)));
    expect(ids(pick({ selectedTrack: 'x', selectedTracks: [a.id] }))).toEqual(ids(CATALOG.filter(a.filterFn)));
    // An unknown id (such as the MULTI marker) resolves to no track, so it filters nothing.
    expect(pick({ selectedTrack: 'MULTI' })).toHaveLength(CATALOG.length);
  });

  it('domain tab applies only without a specific vulnerability category', () => {
    const web = pick({}, { domain: 'web' });
    expect(web.length).toBeGreaterThan(0);
    expect(web.length).toBeLessThan(CATALOG.length);
    expect(web.every((m) => matchesDomain(m, 'web'))).toBe(true);
    const cat = pick({ selectedVulnCategory: 'Active Directory' }, { domain: 'web' });
    expect(ids(cat)).toEqual(ids(CATALOG.filter((m) => matchesCategory(m, 'Active Directory'))));
  });

  it('excludeActiveDirectory drops AD machines', () => {
    const r = pick({ excludeActiveDirectory: true });
    expect(r.some(isActiveDirectory)).toBe(false);
    expect(r.length).toBeLessThan(CATALOG.length);
  });

  it('search supports operators and multi-word text', () => {
    const r = pick({ searchQuery: 'os:windows diff:easy' });
    expect(r.every((m) => m.os === 'Windows' && m.difficulty === 'Easy')).toBe(true);
    const one = CATALOG[3];
    expect(ids(pick({ searchQuery: one.name })).includes(one.id)).toBe(true);
  });

  it('skip ignores one dimension so option counts can be computed', () => {
    const f = { selectedPlatform: 'HTB' as const, selectedOs: 'Windows' as const };
    const withoutOs = pick(f, { skip: ['os'] });
    expect(withoutOs.every((m) => m.platform === 'HTB')).toBe(true);
    expect(withoutOs.length).toBeGreaterThan(pick(f).length);
  });

  it('createMachineFilter agrees with matchesFilters', () => {
    const f = { ...BASE, selectedOs: 'Linux' as const, selectedDifficulty: 'Medium' as const };
    const fn = createMachineFilter(f);
    expect(ids(CATALOG.filter(fn))).toEqual(ids(CATALOG.filter((m) => matchesFilters(m, f))));
  });

  it('language, area and technique use the text heuristics', () => {
    expect(pick({ selectedLanguage: 'PHP' }).length).toBeGreaterThan(0);
    expect(pick({ selectedAreaOfInterest: 'Web Application' }).length).toBeGreaterThan(0);
    expect(pick({ selectedTechnique: 'SUID / SGID Exploitation' }).length).toBeGreaterThan(0);
    expect(pick({ selectedLanguage: 'zzzz-no-such-thing' })).toHaveLength(0);
  });
});
