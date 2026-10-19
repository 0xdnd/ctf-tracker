/**
 * examComplianceUtils.ts
 * ZeroBox Tactical Certification Exam Simulator & Mission HUD
 * 
 * Authentic Rulesets, 100-Point Scoring Matrices, Proof Verification & Report Generation:
 * - OffSec OSCP (PEN-200): 24h, 3-box chained AD set (40 pts all-or-nothing), 3 standalones (20 pts each: 10 user, 10 root), 70 pt pass threshold
 * - Hack The Box CPTS: 10-day (240h), 14 flag objectives across DMZ, Internal, AD, and Vault, 85 pt pass threshold
 * - Zero-Point Security CRTO: 48h, 8 objective flags (12.5 pts each), C2 OpSec checkpoints, 75 pt pass threshold
 */

import { OperatingSystem, Difficulty, Machine } from '../types';
import type { Finding } from '../types/findings';
import { createRng, generateExamSeed, selectExamMachines, shuffleWithRng, type SlotSelection } from './examTargetSelection';

export type ExamTrack = 'OSCP' | 'CPTS' | 'CRTO' | 'OSEP' | 'CRTP' | 'PNPT' | 'OSWE';
export type PassingStatus = 'Passing' | 'In Progress' | 'Critical';

/**
 * 'official': the published point split.
 * 'weighted': same max score, redistributed by slot difficulty (OSCP standalones and OSWE only).
 * 'legacy': official split plus the pre-Nov 2024 OSCP bonus (applies only when the score is above 0).
 */
export type ExamScoringMode = 'official' | 'weighted' | 'legacy';

export const EXAM_SCORING_MODES: readonly ExamScoringMode[] = ['official', 'weighted', 'legacy'];

/** Difficulty weights used by weighted mode. */
export const EXAM_DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  'Very Easy': 1,
  Easy: 1,
  Medium: 1.5,
  Hard: 2,
  Insane: 2.5,
};

export interface ScreenshotProof {
  id: string;
  /** Inline Base64 data:image/... (legacy / fallback). Dropped once the bytes live in IndexedDB (see imageRef). */
  dataUrl?: string;
  /** Id of the image blob in IndexedDB; resolve via src/utils/examProofImages.ts. */
  imageRef?: string;
  caption: string;
  commandUsed?: string;
  timestamp: string;
  sizeBytes?: number;
}

export interface ExamTargetProof {
  flagText: string;
  whoamiOutput: string;
  ipconfigOutput: string;
  screenshotTaken?: boolean;
  screenshots?: ScreenshotProof[];
  toolsUsed?: string;
  reproductionSteps?: string;
  opsecCompliant?: boolean;
  pwnedAt?: string;
}

export type AdRole = 'foothold' | 'lateral' | 'dc';

export interface ExamBox {
  id: string;
  name: string;
  ip: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  type: string;
  label: string;
  adRole?: AdRole;
  /** Catalog machine this slot was filled from (absent for the hardcoded fallback and fixed-scenario tracks). */
  machineId?: string;
  userPoints: number;
  rootPoints: number;
  userPwned: boolean;
  rootPwned: boolean;
  userProof: ExamTargetProof;
  rootProof: ExamTargetProof;
  initialAccessAt?: string;
  privEscAt?: string;
  domainCompromiseAt?: string;
}

/**
 * Checks whether an exam box represents a Domain Controller in an Active Directory chain
 */
export function isDomainControllerBox(box: { adRole?: AdRole; type?: string; name?: string }): boolean {
  if (box.adRole) return box.adRole === 'dc';
  return box.type === 'ad-dc' || (Boolean(box.type?.startsWith('ad-')) && (box.name?.toLowerCase().includes('dc') ?? false));
}

/**
 * Checks whether an exam box belongs to an Active Directory attack set
 */
export function isActiveDirectoryBox(box: { adRole?: AdRole; type?: string; name?: string }): boolean {
  if (box.adRole) return true;
  return Boolean(
    box.type && (
      box.type.startsWith('ad-') ||
      box.type.startsWith('ad') ||
      box.type.includes('dc')
    )
  );
}

export interface ExamSessionState {
  id?: string;
  track: ExamTrack;
  candidateName: string;
  candidateCallsign: string;
  osid: string;
  examStartedAt: number;
  examDurationSeconds: number;
  examExpiresAt: number | null;
  isTimerRunning: boolean;
  timerPausedRemainingSeconds: number | null;
  boxes: ExamBox[];
  scratchNotes: string;
  includeBonusPoints?: boolean;
  scoringMode?: ExamScoringMode;
  /** Structured findings rendered as the report's Findings Summary / Detailed Findings sections. */
  findings?: Finding[];
}

export interface FlagValidationResult {
  valid: boolean;
  format: 'offsec-md5' | 'htb' | 'crto' | 'thm' | 'custom' | 'invalid';
  label: string;
  description: string;
}

/**
 * 'points' (default): the exam is scored in points against passThreshold.
 * 'objective': the exam is pass/fail on completing every technical objective (plus a report and
 * debrief outside the simulator). Objective weights only drive progress/pacing display; the track
 * passes when all objectives are complete.
 */
export type ExamScoringModel = 'points' | 'objective';

export interface ExamTrackConfig {
  id: ExamTrack;
  name: string;
  durationSeconds: number;
  passThreshold: number;
  maxScore: number;
  requiresAdFullChain: boolean;
  description: string;
  targetSummary: string;
  /** Defaults to 'points' when omitted. */
  scoringModel?: ExamScoringModel;
  /** Time allowed to write/submit the report after the lab window closes (seconds). Informational. */
  reportWindowSeconds?: number;
  /** Length of the live report debrief, when the exam has one (minutes). Informational. */
  debriefMinutes?: number;
  /** Short UI label for models that are approximations or objective-based. Informational. */
  scoringNote?: string;
}

/** Weighted scoring redistributes points across slots: OSCP standalones and OSWE only. */
export function supportsWeightedScoring(track: ExamTrack): boolean {
  return track === 'OSCP' || track === 'OSWE';
}

/** The legacy (pre-Nov 2024) bonus only ever applied to OSCP. */
export function supportsLegacyBonus(track: ExamTrack): boolean {
  return track === 'OSCP';
}

/** Scoring mode a track can actually use (falls back to official). */
export function resolveScoringMode(track: ExamTrack, mode: ExamScoringMode | undefined): ExamScoringMode {
  if (mode === 'weighted') return supportsWeightedScoring(track) ? 'weighted' : 'official';
  if (mode === 'legacy') return supportsLegacyBonus(track) ? 'legacy' : 'official';
  return 'official';
}

export function isObjectiveTrack(track: ExamTrack): boolean {
  return EXAM_TRACK_CONFIGS[track]?.scoringModel === 'objective';
}

export const EXAM_TRACK_CONFIGS: Record<ExamTrack, ExamTrackConfig> = {
  OSCP: {
    id: 'OSCP',
    name: 'OffSec OSCP (PEN-200)',
    durationSeconds: 24 * 3600, // 86,400s (24h)
    passThreshold: 70,
    maxScore: 100,
    requiresAdFullChain: true,
    description: '24-hour hands-on certification exam consisting of a 3-machine Active Directory set (40 pts all-or-nothing) and 3 independent standalone machines (20 pts each). Passing threshold: 70 pts.',
    targetSummary: '3-Box AD Set (40 pts) + 3 Standalone Targets (60 pts)',
  },
  CPTS: {
    id: 'CPTS',
    name: 'Hack The Box CPTS',
    durationSeconds: 10 * 24 * 3600, // 864,000s (240h / 10 days)
    passThreshold: 85,
    maxScore: 100,
    requiresAdFullChain: false,
    description: '10-day enterprise network penetration test simulating an extensive multi-tier corporate environment with DMZ, internal networks, Active Directory, and vault tier with 14 flag objectives. Passing threshold: 85 pts.',
    targetSummary: 'Multi-Stage Enterprise Network (14 Flag Objectives)',
  },
  CRTO: {
    id: 'CRTO',
    name: 'Zero-Point Security CRTO',
    durationSeconds: 48 * 3600, // 172,800s (48h)
    passThreshold: 75,
    maxScore: 100,
    requiresAdFullChain: false,
    description: '48-hour Red Team Operator exam focusing on assumed breach operations, Cobalt Strike C2 infrastructure, Active Directory domain dominance, and operational security checkpoints. Passing threshold: 75 pts.',
    targetSummary: '8 C2 Red Team Objectives (12.5 pts each)',
    scoringNote: 'Approximate layout',
  },
  OSEP: {
    id: 'OSEP',
    name: 'OffSec OSEP (PEN-300)',
    durationSeconds: 48 * 3600,
    passThreshold: 100,
    maxScore: 100,
    requiresAdFullChain: false,
    description: 'Evasion Techniques and Breaching Defenses 48-hour practical exam.',
    targetSummary: 'Enterprise Defense Evasion Lab',
    scoringNote: 'Objective-based',
  },
  CRTP: {
    id: 'CRTP',
    name: 'Altered Security CRTP',
    durationSeconds: 24 * 3600,
    passThreshold: 100,
    maxScore: 100,
    requiresAdFullChain: false,
    description: 'Certified Red Team Professional Active Directory practical assessment.',
    targetSummary: 'Active Directory Domain Lab',
    scoringNote: 'Objective-based',
  },
  // Modeled on the published PNPT rules (https://certifications.tcm-sec.com/pnpt/): 5 days of lab
  // time, 2 further days for the report, then a live 15-minute debrief. Pass is objective-based
  // (OSINT, AD exploitation, domain controller compromise, report, debrief); there are no flags
  // and no points. TCM does not publish a machine count, so the five objective weights below are
  // an approximation used only for progress and pacing display.
  PNPT: {
    id: 'PNPT',
    name: 'TCM Security PNPT',
    durationSeconds: 5 * 24 * 3600, // 432,000s (5 days)
    passThreshold: 100,
    maxScore: 100,
    requiresAdFullChain: true,
    scoringModel: 'objective',
    reportWindowSeconds: 2 * 24 * 3600, // 2 days after the lab window
    debriefMinutes: 15,
    description: 'Modeled on the published PNPT rules: 5 days of lab time, 2 days to write the report, then a live 15-minute debrief. Objective-based (OSINT, Active Directory exploitation, domain controller compromise); no flags or points.',
    targetSummary: '5 Objective Chain to Domain Controller (no flags)',
    scoringNote: 'Objective-based',
  },
  // Modeled on the OffSec OSWE (WEB-300) exam guide and FAQ on help.offsec.com
  // (https://help.offsec.com/hc/en-us/articles/360046869951 and .../360046418812): 47h45m of
  // proctored lab time, 100 points available, 85 to pass, and 24 further hours to send the
  // documentation. Per application: 35 points for the authentication bypass plus 15 for remote code
  // execution. APPROXIMATE: the number of web applications is not stated in the sources we could
  // read, so the 2-app layout below is an approximation.
  OSWE: {
    id: 'OSWE',
    name: 'OffSec OSWE (WEB-300)',
    durationSeconds: 47 * 3600 + 45 * 60, // 171,900s (47h45m)
    passThreshold: 85,
    maxScore: 100,
    requiresAdFullChain: false,
    reportWindowSeconds: 24 * 3600, // 24h to send documentation after the exam
    description: 'Modeled on the published OSWE rules: 47h45m proctored white-box web exam, 100 points available, 85 to pass, with 24 further hours to send documentation. Authentication bypass and remote code execution objectives per web application.',
    targetSummary: '2 Web Apps: Auth Bypass (35) + RCE (15) per app',
  },
};

/**
 * Live regex flag format validator
 */
export function validateFlagFormat(flag: string): FlagValidationResult {
  const trimmed = (flag || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      format: 'invalid',
      label: 'EMPTY',
      description: 'Please enter captured flag string',
    };
  }

  // OffSec MD5 hash format: 32 hex characters
  if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return {
      valid: true,
      format: 'offsec-md5',
      label: 'OFFSEC (MD5)',
      description: 'Valid 32-character hexadecimal flag hash',
    };
  }

  // Hack The Box format: HTB{...}
  if (/^HTB\{[a-zA-Z0-9_!?-]{8,}\}$/i.test(trimmed)) {
    return {
      valid: true,
      format: 'htb',
      label: 'HTB FLAG',
      description: 'Valid Hack The Box flag format',
    };
  }

  // Zero-Point Security CRTO format: CRTO{...}
  if (/^CRTO\{[a-zA-Z0-9_!?-]{6,}\}$/i.test(trimmed)) {
    return {
      valid: true,
      format: 'crto',
      label: 'CRTO FLAG',
      description: 'Valid Zero-Point Security CRTO flag format',
    };
  }

  // TryHackMe format: THM{...}
  if (/^THM\{[a-zA-Z0-9_!?-]{8,}\}$/i.test(trimmed)) {
    return {
      valid: true,
      format: 'thm',
      label: 'THM FLAG',
      description: 'Valid TryHackMe flag format',
    };
  }

  // Generic captured string of reasonable length (6 to 256 characters)
  if (trimmed.length >= 6 && trimmed.length <= 256) {
    return {
      valid: true,
      format: 'custom',
      label: 'CUSTOM FLAG',
      description: 'Custom target proof flag string',
    };
  }

  return {
    valid: false,
    format: 'invalid',
    label: 'INVALID',
    description: 'Flag string is too short or malformed',
  };
}

/**
 * Creates default proof object
 */
export function createDefaultProof(): ExamTargetProof {
  return {
    flagText: '',
    whoamiOutput: '',
    ipconfigOutput: '',
    screenshotTaken: false,
    screenshots: [],
    toolsUsed: '',
    reproductionSteps: '',
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/**
 * Redistributes the points of `boxes` (their current sum is kept exactly) by difficulty weight, keeping each
 * box's user/root ratio. Points move in whole units of the smallest whole user+root split, so every box ends up
 * with whole user and root points and the group total never drifts (largest-remainder rounding).
 */
export function applyWeightedPoints(boxes: ExamBox[]): ExamBox[] {
  if (boxes.length === 0) return boxes;
  const total = boxes.reduce((sum, b) => sum + b.userPoints + b.rootPoints, 0);
  const ref = boxes[0];
  const divisor = gcd(ref.userPoints, ref.rootPoints) || 1;
  const unitUser = ref.userPoints / divisor;
  const unitRoot = ref.rootPoints / divisor;
  const step = unitUser + unitRoot;
  if (step <= 0) return boxes;
  const units = Math.round(total / step);
  const weights = boxes.map((b) => EXAM_DIFFICULTY_WEIGHTS[b.difficulty] ?? 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (units * w) / weightSum);
  const allocated = exact.map((x) => Math.floor(x));
  let leftover = units - allocated.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let k = 0; leftover > 0 && k < byRemainder.length; k++, leftover--) {
    allocated[byRemainder[k].i] += 1;
  }
  return boxes.map((b, i) => ({
    ...b,
    userPoints: allocated[i] * unitUser,
    rootPoints: allocated[i] * unitRoot,
  }));
}

interface CatalogBoxDef {
  key: string;
  ip: string;
  fallbackName: string;
  type: string;
  adRole?: AdRole;
  label: string | ((os: OperatingSystem, difficulty: Difficulty) => string);
  userPoints: number;
  rootPoints: number;
}

const OSCP_BOX_DEFS: CatalogBoxDef[] = [
  { key: 'oscp-ad-1', ip: '192.168.1.30', fallbackName: 'CORP-WEB01', type: 'ad-foothold', adRole: 'foothold', label: 'AD Set: Initial Web Access', userPoints: 10, rootPoints: 0 },
  { key: 'oscp-ad-2', ip: '192.168.1.20', fallbackName: 'CORP-SRV01', type: 'ad-lateral', adRole: 'lateral', label: 'AD Set: Lateral Movement', userPoints: 10, rootPoints: 0 },
  { key: 'oscp-ad-3', ip: '192.168.1.10', fallbackName: 'CORP-DC01', type: 'ad-dc', adRole: 'dc', label: 'AD Set: Domain Controller', userPoints: 0, rootPoints: 20 },
  { key: 'oscp-st-1', ip: '192.168.1.101', fallbackName: 'ALPHA', type: 'standalone-1', label: (os, d) => `Standalone 01 (${os} ${d})`, userPoints: 10, rootPoints: 10 },
  { key: 'oscp-st-2', ip: '192.168.1.102', fallbackName: 'BRAVO', type: 'standalone-2', label: (os, d) => `Standalone 02 (${os} ${d})`, userPoints: 10, rootPoints: 10 },
  { key: 'oscp-st-3', ip: '192.168.1.103', fallbackName: 'CHARLIE', type: 'standalone-3', label: (os, d) => `Standalone 03 (${os} ${d})`, userPoints: 10, rootPoints: 10 },
];

// CPTS Enterprise Network: 14 Flag Objectives across 7 Machines (14 flags totaling 100 points, 85 pt pass threshold)
// Subnets: DMZ Perimeter (10.10.110.0/24), Internal Corporate (172.16.8.0/24), Restricted Vault (172.16.9.0/24)
const CPTS_BOX_DEFS: CatalogBoxDef[] = [
  { key: 'cpts-1', ip: '10.10.110.10', fallbackName: 'INTRANET-WEB', type: 'cpts-dmz-web', label: 'DMZ Perimeter: Public Web Application', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-2', ip: '10.10.110.15', fallbackName: 'DEV-BACKEND', type: 'cpts-internal-dev', label: 'Internal Dev & CI/CD Pipeline', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-3', ip: '172.16.8.50', fallbackName: 'CORP-JUMP', type: 'cpts-corp-jump', label: 'Corporate Jump Host / Dual-Homed Pivot', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-4', ip: '172.16.8.60', fallbackName: 'MSSQL-PROD', type: 'cpts-mssql-prod', label: 'Production Database Tier: MSSQL', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-5', ip: '172.16.8.70', fallbackName: 'WS-FINANCE', type: 'cpts-ws-finance', label: 'Finance Workstation: Kerberos Client', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-6', ip: '172.16.8.25', fallbackName: 'ADCS-PKI', type: 'cpts-adcs-pki', label: 'Active Directory Certificate Services (PKI)', userPoints: 7, rootPoints: 7 },
  { key: 'cpts-7', ip: '172.16.8.5', fallbackName: 'CORP-DC01', type: 'cpts-ad-dc', adRole: 'dc', label: 'Domain Controller: Enterprise Forest Root', userPoints: 8, rootPoints: 8 },
];

const CRTP_BOX_DEFS: CatalogBoxDef[] = [
  { key: 'crtp-1', ip: '10.0.0.3', fallbackName: 'WS01', type: 'crtp-ws', label: 'Initial Workstation Foothold', userPoints: 20, rootPoints: 10 },
  { key: 'crtp-2', ip: '10.0.0.2', fallbackName: 'SRV01', type: 'crtp-srv', label: 'Domain Member Server', userPoints: 20, rootPoints: 15 },
  { key: 'crtp-3', ip: '10.0.0.1', fallbackName: 'DC01', type: 'crtp-dc', label: 'Domain Controller (Forest Root)', userPoints: 0, rootPoints: 35 },
];

/** Builds the exam boxes of a catalog-driven track from the tiered machine selection. */
function buildCatalogBoxes(defs: CatalogBoxDef[], selections: SlotSelection[]): ExamBox[] {
  const byKey = new Map(selections.map((sel) => [sel.slot.key, sel]));
  return defs.map((def) => {
    const sel = byKey.get(def.key);
    const machine = sel?.machine ?? null;
    const slot = sel?.slot;
    const os: OperatingSystem = machine ? machine.os : slot?.os ?? 'Linux';
    const difficulty: Difficulty = machine ? machine.difficulty : slot?.difficulty ?? 'Medium';
    return {
      id: def.key,
      name: machine ? machine.name : def.fallbackName,
      ip: def.ip,
      os,
      difficulty,
      type: def.type,
      ...(def.adRole ? { adRole: def.adRole } : {}),
      ...(machine ? { machineId: machine.id } : {}),
      label: typeof def.label === 'function' ? def.label(os, difficulty) : def.label,
      userPoints: def.userPoints,
      rootPoints: def.rootPoints,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    };
  });
}

export interface GenerateExamTargetsOptions {
  /** Short seed code; the same seed, catalog and solved set give the same machines. A random seed is used when omitted. */
  seed?: string;
  /** Ids of machines the user already solved (used only when a slot cannot be filled otherwise). */
  solvedIds?: Iterable<string>;
  /** Weighted mode bakes the redistributed points into the boxes (OSCP standalones and OSWE only). */
  scoringMode?: ExamScoringMode;
}

/**
 * Generates exam targets matching track specifications. OSCP, CPTS and CRTP fill their slots from the machine
 * catalog (see examTargetSelection.ts); with an empty catalog they use the hardcoded fallback boxes.
 */
export function generateExamTargetsForTrack(
  track: ExamTrack,
  machines: Machine[] = [],
  options: GenerateExamTargetsOptions = {}
): ExamBox[] {
  const seed = options.seed || generateExamSeed();
  const weighted = options.scoringMode === 'weighted' && supportsWeightedScoring(track);
  const selections = () => selectExamMachines(track, machines, { seed, solvedIds: options.solvedIds });

  if (track === 'OSCP') {
    // 2024 PEN-200 standard:
    // AD Set: 40 points total (Foothold 10, Lateral 10, DC 20) - All-or-nothing
    // 3 Standalones: 20 pts each (10 user + 10 root)
    const boxes = buildCatalogBoxes(OSCP_BOX_DEFS, selections());
    if (!weighted) return boxes;
    // Weighted: the AD set stays 40 (all-or-nothing); only the standalones' 60 points are redistributed.
    const adSet = boxes.filter((b) => isActiveDirectoryBox(b));
    const standalones = applyWeightedPoints(boxes.filter((b) => !isActiveDirectoryBox(b)));
    return [...adSet, ...standalones];
  }

  if (track === 'CPTS') {
    return buildCatalogBoxes(CPTS_BOX_DEFS, selections());
  }

  if (track === 'CRTO') {
    // Zero-Point Security CRTO: 8 Red Team Objectives across 2 AD Forests (dev.corp.local & corp.local)
    // 8 flags @ 12.5 pts each = 100 pts. Passing threshold = 75 pts (6 of 8 objectives)
    const crtoObjectives = [
      { id: 'crto-1', name: 'DEV-CLIENT01', ip: '10.10.10.5', os: 'Windows' as OperatingSystem, label: 'Objective 1: Initial Beacon & Malleable C2 Stealth' },
      { id: 'crto-2', name: 'DEV-SRV01', ip: '10.10.10.12', os: 'Windows' as OperatingSystem, label: 'Objective 2: Local PrivEsc & Process Injection' },
      { id: 'crto-3', name: 'DEV-DC01', ip: '10.10.10.2', os: 'Windows' as OperatingSystem, label: 'Objective 3: Active Directory Recon & LAPS Extraction' },
      { id: 'crto-4', name: 'CORP-GW01', ip: '10.10.20.15', os: 'Windows' as OperatingSystem, label: 'Objective 4: Lateral Movement via WinRM / Beacon Jump' },
      { id: 'crto-5', name: 'CORP-SQL01', ip: '10.10.20.30', os: 'Windows' as OperatingSystem, label: 'Objective 5: Domain PrivEsc via Kerberoast / Delegation' },
      { id: 'crto-6', name: 'CORP-CA01', ip: '10.10.20.25', os: 'Windows' as OperatingSystem, label: 'Objective 6: AD CS ESC1 / ESC8 Certificate Abuse' },
      { id: 'crto-7', name: 'CORP-MGMT', ip: '10.10.20.40', os: 'Windows' as OperatingSystem, label: 'Objective 7: Child-to-Parent Cross-Forest Trust Abuse' },
      { id: 'crto-8', name: 'CORP-DC01', ip: '10.10.20.2', os: 'Windows' as OperatingSystem, label: 'Objective 8: Domain Dominance & DCSync Golden Ticket' },
    ];

    return crtoObjectives.map((obj) => ({
      id: obj.id,
      name: obj.name,
      ip: obj.ip,
      os: obj.os,
      difficulty: 'Hard',
      type: 'crto-objective',
      label: obj.label,
      userPoints: 0,
      rootPoints: 12.5,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    }));
  }

  if (track === 'OSEP') {
    // OffSec OSEP (PEN-300): multi-host defended enterprise network (client-side/phishing foothold,
    // AppLocker/AV/EDR evasion, Linux pivot, MSSQL linked-server abuse, child-to-parent domain escalation).
    // Flags total 100 pts; the config pass mark (100 pts) requires the full chain to the forest root.
    const osepTargets = [
      { id: 'osep-1', name: 'CLIENT01', ip: '192.168.50.10', os: 'Windows' as OperatingSystem, difficulty: 'Medium' as const, type: 'osep-client', label: 'Client Workstation: Phishing Foothold & AV/AMSI Evasion', userPoints: 10, rootPoints: 10 },
      { id: 'osep-2', name: 'WEB01', ip: '192.168.50.20', os: 'Linux' as OperatingSystem, difficulty: 'Medium' as const, type: 'osep-linux-pivot', label: 'Linux Web/Jump Host: Kerberos Credential Cache Pivot', userPoints: 5, rootPoints: 10 },
      { id: 'osep-3', name: 'SQL01', ip: '192.168.50.30', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, type: 'osep-mssql', label: 'MSSQL Server: Linked-Server & Constrained Delegation Abuse', userPoints: 5, rootPoints: 10 },
      { id: 'osep-4', name: 'APP01', ip: '192.168.60.15', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, type: 'osep-app', label: 'Hardened App Server: AppLocker / EDR Bypass', userPoints: 5, rootPoints: 10 },
      { id: 'osep-5', name: 'CHILD-DC01', ip: '192.168.60.5', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, type: 'osep-child-dc', label: 'Child Domain Controller: Domain Escalation', userPoints: 0, rootPoints: 15 },
      { id: 'osep-6', name: 'FOREST-DC01', ip: '192.168.70.5', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, type: 'osep-forest-dc', label: 'Forest Root DC: Cross-Domain Trust Abuse (secret.txt)', userPoints: 0, rootPoints: 20 },
    ];

    return osepTargets.map((t) => ({
      ...t,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    }));
  }

  if (track === 'PNPT') {
    // Objective chain modeled on the published PNPT rules. Five objectives at 20 weight each:
    // progress/pacing display only; the track passes when every objective is complete.
    const pnptObjectives = [
      { id: 'pnpt-1', name: 'OSINT-RECON', ip: 'external', os: 'Other' as OperatingSystem, difficulty: 'Easy' as const, label: 'Objective 1: OSINT & Attack Surface Intelligence' },
      { id: 'pnpt-2', name: 'EXT-PERIMETER', ip: '10.10.10.10', os: 'Linux' as OperatingSystem, difficulty: 'Medium' as const, label: 'Objective 2: External Perimeter Breach' },
      { id: 'pnpt-3', name: 'INT-WS01', ip: '10.10.20.21', os: 'Windows' as OperatingSystem, difficulty: 'Medium' as const, label: 'Objective 3: Internal Foothold with A/V & Egress Bypass' },
      { id: 'pnpt-4', name: 'INT-SRV01', ip: '10.10.20.30', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, label: 'Objective 4: Lateral & Vertical Movement' },
      { id: 'pnpt-5', name: 'CORP-DC01', ip: '10.10.20.5', os: 'Windows' as OperatingSystem, difficulty: 'Hard' as const, label: 'Objective 5: Domain Controller Compromise', dc: true },
    ];

    return pnptObjectives.map((obj) => ({
      id: obj.id,
      name: obj.name,
      ip: obj.ip,
      os: obj.os,
      difficulty: obj.difficulty,
      type: 'pnpt-objective',
      ...(obj.dc ? { adRole: 'dc' as const } : {}),
      label: obj.label,
      userPoints: 0,
      rootPoints: 20,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    }));
  }

  if (track === 'OSWE') {
    // White-box web exam: per application, an authentication bypass (user stage, 35 pts) and remote code
    // execution (root stage, 15 pts). The number of apps is approximate; see the OSWE config comment.
    // Official mode keeps both apps at Hard. Weighted mode draws two distinct difficulties from the seed so the
    // redistribution has something to weigh.
    const oswe = [
      { id: 'oswe-1', name: 'WEBAPP-1', ip: '192.168.50.11', label: 'Web App 1: Authentication Bypass + Remote Code Execution' },
      { id: 'oswe-2', name: 'WEBAPP-2', ip: '192.168.50.12', label: 'Web App 2: Authentication Bypass + Remote Code Execution' },
    ];
    const difficulties: Difficulty[] = weighted
      ? shuffleWithRng<Difficulty>(['Medium', 'Hard', 'Insane'], createRng(`${seed}:oswe`))
      : ['Hard', 'Hard'];
    const boxes: ExamBox[] = oswe.map((app, i) => ({
      ...app,
      os: 'Linux' as OperatingSystem,
      difficulty: difficulties[i],
      type: 'oswe-webapp',
      userPoints: 35,
      rootPoints: 15,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    }));
    return weighted ? applyWeightedPoints(boxes) : boxes;
  }

  // Fallback / CRTP default
  return buildCatalogBoxes(CRTP_BOX_DEFS, selections());
}

export interface ExamScoreResult {
  totalScore: number;
  passThreshold: number;
  maxScore: number;
  isPassing: boolean;
  pointsNeeded: number;
  adSetCompromised: boolean;
  /** Legacy OSCP bonus actually added to totalScore (0 unless legacy mode is on and the exam score is above 0). */
  bonusPointsAwarded: number;
  complianceIssues: string[];
  isCompliant: boolean;
}

/**
 * Computes score, passing status, and compliance risks
 */
export function calculateExamScore(
  track: ExamTrack,
  boxes: ExamBox[],
  options?: { includeBonusPoints?: boolean }
): ExamScoreResult {
  const config = EXAM_TRACK_CONFIGS[track] || EXAM_TRACK_CONFIGS.OSCP;
  let totalScore = 0;
  const passThreshold = config.passThreshold;
  const maxScore = config.maxScore;
  let adSetCompromised = false;
  let bonusPointsAwarded = 0;

  // Track-specific rules:
  if (track === 'OSCP') {
    // Check AD set (all or nothing per OffSec 2024 guide)
    const adBoxes = boxes.filter((b) => isActiveDirectoryBox(b));
    const allAdPwned =
      adBoxes.length > 0 &&
      adBoxes.every((b) => (b.userPoints === 0 || b.userPwned) && (b.rootPoints === 0 || b.rootPwned));

    adSetCompromised = allAdPwned;

    if (allAdPwned) {
      adBoxes.forEach((b) => {
        if (b.userPwned) totalScore += b.userPoints;
        if (b.rootPwned) totalScore += b.rootPoints;
      });
    }

    // Standalone boxes score independently
    boxes
      .filter((b) => !isActiveDirectoryBox(b))
      .forEach((b) => {
        if (b.userPwned) totalScore += b.userPoints;
        if (b.rootPwned) totalScore += b.rootPoints;
      });

    // Legacy (pre-Nov 2024) 10-point lab exercises bonus. Sensible guard rather than a quoted OffSec rule:
    // the bonus never turns a zero-point exam into a scoring one.
    if (options?.includeBonusPoints && totalScore > 0) {
      const withBonus = Math.min(maxScore, totalScore + 10);
      bonusPointsAwarded = withBonus - totalScore;
      totalScore = withBonus;
    }
  } else {
    // CPTS, CRTO, etc.
    boxes.forEach((b) => {
      if (b.userPwned) totalScore += b.userPoints;
      if (b.rootPwned) totalScore += b.rootPoints;
    });

    const adBoxes = boxes.filter((b) => isActiveDirectoryBox(b));
    adSetCompromised =
      adBoxes.length === 0 ||
      adBoxes.every((b) => (b.userPoints === 0 || b.userPwned) && (b.rootPoints === 0 || b.rootPwned));
  }

  const isPassing = totalScore >= passThreshold;
  const pointsNeeded = Math.max(0, passThreshold - totalScore);

  // Compliance Audit: Check for missing proofs on claimed points
  const complianceIssues: string[] = [];
  const objectiveModel = config.scoringModel === 'objective';
  boxes.forEach((b) => {
    if (objectiveModel) {
      // Objective exams have no flag files: the evidence is a screenshot or a written note per objective.
      if (b.rootPwned && b.rootPoints > 0) {
        const hasEvidence = Boolean(
          b.rootProof?.screenshotTaken ||
            (b.rootProof?.screenshots && b.rootProof.screenshots.length > 0) ||
            b.rootProof?.reproductionSteps?.trim()
        );
        if (!hasEvidence) {
          complianceIssues.push(`${b.name}: Objective evidence (screenshot or reproduction notes) is missing`);
        }
      }
      return;
    }
    if (b.userPwned && b.userPoints > 0) {
      if (!b.userProof?.flagText?.trim()) {
        complianceIssues.push(`${b.name}: User flag text is missing`);
      }
      if (!b.userProof?.whoamiOutput?.trim()) {
        complianceIssues.push(`${b.name}: whoami command output missing for User proof`);
      }
      if (!b.userProof?.ipconfigOutput?.trim()) {
        complianceIssues.push(`${b.name}: ipconfig/ifconfig output missing for User proof`);
      }
      const hasScreenshot = Boolean(
        b.userProof?.screenshotTaken ||
          (b.userProof?.screenshots && b.userProof.screenshots.length > 0)
      );
      if (!hasScreenshot) {
        complianceIssues.push(`${b.name}: Mandatory User proof screenshot is not confirmed`);
      }
    }

    if (b.rootPwned && b.rootPoints > 0) {
      if (!b.rootProof?.flagText?.trim()) {
        complianceIssues.push(`${b.name}: Root flag text is missing`);
      }
      if (!b.rootProof?.whoamiOutput?.trim()) {
        complianceIssues.push(`${b.name}: whoami output missing for Root/SYSTEM proof`);
      }
      if (!b.rootProof?.ipconfigOutput?.trim()) {
        complianceIssues.push(`${b.name}: ipconfig/ifconfig output missing for Root/SYSTEM proof`);
      }
      const hasScreenshot = Boolean(
        b.rootProof?.screenshotTaken ||
          (b.rootProof?.screenshots && b.rootProof.screenshots.length > 0)
      );
      if (!hasScreenshot) {
        complianceIssues.push(`${b.name}: Mandatory Root/SYSTEM proof screenshot is not confirmed`);
      }
    }
  });

  return {
    totalScore,
    passThreshold,
    maxScore,
    isPassing,
    pointsNeeded,
    adSetCompromised,
    bonusPointsAwarded,
    complianceIssues,
    isCompliant: complianceIssues.length === 0,
  };
}

/**
 * Calculates passing status badge indicator: Passing, In Progress, or Critical
 */
export function getPassingStatus(
  score: number,
  passThreshold: number,
  remainingSeconds: number,
  isExpired: boolean,
  adRequiredAndMissing: boolean = false
): PassingStatus {
  if (score >= passThreshold && !adRequiredAndMissing) {
    return 'Passing';
  }
  if (isExpired || remainingSeconds <= 7200) {
    return 'Critical';
  }
  return 'In Progress';
}

/**
 * Generates an official OffSec / HTB format submission Markdown report
 */
export function generateExamReportMarkdown(session: ExamSessionState): string {
  const scoreData = calculateExamScore(session.track, session.boxes, {
    includeBonusPoints: session.includeBonusPoints,
  });
  const examDate = new Date(session.examStartedAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const trackConfig = EXAM_TRACK_CONFIGS[session.track] || EXAM_TRACK_CONFIGS.OSCP;

  let report = `# ${trackConfig.name.toUpperCase()} // OFFICIAL ASSESSMENT & PENETRATION TESTING REPORT

**Candidate Name:** ${session.candidateName || 'Daniel Dayan'}  
**Callsign / Handle:** ${session.candidateCallsign || '0xdnd'}  
**OSID:** ${session.osid || 'OS-94821'}  
**Exam Track:** ${trackConfig.name} (Passing Threshold: ${scoreData.passThreshold} Points)  
**Date of Assessment:** ${examDate}  
**Assessment Result:** ${scoreData.isPassing ? '**PASSED (REQUIREMENTS SATISFIED)**' : '**IN PROGRESS / FAILED**'}  
**Total Points Achieved:** **${scoreData.totalScore} / ${scoreData.maxScore} PTS**  
**Compliance Verification:** ${scoreData.isCompliant ? '100% COMPLIANT (All proof criteria satisfied)' : `WARNING: ${scoreData.complianceIssues.length} compliance checklist items incomplete`}

---

## 1. Executive Summary & Scoring Matrix

| Target System | Role / Type | IP Address | Foothold (User) | Privilege Escalation (Root/SYSTEM) | Points Awarded |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  session.boxes.forEach((b) => {
    const userStatus = b.userPoints === 0 ? 'N/A' : b.userPwned ? `[x] PWNED (+${b.userPoints})` : '[ ] FAILED (0)';
    const rootStatus = b.rootPoints === 0 ? 'N/A' : b.rootPwned ? `[x] PWNED (+${b.rootPoints})` : '[ ] FAILED (0)';
    let pts = 0;
    if (session.track === 'OSCP' && b.type.startsWith('ad-')) {
      pts = scoreData.adSetCompromised ? (b.userPwned ? b.userPoints : 0) + (b.rootPwned ? b.rootPoints : 0) : 0;
    } else {
      pts = (b.userPwned ? b.userPoints : 0) + (b.rootPwned ? b.rootPoints : 0);
    }
    report += `| **${b.name}** | ${b.label} | \`${b.ip}\` | ${userStatus} | ${rootStatus} | **${pts} PTS** |\n`;
  });

  if (session.track === 'OSCP' && session.includeBonusPoints && scoreData.bonusPointsAwarded > 0) {
    report += `| **OFFSEC BONUS LABS** | Official Lab Bonus | \`N/A\` | [x] COMPLETED | [x] COMPLETED | **${scoreData.bonusPointsAwarded} PTS** |\n`;
  }

  report += `
**TOTAL POINTS EARNED:** **${scoreData.totalScore} / ${scoreData.maxScore} PTS**  
**MINIMUM PASSING SCORE:** **${scoreData.passThreshold} PTS**  

`;

  if (scoreData.complianceIssues.length > 0) {
    report += `### ⚠️ Compliance Warning Log\n`;
    scoreData.complianceIssues.forEach((issue) => {
      report += `- [ ] *Non-Compliance Risk:* ${issue}\n`;
    });
    report += `\n`;
  }

  report += `---

## 2. Target Technical Proofs & Exploitation Evidence

`;

  session.boxes.forEach((b, idx) => {
    report += `### 2.${idx + 1} Target: ${b.name} (\`${b.ip}\` - ${b.os})\n\n`;
    report += `- **Role:** ${b.label}\n`;
    report += `- **Difficulty:** ${b.difficulty}\n`;
    report += `- **Operating System:** ${b.os}\n\n`;

    if (b.userPoints > 0) {
      const hasScreenshots = b.userProof?.screenshots && b.userProof.screenshots.length > 0;
      report += `#### 2.${idx + 1}.1 Initial Access / User Flag Proof\n`;
      report += `- **Flag String:** \`${b.userProof?.flagText || 'NOT_CAPTURED'}\`\n`;
      report += `- **Proof Screenshot Recorded:** ${b.userProof?.screenshotTaken || hasScreenshots ? 'YES [x]' : 'NO [ ]'}\n`;
      if (b.userProof?.whoamiOutput) {
        report += `\n\`whoami\` Output:\n\`\`\`bash\n${b.userProof.whoamiOutput}\n\`\`\`\n`;
      }
      if (b.userProof?.ipconfigOutput) {
        report += `\n\`ipconfig / ifconfig\` Output:\n\`\`\`bash\n${b.userProof.ipconfigOutput}\n\`\`\`\n`;
      }
      if (hasScreenshots && b.userProof?.screenshots) {
        report += `\nScreenshots Attached: ${b.userProof.screenshots.length}\n`;
        b.userProof.screenshots.forEach((sc, scIdx) => {
          report += `- Screenshot ${scIdx + 1}: ${sc.caption || 'Terminal Proof'} (${sc.timestamp})\n`;
        });
      }
      report += `\n`;
    }

    if (b.rootPoints > 0) {
      const hasScreenshots = b.rootProof?.screenshots && b.rootProof.screenshots.length > 0;
      report += `#### 2.${idx + 1}.2 Privilege Escalation / Root Flag Proof\n`;
      report += `- **Flag String:** \`${b.rootProof?.flagText || 'NOT_CAPTURED'}\`\n`;
      report += `- **Proof Screenshot Recorded:** ${b.rootProof?.screenshotTaken || hasScreenshots ? 'YES [x]' : 'NO [ ]'}\n`;
      if (b.rootProof?.whoamiOutput) {
        report += `\n\`whoami\` Output:\n\`\`\`bash\n${b.rootProof.whoamiOutput}\n\`\`\`\n`;
      }
      if (b.rootProof?.ipconfigOutput) {
        report += `\n\`ipconfig / ifconfig\` Output:\n\`\`\`bash\n${b.rootProof.ipconfigOutput}\n\`\`\`\n`;
      }
      if (hasScreenshots && b.rootProof?.screenshots) {
        report += `\nScreenshots Attached: ${b.rootProof.screenshots.length}\n`;
        b.rootProof.screenshots.forEach((sc, scIdx) => {
          report += `- Screenshot ${scIdx + 1}: ${sc.caption || 'Terminal Proof'} (${sc.timestamp})\n`;
        });
      }
      report += `\n`;
    }

    report += `---\n\n`;
  });

  report += `## 3. Candidate Operational Scratchpad & Notes\n\n`;
  report += `${session.scratchNotes || 'No additional scratchpad notes provided.'}\n\n`;
  report += `---\n*Generated by ZeroBox Tactical CTF Platform // Operator: Daniel Dayan*\n`;

  return report;
}
