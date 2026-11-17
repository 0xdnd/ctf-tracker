'use strict';
// Compact on-disk format of src/data/catalogSources/vulnhub.json (it counts toward the JS bundle budget).
// Logical row: { id, name, os, difficulty, roomUrl, difficultyUnrated?, tags?, certifications? } (see VulnhubRow in src/types).
// Packed row:  [name, link, d, o?, x?]
//   link  number = the entry id when the entry slug equals slugOf(name); "slug,id" when it does not; or the full url
//         when roomUrl is not a vulnhub.com/entry/ url (kept as is).
//   d     index into DIFFS; 5 means Medium with no stated difficulty (difficultyUnrated).
//   o     index into OSES (omitted when 0 = Linux and there is no x).
//   x     { id?, tags?, certifications? }; id only when it is not "vulnhub-" + slug.
// src/data/loadMachinesCatalog.ts holds the same decoder; src/test/data/catalogSources.test.ts keeps the two in step.
const ENTRY = 'https://www.vulnhub.com/entry/';
const DIFFS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const OSES = ['Linux', 'Windows', 'BSD', 'Android', 'macOS', 'Other'];

const slugOf = (name) => name.toLowerCase().replace(/\s*:\s*/, '_').replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').replace(/-+/g, '-');

function unpackRows(packed) {
  return packed.map(([name, link, d, o = 0, x = {}]) => {
    const entry = typeof link === 'number' || !link.startsWith('http');
    const tail = typeof link === 'number' ? `${slugOf(name)},${link}` : link;
    const slug = entry ? tail.slice(0, tail.indexOf(',')) : '';
    const row = {
      id: x.id || `vulnhub-${slug}`,
      name,
      os: OSES[o],
      difficulty: DIFFS[d === 5 ? 2 : d],
      roomUrl: entry ? `${ENTRY}${tail}/` : link,
    };
    if (d === 5) row.difficultyUnrated = true;
    if (x.tags) row.tags = x.tags;
    if (x.certifications) row.certifications = x.certifications;
    return row;
  });
}

function packRow(r) {
  const o = OSES.indexOf(r.os);
  const d = r.difficultyUnrated ? 5 : DIFFS.indexOf(r.difficulty);
  if (o < 0 || d < 0) throw new Error(`unknown os/difficulty on ${r.id}`);
  let link = r.roomUrl;
  let slug = '';
  if (link.startsWith(ENTRY) && link.endsWith('/')) {
    const tail = link.slice(ENTRY.length, -1);
    const i = tail.indexOf(',');
    if (i > 0) {
      slug = tail.slice(0, i);
      link = slugOf(r.name) === slug && /^\d+$/.test(tail.slice(i + 1)) ? Number(tail.slice(i + 1)) : tail;
    }
  }
  const x = {};
  if (r.id !== `vulnhub-${slug}`) x.id = r.id;
  if (r.tags) x.tags = r.tags;
  if (r.certifications) x.certifications = r.certifications;
  const out = [r.name, link, d];
  const hasX = Object.keys(x).length > 0;
  if (o !== 0 || hasX) out.push(o);
  if (hasX) out.push(x);
  if (JSON.stringify(unpackRows([out])[0]) !== JSON.stringify(r)) throw new Error(`row ${r.id} does not survive packing`);
  return out;
}

module.exports = { slugOf, unpackRows, packRows: (rows) => rows.map(packRow), DIFFS, OSES };
