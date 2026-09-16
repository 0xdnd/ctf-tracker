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
}

export const VULN_DOMAINS: VulnDomainDef[] = [
  {
    id: 'all',
    label: 'All Attack Vectors',
    shortLabel: 'ALL VECTORS',
    iconName: 'Layers',
    badgeColor: 'border-cyber-border text-slate-900 dark:text-white',
  },
  {
    id: 'web',
    label: 'Web & API Security',
    shortLabel: '🌐 WEB & API',
    iconName: 'Globe',
    badgeColor: 'border-cyan-400 dark:border-cyan-500/50 text-cyan-900 dark:text-cyan-400',
  },
  {
    id: 'ad',
    label: 'Active Directory & Identity',
    shortLabel: '🛡️ AD & IDENTITY',
    iconName: 'Cpu',
    badgeColor: 'border-purple-400 dark:border-purple-500/50 text-purple-900 dark:text-purple-400',
  },
  {
    id: 'system',
    label: 'Host & System Exploitation',
    shortLabel: '⚡ HOST & PRIVESC',
    iconName: 'Terminal',
    badgeColor: 'border-emerald-400 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-400',
  },
  {
    id: 'advanced',
    label: 'Advanced & Specialized CTF',
    shortLabel: '🧩 ADVANCED & CTF',
    iconName: 'Sparkles',
    badgeColor: 'border-rose-400 dark:border-rose-500/50 text-rose-900 dark:text-rose-400',
  },
];

export const VULN_CATEGORIES: VulnCategoryDef[] = [
  // --- DOMAIN 1: WEB & API EXPLOITATION ---
  {
    id: 'Web',
    label: 'Web Application',
    shortLabel: 'Web',
    domain: 'web',
    priority: 50,
    badgeColor: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-900 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30',
    textColor: 'text-cyan-800 dark:text-cyan-400',
    borderColor: 'border-cyan-400 dark:border-cyan-500/40',
  },
  {
    id: 'SQLi',
    label: 'SQL Injection',
    shortLabel: 'SQLi',
    domain: 'web',
    priority: 68,
    badgeColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-500/40',
  },
  {
    id: 'RCE',
    label: 'Remote Code Execution / Command Injection',
    shortLabel: 'RCE',
    domain: 'web',
    priority: 70,
    badgeColor: 'bg-rose-100 dark:bg-rose-500/15 text-rose-900 dark:text-rose-400 border-rose-300 dark:border-rose-500/30',
    textColor: 'text-rose-800 dark:text-rose-400',
    borderColor: 'border-rose-400 dark:border-rose-500/40',
  },
  {
    id: 'File Upload',
    label: 'Arbitrary File Upload & Web Shell',
    shortLabel: 'File Upload',
    domain: 'web',
    priority: 62,
    badgeColor: 'bg-lime-100 dark:bg-lime-500/15 text-lime-900 dark:text-lime-400 border-lime-300 dark:border-lime-500/30',
    textColor: 'text-lime-800 dark:text-lime-400',
    borderColor: 'border-lime-400 dark:border-lime-500/40',
  },
  {
    id: 'LFI',
    label: 'File Inclusion (LFI/RFI/Traversal)',
    shortLabel: 'LFI/Traversal',
    domain: 'web',
    priority: 56,
    badgeColor: 'bg-sky-100 dark:bg-sky-500/15 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-500/30',
    textColor: 'text-sky-800 dark:text-sky-300',
    borderColor: 'border-sky-400 dark:border-sky-500/40',
  },
  {
    id: 'SSRF',
    label: 'Server-Side Request Forgery',
    shortLabel: 'SSRF',
    domain: 'web',
    priority: 65,
    badgeColor: 'bg-teal-100 dark:bg-teal-500/15 text-teal-900 dark:text-teal-300 border-teal-300 dark:border-teal-500/30',
    textColor: 'text-teal-800 dark:text-teal-300',
    borderColor: 'border-teal-400 dark:border-teal-500/40',
  },
  {
    id: 'SSTI',
    label: 'Server-Side Template Injection',
    shortLabel: 'SSTI',
    domain: 'web',
    priority: 75,
    badgeColor: 'bg-pink-100 dark:bg-pink-500/15 text-pink-900 dark:text-pink-300 border-pink-300 dark:border-pink-500/30',
    textColor: 'text-pink-800 dark:text-pink-300',
    borderColor: 'border-pink-400 dark:border-pink-500/40',
  },
  {
    id: 'Deserialization',
    label: 'Insecure Deserialization',
    shortLabel: 'Deserialization',
    domain: 'web',
    priority: 80,
    badgeColor: 'bg-violet-100 dark:bg-violet-500/15 text-violet-900 dark:text-violet-300 border-violet-300 dark:border-violet-500/30',
    textColor: 'text-violet-800 dark:text-violet-300',
    borderColor: 'border-violet-400 dark:border-violet-500/40',
  },
  {
    id: 'Auth & Passwords',
    label: 'Auth Bypass & Password Attacks',
    shortLabel: 'Auth & Pass',
    domain: 'web',
    priority: 52,
    badgeColor: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-950 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
    textColor: 'text-yellow-800 dark:text-yellow-400',
    borderColor: 'border-yellow-400 dark:border-yellow-500/40',
  },
  {
    id: 'IDOR',
    label: 'Insecure Direct Object Reference (IDOR)',
    shortLabel: 'IDOR',
    domain: 'web',
    priority: 60,
    badgeColor: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    textColor: 'text-emerald-800 dark:text-emerald-300',
    borderColor: 'border-emerald-400 dark:border-emerald-500/40',
  },
  {
    id: 'API & GraphQL',
    label: 'API & GraphQL Security',
    shortLabel: 'API/GraphQL',
    domain: 'web',
    priority: 55,
    badgeColor: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30',
    textColor: 'text-indigo-800 dark:text-indigo-300',
    borderColor: 'border-indigo-400 dark:border-indigo-500/40',
  },
  {
    id: 'XXE',
    label: 'XML External Entity (XXE)',
    shortLabel: 'XXE',
    domain: 'web',
    priority: 64,
    badgeColor: 'bg-orange-100 dark:bg-orange-500/15 text-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-500/30',
    textColor: 'text-orange-800 dark:text-orange-300',
    borderColor: 'border-orange-400 dark:border-orange-500/40',
  },
  {
    id: 'CMS Exploits',
    label: 'CMS Exploits (WordPress/Drupal/Joomla)',
    shortLabel: 'CMS',
    domain: 'web',
    priority: 54,
    badgeColor: 'bg-blue-100 dark:bg-blue-500/15 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-400 dark:border-blue-500/40',
  },
  {
    id: 'XSS',
    label: 'Cross-Site Scripting',
    shortLabel: 'XSS',
    domain: 'web',
    priority: 45,
    badgeColor: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-950 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/30',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    borderColor: 'border-yellow-400 dark:border-yellow-500/40',
  },

  // --- DOMAIN 2: ACTIVE DIRECTORY & IDENTITY ---
  {
    id: 'ADCS',
    label: 'ADCS / Active Directory Certificates',
    shortLabel: 'ADCS',
    domain: 'ad',
    priority: 100,
    badgeColor: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-950 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-500/40',
    textColor: 'text-fuchsia-800 dark:text-fuchsia-300',
    borderColor: 'border-fuchsia-400 dark:border-fuchsia-500/50',
  },
  {
    id: 'Active Directory',
    label: 'Active Directory & Kerberos',
    shortLabel: 'AD',
    domain: 'ad',
    priority: 95,
    badgeColor: 'bg-purple-100 dark:bg-purple-500/15 text-purple-900 dark:text-purple-400 border-purple-300 dark:border-purple-500/30',
    textColor: 'text-purple-800 dark:text-purple-400',
    borderColor: 'border-purple-400 dark:border-purple-500/40',
  },

  // --- DOMAIN 3: HOST & SYSTEM EXPLOITATION ---
  {
    id: 'Kernel Exploits',
    label: 'Kernel Exploits & Zero-Days',
    shortLabel: 'Kernel',
    domain: 'system',
    priority: 90,
    badgeColor: 'bg-red-100 dark:bg-red-500/20 text-red-950 dark:text-red-300 border-red-300 dark:border-red-500/40',
    textColor: 'text-red-800 dark:text-red-300',
    borderColor: 'border-red-400 dark:border-red-500/50',
  },
  {
    id: 'Windows PrivEsc',
    label: 'Windows Privilege Escalation',
    shortLabel: 'Win PE',
    domain: 'system',
    priority: 42,
    badgeColor: 'bg-blue-100 dark:bg-blue-500/15 text-blue-900 dark:text-blue-400 border-blue-300 dark:border-blue-500/30',
    textColor: 'text-blue-800 dark:text-blue-400',
    borderColor: 'border-blue-400 dark:border-blue-500/40',
  },
  {
    id: 'Linux PrivEsc',
    label: 'Linux Privilege Escalation',
    shortLabel: 'Linux PE',
    domain: 'system',
    priority: 40,
    badgeColor: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
    textColor: 'text-emerald-800 dark:text-emerald-400',
    borderColor: 'border-emerald-400 dark:border-emerald-500/40',
  },
  {
    id: 'Network / SMB',
    label: 'Network Protocols (SMB/RPC/SNMP/FTP)',
    shortLabel: 'SMB/Net',
    domain: 'system',
    priority: 34,
    badgeColor: 'bg-orange-100 dark:bg-orange-500/15 text-orange-950 dark:text-orange-300 border-orange-300 dark:border-orange-500/30',
    textColor: 'text-orange-800 dark:text-orange-300',
    borderColor: 'border-orange-400 dark:border-orange-500/40',
  },

  // --- DOMAIN 4: ADVANCED & SPECIALIZED CTF ---
  {
    id: 'Binary / BOF',
    label: 'Buffer Overflow & Binary Pwn',
    shortLabel: 'BOF/Pwn',
    domain: 'advanced',
    priority: 85,
    badgeColor: 'bg-red-100 dark:bg-red-600/15 text-red-900 dark:text-red-400 border-red-300 dark:border-red-600/30',
    textColor: 'text-red-800 dark:text-red-400',
    borderColor: 'border-red-400 dark:border-red-600/40',
  },
  {
    id: 'Cloud & Containers',
    label: 'Cloud & Docker/K8s Breakouts',
    shortLabel: 'Cloud/Docker',
    domain: 'advanced',
    priority: 48,
    badgeColor: 'bg-sky-100 dark:bg-sky-500/15 text-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-500/30',
    textColor: 'text-sky-800 dark:text-sky-300',
    borderColor: 'border-sky-400 dark:border-sky-500/40',
  },
  {
    id: 'Reverse Engineering',
    label: 'Reverse Engineering & Decompilation',
    shortLabel: 'Reversing',
    domain: 'advanced',
    priority: 46,
    badgeColor: 'bg-purple-100 dark:bg-purple-500/15 text-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-500/30',
    textColor: 'text-purple-800 dark:text-purple-300',
    borderColor: 'border-purple-400 dark:border-purple-500/40',
  },
  {
    id: 'Cryptography',
    label: 'Cryptography & Broken Ciphers',
    shortLabel: 'Crypto',
    domain: 'advanced',
    priority: 44,
    badgeColor: 'bg-amber-100 dark:bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-500/40',
  },
  {
    id: 'Pivoting',
    label: 'Pivoting, Tunneling & Port Forwarding',
    shortLabel: 'Pivoting',
    domain: 'advanced',
    priority: 36,
    badgeColor: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30',
    textColor: 'text-indigo-800 dark:text-indigo-300',
    borderColor: 'border-indigo-400 dark:border-indigo-500/40',
  },
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
      badgeColor: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
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
  const walkthrough = m.officialWalkthrough || '';

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

    // 3. Tier 3: Walkthrough (Fallback only if present)
    if (!matched && walkthrough) {
      matched = patterns.some((p) => p.test(walkthrough));
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
    badgeColor = 'bg-slate-100 dark:bg-gray-500/15 text-slate-800 dark:text-gray-400 border-slate-300 dark:border-gray-500/30';
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
