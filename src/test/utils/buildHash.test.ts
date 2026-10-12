import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const { computeBuildHash, injectBuildHash } = createRequire(import.meta.url)('../../../scripts/lib/build-hash.cjs');

describe('build hash', () => {
  it('is deterministic, order-independent and 12 hex chars', () => {
    const a = computeBuildHash(['/b.js', '/a.js'], Buffer.from('shell'));
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(computeBuildHash(['/a.js', '/b.js'], Buffer.from('shell'))).toBe(a);
    expect(computeBuildHash(['/a.js', '/b.js'], Buffer.from('shell2'))).not.toBe(a);
  });

  it('injects the hash and throws when the placeholder is missing', () => {
    const out = injectBuildHash("const V = 'zerobox-' + /*__BUILD_HASH__*/'dev';", 'abc123abc123');
    expect(out).toContain("'abc123abc123'");
    expect(() => injectBuildHash(out, 'x')).toThrow(/placeholder/);
  });
});
