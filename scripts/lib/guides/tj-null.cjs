// /tj-null-list/
const PATH = '/tj-null-list/';
const SHEET = 'https://docs.google.com/spreadsheets/d/1dwSMIAPIam0PuRBkCiDI88pU3yzrqqHkDtBngUHNCw8/';
const GUIDE = 'https://www.netsecfocus.com/oscp/2021/05/06/The_Journey_to_Try_Harder-_TJnull-s_Preparation_Guide_for_PEN-200_PWK_OSCP_2.0.html';
const MIRROR = 'https://0xdf.gitlab.io/cheatsheets/offsec';

// Hack The Box names under "OSCPv3 OSCP-like machines" as mirrored by 0xdf (see MIRROR), checked 2026-10-08.
// The live sheet is the source of truth and changes over time.
const V3_HTB = [
  'Eighteen', 'Browsed', 'Expressway', 'Signed', 'Editor', 'Outbound', 'Voleur', 'TombWatcher', 'Puppy', 'Fluffy', 'TheFrizz',
  'Dog', 'Titanic', 'Administrator', 'LinkVortex', 'Certified', 'Cicada', 'Editorial', 'BoardLight', 'Mailing', 'Usage',
  'Monitored', 'Manager', 'CozyHosting', 'Builder', 'Keeper', 'Sau', 'Broker', 'Intentions', 'Aero', 'Busqueda', 'Escape',
  'Soccer', 'Flight', 'UpDown', 'Support', 'StreamIO', 'Timelapse', 'Pandora', 'Return', 'Jeeves', 'Intelligence', 'Blackfield',
  'Magic', 'Cascade', 'Sauna', 'ServMon', 'Monteverde', 'Forest', 'Heist', 'Networked', 'Help', 'Access', 'Active',
];
const key = (s) => String(s).toLowerCase().replace(/\s+/g, '');
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

  const rowsA = onList
    .map((m) => `<tr><td>${link(m)}</td><td>${esc(m.os)}</td><td>${esc(m.difficulty)}</td><td>${isTagged(m) ? 'Yes' : 'No'}</td></tr>`)
    .join('');
  const rowsB = others
    .map((m) => `<tr><td>${link(m)}</td><td>${esc(m.platform)}</td><td>${esc(m.os)}</td><td>${esc(m.difficulty)}</td></tr>`)
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
      'How is this page different from the OSCP-like machines page?',
      'The OSCP-like machines page groups every machine ZeroBox tags OSCP by difficulty. This page starts from the TJ Null list itself, shows which of its Hack The Box machines the catalogue contains, and suggests an order.',
    ],
  ];

  const body = `<h2>What the TJ Null list is</h2>
<p>TJ Null, writing on NetSec Focus, put together lists of practice machines that resemble what the OSCP exam rewards: a clear enumeration path, public exploits that need small edits, and classic privilege escalation. The original post, <a href="${GUIDE}" rel="noopener">The Journey to Try Harder</a>, links the spreadsheet, and the sheet itself is at the <a href="${SHEET}" rel="noopener">NetSec Focus Trophy Room</a>. It has lists for Proving Grounds, Hack The Box and Vulnhub. The current Hack The Box tab is headed "OSCPv3 OSCP-like machines", and the list changes, so use the sheet as the source of truth.</p>
<p>This page does not copy the sheet. It shows which of its Hack The Box machines exist in the ZeroBox catalogue so you can track them, using the names as mirrored on <a href="${MIRROR}" rel="noopener">0xdf's cheat sheet</a> on 2026-10-08.</p>
<h2>How to work through it</h2>
<ul>
<li>Spend the first 45 minutes of every box on enumeration alone. Write down every port, every version and every odd page before you try an exploit.</li>
<li>Take no hints for an hour. If you are stuck, record exactly where, then use a hint and note what you missed.</li>
<li>After each box, write a three line summary: the foothold, the escalation, and one habit to change.</li>
<li>Do not binge Active Directory boxes first. Mix them in, because the exam gives that set the most points.</li>
<li>Re-solve a few boxes from scratch later, with a timer.</li>
</ul>
<h2>On the list, in the ZeroBox catalogue</h2>
<p>${onList.length} Hack The Box machines from the list are in the catalogue, and ${taggedOnList} of them carry the ZeroBox OSCP tag. Others carry tags from other tracks or none, so the last column shows the tag, not whether a box is on TJ Null's list. Machines I have solved link to an attack path page; the rest link to the official room.</p>
<table><thead><tr><th>Machine (Hack The Box)</th><th>OS</th><th>Difficulty</th><th>ZeroBox OSCP tag</th></tr></thead><tbody>${rowsA}</tbody></table>
<h2>Other machines the catalogue tags OSCP</h2>
<p>These ${others.length} carry the ZeroBox OSCP tag but are not on the Hack The Box tab above, mostly TryHackMe rooms. They are useful practice, but they are not TJ Null's picks. For the same machines grouped by difficulty, see <a href="/oscp-like-machines/">OSCP-like machines</a>.</p>
<table><thead><tr><th>Machine</th><th>Platform</th><th>OS</th><th>Difficulty</th></tr></thead><tbody>${rowsB}</tbody></table>
<h2>A suggested order</h2>
<ol>
<li>Easy Linux for the loop of scan, web enumeration, foothold and sudo or SUID escalation: ${esc(names(easyLinux, 5))}.</li>
<li>Easy Windows for service abuse and token privileges: ${esc(names(easyWin, 5))}.</li>
<li>Medium Windows and domain boxes to build Active Directory habits: ${esc(names(medWin, 5))}.</li>
<li>Hard boxes last, once the first three feel routine: ${esc(names(hard, 3))}.</li>
</ol>
<p>Then run a timed rehearsal in the <a href="/exam/">exam simulator</a> and check your pacing against the <a href="/oscp-exam-scoring-and-time-budget/">OSCP scoring and time budget</a> guide.</p>`;

  return {
    path: PATH,
    crumb: 'TJ Null list',
    title: 'TJ Null OSCP List: HTB & THM Boxes You Can Track',
    description:
      'What the TJ Null OSCP-like list is, how to work it, and which Hack The Box machines from it you can track in ZeroBox, plus a suggested order.',
    h1: 'TJ Null OSCP list: the boxes you can track',
    lead: "The TJ Null list is a community-maintained spreadsheet of OSCP-like practice machines, mostly Hack The Box, Proving Grounds and Vulnhub. This page credits the original, shows which of its Hack The Box machines are in the ZeroBox catalogue, and gives a suggested order.",
    body,
    cta: {
      title: 'Track every box in one place.',
      body: 'Add the machines you are working through, log your notes and flags, and watch your time per box. Offline, no account.',
      href: '/tracker/',
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
