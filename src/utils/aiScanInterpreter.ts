/**
 * aiScanInterpreter.ts
 * Prompt synthesis and offensive intelligence extraction for CTF & pentest scans.
 * Transforms raw Nmap/Rustscan/Gnmap data into structured tactical attack trees.
 */

import { ScanImportResult, ParsedPort } from './scanParserUtils';
import { streamClaudeMessage, StreamCallbacks } from './aiClient';

export interface ScanInterpreterOptions {
  targetIp?: string;
  targetName?: string;
  targetOs?: string;
  difficulty?: string;
  model?: string;
  apiKey?: string;
}

export const CYBER_TACTICAL_SYSTEM_PROMPT = `You are ZEROBOX AI // Senior Offensive Cyber Operations & Exploit Architect.
Your mission is to perform elite tactical reconnaissance translation on CTF/pentest target scans (Hack The Box, TryHackMe, OSCP, CPTS, Active Directory).

Guidelines:
1. Speak in a sharp, high-tempo, authoritative tactical cyber tone (CRT terminal aesthetic).
2. Prioritize practical, high-probability footholds (CVEs, version vulnerabilities, anonymous auth, web entry points, default credentials, RPC/SMB enumeration).
3. Always supply concrete, copy-pasteable terminal commands pre-filled with the target IP/port (using tools like nmap, ffuf, curl, hydra, evil-winrm, netexec, crackmapexec, enum4linux-ng, impacket).
4. Organize your response using the following standardized markdown sections:
   - ## 🎯 1. Threat Surface Assessment (Deconstruct what the host actually is)
   - ## ⚡ 2. Ranked Attack Vectors & Foothold Hypotheses (Top 3 most viable attack vectors ranked by probability)
   - ## 🛠️ 3. Immediate Tactical Command Playbook (Actionable bash/powershell commands ready to execute)
   - ## 🏰 4. Active Directory / Lateral Movement Vectors (If Windows/AD; otherwise Linux PrivEsc Hypotheses)
   - ## ⚠️ 5. Potential Traps & Rabbit Holes (What to avoid wasting time on)
5. Do NOT hallucinate services or versions that are not present in the scan evidence.
6. Provide output in clean, structured Markdown suitable for appending directly to engagement notes.`;

/**
 * Builds a token-efficient, sanitized reconnaissance summary from parsed scan data
 */
export function buildScanPrompt(scan: ScanImportResult, options?: ScanInterpreterOptions): string {
  const ip = options?.targetIp || scan.detectedIp || 'TARGET_IP';
  const os = options?.targetOs || scan.detectedOs || 'Unknown';
  const name = options?.targetName || scan.detectedHost || 'Unknown Target';
  const difficulty = options?.difficulty || 'Unknown';

  const portLines = scan.ports.map((p: ParsedPort) => {
    let line = `Port ${p.port}/${p.protocol} [${p.state.toUpperCase()}] - Service: ${p.service}`;
    if (p.version) line += ` (Version: ${p.version})`;
    if (p.cveNotes) line += ` [Flagged: ${p.cveNotes}]`;
    if (p.scripts && Object.keys(p.scripts).length > 0) {
      const scriptDetails = Object.entries(p.scripts)
        .slice(0, 5)
        .map(([name, out]) => `  - Script [${name}]: ${out.slice(0, 150).replace(/\n/g, ' ')}`)
        .join('\n');
      line += `\n${scriptDetails}`;
    }
    return line;
  });

  return `TARGET TELEMETRY:
- Name: ${name}
- Primary IP: ${ip}
- Assumed OS: ${os}
- Difficulty Level: ${difficulty}
- Scan Format Parsed: ${scan.format}
- Total Open/Filtered Ports: ${scan.ports.length}

OPEN PORTS & SERVICE FINGERPRINTS:
${portLines.length > 0 ? portLines.join('\n') : 'No open ports parsed in structured output.'}

${scan.rawSummary ? `RAW SCAN EXCERPT:\n${scan.rawSummary.slice(0, 2000)}` : ''}

MISSION DIRECTIVE:
Analyze these service fingerprints. Synthesize the most viable attack vectors and construct the immediate tactical execution playbook for target IP ${ip}.`;
}

/**
 * Stream an AI reconnaissance analysis from a parsed scan
 */
export async function interpretScanWithClaude(
  scan: ScanImportResult,
  options: ScanInterpreterOptions,
  callbacks: StreamCallbacks
): Promise<string> {
  const prompt = buildScanPrompt(scan, options);
  return streamClaudeMessage(
    CYBER_TACTICAL_SYSTEM_PROMPT,
    prompt,
    callbacks,
    {
      model: options.model,
      apiKey: options.apiKey
    }
  );
}
