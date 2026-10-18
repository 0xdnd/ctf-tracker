import { describe, it, expect } from 'vitest';
import { stripTrailingSlash } from './pathUtils';

describe('stripTrailingSlash', () => {
  it('removes a single trailing slash', () => {
    expect(stripTrailingSlash('/tracker/')).toBe('/tracker');
    expect(stripTrailingSlash('/exam/')).toBe('/exam');
  });
  it('leaves paths without a trailing slash alone', () => {
    expect(stripTrailingSlash('/tracker')).toBe('/tracker');
  });
  it('keeps the root path as-is', () => {
    expect(stripTrailingSlash('/')).toBe('/');
  });
});
