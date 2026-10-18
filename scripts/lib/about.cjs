// About page (/about/). Every sentence restates a fact that already exists elsewhere in the repo:
//   author / links : scripts/lib/layout.cjs (personLd, GITHUB_PROFILE, LINKEDIN, REPO) and package.json "author"
//   what it is     : src/seo/routeMeta.json and scripts/prerender.cjs (module list, exam tracks, "no account")
//   privacy        : scripts/lib/legal.cjs (no accounts, no app analytics, public pages count page views)
//   independence   : the site footer and scripts/lib/legal.cjs (terms: no affiliation, ZNSL 1.0)
//   counts         : the content model, passed in by gen-content-pages.cjs (never typed by hand)
// Public interface: buildAboutPages({ renderPage, stats }) -> [{ path, title, description, html, url }]
const { ORIGIN, esc, ctaBox, REPO, GITHUB_PROFILE, LINKEDIN, ABOUT_PATH, websiteLd, organizationLd, personLd, PERSON_ID } = require('./layout.cjs');

const SRC_FILE = 'scripts/lib/about.cjs';
const TITLE = 'About ZeroBox and Its Creator | ZeroBox';
const DESCRIPTION =
  'ZeroBox is a free offline CTF tracker made by Daniel Dayan (0xdnd). See what it does, how your data stays in your browser and what this site covers.';
const nf = new Intl.NumberFormat('en-US');

function body({ machines, guidedLabs, solved, writeups, techniqueHubs }) {
  return [
    `<p class="lead">ZeroBox is a free tool for tracking Hack The Box and TryHackMe practice and for rehearsing certification exams. It is made by Daniel Dayan (0xdnd), runs in your browser, works offline and keeps your data on your device.</p>`,

    `<h2>What ZeroBox is</h2>`,
    `<p>ZeroBox is a CTF tracker with Kanban, table and grid boards for ${nf.format(machines)} Hack The Box and TryHackMe machines, plus ${nf.format(guidedLabs)} guided labs. It also has a pentest methodology checklist, cheatsheets and reverse shells that fill in your LHOST and LPORT, an exam simulator for OSCP, CPTS, CRTO, OSEP, CRTP, PNPT and OSWE, an Obsidian-style notes viewer, a writeup editor and an evidence vault.</p>`,

    `<h2>Privacy</h2>`,
    `<p>The ZeroBox app has no account, no analytics and no telemetry. Your targets, notes and loot stay in your browser, and the app keeps working offline after your first visit. The public pages on this site, including this one, use cookieless Cloudflare Web Analytics to count page views. The <a href="/privacy/">privacy page</a> has the details.</p>`,

    `<h2>What is on this site</h2>`,
    `<p>The machine pages contain only my own notes. ${nf.format(solved)} machines have an attack path page, and ${nf.format(writeups)} of them link to my full writeup. The site also has ${nf.format(techniqueHubs)} technique hubs, each listing the machines that practise that technique. Active Hack The Box machines are listed by name, operating system, difficulty and a link to the official room, with no writeups.</p>`,
    `<p>Start from the <a href="/machines/">machine directory</a>, the <a href="/techniques/">technique hubs</a> or the <a href="/methodology-guide/">methodology checklist</a>.</p>`,

    `<h2>Independence and license</h2>`,
    `<p>ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec. The source is public on GitHub under the ZeroBox Source-Available Non-Commercial and Educational License (ZNSL 1.0). See the <a href="/terms/">terms</a> for what that means.</p>`,

    `<h2>Find me elsewhere</h2>`,
    `<ul>` +
      `<li><a href="${esc(GITHUB_PROFILE)}" rel="me noopener">Daniel Dayan (0xdnd) on GitHub</a></li>` +
      `<li><a href="${esc(LINKEDIN)}" rel="me noopener">Daniel Dayan on LinkedIn</a></li>` +
      `<li><a href="${esc(REPO)}" rel="noopener">ZeroBox source code</a></li>` +
      `</ul>`,

    ctaBox({ body: 'Try ZeroBox in your browser. No account needed.', href: '/tracker/', label: 'Open tracker' }),
  ].join('\n');
}

function buildAboutPages({ renderPage, stats } = {}) {
  const url = ORIGIN + ABOUT_PATH;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@graph': [
        websiteLd(),
        organizationLd(),
        {
          '@type': 'AboutPage',
          '@id': url + '#webpage',
          url,
          name: TITLE,
          description: DESCRIPTION,
          inLanguage: 'en',
          isPartOf: { '@id': websiteLd()['@id'] },
          mainEntity: { '@id': PERSON_ID },
        },
        personLd(),
      ],
    },
  ];
  return [
    {
      path: ABOUT_PATH,
      title: TITLE,
      description: DESCRIPTION,
      html: renderPage({
        path: ABOUT_PATH,
        title: TITLE,
        description: DESCRIPTION,
        h1: 'About ZeroBox',
        body: body(stats),
        crumbs: [['Home', '/'], ['About', ABOUT_PATH]],
        ogType: 'website',
        ld,
      }),
      url,
    },
  ];
}

module.exports = { buildAboutPages, ABOUT_SRC: SRC_FILE, ABOUT_TITLE: TITLE, ABOUT_DESCRIPTION: DESCRIPTION };
