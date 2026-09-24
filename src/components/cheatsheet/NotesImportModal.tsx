import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  FolderOpen,
  Database,
  Terminal,
  RefreshCw,
  Archive,
  Sparkles
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { loadVaultFromIndexedDb, saveVaultToIndexedDb } from '../../utils/indexedDbVault';
import { parseObsidianVaultZip, VaultZipImportProgress } from '../../utils/zipVaultImporter';
import { parseObsidianVaultDirectory, extractFilesFromDataTransfer } from '../../utils/directoryVaultImporter';

export const NotesImportModal: React.FC = () => {
  const { 
    notesImportModalOpen, 
    setNotesImportModalOpen, 
    userNotes, 
    setUserNotes,
    setUserWikilinkMap,
    importNotesFromJson, 
    clearUserNotes, 
    soundEnabled 
  } = useCtfStore(
    useShallow((s) => ({
      notesImportModalOpen: s.notesImportModalOpen,
      setNotesImportModalOpen: s.setNotesImportModalOpen,
      userNotes: s.userNotes,
      setUserNotes: s.setUserNotes,
      setUserWikilinkMap: s.setUserWikilinkMap,
      importNotesFromJson: s.importNotesFromJson,
      clearUserNotes: s.clearUserNotes,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'export'>('upload');
  const [pastedJson, setPastedJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipProgress, setZipProgress] = useState<VaultZipImportProgress | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!notesImportModalOpen) return null;

  const handleClose = () => {
    if (soundEnabled) playCyberSound('click');
    setNotesImportModalOpen(false);
    setFeedback(null);
    setConfirmWipe(false);
    setZipProgress(null);
    setIsDragging(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);
    setZipProgress(null);

    try {
      const fileName = file.name.toLowerCase();

      // CASE 1: Obsidian Vault .ZIP Archive
      if (fileName.endsWith('.zip')) {
        const result = await parseObsidianVaultZip(file, (p) => {
          setZipProgress(p);
        });

        // Save directly to local IndexedDB
        await saveVaultToIndexedDb({
          notes: result.notes,
          wikilinkMap: result.wikilinkMap,
        });

        // Hydrate in-memory store
        setUserNotes(result.notes);
        setUserWikilinkMap(result.wikilinkMap);

        if (soundEnabled) playCyberSound('flag');
        setFeedback({
          type: 'success',
          message: `Successfully unzipped and cached ${result.summary.totalNotes} notes (${result.summary.totalCommands.toLocaleString()} commands across ${result.summary.categories.length} categories) into local browser IndexedDB!`,
        });
      } 
      // CASE 2: JSON Backup / Export
      else {
        const text = await file.text();
        const res = await importNotesFromJson(text);
        if (res.success) {
          if (soundEnabled) playCyberSound('flag');
          setFeedback({ 
            type: 'success', 
            message: `Successfully imported and cached ${res.count} field manual notes into local browser IndexedDB!` 
          });
        } else {
          if (soundEnabled) playCyberSound('toggle');
          setFeedback({ type: 'error', message: res.error || 'Failed to parse notes JSON.' });
        }
      }
    } catch (err: any) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({ type: 'error', message: err?.message || 'Error processing notes archive.' });
    } finally {
      setIsProcessing(false);
      setZipProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setFeedback(null);
    setZipProgress(null);

    try {
      const result = await parseObsidianVaultDirectory(files, (p) => {
        setZipProgress(p);
      });

      // Save directly to local IndexedDB
      await saveVaultToIndexedDb({
        notes: result.notes,
        wikilinkMap: result.wikilinkMap,
      });

      // Hydrate in-memory store
      setUserNotes(result.notes);
      setUserWikilinkMap(result.wikilinkMap);

      if (soundEnabled) playCyberSound('flag');
      setFeedback({
        type: 'success',
        message: `Successfully imported ${result.summary.totalNotes} notes (${result.summary.totalCommands.toLocaleString()} commands across ${result.summary.categories.length} directories) directly from folder into local IndexedDB!`,
      });
    } catch (err: any) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({ type: 'error', message: err?.message || 'Error processing notes folder.' });
    } finally {
      setIsProcessing(false);
      setZipProgress(null);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setFeedback(null);
    setZipProgress(null);

    try {
      // Check if a single ZIP file was dropped
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        const result = await parseObsidianVaultZip(files[0], (p) => setZipProgress(p));
        await saveVaultToIndexedDb({ notes: result.notes, wikilinkMap: result.wikilinkMap });
        setUserNotes(result.notes);
        setUserWikilinkMap(result.wikilinkMap);
        if (soundEnabled) playCyberSound('flag');
        setFeedback({
          type: 'success',
          message: `Successfully unzipped and cached ${result.summary.totalNotes} notes (${result.summary.totalCommands.toLocaleString()} commands) from ZIP archive!`,
        });
        return;
      }

      // Check if a single JSON file was dropped
      if (files.length === 1 && files[0].name.toLowerCase().endsWith('.json')) {
        const text = await files[0].text();
        const res = await importNotesFromJson(text);
        if (res.success) {
          if (soundEnabled) playCyberSound('flag');
          setFeedback({ type: 'success', message: `Successfully imported ${res.count} notes from JSON!` });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Failed to parse JSON file.' });
        }
        return;
      }

      // Traversal for dropped directory or multiple markdown files
      const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
      if (extracted.length > 0) {
        const result = await parseObsidianVaultDirectory(extracted, (p) => setZipProgress(p));
        await saveVaultToIndexedDb({ notes: result.notes, wikilinkMap: result.wikilinkMap });
        setUserNotes(result.notes);
        setUserWikilinkMap(result.wikilinkMap);
        if (soundEnabled) playCyberSound('flag');
        setFeedback({
          type: 'success',
          message: `Successfully scanned and indexed ${result.summary.totalNotes} notes (${result.summary.totalCommands.toLocaleString()} commands) from dropped directory!`,
        });
      } else {
        throw new Error('No markdown (.md or .markdown) notes were found in the dropped items.');
      }
    } catch (err: any) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({ type: 'error', message: err?.message || 'Error importing dropped items.' });
    } finally {
      setIsProcessing(false);
      setZipProgress(null);
    }
  };

  const handlePasteImport = async () => {
    if (!pastedJson.trim()) {
      setFeedback({ type: 'error', message: 'Please paste valid JSON notes content.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await importNotesFromJson(pastedJson);
      if (res.success) {
        if (soundEnabled) playCyberSound('flag');
        setFeedback({ 
          type: 'success', 
          message: `Successfully imported and cached ${res.count} field manual notes into local browser IndexedDB!` 
        });
        setPastedJson('');
      } else {
        if (soundEnabled) playCyberSound('toggle');
        setFeedback({ type: 'error', message: res.error || 'Invalid JSON format.' });
      }
    } catch (err: any) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({ type: 'error', message: err?.message || 'Invalid JSON syntax.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoLoadDesktopVault = async () => {
    setIsProcessing(true);
    setFeedback(null);
    setZipProgress({
      current: 0,
      total: 404,
      currentFile: 'Scanning Desktop CPTS Field Manual...',
      phase: 'parsing',
    });

    try {
      const res = await fetch('/api/local-vault');
      if (!res.ok) {
        throw new Error('Local desktop vault not found at C:\\Users\\DANIEL\\Desktop\\CPTS Field Manual.');
      }
      const data = await res.json();
      if (!data.success || !data.notes) {
        throw new Error(data.error || 'Failed to parse desktop vault.');
      }

      await saveVaultToIndexedDb({
        notes: data.notes,
        wikilinkMap: data.wikilinkMap,
      });

      setUserNotes(data.notes);
      setUserWikilinkMap(data.wikilinkMap);

      if (soundEnabled) playCyberSound('flag');
      setFeedback({
        type: 'success',
        message: `Successfully loaded all ${data.summary.totalNotes} notes (${data.summary.totalCommands.toLocaleString()} commands) from Desktop into local browser IndexedDB!`,
      });
    } catch (err: any) {
      if (soundEnabled) playCyberSound('toggle');
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to auto-load local desktop vault. Please use "Select Folder / Dir" or select "CPTS-Field-Manual.zip".',
      });
    } finally {
      setIsProcessing(false);
      setZipProgress(null);
    }
  };

  const handleExportBackup = async () => {
    try {
      const vault = await loadVaultFromIndexedDb();
      const exportData = {
        notes: userNotes && userNotes.length > 0 ? userNotes : (vault?.notes || []),
        wikilinkMap: vault?.wikilinkMap || {},
        exportedAt: new Date().toISOString(),
        version: '2.0',
        platform: 'ZeroBox Field Manual',
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offensive-notes-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (soundEnabled) playCyberSound('export');
      setFeedback({ type: 'success', message: 'Vault export generated and downloaded successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to generate vault export.' });
    }
  };

  const handleWipeVault = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }

    await clearUserNotes();
    if (soundEnabled) playCyberSound('root');
    setConfirmWipe(false);
    setFeedback({ type: 'success', message: 'Local notes vault completely wiped from IndexedDB and memory.' });
  };

  const totalCommands = userNotes.reduce((acc, n) => acc + (n.commands?.length || 0), 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-cyber-card border border-cyber-cyan/40 rounded-xl shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-cyber-cyan/20 bg-cyber-cyan/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                <Database size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wider flex items-center gap-2">
                  <span>OFFENSIVE INTEL VAULT</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/40 rounded">
                    Local-First
                  </span>
                </h2>
                <p className="text-xs text-cyber-muted font-mono">
                  100% Private Offline Storage · Stored in Browser IndexedDB
                </p>
              </div>
            </div>

            <button 
              onClick={handleClose}
              className="p-1.5 rounded-lg text-cyber-muted hover:text-white hover:bg-cyber-card transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Privacy Banner */}
          <div className="px-6 py-2.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>
              <strong>Zero-Leak Architecture:</strong> Your notes are never transmitted over the internet or uploaded to GitHub. They reside exclusively in your local browser sandbox.
            </span>
          </div>

          {/* Vault Status Card */}
          <div className="px-6 py-3.5 bg-black/40 border-b border-cyber-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${userNotes.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <div className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                  <span>Vault Status:</span>
                  <span className={userNotes.length > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {userNotes.length > 0 ? `${userNotes.length} Notes Loaded (${totalCommands.toLocaleString()} Cmds)` : 'Empty (No Notes Imported)'}
                  </span>
                </div>
                <div className="text-[11px] text-cyber-muted">
                  Accepts Obsidian Vault <code className="text-cyber-cyan font-bold">.zip</code> archives or JSON exports
                </div>
              </div>
            </div>

            {userNotes.length > 0 && (
              <button
                onClick={handleWipeVault}
                className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors flex items-center gap-1.5 ${
                  confirmWipe 
                    ? 'bg-rose-600 text-white border-rose-500 font-bold animate-pulse' 
                    : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
                }`}
              >
                <Trash2 size={13} />
                <span>{confirmWipe ? 'CONFIRM WIPE?' : 'Wipe Vault'}</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 pt-4 flex gap-2 border-b border-cyber-card">
            <button
              onClick={() => { setActiveTab('upload'); setFeedback(null); }}
              className={`pb-2 px-3 text-xs font-mono font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'text-cyber-cyan border-cyber-cyan'
                  : 'text-cyber-muted border-transparent hover:text-white'
              }`}
            >
              <Upload size={14} />
              <span>Import .ZIP or .JSON</span>
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setFeedback(null); }}
              className={`pb-2 px-3 text-xs font-mono font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'text-cyber-cyan border-cyber-cyan'
                  : 'text-cyber-muted border-transparent hover:text-white'
              }`}
            >
              <Terminal size={14} />
              <span>Paste JSON</span>
            </button>
            <button
              onClick={() => { setActiveTab('export'); setFeedback(null); }}
              className={`pb-2 px-3 text-xs font-mono font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'text-cyber-cyan border-cyber-cyan'
                  : 'text-cyber-muted border-transparent hover:text-white'
              }`}
            >
              <Download size={14} />
              <span>Export &amp; Backup</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Live ZIP Unpacking Progress */}
            {isProcessing && zipProgress && (
              <div className="p-4 rounded-xl bg-black/60 border border-cyber-cyan/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyber-cyan font-bold flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-cyber-cyan" />
                    <span>Unpacking &amp; Indexing Notes Vault...</span>
                  </span>
                  <span className="text-white font-bold">
                    {zipProgress.total > 0
                      ? `${zipProgress.current} / ${zipProgress.total} (${Math.round((zipProgress.current / zipProgress.total) * 100)}%)`
                      : 'Decompressing...'}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-cyber-cyan/20">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-emerald transition-all duration-150"
                    style={{
                      width: zipProgress.total > 0 ? `${(zipProgress.current / zipProgress.total) * 100}%` : '20%',
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono text-cyber-muted truncate">
                  Processing: {zipProgress.currentFile}
                </div>
              </div>
            )}

            {feedback && (
              <div className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="space-y-4">
                {/* Drag & Drop Unified Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isProcessing) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging
                      ? 'border-cyber-emerald bg-cyber-emerald/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                      : 'border-cyber-cyan/30 hover:border-cyber-cyan/70 bg-cyber-card/30 hover:bg-cyber-card/60'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                        <FolderOpen size={28} />
                      </div>
                      <div className="p-3 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                        <Archive size={28} />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white">
                        {isDragging ? 'Release to Import Notes Folder or Archive!' : 'Import Offensive Notes Vault'}
                      </div>
                      <div className="text-xs text-cyber-muted mt-1">
                        Select a directory from your computer or drop your Obsidian vault folder / .zip file here.
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => !isProcessing && folderInputRef.current?.click()}
                        disabled={isProcessing}
                        className="py-2.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FolderOpen size={16} />
                        <span>Select Folder / Dir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="py-2.5 px-3 rounded-lg bg-cyber-card hover:bg-cyber-card/80 border border-cyber-cyan/50 text-cyber-cyan hover:text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Archive size={16} />
                        <span>Select .ZIP / .JSON</span>
                      </button>
                    </div>

                    {/* 1-Click Local Desktop Vault Auto-Import */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleAutoLoadDesktopVault}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-mono font-bold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer border border-purple-400/40"
                      >
                        <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                        <span>⚡ 1-Click Load Desktop CPTS Field Manual (404 Notes)</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1">
                      Works directly with <code className="text-purple-300 font-bold">CPTS Field Manual</code> folder or <code className="text-purple-300 font-bold">CPTS-Field-Manual.zip</code> on Desktop.
                    </div>
                  </div>

                  {/* Hidden Directory & File Inputs */}
                  <input 
                    id="notes-import-file-input"
                    name="notes-import-file"
                    aria-label="Upload Obsidian vault zip or json"
                    ref={fileInputRef}
                    type="file" 
                    accept=".zip,.json" 
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    className="hidden" 
                  />

                  <input 
                    id="notes-import-folder-input"
                    name="notes-import-folder"
                    aria-label="Upload Obsidian vault folder directly"
                    ref={folderInputRef}
                    type="file" 
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    multiple
                    onChange={handleFolderChange}
                    disabled={isProcessing}
                    className="hidden" 
                  />
                </div>

                <div className="p-4 rounded-lg bg-cyber-card/40 border border-cyber-card text-xs text-cyber-muted space-y-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <FileText size={14} className="text-cyber-cyan" />
                    <span>How local directory import works:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li><strong>Direct Folder:</strong> Click <strong className="text-purple-300">Select Folder / Dir</strong> to import your notes folder directly from disk without needing to zip it first.</li>
                    <li><strong>Nested Sub-directories:</strong> Preserves arbitrary folder depths (00 Methodology, 01 Recon, etc.) with automatic category grouping.</li>
                    <li><strong>Zero-Egress:</strong> All markdown notes, frontmatter, and commands are parsed in-browser and cached in your private IndexedDB.</li>
                    <li><strong>Persistence:</strong> Stored locally on this browser and retained across reloads.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'paste' && (
              <div className="space-y-3">
                <label className="block text-xs font-mono text-cyber-muted">
                  Paste Raw JSON Payload:
                </label>
                <textarea
                  id="notes-import-pasted-json"
                  name="notes-import-pasted-json"
                  aria-label="Paste raw JSON notes payload"
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder='{\n  "notes": [...],\n  "wikilinkMap": {...}\n}'
                  rows={8}
                  className="w-full p-3 bg-black/60 border border-cyber-border focus:border-cyber-cyan/60 rounded-lg text-xs font-mono text-slate-200 outline-none resize-none transition-colors"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePasteImport}
                    disabled={isProcessing || !pastedJson.trim()}
                    className="px-4 py-2 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 text-cyber-cyan border border-cyber-cyan/50 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>Import From Text</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-cyber-card/40 border border-cyber-card space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Download size={16} className="text-cyber-cyan" />
                    <span>Export Field Manual Backup</span>
                  </h3>
                  <p className="text-xs text-cyber-muted">
                    Generate a downloadable JSON file containing all active field manual notes currently loaded in your browser session. You can re-import this file on any machine or browser.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    disabled={userNotes.length === 0}
                    className="px-4 py-2 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 text-cyber-cyan border border-cyber-cyan/50 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    <Download size={14} />
                    <span>Download Vault Backup (.json)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-cyber-border bg-black/40 flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyber-muted">
              ZeroBox Privacy Architecture v2.0
            </span>
            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-cyber-card hover:bg-cyber-card/80 text-white rounded text-xs font-mono transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
