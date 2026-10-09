// Post-build static prerender for the WEB build only (never run for build:tauri).
// - dist/app-shell.html : the untouched SPA shell (service worker offline fallback)
// - dist/<route>/index.html : shell + unique head metadata + static semantic content
// - dist/index.html : static landing page (no app JS), from scripts/templates/landing.html
const fs = require('fs');
const path = require('path');
const { injectBeacon, analyticsNote } = require('./lib/site.cjs');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const ORIGIN = 'https://ctftracker.com';
const routes = require(path.join(rootDir, 'src', 'seo', 'routeMeta.json'));
const { getModel, getGuides } = require('./lib/content-model.cjs');
const model = getModel();

const shellSrc = path.join(distDir, 'index.html');
if (!fs.existsSync(shellSrc)) {
  console.error('prerender: dist/index.html missing; run vite build first.');
  process.exit(1);
}
let shell = fs.readFileSync(shellSrc, 'utf8');
if (shell.includes('data-zerobox-landing')) {
  // Re-run safety: the landing page already replaced index.html; recover the shell.
  shell = fs.readFileSync(path.join(distDir, 'app-shell.html'), 'utf8');
}
// Recovered shells may already carry the app-shell-only noindex; route pages must not inherit it.
shell = shell.replace(/\s*<meta name="robots" content="noindex">/g, '');
if (!/<link rel="canonical"/.test(shell)) shell = shell.replace('</head>', '<link rel="canonical" href="https://ctftracker.com/" />\n</head>');
// app-shell.html is only the offline SPA fallback: noindex and no canonical.
fs.writeFileSync(
  path.join(distDir, 'app-shell.html'),
  shell.replace(/\s*<link rel="canonical"[^>]*>/, '').replace('</head>', '    <meta name="robots" content="noindex">\n  </head>'),
  'utf8'
);

// Precache the shell's hashed JS/CSS so the app works offline after the first visit.
// The static landing page and content pages share a hashed stylesheet and self-hosted fonts; precache them so an offline `/` stays styled.
const { CSS_HREF, THEME_SRC } = require('./lib/layout.cjs');
// The two hero images (window + pacing card) are part of the first paint, so every width of them is precached too.
let heroShots = [];
try {
  heroShots = JSON.parse(fs.readFileSync(path.join(__dirname, 'templates', 'landing-shots.json'), 'utf8')).filter((x) => x.name === 'hero-app' || x.name === 'burn-chart');
} catch (e) {
  heroShots = [];
}
const heroAssets = heroShots.flatMap((x) => (x.srcset || []).map((v) => v.src));
const staticShellAssets = [CSS_HREF, THEME_SRC, '/fonts/inter-latin-var.woff2', '/fonts/jetbrains-mono-latin-var.woff2', ...heroAssets];
const shellAssets = [...new Set([...[...shell.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]), ...staticShellAssets])];
const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  if (!sw.includes('/*__SHELL_ASSETS__*/')) throw new Error('prerender: sw.js placeholder missing');
  fs.writeFileSync(swPath, sw.replace('/*__SHELL_ASSETS__*/[]', JSON.stringify(shellAssets)), 'utf8');
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

function setTag(html, re, replacement, label) {
  if (!re.test(html)) throw new Error(`prerender: could not find ${label} in shell`);
  return html.replace(re, () => replacement);
}

// The shell's #root holds only the boot splash (index.html). Route pages keep it after the SEO block.
const SPLASH_RE = /<div id="boot-splash"[\s\S]*?<\/div>/;
const ROOT_RE = /<div id="root">\s*<div id="boot-splash"[\s\S]*?<\/div>\s*<\/div>/;
const splashMatch = shell.match(SPLASH_RE);
if (!splashMatch) throw new Error('prerender: boot splash missing from shell');
const splashHtml = splashMatch[0];

const NAV_LABEL = {
  '/tracker/': 'CTF tracker',
  '/methodology/': 'Methodology',
  '/cheatsheets/': 'Cheatsheet',
  '/cpts-manual/': 'CPTS notes',
  '/exam/': 'Exam simulator',
  '/writeup/': 'Writeups',
  '/analytics/': 'Analytics',
  '/vault/': 'Evidence vault',
};

const linkList = (items) =>
  `<ul style="color:#f4f4f5;padding-left:20px;columns:2">${items.map(([h, l]) => `<li><a href="${esc(h)}" style="color:#0ea5e9">${esc(l)}</a></li>`).join('')}</ul>`;

function exploreBlock(route) {
  const hubs = [
    ['/machines/', 'HTB and TryHackMe machine writeups and attack paths'],
    ['/cheatsheet-library/', 'OSCP and CTF cheatsheets by topic'],
    ['/methodology-guide/', 'Pentest methodology checklist by phase'],
    ['/revshells/', 'Reverse shell cheat sheet'],
    ['/cpts-notes/', 'CPTS and OSCP study notes'],
  ];
  let extra = '';
  if (route.path === '/methodology/') extra = `<h2 style="font-size:20px">Methodology phases</h2>${linkList(model.phases.map((p) => [`/methodology/${p.slug}/`, p.title]))}`;
  if (route.path === '/cheatsheets/') extra = `<h2 style="font-size:20px">Cheatsheet topics</h2>${linkList(model.topics.map((t) => [`/cheatsheets/${t.slug}/`, `${t.name} cheatsheet`]))}`;
  if (route.path === '/cpts-manual/') extra = `<h2 style="font-size:20px">CPTS notes</h2>${linkList(model.notes.map((n) => [`/cpts-notes/${n.slug}/`, n.title]))}`;
  return `<h2 style="font-size:20px;margin-top:28px">Guides and references</h2>${linkList(hubs)}${extra}`;
}

function staticBlock(route) {
  const links = [{ path: '/', label: 'Home' }, ...routes.map((r) => ({ path: r.path, label: NAV_LABEL[r.path] || r.h1 }))]
    .filter((l) => l.path !== route.path)
    .map((l) => `<a href="${esc(l.path)}" style="color:#0ea5e9;margin-right:14px">${esc(l.label)}</a>`)
    .join('');
  return (
    `<div data-prerender style="max-width:760px;margin:0 auto;padding:32px 20px;background:#09090b;color:#f4f4f5;` +
    `font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh">` +
    `<h1 style="font-size:30px;line-height:1.2;margin:0 0 12px">${esc(route.h1)}</h1>` +
    `<p style="color:#a1a1aa">${esc(route.intro)}</p>` +
    `<ul style="color:#f4f4f5;padding-left:20px">${route.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` +
    `<nav aria-label="ZeroBox sections" style="margin-top:24px;line-height:2">${links}</nav>` +
    exploreBlock(route) +
    `</div>`
  );
}

// ---- Route pages ----
let written = 0;
for (const route of routes) {
  const url = ORIGIN + route.path;
  let html = shell;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`, '<title>');
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${esc(route.description)}" />`, 'meta description');
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`, 'canonical');
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(route.title)}" />`, 'og:title');
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(route.description)}" />`, 'og:description');
  html = setTag(html, /<meta name="twitter:url"[^>]*>/, `<meta name="twitter:url" content="${url}" />`, 'twitter:url');
  html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(route.title)}" />`, 'twitter:title');
  html = setTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(route.description)}" />`, 'twitter:description');
  // Keep the boot splash (from index.html) after the SEO block: hidden for no-JS users, shown by CSS under .js.
  html = setTag(html, ROOT_RE, `<div id="root">${staticBlock(route)}${splashHtml}</div>`, '<div id="root"> with boot splash');

  const outDir = path.join(distDir, route.path.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  written++;
}

// ---- Landing page ----
// One description for <meta name="description">, og:description and twitter:description (kept at 155 chars or fewer).
const META_DESC = 'Free offline CTF tracker for HTB and THM with an OSCP exam simulator, CPTS and CRTO practice, cheatsheets and a pentest methodology checklist.';
if (META_DESC.length > 155) throw new Error(`prerender: landing description is ${META_DESC.length} chars (max 155)`);
const FAQ = [
  ['Is ZeroBox free?', 'Yes. ZeroBox is free to use in your browser with no signup. The source is public on GitHub under a non-commercial license.'],
  ['Does ZeroBox work offline?', 'Yes. After your first visit a service worker caches the app, so it keeps working without a connection. There is no backend and no telemetry, and your data stays on your device. The only outbound request is the optional bring-your-own-key AI scan feature, which is off by default and sends data only when you press send.'],
  ['Where is my data stored?', 'Only in your own browser, in LocalStorage and IndexedDB. Nothing is uploaded to a server. Clearing site data erases it, so use the built-in JSON backup and restore to keep a copy.'],
  ['Can I use it for OSCP prep?', 'Yes. It includes a 24h OSCP exam simulator with scoring, pacing, breaks and evidence proofs, an OSCP cheatsheet with reverse shells, and a pentest methodology checklist. It is an independent tool and not affiliated with OffSec.'],
  ['Does it support Hack The Box and TryHackMe?', 'It ships with a catalog of Hack The Box and TryHackMe machines you can track, and you can add custom targets for any other CTF or lab. It does not connect to your HTB or THM account, so progress is entered by you.'],
  ['Is there a desktop app?', 'Yes. The repository includes a Tauri desktop build that you can compile from source. The instructions are in the GitHub README.'],
];

const CARD_DESC = {
  '/tracker/': 'Kanban, table and grid board for HTB and THM machines.',
  '/methodology/': 'Eight-phase attack lifecycle with copyable commands.',
  '/cheatsheets/': '130+ reverse shells with LHOST and LPORT filled in.',
  '/cpts-manual/': 'Obsidian-style notes with wikilinks and a private vault.',
  '/exam/': 'Timed OSCP, CPTS and CRTO practice with scoring.',
  '/writeup/': 'Markdown writeups with live preview and export.',
  '/analytics/': 'Skill radar, activity heatmap and benchmarks.',
  '/vault/': 'Credentials, flags and hashes from every target.',
};

const cards = routes
  .map(
    (r) =>
      `          <a class="mod" href="${esc(r.path)}"><h3>${esc(NAV_LABEL[r.path] || r.h1)}</h3><p>${esc(CARD_DESC[r.path] || r.description)}</p></a>`
  )
  .join('\n');

const faqHtml = FAQ.map(([q, a], i) => `        <details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

const { organizationLd, websiteLd } = require('./lib/layout.cjs');
const webAppLd = {
  '@context': 'https://schema.org',
  '@graph': [
    organizationLd(),
    websiteLd(),
    {
      '@type': 'WebApplication',
      '@id': ORIGIN + '/#webapp',
      name: 'ZeroBox — Tactical Cybersecurity Lab & CTF Tracker',
      url: ORIGIN + '/',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript and modern browser',
      description:
        'Offline-first tracker for Hack The Box, TryHackMe and OSCP/CPTS prep with a Kanban board, reverse shell cheatsheet and 24h exam simulator.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'Daniel Dayan', url: 'https://github.com/0xdnd' },
    },
    {
      '@type': 'ItemList',
      name: 'ZeroBox Modules',
      itemListElement: routes.map((r, i) => ({
        '@type': 'SiteNavigationElement',
        position: i + 1,
        name: NAV_LABEL[r.path] || r.h1,
        url: ORIGIN + r.path,
        description: CARD_DESC[r.path] || r.description,
      })),
    },
  ],
};

// Screenshot
const shotSrc = path.join(rootDir, '.github', 'assets', 'screenshot.png');
let shotW = 1600;
let shotH = 900;
if (fs.existsSync(shotSrc)) {
  const buf = fs.readFileSync(shotSrc);
  shotW = buf.readUInt32BE(16);
  shotH = buf.readUInt32BE(20);
  fs.mkdirSync(path.join(distDir, 'images'), { recursive: true });
  fs.copyFileSync(shotSrc, path.join(distDir, 'images', 'screenshot.png'));
} else {
  console.warn('prerender: .github/assets/screenshot.png missing');
}

// ---- Landing images, proof strip and guide list (counts come from the content model, never hardcoded) ----
// Landing screenshots: scripts/templates/landing-shots.json ([{name, alt, width, height, srcset:[{src,w}]}]) when present,
// otherwise every slot falls back to /images/screenshot.png so the page works before and after the shots land.
// Slots: hero-app (hero window), burn-chart (hero pacing card), graph, table, vault, exam. A missing entry falls back, it never throws.
let shotList = [];
try {
  shotList = JSON.parse(fs.readFileSync(path.join(__dirname, 'templates', 'landing-shots.json'), 'utf8'));
} catch (e) {
  shotList = [];
}
const shotByName = Object.fromEntries((Array.isArray(shotList) ? shotList : []).map((s) => [s.name, s]));
const hasShot = (s) => s && Array.isArray(s.srcset) && s.srcset.length > 0;
// Rendered width of the hero window: 480px column >=1100, 400px >=900, 320px >=640, then the full width (max 420px) stacked.
const HERO_SIZES = '(min-width:1100px) 480px,(min-width:900px) 400px,(min-width:640px) 320px,calc(100vw - 32px)';
const srcsetOf = (s) => s.srcset.map((x) => `${x.src} ${x.w}w`).join(', ');
const srcOf = (s) => s.srcset.reduce((a, b) => (b.w > a.w ? b : a)).src;

function shotImg(name, { sizes, eager = false, cls = '', alt } = {}) {
  const s = shotByName[name];
  const real = hasShot(s);
  const attrs = [
    cls ? `class="${cls}"` : '',
    `src="${esc(real ? srcOf(s) : '/images/screenshot.png')}"`,
    real ? `srcset="${esc(srcsetOf(s))}"` : '',
    real && sizes ? `sizes="${esc(sizes)}"` : '',
    alt === '' ? 'aria-hidden="true"' : '',
    `width="${real ? s.width : shotW}"`,
    `height="${real ? s.height : shotH}"`,
    `alt="${esc(alt !== undefined ? alt : real && s.alt ? s.alt : SHOT_ALT[name])}"`,
    eager === 'high' || eager === true ? 'fetchpriority="high" decoding="async"' : eager ? 'loading="eager" decoding="async"' : 'loading="lazy" decoding="async"',
  ].filter(Boolean);
  return `<img ${attrs.join(' ')} />`;
}

// Hero scene: the app window (`hero-app`, browser chrome built in HTML/CSS) with an "Exam pacing" card (`burn-chart`) on its corner.
// Exactly two images at every width, no art direction: the same file is used everywhere. Only the window image is fetchpriority=high (the LCP element).
function heroPicture() {
  return shotImg('hero-app', { sizes: HERO_SIZES, eager: true });
}

// Single preload for the hero image.
function heroPreload() {
  const s = shotByName['hero-app'];
  if (!hasShot(s)) return '  <link rel="preload" as="image" href="/images/screenshot.png" fetchpriority="high" />';
  return `  <link rel="preload" as="image" imagesrcset="${esc(srcsetOf(s))}" imagesizes="${esc(HERO_SIZES)}" fetchpriority="high" />`;
}

// Pacing card image (decorative, eager but not high priority so it never competes with the LCP image), else the exam shot.
// Card width: 280px >=1100, 240px >=900, 200px >=640, then 62% of the (max 420px) media column, capped at 230px.
const HUD_SIZES = '(min-width:1100px) 280px,(min-width:900px) 240px,(min-width:640px) 200px,min(calc((100vw - 32px) * .62),230px)';
const heroHud = () =>
  hasShot(shotByName['burn-chart'])
    ? shotImg('burn-chart', { sizes: HUD_SIZES, alt: '', eager: 'low' })
    : shotImg('exam', { sizes: HUD_SIZES, alt: '', eager: 'low' });

const { siteHeader, siteFooter, fontPreloadTags, ICON, REPO } = require('./lib/layout.cjs');
// The repo publishes releases (checked with gh release list), so the desktop CTA goes straight to the latest one.
const DESKTOP_HREF = REPO + '/releases/latest';

const EXAM_TRACKS = ['OSCP','CPTS', 'CRTO', 'OSEP', 'CRTP'];
const nf = new Intl.NumberFormat('en-US');
const proofItem = (value, label) => `          <li><span class="num">${esc(value)}</span><span class="lbl">${esc(label)}</span></li>`;
const proofStrip = [
  proofItem(nf.format(model.machines.length), 'machines catalogued'),
  proofItem(nf.format(model.shellCount), 'reverse shells'),
  proofItem(String(EXAM_TRACKS.length), 'exam tracks'),
  `          <li class="proof-text"><span class="num">No account</span><a class="link-arrow" href="${REPO}" rel="noopener">Source on GitHub${ICON.ext}</a></li>`,
].join('\n');

// [href, title, description, count]; count is optional (mono figure after the title, with its unit).
const GUIDES = [
  ['/machines/', 'Machine writeups', `${model.machines.filter((m) => m.hasPage).length} solved attack paths, plus a directory of every HTB and THM box.`, `${nf.format(model.machines.length)} boxes`],
  ['/revshells/', 'Reverse shell cheat sheet', 'One-liners for Bash, Python, PHP, PowerShell and more.', `${nf.format(model.shellCount)} shells`],
  ['/methodology-guide/', 'Pentest methodology', 'From host discovery to post-exploitation.', `${model.phases.length} phases`],
  ['/cheatsheet-library/', 'Cheatsheets by topic', 'Recon, web, privesc, Active Directory, pivoting.', `${model.topics.length} topics`],
  ['/oscp-like-machines/', 'OSCP-like machines', 'HTB and THM boxes for OSCP prep, grouped by difficulty.', `${model.machines.filter((m) => (m.certifications || []).includes('OSCP')).length} boxes`],
  ['/techniques/', 'Pentest techniques', 'Active Directory, SQL injection, privilege escalation and pivoting, with commands and practice machines.', ''],
  ['/cpts-notes/', 'CPTS study notes', 'Short notes with commands.', `${model.notes.length} notes`],
];
// Long-form guides from scripts/lib/guides.cjs (none when the file is absent). Short card copy per path; the
// guide's own description is the fallback for any guide added later.
const GUIDE_CARD = {
  '/oscp-exam-scoring-and-time-budget/': ['OSCP exam scoring and time budget', 'Point structure, passing combinations and an hour-by-hour 24h plan.'],
  '/tj-null-list/': ['TJ Null OSCP list', 'What the list is, how to work it, and the HTB boxes from it you can track.'],
  '/oscp-report-template/': ['OSCP report template', 'A Markdown report skeleton with a finding template and a CVSS 3.1 example.'],
  '/htb-progress-tracker/': ['HTB and THM progress tracker', 'What the platforms do not track, and a workflow that fills the gap.'],
  '/cpts-exam-guide/': ['HTB CPTS exam guide', 'Exam format, flags, passing requirement and a day-by-day pacing plan.'],
};
const guidePages = getGuides();
for (const g of guidePages) {
  const [t, d] = GUIDE_CARD[g.path] || [g.title, g.description];
  GUIDES.push([g.path, t, d, '']);
}
const hasGuide = (p) => guidePages.some((g) => g.path === p);
// One line in the exam section pointing at the scoring and report guides (empty when they are absent).
const examGuides =
  hasGuide('/oscp-exam-scoring-and-time-budget/') && hasGuide('/oscp-report-template/')
    ? '        <p>Planning your 24 hours? Read the <a href="/oscp-exam-scoring-and-time-budget/">OSCP scoring and time budget guide</a> and start your write-up from the <a href="/oscp-report-template/">OSCP report template</a>.</p>'
    : '';
const guideList = GUIDES.map(
  ([h, t, d, n]) =>
    `          <li><a href="${h}"><span class="g-h"><span class="g-t">${esc(t)}</span>${n ? `<span class="g-n">${esc(n)}</span>` : ''}</span><span class="g-d">${esc(d)}</span></a></li>`
).join('\n');

let landing = fs.readFileSync(path.join(__dirname, 'templates', 'landing.html'), 'utf8');
const subs = {
  '{{CSS_HREF}}': CSS_HREF,
  '{{THEME_SRC}}': THEME_SRC,
  '{{FONT_PRELOAD}}': fontPreloadTags(),
  '{{HERO_PRELOAD}}': heroPreload(),
  '{{SITE_HEADER}}': siteHeader({ current: '/' }),
  '{{SITE_FOOTER}}': siteFooter({ analyticsNote: analyticsNote() }),
  '{{IMG_HERO}}': heroPicture(),
  '{{IMG_HUD}}': heroHud(),
  '{{IMG_GRAPH}}': shotImg('graph', { sizes: '(min-width:1152px) 1120px,calc(100vw - 32px)' }),
  '{{IMG_TABLE}}': shotImg('table', { sizes: '(min-width:1152px) 643px,(min-width:900px) 58vw,calc(100vw - 32px)' }),
  '{{IMG_VAULT}}': shotImg('vault', { sizes: '(min-width:1152px) 453px,(min-width:900px) 41vw,calc(100vw - 32px)' }),
  '{{IMG_EXAM}}': shotImg('exam', { sizes: '(min-width:1152px) 625px,(min-width:900px) 58vw,calc(100vw - 32px)' }),
  '{{ICON_ARROW}}': ICON.arrow,
  '{{REPO_HREF}}': REPO,
  '{{ICON_EXT}}': ICON.ext,
  '{{DESKTOP_HREF}}': DESKTOP_HREF,
  '{{PROOF_STRIP}}': proofStrip,
  '{{TRACK_PILLS}}': EXAM_TRACKS.map((t) => `<li>${esc(t)}</li>`).join(''),
  '{{FEATURE_CARDS}}': cards,
  '{{BROWSE_CARDS}}': guideList,
  '{{META_DESC}}': esc(META_DESC),
  '{{EXAM_GUIDES}}': examGuides,
  '{{FAQ_HTML}}': faqHtml,
  '{{FAQ_JSONLD}}': jsonLd(faqLd),
  '{{WEBAPP_JSONLD}}': jsonLd(webAppLd),
  '{{ANALYTICS_NOTE}}': analyticsNote(),
  '{{SHOT_W}}': String(shotW),
  '{{SHOT_H}}': String(shotH),
};
for (const [k, v] of Object.entries(subs)) landing = landing.split(k).join(v);
landing = landing.replace('<html lang="en">', '<html lang="en" data-zerobox-landing>');
if (/\{\{[A-Z_]+\}\}/.test(landing)) throw new Error('prerender: unreplaced placeholder in landing template');
fs.writeFileSync(path.join(distDir, 'index.html'), injectBeacon(landing), 'utf8');

console.log(`✓ Prerender: app-shell.html, ${written} route pages, static landing page`);
