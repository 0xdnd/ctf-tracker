<div align="center">

# ⚡ ZEROBOX // Tactical CTF Tracker v2.0
### Advanced CTF Machine Tracking, Attack Lifecycle Management & Offensive Cheatsheet Dashboard

[![GitHub Stars](https://img.shields.io/github/stars/0xdnd/ctf-tracker?style=for-the-badge&color=F59E0B&logo=github)](https://github.com/0xdnd/ctf-tracker/stargazers)
[![Open Tracker](https://img.shields.io/badge/-%20LAUNCH%20ZEROBOX%20-10B981?style=for-the-badge&labelColor=0B0F19)](https://0xdnd.github.io/ctf-tracker/)
[![Live on GitHub Pages](https://img.shields.io/badge/Live_on-GitHub_Pages-181717?style=flat-square&logo=github)](https://0xdnd.github.io/ctf-tracker/)
[![Creator](https://img.shields.io/badge/Creator-Daniel%20Dayan%20(@0xdnd)-10B981?style=flat-square&logo=github)](https://0xdnd.github.io/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Daniel%20Dayan-0077B5?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/daniel-dayan-a66322352/)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Daniel%20Dayan-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/xxdndxx)
[![License](https://img.shields.io/badge/License-Non--Commercial%20(ZNSL--1.0)-F59E0B?style=flat-square&logo=shield)](LICENSE)

*929 Machines (415 HTB Retired + 514 THM CTF) · Daniel Dayan's 55 Verified Solves · 100% HTB & THM ToS Compliant*

<br />

> ⭐️ **If you find ZeroBox useful, please consider giving it a star on GitHub! It helps support ongoing development and community features.** ⭐️

</div>

---

## 🎯 Overview

**ZeroBox** is a high-performance, cybersecurity-themed dashboard engineered for penetration testers, security researchers, and CTF competitors targeting **Hack The Box (HTB)**, **TryHackMe (THM)**, and custom offline labs.

Built with an **offline-first architecture** (Zustand + LocalStorage/IndexedDB), zero backend dependency, and instantaneous command palette (`Ctrl+K`) navigation.

---

## 🚀 Core Modules

### 1. 🛡️ Module A: The Advanced Machine & Lab Tracker
- **Multi-Platform Coverage:** Hack The Box (415 retired & Starting Point boxes), TryHackMe (514 standalone CTF rooms), and custom user targets. 100% compliant with Hack The Box Terms of Service (AUP §8.2/8.3: all active machines excluded; retired content only). Standardized OS classification (Linux and Windows).
- **5-Stage Attack Lifecycle Pipeline:**
  1. `Target Backlog`
  2. `Active Recon` (Port & service discovery)
  3. `Foothold Obtained` (Initial user shell)
  4. `System Pwned` (Root / SYSTEM flag captured)
  5. `Completed & Logged` (Retired / writeup archived)
- **Multi-Mode Views:**
  - **Kanban Board:** Fluid drag-and-drop & stage progression with Framer Motion layout animations.
  - **Data Table:** Dense terminal-style table with multi-column sorting (Name, Platform, OS, Difficulty, Status, Time) and quick flag toggles.
  - **Cyber Cards Grid:** High-contrast cards featuring platform dots, difficulty badges, and hint spoiler buttons.
- **Flags Vault:** Secure obfuscated fields (`••••••••`) with one-click copy and instant verification.
- **Live Stopwatch:** Tracks real engagement duration with granular `Time-to-User` and `Time-to-Root` metrics.
- **Global Command Palette (`Ctrl+K`):** Jump to any box, cheatsheet command, or execute actions from anywhere.

### 2. ⚡ Module B: Dynamic Cheatsheet & Reverse Shell Builder
- **Real-Time Variable Injection:** Global sticky parameters (`LHOST`, `LPORT`, `TARGET_IP`, `INTERFACE`) dynamically interpolate into all commands simultaneously!
- **Dedicated Reverse Shell Studio:** Interactive generator supporting **Bash, Python 3, PHP, Netcat, PowerShell, Socat TTY, Perl, and Ruby**, with ready-to-run listener commands.
- **Curated Offensive Categories:**
  1. Network Discovery & Port Scanning (`nmap`, `masscan`, `rustscan`)
  2. Web Enumeration & Fuzzing (`ffuf`, `gobuster`, `feroxbuster`, `nikto`, `wpscan`)
  3. Exploitation & Payloads (`sqlmap`, LFI wrappers, `msfvenom` one-liners)
  4. Linux Post-Exploitation & PrivEsc (Interactive TTY stabilization, `LinPEAS`, SUID, `getcap`, `sudo -l`)
  5. Windows & Active Directory (`BloodHound`, `PowerView`, `Mimikatz`, `impacket`, `NetExec`, `Evil-WinRM`)
  6. Pivoting & Tunneling (`Chisel`, SSH Dynamic Forwarding, `Ligolo-ng`, `socat` relays)
  7. File Transfers (`python3 http`, `certutil`, `powershell`, `smbserver`)
- **Custom Payload Vault:** Add, edit, bookmark, and tag your personal exploit snippets.

### 3. 📝 Module C: Embedded Writeup Studio (Obsidian & GitBook Ready)
- **Dual-Pane Live Editor:** Raw markdown on the left, live rendered preview on the right.
- **Automated Pentest Templates:** Pre-populates target IP, platform, OS, difficulty, and standard reporting sections:
  1. Executive Summary & Attack Path
  2. Reconnaissance & Nmap Scan Results
  3. Vulnerability Analysis & Foothold Proof-of-Concept
  4. Privilege Escalation & Root Evidence
  5. Post-Exploitation Loot & Remediation
- **Standardized YAML Frontmatter:** Directly exportable as `.md` files into Obsidian vaults or GitBook documentation repositories.

### 4. 📊 Module D: Operational Analytics & Skill Radar
- **Offensive Skill Vector Radar:** Interactive SVG radar chart visualizing proficiencies across Web Security, Active Directory, Linux PrivEsc, Windows PrivEsc, Network/Pivoting, and Binary Exploitation.
- **Pwn Progress Matrix:** Tier-by-tier completion rates across Very Easy, Easy, Medium, Hard, and Insane difficulties.
- **90-Day Activity Heatmap:** GitHub/HTB-style calendar tracking daily study sessions and root captures.
- **Speed Benchmarks:** Average time to initial access and average time to root.

---

## 🎨 Theme & UI/UX Design
- **Cyberpunk Palette:** Jet Black (`#0B0F19`), Slate Cards (`#111827`), Glowing Emerald (`#10B981` HTB), Crimson (`#EF4444` THM), Cyan (`#06B6D4` Tech), and Purple (`#8B5CF6` AD).
- **Retro CRT Mode:** Optional CRT scanlines, screen curvature vignette, and phosphor beam overlay.
- **Web Audio FX:** Synthesized tactical clicks, confirmation chimes, and root fanfares with zero external audio assets.
- **Data Portability:** 1-Click JSON export and import restore.

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 9+

```bash
# Clone the repository
git clone https://github.com/xXDNDXx/ctf-tracker.git
cd ctf-tracker

# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 👨‍💻 Creator & System Architect

**ZeroBox** is designed, engineered, and maintained by **Daniel Dayan** ([@xXDNDXx](https://github.com/xXDNDXx)) — Cybersecurity Researcher, Penetration Tester, and Offensive Security Architect.

<div align="center">

| Channel | Identifier | Link |
|:---|:---|:---|
| 🌐 **Official Portfolio** | `Daniel Dayan Security & Research` | [**xXDNDXx.github.io**](https://xXDNDXx.github.io/) |
| 💼 **LinkedIn Profile** | `daniel-dayan-a66322352` | [**Connect on LinkedIn**](https://www.linkedin.com/in/daniel-dayan-a66322352/) |
| 💻 **GitHub Repositories** | `@xXDNDXx` | [**Follow on GitHub**](https://github.com/xXDNDXx) |
| 📝 **CTF Write-ups & Docs** | `THM & HTB Research Vault` | [**Read GitBook Writeups**](https://xxdndxx.gitbook.io/thm-writeups/) |
| ☕ **Buy Me a Coffee** | `xxdndxx` | [**Support on Buy Me a Coffee**](https://buymeacoffee.com/xxdndxx) |

</div>

---

## 📜 Terms of Service (ToS) & Acceptable Use Policy (AUP) Compliance

ZeroBox is engineered to strictly uphold the Terms of Service, Acceptable Use Policies, and Community Guidelines of **Hack The Box (HTB)** and **TryHackMe (THM)**:

### 1. 🛡️ Hack The Box Acceptable Use Policy (§8.2 & §8.3)
- **Zero Active Content Disclosure:** In strict accordance with HTB AUP §8.2 (*"Sharing solutions, write-ups, flags, or hints for active content is strictly prohibited"*), ZeroBox strictly excludes writeups, spoilers, and solutions for all active seasonal machines.
- **Retired Content Only:** The 415 cataloged HTB targets consist exclusively of officially retired machines and Starting Point educational labs. HTB AUP §8.3 explicitly permits community walkthroughs, educational write-ups, and streaming for content that has been retired.
- **Exclusion of Enterprise ProLabs & Fortresses:** Proprietary subscription networks and enterprise ProLabs (e.g. Dante, Offshore, RastaLabs, Cybernetics, Zephyr) are excluded from the catalog.
- **Anti-Scraping / No-Crawling:** ZeroBox contains zero scrapers, bots, or automated crawlers targeting HTB servers (HTB UA §6.1).

### 2. 🎯 TryHackMe Terms of Use (§3 & §5)
- **Practice Challenge Rooms Only:** 514 public community challenge rooms are indexed for individual tracking (multiplayer/KoTH competition rooms excluded).
- **Zero Raw Flag Dumping:** Solved milestones in Daniel Dayan's verified roster utilize synthetic educational tokens (e.g., `THM{flag_captured_daniel_dayan}`) rather than raw live challenge flags.
- **Zero Data Harvesting:** No automated data extraction or scraping tools are used against THM infrastructure.

### 3. 🔒 Zero-Leakage Private Notes & Vault Architecture
- **Proprietary Course Materials Excluded:** Course material, official academy modules (such as CPTS / HTB Academy), and private exam notes are **never** committed into the git repository or bundled into public build artifacts.
- **100% In-Browser IndexedDB Sandbox:** All imported field notes and obsidian vaults operate in-memory and inside the user's private client-side IndexedDB database (`zerobox_vault_db`).

### 4. ⚖️ Independent Project & Trademark Disclaimer
ZeroBox is an independent open-source tracking and educational dashboard created by Daniel Dayan. ZeroBox is **not affiliated with, endorsed by, sponsored by, or associated with Hack The Box Ltd or TryHackMe Ltd**. "Hack The Box", "HTB", "TryHackMe", and "THM" are trademarks or registered trademarks of their respective owners. All target metadata, room links, and writeup hyperlinks are referenced solely for non-commercial educational tracking and study under fair use.

---

## ⚖️ License & Intellectual Property Protection

ZeroBox is released under the **ZeroBox Source-Available Non-Commercial & Educational License (ZNSL 1.0)**.  
Copyright © 2026 **Daniel Dayan** (`@0xdnd`). All Rights Reserved.

### Summary of Terms:

| Permission / Restriction | Status | Details |
|:---|:---:|:---|
| **Personal & Educational Use** | ✅ **ALLOWED** | You may inspect, clone, build, and use ZeroBox locally for individual study, practice labs, and CTF preparation. |
| **Commercial Exploitation** | ❌ **FORBIDDEN** | You may **NOT** sell, rent, monetize, sub-license, or charge fees for this platform or any portion thereof. |
| **Public Re-Publishing / SaaS** | ❌ **FORBIDDEN** | You may **NOT** host a public web instance, re-publish, or distribute modified copies under your name without written consent. |
| **Course Bundling / Paid Training** | ❌ **FORBIDDEN** | You may **NOT** include ZeroBox in any paid course, bootcamp, or commercial subscription service. |
| **Attribution Requirement** | ⚠️ **MANDATORY** | All permitted educational mentions or references must prominently cite **Daniel Dayan** ([0xdnd.github.io](https://0xdnd.github.io/)). |

For the full legal text, see the official [**LICENSE**](LICENSE) file.


