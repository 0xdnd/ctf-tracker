export interface ParsedSearchQuery {
  text: string;
  filters: {
    port?: number[];
    os?: string[];
    difficulty?: string[];
    platform?: string[];
    track?: string[];
    status?: string[];
    review?: 'due';
  };
}

export interface SearchableMachine {
  name: string;
  ip?: string;
  os?: string;
  difficulty?: string;
  platform?: string;
  status?: string;
  openPorts?: Array<number | string | { port: number | string }>;
  services?: Array<{ port?: number | string } | string>;
  tags?: string[];
}

export interface MatchOpts<M> {
  isDue?: (m: M) => boolean;
  trackIds?: (m: M) => string[];
}

const KEY_MAP: Record<string, string> = {
  port: 'port',
  os: 'os',
  diff: 'difficulty',
  difficulty: 'difficulty',
  platform: 'platform',
  track: 'track',
  status: 'status',
  review: 'review',
};

/** Split into tokens, keeping "quoted phrases" (optionally after key:) together. */
function tokenize(q: string): { raw: string; quoted: boolean }[] {
  const tokens: { raw: string; quoted: boolean }[] = [];
  const re = /(?:([A-Za-z]+):)?"([^"]*)"|(\S+)/g;
  for (const m of q.matchAll(re)) {
    if (m[3] !== undefined) tokens.push({ raw: m[3], quoted: false });
    else tokens.push({ raw: m[1] ? `${m[1]}:${m[2]}` : m[2], quoted: !m[1] });
  }
  return tokens;
}

export function parseSearchQuery(q: string): ParsedSearchQuery {
  const filters: ParsedSearchQuery['filters'] = {};
  const text: string[] = [];
  for (const { raw, quoted } of tokenize(q ?? '')) {
    const idx = raw.indexOf(':');
    const key = !quoted && idx > 0 ? KEY_MAP[raw.slice(0, idx).toLowerCase()] : undefined;
    const value = key ? raw.slice(idx + 1) : '';
    const vals = value.split(',').map((v) => v.trim()).filter(Boolean);
    if (!key || vals.length === 0) {
      text.push(raw);
      continue;
    }
    if (key === 'review') {
      if (vals.length === 1 && vals[0].toLowerCase() === 'due') filters.review = 'due';
      else text.push(raw);
    } else if (key === 'port') {
      const ports = vals.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
      if (ports.length === 0) text.push(raw);
      else filters.port = [...(filters.port ?? []), ...ports];
    } else {
      const k = key as 'os' | 'difficulty' | 'platform' | 'track' | 'status';
      filters[k] = [...(filters[k] ?? []), ...vals.map((v) => v.toLowerCase())];
    }
  }
  return { text: text.join(' ').trim(), filters };
}

const portOf = (p: unknown): number => {
  if (p && typeof p === 'object' && 'port' in p) return Number((p as { port: unknown }).port);
  return Number(p);
};

export function matchesSearchQuery<M extends SearchableMachine>(
  machine: M,
  parsed: ParsedSearchQuery,
  opts: MatchOpts<M> = {},
): boolean {
  const { filters, text } = parsed;
  const eq = (v: string | undefined, list?: string[]) =>
    !list || list.length === 0 || (v !== undefined && list.includes(v.toLowerCase()));

  if (!eq(machine.os, filters.os)) return false;
  if (!eq(machine.difficulty, filters.difficulty)) return false;
  if (!eq(machine.platform, filters.platform)) return false;
  if (!eq(machine.status, filters.status)) return false;

  if (filters.port && filters.port.length > 0) {
    const ports = new Set<number>();
    for (const p of machine.openPorts ?? []) ports.add(portOf(p));
    for (const s of machine.services ?? []) if (typeof s !== 'string') ports.add(portOf(s.port));
    if (!filters.port.some((p) => ports.has(p))) return false;
  }
  if (filters.track && filters.track.length > 0) {
    const ids = (opts.trackIds?.(machine) ?? []).map((t) => t.toLowerCase());
    if (!filters.track.some((t) => ids.includes(t))) return false;
  }
  if (filters.review === 'due' && !(opts.isDue?.(machine) ?? false)) return false;

  if (text) {
    const hay = [machine.name, machine.ip ?? '', machine.os ?? '', ...(machine.tags ?? [])].join('\n').toLowerCase();
    const needle = text.toLowerCase();
    if (!hay.includes(needle) && !needle.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
