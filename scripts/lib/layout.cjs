// Shared HTML layout + helpers for static content pages (CSS in dist/static.css, no JS).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { beaconTag, analyticsNote } = require('./site.cjs');
const ORIGIN = 'https://ctftracker.com';

// Stylesheet sources, concatenated in this exact order (later files override earlier ones).
const CSS_DIR = path.join(__dirname, '..', 'site', 'css');
const CSS_FILES = ['00-tokens.css', '10-base.css', '20-chrome.css', '30-content.css', '40-landing.css', '50-motion.css', '60-light.css'];
const STATIC_CSS = CSS_FILES.map((f) => {
  const file = path.join(CSS_DIR, f);
  if (!fs.existsSync(file)) throw new Error(`layout: missing CSS source ${path.relative(process.cwd(), file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
}).join('');
// Content-hashed href so a changed stylesheet is never served stale from the browser cache or the service worker.
const CSS_HREF = '/static.css?v=' + crypto.createHash('sha1').update(STATIC_CSS).digest('hex').slice(0, 8);
const FONT_PATHS = ['/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-var.woff2'];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// Primary nav (the brand links home; "Open ZeroBox" is rendered separately as the button).
const NAV = [
  ['/machines/', 'Machines'],
  ['/cheatsheet-library/', 'Cheatsheets'],
  ['/methodology-guide/', 'Methodology'],
  ['/revshells/', 'Reverse shells'],
  ['/exam/', 'Exam simulator'],
];

const REPO = 'https://github.com/0xdnd/ctf-tracker';

const FOOTER_LINKS = {
  Guides: [
    ['/machines/', 'Machines'],
    ['/oscp-like-machines/', 'OSCP-like machines'],
    ['/techniques/', 'Techniques'],
    ['/cpts-notes/', 'CPTS notes'],
  ],
  References: [
    ['/cheatsheet-library/', 'Cheatsheets'],
    ['/methodology-guide/', 'Methodology'],
    ['/revshells/', 'Reverse shells'],
  ],
  ZeroBox: [
    ['/tracker/', 'Open tracker'],
    ['/exam/', 'Exam simulator'],
    [REPO, 'Source on GitHub'],
  ],
};

// Inline Tabler icons (stroke = currentColor, decorative). Presentation attributes only, so the content-page CSP (style-src 'self') is fine.
const svgIcon = (cls, paths) =>
  `<svg class="ico ${cls}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
const ICON = {
  arrow: svgIcon('ico-arrow', '<path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>'),
  ext: svgIcon('ico-ext', '<path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><path d="M15 4h5v5"/>'),
};

/**
 * Content-page call-to-action. title/body are trusted HTML (callers escape); label is escaped here.
 * Primary button goes to href (icon: 'arrow' into the app, 'ext' for off-site, '' for none).
 * Optional secondary link-arrow (always an off-site link): linkHref/linkLabel/linkRel.
 */
function ctaBox({ title = '', body = '', href, label, icon = 'arrow', rel = '', linkHref = '', linkLabel = '', linkRel = 'nofollow noopener' }) {
  const text = [title ? `<p><strong>${title}</strong></p>` : '', body ? `<p>${body}</p>` : ''].filter(Boolean).join('');
  const relAttr = rel ? ` rel="${esc(rel)}"` : '';
  const btn = href ? `<a class="btn" href="${esc(href)}"${relAttr}>${esc(label)}${ICON[icon] || ''}</a>` : '';
  const link = linkHref ? `<a class="link-arrow" href="${esc(linkHref)}" rel="${esc(linkRel)}">${esc(linkLabel)}${ICON.ext}</a>` : '';
  return `<div class="cta-box">${text ? `<div class="cta-text">${text}</div>` : ''}<div class="cta-actions">${btn}${link}</div></div>`;
}

/** current: path of the page being rendered; exact match gets aria-current="page", a parent section gets "true". */
function navLinks(current) {
  return NAV.map(([p, l]) => {
    const exact = current === p;
    const section = !exact && typeof current === 'string' && current.startsWith(p);
    const aria = exact ? ' aria-current="page"' : section ? ' aria-current="true"' : '';
    return `<a href="${p}"${aria}>${esc(l)}</a>`;
  }).join('');
}

/** Sticky header. No inline styles (content-page CSP is style-src 'self'). Mobile menu is a <details>, no JS. */
function siteHeader({ current } = {}) {
  const links = navLinks(current);
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/"><img src="/icon-192.png" width="32" height="32" alt="" /><span class="brand-name">ZeroBox</span></a>
    <nav class="nav-inline" aria-label="Primary">${links}</nav>
    <a class="btn btn-sm" href="/tracker/">Open tracker</a>
    <details class="nav-menu">
      <summary>Menu</summary>
      <nav class="nav-panel" aria-label="Primary (menu)">${links}</nav>
    </details>
  </div>
</header>`;
}

/** Footer. analyticsNote defaults to the beacon disclosure from site.cjs; pass '' to omit it. */
function siteFooter({ analyticsNote: note } = {}) {
  const cols = Object.entries(FOOTER_LINKS)
    .map(
      ([h, links]) =>
        `<div><h2>${esc(h)}</h2><ul>${links
          .map(([p, l]) => {
            const external = /^https?:/.test(p);
            return `<li><a href="${p}"${external ? ' rel="noopener"' : ''}>${esc(l)}${external ? ICON.ext : ''}</a></li>`;
          })
          .join('')}</ul></div>`
    )
    .join('');
  const extra = note === undefined ? analyticsNote() : note;
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/"><img src="/icon-192.png" width="28" height="28" alt="" aria-hidden="true" />ZeroBox</a>
        <p>ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec. Only test systems you are authorised to test.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer">${cols}</nav>
    </div>
    ${extra}
  </div>
</footer>`;
}

/** Font preload tags; only pages that opt in (the landing) use these, content pages do not preload. */
function fontPreloadTags() {
  return `  <link rel="preload" href="${FONT_PATHS[0]}" as="font" type="font/woff2" crossorigin />`;
}

function breadcrumbLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })),
  };
}

function truncate(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

/** opts: { path, title, description, h1, body, crumbs: [[name, path]...], ld?: object[], preloadFonts?: boolean } */
function renderPage(opts) {
  const url = ORIGIN + opts.path;
  const crumbs = opts.crumbs || [['Home', '/']];
  const ld = [breadcrumbLd(crumbs), ...(opts.ld || [])]
    .map((o) => `  <script type="application/ld+json">${jsonLd(o)}</script>`)
    .join('\n');
  const crumbHtml = crumbs
    .map(([n, p], i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`))
    .join(' <span class="sep">/</span> ');
  const desc = esc(truncate(opts.description, 158));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${desc}" />
  <meta name="theme-color" content="#09090b" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=12" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=12" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=12" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="stylesheet" href="${CSS_HREF}" />${opts.preloadFonts ? `
${fontPreloadTags()}` : ''}
  <meta property="og:type" content="${opts.ogType || 'article'}" />
  <meta property="og:site_name" content="ZeroBox" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ORIGIN}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${url}" />
  <meta name="twitter:title" content="${esc(opts.title)}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ORIGIN}/og.png" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; manifest-src 'self'; style-src 'self'; script-src 'self' https://static.cloudflareinsights.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com;" />
${ld}
</head>
<body>
${siteHeader({ current: opts.path })}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">${crumbHtml}</nav>
    <main id="main">
      <h1>${esc(opts.h1)}</h1>
${opts.body}
    </main>
  </div>
${siteFooter({ analyticsNote: analyticsNote() })}
${beaconTag()}</body>
</html>
`;
}

module.exports = { ORIGIN, esc, jsonLd, renderPage, truncate, STATIC_CSS, CSS_HREF, NAV, siteHeader, siteFooter, fontPreloadTags, ICON, ctaBox, REPO };
