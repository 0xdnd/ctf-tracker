import { describe, it, expect, beforeEach } from 'vitest';
import type { Machine } from '../../types';
import {
  buildCatalogSnapshot,
  computeWhatsNewDiff,
  mergeReleaseManifest,
  parseReleaseNotesBullets,
  readSeenRelease,
  writeSeenRelease,
  type ReleaseManifest,
} from '../../utils/whatsNewDiff';

const mkMachine = (over: Partial<Machine> & { id: string; name: string }): Machine => ({
  ip: '10.10.10.10',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Medium',
  status: 'backlog',
  tags: [],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

describe('whatsNewDiff', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds baseline silently on first visit without flagging an update', () => {
    const machines = [
      mkMachine({ id: 'htb-a', name: 'Alpha', isActive: true }),
      mkMachine({ id: 'custom-1', name: 'MyLab', platform: 'Custom', isCustom: true }),
    ];

    const diff = computeWhatsNewDiff(null, machines, '2.5.6');
    expect(diff.isFirstSeed).toBe(true);
    expect(diff.hasAppUpdate).toBe(false);
    expect(diff.hasCatalogUpdate).toBe(false);
    expect(diff.nextSnapshot.seenIds).toEqual(['htb-a']);
    expect(diff.nextSnapshot.seenActiveIds).toEqual(['htb-a']);
  });

  it('detects added, newly active, and retired machines even when app version is unchanged (weekly catalog sync)', () => {
    const week1 = [
      mkMachine({ id: 'htb-old-active', name: 'OldActive', isActive: true }),
      mkMachine({ id: 'htb-stay-active', name: 'StayActive', isActive: true }),
      mkMachine({ id: 'pg-existing', name: 'ExistingPG', platform: 'PG', isActive: false }),
    ];
    const prev = buildCatalogSnapshot(week1, '2.5.6', '2026-11-10T00:00:00.000Z');

    const week2 = [
      mkMachine({ id: 'htb-old-active', name: 'OldActive', isActive: false }),
      mkMachine({ id: 'htb-stay-active', name: 'StayActive', isActive: true }),
      mkMachine({ id: 'htb-new-active', name: 'RedEye', os: 'Windows', difficulty: 'Hard', isActive: true }),
      mkMachine({ id: 'pg-existing', name: 'ExistingPG', platform: 'PG', isActive: false }),
      mkMachine({ id: 'pg-new-box', name: 'NewPG', platform: 'PG', isActive: false }),
      // Custom user targets must never show up in catalog diffs
      mkMachine({ id: 'custom-user', name: 'CustomBox', platform: 'Custom', isCustom: true }),
    ];

    const diff = computeWhatsNewDiff(prev, week2, '2.5.6', '2026-11-17T00:00:00.000Z');
    expect(diff.isFirstSeed).toBe(false);
    expect(diff.hasAppUpdate).toBe(false);
    expect(diff.hasCatalogUpdate).toBe(true);
    expect(diff.added.map((m) => m.name)).toEqual(['RedEye', 'NewPG']);
    expect(diff.activated.map((m) => m.name)).toEqual(['RedEye']);
    expect(diff.retired.map((m) => m.name)).toEqual(['OldActive']);
  });

  it('detects semver updates even with an identical catalog and prefers manifest lists when local catalog had no diff', () => {
    const machines = [mkMachine({ id: 'htb-redeye', name: 'RedEye', isActive: true })];
    const prev = buildCatalogSnapshot(machines, '2.5.5');
    const diff = computeWhatsNewDiff(prev, machines, '2.5.6');

    expect(diff.hasAppUpdate).toBe(true);
    expect(diff.hasCatalogUpdate).toBe(false);

    const manifest: ReleaseManifest = {
      version: '2.5.6',
      releasedAt: '2026-11-23',
      catalogAsOf: '2026-11-17',
      activePoolCount: 20,
      highlights: ['Added Update Available and What’s New modals.'],
      machines: {
        added: [{ name: 'PG-Lab', platform: 'PG', difficulty: 'Medium' }],
        active: [{ name: 'RedEye', platform: 'HTB', difficulty: 'Hard' }],
        retired: [{ name: 'RetiredBox', platform: 'HTB', difficulty: 'Easy' }],
      },
    };

    const merged = mergeReleaseManifest(diff, manifest, '2.5.6', 1, 'auto');
    expect(merged.version).toBe('2.5.6');
    expect(merged.previousVersion).toBe('2.5.5');
    expect(merged.highlights).toEqual(['Added Update Available and What’s New modals.']);
    expect(merged.added.map((m) => m.name)).toEqual(['PG-Lab']);
    expect(merged.active.map((m) => m.name)).toEqual(['RedEye']);
    expect(merged.retired.map((m) => m.name)).toEqual(['RetiredBox']);
  });

  it('parses markdown release notes into clean bullets', () => {
    const raw = `## What's New\n- **Fixed** stuck modal\n* Added \`Exam Pivot Graph\`\n\n### Notes\nPlain summary line`;
    expect(parseReleaseNotesBullets(raw)).toEqual([
      'Fixed stuck modal',
      'Added Exam Pivot Graph',
      'Plain summary line',
    ]);
  });

  it('round-trips SeenReleaseSnapshot through localStorage safely', () => {
    const snap = buildCatalogSnapshot([mkMachine({ id: 'htb-1', name: 'One', isActive: true })], '2.5.6');
    writeSeenRelease(snap);
    expect(readSeenRelease()).toEqual(snap);
  });
});
