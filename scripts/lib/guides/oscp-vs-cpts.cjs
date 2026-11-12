// /oscp-vs-cpts/
// Facts come only from ./oscp-scoring.cjs and ./cpts-exam.cjs; add a point here only if one of those pages states it.
const PATH = '/oscp-vs-cpts/';
const CPTS_HELP = 'https://help.hackthebox.com/en/articles/12741732-academy-certifications';
const CPTS_BLOG = 'https://www.hackthebox.com/blog/certified-penetration-testing-specialist-cpts';
const OSCP_GUIDE = 'https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide';
const OSCP_REPORT = 'https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements';
const OSCP_SCALED = 'https://help.offsec.com/hc/en-us/articles/54589877508884-OSCP-Equated-Scaled-Scoring-FAQ';

function build({ esc }) {
  const rows = [
    ['Provider', 'OffSec', 'Hack The Box'],
    ['Exam format', 'Practical exam in four parts: one Active Directory set and three standalone machines.', 'Practical exam: assess a simulated enterprise network, then submit a written report.'],
    ['Exam length', '23 hours 45 minutes.', '10 days of lab access.'],
    ['Report deadline', '24 hours after the exam ends, as a PDF inside a .7z archive.', 'Within the same 10 days, counted from when you enter the exam.'],
    ['What counts toward a pass', '70 of 100 raw points for exams starting before 1 December 2026 at 08:00 GMT; a scaled 400 on a scale of 100 to 500 for later exams.', 'Enough flags to meet a point requirement, plus a report that passes an instructor quality review.'],
    ['Points structure', 'Active Directory set 40 points (10, 10 and 20 per machine), three standalones at 20 each, no bonus points.', 'Hack The Box does not state the flag count publicly; community reports describe 14 flags with 12 required.'],
    ['Expiry', 'OSCP+ expires three years after it is earned; maintaining it is optional.', 'Not covered on this page.'],
  ]
    .map(([a, b, c]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td>${esc(c)}</td></tr>`)
    .join('');

  const body = `<h2>OSCP vs CPTS at a glance</h2>
<p>Both are hands-on exams that end in a written report, but they are built differently. The OSCP is a single day-long sprint, while the CPTS is a ten day engagement. The table uses only what OffSec and Hack The Box state on the pages linked at the bottom; confirm the current rules before you book either exam.</p>
<table><thead><tr><th>Point</th><th>OSCP (OffSec)</th><th>CPTS (Hack The Box)</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Exam length and pacing</h2>
<p>The OSCP gives you 23 hours 45 minutes, so the plan is an hour-by-hour block schedule with a hard cap on time spent stuck. The <a href="/oscp-exam-scoring-and-time-budget/">OSCP exam scoring and time budget guide</a> sets out a 24 hour plan with a 90 minute rabbit-hole limit. The CPTS lab is open for 10 days and the clock does not stop for sleep, so pacing is a day-by-day question, and the report shares the same clock. The <a href="/cpts-exam-guide/">HTB CPTS exam guide</a> has a day-by-day split.</p>
<h2>What counts as a pass</h2>
<p>For the OSCP the answer depends on the start date. Exams starting before 1 December 2026 at 08:00 GMT need 70 of 100 raw points. Exams starting on or after that time use scaled scoring, and the raw points that equal a scaled 400 vary by exam set and are not published, so 70 is no longer a fixed target. For the CPTS you collect flags to meet a point requirement and also pass a report review. The flag count is not stated on the public Hack The Box pages, so treat the community figure of 14 flags with 12 required as a planning number only.</p>
<h2>The report and what follows</h2>
<p>The OSCP report is due 24 hours after the exam ends. The CPTS report is due inside the 10 day window, counted from when you enter the exam. Hack The Box asks for a commercial-grade report in English, and says each voucher includes two attempts, that results take up to 20 business days, and that a second attempt requires you to submit a report for the first. Keeping a running log in both cases saves hours at the end. OSCP+ also expires three years after you earn it, though maintaining it is optional; the <a href="/oscp-exam-scoring-and-time-budget/">scoring guide</a> lists the renewal routes.</p>
<h2>Which to take first</h2>
<p>This is a trade-off, not a ranking. A shorter exam suits someone who works well in one long, focused session, and a longer one suits someone who prefers to spread the work across days and write the report as they go. The OSCP rewards a fixed plan against a single clock, while the CPTS adds more time but needs sustained attention across 10 days and a report that must pass review. Whichever you choose, practise on matching machines: the <a href="/oscp-like-machines/">OSCP-like</a> and <a href="/cpts-like-machines/">CPTS-like</a> lists group boxes by difficulty, and the <a href="/tracker/">ZeroBox tracker</a> keeps notes and progress for each one, offline in your browser.</p>`;

  return {
    path: PATH,
    crumb: 'OSCP vs CPTS',
    title: 'OSCP vs CPTS: Exam Length, Format and Pass Rules',
    description:
      'OSCP vs CPTS side by side: exam length, format, what counts as a pass, report deadlines and OSCP+ expiry, with links to the full guide for each exam.',
    h1: 'OSCP vs CPTS: exam format, length and pass rules',
    lead: 'The OSCP is a 23 hour 45 minute exam from OffSec and the CPTS is a 10 day exam from Hack The Box; both end in a written report. This page compares them on length, format, what counts as a pass and report deadlines, and points to the full <a href="/oscp-exam-scoring-and-time-budget/">OSCP scoring guide</a> and <a href="/cpts-exam-guide/">CPTS exam guide</a>.',
    directAnswer: `<h2>What is the difference between OSCP and CPTS?</h2>
<p>The OSCP exam lasts 23 hours 45 minutes, with 24 hours after it ends to upload the report. The CPTS exam gives you 10 days in the lab, and the report must be uploaded inside that same window. The OSCP counts raw points (70 of 100 for exams starting before 1 December 2026) or a scaled 400 for later exams, while the CPTS counts flags toward a point requirement plus a report quality review.</p>`,
    body,
    cta: {
      title: 'Plan your prep, whichever exam you choose.',
      body: 'Track practice boxes, keep per-host notes and rehearse the clock, all offline in your browser.',
      href: '/tracker/',
      label: 'Open tracker',
    },
    related: ['/cpts-exam-guide/', '/oscp-exam-scoring-and-time-budget/', '/tracker/', '/oscp-like-machines/', '/cpts-like-machines/'],
    sources: [
      [OSCP_GUIDE, 'OffSec Help Center: OSCP+ Exam Guide'],
      [OSCP_REPORT, 'OffSec Help Center: OSCP+ Reporting Requirements'],
      [OSCP_SCALED, 'OffSec Help Center: OSCP+ Equated Scaled Scoring FAQ'],
      [CPTS_HELP, 'Hack The Box Help Center: Academy Certifications'],
      [CPTS_BLOG, 'Hack The Box: Launching HTB CPTS', 'published 2022-09-15'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with OffSec or Hack The Box.',
  };
}

module.exports = { build };
