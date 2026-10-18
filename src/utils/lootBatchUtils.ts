import { isNtHash, shellQuote } from './shellEncoders';

export interface BatchCommandOptions {
  protocol?: 'smb' | 'winrm' | 'ssh' | 'mssql' | 'ldap' | 'rdp';
  tool?: 'nxc' | 'cme';
  domain?: string;
  continueOnSuccess?: boolean;
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]*:[0-9a-f:.]*$/i;
// Shell metachars that must never appear in a copy-paste target IP.
const BAD_IP_CHARS = /[\s;|&$`'"\\()<>!*?~#[\]{}]/;

function isLooseIp(ip: string): boolean {
  if (IPV4.test(ip)) return ip.split('.').every((o) => Number(o) <= 255);
  return IPV6.test(ip) && ip.includes(':') && ip.length >= 2;
}

function isValidTargetIp(raw: string): boolean {
  const ip = (raw ?? '').trim();
  if (!ip) return false;
  if (ip === '0.0.0.0') return false;
  if (BAD_IP_CHARS.test(ip)) return false;
  if (/[\r\n]/.test(ip)) return false;
  return isLooseIp(ip);
}

/**
 * Builds a weaponized, batch CLI verification command (NetExec / CrackMapExec)
 * to test a credential across multiple target IPs simultaneously.
 * Automatically switches between -p (plaintext) and -H (NTLM Pass-The-Hash) based on hash detection.
 * All credential/user/domain words are shell-quoted; target IPs are strictly
 * validated and any IP failing the loose check or containing shell metachars
 * is dropped (falls back to <TARGET_IPS> when none remain).
 */
export function buildBatchLootVerificationCommand(
  username: string,
  secret: string,
  ips: string[],
  options: BatchCommandOptions = {}
): string {
  const cleanIps = (ips ?? [])
    .map((ip) => (ip ?? '').trim())
    .filter((ip) => isValidTargetIp(ip));

  const targetsStr = cleanIps.length > 0 ? cleanIps.join(' ') : '<TARGET_IPS>';
  const tool = options.tool || 'nxc';
  const protocol = options.protocol || 'smb';
  const user = (username ?? '').trim() || 'administrator';
  const cred = (secret ?? '').trim();

  // Authentication flag: NTLM hash vs Password (both shell-quoted)
  const isHash = !!cred && isNtHash(cred);
  const authFlag = isHash ? `-H ${shellQuote(cred)}` : `-p ${shellQuote(cred)}`;

  // Domain flag (shell-quoted)
  const domain = options.domain?.trim();
  const domainFlag = domain ? `-d ${shellQuote(domain)}` : '';

  // Optional continue on success
  const continueFlag = options.continueOnSuccess !== false ? '--continue-on-success' : '';

  const parts = [
    tool,
    protocol,
    targetsStr,
    `-u ${shellQuote(user)}`,
    authFlag,
    domainFlag,
    continueFlag,
  ].filter(Boolean);

  return parts.join(' ');
}
