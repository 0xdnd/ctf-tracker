import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

interface PendingConfirm {
  id: number;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface ConfirmStore {
  pending: PendingConfirm | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  settle: (value: boolean) => void;
}

let nextId = 1;

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  pending: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      // One dialog at a time: supersede any pending request as cancelled.
      get().pending?.resolve(false);
      set({ pending: { id: nextId++, options, resolve } });
    }),
  settle: (value) => {
    const current = get().pending;
    if (!current) return;
    set({ pending: null });
    current.resolve(value);
  },
}));

export const confirmAction = (options: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().open(options);

export const useConfirm = () => confirmAction;
