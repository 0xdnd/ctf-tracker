import { describe, it, expect } from 'vitest';
import activeJson from '../../data/activeMachines.json';
import { ACTIVE_MACHINES } from '../../data/activeMachines';
import { KNOWN_ACTIVE_SEASONAL_NAMES, normalizeMachineSlug, sanitizeActiveMachine } from '../../store/useCtfStore';
import type { Difficulty, Machine, OperatingSystem } from '../../types';

const OS: OperatingSystem[] = ['Linux', 'Windows', 'BSD', 'Android', 'macOS', 'Other'];
const DIFFICULTIES: Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const STALE = ['devhub', 'reactor', 'smarthire', 'silentium', 'hercules'];

/** Fields an active machine may carry with content after sanitization (HTB AUP §8.2). */
const ALLOWED = new Set([
  'id', 'name', 'platform', 'os', 'difficulty', 'roomUrl', 'status', 'isActive',
  'certifications', 'timeSpentSeconds', 'createdAt', 'updatedAt',
]);

const hasContent = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== '' && v !== false && v !== 0 && !(Array.isArray(v) && v.length === 0);

const isValidIsoDate = (s: string) => ISO_DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

describe('activeMachines.json', () => {
  it('has a valid asOf date, source and a plausible number of entries', () => {
    expect(isValidIsoDate(activeJson.asOf)).toBe(true);
    expect(activeJson.source.length).toBeGreaterThan(0);
    expect(ACTIVE_MACHINES.machines.length).toBeGreaterThanOrEqual(10);
  });

  it('uses valid os and difficulty enums and ISO release dates', () => {
    for (const m of ACTIVE_MACHINES.machines) {
      expect(OS, m.name).toContain(m.os);
      expect(DIFFICULTIES, m.name).toContain(m.difficulty);
      expect(isValidIsoDate(m.releasedAt), m.name).toBe(true);
    }
  });

  it('has unique names (by normalized slug)', () => {
    const slugs = ACTIVE_MACHINES.machines.map((m) => normalizeMachineSlug(m.name));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every season present is a non-empty string', () => {
    for (const m of ACTIVE_MACHINES.machines) {
      if (m.season === undefined) continue;
      expect(typeof m.season, m.name).toBe('string');
      expect(m.season.trim().length, m.name).toBeGreaterThan(0);
    }
  });

  it('every entry sanitizes cleanly and keeps only the allowed fields', () => {
    for (const entry of ACTIVE_MACHINES.machines) {
      const withSpoilers: Machine = {
        id: `htb-${normalizeMachineSlug(entry.name)}`,
        name: entry.name,
        platform: 'HTB',
        os: entry.os,
        difficulty: entry.difficulty,
        status: 'backlog',
        isActive: true,
        ip: '10.10.11.5',
        tags: ['spoiler'],
        certifications: [],
        roomUrl: `https://app.hackthebox.com/machines/${entry.name}`,
        hint: 'spoiler',
        writeupUrl: 'https://example.invalid/writeup',
        officialSynopsis: 'spoiler',
        officialPdf: 'https://example.invalid/pdf',
        skillsLearned: ['spoiler'],
        userFlag: 'HTB{x}',
        rootFlag: 'HTB{y}',
        quickNotes: 'notes',
        openPorts: [22],
        timeSpentSeconds: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const clean = sanitizeActiveMachine(withSpoilers);
      const leaked = Object.entries(clean)
        .filter(([k, v]) => hasContent(v) && !ALLOWED.has(k))
        .map(([k]) => k);
      expect(leaked, entry.name).toEqual([]);
      expect(clean.name).toBe(entry.name);
      expect(clean.roomUrl).toBe(`https://app.hackthebox.com/machines/${entry.name}`);
    }
  });
});

describe('KNOWN_ACTIVE_SEASONAL_NAMES', () => {
  it('equals the normalized JSON names', () => {
    const expected = new Set(activeJson.machines.map((m) => normalizeMachineSlug(m.name)));
    expect([...KNOWN_ACTIVE_SEASONAL_NAMES].sort()).toEqual([...expected].sort());
  });

  it('no longer contains retired machines', () => {
    for (const n of STALE) expect(KNOWN_ACTIVE_SEASONAL_NAMES.has(n), n).toBe(false);
  });
});
