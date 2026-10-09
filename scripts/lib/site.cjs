// Cloudflare Web Analytics beacon tag; empty string unless a valid token is set in src/seo/site.json.
const fs = require('fs');
const path = require('path');

function beaconTag() {
  let token = '';
  try {
    token = String(JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'seo', 'site.json'), 'utf8')).cfBeaconToken || '');
  } catch (e) {
    console.warn('site: could not read src/seo/site.json');
    return '';
  }
  if (!token) return '';
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    console.warn('site: cfBeaconToken is not a 32-char hex token; beacon skipped');
    return '';
  }
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`;
}

function injectBeacon(html) {
  const tag = beaconTag();
  if (!tag || html.includes('static.cloudflareinsights.com/beacon.min.js')) return html;
  html = html.replace(/(<meta http-equiv="Content-Security-Policy"[^>]*>)/, (m) => {
    if (!m.includes('static.cloudflareinsights.com')) m = m.replace(/script-src ([^;"]*)/, 'script-src $1 https://static.cloudflareinsights.com');
    if (!m.includes('https://cloudflareinsights.com')) m = m.replace(/connect-src ([^;"]*)/, 'connect-src $1 https://cloudflareinsights.com');
    return m;
  });
  return html.replace('</body>', `${tag}\n</body>`);
}

// Footer disclosure paragraph; empty unless the beacon is active.
function analyticsNote() {
  if (!beaconTag()) return '';
  return '<p>This site uses cookieless Cloudflare Web Analytics. The ZeroBox app sends no analytics or telemetry.</p>';
}

module.exports = { beaconTag, injectBeacon, analyticsNote };
