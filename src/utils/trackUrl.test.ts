import { describe, it, expect } from 'vitest';
import { parseTrackParam } from './trackUrl';

const known = new Set(['tjnull-oscp', 'osep', 'cpts-path']);
const isKnown = (id: string) => known.has(id);

describe('parseTrackParam', () => {
  it('accepts a single id', () => {
    expect(parseTrackParam('tjnull-oscp', isKnown)).toEqual(['tjnull-oscp']);
  });

  it('accepts a comma-separated list, keeping order', () => {
    expect(parseTrackParam('tjnull-oscp,osep', isKnown)).toEqual(['tjnull-oscp', 'osep']);
  });

  it('ignores unknown ids, blanks and repeats', () => {
    expect(parseTrackParam('nope, osep ,,osep,tjnull-oscp', isKnown)).toEqual(['osep', 'tjnull-oscp']);
  });

  it('returns nothing for empty or all-unknown input', () => {
    expect(parseTrackParam(null, isKnown)).toEqual([]);
    expect(parseTrackParam('', isKnown)).toEqual([]);
    expect(parseTrackParam('nope,ALL', isKnown)).toEqual([]);
  });
});
