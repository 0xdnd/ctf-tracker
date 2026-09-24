import { Machine } from '../types';
import { sanitizeFilename } from './workspaceStorage';

/**
 * Escapes HTML entities to prevent stored XSS vulnerabilities.
 */
export function escapeHtml(str: string): string {
  if (str === null || str === undefined) return '';
  const s = typeof str !== 'string' ? String(str) : str;
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses inline markdown: bold, italic, strikethrough, inline code, links, images.
 * Hardened with non-backtracking character classes to prevent ReDoS CPU freezes.
 */
export function parseInlineMarkdown(text: string): string {
  let escaped = escapeHtml(text);

  // Images: ![alt](url) -> sanitized img tag (allows relative paths or safe raster data URIs)
  if (escaped.includes('![')) {
    escaped = escaped.replace(/!\[([^\[\]\n]*)\]\(([^)\n]+)\)/g, (_match, alt, src) => {
      const cleanSrc = src.trim().replace(/[\0\x00-\x1f]/g, '');
      if (/^(https?:\/\/|\/|\.\/|data:image\/(png|jpeg|jpg|gif|webp);base64,)/i.test(cleanSrc)) {
        return `<img src="${cleanSrc}" alt="${alt}" class="writeup-img" loading="lazy" />`;
      }
      return `[Image: ${alt}]`;
    });
  }

  // Links: [title](url) -> sanitized anchor tag (hardened against ReDoS & scheme injection)
  if (escaped.includes('](')) {
    escaped = escaped.replace(/\[([^\[\]\n]+)\]\(([^)\n]+)\)/g, (_match, title, href) => {
      const cleanHref = href.trim().replace(/[\0\x00-\x1f]/g, '');
      if (/^(https?:\/\/|mailto:|#|\/|\.\/)/i.test(cleanHref)) {
        return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer" class="writeup-link">${title}</a>`;
      }
      return title;
    });
  }

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold + Italic: ***text*** or ___text___
  escaped = escaped.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text**
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  escaped = escaped.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return escaped;
}

/**
 * Lightweight, robust, pure markdown-to-HTML parser.
 * Zero external dependencies, pure air-gapped string transformation.
 */
export function parseMarkdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  let inFrontmatter = false;
  const frontmatterLines: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  const codeLines: string[] = [];
  let inTable = false;
  const tableRows: string[][] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  const blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (inBlockquote) {
      output.push(`<blockquote>${blockquoteLines.map(l => `<p>${parseInlineMarkdown(l)}</p>`).join('')}</blockquote>`);
      blockquoteLines.length = 0;
      inBlockquote = false;
    }
  };

  const flushList = () => {
    if (inList) {
      output.push(`</${inList}>`);
      inList = null;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      let tableHtml = '<div class="table-wrapper"><table><thead><tr>';
      headerRow.forEach((h) => {
        tableHtml += `<th>${parseInlineMarkdown(h.trim())}</th>`;
      });
      tableHtml += '</tr></thead>';

      if (bodyRows.length > 0) {
        tableHtml += '<tbody>';
        bodyRows.forEach((row) => {
          tableHtml += '<tr>';
          row.forEach((cell) => {
            tableHtml += `<td>${parseInlineMarkdown(cell.trim())}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody>';
      }
      tableHtml += '</table></div>';
      output.push(tableHtml);
      tableRows.length = 0;
      inTable = false;
    }
  };

  lines.forEach((rawLine, idx) => {
    // 1. YAML Frontmatter Detection
    if (idx === 0 && rawLine.trim() === '---') {
      inFrontmatter = true;
      return;
    }
    if (inFrontmatter) {
      if (rawLine.trim() === '---') {
        inFrontmatter = false;
        output.push('<div class="frontmatter-box">');
        output.push('<div class="frontmatter-title">YAML METADATA // OBSIDIAN COMPATIBLE</div>');
        output.push('<dl class="frontmatter-grid">');
        frontmatterLines.forEach((fLine) => {
          const colonIdx = fLine.indexOf(':');
          if (colonIdx > 0) {
            const key = fLine.slice(0, colonIdx).trim();
            const val = fLine.slice(colonIdx + 1).trim();
            output.push(`<div class="frontmatter-item"><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(val)}</dd></div>`);
          }
        });
        output.push('</dl></div>');
        return;
      }
      frontmatterLines.push(rawLine);
      return;
    }

    // 2. Fenced Code Blocks
    if (rawLine.trim().startsWith('```')) {
      flushBlockquote();
      flushList();
      flushTable();

      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = rawLine.trim().replace(/^```/, '').trim();
        codeLines.length = 0;
      } else {
        inCodeBlock = false;
        const escapedCode = escapeHtml(codeLines.join('\n'));
        const langDisplay = codeLang || 'text';
        output.push(`
          <div class="codeblock-container">
            <div class="codeblock-header">
              <span class="codeblock-lang">${escapeHtml(langDisplay)}</span>
              <button class="codeblock-copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code class="language-${escapeHtml(langDisplay)}">${escapedCode}</code></pre>
          </div>
        `);
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    // 3. Tables (| col | col |)
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushBlockquote();
      flushList();

      // Check if it's separator row |---|---|
      if (/^\|[-:| ]+\|$/.test(trimmed)) {
        return; // skip separator row, columns already defined by header
      }

      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      inTable = true;
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable();
    }

    // 4. Blockquotes (> ...)
    if (trimmed.startsWith('>')) {
      flushList();
      flushTable();
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s?/, ''));
      return;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // 5. Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushBlockquote();
      flushList();
      flushTable();
      output.push('<hr />');
      return;
    }

    // 6. Headers (# Heading)
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushBlockquote();
      flushList();
      flushTable();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const anchorId = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      output.push(`<h${level} id="${anchorId}">${parseInlineMarkdown(text)}</h${level}>`);
      return;
    }

    // 7. Unordered Lists (- item, * item)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushBlockquote();
      flushTable();
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        output.push('<ul>');
      }
      let content = ulMatch[1];
      // Checkbox list item: - [ ] or - [x]
      if (content.startsWith('[ ] ')) {
        output.push(`<li class="task-list-item"><input type="checkbox" disabled /> ${parseInlineMarkdown(content.slice(4))}</li>`);
      } else if (content.startsWith('[x] ') || content.startsWith('[X] ')) {
        output.push(`<li class="task-list-item"><input type="checkbox" checked disabled /> ${parseInlineMarkdown(content.slice(4))}</li>`);
      } else {
        output.push(`<li>${parseInlineMarkdown(content)}</li>`);
      }
      return;
    }

    // 8. Ordered Lists (1. item)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      flushBlockquote();
      flushTable();
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        output.push('<ol>');
      }
      output.push(`<li>${parseInlineMarkdown(olMatch[1])}</li>`);
      return;
    }

    // Blank line
    if (trimmed === '') {
      flushBlockquote();
      flushList();
      flushTable();
      return;
    }

    // Standard paragraph
    flushBlockquote();
    flushList();
    flushTable();
    output.push(`<p>${parseInlineMarkdown(rawLine)}</p>`);
  });

  // Flush remaining buffers
  flushBlockquote();
  flushList();
  flushTable();

  return output.join('\n');
}

/**
 * Returns complete CSS styling embedded into the offline HTML document.
 * Includes dark tactical cyber theme, clean light theme, and high-contrast @media print rules.
 */
export function getEmbeddedStyles(): string {
  return `
    :root {
      --bg: #07090e;
      --card-bg: #0c1017;
      --border: #1e2638;
      --text: #c5d1de;
      --text-muted: #738496;
      --heading: #f0f6fc;
      --accent-cyan: #00f0ff;
      --accent-emerald: #00ff66;
      --accent-purple: #a855f7;
      --accent-red: #ff3366;
      --code-bg: #05070a;
      --header-bg: rgba(12, 16, 23, 0.95);
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    body.light-theme {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #cbd5e1;
      --text: #1e293b;
      --text-muted: #64748b;
      --heading: #0f172a;
      --accent-cyan: #0284c7;
      --accent-emerald: #16a34a;
      --accent-purple: #7e22ce;
      --accent-red: #dc2626;
      --code-bg: #f1f5f9;
      --header-bg: rgba(255, 255, 255, 0.95);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 15px;
      line-height: 1.65;
      padding: 0;
      margin: 0;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    /* Floating Tactical Action Bar */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: var(--header-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-family: var(--font-mono);
    }

    .action-bar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.05em;
      color: var(--heading);
    }

    .brand-accent {
      color: var(--accent-cyan);
    }

    .action-bar-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      appearance: none;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn:hover {
      border-color: var(--accent-cyan);
      color: var(--heading);
    }

    .btn-primary {
      background: var(--accent-cyan);
      border-color: var(--accent-cyan);
      color: #000000;
      font-weight: 700;
    }

    .btn-primary:hover {
      opacity: 0.9;
      color: #000000;
    }

    /* Container & Layout */
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px 80px;
    }

    /* Target Metadata Card */
    .target-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    .target-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald));
    }

    .target-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .target-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--heading);
      letter-spacing: -0.02em;
    }

    .badge-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-cyan {
      background: rgba(0, 240, 255, 0.12);
      color: var(--accent-cyan);
      border: 1px solid rgba(0, 240, 255, 0.3);
    }

    .badge-emerald {
      background: rgba(0, 255, 102, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(0, 255, 102, 0.3);
    }

    .badge-purple {
      background: rgba(168, 85, 247, 0.12);
      color: var(--accent-purple);
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .target-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .target-field {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
    }

    .target-field-label {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .target-field-val {
      color: var(--heading);
      font-weight: 600;
      word-break: break-all;
    }

    /* Content Typography */
    .writeup-body h1, .writeup-body h2, .writeup-body h3, .writeup-body h4 {
      color: var(--heading);
      font-weight: 700;
      margin-top: 32px;
      margin-bottom: 12px;
      line-height: 1.3;
      page-break-after: avoid;
    }

    .writeup-body h1 {
      font-size: 24px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .writeup-body h2 {
      font-size: 19px;
      color: var(--accent-cyan);
    }

    .writeup-body h3 {
      font-size: 16px;
    }

    .writeup-body p {
      margin-bottom: 16px;
    }

    .writeup-body hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 28px 0;
    }

    .writeup-body a.writeup-link {
      color: var(--accent-cyan);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .writeup-body img.writeup-img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin: 16px 0;
      display: block;
    }

    /* Inline Code */
    .inline-code {
      font-family: var(--font-mono);
      background: var(--code-bg);
      color: var(--accent-emerald);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }

    /* Code Blocks */
    .codeblock-container {
      margin: 18px 0;
      border-radius: 8px;
      background: var(--code-bg);
      border: 1px solid var(--border);
      overflow: hidden;
      page-break-inside: avoid;
    }

    .codeblock-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .codeblock-lang {
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
    }

    .codeblock-copy-btn {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 10px;
      padding: 2px 8px;
      font-family: var(--font-mono);
      transition: all 0.15s ease;
    }

    .codeblock-copy-btn:hover {
      color: var(--heading);
      border-color: var(--accent-cyan);
    }

    .codeblock-container pre {
      padding: 14px;
      overflow-x: auto;
      margin: 0;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.55;
      color: var(--text);
    }

    /* Blockquotes */
    blockquote {
      border-left: 3px solid var(--accent-purple);
      background: rgba(168, 85, 247, 0.05);
      padding: 12px 18px;
      margin: 18px 0;
      border-radius: 0 6px 6px 0;
    }

    blockquote p {
      margin-bottom: 6px;
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Lists */
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 6px;
    }

    li.task-list-item {
      list-style-type: none;
      margin-left: -20px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    /* Tables */
    .table-wrapper {
      overflow-x: auto;
      margin: 20px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background: var(--code-bg);
      font-family: var(--font-mono);
      color: var(--heading);
      font-weight: 700;
    }

    /* Frontmatter Box */
    .frontmatter-box {
      background: var(--code-bg);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-family: var(--font-mono);
    }

    .frontmatter-title {
      font-size: 10px;
      font-weight: 800;
      color: var(--accent-cyan);
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .frontmatter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 6px 16px;
      font-size: 11px;
    }

    .frontmatter-item {
      display: flex;
      gap: 8px;
    }

    .frontmatter-item dt {
      color: var(--text-muted);
      font-weight: 700;
    }

    .frontmatter-item dd {
      color: var(--heading);
    }

    /* Footer */
    .writeup-footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }

    /* Media Print Optimization (Clean 1-Click Save to PDF) */
    @media print {
      body {
        background-color: #ffffff !important;
        color: #111827 !important;
        font-size: 11pt !important;
        line-height: 1.5 !important;
      }

      .action-bar {
        display: none !important;
      }

      .container {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .target-card {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
        page-break-inside: avoid !important;
      }

      .target-card::before {
        display: none !important;
      }

      .target-field {
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
      }

      .target-field-val {
        color: #111827 !important;
      }

      .writeup-body h1, .writeup-body h2, .writeup-body h3 {
        color: #111827 !important;
        page-break-after: avoid !important;
      }

      .writeup-body h1 {
        border-bottom: 1px solid #e5e7eb !important;
      }

      .codeblock-container {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
        page-break-inside: avoid !important;
      }

      .codeblock-header {
        background: #e5e7eb !important;
      }

      .codeblock-copy-btn {
        display: none !important;
      }

      .codeblock-container pre {
        color: #1f2937 !important;
      }

      .inline-code {
        background: #f3f4f6 !important;
        color: #111827 !important;
        border: 1px solid #d1d5db !important;
      }

      table {
        page-break-inside: avoid !important;
      }

      th, td {
        border: 1px solid #d1d5db !important;
      }

      th {
        background: #f3f4f6 !important;
        color: #111827 !important;
      }

      .frontmatter-box {
        border: 1px solid #d1d5db !important;
        background: #f9fafb !important;
      }

      .frontmatter-item dd {
        color: #111827 !important;
      }
    }
  `;
}

/**
 * Returns embedded vanilla JS scripts for client-side interactivity in the offline HTML report.
 */
export function getEmbeddedScript(rawMarkdown: string): string {
  // Safe base64 encoded markdown payload for copy feature
  let encodedMarkdown = '';
  try {
    if (typeof btoa !== 'undefined') {
      encodedMarkdown = btoa(unescape(encodeURIComponent(rawMarkdown)));
    }
  } catch {
    encodedMarkdown = '';
  }

  return `
    const RAW_MARKDOWN = "${encodedMarkdown}";

    function copyRawMarkdown(btn) {
      try {
        const decoded = decodeURIComponent(escape(atob(RAW_MARKDOWN)));
        navigator.clipboard.writeText(decoded).then(() => {
          const originalText = btn.innerText;
          btn.innerText = "✓ Copied!";
          setTimeout(() => { btn.innerText = originalText; }, 2000);
        });
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }

    function toggleTheme() {
      const isLight = document.body.classList.toggle('light-theme');
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.innerText = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
      }
    }

    function copyCode(btn) {
      const pre = btn.closest('.codeblock-container').querySelector('pre code');
      if (!pre) return;
      navigator.clipboard.writeText(pre.innerText).then(() => {
        const orig = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => { btn.innerText = orig; }, 1800);
      });
    }
  `;
}

export interface WriteupExportOptions {
  brandName?: string;
  author?: string;
}

/**
 * Generates a complete, air-gapped standalone HTML writeup report.
 */
export function exportWriteupToHtml(
  machine: Machine,
  markdownContent: string,
  options: WriteupExportOptions = {}
): string {
  const brand = options.brandName || 'ZEROBOX';
  const author = options.author || 'ZeroBox Operator';
  const generatedDate = new Date().toISOString().slice(0, 10);
  const bodyHtml = parseMarkdownToHtml(markdownContent);
  const styles = getEmbeddedStyles();
  const script = getEmbeddedScript(markdownContent);

  const openPortsStr = machine.openPorts && machine.openPorts.length > 0
    ? machine.openPorts.join(', ')
    : 'None recorded';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(machine.name)} — Penetration Testing Writeup</title>
  <style>
${styles}
  </style>
</head>
<body>
  <!-- Interactive Action Bar -->
  <header class="action-bar">
    <div class="action-bar-brand">
      <span>⚡</span>
      <span>${escapeHtml(brand)} <span class="brand-accent">// TACTICAL REPORT</span></span>
    </div>
    <div class="action-bar-controls">
      <button class="btn" id="themeToggleBtn" onclick="toggleTheme()">☀️ Light Mode</button>
      <button class="btn" onclick="copyRawMarkdown(this)">📋 Copy Raw .md</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </header>

  <main class="container">
    <!-- Target Overview HUD -->
    <section class="target-card">
      <div class="target-header">
        <div>
          <div class="target-title">${escapeHtml(machine.name)}</div>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            Target Host Assessment &amp; Exploit Walkthrough
          </div>
        </div>
        <div class="badge-group">
          <span class="badge badge-cyan">${escapeHtml(machine.platform)}</span>
          <span class="badge badge-emerald">${escapeHtml(machine.os)}</span>
          <span class="badge badge-purple">${escapeHtml(machine.difficulty)}</span>
        </div>
      </div>

      <div class="target-grid">
        <div class="target-field">
          <div class="target-field-label">Target IP</div>
          <div class="target-field-val">${escapeHtml(machine.ip || 'N/A')}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Status</div>
          <div class="target-field-val">${escapeHtml(machine.status || 'todo')}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Time Spent</div>
          <div class="target-field-val">${Math.round((machine.timeSpentSeconds || 0) / 60)} mins</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Open Ports</div>
          <div class="target-field-val">${escapeHtml(openPortsStr)}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">User Flag</div>
          <div class="target-field-val">${escapeHtml(machine.userFlag || 'FLAG{...}')}</div>
        </div>
        <div class="target-field">
          <div class="target-field-label">Root Flag</div>
          <div class="target-field-val">${escapeHtml(machine.rootFlag || 'FLAG{...}')}</div>
        </div>
      </div>
    </section>

    <!-- Writeup Markdown Body -->
    <article class="writeup-body">
${bodyHtml}
    </article>

    <!-- Footer -->
    <footer class="writeup-footer">
      <div>OPERATOR: ${escapeHtml(author)} // CLASSIFICATION: CONFIDENTIAL</div>
      <div>EXPORTED: ${escapeHtml(generatedDate)} via ${escapeHtml(brand)}</div>
    </footer>
  </main>

  <script>
${script}
  </script>
</body>
</html>`;
}

/**
 * Triggers a browser download for the standalone offline HTML writeup report.
 */
export function downloadWriteupHtml(
  machine: Machine,
  markdownContent: string,
  options: WriteupExportOptions = {}
): void {
  const html = exportWriteupToHtml(machine, markdownContent, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const rawSlug = (machine.name || 'target').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const slug = sanitizeFilename(rawSlug, 'target');
  link.download = `${slug}-writeup.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
