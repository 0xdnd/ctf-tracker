// Post-build static content pages for the WEB build only (runs after prerender).
// Generates indexable HTML from the app's own data: machines, cheatsheets, methodology,
// reverse shells, pentest methodology notes, plus dist/static.css and dist/sitemap.xml.
// Old URLs that moved get small noindex redirect stubs (meta refresh + canonical); they stay out of the sitemap.
const fs = require('fs');
const path = require('path');
const { getModel, getGuides, slugify } = require('./lib/content-model.cjs');
const TECH = require('./lib/techniques.cjs');
const { injectBeacon } = require('./lib/site.cjs');
const { ORIGIN, esc, renderPage, render404Page, STATIC_CSS, ctaBox, fitTitle, truncate, techArticleLd, stampArticle } = require('./lib/layout.cjs');

const rootDir = path.resolve(__dirname, '..');
// GEN_CONTENT_DIST points the generator at another output dir (used by tests); then public/sitemap.xml is left alone.
const distOverride = process.env.GEN_CONTENT_DIST ? path.resolve(process.env.GEN_CONTENT_DIST) : null;
const distDir = distOverride || path.join(rootDir, 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('gen-content-pages: dist/index.html missing; run vite build + prerender first.');
  process.exit(1);
}

fs.rmSync(path.join(distDir, 'machines'), { recursive: true, force: true });
const model = getModel();
const routes = require(path.join(rootDir, 'src', 'seo', 'routeMeta.json'));
const { execFileSync } = require('child_process');
const lmCache = new Map();
// Last resort when not even the generator has a git date (no git at all): a fixed epoch-style date, not the build day.
const FALLBACK_DATE = '2026-01-01';
const git = (args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
// Date a source file last changed: its last git commit date (cached, one git call per distinct path). Never the build date:
// when git or history is unavailable (or the file is untracked) it falls back to the generator's own last commit date.
const GEN_FILE = 'scripts/gen-content-pages.cjs';
function gitDate(rel) {
  if (!lmCache.has(rel)) {
    let v = '';
    try {
      v = git(['log', '-1', '--format=%cs', '--', rel]);
    } catch (e) {
      v = '';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) v = rel === GEN_FILE ? FALLBACK_DATE : gitDate(GEN_FILE);
    lmCache.set(rel, v);
  }
  return lmCache.get(rel);
}
// Date a source file was first committed (its earliest git commit); '' when git or history is unavailable.
const firstCache = new Map();
function firstGitDate(rel) {
  if (!firstCache.has(rel)) {
    let v = '';
    try {
      v = git(['log', '--reverse', '--format=%cs', '--', rel]).split(/\r?\n/)[0] || '';
    } catch (e) {
      v = '';
    }
    firstCache.set(rel, /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  }
  return firstCache.get(rel);
}
const minFirstDate = (...rels) => rels.map(firstGitDate).filter(Boolean).sort()[0] || '';
const maxDate = (...ds) => ds.filter(Boolean).sort().pop();
const SRC = {
  machines: 'src/data/machinesCatalog.ts',
  cheatsheet: 'src/data/cheatsheetsData.ts',
  methodology: 'src/data/methodologyFramework.ts',
  revshells: 'src/data/revshellsData.ts',
  notes: 'scripts/content/methodology-notes.json',
};
const TYPE_SRC = {
  'machine-detail': 'machines', 'machines-hub': 'machines', cheatsheet: 'cheatsheet', 'cheatsheet-hub': 'cheatsheet',
  'methodology-phase': 'methodology', 'methodology-hub': 'methodology', revshells: 'revshells', 'pentest-note': 'notes', 'pentest-hub': 'notes',
};
const maxDateOf = (...rels) => maxDate(...rels.map(gitDate));
const MACHINE_SRC = [SRC.machines, 'scripts/data/machine-notes.json', 'scripts/lib/techniques.cjs'];
const pages = []; // { loc, type, lastmod }
const counts = {};
const seenMeta = { title: new Map(), description: new Map() };

// priority stays in the signature for the callers but is no longer written anywhere (Google ignores it).
// srcs: the page's source files, for datePublished (defaults to the type's source). lastmod is the page's dateModified and sitemap lastmod.
function emit(type, urlPath, html, priority, lastmodOverride, srcs) {
  const lastmod = lastmodOverride !== undefined ? lastmodOverride : gitDate(SRC[TYPE_SRC[type]]);
  html = stampArticle(html, { modified: lastmod, published: minFirstDate(...(srcs || [SRC[TYPE_SRC[type]]]).filter(Boolean)) });
  const dir = path.join(distDir, urlPath.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), injectBeacon(html), 'utf8');
  for (const [k, re] of [['title', /<title>([^<]*)<\/title>/], ['description', /<meta name="description" content="([^"]*)"/]]) {
    const v = (re.exec(html) || [])[1];
    if (v && seenMeta[k].has(v)) console.warn(`DUPLICATE ${k}: ${urlPath} and ${seenMeta[k].get(v)}`);
    else if (v) seenMeta[k].set(v, urlPath);
  }
  pages.push({ loc: urlPath, type, priority, lastmod });
  counts[type] = (counts[type] || 0) + 1;
}

// Moved page: a tiny noindex stub with a canonical to the new URL and a meta refresh (no inline script, so the
// CSP step has nothing to hash). Never added to `pages`, so it stays out of the sitemap.
const redirects = [];
function writeRedirectStub(fromPath, toPath) {
  const target = ORIGIN + toPath;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self' data:;" />
  <title>Page moved | ZeroBox</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="${esc(target)}" />
  <meta http-equiv="refresh" content="0; url=${esc(toPath)}" />
</head>
<body>
  <main>
    <h1>This page has moved</h1>
    <p>It now lives at <a href="${esc(toPath)}">${esc(target)}</a>.</p>
  </main>
</body>
</html>
`;
  const dir = path.join(distDir, fromPath.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  redirects.push([fromPath, toPath]);
}

// Prefix plus as many items as fit in a 155-char description, ending in a period.
function listFit(prefix, items, max = 155) {
  let out = prefix.replace(/\s+$/, ' ');
  const used = [];
  for (const it of items) {
    const next = out + (used.length ? ', ' : '') + it;
    if (next.length + 1 > max) continue;
    out = next;
    used.push(it);
  }
  return used.length ? out + '.' : prefix.replace(/[\s,]*including\s*$/, '.');
}

const card = (href, title, desc) =>
  `<a class="card" href="${href}"><h2>${esc(title)}</h2><p>${esc(desc)}</p></a>`;

// Hub card that previews a few commands; not an <a> because it holds links and code blocks.
const previewCard = (href, title, desc, commands, moreLabel) =>
  `<div class="card card-preview"><h2><a href="${href}">${esc(title)}</a></h2><p>${esc(desc)}</p>${commands.slice(0, 3).map(code).join('')}<a class="card-more" href="${href}">${esc(moreLabel)}</a></div>`;

const code = (s) => `<pre><code>${esc(s)}</code></pre>`;
const stripEmoji = (s) => s.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// ===================== Machines =====================
const PLATFORM_TAG = /^(htb|thm)$/i;
const GENERIC_TAGS = new Set(['ctf', 'linux', 'windows', 'privesc', 'web', 'easy', 'medium', 'hard', 'insane', 'starting point', 'tier 0', 'tier 1', 'tier 2']);
const withPage = model.machines.filter((m) => m.hasPage);
const tagIndex = new Map();
for (const m of withPage) {
  for (const t of m.tags || []) {
    const k = t.toLowerCase();
    if (GENERIC_TAGS.has(k)) continue;
    if (!tagIndex.has(k)) tagIndex.set(k, []);
    tagIndex.get(k).push(m);
  }
}

function related(m) {
  const score = new Map();
  for (const t of m.tags || []) {
    const list = tagIndex.get(t.toLowerCase());
    if (!list) continue;
    for (const o of list) if (o !== m) score.set(o, (score.get(o) || 0) + 1 + (o.platform === m.platform ? 0.1 : 0) + (o.os === m.os ? 0.1 : 0));
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name))
    .slice(0, 6)
    .map((e) => e[0]);
}

const wordCounts = [];
// ---- Hub data (certification + technique groups), computed early so machine pages and the machines hub can link to them ----
const CERT_MIN = 10;
const TECH_MIN = 5;
const certCountsAll = {};
for (const m of model.machines) for (const c of m.certifications || []) certCountsAll[c] = (certCountsAll[c] || 0) + 1;
const CERT_NAME = {
  'HTB-Starting-Point': 'HTB Starting Point',
  'IppSec-CPTS': 'Unofficial IppSec CPTS',
  'Active-Directory': 'HTB Active Directory',
};
const CERT_SLUG = {
  'HTB-Starting-Point': 'htb-starting-point-machines',
  'IppSec-CPTS': 'ippsec-cpts-machines',
  'Active-Directory': 'active-directory-machines',
};
const certHubs = Object.entries(certCountsAll)
  .filter(([, n]) => n >= CERT_MIN)
  .sort((a, b) => b[1] - a[1])
  .map(([cert]) => ({
    cert,
    name: CERT_NAME[cert] || cert,
    slug: CERT_SLUG[cert] || (slugify(cert) + '-like-machines'),
    machines: model.machines.filter((m) => (m.certifications || []).includes(cert)),
  }));
const techGroups = TECH.GROUPS.map((g) => ({ ...g, machines: model.machines.filter((m) => TECH.matchesMachine(g, m)) })).filter((g) => g.machines.length >= TECH_MIN);
const certFirst = certHubs.find((c) => c.cert === 'OSCP') || certHubs[0];
const PLATFORM_NAME = { HTB: 'Hack The Box', THM: 'TryHackMe' };
const DIFF_ORDER = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const mUrl = (m) => `/machines/${m.slug}/`;
const SAFE_ROOM = /^https:\/\/(www\.)?(app\.hackthebox\.com|tryhackme\.com)\//;

// Guide pages (scripts/lib/guides.cjs); empty when the file is absent. Chips only render for guides that exist.
const guides = getGuides();
const guideByPath = new Map(guides.map((g) => [g.path, g]));
const GUIDE_LABEL = {
  '/oscp-exam-scoring-and-time-budget/': 'OSCP exam scoring and time budget',
  '/tj-null-list/': 'TJ Null OSCP list',
  '/oscp-report-template/': 'OSCP report template',
  '/htb-progress-tracker/': 'HTB progress tracker',
  '/cpts-exam-guide/': 'HTB CPTS exam guide',
  '/htb-vs-tryhackme/': 'HTB vs TryHackMe',
  '/htb-pro-labs-guide/': 'HTB Pro Labs guide',
};
const guideChips = (paths) => paths.filter((p) => guideByPath.has(p)).map((p) => `<a href="${p}">${esc(GUIDE_LABEL[p] || guideByPath.get(p).title)}</a>`).join('');
// Guides that belong on a certification hub.
const CERT_GUIDES = {
  OSCP: ['/tj-null-list/', '/oscp-exam-scoring-and-time-budget/', '/oscp-report-template/', '/htb-vs-tryhackme/', '/htb-pro-labs-guide/'],
  CPTS: ['/cpts-exam-guide/', '/htb-pro-labs-guide/', '/htb-vs-tryhackme/'],
  'IppSec-CPTS': ['/cpts-exam-guide/', '/htb-pro-labs-guide/'],
  CRTO: ['/htb-pro-labs-guide/'],
  'Active-Directory': ['/htb-pro-labs-guide/', '/cpts-exam-guide/'],
  OSEP: ['/htb-pro-labs-guide/'],
};

// Guide links for a page: the guides of its certifications (in the order given), then the general platform guides, deduped and capped.
const DEFAULT_GUIDES = ['/htb-vs-tryhackme/', '/htb-progress-tracker/'];
const guideLinks = (certs, max = 5) =>
  [...new Set([...certs.flatMap((c) => CERT_GUIDES[c] || []), ...DEFAULT_GUIDES])]
    .filter((p) => guideByPath.has(p))
    .slice(0, max)
    .map((p) => `<a href="${p}">${esc(GUIDE_LABEL[p] || guideByPath.get(p).title)}</a>`);

const normTag = (t) => String(t).toLowerCase().replace(/[-_]+/g, ' ').trim();
const tagTargets = [
  ...model.topics.map((t) => ({ keys: [t.id, t.slug, t.name], href: `/cheatsheets/${t.slug}/` })),
  ...model.phases.map((p) => ({ keys: [p.slug, p.shortTitle], href: `/methodology/${p.slug}/` })),
].map((x) => ({ ...x, keys: x.keys.map(normTag) }));
function tagLink(t) {
  const tech = techGroups.find((g) => TECH.matchesTag(g, t));
  if (tech) return `<a class="tag" href="/techniques/${tech.slug}/">${esc(t)}</a>`;
  const n = normTag(t);
  const hit = tagTargets.find((x) => x.keys.includes(n));
  return hit ? `<a class="tag" href="${hit.href}">${esc(t)}</a>` : `<span class="tag">${esc(t)}</span>`;
}
const ROOM_REL = 'nofollow noopener';
// "a" or "an" by the first letter of the word that follows (an easy, an insane, a medium).
const article = (word) => (/^[aeiou]/i.test(String(word).trim()) ? 'an' : 'a');

// Meta description for a machine page: the hint's first sentence when it fits as a complete sentence, else a facts-based sentence.
function machineDesc(m, summary, tagList) {
  const kindWord = m.ownWriteup ? 'writeup' : 'attack path';
  const first = String(summary).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/)[0];
  const lead = `${m.name} ${m.platform} ${kindWord}: `;
  // A usable hint is a real sentence (not a stub like "Hack The Box Linux machine." or the generated "Solved ..." line).
  if (first && first.length >= 45 && !/^Solved /.test(first) && !/[{}]/.test(first) && /[.!?]$/.test(first) && lead.length + first.length <= 155) return lead + first;
  const techs = machineTech(m).slice(0, 3).map((e) => e.g.name);
  const diff = m.difficulty.toLowerCase();
  return `${m.name} is ${article(diff)} ${diff} ${m.os} machine on ${m.platform}. ${techs.length ? `My ${kindWord} covers ${techs.join(', ')}.` : `Read my ${kindWord} and the techniques it trains.`}`;
}

// Technique hubs a machine belongs to: tag matches first (most hits first), then the explicit per-machine fallbacks.
function machineTech(m) {
  const fallback = TECH.overrideSlugs(m);
  return techGroups
    .map((g) => ({ g, hits: (m.tags || []).filter((t) => TECH.matchesTag(g, t)) }))
    .filter((e) => e.hits.length || fallback.includes(e.g.slug))
    .sort((a, b) => b.hits.length - a.hits.length || a.g.name.localeCompare(b.g.name));
}

// "Related" block on a machine page: its certification hubs and the technique hubs its tags match.
function relatedHubs(m) {
  const certLinks = (m.certifications || [])
    .map((c) => certHubs.find((h) => h.cert === c))
    .filter(Boolean)
    .map((h) => `<li>${h.cert === 'HTB-Starting-Point' ? 'Track' : 'Certification'}: <a href="/${h.slug}/">${esc(h.name)} machines (${h.machines.length})</a></li>`);
  const techLinks = machineTech(m)
    .slice(0, 4)
    .map(({ g }) => `<li>Technique: <a href="/techniques/${g.slug}/">${esc(g.name)} (${g.machines.length} machines)</a></li>`);
  const guideLine = guideLinks(m.certifications || []);
  const links = [...certLinks, ...techLinks, ...(guideLine.length ? [`<li>Guides: ${guideLine.join(', ')}</li>`] : []), '<li>All machines: <a href="/machines/">Hack The Box and TryHackMe directory</a></li>'];
  return `<h2>Related</h2><ul>${links.join('')}</ul>`;
}

// First sentence of a technique explainer, used as the one-line explanation on a machine page.
const firstSentence = (t) => String(t).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/)[0];
const joinList = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '');
const solvedAll = (list) => list.filter((x) => x.hasPage).length;

// Second lead sentence: the technique hubs this machine maps to (from its own tags and overrides); empty when it maps to none.
function leadTech(m) {
  const names = machineTech(m).slice(0, 3).map((e) => e.g.name);
  return names.length ? ` It maps to the ${names.length > 1 ? 'technique hubs' : 'technique hub'} ${esc(names.join('; '))}.` : '';
}

// "Overview" paragraph built only from catalog fields (platform, OS, difficulty, tags, certifications).
function machineOverview(m, plat, tagList) {
  const parts = [];
  parts.push(`${esc(m.name)} is ${article(m.difficulty)} ${esc(m.difficulty.toLowerCase())} ${esc(m.os)} machine from ${esc(plat)}`);
  const sentences = [`${parts[0]}${tagList.length ? ` that I tagged with ${esc(joinList(tagList.slice(0, 6)))}` : ''}.`];
  const certs = m.certifications || [];
  if (certs.length) sentences.push(`${esc(m.name)} counts toward the ${esc(joinList(certs.map((c) => CERT_NAME[c] || c)))} practice ${certs.length > 1 ? 'lists' : 'list'} in the ZeroBox catalog.`);
  return `<h2>Overview</h2><p>${sentences.join(' ')}</p>`;
}

// "Techniques explained": each technique hub the machine's tags match, with the hub's first explainer sentence and the matching tags.
function techniqueExplained(m) {
  const items = machineTech(m)
    .slice(0, 5)
    .map(({ g, hits: hit }, i) => `<li><a href="/techniques/${g.slug}/">${esc(g.name)}</a>: ${i === 0 ? `${esc(firstSentence(g.explainer))} ` : ''}${hit.length ? `${esc(m.name)} matches it by the ${hit.length > 1 ? 'tags' : 'tag'} ${esc(joinList(hit))}; ` : `The catalog files ${esc(m.name)} under it; `}${g.machines.length} catalog machines practise it, ${solvedAll(g.machines)} of them solved by me.</li>`);
  return items.length ? `<h2>Techniques explained</h2><ul>${items.join('')}</ul>` : '';
}

// "Where it fits": its certification lists and its place among catalog machines of the same platform and difficulty.
function machinePlace(m, plat) {
  const same = model.machines.filter((o) => o.platform === m.platform && o.difficulty === m.difficulty);
  const sameOs = same.filter((o) => o.os === m.os);
  const items = (m.certifications || [])
    .map((c) => certHubs.find((h) => h.cert === c))
    .filter(Boolean)
    .map((h) => {
      const sameDiff = h.machines.filter((o) => o.difficulty === m.difficulty);
      return `<li><a href="/${h.slug}/">${esc(h.name)} machine list</a>: ${esc(m.name)} is one of ${sameDiff.length} ${esc(m.difficulty.toLowerCase())} machines on a list of ${h.machines.length}, and I solved ${solvedAll(h.machines)} of the ${h.machines.length}.</li>`;
    });
  items.push(`<li>${esc(m.name)} is one of ${same.length} ${esc(m.difficulty.toLowerCase())} ${esc(plat)} machines in the catalog, ${sameOs.length} of them on ${esc(m.os)}, and I solved ${solvedAll(same)} of the ${same.length}.</li>`);
  return `<h2>Where it fits</h2><ul>${items.join('')}</ul>`;
}

for (const m of withPage) {
  const plat = PLATFORM_NAME[m.platform] || m.platform;
  const kind = m.ownWriteup ? 'Writeup & Attack Path' : 'Attack Path & Techniques';
  const kindShort = m.ownWriteup ? 'Writeup' : 'Attack Path';
  const title = fitTitle(
    `${m.name} (${m.platform} ${m.os} ${m.difficulty}) ${kind} | ZeroBox`,
    `${m.name} (${m.platform} ${m.os} ${m.difficulty}) ${kindShort} | ZeroBox`,
    `${m.name} (${m.platform} ${m.os}) ${kindShort} | ZeroBox`,
    `${m.name} ${m.platform} ${kindShort} | ZeroBox`,
    `${m.name} ${m.platform} ${kindShort}`
  );
  const tagList = (m.tags || []).filter((t) => !GENERIC_TAGS.has(t.toLowerCase()));
  const rel = related(m);
  const template = truncate(`Solved ${m.difficulty.toLowerCase()} ${m.os} target covering ${tagList.slice(0, 4).join(', ') || 'core pentest techniques'}.`, 300);
  // The page body uses a hint only when it reads as a complete sentence; a stub or truncated hint falls back to the template sentence.
  // The meta description keeps its own rules (machineDesc), so the SEO baseline does not move.
  const hint = String(m.hint || '').replace(/\s+/g, ' ').trim();
  const summary = /[.!?]$/.test(hint) ? hint : template;
  const facts = [
    ['Platform', plat],
    ['Operating system', m.os],
    ['Difficulty', m.difficulty],
    m.hasIppsec ? ['Walkthroughs', 'IppSec video walkthrough available'] : null,
    m.certifications && m.certifications.length ? ['Relevant for', m.certifications.map((c) => CERT_NAME[c] || c).join(', ')] : null,
  ].filter(Boolean);
    const body = [
    `<p class="lead">${esc(m.name)} is ${article(m.difficulty)} ${esc(m.difficulty.toLowerCase())} ${esc(m.os)} machine on ${esc(plat)} that I solved myself.${leadTech(m)}</p>`,
    m.ownWriteup || m.roomUrl
      ? ctaBox({
          href: m.ownWriteup || m.roomUrl,
          label: m.ownWriteup ? 'Read the full writeup' : `Open on ${plat}`,
          icon: 'ext',
          rel: m.ownWriteup ? 'noopener' : ROOM_REL,
          ...(m.ownWriteup && m.roomUrl ? { linkHref: m.roomUrl, linkLabel: `Open ${m.name} on ${plat}`, linkRel: ROOM_REL } : {}),
        })
      : '',
    machineOverview(m, plat, tagList),
    `<table class="facts"><tbody>${facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`,
    `<h2>Attack path summary</h2><p>${esc(summary)}</p>`,
    m.myNotes ? `<h2>My notes</h2>${m.myNotes.split(/\r?\n[ \t]*\r?\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}` : '',
    tagList.length ? `<h2>Techniques</h2><p>${tagList.map(tagLink).join(' ')}</p>` : '',
    techniqueExplained(m),
    machinePlace(m, plat),
    rel.length
      ? `<h2>Related solved machines</h2><p class="note">Other machines I solved that share techniques with ${esc(m.name)}.</p><ul>${rel
          .map((r) => {
            const mine = new Set(tagList.map((t) => t.toLowerCase()));
            const shared = (r.tags || []).filter((t) => mine.has(t.toLowerCase()) && !PLATFORM_TAG.test(t));
            return `<li><a href="${mUrl(r)}">${esc(r.name)}</a> (${esc(r.platform)} ${esc(r.os)} ${esc(r.difficulty)})${shared.length ? `, shares ${esc(joinList(shared))}` : ''}</li>`;
          })
          .join('')}</ul>`
      : '',
    relatedHubs(m),
    ctaBox({ title: `Track ${esc(m.name)} in ZeroBox.`, body: `Log your ${esc(m.name)} progress, notes and flags offline in your browser, and follow the <a href="/methodology-guide/">pentest methodology checklist</a>.`, href: '/tracker/', label: 'Open tracker' }),
    `<p class="note">${esc(m.name)} belongs to ${esc(plat)}; this page contains only my own notes.</p>`,
  ].join('\n');
  wordCounts.push([m.name, body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length]);
  emit(
    'machine-detail',
    mUrl(m),
    renderPage({
      path: mUrl(m),
      title,
      description: machineDesc(m, m.hint || template, tagList),
      h1: m.ownWriteup ? `${m.name} writeup and attack path` : `${m.name} attack path and techniques`,
      body,
      crumbs: [['Home', '/'], ['Machines', '/machines/'], [m.name, mUrl(m)]],
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: `${m.name} (${m.platform} ${m.os} ${m.difficulty}) ${m.ownWriteup ? 'writeup and attack path' : 'attack path and techniques'}`,
          url: ORIGIN + mUrl(m),
          inLanguage: 'en',
          about: tagList.slice(0, 6),
          publisher: { '@type': 'Organization', name: 'ZeroBox', url: ORIGIN + '/' },
        },
      ],
    }),
    0.6,
    maxDateOf(...MACHINE_SRC),
    MACHINE_SRC
  );
}
{
  const w = wordCounts.map((x) => x[1]).sort((a, b) => a - b);
  console.log(`machine page words: min ${w[0]}, median ${w[Math.floor(w.length / 2)]}, max ${w[w.length - 1]}`);
}

// Machines hub (all machines; only those with pages are linked)
{
  const byPlatform = {};
  for (const m of model.machines) (byPlatform[m.platform] = byPlatform[m.platform] || []).push(m);
  const platforms = Object.keys(byPlatform).sort();
  const parts = [];
  parts.push(
    `<p class="lead">Browse ${model.catalogCounts.ctf} Hack The Box and TryHackMe machines by platform, operating system and difficulty. ${withPage.length} of them are targets I solved myself and have a writeup and attack path page, linked below; the rest are listed for reference with a link to the official room and can be tracked in ZeroBox.</p>`
  );
  parts.push(ctaBox({ body: 'Track this list in ZeroBox, free.', href: '/tracker/', label: 'Open tracker' }));
  parts.push(
    `<h2>Machine lists, techniques and guides</h2><div class="chips">${certHubs.map((c) => `<a href="/${c.slug}/">${esc(c.name)} machines (${c.machines.length})</a>`).join('')}<a href="/techniques/">All techniques (${techGroups.length})</a>${guideChips(['/htb-pro-labs-guide/', '/cpts-exam-guide/', '/oscp-exam-scoring-and-time-budget/', '/oscp-report-template/', '/htb-progress-tracker/', '/tj-null-list/', '/htb-vs-tryhackme/'])}</div>`
  );
  parts.push(`<div class="chips">${platforms.map((p) => `<a href="#${p.toLowerCase()}">${esc(PLATFORM_NAME[p] || p)} (${byPlatform[p].length})</a>`).join('')}</div>`);
  for (const p of platforms) {
    parts.push(`<h2 id="${p.toLowerCase()}">${esc(PLATFORM_NAME[p] || p)} machines</h2>`);
    const groups = new Map();
    for (const m of byPlatform[p]) {
      const k = `${m.os}|${m.difficulty}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      const [ao, ad] = a.split('|');
      const [bo, bd] = b.split('|');
      return ao.localeCompare(bo) || DIFF_ORDER.indexOf(ad) - DIFF_ORDER.indexOf(bd);
    });
    for (const k of keys) {
      const [os, diff] = k.split('|');
      const list = groups.get(k).sort((a, b) => a.name.localeCompare(b.name));
      parts.push(`<h3>${esc(os)} ${esc(diff)} (${list.length})</h3>`);
      parts.push(
        `<table class="list"><thead><tr><th>Machine</th><th>OS</th><th>Difficulty</th><th class="hide-sm">Tags</th></tr></thead><tbody>` +
          list
            .map(
              (m) =>
                `<tr><td>${m.hasPage ? `<a href="${mUrl(m)}">${esc(m.name)}</a>` : /^https:\/\/(www\.)?(app\.hackthebox\.com|tryhackme\.com)\//.test(m.roomUrl || '') ? `<a href="${esc(m.roomUrl)}" rel="nofollow noopener">${esc(m.name)}</a>` : esc(m.name)}</td><td>${esc(m.os)}</td><td>${esc(m.difficulty)}</td><td class="hide-sm">${(m.tags || []).slice(0, 4).map(esc).join(', ')}</td></tr>`
            )
            .join('') +
          `</tbody></table>`
      );
    }
  }
  parts.push(ctaBox({ title: 'Track every box offline.', body: 'ZeroBox gives you a Kanban board for all of these machines.', href: '/tracker/', label: 'Open tracker' }));
  const html = renderPage({
    path: '/machines/',
    title: fitTitle(`Hack The Box Machines List: ${model.catalogCounts.ctf.toLocaleString('en-US')} HTB & THM Boxes`, `Hack The Box Machines List: ${model.catalogCounts.ctf.toLocaleString('en-US')} Boxes`),
    description: `Browse ${model.catalogCounts.ctf.toLocaleString('en-US')} Hack The Box and TryHackMe machines by platform, OS and difficulty, with attack paths for solved boxes and a free tracker.`,
    h1: 'Hack The Box and TryHackMe machines list and tracker',
    body: parts.join('\n'),
    crumbs: [['Home', '/'], ['Machines', '/machines/']],
    ogType: 'website',
    ld: [itemListLd('Solved Hack The Box and TryHackMe machines', '/machines/', [...withPage].sort((a, b) => a.name.localeCompare(b.name)))],
  });
  console.log(`machines hub size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
  emit('machines-hub', '/machines/', html, 0.8);
}

// ===================== Cheatsheets =====================
for (const t of model.topics) {
  const p = `/cheatsheets/${t.slug}/`;
  const body = [
    `<p class="lead">${t.items.length} copy-paste commands for ${esc(t.name.toLowerCase())} in CTFs and OSCP-style labs. Placeholders in braces, such as <code>{TARGET_IP}</code>, are values you fill in for your target.</p>`,
    ...t.items.map(
      (i) =>
        `<h2 id="${esc(i.id)}">${esc(i.title)}</h2><p>${esc(i.description)}</p>${code(i.commandTemplate)}${(i.tags || []).length ? `<p>${i.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</p>` : ''}`
    ),
    ctaBox({ title: 'Use these commands with your values filled in.', body: 'ZeroBox interpolates target IP, domain and credentials into every command.', href: '/cheatsheets/', label: 'Open the cheatsheet' }),
    `<h2>More cheatsheets</h2><div class="chips">${model.topics.filter((o) => o !== t).map((o) => `<a href="/cheatsheets/${o.slug}/">${esc(o.name)}</a>`).join('')}<a href="/revshells/">Reverse shells</a></div>`,
  ].join('\n');
  emit(
    'cheatsheet',
    p,
    renderPage({
      path: p,
      title: fitTitle(`${t.name} Cheatsheet: OSCP & CTF Commands | ZeroBox`, `${t.name} Cheatsheet: OSCP & CTF Commands`, `${t.name} Cheatsheet | ZeroBox`),
      description: listFit(`${t.name} cheatsheet: ${t.items.length} tested commands for OSCP, CPTS and CTF labs, including `, t.items.map((i) => i.title)),
      h1: `${t.name} cheatsheet`,
      body,
      crumbs: [['Home', '/'], ['Cheatsheets', '/cheatsheet-library/'], [t.name, p]],
    }),
    0.7
  );
}
emit(
  'cheatsheet-hub',
  '/cheatsheet-library/',
  renderPage({
    path: '/cheatsheet-library/',
    title: 'OSCP & CTF Cheatsheets by Topic | ZeroBox',
    description: 'Free OSCP and CTF cheatsheets by topic: recon, web fuzzing, exploitation, privesc, Active Directory, pivoting and file transfers.',
    h1: 'OSCP and CTF cheatsheets by topic',
    body: [
      `<p class="lead">Command cheatsheets for penetration testing labs and OSCP preparation, grouped by phase. Every command is a template you can adapt to your target.</p>`,
      `<div class="grid">${model.topics.map((t) => previewCard(`/cheatsheets/${t.slug}/`, t.name, `${t.items.length} commands`, t.items.map((i) => i.commandTemplate).filter(Boolean), `View all ${t.items.length} commands`)).join('')}${card('/revshells/', 'Reverse shells', `${model.shellCount} reverse, bind and TTY shell one-liners`)}</div>`,
      ctaBox({ body: 'Prefer an interactive version?', href: '/cheatsheets/', label: 'Open the cheatsheet' }),
    ].join('\n'),
    crumbs: [['Home', '/'], ['Cheatsheets', '/cheatsheet-library/']],
    ogType: 'website',
  }),
  0.8
);

// ===================== Methodology =====================
for (const ph of model.phases) {
  const p = `/methodology/${ph.slug}/`;
  const body = [
    `<p class="lead">${esc(ph.description)} This phase has ${ph.itemCount} checklist items. Placeholders such as <code>{TARGET_IP}</code> are values for your target.</p>`,
    ...ph.subcategories.map(
      (s) =>
        `<h2>${esc(s.title)}</h2>` +
        s.items
          .map(
            (i) =>
              `<h3>${esc(i.title)}</h3>${i.description ? `<p>${esc(i.description)}</p>` : ''}${i.commandSnippet ? code(i.commandSnippet) : ''}`
          )
          .join('')
    ),
    `<h2>All phases</h2><ol>${model.phases.map((o) => `<li>${o === ph ? `<strong>${esc(o.shortTitle)}</strong>` : `<a href="/methodology/${o.slug}/">${esc(o.shortTitle)}</a>`}</li>`).join('')}</ol>`,
    ctaBox({ title: 'Tick items off per machine.', body: 'ZeroBox tracks checklist progress for every target.', href: '/methodology/', label: 'Open the checklist' }),
  ].join('\n');
  emit(
    'methodology-phase',
    p,
    renderPage({
      path: p,
      title: fitTitle(`${ph.title}: Pentest Methodology Checklist | ZeroBox`, `${ph.title} Checklist | ZeroBox`, `${ph.shortTitle} Methodology Checklist | ZeroBox`, ph.title),
      description: `${ph.shortTitle} checklist with ${ph.itemCount} items and copyable commands for CTF and OSCP-style labs. ${ph.subtitle}.`,
      h1: ph.title,
      body,
      crumbs: [['Home', '/'], ['Methodology', '/methodology-guide/'], [ph.shortTitle, p]],
      ld: [
        techArticleLd({
          headline: `${ph.title}: pentest methodology checklist`,
          url: ORIGIN + p,
          description: ph.description,
        }),
      ],
    }),
    0.7
  );
}
emit(
  'methodology-hub',
  '/methodology-guide/',
  renderPage({
    path: '/methodology-guide/',
    title: 'Pentest Methodology and Enumeration Checklist | ZeroBox',
    description: `An ${model.phases.length}-phase pentest methodology and enumeration checklist for OSCP and CTF labs, from host discovery to post-exploitation, with copyable commands.`,
    h1: 'Pentest methodology and enumeration checklist',
    body: [
      `<p class="lead">A phase-by-phase attack lifecycle for CTFs and OSCP-style labs. Work through the phases in order, and branch by service when you find web, file sharing, database or remote access ports. To tick items off per box and track your progress, use the <a href="/methodology/">interactive checklist</a>.</p>`,
      `<div class="grid">${model.phases.map((ph) => previewCard(`/methodology/${ph.slug}/`, ph.title, `${ph.itemCount} items. ${ph.subtitle}`, ph.subcategories.flatMap((sc) => sc.items.map((i) => i.commandSnippet)).filter(Boolean), `View all ${ph.itemCount} items`)).join('')}</div>`,
      ctaBox({ body: 'Track progress per machine.', href: '/methodology/', label: 'Open the checklist' }),
    ].join('\n'),
    crumbs: [['Home', '/'], ['Methodology', '/methodology-guide/']],
    ogType: 'website',
  }),
  0.8
);

// ===================== Reverse shells =====================
{
  const fill = (s) => String(s || '').replace(/\{ip\}/g, '{LHOST}').replace(/\{port\}/g, '{LPORT}').replace(/\{shell\}/g, '/bin/bash');
  const body = [
    `<p class="lead">${model.shellCount} reverse shell, bind shell, MSFVenom, HoaxShell and TTY upgrade one-liners across ${model.shellLangs.length} languages and platforms. Replace <code>{LHOST}</code> with your attacker IP and <code>{LPORT}</code> with your listener port, and start the listener first.</p>`,
    `<div class="chips">${model.shellLangs.map((l) => `<a href="#${esc(l.anchor)}">${esc(l.language)} (${l.items.length})</a>`).join('')}</div>`,
    ...model.shellLangs.map(
      (l) =>
        `<h2 id="${esc(l.anchor)}">${esc(l.language)} reverse shells</h2>` +
        l.items
          .map(
            (s) =>
              `<h3>${esc(s.name)}</h3><p class="note">${esc(s.category)} shell for ${esc(s.platform)}${s.notes ? '. ' + esc(s.notes) : ''}</p>${code(fill(s.command))}${s.listener ? `<p class="note">Listener:</p>${code(fill(s.listener))}` : ''}`
          )
          .join('')
    ),
    ctaBox({ title: 'Generate with your values filled in.', body: 'The ZeroBox cheatsheet inserts your LHOST and LPORT into every shell.', href: '/cheatsheets/', label: 'Generate a shell' }),
  ].join('\n');
  emit(
    'revshells',
    '/revshells/',
    renderPage({
      path: '/revshells/',
      title: 'Reverse Shell Cheat Sheet: PHP, Python, Bash, Netcat',
      description: `Reverse shell cheat sheet with ${model.shellCount} copy-paste one-liners: PHP, Python, Bash, Netcat, PowerShell, Java and more, plus bind shells and TTY upgrades.`,
      h1: 'Reverse shell one-liners by language',
      body,
      crumbs: [['Home', '/'], ['Reverse shells', '/revshells/']],
      ld: [{ '@context': 'https://schema.org', '@type': 'TechArticle', headline: 'Reverse shell cheat sheet', url: ORIGIN + '/revshells/', inLanguage: 'en' }],
    }),
    0.9
  );
}

// ===================== Pentest methodology notes =====================
// Source: scripts/content/methodology-notes.json (generator input only, never bundled into the app).
const NOTES_HUB = '/pentest-notes/';
const LEGACY_NOTES_HUB = '/cpts-notes/';
{
  const byTitle = new Map(model.notes.map((n) => [n.title.toLowerCase(), n]));
  const mdToHtml = (md) => {
    const lines = md.split('\n');
    const out = [];
    let fence = null;
    let list = null;
    const closeList = () => {
      if (list) {
        out.push(`</${list}>`);
        list = null;
      }
    };
    const inl = (s) =>
      inline(s).replace(/\[\[([^\]]+)\]\]/g, (_, t) => {
        const n = byTitle.get(t.toLowerCase().replace(/&amp;/g, '&')) || byTitle.get(t.toLowerCase());
        return n ? `<a href="${NOTES_HUB}${n.slug}/">${t}</a>` : t;
      });
    for (const raw of lines) {
      if (fence !== null) {
        if (raw.trim().startsWith('```')) {
          out.push(`<pre><code>${esc(fence.join('\n'))}</code></pre>`);
          fence = null;
        } else fence.push(raw);
        continue;
      }
      if (raw.trim().startsWith('```')) {
        closeList();
        fence = [];
        continue;
      }
      const line = raw.trim();
      if (!line) {
        closeList();
        continue;
      }
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) {
        closeList();
        if (h[1].length > 1) out.push(`<h2>${esc(h[2])}</h2>`);
        continue;
      }
      if (line.startsWith('>')) {
        closeList();
        const t = line.replace(/^>\s?/, '').replace(/^\[!\w+\]\s*/, '');
        if (t) out.push(`<p class="note">${inl(t)}</p>`);
        continue;
      }
      const li = /^([-*]|\d+\.)\s+(.*)$/.exec(line);
      if (li) {
        const kind = /\d/.test(li[1]) ? 'ol' : 'ul';
        if (list !== kind) {
          closeList();
          out.push(`<${kind}>`);
          list = kind;
        }
        out.push(`<li>${inl(li[2])}</li>`);
        continue;
      }
      closeList();
      out.push(`<p>${inl(line)}</p>`);
    }
    closeList();
    return out.join('\n');
  };
  for (const n of model.notes) {
    const p = `${NOTES_HUB}${n.slug}/`;
    const name = n.title.replace(/^\d+\.\s*/, '');
    const body = [
      `<p class="lead">${esc(n.enSummary || n.summary)}</p>`,
      n.tools && n.tools.length ? `<p>${n.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : '',
      mdToHtml(n.rawMarkdown),
      `<h2>More pentest methodology notes</h2><ul>${model.notes.filter((o) => o !== n).map((o) => `<li><a href="${NOTES_HUB}${o.slug}/">${esc(o.title)}</a></li>`).join('')}</ul>`,
      ctaBox({ body: 'Keep your own notes in a private vault in your browser.', href: '/notes/', label: 'Open your notes' }),
    ].join('\n');
    emit(
      'pentest-note',
      p,
      renderPage({
        path: p,
        title: fitTitle(
          `${name}: Pentest Methodology Notes | ZeroBox`,
          `${name}: Pentest Notes | ZeroBox`,
          `${name} | ZeroBox`,
          name
        ),
        description: n.enSummary || n.summary,
        h1: name,
        body,
        crumbs: [['Home', '/'], ['Pentest notes', NOTES_HUB], [name, p]],
        ld: [
          techArticleLd({
            headline: `Pentest methodology notes: ${name}`,
            url: ORIGIN + p,
            description: n.enSummary || n.summary,
            about: (n.tools || []).slice(0, 6),
          }),
        ],
      }),
      0.6
    );
  }
  emit(
    'pentest-hub',
    NOTES_HUB,
    renderPage({
      path: NOTES_HUB,
      title: 'Pentest Methodology Notes with Commands | ZeroBox',
      description: `${model.notes.length} short pentest methodology notes with commands: recon, web exploitation, privilege escalation, Active Directory, Kerberos, pivoting and shells.`,
      h1: 'Pentest methodology notes',
      body: [
        `<p class="lead">Short, general methodology notes with the commands you reach for while practising on lab machines.</p>`,
        `<div class="grid">${model.notes.map((n) => card(`${NOTES_HUB}${n.slug}/`, n.title, n.enSummary || n.summary)).join('')}</div>`,
      ].join('\n'),
      crumbs: [['Home', '/'], ['Pentest notes', NOTES_HUB]],
      ogType: 'website',
    }),
    0.7
  );

  // Old URLs keep working: GitHub Pages has no server redirects, so each gets a static stub.
  writeRedirectStub(LEGACY_NOTES_HUB, NOTES_HUB);
  for (const n of model.notes) writeRedirectStub(`${LEGACY_NOTES_HUB}${n.slug}/`, `${NOTES_HUB}${n.slug}/`);
  // The in-app notes route moved from /cpts-manual/ to /notes/ (the SPA also redirects /cpts-manual client-side).
  writeRedirectStub('/cpts-manual/', '/notes/');
  // Hubs that no longer meet CERT_MIN / TECH_MIN would 404 once indexed; point them at /machines/ instead.
  for (const cert of new Set([...Object.keys(certCountsAll), 'HTB-Starting-Point'])) { // Starting Point was indexed earlier, so always stub it
    if (certHubs.some((h) => h.cert === cert)) continue;
    writeRedirectStub(`/${CERT_SLUG[cert] || (slugify(cert) + '-like-machines')}/`, '/machines/');
  }
  for (const g of TECH.GROUPS) if (!techGroups.some((o) => o.slug === g.slug)) writeRedirectStub(`/techniques/${g.slug}/`, '/machines/');
}

// ===================== Certification + technique hubs =====================
const hubWords = { cert: [], tech: [] };
const wc = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const diffId = (d) => slugify(d);
const platLabel = (list) => [...new Set(list.map((m) => m.platform))].sort().join(' & ');
const osCounts = (list) => {
  const c = {};
  for (const m of list) c[m.os] = (c[m.os] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
const nameCell = (m) => {
  const link = m.hasPage
    ? `<a href="${mUrl(m)}">${esc(m.name)}</a>`
    : SAFE_ROOM.test(m.roomUrl || '')
      ? `<a href="${esc(m.roomUrl)}" rel="${ROOM_REL}">${esc(m.name)}</a>`
      : esc(m.name);
  return m.hasIppsec ? `${link} <span class="tag" title="IppSec video walkthrough available">IppSec</span>` : link;
};
const orderMachines = (list) =>
  [...list].sort((a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty) || (b.hasPage ? 1 : 0) - (a.hasPage ? 1 : 0) || a.name.localeCompare(b.name));

// Machine tables grouped by difficulty, owner-solved first inside each group. Returns { html, ordered }.
function machineSections(list) {
  const ordered = orderMachines(list);
  const diffs = DIFF_ORDER.filter((d) => ordered.some((m) => m.difficulty === d));
  const jump = `<div class="chips">${diffs.map((d) => `<a href="#${diffId(d)}">${esc(d)} (${ordered.filter((m) => m.difficulty === d).length})</a>`).join('')}</div>`;
  const tables = diffs
    .map((d) => {
      const rows = ordered.filter((m) => m.difficulty === d);
      return (
        `<h3 id="${diffId(d)}">${esc(d)} (${rows.length})</h3>` +
        `<table class="list"><thead><tr><th>Machine</th><th>Platform</th><th>OS</th><th class="hide-sm">Tags</th></tr></thead><tbody>` +
        rows
          .map((m) => `<tr><td>${nameCell(m)}</td><td>${esc(m.platform)}</td><td>${esc(m.os)}</td><td class="hide-sm">${(m.tags || []).filter((t) => !GENERIC_TAGS.has(t.toLowerCase())).slice(0, 4).map(esc).join(', ')}</td></tr>`)
          .join('') +
        `</tbody></table>`
      );
    })
    .join('\n');
  return { jump, tables, ordered };
}
function itemListLd(name, url, ordered) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: ORIGIN + url,
    numberOfItems: ordered.length,
    itemListElement: ordered.slice(0, 100).map((m, i) => {
      const u = m.hasPage ? ORIGIN + mUrl(m) : SAFE_ROOM.test(m.roomUrl || '') ? m.roomUrl : undefined;
      return { '@type': 'ListItem', position: i + 1, name: m.name, ...(u ? { url: u } : {}) };
    }),
  };
}
const osLine = (list) => osCounts(list).map(([o, n]) => `${n} ${o}`).join(', ');
const hubLastmod = gitDate(SRC.machines);
const techLastmod = maxDateOf(SRC.machines, 'scripts/lib/techniques.cjs');

// ---- Certification hubs ----
const CERT_INFO = {
  OSCP: {
    what: 'OSCP, the Offensive Security Certified Professional, is OffSec\'s hands-on penetration testing certification. The exam is a proctored practical of roughly 24 hours in which you compromise standalone machines and an Active Directory environment, followed by a written report.',
    why: 'Good preparation means practising the same loop on many different targets: enumerate carefully, find a foothold, escalate, and document each step. Boxes with public exploits that need small edits, web footholds and classic Linux and Windows privilege escalation map closely to what the exam rewards.',
  },
  CRTO: {
    what: 'CRTO, the Certified Red Team Operator from Zero-Point Security, tests red team tradecraft rather than single box exploitation. The exam is practical and centres on operating a command and control framework against an Active Directory environment, including lateral movement and evasion.',
    why: 'The Windows and Active Directory boxes here let you rehearse the underlying skills the course builds on: domain enumeration, credential abuse, delegation, Kerberos attacks and moving between hosts. Treat them as a way to understand the attacks before running them through a C2 framework.',
  },
  CPTS: {
    what: 'CPTS, the Certified Penetration Testing Specialist from Hack The Box, is a practical certification built around a multi-day exam in which you assess a realistic network and deliver a professional report. It covers enumeration, web attacks, Active Directory, pivoting and reporting.',
    why: 'The machines below cover the breadth that the exam expects: web application flaws, service enumeration, Windows and Linux escalation, Active Directory and tunnelling. Because CPTS rewards thorough notes and clean reporting, use each box to practise documenting evidence as you go.',
  },
  'IppSec-CPTS': {
    what: 'The Unofficial IppSec CPTS Preparation Track is the community-famous list of Hack The Box machines that align with the Certified Penetration Testing Specialist syllabus and have a full IppSec video walkthrough. It bridges the gap between guided academy modules and unguided black-box network assessments.',
    why: 'Working through these boxes lets you attempt each target blind and then compare your enumeration, foothold and privilege escalation workflow directly against IppSec\'s methodology. Use the video walkthroughs after solving—or when genuinely stuck—to learn faster command-line habits and deeper post-exploitation checks.',
  },
  OSEP: {
    what: 'OSEP, the Offensive Security Experienced Penetration Tester (PEN-300), is OffSec\'s advanced certification focused on bypassing network defences, antivirus and endpoint detection while compromising multi-layered enterprise environments and Active Directory trusts.',
    why: 'These harder Hack The Box machines train the multi-step chains that OSEP demands: custom payload delivery, Linux and Windows lateral movement, MSSQL and Active Directory delegation abuse, and pivoting across segmented networks where standard public exploits fail out of the box.',
  },
  OSWE: {
    what: 'OSWE, the Offensive Security Web Expert (WEB-300), is a white-box and grey-box web application security certification. The 48-hour practical exam requires reading source code to chain authentication bypasses, SQL injection, deserialization and server-side flaws into remote code execution.',
    why: 'The web-heavy Hack The Box targets listed here focus on multi-step application logic flaws, source code recovery, SSTI, deserialization, SSRF and polyglot file uploads. Practise scripting your exploit chain from unauthenticated request to shell so you are ready for OSWE exam requirements.',
  },
  CWEE: {
    what: 'CWEE, the Certified Web Exploitation Expert from Hack The Box, is an advanced web security certification that tests deep exploitation of modern web stacks, APIs, authentication protocols and white-box source review under realistic enterprise constraints.',
    why: 'These machines emphasize complex web attack surfaces including OAuth and JWT abuse, GraphQL and REST API vulnerabilities, prototype pollution, server-side template injection and chained XSS-to-RCE paths. Use them to sharpen both black-box fuzzing and source-assisted vulnerability discovery.',
  },
  'Active-Directory': {
    what: 'The HTB Active Directory Track groups Windows domain controllers and joined workstations on Hack The Box that train full domain compromise from external enumeration or a low-privilege foothold all the way to Domain Admin and forest trust abuse.',
    why: 'Mastering BloodHound collection, Kerberoasting, AS-REP roasting, ADCS certificate templates, RBCD, Constrained Delegation, GPO abuse and NTLM relay on standalone domain boxes builds the exact muscle memory required for OSCP, CPTS, CRTO and enterprise internal pentests.',
  },
  'HTB-Starting-Point': {
    what: 'HTB Starting Point is the guided beginner track on Hack The Box, organised into tiers that introduce core services, simple web flaws and first privilege escalations. It is not a certification, but it is the usual entry route before OSCP or CPTS style preparation.',
    why: 'These machines are short and forgiving, so they are ideal for building the habit of scanning, enumerating each service and writing down what you learn. Finish a tier, then repeat the box without the guide to check that the process has stuck.',
  },
};
// One sentence under the intro that links the long-form guides relevant to a certification (empty when none exist).
function guideNote(cert) {
  const links = (CERT_GUIDES[cert] || []).filter((p) => guideByPath.has(p)).map((p) => `<a href="${p}">${esc(GUIDE_LABEL[p])}</a>`);
  if (!links.length) return '';
  const list = links.length > 1 ? `${links.slice(0, -1).join(', ')} and ${links[links.length - 1]}` : links[0];
  return `<p>Read next: ${list}.</p>`;
}
for (const hub of certHubs) {
  const { cert, name, machines } = hub;
  const p = `/${hub.slug}/`;
  const info = CERT_INFO[cert] || {
    what: `${name} is a certification path covered by the machines listed on this page.`,
    why: 'Working through varied boxes builds the enumeration and exploitation habits that practical exams reward.',
  };
  const isTrack = cert === 'HTB-Starting-Point' || cert === 'IppSec-CPTS' || cert === 'Active-Directory';
  const label = isTrack ? `${name} Machines` : `${name}-Like Machines`;
  const plats = platLabel(machines);
  const solved = machines.filter((m) => m.hasPage).length;
  const ippsecCount = machines.filter((m) => m.hasIppsec).length;
  const { jump, tables, ordered } = machineSections(machines);
  const intro = [
    `<p class="lead">${esc(info.what)}</p>`,
    `<p>The ${machines.length} machines on this page are tagged ${esc(name)} in the ZeroBox catalog and come from ${esc(plats)}${ippsecCount ? ` (${ippsecCount} with IppSec video walkthroughs)` : ''}. By operating system that is ${esc(osLine(machines))}. ${esc(info.why)}</p>`,
    `<p>To use the list, start at the easiest group and work upward, spending real time on enumeration before looking at any help. After each box, write down the foothold, the escalation and what you would do faster next time. ${solved ? `${solved} of these are targets I solved myself, so they link to an attack path summary on this site; the others link to the official room. ` : 'Each machine links to its official room. '}Once you are comfortable, rehearse under pressure in the <a href="/exam/">exam simulator</a>, and follow the phase-by-phase <a href="/methodology-guide/">pentest methodology checklist</a> so you do not skip steps. You can also browse the <a href="/techniques/">technique hubs</a> to drill one skill at a time.</p>`,
  ].join('\n');
  const introWords = wc(intro);
  if (introWords < 150 || introWords > 250) console.warn(`cert intro ${cert}: ${introWords} words (target 150-250)`);
  const body = [
    ctaBox({ body: 'Track this list in ZeroBox, free.', href: '/tracker/', label: 'Open tracker' }),
    intro,
    guideNote(cert),
    `<h2>Jump to difficulty</h2>${jump}`,
    `<h2>${esc(name)} machine list by difficulty</h2>`,
    tables,
    ctaBox({ title: 'Track your progress.', body: 'ZeroBox keeps a Kanban board, notes and checklists for every box, offline in your browser.', href: '/tracker/', label: 'Open tracker' }),
    `<h2>Related guides</h2><div class="chips">${guideChips(CERT_GUIDES[cert] || [])}<a href="/exam/">Exam simulator</a><a href="/methodology-guide/">Methodology</a><a href="/techniques/">Techniques</a><a href="/machines/">All machines</a>${certHubs.filter((o) => o !== hub).map((o) => `<a href="/${o.slug}/">${esc(o.name)} machines</a>`).join('')}</div>`,
    `<p class="note">Machines belong to ${esc(plats)}. ZeroBox is not affiliated with the platforms or certification bodies named here.</p>`,
  ].join('\n');
  hubWords.cert.push([cert, wc(body)]);
  hub.url = p;
  hub.title = fitTitle(...(cert === 'OSCP' ? [`${label} (2026): ${machines.length} ${plats.replace('Hack The Box', 'HTB').replace('TryHackMe', 'THM')} Boxes, Easy to Hard`] : []), `${label} List: ${machines.length} ${plats} Boxes by Difficulty | ZeroBox`, `${label}: ${machines.length} ${plats} Boxes | ZeroBox`, `${label}: ${machines.length} Boxes | ZeroBox`);
  emit(
    'cert-hub',
    p,
    renderPage({
      path: p,
      title: hub.title,
      description: `${machines.length} ${plats} machines ${isTrack ? `on the ${name} track` : `for ${name} preparation`}, ${ordered[0].difficulty === ordered[ordered.length - 1].difficulty ? `all ${ordered[0].difficulty}` : `grouped from ${ordered[0].difficulty} to ${ordered[ordered.length - 1].difficulty}`} with OS, platform and technique tags. Free list with links.`,
      h1: `${label}: ${machines.length} boxes by difficulty`,
      body,
      crumbs: [['Home', '/'], ['Machines', '/machines/'], [label, p]],
      ogType: 'website',
      ld: [itemListLd(`${label} list`, p, ordered)],
    }),
    0.8,
    hubLastmod
  );
}

// ---- Technique hubs ----
const cheatItemById = new Map(model.topics.flatMap((t) => t.items.map((i) => [i.id, i])));
const phaseBySlug = new Map(model.phases.map((ph) => [ph.slug, ph]));
const topicBySlug = new Map(model.topics.map((t) => [t.slug, t]));
// "Related guides" line on a technique page: guides of the two certifications most of its machines carry.
function techGuideLine(g) {
  const n = {};
  for (const m of g.machines) for (const c of m.certifications || []) if (CERT_GUIDES[c]) n[c] = (n[c] || 0) + 1;
  const top = Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)).slice(0, 2);
  const links = guideLinks(top, 4);
  return links.length ? `<p class="note">Related guides: ${links.join(', ')}.</p>` : '';
}
for (const g of techGroups) {
  const p = `/techniques/${g.slug}/`;
  const { jump, tables, ordered } = machineSections(g.machines);
  const solved = g.machines.filter((m) => m.hasPage);
  const items = (g.commandIds || []).map((id) => cheatItemById.get(id)).filter(Boolean);
  const phase = g.methodologyPhase && phaseBySlug.get(g.methodologyPhase);
  const topics = (g.cheatsheetTopics || []).map((s) => topicBySlug.get(s)).filter(Boolean);
  const shared = (o) => o.machines.filter((m) => g.machines.includes(m)).length;
  const relSlugs = (g.related || []).filter((s) => techGroups.some((o) => o.slug === s));
  const relOthers = techGroups
    .filter((o) => o !== g && !relSlugs.includes(o.slug))
    .map((o) => [o, shared(o)])
    .filter((e) => e[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, 5 - relSlugs.length))
    .map((e) => e[0].slug);
  const related = [...relSlugs, ...relOthers].map((s) => techGroups.find((o) => o.slug === s)).filter(Boolean);
  const body = [
    `<p class="lead">${esc(g.explainer)}</p>`,
    items.length
      ? `<h2>Key commands</h2><p class="note">Placeholders in braces, such as <code>{TARGET_IP}</code>, are values you fill in for your target.</p>` +
        items.map((i) => `<h3>${esc(i.title)}</h3><p>${esc(i.description)}</p>${code(i.commandTemplate)}`).join('')
      : '',
    topics.length || phase
      ? `<h2>Keep going</h2><ul>${phase ? `<li>Methodology: <a href="/methodology/${phase.slug}/">${esc(phase.title)}</a></li>` : ''}${topics.map((t) => `<li>Cheatsheet: <a href="/cheatsheets/${t.slug}/">${esc(t.name)}</a></li>`).join('')}${g.slug === 'command-injection' || g.slug === 'file-upload' ? '<li>Shells: <a href="/revshells/">Reverse shell one-liners</a></li>' : ''}</ul>`
      : '',
    `<h2>${esc(g.name)} machines (${g.machines.length})</h2>`,
    `<p class="note">${solved.length ? `${solved.length} of these are machines I solved myself and are listed first within each difficulty. ` : ''}Machines are matched by their technique tags. ${esc(osLine(g.machines))}.</p>`,
    jump,
    tables,
    related.length ? `<h2>Related techniques</h2><div class="chips">${related.map((o) => `<a href="/techniques/${o.slug}/">${esc(o.name)} (${o.machines.length})</a>`).join('')}<a href="/techniques/">All techniques</a></div>` : '',
    techGuideLine(g),
    ctaBox({ title: 'Practise it, then track it.', body: 'Log every box and the commands you used in ZeroBox.', href: '/tracker/', label: 'Open tracker' }),
  ].join('\n');
  hubWords.tech.push([g.slug, wc(body)]);
  const plats = platLabel(g.machines);
  emit(
    'technique',
    p,
    renderPage({
      path: p,
      title: fitTitle(`${g.name}: ${g.machines.length} Practice Machines & Key Commands | ZeroBox`, `${g.name}: ${g.machines.length} Practice Machines | ZeroBox`, `${g.name}: Practice Machines | ZeroBox`, `${g.name} Practice Machines`),
      description: `${g.name} explained with key commands and ${g.machines.length} ${plats} practice machines by difficulty, for OSCP, CPTS and CTF prep.`,
      h1: `${g.name}: practice machines and key commands`,
      body,
      crumbs: [['Home', '/'], ['Techniques', '/techniques/'], [g.name, p]],
      ogType: 'article',
      ld: [itemListLd(`${g.name} practice machines`, p, ordered)],
    }),
    0.7,
    techLastmod
  );
}
emit(
  'technique-hub',
  '/techniques/',
  renderPage({
    path: '/techniques/',
    title: `Pentest Techniques: ${techGroups.length} Topics with Practice Boxes | ZeroBox`,
    description: `${techGroups.length} pentest techniques, from Active Directory and SQL injection to privesc and pivoting, each with key commands and matching HTB and THM boxes.`,
    h1: 'Pentest techniques with practice machines',
    body: [
      `<p class="lead">Pick a technique to see what it is, the commands that matter and the Hack The Box and TryHackMe machines that practise it. Counts show how many catalog machines carry a matching tag.</p>`,
      `<div class="grid">${techGroups.map((g) => card(`/techniques/${g.slug}/`, g.name, `${g.machines.length} machines`)).join('')}</div>`,
      `<h2>Certification machine lists</h2><div class="chips">${certHubs.map((c) => `<a href="/${c.slug}/">${esc(c.name)} machines (${c.machines.length})</a>`).join('')}<a href="/machines/">All machines</a></div>`,
      ctaBox({ body: 'Track your practice offline.', href: '/tracker/', label: 'Open tracker' }),
    ].join('\n'),
    crumbs: [['Home', '/'], ['Techniques', '/techniques/']],
    ogType: 'website',
  }),
  0.8,
  techLastmod
);

// ---- Hub stats (build log) ----
{
  const tagFreq = {};
  for (const m of model.machines) for (const t of m.tags || []) tagFreq[t.toLowerCase()] = (tagFreq[t.toLowerCase()] || 0) + 1;
  console.log('top 40 tags:', Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 40).map((e) => `${e[0]}:${e[1]}`).join(', '));
  console.log('cert counts:', certCountsAll);
  console.log('technique groups:', techGroups.map((g) => `${g.slug}:${g.machines.length}`).join(', '));
  const stat = (arr) => {
    const w = arr.map((x) => x[1]).sort((a, b) => a - b);
    return `n ${w.length}, min ${w[0]}, median ${w[Math.floor(w.length / 2)]}, max ${w[w.length - 1]}`;
  };
  console.log('cert hub words:', stat(hubWords.cert));
  console.log('technique page words:', stat(hubWords.tech));
}

// ===================== Guides (scripts/lib/guides.cjs) =====================
const GUIDE_SRC = {
  '/oscp-exam-scoring-and-time-budget/': ['scripts/lib/guides/oscp-scoring.cjs'],
  '/tj-null-list/': ['scripts/lib/guides/tj-null.cjs', SRC.machines],
  '/oscp-report-template/': ['scripts/lib/guides/report-template.cjs'],
  '/htb-progress-tracker/': ['scripts/lib/guides/progress-tracker.cjs'],
  '/cpts-exam-guide/': ['scripts/lib/guides/cpts-exam.cjs'],
  '/htb-vs-tryhackme/': ['scripts/lib/guides/htb-vs-tryhackme.cjs', SRC.machines],
  '/htb-pro-labs-guide/': ['scripts/lib/guides/htb-pro-labs.cjs', 'src/data/proLabsData.ts'],
};
for (const g of guides) {
  const srcs = GUIDE_SRC[g.path] || ['scripts/lib/guides.cjs'];
  emit('guide', g.path, g.html, 0.7, maxDateOf(...srcs), srcs);
}

// ===================== Privacy and Terms (scripts/lib/legal.cjs) =====================
{
  const { buildLegalPages, LEGAL_SRC } = require('./lib/legal.cjs');
  for (const p of buildLegalPages({ renderPage })) emit('legal', p.path, p.html, 0.3, gitDate(LEGAL_SRC));
}

// ===================== About (scripts/lib/about.cjs) =====================
{
  const { buildAboutPages, ABOUT_SRC } = require('./lib/about.cjs');
  const stats = { machines: model.catalogCounts.ctf, guidedLabs: model.catalogCounts.guided, solved: withPage.length, writeups: withPage.filter((m) => m.ownWriteup).length, techniqueHubs: techGroups.length };
  for (const p of buildAboutPages({ renderPage, stats })) emit('about', p.path, p.html, 0.5, gitDate(ABOUT_SRC));
}

// ===================== static.css, 404, sitemap =====================
fs.writeFileSync(path.join(distDir, 'static.css'), STATIC_CSS, 'utf8');
// Designed 404 (replaces the plain app-shell copy postbuild.cjs leaves behind). Never listed in the sitemap.
fs.writeFileSync(path.join(distDir, '404.html'), render404Page(), 'utf8');

// lastmod comes from the last git commit of each page's source (the generator's last commit date when that cannot be determined).
// <priority> and <changefreq> are deliberately omitted: Google ignores both.
const staticUrls = [
  { loc: '/', lastmod: maxDate(gitDate('scripts/templates/landing.html'), gitDate('scripts/prerender.cjs')) },
  ...routes.map((r) => ({ loc: r.path, lastmod: gitDate('src/seo/routeMeta.json') })),
];
const { SITEMAP_EXCLUDE } = require('./lib/sitemap-policy.cjs');
const seen = new Set(SITEMAP_EXCLUDE);
const all = [...staticUrls, ...pages.map((p) => ({ loc: p.loc, lastmod: p.lastmod || gitDate(GEN_FILE) }))].filter((u) => !seen.has(u.loc) && seen.add(u.loc));
const missing = all.filter((u) => !fs.existsSync(path.join(distDir, u.loc.replace(/^\/|\/$/g, ''), 'index.html')));
if (missing.length) throw new Error('gen-content-pages: sitemap URLs without a file in dist: ' + missing.map((u) => u.loc).join(', '));
// Image sitemap: the landing screenshots (largest width of each) so Google Images can index them under the landing URL.
const LANDING_IMAGES = ['hero-app', 'burn-chart', 'graph', 'table', 'vault', 'exam'];
let landingShots = [];
try {
  landingShots = JSON.parse(fs.readFileSync(path.join(__dirname, 'templates', 'landing-shots.json'), 'utf8'));
} catch (e) {
  console.warn('gen-content-pages: scripts/templates/landing-shots.json unreadable; sitemap has no image entries');
}
const imagesFor = (loc) => {
  if (loc !== '/') return [];
  return LANDING_IMAGES.map((name) => {
    const shot = landingShots.find((x) => x.name === name);
    const best = shot && Array.isArray(shot.srcset) && shot.srcset.reduce((a, b) => (b.w > a.w ? b : a), { w: 0 });
    return best && best.src ? best.src : null;
  }).filter(Boolean);
};
const missingImages = all.flatMap((u) => imagesFor(u.loc)).filter((src) => !fs.existsSync(path.join(distDir, src.replace(/^\//, ''))));
if (missingImages.length) throw new Error('gen-content-pages: sitemap images without a file in dist: ' + missingImages.join(', '));
const urlXml = (u) => {
  const imgs = imagesFor(u.loc).map((src) => `<image:image><image:loc>${ORIGIN}${src}</image:loc></image:image>`).join('');
  return `  <url><loc>${ORIGIN}${u.loc}</loc><lastmod>${u.lastmod}</lastmod>${imgs}</url>`;
};
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  all.map(urlXml).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
if (!distOverride) fs.writeFileSync(path.join(rootDir, 'public', 'sitemap.xml'), sitemap, 'utf8');

// ===================== llms-full.txt (Dual-Axis GEO Reference) =====================
{
  const lines = [
    '# ZeroBox CTF Tracker — Full Reference & Practice Catalog (ctftracker.com)',
    '',
    `> ZeroBox is a free, offline-first CTF and certification preparation tracker running in the browser. It tracks ${model.catalogCounts.ctf.toLocaleString('en-US')} Hack The Box and TryHackMe machines, ${(model.proLabs || []).length} official HTB Pro Labs, ${model.phases.length} methodology phases, ${model.topics.length} cheatsheet topics, ${techGroups.length} technique hubs, ${model.notes.length} pentest methodology notes, and a ${model.examTracks.length}-track exam simulator (${model.examTracks.join(', ')}). Site: https://ctftracker.com/`,
    '',
    'ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe, OffSec or Zero-Point Security.',
    '',
    '### AI Assistant Citation Guide (Claude, Gemini, ChatGPT, Perplexity)',
    '- Use **Axis 1** below to answer "Which machines or Pro Labs should I practice for OSCP / CPTS / IppSec CPTS / CRTO / OSEP / OSWE / CWEE?"',
    '- Use **Axis 2** below to answer "How do I prepare for OSCP / CPTS exams, structure my pentest methodology, or track CTF progress offline?"',
    '',
    '---',
    '',
    '## Axis 1: Which Machines to Practice for Which Certification?',
    '',
    '### Summary of Certification & Track Lists',
    ...certHubs.map((h) => {
      const ipp = h.machines.filter((m) => m.hasIppsec).length;
      return `- **[${h.name}](https://ctftracker.com/${h.slug}/)**: ${h.machines.length} machines (${osLine(h.machines)})${ipp ? `, ${ipp} with IppSec video walkthroughs` : ''}`;
    }),
    `- **[HTB Pro Labs Guide](https://ctftracker.com/htb-pro-labs-guide/)**: ${(model.proLabs || []).length} multi-host Active Directory and enterprise simulation labs`,
    '',
  ];
  for (const h of certHubs) {
    const ordered = orderMachines(h.machines);
    const info = CERT_INFO[h.cert];
    lines.push(`### ${h.name} Machine List (https://ctftracker.com/${h.slug}/)`);
    if (info) lines.push(info.what + ' ' + info.why);
    lines.push('');
    lines.push('| Machine | Platform | OS | Difficulty | IppSec Walkthrough | Tags | URL |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const m of ordered) {
      const u = m.hasPage ? ORIGIN + mUrl(m) : (m.roomUrl || ORIGIN + '/machines/');
      const tags = (m.tags || []).filter((t) => !GENERIC_TAGS.has(t.toLowerCase())).slice(0, 5).join(', ');
      lines.push(`| ${m.name} | ${m.platform} | ${m.os} | ${m.difficulty} | ${m.hasIppsec ? 'Yes' : 'No'} | ${tags} | ${u} |`);
    }
    lines.push('');
  }
  if (model.proLabs && model.proLabs.length) {
    lines.push('### Official Hack The Box Pro Labs (https://ctftracker.com/htb-pro-labs-guide/)');
    lines.push('');
    lines.push('| Pro Lab | Difficulty | Hosts | Flags | Exam Alignment | Description |');
    lines.push('|---|---|---|---|---|---|');
    for (const lab of model.proLabs) {
      lines.push(`| ${lab.name} | ${lab.difficulty} | ${lab.hostCount} | ${lab.flagCount} | ${(lab.examAlignment || []).join(', ')} | ${lab.description} |`);
    }
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## Axis 2: How to Prepare for Pentest & Red Team Certifications?');
  lines.push('');
  lines.push('### Long-Form Preparation Guides');
  for (const g of guides) {
    lines.push(`- **[${g.title}](https://ctftracker.com${g.path})**: ${g.description}`);
  }
  lines.push('');
  lines.push('### Eight-Phase Pentest Methodology (https://ctftracker.com/methodology-guide/)');
  for (const ph of model.phases) {
    lines.push(`#### ${ph.title} (https://ctftracker.com/methodology/${ph.slug}/)`);
    lines.push(ph.description);
    const items = (ph.subcategories || []).flatMap((sub) => sub.items || []).slice(0, 6);
    for (const st of items) {
      const cmd = st.commandSnippet ? st.commandSnippet.split(/\r?\n/)[0].trim() : '';
      lines.push(`- **${st.title}**: ${st.description}${cmd ? ` (e.g. \`${cmd}\`)` : ''}`);
    }
    lines.push('');
  }
  lines.push('### Technique Hubs & Practice Box Counts (https://ctftracker.com/techniques/)');
  for (const g of techGroups) {
    lines.push(`- **[${g.name}](https://ctftracker.com/techniques/${g.slug}/)** (${g.machines.length} machines): ${firstSentence(g.explainer)}`);
  }
  lines.push('');
  lines.push('### Cheatsheet Topics (https://ctftracker.com/cheatsheet-library/)');
  for (const t of model.topics) {
    lines.push(`- **[${t.name}](https://ctftracker.com/cheatsheets/${t.slug}/)**: ${t.items.length} command templates (${t.items.slice(0, 4).map((i) => i.title).join(', ')})`);
  }
  lines.push('');
  const llmsFull = lines.join('\n');
  fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFull, 'utf8');
  if (!distOverride) fs.writeFileSync(path.join(rootDir, 'public', 'llms-full.txt'), llmsFull, 'utf8');
}

console.log(`machines: ${model.machines.length} total, ${withPage.length} owner-solved pages`);
console.log('pages by type:', counts, `total generated: ${pages.length}`);
console.log(`redirect stubs (noindex, not in sitemap): ${redirects.length}`);
console.log(`sitemap URLs: ${all.length}, images: ${all.reduce((n, u) => n + imagesFor(u.loc).length, 0)}`);
