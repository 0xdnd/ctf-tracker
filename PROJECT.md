# Project: ZeroBox Refined Tactical Redesign

## Architecture
- **Design Philosophy**: Refined Tactical Cyber Operations Cockpit — calm, premium, hardware-grade utility with the restraint and typographic craft of Linear and Vercel. Dark Mode: cold deep zinc/graphite/OLED black; Light Mode: crisp, high-contrast slate/zinc with tactile depth and ambient shadows.
- **Global Typography & Font Stack (`src/index.css`, `tailwind.config.js`)**:
  - Primary UI & Prose: Sans-serif system stack (`Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) for navigation, buttons, form controls, table headers, modal copy, and notes.
  - Technical Data & Telemetry: Monospace stack (`'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace`) reserved strictly for IP addresses, ports, MACs, hashes, shell commands, code blocks, countdown timers, and coordinates.
  - Strict `tabular-nums` formatting on 100% of numerical counters, clocks, and network addresses.
  - Disciplined typographic weight scale (`font-normal`, `font-medium`, `font-semibold`; elimination of shouting `font-black` and excessive uppercase tracking).
- **Theme & Token Architecture (`src/index.css`, `tailwind.config.js`, `src/hooks/useTheme.ts`)**:
  - 3 Core Presets: `obsidian` (Zinc Dark / Zinc Light), `monolith` (Graphite Dark / Off-White Light), and `htb` (0-nit OLED Black & Neon Lime / Crisp Slate & Tactical Forest Green).
  - Semantic Color Tokens: `--surface-base`, `--surface-card`, `--surface-elevated`, `--surface-sunken`, `--surface-hover`, `--border-subtle`, `--border-strong`, `--border-accent`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-tertiary`.
  - Dynamic Tailwind mappings for semantic tokens and accents (`rgb(var(--border-accent))`).
  - Elimination of the `hover:text-white` bug in Light Mode across all 50+ affected files.
- **Concentric Radii & Surface Depth**:
  - Concentric corner radii formula: $R_{\text{outer}} = R_{\text{inner}} + \text{padding}$.
  - Dark Mode: Machined 1px top-highlights (`.machined-edge: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.03)`).
  - Light Mode: Subtle ambient elevation shadows (`shadow-xs`, `shadow-sm`, crisp 1px neutral borders).
- **Motion & Interaction Tokens (`src/utils/motionTokens.ts`, `<MotionConfig reducedMotion="user">`)**:
  - Tactile button compression: `active:scale-[0.97]`.
  - Framer Motion interruptible springs: `TACTICAL_SPRING` (`duration: 0.28, bounce: 0`).
  - Asymmetric modal transitions: deliberate spring entry, instant ease-out dismissal (<=150ms).
  - 20ms cascade stagger on lists and cards.
  - Strict `@media (prefers-reduced-motion: reduce)` compliance.
- **Offline Data Persistence & Zero-Egress Invariants**:
  - Preservation of all 28 `localStorage` keys and 3 IndexedDB databases (`zb_deep_storage_db`, `zb_vault_db`, `zb_resilient_db`).
  - Debounced storage updates; zero writes during 1Hz timer ticks.
  - 100% offline client execution: CSP `font-src 'self' data:`, DOMPurify sanitization stripping remote image beacons, zero external network egress.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Global Typography Overhaul | Switch body from monospace to sans-serif system stack; reserve font-mono for telemetry; eliminate font-black clutter | M1 | survey |
| 2 | Semantic Color Tokens & Tailwind Bridge | Wire CSS variables to Tailwind (`text-primary`, `text-secondary`, `text-muted`, dynamic `accent`); fix HTB preset | M1 | survey |
| 3 | Light Mode Hover Contrast Bug Fix | Eliminate `hover:text-white` across all 52 affected components; ensure WCAG AA contrast on light hover | M1 | survey |
| 4 | Concentric Radii Geometry Scale | Standardize container and inner component radius calculations ($R_{\text{outer}} = R_{\text{inner}} + \text{padding}$) | M1 | survey |
| 5 | Dual-Theme Depth & Ambient Shadows | Machined top-highlights in Dark Mode; crisp ambient shadows in Light Mode; elevated modal surfaces | M1 | survey |
| 6 | Standardized Motion & Micro-Interactions | `TACTICAL_SPRING` (duration 0.28, bounce 0), asymmetric modals (<=150ms exit), `active:scale-[0.97]`, reduced-motion | M1 | survey |
| 7 | Core Shell & UnifiedHeader Refinement | Single-line desktop header, L/R/P variable bar, exam capsule, theme toggle, remove developer promotion clutter to About modal | M1 | survey |
| 8 | View 1 Lab Tracker Card De-cluttering | De-clutter badge soup (max 2 primary badges), concentric radii, machined edge, tabular-nums in `GridView.tsx` | M2 | survey |
| 9 | View 1 Table & Kanban Polish | Apply refined typography, machined edge, tabular numerals, and calm headers to `TableView.tsx` and `KanbanBoard.tsx` | M2 | survey |
| 10 | View 1 Attack Graph Canvas & Inspector | Refined SVG node cards, remove ad-hoc `#0c1222`, spring drawer slide, syntax-highlighted pivot commands | M2 | survey |
| 11 | View 1 Target Inspector Drawer | Refined layout, concentric radii, tabbed notes & loot, tabular port lists in `MachineDetailModal.tsx` | M2 | survey |
| 12 | View 2 Evidence Vault & Loot Timeline | Visual kill-chain Loot Timeline view, refined KPI summary cards, masked secrets reveal in `EvidenceVaultPage.tsx` | M2 | survey |
| 13 | View 2 Loot Modals & Forms Craft | Concentric radii, machined top-highlights, clean form inputs, and tabular timestamps on Loot dialogs | M2 | survey |
| 14 | View 3 Attack Methodology Tree | 8-phase tree and decision branches A-G with spring accordions, machined edge, tabular telemetry, syntax commands | M3 | survey |
| 15 | View 3 Methodology Checklist & Playbook | Interactive task checklists, progress bar, playbooks with 1-click syntax-highlighted command interpolation | M3 | survey |
| 16 | View 4 Field Manual & Notes Workspace | Multi-tab dock, DOM keep-alive, split-view markdown editor, callout styling in light/dark, 20ms cascade stagger | M3 | survey |
| 17 | View 4 Obsidian OFM Rendering | Wikilinks (`[[Note]]`), Obsidian callouts (`[!NOTE]`, `[!TIP]`, etc.), interactive checklists, syntax-highlighted code | M3 | survey |
| 18 | View 5 Writeup Studio Dual-Pane Editor | Dual-pane live markdown editor with AST preview, machined panels, tabular character/line telemetry, AnimatePresence drawer | M3 | survey |
| 19 | View 5 Pentest Report & Exporters | Asymmetric modal exit (<=150ms), sanitized markdown/HTML/PDF report exporters in `PentestReportModal.tsx` | M3 | survey |
| 20 | View 6 Accessible SVG Radar Chart | `role="img"`, `<title>`, `aria-label`, theme-adaptive spoke lines and vector polygons in `AnalyticsView.tsx` | M4 | survey |
| 21 | View 6 7-Day Multi-Row Activity Heatmap | Restructure 90-day heatmap into 7-day week grid with keyboard navigation (`tabIndex={0}`), focus rings, and ARIA attributes | M4 | survey |
| 22 | View 7 24h Exam Simulator Cockpit | Interactive SVG exam velocity & burn-down pacing chart, target budget cards, tabular countdown clocks in `ExamSimulatorPage.tsx` | M4 | survey |
| 23 | View 7 Exam Bio-Break & Evidence Dropzone | Dual-clock bio-break timer, audio alert integration, canvas client-side image compression dropzone, OffSec/HTB report modal | M4 | survey |
| 24 | Nielsen 10 Usability Heuristics Resolution | Replace raw alerts with in-app toasts, add skeleton loading states, confirmation modals, error recovery, shortcut cheatsheet | M5 | survey |
| 25 | WCAG 2.1 AA Accessibility Hardening | Contrast ratio >= 4.5:1 across all 3 presets in both modes, visible focus indicators, screen reader labels, zero unhandled errors | M5 | survey |
| 26 | Test Suite Zero-Regression Verification | 100% pass rate on all 79 Vitest test files (880 tests), TypeScript zero-diagnostic check (`npx tsc --noEmit`) | M6 | survey |
| 27 | E2E Playwright Suite Verification | Full pass on `npm run test:e2e` with proper onboarding state seeding (`zerobox_onboarding_completed: true`) | M6 | survey |
| 28 | Live Browser Before/After Visual Proof | Screenshots of every main view and key modals in Light and Dark modes at 1440px and 390px captured via live browser | M6 | survey |
| 29 | Lighthouse Accessibility Audit (>= 95) | Automated Lighthouse audits verifying accessibility score >= 95 on every main view in both Light and Dark themes | M6 | survey |
| 30 | Written Heuristics Audit & Rubric Sign-off | Documented audit report resolving Nielsen's 10 heuristics, independent judge sign-off against design rubric | M6 | survey |
| 31 | Forensic Integrity Audit Gate | Forensic verification ensuring genuine implementation, zero facades/dummy code, and air-gapped zero egress | M6 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Foundation Overhaul | Features 1–7: Typography overhaul (sans body, mono telemetry), semantic tokens & Tailwind config, light mode hover contrast fix, concentric radii, dual-theme depth, motion tokens, Core Shell & UnifiedHeader | none | DONE |
| M2 | Primary Operations Views Redesign | Features 8–13: Lab Tracker (`GridView`, `TableView`, `KanbanBoard`, `GraphView`, `GraphEdgeInspectorDrawer`, `MachineDetailModal`) & Evidence Vault (`EvidenceVaultPage`, `LootTimeline`) | M1 | DONE |
| M3 | Field Manual, Writeup Studio & Methodology Redesign | Features 14–19: Attack Methodology (`MethodologyPage`, `ChecklistWorkspace`), Field Manual & Notes (`CheatsheetView`, `ObsidianNoteViewer`, `PersistentNotesWorkspace`), Writeup Studio (`WriteupStudio`, `PentestReportModal`) | M1 | DONE |
| M4 | Specialist Cockpits Redesign (Analytics & Exam Simulator) | Features 20–23: Analytics View (`AnalyticsView`, accessible SVG radar, 7-day multi-row heatmap) & Exam Simulator (`ExamSimulatorPage`, SVG velocity burn-down chart, `ExamHeaderCapsule`, bio break, dropzone) | M1 | DONE |
| M5 | Usability Heuristics & Accessibility Hardening | Features 24–25: Nielsen 10 Heuristics resolution (in-app toasts, skeleton loaders, error recovery), WCAG 2.1 AA audit & contrast calibration across all 3 presets in both modes, visible focus indicators | M2, M3, M4 | DONE |
| M6 | Final E2E Verification, Visual Proof, Rubric Sign-off & Audit | Features 26–31: Full Vitest suite (880 tests) and E2E Playwright suite pass, live browser before/after screenshots in light/dark at 1440px/390px, Lighthouse score >= 95, heuristics report, independent sign-off, Forensic Integrity Audit | M5 | DONE (`7b9462b`; Lighthouse a11y 100 on 18 runs) |

_Status note: M3-M5 landed in `a718aa9` / `93e22a7`; a full visual pass (tokens `88a362d`, wave 1 `2e64daf`, wave 2 lanes, polish/a11y `52b60cc`..`ee2bcc3`) followed before M6 sign-off. See `docs/AI_HANDOFF.md`._

## Interface Contracts
### Typography & Font Class Rules
- All non-code UI text (headings, labels, buttons, descriptions, table headers) MUST use sans-serif (`font-sans`).
- Monospace (`font-mono tabular-nums`) is restricted strictly to:
  - IP addresses (`EditableIpBadge`, target cards, header capsule)
  - Port numbers & protocols
  - Terminal commands & shell snippets (`SyntaxHighlightedCommand`)
  - Hexadecimal hashes, MAC addresses, and cryptographic keys
  - Timers, stopwatches, countdown clocks, and percentage counters
  - Markdown code blocks & raw OFM source

### Semantic Color Variables (`src/index.css`)
```css
/* All background surfaces must consume CSS variables */
bg-surface-base     /* rgb(var(--surface-base)) */
bg-surface-card     /* rgb(var(--surface-card)) */
bg-surface-elevated /* rgb(var(--surface-elevated)) */
bg-surface-sunken   /* rgb(var(--surface-sunken)) */
bg-surface-hover    /* rgb(var(--surface-hover)) */

/* All borders must consume CSS variables */
border-subtle       /* rgb(var(--border-subtle)) */
border-strong       /* rgb(var(--border-strong)) */
border-accent       /* rgb(var(--border-accent)) */

/* All text colors must consume CSS variables */
text-primary        /* rgb(var(--text-primary)) */
text-secondary      /* rgb(var(--text-secondary)) */
text-muted          /* rgb(var(--text-muted)) */
text-tertiary       /* rgb(var(--text-tertiary)) */
```

### Concentric Radii Formula Contract
```
R_outer = R_inner + padding
R_inner = max(0, R_outer - padding)
```
- Standard container radius: `rounded-xl` (16px) with `p-3.5` (14px) padding contains inner elements with `rounded-[2px]` or `rounded-[4px]`.
- Outer modal dialog: `rounded-2xl` (24px) with `p-6` (24px) padding contains inner cards/inputs with `rounded-lg` (8px).

### 1px Machined Top-Highlight Contract
```css
.machined-edge {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.03);
}
```

### Motion Presets (`src/utils/motionTokens.ts`)
```ts
export const TACTICAL_SPRING = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.28,
};

export const MODAL_ASYMMETRIC_TRANSITION = {
  enter: {
    opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    scale: { type: "spring", bounce: 0, duration: 0.28 },
    y: { type: "spring", bounce: 0, duration: 0.28 },
  },
  exit: {
    opacity: { duration: 0.12, ease: "easeOut" },
    scale: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
    y: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
  },
};
```

## Code Layout
- `src/App.tsx`: Global route definitions, modal mounts, `<MotionConfig reducedMotion="user">`
- `src/index.css`: Typography reset, theme CSS variables, `.machined-edge`, `.tabular-nums`
- `tailwind.config.js`: Tailwind theme extensions, semantic colors, accent variables, shadows
- `src/utils/motionTokens.ts`: Framer Motion spring presets and transition contracts
- `src/components/layout/UnifiedHeader.tsx`: Single-line tactical cockpit header, variables capsule
- `src/components/common/`: Shared primitives (`CyberButton`, `CyberBadge`, `CyberInput`, `CyberSelect`, `CyberCard`, `SyntaxHighlightedCommand`)
- `src/components/tracker/`: View 1 Lab Tracker (`GridView.tsx`, `TableView.tsx`, `KanbanBoard.tsx`, `GraphView.tsx`, `MachineDetailModal.tsx`)
- `src/pages/EvidenceVaultPage.tsx`, `src/components/loot/`: View 2 Evidence Vault & Loot Timeline
- `src/pages/MethodologyPage.tsx`, `src/components/checklist/`: View 3 Attack Methodology
- `src/components/cheatsheet/`: View 4 Field Manual, Notes Workspace & Obsidian OFM Viewer
- `src/components/writeup/`: View 5 Writeup Studio & Exporters
- `src/components/analytics/AnalyticsView.tsx`: View 6 Skill Radar & 7-Day Heatmap
- `src/pages/ExamSimulatorPage.tsx`, `src/components/exam/`: View 7 24h Exam Simulator
- `src/test/`: Comprehensive unit, integration, and E2E test suites
