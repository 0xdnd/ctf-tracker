// Reports how fresh src/data/activeMachines.json is. Informational only: always exits 0.
// Usage: npm run check:active
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_AGE_DAYS = 30;
const file = fileURLToPath(new URL('../src/data/activeMachines.json', import.meta.url));

try {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const count = Array.isArray(data.machines) ? data.machines.length : 0;
  const asOf = Date.parse(`${data.asOf}T00:00:00Z`);
  console.log(`active machines: ${count} (as of ${data.asOf})`);
  if (Number.isNaN(asOf)) {
    console.warn(`WARNING: asOf "${data.asOf}" is not a valid YYYY-MM-DD date.`);
  } else {
    const ageDays = Math.floor((Date.now() - asOf) / 86_400_000);
    if (ageDays > MAX_AGE_DAYS) {
      console.warn(
        `WARNING: the active machine list is ${ageDays} days old (over ${MAX_AGE_DAYS}). ` +
          'Recheck the Hack The Box Active tab and update src/data/activeMachines.json.'
      );
    }
  }
  if (data.note) console.log(`note: ${data.note}`);
} catch (err) {
  console.warn(`WARNING: could not read ${file}: ${err instanceof Error ? err.message : err}`);
}
process.exit(0);
