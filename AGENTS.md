# Notes for AI agents and contributors

## SEO rules
Owner decision, 2026-10-21. Full plan: `ctftracker.com-audit/GEO-PLAN-2026-10-21.md` (local, gitignored).

- **Title / meta description / H1 freeze lifted by the owner on 2026-11-10.** Wording changes are allowed again; keep them within the page gate and the rules below.
- **Catalog freeze lifted 2026-10-28.** The owner approved importing Proving Grounds and VulnHub machines (`src/data/catalogSources/`), widening `Platform`, and updating the machine count (now 1,376).
  - Allowed: PG sections on `/tj-null-list/` (data in `src/data/trackSources/tjnull-oscp.json`) and the opt-in "add to my tracker" action that creates `Custom` machines.
- **No `/best-oscp-trackers/` comparison page** — rejected by the owner (self-promotion).
- **Never delete indexed pages. No bulk machine pages** — a machine page needs the owner's own writeup (>=250 words, a personal data point; never invent one). Never publish flag answers.
- **Commit only; never push without the owner's explicit OK.**

Re-check AI citations (ChatGPT + Perplexity, signed in): 2026-11-21 and 2026-12-21. Baseline: `ctftracker.com-audit/GEO-BASELINE-2026-10-21.md`.
