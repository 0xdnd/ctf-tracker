/**
 * examReportGenerator.ts
 * ZeroBox Tactical Certification Exam Simulator & Mission HUD
 * 
 * 1-Click Submission-Ready Exam Report Generator (R5 / Milestone 4)
 * Authentic markdown and zero-egress standalone HTML reports for:
 * - OffSec OSCP (PEN-200): Executive Summary, scoring breakdown (70-pt threshold),
 *   methodology, target walkthroughs with evidence screenshots (Base64 data URIs),
 *   remediation recommendations, and 10-pt bonus lab exercise accounting.
 * - Hack The Box CPTS: Enterprise penetration testing report format (85-pt threshold,
 *   14 flag objectives across DMZ, Internal, AD, and Vault tiers).
 * - Zero-Point Security CRTO: Red team operator engagement report (75-pt threshold,
 *   8 C2 objectives, operational security & detection telemetry).
 * - OffSec OSEP (PEN-300): Defense evasion & breaching defenses enterprise report.
 * - Altered Security CRTP: Active Directory attack path assessment report.
 */

import {
  ExamTrack,
  ExamBox,
  ScreenshotProof,
  ExamSessionState,
  EXAM_TRACK_CONFIGS,
  calculateExamScore,
  ExamScoreResult,
} from './examComplianceUtils';
import { parseMarkdownToHtml, escapeHtml } from './writeupHtmlExporter';
import type { Finding } from '../types/findings';
import { sortFindingsBySeverity } from './cvss';

/** Single-line, pipe-free text so it is safe inside a markdown table cell or heading. */
const inlineText = (value: string): string => (value || '').replace(/\s*[\r\n]+\s*/g, ' ').replace(/\|/g, '/').trim();

/**
 * Renders the "Findings Summary" table (severity-sorted) and per-finding sections.
 * Evidence ids are resolved against the boxes' proof screenshots; unknown ids are skipped.
 * Returns '' when there are no findings.
 */
export function generateFindingsMarkdown(
  findings: Finding[] | undefined,
  boxes: ExamBox[],
  options?: { includeScreenshots?: boolean }
): string {
  if (!findings || findings.length === 0) return '';
  const includeScreenshots = options?.includeScreenshots !== false;
  const sorted = sortFindingsBySeverity(findings);

  const screenshots = new Map<string, { sc: ScreenshotProof; box: ExamBox; flag: string }>();
  boxes.forEach((b) =>
    ([['user', b.userProof], ['root', b.rootProof]] as const).forEach(([flag, proof]) =>
      (proof?.screenshots || []).forEach((sc) => screenshots.set(sc.id, { sc, box: b, flag }))
    )
  );

  let md = `## 2A. Findings Summary\n\n`;
  md += `| # | Finding | Severity | CVSS | Affected Hosts |\n| :--- | :--- | :--- | :--- | :--- |\n`;
  sorted.forEach((f, i) => {
    const score = typeof f.cvssScore === 'number' ? f.cvssScore.toFixed(1) : 'N/A';
    const hosts = f.affectedHosts.map(inlineText).filter(Boolean).join(', ') || 'N/A';
    md += `| ${i + 1} | ${inlineText(f.title) || 'Untitled finding'} | ${f.severity.toUpperCase()} | ${score} | ${hosts} |\n`;
  });

  md += `\n---\n\n## 2B. Detailed Findings\n\n`;
  sorted.forEach((f, i) => {
    md += `### 2B.${i + 1} ${inlineText(f.title) || 'Untitled finding'}\n\n`;
    md += `- **Severity:** ${f.severity.toUpperCase()}\n`;
    if (typeof f.cvssScore === 'number') {
      md += `- **CVSS v3.1 Base Score:** ${f.cvssScore.toFixed(1)}${f.cvssVector ? ` (\`${inlineText(f.cvssVector)}\`)` : ''}\n`;
    } else if (f.cvssVector) {
      md += `- **CVSS Vector:** \`${inlineText(f.cvssVector)}\`\n`;
    }
    md += `- **Affected Hosts:** ${f.affectedHosts.map(inlineText).filter(Boolean).join(', ') || 'N/A'}\n\n`;
    md += `**Description:**\n\n${f.description || 'No description provided.'}\n\n`;
    if (f.impact) md += `**Impact:**\n\n${f.impact}\n\n`;
    if (f.remediation) md += `**Remediation:**\n\n${f.remediation}\n\n`;

    const evidence = f.evidenceRefs.map((id) => screenshots.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
    if (evidence.length > 0) {
      md += `**Evidence:**\n\n`;
      evidence.forEach(({ sc, box, flag }) => {
        const caption = inlineText(sc.caption) || 'Evidence screenshot';
        md += `- ${caption} (${box.name}, ${flag} proof, ${sc.timestamp})\n`;
        if (includeScreenshots && sc.dataUrl) md += `\n![${caption}](${sc.dataUrl})\n\n`;
      });
      md += `\n`;
    }
  });
  md += `---\n\n`;
  return md;
}

export interface ExamReportOptions {
  candidateName?: string;
  candidateCallsign?: string;
  osid?: string;
  examDate?: string;
  template?: ExamTrack;
  includeBonusPoints?: boolean;
  includeScreenshots?: boolean;
  includeRemediation?: boolean;
}

/**
 * Returns host-level technical remediation recommendations based on box details.
 */
export function getRemediationForBox(box: ExamBox): string {
  const isWindows = box.os === 'Windows' || box.name.toLowerCase().includes('dc') || box.name.toLowerCase().includes('srv');
  const isAd = box.type.startsWith('ad') || box.label.toLowerCase().includes('active directory');

  if (isAd && box.name.toLowerCase().includes('dc')) {
    return 'Enforce AES-256 for Kerberos tickets, disable RC4-HMAC, enforce Protected Users security group for privileged domain accounts, enable LDAP signing and channel binding, and monitor Event ID 4662/4624 for unauthorized DCSync directory replication calls.';
  }

  if (isWindows) {
    return 'Deploy Microsoft LAPS (Local Administrator Password Solution) with automated password rotation, restrict SeImpersonatePrivilege and SeAssignPrimaryTokenPrivilege to core system services, configure Credential Guard to protect LSASS memory, and apply current Windows Server Cumulative Security Updates.';
  }

  return 'Enforce least privilege access principles, audit /etc/sudoers for unrestricted binary executions or NOPASSWD tags, audit SUID/SGID binaries, restrict internal administrative services to localhost via local firewall (iptables/nftables), and ensure all daemon packages are updated to the vendor-patched release.';
}

/**
 * Returns comprehensive assessment methodology based on the certification track.
 */
export function getTrackMethodology(track: ExamTrack): string {
  if (track === 'CPTS') {
    return `### 4.1 Hack The Box CPTS Penetration Testing Execution Standard (PTES)
The penetration test followed a rigorous commercial methodology aligned with the Penetration Testing Execution Standard (PTES):
1. **Pre-Engagement & Scope Verification:** Validated testing bounds, routing configurations, and target subnets across the DMZ (10.10.110.0/24), Internal Corporate (172.16.8.0/24), and Vault tiers.
2. **Intelligence Gathering & Perimeter Footprinting:** Full-range TCP/UDP port mapping via Nmap, HTTP vhost fuzzing, SSL/TLS certificate reconnaissance, and application service enumeration.
3. **External Foothold & Ingress:** Discovered web application vulnerability leading to initial remote code execution (RCE) on the perimeter DMZ gateway.
4. **Internal Pivoting & Network Lateral Movement:** Deployed Chisel reverse SOCKS5 tunneling and SSH remote port forwarding to route assessment traffic seamlessly into restricted internal broadcast segments.
5. **Database & Enterprise Application Exploitation:** Exploited misconfigured MSSQL database linked servers, performed service credential harvesting, and abused unquoted service paths.
6. **Active Directory & PKI Domain Escalation:** Conducted Active Directory Certificate Services (ADCS) auditing (ESC1/ESC8), identified vulnerable certificate templates, extracted Kerberos TGTs via forged SANs, and escalated to Domain Controller forest authority.`;
  }

  if (track === 'CRTO') {
    return `### 4.1 Zero-Point Security CRTO Red Team Engagement Methodology
This assessment operated under assumed-breach red team conditions utilizing C2 operational security (OpSec) standards:
1. **Initial Access & Malleable C2 Beaconing:** Verified stealth initial access payload execution with randomized sleep/jitter intervals, DNS/HTTPS egress channels, and process hollowing into legitimate Windows binaries.
2. **Local Host Reconnaissance & EDR Bypass:** Inspected host defenses, validated AMSI/ETW telemetry neutralizations, and enumerated local cached credentials using zero-touch APIs.
3. **Active Directory Reconnaissance & LAPS Extraction:** Queried domain directory objects using stealth LDAP queries to identify Tier-0 administrators, Kerberoastable SPNs, and accessible LAPS password attributes.
4. **Lateral Movement & Peer-to-Peer Pivots:** Leveraged SMB pipe beacons, WinRM jumps, and WMI command execution across workstation and server tiers without triggering network anomalies.
5. **Domain Dominance & Persistence:** Abused Active Directory Certificate Services (ADCS), forged Golden/Silver tickets with the Domain KRBTGT hash, and verified enterprise forest dominance.`;
  }

  if (track === 'OSEP') {
    return `### 4.1 OffSec PEN-300 Evasion Techniques & Breaching Defenses Methodology
The assessment simulated an advanced adversary operating against a defended enterprise network (endpoint protection, application allow-listing, and network segmentation):
1. **Client-Side Initial Access:** Delivered staged payloads through phishing-style vectors (Office macros, HTA/JScript, and compiled loaders), with payload obfuscation and runtime decryption to defeat signature-based detection.
2. **Endpoint Defense Evasion:** Bypassed AMSI, PowerShell Constrained Language Mode, and AppLocker policy restrictions; validated AV/EDR evasion through process injection and in-memory .NET assembly execution.
3. **Linux Pivoting & Credential Material Abuse:** Compromised the Linux jump host, extracted Kerberos credential caches and keytabs, and tunneled traffic into segmented internal subnets.
4. **MSSQL & Delegation Exploitation:** Abused MSSQL linked servers, UNC path coercion, and unconstrained/constrained Kerberos delegation to escalate between Windows hosts.
5. **Domain & Forest Compromise:** Escalated from the child domain to the forest root using trust-key and SID-history techniques, culminating in capture of the final objective on the forest root domain controller.`;
  }

  if (track === 'CRTP') {
    return `### 4.1 Altered Security CRTP Active Directory Attack Methodology
The assessment followed a structured Active Directory attack path against a multi-domain lab environment:
1. **Domain Enumeration:** Mapped users, groups, computers, GPOs, ACLs, and trust relationships using PowerView and the ActiveDirectory module to identify privileged attack paths.
2. **Local Privilege Escalation:** Identified misconfigured services, unquoted paths, and weak permissions on the initial workstation to obtain local administrator rights.
3. **Credential Extraction & Lateral Movement:** Harvested credentials and hashes, performed pass-the-hash and over-pass-the-hash, and moved laterally using PowerShell Remoting and WMI.
4. **Domain Privilege Escalation:** Leveraged Kerberoasting, unconstrained and constrained delegation, and ACL abuse to reach domain administrator privileges.
5. **Persistence & Trust Abuse:** Forged Golden and Silver tickets, abused DCSync rights, and crossed domain trusts via inter-realm TGTs to achieve enterprise forest dominance.`;
  }

  // Default: OffSec OSCP (PEN-200)
  return `### 4.1 OffSec PEN-200 Practical Penetration Testing Methodology
The assessment adhered to the official OffSec PEN-200 examination standards:
1. **Target Discovery & Comprehensive Port Scanning:** Executed multi-stage Nmap scans (\`-sC -sV -p-\`) across assigned standalone targets and the Active Directory lab environment.
2. **Service Enumeration & Vulnerability Mapping:** Detailed inspection of discovered open ports, web directory brute-forcing, default credential verification, and known CVE vulnerability research.
3. **Exploitation & Initial Access (User Foothold):** Developed customized weaponized exploit payloads or executed validated public exploits to establish stable, unprivileged reverse shells.
4. **Local Privilege Escalation (Root / SYSTEM):** Performed exhaustive host enumeration (LinPEAS / WinPEAS, cron jobs, sudo permissions, token privileges) to elevate to root or NT AUTHORITY\\SYSTEM.
5. **Active Directory Set Chained Compromise:** Methodical 3-machine chain progression:
   - Initial Foothold: Web service exploitation and unprivileged domain user access.
   - Lateral Movement: Internal host compromise via Kerberoasting, password spraying, or bloodhound attack paths.
   - Domain Controller: Forest root compromise resulting in proof.txt capture and domain dominance.`;
}

/**
 * Returns structured Strategic Remediation Plan (Short, Medium, and Long-Term).
 */
export function getStrategicRemediation(_track: ExamTrack): string {
  return `### 5.1 Immediate Short-Term Remediation (0 - 48 Hours)
- **Credential Revocation & Force Rotation:** Immediately invalidate and rotate all compromised service account passwords, domain administrator credentials, and SSH keys identified during the assessment.
- **Isolate Vulnerable Services:** Restrict exposed administrative panels, debug endpoints, and database ports from the public internet and untrusted subnets using strict firewall rules.
- **Disable Legacy Protocols:** Disable NTLMv1, LLMNR, and NetBIOS-NS across all Windows domain members to prevent credential poisoning and relay attacks.

### 5.2 Medium-Term System Hardening (2 - 4 Weeks)
- **Implement Microsoft LAPS:** Deploy Local Administrator Password Solution across all workstations and member servers to prevent credential re-use and lateral movement.
- **Active Directory Certificate Services (ADCS) Audit:** Review all certificate templates in the enterprise PKI hierarchy; remove \`CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT\` (ESC1) and revoke vulnerable enrollment permissions.
- **Service Account Hardening:** Move all high-privilege service accounts to Group Managed Service Accounts (gMSA) with 128-character automatically rotated passwords to neutralize Kerberoasting risks.
- **Least Privilege & Role-Based Access Control:** Remove excessive privileges (such as \`SeImpersonatePrivilege\`, sudo NOPASSWD, and unrestricted file writes) from standard operational accounts.

### 5.3 Long-Term Enterprise Defense-in-Depth (1 - 6 Months)
- **Network Micro-Segmentation:** Isolate the DMZ, production database tiers, operational workstations, and domain controllers into strictly segmented VLANs enforced by next-generation internal firewalls.
- **Tiered Administrative Architecture:** Implement Microsoft Active Directory Administrative Tiering (Tier 0: Identity/DCs, Tier 1: Servers/Applications, Tier 2: Workstations) with dedicated Privileged Access Workstations (PAWs).
- **EDR & Centralized Telemetry:** Deploy Endpoint Detection & Response (EDR) with real-time alerting on anomalous process injections, LSASS memory access, and DCSync replication patterns (Event IDs 4662 and 4624).`;
}

/**
 * Generates an official submission-ready Markdown report.
 * Fully compatible with OffSec OSCP, Hack The Box CPTS, and Zero-Point Security CRTO guidelines.
 */
export function generateExamReportMarkdown(
  session: ExamSessionState,
  options?: ExamReportOptions
): string {
  const effectiveTrack: ExamTrack = options?.template || session.track || 'OSCP';
  const candidateName = options?.candidateName || session.candidateName || 'Daniel Dayan';
  const candidateCallsign = options?.candidateCallsign || session.candidateCallsign || '0xdnd';
  const osid = options?.osid || session.osid || 'OS-94821';
  const effectiveIncludeBonus = options?.includeBonusPoints !== undefined
    ? options.includeBonusPoints
    : Boolean(session.includeBonusPoints);
  const includeScreenshots = options?.includeScreenshots !== false;
  const includeRemediation = options?.includeRemediation !== false;

  const scoreData: ExamScoreResult = calculateExamScore(effectiveTrack, session.boxes, {
    includeBonusPoints: effectiveIncludeBonus,
  });

  const examDate = options?.examDate || new Date(session.examStartedAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const trackConfig = EXAM_TRACK_CONFIGS[effectiveTrack] || EXAM_TRACK_CONFIGS.OSCP;

  // Header Title based on Track
  let reportHeaderTitle = `${trackConfig.name.toUpperCase()} // OFFICIAL ASSESSMENT & PENETRATION TESTING REPORT`;
  if (effectiveTrack === 'CPTS') {
    reportHeaderTitle = 'HACK THE BOX CPTS // OFFICIAL ENTERPRISE PENETRATION TESTING REPORT';
  } else if (effectiveTrack === 'CRTO') {
    reportHeaderTitle = 'ZERO-POINT SECURITY CRTO // CERTIFIED RED TEAM OPERATOR ENGAGEMENT REPORT';
  } else if (effectiveTrack === 'OSEP') {
    reportHeaderTitle = 'OFFSEC OSEP // EVASION TECHNIQUES & BREACHING DEFENSES EXAM REPORT';
  } else if (effectiveTrack === 'CRTP') {
    reportHeaderTitle = 'ALTERED SECURITY CRTP // CERTIFIED RED TEAM PROFESSIONAL ASSESSMENT REPORT';
  }

  let report = `# ${reportHeaderTitle}

**Candidate Name:** ${candidateName}  
**Callsign / Handle:** ${candidateCallsign}  
**OSID:** ${osid}  
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
    if (effectiveTrack === 'OSCP' && b.type.startsWith('ad-')) {
      pts = scoreData.adSetCompromised ? (b.userPwned ? b.userPoints : 0) + (b.rootPwned ? b.rootPoints : 0) : 0;
    } else {
      pts = (b.userPwned ? b.userPoints : 0) + (b.rootPwned ? b.rootPoints : 0);
    }
    report += `| **${b.name}** | ${b.label} | \`${b.ip}\` | ${userStatus} | ${rootStatus} | **${pts} PTS** |\n`;
  });

  if (effectiveTrack === 'OSCP' && effectiveIncludeBonus) {
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
      const hasScreenshots = Boolean(b.userProof?.screenshots && b.userProof.screenshots.length > 0);
      report += `#### 2.${idx + 1}.1 Initial Access / User Flag Proof\n`;
      report += `- **Flag String:** \`${b.userProof?.flagText || 'NOT_CAPTURED'}\`\n`;
      report += `- **Proof Screenshot Recorded:** ${b.userProof?.screenshotTaken || hasScreenshots ? 'YES [x]' : 'NO [ ]'}\n`;
      if (b.userProof?.toolsUsed) {
        report += `- **Commands & Tools Used:** \`${b.userProof.toolsUsed}\`\n`;
      }
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
          if (includeScreenshots && sc.dataUrl) {
            report += `\n![${sc.caption || `${b.name} User Proof`}](${sc.dataUrl})\n\n`;
          }
        });
      }
      report += `\n`;
    }

    if (b.rootPoints > 0) {
      const hasScreenshots = Boolean(b.rootProof?.screenshots && b.rootProof.screenshots.length > 0);
      report += `#### 2.${idx + 1}.2 Privilege Escalation / Root Flag Proof\n`;
      report += `- **Flag String:** \`${b.rootProof?.flagText || 'NOT_CAPTURED'}\`\n`;
      report += `- **Proof Screenshot Recorded:** ${b.rootProof?.screenshotTaken || hasScreenshots ? 'YES [x]' : 'NO [ ]'}\n`;
      if (b.rootProof?.toolsUsed) {
        report += `- **Commands & Tools Used:** \`${b.rootProof.toolsUsed}\`\n`;
      }
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
          if (includeScreenshots && sc.dataUrl) {
            report += `\n![${sc.caption || `${b.name} Root Proof`}](${sc.dataUrl})\n\n`;
          }
        });
      }
      report += `\n`;
    }

    if (includeRemediation) {
      report += `#### 2.${idx + 1}.3 Host Hardening & Target Remediation\n`;
      report += `- **Vulnerability Analysis:** ${b.os === 'Windows' ? 'Windows Privilege Escalation & Active Directory Misconfiguration' : 'Linux Service Exploitation & Insecure File Permissions'}\n`;
      report += `- **Remediation Action:** ${getRemediationForBox(b)}\n\n`;
    }

    report += `---\n\n`;
  });

  report += generateFindingsMarkdown(session.findings, session.boxes, { includeScreenshots });

  report += `## 3. Candidate Operational Scratchpad & Notes\n\n`;
  report += `${session.scratchNotes || 'No additional scratchpad notes provided.'}\n\n`;

  report += `---\n\n`;
  report += `## 4. Assessment Methodology & Standards\n\n`;
  report += `${getTrackMethodology(effectiveTrack)}\n\n`;

  if (includeRemediation) {
    report += `---\n\n`;
    report += `## 5. Strategic Remediation Plan\n\n`;
    report += `${getStrategicRemediation(effectiveTrack)}\n\n`;
  }

  report += `---\n*Generated by ZeroBox Tactical CTF Platform // Operator: ${candidateName}*\n`;

  return report;
}

/**
 * Compiles a Markdown exam report into a standalone, air-gapped HTML document.
 * Meets strict zero-egress invariants:
 * - Content-Security-Policy disallowing remote scripts, stylesheets, and fonts.
 * - Print-ready media query (@media print) for high-fidelity 1-click PDF printing.
 * - Base64 data URIs preserved for offline screenshot evidence.
 * - Complete neutralization of XSS attempts.
 */
export function exportStandaloneHtmlReport(markdownReport: string, title?: string): string {
  const parsedBody = parseMarkdownToHtml(markdownReport);
  const safeTitle = escapeHtml(title || 'ZeroBox Tactical Certification Exam Report');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; script-src 'none'; font-src 'self';">
  <title>${safeTitle}</title>
  <style>
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #0a0a0c;
      color: #e4e4e7;
      line-height: 1.6;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1, h2, h3, h4 {
      color: #10b981;
      border-bottom: 1px solid #27272a;
      padding-bottom: 0.5rem;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
    }
    h1 { font-size: 1.85rem; color: #00f0ff; }
    h2 { font-size: 1.4rem; color: #10b981; margin-top: 2.25rem; }
    h3 { font-size: 1.15rem; color: #a855f7; }
    h4 { font-size: 1rem; color: #38bdf8; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 0.9rem;
    }
    th, td {
      border: 1px solid #27272a;
      padding: 0.75rem;
      text-align: left;
    }
    th {
      background: #18181b;
      color: #10b981;
      font-weight: 700;
    }
    tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }
    pre {
      background: #18181b;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      border: 1px solid #27272a;
      margin: 1rem 0;
    }
    code {
      font-family: inherit;
      color: #a1a1aa;
    }
    .inline-code {
      background: #18181b;
      color: #00f0ff;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      border: 1px solid #27272a;
    }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #27272a;
      border-radius: 4px;
      margin: 1rem 0;
      display: block;
    }
    blockquote {
      border-left: 3px solid #10b981;
      background: rgba(16, 185, 129, 0.05);
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      border-radius: 0 4px 4px 0;
    }
    hr {
      border: none;
      border-top: 1px solid #27272a;
      margin: 2rem 0;
    }
    ul, ol {
      padding-left: 1.5rem;
      margin: 1rem 0;
    }
    li {
      margin-bottom: 0.4rem;
    }
    .table-wrapper {
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    .codeblock-container {
      margin: 1rem 0;
      border-radius: 4px;
      border: 1px solid #27272a;
      background: #18181b;
      overflow: hidden;
    }
    .codeblock-header {
      padding: 0.4rem 0.8rem;
      background: #121215;
      border-bottom: 1px solid #27272a;
      font-size: 0.75rem;
      color: #71717a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .codeblock-copy-btn {
      display: none;
    }
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      h1, h2, h3, h4 {
        color: #000000 !important;
        border-bottom: 1px solid #cccccc !important;
      }
      table, th, td {
        border-color: #cccccc !important;
        color: #000000 !important;
      }
      th {
        background: #f4f4f5 !important;
      }
      pre {
        background: #f4f4f5 !important;
        border-color: #cccccc !important;
        color: #000000 !important;
      }
      img {
        border-color: #cccccc !important;
      }
    }
  </style>
</head>
<body>
  ${parsedBody}
</body>
</html>`;
}

/**
 * Top-level helper to generate a standalone HTML exam report from a session state.
 */
export function generateExamReportHtml(
  session: ExamSessionState,
  options?: ExamReportOptions
): string {
  const markdown = generateExamReportMarkdown(session, options);
  const track = options?.template || session.track || 'OSCP';
  const callsign = options?.candidateCallsign || session.candidateCallsign || 'candidate';
  const title = `ZeroBox Tactical // ${track} Exam Submission Report - ${callsign}`;
  return exportStandaloneHtmlReport(markdown, title);
}
