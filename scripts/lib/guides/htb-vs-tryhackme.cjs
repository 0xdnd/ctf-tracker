// /htb-vs-tryhackme/
// The catalog has four sources (HTB, THM, Proving Grounds, VulnHub); this page compares only HTB and THM, the machines of the static directory that have a full entry (the directory also lists the PG and VulnHub rows without pages).
// Every number comes from model.machines and model.catalogCounts at build time.
const PATH = '/htb-vs-tryhackme/';
const DIFF_HARD = ['Hard', 'Insane'];
const AD_TAG = /active[ -]?directory|kerberos|bloodhound|dcsync|domain controller|domain admin|ad cs|adcs/i;

function build({ model, esc }) {
  const all = model.machines;
  const by = (p, f = () => true) => all.filter((m) => m.platform === p && f(m)).length;
  const has = (c) => (m) => (m.certifications || []).includes(c);
  const easy = (m) => m.difficulty === 'Easy' || m.difficulty === 'Very Easy';
  const win = (m) => m.os === 'Windows';
  const hard = (m) => DIFF_HARD.includes(m.difficulty);
  const ad = (m) => (m.tags || []).some((t) => AD_TAG.test(t));
  const plats = ['HTB', 'THM'];
  const row = (label, f) => `<tr><td>${esc(label)}</td>${plats.map((p) => `<td>${by(p, f)}</td>`).join('')}</tr>`;
  const H = (f) => by('HTB', f);
  const T = (f) => by('THM', f);
  const total = model.catalogCounts.htbThm.toLocaleString('en-US');
  const catalogTotal = model.catalogCounts.ctf.toLocaleString('en-US');
  // Per-source split from the same helper as /about/ (required here, not at load time, so the guide modules stay independent of it).
  const pgCount = require('../about.cjs').sourceCounts().pg.toLocaleString('en-US');

  const table = `<table><thead><tr><th>In the machine directory</th><th>Hack The Box</th><th>TryHackMe</th></tr></thead><tbody>
${row('Machines', () => true)}
${row('Linux', (m) => m.os === 'Linux')}
${row('Windows', win)}
${row('Other operating systems', (m) => m.os !== 'Linux' && m.os !== 'Windows')}
${row('Very Easy or Easy', easy)}
${row('Medium', (m) => m.difficulty === 'Medium')}
${row('Hard', (m) => m.difficulty === 'Hard')}
${row('Insane', (m) => m.difficulty === 'Insane')}
${row('Tagged OSCP (OSCP-like list)', has('OSCP'))}
${row('Tagged CPTS', has('CPTS'))}
${row('Tagged CRTO', has('CRTO'))}
${row('Active Directory or Kerberos tags', ad)}
${row('With a ZeroBox attack path page', (m) => m.hasPage)}
</tbody></table>`;

  const cmp = [
    ['Learning style', 'Guided rooms with tasks and questions', 'Standalone machines, usually unguided'],
    ['Best for', 'Beginners learning a topic from scratch', 'OSCP-style practice without a walkthrough'],
    ['Difficulty curve', 'Gradual, topic by topic', 'Machines rated from Easy to Insane'],
    ['OSCP-relevant content', 'OSCP-style rooms; not part of the TJ Null list', 'Has its own tab on the TJ Null list; see the OSCP-like machines page'],
    ['Free access', 'Free content plus a paid subscription', 'Free content plus a paid subscription; see current pricing'],
    ['Certification path', 'Its own certifications', 'CPTS and other HTB certifications'],
  ]
    .map(([k, t, h]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(t)}</td><td>${esc(h)}</td></tr>`)
    .join('\n');
  const compare = `<table><caption>Hack The Box compared with TryHackMe</caption><thead><tr><th scope="col">Aspect</th><th scope="col">TryHackMe</th><th scope="col">Hack The Box</th></tr></thead><tbody>
${cmp}
</tbody></table>`;

  const directAnswer = `<h2>Should you use Hack The Box or TryHackMe for OSCP prep?</h2>
<p>For OSCP prep, use TryHackMe first if you need guided, beginner-friendly learning, and Hack The Box for OSCP-style practice on unguided machines. TryHackMe rooms explain a topic step by step, while Hack The Box machines leave the foothold and escalation to you, as the OSCP exam does. Many people use both in sequence.</p>
${compare}`;

  const body = `<h2>What each platform is</h2>
<p><strong>Hack The Box (HTB)</strong> hosts machines and labs that you attack as standalone targets, usually with no built-in walkthrough. You find the foothold and the escalation yourself, which is closer to how a practical exam feels.</p>
<p><strong>TryHackMe (THM)</strong> is built around guided rooms. A room typically walks through a topic in tasks with questions to answer, and some rooms are full challenge machines. That structure makes it easier to learn a concept from scratch.</p>
<p><strong>Proving Grounds (PG)</strong> is OffSec's own practice platform, and the catalog holds ${pgCount} Proving Grounds entries. The full ZeroBox catalog covers four sources (Hack The Box, TryHackMe, Proving Grounds and VulnHub — ${catalogTotal} entries in all), while this page compares the ${total} Hack The Box and TryHackMe machines in detail.</p>
<p>The <a href="/machines/">machine directory</a> lists those ${total} boxes alongside the Proving Grounds and VulnHub rows without pages. The community TJ Null spreadsheet also lists Proving Grounds boxes; see the <a href="/tj-null-list/">TJ Null list</a> page for the exact overlap.</p>
<h2>The numbers</h2>
<p>Counts come straight from the machine directory data and change when it does. A certification tag means ZeroBox tags the machine for that track, which is not an official endorsement by the platform or the certification body.</p>
${table}
<h2>Reading the table</h2>
<ul>
<li>Size: ${H()} Hack The Box machines and ${T()} TryHackMe machines.</li>
<li>Operating systems: ${H(win)} HTB and ${T(win)} THM machines run Windows; the rest are mostly Linux.</li>
<li>Difficulty: ${H(easy)} HTB and ${T(easy)} THM machines are Easy or Very Easy, while ${H(hard)} HTB and ${T(hard)} THM machines are Hard or Insane.</li>
<li>Certification tags: ${H(has('OSCP'))} HTB and ${T(has('OSCP'))} THM machines carry the OSCP tag.</li>
</ul>
<h2>Which to use for OSCP prep</h2>
<p>The OSCP exam is a practical in which you compromise machines on your own, so the platform that makes you work without a walkthrough is the closer match. In this catalog ${H(has('OSCP'))} HTB machines and ${T(has('OSCP'))} THM machines carry the OSCP tag${T(has('OSCP')) > H(has('OSCP')) ? `. THM has more OSCP-tagged boxes (${T(has('OSCP'))} vs ${H(has('OSCP'))}), but HTB's unguided format is closer to the exam` : H(has('OSCP')) > T(has('OSCP')) ? `. HTB has more OSCP-tagged boxes (${H(has('OSCP'))} vs ${T(has('OSCP'))}) and its unguided format is closer to the exam` : ''}.</p>
<p>Use the <a href="/oscp-like-machines/">OSCP-like machines</a> list and the <a href="/tj-null-list/">TJ Null list</a> for standalone practice, then rehearse under a clock in the <a href="/oscp-exam-simulator/">exam simulator</a>. TryHackMe rooms remain useful for filling specific gaps before returning to unguided boxes.</p>
<h2>Which to use as a beginner</h2>
<p>Start where a topic is explained as you go. TryHackMe's guided rooms are built for that, and the catalog has ${T(easy)} Easy or Very Easy THM machines. When you can finish those without reading the questions, move to the ${H(easy)} Easy or Very Easy HTB machines to practice unaided. Browse them all in the <a href="/machines/">machine directory</a> or by skill in the <a href="/techniques/">technique hubs</a>.</p>
<h2>Which to use for Active Directory</h2>
<p>Both platforms have domain content. The catalog has ${H(ad)} HTB and ${T(ad)} THM machines with Active Directory or Kerberos tags, out of ${H(win)} HTB and ${T(win)} THM Windows machines. See the <a href="/techniques/active-directory/">Active Directory</a> technique hub for the list with key commands, and <a href="/crto-like-machines/">CRTO-like machines</a> for the ones tagged for that certification.</p>
<h2>Use both</h2>
<p>You do not have to choose. Learn a technique in a guided room, then practice it on a standalone machine and log both in one offline board.</p>
<p>Explore certification lists on the <a href="/oscp-like-machines/">OSCP</a>, <a href="/crto-like-machines/">CRTO</a> and <a href="/cpts-like-machines/">CPTS</a> hubs, or read <a href="/oscp-vs-cpts/">OSCP vs CPTS</a> and the <a href="/cpts-exam-guide/">HTB CPTS exam guide</a>.</p>`;

  const faq = [
    [
      'Is Hack The Box or TryHackMe better for OSCP preparation?',
      `Hack The Box is closer to the OSCP exam because machines are unguided, while TryHackMe is better for learning unfamiliar techniques step by step. Most candidates start on TryHackMe guided rooms and switch to Hack The Box and OffSec Proving Grounds before booking OSCP+.`,
    ],
    [
      'Should complete beginners start on TryHackMe or Hack The Box?',
      `Start on TryHackMe (${T(easy)} Easy or Very Easy rooms in the ZeroBox catalog) to learn enumeration, web basics, and privilege escalation with structured tasks, then transition to HTB Starting Point and Easy Hack The Box machines (${H(easy)} in the catalog).`,
    ],
    [
      'Which platform has more Active Directory practice machines?',
      `In the ZeroBox catalog, Hack The Box has ${H(ad)} machines tagged Active Directory or Kerberos and TryHackMe has ${T(ad)}. Hack The Box also offers multi-host Pro Labs for enterprise domain pivoting.`,
    ],
    [
      'Where does OffSec Proving Grounds fit compared to HTB and TryHackMe?',
      `Proving Grounds is OffSec's own lab platform (${pgCount} boxes in ZeroBox) and shares a dedicated tab on the TJ Null OSCP list alongside Hack The Box. TryHackMe is not on the TJ Null spreadsheet.`,
    ],
  ];

  return {
    path: PATH,
    crumb: 'HTB vs TryHackMe',
    title: 'HTB vs TryHackMe: Which for OSCP, Beginners, AD?',
    description: `HTB vs TryHackMe compared with catalog data: ${H()} HTB and ${T()} THM machines by OS, difficulty and OSCP tags, and which to use. Free.`,
    h1: 'HTB vs TryHackMe: which platform for OSCP prep, beginners and Active Directory',
    lead: esc(`Hack The Box and TryHackMe are the two platforms behind ${total} of the ${catalogTotal} machines in the ZeroBox catalog. This page compares them with that data and says which fits OSCP preparation, a first month of practice and Active Directory work.`),
    directAnswer,
    body,
    cta: { title: 'One tracker for both platforms.', body: 'Keep Hack The Box and TryHackMe progress, notes and flags in one offline board. No account.', href: '/tracker/', label: 'Open the tracker' },
    related: ['/oscp-like-machines/', '/tj-null-list/', '/oscp-vs-cpts/', '/machines/', '/techniques/'],
    faq,
    sources: [
      ['https://www.hackthebox.com/hacker/hacking-labs', 'Hack The Box: Hacking Labs and Machines'],
      ['https://tryhackme.com/paths', 'TryHackMe: Guided Learning Paths'],
      ['https://www.offsec.com/labs/', 'OffSec: Proving Grounds Play and Practice'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec.',
  };
}

module.exports = { build };
