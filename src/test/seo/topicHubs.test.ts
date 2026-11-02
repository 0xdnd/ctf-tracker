// @vitest-environment node
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const req = createRequire(import.meta.url);
const { GROUPS } = req('../../../scripts/lib/techniques.cjs');

describe('topic groups', () => {
  it('flags no hub as general commands (deserialization and buffer-overflow now have topic-specific local commands)', () => {
    const flagged = GROUPS.filter((g: { generalCommands?: boolean }) => g.generalCommands).map((g: { slug: string }) => g.slug);
    expect(flagged.sort()).toEqual([]);
  });

  it('gives deserialization and buffer-overflow at least 3 topic-specific commands each (resolved + local)', () => {
    for (const slug of ['deserialization', 'buffer-overflow']) {
      const g = GROUPS.find((x: { slug: string }) => x.slug === slug) as { commandIds?: string[]; localCommands?: unknown[] };
      const total = (g?.commandIds?.length || 0) + (g?.localCommands?.length || 0);
      expect(total, slug).toBeGreaterThanOrEqual(2);
    }
  });
});
