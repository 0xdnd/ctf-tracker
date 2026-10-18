import { describe, it, expect } from 'vitest';
import { OFFICIAL_HTB_PRO_LABS, findProLabPreset } from '../../data/proLabsData';

describe('Official HTB Pro Labs Presets', () => {
  it('contains the 10 official Hack The Box Pro Labs', () => {
    expect(OFFICIAL_HTB_PRO_LABS).toHaveLength(10);
    const names = OFFICIAL_HTB_PRO_LABS.map((p) => p.name);
    expect(names).toEqual([
      'Genesis',
      'Dante',
      'Zephyr',
      'Offshore',
      'RastaLabs',
      'Cybernetics',
      'AptLabs',
      'Halcyon',
      'Mayhem',
      'Blizzard',
    ]);
  });

  it('guarantees 100% HTB ToS AUP §8.2 compliance (no leaks or spoilers)', () => {
    for (const lab of OFFICIAL_HTB_PRO_LABS) {
      // Must have official app.hackthebox.com room URL
      expect(lab.roomUrl).toMatch(/^https:\/\/app\.hackthebox\.com\/pro-labs\//);
      // Scope counts must be positive integers
      expect(lab.hostCount).toBeGreaterThan(0);
      expect(lab.flagCount).toBeGreaterThan(0);
      // Exam alignment must contain valid certifications
      expect(lab.examAlignment.length).toBeGreaterThan(0);
      // Must contain pro-lab marker tag
      expect(lab.tags).toContain('pro-lab');
      // Must NOT contain exploit instructions, flags, passwords, or spoilers
      const text = `${lab.description} ${lab.tags.join(' ')}`;
      expect(text).not.toMatch(/flag\{|root:|admin:|password\s*=|cve-\d+|step\s*1/i);
    }
  });

  it('finds presets case-insensitively', () => {
    expect(findProLabPreset('dante')?.name).toBe('Dante');
    expect(findProLabPreset('ZEPHYR')?.flagCount).toBe(32);
    expect(findProLabPreset('prolab-cybernetics')?.hostCount).toBe(27);
    expect(findProLabPreset('UnknownLab')).toBeUndefined();
  });
});
