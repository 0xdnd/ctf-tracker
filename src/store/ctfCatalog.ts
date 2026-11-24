import { Machine, PipelineStatus } from '../types';
import { STARTER_MACHINES } from '../data/starterMachines';
import {
  hasUserProgress,
  isGenuineCustom,
  LEGACY_CROSS_PLATFORM_NAME_SLUGS,
  normalizeMachineSlug,
} from './machineNormalization';
import { ACTIVE_MACHINES } from '../data/activeMachines';
import { getLoadedMachinesCatalog } from '../data/loadMachinesCatalog';
import { sanitizeActiveMachine } from './ctfMachineHelpers';

/** Workspace store: catalog merge (stored machines + catalog rows) and the lean persisted machine shape. */

/** Normalized slugs of the currently active HTB machines, derived from src/data/activeMachines.json. */
export const KNOWN_ACTIVE_SEASONAL_NAMES = new Set(
  ACTIVE_MACHINES.machines.map((m) => normalizeMachineSlug(m.name))
);

/**
 * Name-based active detection. Never applies to the operator's own custom targets (custom- id or
 * platform Custom): a custom "Management" is their data, not the HTB machine, and must keep its notes.
 * Customs are only sanitized when explicitly marked isActive. Only HTB rows can match (a THM room
 * called "Stream" is not the HTB machine); names compare by slug so "Dark Zero Returns" matches.
 */
export const isKnownActiveByName = (m: Pick<Machine, 'id' | 'name' | 'platform'>): boolean =>
  m.platform === 'HTB' && !isGenuineCustom(m) && KNOWN_ACTIVE_SEASONAL_NAMES.has(normalizeMachineSlug(m.name));

export const CATALOG_MACHINE_ALIASES: Record<string, string> = {
  // Legacy or alternate IDs mapped to canonical catalog machine IDs
  'devel-box': 'htb-devel',
  'devel': 'htb-devel',
  'lame-box': 'htb-lame',
  'lame': 'htb-lame',
  'blue-box': 'htb-blue',
  'legacy-box': 'htb-legacy',
  'legacy': 'htb-legacy',
  'netmon-box': 'htb-netmon',
  'optimum-box': 'htb-optimum',
  'bashed-box': 'htb-bashed',
  'nibbles-box': 'htb-nibbles',
  'jerry-box': 'htb-jerry',
  'shocker-box': 'htb-shocker',
  'sau-box': 'htb-sau',
};

export const toLeanMachines = (machines: Machine[]): Machine[] => {
  if (!Array.isArray(machines)) return [];
  return machines
    .filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string')
    .map((m) => {
      // Preserve custom user-added machines completely (including user-entered hints, walkthroughs, etc.)
      if (m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))) {
        return { ...m, isCustom: true };
      }
      // For static catalog machines, strip heavy static content that is deterministically rehydrated by mergeMachinesWithCatalog
      const userFields = { ...m };
      delete userFields.officialWalkthrough;
      delete userFields.officialSynopsis;
      delete userFields.officialPdf;
      return userFields as Machine;
    });
};

const PG_TIER_TAGS = ['PG-Play', 'PG-Practice'];

/** Stored tags minus a stale PG tier tag: when the catalog row carries one tier tag, the other tier tag is dropped. */
const dropStaleTierTag = (stored: string[] | undefined, catalogTags: string[] | undefined): string[] => {
  const tier = PG_TIER_TAGS.find((t) => catalogTags?.includes(t));
  const tags = stored || [];
  return tier ? tags.filter((t) => !PG_TIER_TAGS.includes(t) || t === tier) : tags;
};

export const mergeMachinesWithCatalog = (
  storedMachines?: Machine[],
  userSolvesReset: boolean = false,
  catalogSource?: Machine[]
): Machine[] => {
  const fullCatalog = catalogSource || getLoadedMachinesCatalog();
  const catalog = fullCatalog || STARTER_MACHINES;
  // Against the boot STARTER list an unmatched row may still be a real catalog machine: keep it as stored until
  // the full catalog merges, which then matches it or applies the normal drop rule. Dropping it here lost
  // user fields that hasUserProgress doesn't count (ip, tags, writeupUrl, ...), and loadCatalog saved the loss.
  const keepUnmatched = !fullCatalog;
  const map = new Map<string, Machine>();
  const nameMap = new Map<string, Machine>();
  const platformNameMap = new Map<string, Machine>();
  const platformSlugMap = new Map<string, Machine>();
  const slugMap = new Map<string, Machine>();
  const idSlugMap = new Map<string, Machine>();

  catalog.forEach((m) => {
    const entry = userSolvesReset
      ? {
          ...m,
          status: 'backlog' as const,
          userFlag: undefined,
          rootFlag: undefined,
          userPwnedAt: undefined,
          rootPwnedAt: undefined,
          timeSpentSeconds: 0,
          timeToUserSeconds: undefined,
          timeToRootSeconds: undefined,
        }
      : m;

    map.set(m.id, entry);
    const normName = m.name.toLowerCase().trim();
    const nameSlug = normalizeMachineSlug(m.name);
    const idSlug = normalizeMachineSlug(m.id);

    if (m.platform) {
      platformNameMap.set(`${m.platform}:${normName}`, entry);
      if (nameSlug) platformSlugMap.set(`${m.platform}:${nameSlug}`, entry);
    }
    // Platform-less name tiers. Pairs that predate the 2024-26 retired HTB rows keep the original
    // order rules (name: last wins, slug: first wins). For newer pairs an HTB row never displaces another
    // platform's row, so a legacy row without a platform keeps resolving to THM "Retro", not HTB "Retro".
    const legacyPair = LEGACY_CROSS_PLATFORM_NAME_SLUGS.has(nameSlug);
    // PG/VulnHub rows only fill an empty name/slug slot and are displaced by any other platform, so a stored
    // HTB/THM row matched by name alone never lands on a same-named PG/VulnHub row.
    const isOffsecOrVulnhub = m.platform === 'PG' || m.platform === 'VulnHub';
    const prevByName = nameMap.get(normName);
    const prevIsOffsecOrVulnhub = prevByName?.platform === 'PG' || prevByName?.platform === 'VulnHub';
    if (!prevByName || (isOffsecOrVulnhub ? false : prevIsOffsecOrVulnhub || legacyPair || m.platform !== 'HTB' || prevByName.platform === 'HTB')) {
      nameMap.set(normName, entry);
    }
    const prevBySlug = nameSlug ? slugMap.get(nameSlug) : undefined;
    const prevSlugIsOffsecOrVulnhub = prevBySlug?.platform === 'PG' || prevBySlug?.platform === 'VulnHub';
    if (
      nameSlug &&
      (!prevBySlug ||
        (!isOffsecOrVulnhub && prevSlugIsOffsecOrVulnhub) ||
        (!isOffsecOrVulnhub && !legacyPair && prevBySlug.platform === 'HTB' && m.platform !== 'HTB'))
    ) {
      slugMap.set(nameSlug, entry);
    }
    if (idSlug && !idSlugMap.has(idSlug)) {
      idSlugMap.set(idSlug, entry);
    }
  });

  if (Array.isArray(storedMachines) && storedMachines.length > 0) {
    storedMachines
      .filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string')
      .forEach((m) => {
        const normName = typeof m.name === 'string' ? m.name.toLowerCase().trim() : '';
        const nameSlug = normalizeMachineSlug(m.name);
        const idSlug = normalizeMachineSlug(m.id);

      // Multi-tier lookup to safeguard against catalog ID, name, or platform drift
      let catalogMachine = map.get(m.id);
      // True when the row matched by id or alias: the catalog then owns the descriptive fields (see catalogOwned).
      let matchedByIdOrAlias = Boolean(catalogMachine);
      // Operator-created machines only ever match by exact id; fuzzy tiers would fold e.g. a custom "Lame" into htb-lame.
      const genuineCustom = isGenuineCustom(m);

      if (!catalogMachine && !genuineCustom) {
        const idAliasTarget =
          (m.id && CATALOG_MACHINE_ALIASES[m.id]) ||
          (idSlug && CATALOG_MACHINE_ALIASES[idSlug]);
        const aliasTarget = idAliasTarget || (normName && CATALOG_MACHINE_ALIASES[normName]);
        if (aliasTarget) {
          catalogMachine = map.get(aliasTarget) || nameMap.get(aliasTarget.toLowerCase().trim());
          // Only an id alias counts; a name that happens to be an alias key is a name match and stays fuzzy.
          matchedByIdOrAlias = Boolean(catalogMachine && idAliasTarget);
        }
      }

      // A row without a platform still names one through a legacy "htb-"/"thm-" id prefix.
      const platform = m.platform || (/^htb-/i.test(m.id) ? 'HTB' : /^thm-/i.test(m.id) ? 'THM' : undefined);
      if (!catalogMachine && !genuineCustom && platform) {
        if (normName) catalogMachine = platformNameMap.get(`${platform}:${normName}`);
        if (!catalogMachine && nameSlug) catalogMachine = platformSlugMap.get(`${platform}:${nameSlug}`);
      }

      if (!catalogMachine && !genuineCustom && normName) {
        catalogMachine = nameMap.get(normName);
      }

      if (!catalogMachine && !genuineCustom && nameSlug) {
        catalogMachine = slugMap.get(nameSlug);
      }

      if (!catalogMachine && !genuineCustom && idSlug) {
        catalogMachine = idSlugMap.get(idSlug);
      }
      // Drop a stale "custom" stamp whenever any lookup tier matches a catalog machine on a non-genuine-custom row.
      const customFlag = catalogMachine && !genuineCustom ? { isCustom: undefined } : {};
      if (catalogMachine) {
        const isAuthoritativeActive = Boolean(catalogMachine.isActive || isKnownActiveByName(catalogMachine));
        // No UI edits these fields on a catalog row, so a stored copy is only ever stale. Fuzzy matches keep the stored values.
        const catalogOwned =
          matchedByIdOrAlias && !genuineCustom
            ? {
                name: catalogMachine.name,
                difficulty: catalogMachine.difficulty,
                os: catalogMachine.os,
                roomUrl: catalogMachine.roomUrl,
                platform: catalogMachine.platform,
              }
            : {};
        if (userSolvesReset) {
          // User started fresh: respect their current status (unsolved/foothold/completed) and progress without forcing catalog completed status
          const mStatus = m.status || 'backlog';
          const hasUserFlag = Boolean(m.userFlag?.trim());
          const hasRootFlag = Boolean(m.rootFlag?.trim());
          const isFootholdOrAbove = mStatus === 'foothold' || mStatus === 'root' || mStatus === 'completed';
          const isRootOrAbove = mStatus === 'root' || mStatus === 'completed';
          map.set(catalogMachine.id, {
            ...catalogMachine,
            ...m,
            ...customFlag,
            ...catalogOwned,
            isActive: isAuthoritativeActive,
            status: m.status || 'unsolved',
            userFlag: m.userFlag,
            rootFlag: m.rootFlag,
            userPwnedAt: isFootholdOrAbove || hasUserFlag ? m.userPwnedAt : undefined,
            rootPwnedAt: isRootOrAbove || hasRootFlag ? m.rootPwnedAt : undefined,
            timeSpentSeconds: m.timeSpentSeconds || 0,
            timeToUserSeconds: isFootholdOrAbove ? m.timeToUserSeconds : undefined,
            timeToRootSeconds: isRootOrAbove ? m.timeToRootSeconds : undefined,
            checklist: m.checklist || catalogMachine.checklist || { openPorts: [], activeItemId: null, itemsState: {} },
            openPorts: m.openPorts || catalogMachine.openPorts || [],
            quickNotes: m.quickNotes || catalogMachine.quickNotes,
            writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
            hint: catalogMachine.hint || m.hint,
            skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
            officialPdf: catalogMachine.officialPdf || m.officialPdf,
            officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
            officialWalkthrough: undefined,
            tags: Array.from(new Set([...(catalogMachine.tags || []), ...dropStaleTierTag(m.tags, catalogMachine.tags)])),
            certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as Machine['certifications'],
          });
        } else {
          // Clean slate baseline: Catalog metadata is decoupled from candidate solve history.
          // Candidate solve state is derived strictly from operator progress.
          const mStatus: PipelineStatus = m.status || 'backlog';
          const hasUserFlag = Boolean(m.userFlag?.trim());
          const hasRootFlag = Boolean(m.rootFlag?.trim());
          const isFootholdOrAbove = mStatus === 'foothold' || mStatus === 'root' || mStatus === 'completed';
          const isRootOrAbove = mStatus === 'root' || mStatus === 'completed';
          const userHasProgress = mStatus !== 'backlog' || hasUserProgress(m);

          map.set(catalogMachine.id, {
            ...catalogMachine,
            ...m,
            ...customFlag,
            ...catalogOwned,
            isActive: isAuthoritativeActive,
            status: userHasProgress ? mStatus : 'backlog',
            userFlag: m.userFlag || '',
            rootFlag: m.rootFlag || '',
            userPwnedAt: isFootholdOrAbove || hasUserFlag ? m.userPwnedAt : undefined,
            rootPwnedAt: isRootOrAbove || hasRootFlag ? m.rootPwnedAt : undefined,
            timeSpentSeconds: m.timeSpentSeconds || 0,
            timeToUserSeconds: isFootholdOrAbove ? m.timeToUserSeconds : undefined,
            timeToRootSeconds: isRootOrAbove ? m.timeToRootSeconds : undefined,
            checklist: m.checklist || catalogMachine.checklist || { openPorts: [], activeItemId: null, itemsState: {} },
            openPorts: m.openPorts || catalogMachine.openPorts || [],
            quickNotes: m.quickNotes || catalogMachine.quickNotes,
            writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
            hint: catalogMachine.hint || m.hint,
            skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
            officialPdf: catalogMachine.officialPdf || m.officialPdf,
            officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
            officialWalkthrough: undefined,
            tags: Array.from(new Set([...(catalogMachine.tags || []), ...dropStaleTierTag(m.tags, catalogMachine.tags)])),
            certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as Machine['certifications'],
          });
        }
      } else if (m.isCustom || genuineCustom || keepUnmatched || hasUserProgress(m)) {
        // Genuine custom machine, legacy isCustom row, or catalog machine (not in the loaded catalog yet) with
        // user progress: keep the row as stored. Only genuine customs get the flag (same rule as toLeanMachines);
        // never stamp anything else (it would stick once the full catalog matches) and never remove a stamp
        // (a legacy custom without progress would then be dropped on the next merge).
        map.set(m.id, genuineCustom ? { ...m, isCustom: true } : { ...m });
      }
    });
  }

  // Enforce Hack The Box Terms of Service compliance: Active machines MUST ONLY have name and room link (no spoilers/recon)
  map.forEach((machine) => {
    if (!isGenuineCustom(machine)) {
      machine.isActive = Boolean(machine.isActive && isKnownActiveByName(machine));
    }
    if (machine.isActive) {
      Object.assign(machine, sanitizeActiveMachine(machine));
    }
  });

  // Priority ordering: User-added custom machines are anchored at the very TOP (index 0) of the collection
  const customEntries: Machine[] = [];
  const catalogEntries: Machine[] = [];

  for (const m of map.values()) {
    if (m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))) {
      customEntries.push(m);
    } else {
      catalogEntries.push(m);
    }
  }

  return [...customEntries, ...catalogEntries];
};
