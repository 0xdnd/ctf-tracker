# Owner data

`machine-notes.json` holds short hand-written notes shown as a "My notes" section on machine detail pages.

Format: a JSON object keyed by machine slug (for example `"htb-mongod"`), value is the note text.
Separate paragraphs with a blank line (`\n\n`). Plain text only; it is HTML-escaped on output.
Keys that match no machine with a page produce a build warning. Run `npm run notes:todo` to list machines without a note.
The `MACHINE_NOTES_FILE` environment variable overrides the file path (used by tests).
