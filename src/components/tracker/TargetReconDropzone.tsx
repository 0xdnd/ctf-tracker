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
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Machine, TargetServicePort } from '../../types';
import { detectAndParseScan, ScanImportResult, ParsedPort } from '../../utils/scanParserUtils';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing machine services or local parsed state
  const activeServices: TargetServicePort[] = machine.services || [];
  const openPortsList = machine.openPorts || activeServices.map((s) => s.port);

  const handleProcessScanText = useCallback((rawText: string) => {
    if (!rawText.trim()) return;

    const result: ScanImportResult | null = detectAndParseScan(rawText);
    if (!result || result.ports.length === 0) {
      if (soundEnabled) playCyberSound('toggle');
      return;
    }

    const mappedServices: TargetServicePort[] = result.ports.map((p: ParsedPort) => ({
      port: p.port,
      protocol: p.protocol as 'tcp' | 'udp',
      state: p.state,
      service: p.service,
      version: p.version,
      cveNotes: p.cveNotes,
      suggestedTools: p.suggestedTools,
    }));

    const portsArray = mappedServices.map((s) => s.port);

    // Auto-detect service keywords to add to tags if missing
    const newTags = [...machine.tags];
    mappedServices.forEach((s) => {
      const sName = s.service.toLowerCase();
      if (sName.includes('smb') && !newTags.includes('smb')) newTags.push('smb');
      if (sName.includes('http') && !newTags.includes('web')) newTags.push('web');
      if (sName.includes('ftp') && !newTags.includes('ftp')) newTags.push('ftp');
      if (sName.includes('kerberos') && !newTags.includes('kerberos')) newTags.push('kerberos');
      if (sName.includes('ldap') && !newTags.includes('active-directory')) newTags.push('active-directory');
      if (sName.includes('mysql') && !newTags.includes('mysql')) newTags.push('mysql');
    });

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
      <div className="p-4 sm:p-5 rounded-xl border border-cyber-border bg-cyber-bg/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-callout-info-fg">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                RECON ARTIFACT DROPZONE & SERVICE DISCOVERY
                {activeServices.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-callout-success-fg border border-emerald-500/40">
                    {activeServices.length} PORTS ACTIVE
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-cyber-muted">
                Drop Nmap XML, GNMAP, Rustscan, or plain text scan outputs to automatically map target attack surface.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPasteMode(!isPasteMode)}
              className="px-3 py-1.5 rounded-lg border border-cyber-border bg-cyber-card text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:border-cyber-cyan transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isPasteMode ? 'Switch to Dropzone' : 'Paste Scan Output'}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-lg border border-cyber-purple/40 bg-cyber-purple/10 text-xs font-semibold text-callout-tip-fg hover:bg-cyber-purple/20 transition-colors flex items-center gap-1.5"
              title="Load sample Nmap scan for demonstration"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyber-purple" />
              <span>Sample Scan</span>
            </button>

            {activeServices.length > 0 && (
              <button
                type="button"
                onClick={handleClearScan}
                className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-callout-danger-fg hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
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
                ? 'border-cyber-cyan bg-cyber-cyan/10'
                : 'border-cyber-border hover:border-cyber-cyan/60 bg-cyber-card/40 hover:bg-cyber-card/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.nmap,.gnmap,.txt,.log"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-callout-info-fg mb-3">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-white mb-1">
              Drag & Drop Scan File (.xml, .nmap, .gnmap, .txt)
            </p>
            <p className="text-[11px] text-cyber-muted max-w-sm">
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
              className="w-full bg-cyber-card p-3 rounded-lg border border-cyber-border text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-cyber-cyan resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPastedText('')}
                className="px-3 py-1.5 rounded-lg border border-cyber-border text-xs text-cyber-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.98]"
              >
                Clear Text
              </button>
              <button
                type="button"
                onClick={() => handleProcessScanText(pastedText)}
                disabled={!pastedText.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-on-accent font-bold text-xs hover:bg-accent-hover transition-[transform,background-color,border-color,color] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Parse & Apply Scan</span>
              </button>
            </div>
          </div>
        )}

        {appliedSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-callout-success-fg text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-callout-success-fg" />
            <span>Scan successfully analyzed! Ports, services, and attack vectors applied to target.</span>
          </div>
        )}
      </div>

      {/* Attack Surface & Ports Table */}
      {activeServices.length > 0 ? (
        <div className="rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-cyber-border bg-cyber-bg/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
              <ShieldAlert className="w-4 h-4 text-callout-info-fg" />
              <span>DISCOVERED SERVICES & EXPLOIT INTELLIGENCE ({activeServices.length})</span>
            </div>
            {machine.scanSummary && (
              <span className="text-[11px] text-cyber-muted font-mono">
                {machine.scanSummary}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-cyber-bg/40 text-cyber-muted text-[10px] uppercase tracking-wider border-b border-cyber-border">
                <tr>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-4">Version & Intel</th>
                  <th className="py-2.5 px-3">Known Exploits / CVE</th>
                  <th className="py-2.5 px-4 text-right">Tactical Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {activeServices.map((svc) => (
                  <tr key={`${svc.port}-${svc.protocol}`} className="hover:bg-cyber-bg/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-callout-info-fg whitespace-nowrap">
                      {svc.port}/{svc.protocol}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-callout-success-fg border border-emerald-500/30">
                        {svc.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {svc.service}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {svc.version || <span className="text-cyber-muted italic">Unknown</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {svc.cveNotes ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-callout-danger-fg border border-rose-500/40 inline-flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {svc.cveNotes}
                        </span>
                      ) : (
                        <span className="text-cyber-muted text-[11px]">-</span>
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
                              className="px-2 py-1 rounded bg-cyber-bg border border-cyber-border/80 text-[10px] font-mono text-cyber-muted hover:text-callout-info-fg hover:border-cyber-cyan transition-colors flex items-center gap-1"
                              title={`Click to copy: ${tool}`}
                            >
                              <span>{tool.split(' ')[0]}</span>
                              {copiedTool === tool ? (
                                <Check className="w-2.5 h-2.5 text-cyber-emerald" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-60" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-cyber-muted text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-cyber-border bg-cyber-card text-center space-y-2">
          <FileCode className="w-8 h-8 text-cyber-muted mx-auto" />
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Services Yet Logged</h4>
          <p className="text-[11px] text-cyber-muted max-w-sm mx-auto">
            Upload your Nmap XML or GNMAP scan file above, or click "Sample Scan" to load demonstration port data.
          </p>
        </div>
      )}
    </div>
  );
};
