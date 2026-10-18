/**
 * ZEROBOX VERIFICATION SUITE (verify-zerobox-hud.cjs)
 * Tests syntax, design tokens, DOM rendering, localStorage persistence, and sub-2ms benchmark.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('\n======================================================');
console.log(' ZEROBOX ENTERPRISE CROSS-PLATFORM HUD VERIFICATION');
console.log('======================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

// 1. Check file existence
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const stylesPath = path.join(rootDir, 'styles.css');
const appPath = path.join(rootDir, 'app.js');

assert(fs.existsSync(indexPath), 'index.html exists in root');
assert(fs.existsSync(stylesPath), 'styles.css exists in root');
assert(fs.existsSync(appPath), 'app.js exists in root');

const htmlContent = fs.readFileSync(indexPath, 'utf8');
const cssContent = fs.readFileSync(stylesPath, 'utf8');
const jsContent = fs.readFileSync(appPath, 'utf8');

// 2. Validate Anti-FOUC Script in index.html
assert(htmlContent.includes("localStorage.getItem('zb_theme')"), 'index.html contains synchronous anti-FOUC theme loader');
assert(htmlContent.includes("localStorage.getItem('zb_mode')"), 'index.html contains synchronous anti-FOUC mode loader');

// 3. Validate CSS Token Engine for all 6 modes
const expectedThemes = ['neon', 'htb', 'midnight-blue'];
const expectedModes = ['dark', 'light'];

expectedThemes.forEach(theme => {
  expectedModes.forEach(mode => {
    const selectorPattern = `data-theme="${theme}"][data-mode="${mode}"]`;
    assert(cssContent.includes(selectorPattern), `styles.css defines token set for [${theme}] [${mode}]`);
  });
});

// Check key color definitions
assert(cssContent.includes('--accent: #00f0ff'), 'Neon dark defines electric cyan --accent: #00f0ff');
assert(cssContent.includes('--accent: #008b99'), 'Neon light defines compliant teal --accent: #008b99');
assert(cssContent.includes('--accent: #9fef00'), 'HTB dark defines neon lime --accent: #9fef00');
assert(cssContent.includes('--accent: #15803d'), 'HTB light defines terminal emerald --accent: #15803d');
assert(cssContent.includes('--accent: #38bdf8'), 'Midnight-blue dark defines sky blue --accent: #38bdf8');
assert(cssContent.includes('--accent: #0284c7'), 'Midnight-blue light defines nordic blue --accent: #0284c7');

// 4. Validate Media Queries in styles.css
assert(cssContent.includes('@media (max-width: 767px)'), 'styles.css contains mobile breakpoint (<768px)');
assert(cssContent.includes('@media (max-width: 1279px)'), 'styles.css contains tablet breakpoint (768-1279px)');
assert(cssContent.includes('@media (min-width: 1920px)'), 'styles.css contains ultrawide breakpoint (>=1920px)');
assert(cssContent.includes('repeat(auto-fill, minmax(330px, 1fr))'), 'styles.css specifies repeat(auto-fill, minmax(330px, 1fr)) target grid');

// 5. Run JSDOM simulation to test DOM interaction and app.js logic
const dom = new JSDOM(htmlContent, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'http://localhost:3000/'
});

const { window } = dom;
const { document } = window;

// Execute app.js in JSDOM window context
window.eval(jsContent);

// Test Target Cards rendering
const targetCards = document.querySelectorAll('.target-card');
assert(targetCards.length === 4, `Target grid rendered all 4 initial targets (found: ${targetCards.length})`);

// Test Target Names
const names = Array.from(document.querySelectorAll('.target-name')).map(el => el.textContent.trim());
assert(names.includes('FOREST'), 'Target FOREST (Windows AD) rendered');
assert(names.includes('ROOTME'), 'Target ROOTME (Linux Web) rendered');
assert(names.includes('BUFF'), 'Target BUFF (Hard Binary) rendered');
assert(names.includes('METATWO'), 'Target METATWO (Insane Cloud) rendered');

// Test Archetype frames
const archetypes = Array.from(document.querySelectorAll('.archetype-text')).map(el => el.textContent.trim());
assert(archetypes.some(a => a.includes('Active Directory')), 'Archetype frame rendered for Active Directory');
assert(archetypes.some(a => a.includes('Hardened Linux')), 'Archetype frame rendered for Hardened Linux');

// Test Flag toggling and localStorage persistence
const firstUserFlagLabel = document.querySelector('.flag-toggle-label[data-flag-type="user"]');
assert(firstUserFlagLabel !== null, 'Found user flag toggle button');
firstUserFlagLabel.click();

const savedFlagsRaw = window.localStorage.getItem('zb_flags');
assert(savedFlagsRaw !== null && savedFlagsRaw.includes('"user":true'), 'User flag toggled and saved into localStorage');

// Test Target Engage & HUD banner
const firstEngageBtn = document.querySelector('.btn-engage');
assert(firstEngageBtn !== null, 'Found engage target button');
firstEngageBtn.click();

const hudBanner = document.getElementById('activeTargetHud');
assert(hudBanner.classList.contains('is-active'), 'Active target HUD banner activates upon engagement');

const hudName = document.getElementById('hudTargetName');
assert(hudName.textContent.includes('FOREST'), `HUD banner displays engaged target name: ${hudName.textContent}`);

// Test Inspector opening
const firstInspectBtn = document.querySelector('.btn-inspect');
assert(firstInspectBtn !== null, 'Found inspect button');
firstInspectBtn.click();

const inspectPanel = document.getElementById('inspectionPanel');
assert(inspectPanel.classList.contains('open'), 'Inspection panel slides open upon clicking Inspect');

const inspectTitle = document.getElementById('inspectTitle');
assert(inspectTitle.textContent.includes('FOREST'), `Inspection title populated with target: ${inspectTitle.textContent}`);

// Test Payload Code Box
const payloadBox = document.getElementById('payloadCodeBox');
assert(payloadBox.textContent.includes('bash -i'), 'Reverse shell generator populated default Bash payload');

// 6. Test Sub-2ms Benchmark
if (window.runZeroboxBenchmark) {
  const benchResult = window.runZeroboxBenchmark(1000);
  assert(benchResult.passed, `Benchmark 1,000 targets filtered in ${benchResult.elapsedMs.toFixed(3)}ms (<2.0ms threshold)`);
} else {
  assert(false, 'runZeroboxBenchmark method available on window');
}

// 7. Test Keyboard Hotkeys & Theme Switching
// Alt + 2 -> HTB theme
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '2', altKey: true }));
assert(document.documentElement.getAttribute('data-theme') === 'htb', 'Alt+2 switched theme to HTB');

// Alt + 3 -> Midnight Blue theme
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '3', altKey: true }));
assert(document.documentElement.getAttribute('data-theme') === 'midnight-blue', 'Alt+3 switched theme to Midnight Blue');

// Alt + 1 -> Neon theme
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '1', altKey: true }));
assert(document.documentElement.getAttribute('data-theme') === 'neon', 'Alt+1 switched theme to Neon');

// Alt + D -> Light mode
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'd', altKey: true }));
assert(document.documentElement.getAttribute('data-mode') === 'light', 'Alt+D toggled mode to Light');

// Alt + D -> Dark mode
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'd', altKey: true }));
assert(document.documentElement.getAttribute('data-mode') === 'dark', 'Alt+D toggled mode back to Dark');

// J key -> Focus next target card
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'j' }));
const focusedCards = document.querySelectorAll('.target-card.card-focused');
assert(focusedCards.length === 1, 'J key navigation applied card-focused state');

// Escape -> Close inspect panel
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
assert(!inspectPanel.classList.contains('open'), 'Escape key dismissed inspection drawer');

// Summary
console.log('\n------------------------------------------------------');
console.log(` RESULTS: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log('------------------------------------------------------\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
