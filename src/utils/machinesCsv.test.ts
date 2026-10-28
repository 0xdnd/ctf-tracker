import { describe, it, expect } from 'vitest';
import type { Machine } from '../types';
import { buildMachinesCsv } from './machinesCsv';

const machine = (over: Partial<Machine> = {}): Machine => ({
  id: 'm1',
  name: 'Lame',
  ip: '10.10.10.3',
  os: 'Linux',
  platform: 'HTB',
  difficulty: 'Easy',
  status: 'completed',
  tags: ['smb', 'cve'],
  certifications: [],
  timeSpentSeconds: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  rootPwnedAt: '2026-01-02T00:00:00.000Z',
  ...over,
});

describe('buildMachinesCsv', () => {
  it('writes a header and one row per machine', () => {
    const lines = buildMachinesCsv([machine()]).slice(1).split('\r\n');
    expect(lines[0]).toBe('Name,Platform,OS,Difficulty,Status,Tracks,User pwned at,Root pwned at,Updated at,Tags');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Lame,HTB,Linux,Easy,completed,');
    expect(lines[1].endsWith('smb; cve')).toBe(true);
  });

  it('guards formula-like names and leaves missing dates empty', () => {
    const row = buildMachinesCsv([machine({ name: '=evil', rootPwnedAt: undefined })]).split('\r\n')[1];
    expect(row.startsWith("'=evil,")).toBe(true);
    expect(row).toContain(',,,2026-01-02T00:00:00.000Z,');
  });
});
