const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]*:[0-9a-f:.]*$/i;

function isLooseIp(ip: string): boolean {
  if (IPV4.test(ip)) return ip.split('.').every((o) => Number(o) <= 255);
  return IPV6.test(ip) && ip.includes(':') && ip.length >= 2;
}

// eslint-disable-next-line no-control-regex
const BAD_NAME = /[\s\u0000-\u001f\u007f"$`\\;|&()<>]/;

export function formatHostsLine(ip: string, domain?: string, vhosts?: string[]): string {
  const addr = (ip ?? '').trim();
  if (!addr || !isLooseIp(addr)) return '';
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of [domain, ...(vhosts ?? [])]) {
    if (typeof raw !== 'string') continue;
    const n = raw.trim().toLowerCase();
    if (!n || BAD_NAME.test(n) || seen.has(n)) continue;
    seen.add(n);
    names.push(n);
  }
  if (names.length === 0) return '';
  return `${addr}\t${names.join(' ')}`;
}
