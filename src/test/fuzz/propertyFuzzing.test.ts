import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateWorkspacePayload, sanitizeObjectKeys, sanitizeFilename } from '../../utils/workspaceStorage';
import { parseMarkdownToHtml, escapeHtml, parseInlineMarkdown } from '../../utils/writeupHtmlExporter';

describe('Layer 4: Property-Based Invariant Testing & High-Entropy Fuzzing', () => {
  it('FC-1: validateWorkspacePayload never throws and enforces strict schema invariants over 10,000 arbitrary payloads', () => {
    let iterations = 0;

    fc.assert(
      fc.property(
        fc.anything({
          maxDepth: 4,
          key: fc.oneof(fc.string(), fc.constantFrom('__proto__', 'constructor', 'prototype', 'machines', 'globalVars', 'data')),
          values: [
            fc.boolean(),
            fc.integer(),
            fc.double(),
            fc.string(),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.string(), { maxLength: 10 }),
          ],
        }),
        (arbitraryPayload) => {
          iterations++;

          // Invariant 1: Function MUST NEVER throw an unhandled exception or stack overflow
          const beforePrototypeKeys = Object.getOwnPropertyNames(Object.prototype);
          let result: any = null;
          expect(() => {
            result = validateWorkspacePayload(arbitraryPayload);
          }).not.toThrow();

          // Invariant 2: Result MUST ALWAYS be a valid WorkspaceImportResult object
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
          expect(typeof result.success).toBe('boolean');

          if (result.success) {
            expect(result.data).toBeDefined();
            expect(typeof result.data).toBe('object');
            // If machines were accepted, they must be an array
            if (result.data.machines) {
              expect(Array.isArray(result.data.machines)).toBe(true);
            }
          } else {
            expect(typeof result.error).toBe('string');
          }

          // Invariant 3: Global Object.prototype must NEVER be polluted
          const afterPrototypeKeys = Object.getOwnPropertyNames(Object.prototype);
          expect(afterPrototypeKeys).toEqual(beforePrototypeKeys);
        }
      ),
      { numRuns: 10000 }
    );

    expect(iterations).toBe(10000);
  });

  it('FC-2: sanitizeObjectKeys handles extreme recursion, circular references, and null prototypes safely', () => {
    // 1. Circular Reference
    const circularObj: any = { a: 1 };
    circularObj.self = circularObj;
    expect(() => sanitizeObjectKeys(circularObj)).not.toThrow();

    // 2. Null Prototype
    const nullProtoObj = Object.create(null);
    nullProtoObj.key = 'safe value';
    nullProtoObj.__proto__ = 'malicious';
    const sanitizedNullProto = sanitizeObjectKeys(nullProtoObj);
    expect(sanitizedNullProto).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(sanitizedNullProto, '__proto__')).toBe(false);
    expect((sanitizedNullProto as any).__proto__).not.toBe('malicious');
    expect((sanitizedNullProto as any).key).toBe('safe value');

    // 3. Poisoned prototype attempts
    const poison = JSON.parse('{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"admin": true}}}');
    sanitizeObjectKeys(poison);
    expect((Object.prototype as any).polluted).toBeUndefined();
    expect((Object.prototype as any).admin).toBeUndefined();

    // 4. Extreme Nesting Depth (call stack limit defense)
    let deep: any = { val: 'leaf' };
    for (let i = 0; i < 100; i++) {
      deep = { next: deep };
    }
    expect(() => sanitizeObjectKeys(deep)).not.toThrow();
  });

  it('FC-3: sanitizeFilename defends against directory traversal and Windows device names', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\Windows\\System32\\calc.exe',
      'CON.json',
      'PRN.txt',
      'AUX',
      'NUL',
      'COM1.dat',
      'LPT9',
      'null\0byte.txt',
      '<>:"/\\|?*.md',
    ];

    maliciousPaths.forEach((path) => {
      const sanitized = sanitizeFilename(path);
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('..\\');
      expect(sanitized).not.toContain('\0');
      expect(sanitized).not.toMatch(/[<>:"/\\|?*]/);
      // Windows reserved names must be prefixed with safe-
      const base = sanitized.split('.')[0].toLowerCase();
      expect(['con', 'prn', 'aux', 'nul', 'com1', 'lpt9']).not.toContain(base);
    });
  });

  it('FC-4: Parser Fuzzing with ANSI Escapes, BiDi Overrides, and Malformed Unicode executes in <5ms per block', () => {
    const adversarialSnippets = [
      // ANSI escape sequences
      '\x1b[31;1mRED ALERT\x1b[0m\x1b[2J',
      // BiDi directional overrides (CVE-2021-42574 Trojan Source)
      'const user = "\u202E \u2066 admin \u2069 \u2067"; // reversed display',
      // Zero-width spaces and joiners
      'adm\u200Bin\u200Cist\u200Dra\uFEFFtor',
      // Malformed HTML entities and script injection attempts
      '<script>alert(document.domain)</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg/onload=confirm(1)>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
      // Malformed markdown nesting
      '[[[[[[[[[[[[[deep link](https://evil.com/)))))))))))))',
      '````````````````````````````````````````````',
      '| col 1 | col 2 |\n|---|---|\n| ' + 'A'.repeat(5000) + ' | ' + 'B'.repeat(5000) + ' |',
    ];

    adversarialSnippets.forEach((snippet) => {
      const start = performance.now();
      const html = parseMarkdownToHtml(snippet);
      const duration = performance.now() - start;

      // Invariant 1: Execution under 5ms per block
      expect(duration).toBeLessThan(5);

      // Invariant 2: Script tags and executable event handlers must never render raw/unescaped
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<svg/onload');
      expect(html).not.toMatch(/<[a-z0-9]+[^>]*onerror=/i);
      expect(html).not.toMatch(/<[a-z0-9]+[^>]*onload=/i);

      // Test inline parser as well
      const inlineStart = performance.now();
      const inlineHtml = parseInlineMarkdown(snippet);
      const inlineDuration = performance.now() - inlineStart;
      expect(inlineDuration).toBeLessThan(5);
      expect(inlineHtml).not.toContain('<script>');
    });
  });
});
