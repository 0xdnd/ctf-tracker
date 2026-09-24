import { describe, it, expect, beforeEach } from 'vitest';
import { 
  extractDeepWriteups, 
  stripDeepFieldsFromMachines, 
  mergeDeepPayloadsIntoMachines,
  saveDeepProfileData,
  loadDeepProfileData,
  clearDeepProfileData,
  deleteMachineDeepData
} from './indexedDbDeepStorage';
import { Machine } from '../types';

const sampleMachines: Machine[] = [
  {
    id: 'box-1',
    name: 'Legacy',
    ip: '10.10.10.4',
    os: 'Windows',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'completed',
    tags: ['SMB'],
    certifications: ['OSCP'],
    timeSpentSeconds: 1200,
    writeupMarkdown: '# Legacy Writeup\nDetailed exploits here...',
    quickNotes: 'MS08-067 vulnerable',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'box-2',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'completed',
    tags: ['Samba'],
    certifications: ['OSCP'],
    timeSpentSeconds: 900,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
];

describe('indexedDbDeepStorage', () => {
  describe('extractDeepWriteups', () => {
    it('extracts writeupMarkdown and quickNotes from machines that have them', () => {
      const extracted = extractDeepWriteups(sampleMachines);
      expect(extracted['box-1']).toBeDefined();
      expect(extracted['box-1'].writeupMarkdown).toBe('# Legacy Writeup\nDetailed exploits here...');
      expect(extracted['box-1'].quickNotes).toBe('MS08-067 vulnerable');
      expect(extracted['box-2']).toBeUndefined();
    });
  });

  describe('stripDeepFieldsFromMachines', () => {
    it('removes heavy writeupMarkdown and quickNotes while preserving machine metadata', () => {
      const stripped = stripDeepFieldsFromMachines(sampleMachines);
      expect(stripped[0].id).toBe('box-1');
      expect(stripped[0].name).toBe('Legacy');
      expect(stripped[0].writeupMarkdown).toBeUndefined();
      expect(stripped[0].quickNotes).toBeUndefined();
      expect(stripped[0].status).toBe('completed');
      expect(stripped[0].tags).toEqual(['SMB']);
    });
  });

  describe('mergeDeepPayloadsIntoMachines', () => {
    it('merges writeups into machines without overwriting existing in-memory writeups', () => {
      const stripped = stripDeepFieldsFromMachines(sampleMachines);
      const deepWriteups = {
        'box-1': {
          writeupMarkdown: '# Hydrated Writeup',
          quickNotes: 'Hydrated Note',
        },
      };

      const merged = mergeDeepPayloadsIntoMachines(stripped, deepWriteups);
      expect(merged[0].writeupMarkdown).toBe('# Hydrated Writeup');
      expect(merged[0].quickNotes).toBe('Hydrated Note');
    });

    it('preserves existing in-memory writeups if already present', () => {
      const deepWriteups = {
        'box-1': {
          writeupMarkdown: '# Stale Writeup from DB',
        },
      };

      const merged = mergeDeepPayloadsIntoMachines(sampleMachines, deepWriteups);
      // Keeps in-memory version '# Legacy Writeup\nDetailed exploits here...'
      expect(merged[0].writeupMarkdown).toBe('# Legacy Writeup\nDetailed exploits here...');
    });
  });

  describe('IndexedDB Operations (graceful fallback in test environment)', () => {
    it('handles save and load without throwing errors even if IndexedDB is not polyfilled', async () => {
      await expect(
        saveDeepProfileData('guest', {
          writeups: { 'box-1': { writeupMarkdown: 'test' } },
        })
      ).resolves.not.toThrow();

      const loaded = await loadDeepProfileData('guest');
      // If indexedDB is available in jsdom it returns data, otherwise null
      expect(loaded === null || typeof loaded === 'object').toBe(true);

      await expect(clearDeepProfileData('guest')).resolves.not.toThrow();
    });

    it('handles deleteMachineDeepData without throwing errors', async () => {
      await expect(deleteMachineDeepData('guest', 'box-1')).resolves.not.toThrow();
    });
  });
});
