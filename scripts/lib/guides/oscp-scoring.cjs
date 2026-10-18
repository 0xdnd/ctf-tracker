// /oscp-exam-scoring-and-time-budget/
const PATH = '/oscp-exam-scoring-and-time-budget/';

// Point values used in the combinations table. Arithmetic is computed here, never typed by hand.
const AD_SET = 40;
const STANDALONE_FULL = 20;
const LOCAL = 10;
const PASS = 70;
const COMBOS = [
  ['Complete AD set, one full standalone, and one more standalone local flag', AD_SET + STANDALONE_FULL + LOCAL],
  ['Complete AD set and three standalone local flags', AD_SET + 3 * LOCAL],
  ['Complete AD set and two full standalones', AD_SET + 2 * STANDALONE_FULL],
  ['Complete AD set and one full standalone', AD_SET + STANDALONE_FULL],
  ['Three full standalones, no AD points', 3 * STANDALONE_FULL],
  ['Three full standalones plus 10 partial AD points (only if your set awards partial credit)', 3 * STANDALONE_FULL + 10],
];

function build({ esc }) {
  const rows = COMBOS.map(
    ([label, pts]) =>
      `<tr><td>${esc(label)}</td><td>${pts}</td><td>${pts >= PASS ? 'Yes' : `No, ${PASS - pts} short`}</td></tr>`
  ).join('');
  const plan = [
    ['0:00 to 0:45', 'Setup and recon', 'VPN up, notes open, full port scans running against every target in the background.'],
    ['0:45 to 5:00', 'Active Directory set', 'The biggest block of points, so it gets the freshest hours. Stop at 90 minutes without a new lead.'],
    ['5:00 to 5:30', 'Break', 'Eat, walk, reread your notes.'],
    ['5:30 to 8:30', 'Standalone one', 'Local flag first, then escalation. Take proof screenshots the moment you get a flag.'],
    ['8:30 to 11:30', 'Standalone two', 'Same loop. Log the time of every flag.'],
    ['11:30 to 14:30', 'Standalone three', 'If it is not moving, rotate to a box with an open lead.'],
    ['14:30 to 15:30', 'Rest', 'A real break, or a short sleep if you function better with one.'],
    ['15:30 to 19:30', 'Second pass', 'Return to the stuck boxes with fresh eyes. Re-run enumeration you rushed.'],
    ['19:30 to 21:30', 'Evidence sweep', 'Stop hunting new points. Retake any missing proof screenshots and reproduce key steps.'],
    ['21:30 to 24:00', 'Buffer', 'Finish notes, shut down cleanly, and write the report skeleton while it is fresh.'],
  ]
    .map(([h, f, c]) => `<tr><td>${esc(h)}</td><td>${esc(f)}</td><td>${esc(c)}</td></tr>`)
    .join('');

  const faq = [
    [
      'Do I still need 70 points to pass the OSCP?',
      'Through 30 November 2026 the pass mark is 70 out of 100. From 1 December 2026 OffSec converts raw points to a scaled score specific to your exam set, so the threshold varies by set. OffSec states that the competency required to pass does not change.',
    ],
    [
      'How long should I stay on one machine?',
      'A common rule is 90 minutes with no new flag and no new lead. Past that point, switch targets and come back later. The ZeroBox exam simulator warns you at that mark and lets you snooze the warning for 30 minutes.',
    ],
    [
      'How long do I have to submit the report?',
      "Per OffSec's exam guide, you get 24 hours after the exam ends to upload the report. Confirm the current rule on the live OffSec help center page before your attempt.",
    ],
    [
      'Does the ZeroBox simulator use the new scaled scoring?',
      'No. The simulator uses a fixed 70 point threshold, because OffSec has not published per-set conversions. Use it to practise pacing and evidence handling, not to predict your result.',
    ],
  ];

  const body = `<h2>How OSCP points work</h2>
<p>The exam has four parts: one Active Directory set worth 40 points and three standalone machines worth 20 points each, for 100 in total. Each standalone is usually split into 10 points for a local (low privilege) flag and 10 for the proof (root or SYSTEM) flag. That is the structure described in ${externalLink('https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', "OffSec's OSCP+ exam guide")}; confirm it on the live page, because OffSec edits it.</p>
<h2>The 2026 scoring change</h2>
<p>On 6 October 2026 OffSec published its ${externalLink('https://www.offsec.com/blog/oscp-scoring-update/', 'OSCP+ scoring update')}. Starting 1 December 2026, the points you earn are converted to a scaled score using a conversion specific to your exam set, and the passing threshold varies by set. Through 30 November 2026 the fixed 70 out of 100 rule still applies.</p>
<p>OffSec says the exam still has three standalone machines and one Active Directory chain, with the same 24-hour duration, grading requirements and proctoring. It also says results issued before the change will not be recalculated, and that no change to your study approach is needed. The post publishes no new numeric cut score, so the safest plan is to aim well above 70 raw points rather than for the old line exactly.</p>
<h2>Which combinations reach 70 (old fixed rule)</h2>
<p>This table uses the fixed 70 point line that applies through 30 November 2026. After that date treat it as an effort guide, since the equivalent threshold depends on your set.</p>
<table><thead><tr><th>Combination</th><th>Points</th><th>Reaches 70?</th></tr></thead><tbody>${rows}</tbody></table>
<p>The Active Directory set is the swing: with all 40 points you need only 30 more. Without it, three perfect standalones stop at 60.</p>
<h2>An hour-by-hour 24h plan</h2>
<table><thead><tr><th>Hours</th><th>Focus</th><th>Checkpoint</th></tr></thead><tbody>${plan}</tbody></table>
<p>The plan front-loads the biggest block of points and keeps the last hours free. Adjust the order if recon shows a quick win, but keep the breaks.</p>
<h2>The 90 minute rabbit hole cap</h2>
<p>Set a hard rule before you start: 90 minutes on one box with no new flag and no new lead means you move. Write down where you stopped and the next idea, then switch. When you come back, re-enumerate from the top before trying anything exotic.</p>
<h2>The report deadline</h2>
<p>Per ${externalLink('https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements', "OffSec's reporting requirements")}, the report is due 24 hours after the exam ends, delivered as a PDF inside a .7z archive. Confirm the file naming and size rules on the live page. Do not plan to write from scratch: keep a running log during the exam and finish the report skeleton in the buffer hours. See the ${'<a href="/oscp-report-template/">OSCP report template</a>'} for a structure you can paste.</p>
<h2>Practise the pacing in ZeroBox</h2>
<p>The ZeroBox exam simulator runs a timed OSCP session with the same four-part layout. It shows live pacing against the 24-hour clock, a burndown chart of points remaining against time, break countdowns, and a rabbit-hole warning when one box has had 90 minutes without a flag. Rehearse on boxes from the <a href="/tj-null-list/">TJ Null list</a> or the <a href="/oscp-like-machines/">OSCP-like machine catalogue</a>, then read what the burndown chart says about where your time went.</p>`;

  function externalLink(href, label) {
    return `<a href="${esc(href)}" rel="noopener">${esc(label)}</a>`;
  }

  return {
    path: PATH,
    crumb: 'OSCP scoring and time budget',
    title: 'OSCP Exam Scoring & 24h Time Budget (2026 Changes)',
    description:
      'OSCP point structure, which combinations reach 70, an hour-by-hour 24h plan with a 90 minute rabbit-hole cap, and the December 2026 scaled scoring change.',
    h1: 'OSCP exam scoring and a 24 hour time budget',
    lead: 'The OSCP exam is 100 points across one Active Directory set and three standalone machines, and until 30 November 2026 you need 70 to pass. From 1 December 2026 OffSec switches to scaled scoring, so the pass threshold will depend on your exam set; this page covers both, plus a 24 hour plan you can rehearse.',
    body,
    cta: {
      title: 'Rehearse the clock before the real one.',
      body: 'Run a timed mock exam with pacing, a burndown chart and a rabbit-hole warning, all offline in your browser.',
      href: '/exam/',
      label: 'Start a mock exam',
    },
    faq,
    related: ['/exam/', '/tj-null-list/', '/oscp-like-machines/', '/oscp-report-template/', '/methodology-guide/'],
    sources: [
      ['https://www.offsec.com/blog/oscp-scoring-update/', 'OffSec: OSCP+ Scoring Update', 'published 2026-10-06'],
      ['https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', 'OffSec Help Center: OSCP+ Exam Guide'],
      ['https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements', 'OffSec Help Center: OSCP+ Reporting Requirements'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with OffSec or Hack The Box.',
  };
}

module.exports = { build };
