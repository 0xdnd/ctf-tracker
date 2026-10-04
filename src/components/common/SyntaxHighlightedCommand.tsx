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

// Token type -> syntax-* design tokens (rendered on bg-surface-inverse).
const TOKEN_CLASS: Record<Token['type'], string> = {
  binary: 'text-syntax-keyword font-bold',
  ip: 'text-syntax-number font-bold underline decoration-syntax-number/40',
  port: 'text-syntax-number font-semibold tabular-nums',
  flag: 'text-syntax-flag font-medium',
  operator: 'text-syntax-comment font-bold',
  string: 'text-syntax-string',
  variable: 'text-syntax-variable font-bold',
  device: 'text-syntax-string font-bold',
  default: 'text-on-inverse',
};

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
    <span className={`font-mono inline-block break-all select-all rounded-md bg-surface-inverse px-2 py-1 text-on-inverse ${className}`}>
      {tokens.map((token, index) => {
        const colorClass = TOKEN_CLASS[token.type] ?? TOKEN_CLASS.default;

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
