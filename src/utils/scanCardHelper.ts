import { Machine } from '../types';
import { detectAndParseScan, ScanImportResult } from './scanParserUtils';

export interface ScanApplyResult {
  updatedMachine: Partial<Machine>;
  parsedCount: number;
  format: string;
  detectedIp?: string;
  detectedHost?: string;
}

/**
 * Parses raw scan text (Nmap XML, Nmap normal, .gnmap, Rustscan)
 * and generates non-destructive updates for a target machine:
 * - Appends newly discovered open ports without duplicate entries
 * - Merges detected service names into machine tags
 * - Appends a formatted timestamped recon report to quickNotes
 */
export function applyScanTextToMachine(
  machine: Machine,
  scanText: string
): ScanApplyResult | null {
  if (!scanText || typeof scanText !== 'string' || !scanText.trim()) {
    return null;
  }

  const parsed = detectAndParseScan(scanText);
  if (!parsed || !parsed.ports || parsed.ports.length === 0) {
    return null;
  }

  // 1. Merge open ports (deduplicated, sorted numerically)
  const existingPorts = new Set<number>(machine.openPorts || []);
  const newPortNumbers = parsed.ports.map((p) => p.port);
  newPortNumbers.forEach((port) => existingPorts.add(port));
  const openPorts = Array.from(existingPorts).sort((a, b) => a - b);

  // 2. Extract services to merge into machine tags
  const existingTags = new Set<string>(machine.tags || []);
  existingTags.add('nmap-scanned');

  parsed.ports.forEach((p) => {
    const s = p.service.toLowerCase().trim();
    if (s && s !== 'unknown' && s !== 'tcpwrapped' && !existingTags.has(s)) {
      existingTags.add(s);
    }
  });
  const tags = Array.from(existingTags);

  // 3. Format structured recon notes
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  const portLines = parsed.ports
    .map((p) => {
      const cvePart = p.cveNotes ? ` ➔ 🚨 *${p.cveNotes}*` : '';
      const verPart = p.version ? ` (${p.version})` : '';
      return `- **Port ${p.port}/${p.protocol}** [${p.service.toUpperCase()}]${verPart}${cvePart}`;
    })
    .join('\n');

  const headerLine = `### ⚡ Scan Intake [${parsed.format.toUpperCase()}] (${dateStr} ${timeStr})`;
  const hostInfo = parsed.detectedHost || parsed.detectedIp ? `- **Detected Host**: ${parsed.detectedHost || parsed.detectedIp}\n` : '';
  const osInfo = parsed.detectedOs ? `- **Detected OS**: ${parsed.detectedOs}\n` : '';

  const reconNotesBlock = `\n\n${headerLine}\n${hostInfo}${osInfo}#### Open Services (${parsed.ports.length}):\n${portLines}\n`;

  const existingNotes = machine.quickNotes || '';
  const quickNotes = existingNotes ? `${existingNotes.trimEnd()}${reconNotesBlock}` : reconNotesBlock.trim();

  // If IP was not previously set or was generic placeholder, update it if detected
  let ip = machine.ip;
  if (parsed.detectedIp && (!ip || ip.includes('x') || ip.includes('X'))) {
    ip = parsed.detectedIp;
  }

  return {
    updatedMachine: {
      openPorts,
      tags,
      quickNotes,
      ip,
      updatedAt: now.toISOString(),
    },
    parsedCount: parsed.ports.length,
    format: parsed.format,
    detectedIp: parsed.detectedIp,
    detectedHost: parsed.detectedHost,
  };
}
