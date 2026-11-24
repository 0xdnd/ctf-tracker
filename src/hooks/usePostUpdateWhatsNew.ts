import { useEffect, useRef } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../onboarding/useOnboardingStore';
import { useUpdateUiStore } from '../store/useUpdateUiStore';
import { APP_VERSION } from '../utils/appVersion';
import {
  computeWhatsNewDiff,
  fetchReleaseManifest,
  mergeReleaseManifest,
  readSeenRelease,
  writeSeenRelease,
} from '../utils/whatsNewDiff';
import type { Machine } from '../types';

/** True when a blocking flow (active exam, guided tour, or another modal) should defer automatic update popups. */
export function isOperatorInterruptSensitive(): boolean {
  const examStatus = useExamStore.getState().status;
  if (examStatus === 'running') return true;
  const onboarding = useOnboardingStore.getState();
  if (onboarding.tourActive || onboarding.guide || onboarding.guideCenterOpen) return true;
  const ctf = useCtfStore.getState();
  if (
    ctf.selectedMachineId ||
    ctf.commandPaletteOpen ||
    ctf.newMachineModalOpen ||
    ctf.backupModalOpen ||
    ctf.reconAutomationModalOpen ||
    ctf.reportMachineId ||
    ctf.assignIpMachineId ||
    ctf.operatorModalOpen ||
    ctf.licenseModalOpen ||
    ctf.notesImportModalOpen ||
    ctf.flexCardModalOpen ||
    ctf.shortcutsModalOpen ||
    ctf.settingsModalOpen ||
    ctf.revShellModalOpen ||
    ctf.snippetsDrawerOpen
  ) {
    return true;
  }
  if (useAuthStore.getState().operatorProfileModalOpen) return true;
  return false;
}

/** Opens the What's New dialog on demand (e.g. from the About modal). */
export async function openManualWhatsNew(machines: readonly Machine[]): Promise<void> {
  const activePoolCount = machines.filter((m) => !m.isCustom && m.isActive).length;
  const manifest = await fetchReleaseManifest(false);
  const payload = mergeReleaseManifest(null, manifest, APP_VERSION, activePoolCount, 'manual');
  useUpdateUiStore.getState().openWhatsNew(payload);
}

/**
 * Checks once per session after the catalog loads whether the app version or machine catalog
 * changed since the operator's previous visit. Brand-new visitors silently seed their baseline;
 * returning visitors see a single concise What's New modal once they are not in an exam or tour.
 */
export function usePostUpdateWhatsNew(enabled: boolean): void {
  const isCatalogLoaded = useCtfStore((s) => s.isCatalogLoaded);
  const machines = useCtfStore((s) => s.machines);
  const examStatus = useExamStore((s) => s.status);
  const tourActive = useOnboardingStore((s) => s.tourActive);
  const updateAvailableOpen = useUpdateUiStore((s) => s.updateAvailableOpen);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isCatalogLoaded || handledRef.current) return;
    const hasCatalogRows = machines.some((m) => !m.isCustom && m.platform !== 'Custom');
    if (!hasCatalogRows) return;

    const prev = readSeenRelease();
    const diff = computeWhatsNewDiff(prev, machines, APP_VERSION);

    if (diff.isFirstSeed) {
      writeSeenRelease(diff.nextSnapshot);
      handledRef.current = true;
      return;
    }

    if (!diff.hasAppUpdate && !diff.hasCatalogUpdate) {
      if (prev && prev.catalogFingerprint !== diff.nextSnapshot.catalogFingerprint) {
        writeSeenRelease(diff.nextSnapshot);
      }
      handledRef.current = true;
      return;
    }

    if (updateAvailableOpen || isOperatorInterruptSensitive()) {
      return;
    }

    let live = true;
    const activePoolCount = machines.filter((m) => !m.isCustom && m.isActive).length;
    void fetchReleaseManifest(false).then((manifest) => {
      if (
        !live ||
        handledRef.current ||
        isOperatorInterruptSensitive() ||
        useUpdateUiStore.getState().updateAvailableOpen ||
        useUpdateUiStore.getState().whatsNewOpen
      ) {
        return;
      }
      handledRef.current = true;
      writeSeenRelease(diff.nextSnapshot);
      const payload = mergeReleaseManifest(diff, manifest, APP_VERSION, activePoolCount, 'auto');
      useUpdateUiStore.getState().openWhatsNew(payload);
    });

    return () => {
      live = false;
    };
  }, [enabled, isCatalogLoaded, machines, examStatus, tourActive, updateAvailableOpen]);
}
