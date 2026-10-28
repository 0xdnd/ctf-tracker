# Writeups

One file per machine: `content/writeups/<machine page slug>.md` (for example `htb-keeper.md`). The build renders it into `/machines/<slug>/` as a `#writeup` section; there is no separate URL. The machine must be an owner-solved, non-active machine with a page. Files starting with `_` and this README are skipped; `_example.md` is a complete fixture.

## Frontmatter
Required: `machine` (= file name), `platform` (HTB|THM|PG), `os`, `difficulty` (must match the catalog), `solved` (YYYY-MM-DD, not in the future), `time` (hours, > 0), `tags` (list), `takeaway` (40-60 words), `timeBreakdown` (list of `[phase, minutes]`, sum within 10% of `time`).
Optional: `related` (other writeup slugs or https URLs), `gitbook` (https URL), `draft`.

## Body
Markdown, H2 sections once each, in this order: `Summary`, `Approach`, `Key steps`, and optionally `What I would do differently`. H3 is allowed under them. No raw HTML, no images, links only `https://` or site-relative `/...`.

## Gate (the build fails with `file: reason`)
- At least 250 words of prose (code excluded), at least 3 distinct `/techniques/<slug>/` links, and a personal data point (a sentence with "I"/"my" and a number).
- No flag-looking text (`NAME{...}`), no 32-character hex string, no `user.txt`/`root.txt` line with a hash.
- `<!-- allow-hash -->` at the end of a line exempts that line from the hash rules only (never from the flag rule). The marker is removed from the output.

## Flags
`draft: true` skips the file entirely (no validation, no output). `noindex` is not supported for machine pages (use `draft: true`).

## Toolkit
`tools/writeups/README.md` describes the note-to-writeup workflow: a redaction helper (`npm run writeups:redact`), an AI prompt, a blank template and a checker (`npm run writeups:check`).
