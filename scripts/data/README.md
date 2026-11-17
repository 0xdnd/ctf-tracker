# Owner data

`machine-notes.json` holds short hand-written notes shown as a "My notes" section on machine detail pages.

Format: a JSON object keyed by machine slug (for example `"htb-mongod"`), value is the note text.
Separate paragraphs with a blank line (`\n\n`). Plain text only; it is HTML-escaped on output.
Keys that match no machine with a page produce a build warning. Run `npm run notes:todo` to list machines without a note.
The `MACHINE_NOTES_FILE` environment variable overrides the file path (used by tests).

`vulnhub-raw.json` is the cache behind `src/data/catalogSources/vulnhub.json`; `vulnhub-id-map.json` maps the original 122 app ids to VulnHub slugs and `vulnhub-legacy-rows.json` holds those rows (their ids are never dropped). Refresh with `npm run sync:vulnhub`.

`pg-raw.json` is the cached official PG lab list behind `src/data/catalogSources/pg.json`; `pg-id-map.json` maps each lab's content_id to its app id and `pg-legacy-rows.json` holds the rows that existed before the first sync (their ids are never dropped). Refresh with `npm run sync:pg` (add `-- --seed <file>` for a new export). A single weekly workflow (`.github/workflows/catalog-sync.yml`, Mondays 06:00 UTC) runs the VulnHub, PG and active-HTB syncs together and commits the results to main after tests and build pass.