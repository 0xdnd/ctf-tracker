// OSCP exam simulator page (/oscp-exam-simulator/): the static, indexable front door to the app's /exam/ route.
// Every ruleset fact (name, time limit, pass mark, target layout, report window, scoring note) is read from
// EXAM_TRACK_CONFIGS in src/utils/examComplianceUtils.ts through the content model, the same object the app renders its
// ruleset cards from, so the table cannot drift from the simulator. The time limit and pass-mark wording mirror ExamSimulatorPage.tsx.
// The 90 minute rabbit-hole figure comes from src/utils/rabbitHoleConfig.ts.
// Public interface: buildExamSimulatorPage({ renderPage, model, hasGuide, hasRoute }) -> { path, title, description, html, rows }
const fs = require('fs');
const path = require('path');
const { ORIGIN, esc, ctaBox, ICON } = require('./layout.cjs');

const PATH = '/oscp-exam-simulator/';
const SRC_FILE = 'scripts/lib/exam-simulator.cjs';
// Files whose change should move the page's "Updated" date and sitemap lastmod.
const SRC_FILES = [SRC_FILE, 'src/utils/examComplianceUtils.ts', 'src/utils/rabbitHoleConfig.ts', 'scripts/templates/landing-shots.json'];
const APP_PATH = '/exam/';
const LAUNCH = 'Launch the exam simulator';
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const listAnd = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs.join(''));

// Same wording as formatExamLength() in ExamSimulatorPage.tsx ("23 hours 45 min", "2 days"), plus its "+ Nh report" suffix.
function timeLimit(conf) {
  const h = Math.floor(conf.durationSeconds / 3600);
  const m = Math.round((conf.durationSeconds % 3600) / 60);
  const main = !m && h >= 48 && h % 24 === 0 ? `${h / 24} days` : `${h} hours${m ? ` ${m} min` : ''}`;
  return { main, report: conf.reportWindowSeconds ? `+ ${Math.round(conf.reportWindowSeconds / 3600)}h report` : '' };
}
// Same wording as the "Pass:" label on the app's ruleset cards.
const passMark = (conf) => (conf.scoringModel === 'objective' ? 'All objectives' : `${conf.passThreshold} points`);

// One row per ruleset, in the app's order. Plain data, so the parity test can compare it to EXAM_TRACK_CONFIGS.
function rulesetRows(configs) {
  return configs.map((c) => {
    const t = timeLimit(c);
    return { id: c.id, name: c.name, note: c.scoringNote || '', time: t.main, report: t.report, pass: passMark(c), layout: c.targetSummary };
  });
}

function rulesetTable(rows) {
  const tr = (r) =>
    `<tr><th scope="row">${esc(r.name)}${r.note ? ` <span class="tag">${esc(r.note)}</span>` : ''}</th>` +
    `<td data-label="Time limit">${esc(r.time)}${r.report ? `<span class="sub">${esc(r.report)}</span>` : ''}</td>` +
    `<td data-label="Pass mark">${esc(r.pass)}</td>` +
    `<td data-label="Target layout">${esc(r.layout)}</td></tr>`;
  return `<table class="rules"><thead><tr><th scope="col">Ruleset</th><th scope="col">Time limit</th><th scope="col">Pass mark</th><th scope="col">Target layout</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table>`;
}

// Landing exam screenshot (scripts/templates/landing-shots.json, entry "exam"), same file and sizes logic as prerender's shotImg().
function examShot() {
  let shot = null;
  try {
    shot = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'templates', 'landing-shots.json'), 'utf8')).find((s) => s.name === 'exam');
  } catch {
    shot = null;
  }
  if (!shot || !Array.isArray(shot.srcset) || !shot.srcset.length) throw new Error('exam-simulator: landing-shots.json has no "exam" entry');
  const biggest = shot.srcset.reduce((a, b) => (b.w > a.w ? b : a));
  const srcset = shot.srcset.map((x) => `${x.src} ${x.w}w`).join(', ');
  // Rendered width: 5/11 of the wrap (about 580px) from 1152px, about 42vw from 900px, the full width from 640px,
  // then the phone crop (.crop-exam, zoom 1.5) asks for 1.5x the column.
  const sizes = '(min-width:1152px) 580px,(min-width:900px) 42vw,(min-width:640px) calc(100vw - 32px),calc((100vw - 32px) * 1.5)';
  const img = `<img src="${esc(biggest.src)}" srcset="${esc(srcset)}" sizes="${esc(sizes)}" width="${shot.width}" height="${shot.height}" alt="${esc(shot.alt)}" fetchpriority="high" decoding="async" />`;
  return `<div class="frame crop crop-exam">${img}</div>`;
}

function buildExamSimulatorPage({ renderPage, model, hasGuide = () => false, hasRoute = () => false }) {
  const configs = model.examTrackConfigs;
  const rows = rulesetRows(configs);
  const oscp = configs.find((c) => c.id === 'OSCP');
  if (!oscp) throw new Error('exam-simulator: OSCP ruleset missing from EXAM_TRACK_CONFIGS');
  const others = configs.filter((c) => c.id !== 'OSCP').map((c) => c.id);
  const otherCount = NUM_WORDS[others.length] || String(others.length);
  // "23h45m" for the meta description; the table keeps the app's longer wording.
  const oscpMin = Math.round((oscp.durationSeconds % 3600) / 60);
  const oscpTime = `${Math.floor(oscp.durationSeconds / 3600)}h${oscpMin ? `${oscpMin}m` : ''}`;
  const rabbitMinutes = model.rabbitHoleExamMinutes;

  const title = 'OSCP Exam Simulator: Timed Practice with Scoring | ZeroBox';
  const description = `Free OSCP exam simulator in your browser: a timed ${oscpTime} run with official-style scoring, pacing and an evidence checklist. Also ${others.slice(0, 2).join(', ')} and more.`;
  const h1 = `OSCP exam simulator: timed practice, plus ${otherCount} more certifications`;

  const heroActions = ctaBox({
    href: APP_PATH,
    label: LAUNCH,
    links: hasGuide('/oscp-exam-scoring-and-time-budget/') ? [{ href: '/oscp-exam-scoring-and-time-budget/', label: 'Read the scoring guide', rel: '', icon: ICON.arrow }] : [],
  });

  const related = [
    ['/oscp-exam-scoring-and-time-budget/', 'OSCP exam scoring and time budget', 'how the 100 points split, which combinations reach the pass mark, and an hour-by-hour plan for the 24 hours', hasGuide('/oscp-exam-scoring-and-time-budget/')],
    ['/oscp-points-calculator/', 'OSCP points calculator', 'tick the flags you have and see your total against the pass mark', hasRoute('/oscp-points-calculator/')],
    ['/oscp-report-template/', 'OSCP report template', 'a Markdown report skeleton to rehearse the write-up with', hasGuide('/oscp-report-template/')],
    ['/cpts-exam-guide/', 'HTB CPTS exam guide', 'format, flags and a day-by-day plan for the longer Hack The Box exam', hasGuide('/cpts-exam-guide/')],
  ].filter((x) => x[3]);

  const body = [
    `<div class="sim-intro"><div class="sim-copy"><p class="lead">The ZeroBox exam simulator is a timed practice run for the OSCP, with official-style scoring, live pacing and an evidence checklist for every flag. It is free, runs in your browser and needs no account, and the same simulator also covers ${esc(listAnd(others))}.</p>${heroActions}</div>${examShot()}</div>`,
    `<h2>Exam rulesets</h2>`,
    `<p>Pick a certification and the simulator switches to its own clock, pass mark and target layout. Where an exam does not publish a point table, the track is marked objective-based or approximate, so treat those layouts as a rehearsal of the format and not a copy of it.</p>`,
    rulesetTable(rows),
    `<h2>How a practice run works</h2>`,
    `<ol>` +
      `<li><strong>Pick a ruleset.</strong> The setup screen shows each certification's time limit and pass mark, and fills the target slots from the machine catalog. OSCP gets an Active Directory set plus three standalone machines. A roll seed gives the same machines again, and Re-roll targets draws a new set.</li>` +
      `<li><strong>Enter your details.</strong> Add a name, callsign and ID, which appear on the exported report. For OSCP you can also switch from the official point split to one weighted by machine difficulty.</li>` +
      `<li><strong>Start the clock.</strong> The countdown runs from the track's time limit. A pacing view compares your current points per hour with the pace you need, shows the time left per unrooted box, and charts a burn-down toward the pass line. It warns you after ${rabbitMinutes} minutes on one box without a new flag, and it has break timers.</li>` +
      `<li><strong>Log flags and evidence.</strong> Each flag needs a proof screenshot plus the output of whoami and your network configuration, and the page counts what is still missing. Add findings with a CVSS 3.1 vector, then export the report as Markdown or HTML, or as a zip bundle with the proofs.</li>` +
    `</ol>`,
    `<p>Everything stays in your browser. There is no account and no server that receives your session, so you can rehearse on the boxes you already know.</p>`,
    related.length
      ? `<h2>Related guides and tools</h2><ul>${related.map(([h, t, d]) => `<li><a href="${h}">${esc(t)}</a>: ${esc(d)}.</li>`).join('')}</ul>`
      : '',
    ctaBox({ title: 'Rehearse the clock before the real one.', body: 'A timed practice run with scoring, pacing and an evidence checklist. Free, in your browser, no account.', href: APP_PATH, label: LAUNCH }),
    `<p class="note">ZeroBox is an independent project and is not affiliated with OffSec, Hack The Box, Zero-Point Security, Altered Security or TCM Security.</p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = renderPage({
    path: PATH,
    title,
    description,
    h1,
    body,
    crumbs: [['Home', '/'], ['Exam simulator', PATH]],
    ogType: 'website',
  });
  return { path: PATH, title, description, html, rows, url: ORIGIN + PATH };
}

module.exports = { buildExamSimulatorPage, rulesetRows, timeLimit, passMark, EXAM_SIM_PATH: PATH, EXAM_SIM_SRC: SRC_FILES };
