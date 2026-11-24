import { create } from 'zustand';
import type { WhatsNewPayload } from '../utils/whatsNewDiff';

interface UpdateUiState {
  updateAvailableOpen: boolean;
  webUpdateWaiting: boolean;
  webReloadAction: (() => void) | null;
  whatsNewOpen: boolean;
  whatsNewPayload: WhatsNewPayload | null;
  setWebUpdateReady: (reloadAction: () => void, autoOpen?: boolean) => void;
  openUpdateAvailable: () => void;
  closeUpdateAvailable: () => void;
  triggerWebReload: () => void;
  openWhatsNew: (payload: WhatsNewPayload) => void;
  closeWhatsNew: () => void;
}

export const useUpdateUiStore = create<UpdateUiState>((set, get) => ({
  updateAvailableOpen: false,
  webUpdateWaiting: false,
  webReloadAction: null,
  whatsNewOpen: false,
  whatsNewPayload: null,

  setWebUpdateReady: (reloadAction, autoOpen = false) =>
    set((state) => ({
      webUpdateWaiting: true,
      webReloadAction: reloadAction,
      updateAvailableOpen: autoOpen ? true : state.updateAvailableOpen,
    })),

  openUpdateAvailable: () => set({ updateAvailableOpen: true }),
  closeUpdateAvailable: () => set({ updateAvailableOpen: false }),

  triggerWebReload: () => {
    const action = get().webReloadAction;
    set({ updateAvailableOpen: false });
    if (action) action();
  },

  openWhatsNew: (payload) => set({ whatsNewPayload: payload, whatsNewOpen: true }),
  closeWhatsNew: () => set({ whatsNewOpen: false }),
}));
