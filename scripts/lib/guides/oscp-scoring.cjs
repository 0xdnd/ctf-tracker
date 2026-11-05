// /oscp-exam-scoring-and-time-budget/
const { ctaBox } = require('../layout.cjs');
const PATH = '/oscp-exam-scoring-and-time-budget/';

// Point values used in the combinations table. Arithmetic is computed here, never typed by hand.
// Same rules as src/utils/oscpPointsCalculator.ts: AD machines 10 / 10 / 20, standalones 10 + 10.
const AD_MACHINES = [10, 10, 20];
const AD_SET = AD_MACHINES.reduce((a, b) => a + b, 0);
const STANDALONE_FULL = 20;
const LOCAL = 10;
const PASS = 70;
const COMBOS = [
  ['Complete AD set, one full standalone, and one more standalone local flag', AD_SET + STANDALONE_FULL + LOCAL],
  ['Complete AD set and three standalone local flags', AD_SET + 3 * LOCAL],
  ['Complete AD set and two full standalones', AD_SET + 2 * STANDALONE_FULL],
  ['Complete AD set and one full standalone', AD_SET + STANDALONE_FULL],
  ['Three full standalones, no AD points', 3 * STANDALONE_FULL],
  ['Three full standalones plus the first Active Directory machine', 3 * STANDALONE_FULL + AD_MACHINES[0]],
  ['Two full standalones plus the first two Active Directory machines', 2 * STANDALONE_FULL + AD_MACHINES[0] + AD_MACHINES[1]],
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
    ['21:30 to 23:45', 'Buffer', 'Finish notes, shut down cleanly, and write the report skeleton while it is fresh.'],
  ]
    .map(([h, f, c]) => `<tr><td>${esc(h)}</td><td>${esc(f)}</td><td>${esc(c)}</td></tr>`)
    .join('');

  const faq = [
    [
      'Do I still need 70 points to pass the OSCP?',
      'For exams starting before 1 December 2026 at 08:00 GMT, yes: the pass mark is 70 out of 100 raw points. Exams starting on or after that time are reported on a scaled score from 100 to 500, and you need 400 to pass. The raw points that equal 400 vary by exam set and OffSec does not publish them, so 70 is no longer a fixed target.',
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
      'No. The simulator counts raw points (Active Directory machines 10, 10 and 20, standalones 10 plus 10, no bonus points) against the fixed 70 point mark that applies to exams starting before 1 December 2026. The raw points that equal a scaled 400 vary by exam set and are not published, so use the simulator to practise pacing and evidence handling, not to predict a scaled result.',
    ],
    [
      'How many points is each part of the OSCP exam worth?',
      'The Active Directory set is worth 40 points, credited per machine: 10 for the first, 10 for the second and 20 for the third. Each of the three standalone machines is worth 20 points, for 100 in total. There are no bonus points.',
    ],
  ];

  const body = `<h2>How OSCP points work</h2>
<p>The exam has four parts: one Active Directory set worth 40 points and three standalone machines worth 20 points each, for 100 in total. The Active Directory points are credited per machine, 10 for the first, 10 for the second and 20 for the third, so a partly compromised set still scores. Each standalone is split into 10 points for a local (low privilege) flag and 10 for the proof (root or SYSTEM) flag, and there are no bonus points. That is the structure described in ${externalLink('https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', "OffSec's OSCP+ exam guide")}; confirm it on the live page, because OffSec edits it.</p>
<h2>The 2026 scoring change</h2>
<p>On 21 October 2026 OffSec published its ${externalLink('https://www.offsec.com/blog/oscp-grading-update/', 'OSCP+ scoring update')}. Exams starting before 1 December 2026 at 08:00 GMT keep the fixed rule: 70 out of 100 raw points to pass. For exams starting on or after that time, OffSec uses equated scaled scoring: per its ${externalLink('https://help.offsec.com/hc/en-us/articles/54589877508884-OSCP-Equated-Scaled-Scoring-FAQ', 'scaled scoring FAQ')}, results are reported on a scale from 100 to 500 and you need 400 to pass. The raw points that equal 400 depend on your exam set and are not published.</p>
<p>OffSec says the change affects how the final result is calculated, not the exam content, format, duration, grading requirements or proctoring, and that you do not need to change how you prepare. It also says not to treat 70 or any other raw total as a passing target, so attempt every objective, submit every flag and finish the report whatever your running count says. The ${'<a href="/oscp-points-calculator/">OSCP points calculator</a>'} applies the same rules to a flag combination.</p>
<h2>Which combinations reach 70 (old fixed rule)</h2>
<p>This table uses the fixed 70 point line for exams starting before 1 December 2026 at 08:00 GMT. For later exams treat it as an effort guide only, since the raw points that equal a scaled 400 depend on your set.</p>
<table><thead><tr><th>Combination</th><th>Points</th><th>Reaches 70?</th></tr></thead><tbody>${rows}</tbody></table>
<p>The Active Directory set is the swing: with all 40 points you need only 30 more. Without any of it, three perfect standalones stop at 60, but because the set is credited per machine, the first Active Directory machine alone takes them to 70.</p>
<h2>An hour-by-hour plan for the 23 hour 45 minute exam</h2>
<table><thead><tr><th>Hours</th><th>Focus</th><th>Checkpoint</th></tr></thead><tbody>${plan}</tbody></table>
<p>The plan front-loads the biggest block of points and keeps the last hours free. Adjust the order if recon shows a quick win, but keep the breaks.</p>
<h2>The 90 minute rabbit hole cap</h2>
<p>Set a hard rule before you start: 90 minutes on one box with no new flag and no new lead means you move. Write down where you stopped and the next idea, then switch. When you come back, re-enumerate from the top before trying anything exotic.</p>
<h2>The report deadline</h2>
<p>Per ${externalLink('https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements', "OffSec's reporting requirements")}, the report is due 24 hours after the exam ends, delivered as a PDF inside a .7z archive. Confirm the file naming and size rules on the live page. Do not plan to write from scratch: keep a running log during the exam and finish the report skeleton in the buffer hours. See the ${'<a href="/oscp-report-template/">OSCP report template</a>'} for a structure you can paste.</p>
<h2>Practise the pacing in ZeroBox</h2>
<p>The ZeroBox exam simulator runs a timed OSCP session with the same four-part layout. It shows live pacing against the 23 hour 45 minute exam clock, a burndown chart of points remaining against time, break countdowns, and a rabbit-hole warning when one box has had 90 minutes without a flag. Rehearse on boxes from the <a href="/tj-null-list/">TJ Null list</a> or the <a href="/oscp-like-machines/">OSCP-like machine catalogue</a>, then read what the burndown chart says about where your time went.</p>
${ctaBox({ title: 'Track your OSCP practice.', body: 'ZeroBox keeps a Kanban board, notes and checklists for every box, offline in your browser.', href: '/tracker/', label: 'Open tracker' })}`;

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
    lead: 'The OSCP exam is 100 points across one Active Directory set and three standalone machines, and for exams starting before 1 December 2026 at 08:00 GMT you need 70 to pass. Later exams use scaled scoring (100 to 500, 400 to pass), and the raw points that equal a pass depend on your exam set; this page covers both, plus an hour-by-hour plan you can rehearse.',
    directAnswer: `<h2>How many points do you need to pass the OSCP?</h2>
<p>You need 70 out of 100 points to pass the OSCP if your exam starts before 1 December 2026 at 08:00 GMT. The exam is worth 100 points: 40 for the Active Directory set (10, 10 and 20 per machine) and 20 for each of the three standalone machines. For exams starting on or after 1 December 2026 at 08:00 GMT, OffSec reports a scaled score from 100 to 500 with 400 to pass; the raw points that equal 400 vary by exam set and are not published.</p>${ctaBox({ body: 'Track your OSCP prep in ZeroBox, free.', href: '/tracker/', label: 'Open tracker' })}`,
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
      ['https://www.offsec.com/blog/oscp-grading-update/', 'OffSec: OSCP+ Scoring Update', 'published 2026-10-21'],
      ['https://help.offsec.com/hc/en-us/articles/54589877508884-OSCP-Equated-Scaled-Scoring-FAQ', 'OffSec Help Center: OSCP+ Equated Scaled Scoring FAQ'],
      ['https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', 'OffSec Help Center: OSCP+ Exam Guide'],
      ['https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements', 'OffSec Help Center: OSCP+ Reporting Requirements'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with OffSec or Hack The Box.',
  };
}

module.exports = { build };
