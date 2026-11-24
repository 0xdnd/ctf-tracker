import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';
import {
  CATALOG_TOTAL,
  EXAM_TRACK_COUNT,
  EXAM_TRACKS_LIST,
  PHASE_COUNT,
  PHASE_COUNT_WORD,
  SHELL_COUNT,
  countOwnerSolved,
} from '../../data/catalogStats';
import { MASTER_METHODOLOGY_FRAMEWORK } from '../../data/methodologyFramework';
import { EXAM_TRACK_CONFIGS } from '../../utils/examComplianceUtils';
import { availableShellItems } from '../../data/revshellsData';
import { OWN_WRITEUPS } from '../../data/ownWriteups';
import pg from '../../data/catalogSources/pg.json';
import vulnhub from '../../data/catalogSources/vulnhub.json';

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

// INITIAL_MACHINES + activeMachines.json hold only the HTB and THM rows; PG and VulnHub rows
// come from src/data/catalogSources and join at runtime (loadMachinesCatalog). The copy counts all of them.
// Nothing here is a literal: scripts/update-catalog-counts.mjs rewrites the copy, and these numbers come from the data files.
const HTB_THM_TOTAL = TOTAL;
const PURE_CTF_TOTAL = HTB_THM_TOTAL + pg.length + vulnhub.length;

const UI_FILES = [
  'src/components/auth/OperatorProfileModal.tsx',
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

  it('CATALOG_TOTAL equals the HTB+THM rows plus the PG and VulnHub source files', () => {
    expect(CATALOG_TOTAL).toBe(HTB_THM_TOTAL + pg.length + vulnhub.length);
  });

  it('auto-synced site stats match methodology phases, exam tracks and available reverse shells', () => {
    const tracks = Object.values(EXAM_TRACK_CONFIGS).map((t) => t.id);
    const tracksList = `${tracks.slice(0, -1).join(', ')} and ${tracks[tracks.length - 1]}`;
    expect(PHASE_COUNT).toBe(MASTER_METHODOLOGY_FRAMEWORK.length);
    expect(PHASE_COUNT_WORD.length).toBeGreaterThan(0);
    expect(EXAM_TRACK_COUNT).toBe(tracks.length);
    expect(EXAM_TRACKS_LIST).toBe(tracksList);
    expect(SHELL_COUNT).toBe(availableShellItems.length);
  });

  it.each(UI_FILES)('%s uses CATALOG_TOTAL and has no raw catalog count', (file) => {
    const src = read(file);
    expect(src, file).toContain('CATALOG_TOTAL');
    expect(src, file).toMatch(/import \{[^}]*CATALOG_TOTAL[^}]*\} from '[^']*catalogStats'/);
    expect(src, file).not.toContain(String(PURE_CTF_TOTAL));
  });

  it('owner solved roster counts match the seeded catalog', () => {
    expect(countOwnerSolved(INITIAL_MACHINES)).toEqual({ total: 55, htb: 37, thm: 18 });
  });

  it('llms.txt states the owner-solved attack path count from the catalog', () => {
    const n = all(read('public/llms.txt'), /with (\d+) owner-solved attack path pages/g);
    expect(n).toEqual([countOwnerSolved(INITIAL_MACHINES).total]);
    const w = all(read('public/llms.txt'), /(\d+) of them with a full writeup on the page/g);
    expect(w).toEqual([Object.keys(OWN_WRITEUPS).length]);
  });

  it('every pure CTF challenge literal in README.md equals the full catalog total', () => {
    const totals = all(
      read('README.md'),
      /\b(\d{3,5})\+?(?:-target|-machine| targets| labs| CTF machines| HTB & THM machines| Hack The Box & TryHackMe machines| HTB, THM, PG & VulnHub machines| Hack The Box, TryHackMe, Proving Grounds & VulnHub machines)\b/g
    );
    expect(totals.length).toBeGreaterThan(0);
    for (const n of totals) expect(n).toBe(PURE_CTF_TOTAL);
  });

  it('copy scoped to HTB and THM keeps the HTB+THM count, never the full total', () => {
    const nf = new Intl.NumberFormat('en-US');
    const llms = read('public/llms.txt');
    expect(llms).toContain(`full directory of ${nf.format(HTB_THM_TOTAL)} HTB and THM machines`);
    expect(llms).not.toContain(`${nf.format(PURE_CTF_TOTAL)} HTB`);
    expect(read('scripts/gen-content-pages.cjs')).toContain('catalogCounts.htbThm');
    // A scope-naming phrase may only sit next to the HTB+THM count.
    for (const file of ['README.md', 'public/llms.txt', ...UI_FILES]) {
      expect(read(file), file).not.toMatch(/1,?37[26] (?:HTB and THM|HTB & THM|Hack The Box and TryHackMe)/);
    }
  });

  it('README badge and platform breakdowns match the catalog', () => {
    const readme = read('README.md');
    expect(all(readme, /badge\/Machines-(\d+)-/g)).toEqual([PURE_CTF_TOTAL]);
    expect(all(readme, /\b(\d+) retired (?:HTB|Hack The Box) machines/g)).toEqual([RETIRED_HTB, RETIRED_HTB]);
    expect(all(readme, /\b(\d+) active (?:HTB|Hack The Box) machines/g)).toEqual([ACTIVE]);
    expect(all(readme, /\b(\d+) (?:THM CTF rooms|TryHackMe CTF rooms)/g)).toEqual([THM]);
    expect(all(readme, /\b(\d+) OffSec Proving Grounds boxes/g)).toEqual([pg.length]);
    expect(all(readme, /\b(\d+) VulnHub boxes/g)).toEqual([vulnhub.length]);
    expect(all(readme, /; (\d+) of them \(mostly retired since 2024\)/g)).toEqual([METADATA_ONLY_RETIRED]);
    expect(readme).toContain(EXAM_TRACKS_LIST);
  });
});

describe('public/llms-full.txt catalog counts', () => {
  it('states the full and the HTB+THM machine counts from the data files', () => {
    const nf = new Intl.NumberFormat('en-US');
    const m = read('public/llms-full.txt').match(/It tracks ([\d,]+) machines across Hack The Box, TryHackMe, Proving Grounds and VulnHub \(([\d,]+) of them Hack The Box and TryHackMe/);
    expect(m, 'llms-full.txt catalog line').not.toBeNull();
    expect(m![1]).toBe(nf.format(PURE_CTF_TOTAL));
    expect(m![2]).toBe(nf.format(HTB_THM_TOTAL));
  });
});

describe('public/llms.txt catalog counts', () => {
  it('leads with the CTF count and mentions guided labs only when there are any', () => {
    const llms = read('public/llms.txt');
    const nf = new Intl.NumberFormat('en-US');
    const m = llms.match(/Tracks ([\d,]+) CTF machines(?: \(plus ([\d,]+) guided labs\))?/);
    expect(m, 'llms.txt catalog line').not.toBeNull();
    expect(m![1]).toBe(nf.format(PURE_CTF_TOTAL));
    expect(m![2] ?? '0').toBe(nf.format(TOTAL - HTB_THM_TOTAL));
  });
});

describe('landing page copy uses computed values', () => {
  it('prerender.cjs has no hardcoded machine count or track list', () => {
    const src = read('scripts/prerender.cjs');
    expect(src).not.toContain('1,000+');
    expect(src).toContain('const EXAM_TRACKS = model.examTracks;');
    expect(src).not.toContain('EXAM_TRACKS = [');
    expect(src).toContain("proofItem(nf.format(CTF_MACHINES), 'machines cataloged')");
    expect(src).not.toContain('TOTAL_MACHINES');
  });
});
