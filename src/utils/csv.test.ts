import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { escapeCsvCell, parseCsv, toCsv } from './csv';

describe('escapeCsvCell', () => {
  it('quotes cells with a comma', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
  });

  it('doubles inner quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes embedded newlines', () => {
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
    expect(escapeCsvCell('a\r\nb')).toBe('"a\r\nb"');
  });

  it('prefixes strings that start like a formula', () => {
    expect(escapeCsvCell('=1+1')).toBe("'=1+1");
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escapeCsvCell('\tx')).toBe("'\tx");
  });

  it('guards a leading minus on strings but not on negative numbers', () => {
    expect(escapeCsvCell('-5')).toBe("'-5");
    expect(escapeCsvCell(-5)).toBe('-5');
  });

  it('quotes after guarding when needed', () => {
    expect(escapeCsvCell('=a,b')).toBe(`"'=a,b"`);
  });

  it('writes null and undefined as empty cells', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('starts with a UTF-8 BOM and joins lines with CRLF', () => {
    const out = toCsv(['a', 'b'], [[1, 'x'], [2, 'y']]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe('a,b\r\n1,x\r\n2,y');
  });

  it('can omit the BOM', () => {
    expect(toCsv(['a'], [], { bom: false })).toBe('a');
  });
});

describe('parseCsv', () => {
  it('reads plain rows with CRLF, LF and CR line ends', () => {
    const want = [['a', 'b'], ['1', '2']];
    expect(parseCsv('a,b\r\n1,2')).toEqual(want);
    expect(parseCsv('a,b\n1,2')).toEqual(want);
    expect(parseCsv('a,b\r1,2')).toEqual(want);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('﻿Name,OS\r\nLame,Linux')).toEqual([['Name', 'OS'], ['Lame', 'Linux']]);
  });

  it('does not add a row for a trailing line break', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\n\n')).toEqual([['a'], ['']]);
    expect(parseCsv('')).toEqual([]);
  });

  it('reads quoted cells with commas, doubled quotes and embedded newlines', () => {
    expect(parseCsv('"a,b","say ""hi""","l1\r\nl2"\nx,y,z')).toEqual([
      ['a,b', 'say "hi"', 'l1\r\nl2'],
      ['x', 'y', 'z'],
    ]);
  });

  it('keeps empty cells, including a trailing one', () => {
    expect(parseCsv('a,,c\n,b,')).toEqual([['a', '', 'c'], ['', 'b', '']]);
    expect(parseCsv('a,""\n')).toEqual([['a', '']]);
  });

  it('supports another delimiter', () => {
    expect(parseCsv('a;b\n"1;2";3', ';')).toEqual([['a', 'b'], ['1;2', '3']]);
  });

  it('round-trips toCsv output', () => {
    const headers = ['Name', 'Note'];
    const rows = [['Lame', 'say "hi", ok'], ['Two\nLines', ''], ['', 'x']];
    expect(parseCsv(toCsv(headers, rows))).toEqual([headers, ...rows]);
  });

  it('round-trips arbitrary cells (formula-looking cells excluded: the writer guards those)', () => {
    const cell = fc
      .string({ maxLength: 12, unit: fc.constantFrom(...'ab ,"\n\r\'=-é1'.split('')) })
      .filter((s) => !/^[=+\-@\t\r]/.test(s));
    const row = fc.array(cell, { minLength: 2, maxLength: 4 });
    fc.assert(
      fc.property(fc.array(row, { minLength: 1, maxLength: 5 }), (rows) => {
        const width = rows[0].length;
        const even = rows.map((r) => r.slice(0, width).concat(Array(Math.max(0, width - r.length)).fill('')));
        expect(parseCsv(toCsv(even[0], even.slice(1)))).toEqual(even);
      }),
      { numRuns: 200 }
    );
  });
});
