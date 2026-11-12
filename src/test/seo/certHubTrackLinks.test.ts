// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { TRACK_BY_ID } from '../../data/tracksData';

const req = createRequire(import.meta.url);
const { TRACK_TO_CERT } = req('../../../scripts/lib/content-model.cjs');

describe('cert-hub track deep links', () => {
  it('maps every hub cert to an existing practice track id', () => {
    for (const trackId of Object.keys(TRACK_TO_CERT)) {
      expect(TRACK_BY_ID.has(trackId), trackId).toBe(true);
    }
  });
});
