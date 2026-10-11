import { useEffect } from 'react';
import { useNotesWorkspaceStore, type VaultStatus } from '../store/useNotesWorkspaceStore';

/**
 * Subscribes to the lazy CPTS catalog status and kicks off the load on first use.
 * Components read the catalog only when the returned status is 'ready'.
 */
export function useCptsVault(): VaultStatus {
  const status = useNotesWorkspaceStore((s) => s.vaultStatus);
  const ensureVaultLoaded = useNotesWorkspaceStore((s) => s.ensureVaultLoaded);
  useEffect(() => {
    if (status === 'idle') void ensureVaultLoaded();
  }, [status, ensureVaultLoaded]);
  return status;
}
