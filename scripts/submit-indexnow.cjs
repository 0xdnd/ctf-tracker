#!/usr/bin/env node
// Submit all sitemap URLs to IndexNow (Bing, Yandex and others).
// Usage: npm run build && npm run submit:indexnow
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.resolve(__dirname, '..');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/seo/site.json'), 'utf8'));
const host = site.host || 'ctftracker.com';
const key = site.indexNowKey;
const sitemapPath = path.join(root, 'dist', 'sitemap.xml');

if (!key) {
  console.error('submit-indexnow: indexNowKey missing from src/seo/site.json');
  process.exit(1);
}
if (!fs.existsSync(sitemapPath)) {
  console.error('submit-indexnow: dist/sitemap.xml not found. Run npm run build first.');
  process.exit(1);
}

const xml = fs.readFileSync(sitemapPath, 'utf8');
const urlList = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.error('submit-indexnow: no <loc> URLs found in dist/sitemap.xml');
  process.exit(1);
}

const body = JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList });
const req = https.request(
  'https://api.indexnow.org/indexnow',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      // 200 (accepted) and 202 (accepted, key validation pending) are success; any 4xx/5xx is a failure.
      if (res.statusCode >= 400) {
        console.error(`submit-indexnow: failed with status ${res.statusCode}: ${Buffer.concat(chunks).toString('utf8').trim() || '(empty body)'}`);
        process.exit(1);
      }
      console.log(`submit-indexnow: submitted ${urlList.length} URLs for ${host}, status ${res.statusCode}`);
    });
  },
);
req.on('error', (err) => {
  console.warn(`submit-indexnow: network error, skipping (${err.message})`);
  process.exit(0);
});
req.write(body);
req.end();
