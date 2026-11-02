#!/usr/bin/env node
// Submit changed sitemap URLs to IndexNow (Bing, Yandex and others).
// By default, diffs dist/sitemap.xml against --prev <file> or https://ctftracker.com/sitemap.xml
// and only submits new URLs or URLs whose <lastmod> changed (exiting 0 when 0 URLs changed).
// Pass --all to submit every URL in dist/sitemap.xml.
// Usage: npm run build && npm run submit:indexnow [-- --all] [--prev live-sitemap.xml]
const fs = require('fs');
const path = require('path');
const https = require('https');

function parseSitemapUrls(xml) {
  const map = new Map();
  for (const m of String(xml || '').matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (/<loc>\s*([^<\s]+)\s*<\/loc>/.exec(m[1]) || [])[1];
    const lastmod = (/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(m[1]) || [])[1] || '';
    if (loc) map.set(loc, lastmod);
  }
  return map;
}

function diffSitemapUrls(newXml, prevXml) {
  const next = parseSitemapUrls(newXml);
  if (!prevXml) return [...next.keys()];
  const prev = parseSitemapUrls(prevXml);
  const changed = [];
  for (const [loc, lastmod] of next) {
    if (!prev.has(loc) || prev.get(loc) !== lastmod) changed.push(loc);
  }
  return changed;
}

function getHttpsText(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve('');
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', () => resolve(''));
  });
}

if (require.main === module) {
  (async () => {
    const root = path.resolve(__dirname, '..');
    const argv = process.argv.slice(2);
    const forceAll = argv.includes('--all');
    const dryRun = argv.includes('--dry-run');
    const prevIdx = argv.indexOf('--prev');
    const prevFile = prevIdx >= 0 && argv[prevIdx + 1] ? path.resolve(argv[prevIdx + 1]) : null;
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
    const allUrls = [...parseSitemapUrls(xml).keys()];
    if (allUrls.length === 0) {
      console.error('submit-indexnow: no <loc> URLs found in dist/sitemap.xml');
      process.exit(1);
    }

    let prevXml = '';
    if (!forceAll) {
      if (prevFile && fs.existsSync(prevFile)) {
        prevXml = fs.readFileSync(prevFile, 'utf8');
      } else {
        prevXml = await getHttpsText(`https://${host}/sitemap.xml`);
      }
    }

    const urlList = forceAll ? allUrls : diffSitemapUrls(xml, prevXml);
    if (urlList.length === 0) {
      console.log(`submit-indexnow: 0 changed URLs out of ${allUrls.length} in sitemap; skipping submission`);
      process.exit(0);
    }
    if (dryRun) {
      console.log(`submit-indexnow: [dry-run] would submit ${urlList.length} URL(s): ${urlList.join(', ')}`);
      process.exit(0);
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
  })();
}

module.exports = { parseSitemapUrls, diffSitemapUrls };
