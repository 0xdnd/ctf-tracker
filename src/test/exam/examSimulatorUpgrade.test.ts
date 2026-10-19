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

  it('official OSCP has no bonus, even when the legacy flag is absent', () => {
    const score = calculateExamScore('OSCP', standalonePwned());
    expect(score.totalScore).toBe(10);
    expect(score.bonusPointsAwarded).toBe(0);
  });

  it('legacy bonus with 0 exam points gives 0', () => {
    const boxes = generateExamTargetsForTrack('OSCP', [], { seed: 'S' });
    const score = calculateExamScore('OSCP', boxes, { includeBonusPoints: true });
    expect(score.totalScore).toBe(0);
    expect(score.bonusPointsAwarded).toBe(0);
  });

  it('legacy bonus adds 10 once the exam score is above 0, capped at the max score', () => {
    const score = calculateExamScore('OSCP', standalonePwned(), { includeBonusPoints: true });
    expect(score.totalScore).toBe(20);
    expect(score.bonusPointsAwarded).toBe(10);

    const all = generateExamTargetsForTrack('OSCP', [], { seed: 'S' }).map((b) => ({ ...b, userPwned: true, rootPwned: true }));
    const capped = calculateExamScore('OSCP', all, { includeBonusPoints: true });
    expect(capped.totalScore).toBe(100);
    expect(capped.bonusPointsAwarded).toBe(0);
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

  it('setIncludeBonusPoints maps onto legacy mode', () => {
    useExamStore.getState().setIncludeBonusPoints(true);
    expect(useExamStore.getState().scoringMode).toBe('legacy');
    expect(useExamStore.getState().includeBonusPoints).toBe(true);
    useExamStore.getState().setIncludeBonusPoints(false);
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

  it('normalizeExamModeFields: includeBonusPoints true maps to legacy; invalid values are ignored', () => {
    expect(normalizeExamModeFields({ track: 'OSCP', includeBonusPoints: true }).scoringMode).toBe('legacy');
    expect(normalizeExamModeFields({ track: 'OSCP', scoringMode: 'bogus', seed: 'ab12' })).toMatchObject({
      scoringMode: 'official',
      seed: 'AB12',
    });
    expect(normalizeExamModeFields({ track: 'CPTS', scoringMode: 'weighted' }).scoringMode).toBe('official');
  });

  it('rehydrating an old persisted payload (no seed/scoringMode, includeBonusPoints true) keeps the bonus as legacy mode', async () => {
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
    expect(state.scoringMode).toBe('legacy');
    expect(state.includeBonusPoints).toBe(true);
    expect(state.seed).toMatch(/^[A-Z0-9]{6}$/);
    expect(state.status).toBe('running');
    // A running exam keeps its score: the bonus still applies once points are scored.
    useExamStore.getState().togglePwn('oscp-st-1', 'user');
    expect(useExamStore.getState().getScore().bonusPointsAwarded).toBe(10);
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
    expect(state.scoringMode).toBe('legacy');
    expect(state.seed).toMatch(/^[A-Z0-9]{6}$/);

    const plain = JSON.parse(JSON.stringify(useExamStore.getState()));
    delete plain.seed;
    delete plain.scoringMode;
    plain.includeBonusPoints = false;
    expect(restoreExamBackupSnapshot(plain)).toBe(true);
    expect(useExamStore.getState().scoringMode).toBe('official');
  });
});
