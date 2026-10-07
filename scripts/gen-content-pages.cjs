// Post-build static content pages for the WEB build only (runs after prerender).
// Generates indexable HTML from the app's own data: machines, cheatsheets, methodology,
// reverse shells, CPTS notes, plus dist/static.css and dist/sitemap.xml.
const fs = require('fs');
const path = require('path');
const { getModel } = require('./lib/content-model.cjs');
const { ORIGIN, esc, renderPage, STATIC_CSS } = require('./lib/layout.cjs');

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

function emit(type, urlPath, html, priority) {
  const dir = path.join(distDir, urlPath.replace(/^\/|\/$/g, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  pages.push({ loc: urlPath, type, priority, lastmod: gitDate(SRC[TYPE_SRC[type]]) });
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
const PLATFORM_NAME = { HTB: 'Hack The Box', THM: 'TryHackMe' };
const DIFF_ORDER = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const mUrl = (m) => `/machines/${m.slug}/`;

const normTag = (t) => String(t).toLowerCase().replace(/[-_]+/g, ' ').trim();
const tagTargets = [
  ...model.topics.map((t) => ({ keys: [t.id, t.slug, t.name], href: `/cheatsheets/${t.slug}/` })),
  ...model.phases.map((p) => ({ keys: [p.slug, p.shortTitle], href: `/methodology/${p.slug}/` })),
].map((x) => ({ ...x, keys: x.keys.map(normTag) }));
function tagLink(t) {
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
  const wLink = m.ownWriteup ? `<a class="btn" href="${esc(m.ownWriteup)}" rel="noopener">Read the full writeup</a>` : '';
  const roomLink = m.roomUrl ? `<a href="${esc(m.roomUrl)}" rel="${ROOM_REL}">Open ${esc(m.name)} on ${esc(plat)}</a>` : '';
  const body = [
    `<p class="lead">${esc(m.name)} is a ${esc(m.difficulty.toLowerCase())} ${esc(m.os)} machine on ${esc(plat)} that I solved myself. This page is my short attack path summary and the techniques it trains.</p>`,
    wLink || roomLink ? `<div class="cta-box"><p>${wLink}${wLink && roomLink ? ' &nbsp; ' : ''}${roomLink}</p></div>` : '',
    `<table class="facts"><tbody>${facts.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`,
    `<h2>Attack path summary</h2><p>${esc(summary)}</p>`,
    tagList.length ? `<h2>Techniques</h2><p>${tagList.map(tagLink).join(' ')}</p>` : '',
    rel.length
      ? `<h2>Related solved machines</h2><p class="note">Other machines I solved that share techniques with ${esc(m.name)}.</p><ul>${rel
          .map((r) => `<li><a href="${mUrl(r)}">${esc(r.name)}</a> (${esc(r.platform)} ${esc(r.os)} ${esc(r.difficulty)})</li>`)
          .join('')}</ul>`
      : '',
    `<div class="cta-box"><p><strong>Track ${esc(m.name)} in ZeroBox.</strong> Log your progress, notes and flags offline in your browser, and follow the <a href="/methodology-guide/">pentest methodology checklist</a>.</p><p><a class="btn" href="/tracker/">Open ZeroBox</a></p></div>`,
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
  parts.push(`<div class="cta-box"><p><strong>Track every box offline.</strong> ZeroBox gives you a Kanban board for all of these machines. <a class="btn" href="/tracker/">Open ZeroBox</a></p></div>`);
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
    `<div class="cta-box"><p><strong>Use these commands with your values filled in.</strong> ZeroBox interpolates target IP, domain and credentials into every command. <a class="btn" href="/cheatsheets/">Open the cheatsheet</a></p></div>`,
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
      `<div class="cta-box"><p>Prefer an interactive version? <a class="btn" href="/cheatsheets/">Open the cheatsheet in ZeroBox</a></p></div>`,
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
    `<div class="cta-box"><p><strong>Tick items off per machine.</strong> ZeroBox tracks checklist progress for every target. <a class="btn" href="/methodology/">Open the methodology checklist</a></p></div>`,
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
      `<div class="cta-box"><p>Track progress per machine. <a class="btn" href="/methodology/">Open the checklist in ZeroBox</a></p></div>`,
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
    `<div class="cta-box"><p><strong>Generate with your values filled in.</strong> The ZeroBox cheatsheet inserts your LHOST and LPORT into every shell. <a class="btn" href="/cheatsheets/">Open the generator</a></p></div>`,
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
      `<div class="cta-box"><p>Keep these notes in your own private vault. <a class="btn" href="/cpts-manual/">Open CPTS notes in ZeroBox</a></p></div>`,
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
