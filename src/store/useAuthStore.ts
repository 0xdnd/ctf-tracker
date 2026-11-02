import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState, OperatorLoginOptions } from '../types/auth';
import { playCyberSound } from '../utils/helpers';
import { useCtfStore, safeLocalStorage, getAttackGraphStorageKey, getCustomMachinesStorageKey } from './useCtfStore';
import { CYBER_AVATAR_PRESETS, getAvatarPresetById } from '../data/avatarPresets';
import { clearDeepProfileData } from '../utils/indexedDbDeepStorage';
import { deleteWorkspaceFromIdb } from '../utils/resilientStorage';
import { deleteProfileImages } from '../utils/imageStore';
import { removeLootState } from './lootPersistence';
import { syncStateKey } from '../utils/syncState';
import { clearUndoBatchesForProfile } from '../utils/undoBatchDb';
import { isSchemaWriteGated } from '../utils/schemaWriteGate';
import { toast } from './useToastStore';
import { BACKUP_GATED_MESSAGE } from './backupFile';

const AUTH_STORAGE_KEY = 'rootvector_auth_session';
const LEGACY_CLIENT_ID_STORAGE_KEY = 'rootvector_google_client_id';

export const DEFAULT_AVATAR_DATA_URI = CYBER_AVATAR_PRESETS[0].dataUri;

export const DEFAULT_DANIEL_PROFILE: User = {
  id: 'usr_daniel',
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

// Legacy Google sign-in leftovers: drop the old client-id key and strip retired fields from persisted state.
const stripLegacyGoogleFields = <T extends object>(u: T): T => {
  if (!u || typeof u !== 'object') return u;
  const { googleId: _googleId, ...rest } = u as T & { googleId?: unknown };
  return rest as T;
};

try {
  if (typeof window !== 'undefined') localStorage.removeItem(LEGACY_CLIENT_ID_STORAGE_KEY);
} catch {
  // storage unavailable
}

/**
 * Cross-tab signal that a profile was deleted. Sent explicitly (a one-shot storage write, which every other tab
 * receives as a `storage` event) because a missing key on its own cannot tell a deletion from a reset or a
 * storage clear, and acting on those would discard live work.
 */
export const PROFILE_DELETED_STORAGE_KEY = 'zerobox_profile_deleted';

/** Removes every stored copy of a profile. Idempotent; does nothing while this tab may not write. */
function purgeProfileStorage(profileId: string): void {
  if (typeof window === 'undefined' || isSchemaWriteGated()) return;
  // Multi-namespace purge. safeLocalStorage also drops a copy held in memory after a failed write.
  const keys = [
    `zerobox_operator_profile_${profileId}`,
    `specter_ctf_profile_${profileId}`,
    getCustomMachinesStorageKey(profileId),
    getAttackGraphStorageKey(profileId),
    syncStateKey(profileId),
  ];
  for (const key of keys) safeLocalStorage.removeItem(key);
  // Credentials and loot, including a copy held in memory after a quota failure.
  removeLootState(profileId);
  // IndexedDB copies. Each helper waits for the saves it already has in flight, so none lands afterwards.
  const warn = (err: unknown) => console.warn('[ZeroBox] Failed to clear IndexedDB data for profile', profileId, err);
  clearDeepProfileData(profileId).catch(warn);
  deleteWorkspaceFromIdb(`zb:workspace:${profileId}`).catch(warn);
  deleteProfileImages(profileId).catch(warn);
  clearUndoBatchesForProfile(profileId).catch(warn);
}

function announceProfileDeleted(profileId: string): void {
  try {
    // Set then removed at once: every send is a change from "absent", so every one raises a storage event.
    localStorage.setItem(PROFILE_DELETED_STORAGE_KEY, JSON.stringify({ profileId }));
    localStorage.removeItem(PROFILE_DELETED_STORAGE_KEY);
  } catch {
    /* storage unavailable: there are no other tabs to tell */
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profiles: [],
      isAuthenticated: false,
      isLoading: false,
      token: null,
      guestDataMigrated: false,
      operatorProfileModalOpen: false,

      setOperatorProfileModalOpen: (open: boolean) => {
        set({ operatorProfileModalOpen: open });
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

      // Atomically update any profile (active or inactive) in both profiles array and active user session
      updateProfile: (profileId: string, updates: Partial<User>) => {
        const cleanUpdates = { ...updates };
        if (cleanUpdates.name !== undefined) cleanUpdates.name = cleanUpdates.name.trim();
        if (cleanUpdates.callsign !== undefined) cleanUpdates.callsign = cleanUpdates.callsign.trim();
        cleanUpdates.updatedAt = new Date().toISOString();

        const currentProfiles = get().profiles;
        const exists = currentProfiles.some((p) => p.id === profileId);
        if (!exists) return;

        const updatedProfiles = currentProfiles.map((p) =>
          p.id === profileId ? { ...p, ...cleanUpdates } : p
        );

        const currentUser = get().user;
        const updatedUser = currentUser && currentUser.id === profileId
          ? { ...currentUser, ...cleanUpdates }
          : currentUser;

        set({ profiles: updatedProfiles, user: updatedUser });
        playCyberSound('click');
      },

      // Rename Active Profile (sets both name and callsign, or custom callsign)
      renameProfile: (newName: string, newCallsign?: string) => {
        const cleanName = newName.trim();
        if (!cleanName) return;

        const current = get().user;
        if (!current) return;

        const cleanCallsign = (newCallsign !== undefined ? newCallsign : cleanName).trim() || cleanName;

        get().updateProfile(current.id, {
          name: cleanName,
          callsign: cleanCallsign,
        });
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
        // Every deletion step below is a write. A write-gated tab cannot do them all (the IndexedDB deletes are
        // no-ops while gated), so it would half-delete: refuse before changing anything.
        if (isSchemaWriteGated()) {
          toast.error(BACKUP_GATED_MESSAGE, 'Delete blocked');
          return;
        }
        purgeProfileStorage(profileId);
        dropProfileFromSession(profileId);
        // Other tabs open on this profile must switch away without saving it back.
        announceProfileDeleted(profileId);
        playCyberSound('toggle');
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
          // A fresh stamp: guest's savedAt says nothing about this profile, and an older one would let the
          // destination's stale IndexedDB copy win at the next boot (restoreFromResilientCopy).
          localStorage.setItem(targetKey, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
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
      }),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Record<string, unknown>;
        const { googleClientId: _legacyClientId, ...rest } = p;
        const merged = { ...currentState, ...rest } as AuthState;
        if (merged.user) merged.user = stripLegacyGoogleFields(merged.user);
        if (Array.isArray(merged.profiles)) merged.profiles = merged.profiles.map(stripLegacyGoogleFields);
        return merged;
      },
    }
  )
);

/** Removes a deleted profile from this tab's session; when it was the active one, switches away from it. */
function dropProfileFromSession(profileId: string): void {
  const { user, profiles } = useAuthStore.getState();
  const remaining = profiles.filter((p) => p.id !== profileId);
  if (user?.id === profileId) {
    if (remaining.length > 0) {
      useAuthStore.setState({ user: remaining[0], profiles: remaining });
      // The outgoing profile is gone: saving it on the way out would write it straight back.
      useCtfStore.getState().loadProfileData(remaining[0].id, { skipSaveOutgoing: true });
    } else {
      useAuthStore.setState({ user: null, profiles: [], isAuthenticated: false, token: null });
      useCtfStore.getState().loadProfileData('guest', { skipSaveOutgoing: true });
    }
  } else {
    useAuthStore.setState({ profiles: remaining });
  }
}

/**
 * Another tab deleted a profile. Acts only on that explicit signal, only for a profile this tab knows, and
 * switches away without saving it. Anything else (a reset, a cleared store, a removed key) never reaches here.
 */
function handleProfileDeletedElsewhere(profileId: string | undefined): void {
  if (!profileId) return;
  const { user, profiles } = useAuthStore.getState();
  const wasActive = user?.id === profileId;
  if (!wasActive && !profiles.some((p) => p.id === profileId)) return;
  // Sweeps anything this tab wrote between the other tab's purge and this signal.
  purgeProfileStorage(profileId);
  dropProfileFromSession(profileId);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== PROFILE_DELETED_STORAGE_KEY || !event.newValue) return;
    try {
      handleProfileDeletedElsewhere(JSON.parse(event.newValue)?.profileId);
    } catch {
      /* not a deletion signal */
    }
  });
}
