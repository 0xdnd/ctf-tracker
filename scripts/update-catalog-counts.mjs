// Recomputes the catalog counts from the data files and rewrites the generated numbers:
//   src/data/catalogStats.ts  CATALOG_TOTAL (kept as a literal so catalog data stays out of the entry bundle)
//   public/llms.txt, public/llms-full.txt  headline machine counts
//   README.md  via scripts/readme-counts.mjs (machines, retired/active HTB, THM)
// Run by sync-vulnhub.mjs and sync-htb-active.mjs after they write. Run: npm run catalog:counts (add --check to fail instead of writing).
// Each rule must match exactly once; a missing anchor is an error, never a silent skip.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const check = process.argv.includes('--check');

const { htbThm, ctf } = require('./lib/content-model.cjs').getModel().catalogCounts;
const nf = (n) => n.toLocaleString('en-US');

const FILES = [
  { file: 'src/data/catalogStats.ts', rules: [[/(export const CATALOG_TOTAL = )\d+(;)/, String(ctf)]] },
  {
    file: 'public/llms.txt',
    rules: [
      [/(Tracks )[\d,]+( CTF machines across Hack The Box)/, nf(ctf)],
      [/(full directory of )[\d,]+( HTB and THM machines)/, nf(htbThm)],
      [/(listed without pages \()[\d,]+( in all\))/, nf(ctf)],
    ],
  },
  {
    file: 'public/llms-full.txt',
    rules: [
      [/(It tracks )[\d,]+( machines across Hack The Box)/, nf(ctf)],
      [/(\()[\d,]+( of them Hack The Box and TryHackMe)/, nf(htbThm)],
    ],
  },
];

let stale = 0;
for (const { file, rules } of FILES) {
  const path = join(ROOT, file);
  const raw = readFileSync(path, 'utf8');
  let txt = raw;
  for (const [re, value] of rules) {
    if ((txt.match(new RegExp(re.source, 'g')) || []).length !== 1) throw new Error(`${file}: expected exactly one match for ${re}`);
    txt = txt.replace(re, `$1${value}$2`);
  }
  if (txt !== raw) {
    stale++;
    if (!check) writeFileSync(path, txt, 'utf8');
    console.log(`${check ? 'stale' : 'updated'}: ${file}`);
  }
}

const readme = spawnSync(process.execPath, [join(ROOT, 'scripts/readme-counts.mjs'), ...(check ? ['--check'] : [])], { stdio: 'inherit', cwd: ROOT });
if (readme.status !== 0) {
  if (!check) throw new Error('readme-counts.mjs failed');
  stale++;
}

console.log(`Catalog counts: ${nf(ctf)} machines (${nf(htbThm)} HTB and THM).${stale ? '' : ' Everything up to date.'}`);
if (check && stale) {
  console.error('Counts are stale; run npm run catalog:counts');
  process.exit(1);
}
