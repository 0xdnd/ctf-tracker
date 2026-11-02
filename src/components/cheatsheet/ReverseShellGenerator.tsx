import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useActiveTargetIp } from '../../hooks/useActiveTargetIp';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { ALL_SHELL_ITEMS, availableShellItems, ShellCategory, ShellItem } from '../../data/revshellsData';
import { SyntaxHighlightedCommand } from '../common/SyntaxHighlightedCommand';
import { resolveTemplate, contextFromGlobalVars } from '../../utils/variableSubstitution';

interface ReverseShellGeneratorProps {
  initialCategory?: ShellCategory;
}

type PlatformFilter = 'All' | 'Linux' | 'Windows' | 'Web' | 'PentestMonkey' | 'MSFVenom' | 'HoaxShell' | 'TTY';
export type EncodingType = 'RAW' | 'URL' | 'BASE64' | 'BASH_B64' | 'PS_ENC';
export type CommandWrapper = 'none' | 'bash -c' | 'cmd /c';

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

// ---------------------------------------------------------------------------
// Interpreter / template compatibility (pure, unit-tested in revshellInterpreterCompat.test.ts)
// ---------------------------------------------------------------------------
export const SHELL_BINARIES = ['/bin/bash', '/bin/sh', 'powershell', 'cmd.exe'] as const;
export type ShellBinary = (typeof SHELL_BINARIES)[number];

/** Whether `{shell}` is actually substituted into this template's command. */
export function templateUsesShellToken(template: Pick<ShellItem, 'command'>): boolean {
  return template.command.includes('{shell}');
}

/** OS family the interpreter binary runs on. */
export function shellBinaryFamily(bin: string): 'Linux' | 'Windows' {
  return bin === 'powershell' || bin === 'cmd.exe' ? 'Windows' : 'Linux';
}

/**
 * OS family implied by a template's `platform` tag. `Both`/`All` are platform-neutral — the
 * catalog currently only ever uses `Linux`, `Windows` and `Both` ('All' and 'macOS' are typed but
 * unused) — and `macOS` behaves like Linux for the bash/sh binaries offered here.
 */
function familyOfPlatform(platform: ShellItem['platform']): 'Linux' | 'Windows' | 'Neutral' {
  switch (platform) {
    case 'Linux':
    case 'macOS':
      return 'Linux';
    case 'Windows':
      return 'Windows';
    case 'Both':
    case 'All':
      return 'Neutral';
  }
}

/**
 * OS family implied by a template's `language`, for the handful of entries whose language value
 * itself names an OS (e.g. MSFVenom's "Windows"/"Linux"/"macOS" payloads). Returns null when the
 * language doesn't name one.
 */
function familyOfLanguage(language: string): 'Linux' | 'Windows' | null {
  if (language === 'Linux' || language === 'macOS') return 'Linux';
  if (language === 'Windows') return 'Windows';
  return null;
}

/**
 * A template is compatible with an interpreter only when the template's platform or language
 * belongs to that interpreter's OS family — whether or not the command actually substitutes
 * `{shell}`. A platform-neutral template (`Both`; `All` if the data ever uses it) is compatible
 * with every interpreter.
 */
export function isTemplateCompatibleWithShellBinary(
  template: Pick<ShellItem, 'platform' | 'language'>,
  shellBinary: string
): boolean {
  const family = shellBinaryFamily(shellBinary);
  const platformFamily = familyOfPlatform(template.platform);
  if (platformFamily === 'Neutral' || platformFamily === family) return true;
  return familyOfLanguage(template.language) === family;
}

/** Whether the template is tagged for the interpreter's own OS family (platform-neutral ones are not). */
export function isTemplateOfShellBinaryFamily(
  template: Pick<ShellItem, 'platform' | 'language'>,
  shellBinary: string
): boolean {
  const family = shellBinaryFamily(shellBinary);
  const platformFamily = familyOfPlatform(template.platform);
  return platformFamily === family || (platformFamily === 'Neutral' && familyOfLanguage(template.language) === family);
}

/**
 * First template (in catalog order) compatible with the given interpreter, if any. A template of the
 * interpreter's own OS family wins over a platform-neutral one, so choosing powershell never lands
 * on a neutral template that merely happens to come first.
 */
export function firstCompatibleTemplate(
  templates: readonly ShellItem[],
  shellBinary: string
): ShellItem | undefined {
  return (
    templates.find((t) => isTemplateOfShellBinaryFamily(t, shellBinary)) ??
    templates.find((t) => isTemplateCompatibleWithShellBinary(t, shellBinary))
  );
}

/** First interpreter (in `SHELL_BINARIES` order) compatible with the given template, if any. */
export function firstCompatibleShellBinary(
  template: Pick<ShellItem, 'platform' | 'language'>,
  binaries: readonly string[] = SHELL_BINARIES
): string | undefined {
  return binaries.find((bin) => isTemplateCompatibleWithShellBinary(template, bin));
}

/** Wraps a resolved command in `bash -c '...'` / `cmd.exe /c "..."`, escaping its own quote style. */
export function applyCommandWrapper(raw: string, wrapper: CommandWrapper): string {
  if (wrapper === 'bash -c') {
    return `bash -c '${raw.replace(/'/g, "'\\''")}'`;
  }
  if (wrapper === 'cmd /c') {
    return `cmd.exe /c "${raw.replace(/"/g, '\\"')}"`;
  }
  return raw;
}

/** Applies the chosen output encoding to an already-wrapped payload. Pure, unit-tested. */
export function applyPayloadEncoding(wrapped: string, encoding: EncodingType): string {
  if (encoding === 'URL') {
    return encodeURIComponent(wrapped);
  }
  if (encoding === 'BASE64') {
    try {
      return btoa(unescape(encodeURIComponent(wrapped)));
    } catch {
      return btoa(wrapped);
    }
  }
  if (encoding === 'BASH_B64') {
    try {
      const b64 = btoa(unescape(encodeURIComponent(wrapped)));
      return `echo "${b64}" | base64 -d | bash`;
    } catch {
      return wrapped;
    }
  }
  if (encoding === 'PS_ENC') {
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
}

export const ReverseShellGenerator: React.FC<ReverseShellGeneratorProps> = () => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const activeMachineIp = useActiveTargetIp();
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
  // Brief notice shown when picking an interpreter or payload auto-switches the other side
  const [compatNotice, setCompatNotice] = useState<string | null>(null);
  const announceSwitch = (msg: string) => {
    setCompatNotice(msg);
    setTimeout(() => setCompatNotice((cur) => (cur === msg ? null : cur)), 4000);
  };

  // Active selected shell
  const activeShell = useMemo(() => {
    return ALL_SHELL_ITEMS.find((s) => s.id === selectedShellId) || ALL_SHELL_ITEMS[0];
  }, [selectedShellId]);

  // Interpreter and payload must agree on OS family; this is a safety net in case they ever drift
  // (the handlers below keep them in sync as the user changes either one).
  const isCompatible = isTemplateCompatibleWithShellBinary(activeShell, shellBinary);
  // A row whose original command was never recovered (see revshellsData's `unavailable` rows) has
  // nothing to show or copy, regardless of interpreter compatibility.
  const isUsable = isCompatible && !activeShell.unavailable;
  // The interpreter picker only affects the command for templates that actually substitute
  // `{shell}`; for the others it's a no-op, so it's disabled rather than implying a choice that
  // does nothing.
  const shellTokenApplies = templateUsesShellToken(activeShell);

  // `BASH_B64`/`PS_ENC` pipe the payload through that OS's own decoder, so only offer the one that
  // matches the interpreter's OS family; RAW/URL/BASE64 are family-agnostic.
  const availableEncodings = useMemo<EncodingType[]>(() => {
    const family = shellBinaryFamily(shellBinary);
    return (['RAW', 'URL', 'BASE64', 'BASH_B64', 'PS_ENC'] as EncodingType[]).filter((enc) => {
      if (enc === 'BASH_B64') return family === 'Linux';
      if (enc === 'PS_ENC') return family === 'Windows';
      return true;
    });
  }, [shellBinary]);

  // If switching interpreter family drops the current encoding from the list, fall back to RAW
  // rather than silently keep applying an encoding the UI no longer offers.
  useEffect(() => {
    if (!availableEncodings.includes(encoding)) {
      setEncoding('RAW');
    }
  }, [availableEncodings, encoding]);

  const handleShellBinaryChange = (bin: string) => {
    setShellBinary(bin);
    if (!isTemplateCompatibleWithShellBinary(activeShell, bin)) {
      const fallback = firstCompatibleTemplate(ALL_SHELL_ITEMS, bin);
      if (fallback) {
        setSelectedShellId(fallback.id);
        announceSwitch(`${activeShell.name} doesn't use ${bin} — switched the payload to ${fallback.name}.`);
      } else {
        announceSwitch(`No payload here is compatible with ${bin}.`);
      }
    }
  };

  const handleSelectShell = (shell: ShellItem) => {
    setSelectedShellId(shell.id);
    if (!isTemplateCompatibleWithShellBinary(shell, shellBinary)) {
      const fallbackBin = firstCompatibleShellBinary(shell);
      if (fallbackBin) {
        setShellBinary(fallbackBin);
        announceSwitch(`${shell.name} doesn't use ${shellBinary} — switched the interpreter to ${fallbackBin}.`);
      } else {
        announceSwitch(`No interpreter here is compatible with ${shell.name}.`);
      }
    }
  };

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

  // Unavailable rows (no recovered command) are still shown and selectable so users can see why a
  // known payload is missing, but they never count toward a displayed total.
  const availableFilteredCount = useMemo(
    () => filteredShells.filter((s) => !s.unavailable).length,
    [filteredShells]
  );

  // Interpolated payload via the shared variable-substitution engine
  const resolvedCommand = useMemo(() => {
    const ctx = contextFromGlobalVars(globalVars, { activeTargetIp: activeMachineIp, shell: shellBinary });
    // Substitution rule: revshell templates use the NON-legacy mode
    // ({ip} = LHOST); all user, cheatsheet and methodology content uses
    // { legacyAliases: true } ({ip} = TARGET).
    return resolveTemplate(activeShell.command, ctx);
  }, [activeShell, globalVars, activeMachineIp, shellBinary]);

  // Reverse-shell templates only ever use the `{token}` alias, never the shared engine's Obsidian-
  // style `<TOKEN>` alias — the handful of full-script payloads that embed literal markup
  // (`<pre>`, `<html>`, ...) or a human instruction like `<payload>` would otherwise get
  // misreported as having an unresolved variable. Drop those `<...>`-sourced entries here rather
  // than in the shared engine, which other templates (cheatsheets/notes) still rely on for real
  // `<TOKEN>` aliases.
  const angleBracketFalsePositives = useMemo(() => {
    const raws = new Set<string>();
    for (const range of resolvedCommand.ranges) {
      if (!range.resolved && activeShell.command[range.start] === '<') raws.add(range.raw);
    }
    return raws;
  }, [resolvedCommand, activeShell.command]);
  const unresolvedVars = resolvedCommand.unresolved.filter((label) => !angleBracketFalsePositives.has(label));

  const resolvedPayload = useMemo(() => {
    const wrapped = applyCommandWrapper(resolvedCommand.text, wrapper);
    return applyPayloadEncoding(wrapped, encoding);
  }, [resolvedCommand, wrapper, encoding]);

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
          <span className="text-xs font-medium text-muted">
            Shell
            {!shellTokenApplies && (
              <span className="ml-1 text-[11px] font-normal text-muted" data-testid="revshell-shell-na">
                (not used by this payload)
              </span>
            )}
          </span>
          <div className="-mx-1 max-w-full overflow-x-auto no-scrollbar px-1">
            <div className={segWrap}>
              {SHELL_BINARIES.map((bin) => {
                const isActive = shellBinary === bin;
                return (
                  <button
                    key={bin}
                    type="button"
                    disabled={!shellTokenApplies}
                    onClick={() => {
                      handleShellBinaryChange(bin);
                      if (soundEnabled) playCyberSound('toggle');
                    }}
                    aria-pressed={isActive}
                    title={shellTokenApplies ? undefined : `${activeShell.name} doesn't use a shell binary`}
                    className={`${segBtn} font-mono ${isActive ? segOn : segOff} ${!shellTokenApplies ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {bin.replace('/bin/', '')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {compatNotice && (
        <p role="status" data-testid="revshell-compat-notice" className="-mt-2 text-[11px] text-callout-warn-fg">
          {compatNotice}
        </p>
      )}

      {/* 2. Platform filters and search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:max-w-full sm:px-0 max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)] max-sm:pr-14">
          <div className="flex min-w-max items-center gap-1">
            {(
              [
                { id: 'All', label: 'All', count: availableShellItems.length },
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
            placeholder={`Filter ${availableFilteredCount} payloads...`}
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
      <div data-tour="rs-payloads" className="max-h-36 overflow-y-auto scrollbar-thin">
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
                    handleSelectShell(shell);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  aria-pressed={isSelected}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11 ${
                    isSelected
                      ? 'border-accent bg-accent-muted font-medium text-primary'
                      : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
                  }`}
                  title={shell.unavailable ? `${shell.name} - unavailable` : `${shell.name} (${shell.language}) - ${shell.platform}`}
                >
                  <span>{shell.name}</span>
                  {shell.unavailable ? (
                    <span className="rounded px-1 text-[11px] font-medium text-callout-warn-fg">Unavailable</span>
                  ) : (
                    shell.isFullScript && (
                      <span className="rounded px-1 text-[11px] font-medium text-muted">File</span>
                    )
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Payload terminal: the one intentionally dark panel */}
      <div data-tour="rs-payload-box" className="overflow-hidden rounded-xl border border-subtle">
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
            {unresolvedVars.length > 0 && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded border border-syntax-number/50 text-syntax-number font-medium flex items-center gap-1"
                title={`Unresolved variable: ${unresolvedVars.join(', ')} — check LHOST/Target IP in cockpit header`}
              >
                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                <span>Missing: <span className="font-mono">{unresolvedVars.join(', ')}</span></span>
              </span>
            )}
          </div>

          <div className="flex min-w-0 max-w-full items-center gap-2">
            <div className="max-w-full overflow-x-auto no-scrollbar">
              <div className={segWrap}>
                <span className="hidden select-none px-1 text-[11px] text-muted sm:inline">Encoding</span>
                {availableEncodings.map((enc) => (
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

            {isUsable && (activeShell.isFullScript || activeShell.extension) && (
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
              disabled={!isUsable}
              className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-[transform,background-color,color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed [@media(pointer:coarse)]:h-11 ${
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
          {activeShell.unavailable ? (
            <p data-testid="revshell-unavailable" className="text-on-inverse/70">
              <span className="font-semibold">Unavailable.</span> The original command for{' '}
              {activeShell.name} was never recovered, so no content can be shown here.
            </p>
          ) : isCompatible ? (
            <pre className="whitespace-pre-wrap break-all leading-relaxed select-all">
              <SyntaxHighlightedCommand command={resolvedPayload} className="!bg-transparent !p-0" />
            </pre>
          ) : (
            <p data-testid="revshell-no-compatible" className="text-on-inverse/70">
              {activeShell.name} needs a {shellBinaryFamily(shellBinary) === 'Windows' ? 'Linux' : 'Windows'}{' '}
              interpreter; {shellBinary} is not compatible, so no payload is shown.
            </p>
          )}
        </div>
      </div>

      {/* 5. Listener */}
      <div data-tour="rs-listener" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
