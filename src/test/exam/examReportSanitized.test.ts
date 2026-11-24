import { describe, it, expect, vi } from 'vitest';

// The Markdown renderer is stubbed to return hostile markup, so this checks that the exam report generator
// does not trust it and runs the generated body through sanitizeHtml.
vi.mock('../../utils/writeupHtmlExporter', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/writeupHtmlExporter')>()),
  parseMarkdownToHtml: () =>
    '<p class="ok">kept</p><script>alert(1)</script><img src="//evil.example/b.png" onerror="alert(2)">' +
    '<iframe src="https://evil.example"></iframe>',
}));

import { exportStandaloneHtmlReport } from '../../utils/examReportGenerator';

describe('exam report HTML export', () => {
  it('strips scripts, event handlers, iframes and protocol-relative images from the body', () => {
    const html = exportStandaloneHtmlReport('# anything', 'Title');
    expect(html).toContain('<p class="ok">kept</p>');
    expect(html).not.toContain('alert(');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('onerror');
  });

  it('keeps the standalone document shell and its own style block', () => {
    const html = exportStandaloneHtmlReport('# anything', 'Title');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).toContain('Content-Security-Policy');
  });
});
