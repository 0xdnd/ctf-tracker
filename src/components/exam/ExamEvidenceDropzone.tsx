import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Flag, 
  Terminal, 
  Network, 
  UploadCloud, 
  FileImage, 
  ShieldCheck, 
  Check, 
  X,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useExamStore } from '../../store/examStore';
import { confirmAction } from '../../store/useConfirmStore';
import { useProofImage } from '../../hooks/useProofImage';
import {
  ExamBox,
  ScreenshotProof,
  ExamTargetProof,
  validateFlagFormat,
  isDomainControllerBox
} from '../../utils/examComplianceUtils';
import { createScreenshotProof } from '../../utils/examProofImages';

export interface ExamEvidenceDropzoneProps {
  box?: ExamBox;
  boxId?: string;
  flagType: 'user' | 'root';
  className?: string;
}

/**
 * Downscales an image File using an HTML5 Canvas to a compact Base64 JPEG data URL.
 * Offline zero-egress: 100% client-side memory operation.
 */
export async function downscaleImageFile(
  file: File,
  maxDimension: number = 1280,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const resultStr = reader.result as string;

      // In headless/JSDOM/test environments where Image/Canvas does not load images, return data URL
      const isTestEnv =
        typeof window === 'undefined' ||
        typeof document === 'undefined' ||
        (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('jsdom')) ||
        (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test');

      if (isTestEnv) {
        resolve(resultStr);
        return;
      }

      try {
        const img = new Image();
        const timeout = setTimeout(() => {
          resolve(resultStr);
        }, 1000);

        img.onerror = () => {
          clearTimeout(timeout);
          // Fallback if image decode fails
          resolve(resultStr);
        };
        img.onload = () => {
          clearTimeout(timeout);
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!width || !height) {
              resolve(resultStr);
              return;
            }

            // Calculate scaled dimensions while preserving aspect ratio
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve(resultStr);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed || resultStr);
          } catch {
            resolve(resultStr);
          }
        };
        img.src = resultStr;
      } catch {
        resolve(resultStr);
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Thumbnail for one proof screenshot. The image bytes live in IndexedDB (imageRef); legacy
 * screenshots that still carry an inline data URL render directly.
 */
const ProofThumbnail: React.FC<{ screenshot: ScreenshotProof; onExpand: (src: string) => void }> = ({
  screenshot: sc,
  onExpand,
}) => {
  const { src, loading } = useProofImage(sc.imageRef, sc.dataUrl);

  return (
    <div className="relative group rounded overflow-hidden bg-surface-base aspect-video flex items-center justify-center border border-subtle">
      {src ? (
        <>
          <img
            src={src}
            alt={sc.caption}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => onExpand(src)}
            className="absolute inset-0 bg-surface-inverse/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 flex items-center justify-center text-on-inverse transition-opacity font-semibold text-[11px] gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Expand preview</span>
          </button>
        </>
      ) : (
        <span className="text-[11px] text-muted">{loading ? 'Loading image...' : 'Image unavailable'}</span>
      )}
    </div>
  );
};

export const ExamEvidenceDropzone: React.FC<ExamEvidenceDropzoneProps> = ({
  box: propBox,
  boxId: propBoxId,
  flagType,
  className = '',
}) => {
  const targetId = propBoxId || propBox?.id || '';

  const {
    currentBox,
    submitFlag,
    updateProof,
    addScreenshot,
    removeScreenshot,
    addMilestone,
  } = useExamStore(
    useShallow((s) => ({
      currentBox: s.boxes.find((b) => b.id === targetId) || propBox,
      submitFlag: s.submitFlag,
      updateProof: s.updateProof,
      addScreenshot: s.addScreenshot,
      removeScreenshot: s.removeScreenshot,
      addMilestone: s.addMilestone,
    }))
  );

  const box = currentBox || propBox;
  const isUser = flagType === 'user';
  const proof: ExamTargetProof = isUser
    ? box?.userProof || { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshots: [] }
    : box?.rootProof || { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshots: [] };

  const screenshots = proof.screenshots || [];

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const flagValidation = validateFlagFormat(proof.flagText || '');
  const hasValidFlag = flagValidation.valid;
  const hasWhoami = Boolean(proof.whoamiOutput && proof.whoamiOutput.trim().length > 0);
  const hasIpconfig = Boolean(proof.ipconfigOutput && proof.ipconfigOutput.trim().length > 0);
  const hasScreenshot = Boolean(screenshots.length > 0 || proof.screenshotTaken);

  const isCompliant = hasValidFlag && hasWhoami && hasIpconfig && hasScreenshot;

  // Process and ingest an image file
  const handleProcessFile = useCallback(
    async (file: File) => {
      if (!box) return;
      setIsProcessingImage(true);
      try {
        const compressedBase64 = await downscaleImageFile(file, 1280, 0.82);
        const now = new Date().toISOString();
        const defaultCaption = `${box.name} [${box.ip}] - ${isUser ? 'user/local.txt' : 'root/proof.txt'} evidence`;

        // Image bytes go to IndexedDB; the store keeps only imageRef (inline Base64 if IndexedDB fails).
        const newScreenshot = await createScreenshotProof(box.id, flagType, {
          id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: compressedBase64,
          caption: defaultCaption,
          timestamp: now,
          sizeBytes: Math.round(compressedBase64.length * 0.75),
        });

        addScreenshot(box.id, flagType, newScreenshot);

        // Automatic milestone timestamping if access has not been formally stamped yet
        if (isUser && !box.initialAccessAt) {
          addMilestone(
            box.id,
            'initial_access',
            `Initial access verified with screenshot proof on ${box.name}`
          );
        } else if (!isUser) {
          const isDc = isDomainControllerBox(box);
          if (isDc && !box.domainCompromiseAt) {
            addMilestone(
              box.id,
              'domain_admin',
              `Domain Controller compromise proof captured on ${box.name}`
            );
          } else if (!box.privEscAt) {
            addMilestone(
              box.id,
              'priv_esc',
              `Privilege escalation / root proof captured on ${box.name}`
            );
          }
        }
      } catch (err) {
        console.error('Failed to ingest evidence screenshot:', err);
      } finally {
        setIsProcessingImage(false);
      }
    },
    [box, flagType, isUser, addScreenshot, addMilestone]
  );

  // Clipboard Paste (Ctrl+V) handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent | ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessFile(file);
            break;
          }
        }
      }
    },
    [handleProcessFile]
  );

  // Native drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleProcessFile(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Flag input change with automatic submission if valid format
  const handleFlagChange = (val: string) => {
    if (!box) return;
    updateProof(box.id, flagType, { flagText: val });

    const trimmed = val.trim();
    const validation = validateFlagFormat(trimmed);
    if (validation.valid) {
      submitFlag(box.id, flagType, trimmed);
    }
  };

  const handleWhoamiChange = (val: string) => {
    if (!box) return;
    updateProof(box.id, flagType, { whoamiOutput: val });
  };

  const handleIpconfigChange = (val: string) => {
    if (!box) return;
    updateProof(box.id, flagType, { ipconfigOutput: val });
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    if (!box) return;
    const ok = await confirmAction({
      title: 'Delete this screenshot proof?',
      body: 'The screenshot will be removed from this evidence record.',
      confirmLabel: 'Delete screenshot',
      tone: 'danger',
    });
    if (!ok) return;
    removeScreenshot(box.id, flagType, screenshotId);
  };

  const handleStartCaptionEdit = (sc: ScreenshotProof) => {
    setEditingCaptionId(sc.id);
    setCaptionText(sc.caption);
  };

  const handleSaveCaption = (screenshotId: string) => {
    if (!box) return;
    const updatedScreenshots = screenshots.map((sc) =>
      sc.id === screenshotId ? { ...sc, caption: captionText.trim() } : sc
    );
    updateProof(box.id, flagType, { screenshots: updatedScreenshots });
    setEditingCaptionId(null);
  };

  if (!box) {
    return null;
  }

  return (
    <div
      ref={dropzoneRef}
      onPaste={handlePaste}
      tabIndex={0}
      data-testid="evidence-dropzone"
      className={`p-4 rounded-2xl bg-surface-card border border-subtle font-sans space-y-4 ${className}`}
    >
      {/* 1. Header & Compliance Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border ${
 isUser
 ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
 : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
 }`}
          >
            {isUser ? <Flag className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-primary">
              {isUser ? 'Foothold Evidence (local.txt)' : 'PrivEsc / Root Evidence (proof.txt)'}
            </h4>
            <span className="text-[11px] text-muted font-mono tabular-nums">
              Target: {box.name} ({box.ip}) • {isUser ? `+${box.userPoints}` : `+${box.rootPoints}`} PTS
            </span>
          </div>
        </div>

        {/* Real-Time Compliance Badge */}
        <div data-testid="evidence-compliance-badge">
          {isCompliant ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>OFFSEC COMPLIANT</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>EVIDENCE INCOMPLETE</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Verification Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step A: Captured Flag Input */}
        <div className="p-3 rounded-lg bg-surface-sunken border border-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`flag-input-${box.id}-${flagType}`}
              className="text-[11px] font-semibold text-secondary flex items-center gap-1"
            >
              <Flag className="w-3 h-3 text-accent" />
              <span>1. Flag hash or value</span>
            </label>
            {proof.flagText && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
 hasValidFlag
 ? 'bg-callout-success-bg text-callout-success-fg border border-callout-success-border'
 : 'bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border'
 }`}
              >
                {hasValidFlag ? `✓ ${flagValidation.label}` : 'Invalid'}
              </span>
            )}
          </div>
          <input
            id={`flag-input-${box.id}-${flagType}`}
            data-testid="evidence-flag-input"
            type="text"
            value={proof.flagText || ''}
            onChange={(e) => handleFlagChange(e.target.value)}
            placeholder="e.g. 7c4a8d09ca3762af61e59520943dc264"
            className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Step B: whoami command output */}
        <div className="p-3 rounded-lg bg-surface-sunken border border-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`whoami-input-${box.id}-${flagType}`}
              className="text-[11px] font-semibold text-secondary flex items-center gap-1"
            >
              <Terminal className="w-3 h-3 text-accent" />
              <span>2. whoami output</span>
            </label>
            {hasWhoami && (
              <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                ✓ Recorded
              </span>
            )}
          </div>
          <input
            id={`whoami-input-${box.id}-${flagType}`}
            data-testid="evidence-whoami-input"
            type="text"
            value={proof.whoamiOutput || ''}
            onChange={(e) => handleWhoamiChange(e.target.value)}
            placeholder={isUser ? 'e.g. offsec\\alice' : 'e.g. root / nt authority\\system'}
            className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Step C: ip a / ipconfig output */}
        <div className="p-3 rounded-lg bg-surface-sunken border border-subtle space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`ipconfig-input-${box.id}-${flagType}`}
              className="text-[11px] font-semibold text-secondary flex items-center gap-1"
            >
              <Network className="w-3 h-3 text-accent" />
              <span>3. ip a or ipconfig output</span>
            </label>
            {hasIpconfig && (
              <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                ✓ Recorded
              </span>
            )}
          </div>
          <input
            id={`ipconfig-input-${box.id}-${flagType}`}
            data-testid="evidence-ipconfig-input"
            type="text"
            value={proof.ipconfigOutput || ''}
            onChange={(e) => handleIpconfigChange(e.target.value)}
            placeholder={`e.g. inet ${box.ip}/24 or IPv4 Address`}
            className="w-full bg-surface-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* 3. Screenshot Dropzone & Paste Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-secondary flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-accent" />
            <span>Screenshot evidence</span>
          </span>
          <span className="text-[11px] text-muted">
            Offline downscaling to Base64 JPEG • Press <kbd className="px-1 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary font-mono">Ctrl+V</kbd> to paste
          </span>
        </div>

        {/* Drag & Drop Target Area */}
        <div
          data-testid="evidence-paste-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-[background-color,border-color] ${
 isDragOver
 ? 'border-accent bg-accent-muted'
 : 'border-strong hover:border-accent bg-surface-sunken hover:bg-surface-hover'
 }`}
        >
          <input
            ref={fileInputRef}
            data-testid="evidence-file-input"
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 rounded-full bg-surface-card border border-subtle text-accent">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">
                {isProcessingImage ? 'Downscaling image offline...' : 'Drop terminal screenshot here, or click to browse'}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                PNG, JPEG, WebP • Auto-downscaled to JPEG &le; 1280px to prevent quota bloat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Captured Screenshots Gallery */}
      {screenshots.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-subtle">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary">
              Verified Screenshots ({screenshots.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {screenshots.map((sc) => (
              <div
                key={sc.id}
                data-testid={`screenshot-card-${sc.id}`}
                className="p-2.5 rounded-lg bg-surface-sunken border border-subtle flex flex-col justify-between gap-2 text-xs"
              >
                {/* Thumbnail Preview */}
                <ProofThumbnail screenshot={sc} onExpand={setPreviewImage} />

                {/* Caption / Metadata */}
                <div>
                  {editingCaptionId === sc.id ? (
                    <div className="flex gap-1 mt-1">
                      <input
                        data-testid={`screenshot-caption-input-${sc.id}`}
                        type="text"
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        className="flex-1 bg-surface-card border border-accent rounded px-2 py-0.5 text-[11px] text-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCaption(sc.id)}
                        className="p-1 rounded bg-accent text-on-accent hover:bg-accent-hover"
                        title="Save caption"
                        aria-label="Save caption"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-[11px] text-primary truncate flex-1 font-sans">
                        {sc.caption}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartCaptionEdit(sc)}
                        className="text-muted hover:text-accent p-0.5"
                        title="Edit caption"
                        aria-label="Edit caption"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted mt-1">
                    <span>
                      {sc.timestamp ? new Date(sc.timestamp).toLocaleTimeString() : 'Logged'}
                      {sc.sizeBytes ? ` • ${(sc.sizeBytes / 1024).toFixed(0)} KB` : ''}
                    </span>
                    <button
                      type="button"
                      data-testid={`screenshot-delete-btn-${sc.id}`}
                      onClick={() => handleDeleteScreenshot(sc.id)}
                      className="text-callout-danger-fg hover:opacity-80 flex items-center gap-1 transition-[transform,background-color,border-color,color] active:scale-[0.97]"
                      title="Delete screenshot proof"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Expanded Modal Preview if user clicked image */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-surface-inverse/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-surface-card border border-subtle rounded-2xl overflow-hidden p-2">
            <button aria-label="Close screenshot preview"
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-surface-elevated text-primary hover:bg-surface-hover"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Expanded proof preview"
              className="max-h-[85vh] max-w-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
