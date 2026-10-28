// Notes redactor: node scripts/redact-notes.cjs <input.md> [--write]
// Deterministic, local-only helper. Default is a dry run that reports findings (line numbers, masked previews).
// --write saves <input>.redacted.md next to the input; the original is never modified.
// It cannot find everything: always read the result before sharing it.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const write = args.includes('--write');
const input = args.find((a) => !a.startsWith('--'));
if (!input || args.includes('--help')) {
  console.log('Usage: node scripts/redact-notes.cjs <input.md> [--write]');
  process.exit(input ? 0 : 1);
}
if (!fs.existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}

const mask = (s) => (s.length <= 4 ? '****' : s.slice(0, 2) + '*'.repeat(Math.min(s.length - 3, 8)) + s.slice(-1));
const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(ip);
const validIp = (ip) => ip.split('.').every((n) => Number(n) <= 255);

const findings = [];
const note = (line, kind, value) => findings.push({ line, kind, preview: mask(value) });

const lines = fs.readFileSync(input, 'utf8').split(/\r?\n/);
let afterFlagCmd = 0;
const out = lines.map((orig, i) => {
  const n = i + 1;
  let l = orig;
  // Flag-looking text, e.g. NAME{...}
  l = l.replace(/[A-Za-z0-9]{3,8}\{[^}\s]{6,}\}/g, (m) => (note(n, 'flag', m), '[redacted]'));
  // user.txt / root.txt command: hashes on this and the next 2 lines
  if (/\b(user|root)\.txt\b/i.test(l)) afterFlagCmd = 3;
  if (afterFlagCmd > 0) {
    l = l.replace(/\b[a-f0-9]{20,}\b/gi, (m) => (note(n, 'flag file hash', m), '[redacted]'));
    afterFlagCmd--;
  }
  l = l.replace(/\b[a-f0-9]{32}\b/gi, (m) => (note(n, '32-char hex', m), '[redacted]'));
  // IPv4
  l = l.replace(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g, (m) => {
    if (!validIp(m)) return m;
    note(n, isPrivate(m) ? 'private/VPN IP' : 'IP', m);
    return isPrivate(m) ? 'TARGET_LOCAL' : 'TARGET';
  });
  // Shell prompts that expose the local username
  l = l.replace(/(\[sudo\] password for )([A-Za-z0-9_.-]+)(:)/g, (_, a, u, c) => (note(n, 'prompt username', u), `${a}user${c}`));
  l = l.replace(/\b([A-Za-z0-9_.-]+)@([A-Za-z0-9_.-]+)(?=[:~$#\s]|$)/g, (m, u, h) => {
    if (/^\S+\.(com|net|org|io|dev|local|htb)$/i.test(h) && !/^[a-z0-9_-]+$/i.test(u)) return m;
    if (u === 'user') return m;
    note(n, 'user@host prompt', u);
    return `user@${h}`;
  });
  if (/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/.test(l)) note(n, 'WARNING image embed (images are not supported on-site; transcribe to a text block)', 'image');
  return l;
});

console.log(`${input}: ${findings.length} finding(s)`);
for (const f of findings) console.log(`  line ${f.line}: ${f.kind} (${f.preview})`);
if (write) {
  const ext = path.extname(input);
  const dest = ext ? input.slice(0, -ext.length) + '.redacted' + ext : input + '.redacted.md';
  fs.writeFileSync(dest, out.join('\n'));
  console.log(`Wrote ${dest}. Review it before sharing; automated redaction is not exhaustive.`);
} else {
  console.log('Dry run: nothing written. Re-run with --write to save <input>.redacted.md.');
}
