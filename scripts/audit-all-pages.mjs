#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

console.log('====================================================');
console.log('       ZEROBOX EXHAUSTIVE DEEP AUDIT & CRAWL        ');
console.log('====================================================\n');

// 1. Collect all HTML files in dist/
function getAllFiles(dir, ext = '.html') {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(full);
    }
  }
  return files;
}

const htmlFiles = getAllFiles(distDir, '.html');
console.log(`[1] Found ${htmlFiles.length} HTML files across dist/\n`);

let errors = [];
let warnings = [];
let checkedAssets = new Set();
let missingAssets = new Set();

for (const file of htmlFiles) {
  const rel = path.relative(distDir, file);
  const content = fs.readFileSync(file, 'utf8');

  // Check 1: Unrendered template tags
  const unrendered = content.match(/\{\{[A-Z_]+\}\}/g);
  if (unrendered) {
    errors.push(`Unrendered template tag in ${rel}: ${unrendered.join(', ')}`);
  }

  // Check 2: Leaked external AI or secret endpoints
  if (content.includes('api.anthropic.com')) {
    errors.push(`Found 'api.anthropic.com' in public file: ${rel}`);
  }
  if (content.includes('AI scan interpretation')) {
    errors.push(`Found 'AI scan interpretation' in public file: ${rel}`);
  }

  // Check 3: Basic SEO tags (skip redirect stubs and search console verification files)
  const isRedirect = content.includes('http-equiv="refresh"') || content.includes('content="0; url=');
  const isVerification = /^google[a-z0-9]+\.html$/i.test(path.basename(file));
  if (!isRedirect && !isVerification) {
    if (!content.includes('<title>') || !content.includes('</title>')) {
      errors.push(`Missing <title> in ${rel}`);
    }
    if (!content.includes('name="description"')) {
      warnings.push(`Missing meta description in ${rel}`);
    }
  }

  // Check 4: Asset references exist on disk
  const assetRegex = /(?:src|href)=["'](\/[^"']+\.(?:js|css|webp|png|svg|ico|webmanifest))["']/g;
  let match;
  while ((match = assetRegex.exec(content)) !== null) {
    const assetPath = match[1].split('?')[0]; // remove query string
    if (!checkedAssets.has(assetPath)) {
      checkedAssets.add(assetPath);
      const onDisk = path.join(distDir, assetPath.replace(/^\//, ''));
      if (!fs.existsSync(onDisk)) {
        missingAssets.add(assetPath);
        errors.push(`Missing asset referenced in ${rel}: ${assetPath}`);
      }
    }
  }
}

console.log(`[✓] File-level audit complete: checked ${htmlFiles.length} HTML files.`);
console.log(`[✓] Referenced unique static assets checked: ${checkedAssets.size}`);
if (missingAssets.size > 0) {
  console.log(`[!] Missing assets (${missingAssets.size}):`, Array.from(missingAssets));
} else {
  console.log(`[✓] Zero missing asset references on disk!`);
}

// Check 5: Dynamic code-split chunks referenced inside bundle JS exist on disk
console.log('\n[1.5] Auditing dynamic code-split chunks in dist/assets/...');
const assetsDir = path.join(distDir, 'assets');
let dynamicChunksChecked = 0;
let missingDynamicChunks = [];

if (fs.existsSync(assetsDir)) {
  const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  const chunkRegex = /assets\/[a-zA-Z0-9_\-\.]+\.js/g;
  const foundChunkRefs = new Set();

  for (const jsFile of jsFiles) {
    const jsPath = path.join(assetsDir, jsFile);
    try {
      const code = fs.readFileSync(jsPath, 'utf8');
      let m;
      while ((m = chunkRegex.exec(code)) !== null) {
        foundChunkRefs.add(m[0]);
      }
    } catch {}
  }

  for (const chunkRef of foundChunkRefs) {
    dynamicChunksChecked++;
    const onDisk = path.join(distDir, chunkRef);
    if (!fs.existsSync(onDisk)) {
      missingDynamicChunks.push(chunkRef);
      errors.push(`Missing dynamic code-split chunk referenced in bundle: ${chunkRef}`);
    }
  }

  console.log(`[✓] Dynamic code-split chunks verified: ${dynamicChunksChecked} checked.`);
  if (missingDynamicChunks.length > 0) {
    console.error(`[!] Missing dynamic chunks on disk (${missingDynamicChunks.length}):`, missingDynamicChunks);
  } else {
    console.log(`[✓] Zero missing dynamic chunks on disk!`);
  }
}

// 2. HTTP Route Verification against running server http://localhost:3000
console.log('\n[2] Live Route Verification against http://localhost:3000...');

const sitemapFile = path.join(distDir, 'sitemap.xml');
let urls = [];
if (fs.existsSync(sitemapFile)) {
  const sitemapXml = fs.readFileSync(sitemapFile, 'utf8');
  const locMatches = sitemapXml.match(/<loc>https:\/\/ctftracker\.com([^<]*)<\/loc>/g) || [];
  urls = locMatches.map(m => m.replace(/<loc>https:\/\/ctftracker\.com/, '').replace(/<\/loc>/, ''));
}

// Add redirect stubs or root
if (!urls.includes('/')) urls.unshift('/');
console.log(`Found ${urls.length} routes in sitemap to verify live over HTTP.`);

let serverOk = 0;
let serverFail = [];

for (const u of urls) {
  try {
    const targetUrl = `http://localhost:3000${u}`;
    const res = await fetch(targetUrl);
    if (res.status === 200) {
      serverOk++;
    } else {
      serverFail.push(`${u} -> HTTP ${res.status}`);
    }
  } catch (err) {
    serverFail.push(`${u} -> Network error: ${err.message}`);
  }
}

console.log(`[✓] Live HTTP routes verified: ${serverOk} / ${urls.length} returned HTTP 200 OK.`);
if (serverFail.length > 0) {
  console.log(`[!] Failed HTTP routes (${serverFail.length}):`, serverFail);
  errors.push(...serverFail);
}

// Summary
console.log('\n====================================================');
console.log(`AUDIT RESULT: ${errors.length === 0 ? 'ALL CHECKS PASSED PERFECTLY (0 ERRORS)' : 'FOUND ISSUES'}`);
console.log(`Total HTML files scanned : ${htmlFiles.length}`);
console.log(`Total live routes tested : ${urls.length}`);
console.log(`Total assets verified    : ${checkedAssets.size}`);
console.log(`Errors encountered       : ${errors.length}`);
console.log(`Warnings encountered     : ${warnings.length}`);
console.log('====================================================\n');

if (errors.length > 0) {
  console.error('Errors detail:\n', errors.join('\n'));
  process.exit(1);
} else {
  process.exit(0);
}
