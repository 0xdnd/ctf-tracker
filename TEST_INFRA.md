# ZEROBOX Tactical Cybersecurity Operations Suite
# Dual-Track Test Infrastructure & Specification (Tiers 1–4)

## 1. Executive Summary & Test Philosophy
ZEROBOX is an air-gapped, client-side browser operations tracking and CTF management application designed for high-stakes cybersecurity engagements.

The ZEROBOX testing infrastructure follows a **Dual-Track, Requirement-Driven, Opaque-Box** philosophy:
- **Opaque-Box & Requirement-Driven**: Tests are derived strictly from authoritative operational requirements documented in `ORIGINAL_REQUEST.md` and `PROJECT.md`. They validate system behavior, interface contracts, and security invariants rather than brittle internal implementation details.
- **Air-Gapped & Zero Backend Dependency**: The test harness enforces 100% offline client execution (React 18, Zustand, IndexedDB). No tests may require external network connectivity, third-party cloud APIs, or remote mock servers.
- **Defensive Invariance**: Security properties (zero network egress, stored/DOM XSS neutralization, and Zip Slip path traversal prevention) are treated as non-negotiable operational invariants tested with active fuzzing, adversarial vectors, and runtime interception.

---

## 2. Test Architecture & Runner Commands

The testing framework leverages **Vitest** configured with `jsdom` and `@testing-library/react`.

### Primary Execution Commands
| Target / Scope | Command | Description |
|----------------|---------|-------------|
| **Full Suite** | `npm test` | Runs all unit, integration, endurance, fuzzing, a11y, and E2E tests |
| **All E2E Suites** | `npx vitest run src/test/e2e` | Executes all Tier 1–4 End-to-End test suites |
| **Zero-Egress E2E** | `npx vitest run src/test/e2e/zeroEgress.e2e.test.ts` | Static scan & active runtime network interceptor for zero egress |
| **XSS Sanitization E2E** | `npx vitest run src/test/e2e/xssSanitization.e2e.test.ts` | Adversarial DOMPurify HTML/SVG injection and neutralization suite |
| **Zip Slip Ingestion E2E** | `npx vitest run src/test/e2e/zipSlipIngestion.e2e.test.ts` | Path traversal, null byte, UNC, and archive breakout test suite |
| **Offline Runtime E2E** | `npx vitest run src/test/e2e/offlineRuntime.e2e.test.ts` | IndexedDB, Zustand persistence, offline guest auth, and offline report export |
| **User Journeys E2E** | `npx vitest run src/test/e2e/userJourneys.test.ts` | Recon-to-root lifecycle, backup roundtrip, and profile isolation |
| **Type Integrity Check** | `npx tsc --noEmit` | Strict TypeScript compiler validation across source and test targets |

---

## 3. Four-Tier Coverage Invariants & Thresholds

```
+---------------------------------------------------------------------------------+
| TIER 4: Real-World Tactical Scenarios & Security Posture                        |
| - Zero network egress (static code scan + runtime network interception)         |
| - DOMPurify HTML & SVG XSS vector neutralization (<script>, on*, SVG, foreign)   |
| - Malicious Zip Slip archive containment & safe vault ingestion                 |
| Threshold: 0 external egress, 0 XSS executions, 0 directory escapes             |
+---------------------------------------------------------------------------------+
| TIER 3: Cross-Feature Interactions & Persistence Invariants                     |
| - Full workspace roundtrip backup -> factory reset wipe -> exact restoration    |
| - Offline guest authentication & operator profile state isolation              |
| - IndexedDB and Zustand store persistence & memory state synchronization        |
| - Bidirectional wikilink graph resolution across vault notes                     |
| Threshold: 100% data integrity parity, zero cross-profile contamination         |
+---------------------------------------------------------------------------------+
| TIER 2: Boundary & Corner Cases (Fuzzing & Defensive Robustness)                |
| - Malformed/truncated Nmap XML and raw text scan outputs                        |
| - Path traversal attempts (../, %2e%2e, UNC paths, Windows drive letters, \0)  |
| - Rapid 20x synchronous profile switching stress                                |
| - High-entropy fast-check property-based fuzzing of schema validators           |
| Threshold: 100% boundary safety, zero uncaught exceptions                       |
+---------------------------------------------------------------------------------+
| TIER 1: Feature Coverage (Core Operational Workflows)                           |
| - Machine solve lifecycle (Recon -> Foothold -> Root) with timer tracking      |
| - Port enumeration checklist and dynamic attack surface management              |
| - 1,000+ word tactical writeup authoring and Markdown rendering                 |
| - Standalone HTML & Markdown report generation without remote assets            |
| Threshold: >= 90% requirement coverage across all documented user workflows     |
+---------------------------------------------------------------------------------+
```

### Tier 1: Feature Coverage
- **Scope**: Primary operational workflows executed during CTF competitions and penetration testing lab engagements.
- **Verification**: `src/test/e2e/userJourneys.test.ts`, `src/test/e2e/offlineRuntime.e2e.test.ts`.
- **Target Invariants**:
  - Target machine addition, metadata assignment (IP, OS, difficulty, platform, certifications).
  - Engagement timer start, tick, pause, and elapsed time recording.
  - User flag and root flag submission with automated state progression (`recon` -> `foothold` -> `completed`).
  - Writeup drafting, inline formatting, code snippet parsing, and HTML export.

### Tier 2: Boundary & Corner Cases
- **Scope**: Extreme input values, malformed data, schema deviations, and boundary stresses.
- **Verification**: `src/test/fuzz/propertyFuzzing.test.ts`, `src/test/e2e/zipSlipIngestion.e2e.test.ts`, `src/utils/scanParserUtils.test.ts`.
- **Target Invariants**:
  - Schema validators (`validateWorkspacePayload`) must reject or safely sanitize invalid payloads without throwing unhandled exceptions.
  - Scan parser must handle truncated XML, missing tags, empty strings, and DTD entity definitions safely.
  - Path normalizers must reject empty strings, dot-only segments, and absolute filesystem paths.

### Tier 3: Cross-Feature Interactions
- **Scope**: State synchronization across multi-layered subsystems (Zustand, LocalStorage, IndexedDB, and UI context).
- **Verification**: `src/test/e2e/userJourneys.test.ts` (Journeys B & C), `src/test/e2e/offlineRuntime.e2e.test.ts`.
- **Target Invariants**:
  - Full workspace JSON backup export reproduces identical state upon re-import after complete factory wipe.
  - Multi-profile switching guarantees zero state leakage or machine bleed between profiles.
  - Offline operator guest authentication functions seamlessly without calling remote OAuth endpoints.

### Tier 4: Real-World Tactical Scenarios & Security Posture
- **Scope**: Hardened operational security, air-gapped guarantees, and attack vector neutralization.
- **Verification**:
  - `src/test/e2e/zeroEgress.e2e.test.ts`: Verifies no remote host references in static codebase (`index.html`, `src/index.css`, `src/store/useAuthStore.ts`, `src/utils/writeupHtmlExporter.ts`, `src-tauri/tauri.conf.json`) and verifies active network interceptors block any unauthorized outbound fetch/XHR/WebSocket calls.
  - `src/test/e2e/xssSanitization.e2e.test.ts`: Subjecting markdown writeup rendering, note viewing, and SVG diagrams to adversarial attack vectors (`<script>`, `onerror`, `onload`, `javascript:`, nested `<svg><foreignObject>`).
  - `src/test/e2e/zipSlipIngestion.e2e.test.ts`: Enforcing boundary containment on ZIP and directory vault imports against traversal attacks (`../../`, `%2e%2e/`, `/etc/passwd`, `C:/Windows/win.ini`, UNC paths, null bytes).

---

## 4. Test Isolation, Determinism & Maintenance Rules
1. **Zero Shared State**: Every test suite runs `beforeEach` state reset (`useCtfStore.setState(initialSnapshot, true)`, `localStorage.clear()`).
2. **Deterministic Time & Mocks**: Asynchronous timers and intervals use standard Vitest fake timers where appropriate to avoid brittle sleep delays.
3. **No Facade Tests**: Tests must assert observable DOM elements, data payloads, or cryptographic hashes—never trivial `expect(true).toBe(true)` facades.
4. **Implementation Bug Escalation**: QA/test writers write test code only. Any defects uncovered in application code are documented with exact reproduction vectors and escalated to the implementing agent.
