import { Machine } from '../types';

export interface PracticeTrack {
  id: string;
  name: string;
  shortName: string;
  category: 'certification' | 'technique' | 'level' | 'curated';
  description: string;
  badgeColor: string;
  accentColor: string;
  filterFn: (machine: Machine) => boolean;
}

// Canonical TJ_Null OSCP NetSec targets across HTB and THM
const TJ_NULL_OSCP_NAMES = new Set([
  'lame', 'brainfuck', 'shocker', 'bashed', 'nibbles', 'beep', 'cronos', 'optimum',
  'bastard', 'granny', 'grandpa', 'arctic', 'devel', 'netmon', 'blue', 'jerry',
  'active', 'forest', 'cascade', 'sauna', 'buff', 'cap', 'knife', 'sense', 'secnotes',
  'enterprise', 'jeeves', 'solidstate', 'popcorn', 'fortune', 'traverxec', 'resolute',
  'forwardslash', 'tartarsauce', 'poison', 'valentine', 'bank', 'sunday', 'bastion',
  'haircut', 'mirai', 'friendzone', 'swagshop', 'postman', 'passage', 'registry',
  'doctor', 'heist', 'openadmin', 'tabby', 'traceback', 'ready', 'scriptkiddie',
  'tenet', 'armageddon', 'pit', 'seal', 'dynastore', 'routerspace', 'node', 'carrier',
  'help', 'stratosphere', 'obscurity', 'previse', 'delivery', 'horizontall', 'silo',
  'bounty', 'curling', 'fluxcapacitor', 'haystack', 'irked', 'jarvis', 'calamity',
  'europa', 'jail',
  // TryHackMe TJ_Null OSCP list
  'rootme', 'kenobi', 'steel mountain', 'vulnversity', 'game zone', 'skynet',
  'alfred', 'hackpark', 'internal', 'blaster', 'retro', 'anthem', 'postbook',
  'bounty hacker', 'ignite', 'pickle rick', 'agent sudo', 'simple ctf', 'brooklyn nine nine'
]);

// HTB CWEE (Certified Web Exploitation Expert) & Advanced Web Exploitation targets
const CWEE_NAMES = new Set([
  'craft', 'sau', 'pretense', 'cozyhosting', 'mailing', 'runner', 'monitorstwo',
  'zipper', 'metatwo', 'pilgrimage', 'visual', 'brokencrystal', 'boardlight',
  'editor', 'perfection', 'hospital', 'bizness', 'headless', 'greenhorn',
  'clicker', 'devvortex', 'analytics', 'sandworm', 'surveillance', 'permx',
  'icpc', 'codify', 'usage', 'caption', 'sightless', 'builder', 'previse',
  'delivery', 'horizontall', 'tabby', 'openadmin', 'swagshop', 'friendzone',
  'haircut', 'popcorn', 'valentine', 'poison', 'cronos', 'shocker', 'bashed', 'nibbles'
]);

// Iconic machines with dedicated IppSec video masterclasses & deep dives
const IPPSEC_NAMES = new Set([
  'lame', 'blue', 'devel', 'optimum', 'bastard', 'granny', 'grandpa', 'beep', 'jerry',
  'netmon', 'bashed', 'nibbles', 'shocker', 'active', 'forest', 'sauna', 'cascade',
  'reddish', 'hawk', 'dab', 'nightmare', 'stratosphere', 'fortune', 'poison', 'valentine',
  'popcorn', 'jeeves', 'solidstate', 'tartarsauce', 'haircut', 'help', 'bank', 'bastion',
  'heist', 'resolute', 'traverxec', 'buff', 'cap', 'knife', 'previse', 'delivery',
  'horizontall', 'armageddon', 'tenet', 'scriptkiddie', 'ready', 'tabby', 'openadmin',
  'doctor', 'registry', 'passage', 'postman', 'swagshop', 'friendzone', 'mirai',
  'sunday', 'secnotes', 'sense', 'arctic', 'cronos', 'brainfuck', 'curling', 'irked'
]);

// Legendary Community Classics & Hall of Fame targets in HTB & THM history
const POPULAR_NAMES = new Set([
  'lame', 'blue', 'devel', 'jerry', 'netmon', 'optimum', 'beep', 'bashed', 'nibbles',
  'shocker', 'active', 'forest', 'sauna', 'cascade', 'cap', 'knife', 'buff', 'rootme',
  'kenobi', 'steel mountain', 'vulnversity', 'pickle rick', 'agent sudo', 'simple ctf',
  'alfred', 'hackpark', 'skynet', 'internal', 'ignite', 'bounty hacker', 'cozyhosting',
  'sau', 'analytics', 'boardlight', 'perfection', 'headless', 'greenhorn', 'previse',
  'delivery', 'horizontall', 'armageddon', 'ready', 'openadmin', 'passage', 'postman',
  'heist', 'resolute', 'bastion', 'bank', 'valentine', 'poison', 'popcorn', 'jeeves'
]);

export const PRACTICE_TRACKS: PracticeTrack[] = [
  {
    id: 'tjnull-oscp',
    name: "TJ_Null's OSCP NetSec Preparation",
    shortName: 'OSCP Track',
    category: 'certification',
    description: 'The definitive OffSec Certified Professional machine curriculum curated by TJ_Null across HTB and THM.',
    badgeColor: 'border-cyber-emerald/40 bg-cyber-emerald/10 text-cyber-emerald',
    accentColor: '#10B981',
    filterFn: (m) => 
      TJ_NULL_OSCP_NAMES.has(m.name.toLowerCase()) ||
      m.certifications?.includes('OSCP') || 
      m.tags?.some(t => ['oscp', 'tjnull', 'tj-null', 'offsec', 'pwk', 'pen-200'].includes(t.toLowerCase())),
  },
  {
    id: 'cpts-path',
    name: 'Certified Penetration Testing Specialist (CPTS)',
    shortName: 'CPTS Track',
    category: 'certification',
    description: 'Hack The Box Academy flagship path covering deep enumeration and complex pivot chains.',
    badgeColor: 'border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan',
    accentColor: '#06B6D4',
    filterFn: (m) => 
      m.certifications?.includes('CPTS') || 
      m.tags?.some(t => ['cpts', 'htb academy', 'academy', 'pivoting', 'trophy room'].includes(t.toLowerCase())),
  },
  {
    id: 'cwee-web',
    name: 'HTB CWEE & Advanced Web Exploitation (OSWE)',
    shortName: 'CWEE / Web Expert',
    category: 'certification',
    description: 'Certified Web Exploitation Expert targets: white-box code review, SSRF, Deserialization, SQLi, SSTI, and auth bypass.',
    badgeColor: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
    accentColor: '#F59E0B',
    filterFn: (m) => 
      CWEE_NAMES.has(m.name.toLowerCase()) ||
      m.certifications?.some(c => ['cwee', 'cwt', 'oswe', 'ewpt'].includes(c.toUpperCase())) ||
      m.tags?.some(t => ['cwee', 'cwt', 'oswe', 'deserialization', 'ssti', 'ssrf', 'sqli', 'prototype pollution', 'graphql', 'jwt', 'xxe'].includes(t.toLowerCase())),
  },
  {
    id: 'popular-classics',
    name: 'Community Classics & Hall of Fame',
    shortName: 'Popular Track',
    category: 'curated',
    description: 'The most celebrated, legendary, and widely completed CTF targets in Hack The Box and TryHackMe history.',
    badgeColor: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400',
    accentColor: '#EAB308',
    filterFn: (m) => POPULAR_NAMES.has(m.name.toLowerCase()),
  },
  {
    id: 'ippsec-vault',
    name: 'IppSec Video Walkthrough Masterclass',
    shortName: 'IppSec Track',
    category: 'curated',
    description: 'Iconic machines broken down step-by-step by IppSec on ippsec.rocks with reverse engineering and pivoting masterclasses.',
    badgeColor: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400',
    accentColor: '#22D3EE',
    filterFn: (m) => 
      IPPSEC_NAMES.has(m.name.toLowerCase()) ||
      `${m.name} ${m.tags?.join(' ')} ${m.hint || ''} ${m.officialSynopsis || ''} ${m.officialWalkthrough || ''}`.toLowerCase().includes('ippsec'),
  },
  {
    id: 'crto-ad',
    name: 'Active Directory & Red Team Warfare (CRTO)',
    shortName: 'Active Directory',
    category: 'certification',
    description: 'Enterprise domain exploitation: Kerberoasting, AS-REP, BloodHound, GPO abuse, ADCS, and DCSync.',
    badgeColor: 'border-cyber-purple/40 bg-cyber-purple/10 text-cyber-purple',
    accentColor: '#A855F7',
    filterFn: (m) => 
      m.certifications?.includes('CRTO') ||
      m.tags?.some(t => ['kerberos', 'ad', 'ldap', 'domain', 'bloodhound', 'active directory', 'gpo', 'adcs'].includes(t.toLowerCase())),
  },
  {
    id: 'web-master',
    name: 'Web Exploitation Master Pathway',
    shortName: 'Web Exploitation',
    category: 'technique',
    description: 'OWASP Top 10, SQL injection, SSTI, SSRF, Deserialization, and API security vulnerabilities.',
    badgeColor: 'border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber',
    accentColor: '#F59E0B',
    filterFn: (m) => 
      m.tags.some(t => [
        'web', 'http', 'iis', 'apache', 'nginx', 'php', 'sqli', 'sql', 'ssti', 
        'wordpress', 'drupal', 'joomla', 'tomcat', 'jenkins', 'nodejs', 'flask',
        'api', 'graphql', 'lfi', 'rfi', 'deserialization', 'xss', 'command injection'
      ].includes(t.toLowerCase())),
  },
  {
    id: 'linux-privesc',
    name: 'Linux Privilege Escalation Intensive',
    shortName: 'Linux PrivEsc',
    category: 'technique',
    description: 'Internal Linux enumeration: SUID binaries, sudo misconfigurations, capabilities, and kernel exploits.',
    badgeColor: 'border-cyber-crimson/40 bg-cyber-crimson/10 text-cyber-crimson',
    accentColor: '#EF4444',
    filterFn: (m) => 
      m.os === 'Linux' && 
      m.tags.some(t => ['suid', 'sudo', 'kernel', 'cron', 'capabilities', 'privesc', 'nfs', 'path', 'wildcard'].includes(t.toLowerCase())),
  },
  {
    id: 'windows-privesc',
    name: 'Windows & Enterprise PrivEsc Domination',
    shortName: 'Windows PrivEsc',
    category: 'technique',
    description: 'Token impersonation (Juicy/PrintPotato), Unquoted Service Paths, AlwaysInstallElevated, and DPAPI.',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    accentColor: '#3B82F6',
    filterFn: (m) => 
      m.os === 'Windows' || 
      m.tags.some(t => ['windows', 'smb', 'rdp', 'winrm', 'ad', 'potato', 'seimpersonate', 'unquoted', 'token', 'privesc', 'service', 'uac', 'dll', 'registry', 'sam', 'lsass'].includes(t.toLowerCase())),
  },
  {
    id: 'beginner-essentials',
    name: 'Fast Track: Easy Footholds & Essentials',
    shortName: 'Beginner Track',
    category: 'level',
    description: 'Perfect starting boxes with straightforward reconnaissance and direct, clean exploitation steps.',
    badgeColor: 'border-cyber-emerald/40 bg-cyber-emerald/10 text-cyber-emerald',
    accentColor: '#10B981',
    filterFn: (m) => m.difficulty === 'Easy' || m.difficulty === 'Very Easy',
  },
  {
    id: 'insane-hardcore',
    name: 'Hardcore & Insane Challenge Track',
    shortName: 'Hardcore Pwn',
    category: 'level',
    description: 'Complex multi-step exploitation chains, binary defense bypasses, custom cryptography, and deep pivots.',
    badgeColor: 'border-red-500/40 bg-red-500/10 text-red-500 shadow-glow-crimson',
    accentColor: '#EF4444',
    filterFn: (m) => m.difficulty === 'Hard' || m.difficulty === 'Insane',
  },
];
