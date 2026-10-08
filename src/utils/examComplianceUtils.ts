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

export type ExamTrack = 'OSCP' | 'CPTS' | 'CRTO' | 'OSEP' | 'CRTP';
export type PassingStatus = 'Passing' | 'In Progress' | 'Critical';

export interface ScreenshotProof {
  id: string;
  dataUrl: string; // Base64 data:image/...
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
}

export interface FlagValidationResult {
  valid: boolean;
  format: 'offsec-md5' | 'htb' | 'crto' | 'thm' | 'custom' | 'invalid';
  label: string;
  description: string;
}

export interface ExamTrackConfig {
  id: ExamTrack;
  name: string;
  durationSeconds: number;
  passThreshold: number;
  maxScore: number;
  requiresAdFullChain: boolean;
  description: string;
  targetSummary: string;
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

/**
 * Generates realistic exam targets matching track specifications
 */
export function generateExamTargetsForTrack(track: ExamTrack, machines: Machine[] = []): ExamBox[] {
  const adMachines = machines.filter(
    (m) =>
      m.tags.some(
        (t) =>
          t.toLowerCase().includes('active directory') ||
          t.toLowerCase().includes('activedirectory') ||
          t.toLowerCase().includes('kerberos')
      )
  );
  const linuxMachines = machines.filter((m) => m.os === 'Linux');
  const winMachines = machines.filter((m) => m.os === 'Windows');

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

  if (track === 'OSCP') {
    // 2024 PEN-200 standard:
    // AD Set: 40 points total (Foothold 10, Lateral 10, DC 20) — All-or-nothing
    // 3 Standalones: 20 pts each (10 user + 10 root)
    const adDc = shuffle(adMachines)[0] || { name: 'CORP-DC01', ip: '192.168.1.10', os: 'Windows' as OperatingSystem };
    const adLat = shuffle(winMachines)[0] || { name: 'CORP-SRV01', ip: '192.168.1.20', os: 'Windows' as OperatingSystem };
    const adFoot = shuffle(linuxMachines)[0] || { name: 'CORP-WEB01', ip: '192.168.1.30', os: 'Linux' as OperatingSystem };

    const stand1 = shuffle(linuxMachines)[1] || { name: 'ALPHA', ip: '192.168.1.101', os: 'Linux' as OperatingSystem };
    const stand2 = shuffle(winMachines)[1] || { name: 'BRAVO', ip: '192.168.1.102', os: 'Windows' as OperatingSystem };
    const stand3 = shuffle(linuxMachines)[2] || { name: 'CHARLIE', ip: '192.168.1.103', os: 'Linux' as OperatingSystem };

    return [
      {
        id: 'oscp-ad-1',
        name: adFoot.name,
        ip: '192.168.1.30',
        os: adFoot.os,
        difficulty: 'Easy',
        type: 'ad-foothold',
        adRole: 'foothold',
        label: 'AD Set: Initial Web Access',
        userPoints: 10,
        rootPoints: 0,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'oscp-ad-2',
        name: adLat.name,
        ip: '192.168.1.20',
        os: adLat.os,
        difficulty: 'Medium',
        type: 'ad-lateral',
        adRole: 'lateral',
        label: 'AD Set: Lateral Movement',
        userPoints: 10,
        rootPoints: 0,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'oscp-ad-3',
        name: adDc.name,
        ip: '192.168.1.10',
        os: 'Windows',
        difficulty: 'Hard',
        type: 'ad-dc',
        adRole: 'dc',
        label: 'AD Set: Domain Controller',
        userPoints: 0,
        rootPoints: 20,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'oscp-st-1',
        name: stand1.name,
        ip: '192.168.1.101',
        os: stand1.os,
        difficulty: 'Easy',
        type: 'standalone-1',
        label: 'Standalone 01 (Linux Easy)',
        userPoints: 10,
        rootPoints: 10,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'oscp-st-2',
        name: stand2.name,
        ip: '192.168.1.102',
        os: stand2.os,
        difficulty: 'Medium',
        type: 'standalone-2',
        label: 'Standalone 02 (Windows Medium)',
        userPoints: 10,
        rootPoints: 10,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'oscp-st-3',
        name: stand3.name,
        ip: '192.168.1.103',
        os: stand3.os,
        difficulty: 'Hard',
        type: 'standalone-3',
        label: 'Standalone 03 (Linux Hard)',
        userPoints: 10,
        rootPoints: 10,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
    ];
  }

  if (track === 'CPTS') {
    // CPTS Enterprise Network: 14 Flag Objectives across 7 Machines (14 flags totaling 100 points, 85 pt pass threshold)
    // Subnets: DMZ Perimeter (10.10.110.0/24), Internal Corporate (172.16.8.0/24), Restricted Vault (172.16.9.0/24)
    const dmzWeb = shuffle(linuxMachines)[0] || { name: 'INTRANET-WEB', ip: '10.10.110.10', os: 'Linux' as OperatingSystem };
    const devSrv = shuffle(linuxMachines)[1] || { name: 'DEV-BACKEND', ip: '10.10.110.15', os: 'Linux' as OperatingSystem };
    const corpJump = shuffle(winMachines)[0] || { name: 'CORP-JUMP', ip: '172.16.8.50', os: 'Windows' as OperatingSystem };
    const corpSql = shuffle(winMachines)[1] || { name: 'MSSQL-PROD', ip: '172.16.8.60', os: 'Windows' as OperatingSystem };
    const wsFinance = shuffle(winMachines)[2] || { name: 'WS-FINANCE', ip: '172.16.8.70', os: 'Windows' as OperatingSystem };
    const adcsPki = shuffle(winMachines)[3] || { name: 'ADCS-PKI', ip: '172.16.8.25', os: 'Windows' as OperatingSystem };
    const corpDc = shuffle(adMachines)[0] || { name: 'CORP-DC01', ip: '172.16.8.5', os: 'Windows' as OperatingSystem };

    return [
      {
        id: 'cpts-1',
        name: dmzWeb.name,
        ip: '10.10.110.10',
        os: dmzWeb.os,
        difficulty: 'Medium',
        type: 'cpts-dmz-web',
        label: 'DMZ Perimeter: Public Web Application',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-2',
        name: devSrv.name,
        ip: '10.10.110.15',
        os: devSrv.os,
        difficulty: 'Medium',
        type: 'cpts-internal-dev',
        label: 'Internal Dev & CI/CD Pipeline',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-3',
        name: corpJump.name,
        ip: '172.16.8.50',
        os: corpJump.os,
        difficulty: 'Medium',
        type: 'cpts-corp-jump',
        label: 'Corporate Jump Host / Dual-Homed Pivot',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-4',
        name: corpSql.name,
        ip: '172.16.8.60',
        os: corpSql.os,
        difficulty: 'Hard',
        type: 'cpts-mssql-prod',
        label: 'Production Database Tier: MSSQL',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-5',
        name: wsFinance.name,
        ip: '172.16.8.70',
        os: wsFinance.os,
        difficulty: 'Medium',
        type: 'cpts-ws-finance',
        label: 'Finance Workstation: Kerberos Client',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-6',
        name: adcsPki.name,
        ip: '172.16.8.25',
        os: adcsPki.os,
        difficulty: 'Hard',
        type: 'cpts-adcs-pki',
        label: 'Active Directory Certificate Services (PKI)',
        userPoints: 7,
        rootPoints: 7,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-7',
        name: corpDc.name,
        ip: '172.16.8.5',
        os: 'Windows',
        difficulty: 'Hard',
        type: 'cpts-ad-dc',
        adRole: 'dc',
        label: 'Domain Controller: Enterprise Forest Root',
        userPoints: 8,
        rootPoints: 8,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
    ];
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

  // Fallback / CRTP default
  const dc1 = shuffle(adMachines)[0] || { name: 'DC01', ip: '10.0.0.1', os: 'Windows' as OperatingSystem };
  const srv1 = shuffle(winMachines)[0] || { name: 'SRV01', ip: '10.0.0.2', os: 'Windows' as OperatingSystem };
  const ws1 = shuffle(winMachines)[1] || { name: 'WS01', ip: '10.0.0.3', os: 'Windows' as OperatingSystem };

  return [
    {
      id: 'crtp-1',
      name: ws1.name,
      ip: '10.0.0.3',
      os: ws1.os,
      difficulty: 'Medium',
      type: 'crtp-ws',
      label: 'Initial Workstation Foothold',
      userPoints: 20,
      rootPoints: 10,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    },
    {
      id: 'crtp-2',
      name: srv1.name,
      ip: '10.0.0.2',
      os: srv1.os,
      difficulty: 'Medium',
      type: 'crtp-srv',
      label: 'Domain Member Server',
      userPoints: 20,
      rootPoints: 15,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    },
    {
      id: 'crtp-3',
      name: dc1.name,
      ip: '10.0.0.1',
      os: 'Windows',
      difficulty: 'Hard',
      type: 'crtp-dc',
      label: 'Domain Controller (Forest Root)',
      userPoints: 0,
      rootPoints: 35,
      userPwned: false,
      rootPwned: false,
      userProof: createDefaultProof(),
      rootProof: createDefaultProof(),
    },
  ];
}

export interface ExamScoreResult {
  totalScore: number;
  passThreshold: number;
  maxScore: number;
  isPassing: boolean;
  pointsNeeded: number;
  adSetCompromised: boolean;
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

    // Optional 10-point lab exercises bonus
    if (options?.includeBonusPoints) {
      totalScore = Math.min(maxScore, totalScore + 10);
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
  boxes.forEach((b) => {
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

  if (session.track === 'OSCP' && session.includeBonusPoints) {
    report += `| **OFFSEC BONUS LABS** | Official Lab Bonus | \`N/A\` | [x] COMPLETED | [x] COMPLETED | **10 PTS** |\n`;
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
