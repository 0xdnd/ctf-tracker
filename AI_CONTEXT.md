# ZEROBOX // Tactical Cyber Operations Suite
## Master Architecture, Capability & Developer Orientation Guide (`AI_CONTEXT.md`)

> [!IMPORTANT]
> **MANDATORY DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS**:
> ZEROBOX is an **offline-first, zero-egress, client-side cybersecurity suite** engineered for penetration testers, CTF competitors (Hack The Box, TryHackMe), and certification candidates (OSCP, CPTS, CRTO).
> **INVIOLABLE INVARIANT**: Never introduce external backend APIs, telemetry endpoints, cloud trackers, or unauthenticated egress calls. All state, search, and data processing must execute locally in the browser runtime via Zustand and IndexedDB.

---

## 1. System Identity & Mission

* **Project Name**: `ZEROBOX` (Tactical Cyber Operations Suite v2.0)
* **Creator**: Daniel Dayan ([@0xdnd](https://github.com/0xdnd))
* **Target Users**: Offensive security engineers, CTF competitors, OSCP/CPTS candidates, red teamers, and SOC analysts.
* **Core Value Proposition**: A unified, high-speed tactical operations cockpit combining:
  1. **Lab & Target Lifecycle Tracker** (929 cataloged machines across HTB and THM).
  2. **Offensive Attack Methodology Engine** (16 phases, 137 tactical procedures).
  3. **Field Manual & Obsidian Vault** (Docked multi-tab workspace, Mermaid diagrams, advanced search engine with syntax modifiers, and bilingual Hebrew/English support).
  4. **Writeup Studio & Pentest Report Generator** (Nmap XML parsing, CVSS v3.1 calculator, and Obsidian markdown sync).
  5. **Exam Simulator & Tactical War Room Cockpit** (OffSec/CPTS countdown clocks, 40-pt AD milestone tracker, OffSec compliance checklists, dual-pane network topology graph, and credential loot vault).
  6. **Operational Analytics & Skill Vector Radar** (6-axis competency mapping and 90-day activity heatmap).

---

## 2. Technical Stack

| Layer | Technologies | Notes |
| :--- | :--- | :--- |
| **Runtime & Framework** | React 18 / 19, TypeScript 5.7 | Strict type safety, zero TypeScript errors (`npx tsc --noEmit`). |
| **Bundler & Tooling** | Vite 6.1, PostCSS, Autoprefixer | Fast HMR, code-splitting, custom postbuild mirroring to `docs/` and root for GitHub Pages. |
| **State Management** | Zustand 5.0 | Local storage persistence middleware, selective 1Hz clock isolation, and store hydration. |
| **Local Persistence** | IndexedDB (`indexedDbVault.ts`), `localStorage` | Vault notes, attachments, and profile data cached locally with zero network egress. |
| **Styling & Theme** | Tailwind CSS 3.4, Framer Motion 11 | Dark-first tactical cyber aesthetic, neon cyan/emerald/purple/amber accents, CRT scanlines. |
| **Typography & Math** | KaTeX 0.18 | LaTeX math equation rendering (`KaTeXView.tsx`). |
| **Diagrams & Graphs** | Mermaid 11.17 | Architecture diagrams, attack trees, and flowcharts sanitized via `securityUtils.ts`. |
| **Icons & Media** | Lucide React 0.474, Canvas Confetti | Lightweight vector icons; root celebration fanfares synthesized via Web Audio API. |
| **Archive & Parsing** | JSZip 3.10 | Zip vault import/export with Zip Slip path traversal mitigation. |

---

## 3. Workspace Directory Topology

```
ctf-tracker/
├── AI_CONTEXT.md                  # <-- THIS FILE: Master AI architectural reference
├── README.md                      # Public GitHub documentation & quickstart
├── package.json                   # Dependencies, scripts (dev, build, preview)
├── vite.config.ts                 # Vite bundle configuration & rollup manual chunks
├── scripts/
│   └── postbuild.cjs              # Mirrors dist/ to docs/ and root assets for GitHub Pages
├── src/
│   ├── App.tsx                    # Top-level router (HashRouter), layout, and code-split modals
│   ├── main.tsx                   # React root entrypoint
│   ├── types.ts                   # Core domain types (Machine, PipelineStatus, Cheatsheets, etc.)
│   ├── components/
│   │   ├── analytics/             # SVG Skill Radar, Pwn Progress Matrix, Activity Heatmap
│   │   ├── automation/            # ReconAutomationModal (scan automation & multi-format imports)
│   │   ├── backup/                # BackupModal (JSON export/import & disaster recovery)
│   │   ├── cheatsheet/            # Field Manual, CheatsheetView, ObsidianNoteViewer, SearchFilterAddonBar, CptsTreeItem
│   │   ├── checklist/             # Methodology and compliance checklist cards
│   │   ├── common/                # Modals (OperatorDossier, FlexCard, Cvss, QuickAssignIp, Shortcuts, License)
│   │   ├── layout/                # Header (Mission Bar, HUD), Sidebar, MobileNav, CommandPalette (Ctrl+K)
│   │   ├── obsidian/              # Markdown parsers (ObsidianViewer, ObsidianProperties, KaTeXView, MermaidView)
│   │   ├── tracker/               # TrackerView, KanbanBoard, TableView, GridView, MachineDetailModal
│   │   └── writeup/               # WriteupStudio, PentestReportModal, Nmap XML/gnmap parsers
│   ├── context/
│   │   └── ScrollContext.tsx      # Smooth workspace scrolling and element refs
│   ├── data/
│   │   ├── machinesCatalog.ts     # 929 cataloged HTB and THM boxes (1.05MB data payload)
│   │   ├── cheatsheetsData.ts     # Curated offensive command snippets and categories
│   │   ├── methodologyFramework.ts# 16-phase attack methodology framework data
│   │   ├── revshellsData.ts       # Reverse shell templates across 8 programming languages
│   │   └── tracksData.ts          # Cert tracks (OSCP, CPTS, CRTO) mapping
│   ├── hooks/
│   │   ├── useTacticalHotkeys.ts  # Global keyboard navigation engine (Escape stack, Ctrl+K, Ctrl+T, Ctrl+W)
│   │   └── useTheme.ts            # Theme provider, Cyber dark/light modes, and UI scaling
│   ├── pages/
│   │   ├── ExamSimulatorPage.tsx  # OffSec/CPTS countdown, 40-pt AD set tracker, report generator
│   │   ├── MethodologyPage.tsx    # Attack methodology exploration and phase execution
│   │   ├── TargetDetailPage.tsx   # Dedicated single-machine cockpit and command history
│   │   └── WarRoomView.tsx        # Tactical dual-pane cockpit (Network Topology Graph + Credential Loot Desk)
│   ├── store/
│   │   └── useCtfStore.ts         # Master Zustand store (machines, notes, timer, HUD, profile)
│   └── utils/                     # 24 modular cybersecurity utilities (Crypto, Nmap, Obsidian, Search, etc.)
```

---

## 4. Core Modules & Operational Capabilities

### 1. Lab & Machine Tracker (`/tracker`, `/target/:id`)
* **Machine Catalog**: 929 machines (415 HTB retired + 514 THM rooms) with zero ToS violations.
* **5-Stage Attack Pipeline**:
  `Target Backlog` ➔ `Active Recon` ➔ `Foothold Obtained` ➔ `System Pwned` ➔ `Completed & Logged`.
* **Multi-View Engine**:
  * **Kanban Board**: Drag-and-drop lane progression with Framer Motion layout transitions.
  * **Dense Data Table**: Multi-column sorting (Name, Platform, OS, Difficulty, Status, Time-to-Pwn).
  * **Cyber Cards Grid**: High-contrast cards with hint spoilers, quick flag verify, and platform accents.
* **Persistent Active Target HUD**: Top mission bar synchronization with active target IP, live stopwatch, and quick `+USER` / `+ROOT` pwn logging.

### 2. Attack Methodology Engine (`/methodology`)
* **16 Structured Phases**: Covering External Recon, Port Discovery, Web Vulnerabilities, Active Directory, Lateral Movement, and Post-Exploitation.
* **137 Tactical Phase Cards**: Integrated command templates, operational guidelines, and completion progress bars.

### 3. Field Manual & Obsidian Vault (`/cheatsheets`)
* **Docked Multi-Tab Workspace** ([`ObsidianNoteViewer.tsx`](file:///c:/Users/DANIEL/.cline/data/workspaces/chat/ctf-tracker/src/components/cheatsheet/ObsidianNoteViewer.tsx)):
  * Renders inline beside the permanent left Tree Explorer (zero popup modal barriers).
  * Multiple parallel note tabs with active purple accent indicators and individual `×` close buttons.
  * `Ctrl+T` Spotlight Quick Switcher for opening arbitrary notes.
  * `Ctrl+W` shortcut to close active tabs with adjacent tab auto-focus.
  * Bidirectional synchronization: clicking any note in the tree opens it inline; switching tabs updates the active tree leaf highlight.
* **Advanced Search Engine & Addon Bar** ([`SearchFilterAddonBar.tsx`](file:///c:/Users/DANIEL/.cline/data/workspaces/chat/ctf-tracker/src/components/cheatsheet/SearchFilterAddonBar.tsx)):
  * Single source of truth derived from the raw search query string.
  * **Dynamic Tool Selector**: Popover with real-time tool counts extracted from active notes (e.g. `nmap`, `bloodhound`, `netexec`, `hashcat`, `mimikatz`, `chisel`, `ffuf`).
  * **Tactical Stage Selector**: Filter by attack lifecycle stage (`Recon`, `Enumeration`, `PrivEsc`, `AD`, etc.).
  * **Content Attribute Toggles**: `⚡ Commands` (`has:commands`), `📊 Diagrams` (`has:diagrams`), `🌐 עברית` (`lang:he`).
  * **Removable Pill Badges**: Visual indicator of all active tokens with 1-click `✕` removal and a `Clear Filters` reset.
  * **Structured Query Modifiers**: Native support for `tool:<name>`, `tag:<name>`, `stage:<name>`, `"exact phrase search"`, and `-exclude` negative filtering.
  * **Syntax Guide Modal**: Clickable operator reference with 1-click query insertion.
* **Obsidian Markdown Rendering Pipeline**:
  * 11 Callout Types: `tip`, `warning`, `danger`, `important`, `note`, `example`, `info`, `question`, `success`, `abstract`, `cite`.
  * Collapsible Obsidian Properties Card ([`ObsidianProperties.tsx`](file:///c:/Users/DANIEL/.cline/data/workspaces/chat/ctf-tracker/src/components/obsidian/ObsidianProperties.tsx)) matching native Obsidian v1.4+.
  * Dynamic `#` hover anchor copy links on headings with unicode Hebrew slugification (`slugifyHeading`).
  * Right slide-out Table of Contents drawer with smooth section jumping.
  * LaTeX Math equations via KaTeX (`KaTeXView.tsx`).
  * Attack flowcharts and network topologies via Mermaid (`MermaidView.tsx`) with strict SVG sanitization.

### 4. Writeup Studio (`/writeup`, `/writeup/:id`)
* Dual-pane live markdown editor and synchronized preview.
* Integrated Nmap XML/gnmap parser: extracts open ports, services, and OS banners directly into writeup tables.
* Embedded CVSS v3.1 vector calculator and severity scoring.
* Exportable markdown with standardized YAML frontmatter for Obsidian and GitBook.

### 5. Exam Simulator & Tactical War Room Cockpit (`/exam`, `/warroom`)
* 24h & 48h countdown exam timer with zero-lag 1Hz clock isolation in Zustand.
* 40-Point Active Directory set milestone tracker & scoring engine.
* OffSec exam compliance checklists (screenshot verifications, flags formatting, non-metasploit rules).
* Candidate running log & 1-click Markdown Exam Submission Report Exporter.
* **Embedded Tactical War Room Cockpit** ([`WarRoomView.tsx`](file:///c:/Users/DANIEL/.cline/data/workspaces/chat/ctf-tracker/src/pages/WarRoomView.tsx)):
  * Dual-pane operations desk: Live Multi-Hop Network Topology Graph on the left, Compromised Credential Vault & Payload Forge on the right.
  * Split-pane ratio adjuster (`40/60`, `50/50`, `60/40`) and fullscreen toggle.

### 6. Operational Analytics & Skill Radar (`/analytics`)
* 6-axis SVG vector skill radar (Web Security, Active Directory, Linux PrivEsc, Windows PrivEsc, Network/Pivoting, Binary Exploitation).
* Tier-by-tier completion rates and 90-day GitHub-style study heatmap.

### 7. Tactical Modal Arsenal
* `PivotingMatrixModal`: Interactive multi-hop pivot chains (Chisel, SSH, Ligolo-ng, Socat).
* `HashForgeModal`: Hashcat mode identifiers, John rules, and micro rainbow table lookups.
* `ReconAutomationModal` & `CyberForgeModal`: Automated scan parsing and payload crafting.
* `OperatorDossierModal` & `OperatorFlexCardModal`: Shareable 1200x630 social achievement cards.
* `QuickAssignIpModal`: Instant spawned instance IP replacement.

---

## 5. State Architecture & Zero-Egress Invariant

### State Management (`useCtfStore.ts`)
* Built with **Zustand** using `persist` middleware storing data under `ctf-tracker-storage-v2`.
* **Slices**:
  * `machines`: Array of all target boxes with status, flags, notes, and solve timestamps.
  * `activeTargetId`: Currently engaged machine ID synced to the HUD.
  * `globalVars`: Sticky operator parameters (`LHOST`, `LPORT`, `TARGET_IP`, `INTERFACE`) interpolated in real-time into all commands.
  * `userNotes` & `userWikilinkMap`: User-imported private field manual notes hydrated from IndexedDB.
  * `activitySessions`: Activity history tracking daily pwn metrics and stopwatch intervals.
  * `isTimerRunning`, `activeSessionSeconds`: Isolated timer slice preventing unnecessary re-render cascades.

### IndexedDB Storage (`indexedDbVault.ts`)
* Uses browser-native IndexedDB database `cpts-vault-db` (object store `vault-store`).
* Stores raw markdown files, directory structures, and image attachments without hitting `localStorage` 5MB quota limits.
* Automatically hydrated on application startup in `App.tsx` via `loadUserNotesFromDb()`.

---

## 6. Defensive Security & Sanitization Posture

1. **SVG & Mermaid DOMPurify Sanitization** ([`securityUtils.ts`](file:///c:/Users/DANIEL/.cline/data/workspaces/chat/ctf-tracker/src/utils/securityUtils.ts)):
   * All rendered Mermaid SVGs pass through `sanitizeSvg(svgString)`.
   * Strips dangerous tags: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<meta>`, `<link>`.
   * Strips all `on*` event handlers (`onclick`, `onerror`, `onload`).
   * **Strict `foreignObject` child allowlist**: Allows only formatting elements (`div`, `span`, `p`, `b`, `code`, `pre`, `a`, etc.) so Mermaid flowchart text labels render with high contrast while neutralizing XSS.
   * Strips dangerous inline CSS (`position: fixed`, `position: absolute`, `z-index`).
2. **Directory & Archive Path Traversal Neutralization**:
   * Both `zipVaultImporter.ts` and `directoryVaultImporter.ts` run `isSafeRelativePath(norm)` before processing files, neutralizing Zip Slip and directory traversal attacks (`../`).
3. **Obfuscated Flags Vault**:
   * Flag strings are masked in the UI (`••••••••`) to prevent visual shoulder surfing during screen shares and streams.

---

## 7. Developer & Verification Workflows

### Essential Shell Commands
```bash
# 1. Launch local development server (Vite on port 3000)
npm run dev

# 2. Static TypeScript typecheck (Must always exit code 0)
npx tsc --noEmit

# 3. Production build (Vite build + postbuild mirror to docs/ and root assets)
npm run build

# 4. Local preview of production build
npm run preview
```

### Verification Standard
Before declaring any task or feature deliverable complete:
1. `npx tsc --noEmit` must exit with code 0 (zero errors).
2. `npm run build` must complete cleanly with all bundles mirrored.
3. Live browser testing via Chrome DevTools MCP (connecting to port 3000) must confirm UI rendering, interactive event handlers, and **zero console errors/warnings**.
4. The deliverable must be reviewed and approved by `00_fable_advisor` under the **Architect & Fable Advisor Doctrine**.

---

## 8. Prioritized Upgrade Roadmap & Backlog

### Tier 1: High-Impact Quick Wins
1. **Global LHOST/LPORT Floating Payload Bar**:
   - A persistent, minimizable floating pill bar at the bottom of all routes (Tracker, Methodology, Field Manual).
   - Allows changing `LHOST` or `LPORT` once and instantly copying interpolated reverse shells or listeners without switching pages.
2. **Automated Nmap Service Parser in Tracker**:
   - Allow dropping an `.nmap` or `.gnmap` file directly into the Target Detail page to automatically populate the open ports grid.
3. **1-Click Writeup Export to PDF / HTML Archive**:
   - Export formatted writeups with styling, screenshots, and CVSS scores directly into a self-contained PDF or offline zip archive.

### Tier 2: Strategic Core Upgrades
1. **Lazy-Loaded Catalog Data Chunking (Performance)**:
   - Split `machinesCatalog.ts` (1.05MB) out of the main bundle into an on-demand dynamic import (`import('../../data/machinesCatalog')`) loaded only when the Tracker route mounts.
2. **Multi-Hop Lateral Movement Pivot Visualizer in War Room**:
   - Upgrade the topology graph in `WarRoomView.tsx` to automatically map pivot routes:
     `Operator (LHOST) ➔ Foothold Box (Port Forward / Chisel) ➔ Internal Subnet ➔ Domain Controller`.
3. **BloodHound JSON Ingestion**:
   - Support dragging BloodHound JSON exports into the War Room to automatically populate the compromised credential vault and highlight high-value targets (Domain Admins, Tier-0 objects).

### Tier 3: Hardening & Scalability
1. **Web Worker Search Indexing for Giant Vaults (10,000+ Notes)**:
   - Offload `searchCptsNotes` and token parsing to a dedicated Web Worker thread for instantaneous search in ultra-large corporate/cert vaults.
2. **IndexedDB Partitioning by Operator Profile**:
   - Isolate IndexedDB vaults by active Profile ID so switching between personal and team profiles completely partitions private notes.
