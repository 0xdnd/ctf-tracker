// Derives the service-worker cache version from the build so every deploy gets a fresh cache.
const crypto = require('crypto');

const PLACEHOLDER = "/*__BUILD_HASH__*/'dev'";

function computeBuildHash(shellAssets, shellHtml) {
  const h = crypto.createHash('sha256');
  h.update([...shellAssets].sort().join('\n'));
  h.update(shellHtml);
  return h.digest('hex').slice(0, 12);
}

function injectBuildHash(sw, hash) {
  if (!sw.includes(PLACEHOLDER)) throw new Error('prerender: sw.js build hash placeholder missing');
  return sw.replace(PLACEHOLDER, `'${hash}'`);
}

module.exports = { PLACEHOLDER, computeBuildHash, injectBuildHash };
