/**
 * scanParserUtils.ts
 * High-performance multi-format parser for CTF scan artifacts.
 * Supports Nmap XML, standard Nmap text, Grepable (.gnmap), and Rustscan outputs.
 * Completely browser-native (zero Node fs dependencies).
 */

export interface ParsedPort {
  port: number;
  protocol: string;
  state: string;
  service: string;
  version: string;
  suggestedTools: string[];
  cveNotes?: string;
  scripts?: Record<string, string>;
}

export interface ParsedHost {
  ip?: string;
  hostname?: string;
  os?: string;
  ports: ParsedPort[];
}

export interface ScanImportResult {
  format: 'nmap-xml' | 'nmap-text' | 'gnmap' | 'rustscan' | 'raw-ports';
  detectedIp?: string;
  detectedHost?: string;
  detectedOs?: string;
  ports: ParsedPort[];
  hosts?: ParsedHost[];
  warnings?: string[];
  rawSummary?: string;
}

/**
 * Generate tactical offensive tool and CVE suggestions based on port and service/version
 */
export function getServiceIntelligence(port: number, service: string, version: string = ''): { tools: string[]; cve?: string } {
  const s = service.toLowerCase();
  const v = version.toLowerCase();
  const tools: string[] = [];
  let cve: string | undefined;

  if (s.includes('ftp') || port === 21) {
    tools.push('ftp', 'hydra', 'nmap --script ftp-anon,ftp-vuln*');
    if (v.includes('2.3.4')) cve = 'Possible: CVE-2011-2523 (vsftpd Backdoor RCE)';
    else if (v.includes('proftpd 1.3.5')) cve = 'Possible: CVE-2015-3306 (mod_copy File Copy)';
  } else if (s.includes('ssh') || port === 22) {
    tools.push('ssh', 'ssh-audit', 'hydra');
    if (v.includes('libssh 0.6')) cve = 'Possible: CVE-2018-10933 (Authentication Bypass)';
  } else if (s.includes('http') || port === 80 || port === 443 || port === 8080 || port === 8443) {
    tools.push('ffuf', 'gobuster', 'whatweb', 'nikto', 'feroxbuster');
    if (v.includes('2.4.49')) cve = 'Possible: CVE-2021-41773 (Apache Path Traversal/RCE)';
    else if (v.includes('2.4.50')) cve = 'Possible: CVE-2021-42013 (Apache RCE Bypass)';
    else if (v.includes('tomcat') && v.includes('9.0.30')) cve = 'Possible: CVE-2020-1938 (Ghostcat)';
  } else if (s.includes('smb') || s.includes('microsoft-ds') || s.includes('netbios') || port === 445 || port === 139) {
    tools.push('crackmapexec smb', 'netexec smb', 'enum4linux-ng', 'smbclient -L', 'smbmap');
    if (v.includes('3.0.20')) cve = 'Possible: CVE-2007-2447 (Samba usermap script RCE)';
    else if (v.includes('samba')) cve = 'Samba Null Session / Share Enumeration';
    else cve = 'MS17-010 (EternalBlue) / Signing Check';
  } else if (s.includes('kerberos') || port === 88) {
    tools.push('kerbrute userenum', 'GetNPUsers.py (AS-REP)', 'GetUserSPNs.py (Kerberoast)');
    cve = 'Active Directory Kerberos KDC';
  } else if (s.includes('ldap') || port === 389 || port === 636 || port === 3268) {
    tools.push('ldapsearch -x', 'bloodhound-python', 'netexec ldap');
    cve = 'Active Directory Domain Controller LDAP';
  } else if (s.includes('dns') || s.includes('domain') || port === 53) {
    tools.push('dig axfr', 'dnsrecon');
  } else if (s.includes('mysql') || port === 3306) {
    tools.push('mysql -h <IP> -u root -p', 'sqlmap');
  } else if (s.includes('mssql') || s.includes('ms-sql') || port === 1433) {
    tools.push('crackmapexec mssql', 'mssqlclient.py');
    cve = 'xp_cmdshell Execution / Linked Database Abuse';
  } else if (s.includes('winrm') || port === 5985 || port === 5986) {
    tools.push('evil-winrm -i <IP> -u <USER> -p <PASS>');
  } else if (s.includes('rdp') || port === 3389) {
    tools.push('xfreerdp /v:<IP> /u:<USER>', 'rdesktop');
    if (v.includes('5.1') || v.includes('6.0')) cve = 'Possible: CVE-2019-0708 (BlueKeep)';
  } else if (s.includes('snmp') || port === 161) {
    tools.push('snmpwalk -v2c -c public', 'onesixtyone');
  } else if (s.includes('redis') || port === 6379) {
    tools.push('redis-cli -h <IP>', 'redis-rogue-server');
  } else {
    tools.push('nc -nv', 'nmap -sC -sV');
  }

  return { tools, cve };
}

const isValidPort = (p: number): boolean => !isNaN(p) && p >= 1 && p <= 65535;

/**
 * Parse Nmap XML output using browser DOMParser with <parsererror> safeguard
 */
export function parseNmapXml(xmlContent: string): ScanImportResult | null {
  try {
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return null;

    // Defense against XML entity expansion (Billion Laughs) and XXE constructs.
    // Handles multi-line / nested DTD internal subsets (strip all <!DOCTYPE ... [ ... ]> and <!ENTITY... blocks)
    const sanitizedXml = xmlContent
      .replace(/<!DOCTYPE\b[^>\[]*\[[\s\S]*?\][^>]*>/gi, '')
      .replace(/<!DOCTYPE\b[^>]*>/gi, '')
      .replace(/<!ENTITY\b[\s\S]*?>/gi, '')
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)[a-zA-Z0-9_-]+;/gi, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedXml, 'text/xml');

    // Safeguard against XML parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) return null;

    const nmaprun = doc.querySelector('nmaprun');
    if (!nmaprun) return null;

    const hostNodes = doc.querySelectorAll('host');
    if (!hostNodes || hostNodes.length === 0) return null;

    const parsedHosts: ParsedHost[] = [];
    const allPorts: ParsedPort[] = [];

    hostNodes.forEach((hostNode) => {
      const addressNode =
        hostNode.querySelector('address[addrtype="ipv4"]') ||
        hostNode.querySelector('address[addrtype="ipv6"]') ||
        hostNode.querySelector('address');
      const hostIp = addressNode?.getAttribute('addr') || undefined;

      const hostnameNode = hostNode.querySelector('hostname');
      const hostName = hostnameNode?.getAttribute('name') || undefined;

      const osMatchNode = hostNode.querySelector('osmatch');
      const hostOs = osMatchNode?.getAttribute('name') || undefined;

      const hostPorts: ParsedPort[] = [];
      const portNodes = hostNode.querySelectorAll('ports > port');
      portNodes.forEach((portEl) => {
        const stateEl = portEl.querySelector('state');
        const state = stateEl?.getAttribute('state') || 'closed';
        if (state !== 'open' && state !== 'open|filtered') return;

        const portNum = parseInt(portEl.getAttribute('portid') || '0', 10);
        if (!isValidPort(portNum)) return;
        const protocol = (portEl.getAttribute('protocol') || 'tcp').toLowerCase();
        const serviceEl = portEl.querySelector('service');
        const service = (serviceEl?.getAttribute('name') || 'unknown').toLowerCase();
        
        const product = serviceEl?.getAttribute('product') || '';
        const versionNum = serviceEl?.getAttribute('version') || '';
        const extrainfo = serviceEl?.getAttribute('extrainfo') || '';
        const fullVersion = [product, versionNum, extrainfo].filter(Boolean).join(' ') || 'Unknown Version';

        const { tools, cve } = getServiceIntelligence(portNum, service, fullVersion);

        const parsedPort: ParsedPort = {
          port: portNum,
          protocol,
          state,
          service,
          version: fullVersion,
          suggestedTools: tools,
          cveNotes: cve,
        };
        hostPorts.push(parsedPort);
        allPorts.push(parsedPort);
      });

      if (hostPorts.length > 0 || hostIp) {
        parsedHosts.push({
          ip: hostIp,
          hostname: hostName,
          os: hostOs,
          ports: hostPorts,
        });
      }
    });

    if (parsedHosts.length === 0) return null;

    const primaryHost = parsedHosts[0];
    const warnings: string[] = [];
    if (parsedHosts.length > 1) {
      warnings.push(`Multi-host scan: ${parsedHosts.length} hosts detected — primary target ports mapped.`);
    }

    return {
      format: 'nmap-xml',
      detectedIp: primaryHost.ip,
      detectedHost: primaryHost.hostname,
      detectedOs: primaryHost.os,
      ports: primaryHost.ports.length > 0 ? primaryHost.ports : allPorts,
      hosts: parsedHosts,
      warnings: warnings.length > 0 ? warnings : undefined,
      rawSummary: parsedHosts.length > 1
        ? `Nmap XML scan parsed: ${parsedHosts.length} hosts discovered (${allPorts.length} total open ports).`
        : `Nmap XML scan parsed with ${primaryHost.ports.length} open ports discovered.`,
    };
  } catch {
    return null;
  }
}

/**
 * Parse Grepable Nmap (.gnmap) output
 */
export function parseGrepableNmap(content: string): ScanImportResult | null {
  if (!content.includes('Ports:') && !content.includes('# Nmap')) return null;

  const lines = content.split('\n');
  let detectedIp: string | undefined;
  let detectedHost: string | undefined;
  const ports: ParsedPort[] = [];
  const hostsByIp = new Map<string, ParsedHost>();

  for (const line of lines) {
    if (line.startsWith('Host:')) {
      const hostMatch = line.match(/^Host:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s*(?:\(([^)]*)\))?/);
      let lineHost: ParsedHost | undefined;
      if (hostMatch) {
        detectedIp = hostMatch[1];
        if (hostMatch[2]) detectedHost = hostMatch[2];
        lineHost = hostsByIp.get(hostMatch[1]);
        if (!lineHost) {
          lineHost = { ip: hostMatch[1], ports: [] };
          hostsByIp.set(hostMatch[1], lineHost);
        }
        if (hostMatch[2] && !lineHost.hostname) lineHost.hostname = hostMatch[2];
        const osField = line.match(/\tOS:\s*([^\t\r\n]+)/);
        if (osField && !lineHost.os) lineHost.os = osField[1].trim();
      }

      const portsPart = line.split('Ports:')[1];
      if (portsPart) {
        const portEntries = portsPart.split(',');
        for (const pe of portEntries) {
          const parts = pe.trim().split('/');
          if (parts.length >= 5) {
            const portNum = parseInt(parts[0], 10);
            const state = parts[1]?.toLowerCase();
            const proto = parts[2]?.toLowerCase() || 'tcp';
            const service = parts[4]?.toLowerCase() || 'unknown';
            const version = (parts[6] || parts[5] || 'Unknown Version').trim();

            const isOpenState = state === 'open' || state === 'open|filtered';
            if (isOpenState && isValidPort(portNum)) {
              const { tools, cve } = getServiceIntelligence(portNum, service, version);
              const gnmapPort: ParsedPort = {
                port: portNum,
                protocol: proto,
                state: state || 'open',
                service,
                version,
                suggestedTools: tools,
                cveNotes: cve,
              };
              ports.push(gnmapPort);
              lineHost?.ports.push(gnmapPort);
            }
          }
        }
      }
    }
  }

  if (ports.length === 0 && !detectedIp) return null;

  return {
    format: 'gnmap',
    detectedIp,
    detectedHost,
    ports,
    ...(hostsByIp.size > 1 ? { hosts: Array.from(hostsByIp.values()) } : {}),
    rawSummary: `Grepable Nmap scan parsed with ${ports.length} open ports.`,
  };
}

/**
 * Parse Rustscan output
 */
export function parseRustscan(content: string): ScanImportResult | null {
  const hasRustscanMarker = content.toLowerCase().includes('rustscan') || content.includes('Open ') || content.includes('[~] Starting Script(s)');
  if (!hasRustscanMarker) return null;

  let detectedIp: string | undefined;
  const discoveredPorts: number[] = [];

  const openLineRegex = /Open\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}):([0-9]{1,5})/gi;
  let match: RegExpExecArray | null;
  while ((match = openLineRegex.exec(content)) !== null) {
    if (!detectedIp) detectedIp = match[1];
    const port = parseInt(match[2], 10);
    if (isValidPort(port)) discoveredPorts.push(port);
  }

  const arrayMatch = content.match(/\[([0-9,\s]+)\]/);
  if (arrayMatch && discoveredPorts.length === 0) {
    const rawNums = arrayMatch[1]
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => isValidPort(n));
    discoveredPorts.push(...rawNums);
  }

  const nmapTextResult = parseNmapText(content);
  if (nmapTextResult && nmapTextResult.ports.length > 0) {
    return {
      format: 'rustscan',
      detectedIp: detectedIp || nmapTextResult.detectedIp,
      detectedHost: nmapTextResult.detectedHost,
      detectedOs: nmapTextResult.detectedOs,
      ports: nmapTextResult.ports,
      rawSummary: `Rustscan parsed: ${nmapTextResult.ports.length} open ports detected.`,
    };
  }

  if (discoveredPorts.length === 0) return null;

  const uniquePorts = Array.from(new Set(discoveredPorts)).sort((a, b) => a - b);
  const ports: ParsedPort[] = uniquePorts.map((portNum) => {
    const { tools, cve } = getServiceIntelligence(portNum, 'unknown', 'Unknown');
    return {
      port: portNum,
      protocol: 'tcp',
      state: 'open',
      service: 'unknown',
      version: 'Unknown',
      suggestedTools: tools,
      cveNotes: cve,
    };
  });

  return {
    format: 'rustscan',
    detectedIp,
    ports,
    rawSummary: `Rustscan parsed: ${ports.length} open ports detected on target.`,
  };
}

const IPV4_SRC = String.raw`(?:\d{1,3}\.){3}\d{1,3}`;
const IPV6_SRC = String.raw`(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?:%\w+)?`;
const HOST_REPORT_REGEX = new RegExp(`Nmap scan report for (?:([^\\s(]+)\\s\\()?(${IPV4_SRC}|${IPV6_SRC})?`, 'i');
const PORT_LINE_REGEX = /^(\d{1,5})\/(tcp|udp)\s+(open(?:\|filtered)?)\s+(\S+)\s*([^\r\n]*)/i;
const NSE_LINE_REGEX = /^\s*(?:\|_|[|_])\s*([\w-]+):\s*(.*)$/;
const NSE_SUB_LINE_REGEX = /^\s*(?:\|_|[|_])\s+(.*)$/;

/**
 * Parse Standard Nmap text output (.nmap / console output)
 * Supports IPv4/IPv6 target identification, service versioning, and NSE script capture
 */
export function parseNmapText(content: string): ScanImportResult | null {
  // Also accept headerless snippets made of bare "22/tcp open ssh" port lines
  const hasOpenPortLine = /^\s*\d{1,5}\/(?:tcp|udp)\s+open/im.test(content);
  if (!content.includes('Nmap scan report') && !content.includes('PORT') && !content.includes('STATE') && !hasOpenPortLine) {
    return null;
  }

  let detectedIp: string | undefined;
  let detectedHost: string | undefined;

  const hostMatch = content.match(HOST_REPORT_REGEX);
  if (hostMatch) {
    if (hostMatch[2]) {
      detectedIp = hostMatch[2];
      detectedHost = hostMatch[1] || hostMatch[2];
    } else if (hostMatch[1]) {
      // Check if hostMatch[1] looks like an IP
      if (new RegExp(`^${IPV4_SRC}$`).test(hostMatch[1]) || new RegExp(`^${IPV6_SRC}$`).test(hostMatch[1])) {
        detectedIp = hostMatch[1];
        detectedHost = hostMatch[1];
      } else {
        detectedHost = hostMatch[1];
      }
    }
  }

  const osMatch = content.match(/Service Info:[^\n\r]*?\bOSs?:\s*([^;\n\r]+)/i);

  const ports: ParsedPort[] = [];
  let currentPort: ParsedPort | null = null;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const pMatch = trimmed.match(PORT_LINE_REGEX);
    if (pMatch) {
      const portNum = parseInt(pMatch[1], 10);
      if (!isValidPort(portNum)) {
        currentPort = null;
        continue;
      }
      const proto = pMatch[2].toLowerCase();
      const state = pMatch[3].toLowerCase();
      const service = pMatch[4].toLowerCase();
      const version = pMatch[5].trim() || 'Unknown Version';

      const { tools, cve } = getServiceIntelligence(portNum, service, version);

      const newPort: ParsedPort = {
        port: portNum,
        protocol: proto,
        state,
        service,
        version,
        suggestedTools: tools,
        cveNotes: cve,
        scripts: {},
      };
      currentPort = newPort;
      ports.push(newPort);
      continue;
    }

    const nse = line.match(NSE_LINE_REGEX);
    if (nse && currentPort) {
      currentPort.scripts = currentPort.scripts || {};
      const scriptName = nse[1];
      const scriptData = nse[2].trim();
      currentPort.scripts[scriptName] = scriptData;

      if (scriptName.includes('anon') && /allowed|anonymous/i.test(scriptData)) {
        currentPort.cveNotes = currentPort.cveNotes ? `${currentPort.cveNotes} | Anon Access` : 'Anonymous Access Allowed';
      }
      continue;
    }

    const nseSub = line.match(NSE_SUB_LINE_REGEX);
    if (nseSub && currentPort && currentPort.scripts) {
      const scriptKeys = Object.keys(currentPort.scripts);
      if (scriptKeys.length > 0) {
        const lastKey = scriptKeys[scriptKeys.length - 1];
        currentPort.scripts[lastKey] += `\n${nseSub[1].trim()}`;
      }
    }
  }

  if (ports.length === 0 && !detectedIp) return null;

  // Multi-host report: one "Nmap scan report for" section per host
  let hosts: ParsedHost[] | undefined;
  const sections = content.split(/^(?=Nmap scan report for )/im).filter((sec) => /^Nmap scan report for /i.test(sec));
  if (sections.length > 1) {
    hosts = sections.map((sec) => {
      const sub = parseNmapText(sec);
      return {
        ip: sub?.detectedIp,
        hostname: sub?.detectedHost && sub.detectedHost !== sub.detectedIp ? sub.detectedHost : undefined,
        os: sub?.detectedOs,
        ports: sub?.ports ?? [],
      };
    });
  }

  return {
    format: 'nmap-text',
    detectedIp,
    detectedHost,
    detectedOs: osMatch ? osMatch[1].trim() : undefined,
    ports,
    ...(hosts ? { hosts } : {}),
    rawSummary: `Standard Nmap scan report: ${ports.length} open ports identified.`,
  };
}

/**
 * Universal auto-detecting scan intake dispatcher
 */
export function detectAndParseScan(rawInput: string): ScanImportResult | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // 1. Check for Nmap XML
  if (trimmed.startsWith('<?xml') || trimmed.includes('<nmaprun') || trimmed.includes('<host>')) {
    const xmlResult = parseNmapXml(trimmed);
    if (xmlResult) return xmlResult;
  }

  // 2. Check for Grepable Nmap
  if (trimmed.includes('Ports:') && (trimmed.includes('# Nmap') || trimmed.includes('Host:'))) {
    const gnmapResult = parseGrepableNmap(trimmed);
    if (gnmapResult) return gnmapResult;
  }

  // 3. Check for Rustscan
  if (trimmed.toLowerCase().includes('rustscan') || (trimmed.includes('Open ') && trimmed.includes(':'))) {
    const rustscanResult = parseRustscan(trimmed);
    if (rustscanResult) return rustscanResult;
  }

  // 4. Standard Nmap Text Output
  const nmapTextResult = parseNmapText(trimmed);
  if (nmapTextResult) return nmapTextResult;

  // 5. Fallback: Raw Port List
  // Extract potential IP address if present in raw text
  const ipMatch = trimmed.match(/\b([0-9]{1,3}(?:\.[0-9]{1,3}){3})\b/);
  const detectedIp = ipMatch ? ipMatch[1] : undefined;

  // Strip all IPv4 addresses, IPv6 addresses, CVE IDs, and version strings first to avoid leaking false ports
  const sanitizedForPorts = trimmed
    .replace(new RegExp(IPV4_SRC, 'g'), ' ')
    .replace(new RegExp(IPV6_SRC, 'g'), ' ')
    .replace(/\bCVE-\d{4}-\d{4,7}\b/gi, ' ')
    .replace(/\b\d+\.\d+(?:\.\d+)*\b/g, ' ');

  // Match isolated port numbers
  const candidateMatches = [...sanitizedForPorts.matchAll(/(?<![.\w:-])(\d{1,5})(?![.\w:-])/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => isValidPort(n));

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const listLike = lines.length >= 1 && lines.every((l) => /^[\s,0-9\-/:|]+$/.test(l));
  const hasPortContext = /(?:ports?|open|listening|tcp|udp)/i.test(trimmed);

  if (candidateMatches.length > 0 && (listLike || hasPortContext)) {
    const uniquePorts = Array.from(new Set(candidateMatches)).sort((a, b) => a - b);
    const ports: ParsedPort[] = uniquePorts.map((p) => {
      const { tools, cve } = getServiceIntelligence(p, 'tcp');
      return {
        port: p,
        protocol: 'tcp',
        state: 'open',
        service: 'service',
        version: 'Raw port intake',
        suggestedTools: tools,
        cveNotes: cve,
      };
    });

    return {
      format: 'raw-ports',
      detectedIp,
      ports,
      rawSummary: `Manual port intake: ${ports.length} ports extracted${detectedIp ? ` for ${detectedIp}` : ''}.`,
    };
  }

  return null;
}
