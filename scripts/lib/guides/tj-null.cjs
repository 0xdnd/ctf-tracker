// /tj-null-list/
const PATH = '/tj-null-list/';
const SHEET = 'https://docs.google.com/spreadsheets/d/1dwSMIAPIam0PuRBkCiDI88pU3yzrqqHkDtBngUHNCw8/';
const GUIDE = 'https://www.netsecfocus.com/oscp/2021/05/06/The_Journey_to_Try_Harder-_TJnull-s_Preparation_Guide_for_PEN-200_PWK_OSCP_2.0.html';
const MIRROR = 'https://0xdf.gitlab.io/cheatsheets/offsec';

// Names per tab of TJ Null's PWK V3 sheet, checked on SOURCE.asOf. The live sheet is the source of truth and changes over time.
const SOURCE = require('../../../src/data/trackSources/tjnull-oscp.json');
const PG_CATALOG = require('../../../src/data/catalogSources/pg.json');
const V3_HTB = SOURCE.names.htb;
const key = (s) => String(s).toLowerCase().replace(/\s+/g, '');
const normAlnum = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const PG_BY_NORM = new Map(PG_CATALOG.map((m) => [normAlnum(m.name), m]));
const V3 = new Set(V3_HTB.map(key));
const DIFF = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const cmp = (a, b) => DIFF.indexOf(a.difficulty) - DIFF.indexOf(b.difficulty) || a.os.localeCompare(b.os) || a.name.localeCompare(b.name);

function build({ model, esc }) {
  const link = (m) => {
    if (m.hasPage) return `<a href="/machines/${m.slug}/">${esc(m.name)}</a>`;
    if (/^https:\/\/(www\.)?(app\.hackthebox\.com|tryhackme\.com)\//.test(m.roomUrl || ''))
      return `<a href="${esc(m.roomUrl)}" rel="nofollow noopener">${esc(m.name)}</a>`;
    return esc(m.name);
  };
  const isTagged = (m) => (m.certifications || []).includes('OSCP');
  const onList = model.machines.filter((m) => m.platform === 'HTB' && V3.has(key(m.name))).sort(cmp);
  const others = model.machines.filter((m) => isTagged(m) && !onList.includes(m)).sort((a, b) => a.platform.localeCompare(b.platform) || cmp(a, b));
  const taggedOnList = onList.filter(isTagged).length;
  const names = (arr, n) => arr.slice(0, n).map((m) => m.name).join(', ');
  const easyLinux = onList.filter((m) => m.difficulty === 'Easy' && m.os === 'Linux');
  const easyWin = onList.filter((m) => m.difficulty === 'Easy' && m.os === 'Windows');
  const medWin = onList.filter((m) => m.difficulty === 'Medium' && m.os === 'Windows');
  const hard = onList.filter((m) => m.difficulty === 'Hard' || m.difficulty === 'Insane');

  const pgPlayMatched = SOURCE.names.pgPlay.filter((e) => PG_BY_NORM.has(normAlnum(e.name)));
  const pgPracticeMatched = SOURCE.names.pgPractice.filter((e) => PG_BY_NORM.has(normAlnum(e.name)));
  const totalPgMatched = pgPlayMatched.length + pgPracticeMatched.length;
  const totalPgListed = SOURCE.names.pgPlay.length + SOURCE.names.pgPractice.length;

  const pgTable = (arr, label) => {
    const rows = arr
      .map((e) => {
        const cat = PG_BY_NORM.get(normAlnum(e.name));
        const os = (cat && cat.os) || e.os || 'Linux';
        const diff = (cat && cat.difficulty) || e.difficulty || '—';
        const action = cat
          ? `<a href="/tracker/?target=${encodeURIComponent(cat.id)}">Open in tracker</a>`
          : `<a href="/tracker/?addCustom=${encodeURIComponent(e.name)}&amp;os=${encodeURIComponent(os)}&amp;cert=OSCP">Add to my tracker</a>`;
        return `<tr data-machine-id="${esc(cat ? cat.id : '')}"><td>${esc(e.name)}</td><td>${esc(os)}</td><td>${esc(diff)}</td><td>${action}</td></tr>`;
      })
      .join('');
    return `<table><thead><tr><th>Machine (${esc(label)})</th><th>OS</th><th>Difficulty</th><th>ZeroBox tracker</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const rowsA = onList
    .map((m) => `<tr data-machine-id="${esc(m.id)}"><td>${link(m)}</td><td>${esc(m.os)}</td><td>${esc(m.difficulty)}</td><td>${isTagged(m) ? 'Yes' : 'No'}</td></tr>`)
    .join('');
  const rowsB = others
    .map((m) => `<tr data-machine-id="${esc(m.id)}"><td>${link(m)}</td><td>${esc(m.platform)}</td><td>${esc(m.os)}</td><td>${esc(m.difficulty)}</td></tr>`)
    .join('');

  const faq = [
    [
      'Who made the TJ Null list?',
      'It is maintained by TJ Null (TJnull) and published through NetSec Focus as a Google Sheet. ZeroBox did not create it and does not republish it; this page links to the original and shows how it overlaps with the ZeroBox catalogue.',
    ],
    [
      'Is the list only Hack The Box?',
      "No. The original guide describes separate lists for Proving Grounds, Hack The Box and Vulnhub, all on the same spreadsheet. TryHackMe rooms are not part of TJ Null's sheet, which is why ZeroBox tags them separately.",
    ],
    [
      'Are the Proving Grounds boxes in the ZeroBox tracker?',
      `Yes. ${totalPgMatched} of the ${totalPgListed} Proving Grounds Play and Practice machines on the sheet are built into the ZeroBox Proving Grounds catalogue (${pgPlayMatched.length} of ${SOURCE.names.pgPlay.length} on Play and all ${pgPracticeMatched.length} on Practice). Any remaining community Play box can be added in one click as a custom target.`,
    ],
    [
      'How many Hack The Box machines from the TJ Null list are in the ZeroBox catalogue?',
      `${onList.length} Hack The Box machines from the list are in the catalogue, and ${taggedOnList} of them carry the ZeroBox OSCP tag. The last column of the table shows the tag, not whether a box is on the list.`,
    ],
    [
      'In what order should I work through the boxes?',
      'Start with easy Linux, then easy Windows, then medium Windows and domain boxes to build Active Directory habits. Leave the hard boxes until the first three feel routine.',
    ],
  ];

  const body = `<h2>What the TJ Null list is</h2>
<p>TJ Null, writing on NetSec Focus, put together lists of practice machines that resemble what the OSCP exam rewards: a clear enumeration path, public exploits that need small edits, and classic privilege escalation. The original post, <a href="${GUIDE}" rel="noopener">The Journey to Try Harder</a>, links the spreadsheet, and the sheet itself is at the <a href="${SHEET}" rel="noopener">NetSec Focus Trophy Room</a>. It has lists for Proving Grounds, Hack The Box and Vulnhub. The current Hack The Box tab is headed "OSCPv3 OSCP-like machines", and the list changes, so use the sheet as the source of truth.</p>
<p>This page lists machine names only, with credit to the sheet (checked ${SOURCE.asOf}), not its notes or layout. It shows which Hack The Box and Proving Grounds machines are in the ZeroBox catalogue so you can track them, using the Hack The Box names as mirrored on <a href="${MIRROR}" rel="noopener">0xdf's cheat sheet</a>.</p>
<h2>How to work through it</h2>
<ul>
<li>Spend the first 45 minutes of every box on enumeration alone. Write down every port, every version and every odd page before you try an exploit.</li>
<li>Take no hints for an hour. If you are stuck, record exactly where, then use a hint and note what you missed.</li>
<li>After each box, write a three line summary: the foothold, the escalation, and one habit to change.</li>
<li>Do not binge Active Directory boxes first. Mix them in, because the exam gives that set the most points.</li>
<li>Re-solve a few boxes from scratch later, with a timer.</li>
</ul>
<h2>On the list, in the ZeroBox catalogue</h2>
<p>${onList.length} Hack The Box machines from the list are in the catalogue, and ${taggedOnList} of them carry the ZeroBox OSCP tag. Others carry tags from other tracks or none, so the last column shows the tag, not whether a box is on TJ Null's list. Machines with a ZeroBox writeup link to an attack path page; the rest link to the official room.</p>
<table><thead><tr><th>Machine (Hack The Box)</th><th>OS</th><th>Difficulty</th><th>ZeroBox OSCP tag</th></tr></thead><tbody>${rowsA}</tbody></table>
<h2>Other machines the catalogue tags OSCP</h2>
<p>These ${others.length} carry the ZeroBox OSCP tag but are not on the Hack The Box tab above, mostly TryHackMe rooms. They are useful practice, but they are not TJ Null's picks. For the same machines grouped by difficulty, see <a href="/oscp-like-machines/">OSCP-like machines</a>.</p>
<table><thead><tr><th>Machine</th><th>Platform</th><th>OS</th><th>Difficulty</th></tr></thead><tbody>${rowsB}</tbody></table>
<h2>Proving Grounds Play</h2>
<p>The ${SOURCE.names.pgPlay.length} machines on the Proving Grounds Play tab (${SOURCE.asOf}). Play is free to use with an OffSec account. ${pgPlayMatched.length} of these ${SOURCE.names.pgPlay.length} machines are in the ZeroBox Proving Grounds catalogue with difficulty metadata; the remaining ${SOURCE.names.pgPlay.length - pgPlayMatched.length} community boxes have a one-click "Add to my tracker" link that creates a custom target in your local workspace.</p>
${pgTable(SOURCE.names.pgPlay, 'Proving Grounds Play')}
<h2>Proving Grounds Practice</h2>
<p>The ${SOURCE.names.pgPractice.length} machines on the Proving Grounds Practice tab (${SOURCE.asOf}). Practice requires a paid OffSec subscription. All ${pgPracticeMatched.length} machines are built into the ZeroBox Proving Grounds catalogue and tagged OSCP, so you can filter by the TJ Null track or open any box directly on your board.</p>
${pgTable(SOURCE.names.pgPractice, 'Proving Grounds Practice')}
<h2>A suggested order</h2>
<ol>
<li>Easy Linux for the loop of scan, web enumeration, foothold and sudo or SUID escalation: ${esc(names(easyLinux, 5))}.</li>
<li>Easy Windows for service abuse and token privileges: ${esc(names(easyWin, 5))}.</li>
<li>Medium Windows and domain boxes to build Active Directory habits: ${esc(names(medWin, 5))}.</li>
<li>Hard boxes last, once the first three feel routine: ${esc(names(hard, 3))}.</li>
</ol>
<p>Then run a timed rehearsal in the <a href="/oscp-exam-simulator/">exam simulator</a> and check your pacing against the <a href="/oscp-exam-scoring-and-time-budget/">OSCP scoring and time budget</a> guide. Keep notes in the shape of the <a href="/oscp-report-template/">OSCP report template</a> from the first box, so the write-up is already structured when the exam ends. To drill one skill at a time, the <a href="/techniques/active-directory/">Active Directory</a> hub groups the domain boxes.</p>`;

  return {
    path: PATH,
    crumb: 'TJ Null list',
    title: `TJ Null OSCP List (${SOURCE.asOf.slice(0, 4)}): HTB & Proving Grounds Boxes`,
    description: `TJ Null OSCP list checked ${SOURCE.asOf}: ${V3_HTB.length} Hack The Box and ${totalPgListed} Proving Grounds machines in ZeroBox, a study order, and a free offline tracker.`,
    h1: 'TJ Null OSCP list: the boxes you can track',
    lead: `The TJ Null list is a community-maintained spreadsheet of OSCP-like practice machines across Hack The Box and OffSec Proving Grounds. This page credits the original, maps the ${onList.length} Hack The Box and ${totalPgMatched} Proving Grounds machines built into the ZeroBox catalogue, lets you add any remaining box in one click, and gives a suggested study order.`,
    body,
    topCta: { body: 'Open the TJ Null OSCP track in ZeroBox, free.', href: '/tracker/?track=tjnull-oscp', label: 'Open TJ Null track' },
    cta: {
      title: 'Track every box in one place.',
      body: 'Filter by the TJ Null OSCP track, log your notes and flags, and watch your time per box. Offline, no account.',
      href: '/tracker/?track=tjnull-oscp',
      label: 'Open tracker',
    },
    faq,
    related: ['/oscp-like-machines/', '/oscp-exam-scoring-and-time-budget/', '/machines/', '/methodology-guide/', '/htb-progress-tracker/'],
    sources: [
      [GUIDE, 'NetSec Focus: The Journey to Try Harder, by TJnull', 'published 2021-05-06'],
      [SHEET, 'NetSec Focus Trophy Room (TJ Null sheet)'],
      [MIRROR, '0xdf: OffSec exam HTB lists', 'used to read the current Hack The Box tab'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with OffSec, Hack The Box or TJ Null.',
  };
}

module.exports = { build };
