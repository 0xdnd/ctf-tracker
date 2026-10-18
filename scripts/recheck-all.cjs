const fs = require('fs');
const path = require('path');

console.log('=====================================================');
console.log('ZEROBOX // COMPLETE MASTER RECHECK & INTEGRITY AUDIT');
console.log('=====================================================\n');

let errorCount = 0;
let warningCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    errorCount++;
  } else {
    console.log('✅ PASS:', message);
  }
}

function warn(condition, message) {
  if (!condition) {
    console.warn('⚠️ WARN:', message);
    warningCount++;
  }
}

// 1. Load catalog JSON
const catalogJsonPath = path.join(__dirname, '../src/data/machinesCatalog.json');
assert(fs.existsSync(catalogJsonPath), 'machinesCatalog.json exists');
const catalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));

console.log(`\n--- 1. CATALOG VOLUME & SPLIT ---`);
assert(catalog.length === 1038, `Catalog has exactly 1,038 machines (Actual: ${catalog.length})`);

const htbMachines = catalog.filter(m => m.platform === 'HTB');
const thmMachines = catalog.filter(m => m.platform === 'THM');

assert(htbMachines.length === 471, `HTB targets count is 471 (Actual: ${htbMachines.length})`);
assert(thmMachines.length === 567, `THM targets count is 567 (Actual: ${thmMachines.length})`);
assert(htbMachines.length + thmMachines.length === catalog.length, 'No unknown platforms exist');

// 2. Verified Active HTB Seasonal Machines (Exact 20 from user screenshot)
console.log(`\n--- 2. VERIFIED 20 LIVE HTB ACTIVE SEASONAL MACHINES ---`);
const EXPECTED_20_ACTIVE = [
  "TrustFall", "Touch", "Stream", "Scaffold", "PingPong",
  "Paperwork", "Nimbus", "Management", "MakeSense", "Layover",
  "Garfield", "Enigma", "Eloquia", "DarkZeroReturns", "DanglingTree",
  "Connected", "Cohort", "Checkpoint", "BlockSynergy", "Bedside"
];

const htbActiveSeasonal = htbMachines.filter(m => m.isActive && !m.tags?.includes('Pro-Lab'));
assert(htbActiveSeasonal.length === 20, `Exactly 20 seasonal active HTB machines exist (Actual: ${htbActiveSeasonal.length})`);

const htbActiveNames = new Set(htbActiveSeasonal.map(m => m.name));
for (const name of EXPECTED_20_ACTIVE) {
  assert(htbActiveNames.has(name), `Verified active machine '${name}' is marked isActive: true`);
}

// 3. HTB Pro Labs (8 Enterprise Red Team Networks)
console.log(`\n--- 3. HTB PRO LABS INTEGRITY ---`);
const EXPECTED_PRO_LABS = [
  "Dante (Pro Lab)", "Genesis (Pro Lab)", "Zephyr (Pro Lab)",
  "Offshore (Pro Lab)", "RastaLabs (Pro Lab)", "Cybernetics (Pro Lab)",
  "APTLabs (Pro Lab)", "Breakpoint (Pro Lab)"
];

const proLabs = htbMachines.filter(m => m.tags?.includes('Pro-Lab'));
assert(proLabs.length === 8, `Exactly 8 Pro Labs in catalog (Actual: ${proLabs.length})`);

const proLabNames = new Set(proLabs.map(m => m.name));
for (const name of EXPECTED_PRO_LABS) {
  assert(proLabNames.has(name), `Pro Lab '${name}' exists in catalog`);
}
for (const p of proLabs) {
  assert(p.isActive === true, `Pro Lab '${p.name}' is marked isActive: true`);
  assert(p.tags.includes('Red-Team'), `Pro Lab '${p.name}' tagged with Red-Team`);
  assert(p.officialSynopsis && p.officialSynopsis.length > 30, `Pro Lab '${p.name}' has detailed official synopsis`);
}

// 4. Retired HTB Machines
console.log(`\n--- 4. RETIRED HTB MACHINES INTEGRITY ---`);
const htbRetired = htbMachines.filter(m => !m.isActive);
assert(htbRetired.length === 443, `Exactly 443 retired HTB machines (Actual: ${htbRetired.length})`);
for (const m of htbRetired) {
  assert(m.isActive === false, `Retired machine '${m.name}' has isActive: false`);
}

// 5. TryHackMe Rooms
console.log(`\n--- 5. TRYHACKME ROOMS INTEGRITY ---`);
const thmActive = thmMachines.filter(m => m.isActive === true);
assert(thmActive.length === 567, `All 567 THM rooms have isActive: true explicitly (Actual: ${thmActive.length})`);

// 6. Schema & Field Validation
console.log(`\n--- 6. SCHEMA & FIELD VALIDATION ACROSS ALL 1,038 TARGETS ---`);
const idSet = new Set();
const VALID_DIFFICULTIES = new Set(["Very Easy", "Easy", "Medium", "Hard", "Insane"]);
const VALID_PLATFORMS = new Set(["HTB", "THM"]);

let malformedCount = 0;
for (const m of catalog) {
  if (!m.id || typeof m.id !== 'string' || idSet.has(m.id)) {
    console.error(`❌ Duplicate or invalid ID: ${m.id}`);
    malformedCount++;
  }
  idSet.add(m.id);

  if (!VALID_PLATFORMS.has(m.platform)) {
    console.error(`❌ Invalid platform for ${m.name}: ${m.platform}`);
    malformedCount++;
  }

  if (!VALID_DIFFICULTIES.has(m.difficulty)) {
    console.error(`❌ Invalid difficulty for ${m.name}: ${m.difficulty}`);
    malformedCount++;
  }

  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    console.error(`❌ Empty or invalid name for id: ${m.id}`);
    malformedCount++;
  }

  if (!m.os || typeof m.os !== 'string') {
    console.error(`❌ Invalid OS for ${m.name}: ${m.os}`);
    malformedCount++;
  }

  if (!Array.isArray(m.tags) || m.tags.length === 0) {
    console.error(`❌ Missing or empty tags for ${m.name}`);
    malformedCount++;
  }

  if (!m.roomUrl || !m.roomUrl.startsWith('http')) {
    console.error(`❌ Missing or invalid roomUrl for ${m.name}`);
    malformedCount++;
  }
}
assert(malformedCount === 0, `All 1,038 targets passed strict schema checks (Malformed: ${malformedCount})`);
assert(idSet.size === 1038, `All 1,038 machine IDs are 100% unique`);

// 7. HTB ToS AUP §8.2 Compliance Check
console.log(`\n--- 7. HTB ToS AUP §8.2 COMPLIANCE AUDIT ---`);
let tosViolationCount = 0;
for (const m of htbActiveSeasonal) {
  if (m.writeupUrl && m.writeupUrl.trim().length > 0) {
    console.error(`❌ ToS Risk: Active HTB machine '${m.name}' has unredacted writeupUrl in catalog: ${m.writeupUrl}`);
    tosViolationCount++;
  }
}
assert(tosViolationCount === 0, `Zero ToS violations in active HTB catalog (Active machines have writeupUrl stripped)`);

const thmWithWriteups = thmMachines.filter(m => m.writeupUrl && m.writeupUrl.length > 0);
assert(thmWithWriteups.length >= 170, `THM rooms preserve community writeups (${thmWithWriteups.length} rooms have writeup URLs)`);

// 8. Store Logic Audit
console.log(`\n--- 8. STORE LOGIC AUDIT (useCtfStore.ts) ---`);
const storeCode = fs.readFileSync(path.join(__dirname, '../src/store/useCtfStore.ts'), 'utf8');

assert(storeCode.includes('KNOWN_ACTIVE_SEASONAL_NAMES'), 'useCtfStore.ts defines KNOWN_ACTIVE_SEASONAL_NAMES');
for (const name of EXPECTED_20_ACTIVE) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  assert(storeCode.toLowerCase().includes(`'${slug}'`), `KNOWN_ACTIVE_SEASONAL_NAMES includes '${slug}'`);
}

assert(storeCode.includes("machine.platform === 'HTB' && machine.isActive"), 'useCtfStore.ts scopes ToS redaction strictly to HTB active machines');

// 9. Target Detail Page Audit
console.log(`\n--- 9. TARGET DETAIL PAGE AUDIT (TargetDetailPage.tsx) ---`);
const detailCode = fs.readFileSync(path.join(__dirname, '../src/pages/TargetDetailPage.tsx'), 'utf8');
assert(detailCode.includes("machine.isActive && machine.platform === 'HTB'"), 'TargetDetailPage.tsx scopes active warning banner strictly to HTB active machines');

// 10. Master Audit Files Sync
console.log(`\n--- 10. MASTER AUDIT DOCUMENTATION SYNC ---`);
const docMdPath = path.join(__dirname, '../docs/HTB_THM_ALL_MACHINES_ACTIVE_STATUS.md');
const docJsonPath = path.join(__dirname, '../docs/HTB_THM_ALL_MACHINES_ACTIVE_STATUS.json');

assert(fs.existsSync(docMdPath), 'docs/HTB_THM_ALL_MACHINES_ACTIVE_STATUS.md exists');
assert(fs.existsSync(docJsonPath), 'docs/HTB_THM_ALL_MACHINES_ACTIVE_STATUS.json exists');

const docJson = JSON.parse(fs.readFileSync(docJsonPath, 'utf8'));
assert(docJson.length === 1038, `Master audit JSON has exactly 1,038 targets (Actual: ${docJson.length})`);

const docMd = fs.readFileSync(docMdPath, 'utf8');
assert(docMd.includes('1038 יעדים'), 'Master audit markdown cites 1,038 targets');
assert(docMd.includes('471 מעבדות'), 'Master audit markdown cites 471 HTB targets');
assert(docMd.includes('567 מכונות וחדרים'), 'Master audit markdown cites 567 THM targets');
assert(docMd.includes('Dante (Pro Lab)'), 'Master audit markdown includes Pro Labs');
assert(docMd.includes('TrustFall'), 'Master audit markdown includes active seasonal machines');

console.log('\n=====================================================');
if (errorCount === 0) {
  console.log(`🎉 ALL AUDITS PASSED WITH ZERO ERRORS! (Warnings: ${warningCount})`);
} else {
  console.error(`💥 AUDIT FAILED WITH ${errorCount} ERRORS!`);
  process.exit(1);
}
console.log('=====================================================\n');
