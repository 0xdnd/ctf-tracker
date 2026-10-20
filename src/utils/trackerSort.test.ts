import { describe, it, expect } from 'vitest';
import type { Machine } from '../types';
import { INITIAL_MACHINES } from '../data/machinesCatalog';
import { TRACK_BY_ID, type PracticeTrack } from '../data/tracksData';
import { getOrderedActiveTrack, resolveSortMode, sortMachines } from './trackerSort';
import { buildTrackOrderIndex } from './trackProgress';

const mk = (id: string, name: string): Machine =>
  ({ id, name, platform: 'HTB', status: 'backlog', tags: [], certifications: [], difficulty: 'Easy', os: 'Linux', ip: '10.0.0.1', timeSpentSeconds: 0 }) as unknown as Machine;

describe('resolveSortMode', () => {
  it('follows the track only for the default sort with exactly one ordered track', () => {
    expect(resolveSortMode({ sortBy: 'default', selectedTrack: 'ALL', selectedTracks: [] })).toBe('default');
    expect(resolveSortMode({ sortBy: 'default', selectedTrack: 'tjnull-oscp', selectedTracks: ['tjnull-oscp'] })).toBe('track');
    expect(resolveSortMode({ sortBy: 'name', selectedTrack: 'tjnull-oscp', selectedTracks: ['tjnull-oscp'] })).toBe('name');
    expect(resolveSortMode({ sortBy: 'default', selectedTrack: 'MULTI', selectedTracks: ['tjnull-oscp', 'osep'] })).toBe('default');
  });

  it('ignores tracks that have no curated order', () => {
    expect(TRACK_BY_ID.get('cpts-path')?.order).toBeUndefined();
    expect(getOrderedActiveTrack({ selectedTrack: 'cpts-path', selectedTracks: ['cpts-path'] })).toBeNull();
    expect(resolveSortMode({ sortBy: 'default', selectedTrack: 'cpts-path', selectedTracks: ['cpts-path'] })).toBe('default');
  });
});

describe('sortMachines', () => {
  const track: PracticeTrack = {
    id: 'sort-fake',
    name: '',
    shortName: '',
    category: 'curated',
    description: '',
    badgeColor: '',
    accentColor: '',
    filterFn: () => true,
    order: ['HTB:gamma', 'HTB:alpha', 'HTB:beta'],
  };
  const catalog = [mk('1', 'Alpha'), mk('2', 'Delta'), mk('3', 'Beta'), mk('4', 'Gamma'), mk('5', 'Epsilon')];

  it('orders by the track and sends unlisted machines last, in their incoming order', () => {
    const out = sortMachines([...catalog], { mode: 'track', direction: 'asc', seed: 1, catalog, track });
    expect(out.map((m) => m.name)).toEqual(['Gamma', 'Alpha', 'Beta', 'Delta', 'Epsilon']);
  });

  it('reuses the precomputed index instead of rebuilding it', () => {
    sortMachines([...catalog], { mode: 'track', direction: 'asc', seed: 1, catalog, track });
    expect(buildTrackOrderIndex(track, catalog)).toBe(buildTrackOrderIndex(track, catalog));
  });

  it('keeps the other sorts unchanged', () => {
    const byName = sortMachines([...catalog], { mode: 'name', direction: 'desc', seed: 1, catalog, track: null });
    expect(byName.map((m) => m.name)).toEqual(['Gamma', 'Epsilon', 'Delta', 'Beta', 'Alpha']);
  });

  it('orders a real track by its source list', () => {
    const oscp = TRACK_BY_ID.get('tjnull-oscp')!;
    const members = INITIAL_MACHINES.filter(oscp.filterFn);
    expect(members.length).toBeGreaterThan(5);
    const out = sortMachines([...members].reverse(), { mode: 'track', direction: 'asc', seed: 1, catalog: INITIAL_MACHINES, track: oscp });
    const idx = buildTrackOrderIndex(oscp, INITIAL_MACHINES);
    const positions = out.map((m) => idx.get(m.id) ?? Number.MAX_SAFE_INTEGER);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions[0]).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
