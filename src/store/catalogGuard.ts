import { useCtfStore } from './useCtfStore';

export const CATALOG_NOT_LOADED_MESSAGE =
  'The machine catalog did not load (check your connection), so nothing was changed. Try again in a moment.';

/** Thrown by backup and sync exports when the catalog could not be loaded and the data would be incomplete. */
export class CatalogNotLoadedError extends Error {
  constructor() {
    super(CATALOG_NOT_LOADED_MESSAGE);
    this.name = 'CatalogNotLoadedError';
  }
}

/**
 * Backups, sync files and imports work on the catalog-merged machine list. loadCatalog() resolves even when the
 * load fails (it logs and leaves isCatalogLoaded false), so a caller that only awaits it would carry on against
 * the starter list: an export would silently leave the catalog rows out. Returns false when the load failed.
 */
export async function loadCatalogOrFail(): Promise<boolean> {
  await useCtfStore.getState().loadCatalog();
  return useCtfStore.getState().isCatalogLoaded;
}
