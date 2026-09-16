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

  if (!reconAutomationModalOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md font-mono"
      onClick={() => setReconAutomationModalOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.18 }}
        className="w-full sm:max-w-5xl h-full sm:h-[92vh] max-h-none sm:max-h-[860px] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-cyber-cyan/40 bg-cyber-card shadow-2xl overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-cyber-border bg-cyber-bg/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  ZEROBOX TACTICAL AUTOMATION HUB
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan font-bold">
                  MULTI-FORMAT SCAN & PAYLOAD CRAFTER
                </span>
              </div>
              <p className="text-[11px] text-cyber-muted">
                Multi-format scan ingestion (XML, Nmap, Grepable, Rustscan), freeze-guarded auto-apply, and real-time bypass encoders.
              </p>
            </div>
          </div>

          <button
            onClick={() => setReconAutomationModalOpen(false)}
            className="p-1.5 rounded-lg border border-cyber-border bg-cyber-bg text-cyber-muted hover:text-white hover:border-cyber-borderGlow transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Machine Selection Bar */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-cyber-bg border-b border-cyber-border flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-cyber-muted uppercase text-[10px] font-bold">TARGET WORKSPACE:</span>
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
              triggerClassName="py-1 px-2.5 bg-cyber-card border-cyber-border font-bold text-white max-w-[280px]"
            />

            {isTargetFrozen && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300 font-semibold">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>SOLVE FROZEN (IMMUTABLE)</span>
              </span>
            )}
          </div>

          {targetMachine && (
            <div className="flex items-center gap-2">
              <PlatformBadge platform={targetMachine.platform} size="sm" />
              <OsBadge os={targetMachine.os} size="xs" />
              <span className="text-cyber-muted text-[11px] font-mono">{targetMachine.ip}</span>
            </div>
          )}
        </div>

        {/* Auto-detected Target Match Prompt */}
        {autoMatchedTarget && (
          <div className="flex-shrink-0 px-4 py-2 bg-cyber-cyan/10 border-b border-cyber-cyan/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-cyber-cyan">
              <Radio className="w-4 h-4 animate-ping text-cyber-cyan" />
              <span>
                Detected IP <strong className="text-white font-mono">{parsedResults?.detectedIp}</strong> matches catalog target <strong className="text-white">{autoMatchedTarget.name}</strong> ({autoMatchedTarget.platform})
              </span>
            </div>
            <button
              onClick={() => setTargetMachineId(autoMatchedTarget.id)}
              className="px-2.5 py-1 rounded bg-cyber-cyan text-black font-bold text-xs hover:bg-cyan-300 transition-colors shadow-sm flex items-center gap-1"
            >
              <span>Switch to {autoMatchedTarget.name}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex-shrink-0 flex items-center border-b border-cyber-border bg-cyber-card px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('parser')}
            className={`px-3 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parser'
                ? 'border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5'
                : 'border-transparent text-cyber-muted hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SCAN & NMAP IMPORTER</span>
            {parsedResults && parsedResults.ports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyber-cyan/20 text-cyber-cyan font-bold">
                {parsedResults.ports.length} ports
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('payloads')}
            className={`px-3 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'payloads'
                ? 'border-cyber-emerald text-cyber-emerald bg-cyber-emerald/5'
                : 'border-transparent text-cyber-muted hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>TACTICAL PAYLOAD CRAFTER</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyber-emerald/20 text-cyber-emerald font-bold">
              {tacticalPayloads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-2 border-b-2 font-bold transition-all flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'border-purple-400 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-cyber-muted hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>EXPLOIT RULE ADVISOR</span>
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
                  <span className="text-[10px] font-bold text-cyber-muted uppercase">LOAD SAMPLES:</span>
                  <button
                    onClick={() => setScanText(SAMPLE_LINUX_SCAN)}
                    className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-cyber-cyan hover:border-cyber-cyan text-[11px] transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Linux Lame
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_WINDOWS_AD_SCAN)}
                    className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-blue-400 hover:border-blue-400 text-[11px] transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" /> Windows AD
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_NMAP_XML)}
                    className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-emerald-400 hover:border-emerald-400 text-[11px] transition-colors flex items-center gap-1 font-semibold"
                  >
                    <FileCode className="w-3 h-3" /> Nmap XML
                  </button>
                  <button
                    onClick={() => setScanText(SAMPLE_RUSTSCAN)}
                    className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-orange-400 hover:border-orange-400 text-[11px] transition-colors flex items-center gap-1 font-semibold"
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
                    className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-white hover:border-cyber-cyan text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3 text-cyber-cyan" /> Upload Scan
                  </button>

                  {scanText && (
                    <button
                      onClick={() => setScanText('')}
                      className="text-cyber-muted hover:text-cyber-crimson text-[11px] flex items-center gap-1 transition-colors ml-1"
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
                className={`relative rounded-xl transition-all ${
                  isDragging 
                    ? 'ring-2 ring-cyber-cyan bg-cyber-cyan/10' 
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
                  className="w-full bg-cyber-bg px-3.5 py-2.5 rounded-xl border border-cyber-border text-cyber-emerald font-mono text-xs focus:outline-none focus:border-cyber-cyan transition-all shadow-inner leading-relaxed"
                />

                {isDragging && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="text-center text-cyber-cyan space-y-1">
                      <Upload className="w-8 h-8 mx-auto animate-bounce" />
                      <p className="font-bold text-sm">Drop scan file (.xml, .nmap, .gnmap, .txt) to parse</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Format Badge & Metadata Bar */}
              {parsedResults && (
                <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-cyber-muted font-bold">DETECTED FORMAT:</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      parsedResults.format === 'nmap-xml'
                        ? 'bg-emerald-950/60 border border-emerald-500/60 text-emerald-400'
                        : parsedResults.format === 'rustscan'
                        ? 'bg-orange-950/60 border border-orange-500/60 text-orange-400'
                        : parsedResults.format === 'gnmap'
                        ? 'bg-purple-950/60 border border-purple-500/60 text-purple-400'
                        : 'bg-cyan-950/60 border border-cyan-500/60 text-cyan-400'
                    }`}>
                      {parsedResults.format}
                    </span>

                    {parsedResults.detectedIp && (
                      <span className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-white font-mono">
                        IP: {parsedResults.detectedIp}
                      </span>
                    )}

                    {parsedResults.detectedHost && (
                      <span className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-white">
                        HOST: {parsedResults.detectedHost}
                      </span>
                    )}

                    {parsedResults.detectedOs && (
                      <span className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-white">
                        OS: {parsedResults.detectedOs}
                      </span>
                    )}
                  </div>

                  <span className="text-cyber-muted">
                    Found <strong className="text-white font-bold">{parsedResults.ports.length}</strong> open ports
                  </span>
                </div>
              )}

              {/* Frozen Solve Banner Warning */}
              {isTargetFrozen && parsedResults && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-amber-300">
                      TARGET IS COMPLETED // MODIFICATION FROZEN
                    </div>
                    <p className="text-amber-200/80 leading-relaxed text-[11px]">
                      Target <strong className="text-white font-semibold">{targetMachine?.name}</strong> is one of Daniel Dayan's 63 completed solves. 
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
                  className="p-4 rounded-xl border border-cyber-cyan/30 bg-cyber-bg/70 space-y-3.5 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-cyber-border/80 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        DISCOVERED OPEN SERVICES ({parsedResults.ports.length})
                      </span>
                      {parsedResults.detectedOs && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-cyber-muted">
                          OS: {parsedResults.detectedOs}
                        </span>
                      )}
                    </div>

                    {/* Apply to Target Button with Frozen Solve Guard */}
                    <button
                      disabled={isTargetFrozen || parsedResults.ports.length === 0}
                      onClick={handleApplyToMachine}
                      title={isTargetFrozen ? "Target is marked completed. Select an in-progress target." : undefined}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                        isTargetFrozen
                          ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60'
                          : appliedSuccess
                          ? 'bg-cyber-emerald text-black shadow-glow-emerald'
                          : 'bg-cyber-cyan text-black hover:bg-cyan-300 shadow-glow-cyan'
                      }`}
                    >
                      {isTargetFrozen ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                          <span>FROZEN // SOLVE COMPLETED</span>
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
                        className="p-2.5 rounded-lg bg-cyber-card border border-cyber-border/70 flex items-start justify-between gap-3 hover:border-cyber-cyan/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-cyber-cyan text-sm font-mono">
                              {p.port}/{p.protocol}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyber-bg border border-cyber-border font-bold text-[10px] text-white uppercase">
                              {p.service}
                            </span>
                            <span className="text-cyber-muted text-xs">
                              {p.version}
                            </span>
                          </div>

                          {p.cveNotes && (
                            <div className="text-[11px] text-cyber-crimson font-semibold flex items-center gap-1.5">
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
                              className="text-[9px] px-2 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-cyan font-mono"
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
              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border flex items-center justify-between flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-cyber-muted text-[10px] uppercase font-bold">LHOST (TUN0):</span>
                    <input
                      id="recon-lhost-input"
                      name="recon-lhost"
                      aria-label="Attacker Host LHOST"
                      type="text"
                      value={globalVars.lhost}
                      onChange={(e) => setGlobalVars({ lhost: e.target.value })}
                      placeholder="10.10.14.X"
                      className="w-28 px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-emerald-700 dark:text-cyber-emerald font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-cyber-muted text-[10px] uppercase font-bold">LPORT:</span>
                    <input
                      id="recon-lport-input"
                      name="recon-lport"
                      aria-label="Attacker Port LPORT"
                      type="text"
                      value={globalVars.lport}
                      onChange={(e) => setGlobalVars({ lport: e.target.value })}
                      placeholder="4444"
                      className="w-16 px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-emerald-700 dark:text-cyber-emerald font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-cyber-muted text-[10px] uppercase font-bold">TARGET IP:</span>
                    <span className="px-2 py-1 rounded bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-cyan-700 dark:text-cyber-cyan font-mono font-bold text-xs">
                      {payloadTargetIp}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-cyber-muted">
                  Parameters automatically interpolated in real time
                </span>
              </div>

              {/* Bypass Encoder Matrix Pills */}
              <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyber-muted uppercase flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyber-cyan" />
                    REAL-TIME BYPASS ENCODER MATRIX:
                  </span>
                  <span className="text-[10px] text-cyber-cyan font-semibold">
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
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyber-emerald text-black shadow-glow-emerald/30 border border-cyber-emerald'
                            : 'bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-borderGlow'
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
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        payloadCategory === cat
                          ? 'bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan shadow-sm'
                          : 'bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white'
                      }`}
                    >
                      {cat === 'all' && 'ALL PAYLOADS'}
                      {cat === 'revshell' && 'REVERSE SHELLS'}
                      {cat === 'web' && 'WEB INJECTION'}
                      {cat === 'msfvenom' && 'MSFVENOM'}
                      {cat === 'ad' && 'ACTIVE DIRECTORY'}
                      {cat === 'privesc' && 'PRIVESC'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyber-muted" />
                  <input
                    id="recon-payload-search-input"
                    name="recon-payload-search"
                    aria-label="Search payloads"
                    type="text"
                    value={payloadSearch}
                    onChange={(e) => setPayloadSearch(e.target.value)}
                    placeholder="Search payloads..."
                    className="pl-8 pr-3 py-1 rounded bg-cyber-bg border border-cyber-border text-white text-xs w-44 sm:w-56 focus:outline-none focus:border-cyber-cyan"
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
                      className="p-3.5 rounded-xl border border-cyber-border bg-cyber-card space-y-2.5 shadow-sm hover:border-cyber-borderGlow transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{item.title}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-cyan font-bold">
                            {item.subCategory}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            item.os === 'Windows'
                              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/40'
                              : item.os === 'Linux'
                              ? 'text-cyber-emerald bg-emerald-950/40 border border-emerald-800/40'
                              : 'text-purple-400 bg-purple-950/40 border border-purple-800/40'
                          }`}>
                            {item.os}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyPayload(rawCmd, item.id + '-raw')}
                            className="px-2.5 py-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white hover:border-cyber-cyan text-[11px] flex items-center gap-1 transition-colors"
                          >
                            {copiedPayloadKey === item.id + '-raw' ? (
                              <>
                                <Check className="w-3 h-3 text-cyber-emerald" />
                                <span className="text-cyber-emerald font-bold">COPIED RAW</span>
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
                            className={`px-3 py-1 rounded text-[11px] flex items-center gap-1.5 transition-all font-bold ${
                              copiedPayloadKey === item.id + '-enc'
                                ? 'bg-cyber-emerald text-black shadow-glow-emerald'
                                : 'bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black shadow-sm'
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

                      <p className="text-[11px] text-cyber-muted leading-relaxed">
                        {item.description}
                      </p>

                      <div className="p-2.5 rounded-lg bg-cyber-bg border border-cyber-border/70 text-cyber-emerald font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                        {encodedCmd}
                      </div>
                    </div>
                  );
                })}

                {filteredPayloads.length === 0 && (
                  <div className="p-8 text-center text-cyber-muted rounded-xl bg-cyber-bg border border-cyber-border">
                    No tactical payloads match your query "{payloadSearch}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXPLOIT RULE ADVISOR */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border text-xs space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyber-amber" />
                  <span>AUTOMATED EXPLOIT HEURISTICS & RULES</span>
                </div>
                <p className="text-cyber-muted text-[11px]">
                  These automatic heuristics map discovered ports and daemons directly to tactical exploitation avenues.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">FTP Anonymous / Backdoor</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 21</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Attempts anonymous:anonymous login. Flags vsftpd 2.3.4 smiley trigger.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Apache Path Traversal</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 80/443</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Flags Apache 2.4.49 / 2.4.50 for CVE-2021-41773 traversal tests with curl.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">SMB EternalBlue / Null Session</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 445</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Executes SMB anonymous IPC$ checks and flags MS17-010 on Windows Server 2008/2012.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Kerberoasting / AS-REP Roasting</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 88</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Automates kerbrute user enumeration and Impacket GetNPUsers hash dumping.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">WinRM Remote Shell</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 5985/5986</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Instant evil-winrm interactive PowerShell session using captured credentials or hashes.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyber-card border border-cyber-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">MSSQL xp_cmdshell</span>
                    <span className="text-[10px] text-cyber-emerald font-mono">PORT 1433</span>
                  </div>
                  <p className="text-[11px] text-cyber-muted">
                    Tests mssqlclient.py connection, linked database servers, and xp_cmdshell command execution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 p-3 px-4 border-t border-cyber-border bg-cyber-bg flex items-center justify-between text-xs">
          <span className="text-[11px] text-cyber-muted">
            Press <kbd className="px-1.5 py-0.5 rounded bg-cyber-card border border-cyber-border text-white">ESC</kbd> to close
          </span>

          <button
            onClick={() => setReconAutomationModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-cyber-card border border-cyber-border text-white hover:border-cyber-borderGlow transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
