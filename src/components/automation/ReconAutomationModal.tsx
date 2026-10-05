import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Zap, 
  Terminal, 
  Copy, 
  Check, 
  FileText, 
  Search, 
  ShieldAlert, 
  Flame, 
  Cpu, 
  ExternalLink,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  FileCode,
  Lock,
  Radio,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { 
  detectAndParseScan, 
  ScanImportResult, 
  ParsedPort 
} from '../../utils/scanParserUtils';
import { 
  getTacticalPayloads, 
  applyBypassEncoder, 
  ENCODER_OPTIONS, 
  BypassEncoderType, 
  TacticalPayload 
} from '../../utils/payloadCrafterUtils';

const SAMPLE_LINUX_SCAN = `# Nmap 7.94 scan initiated Wed Sep 2 22:00:00 2026 as: nmap -sC -sV -p- -oN scan.log 10.10.10.3
Nmap scan report for 10.10.10.3
Host is up (0.045s latency).
Not shown: 65530 filtered tcp ports (no-response)
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 2.3.4
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
22/tcp   open  ssh         OpenSSH 4.7p1 Debian 8ubuntu1 (protocol 2.0)
| ssh-hostkey: 
|   1024 60:0f:cf:e1:c0:5f:6a:74:d6:90:24:fa:91:b9:fb:0f (DSA)
80/tcp   open  http        Apache httpd 2.4.49 ((Unix))
|_http-server-header: Apache/2.4.49
|_http-title: Tactical Vulnerability Assessment Portal
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn Samba smbd 3.0.20-Debian (workgroup: WORKGROUP)
3306/tcp open  mysql       MySQL 5.0.51a-3ubuntu5
|_mysql-info: Protocol: 10, Version: 5.0.51a-3ubuntu5
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Wed Sep 2 22:01:15 2026 -- 1 IP address (1 host up) scanned in 75.00 seconds`;

const SAMPLE_WINDOWS_AD_SCAN = `# Nmap 7.94 scan initiated Wed Sep 2 22:00:00 2026 as: nmap -sC -sV 10.10.11.175
Nmap scan report for DC01.CORP.LOCAL (10.10.11.175)
Host is up (0.052s latency).
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-09-02 20:00:00Z)
135/tcp  open  msrpc         Microsoft Windows RPC
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: CORP.LOCAL)
445/tcp  open  microsoft-ds  Windows Server 2019 Standard 17763 microsoft-ds (workgroup: CORP)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: CORP.LOCAL)
3389/tcp open  ms-wbt-server Microsoft Terminal Services
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows`;

const SAMPLE_RUSTSCAN = `[~] Starting Script(s)
[>] Host script(s) running
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ -} }}_}{ {__  /  ___} / {} \ |  \| |
| .-. \| {_} |.-}_} }| } \ .-}_} }\     }/  /\  \|   | |
\`-' \`-' \`-----'\`----' \`-'-'\`----'  \`---'  \`-'  \`-'\`-' \`-'
The Modern Day Port Scanner.
________________________________________
: https://discord.gg/GFrHRGy
: https://rustscan.github.io/Rustscan/
________________________________________
Open 10.129.228.10:22
Open 10.129.228.10:80
Open 10.129.228.10:443
Open 10.129.228.10:3306
[PORT] 22
[PORT] 80
[PORT] 443
[PORT] 3306
Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-02 22:00 UTC
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http    nginx 1.18.0 (Ubuntu)
443/tcp  open  ssl/http nginx 1.18.0 (Ubuntu)
3306/tcp open  mysql   MySQL 8.0.30`;

const SAMPLE_NMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -sV -sC 10.10.10.27" start="1725300000" version="7.94">
<host>
<status state="up" reason="syn-ack"/>
<address addr="10.10.10.27" addrtype="ipv4"/>
<hostnames><hostname name="sniper.htb" type="user"/></hostnames>
<ports>
<port protocol="tcp" portid="80"><state state="open" reason="syn-ack"/><service name="http" product="Microsoft IIS httpd" version="10.0"/></port>
<port protocol="tcp" portid="135"><state state="open" reason="syn-ack"/><service name="msrpc" product="Microsoft Windows RPC"/></port>
<port protocol="tcp" portid="445"><state state="open" reason="syn-ack"/><service name="microsoft-ds" product="Microsoft Windows Server 2019"/></port>
<port protocol="tcp" portid="49667"><state state="open" reason="syn-ack"/><service name="msrpc" product="Microsoft Windows RPC"/></port>
</ports>
</host>
</nmaprun>`;

export const ReconAutomationModal: React.FC = () => {
  const { 
    reconAutomationModalOpen, 
    setReconAutomationModalOpen, 
    machines, 
    selectedMachineId, 
    activeTargetId,
    updateMachine,
    updateMachineStatus,
    setMachineOpenPorts,
    setChecklistItemStatus,
    globalVars,
    setGlobalVars,
    soundEnabled 
  } = useCtfStore(
    useShallow((s) => ({
      reconAutomationModalOpen: s.reconAutomationModalOpen,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      machines: s.machines,
      selectedMachineId: s.selectedMachineId,
      activeTargetId: s.activeTargetId,
      updateMachine: s.updateMachine,
      updateMachineStatus: s.updateMachineStatus,
      setMachineOpenPorts: s.setMachineOpenPorts,
      setChecklistItemStatus: s.setChecklistItemStatus,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [activeTab, setActiveTab] = useState<'parser' | 'payloads' | 'rules'>('parser');
  const [scanText, setScanText] = useState('');
  const [targetMachineId, setTargetMachineId] = useState<string>(selectedMachineId || activeTargetId || machines[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payload Crafter state
  const [payloadCategory, setPayloadCategory] = useState<'all' | 'revshell' | 'web' | 'msfvenom' | 'ad' | 'privesc'>('all');
  const [selectedEncoder, setSelectedEncoder] = useState<BypassEncoderType>('raw');
  const [payloadSearch, setPayloadSearch] = useState('');
  const [copiedPayloadKey, setCopiedPayloadKey] = useState<string | null>(null);

  // Auto-tune target machine selection when modal opens
  React.useEffect(() => {
    if (selectedMachineId) {
      setTargetMachineId(selectedMachineId);
    } else if (activeTargetId) {
      setTargetMachineId(activeTargetId);
    } else if (machines.length > 0 && !targetMachineId) {
      setTargetMachineId(machines[0].id);
    }
  }, [selectedMachineId, activeTargetId, machines]);

  const targetMachine = useMemo(() => {
    return machines.find(m => m.id === targetMachineId) || machines[0];
  }, [machines, targetMachineId]);

  // Frozen Solve Protection Guard: Daniel Dayan's completed solves cannot be overwritten
  const isTargetFrozen = useMemo(() => {
    return targetMachine?.status === 'completed';
  }, [targetMachine]);

  // Universal Auto-detecting Multi-Format Scan Parser Engine
  const parsedResults = useMemo<ScanImportResult | null>(() => {
    return detectAndParseScan(scanText);
  }, [scanText]);

  // Check if detected IP matches another machine in the catalog
  const autoMatchedTarget = useMemo(() => {
    if (!parsedResults?.detectedIp) return null;
    return machines.find(m => m.ip === parsedResults.detectedIp && m.id !== targetMachineId) || null;
  }, [parsedResults?.detectedIp, machines, targetMachineId]);

  // File Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setScanText(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setScanText(content);
      };
      reader.readAsText(file);
    }
  };

  // Safe Apply Automation to Target Machine (Guarded from mutating completed solves)
  const handleApplyToMachine = () => {
    if (!targetMachine || !parsedResults || isTargetFrozen) return;

    const portNumbers = parsedResults.ports.map(p => p.port);
    
    // Generate automated markdown summary
    const timestamp = new Date().toLocaleTimeString();
    const portSummary = parsedResults.ports.map(p => 
      `- **Port ${p.port}/${p.protocol}** (${p.service.toUpperCase()}): ${p.version}${p.cveNotes ? ` ➔ 🚨 *${p.cveNotes}*` : ''}`
    ).join('\n');

    const reconNotes = `\n\n### ⚡ Automated Scan Intake [${parsedResults.format.toUpperCase()}] (${timestamp})\n` +
      `- **Target Host**: ${parsedResults.detectedHost || targetMachine.ip}\n` +
      `- **Detected OS**: ${parsedResults.detectedOs || targetMachine.os}\n` +
      `#### Open Services (${parsedResults.ports.length}):\n${portSummary}\n`;

    const existingNotes = targetMachine.quickNotes || '';
    const updatedNotes = existingNotes ? `${existingNotes}${reconNotes}` : reconNotes.trim();

    // 1. Update machine open ports & quick notes safely
    updateMachine(targetMachine.id, {
      openPorts: Array.from(new Set([...(targetMachine.openPorts || []), ...portNumbers])),
      quickNotes: updatedNotes,
    });

    // 2. Safely sync openPorts to machine checklist
    setMachineOpenPorts(targetMachine.id, portNumbers);

    // 3. Mark surface discovery checklist items done
    setChecklistItemStatus(targetMachine.id, 'p01-fast-syn', 'done');
    setChecklistItemStatus(targetMachine.id, 'p01-full-tcp', 'done');
    setChecklistItemStatus(targetMachine.id, 'p02-banner-grab', 'done');

    // 4. Advance status from backlog to recon if still in backlog
    if (targetMachine.status === 'backlog') {
      updateMachineStatus(targetMachine.id, 'recon');
    }

    setAppliedSuccess(true);
    if (soundEnabled) playCyberSound('flag');
    triggerRootCelebration();

    setTimeout(() => {
      setAppliedSuccess(false);
    }, 3000);
  };

  // Dynamic Tactical Payloads Catalog
  const payloadTargetIp = targetMachine?.ip || globalVars.targetIp || '10.10.10.X';
  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '4444';

  const tacticalPayloads = useMemo(() => {
    return getTacticalPayloads({
      lhost,
      lport,
      targetIp: payloadTargetIp,
    });
  }, [lhost, lport, payloadTargetIp]);

  const filteredPayloads = useMemo(() => {
    return tacticalPayloads.filter((p) => {
      if (payloadCategory !== 'all' && p.category !== payloadCategory) return false;
      if (payloadSearch.trim()) {
        const query = payloadSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(query) ||
          p.subCategory.toLowerCase().includes(query) ||
          p.commandTemplate.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [tacticalPayloads, payloadCategory, payloadSearch]);

  const copyPayload = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayloadKey(key);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedPayloadKey(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={() => setReconAutomationModalOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="w-full sm:max-w-5xl h-full sm:h-[92vh] max-h-none sm:max-h-[860px] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-subtle bg-surface-card shadow-2xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-3.5 border-b border-subtle bg-surface-sunken">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-card border border-subtle flex items-center justify-center text-secondary">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-primary">
                  ZEROBOX TACTICAL AUTOMATION HUB
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-card border border-subtle text-secondary font-semibold">
                  MULTI-FORMAT SCAN & PAYLOAD CRAFTER
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Multi-format scan ingestion (XML, Nmap, Grepable, Rustscan), freeze-guarded auto-apply, and real-time bypass encoders.
              </p>
            </div>
          </div>

          <button
            onClick={() => setReconAutomationModalOpen(false)}
            className="p-1.5 rounded-lg border border-subtle bg-surface-sunken text-muted hover:text-primary hover:border-cyber-borderGlow active:scale-[0.98] transition-[transform,background-color,border-color,color]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Machine Selection Bar */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-surface-sunken border-b border-subtle flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted text-[10px] font-semibold">Target workspace</span>
            <CyberSelect
              value={targetMachineId}
              onChange={setTargetMachineId}
              options={machines.map((m) => ({
                value: m.id,
                label: `${m.status === 'completed' ? '🔒 ' : ''}${m.name} (${m.platform})`,
                icon: <PlatformIcon platform={m.platform} className="w-3.5 h-3.5" />,
                description: `${m.ip} · ${m.status.toUpperCase()}`,
              }))}
              searchable
              searchPlaceholder="Search machine workspace..."
              variant="card"
              size="xs"
              triggerClassName="py-1 px-2.5 bg-surface-card border-subtle font-semibold text-primary max-w-[280px]"
            />

            {isTargetFrozen && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg font-semibold">
                <Lock className="w-3 h-3 text-callout-warn-fg" />
                <span>Solve frozen</span>
              </span>
            )}
          </div>

          {targetMachine && (
            <div className="flex items-center gap-2">
              <PlatformBadge platform={targetMachine.platform} size="sm" />
              <OsBadge os={targetMachine.os} size="xs" />
              <span className="text-muted text-[11px] font-mono tabular-nums">{targetMachine.ip}</span>
            </div>
          )}
        </div>

        {/* Auto-detected Target Match Prompt */}
        {autoMatchedTarget && (
          <div className="flex-shrink-0 px-4 py-2 bg-accent-muted border-b border-subtle flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-secondary">
              <Radio className="w-4 h-4 text-muted" />
              <span>
                Detected IP <strong className="text-primary font-mono tabular-nums">{parsedResults?.detectedIp}</strong> matches catalog target <strong className="text-primary">{autoMatchedTarget.name}</strong> ({autoMatchedTarget.platform})
              </span>
            </div>
            <button
              onClick={() => setTargetMachineId(autoMatchedTarget.id)}
              className="px-2.5 py-1 rounded-lg bg-accent text-on-accent font-semibold text-xs hover:brightness-110 active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1"
            >
              <span>Switch to {autoMatchedTarget.name}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex-shrink-0 flex items-center border-b border-subtle bg-surface-card px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('parser')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'parser'
                ? 'border-subtle text-secondary bg-accent-muted'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Nmap importer</span>
            {parsedResults && parsedResults.ports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-sunken text-secondary font-semibold">
                {parsedResults.ports.length} ports
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payloads')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'payloads'
                ? 'border-callout-success-border text-callout-success-fg bg-callout-success-bg'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Payload crafter</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-callout-success-bg text-callout-success-fg font-semibold">
              {tacticalPayloads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-2 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'border-subtle text-secondary bg-surface-sunken'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Exploit advisor</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin">
          {/* TAB 1: SCAN & NMAP IMPORTER */}
          {activeTab === 'parser' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted">Load samples</span>
                  <button
                    onClick={() => setScanText(SAMPLE_LINUX_SCAN)}
                    className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-secondary hover:border-strong active:scale-[0.98] text-[11px] transition-[transform,background-color,border-color,color] flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Linux Lame
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_WINDOWS_AD_SCAN)}
                    className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-secondary hover:border-strong active:scale-[0.98] text-[11px] transition-[transform,background-color,border-color,color] flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Windows AD
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_NMAP_XML)}
                    className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-callout-success-fg hover:border-callout-success-border active:scale-[0.98] text-[11px] transition-[transform,background-color,border-color,color] flex items-center gap-1 font-semibold"
                  >
                    <FileCode className="w-3 h-3" /> Nmap XML
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_RUSTSCAN)}
                    className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-callout-warn-fg hover:border-callout-warn-border active:scale-[0.98] text-[11px] transition-[transform,background-color,border-color,color] flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Rustscan
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="recon-file-input"
                    name="recon-file"
                    aria-label="Upload Scan Output File"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xml,.nmap,.gnmap,.txt,.log"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-primary hover:border-strong active:scale-[0.98] text-[11px] flex items-center gap-1 transition-[transform,background-color,border-color,color]"
                  >
                    <Upload className="w-3 h-3 text-muted" /> Upload Scan
                  </button>

                  {scanText && (
                    <button
                      onClick={() => setScanText('')}
                      className="text-muted hover:text-callout-danger-fg active:scale-[0.98] text-[11px] flex items-center gap-1 transition-[transform,background-color,border-color,color] ml-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Drag & Drop Zone + Textarea */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-xl transition-colors ${
                  isDragging 
                    ? 'ring-2 ring-accent bg-accent-muted' 
                    : ''
                }`}
              >
                <textarea
                  id="recon-scan-textarea"
                  name="recon-scan-text"
                  aria-label="Paste or drag-and-drop raw scan logs"
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  placeholder="Paste or drag-and-drop raw scan logs here... Supports Nmap XML, Standard Nmap (.nmap), Grepable (.gnmap), Rustscan, and raw port lists."
                  rows={6}
                  className="w-full bg-surface-sunken px-3.5 py-2.5 rounded-xl border border-subtle text-primary font-mono text-xs focus:outline-none focus:border-accent transition-[box-shadow,background-color,border-color,color] shadow-inner leading-relaxed"
                />

                {isDragging && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="text-center text-secondary space-y-1">
                      <Upload className="w-8 h-8 mx-auto animate-bounce" />
                      <p className="font-semibold text-sm">Drop scan file (.xml, .nmap, .gnmap, .txt) to parse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Format Badge & Metadata Bar */}
              {parsedResults && (
                <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 rounded-lg bg-surface-sunken border border-subtle text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted font-semibold">Detected format</span>
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      parsedResults.format === 'nmap-xml'
                        ? 'bg-callout-success-bg border border-callout-success-border text-callout-success-fg'
                        : parsedResults.format === 'rustscan'
                        ? 'bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg'
                        : parsedResults.format === 'gnmap'
                        ? 'bg-surface-sunken border border-subtle text-secondary'
                        : 'bg-accent-muted border border-subtle text-secondary'
                    }`}>
                      {parsedResults.format}
                    </span>

                    {parsedResults.detectedIp && (
                      <span className="px-2 py-0.5 rounded bg-surface-card border border-subtle text-primary font-mono">
                        IP: {parsedResults.detectedIp}
                      </span>
                    )}

                    {parsedResults.detectedHost && (
                      <span className="px-2 py-0.5 rounded bg-surface-card border border-subtle text-primary">
                        HOST: {parsedResults.detectedHost}
                      </span>
                    )}

                    {parsedResults.detectedOs && (
                      <span className="px-2 py-0.5 rounded bg-surface-card border border-subtle text-primary">
                        OS: {parsedResults.detectedOs}
                      </span>
                    )}
                  </div>

                  <span className="text-muted">
                    Found <strong className="text-primary font-semibold">{parsedResults.ports.length}</strong> open ports
                  </span>
                </div>
              )}

              {/* Frozen Solve Banner Warning */}
              {isTargetFrozen && parsedResults && (
                <div className="p-3 rounded-xl bg-callout-warn-bg border border-callout-warn-border flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-callout-warn-fg flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-callout-warn-fg">
                      Target completed. Editing is locked.
                    </div>
                    <p className="text-callout-warn-fg leading-relaxed text-[11px]">
                      Target <strong className="text-primary font-semibold">{targetMachine?.name}</strong> is one of Daniel Dayan's 63 completed solves. 
                      Solve statuses, flags, and checklist milestones are strictly frozen to preserve operational integrity. 
                      To apply this scan, please select an in-progress or backlog target from the dropdown above.
                    </p>
                  </div>
                </div>
              )}

              {/* Parser Output / Intelligence Dashboard */}
              {parsedResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-subtle bg-surface-sunken/70 space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-subtle/80 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm">
                        DISCOVERED OPEN SERVICES ({parsedResults.ports.length})
                      </span>
                      {parsedResults.detectedOs && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-card border border-subtle text-muted">
                          OS: {parsedResults.detectedOs}
                        </span>
                      )}
                    </div>

                    {/* Apply to Target Button with Frozen Solve Guard */}
                    <button
                      disabled={isTargetFrozen || parsedResults.ports.length === 0}
                      onClick={handleApplyToMachine}
                      title={isTargetFrozen ? "Target is marked completed. Select an in-progress target." : undefined}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-[box-shadow,background-color,border-color,color] ${
                        isTargetFrozen
                          ? 'bg-surface-elevated text-muted border border-strong cursor-not-allowed opacity-60'
                          : appliedSuccess
                          ? 'bg-callout-success-fg text-on-accent active:scale-[0.98]'
                          : 'bg-accent text-on-accent hover:brightness-110 active:brightness-95 active:scale-[0.98]'
                      }`}
                    >
                      {isTargetFrozen ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-tertiary" />
                          <span>Solve completed</span>
                        </>
                      ) : appliedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>AUTO-APPLIED TO TARGET!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>APPLY TO {targetMachine?.name.toUpperCase()}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ports Grid / Table */}
                  <div className="space-y-2">
                    {parsedResults.ports.map((p) => (
                      <div
                        key={p.port}
                        className="p-2.5 rounded-lg bg-surface-card border border-subtle/70 flex items-start justify-between gap-3 hover:border-strong transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-secondary text-sm">
                              {p.port}/{p.protocol}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle font-semibold text-[10px] text-primary">
                              {p.service}
                            </span>
                            <span className="text-muted text-xs">
                              {p.version}
                            </span>
                          </div>

                          {p.cveNotes && (
                            <div className="text-[11px] text-callout-danger-fg font-semibold flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{p.cveNotes}</span>
                            </div>
                          )}
                        </div>

                        {/* Suggested Automated Commands */}
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {p.suggestedTools.map((tool) => (
                            <span
                              key={tool}
                              className="text-[9px] px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 2: TACTICAL PAYLOAD CRAFTER */}
          {activeTab === 'payloads' && (
            <div className="space-y-4">
              {/* Listener & Target HUD Bar */}
              <div className="p-3 rounded-xl bg-surface-sunken border border-subtle flex items-center justify-between flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-[10px] font-semibold">LHOST (TUN0):</span>
                    <input
                      id="recon-lhost-input"
                      name="recon-lhost"
                      aria-label="Attacker Host LHOST"
                      type="text"
                      value={globalVars.lhost}
                      onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                      placeholder="10.10.14.X"
                      className="w-28 px-2 py-1 rounded bg-surface-card border border-strong text-primary font-mono tabular-nums font-medium text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-tertiary text-[10px] font-semibold">LPORT:</span>
                    <input
                      id="recon-lport-input"
                      name="recon-lport"
                      aria-label="Attacker Port LPORT"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={globalVars.lport}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        if (!digits) {
                          setGlobalVars({ lport: '' });
                        } else {
                          const num = parseInt(digits, 10);
                          if (num <= 65535) {
                            setGlobalVars({ lport: String(num) });
                          }
                        }
                      }}
                      placeholder="4444"
                      className="w-16 px-2 py-1 rounded bg-surface-card border border-strong text-primary font-mono tabular-nums font-medium text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-tertiary text-[10px] font-semibold">Target IP</span>
                    <span className="px-2 py-1 rounded bg-surface-card border border-strong text-secondary font-mono tabular-nums font-medium text-xs">
                      {payloadTargetIp}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-muted">
                  Parameters automatically interpolated in real time
                </span>
              </div>

              {/* Bypass Encoder Matrix Pills */}
              <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-muted" />
                    REAL-TIME BYPASS ENCODER MATRIX:
                  </span>
                  <span className="text-[10px] text-secondary font-semibold">
                    Active: {ENCODER_OPTIONS.find(e => e.id === selectedEncoder)?.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {ENCODER_OPTIONS.map((enc) => {
                    const isSelected = selectedEncoder === enc.id;
                    return (
                      <button
                        key={enc.id}
                        onClick={() => {
                          setSelectedEncoder(enc.id);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        title={enc.description}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-[transform,background-color,border-color,color] flex items-center gap-1.5 active:scale-[0.97] ${
                          isSelected
                            ? 'bg-callout-success-fg text-on-accent border border-callout-success-border'
                            : 'bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-cyber-borderGlow'
                        }`}
                      >
                        <span>{enc.badge}</span>
                        <span className="text-[10px] opacity-80 hidden sm:inline">({enc.label})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter & Search Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'revshell', 'web', 'msfvenom', 'ad', 'privesc'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPayloadCategory(cat)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-[transform,background-color,border-color,color] active:scale-[0.98] ${
                        payloadCategory === cat
                          ? 'bg-accent-muted border border-subtle text-secondary'
                          : 'bg-surface-sunken border border-subtle text-muted hover:text-primary'
                      }`}
                    >
                      {cat === 'all' && 'ALL PAYLOADS'}
                      {cat === 'revshell' && 'Reverse shells'}
                      {cat === 'web' && 'WEB INJECTION'}
                      {cat === 'msfvenom' && 'MSFVenom'}
                      {cat === 'ad' && 'Active Directory'}
                      {cat === 'privesc' && 'PrivEsc'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="recon-payload-search-input"
                    name="recon-payload-search"
                    aria-label="Search payloads"
                    type="text"
                    value={payloadSearch}
                    onChange={(e) => setPayloadSearch(e.target.value)}
                    placeholder="Search payloads..."
                    className="pl-8 pr-3 py-1 rounded bg-surface-sunken border border-subtle text-primary text-xs w-44 sm:w-56 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Payload Cards List */}
              <div className="space-y-3">
                {filteredPayloads.map((item) => {
                  const rawCmd = item.commandTemplate;
                  const encodedCmd = applyBypassEncoder(rawCmd, selectedEncoder);
                  const isRawMode = selectedEncoder === 'raw';

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2.5 hover:border-cyber-borderGlow transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary text-xs">{item.title}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-surface-sunken border border-subtle text-secondary font-semibold">
                            {item.subCategory}
                          </span>
                          {item.os && <OsBadge os={item.os} size="xs" />}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyPayload(rawCmd, item.id + '-raw')}
                            className="px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-muted hover:text-primary hover:border-strong active:scale-[0.98] text-[11px] flex items-center gap-1 transition-[transform,background-color,border-color,color]"
                          >
                            {copiedPayloadKey === item.id + '-raw' ? (
                              <>
                                <Check className="w-3 h-3 text-callout-success-fg" />
                                <span className="text-callout-success-fg font-semibold">COPIED RAW</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>COPY RAW</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => copyPayload(encodedCmd, item.id + '-enc')}
                            className={`px-3 py-1 rounded-md text-[11px] flex items-center gap-1.5 transition-[transform,background-color,border-color,color] font-semibold active:scale-[0.98] ${
                              copiedPayloadKey === item.id + '-enc'
                                ? 'bg-callout-success-fg text-on-accent'
                                : 'bg-accent-muted border border-subtle text-secondary hover:bg-accent hover:text-on-accent'
                            }`}
                          >
                            {copiedPayloadKey === item.id + '-enc' ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>COPIED!</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>
                                  {isRawMode ? 'COPY' : `COPY [${selectedEncoder.toUpperCase()}]`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted leading-relaxed">
                        {item.description}
                      </p>

                      <div className="p-2.5 rounded-lg bg-surface-inverse text-on-inverse font-mono tabular-nums text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                        {encodedCmd}
                      </div>
                    </div>
                  );
                })}

                {filteredPayloads.length === 0 && (
                  <div className="p-8 text-center text-muted rounded-xl bg-surface-sunken border border-subtle">
                    No tactical payloads match your query "{payloadSearch}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPLOIT RULE ADVISOR */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-sunken border border-subtle text-xs space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-callout-warn-fg" />
                  <span>Exploit heuristics</span>
                </div>
                <p className="text-muted text-[11px]">
                  These automatic heuristics map discovered ports and daemons directly to tactical exploitation avenues.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">FTP Anonymous / Backdoor</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 21</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Attempts anonymous:anonymous login. Flags vsftpd 2.3.4 smiley trigger.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">Apache Path Traversal</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 80/443</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Flags Apache 2.4.49 / 2.4.50 for CVE-2021-41773 traversal tests with curl.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">SMB EternalBlue / Null Session</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 445</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Executes SMB anonymous IPC$ checks and flags MS17-010 on Windows Server 2008/2012.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">Kerberoasting / AS-REP Roasting</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 88</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Automates kerbrute user enumeration and Impacket GetNPUsers hash dumping.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">WinRM Remote Shell</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 5985/5986</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Instant evil-winrm interactive PowerShell session using captured credentials or hashes.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-xs">MSSQL xp_cmdshell</span>
                    <span className="text-[10px] text-muted font-mono tabular-nums">PORT 1433</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    Tests mssqlclient.py connection, linked database servers, and xp_cmdshell command execution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 p-3 px-4 border-t border-subtle bg-surface-sunken flex items-center justify-between text-xs">
          <span className="text-[11px] text-muted">
            Press <kbd className="px-1.5 py-0.5 rounded-md bg-surface-card border border-subtle text-primary">ESC</kbd> to close
          </span>

          <button
            onClick={() => setReconAutomationModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-surface-card border border-subtle text-primary hover:border-cyber-borderGlow active:scale-[0.98] transition-[transform,background-color,border-color,color]"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
