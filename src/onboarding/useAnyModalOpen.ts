import { useCtfStore } from '../store/useCtfStore';
import { useAuthStore } from '../store/useAuthStore';

/** True while any modal or slide-over drawer is open. Page hints stay hidden meanwhile. */
export function useAnyModalOpen(): boolean {
  const ctfOpen = useCtfStore((s) =>
    Boolean(
      s.selectedMachineId ||
        s.commandPaletteOpen ||
        s.newMachineModalOpen ||
        s.backupModalOpen ||
        s.reconAutomationModalOpen ||
        s.reportMachineId ||
        s.assignIpMachineId ||
        s.operatorModalOpen ||
        s.licenseModalOpen ||
        s.notesImportModalOpen ||
        s.flexCardModalOpen ||
        s.shortcutsModalOpen ||
        s.settingsModalOpen ||
        s.revShellModalOpen ||
        s.snippetsDrawerOpen,
    ),
  );
  const profileOpen = useAuthStore((s) => s.operatorProfileModalOpen);
  return ctfOpen || Boolean(profileOpen);
}
