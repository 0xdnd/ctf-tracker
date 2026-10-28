# VulnHub cross-check (existence + OS), 124 rows
Method: vulnhub.com search (?q=...) per machine/series; entry pages fetched for OS on a few. Existence checked for all rows; OS only individually confirmed where noted.

## Does not appear to exist on VulnHub
- #26 Smasher 1 - vulnhub.com search "smasher" = 0 results. Smasher is a Hack The Box machine (HTB), not VulnHub.
- #123 Scarlet 1 - 0 results on vulnhub.com, nothing found via web search. UNCERTAIN (likely not VulnHub).
- #124 Source 1 - no VulnHub entry "Source: 1" found (site search too noisy; web search nothing). UNCERTAIN.

## OS mismatches
| # | name | catalog OS | source OS | source URL |
|---|------|-----------|-----------|-----------|
| none confirmed | | | | |

Confirmed matches: #5 Kioptrix 2014 = BSD (FreeBSD) https://www.vulnhub.com/entry/kioptrix-2014-5,62/ ; #21 Brainpan 1 = Linux https://www.vulnhub.com/entry/brainpan-1,51/ (TSV says Linux; the "Linux/Windows" wording is not on the VulnHub page - the PE binary is Windows-origin but the VM is Linux); #73 SolidState 1 = Linux https://www.vulnhub.com/entry/solidstate-1,261/ . Other rows' OS not individually verified (all TSV Linux; VulnHub lists no OS for most entries).

## Not-quite-VulnHub / naming notes
- #90 Metasploitable 2: IS on VulnHub (https://www.vulnhub.com/entry/metasploitable-2,29/, author Metasploit/Rapid7; page lists no OS). Metasploitable 1 also on VulnHub. Metasploitable 3: not in catalog; not found on VulnHub (search returned only MS1, MS2).
- #112 Kira 1: real title is "Kira: CTF" (https://www.vulnhub.com/entry/kira-ctf,594/, Bassam Assiri, 4 Nov 2020). Name "Kira 1" is wrong; Deathnote: 1 is separate (exists).
- #36-ish Smasher: see above (HTB).
- SolidState 1 page says originally created for HackTheBox, but is a real VulnHub entry.
- Title differences: #43 Funbox: Rookie, #44 Funbox: Easy (no "2"/"3" in VulnHub titles); #32 Symfonos 3 = "symfonos: 3.1"; #34 Symfonos 5 = "5.2"; #64 pWnOS 2.0 = "(Pre-Release)"; #75 Billy Madison = "1.1"; #76 Wallaby's Nightmare = "(v1.0.2)"; #77 Moria = "1.1"; #83 Lord Of The Root = "1.0.1"; #78 = "BSides Vancouver: 2018 (Workshop)"; #95 Mercy v2 = "digitalworld.local: MERCY v2"; #99 Sedna = "hackfest2016: Sedna"; #115 Deception = "haclabs: Deception"; #108 = "BoredHackerBlog: Social Network"; #122 DepthB2R = "Depth: 1"; #118 = "bossplayersCTF: 1"; #67 Temple of Doom = "Temple of Doom: 1"; #100 Spydersec 1 = "SpyderSec: Challenge"; #6-14 DC series: DC 1-9 all present (DC: 3.2 for DC-3); #46-49 DriftingBlues 1,3,6(present? list showed 1-7 + 9 final),7 present.
- #72/#79 LemonSqueezy: 1 and LazySysAdmin: 1 exist.

## Coverage
- Confirmed existing on VulnHub: 121 of 124 (everything except #26, #123, #124).
- Does not exist: 1 (Smasher 1, HTB). Uncertain/unfound: 2 (Scarlet 1, Source 1).
- OS individually confirmed matching: 3 (Kioptrix 2014, Brainpan 1, SolidState 1). No mismatches found. Remaining ~118 rows: existence confirmed, OS unverified (VulnHub usually has no OS field).
- Caveat: VulnHub search is substring/title based; "Sar: 1" search returned 0 yet the entry exists (hackingarticles cites vulnhub.com/entry/sar-1,425), so 0-result searches are not proof. Scarlet/Source remain uncertain.
