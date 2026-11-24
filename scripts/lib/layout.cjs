// Shared HTML layout + helpers for static content pages (CSS in dist/static.css, no JS).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { beaconTag, analyticsNote } = require('./site.cjs');
const { ogImageFor } = require('../og/pages.cjs');
const ORIGIN = 'https://ctftracker.com';
// Describes public/og.png (kept identical to the alt text in index.html and scripts/templates/landing.html).
// Same icon set as index.html and scripts/templates/landing.html.
const ICON_LINKS = [
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
  '<link rel="icon" type="image/x-icon" href="/favicon.ico?v=13" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=13" />',
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=13" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=13" />',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=13" />',
].map((l) => '  ' + l).join('\n');
const OG_IMAGE_ALT ='ZeroBox logo and the tagline Free offline CTF tracker and OSCP exam simulator, next to a screenshot of the tracker Kanban board on a dark background.';

// Stylesheet sources, concatenated in this exact order (later files override earlier ones).
const CSS_DIR = path.join(__dirname, '..', 'site', 'css');
const CSS_FILES = ['00-tokens.generated.css', '00-tokens.css', '10-base.css', '20-chrome.css', '30-content.css', '35-writeups.css', '40-landing.css', '50-motion.css', '60-light.css'];
const STATIC_CSS = CSS_FILES.map((f) => {
  const file = path.join(CSS_DIR, f);
  if (!fs.existsSync(file)) throw new Error(`layout: missing CSS source ${path.relative(process.cwd(), file)}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
}).join('');
// Content-hashed href so a changed stylesheet is never served stale from the browser cache or the service worker.
const CSS_HREF = '/static.css?v=' + crypto.createHash('sha1').update(STATIC_CSS).digest('hex').slice(0, 8);
// Search/filter/sort script for the machine list pages (public/table-filter.js), loaded only where renderPage gets tableFilter: true.
const TF_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'table-filter.js'), 'utf8');
const TF_SRC = '/table-filter.js?v=' + crypto.createHash('sha1').update(TF_JS).digest('hex').slice(0, 8);
// Copy buttons for code blocks (public/copy-code.js), loaded only on pages whose body has a <pre> block (or where renderPage gets copyCode: true).
const CC_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'copy-code.js'), 'utf8');
const CC_SRC = '/copy-code.js?v=' + crypto.createHash('sha1').update(CC_JS).digest('hex').slice(0, 8);
// Back-to-top button for the long list tables (public/back-to-top.js), loaded where renderPage gets tableFilter or backToTop: true.
const BT_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'back-to-top.js'), 'utf8');
const BT_SRC = '/back-to-top.js?v=' + crypto.createHash('sha1').update(BT_JS).digest('hex').slice(0, 8);
// Language filter and search for /revshells/ (public/revshells-filter.js), loaded only where renderPage gets shellFilter: true.
const RF_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'revshells-filter.js'), 'utf8');
const RF_SRC = '/revshells-filter.js?v=' + crypto.createHash('sha1').update(RF_JS).digest('hex').slice(0, 8);
// Topic filter box for /cheatsheet-library/ (public/cheatsheet-filter.js), loaded only where renderPage gets cardFilter: true.
const CF_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'cheatsheet-filter.js'), 'utf8');
const CF_SRC = '/cheatsheet-filter.js?v=' + crypto.createHash('sha1').update(CF_JS).digest('hex').slice(0, 8);
// Live {TARGET_IP}/{LHOST}/{LPORT} fill-in bar for static cheatsheets, methodology and techniques (public/vars-bar.js).
const VB_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'vars-bar.js'), 'utf8');
const VB_SRC = '/vars-bar.js?v=' + crypto.createHash('sha1').update(VB_JS).digest('hex').slice(0, 8);
// Local progress highlighter for certification hubs and /tj-null-list/ (public/local-progress.js).
const LP_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'local-progress.js'), 'utf8');
const LP_SRC = '/local-progress.js?v=' + crypto.createHash('sha1').update(LP_JS).digest('hex').slice(0, 8);
// Old /machines/?tag= and ?q= links go to /machines/all/ (public/machines-redirect.js), loaded only where renderPage gets redirectListQuery: true.
const MR_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'machines-redirect.js'), 'utf8');
const MR_SRC = '/machines-redirect.js?v=' + crypto.createHash('sha1').update(MR_JS).digest('hex').slice(0, 8);
// Theme bootstrap (public/theme.js) inlined into <head>: no blocking request, and it still runs before first paint (no theme flash).
// apply-csp.cjs hashes inline scripts at build, so the pages' script-src stays hash-based. public/theme.js is still deployed for pages cached before this change.
const THEME_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'theme.js'), 'utf8').replace(/\r\n?/g, '\n').trim();
if (/<\/script/i.test(THEME_JS)) throw new Error('layout: theme.js must not contain </script');
const THEME_SCRIPT = `<script>${THEME_JS}</script>`;
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
  ['/oscp-exam-simulator/', 'Exam simulator'],
];

const REPO = 'https://github.com/0xdnd/ctf-tracker';
const GITHUB_PROFILE = 'https://github.com/0xdnd';
const LINKEDIN = 'https://www.linkedin.com/in/daniel-dayan-a66322352/';

const FOOTER_LINKS = {
  Guides: [
    ['/machines/', 'Machines'],
    ['/tj-null-list/', 'TJ Null OSCP list'],
    ['/oscp-like-machines/', 'OSCP-like machines'],
    ['/cpts-like-machines/', 'CPTS-like machines'],
    ['/active-directory-machines/', 'Active Directory machines'],
    ['/oscp-vs-cpts/', 'OSCP vs CPTS'],
    ['/techniques/', 'Techniques'],
    ['/pentest-notes/', 'Pentest notes'],
  ],
  References: [
    ['/cheatsheet-library/', 'Cheatsheets'],
    ['/methodology-guide/', 'Methodology'],
    ['/revshells/', 'Reverse shells'],
  ],
  Creator: [
    ['/about/', 'About'],
    [GITHUB_PROFILE, 'Profile on GitHub'],
    [LINKEDIN, 'LinkedIn'],
  ],
  ZeroBox: [
    ['/tracker/', 'Open tracker'],
    ['/oscp-exam-simulator/', 'Exam simulator'],
    ['/oscp-points-calculator/', 'OSCP points calculator'],
    [REPO, 'Source code'],
    [REPO + '/blob/main/LICENSE', 'License'],
    ['/privacy/', 'Privacy'],
    ['/terms/', 'Terms'],
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
  coffee: svgIcon('ico-coffee', '<path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1"/><path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5z"/><path d="M16.746 16.726a3 3 0 1 0 .252 -5.555"/>'),
  ext: svgIcon('ico-ext', '<path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/><path d="M11 13l9 -9"/><path d="M15 4h5v5"/>'),
};

// "Buy me a coffee": a plain link with an inline cup icon, no third-party widget script. Footer of every page; coffeeNote() closes the revshells and cheatsheet pages.
const COFFEE_URL = 'https://buymeacoffee.com/0xdnd';
const coffeeLink = () => `<a class="coffee-link" href="${COFFEE_URL}" target="_blank" rel="noopener noreferrer">${ICON.coffee}Buy me a coffee</a>`;
const coffeeNote = () => `<p class="coffee-note">Found this useful? ${coffeeLink()}.</p>`;

/**
 * Content-page call-to-action. title/body are trusted HTML (callers escape); label is escaped here.
 * Primary button goes to href (icon: 'arrow' into the app, 'ext' for off-site, '' for none).
 * Optional secondary link-arrow (always an off-site link): linkHref/linkLabel/linkRel.
 */
function ctaBox({ title = '', body = '', href, label, icon = 'arrow', rel = '', linkHref = '', linkLabel = '', linkRel = 'nofollow noopener', links = [], cls = '' }) {
  const text = [title ? `<p><strong>${title}</strong></p>` : '', body ? `<p>${body}</p>` : ''].filter(Boolean).join('');
  const relAttr = rel ? ` rel="${esc(rel)}"` : '';
  const btn = href ? `<a class="btn" href="${esc(href)}"${relAttr}>${esc(label)}${ICON[icon] || ''}</a>` : '';
  const link = linkHref ? `<a class="link-arrow" href="${esc(linkHref)}" rel="${esc(linkRel)}">${esc(linkLabel)}\u2060${ICON.ext}</a>` : '';
  const extra = links.map((l) => `<a class="link-arrow" href="${esc(l.href)}"${l.rel === '' ? '' : ` rel="${esc(l.rel || 'nofollow noopener')}"`}>${esc(l.label)}\u2060${l.icon === undefined ? ICON.ext : l.icon}</a>`).join('');
  return `<div class="cta-box${cls ? ' ' + cls : ''}">${text ? `<div class="cta-text">${text}</div>` : ''}<div class="cta-actions">${btn}${link}${extra}</div></div>`;
}

/**
 * Uniform next-step strip for content pages: one line of text, a primary button into the app and an optional in-site secondary link.
 * Same markup and tokens as ctaBox (it IS a ctaBox with the compact .cta-strip modifier). Place it once per page, after the intro or at the end.
 * text is trusted HTML (callers escape); secondary: { href, label }.
 */
function ctaStrip({ title = '', text = '', href = '/tracker/', label = 'Open the tracker', secondary = null, rel = '' }) {
  const links = secondary ? [{ href: secondary.href, label: secondary.label, rel: '', icon: ICON.arrow }] : [];
  return ctaBox({ title, body: text, href, label, rel, links, cls: 'cta-strip' });
}

/**
 * Compact figures row for list and hub pages (3-4 items). items: [value, label] pairs; both are plain text and escaped here.
 * Sits right under the lead (ctaUnderLead keeps it ahead of the CTA); the sentence that carries the same counts stays in the body for readers and search.
 */
function statRow(items, label = 'At a glance') {
  return `<ul class="stat-row" aria-label="${esc(label)}">${items.map(([v, l]) => `<li><strong>${esc(String(v))}</strong><span>${esc(l)}</span></li>`).join('')}</ul>`;
}
const STAT_ROW_RE = /<ul class="stat-row"[\s\S]*?<\/ul>/;

const CTA_STRIP_RE = /<div class="cta-box cta-strip">(?:<div class="cta-text">[\s\S]*?<\/div>)?<div class="cta-actions">[\s\S]*?<\/div><\/div>/;
const LEAD_RE = /<p class="lead">[\s\S]*?<\/p>(?:\s*<p class="muted">[\s\S]*?<\/p>)?/;
/**
 * Moves the page's closing ctaStrip (the one the generator already emitted, so there is never a second CTA) to sit right under the lead,
 * where the primary button is visible without scrolling. A page with no strip, or no lead, is returned unchanged.
 */
function ctaUnderLead(body) {
  const cta = CTA_STRIP_RE.exec(body);
  if (!cta) return body;
  let rest = body.slice(0, cta.index) + body.slice(cta.index + cta[0].length);
  // A stat row (statRow) goes right under the lead, ahead of the CTA.
  const stat = STAT_ROW_RE.exec(rest);
  if (stat) rest = rest.slice(0, stat.index) + rest.slice(stat.index + stat[0].length);
  const lead = LEAD_RE.exec(rest);
  if (!lead) return body;
  const at = lead.index + lead[0].length;
  return rest.slice(0, at) + '\n' + (stat ? stat[0] + '\n' : '') + cta[0] + rest.slice(at);
}

// A sentence ends at . ! or ? before a capital letter, digit or tag, except after common abbreviations and single capitals.
const ABBREV_RE = /(?:\b(?:e\.g|i\.e|vs|etc|approx|cf|incl|esp|resp|fig|st|mr|mrs|ms|dr|prof|sr|jr|inc|ltd|co|u\.s|a\.k\.a)\.|\b[A-Z]\.)$/i;
/** Splits lead HTML into sentences, cutting only in text at tag depth 0 (never inside an element such as <a>...</a>) and never after an abbreviation. */
function splitSentences(html) {
  const out = [];
  let depth = 0;
  let start = 0;
  const re = /<(\/?)([a-z0-9]+)[^>]*?(\/?)>|([.!?])(\s+)(?=[A-Z0-9<])/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[2]) {
      if (m[1]) depth = Math.max(0, depth - 1);
      else if (!m[3] && !/^(?:br|img|hr|wbr|input)$/i.test(m[2])) depth++;
    } else if (depth === 0 && !ABBREV_RE.test(html.slice(start, m.index + 1))) {
      out.push(html.slice(start, m.index + 1));
      start = m.index + 1 + m[5].length;
    }
  }
  out.push(html.slice(start));
  return out;
}
/**
 * Long lead paragraph -> a 2-sentence lead plus the rest as a short list (or one plain paragraph when a single sentence is left).
 * Leaves a lead alone when it is already short (3 sentences or fewer and under 260 characters of text) or when a list already follows it.
 */
function shortenLead(body) {
  const m = /<p class="lead">([\s\S]*?)<\/p>(\s*)(?=(<[a-z0-9]+))/.exec(body);
  if (!m || ((m[3] === '<ul' || m[3] === '<ol') && !body.startsWith('<ul class="stat-row"', m.index + m[0].length))) return body;
  const sentences = splitSentences(m[1]);
  const plain = m[1].replace(/<[^>]+>/g, '');
  if (sentences.length < 2) return body;
  // Two sentences that together run past 220 characters of text (about 5 lines on a phone) keep only the first as the lead.
  const twoPlain = sentences.slice(0, 2).join(' ').replace(/<[^>]+>/g, '');
  const keep = twoPlain.length > 220 ? 1 : 2;
  if (sentences.length <= keep || (keep === 2 && sentences.length === 3 && plain.length <= 260)) return body;
  const head = `<p class="lead">${sentences.slice(0, keep).join(' ')}</p>`;
  const rest = sentences.slice(keep);
  const tail = rest.length === 1 ? `<p>${rest[0]}</p>` : `<ul>${rest.map((s) => `<li>${s}</li>`).join('')}</ul>`;
  return body.slice(0, m.index) + head + '\n' + tail + m[2] + body.slice(m.index + m[0].length);
}

/** current: path of the page being rendered; exact match gets aria-current="page", a parent section gets "true". */
function navLinks(current) {
  const home = `<a href="/"${current === '/' ? ' aria-current="page"' : ''}>Home</a>`;
  return '<ul>' + [home].concat(NAV.map(([p, l]) => {
    const exact = current === p;
    const section = !exact && typeof current === 'string' && current.startsWith(p);
    const aria = exact ? ' aria-current="page"' : section ? ' aria-current="true"' : '';
    return `<a href="${p}"${aria}>${esc(l)}</a>`;
  })).map((a) => `<li>${a}</li>`).join('') + '</ul>';
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
    <a class="icon-link" href="${REPO}" rel="noopener" aria-label="ZeroBox source code on GitHub">${ICON.github}</a>
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
        <p class="coffee-line">${coffeeLink()}</p>
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
  alternateName: ['ZeroBox CTF Tracker', 'CTF Tracker'],
  url: ORIGIN + '/',
  logo: ORIGIN + '/icon-512.png',
  sameAs: [REPO, GITHUB_PROFILE, LINKEDIN],
});
const websiteLd = () => ({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'ZeroBox',
  alternateName: ['ZeroBox CTF Tracker', 'CTF Tracker'],
  url: ORIGIN + '/',
  sameAs: [REPO],
  inLanguage: 'en',
  publisher: { '@id': ORG_ID },
});
const WEBSITE_ID = ORIGIN + '/#website';
const ABOUT_PATH = '/about/';
const PERSON_ID = ORIGIN + ABOUT_PATH + '#person';
/** Site author. Stable @id and url (the About page) so every page that credits the author can reference it by @id. */
const personLd = () => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Daniel Dayan',
  url: ORIGIN + ABOUT_PATH,
  sameAs: [GITHUB_PROFILE, LINKEDIN],
});
/** Single JSON-LD document for an app landing page: WebPage (part of the WebSite) plus its BreadcrumbList. */
function webPageGraphLd({ path: p, name, description, crumbs }) {
  const url = ORIGIN + p;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteLd(),
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': WEBSITE_ID },
        breadcrumb: { '@id': url + '#breadcrumb' },
      },
      { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs.map(([n, cp], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: ORIGIN + cp })) },
    ],
  };
}
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

const LD_SCRIPT = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/**
 * Single place that dates and credits an article page. For a rendered page with a TechArticle JSON-LD block it sets
 * dateModified (the same value the sitemap uses as lastmod), datePublished, the Person author, mainEntityOfPage and a description
 * (the page's meta description when the block has none), image (the page's absolute og:image URL when the block has none), and puts a visible "By <name> · Updated <date>" line under the H1.
 * Pages without a TechArticle block are returned unchanged. published is clamped so it never follows modified.
 */
function stampArticle(html, { modified, published }) {
  let stamped = false;
  const metaDesc = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1];
  const ogImage = unesc((/<meta property="og:image" content="(https?:\/\/[^"]*)"/.exec(html) || [])[1] || '');
  const pub = published && published < modified ? published : modified;
  const out = html.replace(LD_SCRIPT, (m, json) => {
    let o;
    try {
      o = JSON.parse(json);
    } catch {
      return m;
    }
    if (!o || o['@type'] !== 'TechArticle') return m;
    stamped = true;
    const url = o.url;
    const next = { ...o, datePublished: pub, dateModified: modified, author: personLd(), mainEntityOfPage: { '@type': 'WebPage', '@id': url } };
    if (!next.description && metaDesc) next.description = unesc(metaDesc);
    if (!next.image && ogImage) next.image = ogImage;
    return `<script type="application/ld+json">${jsonLd(next)}</script>`;
  });
  if (!stamped) return html;
  return addByline(out, modified);
}
const bylineHtml = (modified) => `<p class="note">By <a href="${ABOUT_PATH}">${esc(personLd().name)}</a> · Updated <time datetime="${modified}">${modified}</time></p>`;
const addByline = (html, modified) => html.replace('</h1>', () => `</h1>\n      ${bylineHtml(modified)}`);
/** Visible "By <name> · Updated <date>" line for list and hub pages (no TechArticle); the date is the page's sitemap lastmod. No-op when the page already has one. */
function stampUpdated(html, modified) {
  if (!modified || /Updated <time /.test(html)) return html;
  return addByline(html, modified);
}

/** opts: { path, title, description, h1, body, crumbs: [[name, path]...], ld?: object[], preloadFonts?: boolean, tableFilter?: boolean, backToTop?: boolean, shellFilter?: boolean, ctaUnderLead?: boolean } */
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

/**
 * Make every sideways-scrolling table keyboard-reachable: a table inside .tbl-scroll, or a bare table (which scrolls itself below 640px),
 * ends up in a <div class="tbl-scroll" tabindex="0" role="region" aria-label="<heading> table, scrolls sideways">. Tables that never scroll
 * (table.list rows stay put, table.rules stacks into labelled rows) are left alone. Names are unique per page (axe landmark-unique).
 */
function a11yScrollRegions(html) {
  let last = '';
  const seen = new Map();
  let wrapped = false; // the next <table> already sits in a .tbl-scroll div
  let closeWrap = false; // the table being read was wrapped here, so </table> must close the div
  const re = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>|<div class="tbl-scroll"([^>]*)>|<table\b([^>]*)>|<\/table>/g;
  const label = () => {
    const base = (last ? last : 'Data') + ' table, scrolls sideways';
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return esc(n > 1 ? base + ' (' + n + ')' : base);
  };
  const attrs = () => ` tabindex="0" role="region" aria-label="${label()}"`;
  return html.replace(re, (m, h, divAttrs, tblAttrs) => {
    if (h !== undefined) {
      last = h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
      return m;
    }
    if (divAttrs !== undefined) {
      wrapped = true;
      return /\btabindex=/.test(divAttrs) ? m : `<div class="tbl-scroll"${divAttrs}${attrs()}>`;
    }
    if (tblAttrs !== undefined) {
      if (wrapped) {
        wrapped = false;
        return m;
      }
      if (/class="[^"]*\b(list|rules)\b/.test(tblAttrs)) return m;
      closeWrap = true;
      return `<div class="tbl-scroll"${attrs()}>${m}`;
    }
    if (closeWrap) {
      closeWrap = false;
      return m + '</div>';
    }
    return m;
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
  const og = ogImageFor(opts.path, { platform: opts.ogPlatform }); // per-page share image; /og.png when none
  const ogSrc = ORIGIN + (og ? og.file : '/og.png?v=2');
  const ogAlt = esc(og ? og.alt : OG_IMAGE_ALT);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${desc}" />  <meta name="theme-color" content="#09090b" />
  <link rel="canonical" href="${url}" />${opts.noindex ? `
  <meta name="robots" content="noindex,follow" />` : ''}
${ICON_LINKS}
  <link rel="manifest" href="/manifest.webmanifest" />
  ${THEME_SCRIPT}${opts.redirectListQuery ? `
  <script src="${MR_SRC}"></script>` : ''}
  <link rel="stylesheet" href="${CSS_HREF}" />${opts.tableFilter ? `
  <script src="${TF_SRC}" defer></script>` : ''}${opts.tableFilter || opts.backToTop ? `
  <script src="${BT_SRC}" defer></script>` : ''}${opts.copyCode || /<pre[\s>]/.test(opts.body || '') ? `
  <script src="${CC_SRC}" defer></script>` : ''}${opts.varsBar ? `
  <script src="${VB_SRC}" defer></script>` : ''}${opts.localProgress ? `
  <script src="${LP_SRC}" defer></script>` : ''}${opts.shellFilter ? `
  <script src="${RF_SRC}" defer></script>` : ''}${opts.cardFilter ? `
  <script src="${CF_SRC}" defer></script>` : ''}${opts.preloadFonts !== false ? `
${fontPreloadTags()}` : ''}
  <meta property="og:type" content="${opts.ogType || 'article'}" />
  <meta property="og:site_name" content="ZeroBox" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ogSrc}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${ogAlt}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${url}" />
  <meta name="twitter:title" content="${esc(opts.title)}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogSrc}" />
  <meta name="twitter:image:alt" content="${ogAlt}" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; manifest-src 'self'; style-src 'self'; script-src 'self' https://static.cloudflareinsights.com; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com;" />
${ld}
</head>
<body>
${siteHeader({ current: opts.path })}
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">${crumbHtml}</nav>
    <main id="main" tabindex="-1">
      <h1>${esc(opts.h1)}</h1>
${a11yScrollRegions(a11yPres(opts.ctaUnderLead ? ctaUnderLead(shortenLead(opts.body)) : shortenLead(opts.body)))}
    </main>
  </div>
${siteFooter({ analyticsNote: analyticsNote() })}
${beaconTag()}</body>
</html>
`;
}

/** Designed 404 page (dist/404.html). Root-relative URLs only, because GitHub Pages serves it at any depth.
 *  /404.js boots the app shell for client routes that have no folder (e.g. /target/<id>) and fills the requested path.
 *  The CSP equals the app shell's: the shell is document.write()n into this document and a stricter policy would carry over and break it. */
const NF_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'public', '404.js'), 'utf8');
const NF_SRC = '/404.js?v=' + crypto.createHash('sha1').update(NF_JS).digest('hex').slice(0, 8);
const SHELL_CSP = "default-src 'none'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; media-src 'self' data: blob:;";
const NF_LINKS = [
  ['/', 'Back to home'],
  ['/cheatsheet-library/', 'Cheatsheets'],
];
function render404Page() {
  const chips = NF_LINKS.map(([h, l]) => `<a href="${h}">${esc(l)}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Page not found | ZeroBox</title>
  <meta name="description" content="This ZeroBox page does not exist. Go back to the home page or search the machine list." />
  <meta name="robots" content="noindex" />
  <meta name="theme-color" content="#09090b" />
${ICON_LINKS}
  <link rel="manifest" href="/manifest.webmanifest" />
  ${THEME_SCRIPT}
  <script src="${NF_SRC}"></script>
  <link rel="stylesheet" href="${CSS_HREF}" />
  <meta http-equiv="Content-Security-Policy" content="${SHELL_CSP}" />
</head>
<body>
${siteHeader({ current: '' })}
  <div class="wrap">
    <main id="main" class="nf" tabindex="-1">
      <p class="nf-num" aria-hidden="true">404</p>
      <h1>This one isn't on the board</h1>
      <p class="lead">Nothing lives at this address. The link may be old or mistyped.</p>
      <div class="nf-drop">
        <div class="nf-card" role="group" aria-label="The address you asked for">
          <div class="nf-head"><span class="nf-dot" aria-hidden="true"></span><code class="nf-title" data-nf-path>/missing-page</code></div>
          <dl class="nf-field"><dt>IP</dt><dd>404.404.404.404</dd></dl>
          <ul class="nf-pills"><li>Not found</li><li>No foothold</li></ul>
        </div>
      </div>
      <form class="nf-search" action="/machines/all/" method="get" role="search">
        <label for="nf-q">Search the machine list</label>
        <div class="nf-search-row"><input id="nf-q" type="search" name="q" placeholder="Name or tag" autocomplete="off" spellcheck="false" maxlength="100" /><button class="btn" type="submit">Search</button></div>
      </form>
      <div class="nf-mean" data-nf-mean aria-live="polite"></div>
      <div class="cta-actions"><a class="btn btn-secondary" href="/machines/">Machines</a><a class="btn btn-secondary" href="/methodology-guide/">Methodology</a></div>
      <nav class="chips" aria-label="Popular destinations">${chips}</nav>
    </main>
  </div>
${siteFooter({ analyticsNote: '' })}
</body>
</html>
`;
}

module.exports = { shortenLead, splitSentences, render404Page, NF_SRC, ORIGIN, esc, jsonLd, renderPage, truncate, fitTitle, organizationLd, websiteLd, personLd, webPageGraphLd, breadcrumbLd, PERSON_ID, ABOUT_PATH, techArticleLd, stampArticle, stampUpdated, STATIC_CSS, CSS_HREF, THEME_SCRIPT, NAV, siteHeader, siteFooter, fontPreloadTags, ICON, ctaBox, ctaStrip, statRow, coffeeLink, coffeeNote, COFFEE_URL, REPO, GITHUB_PROFILE, LINKEDIN };
