// /cpts-exam-guide/
const PATH = '/cpts-exam-guide/';
const HELP = 'https://help.hackthebox.com/en/articles/12741732-academy-certifications';
const BLOG = 'https://www.hackthebox.com/blog/certified-penetration-testing-specialist-cpts';

function build({ esc }) {
  const plan = [
    ['Day 1', 'Setup and recon sweep', 'Read the scope, set up notes and an evidence folder, scan everything, map the network.'],
    ['Days 2 and 3', 'External foothold', 'Work the exposed hosts. Capture flags and proof as you go, and write each finding while it is fresh.'],
    ['Days 4 and 5', 'Pivot inward', 'Tunnel into the internal network, enumerate again from the new position, and note every credential.'],
    ['Days 6 and 7', 'Active Directory and remaining hosts', 'Domain enumeration, credential abuse and lateral movement. Cap each dead end at a fixed time.'],
    ['Day 8', 'Gap day', 'Return to missed flags with fresh eyes. Decide which gaps you accept.'],
    ['Day 9', 'Write the report', 'Assemble findings, evidence and remediation. Fix anything that needs a reproduction while the lab is still open.'],
    ['Day 10', 'Review and submit', 'Proofread, check every screenshot, and upload with margin before the deadline.'],
  ]
    .map(([d, f, c]) => `<tr><td>${esc(d)}</td><td>${esc(f)}</td><td>${esc(c)}</td></tr>`)
    .join('');

  const faq = [
    [
      'How long is the CPTS exam?',
      'Hack The Box states that the exam lab is accessible for 10 days. The report must also be uploaded within those 10 days, counted from when you enter the exam, so plan for one combined window.',
    ],
    [
      'How many flags do I need to pass?',
      'Hack The Box pages say you must collect flags to meet the point requirement, then pass a quality review of your report. Community reports describe 14 flags with at least 12 required, but check the Academy exam page for the current figure.',
    ],
    [
      'What happens if I fail?',
      'Per the Hack The Box help center you must still submit a report to unlock a second attempt, and you have 14 days from receiving feedback to start it. The launch post says each voucher includes two attempts.',
    ],
    [
      'How long do results take?',
      'Hack The Box says the review takes up to 20 business days, and results are sent by email.',
    ],
  ];

  const body = `<h2>Exam format</h2>
<p>CPTS, the Certified Penetration Testing Specialist from Hack The Box, is a practical exam: you assess a simulated enterprise network and submit a written report. Per the <a href="${HELP}" rel="noopener">Hack The Box help center</a>, you must complete the role path to 100% and hold an exam voucher before you can start. Once you begin, the clock does not stop for sleep. The lab is accessible for 10 days, which is a very different rhythm from the 24-hour OSCP.</p>
<h2>Flags and the pass requirement</h2>
<p>Hack The Box says you collect flags to meet a point requirement, and an instructor then checks both the points and the report. Neither page I could review states the flag count. Community reports describe 14 flags with 12 required, and ZeroBox's CPTS simulator template is built on that assumption (14 flag objectives, 85 point threshold). Treat it as a planning figure and confirm the live number on Academy.</p>
<h2>The report requirement</h2>
<p>The report is part of the pass, not an afterthought. Hack The Box asks for a commercial-grade report in English that maps out your attack methodology and remediation steps. Its launch post says you have ten days to upload it from the time you enter the exam, and that it must meet specific quality requirements. Results arrive within 20 business days.</p>
<h2>A day-by-day pacing plan</h2>
<p>Because the report shares the 10-day clock, budget for it from day one. This is one workable split; adapt it to the network you find.</p>
<table><thead><tr><th>Day</th><th>Focus</th><th>Goal</th></tr></thead><tbody>${plan}</tbody></table>
<p>Three habits matter more than the schedule. Write each finding as soon as you have the evidence. Keep one note per host with commands and output. And set a rabbit-hole limit, such as two hours on a single idea with no new access, then move on and return later.</p>
<h2>Preparing with ZeroBox</h2>
<p>The <a href="/cpts-notes/">CPTS notes</a> condense the module material into short pages with commands, and the <a href="/cpts-like-machines/">CPTS-like machines</a> list groups practice boxes that cover web attacks, Active Directory and pivoting. Track each box in the tracker, then use the exam simulator's CPTS template to rehearse a multi-day engagement with a flag tally, pacing and a report export. The <a href="/methodology-guide/">methodology checklist</a> helps you avoid skipping phases when you are tired.</p>
<p>Fine print: HTB can change the exam, and the sources below are dated. Re-read them before you book.</p>`;

  return {
    path: PATH,
    crumb: 'CPTS exam guide',
    title: 'HTB CPTS Exam Guide: Flags, Passing Score, Pacing',
    description:
      'HTB CPTS exam format, the 10 day window, flags and passing requirement, the report, and a day-by-day pacing plan, with sources cited.',
    h1: 'HTB CPTS exam guide: format, flags and pacing',
    lead: 'The HTB CPTS exam gives you 10 days to compromise a simulated enterprise network and submit a commercial-grade report, and both the flags and the report count toward passing. This guide sets out what Hack The Box states, what only the community reports, and how to pace the 10 days.',
    body,
    cta: {
      title: 'Rehearse a multi-day engagement.',
      body: 'Track practice boxes, keep per-host notes and run a CPTS-style mock exam, all offline in your browser.',
      href: '/exam/',
      label: 'Start a mock exam',
    },
    faq,
    related: ['/cpts-notes/', '/cpts-like-machines/', '/methodology-guide/', '/exam/', '/tracker/'],
    sources: [
      [HELP, 'Hack The Box Help Center: Academy Certifications'],
      [BLOG, 'Hack The Box: Launching HTB CPTS', 'published 2022-09-15'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with Hack The Box or OffSec.',
  };
}

module.exports = { build };
