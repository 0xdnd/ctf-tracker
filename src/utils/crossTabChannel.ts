/**
 * crossTabChannel.ts
 * The one cross-tab BroadcastChannel instance per tab. Dependency-free so both useCtfStore (sync messages) and
 * preMigrationBackup (restore lock messages) can use it without an import cycle. A BroadcastChannel never
 * receives its own posts, so sharing a single instance keeps a tab from reacting to its own messages.
 */
export const SYNC_CHANNEL_NAME = 'zerobox_cross_tab_sync';

export const syncChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;
