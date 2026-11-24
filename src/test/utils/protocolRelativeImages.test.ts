import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../utils/securityUtils';
import { parseInlineMarkdown } from '../../utils/writeupHtmlExporter';

describe('image sources that start with two slashes resolve to another host', () => {
  it('securityUtils drops protocol-relative img sources', () => {
    expect(sanitizeHtml('<img src="//evil.example/beacon.png">')).not.toContain('evil.example');
    expect(sanitizeHtml('<img src="/\\evil.example/beacon.png">')).not.toContain('evil.example');
  });

  it('securityUtils keeps single-slash local paths', () => {
    expect(sanitizeHtml('<img src="/assets/a.png">')).toContain('src="/assets/a.png"');
    expect(sanitizeHtml('<img src="./a.png">')).toContain('src="./a.png"');
  });

  it('the html exporter rejects protocol-relative image sources', () => {
    const out = parseInlineMarkdown('![x](//evil.example/beacon.png)');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('src=');
    expect(parseInlineMarkdown('![x](/\\evil.example/b.png)')).not.toContain('<img');
  });

  it('the html exporter keeps single-slash local paths', () => {
    expect(parseInlineMarkdown('![x](/assets/a.png)')).toContain('<img src="/assets/a.png"');
    expect(parseInlineMarkdown('![x](./a.png)')).toContain('<img src="./a.png"');
  });
});
