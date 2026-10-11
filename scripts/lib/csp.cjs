// Build-time CSP hardening: replaces 'unsafe-inline' in script-src with sha256 hashes of the page's inline scripts.
const crypto = require('crypto');

const META_RE = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/i;
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

class CspError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function hashScript(source) {
  // The HTML parser normalizes CRLF/CR to LF before the script text is hashed, so do the same.
  source = source.replace(/\r\n?/g, '\n');
  return `'sha256-${crypto.createHash('sha256').update(source, 'utf8').digest('base64')}'`;
}

// Inline executable scripts only: no src, and a JavaScript (or absent) type. JSON-LD and other data blocks never execute.
function inlineScriptHashes(html) {
  const hashes = [];
  for (const m of html.matchAll(SCRIPT_RE)) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = ((attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '').toLowerCase();
    if (!JS_TYPES.has(type)) continue;
    if (m[2].trim() === '') continue;
    const h = hashScript(m[2]);
    if (!hashes.includes(h)) hashes.push(h);
  }
  return hashes;
}

function rewriteDirective(csp, hashes) {
  const parts = csp.split(';').map((p) => p.trim()).filter(Boolean);
  let found = false;
  const out = parts.map((p) => {
    const [name, ...vals] = p.split(/\s+/);
    if (name !== 'script-src') return p;
    found = true;
    // Keep every source except inline/hash tokens (e.g. 'self', the Cloudflare beacon host), then append fresh hashes.
    const kept = vals.filter((v) => v !== "'unsafe-inline'" && !/^'sha(256|384|512)-/.test(v));
    if (!kept.includes("'self'")) kept.unshift("'self'");
    return ['script-src', ...kept, ...hashes].join(' ');
  });
  if (!found) throw new CspError('NO_SCRIPT_SRC', 'CSP meta tag has no script-src directive');
  return out.join('; ') + ';';
}

// Returns { html, hashes, changed }. Throws CspError('NO_CSP_META') when inline scripts exist but there is no CSP meta to rewrite.
// extraHashes: hashes of scripts this page injects at runtime (404.html document.write()s the app shell).
function applyCsp(html, extraHashes = []) {
  const hashes = [...inlineScriptHashes(html)];
  for (const h of extraHashes) if (!hashes.includes(h)) hashes.push(h);
  const meta = html.match(META_RE);
  if (!meta) {
    if (hashes.length) throw new CspError('NO_CSP_META', `page has ${hashes.length} inline script(s) but no CSP meta tag`);
    return { html, hashes, changed: false };
  }
  const csp = meta[1];
  const needsRewrite = hashes.length > 0 || /script-src[^;]*'unsafe-inline'/.test(csp);
  if (!needsRewrite) return { html, hashes, changed: false };
  const next = rewriteDirective(csp, hashes);
  const tag = meta[0].replace(csp, next);
  return { html: html.replace(meta[0], () => tag), hashes, changed: next !== csp };
}

module.exports = { CspError, hashScript, inlineScriptHashes, applyCsp };
