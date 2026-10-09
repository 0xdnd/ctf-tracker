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
// Blocking theme bootstrap (public/theme.js). Hashed so a changed script is never served stale by the service worker.
const THEME_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'theme.js'), 'utf8');
const THEME_SRC = '/theme.js?v=' + crypto.createHash('sha1').update(THEME_JS).digest('hex').slice(0, 8);
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
const GITHUB_PROFILE = 'https://github.com/0xdnd';
const LINKEDIN = 'https://www.linkedin.com/in/daniel-dayan-a66322352/';

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
  Creator: [
    [GITHUB_PROFILE, 'Profile on GitHub'],
    [LINKEDIN, 'LinkedIn'],
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
  warn: svgIcon('ico-warn', '<path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.871l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/>'),
  github: svgIcon('ico-github', '<path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"/>'),
  linkedin: svgIcon('ico-linkedin', '<path d="M8 11v5"/><path d="M8 8v.01"/><path d="M12 16v-5"/><path d="M16 16v-3a2 2 0 0 0 -4 0"/><path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z"/>'),
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

const THEME_ICONS =
  '<svg class="ico-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3a6 6 0 0 0 9 9a9 9 0 1 1 -9 -9" /></svg>' +
  '<svg class="ico-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>';

/** Sticky header. No inline styles (content-page CSP is style-src 'self'). Mobile menu is a <details>, no JS. */
function siteHeader({ current } = {}) {
  const links = navLinks(current);
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/"><img src="/icon-192.png" width="32" height="32" alt="" aria-hidden="true" /><span class="brand-name">ZeroBox</span></a>
    <nav class="nav-inline" aria-label="Primary">${links}</nav>
    <a class="icon-link" href="${REPO}" rel="noopener" aria-label="ZeroBox source on GitHub">${ICON.github}</a>
    <a class="icon-link" href="${LINKEDIN}" rel="me noopener" aria-label="Daniel Dayan on LinkedIn">${ICON.linkedin}</a>
    <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch to light theme">${THEME_ICONS}</button>
    <a class="btn btn-sm" href="/tracker/">Open tracker</a>
    <details class="nav-menu">
      <summary>Menu</summary>
      <nav class="nav-panel" aria-label="Primary (menu)">${links}<span class="nav-social"><a href="${REPO}" rel="noopener">${ICON.github}GitHub</a><a href="${LINKEDIN}" rel="me noopener">${ICON.linkedin}LinkedIn</a></span></nav>
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
            return `<li><a href="${p}"${external ? (p === GITHUB_PROFILE || p === LINKEDIN ? ' rel="me noopener"' : ' rel="noopener"') : ''}>${esc(l)}${external ? ICON.ext : ''}</a></li>`;
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

const MAX_TITLE = 60;
const MAX_DESC = 155;
const DANGLING = /\s+(?:and|or|with|for|the|of|to|a|an|in|on|at|by|from|plus|as|that|which)$/i;

/** Sentence-aware shortener: always a complete sentence of at most n chars, never an ellipsis. */
function truncate(s, n = MAX_DESC) {
  const t = String(s).replace(/\s+/g, ' ').trim().replace(/…$/, '');
  const fin = (x) => x.replace(/[\s,;:\-–—(]+$/, '').replace(/[.!?]*$/, '') + '.';
  if (t.length <= n && /[.!?]$/.test(t)) return t;
  if (t.length < n) return fin(t);
  const head = t.slice(0, n);
  // Prefer the last sentence boundary that keeps a reasonable amount of text.
  const sentEnd = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sentEnd >= 70) return head.slice(0, sentEnd + 1);
  if (/[.!?]$/.test(head) && t[n] === ' ') return head;
  // Otherwise cut at the last clause or word boundary that leaves room for the final period.
  let cut = t.slice(0, n - 1);
  const clause = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(': '));
  if (clause >= 70) cut = cut.slice(0, clause);
  else if (t[n - 1] !== ' ') cut = cut.replace(/\s+\S*$/, '');
  let prev;
  do {
    prev = cut;
    cut = cut.replace(DANGLING, '');
  } while (cut !== prev);
  return fin(cut);
}

/** First candidate that fits in 60 chars; the last one is shortened at a word boundary if none fits. */
function fitTitle(...candidates) {
  const c = candidates.map((x) => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const x of c) if (x.length <= MAX_TITLE) return x;
  let cut = c[c.length - 1].slice(0, MAX_TITLE).replace(/\s+\S*$/, '');
  let prev;
  do {
    prev = cut;
    cut = cut.replace(DANGLING, '').replace(/[\s,;:\-–—(|]+$/, '');
  } while (cut !== prev);
  return cut;
}

const ORG_ID = ORIGIN + '/#org';
/** Organization (with logo and GitHub sameAs); referenced by @id elsewhere so it is only defined once per page. */
const organizationLd = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'ZeroBox',
  url: ORIGIN + '/',
  logo: ORIGIN + '/icon-512.png',
  sameAs: [REPO],
});
const websiteLd = () => ({
  '@type': 'WebSite',
  '@id': ORIGIN + '/#website',
  name: 'ZeroBox',
  url: ORIGIN + '/',
  inLanguage: 'en',
  publisher: { '@id': ORG_ID },
});
/** TechArticle with dateModified; a falsy dateModified is omitted. */
const techArticleLd = ({ headline, url, description, dateModified, about }) => ({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline,
  url,
  ...(description ? { description } : {}),
  ...(dateModified ? { dateModified } : {}),
  inLanguage: 'en',
  ...(about && about.length ? { about } : {}),
  publisher: { '@type': 'Organization', name: 'ZeroBox', url: ORIGIN + '/' },
});

/** opts: { path, title, description, h1, body, crumbs: [[name, path]...], ld?: object[], preloadFonts?: boolean } */
/** Make every <pre> keyboard-focusable (scrollable-region-focusable) and a labelled region, named after the nearest preceding heading. */
function a11yPres(html) {
  let last = '';
  const seen = new Map();
  const re = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>|<pre\b([^>]*)>/g;
  return html.replace(re, (m, h, attrs) => {
    if (h !== undefined) {
      last = h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
      return m;
    }
    let a = attrs;
    if (!/\btabindex=/.test(a)) a += ' tabindex="0"';
    if (!/\brole=/.test(a)) a += ' role="region"';
    if (!/\baria-label(ledby)?=/.test(a)) {
      const base = last ? 'Code example: ' + last : 'Code example';
      const n = (seen.get(base) || 0) + 1; // labelled regions must be unique per page (axe landmark-unique)
      seen.set(base, n);
      a += ` aria-label="${esc(n > 1 ? base + ' (' + n + ')' : base)}"`;
    }
    return `<pre${a}>`;
  });
}

function renderPage(opts) {
  const url = ORIGIN + opts.path;
  const crumbs = opts.crumbs || [['Home', '/']];
  const ld = [breadcrumbLd(crumbs), ...(opts.ld || [])]
    .map((o) => `  <script type="application/ld+json">${jsonLd(o)}</script>`)
    .join('\n');
  const crumbHtml = crumbs
    .map(([n, p], i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`))
    .join(' <span class="sep">/</span> ');
  const desc = esc(truncate(opts.description, MAX_DESC));
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
  <script src="${THEME_SRC}"></script>
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
${a11yPres(opts.body)}
    </main>
  </div>
${siteFooter({ analyticsNote: analyticsNote() })}
${beaconTag()}</body>
</html>
`;
}

module.exports = { ORIGIN, esc, jsonLd, renderPage, truncate, fitTitle, organizationLd, websiteLd, techArticleLd, STATIC_CSS, CSS_HREF, THEME_SRC, NAV, siteHeader, siteFooter, fontPreloadTags, ICON, ctaBox, REPO, GITHUB_PROFILE, LINKEDIN };
