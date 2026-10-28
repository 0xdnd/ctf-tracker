# Writeups toolkit

Helpers for turning your own raw lab notes into a valid on-site writeup (`content/writeups/<machine slug>.md`).

**Ground rules**
- The writeup must be your own work, from a lab you solved yourself. The tools here only tidy and check; they never invent content.
- Do not publish flags or answers for graded exams or certification content.

## Steps
1. **Write raw notes** in any format and language (a Markdown file is easiest).
2. **Redact**: `npm run writeups:redact -- notes.md` is a dry run that lists findings (line numbers, masked previews). Add `--write` to save `notes.redacted.md` next to the original (the original is never touched). Read the result: automated redaction is not exhaustive. Image embeds are reported because on-site images are not supported yet.
3. **Draft**: give `PROMPT.md` plus the redacted notes to an AI assistant of your choice, or write by hand starting from `TEMPLATE.md`. Save the file as `content/writeups/<machine slug>.md`.
4. **Check**: `npm run writeups:check` validates every writeup, or `npm run writeups:check -- path/to/file.md` checks one file (drafts included). It prints OK/FAIL, word counts, technique links and remaining `[TODO]` markers. `npm run writeups:check -- --help` lists the allowed technique slugs and the rules.
5. **Preview**: run `npm run build` (the same validation gates the build) and open the machine page.

Field rules and the build gate are documented in `content/writeups/README.md`; the validator (`scripts/lib/writeups.cjs`) is the source of truth.
