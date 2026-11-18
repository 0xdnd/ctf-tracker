// Long-form guide pages (OSCP scoring, TJ Null list, report template, progress tracker, CPTS exam).
// Each page lives in ./guides/<name>.cjs and exports build(ctx) -> page spec; this file adds the shared chrome
// (lead, CTA, FAQ + FAQPage JSON-LD from the same array, Related, last-reviewed note, TechArticle JSON-LD).
// Public interface: buildGuidePages({ model, renderPage, site }) -> [{ path, title, description, html, lastmod }]
const { ORIGIN, esc, ctaBox } = require('./layout.cjs');
const { ogImageFor } = require('../og/pages.cjs');

const LAST_REVIEWED = '2026-10-08';

const BUILDERS = [
  require('./guides/oscp-scoring.cjs'),
  require('./guides/tj-null.cjs'),
  require('./guides/report-template.cjs'),
  require('./guides/progress-tracker.cjs'),
  require('./guides/cpts-exam.cjs'),
  require('./guides/htb-vs-tryhackme.cjs'),
  require('./guides/htb-pro-labs.cjs'),
  require('./guides/oscp-vs-cpts.cjs'),
];

// Internal link targets guides may use in Related lists (label shown on the page).
const LINKS = {
  '/tracker/': 'CTF and HTB machine tracker',
  '/exam/': 'Exam simulator',
  '/oscp-exam-simulator/': 'OSCP exam simulator',
  '/machines/': 'Hack The Box and TryHackMe machine directory',
  '/oscp-like-machines/': 'OSCP-like machines by difficulty',
  '/cpts-like-machines/': 'CPTS-like machines by difficulty',
  '/ippsec-cpts-machines/': 'Unofficial IppSec CPTS preparation track',
  '/osep-like-machines/': 'OSEP-like machines by difficulty',
  '/oswe-like-machines/': 'OSWE-like machines by difficulty',
  '/cwee-like-machines/': 'CWEE-like machines by difficulty',
  '/active-directory-machines/': 'HTB Active Directory machines by difficulty',
  '/pentest-notes/': 'Pentest methodology notes',
  '/methodology-guide/': 'Pentest methodology checklist',
  '/cheatsheet-library/': 'Pentest cheatsheet library',
  '/techniques/': 'Technique hubs',
  '/revshells/': 'Reverse shell cheat sheet',
  '/oscp-exam-scoring-and-time-budget/': 'OSCP exam scoring and 24h time budget',
  '/tj-null-list/': 'TJ Null OSCP list',
  '/oscp-report-template/': 'OSCP report template with CVSS findings',
  '/htb-progress-tracker/': 'HTB and TryHackMe progress tracker',
  '/cpts-exam-guide/': 'HTB CPTS exam guide',
  '/htb-vs-tryhackme/': 'HTB vs TryHackMe comparison',
  '/htb-pro-labs-guide/': 'Hack The Box Pro Labs comparison guide',
  '/oscp-vs-cpts/': 'OSCP vs CPTS comparison',
  '/crto-like-machines/':'CRTO-like machines by difficulty',
};

const externalLink = (href, label) => `<a href="${esc(href)}" rel="noopener">${esc(label)}</a>`;

function sourcesSection(sources) {
  if (!sources || !sources.length) return '';
  return `<h2>Sources</h2>\n<ul>${sources.map(([href, label, note]) => `<li>${externalLink(href, label)}${note ? ` (${esc(note)})` : ''}</li>`).join('')}</ul>`;
}

function slugId(text, seen) {
  const base = String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z0-9#]+;/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
  const count = (seen.get(base) || 0) + 1;
  seen.set(base, count);
  return count > 1 ? `${base}-${count}` : base;
}

function addHeadingIdsAndToc(html) {
  const seen = new Map();
  const headings = [];
  const withIds = html.replace(/<h2(\b[^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    const existing = /\bid="([^"]+)"/.exec(attrs);
    const id = existing ? existing[1] : slugId(plain, seen);
    headings.push([id, plain]);
    return existing ? m : `<h2${attrs} id="${esc(id)}">${inner}</h2>`;
  });
  if (headings.length < 3) return { toc: '', html: withIds };
  const toc = `<nav class="guide-toc" aria-label="On this page"><span class="guide-toc-label">On this page</span><div class="chips">${headings.map(([id, label]) => `<a href="#${esc(id)}">${esc(label)}</a>`).join('')}</div></nav>`;
  return { toc, html: withIds };
}

function faqSection(faq) {
  return `<h2>Frequently asked questions</h2>\n<div class="faq">\n${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}\n</div>`;
}

function relatedSection(related) {
  return `<h2>Related</h2>\n<ul>${related.map((p) => `<li><a href="${p}">${esc(LINKS[p])}</a></li>`).join('')}</ul>`;
}

function buildGuidePages({ model, renderPage, site } = {}) {
  void site;
  const ctx = { model, esc, externalLink, sourcesSection };
  return BUILDERS.map(({ build }) => {
    const g = build(ctx);
    for (const p of g.related) if (!LINKS[p]) throw new Error(`guides: unknown related link ${p} on ${g.path}`);
    if (g.related.length < 3 || g.related.length > 5) throw new Error(`guides: ${g.path} needs 3-5 related links`);
    const url = ORIGIN + g.path;
    const mainSections = [
      g.directAnswer || '',
      g.body,
      ctaBox({ title: esc(g.cta.title), body: esc(g.cta.body), href: g.cta.href, label: g.cta.label }),
      g.faq && g.faq.length ? faqSection(g.faq) : '',
      relatedSection(g.related),
      sourcesSection(g.sources),
    ]
      .filter(Boolean)
      .join('\n');
    const { toc, html: numberedBody } = addHeadingIdsAndToc(mainSections);
    const body = [
      `<p class="lead">${g.lead}</p>`,
      g.topCta ? ctaBox({ body: esc(g.topCta.body), href: g.topCta.href, label: g.topCta.label }) : '',
      toc,
      numberedBody,
      `<p class="note">${esc(g.affil)}</p>`,
    ]
      .filter(Boolean)
      .join('\n');
    const publisher = {
      '@type': 'Organization',
      name: 'ZeroBox',
      url: ORIGIN + '/',
      logo: { '@type': 'ImageObject', url: ORIGIN + '/icon-512.png' },
    };
    const ld = [
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: g.h1,
        description: g.description,
        url,
        mainEntityOfPage: url,
        inLanguage: 'en',
        publisher,
        image: ORIGIN + (ogImageFor(g.path) || { file: '/og.png?v=2' }).file,
      },
      ...(g.faq && g.faq.length ? [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      }] : []),
    ];
    const html = renderPage({
      path: g.path,
      title: g.title,
      description: g.description,
      h1: g.h1,
      body,
      crumbs: [['Home', '/'], [g.crumb, g.path]],
      ld,
      localProgress: g.path === '/tj-null-list/',
    });
    return { path: g.path, title: g.title, description: g.description, html, lastmod: LAST_REVIEWED };
  });
}

module.exports = { buildGuidePages };
