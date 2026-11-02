import { describe, it, expect } from 'vitest';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../../data/methodologyFramework';

/**
 * A commandSnippet should read as a command, not as a sentence of instructions.
 * Heuristic: a value is "prose" when it starts with a capitalized word, contains
 * none of the punctuation/characters a real shell command almost always has
 * (placeholders, flags, paths, pipes, redirects, backticks), and does not start
 * with a bare tool/binary name followed by a space (e.g. "nmap ...", "sudo ...").
 */
function looksLikeProse(snippet: string): boolean {
  const startsCapitalized = /^[A-Z][a-z]/.test(snippet);
  const hasCommandPunctuation = /[{}/\\$`|;<>]/.test(snippet);
  const startsWithBareToolName = /^[A-Za-z0-9._-]+\s/.test(snippet);
  return startsCapitalized && !hasCommandPunctuation && !startsWithBareToolName;
}

function allItems() {
  return MASTER_METHODOLOGY_FRAMEWORK.flatMap((phase) =>
    phase.subcategories.flatMap((sub) => sub.items.map((item) => ({ phase, item })))
  );
}

describe('methodology framework integrity', () => {
  it('has no commandSnippet that reads as a prose sentence', () => {
    const offenders = allItems()
      .filter(({ item }) => item.commandSnippet && looksLikeProse(item.commandSnippet))
      .map(({ item }) => `${item.id}: ${item.commandSnippet}`);
    expect(offenders).toEqual([]);
  });

  it('runs branch letters in order (A, B, C, ...) within each phase', () => {
    const branchLetterRe = /^Branch ([A-Z]):/;
    for (const phase of MASTER_METHODOLOGY_FRAMEWORK) {
      const letters = phase.subcategories
        .flatMap((sub) => sub.items)
        .map((item) => item.title.match(branchLetterRe)?.[1])
        .filter((letter): letter is string => Boolean(letter));

      // Each letter seen must come strictly after the previous one (A, B, C, ... with no
      // repeats and no going backwards).
      let lastCode = -1;
      for (const letter of letters) {
        const code = letter.charCodeAt(0);
        expect(code).toBeGreaterThan(lastCode);
        lastCode = code;
      }
    }
  });
});
