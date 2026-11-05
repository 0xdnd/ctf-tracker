import { describe, it, expect, beforeEach } from 'vitest';
import type { Difficulty, Machine, OperatingSystem } from '../../types';
import { EXAM_STORAGE_KEY, normalizeExamModeFields, restoreExamBackupSnapshot, useExamStore } from '../../store/examStore';
import { calculateExamScore, generateExamTargetsForTrack } from '../../utils/examComplianceUtils';

function machine(id: string, os: OperatingSystem, difficulty: Difficulty, extra: Partial<Machine> = {}): Machine {
  return {
    id,
    name: id.toUpperCase(),
    ip: '10.10.10.10',
    os,
    platform: 'HTB',
    difficulty,
    status: 'backlog',
    tags: [],
    certifications: ['OSCP'],
    timeSpentSeconds: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

function catalog(): Machine[] {
  const out: Machine[] = [];
  let n = 0;
  for (const os of ['Linux', 'Windows'] as const) {
    for (const d of ['Easy', 'Medium', 'Hard'] as const) {
      for (let i = 0; i < 6; i++) {
        n += 1;
        out.push(machine(`c${String(n).padStart(2, '0')}`, os, d, { tags: os === 'Windows' ? ['Active Directory'] : [] }));
      }
    }
  }
  return out;
}

const names = () => useExamStore.getState().boxes.map((b) => b.name);

describe('scoring', () => {
  const standalonePwned = () => {
    const boxes = generateExamTargetsForTrack('OSCP', [], { seed: 'S' });
    return boxes.map((b) => (b.id === 'oscp-st-1' ? { ...b, userPwned: true } : b));
  };

  it('OSCP has no bonus points; a full sweep caps at the max score', () => {
    const score = calculateExamScore('OSCP', standalonePwned());
    expect(score.totalScore).toBe(10);
    expect(score).not.toHaveProperty('bonusPointsAwarded');

    const all = generateExamTargetsForTrack('OSCP', [], { seed: 'S' }).map((b) => ({ ...b, userPwned: true, rootPwned: true }));
    expect(calculateExamScore('OSCP', all).totalScore).toBe(100);
  });

  it('OSWE scores 35 for the auth bypass and 15 for RCE per app', () => {
    const [app1, app2] = generateExamTargetsForTrack('OSWE');
    expect([app1.userPoints, app1.rootPoints]).toEqual([35, 15]);
    expect(calculateExamScore('OSWE', [{ ...app1, userPwned: true }, app2]).totalScore).toBe(35);
    expect(calculateExamScore('OSWE', [{ ...app1, userPwned: true, rootPwned: true }, { ...app2, userPwned: true }]).totalScore).toBe(85);
  });
});

describe('exam store: seeds, previews and startExam', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamStore.getState().resetExam('OSCP');
  });

  it('createInitialSession rolls a seed and defaults to official scoring', () => {
    const state = useExamStore.getState();
    expect(state.seed).toMatch(/^[A-Z0-9]{6}$/);
    expect(state.scoringMode).toBe('official');
    expect(state.includeBonusPoints).toBe(false);
  });

  it('default scratch notes keep the headings but carry no sample credentials', () => {
    const notes = useExamStore.getState().scratchNotes;
    expect(notes).toContain('## Target Credential Vault');
    expect(notes).toContain('## Active Tunnels & Pivots');
    expect(notes).not.toMatch(/administrator|P@ssw0rd|Chisel/i);
  });

  it('shuffleTargets creates a new seed and a different roll; setSeed reproduces a roll', () => {
    const pool = catalog();
    useExamStore.getState().setSeed('AAAAAA', pool, []);
    const first = names();
    expect(useExamStore.getState().seed).toBe('AAAAAA');

    useExamStore.getState().shuffleTargets(pool, []);
    const afterShuffle = useExamStore.getState();
    expect(afterShuffle.seed).not.toBe('AAAAAA');
    expect(afterShuffle.seed).toMatch(/^[A-Z0-9]{6}$/);

    useExamStore.getState().setSeed('aaaaaa', pool, []);
    expect(useExamStore.getState().seed).toBe('AAAAAA');
    expect(names()).toEqual(first);
  });

  it('startExam keeps the previewed boxes and seed (no re-roll)', () => {
    const pool = catalog();
    useExamStore.getState().setSeed('KEEP11', pool, []);
    const previewNames = names();
    const previewIds = useExamStore.getState().boxes.map((b) => b.machineId);

    // Even a different catalog passed at start must not change the previewed set.
    useExamStore.getState().startExam('OSCP', undefined, [machine('other', 'Linux', 'Easy')], []);
    const state = useExamStore.getState();
    expect(state.status).toBe('running');
    expect(state.seed).toBe('KEEP11');
    expect(state.boxes.map((b) => b.name)).toEqual(previewNames);
    expect(state.boxes.map((b) => b.machineId)).toEqual(previewIds);
  });

  it('restarting a started exam regenerates from the same seed and clears progress', () => {
    const pool = catalog();
    useExamStore.getState().setSeed('REST11', pool, []);
    const previewNames = names();
    useExamStore.getState().startExam('OSCP', undefined, pool, []);
    useExamStore.getState().togglePwn('oscp-st-1', 'user');
    expect(useExamStore.getState().boxes.find((b) => b.id === 'oscp-st-1')!.userPwned).toBe(true);

    useExamStore.getState().startExam('OSCP', undefined, pool, []);
    const state = useExamStore.getState();
    expect(state.seed).toBe('REST11');
    expect(names()).toEqual(previewNames);
    expect(state.boxes.every((b) => !b.userPwned && !b.rootPwned)).toBe(true);
  });

  it('shuffleTargets is ignored while an exam is running', () => {
    useExamStore.getState().startExam('OSCP');
    const { seed, boxes } = useExamStore.getState();
    useExamStore.getState().shuffleTargets(catalog(), []);
    expect(useExamStore.getState().seed).toBe(seed);
    expect(useExamStore.getState().boxes).toBe(boxes);
  });

  it('setSeed is ignored while an exam is running or for an unusable seed', () => {
    useExamStore.getState().setSeed('GOOD11', catalog(), []);
    useExamStore.getState().setSeed('   ', catalog(), []);
    expect(useExamStore.getState().seed).toBe('GOOD11');
    useExamStore.getState().startExam('OSCP');
    useExamStore.getState().setSeed('LATE11', catalog(), []);
    expect(useExamStore.getState().seed).toBe('GOOD11');
  });

  it('setTrack keeps the seed and drops a scoring mode the new track cannot use', () => {
    useExamStore.getState().setSeed('TRACK1', catalog(), []);
    useExamStore.getState().setScoringMode('weighted');
    expect(useExamStore.getState().scoringMode).toBe('weighted');
    useExamStore.getState().setTrack('OSWE');
    expect(useExamStore.getState().seed).toBe('TRACK1');
    expect(useExamStore.getState().scoringMode).toBe('weighted');
    useExamStore.getState().setTrack('CPTS');
    expect(useExamStore.getState().seed).toBe('TRACK1');
    expect(useExamStore.getState().scoringMode).toBe('official');
  });
});

describe('exam store: scoring modes', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamStore.getState().resetExam('OSCP');
  });

  it('weighted mode bakes redistributed points into the boxes and totals exactly 100', () => {
    useExamStore.getState().setSeed('WGT111', catalog(), []);
    useExamStore.getState().setScoringMode('weighted', catalog(), []);
    const state = useExamStore.getState();
    expect(state.scoringMode).toBe('weighted');
    expect(state.boxes.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(100);
    expect(state.boxes.filter((b) => b.adRole).reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(40);
    expect(state.seed).toBe('WGT111');

    useExamStore.getState().startExam('OSCP');
    expect(useExamStore.getState().boxes.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(100);
    expect(useExamStore.getState().getScore().maxScore).toBe(100);
  });

  it('weighted is unavailable for CPTS and cannot be entered or left once the exam started', () => {
    useExamStore.getState().setTrack('CPTS');
    useExamStore.getState().setScoringMode('weighted');
    expect(useExamStore.getState().scoringMode).toBe('official');

    useExamStore.getState().resetExam('OSCP');
    useExamStore.getState().startExam('OSCP');
    useExamStore.getState().setScoringMode('weighted');
    expect(useExamStore.getState().scoringMode).toBe('official');
  });

  it('the removed legacy bonus mode cannot be selected', () => {
    useExamStore.getState().setScoringMode('legacy' as never);
    expect(useExamStore.getState().scoringMode).toBe('official');
    expect(useExamStore.getState().includeBonusPoints).toBe(false);
  });
});

describe('persisted state migration', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamStore.getState().resetExam('OSCP');
  });

  it('normalizeExamModeFields: missing fields default to official with a fresh seed', () => {
    const out = normalizeExamModeFields({ track: 'OSCP' });
    expect(out.scoringMode).toBe('official');
    expect(out.includeBonusPoints).toBe(false);
    expect(out.seed).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('normalizeExamModeFields: the removed legacy mode and bonus flag load as official; invalid values are ignored', () => {
    expect(normalizeExamModeFields({ track: 'OSCP', includeBonusPoints: true })).toMatchObject({
      scoringMode: 'official',
      includeBonusPoints: false,
    });
    expect(normalizeExamModeFields({ track: 'OSCP', scoringMode: 'legacy', includeBonusPoints: true })).toMatchObject({
      scoringMode: 'official',
      includeBonusPoints: false,
    });
    expect(normalizeExamModeFields({ track: 'OSCP', scoringMode: 'bogus', seed: 'ab12' })).toMatchObject({
      scoringMode: 'official',
      seed: 'AB12',
    });
    expect(normalizeExamModeFields({ track: 'CPTS', scoringMode: 'weighted' }).scoringMode).toBe('official');
  });

  it('rehydrating an old persisted payload (no seed/scoringMode, includeBonusPoints true) loads as official scoring', async () => {
    const current = useExamStore.getState();
    const { seed: _seed, scoringMode: _mode, ...legacyShape } = JSON.parse(
      JSON.stringify({ ...current, includeBonusPoints: true, status: 'running', examExpiresAt: Date.now() + 3600_000 })
    );
    void _seed;
    void _mode;
    // Persist only the keys the old build stored (functions are dropped by JSON).
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ state: legacyShape, version: 1 }));
    await useExamStore.persist.rehydrate();

    const state = useExamStore.getState();
    expect(state.scoringMode).toBe('official');
    expect(state.includeBonusPoints).toBe(false);
    expect(state.seed).toMatch(/^[A-Z0-9]{6}$/);
    expect(state.status).toBe('running');
    // No bonus points any more: only the flag itself scores.
    useExamStore.getState().togglePwn('oscp-st-1', 'user');
    expect(useExamStore.getState().getScore().totalScore).toBe(10);
  });

  it('rehydrating a saved 24h legacy-bonus session keeps its own clock and scores AD per machine', async () => {
    const now = Date.now();
    const current = useExamStore.getState();
    const saved = JSON.parse(
      JSON.stringify({
        ...current,
        scoringMode: 'legacy',
        includeBonusPoints: true,
        status: 'running',
        startedAt: now - 3600_000,
        totalDurationSeconds: 86400,
        examExpiresAt: now - 3600_000 + 86400_000,
        lastExpiresAt: now - 3600_000 + 86400_000,
      })
    );
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ state: saved, version: 1 }));
    await useExamStore.persist.rehydrate();

    const state = useExamStore.getState();
    expect(state.scoringMode).toBe('official');
    expect(state.includeBonusPoints).toBe(false);
    expect(state.totalDurationSeconds).toBe(86400);
    expect(state.examExpiresAt).toBe(saved.examExpiresAt);
    expect(state.getRemainingSeconds()).toBeGreaterThan(23 * 3600 - 5);

    const ad1 = state.boxes.find((b) => b.adRole === 'foothold')!;
    useExamStore.getState().togglePwn(ad1.id, 'user');
    expect(useExamStore.getState().getScore()).toMatchObject({ totalScore: 10, adPoints: 10 });
  });

  it('a fresh visitor with no persisted state keeps the initial seed', async () => {
    const seed = useExamStore.getState().seed;
    localStorage.clear();
    await useExamStore.persist.rehydrate();
    expect(useExamStore.getState().seed).toBe(seed);
  });

  it('seed and scoringMode are persisted and survive a rehydrate', async () => {
    useExamStore.getState().setSeed('PERSI1', catalog(), []);
    useExamStore.getState().setScoringMode('weighted', catalog(), []);
    const stored = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY) || '{}');
    expect(stored.state.seed).toBe('PERSI1');
    expect(stored.state.scoringMode).toBe('weighted');

    const raw = localStorage.getItem(EXAM_STORAGE_KEY) as string;
    useExamStore.setState({ seed: 'OTHER1', scoringMode: 'official' });
    localStorage.setItem(EXAM_STORAGE_KEY, raw);
    await useExamStore.persist.rehydrate();
    expect(useExamStore.getState().seed).toBe('PERSI1');
    expect(useExamStore.getState().scoringMode).toBe('weighted');
  });

  it('restoring an old backup snapshot without seed/scoringMode defaults them explicitly', () => {
    const snapshot = JSON.parse(JSON.stringify(useExamStore.getState()));
    delete snapshot.seed;
    delete snapshot.scoringMode;
    snapshot.includeBonusPoints = true;
    expect(restoreExamBackupSnapshot(snapshot)).toBe(true);
    const state = useExamStore.getState();
    expect(state.scoringMode).toBe('official');
    expect(state.includeBonusPoints).toBe(false);
    expect(state.seed).toMatch(/^[A-Z0-9]{6}$/);

    const plain = JSON.parse(JSON.stringify(useExamStore.getState()));
    delete plain.seed;
    delete plain.scoringMode;
    plain.includeBonusPoints = false;
    expect(restoreExamBackupSnapshot(plain)).toBe(true);
    expect(useExamStore.getState().scoringMode).toBe('official');
  });
});
