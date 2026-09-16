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
}

export interface ScanImportResult {
  format: 'nmap-xml' | 'nmap-text' | 'gnmap' | 'rustscan' | 'raw-ports';
  detectedIp?: string;
  detectedHost?: string;
  detectedOs?: string;
  ports: ParsedPort[];
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
    if (v.includes('2.3.4')) cve = 'CVE-2011-2523 (vsftpd Backdoor RCE)';
    else if (v.includes('proftpd 1.3.5')) cve = 'CVE-2015-3306 (mod_copy File Copy)';
  } else if (s.includes('ssh') || port === 22) {
    tools.push('ssh', 'ssh-audit', 'hydra');
    if (v.includes('libssh 0.6')) cve = 'CVE-2018-10933 (Authentication Bypass)';
  } else if (s.includes('http') || port === 80 || port === 443 || port === 8080 || port === 8443) {
    tools.push('ffuf', 'gobuster', 'whatweb', 'nikto', 'feroxbuster');
    if (v.includes('2.4.49')) cve = 'CVE-2021-41773 (Apache Path Traversal/RCE)';
    else if (v.includes('2.4.50')) cve = 'CVE-2021-42013 (Apache RCE Bypass)';
    else if (v.includes('tomcat') && v.includes('9.0.30')) cve = 'CVE-2020-1938 (Ghostcat)';
  } else if (s.includes('smb') || s.includes('microsoft-ds') || s.includes('netbios') || port === 445 || port === 139) {
    tools.push('crackmapexec smb', 'netexec smb', 'enum4linux-ng', 'smbclient -L', 'smbmap');
    if (v.includes('3.0.20')) cve = 'CVE-2007-2447 (Samba usermap script RCE)';
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
    if (v.includes('5.1') || v.includes('6.0')) cve = 'CVE-2019-0708 (BlueKeep)';
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

    // Defense against XML entity expansion (Billion Laughs) and XXE constructs
    const sanitizedXml = xmlContent
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<!ENTITY[\s\S]*?>/gi, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedXml, 'text/xml');

    // Safeguard against XML parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) return null;

    const nmaprun = doc.querySelector('nmaprun');
    if (!nmaprun) return null;

    let detectedIp: string | undefined;
    let detectedHost: string | undefined;
    let detectedOs: string | undefined;
    const ports: ParsedPort[] = [];

    const hostNode = doc.querySelector('host');
    if (hostNode) {
      const addressNode = hostNode.querySelector('address[addrtype="ipv4"]') || hostNode.querySelector('address');
      if (addressNode) {
        detectedIp = addressNode.getAttribute('addr') || undefined;
      }

      const hostnameNode = hostNode.querySelector('hostname');
      if (hostnameNode) {
        detectedHost = hostnameNode.getAttribute('name') || undefined;
      }

      const osMatchNode = hostNode.querySelector('osmatch');
      if (osMatchNode) {
        detectedOs = osMatchNode.getAttribute('name') || undefined;
      }

      const portNodes = hostNode.querySelectorAll('ports > port');
      portNodes.forEach((portEl) => {
        const stateEl = portEl.querySelector('state');
        const state = stateEl?.getAttribute('state') || 'closed';
        if (state !== 'open') return;

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

        ports.push({
          port: portNum,
          protocol,
          state: 'open',
          service,
          version: fullVersion,
          suggestedTools: tools,
          cveNotes: cve,
        });
      });
    }

    if (ports.length === 0 && !detectedIp) return null;

    return {
      format: 'nmap-xml',
      detectedIp,
      detectedHost,
      detectedOs,
      ports,
      rawSummary: `Nmap XML scan parsed with ${ports.length} open ports discovered.`,
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

  for (const line of lines) {
    if (line.startsWith('Host:')) {
      const hostMatch = line.match(/^Host:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s*(?:\(([^)]*)\))?/);
      if (hostMatch) {
        detectedIp = hostMatch[1];
        if (hostMatch[2]) detectedHost = hostMatch[2];
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

            if (state === 'open' && isValidPort(portNum)) {
              const { tools, cve } = getServiceIntelligence(portNum, service, version);
              ports.push({
                port: portNum,
                protocol: proto,
                state: 'open',
                service,
                version,
                suggestedTools: tools,
                cveNotes: cve,
              });
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

/**
 * Parse Standard Nmap text output (.nmap / console output)
 */
export function parseNmapText(content: string): ScanImportResult | null {
  if (!content.includes('Nmap scan report') && !content.includes('PORT') && !content.includes('STATE')) {
    return null;
  }

  const ipMatch = content.match(/Nmap scan report for (?:[^\s(]+\s\()?([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
  const hostMatch = content.match(/Nmap scan report for ([^\s(]+)/);
  const osMatch = content.match(/Service Info:[^\n\r]*?\bOSs?:\s*([^;\n\r]+)/i);

  const portRegex = /([0-9]{1,5})\/(tcp|udp)\s+open\s+([^\s]+)\s*([^\r\n]*)/gi;
  const ports: ParsedPort[] = [];
  let match: RegExpExecArray | null;

  while ((match = portRegex.exec(content)) !== null) {
    const portNum = parseInt(match[1], 10);
    if (!isValidPort(portNum)) continue;
    const proto = match[2].toLowerCase();
    const service = match[3].toLowerCase();
    const version = match[4].trim() || 'Unknown Version';

    const { tools, cve } = getServiceIntelligence(portNum, service, version);

    ports.push({
      port: portNum,
      protocol: proto,
      state: 'open',
      service,
      version,
      suggestedTools: tools,
      cveNotes: cve,
    });
  }

  if (ports.length === 0 && !ipMatch) return null;

  return {
    format: 'nmap-text',
    detectedIp: ipMatch ? ipMatch[1] : undefined,
    detectedHost: hostMatch ? hostMatch[1] : undefined,
    detectedOs: osMatch ? osMatch[1].trim() : undefined,
    ports,
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

  // Strip all IPv4 addresses and IPv6 addresses first so octets like 10.10.10.3 aren't extracted as ports 10 and 3
  const sanitizedForPorts = trimmed
    .replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, ' ')
    .replace(/\b[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){1,7}\b/g, ' ');

  // Match isolated port numbers (not touching dots, hyphens, or version decimals)
  const numbers = sanitizedForPorts.match(/(?<![.\w])([0-9]{1,5})(?![.\w])/g);
  if (numbers && numbers.length > 0) {
    const validPorts = Array.from(
      new Set(numbers.map((n) => parseInt(n, 10)).filter((n) => n > 0 && n <= 65535))
    ).sort((a, b) => a - b);

    if (validPorts.length > 0) {
      const ports: ParsedPort[] = validPorts.map((p) => {
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
  }

  return null;
}
