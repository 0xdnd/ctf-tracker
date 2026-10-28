import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  AlertTriangle, 
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Package,
  Zap,
  Flame,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Terminal,
  HelpCircle,
  Shield,
  Lock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useCtfStore, type MergeBackupResult } from '../../store/useCtfStore';
import { Modal } from '../common/Modal';
import { confirmAction } from '../../store/useConfirmStore';
import PreUpdateSnapshots from './PreUpdateSnapshots';
import SyncConflictReview from './SyncConflictReview';
import type { ConflictChoice, SyncConflict, SyncMergeSummary } from '../../utils/syncMerge';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, triggerRootCelebration, safeCopyToClipboard } from '../../utils/helpers';
import { extractCandidateNames, matchCandidateNamesToCatalog } from '../../utils/bulkPwnImporter';
import { PipelineStatus } from '../../types';
import {
  BackupCryptoError,
  MIN_PASSPHRASE_LENGTH,
  WRONG_PASSPHRASE_MESSAGE,
  decryptBackup,
  encryptBackup,
  isCryptoAvailable,
  isEncryptedBackup,
  passphraseLength,
  passphraseStrength,
  type PassphraseStrength,
} from '../../utils/backupCrypto';
import { buildBackupFile, checkBackupIntegrity, importBackupFile, isV3BackupText } from '../../store/backupFile';
import { isChecksumAvailable } from '../../utils/backupChecksum';

const STRENGTH_LABEL: Record<PassphraseStrength, string> = {
  'too-short': 'Too short',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
};

const STRENGTH_CLASS: Record<PassphraseStrength, string> = {
  'too-short': 'text-callout-warn-fg',
  weak: 'text-callout-warn-fg',
  fair: 'text-secondary',
  strong: 'text-callout-success-fg',
};

const describeCryptoError = (err: unknown): string =>
  err instanceof BackupCryptoError ? err.message : WRONG_PASSPHRASE_MESSAGE;

const EXPORT_BUILD_ERROR = 'Could not read your notes from IndexedDB, so no backup was made. Try again.';

const MERGE_ERROR: Partial<Record<MergeBackupResult['status'], string>> = {
  invalid: 'Invalid backup format. Ensure it contains a valid "machines" array.',
  busy: 'Another ZeroBox tab is merging a sync file. Try again when it finishes.',
  gated: 'Writes are blocked in this tab (another tab is restoring or merging, or ZeroBox was updated). Reload and try again.',
  'snapshot-failed': 'Could not save a pre-sync snapshot, so nothing was merged. Free up storage and try again.',
};

const describeMergeSummary = (s: SyncMergeSummary): string => {
  const extra = [
    s.notesAdded && `${s.notesAdded} notes`,
    s.sessionsAdded && `${s.sessionsAdded} sessions`,
    s.edgesAdded && `${s.edgesAdded} graph links`,
    s.lootAdded && `${s.lootAdded} loot entries`,
  ].filter(Boolean);
  return `Added ${s.added}, updated ${s.updated}, removed ${s.removed}, conflicts resolved ${s.conflictsResolved}.${
    extra.length ? ` Also added ${extra.join(', ')}.` : ''
  }`;
};

const PASSPHRASE_INPUT_CLASS =
  'w-full p-2.5 rounded bg-surface-card border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/50 font-mono';

export const BackupModal: React.FC = () => {
  const {
    backupModalOpen,
    setBackupModalOpen,
    importBackup,
    exportSyncFile,
    mergeBackup,
    resetAllProgress,
    machines,
    cheatsheets,
    soundEnabled,
    batchUpdateMachineStatus,
    userSolvesReset,
    resetSolvesToZero,
    restoreDanielSolves,
  } = useCtfStore(
    useShallow((s) => ({
      backupModalOpen: s.backupModalOpen,
      setBackupModalOpen: s.setBackupModalOpen,
      importBackup: s.importBackup,
      exportSyncFile: s.exportSyncFile,
      mergeBackup: s.mergeBackup,
      resetAllProgress: s.resetAllProgress,
      machines: s.machines,
      cheatsheets: s.cheatsheets,
      soundEnabled: s.soundEnabled,
      batchUpdateMachineStatus: s.batchUpdateMachineStatus,
      userSolvesReset: s.userSolvesReset,
      resetSolvesToZero: s.resetSolvesToZero,
      restoreDanielSolves: s.restoreDanielSolves,
    }))
  );

  const [activeTab, setActiveTab] = useState<'backup' | 'bulk_pwn'>('backup');

  // A pre-update snapshot restore is writing storage and about to reload: Esc / close are disabled meanwhile.
  const [snapshotRestoring, setSnapshotRestoring] = useState(false);
  const requestClose = () => {
    if (snapshotRestoring || mergeBusy) return;
    setBackupModalOpen(false);
  };

  // JSON Backup / Restore State
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [redactSecrets, setRedactSecrets] = useState(false);
  const [isExportingVault, setIsExportingVault] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Optional passphrase encryption (export) and decryption (import)
  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportPassphraseConfirm, setExportPassphraseConfirm] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [exportError, setExportError] = useState('');
  const [cryptoBusy, setCryptoBusy] = useState<'export' | 'import' | null>(null);
  const cryptoBusyRef = useRef(false);
  const cryptoOpToken = useRef(0);

  // Import mode (Merge is the default) and the sync merge flow
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [syncExportNotice, setSyncExportNotice] = useState('');
  const [pendingMerge, setPendingMerge] = useState<{ payload: string; conflicts: SyncConflict[] } | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictChoice>>({});
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeResult, setMergeResult] = useState<
    Pick<Extract<MergeBackupResult, { status: 'merged' }>, 'summary' | 'legacy' | 'warnings' | 'snapshot'> | null
  >(null);
  const [snapshotListVersion, setSnapshotListVersion] = useState(0);
  const [mergeNotice, setMergeNotice] = useState('');

  // Bulk Pwn Importer State
  const [bulkInputText, setBulkInputText] = useState('');
  const [targetStatus, setTargetStatus] = useState<PipelineStatus>('completed');
  const [bulkApplied, setBulkApplied] = useState(false);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<'htb' | 'thm' | null>(null);

  const handleCopyHtbSnippet = async () => {
    const code = `copy(Array.from(document.querySelectorAll('a[href*="/machines/"]')).map(e => e.innerText.trim()).filter(n => n.length > 2 && !n.includes('\\n')).filter((v, i, a) => a.indexOf(v) === i).join('\\n')); console.log('Copied HTB machines to clipboard!');`;
    await safeCopyToClipboard(code);
    setCopiedSnippet('htb');
    setTimeout(() => setCopiedSnippet(null), 2000);
    if (soundEnabled) playCyberSound('copy');
  };

  const handleCopyThmSnippet = async () => {
    const code = `copy(Array.from(document.querySelectorAll('div, a, span')).map(e => e.innerText.trim()).filter(t => t.length > 2 && t.length < 30 && !t.includes('\\n')).filter((v, i, a) => a.indexOf(v) === i).join('\\n')); console.log('Copied THM rooms to clipboard!');`;
    await safeCopyToClipboard(code);
    setCopiedSnippet('thm');
    setTimeout(() => setCopiedSnippet(null), 2000);
    if (soundEnabled) playCyberSound('copy');
  };

  // Compute parsed candidates and matches
  const candidates = useMemo(() => extractCandidateNames(bulkInputText), [bulkInputText]);
  const parseResult = useMemo(() => matchCandidateNamesToCatalog(candidates, machines), [candidates, machines]);
  const solvedCount = useMemo(() => {
    return machines.filter((m) => m.status === 'completed' || m.status === 'foothold').length;
  }, [machines]);

  const cryptoAvailable = isCryptoAvailable();
  const importIsEncrypted = useMemo(() => isEncryptedBackup(importText), [importText]);

  // Drop secrets from memory and abandon any in-flight key derivation when the modal closes.
  useEffect(() => {
    if (!backupModalOpen) {
      cryptoOpToken.current += 1;
      cryptoBusyRef.current = false;
      setCryptoBusy(null);
      setExportPassphrase('');
      setExportPassphraseConfirm('');
      setImportPassphrase('');
      setExportError('');
      // A pending merge holds decrypted data: drop it (nothing was written).
      setPendingMerge(null);
      setResolutions({});
      setMergeResult(null);
      setSyncExportNotice('');
    }
  }, [backupModalOpen]);

  if (!backupModalOpen) return null;

  const encrypting = encryptExport && cryptoAvailable;
  const exportPassphraseLength = passphraseLength(exportPassphrase);
  const exportPassphraseTooShort = exportPassphrase.length > 0 && exportPassphraseLength < MIN_PASSPHRASE_LENGTH;
  const exportPassphraseMismatch =
    exportPassphraseConfirm.length > 0 &&
    exportPassphrase.normalize('NFC') !== exportPassphraseConfirm.normalize('NFC');
  const exportPassphraseValid =
    exportPassphraseLength >= MIN_PASSPHRASE_LENGTH &&
    exportPassphrase.normalize('NFC') === exportPassphraseConfirm.normalize('NFC');
  const exportBlocked = cryptoBusy !== null || (encrypting && !exportPassphraseValid);
  const strength = passphraseStrength(exportPassphrase);
  const exportPassphraseNotice = exportPassphraseTooShort
    ? `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`
    : exportPassphraseMismatch
      ? 'Passphrases do not match.'
      : '';

  /** Encrypts the current backup JSON; resolves null when blocked, abandoned, or failed. */
  const buildEncryptedExport = async (
    makePlaintext: () => string | Promise<string> = () => buildBackupFile({ redactSecrets })
  ): Promise<string | null> => {
    if (cryptoBusyRef.current || !exportPassphraseValid) return null;
    const token = ++cryptoOpToken.current;
    cryptoBusyRef.current = true;
    setExportError('');
    setCryptoBusy('export');
    try {
      const envelope = await encryptBackup(await makePlaintext(), exportPassphrase);
      return cryptoOpToken.current === token ? envelope : null;
    } catch (err) {
      if (cryptoOpToken.current === token) setExportError(describeCryptoError(err));
      return null;
    } finally {
      if (cryptoOpToken.current === token) {
        cryptoBusyRef.current = false;
        setCryptoBusy(null);
      }
    }
  };

  const triggerBackupDownload = (text: string, encrypted: boolean, kind: 'backup' | 'sync' = 'backup') => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const variant = encrypted ? 'encrypted_' : redactSecrets ? 'redacted_' : '';
    link.download = kind === 'sync' ? `zerobox_sync_${dateStr}.json` : `zerobox_ctf_backup_${variant}${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('root');
  };

  /** The full 3.0.0 plaintext (exam data, notes, checksum); null after reporting a failure. */
  const buildPlainExport = async (): Promise<string | null> => {
    if (cryptoBusyRef.current) return null;
    setExportError('');
    try {
      return await buildBackupFile({ redactSecrets });
    } catch (err) {
      console.error('Failed to build the backup file:', err);
      setExportError(EXPORT_BUILD_ERROR);
      return null;
    }
  };

  const handleDownloadBackup = async () => {
    if (!encrypting) {
      const text = await buildPlainExport();
      if (text !== null) triggerBackupDownload(text, false);
      return;
    }
    const envelope = await buildEncryptedExport();
    if (envelope !== null) {
      triggerBackupDownload(envelope, true);
      setExportPassphrase('');
      setExportPassphraseConfirm('');
    }
  };

  /** Sync files are always encrypted (never redacted): they carry everything another device needs to merge. */
  const handleExportSyncFile = async () => {
    if (!cryptoAvailable) return;
    if (!encrypting) {
      setEncryptExport(true);
      setExportError('');
      setSyncExportNotice('Sync files are always encrypted. Enter and confirm a passphrase above, then export again.');
      return;
    }
    setSyncExportNotice('');
    const envelope = await buildEncryptedExport(() => exportSyncFile());
    if (envelope !== null) {
      triggerBackupDownload(envelope, true, 'sync');
      setExportPassphrase('');
      setExportPassphraseConfirm('');
    }
  };

  const handleExportObsidianVault = async () => {
    try {
      setIsExportingVault(true);
      const { generateObsidianVaultZip } = await import('../../utils/obsidianVaultExporter');
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
      console.error('Failed to generate Obsidian Vault zip:', err);
    } finally {
      setIsExportingVault(false);
    }
  };

  const handleCopyBackup = async () => {
    const text = encrypting ? await buildEncryptedExport() : await buildPlainExport();
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setExportError('Could not write to the clipboard. Use Download instead.');
      return;
    }
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importText.trim() || cryptoBusyRef.current || mergeBusy || pendingMerge) return;
    setMergeResult(null);
    setMergeNotice('');
    let payload = importText;
    if (importIsEncrypted) {
      if (!importPassphrase) {
        setImportStatus('error');
        setErrorMessage('Enter the passphrase to decrypt this backup.');
        return;
      }
      const token = ++cryptoOpToken.current;
      cryptoBusyRef.current = true;
      setImportStatus('idle');
      setCryptoBusy('import');
      try {
        payload = await decryptBackup(importText, importPassphrase);
      } catch (err) {
        if (cryptoOpToken.current === token) {
          setImportStatus('error');
          setErrorMessage(describeCryptoError(err));
        }
        return;
      } finally {
        if (cryptoOpToken.current === token) {
          cryptoBusyRef.current = false;
          setCryptoBusy(null);
        }
      }
      if (cryptoOpToken.current !== token) return;
    }
    setImportWarnings([]);
    // 3.0.0 files are checksum-verified before anything is merged or replaced.
    if (isV3BackupText(payload)) {
      await runVerifiedImport(payload);
      return;
    }
    if (importMode === 'merge') {
      await runMerge(payload);
      return;
    }
    try {
      const success = importBackup(payload);
      if (success) {
        setImportStatus('success');
        setErrorMessage('');
        setImportPassphrase('');
        if (soundEnabled) playCyberSound('root');
        setTimeout(() => {
          setBackupModalOpen(false);
          setImportStatus('idle');
        }, 1500);
      } else {
        setImportStatus('error');
        setErrorMessage('Invalid backup format. Ensure it contains a valid "machines" array.');
      }
    } catch {
      setImportStatus('error');
      setErrorMessage('Malformed JSON syntax. Please check the imported text.');
    }
  };

  const runVerifiedImport = async (payload: string) => {
    if (importMode === 'merge') {
      const integrity = await checkBackupIntegrity(payload);
      if (integrity) {
        setImportStatus('error');
        setErrorMessage(integrity.message);
        return;
      }
      await runMerge(payload);
      return;
    }
    const result = await importBackupFile(payload);
    if (!result.ok) {
      setImportStatus('error');
      setErrorMessage(result.message);
      return;
    }
    setImportStatus('success');
    setErrorMessage('');
    setImportPassphrase('');
    setImportWarnings(result.warnings);
    if (soundEnabled) playCyberSound('root');
    // Warnings stay on screen until the user closes the modal.
    if (result.warnings.length === 0) {
      setTimeout(() => {
        setBackupModalOpen(false);
        setImportStatus('idle');
      }, 1500);
    }
  };

  /** Runs a merge; conflicts park the decrypted payload until the user resolves or cancels (nothing written). */
  const runMerge = async (payload: string, chosen?: Record<string, ConflictChoice>) => {
    setMergeBusy(true);
    setImportStatus('idle');
    setMergeResult(null);
    setMergeNotice('');
    let result: MergeBackupResult;
    try {
      result = await mergeBackup(payload, chosen);
    } catch (err) {
      result = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
    } finally {
      setMergeBusy(false);
    }
    if (result.status === 'merged') {
      setPendingMerge(null);
      setResolutions({});
      setMergeResult({ summary: result.summary, legacy: result.legacy, warnings: result.warnings ?? [], snapshot: result.snapshot });
      setImportPassphrase('');
      setImportText('');
      setSnapshotListVersion((v) => v + 1);
      if (soundEnabled) playCyberSound('root');
      return;
    }
    if (result.status === 'conflicts') {
      const ids = new Set(result.conflicts.map((c) => c.id));
      setResolutions((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id))));
      setPendingMerge({ payload, conflicts: result.conflicts });
      return;
    }
    setPendingMerge(null);
    setImportStatus('error');
    setErrorMessage(result.status === 'failed' ? `Merge failed: ${result.error}` : MERGE_ERROR[result.status] ?? 'Merge failed.');
  };

  const handleApplyResolvedMerge = () => {
    if (!pendingMerge || mergeBusy) return;
    if (!pendingMerge.conflicts.every((c) => resolutions[c.id])) return;
    void runMerge(pendingMerge.payload, resolutions);
  };

  const handleCancelMerge = () => {
    setPendingMerge(null);
    setResolutions({});
    setMergeNotice('Merge cancelled. Nothing was changed.');
  };

  const handleResetProgress = async () => {
    const ok = await confirmAction({
      title: 'Reset all machine progress?',
      body: 'Flags, timers, and statuses will be cleared.',
      confirmLabel: 'Reset progress',
      tone: 'danger',
    });
    if (ok) {
      resetAllProgress();
      if (soundEnabled) playCyberSound('root');
      setBackupModalOpen(false);
    }
  };

  const handleApplyBulkSolves = () => {
    if (parseResult.newSolves.length === 0) return;

    const updates = parseResult.newSolves.map((m) => ({
      machineId: m.machineId,
      status: targetStatus,
    }));

    batchUpdateMachineStatus(updates);
    triggerRootCelebration();
    if (soundEnabled) playCyberSound('root');

    setBulkApplied(true);
    setTimeout(() => {
      setBulkApplied(false);
      setBulkInputText('');
    }, 2500);
  };

  const handleSamplePwns = () => {
    setBulkInputText('Lame, Forest, Sauna, Shocker, Blue, Jerry, Legacy, Devel');
    if (soundEnabled) playCyberSound('click');
  };

  const handleResetSolvesToZero = async () => {
    const ok = await confirmAction({
      title: 'Start fresh CTF journey?',
      body: "This will reset all 1372 targets to unsolved (0% progress) so you can track your own personal solves from scratch. You can restore Daniel Dayan's 63 baseline solves at any time with 1 click.",
      confirmLabel: 'Reset to 0%',
      tone: 'danger',
    });
    if (ok) {
      resetSolvesToZero();
      if (soundEnabled) playCyberSound('root');
    }
  };

  const handleRestoreDanielSolves = async () => {
    const ok = await confirmAction({
      title: "Restore Daniel Dayan's baseline solves?",
      body: "This will load Daniel Dayan's 55 verified completed solves (37 HTB + 18 THM + 6 footholds) with flags, timestamps, and notes.",
      confirmLabel: 'Restore solves',
    });
    if (ok) {
      restoreDanielSolves();
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('flag');
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      labelledBy="backup-modal-title"
      size="xl"
      closeOnBackdrop={false}
      closeOnEsc={!snapshotRestoring && !mergeBusy}
      className="backdrop-blur-md !bg-surface-inverse/60 max-sm:!p-0"
      panelClassName="!shadow-2xl max-sm:!mx-0 max-sm:!rounded-none max-sm:!border-0 max-sm:!h-full max-sm:!max-h-none"
    >
      {/* 2px less than the panel's 90dvh (its 1px border, top and bottom), so only the content area scrolls */}
      <div className="flex flex-col max-sm:h-full sm:max-h-[calc(90dvh-2px)] min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-subtle p-4 bg-surface-card">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-secondary" />
            <h3 id="backup-modal-title" className="text-base font-semibold tracking-[-0.01em] text-primary">
              Backup and bulk import
            </h3>
          </div>
          <button aria-label="Close backup modal"
            onClick={requestClose}
            disabled={snapshotRestoring}
            title={snapshotRestoring ? 'Restoring a snapshot…' : undefined}
            className="p-1.5 max-sm:p-3 rounded bg-surface-card text-muted hover:text-primary border border-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-subtle bg-surface-sunken px-4 pt-2 gap-2 flex-shrink-0 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('backup');
              if (soundEnabled) playCyberSound('click');
            }}
            className={`px-3 py-2 max-sm:py-3 rounded-t-lg font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 border-t border-x ${
 activeTab === 'backup'
 ? 'bg-surface-card text-primary border-subtle border-b-transparent '
 : 'text-muted hover:text-primary border-transparent'
 }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('bulk_pwn');
              if (soundEnabled) playCyberSound('click');
            }}
            className={`px-3 py-2 max-sm:py-3 rounded-t-lg font-medium whitespace-nowrap flex-shrink-0 transition-colors flex items-center gap-1.5 border-t border-x ${
 activeTab === 'bulk_pwn'
 ? 'bg-surface-card text-primary border-accent border-b-transparent '
 : 'text-muted hover:text-primary border-transparent'
 }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Bulk import (HTB / THM)</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-5 text-xs scrollbar-thin">
          
          {activeTab === 'backup' ? (
            <>
              {/* Section 1: Export JSON */}
              <div className="p-3.5 rounded-lg bg-surface-card border border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-primary text-sm block">Export state (JSON)</span>
                    <span className="text-muted text-[11px]">
                      Snapshot of machine flags, writeups, custom boxes, timers and payloads.
                    </span>
                    <span id="backup-export-contents-note" className="text-muted text-[11px] block mt-0.5">
                      {isChecksumAvailable()
                        ? 'Also includes your exam simulator data and notes, with a checksum that is verified on import.'
                        : 'Also includes your exam simulator data and notes. This page cannot add a checksum (open ZeroBox over HTTPS or on localhost for a verified backup).'}
                    </span>
                  </div>
                </div>

                {/* Redaction Security Option */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-secondary hover:text-primary pt-0.5">
                  <input
                    type="checkbox"
                    checked={redactSecrets}
                    onChange={(e) => setRedactSecrets(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-strong text-accent focus-visible:ring-2 focus-visible:ring-accent/50 bg-surface-card cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-muted" />
                    <span>Redact sensitive credentials (LHOST, target IPs, passwords and tokens)</span>
                  </span>
                </label>

                {/* Optional passphrase encryption (independent of redaction) */}
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-2 select-none text-[11px] pt-0.5 ${
                      cryptoAvailable
                        ? 'cursor-pointer text-secondary hover:text-primary'
                        : 'cursor-not-allowed text-muted'
                    }`}
                  >
                    <input
                      id="backup-encrypt-toggle"
                      name="backup-encrypt-toggle"
                      type="checkbox"
                      checked={encrypting}
                      disabled={!cryptoAvailable}
                      aria-describedby={cryptoAvailable ? undefined : 'backup-encrypt-unavailable'}
                      onChange={(e) => {
                        setEncryptExport(e.target.checked);
                        setExportError('');
                        if (!e.target.checked) {
                          setExportPassphrase('');
                          setExportPassphraseConfirm('');
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-strong text-accent focus-visible:ring-2 focus-visible:ring-accent/50 bg-surface-card cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted" />
                      <span>Encrypt with passphrase</span>
                    </span>
                  </label>

                  {!cryptoAvailable && (
                    <p id="backup-encrypt-unavailable" className="text-[11px] text-muted pl-5">
                      Encryption is unavailable because this page is not in a secure context. Open ZeroBox over HTTPS or on localhost to encrypt backups.
                    </p>
                  )}

                  {encrypting && (
                    <div className="space-y-2.5 pl-0 sm:pl-5">
                      <div className="p-2.5 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-[11px] text-callout-warn-fg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>There is no recovery. If you lose this passphrase, the backup cannot be opened.</span>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="backup-export-passphrase" className="block text-[11px] font-medium text-secondary">
                          Export passphrase
                        </label>
                        <input
                          id="backup-export-passphrase"
                          name="backup-export-passphrase"
                          type="password"
                          autoComplete="new-password"
                          spellCheck={false}
                          value={exportPassphrase}
                          onChange={(e) => setExportPassphrase(e.target.value)}
                          aria-describedby="backup-export-passphrase-strength backup-export-passphrase-notice"
                          aria-invalid={exportPassphraseTooShort || undefined}
                          className={PASSPHRASE_INPUT_CLASS}
                        />
                        {exportPassphrase.length > 0 && (
                          <p
                            id="backup-export-passphrase-strength"
                            className={`text-[11px] ${STRENGTH_CLASS[strength]}`}
                          >
                            Strength: {STRENGTH_LABEL[strength]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="backup-export-passphrase-confirm" className="block text-[11px] font-medium text-secondary">
                          Confirm export passphrase
                        </label>
                        <input
                          id="backup-export-passphrase-confirm"
                          name="backup-export-passphrase-confirm"
                          type="password"
                          autoComplete="new-password"
                          spellCheck={false}
                          value={exportPassphraseConfirm}
                          onChange={(e) => setExportPassphraseConfirm(e.target.value)}
                          aria-describedby="backup-export-passphrase-notice"
                          aria-invalid={exportPassphraseMismatch || undefined}
                          className={PASSPHRASE_INPUT_CLASS}
                        />
                      </div>

                      <div
                        id="backup-export-passphrase-notice"
                        role="status"
                        aria-live="polite"
                        className="text-[11px] text-callout-danger-fg min-h-[1rem]"
                      >
                        {exportPassphraseNotice}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={handleDownloadBackup}
                    disabled={exportBlocked}
                    className="flex items-center gap-1.5 px-3 py-1.5 max-sm:py-3 rounded-lg bg-surface-hover text-primary font-medium hover:bg-surface-hover transition-[background-color,border-color,color,transform] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5" /> {encrypting ? 'Download encrypted JSON' : 'Download JSON'}
                  </button>
                  <button
                    onClick={handleCopyBackup}
                    disabled={exportBlocked}
                    className="flex items-center gap-1 px-3 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle text-primary hover:border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-callout-success-fg" />
                        <span className="text-callout-success-fg font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{encrypting ? 'Copy encrypted JSON' : 'Copy JSON'}</span>
                      </>
                    )}
                  </button>
                </div>

                {cryptoBusy === 'export' && (
                  <div role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] text-secondary">
                    <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
                    <span>Encrypting backup (deriving key)...</span>
                  </div>
                )}

                {exportError && (
                  <div role="alert" className="flex items-center gap-2 text-callout-danger-fg text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{exportError}</span>
                  </div>
                )}

                {/* Sync file: the same encrypted export plus what another device needs to merge it */}
                <div className="pt-3 border-t border-subtle space-y-2">
                  <div>
                    <span className="font-semibold text-primary text-xs flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                      <span>Sync file (move progress between your devices)</span>
                    </span>
                    <span id="backup-sync-export-help" className="text-muted text-[11px] block mt-0.5">
                      Always encrypted with the passphrase above and never redacted. Nothing leaves this device unless you move the file yourself. Import it on the other device with Merge.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSyncFile}
                    disabled={!cryptoAvailable || cryptoBusy !== null || (encrypting && !exportPassphraseValid)}
                    aria-describedby="backup-sync-export-help"
                    className="flex items-center gap-1.5 px-3 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle text-primary font-medium hover:border-strong transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Export sync file
                  </button>
                  {syncExportNotice && (
                    <p role="status" className="text-[11px] text-secondary">
                      {syncExportNotice}
                    </p>
                  )}
                </div>
              </div>

              {/* Section 1B: Export as Standalone Obsidian Vault (.zip) */}
              <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm block">Obsidian vault export (.zip)</span>
                    </div>
                    <span className="text-muted text-[11px] block mt-0.5">
                      Packages all {machines.length} target cards, solves, official walkthroughs, methodology and cheatsheets as a standalone Obsidian vault with frontmatter, wikilinks and tags.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isExportingVault}
                    onClick={handleExportObsidianVault}
                    className="flex items-center gap-2 px-3.5 py-2 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-110 active:brightness-95 active:scale-[0.97] transition-[background-color,border-color,color,transform] disabled:opacity-50"
                  >
                    {isExportingVault ? (
                      <>
                        <Sparkles className="w-4 h-4 motion-safe:animate-spin text-on-accent" />
                        <span>Compiling vault...</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        <span>Export vault (.zip)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Section 2: Import */}
              <div className="p-3.5 rounded-lg bg-surface-card border border-subtle space-y-3">
                <div>
                  <span className="font-semibold text-primary text-sm block">Restore or merge state</span>
                  <span className="text-muted text-[11px]">
                    Paste JSON content or upload a backup or sync file, then merge it into this device or replace your profile with it.
                  </span>
                </div>

                <fieldset className="space-y-1.5">
                  <legend className="text-[11px] font-medium text-secondary mb-1">How to apply the file</legend>
                  <div className="flex items-start gap-2 text-[11px]">
                    <input
                      id="backup-import-mode-merge"
                      type="radio"
                      name="backup-import-mode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      aria-describedby="backup-import-mode-merge-help"
                      className="mt-0.5 text-accent focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer"
                    />
                    <div>
                      <label
                        htmlFor="backup-import-mode-merge"
                        className={`font-medium cursor-pointer ${importMode === 'merge' ? 'text-primary' : 'text-secondary'}`}
                      >
                        Merge (recommended)
                      </label>
                      <p id="backup-import-mode-merge-help" className="text-muted">
                        Adds what is new in the file and keeps your local work. Machines changed on both devices are shown for you to choose. A pre-sync snapshot is saved first.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <input
                      id="backup-import-mode-replace"
                      type="radio"
                      name="backup-import-mode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      aria-describedby="backup-import-mode-replace-help"
                      className="mt-0.5 text-accent focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer"
                    />
                    <div>
                      <label
                        htmlFor="backup-import-mode-replace"
                        className={`font-medium cursor-pointer ${importMode === 'replace' ? 'text-primary' : 'text-secondary'}`}
                      >
                        Replace
                      </label>
                      <p id="backup-import-mode-replace-help" className="text-muted">Overwrites this profile with the file.</p>
                    </div>
                  </div>
                  {importMode === 'replace' && (
                    <div className="p-2.5 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-[11px] text-callout-warn-fg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        Replace discards your current machines, notes, sessions and settings and uses the file's copy instead (credentials and loot are still merged). Changes made here since that file was exported are lost.
                      </span>
                    </div>
                  )}
                </fieldset>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 max-sm:py-3 rounded-lg bg-surface-card border border-subtle text-secondary hover:border-strong cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JSON</span>
                    <input
                      id="backup-upload-json-file"
                      name="backup-upload-json-file"
                      aria-label="Upload JSON backup file"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  id="backup-import-json-text"
                  name="backup-import-json-text"
                  aria-label="Paste JSON backup content"
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Or paste exported JSON content directly here..."
                  className="w-full p-2.5 rounded bg-surface-card border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent resize-none font-mono text-xs"
                />

                {importIsEncrypted && (
                  <div className="p-3 rounded-lg bg-surface-sunken border border-subtle space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Lock className="w-3.5 h-3.5 text-muted" />
                      <span>Encrypted backup detected</span>
                    </div>
                    <label htmlFor="backup-import-passphrase" className="block text-[11px] text-muted">
                      Backup passphrase
                    </label>
                    <input
                      id="backup-import-passphrase"
                      name="backup-import-passphrase"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={importPassphrase}
                      onChange={(e) => {
                        setImportPassphrase(e.target.value);
                        if (importStatus === 'error') setImportStatus('idle');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleExecuteImport();
                        }
                      }}
                      disabled={cryptoBusy === 'import'}
                      className={PASSPHRASE_INPUT_CLASS}
                    />
                    {cryptoBusy === 'import' && (
                      <div role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] text-secondary">
                        <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
                        <span>Decrypting backup (deriving key)...</span>
                      </div>
                    )}
                  </div>
                )}

                {importStatus === 'error' && (
                  <div role="alert" className="flex items-center gap-2 text-callout-danger-fg text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {importStatus === 'success' && (
                  <div className="flex items-center gap-2 text-callout-success-fg text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>State restored. Refreshing...</span>
                  </div>
                )}

                {importStatus === 'success' && importWarnings.length > 0 && (
                  <div
                    role="status"
                    className="p-2.5 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-[11px] text-callout-warn-fg flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <ul className="list-disc pl-4">
                      {importWarnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {mergeNotice && (
                  <p role="status" className="text-[11px] text-secondary">
                    {mergeNotice}
                  </p>
                )}

                {mergeResult && (
                  <div
                    role="status"
                    className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                      mergeResult.warnings.length
                        ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
                        : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                    }`}
                  >
                    {mergeResult.warnings.length ? (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>
                      <span className="font-semibold block">
                        {mergeResult.warnings.length ? 'Merged with warnings' : 'Merge complete'}
                      </span>
                      <span className="block">{describeMergeSummary(mergeResult.summary)}</span>
                      <span className="block">
                        {mergeResult.snapshot === 'empty'
                          ? 'There was no saved data on this device yet, so no pre-sync snapshot was needed'
                          : 'A pre-sync snapshot was saved (you can restore it below)'}
                        {mergeResult.legacy ? '. This file had no sync data, so it was merged as a union' : ''}.
                      </span>
                      {mergeResult.warnings.length > 0 && (
                        <>
                          <span className="block mt-1">
                            The merge is applied in this tab, but some data could not be saved yet. Export a backup now; ZeroBox retries on the next save.
                          </span>
                          <ul className="list-disc pl-4">
                            {mergeResult.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {pendingMerge && (
                  <SyncConflictReview
                    conflicts={pendingMerge.conflicts}
                    resolutions={resolutions}
                    onChoose={(id, choice) => setResolutions((prev) => ({ ...prev, [id]: choice }))}
                    onApply={handleApplyResolvedMerge}
                    onCancel={handleCancelMerge}
                    busy={mergeBusy}
                  />
                )}

                {mergeBusy && !pendingMerge && (
                  <div role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] text-secondary">
                    <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
                    <span>Merging (saving a pre-sync snapshot first)...</span>
                  </div>
                )}

                {!pendingMerge && (
                  <button
                    disabled={!importText.trim() || cryptoBusy !== null || mergeBusy || (importIsEncrypted && !importPassphrase)}
                    onClick={handleExecuteImport}
                    className="px-3.5 py-1.5 max-sm:py-3 rounded-lg bg-accent text-on-accent font-medium hover:brightness-110 active:scale-[0.97] transition-[opacity,filter,transform] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {importMode === 'merge'
                      ? importIsEncrypted
                        ? 'Decrypt and merge'
                        : 'Merge into this device'
                      : importIsEncrypted
                        ? 'Decrypt and import'
                        : 'Import and apply'}
                  </button>
                )}
              </div>

              {/* Section 2.5: Solves lifecycle */}
              <div className="p-3.5 rounded-lg bg-surface-card border border-subtle space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm block">Solves baseline</span>
                      {userSolvesReset ? (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary font-medium">
                          Personal mode (0% baseline)
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary font-medium">
                          Daniel Dayan baseline (63 solves)
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-[11px] block mt-0.5">
                      Track your own progress from 0%, or explore Daniel Dayan's verified baseline solves. Currently solved: <strong className="text-primary font-mono tabular-nums">{solvedCount}</strong> targets.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-surface-card border border-subtle space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-muted" />
                        <span>Start fresh (your own solves)</span>
                      </div>
                      <p className="text-muted text-[11px] leading-relaxed mt-1">
                        Clears solved flags and statuses so you start at 0% and track your own solves.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetSolvesToZero}
                      className="w-full py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset solves to 0%</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-card border border-subtle space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-primary text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-muted" />
                        <span>Restore Daniel's solves</span>
                      </div>
                      <p className="text-muted text-[11px] leading-relaxed mt-1">
                        Restores Daniel Dayan's 63 verified solves (45 HTB + 18 THM + 6 footholds) with flags, timestamps and notes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestoreDanielSolves}
                      className="w-full py-1.5 max-sm:py-3 px-3 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Restore Daniel Dayan (63 solves)</span>
                    </button>
                  </div>
                </div>
              </div>

              <PreUpdateSnapshots key={snapshotListVersion} onBusyChange={setSnapshotRestoring} />

              {/* Section 3: Reset */}
              <div className="p-3.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border space-y-2">
                <div className="flex items-center gap-2 text-callout-danger-fg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">Danger zone: reset all target states</span>
                </div>
                <p className="text-muted text-[11px]">
                  Clears flags and notes and resets every machine to its catalog default.
                </p>
                <button
                  onClick={handleResetProgress}
                  className="px-3 py-1.5 max-sm:py-3 rounded-lg bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg hover:brightness-110 font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset all progress</span>
                </button>
              </div>
            </>
          ) : (
            /* BULK PWN IMPORTER TAB */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-subtle bg-surface-sunken space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Flame className="w-4 h-4 text-muted" />
                    <span>Import solved machines</span>
                  </div>
                  <button
                    onClick={handleSamplePwns}
                    className="px-2 py-1 max-sm:py-2.5 rounded bg-surface-card hover:bg-surface-hover border border-subtle text-xs text-secondary transition-colors"
                  >
                    Load sample
                  </button>
                </div>
                <p className="text-muted text-[11px] leading-relaxed">
                  Paste a list of machines you have already solved on <strong>Hack The Box</strong> or <strong>TryHackMe</strong> (comma separated, line-by-line, or exported CSV). 
                  ZeroBox matches them against the 1372-target catalog and marks them solved.
                </p>
              </div>

              {/* Collapsible Help Accordion: How to grab solves from HTB / THM */}
              <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowExportGuide(!showExportGuide)}
                  className="w-full flex items-center justify-between p-2.5 px-3.5 hover:bg-surface-card transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-muted" />
                    <span className="font-medium text-primary text-xs">
                      How to export your solves from HTB or THM
                    </span>
                  </div>
                  {showExportGuide ? (
                    <ChevronUp className="w-4 h-4 text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted" />
                  )}
                </button>

                {showExportGuide && (
                  <div className="p-3.5 pt-0 space-y-3 border-t border-subtle bg-surface-base text-[11px]">
                    {/* Method 1 */}
                    <div className="space-y-1">
                      <div className="font-medium text-primary flex items-center gap-1">
                        <span>1. Simple way: highlight and copy</span>
                      </div>
                      <p className="text-muted leading-relaxed">
                        • <strong className="text-primary">Hack The Box:</strong> Go to <em>Profile → Activity</em> (or <em>Labs → Machines → State: Owned</em>), select the machine names with your cursor, copy, and paste below.<br />
                        • <strong className="text-primary">TryHackMe:</strong> Open <em>tryhackme.com/p/YOUR_USERNAME</em>, scroll to <em>Rooms Completed</em>, highlight the text, and paste below.
                      </p>
                    </div>

                    {/* Method 2: Browser Console Snippets */}
                    <div className="space-y-2">
                      <div className="font-medium text-primary flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>2. One-liner in the DevTools console</span>
                      </div>
                      <p className="text-muted">
                        Press <kbd className="px-1 py-0.5 rounded bg-surface-card border border-subtle text-primary text-[11px]">F12</kbd> on HTB or THM, click <strong>Console</strong>, and paste one of these snippets. It will copy all your solved machines directly to your clipboard:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* HTB Box */}
                        <div className="p-2.5 rounded-lg bg-surface-card border border-subtle space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-secondary font-medium text-xs">Hack The Box snippet</span>
                            <button
                              type="button"
                              onClick={handleCopyHtbSnippet}
                              className="px-2 py-0.5 rounded bg-surface-card border border-subtle hover:border-strong text-muted hover:text-primary text-[11px] flex items-center gap-1 transition-colors"
                            >
                              {copiedSnippet === 'htb' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedSnippet === 'htb' ? 'Copied' : 'Copy script'}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-on-inverse-muted overflow-x-auto p-1.5 rounded bg-surface-inverse border border-inverse whitespace-pre-wrap break-all">
                            copy(Array.from(document.querySelectorAll('a[href*="/machines/"]')).map(e=&gt;e.innerText.trim()).filter(n=&gt;n.length&gt;2&amp;&amp;!n.includes('\n')).filter((v,i,a)=&gt;a.indexOf(v)===i).join('\n'))
                          </pre>
                        </div>

                        {/* THM Box */}
                        <div className="p-2.5 rounded-lg bg-surface-card border border-subtle space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-secondary font-medium text-xs">TryHackMe snippet</span>
                            <button
                              type="button"
                              onClick={handleCopyThmSnippet}
                              className="px-2 py-0.5 rounded bg-surface-card border border-subtle hover:border-strong text-muted hover:text-primary text-[11px] flex items-center gap-1 transition-colors"
                            >
                              {copiedSnippet === 'thm' ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedSnippet === 'thm' ? 'Copied' : 'Copy script'}</span>
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-on-inverse-muted overflow-x-auto p-1.5 rounded bg-surface-inverse border border-inverse whitespace-pre-wrap break-all">
                            copy(Array.from(document.querySelectorAll('div, a, span')).map(e=&gt;e.innerText.trim()).filter(t=&gt;t.length&gt;2&amp;&amp;t.length&lt;30&amp;&amp;!t.includes('\n')).filter((v,i,a)=&gt;a.indexOf(v)===i).join('\n'))
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Status Selector */}
              <div className="flex items-center gap-3 bg-surface-card p-2.5 rounded-xl border border-subtle">
                <span className="text-muted text-xs font-medium">Apply as</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    id="bulk-status-completed"
                    aria-label="Mark targets as Completed Rooted"
                    type="radio"
                    name="targetStatus"
                    value="completed"
                    checked={targetStatus === 'completed'}
                    onChange={() => setTargetStatus('completed')}
                    className="text-accent focus-visible:ring-2 focus-visible:ring-accent/50"
                  />
                  <span className={targetStatus === 'completed' ? 'text-primary font-medium' : 'text-muted'}>
                    Completed (rooted)
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    id="bulk-status-foothold"
                    aria-label="Mark targets as Foothold User Only"
                    type="radio"
                    name="targetStatus"
                    value="foothold"
                    checked={targetStatus === 'foothold'}
                    onChange={() => setTargetStatus('foothold')}
                    className="text-accent focus-visible:ring-2 focus-visible:ring-accent/50"
                  />
                  <span className={targetStatus === 'foothold' ? 'text-primary font-medium' : 'text-muted'}>
                    Foothold (user only)
                  </span>
                </label>
              </div>

              {/* Paste Text Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted font-medium">Machine names or CSV</span>
                  {candidates.length > 0 && (
                    <span className="text-secondary font-medium"><span className="font-mono tabular-nums">{candidates.length}</span> candidate(s) detected</span>
                  )}
                </div>
                <textarea
                  id="bulk-import-machine-names"
                  name="bulk-import-machine-names"
                  aria-label="Paste machine names or CSV"
                  rows={5}
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder="Paste names here, e.g.:&#10;Lame&#10;Forest&#10;Sauna&#10;Shocker&#10;Blue"
                  className="w-full p-3 rounded-xl bg-surface-card border border-subtle text-xs text-primary placeholder:text-muted focus:outline-none focus:border-accent resize-none font-mono"
                />
              </div>

              {/* Live Parsing Telemetry Cards */}
              {candidates.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-surface-card border border-subtle text-center">
                    <div className="text-base font-semibold text-primary font-mono tabular-nums">{parseResult.totalInputTokens}</div>
                    <div className="text-[11px] text-muted">Detected</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-card border border-subtle text-center">
                    <div className="text-base font-semibold text-primary font-mono tabular-nums">{parseResult.allMatches.length}</div>
                    <div className="text-[11px] text-muted">Matched</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-accent-muted border border-accent/40 text-center">
                    <div className="text-base font-semibold text-primary font-mono tabular-nums">{parseResult.newSolves.length}</div>
                    <div className="text-[11px] text-secondary font-medium">New solves</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-card border border-subtle text-center">
                    <div className="text-base font-semibold text-muted font-mono tabular-nums">{parseResult.unmatched.length}</div>
                    <div className="text-[11px] text-muted">Unmatched</div>
                  </div>
                </div>
              )}

              {/* Matched Preview List */}
              {parseResult.allMatches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted">
                    Matched catalog targets ({parseResult.allMatches.length})
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-lg bg-surface-card border border-subtle text-[11px] scrollbar-thin">
                    {parseResult.allMatches.map((m) => {
                      const isAlready = m.currentStatus === 'completed' || m.currentStatus === 'root';
                      return (
                        <div key={m.machineId} className="flex items-center justify-between p-1 px-2 rounded hover:bg-surface-card transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`px-1 rounded text-[11px] font-semibold ${
 'bg-surface-sunken text-secondary border border-subtle'
 }`}>
                              {m.platform}
                            </span>
                            <span className="font-semibold text-primary">{m.machineName}</span>
                            <span className="text-[11px] text-muted">({m.difficulty})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {isAlready ? (
                              <span className="text-muted">Already solved</span>
                            ) : (
                              <span className="text-primary font-medium">Will mark solved</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unmatched list warning */}
              {parseResult.unmatched.length > 0 && (
                <div className="p-2.5 rounded-lg bg-callout-warn-bg border border-callout-warn-border text-[11px] text-callout-warn-fg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Unmatched items ({parseResult.unmatched.length})</span>
                    <span className="text-muted truncate block">
                      {parseResult.unmatched.slice(0, 8).join(', ')}{parseResult.unmatched.length > 8 ? '...' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2 border-t border-subtle">
                <span className="text-[11px] text-muted">
                  Preserves all custom notes and never deletes progress.
                </span>

                <button
                  onClick={handleApplyBulkSolves}
                  disabled={parseResult.newSolves.length === 0 || bulkApplied}
                  className="flex items-center gap-2 px-4 py-2 max-sm:py-3 rounded-xl text-xs font-medium bg-accent hover:brightness-110 text-on-accent disabled:opacity-40 disabled:cursor-not-allowed transition-[filter,transform] active:scale-[0.97]"
                >
                  {bulkApplied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Solves applied</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Apply {parseResult.newSolves.length} solves to catalog</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
};
