// Writeup checker (read-only): node scripts/check-writeups.cjs [file.md ...] [--help]
// Same validation as the build (scripts/lib/writeups.cjs) but writes nothing to dist/ or public/.
// With file args, those files are checked even if they are drafts; without args, every writeup in content/writeups (WRITEUPS_DIR honored).
// Prints OK/FAIL per file plus stats; exit code 1 if any file fails.
const fs = require('fs');
const path = require('path');
const { checkWriteups, getTechSlugs } = require('./lib/content-model.cjs');
const { SECTIONS, MIN_WORDS, MIN_TECH_LINKS } = require('./lib/writeups.cjs');

const args = process.argv.slice(2);
const words = (s) => String(s).split(/\s+/).filter(Boolean).length;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/check-writeups.cjs [file.md ...]

Validates writeups exactly like the build does, without writing anything.
No arguments: checks every writeup in content/writeups (or $WRITEUPS_DIR).
With paths: checks those files, drafts included.

Rules (field details: content/writeups/README.md):
  - H2 sections once each, in order: ${SECTIONS.join(' | ')}
  - at least ${MIN_WORDS} words of prose (code excluded)
  - at least ${MIN_TECH_LINKS} distinct /techniques/<slug>/ links
  - a personal data point (a sentence with I/my and a number)
  - no flags, 32-char hex strings, images or raw HTML

Allowed technique slugs:
  ${[...getTechSlugs()].sort().join('\n  ')}`);
  process.exit(0);
}

const dir = process.env.WRITEUPS_DIR ? path.resolve(process.env.WRITEUPS_DIR) : path.resolve(__dirname, '..', 'content', 'writeups');
const files = args.length
  ? args.map((a) => path.resolve(a))
  : fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md').sort().map((f) => path.join(dir, f))
    : [];

let failed = 0;
for (const f of files) {
  const name = path.basename(f);
  try {
    if (!fs.existsSync(f)) throw new Error(`${name}: file not found`);
    const [w] = checkWriteups({ files: [f], includeDrafts: true });
    const todos = (fs.readFileSync(f, 'utf8').match(/\[TODO\b/gi) || []).length;
    console.log(`OK   ${name}`);
    console.log(`     prose words: ${w.stats.proseWords}; takeaway words: ${words(w.fm.takeaway)}; technique links: ${w.stats.techLinks.join(', ') || 'none'}; TODO markers: ${todos}`);
    if (todos) console.log('     note: resolve the [TODO] markers before publishing');
  } catch (e) {
    failed++;
    console.log(`FAIL ${String(e.message)}`);
  }
}
if (!files.length) console.log('No writeups found.');
// The manifest reflects the default writeups folder, so skip it when WRITEUPS_DIR points elsewhere.
if (!args.length && !process.env.WRITEUPS_DIR) {
  const m = require('./gen-own-writeups.cjs').checkManifest();
  if (m.ok) console.log(`OK   ${m.message}`);
  else {
    failed++;
    console.log(`FAIL ${m.message}`);
  }
}
process.exit(failed ? 1 : 0);
