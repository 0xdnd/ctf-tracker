# ZeroBox Redesign — Claude Code Operational Manual & Continuity Guide

## Overview
**ZeroBox** is a high-performance offline tactical cybersecurity lab & CTF operations dashboard (React 18 + Vite + TypeScript + Tailwind CSS + Tauri).
We are actively executing a comprehensive visual, interaction, and UX redesign of ZeroBox to transition it into a **Refined Tactical Cockpit** with the craft, calm restraint, and typographic precision of **Linear** and **Vercel** (dark zinc/graphite/OLED black in Dark mode, crisp slate/zinc in Light mode).

All skills from Antigravity/Gemini (including `ultimate-redesign`, `impeccable`, `emil-design-eng`, `make-interfaces-feel-better`, `ux-heuristics-review`, `generative_ui`, `transitions-dev`, etc.) are installed and active in `.claude/skills/` and `~/.claude/skills/`.

---

## Current Roadmap & Progress Status

The master blueprint is defined in [`PROJECT.md`](file:///c:/Users/DANIEL/Desktop/Projects/ctf-tracker/PROJECT.md).

| Milestone | Scope | Status | Notes |
|---|---|---|---|
| **M1** | Design System, Tokens, Typography, Motion, Base Primitives & Shell | **DONE & CERTIFIED** | Inter body sans, mono telemetry, concentric radii, `CyberButton`/`CyberBadge`/`CyberInput`/`CyberSelect`, in-app toasts, single-line `UnifiedHeader`. |
| **M2** | Primary Operations Views: Lab Tracker & Evidence Vault | **IMPLEMENTED** | `GridView`, `TableView`, `KanbanBoard`, `GraphView`, `GraphEdgeInspectorDrawer`, `MachineDetailModal`, `EvidenceVaultPage`, `LootTimeline`, `AddLootModal`, `ExportLootDrawer`. All 10 files completed and passing tests. |
| **M3** | Specialist Views: Methodology, Field Manual/Notes & Writeup Studio | **NEXT UP (START HERE)** | `MethodologyPage`, `ChecklistWorkspace`, `CheatsheetView`, `ObsidianNoteViewer`, `PersistentNotesWorkspace`, `WriteupStudio`, `PentestReportModal`. |
| **M4** | Specialist Cockpits: Analytics Radar & 24h Exam Simulator | **PLANNED** | Accessible SVG Radar chart, 7-day multi-row activity heatmap, `ExamSimulatorPage`, SVG velocity burn-down chart, `ExamHeaderCapsule`. |
| **M5** | Nielsen 10 Usability Heuristics & WCAG 2.1 AA A11y Hardening | **PLANNED** | In-app toasts, skeleton loading states, confirmation dialogs, contrast calibration >= 4.5:1 across all presets, visible focus indicators. |
| **M6** | Final Full Verification, Visual Proof & Sign-Off | **PLANNED** | Full Vitest & Playwright E2E suites, live browser before/after screenshots (Light & Dark, 1440px & 390px), Lighthouse >= 95, heuristics report. |

---

## Architectural & Design Guidelines

1. **Typography & Hierarchy**:
   - Body & Prose: Sans-serif system stack (`font-sans` / Inter).
   - Telemetry strictly monospace: `font-mono tabular-nums` ONLY for IP addresses, ports, MACs, hashes, shell commands, and countdown timers.
   - Disciplined weight scale: `font-normal`, `font-medium`, `font-semibold`. No screaming `font-black`.

2. **Concentric Radii Geometry**:
   - Standard formula: $R_{\text{outer}} = R_{\text{inner}} + \text{padding}$.
   - Cards $R_{\text{outer}} = 16\text{px}$ (`rounded-2xl`), nested buttons $R = 8\text{px}$ (`rounded-lg`), tags $R = 4\text{px}$ (`rounded`).

3. **Color & Theme Tokens (`src/index.css`, `tailwind.config.js`)**:
   - Consume CSS variables: `bg-surface-base`, `bg-surface-card`, `bg-surface-elevated`, `bg-surface-sunken`, `bg-surface-hover`, `border-subtle`, `border-strong`, `border-accent`, `text-primary`, `text-secondary`, `text-muted`.
   - Never use `hover:text-white` in generic styles (breaks light mode).
   - Machined 1px top-highlights in Dark mode (`.machined-edge`). Crisp subtle elevation in Light mode.

4. **Motion & Interaction Tokens (`src/utils/motionTokens.ts`)**:
   - Tactile button press: `active:scale-[0.97]`.
   - Springs: `TACTICAL_SPRING` (`duration: 0.28, bounce: 0`).
   - Asymmetric modals: instant exit (<=150ms).
   - Always honor `prefers-reduced-motion`.

5. **Anti-Clutter & Restraint**:
   - Eliminate rainbow badge soup: max 2 primary badges inline on cards, additional badges grouped into compact count pill or flyout.
   - Replace any remaining native `alert()` calls with `useToastStore` (`showToast`).

6. **Offline Invariant & Zero Egress**:
   - Zero remote network requests. All data lives in localStorage (28 keys) and IndexedDB (`zb_deep_storage_db`, `zb_vault_db`, `zb_resilient_db`).
   - Never break data contracts or drop persisted fields.

---

## Verification Commands

Always run these verification commands before marking any step complete:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Unit and component tests
npm test -- --run

# 3. Production build verification
npm run build

# 4. E2E browser crawl suite
python scripts/run_webapp_tests.py
```
