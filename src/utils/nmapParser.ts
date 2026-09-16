export interface ParsedPortResult {
  port: number;
  protocol: 'tcp' | 'udp';
  state: string;
  service?: string;
  version?: string;
}

/**
 * Parses raw Nmap scan text output and extracts open ports and services.
 * Handles formats like:
 * 22/tcp   open  ssh     OpenSSH 8.2p1
 * 80/tcp   open  http    Apache httpd 2.4.41
 * 445/tcp  open  microsoft-ds
 * 161/udp  open  snmp
 */
export function parseNmapScanOutput(rawText: string): {
  ports: number[];
  details: ParsedPortResult[];
} {
  const ports: number[] = [];
  const details: ParsedPortResult[] = [];
  const seenPorts = new Set<number>();

  if (!rawText || typeof rawText !== 'string') {
    return { ports, details };
  }

  // Regex for Nmap port line:
  // e.g., "80/tcp   open  http    Apache httpd 2.4.41"
  // or "53/udp open domain"
  const portRegex = /^(\d+)\/(tcp|udp)\s+(\w+)\s+([\w\-.]+)?(?:\s+(.*))?/im;

  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(portRegex);
    if (match) {
      const portNum = parseInt(match[1], 10);
      const protocol = match[2].toLowerCase() as 'tcp' | 'udp';
      const state = match[3].toLowerCase();
      const service = match[4] || '';
      const version = match[5] || '';

      if (state.includes('open') && !state.includes('filtered') && !seenPorts.has(portNum)) {
        seenPorts.add(portNum);
        ports.push(portNum);
        details.push({
          port: portNum,
          protocol,
          state,
          service,
          version,
        });
      }
    } else {
      // Also look for simple comma or space separated port lists like "22, 80, 443, 445"
      const numbers = trimmed.match(/\b(2[0-9]|[3-9][0-9]|[1-9][0-9]{2,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])\b/g);
      if (numbers && numbers.length > 0 && (trimmed.includes(',') || trimmed.includes('ports:') || trimmed.includes('open:'))) {
        for (const numStr of numbers) {
          const p = parseInt(numStr, 10);
          if (p >= 1 && p <= 65535 && !seenPorts.has(p)) {
            seenPorts.add(p);
            ports.push(p);
            details.push({
              port: p,
              protocol: 'tcp',
              state: 'open',
            });
          }
        }
      }
    }
  }

  ports.sort((a, b) => a - b);
  return { ports, details };
}
