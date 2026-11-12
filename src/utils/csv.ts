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

/**
 * CSV text to rows of cells (RFC 4180 style). Strips a leading UTF-8 BOM; accepts CRLF, LF and CR line
 * ends; quoted cells may hold the delimiter, doubled quotes and line breaks. A final line break does not
 * add an empty row. Blank lines in the middle come back as `['']` so callers can skip them.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let started = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch !== '"') cell += ch;
      else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else inQuotes = false;
    } else if (ch === '"') {
      inQuotes = true;
      started = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
      started = true;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      started = false;
    } else {
      cell += ch;
      started = true;
    }
  }
  if (started || cell !== '') {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Headers plus rows as CRLF-separated CSV. The UTF-8 BOM is on by default; pass `bom: false` for clipboard text. */
export function toCsv(headers: string[], rows: unknown[][], options: { bom?: boolean } = {}): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return (options.bom === false ? '' : BOM) + lines.join('\r\n');
}
