import { describe, it, expect } from 'vitest';
import type { Machine } from '../types';
import type { PracticeTrack } from '../data/tracksData';
import { buildTrackOrderIndex, getTrackProgress } from './trackProgress';

const mk = (id: string, name: string, status: Machine['status'] = 'backlog', platform: Machine['platform'] = 'HTB'): Machine =>
  ({ id, name, platform, status, tags: [], certifications: [], difficulty: 'Easy', os: 'Linux', ip: '', timeSpentSeconds: 0 }) as unknown as Machine;

const track = (id: string, names: string[], order?: string[]): Pick<PracticeTrack, 'id' | 'order' | 'filterFn'> => {
  const keys = new Set(names.map((n) => `HTB:${n.toLowerCase()}`));
  return { id, order, filterFn: (m) => keys.has(`${m.platform}:${m.name.toLowerCase()}`) };
};

describe('getTrackProgress', () => {
  it('reports an empty track as 0 of 0 with nothing next', () => {
    expect(getTrackProgress(track('t-empty', []), [mk('1', 'Lame')])).toEqual({ done: 0, total: 0, percent: 0, next: null });
    expect(getTrackProgress(track('t-empty2', ['Lame']), [])).toEqual({ done: 0, total: 0, percent: 0, next: null });
  });

  it('counts root and completed as done and picks the first open machine in track order', () => {
    const machines = [mk('a', 'Alpha', 'root'), mk('b', 'Bravo', 'foothold'), mk('c', 'Charlie', 'completed'), mk('d', 'Delta')];
    const t = track('t-order', ['Alpha', 'Bravo', 'Charlie', 'Delta'], ['HTB:delta', 'HTB:bravo', 'HTB:alpha', 'HTB:charlie']);
    const p = getTrackProgress(t, machines);
    expect(p).toMatchObject({ done: 2, total: 4, percent: 50 });
    expect(p.next?.name).toBe('Delta');
  });

  it('has no next machine once everything is done', () => {
    const machines = [mk('a', 'Alpha', 'root'), mk('b', 'Bravo', 'completed')];
    const p = getTrackProgress(track('t-done', ['Alpha', 'Bravo']), machines);
    expect(p).toEqual({ done: 2, total: 2, percent: 100, next: null });
  });

  it('ignores list entries that are not in the catalog', () => {
    const machines = [mk('a', 'Alpha', 'root')];
    const t = track('t-unknown', ['Alpha', 'Ghost'], ['HTB:ghost', 'HTB:alpha', 'HTB:phantom']);
    expect(getTrackProgress(t, machines)).toMatchObject({ done: 1, total: 1, percent: 100, next: null });
  });

  it('puts members outside the list after the listed ones, keeping catalog order', () => {
    const machines = [mk('x', 'Xray'), mk('y', 'Yankee'), mk('a', 'Alpha')];
    const t = track('t-tail', ['Xray', 'Yankee', 'Alpha'], ['HTB:alpha']);
    expect(getTrackProgress(t, machines).next?.name).toBe('Alpha');
    const noneListed = track('t-none', ['Xray', 'Yankee'], ['HTB:alpha']);
    expect(getTrackProgress(noneListed, machines).next?.name).toBe('Xray');
  });
});

describe('buildTrackOrderIndex', () => {
  const machines = [mk('m1', 'Alpha'), mk('m2', 'Bravo'), mk('m3', 'Charlie'), mk('t1', 'Alpha', 'backlog', 'THM')];

  it('maps machine ids to their position in the list, per platform', () => {
    const idx = buildTrackOrderIndex({ id: 'idx-a', order: ['HTB:charlie', 'HTB:alpha', 'THM:alpha'] }, machines);
    expect(idx.get('m3')).toBe(0);
    expect(idx.get('m1')).toBe(1);
    expect(idx.get('t1')).toBe(2);
    expect(idx.has('m2')).toBe(false);
  });

  it('is empty for a track without an order, and is built once per machine list', () => {
    expect(buildTrackOrderIndex({ id: 'idx-none' }, machines).size).toBe(0);
    const t = { id: 'idx-memo', order: ['HTB:alpha'] };
    expect(buildTrackOrderIndex(t, machines)).toBe(buildTrackOrderIndex(t, machines));
    expect(buildTrackOrderIndex(t, [...machines])).not.toBe(buildTrackOrderIndex(t, machines));
  });
});
