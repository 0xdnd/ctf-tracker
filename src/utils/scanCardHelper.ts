import { Machine, OperatingSystem, TargetServicePort } from '../types';
import { detectAndParseScan, ParsedHost, ParsedPort, ScanImportResult } from './scanParserUtils';

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

/** Maps parsed scan ports to the TargetServicePort shape stored on a machine. */
export function toTargetServices(ports: ParsedPort[]): TargetServicePort[] {
  return ports.map((p) => ({
    port: p.port,
    protocol: p.protocol as 'tcp' | 'udp',
    state: p.state,
    service: p.service,
    version: p.version,
    cveNotes: p.cveNotes,
    suggestedTools: p.suggestedTools,
  }));
}

/** Adds service-derived tags (smb, web, ftp, ...) that are not already present. */
export function deriveServiceTags(existingTags: string[], services: { service: string }[]): string[] {
  const tags = [...existingTags];
  services.forEach((s) => {
    const name = s.service.toLowerCase();
    if (name.includes('smb') && !tags.includes('smb')) tags.push('smb');
    if (name.includes('http') && !tags.includes('web')) tags.push('web');
    if (name.includes('ftp') && !tags.includes('ftp')) tags.push('ftp');
    if (name.includes('kerberos') && !tags.includes('kerberos')) tags.push('kerberos');
    if (name.includes('ldap') && !tags.includes('active-directory')) tags.push('active-directory');
    if (name.includes('mysql') && !tags.includes('mysql')) tags.push('mysql');
  });
  return tags;
}

/** Best-effort OS guess from the scan's OS string, falling back to service banners. */
export function guessOperatingSystem(host: ParsedHost): OperatingSystem {
  const haystack = host.os || host.ports.map((p) => p.version).join(' ');
  if (/windows|microsoft/i.test(haystack)) return 'Windows';
  if (/linux|unix|ubuntu|debian|centos|red hat|fedora/i.test(haystack)) return 'Linux';
  if (/bsd/i.test(haystack)) return 'BSD';
  if (/mac ?os|darwin/i.test(haystack)) return 'macOS';
  if (/android/i.test(haystack)) return 'Android';
  return 'Other';
}

export const hostAddress = (host: ParsedHost): string => (host.ip || host.hostname || '').trim();

/** Normalised key used to detect an IP that is already tracked as a machine. */
export const normalizeAddress = (addr: string | undefined): string => (addr || '').trim().toLowerCase();

/**
 * Builds the addCustomMachine payload for one host of a multi-host scan.
 * `usedNames` guarantees unique machine names within a batch (names seed the machine id).
 */
export function buildMachineDraftFromHost(
  host: ParsedHost,
  format: string,
  usedNames: Set<string>
): Omit<Machine, 'id' | 'createdAt' | 'updatedAt'> {
  const address = hostAddress(host);
  let name = host.hostname || address || 'scanned-host';
  if (usedNames.has(name.toLowerCase())) name = `${name} (${address || usedNames.size + 1})`;
  usedNames.add(name.toLowerCase());

  const services = toTargetServices(host.ports);
  const openPorts = services.map((s) => s.port);

  return {
    name,
    ip: address,
    os: guessOperatingSystem(host),
    platform: 'Custom',
    difficulty: 'Medium',
    status: services.length > 0 ? 'recon' : 'backlog',
    tags: deriveServiceTags([], services),
    certifications: [],
    timeSpentSeconds: 0,
    services,
    openPorts,
    scanSummary: `${format.toUpperCase()} · ${openPorts.length} Open Ports Discovered`,
  };
}
