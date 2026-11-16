// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { siteFooter, siteHeader, coffeeNote, COFFEE_URL } = req('../../../scripts/lib/layout.cjs');
const LINK = /<a class="coffee-link" href="https:\/\/buymeacoffee\.com\/0xdnd" target="_blank" rel="noopener noreferrer">/;

describe('static pages: Buy me a coffee', () => {
  it('uses the right URL and no third-party script', () => {
    expect(COFFEE_URL).toBe('https://buymeacoffee.com/0xdnd');
    expect(siteFooter()).not.toMatch(/<script[^>]+buymeacoffee/i);
  });
  it('is in the footer, not in the header', () => {
    expect(siteFooter()).toMatch(LINK);
    expect(siteFooter()).toContain('Buy me a coffee</a>');
    expect(siteHeader({ path: '/' })).not.toMatch(/buymeacoffee/i);
  });
  it('closing note reads "Found this useful? Buy me a coffee."', () => {
    const note = coffeeNote();
    expect(note).toMatch(LINK);
    expect(note.replace(/<[^>]+>/g, '')).toBe('Found this useful? Buy me a coffee.');
  });
});
