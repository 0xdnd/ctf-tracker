import { describe, it, expect } from 'vitest';
import {
  calculateCvssScore,
  cvssRoundUp,
  parseCvssVector,
  scoreToSeverity,
  sortFindingsBySeverity,
} from './cvss';
import type { Finding } from '../types/findings';

const VECTORS: Array<[string, number]> = [
  ['AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
  ['AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', 10.0],
  ['AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 7.8],
  ['AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N', 3.1],
  ['AV:P/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:L', 1.6],
  ['AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N', 0],
  ['AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N', 6.4],
  ['AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N', 6.1],
  ['AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H', 8.8],
  ['AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 8.8],
  ['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 9.8],
  ['cvss:3.0/av:n/ac:l/pr:n/ui:n/s:u/c:h/i:h/a:h', 9.8],
];

describe('calculateCvssScore (CVSS v3.1 base)', () => {
  it.each(VECTORS)('%s = %s', (vector, expected) => {
    expect(calculateCvssScore(vector)).toBe(expected);
  });

  it('accepts parsed metrics', () => {
    const m = parseCvssVector('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')!;
    expect(calculateCvssScore(m)).toBe(9.8);
  });

  it.each([
    '',
    'garbage',
    'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H',
    'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:X',
    'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/A:H',
    'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:F',
    'CVSS:2.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    'AV:N:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  ])('rejects invalid vector %j', (vector) => {
    expect(parseCvssVector(vector)).toBeNull();
    expect(calculateCvssScore(vector)).toBeNull();
  });
});

describe('cvssRoundUp', () => {
  it.each([
    [4.0, 4.0],
    [4.02, 4.1],
    [4.000001, 4.0],
    [4.1, 4.1],
    [0.0, 0.0],
    [9.99, 10.0],
  ])('roundup(%s) = %s', (input, expected) => {
    expect(cvssRoundUp(input)).toBe(expected);
  });
});

describe('scoreToSeverity', () => {
  it.each([
    [0, 'info'],
    [0.1, 'low'],
    [3.9, 'low'],
    [4.0, 'medium'],
    [6.9, 'medium'],
    [7.0, 'high'],
    [8.9, 'high'],
    [9.0, 'critical'],
    [10.0, 'critical'],
  ])('%s -> %s', (score, severity) => {
    expect(scoreToSeverity(score)).toBe(severity);
  });
});

describe('sortFindingsBySeverity', () => {
  const f = (id: string, severity: Finding['severity'], cvssScore?: number): Finding => ({
    id,
    title: id,
    severity,
    cvssScore,
    affectedHosts: [],
    description: '',
    evidenceRefs: [],
  });

  it('orders critical to info, then score desc, stable otherwise, without mutating', () => {
    const input = [f('a', 'low'), f('b', 'critical', 9.1), f('c', 'critical', 10), f('d', 'info'), f('e', 'high'), f('f', 'high')];
    const out = sortFindingsBySeverity(input).map((x) => x.id);
    expect(out).toEqual(['c', 'b', 'e', 'f', 'a', 'd']);
    expect(input.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
});
