/** Cleans a typed IP/host: trims, strips an accidental http(s):// prefix and anything after the first "/". */
export function sanitizeIpInput(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
}

/** A machine IP that is empty or a template stand-in (contains "x", or the literal 10.10.10.X). */
export function isPlaceholderIp(ip: string | undefined | null): boolean {
  return !ip || ip.toLowerCase().includes('x') || ip === '10.10.10.X';
}
