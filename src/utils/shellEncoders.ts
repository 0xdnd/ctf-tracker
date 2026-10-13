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
 * True iff the token is exactly 32 hex characters (case-insensitive) — the shape of an
 * NTLM/NT hash, as opposed to a plaintext password.
 */
export function isNtHash(token: string): boolean {
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
 */
export function credFlag(tool: CredTool, token: string): CredFlagResult {
  const usesHash = isNtHash(token);

  switch (tool) {
    case 'cme':
    case 'nxc':
      return { flag: usesHash ? `-H ${token}` : `-p ${token}`, usesHash };

    case 'evil-winrm':
      return { flag: usesHash ? `-H ${token}` : `-p ${token}`, usesHash };

    case 'impacket':
      // impacket tools take the plaintext password positionally, but hashes via -hashes LM:NT
      // (empty LM half when only the NT hash is known).
      return { flag: usesHash ? `-hashes :${token}` : token, usesHash };

    case 'smbclient':
      // smbclient has no native --pw-nt-hash flag; the documented nearest equivalent is
      // --use-krb5-ccache-free auth via pass-the-hash through the libsmbclient PTH option.
      return { flag: usesHash ? `--pw-nt-hash ${token}` : `--password ${token}`, usesHash };

    default:
      return { flag: usesHash ? `-H ${token}` : `-p ${token}`, usesHash };
  }
}
