/**
 * shellEncoders.ts
 * Small, shared encoding/credential helpers for methodology templates and the payload
 * crafter: a UTF-16LE Base64 encoder (PowerShell -EncodedCommand style), NT hash
 * detection, and per-tool credential flag selection (password vs. NT hash).
 */

/**
 * Encode a string as UTF-16LE bytes, then Base64 — the format PowerShell's
 * `-EncodedCommand` flag expects. Call-stack safe (chunked) for large inputs.
 */
export function encodeUtf16LeBase64(s: string): string {
  if (!s) return '';

  const utf16Bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    utf16Bytes.push(code & 0xff);
    utf16Bytes.push((code >> 8) & 0xff);
  }

  // Chunked conversion to prevent call stack overflow on large commands
  let binaryStr = '';
  const chunkSize = 8192;
  for (let i = 0; i < utf16Bytes.length; i += chunkSize) {
    const chunk = utf16Bytes.slice(i, i + chunkSize);
    binaryStr += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binaryStr);
}

/**
 * Quote a string as a single shell word for POSIX sh/bash copy-paste helpers.
 * Wraps in single quotes and escapes embedded single quotes as '"'"'.
 * Strips CR/LF to prevent command splitting / header-style injection.
 * e.g. shellQuote("a'b") => "'a'\"'\"'b'" (rendered as 'a'"'"'b').
 */
export function shellQuote(s: string): string {
  const clean = (s ?? '').replace(/[\r\n]/g, '');
  return `'${clean.replace(/'/g, `'"'"'`)}'`;
}

/**
 * True iff the token is exactly 32 hex characters (case-insensitive) — the shape of an
 * NTLM/NT hash, as opposed to a plaintext password.
 * Never throws on undefined/null — returns false for non-strings.
 */
export function isNtHash(token: string | undefined | null): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-fA-F]{32}$/.test(token.trim());
}

export type CredTool = 'cme' | 'nxc' | 'evil-winrm' | 'impacket' | 'smbclient';

export interface CredFlagResult {
  flag: string;
  usesHash: boolean;
}

/**
 * Build the right credential flag for a tool, switching form based on whether the
 * active secret looks like an NT hash or a plaintext password.
 * All interpolated secrets are shell-quoted so passwords with spaces/specials
 * keep working while shell metachars cannot break out.
 */
export function credFlag(tool: CredTool, token: string): CredFlagResult {
  const usesHash = isNtHash(token);
  const q = shellQuote(token ?? '');

  switch (tool) {
    case 'cme':
    case 'nxc':
      return { flag: usesHash ? `-H ${q}` : `-p ${q}`, usesHash };

    case 'evil-winrm':
      return { flag: usesHash ? `-H ${q}` : `-p ${q}`, usesHash };

    case 'impacket':
      // impacket tools take the plaintext password positionally, but hashes via -hashes LM:NT
      // (empty LM half when only the NT hash is known). Quote the whole :hash word.
      return { flag: usesHash ? `-hashes ${shellQuote(`:${token ?? ''}`)}` : q, usesHash };

    case 'smbclient':
      // smbclient PTH form is --password <hash> --pw-nt-hash (flag takes no value).
      return { flag: usesHash ? `--password ${q} --pw-nt-hash` : `--password ${q}`, usesHash };

    default:
      return { flag: usesHash ? `-H ${q}` : `-p ${q}`, usesHash };
  }
}
