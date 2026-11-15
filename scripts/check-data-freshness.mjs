// Report-only freshness check for data sources that carry an "as of" date.
// Prints each source with its age in days and emits GitHub Actions warnings
// for sources older than the threshold. Always exits 0.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_AGE_DAYS = 60;
const DAY_MS = 86_400_000;

/** Whole days between an ISO date (YYYY-MM-DD) and `now`; null when unparsable. */
export function ageInDays(isoDate, now = new Date()) {
  const t = Date.parse(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - t) / DAY_MS);
}

function collectSources() {
  const out = [];
  for (const dir of ['src/data/trackSources']) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter((n) => n.endsWith('.json')).sort()) {
      const data = JSON.parse(readFileSync(join(abs, f), 'utf8'));
      if (data && typeof data === 'object' && data.asOf) out.push({ file: `${dir}/${f}`, asOf: data.asOf });
    }
  }
  const active = join(ROOT, 'src/data/activeMachines.json');
  if (existsSync(active)) {
    const data = JSON.parse(readFileSync(active, 'utf8'));
    if (data.asOf) out.push({ file: 'src/data/activeMachines.json', asOf: data.asOf });
  }
  // Exam rule content: "checked YYYY-MM-DD" note in the points calculator.
  const calc = join(ROOT, 'src/utils/oscpPointsCalculator.ts');
  if (existsSync(calc)) {
    const m = /checked (\d{4}-\d{2}-\d{2})/.exec(readFileSync(calc, 'utf8'));
    if (m) out.push({ file: 'src/utils/oscpPointsCalculator.ts', asOf: m[1] });
  }
  return out;
}

function main() {
  const rows = collectSources();
  let stale = 0;
  console.log(`Data freshness (warn after ${MAX_AGE_DAYS} days)`);
  for (const { file, asOf } of rows) {
    const age = ageInDays(asOf);
    if (age === null) {
      console.log(`  ${file}: unparsable date "${asOf}"`);
      console.log(`::warning file=${file}::Unparsable as-of date "${asOf}"`);
      continue;
    }
    const isStale = age > MAX_AGE_DAYS;
    if (isStale) stale += 1;
    console.log(`  ${file}: ${asOf} (${age} days)${isStale ? ' STALE' : ''}`);
    if (isStale) console.log(`::warning file=${file}::Data is ${age} days old (as of ${asOf}); review it`);
  }
  console.log(`${rows.length} sources, ${stale} stale`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
