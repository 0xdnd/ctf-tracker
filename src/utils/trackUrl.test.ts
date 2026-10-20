import { describe, it, expect } from 'vitest';
import { parseTrackParam, serializeTrackParam } from './trackUrl';

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

describe('serializeTrackParam', () => {
  it('writes a single id plainly and several with commas', () => {
    expect(serializeTrackParam(['osep'])).toBe('osep');
    expect(serializeTrackParam(['tjnull-oscp', 'osep'])).toBe('tjnull-oscp,osep');
    expect(serializeTrackParam([])).toBe('');
  });

  it('round-trips through parseTrackParam', () => {
    const ids = ['cpts-path', 'tjnull-oscp'];
    expect(parseTrackParam(serializeTrackParam(ids), isKnown)).toEqual(ids);
  });
});
