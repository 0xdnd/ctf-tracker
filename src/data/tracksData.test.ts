import { describe, it, expect } from 'vitest';
import { PRACTICE_TRACKS } from './tracksData';
import { Machine } from '../types';

describe('PRACTICE_TRACKS Configuration', () => {
  it('contains all expected tactical and certification tracks without duplicate IDs', () => {
    expect(PRACTICE_TRACKS.length).toBeGreaterThanOrEqual(10);

    const ids = PRACTICE_TRACKS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);

    // Verify key tracks exist
    expect(ids).toContain('tjnull-oscp');
    expect(ids).toContain('cpts-path');
    expect(ids).toContain('cwee-web');
    expect(ids).toContain('popular-classics');
    expect(ids).toContain('ippsec-vault');
    expect(ids).toContain('crto-ad');
  });

  it('accurately identifies TJ_Null OSCP boxes', () => {
    const oscpTrack = PRACTICE_TRACKS.find((t) => t.id === 'tjnull-oscp')!;
    expect(oscpTrack).toBeDefined();

    const sampleBox1: Machine = {
      id: 'htb-lame',
      name: 'Lame',
      ip: '10.10.10.3',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['smb', 'samba'],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const sampleBox2: Machine = {
      id: 'thm-rootme',
      name: 'RootMe',
      ip: '10.10.10.4',
      os: 'Linux',
      platform: 'THM',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['web', 'file-upload'],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    expect(oscpTrack.filterFn(sampleBox1)).toBe(true);
    expect(oscpTrack.filterFn(sampleBox2)).toBe(true);
  });

  it('accurately identifies CWEE / Advanced Web boxes', () => {
    const cweeTrack = PRACTICE_TRACKS.find((t) => t.id === 'cwee-web')!;
    expect(cweeTrack).toBeDefined();

    const webBox: Machine = {
      id: 'htb-sau',
      name: 'Sau',
      ip: '10.10.11.224',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['ssrf', 'maltrail'],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    expect(cweeTrack.filterFn(webBox)).toBe(true);
  });

  it('accurately identifies IppSec video masterclass boxes', () => {
    const ippsecTrack = PRACTICE_TRACKS.find((t) => t.id === 'ippsec-vault')!;
    expect(ippsecTrack).toBeDefined();

    const ippsecBox: Machine = {
      id: 'htb-reddish',
      name: 'Reddish',
      ip: '10.10.10.94',
      os: 'Linux',
      platform: 'HTB',
      difficulty: 'Insane',
      status: 'completed',
      tags: ['pivoting', 'redis'],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      hint: "IppSec's Reddish video is a masterclass in tunneling",
    };

    expect(ippsecTrack.filterFn(ippsecBox)).toBe(true);
  });

  it('accurately identifies Popular Hall of Fame boxes', () => {
    const popularTrack = PRACTICE_TRACKS.find((t) => t.id === 'popular-classics')!;
    expect(popularTrack).toBeDefined();

    const popularBox: Machine = {
      id: 'htb-blue',
      name: 'Blue',
      ip: '10.10.10.40',
      os: 'Windows',
      platform: 'HTB',
      difficulty: 'Easy',
      status: 'completed',
      tags: ['eternalblue', 'smb'],
      certifications: [],
      timeSpentSeconds: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    expect(popularTrack.filterFn(popularBox)).toBe(true);
  });
});
