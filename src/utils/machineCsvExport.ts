import type { Machine } from '../types';
import { isPlaceholderIp } from './ipInput';
import { toCsv } from './csv';

export const MACHINE_CSV_HEADERS = [
  'Name',
  'Platform',
  'OS',
  'Difficulty',
  'Status',
  'IP',
  'User Flag',
  'Root Flag',
  'Time Spent (s)',
  'Certifications',
  'Tags',
];

/**
 * Serializes a list of machines to RFC-4180 CSV with formula-injection protection.
 * Flag answers are NEVER exported — only boolean capture state ("Captured" / "Pending").
 */
export function exportMachinesToCsv(
  machines: readonly Machine[],
  options: { bom?: boolean } = {}
): string {
  const rows = machines.map((m) => {
    const ip = m.ip && !isPlaceholderIp(m.ip) ? m.ip : '';
    const userCaptured = Boolean(m.userPwnedAt || m.userFlag);
    const rootCaptured = Boolean(m.rootPwnedAt || m.rootFlag || m.status === 'root' || m.status === 'completed');
    return [
      m.name,
      m.platform,
      m.os,
      m.difficulty,
      m.status,
      ip,
      userCaptured ? 'Captured' : 'Pending',
      rootCaptured ? 'Captured' : 'Pending',
      m.timeSpentSeconds ?? 0,
      (m.certifications ?? []).join('; '),
      (m.tags ?? []).join('; '),
    ];
  });
  return toCsv(MACHINE_CSV_HEADERS, rows, options);
}

/** Triggers a browser download of the machines CSV file. */
export function downloadMachinesCsv(machines: readonly Machine[], filename?: string): void {
  const csv = exportMachinesToCsv(machines, { bom: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = filename || `zerobox_machines_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
