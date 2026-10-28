# PG catalog cross-check (238 rows)

Coverage: 155 of 238 matched in at least one community source; 0 confirmed OS mismatches, 0 confirmed difficulty mismatches (5 low-confidence single-source borderline disagreements noted below); 83 listed unfound, but 4 of those (Geisha 203, DC-4 191, NoName 217, SunsetMidnight 233) do appear in the adarsh table with matching OS and difficulty, so about 79 are truly unfound.

## Method and sources
No single authoritative public dataset was reachable. The "PGStats" site could not be located (pgstats.com is an unrelated site; searches returned nothing), so these were used:
- pika5164 PG Practice/Play list grouped by OS and difficulty (broadest): https://github.com/pika5164/Offsec_Proving_Grounds
- AaronCaiii progress table, OS + difficulty (about 50 Practice rows, noisy): https://github.com/AaronCaiii/OSCP-Prepare-Proving-grounds-Practice
- adarsh-hue799 Play writeups table (17 rows): https://github.com/adarsh-hue799/pgplay-oscp-writeups
- TJ-Null / NetSecFocus PWK V3 tab (OS by column only, no difficulty; curated subset of Practice and Play): https://docs.google.com/spreadsheets/d/1dwSMIAPIam0PuRBkCiDI88pU3yzrqqHkDtBngUHNCw8
- 0xdf OffSec cheatsheet has no PG data; OffSec product pages list no machines. Tie-breaker indexes (Twseptian, Rouvin, kashz gitbook) gave no usable per-machine table.

Windows vs Windows (AD) was treated as equal for OS comparison.

## OS mismatches
| # | Name | Catalog OS | Community OS | Source |
|---|------|-----------|--------------|--------|
| (none confirmed) | | | | |

Rejected as source error: Access (140) and Algernon (141) were listed Linux in the Aaron table, but pika5164 and TJ-Null both list them Windows, matching the catalog. Aaron's table also has duplicated and inconsistent rows.

## Difficulty mismatches
Only flagged when clear; none meet the threshold (sources agree and differ by more than a borderline step). Low-confidence, single-source, borderline items:
| # | Name | Catalog | Community | Source |
|---|------|---------|-----------|--------|
| 137 | Zipper | Hard | Intermediate | pika5164 only |
| 195 | Election1 | Intermediate | Easy (Play) | pika5164 only |
| 45 | Flimsy | Easy | Intermediate | Aaron only; pika5164 says Easy, so likely fine |
| 219 | Photographer | Easy | Intermediate | adarsh only; pika5164 says Easy |
| 180 | Blogger | Easy | Intermediate | adarsh only; pika5164 says Easy |

## Not found in community data (83)
These are mostly gaps in the sparse sources, not evidence of fabrication. CVE-2023-33831 and CVE-2023-40582 were found (pika5164); CVE-2024-48061 was not.
- 1. Air
- 2. Apex
- 3. Assignment
- 5. BadCorp
- 11. Breakout
- 13. Bunyip
- 16. Charlotte
- 17. Chatty
- 20. Clyde
- 21. Cobweb
- 24. CookieCutter
- 29. CVE-2024-48061
- 30. Deployer
- 32. dev_working
- 33. Develop
- 36. ERP
- 37. Escape
- 47. Forward
- 49. G00g
- 50. Glider
- 52. Graph
- 59. Injecto
- 60. Interface
- 62. KeyVault
- 66. Malbec
- 67. Mantis
- 68. Maria
- 69. Markers
- 70. Marketing
- 72. Matrimony
- 73. Megavolt
- 74. Morbo
- 81. Outdated
- 82. Pathway
- 88. Phobos
- 89. Pipe
- 98. Reconstruction
- 104. Shiftdel
- 105. Shifty
- 108. Sona
- 110. Spaghetti
- 112. Splodge
- 113. SpringAuth_Attack
- 115. Surf
- 117. Synapse
- 118. Thor
- 119. Tico
- 121. UC404
- 128. WallpaperHub
- 129. WebCal
- 133. Xposedapi
- 134. Zab
- 138. Lunar
- 144. Butch
- 145. Compromised
- 149. Fish
- 153. Hokkaido
- 159. Meathead
- 161. Metallus
- 169. Robust
- 174. UT99
- 178. Assertion101
- 179. BBSCute
- 181. Bottleneck
- 183. ColdBoxEasy
- 186. Dawn2
- 187. Dawn3
- 190. DC-3
- 193. Djinn3
- 204. GitRoot
- 205. Glasgow Smile 1.1
- 206. Ha-Natraj
- 207. ICMP
- 212. Lampiao
- 216. My-CMSMS
- 221. PowerGrid 1.0.1
- 222. Pwned1
- 237. Wpwn
- 238. Y0usef
