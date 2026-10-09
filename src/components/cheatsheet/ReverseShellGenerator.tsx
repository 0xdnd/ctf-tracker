import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  X,
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { ALL_SHELL_ITEMS, ShellCategory } from '../../data/revshellsData';
import { SyntaxHighlightedCommand } from '../common/SyntaxHighlightedCommand';

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

export const ReverseShellGenerator: React.FC<ReverseShellGeneratorProps> = () => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const lhost = globalVars.lhost || '10.10.14.x';
  const lport = globalVars.lport || '4444';
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

  const segWrap = 'inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-sunken p-0.5';
  const segBtn =
    'inline-flex h-7 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-[transform,background-color,color] active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-9';
  const segOn = 'bg-surface-card text-primary shadow-xs';
  const segOff = 'text-muted hover:text-primary';

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Attacker configuration */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-subtle pb-4">
        {/* LHOST / LPORT / TARGET are edited once in the page header; presets only here */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">LPORT preset</span>
          <div className={`inline-flex ${segWrap}`}>
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
                  className={`${segBtn} font-mono tabular-nums ${isActive ? segOn : segOff}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shell binary */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Shell</span>
          <div className="-mx-1 max-w-full overflow-x-auto no-scrollbar px-1">
            <div className={segWrap}>
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
                    className={`${segBtn} font-mono ${isActive ? segOn : segOff}`}
                  >
                    {bin.replace('/bin/', '')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Platform filters and search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:max-w-full sm:px-0">
          <div className="flex min-w-max items-center gap-1">
            {(
              [
                { id: 'All', label: 'All', count: ALL_SHELL_ITEMS.length },
                { id: 'Linux', label: 'Linux' },
                { id: 'Windows', label: 'Windows' },
                { id: 'Web', label: 'Web/PHP' },
                { id: 'PentestMonkey', label: 'PentestMonkey' },
                { id: 'MSFVenom', label: 'MSFVenom' },
                { id: 'HoaxShell', label: 'HoaxShell' },
                { id: 'TTY', label: 'TTY' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPlatformFilter(tab.id);
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`inline-flex min-h-8 flex-shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11 ${
                  platformFilter === tab.id
                    ? 'border-accent bg-accent-muted text-primary'
                    : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
                }`}
              >
                {tab.label}
                {'count' in tab && <span className="ml-1 tabular-nums text-muted">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            id="revshell-search-input"
            name="revshell-search"
            aria-label="Filter reverse shell payloads"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${filteredShells.length} payloads...`}
            className="h-8 w-full rounded-lg border border-subtle bg-surface-card pl-8 pr-8 text-xs text-primary placeholder:text-muted transition-colors focus:border-accent focus:outline-none [@media(pointer:coarse)]:h-11"
          />
          {searchQuery && (
            <button aria-label="Clear filter"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-muted hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Payload selector chips */}
      <div className="max-h-36 overflow-y-auto scrollbar-thin">
        <div className="flex flex-wrap gap-1.5">
          {filteredShells.length === 0 ? (
            <div className="p-2 text-xs text-muted">No reverse shells matched your query.</div>
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
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11 ${
                    isSelected
                      ? 'border-accent bg-accent-muted font-medium text-primary'
                      : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
                  }`}
                  title={`${shell.name} (${shell.language}) - ${shell.platform}`}
                >
                  <span>{shell.name}</span>
                  {shell.isFullScript && (
                    <span className="rounded px-1 text-[11px] font-medium text-muted">File</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Payload terminal: the one intentionally dark panel */}
      <div className="overflow-hidden rounded-xl border border-subtle">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-subtle bg-surface-sunken px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-semibold text-primary">{activeShell.name}</span>
            <span className="rounded border border-subtle bg-surface-card px-1.5 text-[11px] font-medium text-secondary">
              {activeShell.platform}
            </span>
            <span className="rounded border border-subtle bg-surface-card px-1.5 text-[11px] font-medium text-secondary">
              {activeShell.language}
            </span>
            {activeShell.notes && (
              <span className="hidden truncate text-[11px] text-muted md:inline">
                ({activeShell.notes})
              </span>
            )}
          </div>

          <div className="flex min-w-0 max-w-full items-center gap-2">
            <div className="max-w-full overflow-x-auto no-scrollbar">
              <div className={segWrap}>
                <span className="hidden select-none px-1 text-[11px] text-muted sm:inline">Encoding</span>
                {(['RAW', 'URL', 'BASE64', 'BASH_B64', 'PS_ENC'] as EncodingType[]).map((enc) => (
                  <button
                    key={enc}
                    onClick={() => {
                      setEncoding(enc);
                      if (soundEnabled) playCyberSound('toggle');
                    }}
                    className={`${segBtn} font-mono ${encoding === enc ? segOn : segOff}`}
                    title={`Encode payload with ${enc.replace('_', ' ')}`}
                  >
                    {enc.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className={`hidden lg:inline-flex ${segWrap}`}>
              <span className="select-none px-1 text-[11px] text-muted">Wrap</span>
              {(['none', 'bash -c', 'cmd /c'] as CommandWrapper[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setWrapper(w);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`${segBtn} font-mono ${wrapper === w ? segOn : segOff}`}
                  title={w === 'none' ? 'Direct execution without shell wrapper' : `Wrap payload in ${w}`}
                >
                  {w === 'none' ? 'Direct' : w}
                </button>
              ))}
            </div>

            {(activeShell.isFullScript || activeShell.extension) && (
              <button
                onClick={handleDownload}
                className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-subtle bg-surface-card px-2.5 text-xs font-medium text-primary transition-[transform,background-color] hover:bg-surface-hover active:scale-[0.97] [@media(pointer:coarse)]:h-11"
                title={`Download as ${activeShell.extension || '.sh'} file`}
              >
                <Download className="h-3.5 w-3.5 text-muted" />
                <span className="hidden sm:inline">Save {activeShell.extension}</span>
              </button>
            )}

            <button
              onClick={handleCopyPayload}
              className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-[transform,background-color,color] active:scale-[0.97] [@media(pointer:coarse)]:h-11 ${
                copiedPayload
                  ? 'border border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                  : 'border border-accent bg-accent text-on-accent hover:brightness-105'
              }`}
            >
              {copiedPayload ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy payload</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-x-auto bg-surface-inverse p-3.5 font-mono text-xs text-on-inverse scrollbar-thin">
          <pre className="whitespace-pre-wrap break-all leading-relaxed select-all">
            <SyntaxHighlightedCommand command={resolvedPayload} className="!bg-transparent !p-0" />
          </pre>
        </div>
      </div>

      {/* 5. Listener */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex-shrink-0 text-xs font-medium text-muted">Listener</span>

          <div className="-mx-1 max-w-full overflow-x-auto no-scrollbar px-1">
            <div className="flex items-center gap-1">
              {LISTENER_TYPES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setListenerType(l.id);
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`inline-flex min-h-7 flex-shrink-0 items-center whitespace-nowrap rounded-md border px-2 font-mono text-xs transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11 ${
                    listenerType === l.id
                      ? 'border-accent bg-accent-muted font-medium text-primary'
                      : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <code className="min-w-0 overflow-x-auto rounded-md bg-surface-inverse px-2.5 py-1.5 text-xs text-on-inverse select-all">
            <SyntaxHighlightedCommand command={listenerCommand} className="!bg-transparent !p-0" />
          </code>
          <button aria-label="Copy listener command"
            onClick={handleCopyListener}
            className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-[transform,background-color,color] active:scale-[0.97] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${
              copiedListener
                ? 'border-callout-success-border bg-callout-success-bg text-callout-success-fg'
                : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
            title="Copy listener command"
          >
            {copiedListener ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
