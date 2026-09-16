export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  profiles: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  guestDataMigrated: boolean;
  googleClientId: string | null;
  
  // Actions
  setGoogleClientId: (clientId: string) => void;
  loginAsOperator: (name: string, email?: string, avatarUrl?: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithGoogleUserInfo: (userInfo: { sub: string; email: string; name: string; picture?: string }, token: string) => Promise<void>;
  switchProfile: (profileId: string) => void;
  createProfile: (name: string, email?: string, avatarUrl?: string) => void;
  renameProfile: (newName: string) => void;
  deleteProfile: (profileId: string) => void;
  logout: () => void;
  migrateGuestData: () => Promise<{ success: boolean; count: number }>;
  checkSession: () => Promise<void>;
}
