// /htb-progress-tracker/
const PATH = '/htb-progress-tracker/';

function build({ model, esc }) {
  const total = model.catalogCounts.ctf.toLocaleString('en-US');
  const htbThm = model.catalogCounts.htbThm.toLocaleString('en-US');
  const cmp = [
    ['Counts machines you own', 'Yes, on that platform only', 'Only what you type in', 'Yes, across HTB, THM, PG, VulnHub and custom targets'],
    ['Covers Proving Grounds, VulnHub and custom labs', 'No', 'Yes, manually', `Yes, ${total} machines pre-loaded plus custom targets`],
    ['Your notes, IPs and commands per box', 'Limited or none', 'One cell at a time', 'Per machine, with a detail view and vault'],
    ['Time to foothold and to root', 'Not in the profile', 'If you type it', 'Recorded per machine'],
    ['Imports nmap output', 'No', 'No', 'Yes, .nmap, .gnmap, XML or raw text'],
    ['Works offline', 'No', 'Depends on the tool', 'Yes, after first load'],
    ['Account needed', 'Yes', 'Depends on the tool', 'No'],
  ]
    .map(([a, b, c, d]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`)
    .join('');

  const directAnswer = `<h2>What is the best way to track OSCP and CTF lab progress offline?</h2>
<p>ZeroBox is a free, offline-first OSCP study and CTF progress tracker that runs in your browser with no account. It ships with ${total} Hack The Box, TryHackMe, Proving Grounds and VulnHub machines (${htbThm} HTB and THM plus PG and VulnHub), imports Nmap scans, and stores notes, credentials and flags locally.</p>`;

  const faq = [
    [
      'Does ZeroBox sync with my Hack The Box or TryHackMe account?',
      'No. It has no login with either platform. The catalog is a static list of machines, and you update status, notes and flags yourself, which is also why nothing about your account leaves the browser.',
    ],
    [
      'Where is my data stored?',
      'In your browser, in LocalStorage and IndexedDB, on the device you use. There is no backend. Clearing site data deletes it, so export the JSON backup regularly.',
    ],
    [
      'Can I move my data to another computer?',
      'Yes. Export an encrypted sync file and merge it on the other device, or export a JSON backup and restore it there. Sync files are always encrypted, and nothing leaves your device unless you move the file yourself. Nothing syncs automatically.',
    ],
    [
      'Can I track machines that are not in the catalog?',
      `Yes. ZeroBox already includes ${total} Hack The Box, TryHackMe, Proving Grounds and VulnHub machines, and you can add custom targets for event CTFs, Pro Labs or your own home lab.`,
    ],
    [
      'Can ZeroBox import nmap scan output?',
      'Yes. ZeroBox accepts .nmap, .gnmap, XML and plain text scan output and fills in the open ports so you do not retype them. Keep the original scan files too, because the import is a convenience, not a replacement for your evidence folder.',
    ],
  ];

  const body = `<h2>What the platform profiles cover</h2>
<p>Hack The Box and TryHackMe both show you a profile: owned machines or completed rooms, a rank or level, and badges. That is useful as a scoreboard and tells you nothing about how you got there. A profile will not tell you which technique cost you three hours, which box you abandoned at the foothold, or what you did differently the second time.</p>
<p>It also stops at each platform's edge. Proving Grounds, VulnHub, event CTFs and a home lab do not appear on your HTB or THM profile, and neither platform keeps your private notes in a form you can search offline later.</p>
<h2>Profile, spreadsheet or ZeroBox</h2>
<table><thead><tr><th scope="col">Need</th><th scope="col">Platform profile</th><th scope="col">Spreadsheet</th><th scope="col">ZeroBox</th></tr></thead><tbody>${cmp}</tbody></table>
<p>A spreadsheet is a fine answer if you only want a list and a status column. It gets slow once you want the target IP, a log of commands, flags and screenshots in the same place. ZeroBox is built for that case, and has the weakness of any local tool: your data lives in one browser until you back it up.</p>
<h2>A workflow that holds up</h2>
<ol>
<li>Pick a machine from the catalog of ${total} Hack The Box, TryHackMe, Proving Grounds and VulnHub machines, or add a custom one, and move it from Backlog to Recon.</li>
<li>Put the target IP in the machine record. Start the clock when you start the box.</li>
<li>Run your scan and import the result, as described below, so open ports and services are stored with the machine.</li>
<li>Keep notes as you go: what you tried, what failed, the exact commands that worked.</li>
<li>Record the user and root flags when you get them, then add a short retrospective.</li>
<li>Review the board weekly. A column full of boxes stuck in Recon points at an enumeration habit worth fixing.</li>
</ol>
<h2>Importing from nmap</h2>
<p>Save scan output with <code>-oN</code> (or <code>-oA</code>) and drop the file onto a machine card, or paste raw output into the scan box. ZeroBox accepts <code>.nmap</code>, <code>.gnmap</code>, XML and plain text, and fills in the open ports so you do not retype them. Always keep the original scan files too; the import is a convenience, not a replacement for your evidence folder. The <a href="/methodology-guide/">methodology checklist</a> shows where the scan fits in the wider process.</p>
<h2>Privacy</h2>
<p>The tracker runs entirely in your browser. Machine records, notes, IPs and flags are stored in LocalStorage and IndexedDB on your device, and the app needs no account. Any optional feature that would contact an outside service asks first. That matters when your notes hold lab credentials or client style data, and it is the main reason to prefer a local tool for exam preparation. The trade-off is that you own the backup: export the JSON file before you clear your browser or switch devices.</p>
<p>Once the board is set up, practice under pressure in the <a href="/oscp-exam-simulator/">exam simulator</a>, and pull ideas for your next box from the <a href="/machines/">machine directory</a>. The <a href="/oscp-like-machines/">OSCP-like machines</a> list and the <a href="/cpts-exam-guide/">HTB CPTS exam guide</a> are good places to start.</p>`;

  return {
    path: PATH,
    crumb: 'CTF and OSCP progress tracker',
    title: 'OSCP & CTF Progress Tracker: HTB, THM, PG (Offline)',
    description:
      `Free offline OSCP and CTF progress tracker for ${total} HTB, TryHackMe, Proving Grounds and VulnHub machines, with Nmap imports and local notes.`,
    h1: 'A free, offline OSCP and CTF progress tracker for HTB, TryHackMe and Proving Grounds',
    lead: 'Platform profiles count what you have owned, not how you solved it or what you practiced. This guide compares a platform profile, a spreadsheet and ZeroBox, and walks through an offline study workflow with Nmap imports.',
    directAnswer,
    body,
    cta: {
      title: 'Try it with your next box.',
      body: 'Track HTB, TryHackMe, Proving Grounds, VulnHub and custom targets in one offline board. No account.',
      href: '/tracker/',
      label: 'Open the tracker',
    },
    faq,
    related: ['/tracker/', '/machines/', '/methodology-guide/', '/tj-null-list/', '/oscp-exam-simulator/'],
    sources: [['https://nmap.org/book/output-formats-xml-output.html', 'Nmap Reference Guide: XML Output Format']],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec.',
  };
}

module.exports = { build };
