// Last web-build step: hash every inline script in dist/**/*.html and rewrite each page's CSP script-src accordingly.
// No-op when dist is missing; build:tauri does not run this (Tauri uses the CSP in tauri.conf.json).
const fs = require('fs');
const path = require('path');
const { applyCsp, inlineScriptHashes } = require('./lib/csp.cjs');

const distDir = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.log('apply-csp: no dist directory, nothing to do');
  process.exit(0);
}

function* htmlFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

// dist/404.html boots client routes (e.g. /target/<id>) by document.write()ing app-shell.html, so it must allow the shell's inline scripts too.
const shellFile = path.join(distDir, 'app-shell.html');
const shellHashes = fs.existsSync(shellFile) ? inlineScriptHashes(fs.readFileSync(shellFile, 'utf8')) : [];

let rewritten = 0;
let hashed = 0;
const uncovered = [];
for (const file of htmlFiles(distDir)) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  let result;
  try {
    result = applyCsp(html, rel === '404.html' ? shellHashes : []);
  } catch (err) {
    if (err.code === 'NO_CSP_META') {
      uncovered.push(rel);
      continue;
    }
    console.error(`apply-csp: ${rel}: ${err.message}`);
    process.exit(1);
  }
  if (result.changed) {
    fs.writeFileSync(file, result.html, 'utf8');
    rewritten++;
    hashed += result.hashes.length;
  }
}
for (const rel of uncovered) console.warn(`apply-csp: WARNING ${rel} has inline scripts but no CSP meta tag (left unchanged)`);
console.log(`✓ apply-csp: rewrote script-src on ${rewritten} page(s) (${hashed} hashes); ${uncovered.length} page(s) without a CSP meta`);
