import { describe, it, expect } from 'vitest';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { appendActiveMachines } from '../../data/activeMachines';
import { LIST_BASED_TRACK_IDS, PRACTICE_TRACKS, TRACK_BY_ID, TRACK_NAME_LISTS, trackNameSlug } from '../../data/tracksData';
import oscp from '../../data/trackSources/offsec-oscp.json';
import osep from '../../data/trackSources/offsec-osep.json';
import oswe from '../../data/trackSources/offsec-oswe.json';
import ad from '../../data/trackSources/htb-active-directory.json';
import ippsec from '../../data/trackSources/ippsec-videos.json';

// Catalog as the app sees it: retired rows plus metadata-only active rows.
const CATALOG = appendActiveMachines(INITIAL_MACHINES);
const SOURCES = { oscp, osep, oswe, ad, ippsec };
const track = (id: string) => {
  const t = TRACK_BY_ID.get(id);
  if (!t) throw new Error(`missing track ${id}`);
  return t;
};
const rowsFor = (platform: 'HTB' | 'THM', name: string) =>
  CATALOG.filter((m) => m.platform === platform && trackNameSlug(m.name) === trackNameSlug(name));

describe('practice track sources', () => {
  it.each(Object.entries(SOURCES))('%s source file is names-only, dated and sourced', (_key, src) => {
    expect(src.asOf).toBe('2026-10-12');
    expect(src.source).toMatch(/^https:\/\//);
    expect(Object.keys(src.names)).toEqual(['HTB']);
    expect(src.names.HTB.length).toBeGreaterThan(0);
    expect(new Set(src.names.HTB.map(trackNameSlug)).size).toBe(src.names.HTB.length);
  });

  it.each(Object.entries(TRACK_NAME_LISTS))('every %s name resolves to exactly one row on its platform', (key, list) => {
    for (const platform of ['HTB', 'THM'] as const) {
      for (const name of list[platform]) {
        expect(rowsFor(platform, name), `${key} ${platform} ${name}`).toHaveLength(1);
      }
    }
  });

  it('strips a trailing parenthetical, so "Active (2018 Retired)" is the listed "Active"', () => {
    expect(trackNameSlug('Active (2018 Retired)')).toBe('active');
    expect(track('tjnull-oscp').filterFn(rowsFor('HTB', 'Active')[0])).toBe(true);
  });
});

describe('practice track membership', () => {
  it('no active machine is in any list-based track', () => {
    const active = CATALOG.filter((m) => m.isActive);
    expect(active.length).toBeGreaterThan(0);
    const listBased = PRACTICE_TRACKS.filter((t) => LIST_BASED_TRACK_IDS.has(t.id));
    expect(listBased.map((t) => t.id).sort()).toEqual(
      ['cpts-path', 'crto-ad', 'cwee-web', 'ippsec-cpts', 'ippsec-vault', 'osep', 'oswe', 'popular-classics', 'tjnull-oscp']
    );
    for (const t of listBased) {
      expect(active.filter(t.filterFn).map((m) => m.name), t.id).toEqual([]);
    }
  });

  it('pure difficulty/OS filters still include matching active machines', () => {
    const active = CATALOG.filter((m) => m.isActive);
    const easy = active.filter((m) => m.difficulty === 'Easy');
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every(track('beginner-essentials').filterFn)).toBe(true);
    const windows = active.filter((m) => m.os === 'Windows');
    expect(windows.every(track('windows-privesc').filterFn)).toBe(true);
    const hard = active.filter((m) => m.difficulty === 'Hard' || m.difficulty === 'Insane');
    expect(hard.every(track('insane-hardcore').filterFn)).toBe(true);
  });

  it('names are platform-aware: THM Retro is in the OSCP track, HTB Retro is not', () => {
    const oscpTrack = track('tjnull-oscp');
    expect(oscpTrack.filterFn(rowsFor('THM', 'Retro')[0])).toBe(true);
    expect(oscpTrack.filterFn(rowsFor('HTB', 'Retro')[0])).toBe(false);
  });

  it('the OSEP, OSWE and IppSec tracks hold exactly their source lists', () => {
    for (const [id, src] of [['osep', osep], ['oswe', oswe], ['ippsec-vault', ippsec]] as const) {
      const members = CATALOG.filter(track(id).filterFn);
      expect(members.every((m) => m.platform === 'HTB'), id).toBe(true);
      expect(members.map((m) => trackNameSlug(m.name)).sort(), id).toEqual(src.names.HTB.map(trackNameSlug).sort());
    }
  });

  it('the OSCP track has the whole current HTB list and no other HTB rows', () => {
    const htb = CATALOG.filter((m) => m.platform === 'HTB' && track('tjnull-oscp').filterFn(m));
    expect(htb.map((m) => trackNameSlug(m.name)).sort()).toEqual(oscp.names.HTB.map(trackNameSlug).sort());
  });

  it('the AD track includes the retired metadata-only AD rows and the CWEE track includes the OSWE list', () => {
    const adTrack = track('crto-ad');
    for (const name of ['Cicada', 'Fluffy', 'Puppy', 'TombWatcher', 'Retro']) {
      expect(adTrack.filterFn(rowsFor('HTB', name)[0]), name).toBe(true);
    }
    for (const name of oswe.names.HTB) {
      expect(track('cwee-web').filterFn(rowsFor('HTB', name)[0]), name).toBe(true);
    }
  });

  it('prints member counts per track', () => {
    const counts = Object.fromEntries(PRACTICE_TRACKS.map((t) => [t.id, CATALOG.filter(t.filterFn).length]));
    console.log('[track member counts]', JSON.stringify(counts));
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(0);
  });
});
