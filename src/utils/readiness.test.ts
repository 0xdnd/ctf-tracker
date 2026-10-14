import { describe, it, expect } from 'vitest';
import { computeReadiness, type ReadinessMachine } from './readiness';

const NOW = 1_000_000;
const m = (id: string, status: ReadinessMachine['status'], tags: string[], extra: Partial<ReadinessMachine> = {}): ReadinessMachine => ({
  id,
  name: id,
  status,
  tags,
  difficulty: 'Medium',
  ...extra,
});

describe('computeReadiness', () => {
  it('returns zeros for an empty or untouched list', () => {
    expect(computeReadiness([], NOW).score).toBe(0);
    const r = computeReadiness([m('a', 'backlog', ['web'])], NOW);
    expect(r.score).toBe(0);
    expect(r.attempted).toBe(0);
    expect(r.nextSuggested.map((x) => x.id)).toEqual(['a']);
  });

  it('scores the solve rate of started machines', () => {
    const r = computeReadiness([m('a', 'root', []), m('b', 'recon', []), m('c', 'backlog', [])], NOW);
    expect(r.solved).toBe(1);
    expect(r.attempted).toBe(2);
    expect(r.score).toBe(50);
  });

  it('reduces the score when solved machines are overdue', () => {
    const r = computeReadiness([m('a', 'root', [], { nextReviewAt: NOW - 1 })], NOW);
    expect(r.dueItems.map((x) => x.id)).toEqual(['a']);
    expect(r.score).toBe(50);
  });

  it('ranks weakest tags by solve rate and ignores thin or perfect tags', () => {
    const r = computeReadiness(
      [
        m('a', 'root', ['web', 'ad']),
        m('b', 'recon', ['web']),
        m('c', 'foothold', ['web']),
        m('d', 'root', ['ad']),
        m('e', 'recon', ['rare']),
        m('f', 'root', ['nmap-scanned']),
        m('g', 'recon', ['nmap-scanned']),
      ],
      NOW,
    );
    expect(r.weakestTags.map((t) => t.tag)).toEqual(['web']);
    expect(r.weakestTags[0]).toMatchObject({ solved: 1, attempted: 3 });
  });

  it('only counts items whose nextReviewAt has passed as due', () => {
    const r = computeReadiness(
      [m('a', 'root', [], { nextReviewAt: NOW }), m('b', 'root', [], { nextReviewAt: NOW + 1 }), m('c', 'root', [])],
      NOW,
    );
    expect(r.dueItems.map((x) => x.id)).toEqual(['a']);
  });

  it('suggests unsolved items, favouring in-progress and weak-tag ones', () => {
    const r = computeReadiness(
      [
        m('s1', 'root', ['web']),
        m('s2', 'recon', ['web']),
        m('hard', 'backlog', ['web'], { difficulty: 'Insane' }),
        m('plain', 'backlog', ['misc']),
        m('wip', 'foothold', ['misc']),
        m('done', 'completed', ['web']),
      ],
      NOW,
      { maxSuggested: 3 },
    );
    const ids = r.nextSuggested.map((x) => x.id);
    expect(ids).not.toContain('done');
    expect(ids).not.toContain('s1');
    expect(ids[0]).toBe('s2');
    expect(ids).toHaveLength(3);
  });

  it('weights readiness score and tag rates by solve independence (solo > nudged > assisted)', () => {
    const solo = computeReadiness([m('a', 'root', ['web'], { solveIndependence: 'solo' })], NOW);
    const nudged = computeReadiness([m('a', 'root', ['web'], { solveIndependence: 'nudged' })], NOW);
    const assisted = computeReadiness([m('a', 'root', ['web'], { solveIndependence: 'assisted' })], NOW);

    expect(solo.score).toBe(100);
    expect(nudged.score).toBe(65);
    expect(assisted.score).toBe(35);

    // Tag rate check with 2 attempts
    const rAssisted = computeReadiness(
      [
        m('a', 'root', ['web'], { solveIndependence: 'assisted' }),
        m('b', 'recon', ['web']),
      ],
      NOW,
      { minTagAttempts: 2 }
    );
    expect(rAssisted.weakestTags[0].rate).toBeCloseTo(0.35 / 2, 2);
  });
});
