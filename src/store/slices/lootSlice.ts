import type { StateCreator } from 'zustand';
import {
  Credential,
  CredAttempt,
  LootItem,
  NewCredentialInput,
  CredentialPatch,
  NewCredAttemptInput,
  NewLootItemInput,
  LootItemPatch,
} from '../../types';
import {
  saveLootState,
  buildCredential,
  findDuplicateCredential,
  patchCredential,
  upsertAttemptInList,
  buildLootItem,
  patchLootItem,
} from '../lootPersistence';
import { CtfStoreState, CtfBootData } from '../ctfStoreTypes';

/** Workspace store slice: credentials, credential attempts and loot items. */

export interface LootSliceState {
  // Credentials & Loot (per profile; persisted by lootPersistence, not by zustand persist)
  credentials: Credential[];
  credAttempts: CredAttempt[];
  lootItems: LootItem[];
  /** Returns the new credential's id, or the id of the existing one when the credKey already exists. */
  addCredential: (input: NewCredentialInput) => string;
  /** Returns false when the id is unknown or the edit would duplicate another real credential. */
  updateCredential: (id: string, patch: CredentialPatch) => boolean;
  deleteCredential: (id: string) => void;
  upsertCredAttempt: (attempt: NewCredAttemptInput) => string;
  deleteCredAttempt: (id: string) => void;
  addLootItem: (input: NewLootItemInput) => string;
  updateLootItem: (id: string, patch: LootItemPatch) => void;
  deleteLootItem: (id: string) => void;
  setLootVerification: (lootId: string, machineId: string, verification: { status: import('../../types').LootVerificationStatus; protocol?: string }) => void;
}

export const createLootSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], LootSliceState> => (set, get) => ({
  // Credentials & Loot (per-profile, loaded lazily with legacy migration)
  credentials: boot.initialLootData.credentials,

  credAttempts: boot.initialLootData.credAttempts,

  lootItems: boot.initialLootData.lootItems,

  // Credentials & Loot Actions: every mutation persists the active profile's loot immediately
  addCredential: (input) => {
    const cred = buildCredential(input);
    const existing = findDuplicateCredential(get().credentials, cred);
    if (existing) return existing.id;
    set((state) => {
      const credentials = [...state.credentials, cred];
      saveLootState(state.currentProfileId, { ...state, credentials });
      return { credentials };
    });
    return cred.id;
  },

  updateCredential: (id, patch) => {
    const credentials = patchCredential(get().credentials, id, patch);
    if (!credentials) return false;
    set((state) => {
      saveLootState(state.currentProfileId, { ...state, credentials });
      return { credentials };
    });
    return true;
  },

  deleteCredential: (id) => {
    set((state) => {
      const credentials = state.credentials.filter((c) => c.id !== id);
      const credAttempts = state.credAttempts.filter((a) => a.credId !== id);
      saveLootState(state.currentProfileId, { ...state, credentials, credAttempts });
      return { credentials, credAttempts };
    });
  },

  upsertCredAttempt: (input) => {
    const { list, attempt } = upsertAttemptInList(get().credAttempts, input);
    set((state) => {
      saveLootState(state.currentProfileId, { ...state, credAttempts: list });
      return { credAttempts: list };
    });
    return attempt.id;
  },

  deleteCredAttempt: (id) => {
    set((state) => {
      const credAttempts = state.credAttempts.filter((a) => a.id !== id);
      saveLootState(state.currentProfileId, { ...state, credAttempts });
      return { credAttempts };
    });
  },

  addLootItem: (input) => {
    const item = buildLootItem(input);
    set((state) => {
      const lootItems = [...state.lootItems, item];
      saveLootState(state.currentProfileId, { ...state, lootItems });
      return { lootItems };
    });
    return item.id;
  },

  updateLootItem: (id, patch) => {
    const lootItems = patchLootItem(get().lootItems, id, patch);
    if (!lootItems) return;
    set((state) => {
      saveLootState(state.currentProfileId, { ...state, lootItems });
      return { lootItems };
    });
  },

  deleteLootItem: (id) => {
    set((state) => {
      const lootItems = state.lootItems.filter((l) => l.id !== id);
      saveLootState(state.currentProfileId, { ...state, lootItems });
      return { lootItems };
    });
  },

  setLootVerification: (lootId, machineId, verification) => {
    const mid = (machineId || '').trim();
    if (!mid || !lootId) return;
    const now = new Date().toISOString();
    const vEntry = {
      status: verification.status,
      ...(verification.protocol ? { protocol: verification.protocol } : {}),
      updatedAt: now,
    };

    const creds = get().credentials;
    const cIdx = creds.findIndex((c) => c.id === lootId);
    if (cIdx !== -1) {
      const cred = creds[cIdx];
      const verifications = { ...(cred.verifications || {}), [mid]: vEntry };
      const credentials = [...creds];
      credentials[cIdx] = { ...cred, verifications };
      set((state) => {
        saveLootState(state.currentProfileId, { ...state, credentials });
        return { credentials };
      });
      return;
    }

    const items = get().lootItems;
    const lIdx = items.findIndex((l) => l.id === lootId);
    if (lIdx !== -1) {
      const item = items[lIdx];
      const verifications = { ...(item.verifications || {}), [mid]: vEntry };
      const lootItems = [...items];
      lootItems[lIdx] = { ...item, verifications };
      set((state) => {
        saveLootState(state.currentProfileId, { ...state, lootItems });
        return { lootItems };
      });
    }
  },
});
