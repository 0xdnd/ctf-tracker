# Notes for AI agents and contributors

## SEO freeze — do not change until the dates below
Owner decision, 2026-10-21. Full plan: `ctftracker.com-audit/GEO-PLAN-2026-10-21.md` (local, gitignored).

- **No page title / meta description / H1 changes before 2026-11-15.** Title rewrites shipped 2026-10-18 are being measured in Search Console. Interim look: 2026-11-08.
- **Do not add Proving Grounds or Vulnhub machines to the machine catalog** (`src/data/machinesCatalog.ts`), and do not widen the `Platform` type (`src/types/index.ts`), before 2026-11-15. Every catalog row is merged into every user's board, and the "1,027 CTF machines" count feeds page meta. Decision on full catalog support is due 2026-11-15, based on opt-in usage.
  - Note: TJ Null's current PWK V3 tab (updated July 2026) has HTB, PG Play, PG Practice and Vulnlab sections — no Vulnhub.
  - Allowed now: PG sections on `/tj-null-list/` (data in `src/data/trackSources/tjnull-oscp.json`) and an opt-in "add to my tracker" action that creates `Custom` machines.
- **Do not change the "1,027" machine count** anywhere it reaches titles or meta descriptions.
- **No `/best-oscp-trackers/` comparison page** — rejected by the owner (self-promotion).
- **Never delete indexed pages. No bulk machine pages** — a machine page needs the owner's own writeup (>=250 words, a personal data point; never invent one). Never publish flag answers.
- **Commit only; never push without the owner's explicit OK.**

Re-check AI citations (ChatGPT + Perplexity, signed in): 2026-11-21 and 2026-12-21. Baseline: `ctftracker.com-audit/GEO-BASELINE-2026-10-21.md`.
