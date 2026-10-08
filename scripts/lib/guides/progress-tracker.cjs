// /htb-progress-tracker/
const PATH = '/htb-progress-tracker/';

function build({ model, esc }) {
  const total = model.machines.length;
  const cmp = [
    ['Counts machines you own', 'Yes, on that platform only', 'Only what you type in', 'Yes, across both platforms and your own targets'],
    ['Covers other labs (Proving Grounds, Vulnhub, custom)', 'No', 'Yes, manually', 'Yes, add any target'],
    ['Your notes, IPs and commands per box', 'Limited or none', 'One cell at a time', 'Per machine, with a detail view'],
    ['Time to foothold and to root', 'Not in the profile', 'If you type it', 'Recorded per machine'],
    ['Imports nmap output', 'No', 'No', 'Yes, .nmap, .gnmap, XML or raw text'],
    ['Works offline', 'No', 'Depends on the tool', 'Yes, after first load'],
    ['Account needed', 'Yes', 'Depends on the tool', 'No'],
  ]
    .map(([a, b, c, d]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`)
    .join('');

  const faq = [
    [
      'Does ZeroBox sync with my Hack The Box or TryHackMe account?',
      'No. It has no login with either platform. The catalogue is a static list of machines, and you update status, notes and flags yourself, which is also why nothing about your account leaves the browser.',
    ],
    [
      'Where is my data stored?',
      'In your browser, in LocalStorage and IndexedDB, on the device you use. There is no backend. Clearing site data deletes it, so export the JSON backup regularly.',
    ],
    [
      'Can I move my data to another computer?',
      'Yes. Export the workspace as a JSON backup and restore it on the other device. Nothing syncs automatically.',
    ],
    [
      'Can I track machines that are not in the catalogue?',
      'Yes. Add a custom target with its own name, platform, operating system and difficulty, which suits Proving Grounds boxes, CTF events and your own lab.',
    ],
  ];

  const body = `<h2>What the platform profiles cover</h2>
<p>Hack The Box and TryHackMe both show you a profile: owned machines or completed rooms, a rank or level, and badges. That is useful as a scoreboard and tells you nothing about how you got there. A profile will not tell you which technique cost you three hours, which box you abandoned at the foothold, or what you did differently the second time.</p>
<p>It also stops at the platform's edge. Proving Grounds, Vulnhub, event CTFs and a home lab do not appear on either profile, and neither platform keeps your private notes in a form you can search later.</p>
<h2>Profile, spreadsheet or ZeroBox</h2>
<table><thead><tr><th>Need</th><th>Platform profile</th><th>Spreadsheet</th><th>ZeroBox</th></tr></thead><tbody>${cmp}</tbody></table>
<p>A spreadsheet is a fine answer if you only want a list and a status column. It gets slow once you want the target IP, a log of commands, flags and screenshots in the same place. ZeroBox is built for that case, and has the weakness of any local tool: your data lives in one browser until you back it up.</p>
<h2>A workflow that holds up</h2>
<ol>
<li>Pick a machine from the catalogue of ${total} Hack The Box and TryHackMe machines, or add a custom one, and move it from Backlog to Active recon.</li>
<li>Put the target IP in the machine record. Start the clock when you start the box.</li>
<li>Run your scan and import the result, as described below, so open ports and services are stored with the machine.</li>
<li>Keep notes as you go: what you tried, what failed, the exact commands that worked.</li>
<li>Record the user and root flags when you get them, then add a short retrospective.</li>
<li>Review the board weekly. A column full of boxes stuck in Active recon points at an enumeration habit worth fixing.</li>
</ol>
<h2>Importing from nmap</h2>
<p>Save scan output with <code>-oN</code> (or <code>-oA</code>) and drop the file onto a machine card, or paste raw output into the scan box. ZeroBox accepts <code>.nmap</code>, <code>.gnmap</code>, XML and plain text, and fills in the open ports so you do not retype them. Always keep the original scan files too; the import is a convenience, not a replacement for your evidence folder. The <a href="/methodology-guide/">methodology checklist</a> shows where the scan fits in the wider process.</p>
<h2>Privacy</h2>
<p>The tracker runs entirely in your browser. Machine records, notes, IPs and flags are stored in LocalStorage and IndexedDB on your device, and the app needs no account. Any optional feature that would contact an outside service asks first. That matters when your notes hold lab credentials or client style data, and it is the main reason to prefer a local tool for exam preparation. The trade-off is that you own the backup: export the JSON file before you clear your browser or switch devices.</p>
<p>Once the board is set up, practise under pressure in the <a href="/exam/">exam simulator</a>, and pull ideas for your next box from the <a href="/machines/">machine directory</a>.</p>`;

  return {
    path: PATH,
    crumb: 'HTB and THM progress tracker',
    title: 'HTB & TryHackMe Progress Tracker (Free, Offline)',
    description:
      'What HTB and TryHackMe profiles do not track, how a spreadsheet compares with ZeroBox, plus a workflow with nmap imports. Free and offline.',
    h1: 'A free, offline progress tracker for HTB and TryHackMe',
    lead: 'Hack The Box and TryHackMe profiles count what you have owned, not how you solved it or what you would change, so most people keep a separate tracker. This page compares a profile, a spreadsheet and ZeroBox, and describes a workflow with nmap imports and local-only storage.',
    body,
    cta: {
      title: 'Try it with your next box.',
      body: 'Add a machine, import a scan, keep notes and flags in one place. It runs in your browser and needs no account.',
      href: '/tracker/',
      label: 'Open tracker',
    },
    faq,
    related: ['/tracker/', '/machines/', '/methodology-guide/', '/tj-null-list/', '/exam/'],
    sources: [],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box or TryHackMe.',
  };
}

module.exports = { build };
