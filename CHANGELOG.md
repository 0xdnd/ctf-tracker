# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.6.0] - 2026-11-24

### Added
- Target & AD credentials HUD (`DOMAIN`, `DC IP`, `USER`, `PASS`) in the Session popover with password reveal and Evidence Vault quick-fill.
- Update Ready & post-update What's New popups (Web + Desktop) highlighting short release notes and added, active, and retired catalog machines.
- Exam & Personal Pivot Attack Graph inside the Exam Simulator with custom internal hosts, linked credentials, and SVG / Obsidian Canvas export.
- Automatic archival of retired Hack The Box machines during weekly catalog sync so practice tracks never lose retired entries.

### Fixed
- Partial text selection restored across reverse-shell payloads, command blocks, and code views (`select-text` instead of `select-all`).
- Notes file explorer now expands cleanly with the resizable sidebar divider on `/notes/` and in the docked Notes workspace.
- Fixed stuck target detail modal when closing or switching into Assign IP, and resolved accessibility and mobile layout regressions across all themes.

## [2.5.6] - 2026-11-15

### Changed
- Faster tracker first load: static welcome card, deferred catalog loading, fewer layout shifts.
- Copy buttons on every code block, LHOST/LPORT fill fields on the reverse shells page.
- Paged machines list, dated guide hubs, per-page share images, opaque header on scroll.
- Consistent hover lift on cards and rows; visible card hover in light theme.
- External links in the desktop app open over https only.

### Fixed
- Solve counts and catalog totals derived from data instead of hard-coded numbers.
- Dead writeup links hidden; accessibility labels, skip links and focus on main content.

## [2.5.5] - 2026-11-10

### Added
- Cleaner first visit with a polished welcome and clearer search snippets.
- Internal links from top pages, a machines call to action, and OSCP points calculator structured data.
- Proving Grounds and VulnHub named on the home and tracker pages.

### Changed
- Page titles derive their year automatically.
- Machine pages without an owner writeup are no longer indexed.
- Unused components and a dependency were removed.

### Fixed
- Desktop: external links open in the system browser.

## [2.5.4] - 2026-11-08

### Added
- Obsidian-style field manual with notes tabs, Mermaid diagrams, and a full side panel.
- Opt-in desktop alerts for the exam timer and due reviews.
- Screenshots section in the README.

### Changed
- Clearer Methodology page.

## [2.5.3] - 2026-11-06

### Added
- Desktop: in-app update check and full version display.

## [2.5.2] - 2026-11-05

### Added
- First-run tour, OSCP points calculator, and pass card.

### Fixed
- Exam scoring correction.
- The tour no longer starts automatically on the OSCP calculator page.

## [2.5.1] - 2026-11-04

### Changed
- Desktop: refreshed updater signing key. Earlier installs need one manual update.

## [2.5.0] - 2026-11-04

### Added
- Desktop: automatic updates through GitHub Releases.
- Fresh first-visit experience, guide center, OffSec theme, and redesigned hub.
- Proving Grounds and VulnHub catalog entries.
- Machine summary strip and host loot panel.
- IP templating in notes.
- Security policy, code of conduct, and pull request template.

### Fixed
- Deleting a profile now removes all of its data.
- Follow-up fixes from the guide review.

## [2.4.1] - 2026-10-20

### Fixed
- Desktop build: Tauri Rust crates aligned with the npm packages.

## [2.4.0] - 2026-10-20

### Added
- Track progress, compact Tracks picker, multi-track URLs, and track-order sort in the tracker.
- Active / Retired availability filter.
- Vault-connected notes dock with side list and cheat tabs.
- Certification and track hubs, IppSec CPTS track, and Pro Labs guide.
- Platform badge beside OS and difficulty on all layouts.

### Changed
- Minimalist tracker toolbar; readiness moved to analytics.
- Exam targets are seeded from the catalog with corrected scoring.
- Settings menu trimmed; target page opens on engage; taller kanban.
- Faster page loads and clearer SEO titles and machine pages.

### Fixed
- Off-track machines stay last in track order.
- Tag popover no longer opens with the modal; neutral track clear button.

## [2.0.0] - 2026-09-24

### Added
- v2.0 master suite with tactical HUD and offensive forge.

### Changed
- Catalog pruned to 1,027 machines, keeping HTB Starting Point.
- SEO overhaul; AI feature removed.

[Unreleased]: https://github.com/0xdnd/ctf-tracker/compare/v2.4.1...HEAD
[2.4.1]: https://github.com/0xdnd/ctf-tracker/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/0xdnd/ctf-tracker/compare/v2.0.0...v2.4.0
[2.0.0]: https://github.com/0xdnd/ctf-tracker/releases/tag/v2.0.0
