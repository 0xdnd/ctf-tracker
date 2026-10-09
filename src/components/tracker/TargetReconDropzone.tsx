import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileCode, 
  Terminal, 
  AlertTriangle, 
  Check, 
  Copy, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Network,
  CheckCircle2
} from 'lucide-react';
import { Machine, TargetServicePort } from '../../types';
import { detectAndParseScan, ScanImportResult, ParsedHost } from '../../utils/scanParserUtils';
import { buildMachineDraftFromHost, deriveServiceTags, toTargetServices } from '../../utils/scanCardHelper';
import { useCtfStore } from '../../store/useCtfStore';
import { MultiHostImportPanel } from './MultiHostImportPanel';
import { playCyberSound } from '../../utils/helpers';
import { confirmAction } from '../../store/useConfirmStore';

interface TargetReconDropzoneProps {
  machine: Machine;
  onUpdateMachine: (id: string, updates: Partial<Machine>) => void;
  soundEnabled?: boolean;
}

const SAMPLE_NMAP_SCAN = `# Nmap 7.94 scan initiated Wed Sep 2 22:00:00 2026 as: nmap -sC -sV -p- -oN scan.log 10.10.10.3
Nmap scan report for 10.10.10.3
Host is up (0.045s latency).
Not shown: 65530 filtered tcp ports (no-response)
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 2.3.4
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
80/tcp   open  http        Apache httpd 2.4.49 ((Unix))
|_http-server-header: Apache/2.4.49
|_http-title: Tactical Target
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn Samba smbd 3.0.20-Debian (workgroup: WORKGROUP)
3306/tcp open  mysql       MySQL 5.0.51a-3ubuntu5
`;

export const TargetReconDropzone: React.FC<TargetReconDropzoneProps> = ({
  machine,
  onUpdateMachine,
  soundEnabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [copiedTool, setCopiedTool] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [pendingMultiHost, setPendingMultiHost] = useState<{ result: ScanImportResult; rawText: string } | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const machines = useCtfStore((s) => s.machines);
  const addCustomMachine = useCtfStore((s) => s.addCustomMachine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing machine services or local parsed state
  const activeServices: TargetServicePort[] = machine.services || [];

  const applyScanResult = useCallback((result: ScanImportResult, rawText: string) => {
    const mappedServices: TargetServicePort[] = toTargetServices(result.ports);

    const portsArray = mappedServices.map((s) => s.port);

    // Auto-detect service keywords to add to tags if missing
    const newTags = deriveServiceTags(machine.tags, mappedServices);

    const updates: Partial<Machine> = {
      services: mappedServices,
      openPorts: portsArray,
      scanSummary: `${result.format.toUpperCase()} · ${portsArray.length} Open Ports Discovered`,
      rawScanOutput: rawText,
      tags: newTags,
    };

    // If target was in backlog, promote to recon
    if (machine.status === 'backlog') {
      updates.status = 'recon';
    }

    onUpdateMachine(machine.id, updates);
    if (soundEnabled) playCyberSound('engage');
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2500);
  }, [machine, onUpdateMachine, soundEnabled]);

  const handleProcessScanText = useCallback((rawText: string) => {
    if (!rawText.trim()) return;

    const result: ScanImportResult | null = detectAndParseScan(rawText);
    setCreatedCount(null);
    // Multi-host scans (>1 host) let the operator pick which hosts become new targets
    if (result?.hosts && result.hosts.length > 1) {
      setPendingMultiHost({ result, rawText });
      return;
    }
    setPendingMultiHost(null);
    if (!result || result.ports.length === 0) {
      if (soundEnabled) playCyberSound('toggle');
      return;
    }
    applyScanResult(result, rawText);
  }, [applyScanResult, soundEnabled]);

  const handleCreateTargets = (selectedHosts: ParsedHost[]) => {
    if (!pendingMultiHost) return;
    const usedNames = new Set<string>();
    selectedHosts.forEach((host) => {
      addCustomMachine(buildMachineDraftFromHost(host, pendingMultiHost.result.format, usedNames));
    });
    setPendingMultiHost(null);
    setCreatedCount(selectedHosts.length);
  };

  const handleApplyFirstHost = () => {
    if (!pendingMultiHost) return;
    const { result, rawText } = pendingMultiHost;
    setPendingMultiHost(null);
    if (result.ports.length === 0) {
      if (soundEnabled) playCyberSound('toggle');
      return;
    }
    applyScanResult(result, rawText);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessScanText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessScanText(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyCommand = (toolCmd: string) => {
    const interpolated = toolCmd
      .replace(/<TARGET_IP>/g, machine.ip)
      .replace(/10\.10\.10\.3/g, machine.ip);

    navigator.clipboard.writeText(interpolated);
    setCopiedTool(toolCmd);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedTool(null), 1800);
  };

  const handleClearScan = async () => {
    const ok = await confirmAction({
      title: 'Clear scan data?',
      body: 'Discovered services, open ports, and the raw scan output for this target will be removed.',
      confirmLabel: 'Clear scan',
      tone: 'danger',
    });
    if (!ok) return;
    onUpdateMachine(machine.id, {
      services: [],
      openPorts: [],
      scanSummary: undefined,
      rawScanOutput: undefined,
    });
    if (soundEnabled) playCyberSound('click');
  };

  const handleLoadSample = () => {
    handleProcessScanText(SAMPLE_NMAP_SCAN);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Dropzone & Upload Header */}
      <div className="p-4 sm:p-5 rounded-xl border border-subtle bg-surface-sunken/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/30 flex items-center justify-center text-callout-info-fg">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                Recon artifact dropzone &amp; service discovery
                {activeServices.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                    {activeServices.length} ports active
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted">
                Drop Nmap XML, GNMAP, Rustscan, or plain text scan outputs to automatically map target attack surface.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPasteMode(!isPasteMode)}
              className="px-3 py-1.5 rounded-lg border border-subtle bg-surface-card text-xs font-semibold text-secondary hover:text-primary hover:border-accent transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isPasteMode ? 'Switch to Dropzone' : 'Paste Scan Output'}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-lg border border-callout-tip-border bg-callout-tip-bg text-xs font-semibold text-callout-tip-fg hover:bg-callout-tip-bg transition-colors flex items-center gap-1.5"
              title="Load sample Nmap scan for demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 text-callout-tip-fg" />
              <span>Sample Scan</span>
            </button>

            {activeServices.length > 0 && (
              <button
                type="button"
                onClick={handleClearScan}
                className="px-3 py-1.5 rounded-lg border border-callout-danger-border bg-callout-danger-bg text-xs font-semibold text-callout-danger-fg hover:bg-callout-danger-bg transition-colors flex items-center gap-1.5"
                title="Clear current scan services"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone or Text Area */}
        {!isPasteMode ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 sm:p-6 rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
              isDragging
                ? 'border-accent bg-accent-muted'
                : 'border-subtle hover:border-accent/60 bg-surface-card/40 hover:bg-surface-card/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.nmap,.gnmap,.txt,.log"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent/30 flex items-center justify-center text-callout-info-fg mb-3">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-secondary mb-1">
              Drag & Drop Scan File (.xml, .nmap, .gnmap, .txt)
            </p>
            <p className="text-xs text-muted max-w-sm">
              Automatically parses open ports, detects vulnerable server versions, and suggests weaponized commands.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste raw Nmap, GNMAP, or Rustscan terminal text here..."
              className="w-full bg-surface-card p-3 rounded-lg border border-subtle text-primary text-xs font-mono focus:outline-none focus:border-accent resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPastedText('')}
                className="px-3 py-1.5 rounded-lg border border-subtle text-xs text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.98]"
              >
                Clear Text
              </button>
              <button
                type="button"
                onClick={() => handleProcessScanText(pastedText)}
                disabled={!pastedText.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-on-accent font-semibold text-xs hover:bg-accent-hover transition-[transform,background-color,border-color,color] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Parse & Apply Scan</span>
              </button>
            </div>
          </div>
        )}

        {pendingMultiHost?.result.hosts && (
          <MultiHostImportPanel
            key={pendingMultiHost.rawText.length}
            hosts={pendingMultiHost.result.hosts}
            existingMachines={[...machines, machine]}
            soundEnabled={soundEnabled}
            onCreate={handleCreateTargets}
            onApplyFirstHost={handleApplyFirstHost}
            onCancel={() => setPendingMultiHost(null)}
          />
        )}

        {createdCount !== null && (
          <div role="status" className="p-2.5 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-callout-success-fg" />
            <span>Created {createdCount} {createdCount === 1 ? 'target' : 'targets'} from the scan.</span>
          </div>
        )}

        {appliedSuccess && (
          <div className="p-2.5 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-callout-success-fg" />
            <span>Scan successfully analyzed! Ports, services, and attack vectors applied to target.</span>
          </div>
        )}
      </div>

      {/* Attack Surface & Ports Table */}
      {activeServices.length > 0 ? (
        <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-subtle bg-surface-sunken/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
              <ShieldAlert className="w-4 h-4 text-callout-info-fg" />
              <span>Discovered services &amp; exploit intelligence ({activeServices.length})</span>
            </div>
            {machine.scanSummary && (
              <span className="text-xs text-muted">
                {machine.scanSummary}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken/40 text-muted text-xs border-b border-subtle">
                <tr>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-4">Version & Intel</th>
                  <th className="py-2.5 px-3">Known Exploits / CVE</th>
                  <th className="py-2.5 px-4 text-right">Suggested tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle/40">
                {activeServices.map((svc) => (
                  <tr key={`${svc.port}-${svc.protocol}`} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-callout-info-fg whitespace-nowrap">
                      {svc.port}/{svc.protocol}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-callout-success-bg text-callout-success-fg border border-callout-success-border">
                        {svc.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-secondary">
                      {svc.service}
                    </td>
                    <td className="py-2.5 px-4 text-muted">
                      {svc.version || <span className="text-muted">Unknown</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {svc.cveNotes ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-callout-danger-bg text-callout-danger-fg border border-callout-danger-border inline-flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {svc.cveNotes}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {svc.suggestedTools && svc.suggestedTools.length > 0 ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {svc.suggestedTools.slice(0, 3).map((tool) => (
                            <button
                              key={tool}
                              type="button"
                              onClick={() => handleCopyCommand(tool)}
                              className="px-2 py-1 rounded bg-surface-sunken border border-subtle/80 text-xs font-mono text-muted hover:text-callout-info-fg hover:border-accent transition-colors flex items-center gap-1"
                              title={`Click to copy: ${tool}`}
                            >
                              <span>{tool.split(' ')[0]}</span>
                              {copiedTool === tool ? (
                                <Check className="w-2.5 h-2.5 text-callout-success-fg" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-60" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-subtle bg-surface-card text-center space-y-2">
          <FileCode className="w-8 h-8 text-muted mx-auto" />
          <h4 className="text-xs font-semibold text-secondary">No Services Yet Logged</h4>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Upload your Nmap XML or GNMAP scan file above, or click "Sample Scan" to load demonstration port data.
          </p>
        </div>
      )}
    </div>
  );
};
