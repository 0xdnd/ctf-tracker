import React from 'react';

export interface SyntaxHighlightedCommandProps {
  command: string;
  className?: string;
  copyable?: boolean;
  soundEnabled?: boolean;
  onCopy?: (copiedText: string) => void;
}

interface Token {
  text: string;
  type: 'binary' | 'ip' | 'port' | 'flag' | 'operator' | 'string' | 'variable' | 'device' | 'default';
}

const BINARY_SET = new Set([
  // Shells & basic utilities
  'bash', 'sh', 'zsh', 'ash', 'dash', 'cmd', 'powershell', 'pwsh',
  'whoami', 'id', 'sudo', 'su', 'cat', 'rm', 'mkdir', 'mkfifo', 'export', 'env',
  // Network & listeners
  'nc', 'ncat', 'netcat', 'socat', 'rlwrap', 'curl', 'wget', 'nmap', 'rustscan',
  'pwncat', 'rustcat', 'powercat', 'socat-listen',
  // Tunneling & Pivoting
  'chisel', 'ligolo-proxy', 'agent', 'agent.exe', 'ssh', 'autossh', 'proxychains', 'proxychains4',
  // Scripting engines
  'python', 'python3', 'python2', 'perl', 'ruby', 'php', 'awk', 'lua', 'node',
  // Windows & Active Directory
  'certutil', 'certutil.exe', 'bitsadmin', 'mimikatz', 'rubeus', 'bloodhound',
  'bloodhound-python', 'crackmapexec', 'netexec', 'evil-winrm', 'impacket-psexec',
  'impacket-secretsdump', 'impacket-wmiexec', 'impacket-smbserver',
  // Web & Cracking
  'sqlmap', 'gobuster', 'ffuf', 'dirsearch', 'feroxbuster', 'hydra', 'john', 'hashcat',
  'msfconsole', 'msfvenom',
]);

function tokenizeCommand(command: string): Token[] {
  if (!command) return [];

  const tokens: Token[] = [];
  // Regex matches strings, devices (/dev/tcp/...), IPs, flags, operators, variables, words, and whitespace
  const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/dev\/tcp\/[^\s/]+\/[^\s/]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|--?[a-zA-Z0-9_-]+|>&|&>|&&|\|\||\||>|<|;|0>&1|2>&1|\$[a-zA-Z0-9_]+|\${[a-zA-Z0-9_]+}|%[a-zA-Z0-9_]+%|\b\d{2,5}\b|[^\s"'>;&|<=$]+|\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(command)) !== null) {
    const raw = match[0];

    if (/^\s+$/.test(raw)) {
      tokens.push({ text: raw, type: 'default' });
      continue;
    }

    // String literal
    if (/^["']/.test(raw)) {
      tokens.push({ text: raw, type: 'string' });
      continue;
    }

    // Linux /dev/tcp device pseudo-file
    if (raw.startsWith('/dev/tcp/')) {
      tokens.push({ text: raw, type: 'device' });
      continue;
    }

    // IPv4 address
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(raw)) {
      tokens.push({ text: raw, type: 'ip' });
      continue;
    }

    // Command-line flag
    if (/^--?[a-zA-Z0-9_-]+$/.test(raw)) {
      tokens.push({ text: raw, type: 'flag' });
      continue;
    }

    // Operators and file descriptor redirections
    if (/^(?:>&|&>|&&|\|\||\||>|<|;|0>&1|2>&1)$/.test(raw)) {
      tokens.push({ text: raw, type: 'operator' });
      continue;
    }

    // Variables ($LHOST, %LPORT%, etc.)
    if (/^(\$[a-zA-Z0-9_]+|\${[a-zA-Z0-9_]+}|%[a-zA-Z0-9_]+%)$/.test(raw)) {
      tokens.push({ text: raw, type: 'variable' });
      continue;
    }

    // Well-known network port numbers (e.g. 4444, 9001, 80, 443)
    if (/^\d{2,5}$/.test(raw)) {
      tokens.push({ text: raw, type: 'port' });
      continue;
    }

    // Shell binary / Command utility name
    const lower = raw.toLowerCase().replace(/^[\\/].*[\\/]/, '');
    if (BINARY_SET.has(lower)) {
      tokens.push({ text: raw, type: 'binary' });
      continue;
    }

    tokens.push({ text: raw, type: 'default' });
  }

  return tokens;
}

export const SyntaxHighlightedCommand: React.FC<SyntaxHighlightedCommandProps> = React.memo(({
  command,
  className = '',
}) => {
  const tokens = React.useMemo(() => tokenizeCommand(command), [command]);

  return (
    <span className={`font-mono inline-block break-all select-all ${className}`}>
      {tokens.map((token, index) => {
        let colorClass = 'text-slate-800 dark:text-slate-200';

        switch (token.type) {
          case 'binary':
            colorClass = 'text-emerald-700 dark:text-[#9fef00] font-bold';
            break;
          case 'ip':
            colorClass = 'text-cyan-700 dark:text-cyan-400 font-bold underline decoration-cyan-500/30';
            break;
          case 'port':
            colorClass = 'text-amber-700 dark:text-amber-400 font-semibold tabular-nums';
            break;
          case 'flag':
            colorClass = 'text-purple-700 dark:text-purple-300 font-medium';
            break;
          case 'operator':
            colorClass = 'text-sky-700 dark:text-sky-400 font-bold';
            break;
          case 'string':
            colorClass = 'text-teal-700 dark:text-teal-400';
            break;
          case 'variable':
            colorClass = 'text-rose-700 dark:text-rose-300 font-bold';
            break;
          case 'device':
            colorClass = 'text-pink-700 dark:text-pink-300 font-bold';
            break;
          case 'default':
          default:
            colorClass = 'text-slate-800 dark:text-slate-200';
            break;
        }

        return (
          <span key={index} className={colorClass}>
            {token.text}
          </span>
        );
      })}
    </span>
  );
});

export function getRawCommandText(command: string): string {
  return command || '';
}

export default SyntaxHighlightedCommand;
