// Build-time mapping of cheatsheets, methodology phases, pentest notes, techniques, cert hubs, and /revshells/
// to matching practice tracks, deep /tracker/?track=... CTAs, and verified primary references.
// Never bundled into the client app (0 B JS impact).

const { esc } = require('./layout.cjs');

const TRACKS = {
  tjnull: ['/tj-null-list/', 'TJ Null OSCP list'],
  oscp: ['/oscp-like-machines/', 'OSCP-like machines'],
  cpts: ['/cpts-like-machines/', 'CPTS-like machines'],
  ippsec: ['/ippsec-cpts-machines/', 'IppSec CPTS machines'],
  ad: ['/active-directory-machines/', 'Active Directory machines'],
  crto: ['/crto-like-machines/', 'CRTO-like machines'],
  osep: ['/osep-like-machines/', 'OSEP-like machines'],
  oswe: ['/oswe-like-machines/', 'OSWE-like machines'],
  cwee: ['/cwee-like-machines/', 'CWEE-like machines'],
  starting: ['/htb-starting-point-machines/', 'HTB Starting Point'],
  prolabs: ['/htb-pro-labs-guide/', 'HTB Pro Labs'],
  calc: ['/oscp-points-calculator/', 'OSCP points calculator'],
  vs: ['/oscp-vs-cpts/', 'OSCP vs CPTS'],
};

const CHEATSHEET_REFS = {
  network: {
    tracks: [TRACKS.starting, TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://nmap.org/book/man.html', 'Nmap Reference Guide'],
      ['https://attack.mitre.org/tactics/TA0043/', 'MITRE ATT&CK: Reconnaissance (TA0043)'],
      ['https://csrc.nist.gov/pubs/sp/800/115/final', 'NIST SP 800-115: Technical Guide to Information Security Testing'],
    ],
  },
  web: {
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp, TRACKS.cpts],
    trackerHref: '/tracker/?track=web-master',
    citations: [
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
      ['https://cheatsheetseries.owasp.org/', 'OWASP Cheat Sheet Series'],
      ['https://github.com/ffuf/ffuf', 'ffuf: Fast Web Fuzzer Documentation'],
    ],
  },
  exploitation: {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ippsec],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://attack.mitre.org/tactics/TA0001/', 'MITRE ATT&CK: Initial Access (TA0001)'],
      ['https://attack.mitre.org/tactics/TA0002/', 'MITRE ATT&CK: Execution (TA0002)'],
      ['https://hashcat.net/wiki/doku.php?id=example_hashes', 'Hashcat Wiki: Example Hashes'],
    ],
  },
  'linux-privesc': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.starting],
    trackerHref: '/tracker/?track=linux-privesc',
    citations: [
      ['https://gtfobins.github.io/', 'GTFOBins: Curated List of Unix Binaries'],
      ['https://attack.mitre.org/tactics/TA0004/', 'MITRE ATT&CK: Privilege Escalation (TA0004)'],
    ],
  },
  'active-directory': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.osep, TRACKS.prolabs],
    trackerHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://github.com/fortra/impacket', 'Fortra Impacket Network Protocols Library'],
      ['https://github.com/Pennyw0rth/NetExec', 'NetExec: Network Service Exploitation Tool'],
      ['https://github.com/ly4k/Certipy', 'Certipy: Active Directory Certificate Services Auditing'],
      ['https://lolbas-project.github.io/', 'LOLBAS: Living Off The Land Binaries and Scripts'],
    ],
  },
  pivoting: {
    tracks: [TRACKS.cpts, TRACKS.prolabs, TRACKS.osep, TRACKS.crto],
    trackerHref: '/tracker/?track=cpts-path',
    citations: [
      ['https://github.com/nicocha30/ligolo-ng', 'Ligolo-ng: Advanced Tunneling and Pivoting Tool'],
      ['https://attack.mitre.org/tactics/TA0011/', 'MITRE ATT&CK: Command and Control (TA0011)'],
      ['https://attack.mitre.org/techniques/T1572/', 'MITRE ATT&CK: Protocol Tunneling (T1572)'],
    ],
  },
  'file-transfer': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ad],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://lolbas-project.github.io/', 'LOLBAS: Windows Download and Transfer Binaries'],
      ['https://learn.microsoft.com/en-us/powershell/scripting/overview', 'Microsoft PowerShell Documentation'],
    ],
  },
};

const PHASE_REFS = {
  '01-surface-mapping': {
    tracks: [TRACKS.starting, TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    trackerHref: '/tracker/?track=beginner-essentials',
    citations: [
      ['https://attack.mitre.org/tactics/TA0043/', 'MITRE ATT&CK: Reconnaissance (TA0043)'],
      ['https://nmap.org/book/man.html', 'Nmap Reference Guide'],
      ['https://csrc.nist.gov/pubs/sp/800/115/final', 'NIST SP 800-115: Information Security Testing'],
    ],
  },
  '02-service-enumeration': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ippsec],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://attack.mitre.org/tactics/TA0007/', 'MITRE ATT&CK: Discovery (TA0007)'],
      ['https://nmap.org/book/output-formats-xml-output.html', 'Nmap XML Output Format Documentation'],
    ],
  },
  '03-threat-modeling': {
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp, TRACKS.cpts],
    trackerHref: '/tracker/?track=web-master',
    citations: [
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
      ['https://owasp.org/www-project-code-review-guide/', 'OWASP Code Review Guide'],
    ],
  },
  '04-initial-access': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.oswe, TRACKS.cpts],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://attack.mitre.org/tactics/TA0001/', 'MITRE ATT&CK: Initial Access (TA0001)'],
      ['https://attack.mitre.org/techniques/T1190/', 'MITRE ATT&CK: Exploit Public-Facing Application (T1190)'],
    ],
  },
  '05-shell-stabilization': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.starting, TRACKS.cpts],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://www.gnu.org/software/bash/manual/bash.html#Redirections', 'GNU Bash Manual: Redirections'],
      ['https://docs.python.org/3/library/socket.html', 'Python Standard Library: socket'],
    ],
  },
  '06-internal-recon': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.prolabs],
    trackerHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://attack.mitre.org/tactics/TA0007/', 'MITRE ATT&CK: Discovery (TA0007)'],
      ['https://attack.mitre.org/tactics/TA0008/', 'MITRE ATT&CK: Lateral Movement (TA0008)'],
    ],
  },
  '07-privilege-escalation': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ad],
    trackerHref: '/tracker/?track=linux-privesc',
    citations: [
      ['https://attack.mitre.org/tactics/TA0004/', 'MITRE ATT&CK: Privilege Escalation (TA0004)'],
      ['https://gtfobins.github.io/', 'GTFOBins: Unix Privilege Escalation Reference'],
      ['https://lolbas-project.github.io/', 'LOLBAS: Windows Living-Off-The-Land Reference'],
    ],
  },
  '08-post-exploitation': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.osep, TRACKS.prolabs],
    trackerHref: '/tracker/?track=osep',
    citations: [
      ['https://attack.mitre.org/tactics/TA0006/', 'MITRE ATT&CK: Credential Access (TA0006)'],
      ['https://attack.mitre.org/tactics/TA0008/', 'MITRE ATT&CK: Lateral Movement (TA0008)'],
    ],
  },
};

// Note: technique links below MUST use exact group names from scripts/lib/techniques.cjs (verify-site.mjs invariant).
const NOTE_REFS = {
  '01-recon-port-scanning': {
    tracks: [TRACKS.starting, TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    techniques: [['/techniques/network-services/', 'Network Service Enumeration']],
    cheatsheets: [['/cheatsheets/network/', 'Network cheatsheet']],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://nmap.org/book/man.html', 'Nmap Reference Guide'],
      ['https://attack.mitre.org/tactics/TA0043/', 'MITRE ATT&CK: Reconnaissance (TA0043)'],
    ],
  },
  '02-web-directory-fuzzing': {
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp, TRACKS.cpts],
    techniques: [['/techniques/api-abuse/', 'API and Web Application Logic Abuse']],
    cheatsheets: [['/cheatsheets/web/', 'Web cheatsheet']],
    trackerHref: '/tracker/?track=web-master',
    citations: [
      ['https://github.com/ffuf/ffuf', 'ffuf: Fast Web Fuzzer Documentation'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  '03-web-exploitation-injection': {
    tracks: [TRACKS.cwee, TRACKS.oswe, TRACKS.oscp, TRACKS.cpts],
    techniques: [
      ['/techniques/sql-injection/', 'SQL Injection'],
      ['/techniques/lfi-path-traversal/', 'LFI and Path Traversal'],
    ],
    cheatsheets: [['/cheatsheets/web/', 'Web cheatsheet']],
    trackerHref: '/tracker/?track=cwee-web',
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', 'OWASP SQL Injection Cheat Sheet'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  '04-linux-privesc-master': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ippsec],
    techniques: [
      ['/techniques/linux-suid/', 'Linux SUID Privilege Escalation'],
      ['/techniques/sudo-misconfig/', 'Sudo Misconfiguration'],
    ],
    cheatsheets: [['/cheatsheets/linux-privesc/', 'Linux PrivEsc cheatsheet']],
    trackerHref: '/tracker/?track=linux-privesc',
    citations: [
      ['https://gtfobins.github.io/', 'GTFOBins: Unix Binaries Reference'],
      ['https://attack.mitre.org/techniques/T1548/001/', 'MITRE ATT&CK: Setuid and Setgid (T1548.001)'],
    ],
  },
  '05-windows-privesc-lolbas': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.ad, TRACKS.cpts],
    techniques: [['/techniques/windows-privesc/', 'Windows Privilege Escalation']],
    cheatsheets: [['/cheatsheets/active-directory/', 'Active Directory cheatsheet']],
    trackerHref: '/tracker/?track=windows-privesc',
    citations: [
      ['https://lolbas-project.github.io/', 'LOLBAS Project: Windows Binaries and Scripts'],
      ['https://attack.mitre.org/techniques/T1134/', 'MITRE ATT&CK: Access Token Manipulation (T1134)'],
    ],
  },
  '06-ad-attack-paths-enum': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.prolabs],
    techniques: [['/techniques/active-directory/', 'Active Directory']],
    cheatsheets: [['/cheatsheets/active-directory/', 'Active Directory cheatsheet']],
    trackerHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://github.com/Pennyw0rth/NetExec', 'NetExec Documentation'],
      ['https://github.com/fortra/impacket', 'Fortra Impacket Library'],
    ],
  },
  '07-kerberos-attacks-master': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.osep],
    techniques: [
      ['/techniques/active-directory/', 'Active Directory'],
      ['/techniques/kerberos/', 'Kerberos Attacks'],
    ],
    cheatsheets: [['/cheatsheets/active-directory/', 'Active Directory cheatsheet']],
    trackerHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://attack.mitre.org/techniques/T1558/003/', 'MITRE ATT&CK: Kerberoasting (T1558.003)'],
      ['https://github.com/fortra/impacket', 'Fortra Impacket Kerberos Tools'],
    ],
  },
  '08-adcs-certipy-abuse': {
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.osep],
    techniques: [['/techniques/active-directory/', 'Active Directory']],
    cheatsheets: [['/cheatsheets/active-directory/', 'Active Directory cheatsheet']],
    trackerHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://github.com/ly4k/Certipy', 'Certipy: AD CS Enumeration and Abuse Tool'],
      ['https://attack.mitre.org/tactics/TA0004/', 'MITRE ATT&CK: Privilege Escalation (TA0004)'],
    ],
  },
  '09-pivoting-tunnels-master': {
    tracks: [TRACKS.cpts, TRACKS.prolabs, TRACKS.osep, TRACKS.crto],
    techniques: [['/techniques/pivoting-tunneling/', 'Pivoting and Tunneling']],
    cheatsheets: [['/cheatsheets/pivoting/', 'Pivoting cheatsheet']],
    trackerHref: '/tracker/?track=cpts-path',
    citations: [
      ['https://github.com/nicocha30/ligolo-ng', 'Ligolo-ng Tunneling Documentation'],
      ['https://attack.mitre.org/techniques/T1572/', 'MITRE ATT&CK: Protocol Tunneling (T1572)'],
    ],
  },
  '10-password-cracking-hashcat': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ad],
    techniques: [['/techniques/password-cracking/', 'Password Cracking and Brute Force']],
    cheatsheets: [['/cheatsheets/exploitation/', 'Exploitation cheatsheet']],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://hashcat.net/wiki/doku.php?id=example_hashes', 'Hashcat Wiki: Example Hashes and Modes'],
      ['https://attack.mitre.org/techniques/T1110/', 'MITRE ATT&CK: Brute Force (T1110)'],
    ],
  },
  '11-file-transfers-master': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.ad],
    techniques: [['/techniques/smb/', 'SMB Enumeration and Exploitation']],
    cheatsheets: [['/cheatsheets/file-transfer/', 'File Transfer cheatsheet']],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://lolbas-project.github.io/', 'LOLBAS: Native File Transfer Methods'],
      ['https://learn.microsoft.com/en-us/powershell/scripting/overview', 'Microsoft PowerShell Documentation'],
    ],
  },
  '12-tty-stabilization-shells': {
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts, TRACKS.starting],
    techniques: [['/techniques/command-injection/', 'Command Injection and RCE']],
    cheatsheets: [['/revshells/', 'Reverse shell cheat sheet']],
    trackerHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://www.gnu.org/software/bash/manual/bash.html#Redirections', 'GNU Bash Manual: Redirections'],
      ['https://docs.python.org/3/library/socket.html', 'Python Standard Library: socket'],
    ],
  },
};

const TECH_REFS = {
  'active-directory': {
    trackerHref: '/tracker/?track=crto-ad',
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts, TRACKS.osep, TRACKS.prolabs],
    citations: [
      ['https://github.com/fortra/impacket', 'Fortra Impacket Network Protocols Library'],
      ['https://github.com/ly4k/Certipy', 'Certipy: Active Directory Certificate Services Auditing'],
      ['https://attack.mitre.org/tactics/TA0006/', 'MITRE ATT&CK: Credential Access (TA0006)'],
    ],
  },
  kerberos: {
    trackerHref: '/tracker/?track=crto-ad',
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.cpts],
    citations: [
      ['https://attack.mitre.org/techniques/T1558/003/', 'MITRE ATT&CK: Kerberoasting (T1558.003)'],
      ['https://github.com/fortra/impacket', 'Fortra Impacket Kerberos Tools'],
    ],
  },
  smb: {
    trackerHref: '/tracker/?track=tjnull-oscp',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.ad],
    citations: [
      ['https://attack.mitre.org/techniques/T1021/002/', 'MITRE ATT&CK: SMB/Windows Admin Shares (T1021.002)'],
      ['https://github.com/Pennyw0rth/NetExec', 'NetExec SMB Enumeration Tool'],
    ],
  },
  'sql-injection': {
    trackerHref: '/tracker/?track=web-master',
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', 'OWASP SQL Injection Prevention Cheat Sheet'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  'lfi-path-traversal': {
    trackerHref: '/tracker/?track=web-master',
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp],
    citations: [
      ['https://cwe.mitre.org/data/definitions/22.html', 'MITRE CWE-22: Improper Limitation of a Pathname (Path Traversal)'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  'command-injection': {
    trackerHref: '/tracker/?track=tjnull-oscp',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.oswe],
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html', 'OWASP OS Command Injection Defense Cheat Sheet'],
      ['https://attack.mitre.org/techniques/T1190/', 'MITRE ATT&CK: Exploit Public-Facing Application (T1190)'],
    ],
  },
  ssti: {
    trackerHref: '/tracker/?track=cwee-web',
    tracks: [TRACKS.cwee, TRACKS.oswe, TRACKS.cpts],
    citations: [
      ['https://cwe.mitre.org/data/definitions/1336.html', 'MITRE CWE-1336: Improper Neutralization of Special Elements Used in a Template Engine'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  deserialization: {
    trackerHref: '/tracker/?track=oswe',
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.oscp],
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html', 'OWASP Deserialization Cheat Sheet'],
      ['https://attack.mitre.org/techniques/T1190/', 'MITRE ATT&CK: Exploit Public-Facing Application (T1190)'],
    ],
  },
  'file-upload': {
    trackerHref: '/tracker/?track=web-master',
    tracks: [TRACKS.oscp, TRACKS.oswe, TRACKS.cpts],
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html', 'OWASP File Upload Cheat Sheet'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  'ssrf-xxe': {
    trackerHref: '/tracker/?track=cwee-web',
    tracks: [TRACKS.cwee, TRACKS.oswe, TRACKS.cpts],
    citations: [
      ['https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html', 'OWASP SSRF Prevention Cheat Sheet'],
      ['https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html', 'OWASP XXE Prevention Cheat Sheet'],
    ],
  },
  'linux-suid': {
    trackerHref: '/tracker/?track=linux-privesc',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://gtfobins.github.io/', 'GTFOBins: SUID Binary Escapes'],
      ['https://attack.mitre.org/techniques/T1548/001/', 'MITRE ATT&CK: Setuid and Setgid (T1548.001)'],
    ],
  },
  'sudo-misconfig': {
    trackerHref: '/tracker/?track=linux-privesc',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://attack.mitre.org/techniques/T1548/003/', 'MITRE ATT&CK: Sudo and Sudo Caching (T1548.003)'],
      ['https://gtfobins.github.io/', 'GTFOBins: Sudo Escalation Reference'],
    ],
  },
  'cron-jobs': {
    trackerHref: '/tracker/?track=linux-privesc',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://attack.mitre.org/techniques/T1053/003/', 'MITRE ATT&CK: Scheduled Task/Job: Cron (T1053.003)'],
    ],
  },
  'linux-capabilities': {
    trackerHref: '/tracker/?track=linux-privesc',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://attack.mitre.org/techniques/T1068/', 'MITRE ATT&CK: Exploitation for Privilege Escalation (T1068)'],
      ['https://gtfobins.github.io/', 'GTFOBins: Capabilities Reference'],
    ],
  },
  'windows-privesc': {
    trackerHref: '/tracker/?track=windows-privesc',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.ad, TRACKS.cpts],
    citations: [
      ['https://attack.mitre.org/techniques/T1134/', 'MITRE ATT&CK: Access Token Manipulation (T1134)'],
      ['https://lolbas-project.github.io/', 'LOLBAS Project: Windows Binaries and Scripts'],
    ],
  },
  'windows-lateral-movement': {
    trackerHref: '/tracker/?track=crto-ad',
    tracks: [TRACKS.ad, TRACKS.crto, TRACKS.osep, TRACKS.prolabs],
    citations: [
      ['https://attack.mitre.org/techniques/T1021/', 'MITRE ATT&CK: Remote Services (T1021)'],
      ['https://github.com/fortra/impacket', 'Fortra Impacket Remote Execution Tools'],
    ],
  },
  'password-cracking': {
    trackerHref: '/tracker/?track=tjnull-oscp',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://hashcat.net/wiki/doku.php?id=example_hashes', 'Hashcat Wiki: Example Hashes'],
      ['https://attack.mitre.org/techniques/T1110/', 'MITRE ATT&CK: Brute Force (T1110)'],
    ],
  },
  'pivoting-tunneling': {
    trackerHref: '/tracker/?track=cpts-path',
    tracks: [TRACKS.cpts, TRACKS.prolabs, TRACKS.osep, TRACKS.crto],
    citations: [
      ['https://github.com/nicocha30/ligolo-ng', 'Ligolo-ng: Tunneling and Pivoting Tool'],
      ['https://attack.mitre.org/techniques/T1572/', 'MITRE ATT&CK: Protocol Tunneling (T1572)'],
    ],
  },
  'buffer-overflow': {
    trackerHref: '/tracker/?track=tjnull-oscp',
    tracks: [TRACKS.tjnull, TRACKS.oscp],
    citations: [
      ['https://cwe.mitre.org/data/definitions/121.html', 'MITRE CWE-121: Stack-based Buffer Overflow'],
    ],
  },
  'docker-escape': {
    trackerHref: '/tracker/?track=linux-privesc',
    tracks: [TRACKS.cpts, TRACKS.oscp, TRACKS.ippsec],
    citations: [
      ['https://attack.mitre.org/techniques/T1611/', 'MITRE ATT&CK: Escape to Host (T1611)'],
      ['https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html', 'OWASP Docker Security Cheat Sheet'],
    ],
  },
  'cms-exploitation': {
    trackerHref: '/tracker/?track=web-master',
    tracks: [TRACKS.tjnull, TRACKS.oscp, TRACKS.oswe],
    citations: [
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
      ['https://attack.mitre.org/techniques/T1190/', 'MITRE ATT&CK: Exploit Public-Facing Application (T1190)'],
    ],
  },
  'api-abuse': {
    trackerHref: '/tracker/?track=cwee-web',
    tracks: [TRACKS.cwee, TRACKS.oswe, TRACKS.cpts],
    citations: [
      ['https://owasp.org/API-Security/', 'OWASP API Security Project'],
      ['https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html', 'OWASP Authorization Cheat Sheet'],
    ],
  },
  'source-code-review': {
    trackerHref: '/tracker/?track=oswe',
    tracks: [TRACKS.oswe, TRACKS.cwee, TRACKS.cpts],
    citations: [
      ['https://owasp.org/www-project-code-review-guide/', 'OWASP Code Review Guide'],
    ],
  },
  'network-services': {
    trackerHref: '/tracker/?track=beginner-essentials',
    tracks: [TRACKS.starting, TRACKS.tjnull, TRACKS.oscp, TRACKS.cpts],
    citations: [
      ['https://nmap.org/book/man.html', 'Nmap Reference Guide'],
      ['https://attack.mitre.org/tactics/TA0007/', 'MITRE ATT&CK: Discovery (TA0007)'],
    ],
  },
};

const CERT_REFS = {
  OSCP: {
    ctaHref: '/tracker/?track=tjnull-oscp',
    citations: [
      ['https://www.offsec.com/courses/pen-200/', 'OffSec PEN-200 (OSCP+) Course Overview'],
      ['https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide', 'OffSec Help Center: OSCP+ Exam Guide'],
    ],
  },
  CPTS: {
    ctaHref: '/tracker/?track=cpts-path',
    citations: [
      ['https://academy.hackthebox.com/preview/certifications/htb-certified-penetration-testing-specialist', 'Hack The Box Academy: CPTS Certification Overview'],
      ['https://help.hackthebox.com/en/articles/12741732-academy-certifications', 'Hack The Box Help Center: Academy Certifications'],
    ],
  },
  'IppSec-CPTS': {
    ctaHref: '/tracker/?track=ippsec-cpts',
    citations: [
      ['https://ippsec.rocks/', 'IppSec.rocks: Searchable HTB Walkthrough Timestamp Index'],
      ['https://academy.hackthebox.com/preview/certifications/htb-certified-penetration-testing-specialist', 'Hack The Box Academy: CPTS Certification Overview'],
    ],
  },
  CRTO: {
    ctaHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://www.zeropointsecurity.co.uk/', 'Zero-Point Security: Red Team Ops (CRTO)'],
      ['https://attack.mitre.org/tactics/TA0008/', 'MITRE ATT&CK: Lateral Movement (TA0008)'],
    ],
  },
  OSEP: {
    ctaHref: '/tracker/?track=osep',
    citations: [
      ['https://www.offsec.com/courses/pen-300/', 'OffSec PEN-300 (OSEP) Course Overview'],
      ['https://attack.mitre.org/tactics/TA0008/', 'MITRE ATT&CK: Lateral Movement (TA0008)'],
    ],
  },
  OSWE: {
    ctaHref: '/tracker/?track=oswe',
    citations: [
      ['https://www.offsec.com/courses/web-300/', 'OffSec WEB-300 (OSWE) Course Overview'],
      ['https://owasp.org/www-project-code-review-guide/', 'OWASP Code Review Guide'],
    ],
  },
  CWEE: {
    ctaHref: '/tracker/?track=cwee-web',
    citations: [
      ['https://academy.hackthebox.com/preview/certifications/htb-certified-web-exploitation-expert', 'Hack The Box Academy: CWEE Certification Overview'],
      ['https://owasp.org/www-project-web-security-testing-guide/', 'OWASP Web Security Testing Guide (WSTG)'],
    ],
  },
  'Active-Directory': {
    ctaHref: '/tracker/?track=crto-ad',
    citations: [
      ['https://github.com/fortra/impacket', 'Fortra Impacket Network Protocols Library'],
      ['https://github.com/ly4k/Certipy', 'Certipy: AD CS Enumeration and Abuse'],
    ],
  },
  'HTB-Starting-Point': {
    ctaHref: '/tracker/?track=beginner-essentials&platform=HTB',
    citations: [
      ['https://www.hackthebox.com/hacker/hacking-labs', 'Hack The Box: Starting Point and Hacking Labs'],
    ],
  },
};

const REVSHELLS_REFS = {
  links: [
    ['/pentest-notes/12-tty-stabilization-shells/', 'TTY stabilization and interactive shell notes'],
    ['/cheatsheets/exploitation/', 'Exploitation command cheatsheet'],
    ['/tj-null-list/', 'TJ Null OSCP practice list'],
    ['/oscp-like-machines/', 'OSCP-like practice machines'],
    ['/cpts-like-machines/', 'CPTS-like practice machines'],
  ],
  citations: [
    ['https://www.gnu.org/software/bash/manual/bash.html#Redirections', 'GNU Bash Manual: Redirections'],
    ['https://docs.python.org/3/library/socket.html', 'Python Standard Library: socket'],
    ['https://learn.microsoft.com/en-us/powershell/scripting/overview', 'Microsoft PowerShell Documentation'],
  ],
};

const renderTrackChips = (tracks, heading = 'Practice on a track') =>
  tracks && tracks.length
    ? `<h2>${esc(heading)}</h2><div class="chips">${tracks.map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</div>`
    : '';

const renderRefList = (citations, heading = 'Primary references') =>
  citations && citations.length
    ? `<h2>${esc(heading)}</h2><ul>${citations.map(([href, label]) => `<li><a href="${esc(href)}" rel="noopener">${esc(label)}</a></li>`).join('')}</ul>`
    : '';

module.exports = {
  TRACKS,
  CHEATSHEET_REFS,
  PHASE_REFS,
  NOTE_REFS,
  TECH_REFS,
  CERT_REFS,
  REVSHELLS_REFS,
  renderTrackChips,
  renderRefList,
};
