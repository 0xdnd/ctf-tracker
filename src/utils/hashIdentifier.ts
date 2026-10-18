/**
 * hashIdentifier.ts
 * Tactical Offensive Hash Identification Engine & Cracking Command Generator.
 * 100% Client-Side, Deterministic, and Offline-First.
 */

export interface HashMatchCandidate {
  name: string;
  category: 'Windows/AD' | 'Linux/Unix' | 'Web/CMS' | 'Database' | 'Encrypted Archives/Keys' | 'Raw Hashes' | 'Tokens';
  hashcatMode: number;
  johnFormat: string;
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
  sampleExample?: string;
  hashcatCommand: string;
  johnCommand: string;
}

export interface HashIdentificationResult {
  rawInput: string;
  cleanedHash: string;
  primaryMatch: HashMatchCandidate | null;
  allMatches: HashMatchCandidate[];
  isLikelyNtlmForPth: boolean;
  jwtDetails?: {
    header: Record<string, unknown> | null;
    payload: Record<string, unknown> | null;
    signatureBase64: string;
    isExpired?: boolean;
    expiresAt?: string;
  };
}

/**
 * Checks if a string is a valid 32-character hexadecimal NTLM hash suitable for Pass-The-Hash.
 */
export function isNtlmHash(hash: string): boolean {
  if (!hash) return false;
  const clean = hash.trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(clean);
}

/**
 * Extracts the NT hash from a SAM or NTDS.dit dump line in LM:NT format.
 * Format: username:RID:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
 */
export function extractNtlmFromSamDump(dumpLine: string): string | null {
  if (!dumpLine) return null;
  const parts = dumpLine.trim().split(':');
  // Format with at least 4 colon-separated parts: [user, rid, lm, nt, ...]
  if (parts.length >= 4) {
    const ntCandidate = parts[3].trim().toLowerCase();
    if (isNtlmHash(ntCandidate)) {
      return ntCandidate;
    }
  }
  return null;
}

/**
 * Generates an optimized, ready-to-copy Hashcat command line.
 */
export function generateHashcatCommand(
  hashcatMode: number,
  hashFileOrValue: string = 'hash.txt',
  wordlist: string = '/usr/share/wordlists/rockyou.txt',
  rule: string = '/usr/share/hashcat/rules/best64.rule',
  options: { enableRules?: boolean; optimizedKernel?: boolean; workload?: number } = {}
): string {
  const parts = ['hashcat', `-m ${hashcatMode}`, '-a 0'];
  if (options.optimizedKernel !== false) {
    parts.push('-O');
  }
  const workload = options.workload ?? 3;
  parts.push(`-w ${workload}`);
  parts.push(hashFileOrValue);
  parts.push(wordlist);
  if (options.enableRules && rule) {
    parts.push(`-r ${rule}`);
  }
  return parts.join(' ');
}

/**
 * Generates an optimized, ready-to-copy John the Ripper command line.
 */
export function generateJohnCommand(
  johnFormat: string,
  hashFileOrValue: string = 'hash.txt',
  wordlist: string = '/usr/share/wordlists/rockyou.txt',
  options: { rules?: string } = {}
): string {
  const parts = ['john', `--format=${johnFormat}`, `--wordlist=${wordlist}`];
  if (options.rules) {
    parts.push(`--rules=${options.rules}`);
  }
  parts.push(hashFileOrValue);
  return parts.join(' ');
}

/**
 * Safely decodes base64url encoded JSON strings without external dependencies or eval.
 */
function safeBase64UrlDecode(str: string): string | null {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    // Browser / atob or Node Buffer decoding
    if (typeof atob === 'function') {
      const decoded = atob(base64);
      return decodeURIComponent(
        Array.from(decoded)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parses and decodes a JWT token safely into Header and Payload JSON objects.
 */
export function decodeJwt(token: string): {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signatureBase64: string;
  isExpired?: boolean;
  expiresAt?: string;
} | null {
  if (!token) return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    const rawHeader = safeBase64UrlDecode(parts[0]);
    const rawPayload = safeBase64UrlDecode(parts[1]);
    const header = rawHeader ? JSON.parse(rawHeader) : null;
    const payload = rawPayload ? JSON.parse(rawPayload) : null;

    let isExpired: boolean | undefined;
    let expiresAt: string | undefined;

    if (payload && typeof payload.exp === 'number') {
      const expDate = new Date(payload.exp * 1000);
      isExpired = Date.now() > expDate.getTime();
      expiresAt = expDate.toISOString();
    }

    return {
      header,
      payload,
      signatureBase64: parts[2],
      isExpired,
      expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Tactical Master Hash Identification Engine.
 * Analyzes string and returns ordered candidate list with modes and commands.
 */
export function identifyHash(rawInput: string): HashIdentificationResult {
  const trimmed = (rawInput || '').trim();
  const candidates: HashMatchCandidate[] = [];

  if (!trimmed) {
    return {
      rawInput,
      cleanedHash: '',
      primaryMatch: null,
      allMatches: [],
      isLikelyNtlmForPth: false,
    };
  }

  // 1. SAM / NTDS.dit dump (LM:NT format e.g. user:500:aad3...:31d6...:::)
  if (trimmed.includes(':') && (trimmed.split(':').length === 7 || trimmed.split(':').length === 6)) {
    const extractedNt = extractNtlmFromSamDump(trimmed);
    if (extractedNt) {
      candidates.push({
        name: 'SAM / NTDS.dit Credential Dump (NTLM)',
        category: 'Windows/AD',
        hashcatMode: 1000,
        johnFormat: 'nt',
        confidence: 'High',
        description: 'Standard Windows SAM or NTDS.dit secretsdump output containing user RID, LM, and NT hash.',
        hashcatCommand: generateHashcatCommand(1000, 'sam_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
        johnCommand: generateJohnCommand('nt', 'sam_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      });
    }
  }

  // 2. Kerberos 5 TGS-REP (Kerberoasting)
  if (trimmed.startsWith('$krb5tgs$') || trimmed.includes('$krb5tgs$23$')) {
    candidates.push({
      name: 'Kerberos 5 TGS-REP (Kerberoasting)',
      category: 'Windows/AD',
      hashcatMode: 13100,
      johnFormat: 'krb5tgs',
      confidence: 'High',
      description: 'Active Directory Kerberos Service Principal Name (SPN) ticket requested via GetUserSPNs.py / Rubeus.',
      hashcatCommand: generateHashcatCommand(13100, 'tgs_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('krb5tgs', 'tgs_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 3. Kerberos 5 AS-REP (AS-REP Roasting)
  if (trimmed.startsWith('$krb5asrep$') || trimmed.includes('$krb5asrep$23$')) {
    candidates.push({
      name: 'Kerberos 5 AS-REP (AS-REP Roasting)',
      category: 'Windows/AD',
      hashcatMode: 18200,
      johnFormat: 'krb5asrep',
      confidence: 'High',
      description: 'Active Directory Kerberos AS-REP Roasting hash extracted for accounts with DONT_REQ_PREAUTH set.',
      hashcatCommand: generateHashcatCommand(18200, 'asrep_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('krb5asrep', 'asrep_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 4. NetNTLMv2
  if (
    trimmed.includes('::') &&
    (trimmed.split(':').length >= 6 || trimmed.startsWith('$netntlmv2$')) &&
    !trimmed.startsWith('$netntlm$')
  ) {
    const parts = trimmed.split(':');
    // username::domain:challenge:HMAC-MD5:blob
    if (parts.length >= 6 && parts[4].length === 32) {
      candidates.push({
        name: 'NetNTLMv2 (NTLMv2 SSP)',
        category: 'Windows/AD',
        hashcatMode: 5600,
        johnFormat: 'netntlmv2',
        confidence: 'High',
        description: 'Captured network authentication response from Responder, Inveigh, or LLMNR/NBT-NS poisoner.',
        hashcatCommand: generateHashcatCommand(5600, 'netntlmv2.txt', '/usr/share/wordlists/rockyou.txt'),
        johnCommand: generateJohnCommand('netntlmv2', 'netntlmv2.txt', '/usr/share/wordlists/rockyou.txt'),
      });
    }
  }

  // 5. NetNTLMv1
  if (trimmed.startsWith('$netntlm$') || (trimmed.includes('::') && trimmed.split(':').length >= 5 && trimmed.split(':')[3]?.length === 48)) {
    candidates.push({
      name: 'NetNTLMv1',
      category: 'Windows/AD',
      hashcatMode: 5500,
      johnFormat: 'netntlm',
      confidence: 'High',
      description: 'Legacy NetNTLMv1 network challenge-response hash captured across the network.',
      hashcatCommand: generateHashcatCommand(5500, 'netntlmv1.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('netntlm', 'netntlmv1.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 6. Domain Cached Credentials 2 (DCC2 / MSCache v2)
  if (trimmed.startsWith('$DCC2$') || trimmed.includes('#$DCC2$')) {
    candidates.push({
      name: 'Domain Cached Credentials 2 (DCC2 / MSCache v2)',
      category: 'Windows/AD',
      hashcatMode: 2100,
      johnFormat: 'mscache2',
      confidence: 'High',
      description: 'Windows domain logon credentials cached locally in the LSASS / SECURITY hive (mscache2).',
      hashcatCommand: generateHashcatCommand(2100, 'dcc2.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mscache2', 'dcc2.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 7. bcrypt ($2a$, $2b$, $2y$)
  if (/^\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(trimmed)) {
    candidates.push({
      name: 'bcrypt (Blowfish crypt)',
      category: 'Linux/Unix',
      hashcatMode: 3200,
      johnFormat: 'bcrypt',
      confidence: 'High',
      description: 'Modern salted password hashing algorithm based on the Blowfish cipher.',
      hashcatCommand: generateHashcatCommand(3200, 'bcrypt.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('bcrypt', 'bcrypt.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 8. sha512crypt ($6$)
  if (/^\$6\$(rounds=[0-9]+\$)?[A-Za-z0-9./]{1,16}\$[A-Za-z0-9./]{86}$/.test(trimmed)) {
    candidates.push({
      name: 'sha512crypt (Linux /etc/shadow)',
      category: 'Linux/Unix',
      hashcatMode: 1800,
      johnFormat: 'sha512crypt',
      confidence: 'High',
      description: 'Default modern Linux /etc/shadow salted SHA-512 crypt hash.',
      hashcatCommand: generateHashcatCommand(1800, 'shadow.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('sha512crypt', 'shadow.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 9. sha256crypt ($5$)
  if (/^\$5\$(rounds=[0-9]+\$)?[A-Za-z0-9./]{1,16}\$[A-Za-z0-9./]{43}$/.test(trimmed)) {
    candidates.push({
      name: 'sha256crypt (Linux /etc/shadow)',
      category: 'Linux/Unix',
      hashcatMode: 7400,
      johnFormat: 'sha256crypt',
      confidence: 'High',
      description: 'Linux /etc/shadow salted SHA-256 crypt hash.',
      hashcatCommand: generateHashcatCommand(7400, 'sha256crypt.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('sha256crypt', 'sha256crypt.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 10. md5crypt ($1$)
  if (/^\$1\$[A-Za-z0-9./]{1,8}\$[A-Za-z0-9./]{22}$/.test(trimmed)) {
    candidates.push({
      name: 'md5crypt (FreeBSD / Cisco / Linux /etc/shadow)',
      category: 'Linux/Unix',
      hashcatMode: 500,
      johnFormat: 'md5crypt',
      confidence: 'High',
      description: 'Legacy Unix / Linux /etc/shadow MD5-crypt hash ($1$).',
      hashcatCommand: generateHashcatCommand(500, 'md5crypt.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('md5crypt', 'md5crypt.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 11. Apache APR1 ($apr1$)
  if (/^\$apr1\$[A-Za-z0-9./]{1,8}\$[A-Za-z0-9./]{22}$/.test(trimmed)) {
    candidates.push({
      name: 'Apache apr1 (MD5 htpasswd)',
      category: 'Web/CMS',
      hashcatMode: 1600,
      johnFormat: 'md5apr1',
      confidence: 'High',
      description: 'Apache HTTP Server htpasswd APR1-MD5 password format.',
      hashcatCommand: generateHashcatCommand(1600, 'htpasswd.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('md5apr1', 'htpasswd.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 12. WordPress phpass ($P$ / $H$)
  if (/^\$[PH]\$[A-Za-z0-9./]{31}$/.test(trimmed)) {
    candidates.push({
      name: 'WordPress phpass / phpBB3',
      category: 'Web/CMS',
      hashcatMode: 400,
      johnFormat: 'phpass',
      confidence: 'High',
      description: 'WordPress and phpBB Portable PHP password hash ($P$ or $H$).',
      hashcatCommand: generateHashcatCommand(400, 'wp_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('phpass', 'wp_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 13. MySQL 4.1+ / MySQL 5 (* + 40 hex chars)
  if (/^\*[0-9A-Fa-f]{40}$/.test(trimmed)) {
    candidates.push({
      name: 'MySQL 4.1+ / MySQL 5 (SHA-1 double)',
      category: 'Database',
      hashcatMode: 300,
      johnFormat: 'mysql-sha1',
      confidence: 'High',
      description: 'Modern MySQL database user password hash (SHA1(SHA1(password))).',
      hashcatCommand: generateHashcatCommand(300, 'mysql_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mysql-sha1', 'mysql_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 14. MySQL 3.23 (16 hex chars)
  if (/^[0-9A-Fa-f]{16}$/.test(trimmed)) {
    candidates.push({
      name: 'MySQL 3.23 (Legacy)',
      category: 'Database',
      hashcatMode: 200,
      johnFormat: 'mysql',
      confidence: 'Medium',
      description: 'Legacy MySQL 3.23 password hash.',
      hashcatCommand: generateHashcatCommand(200, 'mysql3_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mysql', 'mysql3_hashes.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 15. MSSQL 2000 (0x0100 + 50 hex chars / 54 total)
  if (/^0x0100[0-9A-Fa-f]{48,50}$/i.test(trimmed)) {
    candidates.push({
      name: 'MSSQL 2000',
      category: 'Database',
      hashcatMode: 131,
      johnFormat: 'mssql',
      confidence: 'High',
      description: 'Microsoft SQL Server 2000 master.dbo.sysxlogins password hash.',
      hashcatCommand: generateHashcatCommand(131, 'mssql2000.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mssql', 'mssql2000.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 16. MSSQL 2005 / 2008 (0x0100 + 50 hex chars)
  if (/^0x0100[0-9A-Fa-f]{50,56}$/i.test(trimmed)) {
    candidates.push({
      name: 'MSSQL 2005 / MSSQL 2008',
      category: 'Database',
      hashcatMode: 132,
      johnFormat: 'mssql05',
      confidence: 'High',
      description: 'Microsoft SQL Server 2005/2008 password hash (SHA-1 based).',
      hashcatCommand: generateHashcatCommand(132, 'mssql2005.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mssql05', 'mssql2005.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 17. MSSQL 2012 / 2014 (0x0200 + 136 hex chars)
  if (/^0x0200[0-9A-Fa-f]{136}$/i.test(trimmed)) {
    candidates.push({
      name: 'MSSQL 2012 / MSSQL 2014',
      category: 'Database',
      hashcatMode: 1731,
      johnFormat: 'mssql12',
      confidence: 'High',
      description: 'Microsoft SQL Server 2012/2014/2016+ password hash (SHA-512 based).',
      hashcatCommand: generateHashcatCommand(1731, 'mssql2012.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('mssql12', 'mssql2012.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 18. PostgreSQL md5 (md5 + 32 hex chars)
  if (/^md5[0-9a-f]{32}$/i.test(trimmed)) {
    candidates.push({
      name: 'PostgreSQL md5',
      category: 'Database',
      hashcatMode: 10,
      johnFormat: 'dynamic_0',
      confidence: 'High',
      description: 'PostgreSQL role password hash formatted as md5(password + username).',
      hashcatCommand: generateHashcatCommand(10, 'postgres.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('dynamic_0', 'postgres.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 19. KeePass 1/2 ($keepass$*...)
  if (trimmed.startsWith('$keepass$*')) {
    candidates.push({
      name: 'KeePass 1 / 2 Database Hash',
      category: 'Encrypted Archives/Keys',
      hashcatMode: 13400,
      johnFormat: 'KeePass',
      confidence: 'High',
      description: 'Encrypted KeePass (.kdbx) database master password key extracted via keepass2john.',
      hashcatCommand: generateHashcatCommand(13400, 'keepass.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('KeePass', 'keepass.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 20. ZIP ($pkzip$ or $zip2$)
  if (trimmed.startsWith('$pkzip$') || trimmed.startsWith('$zip2$')) {
    candidates.push({
      name: 'ZIP Encrypted Archive (PKZIP / WinZip)',
      category: 'Encrypted Archives/Keys',
      hashcatMode: 17200,
      johnFormat: 'pkzip',
      confidence: 'High',
      description: 'Password-protected ZIP archive hash extracted via zip2john.',
      hashcatCommand: generateHashcatCommand(17200, 'zip.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('pkzip', 'zip.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 21. MS Office ($office$*)
  if (trimmed.startsWith('$office$*')) {
    candidates.push({
      name: 'Microsoft Office Document Hash',
      category: 'Encrypted Archives/Keys',
      hashcatMode: 9600,
      johnFormat: 'office',
      confidence: 'High',
      description: 'Encrypted Word/Excel/PowerPoint document hash extracted via office2john.',
      hashcatCommand: generateHashcatCommand(9600, 'office.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('office', 'office.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 22. SSH Private Key ($ssh$*)
  if (trimmed.startsWith('$ssh$*') || trimmed.includes('$ssh$')) {
    candidates.push({
      name: 'SSH Private Key Passphrase',
      category: 'Encrypted Archives/Keys',
      hashcatMode: 22921,
      johnFormat: 'ssh',
      confidence: 'High',
      description: 'Encrypted RSA/Ed25519 SSH private key passphrase hash extracted via ssh2john.',
      hashcatCommand: generateHashcatCommand(22921, 'ssh.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('ssh', 'ssh.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 23. JWT Token (JSON Web Token)
  const jwt = decodeJwt(trimmed);
  if (jwt && jwt.header) {
    candidates.push({
      name: 'JSON Web Token (JWT HMAC-SHA256)',
      category: 'Tokens',
      hashcatMode: 16500,
      johnFormat: 'jwt',
      confidence: 'High',
      description: `JWT Token with algorithm: ${jwt.header.alg || 'HS256'}. Safe payload decoded client-side.`,
      hashcatCommand: generateHashcatCommand(16500, 'jwt.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('jwt', 'jwt.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 24. 32-Character Hex Strings: NTLM vs MD5 Ambiguity Resolution
  if (/^[0-9A-Fa-f]{32}$/.test(trimmed)) {
    // Ranked candidate 1: NTLM (Crucial for CTF / Offensive Engagements)
    candidates.push({
      name: 'NTLM (Windows NT Hash)',
      category: 'Windows/AD',
      hashcatMode: 1000,
      johnFormat: 'nt',
      confidence: 'High',
      description: 'Windows NT LAN Manager hash. Directly usable for Pass-The-Hash (PTH) authentication.',
      sampleExample: '31d6cfe0d16ae931b73c59d7e0c089c0 (Blank Password)',
      hashcatCommand: generateHashcatCommand(1000, 'ntlm.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('nt', 'ntlm.txt', '/usr/share/wordlists/rockyou.txt'),
    });

    // Ranked candidate 2: Raw MD5
    candidates.push({
      name: 'MD5 (Raw Hash)',
      category: 'Raw Hashes',
      hashcatMode: 0,
      johnFormat: 'raw-md5',
      confidence: 'Medium',
      description: 'Standard 128-bit raw MD5 digest.',
      sampleExample: '5d41402abc4b2a76b9719d911017c592 ("hello")',
      hashcatCommand: generateHashcatCommand(0, 'md5.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('raw-md5', 'md5.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 25. 40-Character Hex: SHA-1
  if (/^[0-9A-Fa-f]{40}$/.test(trimmed) && !trimmed.startsWith('*')) {
    candidates.push({
      name: 'SHA-1 (Raw 160-bit)',
      category: 'Raw Hashes',
      hashcatMode: 100,
      johnFormat: 'raw-sha1',
      confidence: 'High',
      description: 'Standard 160-bit raw SHA-1 digest.',
      sampleExample: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed ("hello")',
      hashcatCommand: generateHashcatCommand(100, 'sha1.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('raw-sha1', 'sha1.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 26. 64-Character Hex: SHA-256
  if (/^[0-9A-Fa-f]{64}$/.test(trimmed)) {
    candidates.push({
      name: 'SHA-256 (Raw 256-bit)',
      category: 'Raw Hashes',
      hashcatMode: 1400,
      johnFormat: 'raw-sha256',
      confidence: 'High',
      description: 'Standard 256-bit SHA-2 cryptographic digest.',
      hashcatCommand: generateHashcatCommand(1400, 'sha256.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('raw-sha256', 'sha256.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  // 27. 128-Character Hex: SHA-512
  if (/^[0-9A-Fa-f]{128}$/.test(trimmed)) {
    candidates.push({
      name: 'SHA-512 (Raw 512-bit)',
      category: 'Raw Hashes',
      hashcatMode: 1700,
      johnFormat: 'raw-sha512',
      confidence: 'High',
      description: 'Standard 512-bit SHA-2 cryptographic digest.',
      hashcatCommand: generateHashcatCommand(1700, 'sha512.txt', '/usr/share/wordlists/rockyou.txt'),
      johnCommand: generateJohnCommand('raw-sha512', 'sha512.txt', '/usr/share/wordlists/rockyou.txt'),
    });
  }

  const primary = candidates.length > 0 ? candidates[0] : null;
  const isPth = isNtlmHash(trimmed) || (primary !== null && primary.hashcatMode === 1000);

  return {
    rawInput,
    cleanedHash: trimmed,
    primaryMatch: primary,
    allMatches: candidates,
    isLikelyNtlmForPth: isPth,
    jwtDetails: jwt || undefined,
  };
}
