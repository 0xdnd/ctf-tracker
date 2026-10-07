import { Machine } from '../types';

export type VulnDomainId = 'all' | 'web' | 'ad' | 'system' | 'advanced';

export interface VulnDomainDef {
  id: VulnDomainId;
  label: string;
  shortLabel: string;
  iconName: string;
  badgeColor: string;
}

export interface VulnCategoryDef {
  id: string;
  label: string;
  shortLabel: string;
  domain: VulnDomainId;
  priority: number;
  badgeColor: string;
  textColor: string;
  borderColor: string;
  /** Categorical token slot (cat-1 .. cat-8) this category is rendered with. */
  catIndex: CatIndex;
}

// ---------------------------------------------------------------------------
// Single source of truth for badge colours.
// Every colour is a design token (src/index.css) so all presets x modes stay
// AA-compliant. Class strings are written out in full so Tailwind can see them.
// ---------------------------------------------------------------------------

export type CatIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BadgeTone {
  /** bg + text + border, ready to drop on a badge. */
  badge: string;
  text: string;
  bg: string;
  border: string;
}

export const CAT_TONES: Record<CatIndex, BadgeTone> = {
  1: { badge: 'bg-cat-1-bg text-cat-1-fg border-cat-1-border', text: 'text-cat-1-fg', bg: 'bg-cat-1-bg', border: 'border-cat-1-border' },
  2: { badge: 'bg-cat-2-bg text-cat-2-fg border-cat-2-border', text: 'text-cat-2-fg', bg: 'bg-cat-2-bg', border: 'border-cat-2-border' },
  3: { badge: 'bg-cat-3-bg text-cat-3-fg border-cat-3-border', text: 'text-cat-3-fg', bg: 'bg-cat-3-bg', border: 'border-cat-3-border' },
  4: { badge: 'bg-cat-4-bg text-cat-4-fg border-cat-4-border', text: 'text-cat-4-fg', bg: 'bg-cat-4-bg', border: 'border-cat-4-border' },
  5: { badge: 'bg-cat-5-bg text-cat-5-fg border-cat-5-border', text: 'text-cat-5-fg', bg: 'bg-cat-5-bg', border: 'border-cat-5-border' },
  6: { badge: 'bg-cat-6-bg text-cat-6-fg border-cat-6-border', text: 'text-cat-6-fg', bg: 'bg-cat-6-bg', border: 'border-cat-6-border' },
  7: { badge: 'bg-cat-7-bg text-cat-7-fg border-cat-7-border', text: 'text-cat-7-fg', bg: 'bg-cat-7-bg', border: 'border-cat-7-border' },
  8: { badge: 'bg-cat-8-bg text-cat-8-fg border-cat-8-border', text: 'text-cat-8-fg', bg: 'bg-cat-8-bg', border: 'border-cat-8-border' },
};

export const NEUTRAL_TONE: BadgeTone = {
  badge: 'bg-surface-sunken text-secondary border-subtle',
  text: 'text-secondary',
  bg: 'bg-surface-sunken',
  border: 'border-subtle',
};

export type SemanticToneId = 'info' | 'tip' | 'warn' | 'danger' | 'success';

export const SEMANTIC_TONES: Record<SemanticToneId, BadgeTone> = {
  info: { badge: 'bg-callout-info-bg text-callout-info-fg border-callout-info-border', text: 'text-callout-info-fg', bg: 'bg-callout-info-bg', border: 'border-callout-info-border' },
  tip: { badge: 'bg-callout-tip-bg text-callout-tip-fg border-callout-tip-border', text: 'text-callout-tip-fg', bg: 'bg-callout-tip-bg', border: 'border-callout-tip-border' },
  warn: { badge: 'bg-callout-warn-bg text-callout-warn-fg border-callout-warn-border', text: 'text-callout-warn-fg', bg: 'bg-callout-warn-bg', border: 'border-callout-warn-border' },
  danger: { badge: 'bg-callout-danger-bg text-callout-danger-fg border-callout-danger-border', text: 'text-callout-danger-fg', bg: 'bg-callout-danger-bg', border: 'border-callout-danger-border' },
  success: { badge: 'bg-callout-success-bg text-callout-success-fg border-callout-success-border', text: 'text-callout-success-fg', bg: 'bg-callout-success-bg', border: 'border-callout-success-border' },
};

/** Deterministic category -> cat-N slot. Related categories share a hue; icons + labels disambiguate. */
export const CATEGORY_CAT_INDEX: Record<string, CatIndex> = {
  Web: 1,
  'CMS Exploits': 1,
  'Windows PrivEsc': 1,
  'Cloud & Containers': 1,
  Deserialization: 2,
  'Active Directory': 2,
  'Reverse Engineering': 2,
  LFI: 3,
  SSRF: 3,
  'Network / SMB': 3,
  Pivoting: 3,
  SQLi: 4,
  XXE: 4,
  Cryptography: 4,
  RCE: 5,
  'Kernel Exploits': 5,
  'Binary / BOF': 5,
  'File Upload': 6,
  IDOR: 6,
  'Linux PrivEsc': 6,
  XSS: 7,
  'Auth & Passwords': 7,
  'API & GraphQL': 7,
  ADCS: 8,
  SSTI: 8,
};

export const PLATFORM_CAT_INDEX: Record<string, CatIndex> = {
  HTB: 6,
  THM: 5,
};

export const OS_CAT_INDEX: Record<string, CatIndex> = {
  Linux: 4,
  Windows: 1,
  macOS: 2,
  BSD: 5,
  Android: 6,
};

const DIFFICULTY_TONE: Record<string, SemanticToneId> = {
  'Very Easy': 'info',
  Easy: 'success',
  Medium: 'warn',
  Hard: 'danger',
  Insane: 'tip',
};

const STATUS_TONE: Record<string, SemanticToneId> = {
  recon: 'info',
  foothold: 'warn',
  root: 'success',
  pwned: 'success',
  completed: 'tip',
};

export function getCategoryCatIndex(categoryId: string): CatIndex | undefined {
  return CATEGORY_CAT_INDEX[categoryId];
}

export function getCategoryTone(categoryId: string): BadgeTone {
  const idx = CATEGORY_CAT_INDEX[categoryId];
  return idx ? CAT_TONES[idx] : NEUTRAL_TONE;
}

export function getPlatformTone(platform?: string): BadgeTone {
  const idx = platform ? PLATFORM_CAT_INDEX[platform] : undefined;
  return idx ? CAT_TONES[idx] : NEUTRAL_TONE;
}

export function getOsTone(os?: string): BadgeTone {
  if (!os) return NEUTRAL_TONE;
  const directIdx = OS_CAT_INDEX[os];
  if (directIdx) return CAT_TONES[directIdx];

  const lower = os.trim().toLowerCase();
  for (const [key, idx] of Object.entries(OS_CAT_INDEX)) {
    if (key.toLowerCase() === lower) {
      return CAT_TONES[idx];
    }
  }
  return NEUTRAL_TONE;
}

export function getDifficultyTone(difficulty?: string): BadgeTone {
  const id = difficulty ? DIFFICULTY_TONE[difficulty] : undefined;
  return id ? SEMANTIC_TONES[id] : NEUTRAL_TONE;
}

export function getStatusTone(status?: string): BadgeTone {
  const id = status ? STATUS_TONE[status.toLowerCase()] : undefined;
  return id ? SEMANTIC_TONES[id] : NEUTRAL_TONE;
}

function defineCategory(
  id: string,
  label: string,
  shortLabel: string,
  domain: VulnDomainId,
  priority: number,
): VulnCategoryDef {
  const catIndex = CATEGORY_CAT_INDEX[id];
  const tone = CAT_TONES[catIndex];
  return {
    id,
    label,
    shortLabel,
    domain,
    priority,
    badgeColor: tone.badge,
    textColor: tone.text,
    borderColor: tone.border,
    catIndex,
  };
}

export const VULN_DOMAINS: VulnDomainDef[] = [
  {
    id: 'all',
    label: 'All Attack Vectors',
    shortLabel: 'ALL VECTORS',
    iconName: 'Layers',
    badgeColor: 'border-subtle text-primary',
  },
  {
    id: 'web',
    label: 'Web & API Security',
    shortLabel: '🌐 WEB & API',
    iconName: 'Globe',
    badgeColor: 'border-cat-1-border text-cat-1-fg',
  },
  {
    id: 'ad',
    label: 'Active Directory & Identity',
    shortLabel: '🛡️ AD & IDENTITY',
    iconName: 'Cpu',
    badgeColor: 'border-cat-2-border text-cat-2-fg',
  },
  {
    id: 'system',
    label: 'Host & System Exploitation',
    shortLabel: '⚡ HOST & PRIVESC',
    iconName: 'Terminal',
    badgeColor: 'border-cat-6-border text-cat-6-fg',
  },
  {
    id: 'advanced',
    label: 'Advanced & Specialized CTF',
    shortLabel: '🧩 ADVANCED & CTF',
    iconName: 'Sparkles',
    badgeColor: 'border-cat-5-border text-cat-5-fg',
  },
];

export const VULN_CATEGORIES: VulnCategoryDef[] = [
  // --- DOMAIN 1: WEB & API EXPLOITATION ---
  defineCategory('Web', 'Web Application', 'Web', 'web', 50),
  defineCategory('SQLi', 'SQL Injection', 'SQLi', 'web', 68),
  defineCategory('RCE', 'Remote Code Execution / Command Injection', 'RCE', 'web', 70),
  defineCategory('File Upload', 'Arbitrary File Upload & Web Shell', 'File Upload', 'web', 62),
  defineCategory('LFI', 'File Inclusion (LFI/RFI/Traversal)', 'LFI/Traversal', 'web', 56),
  defineCategory('SSRF', 'Server-Side Request Forgery', 'SSRF', 'web', 65),
  defineCategory('SSTI', 'Server-Side Template Injection', 'SSTI', 'web', 75),
  defineCategory('Deserialization', 'Insecure Deserialization', 'Deserialization', 'web', 80),
  defineCategory('Auth & Passwords', 'Auth Bypass & Password Attacks', 'Auth & Pass', 'web', 52),
  defineCategory('IDOR', 'Insecure Direct Object Reference (IDOR)', 'IDOR', 'web', 60),
  defineCategory('API & GraphQL', 'API & GraphQL Security', 'API/GraphQL', 'web', 55),
  defineCategory('XXE', 'XML External Entity (XXE)', 'XXE', 'web', 64),
  defineCategory('CMS Exploits', 'CMS Exploits (WordPress/Drupal/Joomla)', 'CMS', 'web', 54),
  defineCategory('XSS', 'Cross-Site Scripting', 'XSS', 'web', 45),

  // --- DOMAIN 2: ACTIVE DIRECTORY & IDENTITY ---
  defineCategory('ADCS', 'ADCS / Active Directory Certificates', 'ADCS', 'ad', 100),
  defineCategory('Active Directory', 'Active Directory & Kerberos', 'AD', 'ad', 95),

  // --- DOMAIN 3: HOST & SYSTEM EXPLOITATION ---
  defineCategory('Kernel Exploits', 'Kernel Exploits & Zero-Days', 'Kernel', 'system', 90),
  defineCategory('Windows PrivEsc', 'Windows Privilege Escalation', 'Win PE', 'system', 42),
  defineCategory('Linux PrivEsc', 'Linux Privilege Escalation', 'Linux PE', 'system', 40),
  defineCategory('Network / SMB', 'Network Protocols (SMB/RPC/SNMP/FTP)', 'SMB/Net', 'system', 34),

  // --- DOMAIN 4: ADVANCED & SPECIALIZED CTF ---
  defineCategory('Binary / BOF', 'Buffer Overflow & Binary Pwn', 'BOF/Pwn', 'advanced', 85),
  defineCategory('Cloud & Containers', 'Cloud & Docker/K8s Breakouts', 'Cloud/Docker', 'advanced', 48),
  defineCategory('Reverse Engineering', 'Reverse Engineering & Decompilation', 'Reversing', 'advanced', 46),
  defineCategory('Cryptography', 'Cryptography & Broken Ciphers', 'Crypto', 'advanced', 44),
  defineCategory('Pivoting', 'Pivoting, Tunneling & Port Forwarding', 'Pivoting', 'advanced', 36),
];

export interface ClassificationResult {
  primary: string;
  primaryDef?: VulnCategoryDef;
  categories: string[];
  domains: VulnDomainId[];
  badgeColor: string;
  isAD: boolean;
}

// Bounded Regex with Word Boundaries and Contextual Negative Guardrails
// Adheres strictly to Fable Advisor architectural directives to eliminate false positives
const VULN_PATTERNS: Record<string, RegExp[]> = {
  ADCS: [
    /\b(adcs|certipy|esc[1-8]|certutil\s+-catemplates)\b/i,
    /\b(active\s+directory\s+certificate\s+services|certificate\s+templates?)\b/i,
  ],
  'Active Directory': [
    /\b(active\s*directory|activedirectory|\bad\b|kerberos|kerberoast(ing)?|as-?rep\s*roast(ing)?|bloodhound|sharphound|domain\s+controller|gpo|dcsync|ntlm|zerologon|secretsdump|psexec|smbexec|mimikatz|golden\s+ticket|silver\s+ticket)\b/i,
  ],
  SQLi: [
    /\b(sqli|sql\s+injection|blind\s+sqli|sqlmap|union-based\s+sql|nosql\s+injection|nosqli)\b/i,
  ],
  XSS: [
    /\b(xss|cross-?site\s+scripting|stored\s+xss|reflected\s+xss|dom\s+xss)\b/i,
  ],
  SSRF: [
    /\b(ssrf|server-?side\s+request\s+forgery)\b/i,
  ],
  LFI: [
    /\b(lfi|rfi|local\s+file\s+inclusion|remote\s+file\s+inclusion|directory\s+traversal|path\s+traversal|log\s+poisoning)\b/i,
  ],
  RCE: [
    /\b(rce|remote\s+code\s+execution|command\s+injection|remote\s+command\s+execution)\b/i,
  ],
  SSTI: [
    /\b(ssti|server-?side\s+template\s+injection|template\s+injection|jinja2?|smarty|twig|freemarker|thymeleaf)\b/i,
  ],
  'File Upload': [
    /\b(arbitrary\s+file\s+upload|file\s+upload\s+(vulnerability|bypass|flaw)|upload\s+bypass|malicious\s+file\s+upload|webshell\s+upload|\.phtml\s+upload|file[-_\s]?upload|arbitrary\s+upload|webshell)\b/i,
  ],
  Deserialization: [
    /\b(deseriali[zs]ation|insecure\s+deseriali[zs]ation|ysoserial|pickle\.(loads?|load)|unserialize\(|viewstate|binaryformatter|yaml\.safe_load|object\s+injection)\b/i,
  ],
  'Auth & Passwords': [
    /\b(hydra|hashcat|john\s+the\s+ripper|password\s+cracking|password\s+spray(ing)?|brute-?force|default\s+credentials|weak\s+credentials|kerbrute|as-?rep\s*roast)\b/i,
  ],
  IDOR: [
    /\b(idor|insecure\s+direct\s+object|broken\s+object\s+level\s+auth|bola)\b/i,
  ],
  'API & GraphQL': [
    /\b(graphql|swagger|rest\s+api|api\s+endpoint|graphql\s+introspection|json\s+web\s+token|\bjwt\b)\b/i,
  ],
  XXE: [
    /\b(xxe|xml\s+external\s+entity|xml\s+injection)\b/i,
  ],
  'CMS Exploits': [
    /\b(wordpress|wpscan|wp-content|joomla|drupal|ghost\s+cms|strapi|tomcat\s+manager|jenkins|confluence|gitlab\s+cve|moodle)\b/i,
  ],
  Web: [
    /\b(web\s*application|https?|web\s*server|apache|nginx|iis|php|node\.?js|express|django|flask|burp\s*suite|gobuster|dirbuster|ffuf|feroxbuster)\b/i,
  ],
  'Linux PrivEsc': [
    /\b(sudo\s+-l|sudoers|gtfobins|suid|linpeas|cron\s+job|capabilities|linux\s+priv(ilege\s+)?esc(alation)?|polkit|pwnkit)\b/i,
  ],
  'Windows PrivEsc': [
    /\b(winpeas|seimpersonate(privilege)?|juicypotato|printspoofer|godpotato|alwaysinstallelevated|unquoted\s+service|dll\s+hijack(ing)?|uac\s+bypass|windows\s+priv(ilege\s+)?esc(alation)?)\b/i,
  ],
  'Binary / BOF': [
    /\b(buffer\s+overflow|\bbof\b|binary\s+exploitation|\bpwn\b|rop\s+chain|return-to-libc|ret2libc|shellcode|format\s+string|stack\s+smashing)\b/i,
  ],
  'Kernel Exploits': [
    /\b(dirty\s*cow|dirty\s*pipe|cve-2021-4034|cve-2022-0847|ms17-010|eternalblue|cve-2020-0796|kernel\s+exploit)\b/i,
  ],
  'Network / SMB': [
    /\b(smb|samba|snmp|rpc|rpcclient|nfs|anonymous\s+(smb|ftp|ldap)|null\s+session|netbios|tftp)\b/i,
  ],
  Pivoting: [
    /\b(pivoting|chisel|ligolo(-ng)?|ssh\s+tunnel(ing)?|port\s+forward(ing)?|socks(4|5)?\s+proxy|proxychains|double\s+pivot)\b/i,
  ],
  'Cloud & Containers': [
    /\b(docker|kubernetes|\bk8s\b|container\s+escape|docker\s+socket|lxd\s+privesc|cgroup|aws\s+s3|169\.254\.169\.254|metadata\s+service)\b/i,
  ],
  Cryptography: [
    /\b(cryptography|\bcrypto\b|padding\s+oracle|weak\s+rsa|hash\s+length\s+extension|ecb\s+mode|cipher|broken\s+encryption)\b/i,
  ],
  'Reverse Engineering': [
    /\b(reverse\s+engineering|reversing|ghidra|ida\s+pro|decompil(er|ation)|disassembl(er|y)|apktool|jadx|dnspy)\b/i,
  ],
};

// Ultra-fast memoization cache to guarantee 120 FPS performance across 931 machines
const classificationCache = new Map<string, ClassificationResult>();

export function clearClassificationCache(): void {
  classificationCache.clear();
}

export function classifyMachine(m: Machine): ClassificationResult {
  if (!m || !m.id) {
    return {
      primary: 'Target Host',
      categories: [],
      domains: [],
      badgeColor: NEUTRAL_TONE.badge,
      isAD: false,
    };
  }

  const cached = classificationCache.get(m.id);
  if (cached) return cached;

  const categories: string[] = [];
  const tagsStr = (m.tags || []).join(' ');
  const skillsStr = (m.skillsLearned || []).join(' ');
  const definitive = `${tagsStr} ${skillsStr}`;
  const synopsis = `${m.hint || ''} ${m.officialSynopsis || ''}`;

  // Tiered heuristic detection
  for (const catDef of VULN_CATEGORIES) {
    const patterns = VULN_PATTERNS[catDef.id];
    if (!patterns) continue;

    // OS guards for OS-specific privesc
    if (catDef.id === 'Linux PrivEsc' && m.os !== 'Linux') continue;
    if (catDef.id === 'Windows PrivEsc' && m.os !== 'Windows') continue;

    // 1. Tier 1: Explicit tags & skillsLearned (Definitive)
    let matched = patterns.some((p) => p.test(definitive));

    // 2. Tier 2: Hint & Official Synopsis (High confidence)
    if (!matched && synopsis) {
      matched = patterns.some((p) => p.test(synopsis));
    }

    if (matched) {
      categories.push(catDef.id);
    }
  }

  // Active Directory Flag
  const isAD = categories.includes('Active Directory') || categories.includes('ADCS');

  // Identify all active domains
  const domainSet = new Set<VulnDomainId>();
  categories.forEach((cId) => {
    const def = VULN_CATEGORIES.find((c) => c.id === cId);
    if (def) domainSet.add(def.domain);
  });
  const domains = Array.from(domainSet);

  // Deterministic Archetype Priority Resolver
  // Sort detected categories by priority descending
  const matchedDefs = categories
    .map((cId) => VULN_CATEGORIES.find((c) => c.id === cId)!)
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);

  const highestPriorityDef = matchedDefs[0];

  let primary: string;
  let badgeColor: string;

  if (highestPriorityDef) {
    primary = highestPriorityDef.shortLabel;
    badgeColor = highestPriorityDef.badgeColor;
  } else {
    primary = `${m.os || 'Target'} Host`;
    badgeColor = NEUTRAL_TONE.badge;
  }

  const result: ClassificationResult = {
    primary,
    primaryDef: highestPriorityDef,
    categories,
    domains,
    badgeColor,
    isAD,
  };

  classificationCache.set(m.id, result);
  return result;
}

export function isActiveDirectory(m: Machine): boolean {
  return classifyMachine(m).isAD;
}

export function matchesCategory(m: Machine, categoryId: string): boolean {
  if (!categoryId || categoryId === 'ALL') return true;
  const classification = classifyMachine(m);
  return classification.categories.includes(categoryId);
}

export function matchesDomain(m: Machine, domainId: VulnDomainId): boolean {
  if (!domainId || domainId === 'all') return true;
  const classification = classifyMachine(m);
  return classification.domains.includes(domainId);
}

export function getCategoryDef(categoryId: string): VulnCategoryDef | undefined {
  return VULN_CATEGORIES.find((c) => c.id === categoryId);
}

export function getDomainDef(domainId: VulnDomainId): VulnDomainDef | undefined {
  return VULN_DOMAINS.find((d) => d.id === domainId);
}
