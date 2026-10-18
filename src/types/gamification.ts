export type OperatorRankTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface OperatorRank {
  tier: OperatorRankTier;
  title: string;
  minXp: number;
  maxXp: number | null;
  badgeColor: string;
  accentBorder: string;
  accentBg: string;
  iconName: string;
  description: string;
}

export type TrophyCategory = 'combat' | 'recon' | 'ad' | 'exam' | 'lore' | 'mastery';

export type TrophyRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface TrophyDefinition {
  id: string;
  title: string;
  description: string;
  category: TrophyCategory;
  xpReward: number;
  icon: string;
  rarity: TrophyRarity;
  requirementHint: string;
}

export interface EvaluatedTrophy {
  definition: TrophyDefinition;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100 percentage
  currentCount: number;
  targetCount: number;
}

export interface OperatorStatsSummary {
  totalMachines: number;
  rootedMachines: number;
  footholdMachines: number;
  userFlags: number;
  rootFlags: number;
  totalFlags: number;
  nmapScansCount: number;
  adBoxesPwned: number;
  easyRoots: number;
  mediumRoots: number;
  hardRoots: number;
  insaneRoots: number;
  examsPassed: number;
  notesCount: number;
  vaultLootCount: number;
}

export interface OperatorGamificationState {
  totalXp: number;
  currentRank: OperatorRank;
  nextRank: OperatorRank | null;
  rankProgressPct: number;
  stats: OperatorStatsSummary;
  trophies: EvaluatedTrophy[];
  unlockedCount: number;
  totalTrophiesCount: number;
}
