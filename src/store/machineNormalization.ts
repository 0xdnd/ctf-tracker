import type { Machine } from '../types';

/**
 * Pure machine-normalization predicates shared by mergeMachinesWithCatalog and storage helpers.
 * Dependency-free so they can be unit tested and imported without booting the store.
 */

/** Lowercase alphanumeric slug of a machine name or id ("Dark Zero" -> "darkzero"). */
export const normalizeMachineSlug = (str?: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * A machine the operator created themselves (addCustomMachine always mints a `custom-` id; multi-host
 * scan imports use platform 'Custom'). Deliberately does NOT look at the `isCustom` flag: older builds
 * stamped that flag onto catalog machines that had progress, so the flag alone is not trustworthy.
 */
export const isGenuineCustom = (m: Partial<Machine> | null | undefined): boolean =>
  Boolean(m && ((typeof m.id === 'string' && m.id.startsWith('custom-')) || m.platform === 'Custom'));

const hasText = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;
const hasItems = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

/**
 * Derived (never stored) answer to "has the operator touched this machine?". Unifies the former
 * catalog-matched and unmatched progress checks, and also counts operator-only recon data
 * (ports, services, scans, checklist, rating) that the catalog never carries, so an otherwise
 * idle backlog machine holding scan results is not dropped while only STARTER_MACHINES is loaded.
 */
export const hasUserProgress = (m: Partial<Machine> | null | undefined): boolean => {
  if (!m) return false;
  const status = m.status as string | undefined;
  if (status && status !== 'backlog' && status !== 'unsolved') return true;
  if (hasText(m.userFlag) || hasText(m.rootFlag)) return true;
  if (typeof m.timeSpentSeconds === 'number' && m.timeSpentSeconds > 0) return true;
  if (hasText(m.quickNotes) || hasText(m.writeupMarkdown)) return true;
  if (hasText(m.userPwnedAt) || hasText(m.rootPwnedAt)) return true;
  if (hasItems(m.openPorts) || hasItems(m.services)) return true;
  if (hasText(m.scanSummary) || hasText(m.rawScanOutput)) return true;
  if (typeof m.rating === 'number' && m.rating > 0) return true;
  if (hasText(m.perceivedDifficulty)) return true;
  const cl = m.checklist;
  if (cl && typeof cl === 'object') {
    if (hasItems(cl.openPorts) || cl.activeItemId) return true;
    if (cl.itemsState && typeof cl.itemsState === 'object' && Object.keys(cl.itemsState).length > 0) return true;
  }
  return false;
};
