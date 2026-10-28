// /htb-vs-tryhackme/
// The catalogue holds no Proving Grounds machines, so this compares Hack The Box and TryHackMe only (PG is mentioned, not counted).
// Every number comes from model.machines at build time.
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
  const pg = all.filter((m) => /proving/i.test(m.platform)).length;
  const plats = ['HTB', 'THM'];
  const row = (label, f) => `<tr><td>${esc(label)}</td>${plats.map((p) => `<td>${by(p, f)}</td>`).join('')}</tr>`;
  const H = (f) => by('HTB', f);
  const T = (f) => by('THM', f);
  const total = all.length.toLocaleString('en-US');

  const table = `<table><thead><tr><th>In the ZeroBox catalogue</th><th>Hack The Box</th><th>TryHackMe</th></tr></thead><tbody>
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
<p><strong>Proving Grounds (PG)</strong> is OffSec's own practice platform. The ZeroBox catalogue ${pg === 0 ? "holds no Proving Grounds machines" : `holds ${pg} Proving Grounds machines`}, so this page compares only Hack The Box and TryHackMe in numbers. The community TJ Null spreadsheet does list Proving Grounds boxes; the <a href="/tj-null-list/">TJ Null list</a> page explains how it overlaps with this catalogue.</p>
<h2>The numbers</h2>
<p>Counts come straight from the catalogue and change when it does. A certification tag means ZeroBox tags the machine for that track, which is not an official endorsement by the platform or the certification body.</p>
${table}
<h2>Reading the table</h2>
<ul>
<li>Size: ${H()} Hack The Box machines and ${T()} TryHackMe machines.</li>
<li>Operating systems: ${H(win)} HTB and ${T(win)} THM machines run Windows; the rest are mostly Linux.</li>
<li>Difficulty: ${H(easy)} HTB and ${T(easy)} THM machines are Easy or Very Easy, while ${H(hard)} HTB and ${T(hard)} THM machines are Hard or Insane.</li>
<li>Certification tags: ${H(has('OSCP'))} HTB and ${T(has('OSCP'))} THM machines carry the OSCP tag.</li>
</ul>
<h2>Which to use for OSCP prep</h2>
<p>The OSCP exam is a practical in which you compromise machines on your own, so the platform that makes you work without a walkthrough is the closer match. In this catalogue ${H(has('OSCP'))} HTB machines and ${T(has('OSCP'))} THM machines carry the OSCP tag${T(has('OSCP')) > H(has('OSCP')) ? `. THM has more OSCP-tagged boxes (${T(has('OSCP'))} vs ${H(has('OSCP'))}), but HTB's unguided format is closer to the exam` : H(has('OSCP')) > T(has('OSCP')) ? `. HTB has more OSCP-tagged boxes (${H(has('OSCP'))} vs ${T(has('OSCP'))}) and its unguided format is closer to the exam` : ''}. Use the <a href="/oscp-like-machines/">OSCP-like machines</a> list, the <a href="/tj-null-list/">TJ Null list</a> for the community's picks, and rehearse under a clock in the <a href="/exam/">exam simulator</a>. TryHackMe rooms still help to fill gaps, such as a service you have not met before.</p>
<h2>Which to use as a beginner</h2>
<p>Start where a topic is explained as you go. TryHackMe's guided rooms are built for that, and the catalogue has ${T(easy)} Easy or Very Easy THM machines. When you can finish those without reading the questions, move to the ${H(easy)} Easy or Very Easy HTB machines to practise unaided. Browse them all in the <a href="/machines/">machine directory</a> or by skill in the <a href="/techniques/">technique hubs</a>.</p>
<h2>Which to use for Active Directory</h2>
<p>Both platforms have domain content. The catalogue has ${H(ad)} HTB and ${T(ad)} THM machines with Active Directory or Kerberos tags, out of ${H(win)} HTB and ${T(win)} THM Windows machines. See the <a href="/techniques/active-directory/">Active Directory</a> technique hub for the list with key commands, and <a href="/crto-like-machines/">CRTO-like machines</a> for the ones tagged for that certification.</p>
<h2>Use both</h2>
<p>You do not have to choose. A simple pattern is to learn a technique in a guided room, then practise it on a standalone machine, and log both in one tracker. Certification-specific lists are on the <a href="/oscp-like-machines/">OSCP</a>, <a href="/crto-like-machines/">CRTO</a> and <a href="/cpts-like-machines/">CPTS</a> pages.</p>`;

  return {
    path: PATH,
    crumb: 'HTB vs TryHackMe',
    title: 'HTB vs TryHackMe: Which for OSCP, Beginners, AD?',
    description: `HTB vs TryHackMe compared with catalogue data: ${H()} HTB and ${T()} THM machines by OS, difficulty and OSCP tags, and which to use. Free.`,
    h1: 'HTB vs TryHackMe: which platform for OSCP prep, beginners and Active Directory',
    lead: esc(`Hack The Box and TryHackMe are the two platforms behind the ${total} machines in the ZeroBox catalogue. This page compares them using that data, then says which fits OSCP preparation, a first month of practice and Active Directory work.`),
    directAnswer,
    body,
    topCta: { body: 'Track HTB and THM machines together in ZeroBox, free.', href: '/tracker/', label: 'Open tracker' },
    cta: { title: 'One tracker for both platforms.', body: 'Keep Hack The Box and TryHackMe progress, notes and flags in one offline board. No account.', href: '/tracker/', label: 'Open tracker' },
    related: ['/oscp-like-machines/', '/tj-null-list/', '/machines/', '/techniques/'],
    faq: [],
    sources: [],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box, TryHackMe or OffSec.',
  };
}

module.exports = { build };
