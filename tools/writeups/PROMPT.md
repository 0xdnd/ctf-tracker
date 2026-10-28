# Prompt: turn raw lab notes into a writeup

Give this file to an AI assistant together with the author's redacted notes (see README.md in this folder).

## Task
Convert the author's raw notes for ONE lab machine into a single Markdown file at `content/writeups/<machine-slug>.md`. Rewrite rough notes into clear prose while keeping the author's own findings, decisions and voice. Use only authorized practice labs the author solved; do not invent anything the notes do not contain.

## Hard rules
1. **No invention.** Rephrase and tidy; never add facts, steps, timings or results the author did not write, and never invent actions they did not perform. The `## What I would do differently` section is optional: include it only if the notes contain something for it, otherwise omit it. If a required fact is missing, leave a plain-text `[TODO: ask author]` marker (never an HTML comment), or set `draft: true`.
2. **Redact first.** The notes should already be run through `npm run writeups:redact`. Also remove from prose and code blocks: target and VPN/local IP addresses (use `TARGET` and `TARGET_LOCAL`), the local username in shell prompts, and any flag value, `user.txt`/`root.txt` hash or 32-char hex string (use `[redacted]`).
3. **No padding.** Reach the minimum length with real content from the notes. If there is not enough, stop and tell the author it is too short.
4. **English output**, even if the notes are in another language.
5. **No images.** Image embeds are rejected. Transcribe the relevant commands and output from screenshots into fenced `text` code blocks, redacted as above.
6. **No raw HTML**, no H1, links only `https://` or site-relative `/...`.

## Format
Field rules and the exact body structure are in `content/writeups/README.md`. The validator (`scripts/lib/writeups.cjs`) is the source of truth; do not guess enums or limits. Use `tools/writeups/TEMPLATE.md` as the skeleton. Link to technique pages as `/techniques/<slug>/`; run `npm run writeups:check -- --help` for the allowed slugs and rule summary.

## Before you finish
Run `npm run writeups:check -- content/writeups/<machine-slug>.md` and fix every FAIL. Do not commit or push, and do not edit files outside `content/writeups/`.
Report: the file path, the prose word count, the technique links used, and any `[TODO]` markers left for the author.
