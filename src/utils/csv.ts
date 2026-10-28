/** Makes Excel read the file as UTF-8 instead of the system code page. */
const BOM = '﻿';

/** A string cell a spreadsheet would run as a formula when opened. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. null/undefined become empty. Strings that start like a formula get a leading `'` so
 * Excel shows them as text; genuine numbers are left alone, so a negative number stays numeric.
 * Cells containing `,` `"` CR or LF are quoted, with inner quotes doubled (RFC 4180).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Headers plus rows as CRLF-separated CSV. The UTF-8 BOM is on by default; pass `bom: false` for clipboard text. */
export function toCsv(headers: string[], rows: unknown[][], options: { bom?: boolean } = {}): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return (options.bom === false ? '' : BOM) + lines.join('\r\n');
}
