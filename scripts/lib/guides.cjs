// Long-form guide pages (OSCP scoring, TJ Null list, report template, progress tracker, CPTS exam).
// Each page lives in ./guides/<name>.cjs and exports build(ctx) -> page spec; this file adds the shared chrome
// (lead, CTA, FAQ + FAQPage JSON-LD from the same array, Related, last-reviewed note, TechArticle JSON-LD).
// Public interface: buildGuidePages({ model, renderPage, site }) -> [{ path, title, description, html, lastmod }]
const { ORIGIN, esc, ctaBox } = require('./layout.cjs');

const LAST_REVIEWED = '2026-10-08';

const BUILDERS = [
  require('./guides/oscp-scoring.cjs'),
  require('./guides/tj-null.cjs'),
  require('./guides/report-template.cjs'),
  require('./guides/progress-tracker.cjs'),
  require('./guides/cpts-exam.cjs'),
];

// Internal link targets guides may use in Related lists (label shown on the page).
const LINKS = {
  '/tracker/': 'CTF and HTB machine tracker',
  '/exam/': 'Exam simulator',
  '/machines/': 'Hack The Box and TryHackMe machine directory',
  '/oscp-like-machines/': 'OSCP-like machines by difficulty',
  '/cpts-like-machines/': 'CPTS-like machines by difficulty',
  '/cpts-notes/': 'CPTS study notes',
  '/methodology-guide/': 'Pentest methodology checklist',
  '/cheatsheet-library/': 'Pentest cheatsheet library',
  '/techniques/': 'Technique hubs',
  '/revshells/': 'Reverse shell cheat sheet',
  '/oscp-exam-scoring-and-time-budget/': 'OSCP exam scoring and 24h time budget',
  '/tj-null-list/': 'TJ Null OSCP list',
  '/oscp-report-template/': 'OSCP report template with CVSS findings',
  '/htb-progress-tracker/': 'HTB and TryHackMe progress tracker',
  '/cpts-exam-guide/': 'HTB CPTS exam guide',
};

const externalLink = (href, label) => `<a href="${esc(href)}" rel="noopener">${esc(label)}</a>`;

function sourcesSection(sources) {
  if (!sources || !sources.length) return '';
  return `<h2>Sources</h2>\n<ul>${sources.map(([href, label, note]) => `<li>${externalLink(href, label)}${note ? ` (${esc(note)})` : ''}</li>`).join('')}</ul>`;
}

function faqSection(faq) {
  return `<h2>Frequently asked questions</h2>\n${faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}`;
}

function relatedSection(related) {
  return `<h2>Related</h2>\n<ul>${related.map((p) => `<li><a href="${p}">${esc(LINKS[p])}</a></li>`).join('')}</ul>`;
}

function buildGuidePages({ model, renderPage, site } = {}) {
  void site;
  const ctx = { model, esc, externalLink, sourcesSection, LAST_REVIEWED };
  return BUILDERS.map(({ build }) => {
    const g = build(ctx);
    for (const p of g.related) if (!LINKS[p]) throw new Error(`guides: unknown related link ${p} on ${g.path}`);
    if (g.related.length < 3 || g.related.length > 5) throw new Error(`guides: ${g.path} needs 3-5 related links`);
    const url = ORIGIN + g.path;
    const body = [
      `<p class="lead">${g.lead}</p>`,
      g.body,
      ctaBox({ title: esc(g.cta.title), body: esc(g.cta.body), href: g.cta.href, label: g.cta.label }),
      faqSection(g.faq),
      relatedSection(g.related),
      sourcesSection(g.sources),
      `<p class="note">Last reviewed: ${LAST_REVIEWED}. ${esc(g.affil)}</p>`,
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
        datePublished: LAST_REVIEWED,
        dateModified: LAST_REVIEWED,
        author: { '@type': 'Organization', name: 'ZeroBox', url: ORIGIN + '/' },
        publisher,
        image: ORIGIN + '/og.png',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ];
    const html = renderPage({
      path: g.path,
      title: g.title,
      description: g.description,
      h1: g.h1,
      body,
      crumbs: [['Home', '/'], [g.crumb, g.path]],
      ld,
    });
    return { path: g.path, title: g.title, description: g.description, html, lastmod: LAST_REVIEWED };
  });
}

module.exports = { buildGuidePages };
