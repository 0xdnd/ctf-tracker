import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsv } from './csv';

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
