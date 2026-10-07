// Post-build static prerender for the WEB build only (never run for build:tauri).
// - dist/app-shell.html : the untouched SPA shell (service worker offline fallback)
// - dist/<route>/index.html : shell + unique head metadata + static semantic content
// - dist/index.html : static landing page (no app JS), from scripts/templates/landing.html
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const ORIGIN = 'https://ctftracker.com';
const routes = require(path.join(rootDir, 'src', 'seo', 'routeMeta.json'));
const model = require('./lib/content-model.cjs').getModel();

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
const shellAssets = [...new Set([...shell.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
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
  `<ul style="color:#cbd5e1;padding-left:20px;columns:2">${items.map(([h, l]) => `<li><a href="${esc(h)}" style="color:#10b981">${esc(l)}</a></li>`).join('')}</ul>`;

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
    .map((l) => `<a href="${esc(l.path)}" style="color:#10b981;margin-right:14px">${esc(l.label)}</a>`)
    .join('');
  return (
    `<div data-prerender style="max-width:760px;margin:0 auto;padding:32px 20px;background:#0B0F19;color:#e5e9f0;` +
    `font:16px/1.6 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh">` +
    `<h1 style="font-size:30px;line-height:1.2;margin:0 0 12px">${esc(route.h1)}</h1>` +
    `<p style="color:#9aa6b8">${esc(route.intro)}</p>` +
    `<ul style="color:#cbd5e1;padding-left:20px">${route.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` +
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
  html = setTag(html, /<div id="root">\s*<\/div>/, `<div id="root">${staticBlock(route)}</div>`, '<div id="root">');

  const outDir = path.join(distDir, route.path.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  written++;
}

// ---- Landing page ----
const FAQ = [
  ['Is ZeroBox free?', 'Yes. ZeroBox is free to use in your browser with no signup. The source is public on GitHub under a non-commercial license.'],
  ['Does ZeroBox work offline?', 'Yes. After your first visit a service worker caches the app, so it keeps working without a connection. There is no backend and the app makes no outbound data requests.'],
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
      `          <a class="card" href="${esc(r.path)}"><h3>${esc(NAV_LABEL[r.path] || r.h1)}</h3><p>${esc(CARD_DESC[r.path] || r.description)}</p></a>`
  )
  .join('\n');

const faqHtml = FAQ.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
};

const webAppLd = {
  '@context': 'https://schema.org',
  '@graph': [
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

let landing = fs.readFileSync(path.join(__dirname, 'templates', 'landing.html'), 'utf8');
const subs = {
  '{{FEATURE_CARDS}}': cards,
  '{{BROWSE_CARDS}}': [
    ['/machines/', 'Machine writeups', `${model.machines.filter((m) => m.hasPage).length} solved HTB and THM attack paths, plus a directory of ${model.machines.length} machines.`],
    ['/revshells/', 'Reverse shell cheat sheet', `${model.shellCount} one-liners for Bash, Python, PHP, PowerShell and more.`],
    ['/methodology-guide/', 'Pentest methodology', `${model.phases.length} phases from host discovery to post-exploitation.`],
    ['/cheatsheet-library/', 'Cheatsheets by topic', `${model.topics.length} topics: recon, web, privesc, Active Directory, pivoting.`],
    ['/cpts-notes/', 'CPTS study notes', `${model.notes.length} short notes with commands.`],
  ].map(([h, t, d]) => `          <a class="card" href="${h}"><h3>${esc(t)}</h3><p>${esc(d)}</p></a>`).join('\n'),
  '{{FAQ_HTML}}': faqHtml,
  '{{FAQ_JSONLD}}': jsonLd(faqLd),
  '{{WEBAPP_JSONLD}}': jsonLd(webAppLd),
  '{{SHOT_W}}': String(shotW),
  '{{SHOT_H}}': String(shotH),
};
for (const [k, v] of Object.entries(subs)) landing = landing.split(k).join(v);
landing = landing.replace('<html lang="en">', '<html lang="en" data-zerobox-landing>');
if (/\{\{[A-Z_]+\}\}/.test(landing)) throw new Error('prerender: unreplaced placeholder in landing template');
fs.writeFileSync(path.join(distDir, 'index.html'), landing, 'utf8');

console.log(`✓ Prerender: app-shell.html, ${written} route pages, static landing page`);
