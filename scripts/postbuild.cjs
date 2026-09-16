const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist.');
  process.exit(1);
}

// 1. Copy dist/index.html to dist/404.html for SPA routing on GitHub Pages
const distIndex = path.join(distDir, 'index.html');
const dist404 = path.join(distDir, '404.html');
if (fs.existsSync(distIndex)) {
  fs.copyFileSync(distIndex, dist404);
}

// 2. Clean stale JS/CSS in docs/assets and root assets
const cleanStaleAssets = (targetDir, validFiles) => {
  if (!fs.existsSync(targetDir)) return;
  const files = fs.readdirSync(targetDir);
  for (const file of files) {
    if ((file.endsWith('.js') || file.endsWith('.css')) && !validFiles.has(file)) {
      try {
        fs.unlinkSync(path.join(targetDir, file));
      } catch (e) {}
    }
  }
};

const distAssetsDir = path.join(distDir, 'assets');
const validAssetFiles = new Set(fs.existsSync(distAssetsDir) ? fs.readdirSync(distAssetsDir) : []);

// Mirror dist to docs/ directory for GitHub Pages "Deploy from docs" mode
fs.cpSync(distDir, docsDir, { recursive: true, force: true });
cleanStaleAssets(path.join(docsDir, 'assets'), validAssetFiles);
console.log('✓ Mirrored dist to docs/ for GitHub Pages compatibility');

// 3. Mirror all favicon and icon assets to dist and docs
const iconFiles = [
  'favicon.ico',
  'favicon.png',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192.jpg',
  'icon-512.jpg',
  'favicon.jpg',
  'manifest.webmanifest'
];

iconFiles.forEach(file => {
  const srcPub = path.join(rootDir, 'public', file);
  if (fs.existsSync(srcPub)) {
    fs.copyFileSync(srcPub, path.join(distDir, file));
    fs.copyFileSync(srcPub, path.join(docsDir, file));
    fs.copyFileSync(srcPub, path.join(distDir, 'assets', file));
    fs.copyFileSync(srcPub, path.join(docsDir, 'assets', file));
  }
});
console.log('✓ Mirrored all icon and favicon variants across dist and docs');

// Safety assertion: Ensure no .env or sensitive files were ever copied to dist or docs
const sensitiveChecks = ['.env', '.env.local', 'secrets.json', 'cpts-notes-vault-export.json'];
for (const dir of [distDir, docsDir]) {
  for (const s of sensitiveChecks) {
    if (fs.existsSync(path.join(dir, s))) {
      console.error(`CRITICAL SECURITY FAILURE: ${s} found in ${dir}! Deleting and aborting build!`);
      fs.unlinkSync(path.join(dir, s));
      process.exit(1);
    }
  }
}

console.log('✓ Security check passed: zero sensitive/env files in build outputs');
console.log('✓ Post-build GitHub Pages deployment preparation complete.');

