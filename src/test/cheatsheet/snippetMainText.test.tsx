import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { ALL_SHELL_ITEMS } from '../../data/revshellsData';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { ReverseShellGenerator } from '../../components/cheatsheet/ReverseShellGenerator';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * A "main text" is empty, whitespace-only, a placeholder, or literally just the entry's own name
 * (the symptom of a row whose real command was never captured and got stamped with its own name
 * instead).
 */
const PLACEHOLDER_RE = /^(todo|tbd|n\/?a|placeholder|coming soon|tba|xxx|\.\.\.)$/i;

function isBadMainText(mainText: string, ownName: string): boolean {
  const trimmed = (mainText ?? '').trim();
  if (trimmed.length === 0) return true;
  if (PLACEHOLDER_RE.test(trimmed)) return true;
  if (trimmed === ownName.trim()) return true;
  return false;
}

describe('revshell and cheatsheet main text sanity', () => {
  it('every ALL_SHELL_ITEMS row has real command text, unless explicitly marked unavailable', () => {
    const offenders: string[] = [];
    for (const row of ALL_SHELL_ITEMS) {
      if (row.unavailable) continue;
      if (isBadMainText(row.command, row.name)) {
        offenders.push(`${row.id} (${JSON.stringify(row.command)})`);
      }
    }
    expect(offenders, `rows with bad command text:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every ALL_SHELL_ITEMS row marked unavailable has an empty command (no fabricated content)', () => {
    const offenders: string[] = [];
    for (const row of ALL_SHELL_ITEMS) {
      if (row.unavailable && row.command !== '') {
        offenders.push(row.id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every cheatsheet entry has real command text', () => {
    const offenders: string[] = [];
    for (const entry of INITIAL_CHEATSHEET) {
      if (isBadMainText(entry.commandTemplate, entry.title)) {
        offenders.push(`${entry.id} (${JSON.stringify(entry.commandTemplate)})`);
      }
    }
    expect(offenders, `cheatsheet entries with bad command text:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('renders the generator and never shows an empty main text for a selectable row', () => {
    render(<ReverseShellGenerator />);
    const chipList = document.querySelector('[data-tour="rs-payloads"]') as HTMLElement;
    expect(chipList).toBeTruthy();
    const chips = within(chipList).getAllByRole('button');
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect((chip.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
  });
});
