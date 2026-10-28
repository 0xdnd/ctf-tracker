# Notes for AI agents and contributors

## SEO freeze — do not change until the dates below
Owner decision, 2026-10-21. Full plan: `ctftracker.com-audit/GEO-PLAN-2026-10-21.md` (local, gitignored).

- **No page title / meta description / H1 changes before 2026-11-15.** Title rewrites shipped 2026-10-18 are being measured in Search Console. Interim look: 2026-11-08.
- **Catalog freeze lifted 2026-10-28.** The owner approved importing Proving Grounds and VulnHub machines (`src/data/catalogSources/`), widening `Platform`, and updating the machine count (now 1,372). The title / meta description / H1 *wording* freeze above still runs to 2026-11-15; only the number inside existing copy changes.
  - Allowed: PG sections on `/tj-null-list/` (data in `src/data/trackSources/tjnull-oscp.json`) and the opt-in "add to my tracker" action that creates `Custom` machines.
- **No `/best-oscp-trackers/` comparison page** — rejected by the owner (self-promotion).
- **Never delete indexed pages. No bulk machine pages** — a machine page needs the owner's own writeup (>=250 words, a personal data point; never invent one). Never publish flag answers.
- **Commit only; never push without the owner's explicit OK.**

Re-check AI citations (ChatGPT + Perplexity, signed in): 2026-11-21 and 2026-12-21. Baseline: `ctftracker.com-audit/GEO-BASELINE-2026-10-21.md`.
