import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PageHint } from './PageHint';

describe('PageHint reserved space', () => {
  afterEach(() => document.documentElement.removeAttribute('data-page-hint'));

  it('marks the root while a tip is up and clears it on unmount', () => {
    const { unmount } = render(<PageHint guideId="vault" />);
    expect(document.documentElement.hasAttribute('data-page-hint')).toBe(true);
    unmount();
    expect(document.documentElement.hasAttribute('data-page-hint')).toBe(false);
  });

  it('pads both the scroll container (#main) and the sidebar while the attribute is set', () => {
    const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    expect(css).toMatch(/html\[data-page-hint\] #main\s*\{\s*padding-bottom/);
    expect(css).toMatch(/html\[data-page-hint\] \[data-testid='app-sidebar'\]\s*\{\s*padding-bottom/);
  });
});
