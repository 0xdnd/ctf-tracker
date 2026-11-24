/**
 * Masks the parts of a free-text field that look like secrets and keeps the rest of the text, for the
 * "hide sensitive data" backup option (notes, writeups and raw scan output).
 *
 * What it masks: private key blocks, JWTs and well-known API token formats, bearer tokens, `password=...`-style
 * key/value pairs, NTLM LM:NT pairs, NetNTLMv1/v2 captures, Kerberos roast hashes (`$krb5tgs$`, `$krb5asrep$`),
 * Unix crypt hashes (`$1$`, `$5$`, `$6$`, `$y$`, `$2a$`/`$2b$`/`$2y$`) and long hex hashes (exactly 32, 40 or 64 hex characters).
 * It is a heuristic: it favours masking too much over leaking, but ordinary prose, IPs, ports and commands stay.
 */

import type { CptsNoteEntry } from './obsidianManualUtils';

export const SECRET_MASK = '[REDACTED]';

// Key names whose value is a secret. `pass` alone is left out because it is a common English word.
const SECRET_KEY = '(?:password|passwd|pwd|passphrase|secret|client[_-]?secret|token|auth[_-]?token|api[_-]?key|apikey|access[_-]?key)';

const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g;
// GitHub, AWS access key id, OpenAI-style, Slack
const API_TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g;
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
const KEY_VALUE = new RegExp(
  `(\\b${SECRET_KEY}\\b["']?\\s*[:=]\\s*)("[^"\\n]*"|'[^'\\n]*'|[^\\s,;&"']+)`,
  'gi'
);
// NetNTLMv2 (`user::DOMAIN:challenge:proof:blob`) and NetNTLMv1 (`user::DOMAIN:lm:nt:challenge`) captures. The
// account and domain stay readable; everything from the challenge on is masked. The match anchors on the `::`
// (an account character must precede it, the domain is bounded) so a long dotted or dashed token cannot make
// the engine retry from every start position, which was quadratic.
const NETNTLM_V2 = /(?<=[\w.$@\\-])(::[\w.-]{0,255}:)[a-fA-F0-9]{16}:[a-fA-F0-9]{32}:[a-fA-F0-9]{16,}/g;
const NETNTLM_V1 = /(?<=[\w.$@\\-])(::[\w.-]{0,255}:)[a-fA-F0-9]{48}:[a-fA-F0-9]{48}:[a-fA-F0-9]{16}\b/g;
// Kerberos roast hashes in hashcat format, up to the next whitespace.
const KRB5 = /\$krb5(?:tgs|asrep|pa)\$[^\s"'`]+/g;
// Unix crypt formats: $1$ $5$ $6$ and yescrypt ($y$) are `$id$[params$]salt$hash`; bcrypt is `$2y$NN$<salt+hash>`.
// The leading group keeps a `$6` in prose ("costs $6$ per run") from matching: a hash body of 20+ characters is required.
const CRYPT_HASH = /(^|[^\w$])(?:\$(?:[156]|y)\$(?:[./A-Za-z0-9,=-]+\$){1,3}[./A-Za-z0-9]{20,}|\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{40,})/g;
const NTLM_PAIR = /\b[a-fA-F0-9]{32}:[a-fA-F0-9]{32}\b/g;
// A run of exactly 32, 40 or 64 hex characters that is not all digits (a long number is not a hash).
const HEX_HASH = /\b(?![0-9]+\b)(?:[a-fA-F0-9]{64}|[a-fA-F0-9]{40}|[a-fA-F0-9]{32})\b/g;

// Cheap gate: every rule above needs one of these anchors (a literal marker, a secret key name, `::`, `$`, or a
// 32-hex run), so plain prose returns without running the eleven passes. Keep it a superset when adding a rule.
const MAY_CONTAIN_SECRET =
  /-----BEGIN|eyJ|gh[pousr]_|github_pat_|AKIA|sk-|xox[baprs]-|bearer|password|passwd|pwd|passphrase|secret|token|api[_-]?key|apikey|access[_-]?key|::|\$|[a-f0-9]{32}/i;

export function maskSecretsInText(text: string): string {
  if (typeof text !== 'string' || text === '') return text;
  if (!MAY_CONTAIN_SECRET.test(text)) return text;
  return text
    .replace(PRIVATE_KEY_BLOCK, SECRET_MASK)
    .replace(JWT, SECRET_MASK)
    .replace(API_TOKEN, SECRET_MASK)
    .replace(NETNTLM_V2, `$1${SECRET_MASK}`)
    .replace(NETNTLM_V1, `$1${SECRET_MASK}`)
    .replace(KRB5, SECRET_MASK)
    .replace(CRYPT_HASH, `$1${SECRET_MASK}`)
    .replace(BEARER, `$1${SECRET_MASK}`)
    .replace(KEY_VALUE, `$1${SECRET_MASK}`)
    .replace(NTLM_PAIR, SECRET_MASK)
    .replace(HEX_HASH, SECRET_MASK);
}

/** A copy of a note with every free-text field masked (markdown body, summaries and command lines). */
export function maskNoteEntry(note: CptsNoteEntry): CptsNoteEntry {
  const out: CptsNoteEntry = { ...note };
  if (typeof note.rawMarkdown === 'string') out.rawMarkdown = maskSecretsInText(note.rawMarkdown);
  if (typeof note.summary === 'string') out.summary = maskSecretsInText(note.summary);
  if (typeof note.enSummary === 'string') out.enSummary = maskSecretsInText(note.enSummary);
  if (typeof note.heSummary === 'string') out.heSummary = maskSecretsInText(note.heSummary);
  if (Array.isArray(note.commands)) {
    out.commands = note.commands.map((c) => (typeof c === 'string' ? maskSecretsInText(c) : c));
  }
  return out;
}
