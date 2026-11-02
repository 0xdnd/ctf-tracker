import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// mdToHtml lives inside the generator script; pull its source out and run it with stubbed helpers.
const src = fs.readFileSync(path.resolve(__dirname, '../../scripts/gen-content-pages.cjs'), 'utf8');
const start = src.indexOf('const mdToHtml = (md) => {');
const end = src.indexOf('\n  for (const n of model.notes) {', start);
const build = new Function(
  'inline',
  'esc',
  'byTitle',
  'NOTES_HUB',
  `${src.slice(start, end)}\nreturn mdToHtml;`
);
const mdToHtml = build((s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'), (s: string) => s, new Map(), '/n/') as (
  md: string
) => string;

describe('mdToHtml', () => {
  it('keeps source numbers when a fence or plain line splits an ordered list', () => {
    const html = mdToHtml('1. one\n\n```\nsample\n```\n\n2. two\nplain line\n3. three');
    expect(html).toContain('<ol>\n<li>one</li>');
    expect(html).toContain('<ol start="2">\n<li>two</li>');
    expect(html).toContain('<ol start="3">\n<li>three</li>');
  });

  it('renders pipe tables with inline formatting in a scroll wrapper', () => {
    const html = mdToHtml('| Name | Value |\n| --- | --- |\n| a | **b** |\n| c | d |');
    expect(html).toContain('<div class="tbl-scroll"><table>');
    expect(html).toContain('<th>Name</th><th>Value</th>');
    expect(html).toContain('<td>a</td><td><strong>b</strong></td>');
    expect((html.match(/<tr>/g) || []).length).toBe(3);
    expect(html).not.toContain('<p>|');
  });
});
