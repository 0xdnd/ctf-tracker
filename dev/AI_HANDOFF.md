# ZeroBox - AI Agent Handoff

Audience: an AI coding agent with zero prior context. Everything below was derived from the source at commit `ee2bcc3` (branch `main`) unless marked **UNVERIFIED**. Paths are relative to the repo root (e.g. `src/...`).

## Table of contents

- [0. TL;DR](#0-tldr)
- [Part A - The application](#part-a---the-application)
  - [A1. What ZeroBox is, stack, offline invariant, Tauri/PWA](#a1-what-zerobox-is-stack-offline-invariant-tauripwa)
  - [A2. Directory map](#a2-directory-map)
  - [A3. Routing and global shell](#a3-routing-and-global-shell)
  - [A4. State (zustand stores)](#a4-state-zustand-stores)
  - [A5. Data schema and persistence](#a5-data-schema-and-persistence)
  - [A6. Domain logic hotspots](#a6-domain-logic-hotspots)
  - [A7. Design system](#a7-design-system)
  - [A8. Testing and verification](#a8-testing-and-verification)
- [Part B - What was done in the redesign](#part-b---what-was-done-in-the-redesign)
- [Part C - How to continue](#part-c---how-to-continue)
- [Appendix: doc discrepancies found](#appendix-discrepancies-between-existing-docs-and-code)

---

## 0. TL;DR

- ZeroBox = offline-first React 18 + Vite + TypeScript + Tailwind 3 SPA (also packaged with Tauri v2) for CTF/lab tracking, evidence vault, methodology, field manual notes, writeups, analytics and a 24h exam simulator.
- Zero network egress is an invariant. All state is in `localStorage` + IndexedDB.
- A multi-milestone "Refined Tactical Cockpit" redesign (Linear/Vercel restraint) is **complete: M1-M6 DONE** (M6 signed off at commit `7b9462b`), plus a full visual pass.
- Before any change run: `npx tsc --noEmit`, `npm test -- --run`, `npm run build`, `python scripts/run_webapp_tests.py` (see [A8](#a8-testing-and-verification)).
- Never drop persisted fields, never add network calls, use tokens not raw colors, no `layoutId` in route-level components (see [Part C](#part-c---how-to-continue)).
- Existing docs: [CLAUDE.md](../CLAUDE.md) (operational manual) (local-only, untracked - may not exist in a clone), [PROJECT.md](PROJECT.md) (blueprint; milestone table updated, M1-M6 DONE), [TEST_INFRA.md](TEST_INFRA.md), [AI_CONTEXT.md](AI_CONTEXT.md) (older orientation guide; some numbers are stale), [CLAUDE_HANDOFF_PROMPT.md](CLAUDE_HANDOFF_PROMPT.md) (older continuity prompt; stale, says M3 is next) (local-only, untracked - may not exist in a clone).

---

# Part A - The application

## A1. What ZeroBox is, stack, offline invariant, Tauri/PWA

**ZeroBox** ("Tactical Cybersecurity Lab & CTF Operations Dashboard", package `zerobox` v`2.0.0`, author Daniel Dayan / `0xdnd`) is a single-user, client-only cockpit for:

| Capability | Where |
|---|---|
| Lab/target lifecycle tracker (Kanban / Grid / Table / Attack Graph) over a bundled catalog of HTB/THM machines plus custom machines | [src/components/tracker/](../src/components/tracker/) |
| Target detail dossier, Nmap/scan import dropzone, per-machine methodology checklist | [src/pages/TargetDetailPage.tsx](../src/pages/TargetDetailPage.tsx) |
| Evidence & loot vault (credentials/flags/hashes/keys/tokens aggregated from targets + custom loot) | [src/pages/EvidenceVaultPage.tsx](../src/pages/EvidenceVaultPage.tsx) |
| Attack methodology (8-phase tree, decision branches, playbooks) | [src/pages/MethodologyPage.tsx](../src/pages/MethodologyPage.tsx), [src/data/methodologyFramework.ts](../src/data/methodologyFramework.ts) |
| Field manual / snippets / Obsidian-flavoured notes viewer, multi-tab docked notes workspace | [src/components/cheatsheet/](../src/components/cheatsheet/), [src/components/workspace/](../src/components/workspace/) |
| Writeup Studio + pentest report/export | [src/components/writeup/](../src/components/writeup/) |
| Analytics (skill radar + activity heatmap) | [src/components/analytics/AnalyticsView.tsx](../src/components/analytics/AnalyticsView.tsx) |
| 24h exam simulator (OSCP/CPTS/CRTO/OSEP/CRTP rulesets, scoring, bio-breaks, evidence proofs, burn-down) | [src/pages/ExamSimulatorPage.tsx](../src/pages/ExamSimulatorPage.tsx), [src/components/exam/](../src/components/exam/) |
| Operator profiles (zero-password local identities), XP/rank/trophies | [src/store/useAuthStore.ts](../src/store/useAuthStore.ts), [src/utils/gamificationEngine.ts](../src/utils/gamificationEngine.ts) |

### Stack (from [package.json](../package.json))

| Area | Package / version range |
|---|---|
| UI | `react` / `react-dom` ^18.3.1, `react-router-dom` ^7.18.3 (**HashRouter**), `framer-motion` ^11.18.2, `lucide-react` ^0.474.0 |
| State | `zustand` ^5.0.3 (`persist` middleware) |
| Styling | `tailwindcss` ^3.4.17, `tailwindcss-animate`, `clsx`, `tailwind-merge`, PostCSS/autoprefixer |
| Misc runtime | `@dnd-kit/core` + `utilities` (Kanban DnD), `@tanstack/react-virtual` (table virtualization), `dompurify` ^3.4.16 (sanitization), `jszip` ^3.10.1 (vault zip import/export), `canvas-confetti`, `@tauri-apps/plugin-updater` |
| Build | `vite` ^6.1.0, `@vitejs/plugin-react`, `typescript` ^5.7.3 |
| Test | `vitest` ^5.0.0 + jsdom ^30, `@testing-library/*`, `fast-check` (property fuzzing), `@playwright/test` ^1.63.0, `axe-core` ^4.13.0, `lighthouse` ^13.5.0 |
| Desktop | Tauri v2 (`@tauri-apps/cli`, `@tauri-apps/api`; Rust in [src-tauri/](../src-tauri/), product `ZeroBox`, id `com.zerobox.tacticaltracker`) |

npm scripts: `dev` (vite, port 3000), `test` (`vitest run`), `test:watch`, `test:e2e` (`python scripts/run_webapp_tests.py`), `build` (`tsc && vite build && node scripts/postbuild.cjs`), `preview`, `tauri`/`tauri:dev`/`tauri:build`, `lighthouse:a11y` (`node scripts/lighthouse_a11y.mjs`), `export-notes`/`index-notes` (`scripts/index-cpts-notes.cjs`, which is gitignored/local-only, so these two npm scripts fail in a clean clone), `share` (localtunnel - dev convenience only, not used by the app).

### Offline / zero-egress invariant

- No remote calls from app code. The only `fetch` in `src/` is `fetch('/api/local-vault')` in [src/components/cheatsheet/NotesImportModal.tsx](../src/components/cheatsheet/NotesImportModal.tsx) which hits a **same-origin dev-server middleware** (`localVaultPlugin` in [vite.config.ts](../vite.config.ts), reads a local `CPTS Field Manual` folder). It does not exist in production builds.
- CSP in [index.html](../index.html): `default-src 'none'; manifest-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: ws: wss:; media-src 'self' data: blob:` (`ws:` is for Vite HMR). Tauri CSP in [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json) is stricter (`script-src 'self'`, `connect-src 'self'`).
- `DOMPurify` hook in [src/utils/securityUtils.ts](../src/utils/securityUtils.ts) neutralizes remote `<img src>` (only relative paths, same-dir filenames, or `data:image/...;base64`). `sanitizeHtml` (markdown/writeups) and `sanitizeSvg` (diagrams) forbid scripts/iframes/handlers.
- Google OAuth components exist ([src/components/auth/](../src/components/auth/)) and the auth store has `loginWithGoogleCredential`, but the shipped flow is zero-password local operator profiles; **UNVERIFIED** whether the Google modals are reachable from UI. No Google script is loaded (CSP would block it).
- Tests that guard this: [src/test/e2e/zeroEgress.e2e.test.ts](../src/test/e2e/zeroEgress.e2e.test.ts), `offlineRuntime.e2e.test.ts`, `xssSanitization.e2e.test.ts`, `zipSlipIngestion.e2e.test.ts`.

### PWA / Service worker

- [public/sw.js](../public/sw.js): `CACHE_VERSION = 'zerobox-v2.1.0'`, precaches `./`, `./index.html`, `./manifest.webmanifest`; never intercepts cross-origin; navigation = network-first with cached `index.html` fallback; `/assets/` = cache-first; everything else = stale-while-revalidate. Old `zerobox-*` caches are deleted on activate. Bump `CACHE_VERSION` when the shell strategy changes.
- [src/main.tsx](../src/main.tsx): registers `./sw.js` only in production builds (`load` event); in DEV it unregisters all SWs and clears caches. Also requests `navigator.storage.persist()` and warns at >80% quota. Renders `<ErrorBoundary><App/></ErrorBoundary>` in `React.StrictMode`.
- [public/manifest.webmanifest](../public/manifest.webmanifest): name "ZeroBox // Tactical CTF Tracker", `display: standalone`, icons 192/512.
- [vite.config.ts](../vite.config.ts): `base: './'` (relative, works on GitHub Pages / file-like hosting), manual chunks (`cpts-vault-data`, `catalog-data`, `methodology-data`, `tracks-data`, `vendor-*`). [scripts/postbuild.cjs](../scripts/postbuild.cjs) copies `dist/index.html` to `dist/404.html`, writes `.nojekyll`, mirrors icons. CI: [.github/workflows/](../.github/workflows/) `deploy.yml`, `release.yml`.

### Tauri

- v2 desktop shell in [src-tauri/](../src-tauri/) (`src/lib.rs`, `src/main.rs`, `tauri.conf.json` with `devUrl http://localhost:3000`, `frontendDist ../dist`). `useCtfStore` listens for the `tauri-app-close-requested` event to `flushProfileSave()`. [src/hooks/useDesktopUpdater.ts](../src/hooks/useDesktopUpdater.ts) wraps the updater plugin. `updater.key` / `updater.key.pub` live in `src-tauri/` (treat the private key as a secret; do not print or move it). The private `src-tauri/updater.key` is gitignored (`*.key`) and has never been committed (verified with `git ls-files` and `git log --all`); only the `.pub` is tracked.

---

## A2. Directory map

```
ctf-tracker/
  index.html                  CSP meta, theme boot, #root
  CLAUDE.md PROJECT.md TEST_INFRA.md AI_CONTEXT.md CLAUDE_HANDOFF_PROMPT.md   existing docs (CLAUDE.md and CLAUDE_HANDOFF_PROMPT.md are local-only/untracked)
  AI_HANDOFF.md               this file (repo root; docs/ is gitignored)
  e2e/comprehensive-crawl.spec.ts   Playwright specs (7 tests, TC-01..TC-07)
  playwright.config.ts vitest.config.ts vite.config.ts tailwind.config.js postcss.config.js tsconfig.json
  public/                     sw.js, manifest.webmanifest, icons, logos, robots.txt, llms.txt
  scripts/                    run_webapp_tests.py, axe_contrast_scan.py, lighthouse_a11y.mjs, postbuild.cjs,
                              index-cpts-notes.cjs, inspect_header_elements.py, test_header_viewports.py
                              (the .cjs and the two other .py files are gitignored local-only scripts; scripts/*.py is ignored
                              except run_webapp_tests.py and axe_contrast_scan.py)
  reports/                    axe-report.json, lighthouse/*.json (generated)
  plans/                      001..005 motion/transition plan docs (historical)
  src-tauri/                  Tauri v2 Rust shell
  src/
    main.tsx                  SW registration, storage persist, root render
    App.tsx                   router, shell, modal mounts, timer controller, zoom engine
    index.css                 ALL design tokens (CSS variables), presets, utilities, focus ring
    types/                    index.ts (Machine & friends), checklist.ts, graph.ts, auth.ts, gamification.ts, workspace.ts
    store/                    useCtfStore (main), examStore, useAuthStore, useNotesWorkspaceStore, useToastStore, useConfirmStore
    hooks/                    useTheme (light/dark + ThemeProvider), useFocusTrap (stacked), useTacticalHotkeys, useDesktopUpdater
    context/                  ScrollContext (main-scroll element + progress/back-to-top)
    pages/                    TargetDetailPage, MethodologyPage, EvidenceVaultPage, ExamSimulatorPage
    components/
      common/                 Primitives & shared UI: CyberButton/Badge/Input/Select, PageHeader, OverflowMenu, BadgeOverflow,
                              ConfirmDialog, ToastContainer, Skeleton, RouteErrorBoundary, ErrorBoundary, FloatingPayloadBar,
                              RevShellModal, SettingsModal, StartCleanModal, Operator*Modal, EditableIpBadge, *Badge, ThemeToggle,
                              ThemePresetDropdown, SyntaxHighlightedCommand, EphemeralStorageBanner, ScrollProgressBar, BackToTopButton ...
      layout/                 UnifiedHeader, Sidebar, MobileNav, CommandPalette, SnippetsDrawer, FilterDrawer, SettingsDropdown
      tracker/                TrackerView, GridView, TableView, KanbanBoard, GraphView, GraphEdgeInspectorDrawer, MachineDetailModal,
                              NewMachineModal, TargetReconDropzone, QuickCommandsTab, CuratedPathways
      loot/                   AddLootModal, LootTimeline, ExportLootDrawer
      checklist/              ChecklistWorkspace
      cheatsheet/             CheatsheetView, ObsidianNoteViewer, ObsidianTabContent, MarkdownEditor, CptsTreeItem,
                              NewCptsNoteModal, NotesImportModal, ReverseShellGenerator
      workspace/              PersistentNotesWorkspace, NotesWorkspaceTabStrip
      writeup/                WriteupStudio, PentestReportModal
      analytics/              AnalyticsView
      exam/                   ExamBioBreakModal, ExamBurndownChart, ExamEvidenceDropzone, ExamHeaderCapsule,
                              ExamQuickActionDrawer, ExamReportModal
      auth/                   OperatorProfileModal, UserMenu, GoogleOAuthModal, GoogleSignInButton
      automation/ backup/     ReconAutomationModal, BackupModal
    data/                     machinesCatalog.ts (22k lines, lazy), starterMachines.ts, tracksData.ts, methodologyFramework.ts,
                              cheatsheetsData.ts, revshellsData.ts, cptsNotesIndex.json, avatarPresets.ts, demoSolvedRoster.ts
    utils/                    domain logic (see A6) + storage engines (indexedDb*, resilientStorage, workspaceStorage)
    test/                     cross-cutting suites (see A8); many component tests are co-located as *.test.ts(x)
```

---

## A3. Routing and global shell

Router: `HashRouter` (`#/path`) inside `<MotionConfig reducedMotion="user">` in [src/App.tsx](../src/App.tsx). Provider order: `MotionConfig > HashRouter > ScrollProvider > ThemeProvider > MainAppContent`. Route changes are wrapped in `AnimatePresence mode="wait"` with a keyed `motion.div` (opacity/y, 0.18s) and `RouteErrorBoundary resetKey={pathname}` + `Suspense fallback={<ViewSkeleton/>}`.

| Path | Element | Loading | Notes |
|---|---|---|---|
| `/` | `Navigate to /tracker` | - | replace |
| `/tracker` | `TrackerView` | **eager** (static import) | view mode from store (`kanban` default) |
| `/target/:id`, `/targets/:id` | `TargetDetailPage` | lazy | alias pair |
| `/methodology` | `MethodologyPage` | lazy | |
| `/cheatsheets`, `/cheatsheet` | `CheatsheetView` | lazy | snippet/cheatsheet mode |
| `/notes`, `/field-manual`, `/cpts`, `/cpts-manual` | `CheatsheetView defaultMode="cpts-manual"` | lazy | field-manual aliases |
| `/writeup`, `/writeup/:id` | `WriteupStudio` | lazy | |
| `/writeups` | `Navigate to /writeup` | - | redirect |
| `/analytics` | `AnalyticsView` | lazy | |
| `/exam`, `/exam-simulator` | `ExamSimulatorPage` | lazy | |
| `/vault`, `/evidence`, `/loot` | `EvidenceVaultPage` | lazy | three aliases |
| `*` | `Navigate to /tracker` | - | catch-all |

`activeTab` (store) is synced from the pathname in an effect (`methodology`, `field-manual`, `cheatsheet` for `/cheatsheet|/notes|/cpts`, `writeup`, `analytics`, `exam`, `vault`, `theme`, default `tracker`). Note `/notes` and `/cpts` map to `cheatsheet` while `/field-manual` maps to `field-manual`.

Query flag `?popout=true` hides header/sidebar/mobile nav/notes sidecar/payload bar (popout mode).

### Global shell (all mounted in `MainAppContent`)

| Piece | File | Behaviour |
|---|---|---|
| `UnifiedHeader` | [src/components/layout/UnifiedHeader.tsx](../src/components/layout/UnifiedHeader.tsx) | one-row header; hidden in focus/popout mode |
| `Sidebar` | [src/components/layout/Sidebar.tsx](../src/components/layout/Sidebar.tsx) | nav: tracker, vault, methodology, cheatsheets, writeup, analytics, exam; tracker view switcher (Kanban/Table/Cards/Graph) |
| `MobileNav` | [src/components/layout/MobileNav.tsx](../src/components/layout/MobileNav.tsx) | bottom bar below `md`, 44px targets |
| `FloatingPayloadBar` | [src/components/common/FloatingPayloadBar.tsx](../src/components/common/FloatingPayloadBar.tsx) | collapsible pill; quick reverse-shell payloads from `globalVars` (the single LHOST/LPORT source) |
| `CommandPalette` | layout | Ctrl/Cmd+K |
| `SnippetsDrawer` (Alt+S), `ExamQuickActionDrawer` (Alt+E), `RevShellModal` | | slide-overs |
| `PersistentNotesWorkspace` | [src/components/workspace/](../src/components/workspace/) | docked multi-tab notes sidecar (state in `useNotesWorkspaceStore`) |
| `ToastContainer` | common | `role="region" aria-label="Notifications"`, items `role="status" aria-live="polite"`, fed by `useToastStore` |
| `ConfirmDialog` | common | single async dialog fed by `useConfirmStore`; `z-[300]` |
| `RouteErrorBoundary` | common | chunk-load errors -> "Reload"; other errors -> "Reload app" + "Try again" (reset); resets on route change via `resetKey` |
| `ErrorBoundary` | common (wraps whole app in `main.tsx`) | last-resort boundary; also clears legacy key `specter_ctf_store_v3` |
| Skeletons | [src/components/common/Skeleton.tsx](../src/components/common/Skeleton.tsx) | `Skeleton`, `SkeletonText`, `SkeletonRegion`, `ViewSkeleton` (route fallback + hydration gate), `CanvasSkeleton` |
| `ScrollProgressBar`, `BackToTopButton` | common | driven by `ScrollContext` (main element registered via `setScrollElement`) |
| `EphemeralStorageBanner`, storage-alert toast-card | common / App | shown when `localStorage` is unavailable (in-memory fallback) or quota hit (`zerobox:storage` window event) |
| `StartCleanModal` | common | first run (`zerobox_onboarding_completed` missing) |
| Lazy modals (mounted behind `AnimatePresence`+`Suspense`) | various | Backup, ReconAutomation, MachineDetail, QuickAssignIp, NewMachine, PentestReport, OperatorDossier, OperatorProfile, License, NotesImport, OperatorFlexCard, KeyboardShortcuts, Settings; open flags live in `useCtfStore` (and `operatorProfileModalOpen` in `useAuthStore`) |
| `TimerController` | App.tsx | 1 Hz `setInterval` for `tickTimer()` (stopwatch) and exam `tick()`; neither may write storage (see A4) |
| Zen focus mode | App.tsx | `focusMode` hides header/sidebar/mobile nav; Esc exits if no modal open |
| UI zoom engine | App.tsx | `uiScale` (`auto|tiny|compact|normal|large|huge`) sets `document.documentElement.style.zoom` + `--app-zoom`; `auto` maps width >=1200 -> 1.0, >=1024 -> 0.90, >=768 -> 0.85, else 1.0; root height uses `calc(100vh / var(--app-zoom))` |

Boot side effects in `MainAppContent`: `ensurePersistence()`, `bindExportGuard()` (beforeunload when `unexportedChangesCount > 0`), `mergeMachinesWithCatalog` over current machines + force `appBrand='zerobox'` + `saveProfileData()`, `loadUserNotesFromDb()`, `loadCatalog()` (lazy import of the 22k-line catalog). `isHydrated=false` renders the skeleton.

Keyboard shortcuts are centralized in [src/hooks/useTacticalHotkeys.ts](../src/hooks/useTacticalHotkeys.ts) (Ctrl/Cmd+S export, Ctrl/Cmd+K palette, Alt+S snippets, Alt+E exam drawer, Alt+F focus, `?` shortcuts modal, `1-4` -> kanban/grid/table/graph, `/` search, `T` timer play/pause, `P` scan & payload crafter modal, `V` one-click Obsidian vault export, `U`/`R` toggle user/root flag on the active target, Space inspects the active target, `j/k` or Alt+Arrow step targets, `+/-/0` zoom, `f` focus mode). The cheatsheet modal [src/components/common/KeyboardShortcutsModal.tsx](../src/components/common/KeyboardShortcutsModal.tsx) was aligned to this in M5; keep both in sync.

---

## A4. State (zustand stores)

All stores are zustand 5. Persisted stores use `persist`. **Never** write to storage from per-second ticks.

### A4.1 `useCtfStore` - [src/store/useCtfStore.ts](../src/store/useCtfStore.ts) (2503 lines)

The main store. Persist key **`zerobox-tactical-store`**, `version: 2`, custom `merge`/`migrate`, JSON validated on read (corrupt payloads are copied to `zerobox-tactical-store_corrupted_backup_<ts>` then removed).

| Group | Key state (TS type) | Notes |
|---|---|---|
| Domain data | `machines: Machine[]`, `activeTargetId: string\|null`, `globalVars: GlobalVariables`, `cheatsheets: CheatsheetCommand[]`, `activitySessions: ActivitySession[]`, `customNotes: CptsNoteEntry[]`, `deletedNoteIds: string[]`, `userSolvesReset: boolean`, `userNotes: CptsNoteEntry[]`, `userWikilinkMap: Record<string,string>` | `userNotes`/`userWikilinkMap` live in IndexedDB, not in persist |
| Attack graph | `graphNodePositions: Record<string,{x,y}>`, `graphEdges: AttackGraphEdge[]` | persisted separately (A5) |
| Profile | `currentProfileId: string`, `isHydrated`, `isEphemeralStorage`, `isCatalogLoaded/Loading`, `isDeepStorageLoaded`, `unexportedChangesCount` | |
| UI | `activeTab: ActiveTab`, `viewMode: ViewMode` (`kanban\|table\|grid\|graph`), `selectedMachineId`, `writeupMachineId`, `reportMachineId`, `assignIpMachineId`, many `*ModalOpen` booleans, `commandPaletteOpen`, `snippetsDrawerOpen`, `filterDrawerOpen`, `focusMode`, `mobileMenuOpen`, `crtOverlay`, `soundEnabled`, `themePreset: ThemePreset`, `uiScale: UiScale`, `appBrand` | |
| Timer | `isTimerRunning`, `activeTimerSeconds`, `timerLastTick` | in-memory only |
| Filters | `filters: FilterState` | `searchQuery, selectedPlatform, selectedDifficulty, selectedCert, selectedOs, selectedCategory (BoxVectorCategory), selectedVulnCategory?, excludeActiveDirectory?, selectedTrack, selectedTracks[], selectedStatus (HtbTargetStatus), selectedLanguage?, selectedAreaOfInterest?, selectedTechnique?, selectedTags[], sortBy, sortDirection, hideEmptyLanes` (not persisted) |

Key actions: `updateMachineStatus`, `batchUpdateMachineStatus`, `updateMachine`, `addCustomMachine`, `deleteMachine`, `toggleUserFlag/RootFlag`, `setMachineOpenPorts`, `setChecklistItemStatus/Notes`, `setActiveChecklistItem`, `resetMachineChecklist`, `setActiveTarget`, `startTimer/pauseTimer/resetTimer/tickTimer`, `setGlobalVars`, `add/deleteCustomCommand`, `toggleStarCommand`, `setFilters/resetFilters`, `addCustomNote/updateNoteContent/deleteNote/restoreDeletedNotes`, `resetSolvesToZero/restoreDanielSolves`, `loadCatalog`, `loadProfileData(profileId, {startFresh?, cloneFromCurrent?})`, `saveProfileData`, `exportBackup({redactSecrets?})`/`importBackup(json)`, `exportWorkspace/importWorkspace`, `resetAllProgress`, graph actions (`setGraphNodePosition`, `batchSetGraphNodePositions`, `addGraphEdge`, `updateGraphEdge`, `deleteGraphEdge`, `clearGraphEdges`, `resetGraphLayout`), theme/scale (`setThemePreset`, `setUiScale`, `cycleUiScale`, `zoomIn/Out`).

**Persistence is two-layered** (important):

1. zustand `persist` (`partialize`): `currentProfileId, appBrand, themePreset, userSolvesReset, customNotes, deletedNoteIds, machines (toLeanMachines), activeTargetId, globalVars, cheatsheets, activitySessions, viewMode, crtOverlay, soundEnabled, uiScale` -> key `zerobox-tactical-store`.
2. A manual subscriber (bottom of file) + `flushProfileSave()` writes a **per-profile payload** `{machines(lean), activeTargetId, globalVars, cheatsheets, activitySessions, customNotes, deletedNoteIds, userSolvesReset}` to `zerobox_operator_profile_<profileId>` (and mirrors to legacy `specter_ctf_profile_<profileId>`), saves deep payloads to IndexedDB, and snapshots to the resilient IDB store. Debounce 1200 ms with a 5000 ms max-wait; also on `beforeunload`, `visibilitychange: hidden`, and Tauri close. The subscriber only triggers when persisted slices change by reference, so 1 Hz timer ticks never write. On `QuotaExceededError` it retries with writeup/quickNotes bodies stripped (`stripDeepFieldsFromMachines`).

Catalog merge: `mergeMachinesWithCatalog(stored, userSolvesReset, catalog?)` overlays user fields onto the static catalog (`STARTER_MACHINES` until the lazy `INITIAL_MACHINES` loads); `toLeanMachines` strips `officialWalkthrough/officialSynopsis/officialPdf` from non-custom machines because they are rehydrated from the catalog; custom machines (`isCustom`, `platform==='Custom'`, or id prefix `custom-`) are kept whole and additionally mirrored to `zerobox_custom_machines_v1[_<profileId>]`. `CATALOG_MACHINE_ALIASES` maps legacy ids to canonical ids.

Cross-tab sync: `BroadcastChannel('zerobox_cross_tab_sync')` messages `WRITEUPS_UPDATED`, `MACHINE_ADDED`, `MACHINE_DELETED`, `STATE_UPDATED`, plus a `window 'storage'` listener reconciling profile and graph keys.

Migration/versioning: persist `version: 2`; `migrate` forces `appBrand='zerobox'`, maps `uiScale 'normal'|missing -> 'auto'`, normalizes `themePreset` via `normalizeThemePreset` (legacy `industrial|neon|zerobox|oled|light|...` aliases collapse to `obsidian|monolith|htb`), re-merges isolated custom machines and catalog. Legacy reads: `specter_ctf_profile_<id>`, `specter_ctf_store_v2`; demo roster fallback for profile `usr_daniel` ([src/data/demoSolvedRoster.ts](../src/data/demoSolvedRoster.ts)). The export payload carries `version: '2.0.0'`.

### A4.2 `useExamStore` - [src/store/examStore.ts](../src/store/examStore.ts) (788 lines)

Persist key **`zerobox_exam_state_v1`**; custom `selectiveExamStorage` skips writes when the serialized payload is unchanged (1 Hz ticks never write). Types: `ExamStatus = 'idle'|'running'|'paused'|'completed'`.

`ExamSessionState`: `id, track: ExamTrack, candidateName, candidateCallsign, osid, status, startedAt: number|null, examExpiresAt: number|null` (epoch ms, absolute, drift-free), `totalDurationSeconds, timerPausedRemainingSeconds, remainingSeconds` (derived, not persisted), `boxes: ExamBox[]`, `activeBreak: ExamBreakState {isActive,type:'bio'|'food'|'rest'|'custom',startedAt,durationSeconds,remainingSeconds,expiresAt}`, `breakHistory[]`, `milestones: ExamMilestone[]`, `isQuickDrawerOpen`, `scratchNotes`, `includeBonusPoints`.

Actions: `startExam/pauseExam/resumeExam/resetExam/setTrack/shuffleTargets`, `submitFlag/togglePwn/updateProof/addScreenshot/removeScreenshot`, `startBreak/cancelBreak/endBreak`, `addMilestone`, `setCandidateInfo/setScratchNotes/setIncludeBonusPoints`, drawer toggles, `tick/checkTimeThresholds`, getters `getRemainingSeconds/getBreakRemainingSeconds/getScore/getPassingStatus`. `onRehydrateStorage` recomputes `remainingSeconds` from `examExpiresAt`. Alarm playback is de-duplicated across tabs via `localStorage zerobox_last_alarm_played_at` and `BroadcastChannel('zerobox_exam_alerts')`. Default candidate seeds (`Daniel Dayan`, `0xdnd`, `OS-94821`) and a sample `scratchNotes` template are hard-coded in `createInitialSession`.

### A4.3 `useAuthStore` - [src/store/useAuthStore.ts](../src/store/useAuthStore.ts) (400 lines)

Persist key **`rootvector_auth_session`** (legacy brand name kept for data compatibility; do not rename), partialize: `user, profiles, token, isAuthenticated, guestDataMigrated, googleClientId`. Zero-password operator model: `loginAsOperator(options|name)` derives profile id `usr_<alnum-lowercase-name>` and a fake `operator_token_<ts>`. Actions: `switchProfile`, `createProfile`, `renameProfile`, `updateProfile`, `deleteProfile` (removes `zerobox_operator_profile_<id>`, `specter_ctf_profile_<id>`, `zerobox_custom_machines_v1_<id>`, `zerobox_graph_state_<id>`, `zerobox_vault_custom_loot_v1_<id>` and clears deep IDB data), `logout`, `migrateGuestData`, `updateUserTrophies`, `checkSession` (loads the profile into `useCtfStore`), plus Google credential variants. `DEFAULT_DANIEL_PROFILE` (`usr_daniel`) is a seeded default. Also reads `rootvector_google_client_id`.

### A4.4 `useNotesWorkspaceStore` - [src/store/useNotesWorkspaceStore.ts](../src/store/useNotesWorkspaceStore.ts)

Persist key **`zerobox_notes_workspace`**; partialize: `openTabIds: string[]`, `activeTabId`, `isPinned`, `dockSize: 'normal'|'expanded'`, `viewMode: 'reading'|'split'|'raw'` (invalid values reset to `reading` in `merge`), `language: 'en'|'he'`, `fontSize: 'sm'|'base'|'lg'|'xl'`. Non-persisted: `isOpen`, `searchQuery`, `isSearchOpen`. Default open tab `00_methodology_pt`. Actions `openNote(id,{background?,anchor?})`, `closeTab`, `closeAllTabs`, `setActiveTab`, `toggleOpen`, pin/dock/size/mode/lang/font setters, selectors `getActiveNote()` (custom notes -> built-in -> all) / `getOpenNotes()`.

### A4.5 `useToastStore` - [src/store/useToastStore.ts](../src/store/useToastStore.ts)

Not persisted. `ToastMessage {id, type:'success'|'error'|'warning'|'info', title?, message, durationMs?}`; `addToast`, `removeToast`; keeps last 5; default 3500 ms. Convenience object `toast.success|error|warning|info(message, title?)`. **There is no `showToast` export** (CLAUDE.md and a comment in `noNativeDialogs.test.ts` use that name loosely) - use `toast.*` or `useToastStore.getState().addToast`.

### A4.6 `useConfirmStore` - [src/store/useConfirmStore.ts](../src/store/useConfirmStore.ts)

Not persisted. `confirmAction(options: {title, body?, confirmLabel?, cancelLabel?, tone?: 'danger'|'default'}): Promise<boolean>` (also `useConfirm()` returns it). One dialog at a time: a new request resolves the previous as `false`. `<ConfirmDialog/>` (mounted once in App) renders it with `useFocusTrap`; danger tone focuses Cancel first. Replaces every native `confirm()`.

### Other state outside stores

- `useTheme` ([src/hooks/useTheme.ts](../src/hooks/useTheme.ts)): React context, `ThemeMode = 'light'|'dark'|'system'`, key `zerobox-theme-mode`, default `dark`. Applies `.dark`/`.light` class, `data-mode`, `color-scheme` on `<html>`; uses View Transitions API circular reveal unless reduced motion.
- `ScrollContext`: main scroll element for progress bar / back-to-top.
- Several view-local preferences are written straight to `localStorage` (see A5 key table).

---

## A5. Data schema and persistence

### A5.1 Core domain types - [src/types/index.ts](../src/types/index.ts)

```ts
type Platform = 'HTB' | 'THM' | 'Custom';
type OperatingSystem = 'Linux' | 'Windows' | 'BSD' | 'Android' | 'macOS' | 'Other';
type Difficulty = 'Very Easy' | 'Easy' | 'Medium' | 'Hard' | 'Insane';
type PipelineStatus = 'backlog' | 'recon' | 'foothold' | 'root' | 'completed';
type ViewMode = 'kanban' | 'table' | 'grid' | 'graph';

interface TargetServicePort { port: number; protocol: 'tcp'|'udp'; state: string; service: string;
  version?: string; cveNotes?: string; suggestedTools?: string[]; }

interface Machine {            // "target"
  id: string; name: string; ip: string;
  os: OperatingSystem; platform: Platform; difficulty: Difficulty; status: PipelineStatus;
  tags: string[]; certifications: ('OSCP'|'CPTS'|'CRTO'|'HTB-Starting-Point')[];
  roomUrl?: string; writeupUrl?: string; hint?: string;
  userFlag?: string; rootFlag?: string;                 // flag/proof text
  userPwnedAt?: string; rootPwnedAt?: string;           // ISO timestamps
  timeSpentSeconds: number; timeToUserSeconds?: number; timeToRootSeconds?: number;
  perceivedDifficulty?: Difficulty; rating?: number;    // 1..5
  quickNotes?: string; writeupMarkdown?: string;        // heavy -> IndexedDB deep storage
  skillsLearned?: string[];
  officialPdf?: string; officialSynopsis?: string; officialWalkthrough?: string; // catalog-only, stripped from storage
  isCustom?: boolean;
  openPorts?: number[]; services?: TargetServicePort[]; scanSummary?: string; rawScanOutput?: string;
  isActive?: boolean;
  checklist?: MachineChecklistState;                    // per-machine methodology progress
  createdAt: string; updatedAt: string;
}

interface CheatsheetCommand { id; title; category; subcategory?; description; commandTemplate; tags: string[];
  isCustom?; isStarred?; platform?: 'Linux'|'Windows'|'Both'; }     // commandTemplate uses {{var}} tokens
interface GlobalVariables { lhost: string; lport: string; targetIp: string; interface: string;
  customVars: Record<string,string>; }                              // defaults 10.10.14.X / 4444 / 10.10.10.X / tun0
interface ActivitySession { id; machineId; machineName;
  date: string;  /* YYYY-MM-DD (UTC date, see open item) */
  durationSeconds: number; type: 'recon'|'foothold'|'root'|'session'; }
```

**Status lifecycle** (`updateMachineStatus` in `useCtfStore`): `backlog -> recon -> foothold -> root -> completed`.
- `foothold|root|completed` count as "user owned"; `root|completed` count as "rooted".
- Setting a status sets `userPwnedAt`/`rootPwnedAt` (first time, kept afterwards), `timeToUserSeconds`/`timeToRootSeconds`, `updatedAt`; clears the pwned timestamps if the corresponding flag text is empty and the status moved back.
- Entering rooted status stops the stopwatch when the machine is the active target and appends an `ActivitySession {type:'root', date: ISO.slice(0,10)}` (appended on every transition into root/completed; there is no de-dupe).
- Entering `recon|foothold` makes the machine the active target and either copies its IP into `globalVars.targetIp` or, if the IP is a placeholder (contains `x`/`X`), opens `QuickAssignIpModal` (`assignIpMachineId`).
- Every mutation bumps `unexportedChangesCount` (drives the beforeunload export guard).

**Flags/proofs:** at tracker level `userFlag`/`rootFlag` are plain strings set via `toggleUserFlag/toggleRootFlag(id, value?)`; at exam level proofs are structured (`ExamTargetProof` below).

### A5.2 Methodology checklist - [src/types/checklist.ts](../src/types/checklist.ts)

```ts
type ChecklistItemStatus = 'todo' | 'in_progress' | 'done' | 'na';
type ServiceBranchType = 'universal'|'web'|'file_sharing'|'remote_access'|'database'|'network_mgmt'|'linux_privesc'|'windows_privesc';
interface ChecklistItem { id; title; commandSnippet?; description?; serviceBranch? }
interface ChecklistSubcategory { id; title; serviceBranch?; requiredPorts?: number[]; requiredOs?: ('Linux'|'Windows'|'BSD'|'Android'|'Other')[]; items: ChecklistItem[] }
interface MethodologyPhase { phaseNumber; id; title; subtitle; description; subcategories: ChecklistSubcategory[] }
interface MachineChecklistState { openPorts: number[]; activeItemId: string|null;
  itemsState: Record<itemId, { status; notes?; startedAt?; completedAt?; timeSpentSeconds? }> }
```
Static framework data: [src/data/methodologyFramework.ts](../src/data/methodologyFramework.ts) (`MASTER_METHODOLOGY_FRAMEWORK`). Per-machine progress lives on `Machine.checklist`. Note `importBackup` normalizes a missing checklist to `{}`.

### A5.3 Attack graph - [src/types/graph.ts](../src/types/graph.ts)

`AttackEdgeType` (9): `pivot-ssh | pivot-chisel | pivot-ligolo | pivot-socks5 | ad-trust-bidirectional | ad-trust-parent-child | lateral-cred-reuse | lateral-pth-winrm | domain-admin-path`. `AttackGraphEdge {id, sourceId, targetId, type, status:'potential'|'compromised', label?, port?, protocol?, notes?, createdAt}`; `AttackNodePosition {x,y}`; persisted shape `AttackGraphPersistedState {graphNodePositions, graphEdges, nodePositions?, edges?}` (the duplicate `nodePositions`/`edges` aliases are written for backward compatibility; the loader accepts either). `ATTACK_EDGE_META` gives label/category (`tunnel|ad-trust|lateral`)/default port/protocol/**literal hex** `color` + `glowColor` per type. Pivot command generation: [src/utils/pivotCommandUtils.ts](../src/utils/pivotCommandUtils.ts) (`PivotCommandSet`).

### A5.4 Loot / evidence (defined in the page, not in `src/types`)

[src/pages/EvidenceVaultPage.tsx](../src/pages/EvidenceVaultPage.tsx):

```ts
type EvidenceCategory = 'all'|'flag'|'password'|'hash'|'ssh_key'|'token'|'service';
interface VaultEvidenceItem { id; targetId; targetName; targetIp; platform: Platform; category: EvidenceCategory;
  typeLabel: string; username: string; secret: string; discoveredAt: string; notes: string; isCustom?: boolean }
```
Relationship: the vault **aggregates at render time** from (a) each `Machine`'s `userFlag`/`rootFlag` (category `flag`), (b) each machine's `services[]` ports (category `service`), and (c) user-added loot (`isCustom: true`) persisted per profile at `zerobox_vault_custom_loot_v1_<profileId>` (read falls back to the unsuffixed legacy key). Custom loot is component state persisted by an effect; it is not in any zustand store. `LootTimeline` groups items by kill-chain phase or chronologically; `ExportLootDrawer` exports JSON/CSV/Markdown (supports redaction). Secrets are masked until revealed.

### A5.5 Notes (field manual) - `CptsNoteEntry` in [src/utils/obsidianManualUtils.ts](../src/utils/obsidianManualUtils.ts)

```ts
interface CptsNoteEntry { id; title; titleEn; titleHe?; category; categoryOrder?; order?; rawCategory; subCategory;
  tags: string[]; difficulty: string; noteType?; dateModified?; summary; enSummary?; heSummary?; stage?; tools?: string[];
  hasHebrew?; commands: string[]; relPath; filename?; outgoingWikilinks?; backlinks?; rawMarkdown? }
```
Three sources, merged by `getAllCptsNotes()`: built-in `CPTS_NOTES` from [src/data/cptsNotesIndex.json](../src/data/cptsNotesIndex.json) (+ `WIKILINK_MAP`), user-imported vault notes (`userNotes` in IndexedDB `zerobox_vault_db`), and `customNotes` (user-authored, persisted in the per-profile payload and IDB deep storage; `deletedNoteIds` tombstones hide built-ins). `resolveWikilink` supports aliases; `parseObsidianNote` extracts callouts (`ObsidianCallout`), TOC, checklists. Workspace tab types (pane/tab/split) are in [src/types/workspace.ts](../src/types/workspace.ts) (`NoteTab, WorkspacePane, WorkspaceState, OpenNoteOptions`); **UNVERIFIED** how much of that richer model is used vs. `useNotesWorkspaceStore`'s simpler `openTabIds`.

### A5.6 Writeups

There is no separate writeup entity: a writeup is `Machine.writeupMarkdown` (+ `quickNotes`), edited in `WriteupStudio` (route `/writeup[/:id]`, also `writeupMachineId` in the store). These two heavy fields are extracted to IndexedDB deep storage and stripped from localStorage on quota pressure; they are merged back non-destructively on load (`mergeDeepPayloadsIntoMachines` only fills missing values). Exporters: [src/utils/writeupHtmlExporter.ts](../src/utils/writeupHtmlExporter.ts) (sanitized HTML/PDF-print), `PentestReportModal`, Obsidian vault zip ([src/utils/obsidianVaultExporter.ts](../src/utils/obsidianVaultExporter.ts)).

### A5.7 Exam types - [src/utils/examComplianceUtils.ts](../src/utils/examComplianceUtils.ts)

```ts
type ExamTrack = 'OSCP'|'CPTS'|'CRTO'|'OSEP'|'CRTP';
type PassingStatus = 'Passing'|'In Progress'|'Critical';
type AdRole = 'foothold'|'lateral'|'dc';
interface ScreenshotProof { id; dataUrl /* base64 */; caption; commandUsed?; timestamp; sizeBytes? }
interface ExamTargetProof { flagText; whoamiOutput; ipconfigOutput; screenshotTaken?; screenshots?: ScreenshotProof[];
  toolsUsed?; reproductionSteps?; opsecCompliant?; pwnedAt? }
interface ExamBox { id; name; ip; os; difficulty; type: string; label: string; adRole?: AdRole;
  userPoints; rootPoints; userPwned; rootPwned; userProof: ExamTargetProof; rootProof: ExamTargetProof;
  initialAccessAt?; privEscAt?; domainCompromiseAt? }
interface ExamTrackConfig { id; name; durationSeconds; passThreshold; maxScore; requiresAdFullChain; description; targetSummary }
```
Track configs: OSCP 24h/pass 70 (AD set all-or-nothing), CPTS 240h/85, CRTO 48h/75, OSEP 48h/**100**, CRTP 24h/**100** (the last two are placeholder-ish configs with threshold 100). Exam session shape = `ExamSessionState` in `examStore.ts` (A4.2). Exam screenshots are stored as base64 data URLs inside `boxes[].userProof/rootProof.screenshots` -> inside the `zerobox_exam_state_v1` localStorage payload (`ExamEvidenceDropzone` downscales images to max 1280 px and re-encodes JPEG q=0.82 via canvas before storing, but many screenshots can still pressure the localStorage quota).

### A5.8 Operator profile / auth / gamification - [src/types/auth.ts](../src/types/auth.ts), [src/types/gamification.ts](../src/types/gamification.ts)

```ts
interface User { id; googleId; email; name /* callsign/display */; callsign?; role?; badgeColor?; avatarId?; avatarUrl?;
  unlockedTrophies?: Record<trophyId, ISOString>; totalXp?; rankTier?; rankTitle?; createdAt; updatedAt }
```
Gamification: `OperatorRank` (6 tiers, `OPERATOR_RANKS` in `gamificationEngine.ts`), `TrophyDefinition {category: combat|recon|ad|exam|lore|mastery, rarity: common|rare|epic|legendary, xpReward,...}`, `OperatorStatsSummary` computed from machines/notes/vault/exams, `evaluateOperatorGamification()` and `syncOperatorTrophies()`. Avatars: [src/data/avatarPresets.ts](../src/data/avatarPresets.ts) (SVG data URIs).

### A5.9 ALL storage keys

`localStorage` (grep of `src/`, non-test; `<id>` = profile id, `guest` when unauthenticated):

| Key | Holds | Written by |
|---|---|---|
| `zerobox-tactical-store` | zustand persist payload of `useCtfStore` (see A4.1; version 2) | persist |
| `zerobox_operator_profile_<id>` | **primary per-profile data**: machines(lean), activeTargetId, globalVars, cheatsheets, activitySessions, customNotes, deletedNoteIds, userSolvesReset | `flushProfileSave` / `saveProfileData` |
| `specter_ctf_profile_<id>` | legacy mirror of the above (still written; read as fallback) | same |
| `specter_ctf_store_v2` | legacy store, read once as migration fallback | read-only |
| `specter_ctf_store_v3` | legacy key, removed by `ErrorBoundary` recovery | remove-only |
| `zerobox_custom_machines_v1` / `zerobox_custom_machines_v1_<id>` | custom machines mirror (global fallback + per-profile) | `saveCustomMachinesToStorage` |
| `zerobox-attack-graph-state` | graph (guest key, also written as a mirror for every profile) | `saveAttackGraphState` |
| `zerobox_graph_state_<id>` | graph per profile | same |
| `rootvector_auth_session` | `useAuthStore` persist | persist |
| `rootvector_google_client_id` | optional Google client id | `setGoogleClientId` |
| `zerobox_exam_state_v1` | `useExamStore` persist | persist |
| `zerobox_last_alarm_played_at` | epoch ms, cross-tab alarm dedupe | examStore |
| `zerobox_notes_workspace` | `useNotesWorkspaceStore` persist | persist |
| `zerobox-theme-mode` | `light|dark|system` | `useTheme` |
| `zerobox_vault_custom_loot_v1` / `_<id>` | custom evidence items | EvidenceVaultPage |
| `zerobox_onboarding_completed` | `'true'` after first-run modal | StartCleanModal; E2E seeds it |
| `zerobox_note_font_size`, `zerobox_note_viewer_mode`, `zerobox_pinned_tabs_v1` | note viewer prefs / pinned tabs | ObsidianNoteViewer / CheatsheetView |
| `zerobox_docked_maximized`, `zerobox_modal_maximized` | note dock sizing | CheatsheetView |
| `zerobox_workspace_is_split_v1`, `zerobox_workspace_split_orient_v1`, `zerobox_workspace_secondary_tabs_v1`, `zerobox_workspace_secondary_active_v1` | split-view notes workspace | CheatsheetView |
| `zerobox_pinned_track` | pinned curated pathway (default `tjnull-oscp`) | CuratedPathways |
| `ctf_tracker_view_mode_set` | flag: default view already applied | TrackerView |
| `zerobox-tactical-store_corrupted_backup_<ts>` | quarantined corrupt payloads | storage getItem guard |

That is ~27 distinct families, consistent with the "28 keys" claim in CLAUDE.md/PROJECT.md (the exact count depends on how families are counted). `safeLocalStorage` wraps access: on failure it falls back to an in-memory `Map`, sets `isEphemeral`, and dispatches `window` event `zerobox:storage` (`{kind:'quota'|'error', message}`) which App renders as a banner/card.

`sessionStorage`: not used.

IndexedDB (**real names differ from the `zb_*` aliases in CLAUDE.md/PROJECT.md**):

| Database | Ver | Object store(s) | Key -> value | Module |
|---|---|---|---|---|
| `zerobox_deep_storage_db` | 1 | `deep_profiles` | `<profileId>` -> `DeepProfilePayload {writeups: Record<machineId,{writeupMarkdown?,quickNotes?}>, customNotes?: any[], updatedAt}` | [src/utils/indexedDbDeepStorage.ts](../src/utils/indexedDbDeepStorage.ts) |
| `zerobox_vault_db` | 1 | `cpts_notes` | `'vault_data'` -> `VaultPayload {notes: CptsNoteEntry[], wikilinkMap, importedAt}` (user-imported Obsidian vault; single global record, not per profile) | [src/utils/indexedDbVault.ts](../src/utils/indexedDbVault.ts) |
| `zerobox_resilient_store_v1` | 1 | `workspaces`, `snapshots` | `workspaces['zb:workspace:<profileId>']` -> JSON string of the profile payload; `snapshots[<ISO timestamp>]` -> same, **last 3 kept** | [src/utils/resilientStorage.ts](../src/utils/resilientStorage.ts) |

Notes: `saveWorkspaceToIdb` is called on every profile flush, but `loadWorkspaceFromIdb`/`listSnapshots` are **not wired into any recovery UI** (only imported in `useCtfStore`, unused) - it is write-only insurance today. [src/test/setup.ts](../src/test/setup.ts) mocks `indexedDbVault` for all tests.

Backup/export format ([src/utils/workspaceStorage.ts](../src/utils/workspaceStorage.ts)): `WorkspaceExportPayload {version:'2.0.0', exportedAt, appBrand, machines, globalVars, cheatsheets, activitySessions, customNotes?, userNotes?, userWikilinkMap?, deletedNoteIds?, userSolvesReset?, themePreset?}`; `useCtfStore.exportBackup` additionally adds `isRedacted` and, with `redactSecrets`, masks custom vars/LHOST/targetIp and flags that look like credentials. `validateWorkspacePayload` is lenient (accepts a bare machines array or `{data:{...}}`) and runs `sanitizeObjectKeys` (strips `__proto__/constructor/prototype`, depth-capped at 32, cycle-safe). Filenames go through `sanitizeFilename` (traversal + Windows reserved names).

### A5.10 Data-contract rules (do not violate)

1. Never drop, rename or repurpose a persisted field or storage key (including legacy `specter_*` / `rootvector_*` ones). Add optional fields only; read old shapes tolerantly.
2. Any new persisted field must be added to **all** of: the `Machine`/state type, `partialize`/payload builders (`flushProfileSave`, `saveProfileData`, `exportBackup`, `importBackup`, `validateWorkspacePayload`), and a test.
3. Derived data is computed on read (e.g. heatmap days); never rewrite stored history to "fix" it.
4. Heavy text (`writeupMarkdown`, `quickNotes`) belongs to IndexedDB deep storage; do not add large blobs to the localStorage payloads.
5. No per-second writes (timer ticks stay in memory; see soak test).
6. Custom machines must survive migrations/resets (`loadCustomMachinesFromStorage` re-integration is deliberate).
7. Profile isolation: everything per-operator is keyed by profile id; deleting a profile must clean every key family (see `deleteProfile`).

---

## A6. Domain logic hotspots

| Area | File | What to know |
|---|---|---|
| Exam scoring | [src/utils/examComplianceUtils.ts](../src/utils/examComplianceUtils.ts) `calculateExamScore(track, boxes, {includeBonusPoints?})` | **OSCP**: AD boxes (`isActiveDirectoryBox`: `adRole` set, or `type` starts with `ad`/contains `dc`) score **only if every AD box is fully pwned** (boxes with 0 points for a flag are treated as satisfied); standalone boxes score independently; optional +10 bonus capped at `maxScore`. **Other tracks**: plain sum of `userPoints`/`rootPoints` for pwned flags; `adSetCompromised` = no AD boxes or all AD fully pwned. Returns `{totalScore, passThreshold, maxScore, isPassing, pointsNeeded, adSetCompromised, complianceIssues[], isCompliant}`. Compliance issues are added per pwned flag with points when `flagText`, `whoamiOutput`, `ipconfigOutput` or a screenshot (`screenshotTaken` or `screenshots.length`) is missing. `getPassingStatus(score, threshold, remainingSeconds, isExpired, adRequiredAndMissing)` -> `Passing` if score>=threshold and AD not missing; `Critical` if expired or <=7200 s left; else `In Progress`. Also `validateFlagFormat` (offsec-md5/htb/crto/thm/custom), `generateExamTargetsForTrack`, `generateExamReportMarkdown`, `isDomainControllerBox`. |
| Pacing | [src/utils/examPacingUtils.ts](../src/utils/examPacingUtils.ts) | `computeExamPacing(session, {totalScore, passThreshold}, now)` -> pts/hr required vs current, projected final (capped 100), unrooted box count, `pacingStatus: PASSED|ON_TRACK|BEHIND_SCHEDULE|CRITICAL` (CRITICAL when <=6h left and >20 pts needed; BEHIND when required pace > 1.5x current or > 15 pts/hr). `checkRabbitHole` (default 90 min on one box w/o progress), `calculateBreakCountdown`, `formatSecondsToHms`, `formatSecondsToHoursMinutes`. Also [src/utils/rabbitHoleDetector.ts](../src/utils/rabbitHoleDetector.ts) (stopwatch-side detector). |
| Burn-down | [src/utils/examBurndown.ts](../src/utils/examBurndown.ts) | `buildBurndownSeries(boxes, startedAt, expiresAt, passThreshold, {track, includeBonusPoints})` **replays `calculateExamScore`** at each event timestamp with flags masked to those captured by then (no scoring rule is re-derived, so the AD all-or-nothing rule is respected). Policy: events before `startedAt` clamp to it; events after `expiresAt` excluded; a pwned flag with no usable timestamp counts at `startedAt`; consecutive equal-score samples collapse; ideal line = (start,0)->(expiry,passThreshold). Flag time resolution: `proof.pwnedAt` -> `initialAccessAt` (user) / `privEscAt` -> `domainCompromiseAt` (root). `resolveChartWindow` keeps the axis stable while paused. UI: [src/components/exam/ExamBurndownChart.tsx](../src/components/exam/ExamBurndownChart.tsx). |
| Analytics heatmap | [src/utils/analyticsHeatmap.ts](../src/utils/analyticsHeatmap.ts) | `buildHeatmapWeeks(counts, today, days=90)` -> weekday rows (Mon first) x week columns, `HeatLevel 0..3`; day keys are **local** calendar dates built by stepping `setDate(getDate()-1)` (DST-safe, never subtract 86 400 000 ms). `AnalyticsView` counts `activitySessions[].date` (UTC date-only strings, used as-is) plus local-date keys of `machine.userPwnedAt/rootPwnedAt`. Radar = accessible SVG (`role="img"`, `<title>/<desc>`); heatmap cells use roving tabindex. |
| Category/badge tones | [src/utils/categoryUtils.ts](../src/utils/categoryUtils.ts) | **Single source** for badge tones. `CAT_TONES` (cat-1..8), `NEUTRAL_TONE`, `SEMANTIC_TONES` (info/tip/warn/danger/success from callout tokens). `CATEGORY_CAT_INDEX` maps 25 vulnerability categories onto 8 slots (related categories share a hue; icon+label disambiguate). `PLATFORM_CAT_INDEX`, `OS_CAT_INDEX`, `getCategoryTone/getPlatformTone/getOsTone/getDifficultyTone/getStatusTone`. `VULN_DOMAINS`, `VULN_CATEGORIES`, `classifyMachine(m)` (heuristic classification from tags/name/hint, cached; `clearClassificationCache()`), `matchesCategory/matchesDomain/isActiveDirectory`. Difficulty tone: Very Easy=info, Easy=success, Medium=warn, Hard=danger, Insane=tip. Status tone: recon=info, foothold=warn, root=success, completed=tip. Never hardcode badge classes elsewhere. |
| Scan parsing | [src/utils/scanParserUtils.ts](../src/utils/scanParserUtils.ts), [src/utils/nmapParser.ts](../src/utils/nmapParser.ts), [src/utils/scanCardHelper.ts](../src/utils/scanCardHelper.ts) | `detectAndParseScan(raw)` -> `ScanImportResult {format:'nmap-xml'|'nmap-text'|'gnmap'|'rustscan'|'raw-ports', detectedIp/Host/Os, ports: ParsedPort[], hosts?, warnings?, rawSummary?}`; per-format parsers `parseNmapXml/parseGrepableNmap/parseRustscan/parseNmapText`; `getServiceIntelligence(port, service, version)` suggests tools + CVE notes. `applyScanTextToMachine` maps results onto `Machine.openPorts/services/scanSummary/rawScanOutput`. UI: `TargetReconDropzone` (tracker) and `ReconAutomationModal`. |
| Security | [src/utils/securityUtils.ts](../src/utils/securityUtils.ts) | `sanitizeHtml`, `sanitizeSvg` (DOMPurify; always sanitize before `dangerouslySetInnerHTML`). [src/utils/helpers.ts](../src/utils/helpers.ts): `interpolateCommand(template, vars)` (`{{lhost}}`-style tokens), `getUnresolvedTokens`, `sanitizeExternalUrl`, `safeCopyToClipboard`, `playCyberSound`, `formatSeconds`. |
| Zip/vault import | [src/utils/zipVaultImporter.ts](../src/utils/zipVaultImporter.ts), [src/utils/directoryVaultImporter.ts](../src/utils/directoryVaultImporter.ts) | `parseObsidianVaultZip` / `parseObsidianVaultDirectory` -> `CptsNoteEntry[]` + wikilink map. `isSafeRelativePath` is a 10-layer Zip-Slip/path-traversal defense (iterative URL decode, NFKC, drive/UNC/scheme/ADS/`..` rejection); `isIgnoredVaultPath` skips system/hidden/non-markdown. Frontmatter parsing + command extraction from fenced shell blocks. Result is saved to IndexedDB (`zerobox_vault_db`). |
| Vault export | [src/utils/obsidianVaultExporter.ts](../src/utils/obsidianVaultExporter.ts) | `generateObsidianVaultZip(machines, cheatsheets)` -> Blob with `.obsidian/app.json`, index/dashboard, per-machine notes, methodology. |
| Backup / workspace | [src/utils/workspaceStorage.ts](../src/utils/workspaceStorage.ts), [src/components/backup/BackupModal.tsx](../src/components/backup/BackupModal.tsx) | see A5.9. [src/utils/bulkPwnImporter.ts](../src/utils/bulkPwnImporter.ts): paste names -> match catalog -> bulk status update. |
| Gamification | [src/utils/gamificationEngine.ts](../src/utils/gamificationEngine.ts) | ranks, trophies, XP, `evaluateOperatorGamification`, `syncOperatorTrophies`. |
| Notes engine | [src/utils/obsidianManualUtils.ts](../src/utils/obsidianManualUtils.ts) | tree building (`buildCptsFileTree`), search with modifiers (`searchCptsNotes`), `getRecommendedNotesForMachine`, wikilink resolution, backlinks, OFM parsing. Link routing: [src/utils/workspaceLinkInterceptor.ts](../src/utils/workspaceLinkInterceptor.ts). |
| Other | [src/utils/payloadCrafterUtils.ts](../src/utils/payloadCrafterUtils.ts) (reverse shell payloads), [src/utils/pivotCommandUtils.ts](../src/utils/pivotCommandUtils.ts), [src/utils/graphExportUtils.ts](../src/utils/graphExportUtils.ts) (SVG/PNG export of the graph), [src/utils/audioAlerts.ts](../src/utils/audioAlerts.ts) (WebAudio alarms; no audio files), [src/utils/checklistMarkdownExporter.ts](../src/utils/checklistMarkdownExporter.ts), [src/utils/examReportGenerator.ts](../src/utils/examReportGenerator.ts). |

Static datasets: `machinesCatalog.ts` (lazy, ~22k lines; `INITIAL_MACHINES`), `starterMachines.ts` (small boot set), `tracksData.ts` (curated pathways: `PracticeTrack {id,name,shortName,category:'certification'|'technique'|'level'|'curated',description,badgeColor,accentColor,filterFn}`), `cheatsheetsData.ts` (`INITIAL_CHEATSHEET`), `revshellsData.ts`.

---

## A7. Design system

### A7.1 Tokens ([src/index.css](../src/index.css), [tailwind.config.js](../tailwind.config.js))

All colors are RGB triplets in CSS variables consumed as `rgb(var(--x) / <alpha-value>)`.

| Family | CSS vars | Tailwind utilities |
|---|---|---|
| Surfaces | `--surface-base/card/elevated/sunken/hover` | `bg-surface-base`, `bg-surface-card`, `bg-surface-elevated`, `bg-surface-sunken`, `bg-surface-hover` |
| Inverse (always-dark panels: terminals/code, in BOTH modes) | `--surface-inverse`, `--surface-inverse-elevated`, `--border-inverse`, `--text-on-inverse`, `--text-on-inverse-muted` | `bg-surface-inverse`, `bg-surface-inverse-elevated`, `border-inverse`, `text-on-inverse`, `text-on-inverse-muted` |
| Text | `--text-primary/secondary/muted/tertiary/dim` | `text-primary`, `text-secondary`, `text-muted`, `text-tertiary`, `text-dim` |
| Borders | `--border-subtle/strong/accent` | `border-subtle`, `border-strong`, `border-accent` |
| Accent | `--border-accent` (accent colour), `--accent-fg` (text on accent) | `bg-accent`, `text-accent`, `bg-accent-muted`, `text-on-accent` (**use on filled accent buttons**) |
| Callouts (semantic) | `--callout-{info,tip,warn,danger,success}-{fg,bg,border}` (light on `:root`, dark under `.dark`) | `text-callout-info-fg`, `bg-callout-warn-bg`, `border-callout-danger-border` ... |
| Categorical | `--cat-1..8-{fg,bg,border}` | `text-cat-3-fg`, `bg-cat-3-bg`, `border-cat-3-border` (use via `categoryUtils`) |
| Syntax (render only on inverse surfaces; one shared set) | `--syntax-keyword/string/number/flag/variable/comment` | `text-syntax-keyword` ... |
| Radii | `--radius-xs 4 / sm 6 / md 8 / lg 12 / xl 16` | `rounded-xs/sm/md/lg/xl`; `rounded-2xl` = **20px**, `rounded-3xl` = 24px (see appendix) |
| Legacy bridge | `--cyber-*` (map to the semantic vars) | `bg-cyber-bg`, `bg-cyber-card`, `text-cyber-text`, `text-cyber-cyan`... still used by older code; prefer semantic tokens in new code. `htb-*`, `diff-*` colors also exist. |

### A7.2 Presets x modes and switching

Three presets x light/dark = 6 token blocks, selected by two **independent** DOM mechanisms:

- **Preset** -> `data-theme` attribute on `<html>`: `obsidian` (Zinc; the `:root` default), `monolith` (Graphite dark / off-white light), `htb` (0-nit OLED black + neon lime dark / crisp slate + forest green light). Set via `useCtfStore.setThemePreset` -> `applyThemePreset()` (also swaps the favicon). Persisted in `themePreset`. Legacy ids (`industrial`, `neon`, `zerobox`, `oled`, `light`) still have CSS blocks and normalize to the 3 presets.
- **Mode** -> `.dark` class (plus `.light`, `data-mode`, `color-scheme`) on `<html>`: `useTheme` (`light|dark|system`, default dark, persisted `zerobox-theme-mode`). Selectors look like `[data-theme="htb"].dark { ... }` / `[data-theme="htb"]:not(.dark) { ... }`.
- Tailwind `darkMode: 'class'`. `html.theme-transition` enables a brief color transition; circular reveal uses the View Transitions API.
- Machined edge: `.machined-edge` / `shadow-machined` (dark: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 0 1px rgba(255,255,255,.03)`), light mode uses `shadow-card-light` / `shadow-sm` style crisp elevation.

### A7.3 Contrast guarantees

[src/test/a11y/tokenContrastMatrix.test.ts](../src/test/a11y/tokenContrastMatrix.test.ts) parses `index.css` and asserts WCAG AA (>= 4.5:1) for **every text token on every surface token in all 6 preset x mode blocks**, plus `accent-fg` on `border-accent`, callout fg on bg, cat-N fg on bg and on surfaces, inverse text on inverse surfaces, and syntax tokens on both inverse surfaces. It locates blocks by selector-text needles (e.g. `'[data-theme="htb"].dark {'`), so **reformatting or reordering those CSS selector blocks can break the test**; edit values in place. Light accent is `#0369a1` with white `--accent-fg`. Runtime proof: the offline axe scanner (A8) reports 0 contrast nodes across 9 routes x 3 presets x 2 modes.

### A7.4 Typography

- Body/UI/prose: `font-sans` (Inter, system stack). The App root is `font-sans` (the earlier whole-app `font-mono` was a bug fixed in wave 1).
- `font-mono tabular-nums` (class `text-telemetry` also exists) **only** for: IPs, ports, MACs, hashes, shell commands/code, countdown timers/stopwatches, counters. `body` has `font-variant-numeric: tabular-nums`.
- Weights: `font-normal | font-medium | font-semibold` only. No `font-black`. Headings are semibold with tight tracking (set in `@layer base`).
- Copy: sentence case; no uppercase eyebrows, no `[BRACKETED]` labels.

### A7.5 Motion ([src/utils/motionTokens.ts](../src/utils/motionTokens.ts))

`TACTICAL_SPRING = {type:'spring', bounce:0, duration:0.28}`; `MODAL_ASYMMETRIC_TRANSITION` (enter spring 0.28 s; exit opacity 0.12 s + scale/y 0.14 s); `DRAWER_SLIDE_TRANSITION` (enter spring, exit 0.15 s); `MODAL_VARIANTS`, `BACKDROP_VARIANTS`, `DRAWER_RIGHT_VARIANTS`, `STAGGER_*` (20 ms), `CASCADE_STAGGER_DELAY(i)` (cap 0.3 s), `TACTILE_TAP_CLASS = 'active:scale-[0.97]'`, `TACTILE_WHILE_TAP`. Rules: exits <= 150 ms; honor `prefers-reduced-motion` (global `MotionConfig reducedMotion="user"`, CSS `@media (prefers-reduced-motion: reduce)`, `useReducedMotion()` in popovers); animate `transform`/`opacity`; **never `layoutId` in route-level components** (see Part B).

### A7.6 Shared primitives (all in [src/components/common/](../src/components/common/))

| Primitive | API essentials |
|---|---|
| `CyberButton` | `variant: default|primary|secondary|danger|ghost|outline|hardware`, `size: xs(24px)|sm(28)|md(32)|lg(40)`, `iconLeft/iconRight`, `isLoading`, `soundType`, forwardRef; token-only classes; includes `active:scale-[0.97]` |
| `CyberBadge` | `variant: neutral|accent|success|warning|danger|info`, `size: xs|sm|md`, `mono`, `dot`, `icon`; sentence case, no glow |
| `CyberInput`, `CyberSelect` | `CyberSelect<T>` generic `{value, onChange, options: {value,label,icon?,badge?,description?,disabled?}[], searchable?, size, variant, align, position, label/aria-label}` custom listbox |
| `PageHeader` (frozen API) | `{title, description?, icon?, primaryAction?, actions?, overflow?: OverflowItem[], children?, className?}`; one primary action always visible; `actions` hidden below `sm` (anything needed on mobile must also be in `overflow`); optional sub-row for tabs/filters |
| `OverflowMenu` | `{items: {id,label,icon?,onSelect,danger?,disabled?}[], label?, align?}`; `role=menu/menuitem`, arrow-key roving focus, Esc restores focus, spring in / <=150 ms out |
| `BadgeOverflow` | `{badges: ReactNode[], max=2, align}`; shows first `max` badges and a "+N" pill button revealing the rest on hover/focus/click |
| `ConfirmDialog` + `confirmAction` | see A4.6; always use for destructive actions |
| Toasts | `toast.success|error|warning|info(msg, title?)`; `ToastContainer` is a live region |
| `useFocusTrap` | [src/hooks/useFocusTrap.ts](../src/hooks/useFocusTrap.ts) `{isActive, onClose?, autoFocusFirst?}` returns `ref`; remembers/restores trigger focus; Tab wrap; Esc -> `onClose`; **module-level stack** so only the top-most trap handles keys (nested modals/confirm-over-drawer); skips visibility checks in jsdom |
| `Skeleton*`, `RouteErrorBoundary`, `SyntaxHighlightedCommand` (uses syntax tokens on inverse surface), `EditableIpBadge` (mono IP), `StatusBadge/PlatformBadge/OsBadge/DifficultyBadge/CategoryBadge` (tones from `categoryUtils`) | |

Global focus ring: `button/a/input/select/textarea/summary/[role=button|tab|menuitem]/[tabindex="0"]:focus-visible:focus-visible` -> 2 px `--border-accent` outline, offset 2 px (doubled pseudo-class to out-specify Tailwind `focus:outline-none`). Light-mode legacy neutralizers exist in `index.css` for `text-white`/`hover:text-white` - do not add new `hover:text-white`.

---

## A8. Testing and verification

### Commands

| # | Command | Covers | Expected (at `ee2bcc3`) |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | type check (strict app code) | 0 errors |
| 2 | `npm test -- --run` | Vitest (jsdom), `src/**/*.{test,spec}.{ts,tsx}`, globals, timeouts 60 s, setup [src/test/setup.ts](../src/test/setup.ts) | 109 files / 1987 tests pass |
| 3 | `npm run build` | `tsc && vite build && postbuild.cjs` | succeeds |
| 4 | `python scripts/run_webapp_tests.py` | Playwright-Python 12-phase crawl against the Vite dev server on :3000 (auto-starts `npm run dev` if not running): phases 1-7 = the 7 views, 8 boundary/recovery, 9 theme switching (light/dark + presets), 10 workload scenarios, 11 nav crawl over all core routes, 12 console/runtime error audit. Seeds `zerobox_onboarding_completed`. | 12/12 phases, 0 console errors |
| 5 | `npx playwright test` | [e2e/comprehensive-crawl.spec.ts](../e2e/comprehensive-crawl.spec.ts), config [playwright.config.ts](../playwright.config.ts) (chromium, 1440x900, 1 worker, `webServer: npm run dev` reuse). TC-01 route crawl 0 errors, TC-02 view switching + graph, TC-03 filter boundary, TC-04 target detail tabs, TC-05 field-manual search + tabs, TC-06 exam cockpit + report modal, TC-07 header variables + RevShell crafter | 7/7 |
| 6 | `python scripts/axe_contrast_scan.py [--out path]` | Offline axe-core (injected from `node_modules/axe-core/axe.min.js`, localhost only) over 9 routes (tracker, methodology, cheatsheet, field-manual, writeup, analytics, exam, vault, target-detail) x 3 presets x 2 modes; pass 1 `color-contrast`, pass 2 `wcag2a+wcag2aa`; plus a keyboard Tab-through focus-ring check on `/tracker`. Reporter only (always exit 0); writes `reports/axe-report.json`. Waits for animations to settle. | 0 contrast / 0 serious; Tab-through PASS |
| 7 | `npm run build && npx vite preview --port 4173 --strictPort` then `npm run lighthouse:a11y` | [scripts/lighthouse_a11y.mjs](../scripts/lighthouse_a11y.mjs): Lighthouse (desktop config) on the production preview for 9 routes x {dark, light}; seeds theme + onboarding; env `LH_BASE_URL`, `LH_ROUTES`, `LH_MIN_A11Y` (default 95); writes `reports/lighthouse/*.json`; exits 1 if any a11y < min. Needs Chrome (`CHROME_PATH`, system Chrome, or Playwright Chromium). | 18 runs: accessibility 100 and best-practices 100 on all; performance 100 on 15, 99 tracker, 94 methodology-light; zero non-localhost requests (M6, `7b9462b`) |

As of `7b9462b` the scripts are versioned: `scripts/run_webapp_tests.py` and `scripts/axe_contrast_scan.py` via `.gitignore` exceptions (other `scripts/*.py` stay ignored), `scripts/lighthouse_a11y.mjs`, and the `lighthouse` ^13.5.0 devDependency + `lighthouse:a11y` script. The axe report goes to `reports/axe-report.json` (override with `--out` or `AXE_REPORT_PATH`); `reports/` is gitignored. Lighthouse needs `npm run build` + `npx vite preview --port 4173 --strictPort`, seeds the theme in localStorage, and exits 1 if any a11y score < 95.

### Test folder layout

Co-located: `src/**/X.test.ts(x)` (store, data, hooks, utils, pages, some layout). Cross-cutting in [src/test/](../src/test/):

| Folder | Focus |
|---|---|
| `a11y/` | `tokenContrastMatrix` (contrast), `noNativeDialogs` (static scan: no `alert/confirm/prompt` in app source), `wcagA11y`, interactive stress |
| `analytics/`, `exam/`, `loot/`, `methodology/`, `tracker/`, `writeup/`, `workspace/`, `cheatsheet/`, `checklist/`, `layout/`, `auth/` | per-view component/logic tests (exam: compliance, pacing, burndown chart, HUD, report modal, reset confirm; tracker: graph canvas/edges/stress, redesign) |
| `common/` | primitives: CyberButton/Badge/Input, BadgeOverflow, OverflowMenu, PageHeader, ConfirmDialog, nested focus trap, RouteErrorBoundary, Skeleton, modal confirm flows |
| `theme/` | token/typography/consolidation/transition+contrast tests (read `index.css`/classes) |
| `store/` | custom-machine persistence, graph slice, note updates, resilient storage |
| `stress/`, `fuzz/`, `endurance/`, `scale/` | adversarial security/exam engine, property fuzzing (fast-check), soak (no storage writes on 1 Hz ticks), history-scale simulation |
| `e2e/` | vitest-level "e2e": zero egress, offline runtime, XSS sanitization, Zip Slip ingestion, user journeys |
| `utils/` | motion tokens, pivot commands |

### Conventions that bite

- **Testing Library `getByText` is case-sensitive**; copy changes (e.g. sentence-casing) break tests. Playwright `has-text` is case-insensitive. Update both when copy changes.
- Many tests assert Tailwind class names / token strings and parse `index.css`; changing class names or CSS block structure ripples into `theme/` and `a11y/` tests.
- No native dialogs: `noNativeDialogs.test.ts` fails on `alert(`/`confirm(`/`prompt(` in non-test source (excluding `data/`).
- `indexedDbVault` is globally mocked in `setup.ts`; stores read/write `localStorage` of jsdom directly.
- Test timeouts are 60 s (soak/fuzz are heavy; CI bumped Node to 24 for jsdom 30).
- E2E needs `zerobox_onboarding_completed: 'true'` pre-seeded or the first-run modal blocks the UI.

---

# Part B - What was done in the redesign

## B1. Context and process

- Goal: a multi-milestone redesign to a **"Refined Tactical Cockpit"** (Linear/Vercel restraint). Roadmap in [PROJECT.md](PROJECT.md): **M1** design system & shell, **M2** tracker & evidence vault (both done in earlier sessions), **M3** specialist views, **M4** analytics & exam cockpits, **M5** Nielsen heuristics + WCAG 2.1 AA, **M6** final verification. (PROJECT.md's table was updated to DONE for M3-M6; CLAUDE.md's "M3 NEXT UP" and CLAUDE_HANDOFF_PROMPT.md are local-only, user-owned and stale; M3-M6 are done.)
- Process: an "architect" Claude session planned and verified; implementation was done by Claude Sonnet sub-agents (the Codex CLI was unavailable); a Fable reviewer agent gave plan verdicts and end-of-deliverable reviews before anything was called done.

## B2. Milestones

| Milestone | Commit | What changed |
|---|---|---|
| M3 | `a718aa9` (bundle with M1-M4 work) | Restyled `MethodologyPage`, `ChecklistWorkspace`, `CheatsheetView`, `ObsidianNoteViewer`/`ObsidianTabContent`, `MarkdownEditor`, `PersistentNotesWorkspace`/`NotesWorkspaceTabStrip`, `WriteupStudio` (char/word/line telemetry), `PentestReportModal` (always-mounted `AnimatePresence`). Added the async `ConfirmDialog` (`useConfirmStore`) replacing native `confirm()`; callout tokens; nested focus-trap stack in `useFocusTrap`; `text-on-accent` token. |
| M4 | `a718aa9` | `AnalyticsView` radar (`role=img`, title/desc) + 7-row roving-tabindex heatmap (`src/utils/analyticsHeatmap.ts`, local-date keys, DST-safe); `ExamSimulatorPage` restyle + `ExamBurndownChart` replaying `calculateExamScore` over event timestamps (`src/utils/examBurndown.ts` `buildBurndownSeries`/`resolveChartWindow`, pause-safe); exam modals with exit animations; drawer report-state reset. **Bug found by E2E:** framer-motion `layoutId` tab indicators blocked `App.tsx`'s `AnimatePresence mode="wait"` route exits -> removed. **Rule: never use `layoutId` in route-level components.** |
| M5 | `93e22a7` | All native `alert/confirm` replaced (guard test `src/test/a11y/noNativeDialogs.test.ts`); confirmations on destructive actions; global focus-visible ring that beats `focus:outline-none`; contrast token fixes (light accent `#0369a1` + white accent-fg); targeted text-colour codemod; Kanban nested-interactive fix; writeup list/scroll semantics; Skeleton loaders; `RouteErrorBoundary` retry vs reload; keyboard-shortcut cheatsheet aligned; offline axe scanner built (contrast violations 799 -> 287, serious 334 -> 0). |

## B3. Full visual pass

After M5 the user chose a full visual pass ("improve/add/remove whatever is best") using skills apple-design, anti-slop, design-taste-frontend, impeccable, ui-ux-pro-max, ui-ux-design-pro, emil-design-eng. A screenshot audit found the whole app rendered **monospace** (`font-mono` on the App root), plus rainbow badges, dense toolbars, and uppercase/bracketed labels.

| Commit | What |
|---|---|
| `88a362d` tokens | `cat-1..8` categorical tokens, `surface-inverse` set, `syntax-*` set; `categoryUtils` is the single source for category/platform/OS/difficulty/status tones; `ThemeShowcaseDemo` deleted. |
| `2e64daf` wave 1 | Root `font-sans`; explicit `font-mono tabular-nums` on telemetry; restyled primitives; new `PageHeader` (frozen API), `OverflowMenu`, `BadgeOverflow`. |
| Wave 2 (4 parallel lanes in isolated git worktrees, merged sequentially) | `bd084c7` **shell** (one-row header, calm sidebar, collapsible `FloatingPayloadBar` pill, `MobileNav` 44 px); `0a09206` **target/methodology/field manual** (PageHeader, short scrollable tabs, `surface-inverse` code panels); `87074c2` **tracker** (one-row toolbar, track chips -> select, OS/difficulty/cert/platform moved into `FilterDrawer`, Kanban cards = name + IP + <=2 badges, hover-reveal actions via opacity, lifecycle stepper in `MachineDetailModal`); `a88d067` **vault/exam/analytics/writeup/profile** (neutral stat tiles, mobile cards, overflow menus, sentence-case copy). Merge commits `f927176`, `4c985f2`, `fa883db`. |
| `52b60cc` polish | `CyberButton` undefined `border-border-*`/`text-text-*` classes fixed; E2E selectors aligned to new copy; payload pill clearance (`md:pb-12`); field manual mobile toolbar. |
| `f1ebba4` a11y | axe now 0 contrast / 0 serious across 9 routes x 3 presets x 2 modes; scanner waits for settled animations; methodology snippet strip focusable region; mobile branch-chip wrap. |
| `ee2bcc3` review fixes | keyboard/touch reveal for tree, tab close and evidence actions; Kanban backlog count; single LHOST/LPORT source. |

**Verification at `ee2bcc3`:** tsc 0 errors; vitest 109 files / 1987 tests; build OK; E2E 12/12 phases with 0 console errors; Playwright 7/7; axe 0/0; Tab-through PASS; iPhone touch-reveal PASS.

**M6 DONE at commit `7b9462b`:** Lighthouse via the new devDependency `lighthouse` ^13.5.0 and `npm run lighthouse:a11y` ([scripts/lighthouse_a11y.mjs](../scripts/lighthouse_a11y.mjs)); 9 routes (incl. `/target/thm-rootme`) x dark/light = 18 runs: accessibility 100 and best-practices 100 on all, performance 100 on 15, 99 tracker, 94 methodology-light; zero non-localhost requests. `run_webapp_tests.py` and `axe_contrast_scan.py` are now versioned via `.gitignore` exceptions.

## B4. Process lessons

- Parallel lanes in the **shared** working tree once overwrote each other. Use git worktrees + per-lane file allowlists, and verify `git diff --name-only` is a subset of the allowlist before merging.
- **Never delete a worktree's `node_modules` junction recursively** (it can follow the junction and delete the real `node_modules`).
- axe must wait for animations to settle or it reports false contrast hits mid-transition.
- Testing Library `getByText` is case-sensitive (copy changes break tests); Playwright `has-text` is not.
- E2E (not unit tests) caught the `layoutId` route-exit blocker - keep running the browser suite after motion changes.

## B5. Known open items (carried into Part C)

1. `ActivitySession.date` is stored as a UTC date-only string while the heatmap uses local days (needs a data-contract decision; compute on read, never rewrite).
2. Burn-down `lastExpiresAtRef` is in-memory (`ExamSimulatorPage`), so a reload while paused loses the last expiry.
3. One E2E Phase-2 flake was seen once.
4. 25 categories share 8 `cat-N` slots (by design, but collisions are visible).
5. `GraphView` keeps literal hex canvas palettes (theme tests + SVG export depend on them).

---

# Part C - How to continue

## C1. Rules for the next agent

Conventions from [CLAUDE.md](../CLAUDE.md) (operational manual) (local-only, untracked - may not exist in a clone) plus the design brief essentials:

1. **Tokens only.** Use semantic classes (`bg-surface-*`, `text-primary|secondary|muted|tertiary`, `border-subtle|strong|accent`, `text-on-accent`, `callout-*`, `cat-N-*`, `surface-inverse` + `syntax-*` for code). No raw hex / `bg-slate-*` / `text-white` in new UI (a few legacy `slate`/`cyber-*` usages remain; migrate opportunistically, do not mass-rewrite blindly). Never `hover:text-white`.
2. **Typography:** sans for everything; `font-mono tabular-nums` only for telemetry (IPs, ports, MACs, hashes, commands, timers, counters). Weights normal/medium/semibold only.
3. **No uppercase eyebrows, no `[BRACKETED]` labels**; sentence-case copy. No rainbow badge soup: **max 2 badges inline** (`BadgeOverflow` for the rest); tones come from `categoryUtils`.
4. **One primary action per surface** (`PageHeader.primaryAction`); secondary actions inline from `sm` up; everything else in `OverflowMenu`; mobile must be able to reach every action.
5. **Hover-reveal via opacity only**, and always with keyboard (`focus-within`) and touch equivalents (this was a review finding).
6. **Motion:** `TACTICAL_SPRING`; enter spring, exit <= 150 ms; `active:scale-[0.97]`; honor reduced motion; **no `layoutId` in route-level components** (breaks `AnimatePresence mode="wait"` route exits).
7. **Radii (concentric):** outer = inner + padding. Config scale: `rounded-xl` = 16px, `rounded-2xl` = 20px (note CLAUDE.md says `rounded-2xl` = 16 px - the config is authoritative; see appendix), buttons `rounded-md`/`rounded-lg`, tags `rounded`.
8. **Zero egress:** no `fetch`/XHR/WebSocket/remote fonts/images/analytics. CSP forbids it and tests assert it. Sanitize any rendered HTML with `sanitizeHtml`/`sanitizeSvg`.
9. **Never drop persisted fields** or storage keys; see A5.10. Don't rename `rootvector_*`/`specter_*` keys.
10. **No native dialogs.** Use `confirmAction` for confirmation and `toast.*` for notifications. Destructive actions must confirm.
11. **Focus management:** modals/drawers use `useFocusTrap` (stack-aware); keep visible focus rings (do not add `outline-none` without a replacement).
12. **Keep shortcut tables in sync** (`useTacticalHotkeys` <-> `KeyboardShortcutsModal`).
13. **Copy changes ripple into tests** (Testing Library case-sensitivity, Playwright selectors, `theme/` class-string tests).
14. **Parallel work:** use worktrees + file allowlists; verify diff within allowlist before merging; never recursively delete a worktree's `node_modules` junction. This repo's operating model (per the user's global CLAUDE.md): the architect delegates implementation, names a reasoning effort per task, uses cheap read-only agents for exploration, verifies evidence before accepting a report, and gets a fable-advisor review before calling a deliverable done.
15. Do not touch `src-tauri/updater.key` or commit secrets.

## C2. Verification checklist (run before marking any step done)

```bash
npx tsc --noEmit                      # 0 errors
npm test -- --run                     # all pass (109 files / 1987 tests at ee2bcc3)
npm run build                         # tsc + vite build + postbuild
python scripts/run_webapp_tests.py    # 12/12 phases, 0 console errors (starts dev server if needed)
npx playwright test                   # 7/7
python scripts/axe_contrast_scan.py   # 0 contrast / 0 serious; Tab-through PASS (read reports/axe-report.json)
# production-preview a11y (M6):
npm run build && npx vite preview --port 4173 --strictPort   # in one shell
npm run lighthouse:a11y                                       # all a11y >= 95 (script exits 1 otherwise); 100 at 7b9462b
# seeds localStorage theme itself; reports -> reports/lighthouse/ (gitignored); env LH_BASE_URL, LH_ROUTES, LH_MIN_A11Y
```

Also, for visual changes: screenshot light + dark and 1440 px + 390 px; check Tab-through and (for hover-reveal) keyboard and touch; check all 3 presets (obsidian, monolith, htb). If you changed `index.css` token values, run the contrast matrix test explicitly: `npx vitest run src/test/a11y/tokenContrastMatrix.test.ts`.

## C3. M6 final sign-off state

M6 is **DONE at commit `7b9462b`**.

- Lighthouse (new devDependency `lighthouse` ^13.5.0, `npm run lighthouse:a11y`): 9 routes (incl. `/target/thm-rootme`) x dark/light = 18 runs; accessibility 100 and best-practices 100 on all; performance 100 on 15, 99 tracker, 94 methodology-light; zero non-localhost requests.
- Scripts versioned: `scripts/run_webapp_tests.py` and `scripts/axe_contrast_scan.py` via `.gitignore` exceptions (`scripts/*.py` otherwise still ignored); axe report -> `reports/axe-report.json` (`--out` / `AXE_REPORT_PATH`), `reports/` gitignored.
- Earlier gates (at `ee2bcc3`): tsc 0, vitest 109/1987, build OK, E2E 12/12, Playwright 7/7, axe 0/0.
- Remaining housekeeping (not blocking): the open items in C4; [CLAUDE.md](../CLAUDE.md) and [CLAUDE_HANDOFF_PROMPT.md](CLAUDE_HANDOFF_PROMPT.md) (both local-only, untracked) are user-owned and still stale (see Appendix), as are the `zb_*` DB names, `rounded-2xl` size and `showToast` name in them.

## C4. Open items with suggested approaches

| # | Item | Suggested approach |
|---|---|---|
| 1 | `ActivitySession.date` UTC date-only vs local-day heatmap (sessions created near midnight land on the wrong local day) | **Do not rewrite stored data.** Decide the contract: either (a) add an optional `at?: string` ISO timestamp to new sessions (additive; set in `updateMachineStatus` and wherever sessions are created) and have the heatmap derive the local key via `toLocalDateKey(new Date(s.at))` falling back to `s.date`, or (b) keep `date` and document it as UTC. Add tests around a UTC/local boundary using a fixed `TZ`. Remember to update `WorkspaceExportPayload`/`validateWorkspacePayload` passthrough (already generic per item) and the backup tests. |
| 2 | Burn-down `lastExpiresAtRef` is in-memory; reload while paused loses it | Persist the last expiry additively in `examStore` (e.g. `lastExpiresAt: number\|null`, set in `pauseExam`, included in `partialize`, tolerated when missing) and feed it to `resolveChartWindow`; remove the ref. Alternatively derive `end = startedAt + totalDurationSeconds*1000 + totalPausedMs` if pause history is tracked. Add a reload-while-paused test. |
| 3 | E2E Phase-2 (Evidence Vault) flake seen once | Re-run phase 2 in a loop (`for i in 1..10`), capture trace; likely an animation/mount race (AddLootModal/ExportLootDrawer or reveal toggles). Prefer `expect(...).toBeVisible()` style waits or waiting on settled animations (as done in the axe scanner) over fixed sleeps. |
| 4 | 25 categories share 8 `cat-N` slots | Accept by design (icons + labels disambiguate) or extend to cat-9..12 by adding tokens in all 6 theme blocks and extending `tokenContrastMatrix` `CAT_INDICES`; update `CatIndex`, `CAT_TONES`, `tailwind.config.js`. Do not hardcode colors in components. |
| 5 | `GraphView` literal hex palettes (`ATTACK_EDGE_META` colors etc.) | Leave until theme tests and SVG export are reworked; a safe path is a resolver that reads computed CSS variables at render/export time (SVG export must inline resolved values) and keeps a literal fallback for tests. Check `attackGraph*` tests and `graphExportUtils`. |
| 6 | Resilient IDB snapshots are write-only | Add a "Restore from snapshot" flow (list `listSnapshots`, load, validate with `validateWorkspacePayload`, confirm via `confirmAction`) or document as insurance only. Don't change the stored format. |
| 7 | Exam screenshots stored as base64 data URLs inside `zerobox_exam_state_v1` (localStorage quota risk; images are already downscaled to 1280 px JPEG q0.82) | Cap count/size per proof and/or move blobs to IndexedDB while keeping `ScreenshotProof.dataUrl` readable for old data; surface the `zerobox:storage` quota event in the exam UI. |
| 8 | Legacy `cyber-*` colours and `slate`/`dark:` pairs still appear in older code (e.g. App.tsx root, storage alert card, zen banner) | Migrate incrementally to semantic tokens when touching a file; keep `cyber-*` mappings in CSS. Check light mode after each migration. |
| 9 | Duplicate `ActivitySession` on repeated root transitions | Optional: de-dupe by `machineId + type` when appending (additive logic change; keep old data). |
| 10 | Stale user-owned docs (CLAUDE.md, CLAUDE_HANDOFF_PROMPT.md) | Ask the user before editing; see Appendix. |

## C5. Quick orientation for a first task

1. Read this file (A3-A5 first) and [PROJECT.md](PROJECT.md); then [CLAUDE.md](../CLAUDE.md) if present (local-only, untracked).
2. `git status` and `git log --oneline -15` to see the current state.
3. Start the dev server (`npm run dev`, port 3000) and open `http://localhost:3000/#/tracker` (seed `localStorage.zerobox_onboarding_completed='true'` to skip the first-run modal).
4. For UI work look at `PageHeader`, `CyberButton`, `categoryUtils`, and one restyled view (e.g. [src/components/tracker/KanbanBoard.tsx](../src/components/tracker/KanbanBoard.tsx)) as style references.
5. For data work start from `useCtfStore.flushProfileSave`, `mergeMachinesWithCatalog`, `indexedDbDeepStorage`.

---

## Appendix: discrepancies between existing docs and code

| Doc claim | Reality in code |
|---|---|
| IndexedDB DBs `zb_deep_storage_db`, `zb_vault_db`, `zb_resilient_db` (CLAUDE.md, PROJECT.md) | Actual names: `zerobox_deep_storage_db`, `zerobox_vault_db`, `zerobox_resilient_store_v1` (the `zb:workspace:<profileId>` string is a *key* inside the resilient store). Do not rename; existing users' data lives under the real names. |
| `rounded-2xl` = 16 px (CLAUDE.md) | `tailwind.config.js`: `xl` = `var(--radius-xl)` = 16 px, `2xl` = 20 px, `3xl` = 24 px. |
| `useToastStore (showToast)` (CLAUDE.md) | No `showToast` exists; use `toast.success/error/warning/info` or `useToastStore.getState().addToast`. |
| M3 "NEXT UP", M4-M6 "PLANNED" (CLAUDE.md, PROJECT.md, CLAUDE_HANDOFF_PROMPT.md) | M1-M6 all DONE (PROJECT.md now updated; CLAUDE.md and CLAUDE_HANDOFF_PROMPT.md still stale). |
| "880 tests / 79 files" (PROJECT.md), "86 files / 990 tests" (handoff prompt) | 109 files / 1987 tests at `ee2bcc3`. |
| "28 localStorage keys" | ~27 key families enumerated in A5.9; counting depends on per-profile suffixes. |
| `AI_CONTEXT.md` (929 machines, 16 phases/137 procedures) | **UNVERIFIED** against current data files; treat as historical. |
| Persistent legacy brand names | `rootvector_auth_session`, `rootvector_google_client_id`, `specter_ctf_*` keys are intentionally retained for data continuity. |
