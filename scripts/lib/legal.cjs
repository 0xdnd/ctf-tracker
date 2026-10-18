// Privacy and Terms pages (/privacy/, /terms/). Plain copy only; the facts below are checked against the code:
//   app storage    : src/store/*, src/utils/indexedDbVault.ts, indexedDbDeepStorage.ts (also holds exam proof images), resilientStorage.ts
//   public pages   : scripts/lib/site.cjs beaconTag() (Cloudflare Web Analytics); the app shell never loads it
//   telemetry      : zero telemetry, 100% in-browser offline execution
//   backups        : src/utils/backupCrypto.ts (PBKDF2 + AES-GCM, passphrase never stored)
//   license        : LICENSE (ZNSL 1.0, source-available, non-commercial)
// Public interface: buildLegalPages({ renderPage }) -> [{ path, title, description, html, lastmod }]
const { ORIGIN, esc, REPO } = require('./layout.cjs');

const UPDATED = '2026-10-12';
const SRC_FILE = 'scripts/lib/legal.cjs';

const PRIVACY = {
  path: '/privacy/',
  title: 'Privacy | ZeroBox',
  description:
    'ZeroBox has no accounts and no app analytics, and keeps your data in your browser. See what is stored, what is counted and how to delete it.',
  h1: 'Privacy',
  body: () =>
    [
      `<p class="lead">The ZeroBox app has no accounts, no analytics and no telemetry. Your data stays in your browser. This page explains what is stored, what is counted and what can leave your device.</p>`,
      `<p class="muted">Last updated ${UPDATED}.</p>`,

      `<h2>The app</h2>`,
      `<p>The app is everything under <a href="/tracker/">/tracker/</a>, <a href="/exam/">/exam/</a>, <a href="/notes/">/notes/</a>, <a href="/vault/">/vault/</a> and the other tool pages. There is no sign-in and no ZeroBox server that receives your data. It does not load analytics, ads or third-party scripts.</p>`,
      `<p>An optional operator profile (a display name, callsign and avatar) exists, but it is only a label stored in your browser.</p>`,

      `<h2>What the app stores in your browser</h2>`,
      `<p>Everything below stays on your device, in the storage your browser gives this site.</p>`,
      `<ul>`,
      `<li><strong>Your work.</strong> Targets and their status, notes, credentials and other loot, checklists, the attack graph, writeups, goals and exam simulator sessions. Most of it is in local storage. Larger items, such as the notes vault, long writeups and exam proof screenshots, are in IndexedDB.</li>`,
      `<li><strong>A safety copy.</strong> A second copy of your workspace and a few automatic snapshots, including one before an update, so a browser storage problem does not cost you your work. These are in IndexedDB.</li>`,
      `<li><strong>Preferences.</strong> Theme, layout, pinned tabs, sound and font settings, and whether you finished onboarding.</li>`,
      `<li><strong>An offline copy of the app.</strong> A service worker keeps the app files in the browser cache so ZeroBox opens without a connection. This holds the app itself, not your data.</li>`,
      `</ul>`,
      `<p>The app code sets no cookies. If you want to look, the IndexedDB databases are named <code>zerobox_vault_db</code>, <code>zerobox_deep_storage_db</code> and <code>zerobox_resilient_store_v1</code>.</p>`,

      `<h2>The public pages</h2>`,
      `<p>The home page, the guides, the machine lists, the pentest notes and the other pages on this site load Cloudflare Web Analytics, including this page. It is cookieless and counts page views: which page, the referrer, the country and the browser. The app pages do not load it.</p>`,
      `<p>Cloudflare handles that data under its own <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener">privacy policy</a>.</p>`,

      `<h2>Hosting</h2>`,
      `<p>This site is hosted on GitHub Pages behind Cloudflare. Like any website, they see standard request information, such as your IP address and browser user agent, when you load a page. They handle it under their own policies.</p>`,

      `<h2>Backups and sync files</h2>`,
      `<p>Backups are files you create with the backup tool and move yourself. Nothing is uploaded. An encrypted export uses a passphrase you choose, and ZeroBox does not keep it, so it cannot recover a lost one.</p>`,

      `<h2>Delete your data</h2>`,
      `<p>Clear the site data for ctftracker.com in your browser settings. That removes everything the app stores, including local storage, IndexedDB and the offline cache.</p>`,
      `<p>Inside the app, Backup has a Reset all progress option. It resets target progress and clears flags, notes, loot and the vault, while leaving your local UI preferences intact.</p>`,

      `<h2>Questions</h2>`,
      `<p>The source is public, so you can check all of this. To ask a question or report a problem, open an issue on <a href="${esc(REPO)}/issues" rel="noopener">GitHub</a>. See also the <a href="/terms/">terms</a>.</p>`,
    ].join('\n'),
};

const TERMS = {
  path: '/terms/',
  title: 'Terms | ZeroBox',
  description:
    'Terms for ZeroBox: provided as is with no warranty, source-available non-commercial license, for authorized practice and learning, and no affiliation.',
  h1: 'Terms',
  body: () =>
    [
      `<p class="lead">ZeroBox is a free tool for practice and learning. These terms are short and plain.</p>`,
      `<p class="muted">Last updated ${UPDATED}.</p>`,

      `<h2>No warranty</h2>`,
      `<p>ZeroBox is provided as is, without warranty of any kind. The author is not liable for any loss or damage from using it. This follows the disclaimer in the <a href="${esc(REPO)}/blob/main/LICENSE" rel="noopener">license</a>.</p>`,

      `<h2>License</h2>`,
      `<p>The source code is under the ZeroBox Source-Available Non-Commercial and Educational License (ZNSL 1.0). You can read, study and run it for personal, educational and non-commercial use. It is not an OSI-approved open-source license, so read the <a href="${esc(REPO)}/blob/main/LICENSE" rel="noopener">license</a> for what is and is not allowed.</p>`,

      `<h2>Authorized use only</h2>`,
      `<p>ZeroBox is for practice and learning. Use it on labs, CTF platforms and systems you own or have permission to test. You are responsible for following the rules of the platforms you use and the laws that apply to you.</p>`,

      `<h2>No affiliation</h2>`,
      `<p>ZeroBox is an independent project. It is not affiliated with, endorsed by or sponsored by Hack The Box, TryHackMe, OffSec, TCM Security or INE. All trademarks and product names belong to their owners and are used only to describe what ZeroBox works with.</p>`,

      `<h2>Your data</h2>`,
      `<p>You are responsible for what you store in ZeroBox and what you export from it, including credentials, flags and scan output from the systems you test. Follow the rules of the platform or exam you are using about what you may record or share. See the <a href="/privacy/">privacy page</a> for where your data lives.</p>`,

      `<h2>Changes</h2>`,
      `<p>These terms may change. The date at the top shows the last update.</p>`,
    ].join('\n'),
};

function buildLegalPages({ renderPage } = {}) {
  return [PRIVACY, TERMS].map((p) => ({
    path: p.path,
    title: p.title,
    description: p.description,
    html: renderPage({
      path: p.path,
      title: p.title,
      description: p.description,
      h1: p.h1,
      body: p.body(),
      crumbs: [['Home', '/'], [p.h1, p.path]],
      ogType: 'website',
    }),
    url: ORIGIN + p.path,
  }));
}

module.exports = { buildLegalPages, LEGAL_SRC: SRC_FILE, LEGAL_UPDATED: UPDATED };
