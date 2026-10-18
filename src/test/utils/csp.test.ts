import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import crypto from 'crypto';

const { applyCsp, inlineScriptHashes, hashScript } = createRequire(import.meta.url)('../../../scripts/lib/csp.cjs');

const CSP =
  "default-src 'none'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; img-src 'self' data: blob:; connect-src 'self';";
const meta = (csp = CSP) => `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
const page = (body: string, csp?: string) => `<html><head>${meta(csp)}${body}</head><body></body></html>`;
const sha = (s: string) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const scriptSrc = (html: string) => (html.match(/script-src ([^;]*);/) || [])[1];

describe('csp build step', () => {
  it('hashes a known inline script exactly as the browser does', () => {
    const src = "document.documentElement.classList.add('js');";
    expect(hashScript(src)).toBe(sha(src));
    const out = applyCsp(page(`<script>${src}</script>`));
    expect(scriptSrc(out.html)).toBe(`'self' https://static.cloudflareinsights.com ${sha(src)}`);
    expect(out.html).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('hashes multiple scripts, deduplicates and skips external ones', () => {
    const html = page('<script>a()</script><script src="/x.js"></script><script type="module">b()</script><script>a()</script>');
    expect(inlineScriptHashes(html)).toEqual([sha('a()'), sha('b()')]);
  });

  it('normalizes CRLF like the HTML parser before hashing', () => {
    expect(inlineScriptHashes(page('<script>a();\r\nb();</script>'))).toEqual([sha('a();\nb();')]);
  });

  it('adds extra hashes for scripts injected at runtime', () => {
    const out = applyCsp(page('<script src="/404.js"></script>'), [sha('shell()')]);
    expect(scriptSrc(out.html)).toContain(sha('shell()'));
  });

  it('ignores JSON-LD', () => {
    const html = page('<script type="application/ld+json">{"a":1}</script><script>c()</script>');
    expect(inlineScriptHashes(html)).toEqual([sha('c()')]);
  });

  it('preserves every other directive and keeps style-src unsafe-inline', () => {
    const out = applyCsp(page('<script>c()</script>')).html;
    for (const d of [
      "default-src 'none'",
      "manifest-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
    ]) {
      expect(out).toContain(d);
    }
  });

  it('is idempotent and drops stale hashes', () => {
    const once = applyCsp(page('<script>c()</script>')).html;
    expect(applyCsp(once).html).toBe(once);
    const stale = once.replace('<script>c()</script>', '<script>d()</script>');
    const fresh = scriptSrc(applyCsp(stale).html);
    expect(fresh).toContain(sha('d()'));
    expect(fresh).not.toContain(sha('c()'));
  });

  it('strips unsafe-inline from a page with no inline scripts', () => {
    const out = applyCsp(page('<script src="/a.js"></script>'));
    expect(out.changed).toBe(true);
    expect(scriptSrc(out.html)).not.toContain('unsafe-inline');
  });

  it('drops the dev-only ws: and wss: connect-src sources from built pages', () => {
    const dev = "default-src 'none'; script-src 'self'; connect-src 'self' blob: ws: wss:; media-src 'self';";
    const out = applyCsp(page('<script src="/a.js"></script>', dev));
    expect(out.changed).toBe(true);
    expect(out.html).toContain("connect-src 'self' blob:;");
    expect(out.html).not.toMatch(/\bwss?:/);
    expect(out.html).toContain("media-src 'self'");
    expect(applyCsp(out.html).changed).toBe(false);
  });

  it('leaves an already strict page untouched', () => {
    const strict = page('', "default-src 'none'; script-src 'self';");
    expect(applyCsp(strict)).toMatchObject({ html: strict, changed: false });
  });

  it('throws when inline scripts exist but there is no CSP meta tag (a silent hole would defeat the hardening)', () => {
    expect(() => applyCsp('<html><head><script>c()</script></head></html>')).toThrow(/no CSP meta/);
  });

  it('does not throw for a page with neither inline scripts nor a CSP meta', () => {
    expect(applyCsp('<html></html>').changed).toBe(false);
  });
});
