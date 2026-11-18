import { describe, it, expect } from 'vitest';
import type { Machine } from '../types';
import { parseCsv } from './csv';
import { exportMachinesToCsv, MACHINE_CSV_HEADERS } from './machineCsvExport';

const makeMachine = (overrides: Partial<Machine> = {}): Machine =>
  ({
    id: 'htb-lame',
    name: 'Lame',
    platform: 'HTB',
    os: 'Linux',
    difficulty: 'Easy',
    status: 'backlog',
    ip: '10.10.10.3',
    tags: ['Samba', 'CVE-2007-2447'],
    certifications: ['OSCP', 'CPTS'],
    timeSpentSeconds: 1800,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Machine;

describe('exportMachinesToCsv', () => {
  it('exports headers only for an empty machine array', () => {
    const csv = exportMachinesToCsv([], { bom: false });
    expect(parseCsv(csv)).toEqual([MACHINE_CSV_HEADERS]);
  });

  it('starts with UTF-8 BOM by default and strips placeholder IPs', () => {
    const csv = exportMachinesToCsv([makeMachine({ ip: '10.10.10.X' })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const rows = parseCsv(csv);
    expect(rows[1][5]).toBe('');
  });

  it('never leaks raw flag answers into CSV output', () => {
    const csv = exportMachinesToCsv([
      makeMachine({
        status: 'completed',
        userFlag: 'HTB{super_secret_user_flag}',
        rootFlag: 'HTB{super_secret_root_flag}',
      }),
    ]);
    expect(csv).not.toContain('super_secret_user_flag');
    expect(csv).not.toContain('super_secret_root_flag');
    const rows = parseCsv(csv);
    expect(rows[1][6]).toBe('Captured');
    expect(rows[1][7]).toBe('Captured');
  });

  it('neutralizes spreadsheet formula-injection prefixes and quotes commas, quotes and newlines', () => {
    const csv = exportMachinesToCsv([
      makeMachine({ name: '=CMD|\' /C calc\'!A0', tags: ['+evil', '@SUM(A1:A2)', 'comma,tag', 'quote"tag', 'line\nbreak'] }),
      makeMachine({ id: 'm2', name: '-cmd', ip: '192.168.56.101' }),
      makeMachine({ id: 'm3', name: '\t=1+1' }),
    ]);
    const rows = parseCsv(csv);
    expect(rows[1][0]).toBe("'=CMD|' /C calc'!A0");
    expect(rows[1][10]).toBe("'+evil; @SUM(A1:A2); comma,tag; quote\"tag; line\nbreak");
    expect(rows[2][0]).toBe("'-cmd");
    expect(rows[2][5]).toBe('192.168.56.101');
    expect(rows[3][0]).toBe("'\t=1+1");
  });
});
