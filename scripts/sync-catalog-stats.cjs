const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'src/data/machinesCatalog.json');
const readmePath = path.join(rootDir, 'README.md');
const sitemapPath = path.join(rootDir, 'public/sitemap.xml');

console.log('========================================================');
console.log('ZEROBOX // CATALOG STATS SYNC & INTEGRITY VALIDATOR');
console.log('========================================================\n');

if (!fs.existsSync(catalogPath)) {
  console.error('❌ Error: machinesCatalog.json not found at', catalogPath);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const totalCount = catalog.length;

// 1. Validation & Schema Check
const idSet = new Set();
const platformCounts = {};
let malformed = 0;
let realFlagLeaks = 0;

for (const m of catalog) {
  if (!m.id || idSet.has(m.id)) {
    console.error(`❌ Duplicate or empty ID: ${m.id}`);
    malformed++;
  }
  idSet.add(m.id);

  if (!m.name || !m.platform || !m.difficulty || !m.os) {
    console.error(`❌ Missing mandatory core fields on machine: ${m.name || m.id}`);
    malformed++;
  }

  platformCounts[m.platform] = (platformCounts[m.platform] || 0) + 1;

  // Real flag leak detection: ensure active seasonal machines do not contain flags
  if (m.platform === 'HTB' && m.isActive && !m.tags?.includes('Pro-Lab')) {
    if (m.userFlag && !m.userFlag.includes('placeholder') && !m.userFlag.includes('daniel_dayan')) {
      console.error(`❌ Potential real flag leak in active HTB machine ${m.name}: userFlag`);
      realFlagLeaks++;
    }
    if (m.rootFlag && !m.rootFlag.includes('placeholder') && !m.rootFlag.includes('daniel_dayan')) {
      console.error(`❌ Potential real flag leak in active HTB machine ${m.name}: rootFlag`);
      realFlagLeaks++;
    }
  }
}

if (malformed > 0 || realFlagLeaks > 0) {
  console.error(`💥 Integrity failure! Malformed: ${malformed}, Real flag leaks: ${realFlagLeaks}`);
  process.exit(1);
}

console.log(`✅ Integrity check passed: ${totalCount} valid targets, 100% unique IDs.`);
console.log('📊 Breakdown by platform:', platformCounts);

const htbCount = platformCounts['HTB'] || 0;
const thmCount = platformCounts['THM'] || 0;
const pgCount = platformCounts['PG'] || 0;
const vulnhubCount = platformCounts['VulnHub'] || 0;

// 2. Synchronize README.md
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Replace header subtitle line (e.g. *929 Machines ...*)
  const subtitleRegex = /\*(\d[\d,]*)\s+Machines\s+\([^)]+\)\s+·\s+Daniel Dayan's[^·]+·\s+100%\s+HTB\s+&\s+THM\s+ToS\s+Compliant\*/g;
  const newSubtitle = `*${totalCount.toLocaleString()} Machines (${htbCount} HTB Targets + ${thmCount} THM CTF) · Daniel Dayan's Verified Solves · 100% HTB & THM ToS Compliant*`;
  readme = readme.replace(subtitleRegex, newSubtitle);

  // Replace overview description
  const overviewRegex = /- \*\*Multi-Platform Coverage:\*\* Hack The Box \([^)]+\), TryHackMe \([^)]+\)/g;
  const newOverview = `- **Multi-Platform Coverage:** Hack The Box (${htbCount} retired, Starting Point & active targets), TryHackMe (${thmCount} standalone CTF rooms)`;
  readme = readme.replace(overviewRegex, newOverview);

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log(`✅ Synchronized ${readmePath} with ${totalCount} targets (${htbCount} HTB, ${thmCount} THM).`);
}

// 3. Synchronize sitemap.xml with today's date
if (fs.existsSync(sitemapPath)) {
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  sitemap = sitemap.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log(`✅ Synchronized ${sitemapPath} lastmod timestamp to ${today}.`);
}

console.log('\n========================================================');
console.log('🎉 SYNC COMPLETE // CATALOG METRICS PERFECTLY ALIGNED');
console.log('========================================================\n');
