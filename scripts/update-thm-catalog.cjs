/* One-shot: syncs the THM rows of src/data/machinesCatalog.ts with an authoritative thm_challenges.json.
   Usage: node scripts/update-thm-catalog.cjs <path/to/thm_challenges.json> */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const CATALOG = path.join(root, 'src/data/machinesCatalog.ts');
const OTHER_ID_FILES = ['pg.json', 'vulnhub.json', 'activeMachines.json'].map((f) => path.join(root, 'src/data/catalogSources', f));
const AS_OF = '2026-11-17T00:00:00.000Z';
const DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane', info: 'Very Easy' };
const KEEP = new Set(['Kenobi', 'Steel Mountain', 'Vulnversity', 'Game Zone', 'Alfred', 'HackPark', 'Blaster', 'Blue']);
const WIN = /windows|active directory|domain controller|\bAD\b|azure|o365|exchange/i;

const normName = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
const roomCode = (url) => {
  const m = /\/room\/([^/?#]+)/.exec(url || '');
  return m ? m[1].toLowerCase() : '';
};
const die = (msg) => { console.error('ERROR: ' + msg); process.exit(1); };

function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) die('usage: node scripts/update-thm-catalog.cjs <thm_challenges.json>');
  const entries = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const src = fs.readFileSync(CATALOG, 'utf8');
  const NL = src.includes('\r\n') ? '\r\n' : '\n';

  // Row spans: "  {" .. "  }," / "  }" at 2-space indent.
  const re = /^ {2}\{\r?\n[\s\S]*?^ {2}\},?(?:\r?\n|$)/gm;
  const rows = [];
  let m;
  while ((m = re.exec(src))) {
    const text = m[0];
    const get = (k) => { const x = new RegExp('^    "' + k + '": ("(?:[^"\\\\]|\\\\.)*")', 'm').exec(text); return x ? JSON.parse(x[1]) : null; };
    rows.push({ start: m.index, end: m.index + text.length, text, id: get('id'), name: get('name'), platform: get('platform'), status: get('status'), roomUrl: get('roomUrl') });
  }
  const thm = rows.filter((r) => r.platform === 'THM');
  const backlogSample = thm.find((r) => r.status === 'backlog');
  if (!backlogSample) die('no backlog THM row to mirror');
  const useSynopsis = thm.some((r) => r.status === 'backlog' && /"officialSynopsis"/.test(r.text));
  console.log(`rows=${rows.length} thm=${thm.length} officialSynopsis-on-backlog=${useSynopsis}`);

  // ---- matching
  const byCode = new Map();
  thm.forEach((r) => { const c = roomCode(r.roomUrl); if (c && !byCode.has(c)) byCode.set(c, r); });
  const matchedRows = new Set();
  const matches = new Map(); // row -> entry
  const unmatchedEntries = [];
  let byCodeN = 0;
  const pending = [];
  for (const e of entries) {
    const r = byCode.get(String(e.code).toLowerCase());
    if (r && !matchedRows.has(r)) { matchedRows.add(r); matches.set(r, e); byCodeN++; } else pending.push(e);
  }
  let byNameN = 0;
  for (const e of pending) {
    const n = normName(e.name);
    const r = thm.find((x) => !matchedRows.has(x) && normName(x.name) === n);
    if (r) {
      matchedRows.add(r); matches.set(r, e); byNameN++;
      console.log(`name-fallback: "${e.name}" (${e.code}) -> ${r.id} (${roomCode(r.roomUrl)})`);
    } else unmatchedEntries.push(e);
  }

  // ---- removals
  const unmatchedRows = thm.filter((r) => !matchedRows.has(r));
  const removed = unmatchedRows.filter((r) => !KEEP.has(r.name));
  const kept = unmatchedRows.filter((r) => KEEP.has(r.name));
  const protectedRows = removed.filter((r) => r.status !== 'backlog');
  if (protectedRows.length) die('would remove non-backlog rows: ' + protectedRows.map((r) => `${r.id}(${r.status})`).join(', '));
  const removeSet = new Set(removed);

  // ---- new rows
  const used = new Set(rows.map((r) => r.id));
  for (const f of OTHER_ID_FILES) {
    if (!fs.existsSync(f)) { console.log('note: id file absent, skipped: ' + path.relative(root, f)); continue; }
    for (const o of JSON.parse(fs.readFileSync(f, 'utf8'))) if (o && o.id) used.add(o.id);
  }
  for (const r of removed) used.delete(r.id);
  const newRows = [];
  const winAdded = [];
  for (const e of unmatchedEntries) {
    const id = 'thm-' + String(e.code).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (used.has(id)) die('id clash: ' + id);
    used.add(id);
    const desc = (e.description || '').trim();
    const os = WIN.test(e.description || '') ? 'Windows' : 'Linux';
    if (os === 'Windows') winAdded.push(`${e.name} (${id})`);
    const diff = DIFF[e.difficulty];
    if (!diff) die(`unknown difficulty "${e.difficulty}" for ${e.name}`);
    const row = {
      id, name: String(e.name).trim(), ip: '10.10.x.x', os, platform: 'THM', difficulty: diff, status: 'backlog',
      tags: ['CTF'], certifications: [], roomUrl: e.url, writeupUrl: '', hint: '',
    };
    if (useSynopsis && desc) row.officialSynopsis = desc;
    Object.assign(row, { timeSpentSeconds: 0, createdAt: AS_OF, updatedAt: AS_OF });
    newRows.push(JSON.stringify(row, null, 2).split('\n').map((l) => '  ' + l).join(NL) + ',' + NL);
  }

  // ---- difficulty changes + rebuild
  let diffChanges = 0, urlChanges = 0;
  const lastThm = thm[thm.length - 1];
  let out = '';
  let pos = 0;
  for (const r of rows) {
    out += src.slice(pos, r.start);
    pos = r.end;
    if (removeSet.has(r)) { /* dropped */ }
    else if (matches.has(r)) {
      const e = matches.get(r);
      const nd = DIFF[e.difficulty];
      if (!nd) die(`unknown difficulty "${e.difficulty}" for ${e.name}`);
      let t = r.text;
      t = t.replace(/^( {4}"difficulty": )"[^"]*"/m, (a, p) => { if (a !== `${p}"${nd}"`) diffChanges++; return `${p}"${nd}"`; });
      t = t.replace(/^( {4}"roomUrl": )"[^"]*"/m, (a, p) => { const n = `${p}${JSON.stringify(e.url)}`; if (a !== n) urlChanges++; return n; });
      out += t;
    } else out += r.text;
    if (r === lastThm) {
      if (!/,\r?\n$/.test(r.text) && !removeSet.has(r)) die('last THM row has no trailing comma');
      if (removeSet.has(r)) die('last THM row is removed; insertion anchor logic needs review');
      out += newRows.join('');
    }
  }
  out += src.slice(pos);
  fs.writeFileSync(CATALOG, out);

  console.log(`json entries=${entries.length}`);
  console.log(`matched by code=${byCodeN} by name=${byNameN}`);
  console.log(`difficulty changes=${diffChanges} roomUrl changes=${urlChanges}`);
  console.log(`removed=${removed.length}: ${removed.map((r) => `${r.name} [${r.id}]`).join('; ')}`);
  console.log(`kept unmatched=${kept.length}: ${kept.map((r) => r.name).join(', ')}`);
  console.log(`added=${newRows.length}`);
  console.log(`windows-classified added=${winAdded.length}: ${winAdded.join('; ')}`);
  console.log(`final THM=${thm.length - removed.length + newRows.length}`);
}
main();
