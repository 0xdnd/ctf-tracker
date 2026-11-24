// Rewrites the machine and reverse shell counts in README.md from the app data.
// Run: npm run readme:counts   (add --check to fail instead of writing)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import esbuild from 'esbuild';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const model = require('./lib/content-model.cjs').getModel();
const machines = model.catalogCounts.ctf;
const shells = model.shellAvailableCount;

// Platform breakdowns come from the same TS data modules the app uses (bundled to a temp CJS file).
function loadCatalog() {
  const dir = mkdtempSync(join(tmpdir(), 'zb-readme-'));
  const out = join(dir, 'bundle.cjs');
  try {
    esbuild.buildSync({
      stdin: {
        contents: `export { INITIAL_MACHINES } from './src/data/machinesCatalog';
export { appendActiveMachines } from './src/data/activeMachines';`,
        resolveDir: ROOT,
        loader: 'ts',
      },
      bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    });
    return require(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const { INITIAL_MACHINES, appendActiveMachines } = loadCatalog();
const all = appendActiveMachines(INITIAL_MACHINES);
const retired = INITIAL_MACHINES.filter((m) => m.platform === 'HTB' && !m.isActive).length;
const active = all.filter((m) => m.isActive).length;
const thm = INITIAL_MACHINES.filter((m) => m.platform === 'THM').length;
const pg = model.extraMachines.filter((m) => m.platform === 'PG').length;
const vulnhub = model.extraMachines.filter((m) => m.platform === 'VulnHub').length;
const tracks = model.examTracks;
const trackCount = model.examTrackCount;
const tracksList = model.examTracksList;
const tracksCsv = model.examTracksCsv;
const tracksOr = tracks.length > 1 ? `${tracks.slice(0, -1).join(', ')} or ${tracks[tracks.length - 1]}` : tracks.join('');
const metadataOnly = INITIAL_MACHINES.filter(
  (m) => m.platform === 'HTB' && m.isActive === false && m.tags.length === 0 && !m.hint && !m.writeupUrl
).length;

const raw = readFileSync(join(ROOT, 'README.md'), 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let txt = raw.replace(/\r\n/g, '\n');

const rules = [
  [/(img\.shields\.io\/badge\/Machines-)\d+(-)/, `$1${machines}$2`],
  [/(img\.shields\.io\/badge\/Reverse_Shells-)\d+(?:%2B)?(-)/, `$1${shells}$2`],
  [/\*\*\d+ HTB, THM, PG & VulnHub machines\*\*/, `**${machines} HTB, THM, PG & VulnHub machines**`],
  [/\*\*\d+-machine catalog:\*\*/, `**${machines}-machine catalog:**`],
  [/\*\*\d+ reverse shells\*\*/, `**${shells} reverse shells**`],
  [/\d+ Linux and Windows payloads/, `${shells} Linux and Windows payloads`],
  [/\d+ retired (HTB|Hack The Box) machines/g, `${retired} retired $1 machines`],
  [/\d+ active (HTB|Hack The Box) machines/g, `${active} active $1 machines`],
  [/\d+ (TryHackMe CTF rooms)/g, `${thm} $1`],
  [/\d+ OffSec Proving Grounds boxes/g, `${pg} OffSec Proving Grounds boxes`],
  [/\d+ VulnHub boxes/g, `${vulnhub} VulnHub boxes`],
  [/prepare for [A-Z0-9, ]+and [A-Z0-9]+\./, `prepare for ${tracksList}.`],
  [/Grinding for \*\*[^*]+\*\*\?/, `Grinding for **${tracksOr}**?`],
  [/A \*\*24h exam simulator\*\* with [^|\n]+/, `A **24h exam simulator** with ${trackCount} tracks (${tracksCsv}) `],
  [/structured cert journeys \([^)]+\)\./, `structured cert journeys (${tracksCsv}).`],
  [/(-\s+\*\*24h exam simulator:\*\* )[^\n]+/, `$1${trackCount} exam tracks (${tracksList}), scoring, breaks, evidence proofs, and a live burn-down chart.`],
  [/(Yes\. It includes a 24-hour exam simulator )[^\n]+(, a methodology checklist)/, `$1across ${trackCount} exam tracks (${tracksList})$2`],
  [/; \d+ of them \(mostly retired since 2024\)/g, `; ${metadataOnly} of them (mostly retired since 2024)`],
  [/\d+ public community challenge rooms/g, `${thm} public community challenge rooms`],
];
for (const [re, to] of rules) {
  if (!re.test(txt)) console.warn(`readme-counts: no match for ${re}`);
  txt = txt.replace(re, to);
}
const out = txt.replace(/\n/g, eol);
if (out === raw) {
  console.log(`README counts up to date (${machines} machines, ${shells} reverse shells)`);
} else if (process.argv.includes('--check')) {
  console.error('README counts are stale; run npm run readme:counts');
  process.exit(1);
} else {
  writeFileSync(join(ROOT, 'README.md'), out, 'utf8');
  console.log(`README counts updated (${machines} machines, ${shells} reverse shells)`);
}
