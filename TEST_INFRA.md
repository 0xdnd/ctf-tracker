# E2E Test Infra: ZeroBox Refined Tactical Redesign

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Target: Verify all 31 features across all 7 views and navigation flows.

## Feature Inventory & Test Coverage
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Interactions) | Tier 4 (Workload) |
|---|---------|--------|:-----------------:|:-----------------:|:---------------------:|:-----------------:|
| 1 | Global Typography & Font Stacks | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Semantic Color Tokens & Theme Presets | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Light Mode Contrast & Hover States | R1, R2 | 5 | 5 | ✓ | ✓ |
| 4 | Concentric Radii & Visual Geometry | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Dual-Theme Depth & Ambient Shadows | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Motion Tokens & Reduced-Motion Mode | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Core Shell & UnifiedHeader Navigation | R1, R4 | 5 | 5 | ✓ | ✓ |
| 8 | Lab Tracker Grid View (Cards, Filter) | R1, R4 | 5 | 5 | ✓ | ✓ |
| 9 | Lab Tracker Table & Kanban Views | R1, R4 | 5 | 5 | ✓ | ✓ |
| 10 | Lab Tracker Attack Graph Canvas | R1, R4 | 5 | 5 | ✓ | ✓ |
| 11 | Target Detail Inspector Drawer | R1, R4 | 5 | 5 | ✓ | ✓ |
| 12 | Evidence Vault & Loot Timeline | R1, R4 | 5 | 5 | ✓ | ✓ |
| 13 | Loot Management & Form Validation | R1, R4 | 5 | 5 | ✓ | ✓ |
| 14 | Attack Methodology Tree & Decision Nodes | R1, R4 | 5 | 5 | ✓ | ✓ |
| 15 | Methodology Checklists & Playbooks | R1, R4 | 5 | 5 | ✓ | ✓ |
| 16 | Field Manual & Notes Workspace Tabs | R1, R4 | 5 | 5 | ✓ | ✓ |
| 17 | Obsidian OFM Rendering & Callouts | R1, R4 | 5 | 5 | ✓ | ✓ |
| 18 | Writeup Studio Dual-Pane Markdown | R1, R4 | 5 | 5 | ✓ | ✓ |
| 19 | Pentest Report Modal & Exporters | R1, R4 | 5 | 5 | ✓ | ✓ |
| 20 | Accessible SVG Skill Radar Chart | R1, R3 | 5 | 5 | ✓ | ✓ |
| 21 | 7-Day Activity Heatmap & Matrix | R1, R3 | 5 | 5 | ✓ | ✓ |
| 22 | 24h Exam Simulator Cockpit & Velocity Chart | R1, R4 | 5 | 5 | ✓ | ✓ |
| 23 | Exam Bio-Break & Evidence Dropzone | R1, R4 | 5 | 5 | ✓ | ✓ |
| 24 | Usability Heuristics (Toasts, Skeletons, Errors) | R3 | 5 | 5 | ✓ | ✓ |
| 25 | WCAG 2.1 AA Compliance & Keyboard Navigation | R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `python scripts/run_webapp_tests.py` & Playwright test scripts in `src/test/e2e/`
- Pass/Fail semantics: All tests must exit 0 with 0 unhandled console errors or runtime warnings.
- State Pre-condition: LocalStorage pre-seeded with `'zerobox_onboarding_completed': 'true'` to bypass initial onboarding modal during automated testing.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full CTF Target Lifecycle (Recon -> Foothold -> Root -> Loot -> Writeup) | F7, F8, F11, F12, F18 | High |
| 2 | Attack Graph Multi-Hop Pivot Modeling & Command Generation | F7, F10, F11 | High |
| 3 | Field Manual Technical Research & OFM Tabbed Note Taking | F7, F16, F17 | Medium |
| 4 | 24-Hour OSCP Mock Exam Simulation with Bio Breaks & Pacing Telemetry | F6, F7, F22, F23 | High |
| 5 | Theme Preset & Light/Dark Mode Switching Across All 7 Views | F1, F2, F3, F5, F7, F25 | Medium |
| 6 | Complete Keyboard-Only Operation (Ctrl+K, Esc, Arrow Keys, Tab Trap) | F7, F24, F25 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: Pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
