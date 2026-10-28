/* One-shot: converts catalog-candidates/*.md into src/data/catalogSources/{pg,vulnhub}.json. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const AS_OF = '2026-10-28T00:00:00.000Z';
const DROP = new Set(['Smasher 1', 'Scarlet 1']);
const VH_DIFF = { Beginner: 'Very Easy', Easy: 'Easy', Intermediate: 'Medium', Hard: 'Hard' };
const PG_DIFF = { Easy: 'Easy', Intermediate: 'Medium', Hard: 'Hard' };
const OS = { Linux: 'Linux', Windows: 'Windows', 'Windows (AD)': 'Windows', FreeBSD: 'BSD', BSD: 'BSD' };

const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const normalize = (n) =>
  n
    .toLowerCase()
    .replace(/\(#\d+\)/g, '')
    .replace(/:\s*ctf/g, '')
    .replace(/[\s:]+1\s*$/, '')
    .replace(/[^a-z0-9]/g, '');

function rows(md) {
  return md
    .split(/\r?\n/)
    .filter((l) => /^\| *\d+ *\|/.test(l))
    .map((l) => l.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.replace(/\*\*/g, '').trim()));
}

function need(map, key, ctx) {
  if (!(key in map)) throw new Error(`Unmapped value "${key}" in ${ctx}`);
  return map[key];
}

function base(id, name, os, difficulty, tags, certifications, roomUrl) {
  return {
    id, name, ip: '10.10.x.x', os, platform: null, difficulty, status: 'backlog',
    tags, certifications, roomUrl, writeupUrl: '', hint: '',
    timeSpentSeconds: 0, createdAt: AS_OF, updatedAt: AS_OF,
  };
}

const uniqueId = (used, id) => {
  let out = id;
  for (let n = 2; used.has(out); n++) out = `${id}-${n}`;
  used.add(out);
  return out;
};

// ---- VulnHub
const vulnhub = [];
const vhUsed = new Set();
for (const [, name, series, os, diff] of rows(read('catalog-candidates/vulnhub_machines_list.md'))) {
  if (DROP.has(name)) continue;
  const m = base(
    uniqueId(vhUsed, `vulnhub-${slug(name)}`), name, need(OS, os, name), need(VH_DIFF, diff, name), [], [],
    `https://www.vulnhub.com/?q=${encodeURIComponent(name)}`,
  );
  m.platform = 'VulnHub';
  const s = series.replace(/\(.*?\)/g, '').trim();
  if (s && !/^Standalone/i.test(s)) m.tags.push(s);
  vulnhub.push(m);
}
const vhByNorm = new Map(vulnhub.map((m) => [normalize(m.name), m]));

// ---- PG
const tj = JSON.parse(read('src/data/trackSources/tjnull-oscp.json'));
const oscp = new Set([...tj.names.pgPlay, ...tj.names.pgPractice].map((e) => e.name.toLowerCase()));
const pg = [];
const pgUsed = new Set();
let deduped = 0;
for (const [, name, tier, os, diff] of rows(read('catalog-candidates/offsec_proving_grounds_list.md'))) {
  const play = tier === 'PG Play';
  if (!play && tier !== 'PG Practice') throw new Error(`Unknown tier ${tier} for ${name}`);
  if (play) {
    const twin = vhByNorm.get(normalize(name));
    if (twin) {
      if (!twin.tags.includes('Also-on-PG-Play')) twin.tags.push('Also-on-PG-Play');
      deduped++;
      continue;
    }
  }
  const m = base(
    uniqueId(pgUsed, `pg-${slug(name)}`), name, need(OS, os, name), need(PG_DIFF, diff, name),
    [play ? 'PG-Play' : 'PG-Practice'], oscp.has(name.toLowerCase()) ? ['OSCP'] : [],
    `https://portal.offsec.com/labs/${play ? 'play' : 'practice'}`,
  );
  m.platform = 'PG';
  pg.push(m);
}

const out = (f, data) =>
  fs.writeFileSync(path.join(root, 'src/data/catalogSources', f), JSON.stringify(data, null, 2) + '\n');
out('pg.json', pg);
out('vulnhub.json', vulnhub);
console.log(`vulnhub=${vulnhub.length} pg=${pg.length} deduped=${deduped} pgOSCP=${pg.filter((m) => m.certifications.length).length}`);
