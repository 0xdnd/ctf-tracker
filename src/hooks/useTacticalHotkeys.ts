import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCtfStore } from '../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../utils/helpers';
import { generateObsidianVaultZip } from '../utils/obsidianVaultExporter';
import { ViewMode } from '../types';

export function useTacticalHotkeys() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    setViewMode,
    machines,
    selectedMachineId,
    setSelectedMachineId,
    activeTargetId,
    setActiveTarget,
    isTimerRunning,
    startTimer,
    pauseTimer,
    toggleUserFlag,
    toggleRootFlag,
    setCommandPaletteOpen,
    setReconAutomationModalOpen,
    setShortcutsModalOpen,
    setBackupModalOpen,
    setFlexCardModalOpen,
    reportMachineId,
    setReportMachineId,
    setNotesImportModalOpen,
    setOperatorModalOpen,
    setLicenseModalOpen,
    currentProfileId,
    saveProfileData,
    cheatsheets,
    soundEnabled,
    zoomIn,
    zoomOut,
    setUiScale,
  } = useCtfStore(
    useShallow((s) => ({
      setViewMode: s.setViewMode,
      machines: s.machines,
      selectedMachineId: s.selectedMachineId,
      setSelectedMachineId: s.setSelectedMachineId,
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      setCommandPaletteOpen: s.setCommandPaletteOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setShortcutsModalOpen: s.setShortcutsModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      setFlexCardModalOpen: s.setFlexCardModalOpen,
      reportMachineId: s.reportMachineId,
      setReportMachineId: s.setReportMachineId,
      setNotesImportModalOpen: s.setNotesImportModalOpen,
      setOperatorModalOpen: s.setOperatorModalOpen,
      setLicenseModalOpen: s.setLicenseModalOpen,
      currentProfileId: s.currentProfileId,
      saveProfileData: s.saveProfileData,
      cheatsheets: s.cheatsheets,
      soundEnabled: s.soundEnabled,
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      setUiScale: s.setUiScale,
    }))
  );

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 0. Escape Key: Dismiss open modals / selections, but blur active inputs first
      if (e.key === 'Escape') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            activeEl.isContentEditable)
        ) {
          activeEl.blur();
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        setShortcutsModalOpen(false);
        setCommandPaletteOpen(false);
        setReconAutomationModalOpen(false);
        setBackupModalOpen(false);
        setFlexCardModalOpen(false);
        setReportMachineId(null);
        setNotesImportModalOpen(false);
        setOperatorModalOpen(false);
        setLicenseModalOpen(false);
        if (selectedMachineId) {
          setSelectedMachineId(null);
        }
        return;
      }

      // Tactical 1-Click Save (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        saveProfileData(currentProfileId);
        if (soundEnabled) playCyberSound('root');
        return;
      }

      // Executive Pre-Report Generator / Print Preview (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        const targetId = activeTargetId || selectedMachineId || (machines.length > 0 ? machines[0].id : null);
        if (targetId) {
          setReportMachineId(targetId);
          if (soundEnabled) playCyberSound('click');
        }
        return;
      }

      // Ignore single-character keybindings when active element is an input, textarea, or select
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // 1. Help / Shortcuts Cheat Sheet: '?' or Shift+'/'
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen(true);
        if (soundEnabled) playCyberSound('click');
        return;
      }

      // 2. View Mode Switchers: '1' -> Kanban, '2' -> Grid, '3' -> Table, '4' -> Graph
      if (['1', '2', '3', '4'].includes(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (location.pathname !== '/tracker' && location.pathname !== '/') {
          navigate('/tracker');
        }
        const viewMap: Record<string, ViewMode> = {
          '1': 'kanban',
          '2': 'grid',
          '3': 'table',
          '4': 'graph',
        };
        setViewMode(viewMap[e.key]);
        if (soundEnabled) playCyberSound('click');
        return;
      }

      // 3. Focus Search: '/'
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 4. Timer Play/Pause: 't'
      if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          if (isTimerRunning) {
            pauseTimer();
          } else {
            startTimer();
          }
          if (soundEnabled) playCyberSound('click');
          return;
        }
      }

      // 5. Open Scan & Payload Crafter: 'p'
      if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setReconAutomationModalOpen(true);
          if (soundEnabled) playCyberSound('click');
          return;
        }
      }

      // 6. 1-Click Export Obsidian Vault: 'v'
      if (e.key === 'v' || e.key === 'V') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          try {
            const zipBlob = await generateObsidianVaultZip(machines, cheatsheets);
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            link.download = `ZeroBox-Obsidian-Vault-${dateStr}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (soundEnabled) playCyberSound('root');
          } catch (err) {
            console.error('Failed to export Obsidian Vault via hotkey:', err);
          }
          return;
        }
      }

      // 7. Quick User Flag: 'u'
      if (e.key === 'u' || e.key === 'U') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey && activeTargetId) {
          e.preventDefault();
          toggleUserFlag(activeTargetId);
          if (soundEnabled) playCyberSound('flag');
          return;
        }
      }

      // 8. Quick Root Flag: 'r'
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey && activeTargetId) {
          e.preventDefault();
          toggleRootFlag(activeTargetId);
          if (soundEnabled) playCyberSound('root');
          return;
        }
      }

      // 9. Inspect Selected Target Modal: 'Space'
      if (e.key === ' ' && !selectedMachineId && activeTargetId) {
        e.preventDefault();
        setSelectedMachineId(activeTargetId);
        if (soundEnabled) playCyberSound('click');
        return;
      }

      // 10. Target Navigation: 'j' or 'Alt+ArrowDown' (Next Target), 'k' or 'Alt+ArrowUp' (Previous Target)
      if ((e.key === 'j' && !e.ctrlKey && !e.altKey && !e.metaKey) || (e.altKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentIndex = machines.findIndex((m) => m.id === activeTargetId);
        const nextIndex = currentIndex < machines.length - 1 ? currentIndex + 1 : 0;
        if (machines[nextIndex]) {
          setActiveTarget(machines[nextIndex].id);
          if (soundEnabled) playCyberSound('click');
        }
        return;
      }

      if ((e.key === 'k' && !e.ctrlKey && !e.altKey && !e.metaKey) || (e.altKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        const currentIndex = machines.findIndex((m) => m.id === activeTargetId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : machines.length - 1;
        if (machines[prevIndex]) {
          setActiveTarget(machines[prevIndex].id);
          if (soundEnabled) playCyberSound('click');
        }
        return;
      }

      // 11. UI Display Scale: '-' or '_' (Zoom Out / Smaller), '+' or '=' (Zoom In / Larger), '0' (Reset to 100%)
      if (e.key === '-' || e.key === '_') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          zoomOut();
          if (soundEnabled) playCyberSound('click');
          return;
        }
      }

      if (e.key === '+' || e.key === '=') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          zoomIn();
          if (soundEnabled) playCyberSound('click');
          return;
        }
      }

      if (e.key === '0') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setUiScale('normal');
          if (soundEnabled) playCyberSound('click');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    navigate,
    location.pathname,
    setViewMode,
    machines,
    selectedMachineId,
    setSelectedMachineId,
    activeTargetId,
    setActiveTarget,
    isTimerRunning,
    startTimer,
    pauseTimer,
    toggleUserFlag,
    toggleRootFlag,
    setCommandPaletteOpen,
    setReconAutomationModalOpen,
    setShortcutsModalOpen,
    setBackupModalOpen,
    setFlexCardModalOpen,
    setReportMachineId,
    setNotesImportModalOpen,
    setOperatorModalOpen,
    setLicenseModalOpen,
    currentProfileId,
    saveProfileData,
    cheatsheets,
    soundEnabled,
    zoomIn,
    zoomOut,
    setUiScale,
  ]);
}
