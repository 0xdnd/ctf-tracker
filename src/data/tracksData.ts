import { Machine } from '../types';
import { normalizeMachineSlug } from '../store/machineNormalization';
import oscpSource from './trackSources/offsec-oscp.json';
import osepSource from './trackSources/offsec-osep.json';
import osweSource from './trackSources/offsec-oswe.json';
import adSource from './trackSources/htb-active-directory.json';
import ippsecSource from './trackSources/ippsec-videos.json';

export interface PracticeTrack {
  id: string;
  name: string;
  shortName: string;
  category: 'certification' | 'technique' | 'level' | 'curated';
  description: string;
  badgeColor: string;
  accentColor: string;
  filterFn: (machine: Machine) => boolean;
  /**
   * List-type tracks only: the curated sequence as `PLATFORM:slug` keys (see {@link trackOrderKey}), in the
   * order of the source list. Members that match the track by tag or certification but are not on the list sort last.
   */
  order?: readonly string[];
  /** Where the list comes from (URL without protocol). Only set where the source file states it. */
  source?: string;
  /** Date the list was taken from its source (YYYY-MM-DD). Only set where the source file states it. */
  asOf?: string;
}

/** Machine names per platform. A name only ever matches a row on the platform it is listed under. */
export interface TrackNameList {
  HTB: readonly string[];
  THM: readonly string[];
}

/** "Active (2018 Retired)" -> "active": trailing parenthetical dropped, then letters and digits only. */
export const trackNameSlug = (name: string): string => normalizeMachineSlug(name.replace(/\s*\([^)]*\)\s*$/, ''));

/**
 * Every name list a track matches on, keyed by list id. HTB lists come from src/data/trackSources/
 * (as-of date and source URL in each file); the THM lists are TJ_Null-era classics kept by hand.
 */
export const TRACK_NAME_LISTS: Record<'oscp' | 'osep' | 'oswe' | 'ad' | 'ippsec' | 'cwee' | 'popular', TrackNameList> = {
  // HTB: 0xdf's current OSCP+ (PEN-200 2023+) Like + Harder list. THM: TJ_Null's OSCP rooms.
  oscp: {
    HTB: oscpSource.names.HTB,
    THM: [
      'RootMe', 'Kenobi', 'Steel Mountain', 'Vulnversity', 'Game Zone', 'Skynet', 'Alfred', 'HackPark',
      'Internal', 'Blaster', 'Retro', 'Anthem', 'Bounty Hacker', 'Ignite', 'Pickle Rick', 'Agent Sudo',
      'Simple CTF', 'Brooklyn Nine Nine',
    ],
  },
  osep: { HTB: osepSource.names.HTB, THM: [] },
  oswe: { HTB: osweSource.names.HTB, THM: [] },
  ad: { HTB: adSource.names.HTB, THM: [] },
  ippsec: { HTB: ippsecSource.names.HTB, THM: [] },
  // HTB CWEE (Certified Web Exploitation Expert) & advanced web exploitation targets
  cwee: {
    HTB: [
      'Craft', 'Sau', 'CozyHosting', 'Mailing', 'Runner', 'MonitorsTwo', 'Zipper', 'MetaTwo', 'Pilgrimage',
      'Visual', 'BoardLight', 'Editor', 'Perfection', 'Hospital', 'Bizness', 'Headless', 'GreenHorn',
      'Clicker', 'Devvortex', 'Analytics', 'Sandworm', 'Surveillance', 'PermX', 'Codify', 'Usage', 'Caption',
      'Sightless', 'Builder', 'Previse', 'Delivery', 'Horizontall', 'Tabby', 'OpenAdmin', 'SwagShop',
      'FriendZone', 'Haircut', 'Popcorn', 'Valentine', 'Poison', 'Cronos', 'Shocker', 'Bashed', 'Nibbles',
    ],
    THM: [],
  },
  // Legendary community classics & hall of fame targets in HTB & THM history
  popular: {
    HTB: [
      'Lame', 'Blue', 'Devel', 'Jerry', 'Netmon', 'Optimum', 'Beep', 'Bashed', 'Nibbles', 'Shocker', 'Active',
      'Forest', 'Sauna', 'Cascade', 'Cap', 'Knife', 'Buff', 'CozyHosting', 'Sau', 'Analytics', 'BoardLight',
      'Perfection', 'Headless', 'GreenHorn', 'Previse', 'Delivery', 'Horizontall', 'Armageddon', 'Ready',
      'OpenAdmin', 'Passage', 'Postman', 'Heist', 'Resolute', 'Bastion', 'Bank', 'Valentine', 'Poison',
      'Popcorn', 'Jeeves',
    ],
    THM: [
      'RootMe', 'Kenobi', 'Steel Mountain', 'Vulnversity', 'Pickle Rick', 'Agent Sudo', 'Simple CTF', 'Alfred',
      'HackPark', 'Skynet', 'Internal', 'Ignite', 'Bounty Hacker',
    ],
  },
};

type NameSet = { HTB: Set<string>; THM: Set<string> };
const toSet = (...lists: TrackNameList[]): NameSet => ({
  HTB: new Set(lists.flatMap((l) => l.HTB.map(trackNameSlug))),
  THM: new Set(lists.flatMap((l) => l.THM.map(trackNameSlug))),
});

const slugCache = new Map<string, string>();
const cachedSlug = (name: string): string => {
  let s = slugCache.get(name);
  if (s === undefined) {
    s = trackNameSlug(name);
    slugCache.set(name, s);
  }
  return s;
};

/** True when the row's name is listed for the row's own platform (HTB or THM). */
const listed = (set: NameSet, m: Machine): boolean =>
  (m.platform === 'HTB' || m.platform === 'THM') && typeof m.name === 'string' && set[m.platform].has(cachedSlug(m.name));

/** Key of a machine in a track's `order`: its platform plus the name slug (catalog ids do not follow the name). */
export const trackOrderKey = (m: Pick<Machine, 'platform' | 'name'>): string => `${m.platform}:${cachedSlug(m.name)}`;

/** `PLATFORM:slug` keys for the lists, HTB names first, then THM; a name repeated across lists keeps its first place. */
const orderOf = (...lists: TrackNameList[]): string[] => {
  const keys = new Set<string>();
  for (const platform of ['HTB', 'THM'] as const) {
    for (const l of lists) for (const name of l[platform]) keys.add(`${platform}:${cachedSlug(name)}`);
  }
  return [...keys];
};

/** "https://0xdf.gitlab.io/cheatsheets/offsec" -> "0xdf.gitlab.io/cheatsheets/offsec"; a trailing "(note)" is dropped. */
const sourceLabel = (url: string): string => url.replace(/^https?:\/\//, '').replace(/\s*\([^)]*\)\s*$/, '');

const L = TRACK_NAME_LISTS;
const OSCP = toSet(L.oscp);
const OSEP = toSet(L.osep);
const OSWE = toSet(L.oswe);
const AD = toSet(L.ad);
const IPPSEC = toSet(L.ippsec);
const CWEE = toSet(L.cwee, L.oswe);
const POPULAR = toSet(L.popular);

const TRACKS: PracticeTrack[] = [
  {
    id: 'tjnull-oscp',
    name: "TJ_Null's OSCP NetSec Preparation",
    shortName: 'OSCP Track',
    category: 'certification',
    description: "OffSec Certified Professional prep: the current OSCP+ (PEN-200 2023+) list of HTB machines, as of Oct 2026, plus TJ_Null's classic TryHackMe rooms.",
    badgeColor: 'border-cyber-emerald/40 bg-cyber-emerald/10 text-cyber-emerald',
    accentColor: '#10B981',
    // HTB rows: the current list only. Other platforms (THM, custom targets) may also opt in by OSCP cert or tag.
    filterFn: (m) =>
      listed(OSCP, m) ||
      (m.platform !== 'HTB' &&
        (m.certifications?.includes('OSCP') ||
          m.tags?.some(t => ['oscp', 'tjnull', 'tj-null', 'offsec', 'pwk', 'pen-200'].includes(t.toLowerCase())))),
  },
  {
    id: 'osep',
    name: 'OSEP Evasion & Lateral Movement Preparation',
    shortName: 'OSEP Track',
    category: 'certification',
    description: 'OffSec Experienced Penetration Tester (PEN-300) prep: the OSEP Like and Harder HTB machines, as of Oct 2026.',
    badgeColor: 'border-rose-400/40 bg-rose-400/10 text-rose-400',
    accentColor: '#FB7185',
    filterFn: (m) => listed(OSEP, m),
  },
  {
    id: 'oswe',
    name: 'OSWE Web Exploitation & Code Review Preparation',
    shortName: 'OSWE Track',
    category: 'certification',
    description: 'OffSec Web Expert (WEB-300) prep: the OSWE Like and Harder HTB machines, as of Oct 2026.',
    badgeColor: 'border-orange-400/40 bg-orange-400/10 text-orange-400',
    accentColor: '#FB923C',
    filterFn: (m) => listed(OSWE, m),
  },
  {
    id: 'cpts-path',
    name: 'Certified Penetration Testing Specialist (CPTS)',
    shortName: 'CPTS Track',
    category: 'certification',
    description: 'Hack The Box Academy flagship path covering deep enumeration, Active Directory, and complex pivot chains.',
    badgeColor: 'border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan',
    accentColor: '#06B6D4',
    filterFn: (m) => 
      m.certifications?.includes('CPTS') || 
      m.tags?.some(t => ['cpts', 'htb academy', 'academy', 'pivoting', 'trophy room'].includes(t.toLowerCase())),
  },
  {
    id: 'ippsec-cpts',
    name: 'Unofficial IppSec CPTS Preparation Track',
    shortName: 'IppSec CPTS',
    category: 'certification',
    description: 'Unofficial IppSec CPTS preparation list: HTB CPTS syllabus machines paired with official IppSec video walkthroughs.',
    badgeColor: 'border-sky-400/40 bg-sky-400/10 text-sky-400',
    accentColor: '#38BDF8',
    filterFn: (m) =>
      listed(IPPSEC, m) &&
      (m.certifications?.includes('CPTS') ||
        m.tags?.some(t => ['cpts', 'htb academy', 'academy', 'pivoting', 'trophy room'].includes(t.toLowerCase()))),
  },
  {
    id: 'cwee-web',
    name: 'HTB CWEE & CWES Advanced Web Exploitation',
    shortName: 'CWEE / CWES Track',
    category: 'certification',
    description: 'Certified Web Exploitation Expert & Specialist (CWEE/CWES): code review, SSRF, Deserialization, SQLi, SSTI, and auth bypass.',
    badgeColor: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
    accentColor: '#F59E0B',
    filterFn: (m) =>
      listed(CWEE, m) ||
      m.certifications?.some(c => ['cwee', 'cwes', 'cwt', 'oswe', 'ewpt'].includes(c.toUpperCase())) ||
      m.tags?.some(t => ['cwee', 'cwes', 'cwt', 'oswe', 'deserialization', 'ssti', 'ssrf', 'sqli', 'prototype pollution', 'graphql', 'jwt', 'xxe'].includes(t.toLowerCase())),
  },
  {
    id: 'popular-classics',
    name: 'Community Classics & Hall of Fame',
    shortName: 'Popular Track',
    category: 'curated',
    description: 'The most celebrated, legendary, and widely completed CTF targets in Hack The Box and TryHackMe history.',
    badgeColor: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400',
    accentColor: '#EAB308',
    filterFn: (m) => listed(POPULAR, m),
  },
  {
    id: 'ippsec-vault',
    name: 'IppSec Video Walkthrough Masterclass',
    shortName: 'IppSec Track',
    category: 'curated',
    description: 'Every retired HTB machine IppSec has a video walkthrough for on ippsec.rocks, as of Oct 2026.',
    badgeColor: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400',
    accentColor: '#22D3EE',
    filterFn: (m) => listed(IPPSEC, m),
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
      listed(AD, m) ||
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

/**
 * List-based tracks (curated name lists and cert prep) never include an active HTB machine
 * (HTB AUP §8.2: no walkthrough-linked lists for active content). Pure difficulty/OS/technique filters may.
 */
export const LIST_BASED_TRACK_IDS: ReadonlySet<string> = new Set([
  'tjnull-oscp', 'osep', 'oswe', 'cwee-web', 'popular-classics', 'ippsec-vault', 'crto-ad', 'cpts-path', 'ippsec-cpts',
]);

type ListMeta = Pick<PracticeTrack, 'order' | 'source' | 'asOf'>;
const listMeta = (src: { source: string; asOf: string }, ...lists: TrackNameList[]): ListMeta => ({
  order: orderOf(...lists),
  source: sourceLabel(src.source),
  asOf: src.asOf,
});

/** Sequence (and, where a source file states it, source and date) of each list-type track. */
const TRACK_LIST_META: Record<string, ListMeta> = {
  'tjnull-oscp': listMeta(oscpSource, L.oscp),
  osep: listMeta(osepSource, L.osep),
  oswe: listMeta(osweSource, L.oswe),
  'crto-ad': listMeta(adSource, L.ad),
  'ippsec-cpts': listMeta(ippsecSource, L.ippsec),
  'ippsec-vault': listMeta(ippsecSource, L.ippsec),
  // Hand-kept lists: a sequence but no source file, so no source or date.
  'cwee-web': { order: orderOf(L.cwee, L.oswe) },
  'popular-classics': { order: orderOf(L.popular) },
};

export const PRACTICE_TRACKS: PracticeTrack[] = TRACKS.map((t) => {
  if (!LIST_BASED_TRACK_IDS.has(t.id)) return t;
  const match = t.filterFn;
  return { ...t, ...TRACK_LIST_META[t.id], filterFn: (m: Machine) => !m.isActive && match(m) };
});

/** Every practice track by id; the one place to resolve a track id. */
export const TRACK_BY_ID: ReadonlyMap<string, PracticeTrack> = new Map(PRACTICE_TRACKS.map((t) => [t.id, t]));
