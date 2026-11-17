'use strict';
// Compact on-disk format of src/data/catalogSources/pg.json (it counts toward the JS bundle budget).
// Full row key order: id, name, ip, os, platform, difficulty, status, tags, certifications, roomUrl, writeupUrl, hint,
// timeSpentSeconds, createdAt, updatedAt.
// Compact row: { id, name, os, difficulty, tier, certifications?, tags?, roomUrl?, stamp? }
//   tier           'Play' | 'Practice'; sets the default tags ['PG-<tier>'] and the default roomUrl.
//   certifications omitted when empty.
//   tags           only when they differ from ['PG-<tier>'] (then the full array).
//   roomUrl        only when it differs from the tier url.
//   stamp          only when createdAt/updatedAt differ from PG_STAMP (then [createdAt, updatedAt]).
// Constant fields (ip, platform, status, writeupUrl, hint, timeSpentSeconds) come back on expand.
// src/data/loadMachinesCatalog.ts (expandPgRows) holds the same decoder; src/test/data/catalogSources.test.ts keeps the two in step.
const PG_STAMP = '2026-10-28T00:00:00.000Z';
const TIER_URL = { Play: 'https://portal.offsec.com/labs/play', Practice: 'https://portal.offsec.com/labs/practice' };

function unpackRows(compact) {
  return compact.map((c) => ({
    id: c.id,
    name: c.name,
    ip: '10.10.x.x',
    os: c.os,
    platform: 'PG',
    difficulty: c.difficulty,
    status: 'backlog',
    tags: c.tags ? [...c.tags] : [`PG-${c.tier}`],
    certifications: c.certifications ? [...c.certifications] : [],
    roomUrl: c.roomUrl || TIER_URL[c.tier],
    writeupUrl: '',
    hint: '',
    timeSpentSeconds: 0,
    createdAt: c.stamp ? c.stamp[0] : PG_STAMP,
    updatedAt: c.stamp ? c.stamp[1] : PG_STAMP,
  }));
}

function packRow(r) {
  const tag = (r.tags || []).find((t) => t === 'PG-Play' || t === 'PG-Practice');
  if (!tag) throw new Error(`row ${r.id} has no PG tier tag`);
  const tier = tag.slice(3);
  const out = { id: r.id, name: r.name, os: r.os, difficulty: r.difficulty, tier };
  if (r.certifications && r.certifications.length) out.certifications = [...r.certifications];
  if (!(r.tags.length === 1 && r.tags[0] === tag)) out.tags = [...r.tags];
  if (r.roomUrl !== TIER_URL[tier]) out.roomUrl = r.roomUrl;
  if (r.createdAt !== PG_STAMP || r.updatedAt !== PG_STAMP) out.stamp = [r.createdAt, r.updatedAt];
  if (JSON.stringify(unpackRows([out])[0]) !== JSON.stringify(r)) throw new Error(`row ${r.id} does not survive packing`);
  return out;
}

module.exports = { PG_STAMP, TIER_URL, unpackRows, packRows: (rows) => rows.map(packRow) };
