# ZeroBox Redesign — Direct Continuity Prompt for Claude Code

Copy and paste the prompt below directly into **Claude Code** to immediately take over the redesign project with full context:

---

```markdown
You are taking over the ongoing complete visual, interaction, and UX redesign of ZeroBox (Tactical Cybersecurity Lab & CTF Operations Dashboard) in `c:\Users\DANIEL\Desktop\Projects\ctf-tracker`.

### What Was Already Done & Verified
1. **Design System & Shell (Milestone 1 — COMPLETED & CERTIFIED)**:
   - Migrated body typography from all-caps mono to clean Inter/system sans (`font-sans`).
   - Monospace (`font-mono tabular-nums`) reserved strictly for IP addresses, ports, timers, hashes, and shell commands.
   - Dynamic semantic CSS variables wired to Tailwind (`bg-surface-elevated`, `border-subtle`, `text-primary`, etc.). Fixed the light mode `hover:text-white` bug.
   - Created accessible base primitives with concentric radii ($R_{outer} = R_{inner} + padding$): `CyberButton`, `CyberBadge`, `CyberInput`, `CyberSelect`, and in-app toast engine (`useToastStore`, `ToastContainer`).
   - Replaced bloated header with a calm single-line `UnifiedHeader.tsx`.

2. **Primary Operations Views (Milestone 2 — IMPLEMENTED & 100% PASSING)**:
   - Redesigned `GridView.tsx`, `TableView.tsx`, `KanbanBoard.tsx`, and `MachineDetailModal.tsx` (now a smooth right-side slide-over drawer).
   - Redesigned `GraphView.tsx` (SVG node highlights, concentric zoom toolbar) and `GraphEdgeInspectorDrawer.tsx` (syntax-highlighted pivot commands).
   - Redesigned `EvidenceVaultPage.tsx`, `LootTimeline.tsx`, `AddLootModal.tsx`, and `ExportLootDrawer.tsx` (kill-chain phases, masked secrets reveal, JSON/CSV/Markdown exporters).
   - Current Verification: `npx tsc --noEmit` exits 0; all 86 test files (990 tests) pass with 100% success; production build succeeds.

### Your Goal: Complete Milestones 3 Through 6
Consult the master plan in `PROJECT.md` and continue the implementation in order:

- **Milestone 3: Specialist Views (NEXT UP)**:
  - `MethodologyPage.tsx` & `ChecklistWorkspace.tsx`: 8-phase tree and decision branches with spring accordions, task checklists, and 1-click syntax-highlighted command interpolation.
  - `CheatsheetView.tsx`, `ObsidianNoteViewer.tsx`, & `PersistentNotesWorkspace.tsx`: Multi-tab dock with DOM keep-alive, split-view markdown editor, Obsidian callouts (`[!NOTE]`, `[!TIP]`), and wikilinks.
  - `WriteupStudio.tsx` & `PentestReportModal.tsx`: Dual-pane editor with live AST preview, character/line telemetry, sanitized Markdown/HTML/PDF report exporters, and asymmetric modal exits (<=150ms).

- **Milestone 4: Specialist Cockpits**:
  - `AnalyticsView.tsx`: Accessible SVG radar chart (`role="img"`, ARIA labels, theme-adaptive spokes) and 7-day multi-row activity heatmap with keyboard focus rings.
  - `ExamSimulatorPage.tsx`: Interactive SVG exam velocity & burn-down pacing chart, target budget cards, tabular countdown clocks, dual-clock bio-break timer (`ExamBioBreakModal.tsx`), and evidence dropzone (`ExamEvidenceDropzone.tsx`).

- **Milestone 5: Nielsen 10 Usability Heuristics & WCAG 2.1 AA Hardening**:
  - Replace any remaining native `alert()` calls with `useToastStore`.
  - Add skeleton loading states and confirmation dialogs for destructive actions.
  - Verify contrast ratio >= 4.5:1 across all 3 theme presets (`obsidian`, `monolith`, `htb`) in both Light and Dark modes.

- **Milestone 6: Verification & Polish**:
  - Ensure `npm run build`, `npx tsc --noEmit`, and `npm test -- --run` pass at every step.
  - Run the Playwright E2E suite (`python scripts/run_webapp_tests.py`).
  - Capture before/after screenshots in light and dark mode at 1440px and 390px.
  - Ensure Lighthouse accessibility score >= 95 across all views.

### Architectural Rules
- Direction: **Refined Tactical** — calm, hardware-grade utility with the restraint of Linear and Vercel. Dark mode: cold deep zinc/graphite/OLED black; Light mode: crisp slate/zinc with subtle elevation.
- Never use `hover:text-white` in light mode.
- Enforce concentric radii ($R_{outer} = R_{inner} + padding$).
- Use Framer Motion `TACTICAL_SPRING` (`duration: 0.28, bounce: 0`) and asymmetric modal exits (<=150ms). Always respect `prefers-reduced-motion`.
- All skills are pre-installed in `.claude/skills/` (including `ultimate-redesign`, `impeccable`, `emil-design-eng`, `make-interfaces-feel-better`, `ux-heuristics-review`).

Please start by reviewing `PROJECT.md` and `src/components/cheatsheet/` / `src/pages/`, then begin Milestone 3 implementation.
```
