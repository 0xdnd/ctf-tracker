import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState, OperatorLoginOptions } from '../types/auth';
import { playCyberSound } from '../utils/helpers';
import { useCtfStore } from './useCtfStore';
import { CYBER_AVATAR_PRESETS, getAvatarPresetById } from '../data/avatarPresets';
import { clearDeepProfileData } from '../utils/indexedDbDeepStorage';

const AUTH_STORAGE_KEY = 'rootvector_auth_session';
const CLIENT_ID_STORAGE_KEY = 'rootvector_google_client_id';

export const DEFAULT_AVATAR_DATA_URI = CYBER_AVATAR_PRESETS[0].dataUri;

export const DEFAULT_DANIEL_PROFILE: User = {
  id: 'usr_daniel',
  googleId: '',
  email: 'daniel@operator.lab',
  name: 'Daniel',
  callsign: '0xdnd',
  role: 'Lead Penetration Tester',
  badgeColor: 'emerald',
  avatarId: 'glitch-skull',
  avatarUrl: CYBER_AVATAR_PRESETS[0].dataUri,
  unlockedTrophies: {},
  totalXp: 0,
  rankTier: 1,
  rankTitle: 'NOVICE PROBE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const PUBLIC_GOOGLE_CLIENT_ID = '495621757694-hvhvo2snbcmj12jat6srh679i1s7mpih.apps.googleusercontent.com';

const getInitialGoogleClientId = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (stored && stored.includes('.apps.googleusercontent.com')) return stored;
  }
  return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || PUBLIC_GOOGLE_CLIENT_ID;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profiles: [],
      isAuthenticated: false,
      isLoading: false,
      token: null,
      guestDataMigrated: false,
      googleClientId: getInitialGoogleClientId(),
      operatorProfileModalOpen: false,

      setOperatorProfileModalOpen: (open: boolean) => {
        set({ operatorProfileModalOpen: open });
      },

      setGoogleClientId: (clientId: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
        }
        set({ googleClientId: clientId });
      },

      // Simple Operator Profile Login (1-Click Seamless Login based on Callsign + Avatar)
      loginAsOperator: async (options: OperatorLoginOptions | string, emailArg?: string, avatarUrlArg?: string) => {
        set({ isLoading: true });
        try {
          const opts: OperatorLoginOptions = typeof options === 'string'
            ? { name: options, email: emailArg, avatarUrl: avatarUrlArg }
            : options;

          const cleanName = (opts.name || 'Daniel').trim();
          const cleanCallsign = (opts.callsign || cleanName).trim();
          const profileId = `usr_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'op'}`;
          const existing = get().profiles.find(
            (p) => p.id === profileId || p.name.toLowerCase() === cleanName.toLowerCase()
          );

          const resolvedAvatar = opts.avatarId 
            ? getAvatarPresetById(opts.avatarId) 
            : (existing?.avatarId ? getAvatarPresetById(existing.avatarId) : CYBER_AVATAR_PRESETS[0]);

          const user: User = existing ? {
            ...existing,
            name: cleanName,
            callsign: cleanCallsign,
            role: opts.role || existing.role || 'Tactical Operator',
            badgeColor: (opts.badgeColor as any) || existing.badgeColor || 'emerald',
            avatarId: opts.avatarId || existing.avatarId || 'glitch-skull',
            avatarUrl: opts.avatarUrl || resolvedAvatar.dataUri,
            updatedAt: new Date().toISOString(),
          } : {
            id: profileId,
            googleId: '',
            email: opts.email?.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@operator.lab`,
            name: cleanName,
            callsign: cleanCallsign,
            role: opts.role || 'Tactical Operator',
            badgeColor: (opts.badgeColor as any) || 'emerald',
            avatarId: opts.avatarId || 'glitch-skull',
            avatarUrl: opts.avatarUrl || resolvedAvatar.dataUri,
            unlockedTrophies: {},
            totalXp: 0,
            rankTier: 1,
            rankTitle: 'NOVICE PROBE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedProfiles = get().profiles.some((p) => p.id === user.id)
            ? get().profiles.map((p) => (p.id === user.id ? { ...p, ...user } : p))
            : [...get().profiles, user];

          set({
            user,
            profiles: updatedProfiles,
            token: `operator_token_${Date.now()}`,
            isAuthenticated: true,
            isLoading: false,
            operatorProfileModalOpen: false,
          });

          // Switch active CTF workspace to this profile's isolated data
          useCtfStore.getState().loadProfileData(user.id, {
            startFresh: opts.startFresh,
            cloneFromCurrent: opts.cloneFromCurrent,
          });
          playCyberSound('root');
        } catch (err) {
          console.error('Operator login error:', err);
          set({ isLoading: false });
        }
      },

      // Rename Active Profile
      renameProfile: (newName: string) => {
        const cleanName = newName.trim();
        if (!cleanName) return;

        const current = get().user;
        if (!current) return;

        const updated: User = { 
          ...current, 
          name: cleanName, 
          callsign: current.callsign === current.name ? cleanName : current.callsign,
          updatedAt: new Date().toISOString() 
        };
        const updatedProfiles = get().profiles.map((p) => (p.id === current.id ? updated : p));
        set({ user: updated, profiles: updatedProfiles });
        playCyberSound('click');
      },

      // Switch Profile
      switchProfile: (profileId: string) => {
        const found = get().profiles.find((p) => p.id === profileId);
        if (found) {
          set({ user: found, isAuthenticated: true, operatorProfileModalOpen: false });
          useCtfStore.getState().loadProfileData(found.id);
          playCyberSound('click');
        }
      },

      // Create new Profile
      createProfile: (options: OperatorLoginOptions | string) => {
        get().loginAsOperator(options);
      },

      // Delete Profile with full multi-namespace atomic cleanup
      deleteProfile: (profileId: string) => {
        const remaining = get().profiles.filter((p) => p.id !== profileId);
        if (typeof window !== 'undefined') {
          // Atomic multi-namespace purge
          localStorage.removeItem(`zerobox_operator_profile_${profileId}`);
          localStorage.removeItem(`specter_ctf_profile_${profileId}`);
          localStorage.removeItem(`zerobox_custom_machines_v1_${profileId}`);
          localStorage.removeItem(`zerobox_graph_state_${profileId}`);
          localStorage.removeItem(`zerobox_vault_custom_loot_v1_${profileId}`);
          clearDeepProfileData(profileId).catch((err) => {
            console.warn('[ZeroBox] Failed to clear IndexedDB deep storage for profile', profileId, err);
          });
        }

        if (get().user?.id === profileId) {
          if (remaining.length > 0) {
            set({ user: remaining[0], profiles: remaining });
            useCtfStore.getState().loadProfileData(remaining[0].id);
          } else {
            set({ user: DEFAULT_DANIEL_PROFILE, profiles: [DEFAULT_DANIEL_PROFILE], isAuthenticated: true });
            useCtfStore.getState().loadProfileData('usr_daniel');
          }
        } else {
          set({ profiles: remaining });
        }
        playCyberSound('toggle');
      },

      // Live Google Identity Services ID Token (JWT) Handler
      loginWithGoogleCredential: async (credential: string) => {
        set({ isLoading: true });
        try {
          const base64Url = credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);

          const user: User = {
            id: `usr_google_${decoded.sub}`,
            googleId: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email.split('@')[0],
            callsign: (decoded.name || decoded.email.split('@')[0]).replace(/\s+/g, '-'),
            role: 'Google Verified Operator',
            badgeColor: 'cyan',
            avatarId: 'terminal-sentinel',
            avatarUrl: decoded.picture || CYBER_AVATAR_PRESETS[3].dataUri,
            unlockedTrophies: {},
            totalXp: 0,
            rankTier: 1,
            rankTitle: 'NOVICE PROBE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedProfiles = get().profiles.some((p) => p.id === user.id)
            ? get().profiles.map((p) => (p.id === user.id ? user : p))
            : [...get().profiles, user];

          set({
            user,
            profiles: updatedProfiles,
            token: credential,
            isAuthenticated: true,
            isLoading: false,
            operatorProfileModalOpen: false,
          });

          useCtfStore.getState().loadProfileData(user.id);
          playCyberSound('root');
        } catch (err) {
          console.error('Google OAuth credential processing error:', err);
          set({ isLoading: false });
        }
      },

      // Live Google OAuth 2.0 Access Token & UserInfo Handler
      loginWithGoogleUserInfo: async (userInfo, token) => {
        set({ isLoading: true });
        try {
          const user: User = {
            id: `usr_google_${userInfo.sub}`,
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name || userInfo.email.split('@')[0],
            callsign: (userInfo.name || userInfo.email.split('@')[0]).replace(/\s+/g, '-'),
            role: 'Google Verified Operator',
            badgeColor: 'cyan',
            avatarId: 'terminal-sentinel',
            avatarUrl: userInfo.picture || CYBER_AVATAR_PRESETS[3].dataUri,
            unlockedTrophies: {},
            totalXp: 0,
            rankTier: 1,
            rankTitle: 'NOVICE PROBE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedProfiles = get().profiles.some((p) => p.id === user.id)
            ? get().profiles.map((p) => (p.id === user.id ? user : p))
            : [...get().profiles, user];

          set({
            user,
            profiles: updatedProfiles,
            token,
            isAuthenticated: true,
            isLoading: false,
            operatorProfileModalOpen: false,
          });

          useCtfStore.getState().loadProfileData(user.id);
          playCyberSound('root');
        } catch (err) {
          console.error('Failed to log in with Google UserInfo:', err);
          set({ isLoading: false });
        }
      },

      // Logout and reset to unauthenticated guest
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          operatorProfileModalOpen: false,
        });

        useCtfStore.getState().loadProfileData('guest');
        playCyberSound('click');
      },

      // Migrate guest localStorage progress non-destructively
      migrateGuestData: async (targetProfileId?: string) => {
        if (typeof window === 'undefined') return { success: false, count: 0 };
        const destId = targetProfileId || get().user?.id || 'usr_daniel';
        try {
          // Search for guest data in modern or legacy keys
          const guestKeys = [
            'zerobox_operator_profile_guest',
            'specter_ctf_profile_guest',
            'specter_ctf_store_v2',
          ];
          let guestDataStr: string | null = null;
          for (const k of guestKeys) {
            const raw = localStorage.getItem(k);
            if (raw) {
              guestDataStr = raw;
              break;
            }
          }
          if (!guestDataStr) return { success: true, count: 0 };

          const parsed = JSON.parse(guestDataStr);
          const payload = parsed.state || parsed;
          const targetKey = `zerobox_operator_profile_${destId}`;
          localStorage.setItem(targetKey, JSON.stringify(payload));
          useCtfStore.getState().loadProfileData(destId);
          set({ guestDataMigrated: true });
          const count = Array.isArray(payload.machines) ? payload.machines.length : 0;
          return { success: true, count };
        } catch (err) {
          console.error('[ZeroBox] Failed to migrate guest data:', err);
          return { success: false, count: 0 };
        }
      },

      // Update operator trophies & XP
      updateUserTrophies: (trophies: Record<string, string>, xp?: number, rankTier?: number, rankTitle?: string) => {
        const current = get().user;
        if (!current) return;
        const updated: User = {
          ...current,
          unlockedTrophies: { ...(current.unlockedTrophies || {}), ...trophies },
          totalXp: xp !== undefined ? xp : current.totalXp,
          rankTier: rankTier !== undefined ? rankTier : current.rankTier,
          rankTitle: rankTitle !== undefined ? rankTitle : current.rankTitle,
          updatedAt: new Date().toISOString(),
        };
        const updatedProfiles = get().profiles.map((p) => (p.id === current.id ? updated : p));
        set({ user: updated, profiles: updatedProfiles });
      },

      // Verify session on app mount
      checkSession: async () => {
        const { user } = get();
        if (user) {
          useCtfStore.getState().loadProfileData(user.id);
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        profiles: state.profiles,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        guestDataMigrated: state.guestDataMigrated,
        googleClientId: state.googleClientId,
      }),
    }
  )
);
