// Post-build static content pages for the WEB build only (runs after prerender).
// Generates indexable HTML from the app's own data: machines, cheatsheets, methodology,
// reverse shells, CPTS notes, plus dist/static.css and dist/sitemap.xml.
const fs = require('fs');
const path = require('path');
const { getModel, slugify } = require('./lib/content-model.cjs');
const TECH = require('./lib/techniques.cjs');
const { ORIGIN, esc, renderPage, STATIC_CSS, ctaBox } = require('./lib/layout.cjs');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('gen-content-pages: dist/index.html missing; run vite build + prerender first.');
  process.exit(1);
}

fs.rmSync(path.join(distDir, 'machines'), { recursive: true, force: true });
const model = getModel();
const routes = require(path.join(rootDir, 'src', 'seo', 'routeMeta.json'));
const { execFileSync } = require('child_process');
const lmCache = new Map();
// Last git commit date of a source file (cached); undefined when git or history is unavailable.
function gitDate(rel) {
  if (!lmCache.has(rel)) {
    let v;
    try {
      v = execFileSync('git', ['log', '-1', '--format=%cI', '--', rel], { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().slice(0, 10) || undefined;
    } catch (e) {
      v = undefined;
    }
    lmCache.set(rel, v);
  }
  return lmCache.get(rel);
}
const SRC = {
  machines: 'src/data/machinesCatalog.ts',
  cheatsheet: 'src/data/cheatsheetsData.ts',
  methodology: 'src/data/methodologyFramework.ts',
  revshells: 'src/data/revshellsData.ts',
  cpts: 'src/data/cptsNotesIndex.json',
};
const TYPE_SRC = {
  'machine-detail': 'machines', 'machines-hub': 'machines', cheatsheet: 'cheatsheet', 'cheatsheet-hub': 'cheatsheet',
  'methodology-phase': 'methodology', 'methodology-hub': 'methodology', revshells: 'revshells', 'cpts-note': 'cpts', 'cpts-hub': 'cpts',
};
const dmField = (key) => (gitDate(SRC[key]) ? { dateModified: gitDate(SRC[key]) } : {});
const pages = []; // { loc, type, priority }
const counts = {};

function emit(type, urlPath, html, priority, lastmodOverride) {
  const dir = path.join(distDir, urlPath.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  pages.push({ loc: urlPath, type, priority, lastmod: lastmodOverride !== undefined ? lastmodOverride : gitDate(SRC[TYPE_SRC[type]]) });
  counts[type] = (counts[type] || 0) + 1;
}

const card = (href, title, desc) =>
  `<a class="card" href="${href}"><h3>${esc(title)}</h3><p>${esc(desc)}</p></a>`;

const code = (s) => `<pre><code>${esc(s)}</code></pre>`;
const stripEmoji = (s) => s.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// ===================== Machines =====================
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
const CERT_NAME = { 'HTB-Starting-Point': 'HTB Starting Point' };
const certHubs = Object.entries(certCountsAll)
  .filter(([, n]) => n >= CERT_MIN)
  .sort((a, b) => b[1] - a[1])
  .map(([cert]) => ({
    cert,
    name: CERT_NAME[cert] || cert,
    slug: (cert === 'HTB-Starting-Point' ? slugify(cert) + '-machines' : slugify(cert) + '-like-machines'),
    machines: model.machines.filter((m) => (m.certifications || []).includes(cert)),
  }));
const techGroups = TECH.GROUPS.map((g) => ({ ...g, machines: model.machines.filter((m) => TECH.matchesMachine(g, m)) })).filter((g) => g.machines.length >= TECH_MIN);
const certFirst = certHubs.find((c) => c.cert === 'OSCP') || certHubs[0];
const PLATFORM_NAME = { HTB: 'Hack The Box', THM: 'TryHackMe' };
const DIFF_ORDER = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const mUrl = (m) => `/machines/${m.slug}/`;

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
const fmtDur = (s) => {
  const h = Math.floor(s / 3600), mi = Math.round((s % 3600) / 60);
  return h ? `${h}h ${mi}m` : `${mi}m`;
};
const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
const ROOM_REL = 'nofollow noopener';

for (const m of withPage) {
  const plat = PLATFORM_NAME[m.platform] || m.platform;
  const kind = m.ownWriteup ? 'Writeup & Attack Path' : 'Attack Path & Techniques';
  const title = `${m.name} (${m.platform} ${m.os} ${m.difficulty}) ${kind} | ZeroBox`;
  const tagList = (m.tags || []).filter((t) => !GENERIC_TAGS.has(t.toLowerCase()));
  const rel = related(m);
  const summary = m.hint || `Solved ${m.difficulty.toLowerCase()} ${m.os} target covering ${tagList.slice(0, 4).join(', ') || 'core pentest techniques'}.`;
  const stats = [
    m.timeToUserSeconds ? ['Time to user', fmtDur(m.timeToUserSeconds)] : null,
    m.timeToRootSeconds ? ['Time to root', fmtDur(m.timeToRootSeconds)] : null,
    m.userPwnedAt ? ['User owned', fmtDate(m.userPwnedAt)] : null,
    m.rootPwnedAt ? ['Root owned', fmtDate(m.rootPwnedAt)] : null,
  ].filter(Boolean);
  const facts = [
    ['Platform', plat],
    ['Operating system', m.os],
    ['Difficulty', m.difficulty],
    ...stats,
    m.certifications && m.certifications.length ? ['Relevant for', m.certifications.join(', ')] : null,
  ].filter(Boolean);
    const body = [
    `<p class="lead">${esc(m.name)} is a ${esc(m.difficulty.toLowerCase())} ${esc(m.os)} machine on ${esc(plat)} that I solved myself. This page is my short attack path summary and the techniques it trains.</p>`,
    m.ownWriteup || m.roomUrl
      ? ctaBox({
          href: m.ownWriteup || m.roomUrl,
          label: m.ownWriteup ? 'Read the full writeup' : `Open on ${plat}`,
          icon: 'ext',
          rel: m.ownWriteup ? 'noopener' : ROOM_REL,
          ...(m.ownWriteup && m.roomUrl ? { linkHref: m.roomUrl, linkLabel: `Open ${m.name} on ${plat}`, linkRel: ROOM_REL } : {}),
        })
      : '',
    `<table class="facts"><tbody>${facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`,
    `<h2>Attack path summary</h2><p>${esc(summary)}</p>`,
    tagList.length ? `<h2>Techniques</h2><p>${tagList.map(tagLink).join(' ')}</p>` : '',
    rel.length
      ? `<h2>Related solved machines</h2><p class="note">Other machines I solved that share techniques with ${esc(m.name)}.</p><ul>${rel
          .map((r) => `<li><a href="${mUrl(r)}">${esc(r.name)}</a> (${esc(r.platform)} ${esc(r.os)} ${esc(r.difficulty)})</li>`)
          .join('')}</ul>`
      : '',
    ctaBox({ title: `Track ${esc(m.name)} in ZeroBox.`, body: 'Log your progress, notes and flags offline in your browser, and follow the <a href="/methodology-guide/">pentest methodology checklist</a>.', href: '/tracker/', label: 'Open tracker' }),
    `<p class="note">${esc(m.name)} belongs to ${esc(plat)}. This page contains only my own notes.</p>`,
  ].join('\n');
  wordCounts.push([m.name, body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length]);
  emit(
    'machine-detail',
    mUrl(m),
    renderPage({
      path: mUrl(m),
      title,
      description: `${m.name} ${m.platform} ${m.ownWriteup ? 'writeup' : 'attack path'}: ${summary}`,
      h1: m.ownWriteup ? `${m.name} writeup and attack path` : `${m.name} attack path and techniques`,
      body,
      crumbs: [['Home', '/'], ['Machines', '/machines/'], [m.name, mUrl(m)]],
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: `${m.name} (${m.platform} ${m.os} ${m.difficulty}) ${m.ownWriteup ? 'writeup and attack path' : 'attack path and techniques'}`,
          url: ORIGIN + mUrl(m),
          ...dmField('machines'),
          inLanguage: 'en',
          about: tagList.slice(0, 6),
          publisher: { '@type': 'Organization', name: 'ZeroBox', url: ORIGIN + '/' },
        },
      ],
    }),
    0.6
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
    `<p class="lead">Browse ${model.machines.length} Hack The Box and TryHackMe machines by platform, operating system and difficulty. ${withPage.length} of them are targets I solved myself and have a writeup and attack path page, linked below; the rest are listed for reference with a link to the official room and can be tracked in ZeroBox.</p>`
  );
  parts.push(
    `<h2>Machine lists by certification and technique</h2><div class="chips">${certHubs.map((c) => `<a href="/${c.slug}/">${esc(c.name)} machines (${c.machines.length})</a>`).join('')}<a href="/techniques/">All techniques (${techGroups.length})</a></div>`
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
    title: 'HTB & TryHackMe Machines: Writeups & Attack Paths by OS and Difficulty | ZeroBox',
    description: `Directory of ${model.machines.length} Hack The Box and TryHackMe machines with writeups and attack paths for the solved ones, grouped by platform, OS and difficulty.`,
    h1: 'Hack The Box and TryHackMe machines',
    body: parts.join('\n'),
    crumbs: [['Home', '/'], ['Machines', '/machines/']],
    ogType: 'website',
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
      title: `${t.name} Cheatsheet: OSCP & CTF Commands | ZeroBox`,
      description: `${t.name} cheatsheet with ${t.items.length} tested commands for OSCP, CPTS and CTF labs: ${t.items.slice(0, 3).map((i) => i.title).join(', ')} and more.`,
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
    title: 'Command Reference by Topic: Recon, Web, AD, Privesc | ZeroBox',
    description: 'Free OSCP and CTF cheatsheets by topic: recon and port scanning, web fuzzing, exploitation, Linux and Windows privesc, Active Directory, pivoting and file transfers.',
    h1: 'Pentest command reference by topic',
    body: [
      `<p class="lead">Command cheatsheets for penetration testing labs and OSCP preparation, grouped by phase. Every command is a template you can adapt to your target.</p>`,
      `<div class="grid">${model.topics.map((t) => card(`/cheatsheets/${t.slug}/`, t.name, `${t.items.length} commands`)).join('')}${card('/revshells/', 'Reverse shells', `${model.shellCount} reverse, bind and TTY shell one-liners`)}</div>`,
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
      title: `${ph.title}: Pentest Methodology Checklist | ZeroBox`,
      description: `${ph.title} checklist: ${ph.description}`,
      h1: ph.title,
      body,
      crumbs: [['Home', '/'], ['Methodology', '/methodology-guide/'], [ph.shortTitle, p]],
    }),
    0.7
  );
}
emit(
  'methodology-hub',
  '/methodology-guide/',
  renderPage({
    path: '/methodology-guide/',
    title: 'Pentest Methodology: Enumeration to Post-Exploitation Checklist | ZeroBox',
    description: `An ${model.phases.length}-phase pentest methodology and enumeration checklist for OSCP and CTF labs, from host discovery to post-exploitation, with copyable commands.`,
    h1: 'Pentest methodology and enumeration checklist',
    body: [
      `<p class="lead">A phase-by-phase attack lifecycle for CTFs and OSCP-style labs. Work through the phases in order, and branch by service when you find web, file sharing, database or remote access ports.</p>`,
      `<div class="grid">${model.phases.map((ph) => card(`/methodology/${ph.slug}/`, ph.title, `${ph.itemCount} items. ${ph.subtitle}`)).join('')}</div>`,
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
      title: 'Reverse Shell One-Liners by Language: Bash, Python, PHP | ZeroBox',
      description: `OSCP reverse shell cheatsheet: ${model.shellCount} one-liners for Bash, Netcat, Python, PHP, PowerShell, Java, Perl and more, plus bind shells and TTY upgrades.`,
      h1: 'Reverse shell one-liners by language',
      body,
      crumbs: [['Home', '/'], ['Reverse shells', '/revshells/']],
      ld: [{ '@context': 'https://schema.org', '@type': 'TechArticle', headline: 'Reverse shell cheat sheet', url: ORIGIN + '/revshells/', ...dmField('revshells'), inLanguage: 'en' }],
    }),
    0.9
  );
}

// ===================== CPTS notes =====================
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
        return n ? `<a href="/cpts-notes/${n.slug}/">${t}</a>` : t;
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
    const p = `/cpts-notes/${n.slug}/`;
    const body = [
      `<p class="lead">${esc(n.enSummary || n.summary)}</p>`,
      n.tools && n.tools.length ? `<p>${n.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : '',
      mdToHtml(n.rawMarkdown),
      `<h2>More CPTS notes</h2><ul>${model.notes.filter((o) => o !== n).map((o) => `<li><a href="/cpts-notes/${o.slug}/">${esc(o.title)}</a></li>`).join('')}</ul>`,
      ctaBox({ body: 'Keep these notes in your own private vault.', href: '/cpts-manual/', label: 'Open CPTS notes' }),
    ].join('\n');
    emit(
      'cpts-note',
      p,
      renderPage({
        path: p,
        title: `${n.title.replace(/^\d+\.\s*/, '')}: CPTS & OSCP Notes | ZeroBox`,
        description: n.enSummary || n.summary,
        h1: n.title.replace(/^\d+\.\s*/, ''),
        body,
        crumbs: [['Home', '/'], ['CPTS notes', '/cpts-notes/'], [n.title.replace(/^\d+\.\s*/, ''), p]],
      }),
      0.6
    );
  }
  emit(
    'cpts-hub',
    '/cpts-notes/',
    renderPage({
      path: '/cpts-notes/',
      title: 'CPTS & OSCP Study Notes: Recon, AD, Privesc, Pivoting | ZeroBox',
      description: `${model.notes.length} concise CPTS and OSCP study notes with commands: recon, web exploitation, privilege escalation, Active Directory, Kerberos, pivoting and shells.`,
      h1: 'CPTS and OSCP study notes',
      body: [
        `<p class="lead">Short field-manual notes with the commands you need during a lab or exam.</p>`,
        `<div class="grid">${model.notes.map((n) => card(`/cpts-notes/${n.slug}/`, n.title, n.enSummary || n.summary)).join('')}</div>`,
      ].join('\n'),
      crumbs: [['Home', '/'], ['CPTS notes', '/cpts-notes/']],
      ogType: 'website',
    }),
    0.7
  );
}

// ===================== Certification + technique hubs =====================
const hubWords = { cert: [], tech: [] };
const wc = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const SAFE_ROOM = /^https:\/\/(www\.)?(app\.hackthebox\.com|tryhackme\.com)\//;
const diffId = (d) => slugify(d);
const platLabel = (list) => [...new Set(list.map((m) => m.platform))].sort().join(' & ');
const osCounts = (list) => {
  const c = {};
  for (const m of list) c[m.os] = (c[m.os] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
const nameCell = (m) =>
  m.hasPage
    ? `<a href="${mUrl(m)}">${esc(m.name)}</a>`
    : SAFE_ROOM.test(m.roomUrl || '')
      ? `<a href="${esc(m.roomUrl)}" rel="${ROOM_REL}">${esc(m.name)}</a>`
      : esc(m.name);
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
const techLastmod = gitDate('scripts/lib/techniques.cjs') ? [hubLastmod, gitDate('scripts/lib/techniques.cjs')].filter(Boolean).sort().pop() : null;

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
  'HTB-Starting-Point': {
    what: 'HTB Starting Point is the guided beginner track on Hack The Box, organised into tiers that introduce core services, simple web flaws and first privilege escalations. It is not a certification, but it is the usual entry route before OSCP or CPTS style preparation.',
    why: 'These machines are short and forgiving, so they are ideal for building the habit of scanning, enumerating each service and writing down what you learn. Finish a tier, then repeat the box without the guide to check that the process has stuck.',
  },
};
for (const hub of certHubs) {
  const { cert, name, machines } = hub;
  const p = `/${hub.slug}/`;
  const info = CERT_INFO[cert] || {
    what: `${name} is a certification path covered by the machines listed on this page.`,
    why: 'Working through varied boxes builds the enumeration and exploitation habits that practical exams reward.',
  };
  const isTrack = cert === 'HTB-Starting-Point';
  const label = isTrack ? `${name} Machines` : `${name}-Like Machines`;
  const plats = platLabel(machines);
  const solved = machines.filter((m) => m.hasPage).length;
  const { jump, tables, ordered } = machineSections(machines);
  const intro = [
    `<p class="lead">${esc(info.what)}</p>`,
    `<p>The ${machines.length} machines on this page are tagged ${esc(name)} in the ZeroBox catalog and come from ${esc(plats)}. By operating system that is ${esc(osLine(machines))}. ${esc(info.why)}</p>`,
    `<p>To use the list, start at the easiest group and work upward, spending real time on enumeration before looking at any help. After each box, write down the foothold, the escalation and what you would do faster next time. ${solved ? `${solved} of these are targets I solved myself, so they link to an attack path summary on this site; the others link to the official room. ` : 'Each machine links to its official room. '}Once you are comfortable, rehearse under pressure in the <a href="/exam/">exam simulator</a>, and follow the phase-by-phase <a href="/methodology-guide/">pentest methodology checklist</a> so you do not skip steps. You can also browse the <a href="/techniques/">technique hubs</a> to drill one skill at a time.</p>`,
  ].join('\n');
  const introWords = wc(intro);
  if (introWords < 150 || introWords > 250) console.warn(`cert intro ${cert}: ${introWords} words (target 150-250)`);
  const body = [
    intro,
    `<h2>Jump to difficulty</h2>${jump}`,
    `<h2>${esc(name)} machine list by difficulty</h2>`,
    tables,
    ctaBox({ title: 'Track your progress.', body: 'ZeroBox keeps a Kanban board, notes and checklists for every box, offline in your browser.', href: '/tracker/', label: 'Open tracker' }),
    `<h2>Related guides</h2><div class="chips"><a href="/exam/">Exam simulator</a><a href="/methodology-guide/">Methodology</a><a href="/techniques/">Techniques</a><a href="/machines/">All machines</a>${certHubs.filter((o) => o !== hub).map((o) => `<a href="/${o.slug}/">${esc(o.name)} machines</a>`).join('')}</div>`,
    `<p class="note">Machines belong to ${esc(plats)}. ZeroBox is not affiliated with the platforms or certification bodies named here.</p>`,
  ].join('\n');
  hubWords.cert.push([cert, wc(body)]);
  hub.url = p;
  hub.title = `${label} List: ${machines.length} ${plats} Boxes by Difficulty | ZeroBox`;
  emit(
    'cert-hub',
    p,
    renderPage({
      path: p,
      title: hub.title,
      description: `${machines.length} ${plats} machines for ${name} preparation, grouped from ${ordered[0].difficulty} to ${ordered[ordered.length - 1].difficulty} with OS, platform and technique tags. Free list with links.`,
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
    ctaBox({ title: 'Practise it, then track it.', body: 'Log every box and the commands you used in ZeroBox.', href: '/tracker/', label: 'Open tracker' }),
  ].join('\n');
  hubWords.tech.push([g.slug, wc(body)]);
  const plats = platLabel(g.machines);
  emit(
    'technique',
    p,
    renderPage({
      path: p,
      title: `${g.name}: ${g.machines.length} Practice Machines & Key Commands | ZeroBox`,
      description: `${g.name} explained with key commands and ${g.machines.length} ${plats} practice machines grouped by difficulty, for OSCP, CPTS and CTF preparation.`,
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
    title: `Pentest Techniques: ${techGroups.length} Attack Topics with Practice Machines | ZeroBox`,
    description: `${techGroups.length} penetration testing techniques, from Active Directory and SQL injection to privilege escalation and pivoting, each with key commands and matching HTB and THM machines.`,
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

// ===================== static.css, sitemap =====================
fs.writeFileSync(path.join(distDir, 'static.css'), STATIC_CSS, 'utf8');

const staticUrls = [
  { loc: '/', priority: '1.0', lastmod: gitDate('scripts/templates/landing.html') },
  ...routes.map((r) => ({ loc: r.path, priority: r.path === '/tracker/' ? '0.9' : '0.7', lastmod: gitDate('src/seo/routeMeta.json') })),
];
const seen = new Set();
const all = [...staticUrls, ...pages.map((p) => ({ loc: p.loc, priority: p.priority.toFixed(1), lastmod: p.lastmod }))].filter((u) => !seen.has(u.loc) && seen.add(u.loc));
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  all.map((u) => `  <url><loc>${ORIGIN}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n') +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');

console.log(`machines: ${model.machines.length} total, ${withPage.length} owner-solved pages`);
console.log('pages by type:', counts, `total generated: ${pages.length}`);
console.log(`sitemap URLs: ${all.length}`);
