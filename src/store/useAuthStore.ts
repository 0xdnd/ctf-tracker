import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState } from '../types/auth';
import { playCyberSound } from '../utils/helpers';
import { useCtfStore } from './useCtfStore';

const AUTH_STORAGE_KEY = 'rootvector_auth_session';
const CLIENT_ID_STORAGE_KEY = 'rootvector_google_client_id';

export const DEFAULT_DANIEL_PROFILE: User = {
  id: 'usr_daniel',
  googleId: '',
  email: 'daniel@operator.lab',
  name: 'Daniel',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
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

      setGoogleClientId: (clientId: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
        }
        set({ googleClientId: clientId });
      },

      // Simple Operator Profile Login (1-Click Seamless Login)
      loginAsOperator: async (name: string, email?: string, avatarUrl?: string) => {
        set({ isLoading: true });
        try {
          const cleanName = name.trim() || 'Daniel';
          const profileId = `usr_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const existing = get().profiles.find(
            (p) => p.id === profileId || p.name.toLowerCase() === cleanName.toLowerCase()
          );

          const user: User = existing || {
            id: profileId,
            googleId: '',
            email: email?.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@operator.lab`,
            name: cleanName,
            avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const updatedProfiles = get().profiles.some((p) => p.id === user.id)
            ? get().profiles.map((p) => (p.id === user.id ? user : p))
            : [...get().profiles, user];

          set({
            user,
            profiles: updatedProfiles,
            token: `operator_token_${Date.now()}`,
            isAuthenticated: true,
            isLoading: false,
          });

          // Switch active CTF workspace to this profile's isolated data
          useCtfStore.getState().loadProfileData(user.id);
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

        const updated: User = { ...current, name: cleanName, updatedAt: new Date().toISOString() };
        const updatedProfiles = get().profiles.map((p) => (p.id === current.id ? updated : p));
        set({ user: updated, profiles: updatedProfiles });
        playCyberSound('click');
      },

      // Switch Profile
      switchProfile: (profileId: string) => {
        const found = get().profiles.find((p) => p.id === profileId);
        if (found) {
          set({ user: found, isAuthenticated: true });
          useCtfStore.getState().loadProfileData(found.id);
          playCyberSound('click');
        }
      },

      // Create new Profile
      createProfile: (name: string, email?: string, avatarUrl?: string) => {
        get().loginAsOperator(name, email, avatarUrl);
      },

      // Delete Profile
      deleteProfile: (profileId: string) => {
        const remaining = get().profiles.filter((p) => p.id !== profileId);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`specter_ctf_profile_${profileId}`);
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
            avatarUrl: decoded.picture,
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
            avatarUrl: userInfo.picture,
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
        });

        useCtfStore.getState().loadProfileData('guest');
        playCyberSound('click');
      },

      // Migrate guest localStorage progress
      migrateGuestData: async () => {
        return { success: true, count: 0 };
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
