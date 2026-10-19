/**
 * examTargetSelection.ts
 * Pure, seeded machine selection for the exam simulator.
 *
 * - `createRng(seed)`: mulberry32 over a hashed string seed (same seed -> same sequence).
 * - `shuffleWithRng`: unbiased Fisher-Yates.
 * - `selectExamMachines(track, catalog, { seed, solvedIds })`: fills each slot of the track layout from the
 *   catalog in tiers (cert-tagged unsolved -> cert-tagged solved -> catalog unsolved -> catalog solved ->
 *   hardcoded fallback). A machine never fills two slots. Slot difficulty may relax by one step inside a
 *   tier before the next tier is tried.
 *
 * Reproducibility = same seed + same catalog + same solved set.
 */

import type { Difficulty, Machine, OperatingSystem } from '../types';
import type { ExamTrack } from './examComplianceUtils';

export type SelectionTier =
  | 'cert-unsolved'
  | 'cert-solved'
  | 'catalog-unsolved'
  | 'catalog-solved'
  | 'fallback';

export interface ExamSlotSpec {
  /** Stable slot key (matches the exam box id). */
  key: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  /** Slot needs an Active Directory style machine (tagged active directory / kerberos). */
  ad?: boolean;
}

export interface SlotSelection {
  slot: ExamSlotSpec;
  /** The chosen catalog machine, or null when the hardcoded fallback must be used. */
  machine: Machine | null;
  tier: SelectionTier;
}

export interface SelectExamMachinesOptions {
  seed: string;
  /** Ids of machines the user has already solved. */
  solvedIds?: Iterable<string>;
}

const DIFFICULTY_ORDER: readonly Difficulty[] = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];

/** Slot layouts for the tracks whose targets come from the machine catalog. */
const SLOT_SPECS: Partial<Record<ExamTrack, ExamSlotSpec[]>> = {
  OSCP: [
    { key: 'oscp-ad-1', os: 'Linux', difficulty: 'Easy' },
    { key: 'oscp-ad-2', os: 'Windows', difficulty: 'Medium' },
    { key: 'oscp-ad-3', os: 'Windows', difficulty: 'Hard', ad: true },
    { key: 'oscp-st-1', os: 'Linux', difficulty: 'Easy' },
    { key: 'oscp-st-2', os: 'Windows', difficulty: 'Medium' },
    { key: 'oscp-st-3', os: 'Linux', difficulty: 'Hard' },
  ],
  CPTS: [
    { key: 'cpts-1', os: 'Linux', difficulty: 'Medium' },
    { key: 'cpts-2', os: 'Linux', difficulty: 'Medium' },
    { key: 'cpts-3', os: 'Windows', difficulty: 'Medium' },
    { key: 'cpts-4', os: 'Windows', difficulty: 'Hard' },
    { key: 'cpts-5', os: 'Windows', difficulty: 'Medium' },
    { key: 'cpts-6', os: 'Windows', difficulty: 'Hard' },
    { key: 'cpts-7', os: 'Windows', difficulty: 'Hard', ad: true },
  ],
  CRTP: [
    { key: 'crtp-1', os: 'Windows', difficulty: 'Medium' },
    { key: 'crtp-2', os: 'Windows', difficulty: 'Medium' },
    { key: 'crtp-3', os: 'Windows', difficulty: 'Hard', ad: true },
  ],
};

/** The slot layout for a catalog-driven track (empty for tracks with a fixed scenario). */
export function getExamSlotSpecs(track: ExamTrack): ExamSlotSpec[] {
  return (SLOT_SPECS[track] ?? []).map((s) => ({ ...s }));
}

/** Catalog certification tag for a track, if the catalog tags machines for it. */
function certTagForTrack(track: ExamTrack): Machine['certifications'][number] | null {
  return track === 'OSCP' || track === 'CPTS' || track === 'CRTO' ? track : null;
}

function isAdMachine(m: Machine): boolean {
  return (m.tags ?? []).some((t) => {
    const lower = t.toLowerCase();
    return lower.includes('active directory') || lower.includes('activedirectory') || lower.includes('kerberos');
  });
}

/** xmur3-style string hash to a 32-bit unsigned seed. */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG. Returns a function producing floats in [0, 1). */
export function createRng(seed: string | number): () => number {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unbiased Fisher-Yates shuffle (returns a new array). */
export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const EXAM_SEED_LENGTH = 6;

/** A fresh short seed code (uppercase, no ambiguous characters). */
export function generateExamSeed(): string {
  let out = '';
  for (let i = 0; i < EXAM_SEED_LENGTH; i++) {
    out += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  }
  return out;
}

/** Normalises a user-entered seed: trimmed, uppercased, restricted to letters/digits/dash, max 16 chars. Empty if nothing usable. */
export function normalizeExamSeed(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16);
}

function difficultyDistance(a: Difficulty, b: Difficulty): number {
  return Math.abs(DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b));
}

/**
 * Fills each slot of the track layout from the catalog. Deterministic for a given seed, catalog and solved set.
 * Tracks without a catalog layout return an empty list.
 */
export function selectExamMachines(
  track: ExamTrack,
  catalog: readonly Machine[],
  opts: SelectExamMachinesOptions
): SlotSelection[] {
  const slots = getExamSlotSpecs(track);
  if (slots.length === 0) return [];

  const solved = new Set(opts.solvedIds ?? []);
  const certTag = certTagForTrack(track);
  const rng = createRng(opts.seed);

  // Sort by id first so catalog ordering never changes the outcome, then shuffle once; every slot takes the
  // first matching machine in this order.
  const unique = new Map<string, Machine>();
  for (const m of catalog) {
    if (m && m.id && !unique.has(m.id)) unique.set(m.id, m);
  }
  const sorted = [...unique.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const order = shuffleWithRng(sorted, rng);

  const tiers: Array<{ tier: SelectionTier; accept: (m: Machine) => boolean }> = [];
  if (certTag) {
    tiers.push({ tier: 'cert-unsolved', accept: (m) => m.certifications?.includes(certTag) === true && !solved.has(m.id) });
    tiers.push({ tier: 'cert-solved', accept: (m) => m.certifications?.includes(certTag) === true && solved.has(m.id) });
  }
  tiers.push({ tier: 'catalog-unsolved', accept: (m) => !solved.has(m.id) });
  tiers.push({ tier: 'catalog-solved', accept: (m) => solved.has(m.id) });

  const used = new Set<string>();

  return slots.map((slot) => {
    for (const { tier, accept } of tiers) {
      const eligible = (m: Machine) =>
        !used.has(m.id) && m.os === slot.os && (!slot.ad || isAdMachine(m)) && accept(m);
      // Exact difficulty first, then relax by one step, before falling to the next tier.
      for (const maxDistance of [0, 1]) {
        const pick = order.find(
          (m) => eligible(m) && difficultyDistance(m.difficulty, slot.difficulty) === maxDistance
        );
        if (pick) {
          used.add(pick.id);
          return { slot, machine: pick, tier };
        }
      }
    }
    return { slot, machine: null, tier: 'fallback' as const };
  });
}
