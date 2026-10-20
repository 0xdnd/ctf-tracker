import type { Machine } from '../types';
import type { FilterState } from '../store/useCtfStore';
import { PRACTICE_TRACKS, type PracticeTrack } from '../data/tracksData';
import { classifyMachine, isActiveDirectory, matchesCategory, matchesDomain, type VulnDomainId } from './categoryUtils';
import { matchesAvailability } from './availabilityFilter';
import { parseSearchQuery, matchesSearchQuery } from './searchQuery';
import { isDueForReview } from './spacedRepetition';

/** A machine counts as completed once its user or root flag is recorded as done. */
export const isCompleted = (m: Pick<Machine, 'status'>): boolean => m.status === 'root' || m.status === 'completed';

/** The independent filter dimensions; a caller can skip one to count the options of that dimension. */
export type FilterDimension =
  | 'search'
  | 'platform'
  | 'difficulty'
  | 'os'
  | 'availability'
  | 'cert'
  | 'status'
  | 'excludeAD'
  | 'domain'
  | 'vulnCategory'
  | 'tracks'
  | 'category'
  | 'tags'
  | 'language'
  | 'area'
  | 'technique';

export interface MachineFilterContext {
  /** Domain tab of the filter UI. Only applies while no specific vulnerability category is chosen. */
  domain?: VulnDomainId;
  /** Clock for the "review:due" search operator. */
  nowMs?: number;
  /** Dimensions to ignore. */
  skip?: readonly FilterDimension[];
}

/** The subset of the filter state the predicate reads. */
export type MachineFilters = Pick<
  FilterState,
  | 'searchQuery'
  | 'selectedPlatform'
  | 'selectedDifficulty'
  | 'selectedCert'
  | 'selectedOs'
  | 'selectedAvailability'
  | 'selectedCategory'
  | 'selectedVulnCategory'
  | 'excludeActiveDirectory'
  | 'selectedTrack'
  | 'selectedTracks'
  | 'selectedStatus'
  | 'selectedLanguage'
  | 'selectedAreaOfInterest'
  | 'selectedTechnique'
  | 'selectedTags'
>;

/** Track ids in effect: the multi-select wins, otherwise the single track (if any). */
export const getActiveTrackIds = (f: Pick<MachineFilters, 'selectedTrack' | 'selectedTracks'>): string[] => {
  if (f.selectedTracks && f.selectedTracks.length > 0) return f.selectedTracks;
  if (f.selectedTrack && f.selectedTrack !== 'ALL') return [f.selectedTrack];
  return [];
};

const searchableText = (m: Machine): string =>
  `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')} ${m.hint || ''}`.toLowerCase();

const matchesLanguage = (m: Machine, language: string): boolean => {
  const l = language.toLowerCase();
  const text = searchableText(m);
  if (l === 'python') return /python|flask|django|\bpy\b/i.test(text);
  if (l === 'php') return /php|laravel|wordpress/i.test(text);
  if (l === 'nodejs' || l === 'javascript') return /node|javascript|\bjs\b|express/i.test(text);
  if (l === 'java') return /java|spring|tomcat|log4j/i.test(text);
  if (l === 'c#' || l === '.net') return /c#|\.net|csharp|asp\.net|iis/i.test(text);
  if (l === 'c/c++') return /\bc\b|c\+\+|bof|buffer overflow|binary/i.test(text);
  if (l === 'go') return /\bgo\b|golang/i.test(text);
  if (l === 'ruby') return /ruby|rails/i.test(text);
  if (l === 'bash') return /bash|shell|\bsh\b/i.test(text);
  if (l === 'powershell') return /powershell|\bps1\b/i.test(text);
  return text.includes(l);
};

const matchesArea = (m: Machine, area: string): boolean => {
  const a = area.toLowerCase();
  const text = searchableText(m);
  if (a.includes('web')) return classifyMachine(m).domains.includes('web') || /web|http|api|injection|xss|sqli|lfi/i.test(text);
  if (a.includes('active directory') || a.includes('ad')) return isActiveDirectory(m) || /active directory|kerberos|domain controller|ldap|smb/i.test(text);
  if (a.includes('cloud')) return /cloud|aws|azure|gcp|s3|iam|docker|k8s|kubernetes/i.test(text);
  if (a.includes('binary') || a.includes('pwn')) return /bof|buffer overflow|pwn|rop|heap|stack|shellcode|binary/i.test(text);
  if (a.includes('crypto')) return /crypto|cipher|rsa|aes|padding|hash|jwt|encoding/i.test(text);
  if (a.includes('revers')) return /reversing|reverse engineering|decompile|ghidra|ida|radare|crack/i.test(text);
  if (a.includes('forensic')) return /forensics|wireshark|pcap|volatility|memory|stego/i.test(text);
  if (a.includes('network')) return /network|snmp|smb|ldap|pivoting|tunnel|port knocking|firewall/i.test(text);
  return text.includes(a);
};

const matchesTechnique = (m: Machine, technique: string): boolean => {
  const t = technique.toLowerCase();
  const text = searchableText(m);
  if (t.includes('suid') || t.includes('sgid')) return /suid|sgid|gtfobins/i.test(text);
  if (t.includes('sudo')) return /sudo|sudo -l|ld_preload|sudoers/i.test(text);
  if (t.includes('cron')) return /cron|wildcard|tar\b|rsync/i.test(text);
  if (t.includes('kernel')) return /kernel|dirty cow|cve-20/i.test(text);
  if (t.includes('capabilit')) return /cap_setuid|capabilities|getcap|setcap/i.test(text);
  if (t.includes('nfs')) return /nfs|no_root_squash|exports/i.test(text);
  if (t.includes('ssh')) return /ssh|id_rsa|authorized_keys/i.test(text);
  if (t.includes('docker')) return /docker|container breakout|docker\.sock/i.test(text);
  if (t.includes('log poison')) return /log poison|auth\.log|access\.log/i.test(text);
  if (t.includes('systemd')) return /systemd|service misconfig|\.service/i.test(text);
  if (t.includes('passwd') || t.includes('shadow')) return /passwd|shadow|writable/i.test(text);
  if (t.includes('kerberoast')) return /kerberoast|spn|tgs/i.test(text);
  if (t.includes('as-rep')) return /as-rep|asrep|dontreqpreauth/i.test(text);
  if (t.includes('dcsync')) return /dcsync|ntds|secretsdump|krbtgt/i.test(text);
  if (t.includes('seimpersonate') || t.includes('potato') || t.includes('printspoofer')) return /seimpersonate|juicypotato|printspoofer|godpotato|rottenpotato/i.test(text);
  if (t.includes('unquoted')) return /unquoted|service path/i.test(text);
  if (t.includes('alwaysinstall')) return /alwaysinstallelevated|msi/i.test(text);
  if (t.includes('dll')) return /dll hijack|dll search/i.test(text);
  if (t.includes('sam') || t.includes('lsass')) return /sam|system hive|lsass|mimikatz/i.test(text);
  if (t.includes('token') || t.includes('incognito')) return /token|incognito|impersonate/i.test(text);
  if (t.includes('bloodhound')) return /bloodhound|sharphound|shortest path/i.test(text);
  if (t.includes('gpo')) return /gpo|group policy/i.test(text);
  if (t.includes('laps')) return /laps/i.test(text);
  return text.includes(t);
};

/**
 * Compile the filter state into a predicate. Parsing the query and resolving tracks happen once, so the
 * returned function is cheap to run over a whole catalog. Cheap primitive checks run first.
 */
export const createMachineFilter = (
  filters: MachineFilters,
  ctx: MachineFilterContext = {},
): ((m: Machine) => boolean) => {
  const skip = new Set<FilterDimension>(ctx.skip);
  const on = (d: FilterDimension) => !skip.has(d);

  const parsedQuery = parseSearchQuery(filters.searchQuery ?? '');
  const hasQuery = on('search') && (parsedQuery.text !== '' || Object.keys(parsedQuery.filters).length > 0);
  const nowMs = ctx.nowMs ?? Date.now();
  const searchOpts = {
    isDue: (m: Machine) => !m.isActive && isDueForReview(m, nowMs),
    trackIds: (m: Machine) => PRACTICE_TRACKS.filter((t) => t.filterFn(m)).map((t) => t.id),
  };

  const platform = on('platform') ? filters.selectedPlatform : 'ALL';
  const difficulty = on('difficulty') ? filters.selectedDifficulty : 'ALL';
  const os = on('os') ? filters.selectedOs : 'ALL';
  const availability = on('availability') ? filters.selectedAvailability : 'ALL';
  const cert = on('cert') ? filters.selectedCert : 'ALL';
  const status = on('status') ? filters.selectedStatus || 'ALL' : 'ALL';
  const excludeAD = on('excludeAD') && Boolean(filters.excludeActiveDirectory);
  const vulnCategory = on('vulnCategory') ? filters.selectedVulnCategory : 'ALL';
  const domain = on('domain') ? ctx.domain ?? 'all' : 'all';
  const legacyCategory = on('category') ? filters.selectedCategory : 'ALL';
  const tags = on('tags') ? filters.selectedTags : [];
  const language = on('language') ? filters.selectedLanguage : 'ALL';
  const area = on('area') ? filters.selectedAreaOfInterest : 'ALL';
  const technique = on('technique') ? filters.selectedTechnique : 'ALL';

  // Union across all selected tracks; unknown ids (e.g. the 'MULTI' marker) resolve to nothing and are dropped.
  const activeTracks = (on('tracks') ? getActiveTrackIds(filters) : [])
    .map((id) => PRACTICE_TRACKS.find((t) => t.id === id))
    .filter(Boolean) as PracticeTrack[];

  return (m: Machine): boolean => {
    if (platform !== 'ALL' && m.platform !== platform) return false;
    if (difficulty !== 'ALL' && m.difficulty !== difficulty) return false;
    if (os && os !== 'ALL' && m.os !== os) return false;
    if (!matchesAvailability(m, availability)) return false;
    if (cert !== 'ALL' && !m.certifications.includes(cert)) return false;

    if (status !== 'ALL') {
      const done = isCompleted(m);
      if (status === 'UNCOMPLETED' && done) return false;
      if (status === 'FOOTHOLD' && m.status !== 'foothold') return false;
      if (status === 'COMPLETED' && !done) return false;
    }

    if (excludeAD && isActiveDirectory(m)) return false;

    if (domain !== 'all' && (!vulnCategory || vulnCategory === 'ALL')) {
      if (!matchesDomain(m, domain)) return false;
    }
    if (vulnCategory && vulnCategory !== 'ALL') {
      if (!matchesCategory(m, vulnCategory)) return false;
    }

    if (activeTracks.length > 0 && !activeTracks.some((t) => t.filterFn(m))) return false;

    if (hasQuery && !matchesSearchQuery(m, parsedQuery, searchOpts)) return false;

    if (legacyCategory && legacyCategory !== 'ALL') {
      const legacyTarget = legacyCategory === 'Binary / Pwn' ? 'Binary / BOF' : legacyCategory;
      if (!matchesCategory(m, legacyTarget)) return false;
    }

    if (tags.length > 0 && !tags.every((t) => m.tags.includes(t))) return false;

    if (language && language !== 'ALL' && !matchesLanguage(m, language)) return false;
    if (area && area !== 'ALL' && !matchesArea(m, area)) return false;
    if (technique && technique !== 'ALL' && !matchesTechnique(m, technique)) return false;

    return true;
  };
};

/** One-shot form of {@link createMachineFilter}. Prefer the compiled form when testing many machines. */
export const matchesFilters = (m: Machine, filters: MachineFilters, ctx?: MachineFilterContext): boolean =>
  createMachineFilter(filters, ctx)(m);
