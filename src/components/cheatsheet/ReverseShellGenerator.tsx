import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Copy,
  Check,
  Download,
  Search,
  Zap,
  Shield,
  FileCode,
  Plus,
  Minus,
  X,
  Code2,
  ExternalLink,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { ALL_SHELL_ITEMS, ShellCategory, ShellItem } from '../../data/revshellsData';

interface ReverseShellGeneratorProps {
  initialCategory?: ShellCategory;
}

type PlatformFilter = 'All' | 'Linux' | 'Windows' | 'Web' | 'PentestMonkey' | 'MSFVenom' | 'HoaxShell' | 'TTY';
type EncodingType = 'RAW' | 'URL' | 'BASE64' | 'BASH_B64' | 'PS_ENC';
type CommandWrapper = 'none' | 'bash -c' | 'cmd /c';

const COMMON_PORTS = ['4444', '443', '80', '9001', '8080', '1337'];
const LISTENER_TYPES = [
  { id: 'nc', label: 'nc -lvnp' },
  { id: 'rlwrap', label: 'rlwrap nc' },
  { id: 'ncat', label: 'ncat' },
  { id: 'ncat-ssl', label: 'ncat (SSL)' },
  { id: 'rustcat', label: 'rustcat' },
  { id: 'pwncat', label: 'pwncat' },
  { id: 'socat', label: 'socat' },
  { id: 'powercat', label: 'powercat' },
];

export const ReverseShellGenerator: React.FC<ReverseShellGeneratorProps> = ({ initialCategory }) => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const lhost = globalVars.lhost || '10.10.14.x';
  const lport = globalVars.lport || '4444';
  const targetIp = globalVars.targetIp;
  const setLhost = (val: string) => setGlobalVars({ lhost: val });
  const setLport = (val: string) => setGlobalVars({ lport: val });

  // Active configuration
  const [selectedShellId, setSelectedShellId] = useState<string>('rev-bash-i');
  const [shellBinary, setShellBinary] = useState<string>('/bin/bash');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [encoding, setEncoding] = useState<EncodingType>('RAW');
  const [wrapper, setWrapper] = useState<CommandWrapper>('none');
  const [listenerType, setListenerType] = useState<string>('nc');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedListener, setCopiedListener] = useState(false);

  // Active selected shell
  const activeShell = useMemo(() => {
    return ALL_SHELL_ITEMS.find((s) => s.id === selectedShellId) || ALL_SHELL_ITEMS[0];
  }, [selectedShellId]);

  // Filtered shells list
  const filteredShells = useMemo(() => {
    let list = ALL_SHELL_ITEMS;

    // Platform / Category filter
    if (platformFilter === 'Linux') {
      list = list.filter((s) => s.platform === 'Linux' || s.platform === 'Both' || s.platform === 'All');
    } else if (platformFilter === 'Windows') {
      list = list.filter((s) => s.platform === 'Windows' || s.platform === 'Both' || s.platform === 'All');
    } else if (platformFilter === 'Web') {
      list = list.filter(
        (s) =>
          s.language === 'PHP' ||
          s.language === 'JSP' ||
          s.language === 'Node.js' ||
          s.language === 'Java' ||
          s.name.toLowerCase().includes('php') ||
          s.name.toLowerCase().includes('web')
      );
    } else if (platformFilter === 'PentestMonkey') {
      list = list.filter((s) => s.category === 'PentestMonkey');
    } else if (platformFilter === 'MSFVenom') {
      list = list.filter((s) => s.category === 'MSFVenom');
    } else if (platformFilter === 'HoaxShell') {
      list = list.filter((s) => s.category === 'HoaxShell');
    } else if (platformFilter === 'TTY') {
      list = list.filter((s) => s.category === 'TTY');
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.command.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [platformFilter, searchQuery]);

  // Interpolated payload
  const resolvedPayload = useMemo(() => {
    const raw = activeShell.command
      .replace(/{ip}/g, lhost || '10.10.14.x')
      .replace(/{port}/g, lport || '4444')
      .replace(/{shell}/g, shellBinary || '/bin/bash');

    // Apply wrapper
    let wrapped = raw;
    if (wrapper === 'bash -c') {
      wrapped = `bash -c '${raw.replace(/'/g, "'\\''")}'`;
    } else if (wrapper === 'cmd /c') {
      wrapped = `cmd.exe /c "${raw.replace(/"/g, '\"')}"`;
    }

    // Apply encoding
    if (encoding === 'URL') {
      return encodeURIComponent(wrapped);
    } else if (encoding === 'BASE64') {
      try {
        return btoa(unescape(encodeURIComponent(wrapped)));
      } catch {
        return btoa(wrapped);
      }
    } else if (encoding === 'BASH_B64') {
      try {
        const b64 = btoa(unescape(encodeURIComponent(wrapped)));
        return `echo "${b64}" | base64 -d | bash`;
      } catch {
        return wrapped;
      }
    } else if (encoding === 'PS_ENC') {
      try {
        // UTF-16LE Base64 for powershell -enc
        let utf16 = '';
        for (let i = 0; i < wrapped.length; i++) {
          utf16 += wrapped.charAt(i) + '\0';
        }
        return `powershell -nop -w hidden -enc ${btoa(utf16)}`;
      } catch {
        return wrapped;
      }
    }

    return wrapped;
  }, [activeShell, lhost, lport, shellBinary, wrapper, encoding]);

  // Listener command
  const listenerCommand = useMemo(() => {
    const p = lport || '4444';
    switch (listenerType) {
      case 'nc':
        return `nc -lvnp ${p}`;
      case 'rlwrap':
        return `rlwrap nc -lvnp ${p}`;
      case 'ncat':
        return `ncat -lvnp ${p}`;
      case 'ncat-ssl':
        return `ncat --ssl -lvnp ${p}`;
      case 'rustcat':
        return `rcat -l -p ${p}`;
      case 'pwncat':
        return `python3 -m pwncat -lp ${p}`;
      case 'socat':
        return `socat file:\`tty\`,raw,echo=0 tcp-listen:${p}`;
      case 'powercat':
        return `powercat -l -p ${p}`;
      default:
        return `nc -lvnp ${p}`;
    }
  }, [listenerType, lport]);

  // Stepper handlers
  const handlePortStep = (delta: number) => {
    const current = parseInt(lport, 10) || 4444;
    const next = Math.max(1, Math.min(65535, current + delta));
    setLport(next.toString());
    if (soundEnabled) playCyberSound('toggle');
  };

  // Copy payload
  const handleCopyPayload = () => {
    safeCopyToClipboard(resolvedPayload);
    setCopiedPayload(true);
    if (soundEnabled) playCyberSound('flag');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Copy listener
  const handleCopyListener = () => {
    safeCopyToClipboard(listenerCommand);
    setCopiedListener(true);
    if (soundEnabled) playCyberSound('click');
    setTimeout(() => setCopiedListener(false), 2000);
  };

  // Download script
  const handleDownload = () => {
    const ext = activeShell.extension || '.sh';
    const filename = `${activeShell.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}${ext}`;
    const blob = new Blob([resolvedPayload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('export');
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* 1. ATTACKER CONFIGURATION RIBBON */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* LHOST Configuration */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-cyan-700 dark:text-cyber-cyan uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" />
            LHOST:
          </span>
          <div className="inline-flex items-center h-8 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 px-2 shadow-inner focus-within:border-cyan-500 dark:focus-within:border-cyber-cyan focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all">
            <input
              type="text"
              id="revshell-lhost-input"
              name="revshell-lhost"
              aria-label="Reverse Shell LHOST"
              value={lhost}
              onChange={(e) => setLhost(e.target.value)}
              placeholder="10.10.14.x"
              className="w-32 h-7 bg-transparent text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none placeholder-slate-400 dark:placeholder-slate-600"
              title="Attacker IP / Tun0 interface IP"
            />
          </div>
          {targetIp && (
            <button
              type="button"
              onClick={() => {
                setLhost(targetIp);
                if (soundEnabled) playCyberSound('toggle');
              }}
              className="h-8 px-2.5 flex items-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan transition-all active:scale-95"
              title="Set to Active Target IP"
            >
              TARGET
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setLhost('127.0.0.1');
              if (soundEnabled) playCyberSound('toggle');
            }}
            className="h-8 px-2 flex items-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyber-cyan transition-all active:scale-95"
            title="Set to localhost"
          >
            127.0.0.1
          </button>
        </div>

        {/* LPORT Configuration */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-cyber-emerald uppercase tracking-wider">
            LPORT:
          </span>
          {/* Precision Stepper Capsule */}
          <div className="inline-flex items-center h-8 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 p-0.5 shadow-inner focus-within:border-emerald-500 dark:focus-within:border-cyber-emerald focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
            <button
              type="button"
              onClick={() => handlePortStep(-1)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
              title="Decrease port (-1)"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <input
              type="text"
              id="revshell-lport-input"
              name="revshell-lport"
              aria-label="Reverse Shell LPORT"
              value={lport}
              onChange={(e) => setLport(e.target.value)}
              placeholder="4444"
              className="w-14 h-7 text-center bg-transparent text-emerald-800 dark:text-cyber-emerald text-xs font-mono font-bold tracking-wider focus:outline-none selection:bg-emerald-500/30"
            />
            <button
              type="button"
              onClick={() => handlePortStep(1)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95"
              title="Increase port (+1)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Port Channel Chips */}
          <div className="hidden sm:inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            {COMMON_PORTS.map((p) => {
              const isActive = lport === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setLport(p);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`h-7 px-2.5 flex items-center justify-center rounded-md text-[11px] font-mono font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-cyber-emerald text-white dark:text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.35)] dark:shadow-[0_0_12px_rgba(0,255,159,0.4)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shell Binary Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
            SHELL:
          </span>
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            {['/bin/bash', '/bin/sh', 'powershell', 'cmd.exe'].map((bin) => {
              const isActive = shellBinary === bin;
              return (
                <button
                  key={bin}
                  type="button"
                  onClick={() => {
                    setShellBinary(bin);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`h-7 px-2 flex items-center rounded-md text-[11px] font-mono transition-all active:scale-95 ${
                    isActive
                      ? 'bg-purple-600 dark:bg-cyber-purple text-white dark:text-slate-950 font-bold shadow-[0_0_10px_rgba(168,85,247,0.35)] dark:shadow-[0_0_12px_rgba(176,38,255,0.4)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  {bin.replace('/bin/', '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. PLATFORM FILTERS & REAL-TIME SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Category / Platform Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {(
            [
              { id: 'All', label: 'All', count: ALL_SHELL_ITEMS.length },
              { id: 'Linux', label: '🐧 Linux' },
              { id: 'Windows', label: '🪟 Windows' },
              { id: 'Web', label: '🌐 Web/PHP' },
              { id: 'PentestMonkey', label: '🐒 PentestMonkey' },
              { id: 'MSFVenom', label: '💣 MSFVenom' },
              { id: 'HoaxShell', label: '🛡️ HoaxShell' },
              { id: 'TTY', label: '📟 TTY' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setPlatformFilter(tab.id);
                if (soundEnabled) playCyberSound('toggle');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all ${
                platformFilter === tab.id
                  ? 'bg-cyan-500 text-black shadow-glow-cyan/20 font-bold'
                  : 'bg-cyber-card hover:bg-cyber-border border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {'count' in tab && <span className="ml-1 opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Compact Search Input */}
        <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-cyber-muted" />
          <input
            type="text"
            id="revshell-search-input"
            name="revshell-search"
            aria-label="Filter reverse shell payloads"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${filteredShells.length} payloads...`}
            className="w-full pl-8 pr-7 py-1 rounded-lg bg-cyber-card border border-cyber-border text-xs text-slate-900 dark:text-white placeholder-cyber-muted focus:border-cyber-cyan focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. MINIMALIST PAYLOAD SELECTOR CHIPS */}
      <div className="p-2 rounded-xl bg-cyber-card/60 border border-cyber-border/70 max-h-36 overflow-y-auto scrollbar-thin">
        <div className="flex flex-wrap gap-1.5">
          {filteredShells.length === 0 ? (
            <div className="text-cyber-muted text-xs p-2">No reverse shells matched your query.</div>
          ) : (
            filteredShells.map((shell) => {
              const isSelected = shell.id === selectedShellId;
              return (
                <button
                  key={shell.id}
                  onClick={() => {
                    setSelectedShellId(shell.id);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500 dark:bg-cyber-emerald text-black font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-cyber-bg hover:bg-slate-200 dark:hover:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                  title={`${shell.name} (${shell.language}) - ${shell.platform}`}
                >
                  <span>{shell.name}</span>
                  {shell.isFullScript && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded uppercase ${
                        isSelected ? 'bg-black/20 text-black' : 'bg-purple-100 dark:bg-cyber-purple/20 text-purple-900 dark:text-cyber-purple'
                      }`}
                    >
                      FILE
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 4. HERO PAYLOAD TERMINAL BOX */}
      <div className="rounded-xl bg-white dark:bg-cyber-card border border-cyan-400/50 dark:border-cyber-cyan/40 shadow-lg overflow-hidden">
        {/* Terminal Header & Controls */}
        <div className="px-3.5 py-2 bg-slate-100 dark:bg-cyber-bg/95 border-b border-slate-200 dark:border-cyber-border flex flex-wrap items-center justify-between gap-2">
          {/* Active Shell Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
            <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
              {activeShell.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/30 text-cyan-900 dark:text-cyber-cyan font-bold">
              {activeShell.platform}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-cyber-purple/10 border border-purple-300 dark:border-cyber-purple/30 text-purple-900 dark:text-cyber-purple font-mono">
              {activeShell.language}
            </span>
            {activeShell.notes && (
              <span className="text-[10px] text-slate-600 dark:text-cyber-muted truncate hidden md:inline">
                ({activeShell.notes})
              </span>
            )}
          </div>

          {/* Encodings, Wrappers & Actions */}
          <div className="flex items-center gap-2">
            {/* Encoding Switcher */}
            <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border rounded-lg p-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-cyber-muted uppercase px-1 hidden sm:inline select-none">
                ENC:
              </span>
              {(['RAW', 'URL', 'BASE64', 'BASH_B64', 'PS_ENC'] as EncodingType[]).map((enc) => (
                <button
                  key={enc}
                  onClick={() => {
                    setEncoding(enc);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    encoding === enc
                      ? 'bg-cyber-cyan text-black font-bold shadow-sm'
                      : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`Encode payload with ${enc.replace('_', ' ')}`}
                >
                  {enc.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Optional Wrapper */}
            <div className="hidden lg:flex items-center gap-0.5 bg-slate-200/70 dark:bg-cyber-card border border-slate-300 dark:border-cyber-border rounded-lg p-0.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-cyber-muted uppercase px-1 select-none">
                WRAP:
              </span>
              {(['none', 'bash -c', 'cmd /c'] as CommandWrapper[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setWrapper(w);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    wrapper === w
                      ? 'bg-cyber-purple text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={w === 'none' ? 'Direct execution without shell wrapper' : `Wrap payload in ${w}`}
                >
                  {w === 'none' ? 'DIRECT' : w}
                </button>
              ))}
            </div>

            {/* Download File Button (if applicable) */}
            {(activeShell.isFullScript || activeShell.extension) && (
              <button
                onClick={handleDownload}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-border border border-slate-300 dark:border-cyber-border text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                title={`Download as ${activeShell.extension || '.sh'} file`}
              >
                <Download className="w-3.5 h-3.5 text-cyber-cyan" />
                <span className="hidden sm:inline">Save {activeShell.extension}</span>
              </button>
            )}

            {/* 1-Click Copy Payload Button */}
            <button
              onClick={handleCopyPayload}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                copiedPayload
                  ? 'bg-cyber-emerald text-black shadow-glow-emerald/30'
                  : 'bg-cyber-cyan hover:bg-cyber-cyan/90 text-black shadow-glow-cyan/20'
              }`}
            >
              {copiedPayload ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY PAYLOAD</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Box - Permanent Dark Terminal for crisp hacker syntax in both themes */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 font-mono text-xs overflow-x-auto max-h-72 scrollbar-thin">
          <pre className="text-emerald-400 whitespace-pre-wrap break-all leading-relaxed select-all">
            {resolvedPayload}
          </pre>
        </div>
      </div>

      {/* 5. COMPACT LISTENER COMMAND STRIP */}
      <div className="p-2.5 rounded-xl bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-emerald-600 dark:text-cyber-emerald flex-shrink-0" />
          <span className="text-[11px] font-bold text-emerald-800 dark:text-cyber-emerald uppercase">LISTENER:</span>

          {/* Listener selector pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-md scrollbar-none">
            {LISTENER_TYPES.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setListenerType(l.id);
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors ${
                  listenerType === l.id
                    ? 'bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald border border-emerald-300 dark:border-cyber-emerald/60 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-card text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-cyber-border'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listener Command Preview & Copy */}
        <div className="flex items-center gap-2">
          <code className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs select-all">
            {listenerCommand}
          </code>
          <button
            onClick={handleCopyListener}
            className={`p-1.5 rounded-lg border transition-all ${
              copiedListener
                ? 'bg-cyber-emerald text-black border-cyber-emerald'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-cyber-bg dark:hover:bg-cyber-border text-slate-700 dark:text-white border-slate-300 dark:border-cyber-border'
            }`}
            title="Copy listener command"
          >
            {copiedListener ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
