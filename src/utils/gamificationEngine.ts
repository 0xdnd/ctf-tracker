import { Machine } from '../types';
import { 
  OperatorRank, 
  TrophyDefinition, 
  EvaluatedTrophy, 
  OperatorStatsSummary, 
  OperatorGamificationState 
} from '../types/gamification';
import { isDomainControllerBox, isActiveDirectoryBox } from './examComplianceUtils';

export const OPERATOR_RANKS: OperatorRank[] = [
  {
    tier: 1,
    title: 'NOVICE PROBE',
    minXp: 0,
    maxXp: 99,
    badgeColor: 'text-tertiary',
    accentBorder: 'border-slate-500/40',
    accentBg: 'bg-slate-500/10',
    iconName: 'Compass',
    description: 'Fresh operator initializing tactical reconnaissance and basic target probing.',
  },
  {
    tier: 2,
    title: 'SCRIPT INFILTRATOR',
    minXp: 100,
    maxXp: 299,
    badgeColor: 'text-callout-info-fg',
    accentBorder: 'border-sky-500/40',
    accentBg: 'bg-sky-500/10',
    iconName: 'Terminal',
    description: 'Capable of automated exploitation, service enumeration, and initial web footholds.',
  },
  {
    tier: 3,
    title: 'FOOTHOLD SPECIALIST',
    minXp: 300,
    maxXp: 699,
    badgeColor: 'text-cyber-cyan',
    accentBorder: 'border-cyan-500/40',
    accentBg: 'bg-cyan-500/10',
    iconName: 'Crosshair',
    description: 'Proficient in privilege escalation, payload weaponization, and credential discovery.',
  },
  {
    tier: 4,
    title: 'LATERAL PIVOT',
    minXp: 700,
    maxXp: 1499,
    badgeColor: 'text-callout-warn-fg',
    accentBorder: 'border-amber-500/40',
    accentBg: 'bg-amber-500/10',
    iconName: 'Layers',
    description: 'Specialist in multi-subnet tunneling, pivoting, and enterprise Active Directory chains.',
  },
  {
    tier: 5,
    title: 'DOMAIN DOMINATOR',
    minXp: 1500,
    maxXp: 2999,
    badgeColor: 'text-callout-tip-fg',
    accentBorder: 'border-purple-500/40',
    accentBg: 'bg-purple-500/10',
    iconName: 'Crown',
    description: 'Master of Kerberos exploitation, AD forest compromise, and hard-tier privilege escalation.',
  },
  {
    tier: 6,
    title: 'APEX CYBER OPERATOR',
    minXp: 3000,
    maxXp: null,
    badgeColor: 'text-cyber-emerald',
    accentBorder: 'border-emerald-500/40',
    accentBg: 'bg-emerald-500/10',
    iconName: 'Award',
    description: 'Elite operator possessing full-spectrum methodology mastery across all attack vectors.',
  },
];

export const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Achieve administrative/root compromise on your first target machine.',
    category: 'combat',
    xpReward: 25,
    icon: 'Flame',
    rarity: 'common',
    requirementHint: 'Root 1 machine',
  },
  {
    id: 'root_frenzy',
    title: 'Root Frenzy',
    description: 'Complete full root compromise on 10 unique target machines.',
    category: 'combat',
    xpReward: 50,
    icon: 'Zap',
    rarity: 'rare',
    requirementHint: 'Root 10 machines',
  },
  {
    id: 'halfway_century',
    title: 'Halfway Century',
    description: 'Root 50 target machines across HTB, THM, or Proving Grounds.',
    category: 'combat',
    xpReward: 100,
    icon: 'Target',
    rarity: 'epic',
    requirementHint: 'Root 50 machines',
  },
  {
    id: 'century_pwn',
    title: 'Century Pwn',
    description: 'Legendary achievement: Root 100 target machines.',
    category: 'combat',
    xpReward: 250,
    icon: 'Award',
    rarity: 'legendary',
    requirementHint: 'Root 100 machines',
  },
  {
    id: 'port_scout',
    title: 'Port Scout',
    description: 'Import or document Nmap port reconnaissance scans on at least 3 targets.',
    category: 'recon',
    xpReward: 25,
    icon: 'Radio',
    rarity: 'common',
    requirementHint: 'Import Nmap scans for 3 machines',
  },
  {
    id: 'subnet_sweeper',
    title: 'Subnet Sweeper',
    description: 'Conduct exhaustive Nmap port reconnaissance across 10 or more target machines.',
    category: 'recon',
    xpReward: 50,
    icon: 'Search',
    rarity: 'rare',
    requirementHint: 'Import Nmap scans for 10 machines',
  },
  {
    id: 'flag_hoarder',
    title: 'Flag Hoarder',
    description: 'Capture and submit 10 or more User or Root CTF proof flags.',
    category: 'combat',
    xpReward: 50,
    icon: 'Flag',
    rarity: 'rare',
    requirementHint: 'Submit 10 proof flags',
  },
  {
    id: 'flag_master',
    title: 'Flag Master',
    description: 'Amass an arsenal of 50 or more captured CTF proof flags.',
    category: 'combat',
    xpReward: 100,
    icon: 'ShieldCheck',
    rarity: 'epic',
    requirementHint: 'Submit 50 proof flags',
  },
  {
    id: 'ad_initiate',
    title: 'AD Initiate',
    description: 'Gain initial foothold access on an Active Directory domain target.',
    category: 'ad',
    xpReward: 25,
    icon: 'Layers',
    rarity: 'common',
    requirementHint: 'Foothold or Root 1 Active Directory machine',
  },
  {
    id: 'domain_slayer',
    title: 'Domain Slayer',
    description: 'Fully compromise Domain Controllers or complete 3 Active Directory machines.',
    category: 'ad',
    xpReward: 100,
    icon: 'Crown',
    rarity: 'epic',
    requirementHint: 'Root 3 Active Directory machines or Domain Controllers',
  },
  {
    id: 'kerberos_conqueror',
    title: 'Kerberos Conqueror',
    description: 'Capture or document Kerberos tickets, AS-REP roast, or Kerberoast hashes.',
    category: 'ad',
    xpReward: 50,
    icon: 'Key',
    rarity: 'rare',
    requirementHint: 'Log Kerberos/hash artifacts in quick notes or Vault',
  },
  {
    id: 'privesc_virtuoso',
    title: 'PrivEsc Virtuoso',
    description: 'Demonstrate deep exploitation skill by rooting 5 Hard or Insane difficulty machines.',
    category: 'mastery',
    xpReward: 100,
    icon: 'Sparkles',
    rarity: 'epic',
    requirementHint: 'Root 5 Hard or Insane machines',
  },
  {
    id: 'insane_apex',
    title: 'Insane Apex',
    description: 'Pwn an Insane-difficulty target machine to its core.',
    category: 'mastery',
    xpReward: 200,
    icon: 'Flame',
    rarity: 'legendary',
    requirementHint: 'Root 1 Insane machine',
  },
  {
    id: 'methodology_master',
    title: 'Methodology Master',
    description: 'Advance through attack methodology phases (Recon to Root) using the checklist.',
    category: 'lore',
    xpReward: 25,
    icon: 'CheckCircle2',
    rarity: 'common',
    requirementHint: 'Check off 5 or more checklist methodology items on any machine',
  },
  {
    id: 'exam_gladiator',
    title: 'Exam Gladiator',
    description: 'Successfully conquer a 24-hour Exam Simulator session (OSCP, CPTS, or CRTO).',
    category: 'exam',
    xpReward: 150,
    icon: 'GraduationCap',
    rarity: 'epic',
    requirementHint: 'Pass a 24h exam simulation with >= passing score',
  },
  {
    id: 'vault_curator',
    title: 'Vault Curator',
    description: 'Catalogue and store 10 or more target credentials, hashes, or SSH keys in the Evidence Vault.',
    category: 'recon',
    xpReward: 50,
    icon: 'Database',
    rarity: 'rare',
    requirementHint: 'Accumulate 10 or more artifacts in Evidence & Loot Vault',
  },
];

export interface GamificationEvaluationInput {
  machines: Machine[];
  unlockedTrophies?: Record<string, string>; // trophyId -> ISOString
  examsPassed?: number;
  customLootCount?: number;
  notesCount?: number;
}

/**
 * Pure, deterministic evaluation function that aggregates operator performance,
 * computes total XP, assigns ranks, and verifies trophy progress.
 */
export function evaluateOperatorGamification(
  input: GamificationEvaluationInput
): OperatorGamificationState {
  const { 
    machines = [], 
    unlockedTrophies = {}, 
    examsPassed = 0, 
    customLootCount = 0,
    notesCount = 0 
  } = input;

  // 1. Compute Base Machine & Recon Stats
  let rootedCount = 0;
  let footholdCount = 0;
  let userFlagsCount = 0;
  let rootFlagsCount = 0;
  let nmapScansCount = 0;
  let adBoxesPwned = 0;
  let easyRoots = 0;
  let mediumRoots = 0;
  let hardRoots = 0;
  let insaneRoots = 0;
  let checklistItemsDone = 0;
  let hasKerberosNote = false;

  for (let i = 0; i < machines.length; i++) {
    const m = machines[i];
    const isRoot = m.status === 'root' || m.status === 'completed';
    const isFoothold = m.status === 'foothold';

    if (isRoot) {
      rootedCount++;
      const diff = (m.difficulty || '').toLowerCase();
      if (diff === 'easy') easyRoots++;
      else if (diff === 'medium') mediumRoots++;
      else if (diff === 'hard') hardRoots++;
      else if (diff === 'insane') insaneRoots++;
    } else if (isFoothold) {
      footholdCount++;
    }

    if (m.userFlag || m.userPwnedAt) userFlagsCount++;
    if (m.rootFlag || m.rootPwnedAt) rootFlagsCount++;

    if ((m.openPorts && m.openPorts.length > 0) || (m.services && m.services.length > 0) || Boolean(m.rawScanOutput)) {
      nmapScansCount++;
    }

    const isAD = Boolean(
      (m.tags && m.tags.some((t) => t.toLowerCase().includes('active directory') || t.toLowerCase() === 'ad' || t.toLowerCase().includes('kerberos'))) ||
      m.name?.toLowerCase().includes('dc') ||
      m.quickNotes?.toLowerCase().includes('active directory')
    );

    if (isAD && (isRoot || isFoothold)) {
      adBoxesPwned++;
    }

    if (m.checklist) {
      const items = Object.values(m.checklist);
      checklistItemsDone += items.filter((st) => st === 'completed').length;
    }

    if (m.quickNotes && /krb5|kerberos|asrep|kerberoast|ticket|golden ticket/i.test(m.quickNotes)) {
      hasKerberosNote = true;
    }
  }

  const totalFlags = userFlagsCount + rootFlagsCount;
  const vaultLootTotal = customLootCount + totalFlags;

  // 2. XP Calculation Formula
  // - Foothold: 10 XP
  // - Easy Root: 20 XP
  // - Medium Root: 40 XP
  // - Hard Root: 70 XP
  // - Insane Root: 100 XP
  // - Flag: 5 XP each
  // - Nmap scan: 5 XP each
  // - AD machine pwn: 25 XP bonus
  // - Exam passed: 100 XP each
  let calculatedXp = 
    (footholdCount * 10) +
    (easyRoots * 20) +
    (mediumRoots * 40) +
    (hardRoots * 70) +
    (insaneRoots * 100) +
    (totalFlags * 5) +
    (nmapScansCount * 5) +
    (adBoxesPwned * 25) +
    (examsPassed * 100);

  // 3. Resolve Current & Next Rank
  let currentRank = OPERATOR_RANKS[0];
  let nextRank: OperatorRank | null = OPERATOR_RANKS[1];

  for (let i = 0; i < OPERATOR_RANKS.length; i++) {
    const rank = OPERATOR_RANKS[i];
    if (calculatedXp >= rank.minXp) {
      currentRank = rank;
      nextRank = i < OPERATOR_RANKS.length - 1 ? OPERATOR_RANKS[i + 1] : null;
    }
  }

  let rankProgressPct = 100;
  if (nextRank) {
    const span = nextRank.minXp - currentRank.minXp;
    const earned = calculatedXp - currentRank.minXp;
    rankProgressPct = Math.min(100, Math.max(0, Math.round((earned / span) * 100)));
  }

  // 4. Evaluate Trophies
  const evaluatedTrophies: EvaluatedTrophy[] = TROPHY_DEFINITIONS.map((def) => {
    let currentCount = 0;
    let targetCount = 1;
    let unlocked = Boolean(unlockedTrophies[def.id]);

    switch (def.id) {
      case 'first_blood':
        targetCount = 1;
        currentCount = rootedCount;
        if (rootedCount >= 1) unlocked = true;
        break;
      case 'root_frenzy':
        targetCount = 10;
        currentCount = rootedCount;
        if (rootedCount >= 10) unlocked = true;
        break;
      case 'halfway_century':
        targetCount = 50;
        currentCount = rootedCount;
        if (rootedCount >= 50) unlocked = true;
        break;
      case 'century_pwn':
        targetCount = 100;
        currentCount = rootedCount;
        if (rootedCount >= 100) unlocked = true;
        break;
      case 'port_scout':
        targetCount = 3;
        currentCount = nmapScansCount;
        if (nmapScansCount >= 3) unlocked = true;
        break;
      case 'subnet_sweeper':
        targetCount = 10;
        currentCount = nmapScansCount;
        if (nmapScansCount >= 10) unlocked = true;
        break;
      case 'flag_hoarder':
        targetCount = 10;
        currentCount = totalFlags;
        if (totalFlags >= 10) unlocked = true;
        break;
      case 'flag_master':
        targetCount = 50;
        currentCount = totalFlags;
        if (totalFlags >= 50) unlocked = true;
        break;
      case 'ad_initiate':
        targetCount = 1;
        currentCount = adBoxesPwned;
        if (adBoxesPwned >= 1) unlocked = true;
        break;
      case 'domain_slayer':
        targetCount = 3;
        currentCount = adBoxesPwned;
        if (adBoxesPwned >= 3) unlocked = true;
        break;
      case 'kerberos_conqueror':
        targetCount = 1;
        currentCount = hasKerberosNote ? 1 : 0;
        if (hasKerberosNote) unlocked = true;
        break;
      case 'privesc_virtuoso':
        targetCount = 5;
        currentCount = hardRoots + insaneRoots;
        if (currentCount >= 5) unlocked = true;
        break;
      case 'insane_apex':
        targetCount = 1;
        currentCount = insaneRoots;
        if (insaneRoots >= 1) unlocked = true;
        break;
      case 'methodology_master':
        targetCount = 5;
        currentCount = checklistItemsDone;
        if (checklistItemsDone >= 5) unlocked = true;
        break;
      case 'exam_gladiator':
        targetCount = 1;
        currentCount = examsPassed;
        if (examsPassed >= 1) unlocked = true;
        break;
      case 'vault_curator':
        targetCount = 10;
        currentCount = vaultLootTotal;
        if (vaultLootTotal >= 10) unlocked = true;
        break;
      default:
        break;
    }

    const progress = Math.min(100, Math.round((Math.min(currentCount, targetCount) / targetCount) * 100));

    return {
      definition: def,
      unlocked,
      unlockedAt: unlockedTrophies[def.id],
      progress,
      currentCount,
      targetCount,
    };
  });

  const unlockedCount = evaluatedTrophies.filter((t) => t.unlocked).length;

  return {
    totalXp: calculatedXp,
    currentRank,
    nextRank,
    rankProgressPct,
    stats: {
      totalMachines: machines.length,
      rootedMachines: rootedCount,
      footholdMachines: footholdCount,
      userFlags: userFlagsCount,
      rootFlags: rootFlagsCount,
      totalFlags,
      nmapScansCount,
      adBoxesPwned,
      easyRoots,
      mediumRoots,
      hardRoots,
      insaneRoots,
      examsPassed,
      notesCount,
      vaultLootCount: vaultLootTotal,
    },
    trophies: evaluatedTrophies,
    unlockedCount,
    totalTrophiesCount: evaluatedTrophies.length,
  };
}

/**
 * Compares current persistent trophy unlock timestamps against newly evaluated trophies.
 * Returns newly unlocked trophies along with updated persistent map.
 */
export function syncOperatorTrophies(
  existingUnlocked: Record<string, string> = {},
  evaluated: EvaluatedTrophy[]
): {
  updatedTrophies: Record<string, string>;
  newlyUnlocked: TrophyDefinition[];
} {
  const updated: Record<string, string> = { ...existingUnlocked };
  const newlyUnlocked: TrophyDefinition[] = [];
  const now = new Date().toISOString();

  evaluated.forEach((t) => {
    if (t.unlocked && !updated[t.definition.id]) {
      updated[t.definition.id] = now;
      newlyUnlocked.push(t.definition);
    }
  });

  return {
    updatedTrophies: updated,
    newlyUnlocked,
  };
}
