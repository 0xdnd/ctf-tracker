import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useCtfStore } from '../../store/useCtfStore';
import type { NoteIndex } from '../../utils/noteIndex';

const build = vi.hoisted(() => ({ count: 0 }));
vi.mock('../../utils/noteIndex', async (orig) => {
  const mod = await orig<typeof import('../../utils/noteIndex')>();
  return {
    ...mod,
    buildNoteIndex: (...a: Parameters<typeof mod.buildNoteIndex>) => {
      build.count++;
      return mod.buildNoteIndex(...a);
    },
  };
});

import { useNoteIndex, resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';

describe('shared note index', () => {
  beforeEach(() => {
    resetNoteIndexCacheForTests();
    build.count = 0;
    useCtfStore.setState({ customNotes: [], userNotes: [], deletedNoteIds: [] });
  });

  it('builds once for two mounted consumers and hands both the same object', () => {
    const seen: NoteIndex[] = [];
    const Probe = () => {
      seen.push(useNoteIndex());
      return null;
    };
    render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    expect(build.count).toBe(1);
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(1);
  });
});
