/**
 * examComplianceUtils.ts
 * OffSec / CPTS Exam Compliance & Proof Verification Engine
 * Dynamic 100-Point Scoring, Regex Flag Validation, & Submission Document Generator.
 */

import { OperatingSystem, Difficulty, Machine } from '../types';

export type ExamTrack = 'OSCP' | 'CPTS' | 'OSEP' | 'CRTP';

export interface ExamTargetProof {
  flagText: string;
  whoamiOutput: string;
  ipconfigOutput: string;
  screenshotTaken: boolean;
  toolsUsed?: string;
  reproductionSteps?: string;
}

export interface ExamBox {
  id: string;
  name: string;
  ip: string;
  os: OperatingSystem;
  difficulty: Difficulty;
  type: string;
  label: string;
  userPoints: number;
  rootPoints: number;
  userPwned: boolean;
  rootPwned: boolean;
  userProof: ExamTargetProof;
  rootProof: ExamTargetProof;
}

export interface ExamSessionState {
  track: ExamTrack;
  examStartedAt: number;
  examDurationSeconds: number;
  examExpiresAt: number | null;
  isTimerRunning: boolean;
  timerPausedRemainingSeconds: number | null;
  boxes: ExamBox[];
  scratchNotes: string;
  candidateName: string;
  candidateCallsign: string;
  osid: string;
}

export interface FlagValidationResult {
  valid: boolean;
  format: 'offsec-md5' | 'htb' | 'thm' | 'custom' | 'invalid';
  label: string;
  description: string;
}

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
  if (/^HTB\{[a-zA-Z0-9_!?-]{12,}\}$/i.test(trimmed)) {
    return {
      valid: true,
      format: 'htb',
      label: 'HTB FLAG',
      description: 'Valid Hack The Box flag format',
    };
  }

  // TryHackMe format: THM{...}
  if (/^THM\{[a-zA-Z0-9_!?-]{12,}\}$/i.test(trimmed)) {
    return {
      valid: true,
      format: 'thm',
      label: 'THM FLAG',
      description: 'Valid TryHackMe flag format',
    };
  }

  // Generic captured string of reasonable length
  if (trimmed.length >= 6) {
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
 * Generates realistic exam targets matching track specifications
 */
export function generateExamTargetsForTrack(track: ExamTrack, machines: Machine[]): ExamBox[] {
  const adMachines = machines.filter(
    (m) =>
      m.tags.some((t) => t.toLowerCase().includes('active directory') || t.toLowerCase().includes('activedirectory') || t.toLowerCase().includes('kerberos'))
  );
  const linuxMachines = machines.filter((m) => m.os === 'Linux');
  const winMachines = machines.filter((m) => m.os === 'Windows');

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

  const createDefaultProof = (): ExamTargetProof => ({
    flagText: '',
    whoamiOutput: '',
    ipconfigOutput: '',
    screenshotTaken: false,
    toolsUsed: '',
    reproductionSteps: '',
  });

  if (track === 'OSCP') {
    // 2024 PEN-200 standard:
    // AD Set: 40 points total (Foothold 10, Lateral 10, DC 20)
    // 3 Standalones: 20 pts each (10 user + 10 root)
    const adDc = shuffle(adMachines)[0] || { name: 'CORP-DC01', ip: '192.168.1.10', os: 'Windows' as OperatingSystem };
    const adLat = shuffle(winMachines)[0] || { name: 'CORP-SRV01', ip: '192.168.1.20', os: 'Windows' as OperatingSystem };
    const adFoot = shuffle(linuxMachines)[0] || { name: 'CORP-WEB01', ip: '192.168.1.30', os: 'Linux' as OperatingSystem };

    const stand1 = shuffle(linuxMachines)[0] || { name: 'ALPHA', ip: '192.168.1.101', os: 'Linux' as OperatingSystem };
    const stand2 = shuffle(winMachines)[1] || { name: 'BRAVO', ip: '192.168.1.102', os: 'Windows' as OperatingSystem };
    const stand3 = shuffle(linuxMachines)[1] || { name: 'CHARLIE', ip: '192.168.1.103', os: 'Linux' as OperatingSystem };

    return [
      {
        id: 'oscp-ad-1',
        name: adFoot.name,
        ip: '192.168.1.30',
        os: adFoot.os,
        difficulty: 'Easy',
        type: 'ad-foothold',
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
    // CPTS Proving Network: 6 Machines simulating enterprise DMZ & Internal Corporate Domain
    const dmzWeb = shuffle(linuxMachines)[0] || { name: 'INTRANET-WEB', ip: '10.10.110.10', os: 'Linux' as OperatingSystem };
    const devSrv = shuffle(linuxMachines)[1] || { name: 'DEV-BACKEND', ip: '10.10.110.15', os: 'Linux' as OperatingSystem };
    const corpJump = shuffle(winMachines)[0] || { name: 'CORP-JUMP', ip: '172.16.8.50', os: 'Windows' as OperatingSystem };
    const corpSql = shuffle(winMachines)[1] || { name: 'MSSQL-PROD', ip: '172.16.8.60', os: 'Windows' as OperatingSystem };
    const corpDc = shuffle(adMachines)[0] || { name: 'CORP-DC', ip: '172.16.8.5', os: 'Windows' as OperatingSystem };
    const backupBox = shuffle(linuxMachines)[2] || { name: 'VAULT-BACKUP', ip: '172.16.9.10', os: 'Linux' as OperatingSystem };

    return [
      {
        id: 'cpts-1',
        name: dmzWeb.name,
        ip: '10.10.110.10',
        os: dmzWeb.os,
        difficulty: 'Medium',
        type: 'cpts-dmz',
        label: 'DMZ Perimeter: Web App Service',
        userPoints: 10,
        rootPoints: 10,
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
        type: 'cpts-dev',
        label: 'Internal Dev & CI/CD Pipeline',
        userPoints: 10,
        rootPoints: 10,
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
        type: 'cpts-jump',
        label: 'Corporate Jump Host / Dual-Homed',
        userPoints: 10,
        rootPoints: 10,
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
        type: 'cpts-sql',
        label: 'Production Database Tier',
        userPoints: 10,
        rootPoints: 10,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
      {
        id: 'cpts-5',
        name: corpDc.name,
        ip: '172.16.8.5',
        os: 'Windows',
        difficulty: 'Hard',
        type: 'cpts-dc',
        label: 'Active Directory Domain Controller',
        userPoints: 0,
        rootPoints: 20,
        userPwned: false,
        rootPwned: false,
        userProof: createDefaultProof(),
        rootProof: createDefaultProof(),
      },
    ];
  }

  // Fallback / CRTP / OSEP default
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

/**
 * Computes score, passing status, and compliance risks
 */
export function calculateExamScore(track: ExamTrack, boxes: ExamBox[]) {
  let totalScore = 0;
  const passThreshold = track === 'CPTS' ? 85 : track === 'CRTP' ? 100 : 70;
  const maxScore = 100;

  // Track-specific rules:
  if (track === 'OSCP') {
    // Check AD set (all or nothing per OffSec 2024 guide)
    const adBoxes = boxes.filter((b) => b.type.startsWith('ad-'));
    const allAdPwned = adBoxes.every((b) => (b.userPoints === 0 || b.userPwned) && (b.rootPoints === 0 || b.rootPwned));

    if (allAdPwned) {
      adBoxes.forEach((b) => {
        if (b.userPwned) totalScore += b.userPoints;
        if (b.rootPwned) totalScore += b.rootPoints;
      });
    }

    // Standalone boxes score independently
    boxes
      .filter((b) => !b.type.startsWith('ad-'))
      .forEach((b) => {
        if (b.userPwned) totalScore += b.userPoints;
        if (b.rootPwned) totalScore += b.rootPoints;
      });
  } else {
    boxes.forEach((b) => {
      if (b.userPwned) totalScore += b.userPoints;
      if (b.rootPwned) totalScore += b.rootPoints;
    });
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
      if (!b.userProof?.screenshotTaken) {
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
      if (!b.rootProof?.screenshotTaken) {
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
    complianceIssues,
    isCompliant: complianceIssues.length === 0,
  };
}

/**
 * Generates an official OffSec / HTB format submission Markdown report
 */
export function generateExamReportMarkdown(session: ExamSessionState): string {
  const scoreData = calculateExamScore(session.track, session.boxes);
  const examDate = new Date(session.examStartedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let report = `# OFFSEC CERTIFIED PROFESSIONAL // OFFICIAL PENETRATION TESTING REPORT

**Candidate Name:** ${session.candidateName || 'Daniel Dayan'}  
**Callsign / Handle:** ${session.candidateCallsign || '0xdnd'}  
**OSID:** ${session.osid || 'OS-94821'}  
**Exam Track:** ${session.track} (Passing Threshold: ${scoreData.passThreshold} Points)  
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
    const pts = (b.userPwned ? b.userPoints : 0) + (b.rootPwned ? b.rootPoints : 0);
    report += `| **${b.name}** | ${b.label} | \`${b.ip}\` | ${userStatus} | ${rootStatus} | **${pts} PTS** |
`;
  });

  report += `
**TOTAL POINTS EARNED:** **${scoreData.totalScore} / ${scoreData.maxScore} PTS**  
`;
  report += `**MINIMUM PASSING SCORE:** **${scoreData.passThreshold} PTS**  

`;

  if (scoreData.complianceIssues.length > 0) {
    report += `### ⚠️ Compliance Warning Log
`;
    session.boxes.forEach((b) => {
      // List issues
    });
    scoreData.complianceIssues.forEach((issue) => {
      report += `- [ ] *Non-Compliance Risk:* ${issue}
`;
    });
    report += `
`;
  }

  report += `---

## 2. Target Technical Proofs & Exploitation Evidence

`;

  session.boxes.forEach((b, idx) => {
    report += `### 2.${idx + 1} Target: ${b.name} (\`${b.ip}\` - ${b.os})

`;
    report += `- **Role:** ${b.label}
`;
    report += `- **Difficulty:** ${b.difficulty}
`;
    report += `- **Operating System:** ${b.os}

`;

    if (b.userPoints > 0) {
      report += `#### 2.${idx + 1}.1 Initial Access / User Flag Proof
`;
      report += `- **Flag String:** \`${b.userProof.flagText || 'NOT_CAPTURED'}\`
`;
      report += `- **Proof Screenshot Recorded:** ${b.userProof.screenshotTaken ? 'YES [x]' : 'NO [ ]'}
`;
      if (b.userProof.whoamiOutput) {
        report += `
\`whoami\` Output:
\`\`\`bash
${b.userProof.whoamiOutput}
\`\`\`
`;
      }
      if (b.userProof.ipconfigOutput) {
        report += `
\`ipconfig / ifconfig\` Output:
\`\`\`bash
${b.userProof.ipconfigOutput}
\`\`\`
`;
      }
      report += `
`;
    }

    if (b.rootPoints > 0) {
      report += `#### 2.${idx + 1}.2 Privilege Escalation / Root Flag Proof
`;
      report += `- **Flag String:** \`${b.rootProof.flagText || 'NOT_CAPTURED'}\`
`;
      report += `- **Proof Screenshot Recorded:** ${b.rootProof.screenshotTaken ? 'YES [x]' : 'NO [ ]'}
`;
      if (b.rootProof.whoamiOutput) {
        report += `
\`whoami\` Output:
\`\`\`bash
${b.rootProof.whoamiOutput}
\`\`\`
`;
      }
      if (b.rootProof.ipconfigOutput) {
        report += `
\`ipconfig / ifconfig\` Output:
\`\`\`bash
${b.rootProof.ipconfigOutput}
\`\`\`
`;
      }
      report += `
`;
    }

    report += `---

`;
  });

  report += `## 3. Candidate Operational Scratchpad & Notes

`;
  report += `${session.scratchNotes || 'No additional scratchpad notes provided.'}

`;

  report += `---
*Generated by ZeroBox Tactical CTF Platform // Operator: Daniel Dayan*
`;

  return report;
}
