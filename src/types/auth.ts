export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string; // Operator Callsign / Display Name
  callsign?: string;
  role?: string;
  badgeColor?: 'emerald' | 'cyan' | 'amber' | 'crimson' | 'purple' | string;
  avatarId?: string; // Built-in SVG avatar identifier from CYBER_AVATAR_PRESETS
  avatarUrl?: string;
  unlockedTrophies?: Record<string, string>; // trophyId -> ISOString timestamp
  totalXp?: number;
  rankTier?: number;
  rankTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorLoginOptions {
  name: string;
  callsign?: string;
  email?: string;
  role?: string;
  badgeColor?: string;
  avatarId?: string;
  avatarUrl?: string;
  startFresh?: boolean;
  cloneFromCurrent?: boolean;
}

export interface AuthState {
  user: User | null;
  profiles: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  guestDataMigrated: boolean;
  googleClientId: string | null;
  operatorProfileModalOpen: boolean;
  
  // Actions
  setOperatorProfileModalOpen: (open: boolean) => void;
  setGoogleClientId: (clientId: string) => void;
  loginAsOperator: (options: OperatorLoginOptions | string, email?: string, avatarUrl?: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithGoogleUserInfo: (userInfo: { sub: string; email: string; name: string; picture?: string }, token: string) => Promise<void>;
  switchProfile: (profileId: string) => void;
  createProfile: (options: OperatorLoginOptions | string) => void;
  renameProfile: (newName: string) => void;
  deleteProfile: (profileId: string) => Promise<void> | void;
  logout: () => void;
  migrateGuestData: (targetProfileId?: string) => Promise<{ success: boolean; count: number }>;
  updateUserTrophies: (trophies: Record<string, string>, xp?: number, rankTier?: number, rankTitle?: string) => void;
  checkSession: () => Promise<void>;
}
