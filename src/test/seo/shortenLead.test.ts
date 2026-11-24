// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { shortenLead, splitSentences } = req('../../../scripts/lib/layout.cjs');

const balanced = (html: string) => {
  const stack: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/gi)) {
    if (!m[1]) stack.push(m[2]);
    else if (stack.pop() !== m[2]) return false;
  }
  return stack.length === 0;
};

describe('shortenLead', () => {
  it('never splits inside an element (sentence end inside a link)', () => {
    const lead = 'Start here. Read <a href="/x/">the guide. Then the list</a> first. Fourth sentence follows. Fifth one ends it.';
    const parts = splitSentences(lead);
    expect(parts.every(balanced)).toBe(true);
    expect(parts.join(' ')).toContain('<a href="/x/">the guide. Then the list</a> first.');
    const out = shortenLead(`<p class="lead">${lead}</p><p>Next</p>`);
    expect(balanced(out)).toBe(true);
  });

  it('does not split after common abbreviations', () => {
    const parts = splitSentences('Ask Mr. Smith about it, e.g. Dr. Jones. Next sentence is here. Another one.');
    expect(parts).toEqual(['Ask Mr. Smith about it, e.g. Dr. Jones.', 'Next sentence is here.', 'Another one.']);
  });

  it('keeps a long lead to two sentences plus a list', () => {
    const out = shortenLead('<p class="lead">One is here. Two is here. Three is here. Four is here with more words to be long enough, definitely over the limit for a short lead block.</p><p>x</p>');
    expect(out).toContain('<p class="lead">One is here. Two is here.</p>');
    expect(out).toContain('<ul><li>Three is here.</li>');
  });
});
