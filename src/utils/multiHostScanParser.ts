/**
 * multiHostScanParser.ts
 * Universal Multi-Tool & Multi-Host Reconnaissance Parser.
 * Supports Nmap (XML, Grepable, Text), NetExec / CrackMapExec (SMB/LDAP/WinRM/MSSQL),
 * and Web Fuzzers (ffuf, gobuster, feroxbuster) across single targets and subnets.
 * 100% Environment-Agnostic (Browser + Node/Vitest portable with zero external deps).
 */

export interface ParsedPortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'filtered' | 'closed';
  service: string;
  version: string;
  banner?: string;
}

export interface WebFuzzResult {
  path: string;
  statusCode: number;
  length?: number;
  words?: number;
  redirectUrl?: string;
}

export interface HostScanProfile {
  ip: string;
  hostname?: string;
  domain?: string;
  os?: string;
  isDomainController: boolean;
  smbSigning?: boolean;
  ports: ParsedPortInfo[];
  webFindings: WebFuzzResult[];
  vhosts: string[];
  suggestedTags: string[];
  hostsFileEntry: string;
}

export type ScanFormatDetected =
  | 'nmap-xml'
  | 'nmap-grepable'
  | 'nmap-text'
  | 'netexec'
  | 'web-fuzz-json'
  | 'web-fuzz-text'
  | 'unknown';

export interface MultiHostParseReport {
  format: ScanFormatDetected;
  hosts: HostScanProfile[];
  rawHostCount: number;
  summary: string;
}

/**
 * Checks if a set of open ports matches an Active Directory Domain Controller profile.
 * High-confidence signature: Kerberos (88), LDAP (389 or 636), and SMB (445).
 */
export function isDomainControllerPorts(ports: ParsedPortInfo[]): boolean {
  const openPortNumbers = new Set(
    ports.filter((p) => p.state === 'open').map((p) => p.port)
  );

  const hasKerberos = openPortNumbers.has(88);
  const hasLdap = openPortNumbers.has(389) || openPortNumbers.has(636);
  const hasSmb = openPortNumbers.has(445);

  return hasKerberos && hasLdap && hasSmb;
}

/**
 * Builds recommended methodology tags for a host profile.
 */
export function deriveMethodologyTags(
  ports: ParsedPortInfo[],
  isDc: boolean,
  smbSigning?: boolean,
  webCount: number = 0
): string[] {
  const tags = new Set<string>();
  const openPortNumbers = new Set(
    ports.filter((p) => p.state === 'open').map((p) => p.port)
  );

  if (isDc) {
    tags.add('Active-Directory');
    tags.add('Domain-Controller');
    tags.add('Kerberos');
    tags.add('LDAP');
    tags.add('BloodHound');
  }

  if (openPortNumbers.has(445) || openPortNumbers.has(139)) {
    tags.add('SMB');
    if (smbSigning === false) {
      tags.add('SMB-Relay');
    }
  }

  if (openPortNumbers.has(80) || openPortNumbers.has(443) || openPortNumbers.has(8080) || openPortNumbers.has(8443) || webCount > 0) {
    tags.add('Web');
    tags.add('Web-Enumeration');
  }

  if (openPortNumbers.has(22)) tags.add('SSH');
  if (openPortNumbers.has(21)) tags.add('FTP');
  if (openPortNumbers.has(3389)) tags.add('RDP');
  if (openPortNumbers.has(5985) || openPortNumbers.has(5986)) tags.add('WinRM');
  if (openPortNumbers.has(1433)) tags.add('MSSQL');
  if (openPortNumbers.has(3306)) tags.add('MySQL');
  if (openPortNumbers.has(53)) tags.add('DNS');
  if (openPortNumbers.has(161)) tags.add('SNMP');

  return Array.from(tags);
}

/**
 * Generates an /etc/hosts ready-to-copy terminal command.
 */
export function generateHostsFileEntry(ip: string, domain?: string, hostname?: string): string {
  if (!ip) return '';
  const entries: string[] = [];
  if (domain) entries.push(domain.toLowerCase());
  if (hostname && domain) {
    entries.push(`${hostname.toLowerCase()}.${domain.toLowerCase()}`);
  }
  if (hostname && !domain) {
    entries.push(hostname.toLowerCase());
  }

  const distinctNames = Array.from(new Set(entries)).join(' ');
  if (!distinctNames) {
    return `# Add host entry:\n# echo "${ip} target.htb" | sudo tee -a /etc/hosts`;
  }
  return `echo "${ip} ${distinctNames}" | sudo tee -a /etc/hosts`;
}

/**
 * Extracts domain / vhost / hostname from SSL certificate Subject and HTTP location banners.
 */
export function extractVhostsAndDomains(text: string): { domains: string[]; vhosts: string[] } {
  const domains = new Set<string>();
  const vhosts = new Set<string>();

  // SSL CommonName: e.g. commonName=dc01.corp.local or commonName=*.target.htb
  const sslCnRegex = /commonName=([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match: RegExpExecArray | null;
  while ((match = sslCnRegex.exec(text)) !== null) {
    const val = match[1].toLowerCase().replace(/^\*\./, '');
    domains.add(val);
    vhosts.add(val);
  }

  // HTTP Location redirects e.g. Location: http://site.htb/ or http://internal.corp.local/
  const redirectRegex = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  while ((match = redirectRegex.exec(text)) !== null) {
    const host = match[1].toLowerCase();
    if (!host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      domains.add(host);
      vhosts.add(host);
    }
  }

  return {
    domains: Array.from(domains),
    vhosts: Array.from(vhosts),
  };
}

/**
 * Environment-Agnostic Nmap XML Parser (Pure regex / string traversal for total portability).
 */
export function parseNmapXmlPortable(content: string): HostScanProfile[] {
  const hosts: HostScanProfile[] = [];
  // Match each <host> ... </host> block
  const hostBlocks = content.match(/<host[\s\S]*?<\/host>/gi) || [];

  for (const block of hostBlocks) {
    // Extract IP address
    const ipMatch =
      block.match(/<address[^>]+addr="([0-9.]+)"[^>]+addrtype="ipv4"/i) ||
      block.match(/<address[^>]+addr="([0-9.]+)"/i);
    if (!ipMatch) continue;
    const ip = ipMatch[1];

    // Extract Hostnames
    const hostnameMatch = block.match(/<hostname[^>]+name="([^"]+)"/i);
    const hostname = hostnameMatch ? hostnameMatch[1] : undefined;

    // Extract OS
    const osMatch = block.match(/<osmatch[^>]+name="([^"]+)"/i);
    const os = osMatch ? osMatch[1] : undefined;

    // Extract Ports
    const ports: ParsedPortInfo[] = [];
    const portBlocks = block.match(/<port[\s\S]*?<\/port>/gi) || [];

    for (const pBlock of portBlocks) {
      const portIdMatch = pBlock.match(/portid="(\d+)"/i);
      const protoMatch = pBlock.match(/protocol="([a-zA-Z]+)"/i);
      const stateMatch = pBlock.match(/<state[^>]+state="([a-zA-Z]+)"/i);

      if (!portIdMatch) continue;
      const port = parseInt(portIdMatch[1], 10);
      const protocol = (protoMatch ? protoMatch[1].toLowerCase() : 'tcp') as 'tcp' | 'udp';
      const state = (stateMatch ? stateMatch[1].toLowerCase() : 'closed') as 'open' | 'filtered' | 'closed';

      const serviceMatch = pBlock.match(/<service[^>]+name="([^"]*)"/i);
      const service = serviceMatch ? serviceMatch[1] : 'unknown';

      const productMatch = pBlock.match(/product="([^"]*)"/i);
      const versionMatch = pBlock.match(/version="([^"]*)"/i);
      const extMatch = pBlock.match(/extrainfo="([^"]*)"/i);

      const versionParts = [
        productMatch ? productMatch[1] : '',
        versionMatch ? versionMatch[1] : '',
        extMatch ? extMatch[1] : '',
      ].filter(Boolean);
      const version = versionParts.join(' ');

      ports.push({ port, protocol, state, service, version });
    }

    // Extract Intelligence
    const intel = extractVhostsAndDomains(block);
    let domain: string | undefined;
    if (intel.domains.length > 0) {
      domain = intel.domains[0];
    }

    const isDc = isDomainControllerPorts(ports);
    const tags = deriveMethodologyTags(ports, isDc);
    const hostsEntry = generateHostsFileEntry(ip, domain, hostname);

    hosts.push({
      ip,
      hostname,
      domain,
      os,
      isDomainController: isDc,
      ports,
      webFindings: [],
      vhosts: intel.vhosts,
      suggestedTags: tags,
      hostsFileEntry: hostsEntry,
    });
  }

  return hosts;
}

/**
 * Parses Nmap Grepable (.gnmap) files.
 */
export function parseNmapGrepable(content: string): HostScanProfile[] {
  const hosts: HostScanProfile[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.startsWith('Host:')) continue;

    // Host: 10.10.10.1 (hostname.domain.com) Ports: 22/open/tcp//ssh//OpenSSH...
    const hostMatch = line.match(/^Host:\s+([0-9.]+)(?:\s+\(([^)]*)\))?/i);
    if (!hostMatch) continue;
    const ip = hostMatch[1];
    const fullHost = hostMatch[2] || '';

    let hostname: string | undefined;
    let domain: string | undefined;

    if (fullHost && fullHost !== ip) {
      if (fullHost.includes('.')) {
        const parts = fullHost.split('.');
        hostname = parts[0];
        domain = parts.slice(1).join('.');
      } else {
        hostname = fullHost;
      }
    }

    const ports: ParsedPortInfo[] = [];
    const portsIndex = line.indexOf('Ports:');
    if (portsIndex !== -1) {
      const portsPart = line.slice(portsIndex + 6);
      const rawPortItems = portsPart.split(',');

      for (const item of rawPortItems) {
        // e.g. 22/open/tcp//ssh//OpenSSH 8.2p1/
        const segs = item.trim().split('/');
        if (segs.length >= 7) {
          const port = parseInt(segs[0], 10);
          const state = (segs[1] || 'closed').toLowerCase() as 'open' | 'filtered' | 'closed';
          const protocol = (segs[2] || 'tcp').toLowerCase() as 'tcp' | 'udp';
          const service = segs[4] || 'unknown';
          const version = segs[6] || '';

          if (!isNaN(port)) {
            ports.push({ port, protocol, state, service, version });
          }
        }
      }
    }

    const isDc = isDomainControllerPorts(ports);
    const tags = deriveMethodologyTags(ports, isDc);
    const hostsEntry = generateHostsFileEntry(ip, domain, hostname);

    hosts.push({
      ip,
      hostname,
      domain,
      isDomainController: isDc,
      ports,
      webFindings: [],
      vhosts: domain ? [domain] : [],
      suggestedTags: tags,
      hostsFileEntry: hostsEntry,
    });
  }

  return hosts;
}

/**
 * Parses Nmap Standard Terminal Text pasted directly from shell.
 */
export function parseNmapText(content: string): HostScanProfile[] {
  const hosts: HostScanProfile[] = [];
  // Split on "Nmap scan report for "
  const rawSections = content.split(/Nmap scan report for /i);

  for (let i = 1; i < rawSections.length; i++) {
    const section = rawSections[i];
    const lines = section.split('\n');
    const headerLine = lines[0].trim();

    // Can be: "10.10.10.161" or "dc.htb.local (10.10.10.161)"
    let ip = '';
    let hostname: string | undefined;
    let domain: string | undefined;

    const parenMatch = headerLine.match(/^(.*?)\s*\(([0-9.]+)\)/);
    if (parenMatch) {
      ip = parenMatch[2];
      const hostPart = parenMatch[1].trim();
      if (hostPart.includes('.')) {
        const parts = hostPart.split('.');
        hostname = parts[0];
        domain = parts.slice(1).join('.');
      } else {
        hostname = hostPart;
      }
    } else {
      const singleIp = headerLine.match(/^([0-9.]+)/);
      if (singleIp) {
        ip = singleIp[1];
      }
    }

    if (!ip) continue;

    const ports: ParsedPortInfo[] = [];
    let os: string | undefined;

    for (const line of lines) {
      const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+([^\s]+)(?:\s+(.*))?$/i);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        const protocol = portMatch[2].toLowerCase() as 'tcp' | 'udp';
        const state = portMatch[3].toLowerCase() as 'open' | 'filtered' | 'closed';
        const service = portMatch[4] || 'unknown';
        const version = (portMatch[5] || '').trim();
        ports.push({ port, protocol, state, service, version });
      }

      if (line.toLowerCase().includes('os details:') || line.toLowerCase().includes('running:')) {
        os = line.split(':')[1]?.trim();
      }
    }

    const intel = extractVhostsAndDomains(section);
    if (!domain && intel.domains.length > 0) {
      domain = intel.domains[0];
    }

    const isDc = isDomainControllerPorts(ports);
    const tags = deriveMethodologyTags(ports, isDc);
    const hostsEntry = generateHostsFileEntry(ip, domain, hostname);

    hosts.push({
      ip,
      hostname,
      domain,
      os,
      isDomainController: isDc,
      ports,
      webFindings: [],
      vhosts: intel.vhosts,
      suggestedTags: tags,
      hostsFileEntry: hostsEntry,
    });
  }

  return hosts;
}

/**
 * Parses NetExec (nxc) and CrackMapExec terminal output.
 * Lines look like:
 * SMB  10.10.10.161  445  FOREST  [*] Windows 10.0 Build 17763 x64 (name:FOREST) (domain:htb.local) (signing:False) (SMBv1:False)
 */
export function parseNetExecText(content: string): HostScanProfile[] {
  const hostsMap = new Map<string, HostScanProfile>();
  const lines = content.split('\n');

  // Protocol regex: (SMB|LDAP|WINRM|MSSQL)  <IP>  <PORT>  <NAME> ...
  const nxcRegex = /^(SMB|LDAP|WINRM|MSSQL)\s+([0-9.]+)\s+(\d+)\s+([^\s]+)\s+\[[*+!-]\]\s+(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(nxcRegex);
    if (!match) continue;

    const protocol = match[1].toUpperCase();
    const ip = match[2];
    const port = parseInt(match[3], 10);
    const hostHint = match[4];
    const rest = match[5];

    let hostProfile = hostsMap.get(ip);
    if (!hostProfile) {
      hostProfile = {
        ip,
        ports: [],
        webFindings: [],
        vhosts: [],
        suggestedTags: [],
        isDomainController: false,
        hostsFileEntry: '',
      };
      hostsMap.set(ip, hostProfile);
    }

    // Add port
    if (!hostProfile.ports.some((p) => p.port === port)) {
      hostProfile.ports.push({
        port,
        protocol: 'tcp',
        state: 'open',
        service: protocol.toLowerCase(),
        version: rest.slice(0, 50),
      });
    }

    // Extract name:NAME, domain:DOMAIN, signing:TRUE/FALSE
    const nameMatch = rest.match(/\(name:([^)]+)\)/i);
    const domainMatch = rest.match(/\(domain:([^)]+)\)/i);
    const signingMatch = rest.match(/\(signing:(True|False)\)/i);

    if (nameMatch) {
      hostProfile.hostname = nameMatch[1];
    } else if (hostHint && hostHint !== ip && !hostProfile.hostname) {
      hostProfile.hostname = hostHint;
    }

    if (domainMatch) {
      hostProfile.domain = domainMatch[1];
    }

    if (signingMatch) {
      hostProfile.smbSigning = signingMatch[1].toLowerCase() === 'true';
    }

    // Extract OS
    const osExtract = rest.match(/^([^(]+)/);
    if (osExtract && !hostProfile.os) {
      hostProfile.os = osExtract[1].trim();
    }
  }

  // Finalize profiles
  const result: HostScanProfile[] = [];
  for (const profile of hostsMap.values()) {
    profile.isDomainController =
      isDomainControllerPorts(profile.ports) ||
      (profile.domain !== undefined && profile.ports.some((p) => p.port === 88 || p.port === 389));
    profile.suggestedTags = deriveMethodologyTags(
      profile.ports,
      profile.isDomainController,
      profile.smbSigning
    );
    profile.hostsFileEntry = generateHostsFileEntry(
      profile.ip,
      profile.domain,
      profile.hostname
    );
    result.push(profile);
  }

  return result;
}

/**
 * Parses Web Fuzzing outputs from ffuf (JSON or text), gobuster, or feroxbuster.
 */
export function parseWebFuzzContent(content: string): WebFuzzResult[] {
  const findings: WebFuzzResult[] = [];
  const trimmed = content.trim();

  // 1. Try JSON (ffuf -o output.json)
  if (trimmed.startsWith('{') && trimmed.includes('"results"')) {
    try {
      const data = JSON.parse(trimmed);
      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          findings.push({
            path: item.input?.FUZZ || item.url || '',
            statusCode: item.status || 200,
            length: item.length,
            words: item.words,
            redirectUrl: item.redirectlocation,
          });
        }
        return findings;
      }
    } catch {
      // Fall through to text parsing
    }
  }

  // 2. Line by line text parsing
  const lines = trimmed.split('\n');
  for (const line of lines) {
    // Gobuster: /admin (Status: 301) [Size: 178] [--> http://target.htb/admin/]
    const gobusterMatch = line.match(/^(\/[^\s]+)\s+\(Status:\s+(\d+)\)(?:\s+\[Size:\s+(\d+)\])?(?:\s+\[-->\s+([^\]]+)\])?/i);
    if (gobusterMatch) {
      findings.push({
        path: gobusterMatch[1],
        statusCode: parseInt(gobusterMatch[2], 10),
        length: gobusterMatch[3] ? parseInt(gobusterMatch[3], 10) : undefined,
        redirectUrl: gobusterMatch[4],
      });
      continue;
    }

    // Feroxbuster: 200      GET        123l      456w     7890c http://target.htb/path
    const feroxMatch = line.match(/^(\d{3})\s+[A-Z]+\s+(\d+)l\s+(\d+)w\s+(\d+)c\s+(https?:\/\/[^\s]+)/i);
    if (feroxMatch) {
      findings.push({
        path: feroxMatch[5],
        statusCode: parseInt(feroxMatch[1], 10),
        words: parseInt(feroxMatch[3], 10),
        length: parseInt(feroxMatch[4], 10),
      });
      continue;
    }

    // Ffuf CLI: path [Status: 200, Size: 1234, Words: 56, Lines: 78]
    const ffufCliMatch = line.match(/^([^\s]+)\s+\[Status:\s+(\d+),\s+Size:\s+(\d+),\s+Words:\s+(\d+)/i);
    if (ffufCliMatch) {
      findings.push({
        path: ffufCliMatch[1],
        statusCode: parseInt(ffufCliMatch[2], 10),
        length: parseInt(ffufCliMatch[3], 10),
        words: parseInt(ffufCliMatch[4], 10),
      });
    }
  }

  return findings;
}

/**
 * Universal Auto-Detecting Master Recon Parser.
 * Automatically classifies raw scan text and produces structured multi-host profiles.
 */
export function parseMultiToolScan(content: string): MultiHostParseReport {
  if (!content || !content.trim()) {
    return {
      format: 'unknown',
      hosts: [],
      rawHostCount: 0,
      summary: 'Empty or invalid scan content provided.',
    };
  }

  const trimmed = content.trim();

  // 1. Nmap XML Detection
  if (trimmed.includes('<nmaprun') || (trimmed.includes('<?xml') && trimmed.includes('<host'))) {
    const hosts = parseNmapXmlPortable(trimmed);
    return {
      format: 'nmap-xml',
      hosts,
      rawHostCount: hosts.length,
      summary: `Nmap XML scan parsed: ${hosts.length} host(s) discovered across network.`,
    };
  }

  // 2. Nmap Grepable Detection
  if (trimmed.includes('# Nmap') && trimmed.includes('Ports:') && trimmed.includes('Host:')) {
    const hosts = parseNmapGrepable(trimmed);
    return {
      format: 'nmap-grepable',
      hosts,
      rawHostCount: hosts.length,
      summary: `Nmap Grepable (.gnmap) parsed: ${hosts.length} host(s) extracted.`,
    };
  }

  // 3. Nmap Standard Terminal Text
  if (trimmed.includes('Nmap scan report for ') || (trimmed.includes('PORT') && trimmed.includes('STATE') && trimmed.includes('SERVICE'))) {
    const hosts = parseNmapText(trimmed);
    return {
      format: 'nmap-text',
      hosts,
      rawHostCount: hosts.length,
      summary: `Nmap Terminal scan parsed: ${hosts.length} host(s) extracted.`,
    };
  }

  // 4. NetExec / CrackMapExec Detection
  if (
    /^(SMB|LDAP|WINRM|MSSQL)\s+[0-9.]+\s+\d+/im.test(trimmed) ||
    trimmed.includes('Windows 10.0') ||
    trimmed.includes('(domain:') ||
    trimmed.includes('(signing:')
  ) {
    const hosts = parseNetExecText(trimmed);
    return {
      format: 'netexec',
      hosts,
      rawHostCount: hosts.length,
      summary: `NetExec / CrackMapExec output parsed: ${hosts.length} target host(s) profiled.`,
    };
  }

  // 5. Web Fuzzing Detection
  const webFindings = parseWebFuzzContent(trimmed);
  if (webFindings.length > 0) {
    const isJson = trimmed.startsWith('{') && trimmed.includes('"results"');
    return {
      format: isJson ? 'web-fuzz-json' : 'web-fuzz-text',
      hosts: [
        {
          ip: 'Web-Fuzzing-Target',
          ports: [],
          webFindings,
          vhosts: [],
          suggestedTags: ['Web', 'Fuzzing', 'Directory-Bruteforce'],
          isDomainController: false,
          hostsFileEntry: '',
        },
      ],
      rawHostCount: 1,
      summary: `Web fuzzing findings parsed: ${webFindings.length} endpoint(s) mapped.`,
    };
  }

  return {
    format: 'unknown',
    hosts: [],
    rawHostCount: 0,
    summary: 'Unrecognized scan artifact format. Supported: Nmap (XML, gnmap, text), NetExec, ffuf, gobuster, feroxbuster.',
  };
}
