// /oscp-report-template/
const PATH = '/oscp-report-template/';

// CVSS 3.1 base score, Scope Unchanged only (enough for the worked examples). Weights from the FIRST specification.
const W = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
};
function roundup(x) {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}
function cvss31(vector) {
  const m = Object.fromEntries(vector.split('/').map((p) => p.split(':')));
  if (m.S !== 'U') throw new Error('guides: only scope unchanged supported');
  const iss = 1 - (1 - W.CIA[m.C]) * (1 - W.CIA[m.I]) * (1 - W.CIA[m.A]);
  const impact = 6.42 * iss;
  const expl = 8.22 * W.AV[m.AV] * W.AC[m.AC] * W.PR[m.PR] * W.UI[m.UI];
  if (impact <= 0) return 0;
  return roundup(Math.min(impact + expl, 10));
}
const rating = (s) => (s === 0 ? 'None' : s < 4 ? 'Low' : s < 7 ? 'Medium' : s < 9 ? 'High' : 'Critical');

const SKELETON = [
  '# OSCP Exam Report',
  '',
  '- Candidate: <name>',
  '- OSID: OS-XXXXX',
  '- Exam date: YYYY-MM-DD',
  '- Report version: 1.0',
  '',
  '## 1. Executive summary',
  'One paragraph: what was tested, how many targets were compromised, and the overall risk.',
  '',
  '## 2. Scope and methodology',
  'Targets and IP ranges, tools used, and the phases you followed (recon, enumeration, exploitation, escalation).',
  '',
  '## 3. Results summary',
  '| Target | Local flag | Proof flag | Foothold | Escalation |',
  '| --- | --- | --- | --- | --- |',
  '| 10.x.x.x | yes | yes | short name | short name |',
  '',
  '## 4. Active Directory set',
  '### 4.1 <host 1>  (repeat the finding template per host)',
  '',
  '## 5. Standalone machines',
  '### 5.1 <host>  (repeat the finding template per host)',
  '',
  '## Appendix A: scripts and proof of concept code (pasted as text)',
  '## Appendix B: tools and versions',
].join('\n');

const FINDING = [
  '### <Host> : <Vulnerability title>',
  '',
  '- Severity: Critical',
  '- CVSS 3.1: 9.8 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)',
  '- Affected: 10.x.x.x:port (service and version)',
  '',
  '#### Description',
  'What is wrong and why it matters, in two or three sentences.',
  '',
  '#### Steps to reproduce',
  '1. Enumeration command and the result that matters.',
  '2. The exact request or command that gives the foothold.',
  '3. The escalation step.',
  '',
  '#### Proof',
  '[screenshot: contents of the proof file with the target IP address visible]',
  '',
  '#### Remediation',
  'The specific fix: patch level, configuration change, or control.',
].join('\n');

function build({ esc }) {
  const vector = 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H';
  const score = cvss31(vector);
  if (score !== 9.8) throw new Error(`guides: CVSS example drifted: ${score}`);
  const second = cvss31('AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H');
  const metrics = [
    ['AV:N', 'Attack Vector: Network', 'Exploitable remotely', '0.85'],
    ['AC:L', 'Attack Complexity: Low', 'No special conditions', '0.77'],
    ['PR:N', 'Privileges Required: None', 'No account needed', '0.85'],
    ['UI:N', 'User Interaction: None', 'No victim action', '0.85'],
    ['S:U', 'Scope: Unchanged', 'Impact stays in the vulnerable component', '-'],
    ['C:H / I:H / A:H', 'Confidentiality, Integrity, Availability: High', 'Full compromise', '0.56 each'],
  ]
    .map(([a, b, c, d]) => `<tr><td><code>${esc(a)}</code></td><td>${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`)
    .join('');

  const faq = [
    [
      'What format does OffSec want for the OSCP report?',
      "Per OffSec's reporting requirements, the report is a PDF inside a .7z archive, named with your OSID, with no password and no other file types. Scripts and proof of concept code go into the PDF as text. Confirm the exact rules on the live OffSec help center page before you submit.",
    ],
    [
      'Do I need a CVSS score for every finding?',
      'A CVSS 3.1 vector and score make severity consistent and easy to check, so most good reports include one. Confirm what the current OffSec guidance asks for, then use the vector to justify the rating either way.',
    ],
    [
      'Can ZeroBox produce the PDF OffSec asks for?',
      'Not directly. ZeroBox generates the report as Markdown and as a standalone HTML file you can print to PDF from a browser, and its zip bundle holds both with your proof screenshots. You then put the PDF in a .7z yourself.',
    ],
  ];

  const body = `<h2>Required sections</h2>
<p>OffSec asks for a professional penetration test report that documents each compromised target well enough for someone else to repeat your steps. At minimum plan for these parts: an executive summary, the scope and methodology, a results summary, and one section per target with the full attack path, proof of the flags, and the code or commands you used. Check the current ${'<a href="https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements" rel="noopener">OSCP+ reporting requirements</a>'} on the OffSec help center, which are the authority and can change.</p>
<h2>Markdown skeleton</h2>
<p>Copy this into your notes before the exam and fill it in as you go.</p>
<pre><code>${esc(SKELETON)}</code></pre>
<h2>Finding template</h2>
<p>Use one block per vulnerability. Keep the steps specific enough that a reader could follow them without you.</p>
<pre><code>${esc(FINDING)}</code></pre>
<h2>CVSS 3.1 worked example</h2>
<p>An unauthenticated remote code execution flaw in a network service is the classic maximum. Its vector is <code>${esc(vector)}</code>, and the base score is <strong>${score} (${rating(score)})</strong>.</p>
<table><thead><tr><th>Metric</th><th>Meaning</th><th>Reading</th><th>Weight</th></tr></thead><tbody>${metrics}</tbody></table>
<p>With Scope Unchanged, the impact sub score is 6.42 times the ISS, where ISS is 1 minus the product of (1 minus each impact weight). All three at 0.56 gives an ISS of 0.915 and an impact of 5.87. Exploitability is 8.22 times the four exploit weights, which is 3.89. The sum, 9.76, is rounded up to ${score}. The CVSS 3.1 scale rates 9.0 to 10.0 as Critical. If the same flaw needed a low privilege account (<code>PR:L</code>), the score would drop to ${second} (${rating(second)}).</p>
<h2>Proof screenshot rules</h2>
<p>OffSec's guidance expects the content of each proof file to be visible in a screenshot together with the target IP address, taken from an interactive shell on the machine rather than a copy pasted into a document. Confirm the exact wording on the live page. In practice:</p>
<ul>
<li>Capture the command that prints the flag and the command that shows the IP in one frame.</li>
<li>Take the screenshot the moment you get the flag, not at the end of the exam.</li>
<li>Name files by host and flag so you can find them at 3am.</li>
</ul>
<h2>Packaging and submission</h2>
<ol>
<li>Finish the report and export it as a PDF.</li>
<li>Name it <code>OSCP-OS-XXXXX-Exam-Report.pdf</code> with your own OSID.</li>
<li>Put only that PDF in a <code>.7z</code> archive with the matching name and no password.</li>
<li>Upload before the deadline, which per OffSec is 24 hours after the exam ends.</li>
</ol>
<h2>Generate it in ZeroBox</h2>
<p>The ZeroBox exam report generator turns your session into this structure. It records proof screenshots against each flag, takes findings with a CVSS 3.1 vector, sorts them by severity, and exports Markdown or a standalone HTML report. The submission bundle is a <code>.zip</code> holding <code>report.md</code>, <code>report.html</code>, a <code>proofs/</code> folder, <code>findings.json</code> and a README. OffSec wants a PDF in a <code>.7z</code>, so print <code>report.html</code> to PDF and archive it yourself. Rehearse that whole path in a mock exam from the <a href="/exam/">exam simulator</a>, and see the <a href="/oscp-exam-scoring-and-time-budget/">time budget guide</a> for when to start writing.</p>`;

  return {
    path: PATH,
    crumb: 'OSCP report template',
    title: 'OSCP Report Template (Markdown) with CVSS Findings',
    description:
      'Copyable Markdown OSCP report skeleton, a finding template, a CVSS 3.1 worked example (9.8 Critical), proof screenshot rules and packaging steps.',
    h1: 'OSCP report template in Markdown, with CVSS findings',
    lead: 'An OSCP report needs an executive summary, methodology, a results table and one repeatable section per target with proof of every flag. Copy the Markdown skeleton and finding template below, then use the CVSS 3.1 example to rate severity consistently.',
    body,
    cta: {
      title: 'Write the report as you hack.',
      body: 'ZeroBox keeps proof screenshots, findings and CVSS vectors per target and exports Markdown, HTML and a zip bundle.',
      href: '/exam/',
      label: 'Start a mock exam',
    },
    faq,
    related: ['/oscp-exam-scoring-and-time-budget/', '/exam/', '/methodology-guide/', '/tj-null-list/', '/cheatsheet-library/'],
    sources: [
      ['https://help.offsec.com/hc/en-us/articles/360046787731-OSCP-Reporting-Requirements', 'OffSec Help Center: OSCP+ Reporting Requirements'],
      ['https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', 'OffSec Help Center: OSCP+ Exam Guide'],
      ['https://www.first.org/cvss/v3.1/specification-document', 'FIRST: CVSS v3.1 Specification Document'],
    ],
    affil: 'ZeroBox is an independent project and is not affiliated with OffSec or Hack The Box.',
  };
}

module.exports = { build, cvss31 };
