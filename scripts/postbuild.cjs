const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

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

// 2. Ensure .nojekyll exists in dist for GitHub Pages asset resolution
const distNoJekyll = path.join(distDir, '.nojekyll');
if (!fs.existsSync(distNoJekyll)) {
  fs.writeFileSync(distNoJekyll, '', 'utf8');
}

// 3. Mirror all favicon and icon assets into dist and dist/assets
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

const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

iconFiles.forEach(file => {
  const srcPub = path.join(rootDir, 'public', file);
  if (fs.existsSync(srcPub)) {
    fs.copyFileSync(srcPub, path.join(distDir, file));
    fs.copyFileSync(srcPub, path.join(distAssetsDir, file));
  }
});
console.log('✓ Mirrored all icon and favicon variants into dist and dist/assets');

// 4. Safety assertion: Ensure no .env or sensitive files were ever copied to dist
const sensitiveChecks = ['.env', '.env.local', 'secrets.json', 'cpts-notes-vault-export.json'];
for (const s of sensitiveChecks) {
  if (fs.existsSync(path.join(distDir, s))) {
    console.error(`CRITICAL SECURITY FAILURE: ${s} found in dist! Deleting and aborting build!`);
    fs.unlinkSync(path.join(distDir, s));
    process.exit(1);
  }
}

console.log('✓ Security check passed: zero sensitive/env files in build outputs');
console.log('✓ Post-build static bundle preparation complete.');

