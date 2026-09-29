# E2E Test Infra: ZeroBox Markdown Editor & Live Preview System

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Strict Air-Gapped Zero-Egress Invariant: 100% client-side operation with 0 network calls.

## Feature Inventory Coverage
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Tri-Mode View Toggling (`reading`, `split`, `raw`) | ORIGINAL_REQUEST §R1 | TC-T1-01 | TC-T2-01 | TC-T3-03 |
| 2 | Live Split-View Synchronized Preview | ORIGINAL_REQUEST §R1 | TC-T1-02 | TC-T2-02 | TC-T3-01 |
| 3 | Formatting Toolbar Button Insertions (H1-H3, Bold, Italic, Code, List, Callout) | ORIGINAL_REQUEST §R1 | TC-T1-03 | TC-T2-07 | TC-T3-06 |
| 4 | Standard Keyboard Shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+S) | ORIGINAL_REQUEST §R1 | TC-T1-04 | TC-T2-07 | TC-T3-02 |
| 5 | Editor Tab Indentation & Caret Mechanics | ORIGINAL_REQUEST §R1 | TC-T1-05 | TC-T2-07 | TC-T3-02 |
| 6 | Obsidian Callouts Rendering (11 types, collapsible +/-) | ORIGINAL_REQUEST §R2 | TC-T1-06 | TC-T2-04 | TC-T3-06 |
| 7 | Internal Wikilinks Zero-Popup Navigation & Background Tabs | ORIGINAL_REQUEST §R2 | TC-T1-07 | TC-T2-04 | TC-T3-02 |
| 8 | Code Blocks with 1-Click Copy & HUD Variable Interpolation | ORIGINAL_REQUEST §R2 | TC-T1-08 | TC-T2-04 | TC-T3-04 |
| 9 | Interactive Task Checklists with Bidirectional State Sync | ORIGINAL_REQUEST §R2 | TC-T1-09 | TC-T2-04 | TC-T3-02 |
| 10 | Debounced Auto-Saving & Status Indicator (`Saved`, `Saving...`, `Unsaved`) | ORIGINAL_REQUEST §R3 | TC-T1-10 | TC-T2-03 | TC-T3-02 |

## Test Architecture
- Test runner: Vitest (`npm test -- --run`)
- Test file: `src/test/cheatsheet/markdownEditorWorkspace.test.tsx`
- Setup: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `src/test/setup.ts`
- Environment: jsdom with IndexedDB and localStorage mocks

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | End-to-End CTF Note Lifecycle (creation, formatting, checklists, callouts, persistence) | F1, F3, F5, F6, F9, F10 | High |
| 2 | Active Certification Exam HUD Coexistence (24h timer ticking during continuous typing) | F2, F10 | Medium |
| 3 | Attack Graph Canvas to Notes Integration (pivot command paste, wikilink navigation) | F7, F8 | Medium |
| 4 | Rapid Tab Churn with Multiple Dirty Buffers (isolated keep-alive buffers, bulk flush) | F1, F4, F10 | High |
| 5 | Strict Air-Gapped Zero-Egress Invariant (zero outbound network requests) | All | Critical |

## Coverage Thresholds
- Tier 1: 10 core feature tests (TC-T1-01 to TC-T1-10)
- Tier 2: 7 boundary and edge case tests (TC-T2-01 to TC-T2-07)
- Tier 3: 6 combination and integration tests (TC-T3-01 to TC-T3-06)
- Tier 4: 5 real-world mission scenario tests (TC-T4-01 to TC-T4-05)
- **Total: 28+ test cases across 4 tiers**
