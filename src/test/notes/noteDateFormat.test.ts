import { describe, it, expect } from 'vitest';
import { formatNoteDate } from '../../components/cheatsheet/ObsidianTabContent';

describe('formatNoteDate', () => {
  it('formats an ISO date as a locale date', () => {
    const out = formatNoteDate('2026-03-05T12:00:00.000Z');
    expect(out).toContain('2026');
    expect(out).not.toContain('T12:00');
  });
  it('passes unparseable values through unchanged', () => {
    expect(formatNoteDate('not a date')).toBe('not a date');
  });
});
