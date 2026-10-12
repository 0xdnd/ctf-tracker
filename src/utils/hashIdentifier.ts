/**
 * Pure helpers for identifying likely hash types from raw hash strings and
 * mapping them to hashcat modes / john formats, plus formatting helpers for
 * building cracking lists from a set of (username, hash) entries.
 *
 * Identification is pattern-based (fixed-prefix checks and length checks on
 * a trimmed, lowercased-where-safe string) — no backtracking-prone regexes.
 * Ambiguous 32-hex strings (MD5 vs NTLM) return both candidates, ordered by
 * the optional context `hint` ('windows' favors NTLM first).
 */

export interface HashCandidate {
  name: string;
  hashcatMode: number | null;
  johnFormat: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const HEX_RE = /^[a-f0-9]+$/i;

function isHex(s: string): boolean {
  return s.length > 0 && HEX_RE.test(s);
}

/**
 * Identifies the likely hash type(s) of a trimmed input string.
 * Returns an ordered (best-first) list of candidates, or [] if unknown.
 */
export function identifyHash(input: string, hint?: 'windows' | 'linux' | 'web'): HashCandidate[] {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return [];

  // --- Prefix-delimited formats (checked before generic hex/length rules) ---

  // Kerberos AS-REP: $krb5asrep$23$... (etype 23/RC4 is the only variant with a
  // confirmed hashcat mode; etype 17/18 AS-REP cracking support is not reliably
  // confirmed, so those return a null hashcatMode rather than guess a number).
  if (trimmed.startsWith('$krb5asrep$')) {
    const etypeMatch = trimmed.match(/^\$krb5asrep\$(\d+)\$/);
    const etype = etypeMatch ? etypeMatch[1] : '23';
    if (etype === '17' || etype === '18') {
      return [{ name: `Kerberos AS-REP (etype ${etype}, AES)`, hashcatMode: null, johnFormat: 'krb5asrep', confidence: 'low' }];
    }
    return [{ name: 'Kerberos AS-REP (etype 23, RC4)', hashcatMode: 18200, johnFormat: 'krb5asrep', confidence: 'high' }];
  }

  // Kerberoast TGS-REP: $krb5tgs$23$... (RC4) or $krb5tgs$17$.../$krb5tgs$18$...
  // (AES128/AES256 — distinct confirmed hashcat modes, not interchangeable).
  if (trimmed.startsWith('$krb5tgs$')) {
    const etypeMatch = trimmed.match(/^\$krb5tgs\$(\d+)\$/);
    const etype = etypeMatch ? etypeMatch[1] : '23';
    if (etype === '17') {
      return [{ name: 'Kerberos TGS-REP (etype 17, AES128)', hashcatMode: 19600, johnFormat: 'krb5tgs', confidence: 'high' }];
    }
    if (etype === '18') {
      return [{ name: 'Kerberos TGS-REP (etype 18, AES256)', hashcatMode: 19700, johnFormat: 'krb5tgs', confidence: 'high' }];
    }
    return [{ name: 'Kerberoast TGS-REP (etype 23, RC4)', hashcatMode: 13100, johnFormat: 'krb5tgs', confidence: 'high' }];
  }

  // bcrypt: $2a$, $2b$, $2y$
  if (/^\$2[aby]\$/.test(trimmed)) {
    return [{ name: 'bcrypt', hashcatMode: 3200, johnFormat: 'bcrypt', confidence: 'high' }];
  }

  // yescrypt: $y$ — no hashcat mode
  if (trimmed.startsWith('$y$')) {
    return [{ name: 'yescrypt', hashcatMode: null, johnFormat: 'crypt', confidence: 'high' }];
  }

  // sha512crypt: $6$
  if (trimmed.startsWith('$6$')) {
    return [{ name: 'sha512crypt', hashcatMode: 1800, johnFormat: 'sha512crypt', confidence: 'high' }];
  }

  // sha256crypt: $5$
  if (trimmed.startsWith('$5$')) {
    return [{ name: 'sha256crypt', hashcatMode: 7400, johnFormat: 'sha256crypt', confidence: 'high' }];
  }

  // md5crypt: $1$
  if (trimmed.startsWith('$1$')) {
    return [{ name: 'md5crypt', hashcatMode: 500, johnFormat: 'md5crypt', confidence: 'high' }];
  }

  // Django pbkdf2_sha256: pbkdf2_sha256$<iterations>$<salt>$<hash>
  if (trimmed.startsWith('pbkdf2_sha256$')) {
    return [{ name: 'Django pbkdf2_sha256', hashcatMode: 10000, johnFormat: 'django', confidence: 'high' }];
  }

  // DCC2 / mscash2: $DCC2$<iterations>#<user>#<hash> or $DCC2$<hash>
  if (trimmed.startsWith('$DCC2$')) {
    return [{ name: 'DCC2 (mscash2)', hashcatMode: 2100, johnFormat: 'mscash2', confidence: 'high' }];
  }

  // MySQL 4.1+: *<40 hex>
  if (trimmed.startsWith('*') && isHex(trimmed.slice(1)) && trimmed.length === 41) {
    return [{ name: 'MySQL 4.1+', hashcatMode: 300, johnFormat: 'mysql-sha1', confidence: 'high' }];
  }

  // NetNTLM (v1/v2): user::domain:challenge:response:blob — 6 colon-delimited
  // fields with an empty second field. v1's response (index 4) is the 24-byte
  // LM/NT response (48 hex chars) and its trailing client challenge (index 5)
  // is a fixed 8-byte value (16 hex chars). v2's NT-proof-str (index 4) is
  // 16 bytes (32 hex chars) followed by a variable-length, much longer blob
  // (index 5) that encodes the AV-pairs.
  if (trimmed.includes('::') && trimmed.split(':').length === 6) {
    const parts = trimmed.split(':');
    if (parts[1] === '') {
      const proofOrResponse = parts[4];
      const blobOrChallenge = parts[5];
      if (isHex(proofOrResponse) && proofOrResponse.length === 32 && isHex(blobOrChallenge) && blobOrChallenge.length >= 40) {
        return [{ name: 'NetNTLMv2', hashcatMode: 5600, johnFormat: 'netntlmv2', confidence: 'high' }];
      }
      if (isHex(proofOrResponse) && proofOrResponse.length === 48 && isHex(blobOrChallenge) && blobOrChallenge.length === 16) {
        return [{ name: 'NetNTLMv1', hashcatMode: 5500, johnFormat: 'netntlm', confidence: 'high' }];
      }
    }
  }

  // LM:NT pwdump line: user:rid:LM:NT:::
  if (trimmed.endsWith(':::') ) {
    const parts = trimmed.split(':');
    if (parts.length >= 7) {
      const lm = parts[2];
      const nt = parts[3];
      if (isHex(lm) && lm.length === 32 && isHex(nt) && nt.length === 32) {
        return [{ name: 'pwdump (LM:NT)', hashcatMode: 1000, johnFormat: 'nt', confidence: 'high' }];
      }
    }
  }

  // --- Plain hex-length based formats ---

  if (isHex(trimmed)) {
    const len = trimmed.length;

    if (len === 32) {
      // Ambiguous: MD5 and NTLM both use 32 hex chars.
      const ntlm: HashCandidate = { name: 'NTLM', hashcatMode: 1000, johnFormat: 'nt', confidence: 'medium' };
      const md5: HashCandidate = { name: 'MD5', hashcatMode: 0, johnFormat: 'raw-md5', confidence: 'medium' };
      return hint === 'windows' ? [ntlm, md5] : [md5, ntlm];
    }

    if (len === 40) {
      return [{ name: 'SHA1', hashcatMode: 100, johnFormat: 'raw-sha1', confidence: 'high' }];
    }

    if (len === 64) {
      return [{ name: 'SHA256', hashcatMode: 1400, johnFormat: 'raw-sha256', confidence: 'high' }];
    }

    if (len === 128) {
      return [{ name: 'SHA512', hashcatMode: 1700, johnFormat: 'raw-sha512', confidence: 'high' }];
    }
  }

  return [];
}

/**
 * Formats a list of (username, hash) entries into a cracking-list string
 * suitable for the given tool. hashcat mode keeps native multi-field lines
 * (pwdump / NetNTLM) intact since hashcat parses those directly; john mode
 * prefixes with 'user:' whenever a username is present.
 */
export function formatCrackingList(entries: { username?: string; hash: string }[], mode: 'hashcat' | 'john'): string {
  return entries
    .map(({ username, hash }) => {
      const h = (hash ?? '').trim();
      if (mode === 'hashcat') {
        return h;
      }
      // john mode
      if (username && username.trim()) {
        return `${username.trim()}:${h}`;
      }
      return h;
    })
    .join('\n');
}

/**
 * Groups a list of raw hash strings by their top-candidate hashcat mode.
 * Key is the mode number as a string, or 'unknown' when no candidate is
 * identified or the top candidate has no hashcat mode (e.g. yescrypt).
 */
export function groupByHashcatMode(hashes: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const raw of hashes) {
    const candidates = identifyHash(raw);
    const top = candidates[0];
    const key = top && top.hashcatMode !== null ? String(top.hashcatMode) : 'unknown';
    if (!result[key]) result[key] = [];
    result[key].push(raw);
  }
  return result;
}
