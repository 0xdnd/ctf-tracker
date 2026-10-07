// Shared HTML layout + helpers for static content pages (CSS in dist/static.css, no JS).
const ORIGIN = 'https://ctftracker.com';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const NAV = [
  ['/', 'Home'],
  ['/machines/', 'Machines'],
  ['/cheatsheet-library/', 'Cheatsheets'],
  ['/methodology-guide/', 'Methodology'],
  ['/revshells/', 'Reverse Shells'],
];

function breadcrumbLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })),
  };
}

function truncate(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

/** opts: { path, title, description, h1, body, crumbs: [[name, path]...], ld?: object[] } */
function renderPage(opts) {
  const url = ORIGIN + opts.path;
  const crumbs = opts.crumbs || [['Home', '/']];
  const ld = [breadcrumbLd(crumbs), ...(opts.ld || [])]
    .map((o) => `  <script type="application/ld+json">${jsonLd(o)}</script>`)
    .join('\n');
  const nav = NAV.map(([p, l]) => `<a href="${p}">${esc(l)}</a>`).join('');
  const crumbHtml = crumbs
    .map(([n, p], i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`))
    .join(' <span class="sep">/</span> ');
  const desc = esc(truncate(opts.description, 158));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${desc}" />
  <meta name="theme-color" content="#0B0F19" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=12" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=12" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=12" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="stylesheet" href="/static.css" />
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; manifest-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self';" />
${ld}
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="brand" href="/"><img src="/icon-192.png" width="32" height="32" alt="" />ZeroBox</a>
      <nav class="top" aria-label="Primary">${nav}<a class="cta" href="/tracker/">Open ZeroBox</a></nav>
    </header>
    <nav class="crumbs" aria-label="Breadcrumb">${crumbHtml}</nav>
    <main>
      <h1>${esc(opts.h1)}</h1>
${opts.body}
    </main>
    <footer>
      <p><a href="/machines/">Machines</a><a href="/cheatsheet-library/">Cheatsheets</a><a href="/methodology-guide/">Methodology</a><a href="/revshells/">Reverse shells</a><a href="/cpts-notes/">CPTS notes</a><a href="/tracker/">Open ZeroBox</a><a href="https://github.com/0xdnd/ctf-tracker">GitHub</a></p>
      <p>ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec. Only test systems you are authorised to test.</p>
    </footer>
  </div>
</body>
</html>
`;
}

const STATIC_CSS = `:root{--bg:#0B0F19;--card:#121826;--line:#1f2a3d;--text:#e5e9f0;--muted:#9aa6b8;--accent:#10b981;--accent-ink:#04130d}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 0;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;color:var(--text);text-decoration:none;letter-spacing:.02em}
.brand img{width:32px;height:32px;border-radius:6px}
nav.top{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center}
nav.top a{color:var(--muted);text-decoration:none;font-size:14px}
nav.top a:hover{color:var(--text)}
nav.top a.cta{background:var(--accent);color:var(--accent-ink);font-weight:700;padding:7px 14px;border-radius:8px}
nav.crumbs{font-size:13px;color:var(--muted);margin:4px 0 8px}
nav.crumbs a{color:var(--muted)}
nav.crumbs .sep{opacity:.5}
h1{font-size:clamp(26px,4.5vw,38px);line-height:1.2;margin:8px 0 14px;letter-spacing:-.01em}
h2{font-size:clamp(20px,3vw,26px);margin:36px 0 10px;line-height:1.3}
h3{font-size:18px;margin:24px 0 6px}
p{margin:0 0 14px}
.lead{color:var(--muted);font-size:17px;max-width:760px}
.muted{color:var(--muted)}
ul,ol{padding-left:22px;margin:0 0 14px}
li{margin-bottom:4px}
pre{background:#0a0e17;border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-x:auto;margin:8px 0 14px;font-size:13.5px;line-height:1.5}
code{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace}
p code,li code,td code{background:#0a0e17;border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-size:.9em}
pre code{background:none;border:0;padding:0}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;text-decoration:none;color:var(--text)}
a.card:hover{border-color:var(--accent)}
.card h3{margin:0 0 4px;font-size:17px}
.card p{margin:0;color:var(--muted);font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:12px 0 20px}
.facts{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:15px}
.facts th,.facts td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.facts th{color:var(--muted);font-weight:600;width:34%}
table.list{width:100%;border-collapse:collapse;font-size:14px;margin:6px 0 18px}
table.list th,table.list td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
table.list th{color:var(--muted);font-weight:600}
.tag{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:0 9px;font-size:12px;color:var(--muted);margin:0 4px 4px 0}
.chips a{display:inline-block;margin:0 8px 8px 0;padding:4px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:14px}
.chips a:hover{border-color:var(--accent)}
.cta-box{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:28px 0}
.btn{display:inline-block;padding:10px 20px;border-radius:10px;background:var(--accent);color:var(--accent-ink);font-weight:700;text-decoration:none}
.note{color:var(--muted);font-size:14px}
footer{border-top:1px solid var(--line);margin-top:48px;padding:24px 0 40px;color:var(--muted);font-size:14px}
footer a{margin-right:16px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:600px){table.list .hide-sm{display:none}}
`;

module.exports = { ORIGIN, esc, jsonLd, renderPage, truncate, STATIC_CSS, NAV };
