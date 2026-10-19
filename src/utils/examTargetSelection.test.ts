import { describe, it, expect } from 'vitest';
import type { Difficulty, Machine, OperatingSystem } from '../types';
import { createRng, getExamSlotSpecs, normalizeExamSeed, selectExamMachines, shuffleWithRng } from './examTargetSelection';
import { applyWeightedPoints, calculateExamScore, generateExamTargetsForTrack } from './examComplianceUtils';

function machine(
  id: string,
  os: OperatingSystem,
  difficulty: Difficulty,
  extra: Partial<Machine> = {}
): Machine {
  return {
    id,
    name: id.toUpperCase(),
    ip: '10.10.10.10',
    os,
    platform: 'HTB',
    difficulty,
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

/** A catalog large enough to fill every slot of every catalog-driven track from the cert-tagged tier. */
function bigCatalog(): Machine[] {
  const out: Machine[] = [];
  const oses: OperatingSystem[] = ['Linux', 'Windows'];
  const diffs: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  let n = 0;
  for (const os of oses) {
    for (const d of diffs) {
      for (let i = 0; i < 12; i++) {
        n += 1;
        out.push(
          machine(`m${String(n).padStart(3, '0')}`, os, d, {
            certifications: i % 2 === 0 ? ['OSCP', 'CPTS'] : [],
            tags: os === 'Windows' && i % 3 === 0 ? ['Active Directory'] : [],
          })
        );
      }
    }
  }
  return out;
}

const idsOf = (track: 'OSCP' | 'CPTS' | 'CRTP', catalog: Machine[], seed: string, solvedIds: string[] = []) =>
  selectExamMachines(track, catalog, { seed, solvedIds }).map((s) => s.machine?.id ?? null);

describe('rng and shuffle', () => {
  it('createRng is deterministic per seed and stays in [0, 1)', () => {
    const a = createRng('ABC123');
    const b = createRng('ABC123');
    const seqA = Array.from({ length: 20 }, () => a());
    expect(seqA).toEqual(Array.from({ length: 20 }, () => b()));
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
    const c = createRng('ABC124');
    expect(Array.from({ length: 20 }, () => c())).not.toEqual(seqA);
  });

  it('shuffleWithRng keeps the same elements and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffleWithRng(input, createRng('x'));
    expect([...out].sort((p, q) => p - q)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('normalizeExamSeed uppercases and strips unsafe characters', () => {
    expect(normalizeExamSeed('  ab c-12! ')).toBe('ABC-12');
    expect(normalizeExamSeed('   ')).toBe('');
  });
});

describe('selectExamMachines', () => {
  it('same seed and same catalog give identical machines, regardless of catalog order', () => {
    const catalog = bigCatalog();
    const first = idsOf('OSCP', catalog, 'SEED01');
    expect(idsOf('OSCP', catalog, 'SEED01')).toEqual(first);
    expect(idsOf('OSCP', [...catalog].reverse(), 'SEED01')).toEqual(first);
  });

  it('a different seed gives a different set (large catalog)', () => {
    const catalog = bigCatalog();
    const sets = ['AAAAAA', 'BBBBBB', 'CCCCCC', 'DDDDDD'].map((s) => idsOf('OSCP', catalog, s).join(','));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it('never uses the same machine twice in one exam', () => {
    const catalog = bigCatalog();
    for (const track of ['OSCP', 'CPTS', 'CRTP'] as const) {
      for (const seed of ['ONE111', 'TWO222', 'THREE3', 'FOUR44']) {
        const ids = idsOf(track, catalog, seed).filter((id): id is string => Boolean(id));
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
    const boxes = generateExamTargetsForTrack('CPTS', catalog, { seed: 'NODUPE' });
    const machineIds = boxes.map((b) => b.machineId).filter(Boolean);
    expect(new Set(machineIds).size).toBe(machineIds.length);
  });

  it('prefers unsolved cert-tagged machines and uses solved ones only when a slot cannot be filled otherwise', () => {
    const catalog = [
      machine('cert-unsolved', 'Linux', 'Easy', { certifications: ['OSCP'] }),
      machine('cert-solved', 'Linux', 'Easy', { certifications: ['OSCP'] }),
      machine('plain-unsolved', 'Linux', 'Easy'),
    ];
    const solved = ['cert-solved'];
    // Two Linux Easy slots exist in OSCP (oscp-ad-1 and oscp-st-1).
    const tiers = selectExamMachines('OSCP', catalog, { seed: 'S', solvedIds: solved }).filter((s) => s.machine);
    expect(tiers.map((t) => [t.slot.key, t.machine!.id, t.tier])).toEqual([
      ['oscp-ad-1', 'cert-unsolved', 'cert-unsolved'],
      ['oscp-st-1', 'cert-solved', 'cert-solved'],
    ]);
    // plain-unsolved is a catalog-tier machine, so it only fills a slot once cert-tagged machines run out.
    const more = selectExamMachines('OSCP', catalog, { seed: 'S', solvedIds: solved });
    const used = more.filter((s) => s.machine).map((s) => s.machine!.id);
    expect(used).not.toContain('plain-unsolved');
  });

  it('falls through catalog-unsolved before catalog-solved', () => {
    const catalog = [machine('u', 'Windows', 'Medium'), machine('s', 'Windows', 'Medium')];
    const sel = selectExamMachines('CRTP', catalog, { seed: 'S', solvedIds: ['s'] });
    const ws = sel.find((x) => x.slot.key === 'crtp-1')!;
    const srv = sel.find((x) => x.slot.key === 'crtp-2')!;
    expect([ws.machine?.id, ws.tier]).toEqual(['u', 'catalog-unsolved']);
    expect([srv.machine?.id, srv.tier]).toEqual(['s', 'catalog-solved']);
    expect(sel.find((x) => x.slot.key === 'crtp-3')!.tier).toBe('fallback');
  });

  it('uses the hardcoded fallback only when the catalog cannot fill the slot', () => {
    const empty = selectExamMachines('OSCP', [], { seed: 'S' });
    expect(empty).toHaveLength(6);
    expect(empty.every((s) => s.tier === 'fallback' && s.machine === null)).toBe(true);

    const boxes = generateExamTargetsForTrack('OSCP', [], { seed: 'S' });
    expect(boxes.map((b) => b.name)).toEqual(['CORP-WEB01', 'CORP-SRV01', 'CORP-DC01', 'ALPHA', 'BRAVO', 'CHARLIE']);

    const full = selectExamMachines('OSCP', bigCatalog(), { seed: 'S' });
    expect(full.every((s) => s.tier !== 'fallback')).toBe(true);
  });

  it('relaxes difficulty by one step before moving on, and never by two', () => {
    const oneStep = [machine('med', 'Linux', 'Medium')];
    const sel = selectExamMachines('OSCP', oneStep, { seed: 'S' });
    expect(sel.find((s) => s.slot.key === 'oscp-ad-1')!.machine?.id).toBe('med'); // Easy slot, Medium machine

    const twoSteps = [machine('hard', 'Linux', 'Hard')];
    const sel2 = selectExamMachines('OSCP', twoSteps, { seed: 'S' });
    // Hard fits the Hard slot exactly (oscp-st-3) and is too far from the Easy slots.
    expect(sel2.find((s) => s.slot.key === 'oscp-st-3')!.machine?.id).toBe('hard');
    expect(sel2.find((s) => s.slot.key === 'oscp-ad-1')!.machine).toBeNull();
  });

  it('prefers an exact difficulty match over a relaxed one inside a tier', () => {
    const catalog = [machine('a-medium', 'Linux', 'Medium'), machine('z-easy', 'Linux', 'Easy')];
    const sel = selectExamMachines('OSCP', catalog, { seed: 'S' });
    expect(sel.find((s) => s.slot.key === 'oscp-ad-1')!.machine?.id).toBe('z-easy');
  });

  it('requires an AD-tagged Windows machine for the domain controller slot', () => {
    const catalog = [machine('win-hard', 'Windows', 'Hard'), machine('ad-hard', 'Windows', 'Hard', { tags: ['Kerberos'] })];
    const dc = selectExamMachines('OSCP', catalog, { seed: 'S' }).find((s) => s.slot.key === 'oscp-ad-3')!;
    expect(dc.machine?.id).toBe('ad-hard');
  });

  it('slot labels and boxes reflect the real machine OS and difficulty', () => {
    const catalog = [machine('linux-med', 'Linux', 'Medium')];
    const boxes = generateExamTargetsForTrack('OSCP', catalog, { seed: 'S' });
    // The only machine fills the first slot it fits (the Linux Easy AD foothold, relaxed one step).
    const used = boxes.find((b) => b.machineId === 'linux-med')!;
    expect(used.id).toBe('oscp-ad-1');
    expect(used.name).toBe('LINUX-MED');
    expect(used.difficulty).toBe('Medium');
    expect(used.os).toBe('Linux');
    const st1 = generateExamTargetsForTrack('OSCP', [machine('a', 'Linux', 'Easy'), machine('b', 'Linux', 'Medium')], { seed: 'S' }).find(
      (b) => b.id === 'oscp-st-1'
    )!;
    expect(st1.machineId).toBeDefined();
    expect(st1.label).toBe(`Standalone 01 (${st1.os} ${st1.difficulty})`);
  });

  it('returns no slots for fixed-scenario tracks', () => {
    for (const track of ['CRTO', 'OSEP', 'PNPT', 'OSWE'] as const) {
      expect(getExamSlotSpecs(track)).toEqual([]);
      expect(selectExamMachines(track, bigCatalog(), { seed: 'S' })).toEqual([]);
    }
  });
});

describe('weighted points', () => {
  it('OSCP weighted keeps the AD set at 40 and standalones sum to 60 (total exactly 100)', () => {
    for (const seed of ['W1W1W1', 'W2W2W2', 'W3W3W3', 'W4W4W4']) {
      const boxes = generateExamTargetsForTrack('OSCP', bigCatalog(), { seed, scoringMode: 'weighted' });
      const ad = boxes.filter((b) => b.adRole);
      const standalones = boxes.filter((b) => !b.adRole);
      expect(ad.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(40);
      expect(standalones.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(60);
      expect(boxes.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(100);
      standalones.forEach((b) => {
        expect(b.userPoints).toBe(b.rootPoints);
        expect(Number.isInteger(b.userPoints)).toBe(true);
      });
    }
  });

  it('applyWeightedPoints uses weights Easy 1 / Medium 1.5 / Hard 2 / Insane 2.5 and keeps the user/root ratio', () => {
    const base = generateExamTargetsForTrack('OSCP', [], { seed: 'S' }).filter((b) => !b.adRole);
    const withDiff = base.map((b, i) => ({ ...b, difficulty: (['Easy', 'Medium', 'Hard'] as Difficulty[])[i] }));
    const out = applyWeightedPoints(withDiff);
    expect(out.map((b) => b.userPoints + b.rootPoints)).toEqual([14, 20, 26]);
    expect(out.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(60);

    const insane = applyWeightedPoints(withDiff.map((b, i) => ({ ...b, difficulty: (['Easy', 'Insane', 'Insane'] as Difficulty[])[i] })));
    expect(insane.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(60);
  });

  it('OSWE official is 35 + 15 per app; weighted still totals exactly 100 with the 7:3 ratio and whole points', () => {
    const official = generateExamTargetsForTrack('OSWE');
    expect(official.map((b) => [b.userPoints, b.rootPoints])).toEqual([[35, 15], [35, 15]]);

    for (const seed of ['O1O1O1', 'O2O2O2', 'O3O3O3', 'O4O4O4', 'O5O5O5']) {
      const boxes = generateExamTargetsForTrack('OSWE', [], { seed, scoringMode: 'weighted' });
      expect(boxes.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(100);
      boxes.forEach((b) => {
        expect(b.userPoints * 3).toBe(b.rootPoints * 7);
        expect(Number.isInteger(b.userPoints)).toBe(true);
      });
      expect(new Set(boxes.map((b) => b.difficulty)).size).toBe(2);
      const full = boxes.map((b) => ({ ...b, userPwned: true, rootPwned: true }));
      expect(calculateExamScore('OSWE', full).totalScore).toBe(100);
    }
  });

  it('weighted mode is ignored on tracks that do not support it', () => {
    for (const track of ['CPTS', 'CRTO', 'OSEP', 'CRTP', 'PNPT'] as const) {
      const official = generateExamTargetsForTrack(track, [], { seed: 'S' });
      const weighted = generateExamTargetsForTrack(track, [], { seed: 'S', scoringMode: 'weighted' });
      expect(weighted.map((b) => [b.userPoints, b.rootPoints])).toEqual(official.map((b) => [b.userPoints, b.rootPoints]));
    }
  });
});
