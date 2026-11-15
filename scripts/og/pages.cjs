'use strict';
// Share-image registry: one entry per image in public/og/. Read by scripts/og/generate-og.mjs (renders the PNGs)
// and by scripts/lib/layout.cjs (wires og:image / twitter:image). The normal build only reads this file, never Playwright.
const IMAGES = {};
const BY_PATH = {};
const add = (key, kind, title, sub, paths = []) => {
  IMAGES[key] = { key, file: `/og/${key}.jpg`, kind, title, sub, alt: `${title}. ${sub} ZeroBox, free offline CTF tracker.` };
  for (const p of paths) BY_PATH[p] = key;
};

// Certification hubs (/<slug>/).
for (const [slug, name] of [
  ['oscp-like-machines', 'OSCP-like machines'],
  ['cpts-like-machines', 'CPTS-like machines'],
  ['crto-like-machines', 'CRTO-like machines'],
  ['osep-like-machines', 'OSEP-like machines'],
  ['oswe-like-machines', 'OSWE-like machines'],
  ['cwee-like-machines', 'CWEE-like machines'],
  ['htb-starting-point-machines', 'HTB Starting Point machines'],
  ['ippsec-cpts-machines', 'IppSec CPTS track machines'],
  ['active-directory-machines', 'Active Directory machines'],
]) add(slug, 'MACHINE LIST', name, 'Practice boxes sorted by difficulty, free.', [`/${slug}/`]);

// Guides.
add('oscp-vs-cpts', 'GUIDE', 'OSCP vs CPTS', 'Which pentest certification fits you.', ['/oscp-vs-cpts/']);
add('oscp-scoring', 'GUIDE', 'OSCP exam scoring and time budget', 'Points, pass mark and a 24-hour plan.', ['/oscp-exam-scoring-and-time-budget/']);
add('cpts-exam-guide', 'GUIDE', 'CPTS exam guide', 'Format, scoring and preparation notes.', ['/cpts-exam-guide/']);
add('htb-pro-labs-guide', 'GUIDE', 'HTB Pro Labs guide', 'Pick, pace and track a Pro Lab.', ['/htb-pro-labs-guide/']);
add('htb-vs-tryhackme', 'GUIDE', 'HTB vs TryHackMe', 'Compared for pentest practice.', ['/htb-vs-tryhackme/']);
add('htb-progress-tracker', 'GUIDE', 'HTB progress tracker', 'Log every box offline in your browser.', ['/htb-progress-tracker/']);
add('oscp-report-template', 'GUIDE', 'OSCP report template', 'A clean structure for exam and lab reports.', ['/oscp-report-template/']);
add('tj-null-list', 'GUIDE', 'TJ Null list', 'The OSCP-like practice list, tracked.', ['/tj-null-list/']);

// Tools and hubs.
add('oscp-points-calculator', 'FREE TOOL', 'OSCP points calculator', 'Check your pass threshold, offline.', ['/oscp-points-calculator/']);
add('machines', 'MACHINE LIST', 'HTB, THM, PG and VulnHub machines', 'One searchable list of practice boxes.', ['/machines/']);
add('techniques', 'HUB', 'Pentest techniques', 'Key commands with matching practice boxes.', ['/techniques/']);
add('cheatsheet-library', 'HUB', 'OSCP and CTF cheatsheets', 'Commands by topic, copy and paste.', ['/cheatsheet-library/']);
add('methodology-guide', 'GUIDE', 'Pentest methodology checklist', 'Enumeration to reporting, phase by phase.', ['/methodology-guide/']);
add('revshells', 'CHEATSHEET', 'Reverse shell cheat sheet', 'Copy-paste one-liners by language.', ['/revshells/']);
add('pentest-notes', 'HUB', 'Pentest methodology notes', 'Commands and notes you can reuse.', ['/pentest-notes/']);

// Shared templates for page families.
add('machine-htb', 'MACHINE PAGE', 'Hack The Box machine', 'Attack path, techniques and key commands.');
add('machine-thm', 'MACHINE PAGE', 'TryHackMe room', 'Attack path, techniques and key commands.');
add('machine-pg', 'MACHINE PAGE', 'Proving Grounds machine', 'Attack path, techniques and key commands.');
add('machine-vulnhub', 'MACHINE PAGE', 'VulnHub machine', 'Attack path, techniques and key commands.');
add('family-technique', 'TECHNIQUE', 'Pentest technique', 'Key commands and practice machines.');
add('family-cheatsheet', 'CHEATSHEET', 'Pentest cheatsheet', 'OSCP and CTF commands, ready to copy.');
add('family-methodology', 'CHECKLIST', 'Methodology checklist', 'One phase of the attack lifecycle.');
add('family-notes', 'NOTES', 'Pentest notes', 'Methodology notes with commands.');

const PREFIX = [
  ['/techniques/', 'family-technique'],
  ['/cheatsheets/', 'family-cheatsheet'],
  ['/methodology/', 'family-methodology'],
  ['/pentest-notes/', 'family-notes'],
];
const PLATFORM_KEY = { HTB: 'machine-htb', THM: 'machine-thm', PG: 'machine-pg', VulnHub: 'machine-vulnhub' };

/** Image for a page, or null (callers fall back to /og.png). opts.platform picks the machine-page template. */
function ogImageFor(pagePath, opts = {}) {
  let key = BY_PATH[pagePath];
  if (!key && pagePath.startsWith('/machines/') && pagePath !== '/machines/') key = PLATFORM_KEY[opts.platform];
  if (!key) key = (PREFIX.find(([p]) => pagePath.startsWith(p)) || [])[1];
  return key ? IMAGES[key] : null;
}

module.exports = { IMAGES, ogImageFor };
