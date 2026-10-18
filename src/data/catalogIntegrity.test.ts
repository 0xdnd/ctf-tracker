import { describe, it, expect } from 'vitest';
import rawMachines from './machinesCatalog.json';
import { Machine } from '../types';
import { PRACTICE_TRACKS } from './tracksData';

const catalog = rawMachines as Machine[];

describe('Master Catalog Integrity & Schema Verification', () => {
  it('contains over 1,000 valid targets with 100% unique IDs', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(1000);

    const ids = new Set<string>();
    for (const m of catalog) {
      expect(m.id).toBeDefined();
      expect(typeof m.id).toBe('string');
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
    }
    expect(ids.size).toBe(catalog.length);
  });

  it('validates mandatory fields across all targets', () => {
    const validPlatforms = new Set(['HTB', 'THM', 'PG', 'VulnHub', 'Custom']);
    const validDifficulties = new Set(['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane']);
    const validOs = new Set(['Linux', 'Windows', 'Android', 'BSD', 'Multi-OS', 'Other']);

    for (const m of catalog) {
      expect(m.name).toBeTruthy();
      expect(validPlatforms.has(m.platform)).toBe(true);
      expect(validDifficulties.has(m.difficulty)).toBe(true);
      expect(validOs.has(m.os)).toBe(true);
      expect(Array.isArray(m.tags)).toBe(true);
      expect(m.tags.length).toBeGreaterThan(0);
      expect(m.roomUrl).toMatch(/^https?:\/\//);
    }
  });

  it('strictly enforces HTB ToS AUP §8.2: zero unredacted writeups for active seasonal machines', () => {
    const activeSeasonal = catalog.filter(m => m.platform === 'HTB' && m.isActive && !m.tags?.includes('Pro-Lab'));
    expect(activeSeasonal.length).toBe(20);

    for (const m of activeSeasonal) {
      expect(m.writeupUrl ?? '').toBe('');
      if (m.userFlag) {
        expect(m.userFlag).toMatch(/placeholder|daniel_dayan/i);
      }
      if (m.rootFlag) {
        expect(m.rootFlag).toMatch(/placeholder|daniel_dayan/i);
      }
    }
  });

  it('verifies all 8 Pro Labs have detailed officialSynopsis and Red-Team tagging', () => {
    const proLabs = catalog.filter(m => m.tags?.includes('Pro-Lab'));
    expect(proLabs.length).toBe(8);

    for (const p of proLabs) {
      expect(p.isActive).toBe(true);
      expect(p.tags).toContain('Red-Team');
      expect(p.officialSynopsis).toBeDefined();
      expect((p.officialSynopsis || '').length).toBeGreaterThan(30);
    }
  });

  it('ensures all practice tracks match targets and have unique track IDs', () => {
    const trackIds = new Set<string>();
    for (const track of PRACTICE_TRACKS) {
      expect(trackIds.has(track.id)).toBe(false);
      trackIds.add(track.id);

      // Verify track filter function executes safely against catalog
      const matched = catalog.filter(track.filterFn);
      expect(matched.length).toBeGreaterThan(0);
    }
  });
});
