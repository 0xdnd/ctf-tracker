import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';

// Every hard-coded machine count in the docs and UI must equal the computed catalog numbers.
const read = (rel: string) => readFileSync(resolve(__dirname, '../../..', rel), 'utf8');

const ALL = appendActiveMachines(INITIAL_MACHINES);
const TOTAL = ALL.length;
const RETIRED_HTB = INITIAL_MACHINES.filter((m) => m.platform === 'HTB' && !m.isActive).length;
const ACTIVE = ALL.filter((m) => m.isActive).length;
const THM = INITIAL_MACHINES.filter((m) => m.platform === 'THM').length;
// Retired rows that carry only name, OS, difficulty and a room link.
const METADATA_ONLY_RETIRED = INITIAL_MACHINES.filter(
  (m) => m.platform === 'HTB' && m.isActive === false && m.tags.length === 0 && !m.hint && !m.writeupUrl
).length;

const PURE_CTF_TOTAL = 1027;

const UI_FILES = [
  'index.html',
  'src/components/auth/OperatorProfileModal.tsx',
  'src/components/common/StartCleanModal.tsx',
  'src/components/backup/BackupModal.tsx',
];

/** All numbers in `text` matched by group 1 of the global `re`. */
const all = (text: string, re: RegExp) => [...text.matchAll(re)].map((m) => Number(m[1]));

describe('hard-coded catalog counts', () => {
  it('computed numbers add up', () => {
    expect(ACTIVE).toBe(ACTIVE_MACHINES.machines.length);
    expect(TOTAL).toBe(RETIRED_HTB + ACTIVE + THM);
    console.log('[catalog counts]', JSON.stringify({ TOTAL, RETIRED_HTB, ACTIVE, THM, METADATA_ONLY_RETIRED }));
  });

  it.each(UI_FILES)('every headline machine literal in %s equals the CTF count (never the total)', (file) => {
    const totals = all(
      read(file),
      /\b(\d{3,5})\+?(?:-target|-machine| targets| labs| CTF machines| HTB & THM machines| Hack The Box & TryHackMe machines)\b/g
    );
    expect(totals.length, file).toBeGreaterThan(0);
    for (const n of totals) expect(n, file).toBe(PURE_CTF_TOTAL);
  });

  it('every pure CTF challenge literal in README.md equals 1027', () => {
    const totals = all(
      read('README.md'),
      /\b(\d{3,5})\+?(?:-target|-machine| targets| labs| CTF machines| HTB & THM machines| Hack The Box & TryHackMe machines)\b/g
    );
    expect(totals.length).toBeGreaterThan(0);
    for (const n of totals) expect(n).toBe(PURE_CTF_TOTAL);
  });

  it('README badge and platform breakdowns match the catalog', () => {
    const readme = read('README.md');
    expect(all(readme, /badge\/Machines-(\d+)-/g)).toEqual([PURE_CTF_TOTAL]);
    expect(all(readme, /\b(\d+) retired (?:HTB|Hack The Box) machines/g)).toEqual([RETIRED_HTB, RETIRED_HTB]);
    expect(all(readme, /\b(\d+) active (?:HTB|Hack The Box) machines/g)).toEqual([ACTIVE]);
    expect(all(readme, /\b(\d+) (?:THM CTF rooms|TryHackMe CTF rooms)/g)).toEqual([THM]);
    expect(all(readme, /; (\d+) of them \(mostly retired since 2024\)/g)).toEqual([METADATA_ONLY_RETIRED]);
  });
});

describe('public/llms.txt catalog counts', () => {
  it('leads with the CTF count and mentions guided labs only when there are any', () => {
    const llms = read('public/llms.txt');
    const nf = new Intl.NumberFormat('en-US');
    const m = llms.match(/Tracks ([\d,]+) CTF machines(?: \(plus ([\d,]+) guided labs\))?/);
    expect(m, 'llms.txt catalog line').not.toBeNull();
    expect(m![1]).toBe(nf.format(PURE_CTF_TOTAL));
    expect(m![2] ?? '0').toBe(nf.format(TOTAL - PURE_CTF_TOTAL));
  });
});

describe('landing page copy uses computed values', () => {
  it('prerender.cjs has no hardcoded machine count or track list', () => {
    const src = read('scripts/prerender.cjs');
    expect(src).not.toContain('1,000+');
    expect(src).toContain('const EXAM_TRACKS = model.examTracks;');
    expect(src).not.toContain('EXAM_TRACKS = [');
    expect(src).toContain("proofItem(nf.format(CTF_MACHINES), 'machines catalogued')");
    expect(src).not.toContain('TOTAL_MACHINES');
  });
});
