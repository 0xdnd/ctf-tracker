/**
 * IP templatizer — finds hard-coded IPv4 addresses in a markdown note and
 * proposes replacing them with the `{TARGET}` / `{LHOST}` placeholders that the
 * substitution engine (`variableSubstitution.ts`) resolves at render time.
 *
 * Pure module: `analyzeIps` only classifies and `applyIpTemplatize` only
 * rewrites the IPs the caller selected, so every UI can preview first.
 *
 * Classification, per distinct IP, first rule wins:
 *   1. KEEP (never offered): loopback 127.x, 0.0.0.0, multicast/reserved
 *      (first octet >= 224, covers 255.x), broadcast (.255), any IP followed by
 *      a `/n` prefix length (CIDR), version strings (`version 1.2.3.4`).
 *   2. LHOST (on): equals the configured LHOST, follows an explicit
 *      `LHOST=` / `lhost` / `-lhost` option, or is in the HTB VPN ranges
 *      10.10.14.x - 10.10.16.x.
 *   3. TARGET (on): equals a known target IP (linked machine). Otherwise any IP
 *      inside fenced code, inline code or a `commands[]` entry is a candidate:
 *      one distinct candidate -> TARGET (on); several -> the single most
 *      frequent is TARGET (on), the rest 'ambiguous' (off); a tie for most
 *      frequent -> all 'ambiguous' (off). When a known target matched, every
 *      other candidate is 'ambiguous' (off).
 *   4. Prose-only IPs -> 'unknown' (off), shown for review.
 *
 * Only `{TARGET}` and `{LHOST}` are emitted. YAML frontmatter is never
 * rewritten; ports, URL schemes and paths around the address are preserved.
 */

export type IpRole = 'TARGET' | 'LHOST';
export type IpClass = 'target' | 'lhost' | 'ambiguous' | 'unknown';

export interface IpPosition {
  start: number;
  end: number;
}

export interface IpChange {
  ip: string;
  ipClass: IpClass;
  /** Placeholder role used when this IP is selected without an override. */
  role: IpRole;
  count: number;
  /** Offsets into the full markdown (frontmatter included). */
  positions: IpPosition[];
  defaultOn: boolean;
  /** First line the IP occurs on (trimmed, truncated) — for previews. */
  sampleLine: string;
  /** Short human-readable reason for the classification. */
  reason: string;
}

export interface KeptIp {
  ip: string;
  reason: string;
  count: number;
}

export interface IpTemplatizeAnalysis {
  changes: IpChange[];
  kept: KeptIp[];
}

export interface AnalyzeIpsOptions {
  /** IPs of linked/known targets (e.g. the machine the note belongs to). */
  knownTargetIps?: readonly (string | undefined | null)[];
  /** The user's configured LHOST (globalVars.lhost). */
  lhost?: string | null;
  /** Extracted command lines of the note; an IP found in one is a target candidate. */
  commands?: readonly string[];
}

/** Per-IP decision: a role to replace with, or `false` to leave it as written. */
export type IpSelection = Record<string, IpRole | false>;

export const PLACEHOLDER_FOR_ROLE: Record<IpRole, string> = {
  TARGET: '{TARGET}',
  LHOST: '{LHOST}',
};

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
// Strict IPv4: no word char / dot right before (rejects v1.2.3.4 and the tail
// of 1.2.3.4.5); no word char or ".digit" right after (rejects 1.2.3.4.5).
// A trailing sentence period is still allowed.
const IPV4_RE = new RegExp(`(?<![\\w.])(?:${OCTET}\\.){3}${OCTET}(?![\\w]|\\.\\d)`, 'g');
const VERSION_PREFIX_RE = /\b(?:v|ver|version|release|build)\s*[:=]?\s*$/i;
const CIDR_SUFFIX_RE = /^\/\d{1,2}(?!\d)/;
// Package pins and versioned names: `pkg==1.2.3.4`, `pkg-1.2.3.4`.
const VERSION_SEPARATOR_RE = /(?:==|[A-Za-z_]-)$/;
// `=` / `@` alone also introduce real IPs (`LHOST=...`, `ssh user@...`), so they
// only mark a version on a package-manager line (`npm i pkg@1.2.3.4`).
const PIN_SEPARATOR_RE = /[=@]$/;
const PACKAGE_CONTEXT_RE = /\b(?:pip3?|pipx|npm|npx|yarn|pnpm|gem|apt(?:-get)?|cargo|conda|poetry|install)\b/i;
// Ranges: `10.10.10.1-254`, and the end of `10.10.10.1-10.10.10.9`.
const RANGE_SUFFIX_RE = /^-\d/;
const RANGE_PREFIX_RE = /\d-$/;
const LHOST_OPTION_PREFIX_RE = /(?:^|[^\w])-{0,2}lhost\s*[=:]?\s*["']?$/i;
const FRONTMATTER_RE = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/;

/** Length of the YAML frontmatter block (0 when absent). */
export function frontmatterLength(markdown: string): number {
  const m = markdown.match(FRONTMATTER_RE);
  return m ? m[0].length : 0;
}

/** Offsets of fenced code blocks and inline code spans in `markdown`, from `from` on. */
function codeRanges(markdown: string, from: number): IpPosition[] {
  const ranges: IpPosition[] = [];
  let pos = from;
  let fenceStart = -1;
  let fenceMarker = '';
  let proseStart = from;

  const pushInline = (start: number, end: number) => {
    const slice = markdown.slice(start, end);
    const inlineRe = /`[^`\n]+`/g;
    let m: RegExpExecArray | null;
    while ((m = inlineRe.exec(slice)) !== null) {
      ranges.push({ start: start + m.index, end: start + m.index + m[0].length });
    }
  };

  while (pos <= markdown.length) {
    const nl = markdown.indexOf('\n', pos);
    const lineEnd = nl === -1 ? markdown.length : nl;
    const line = markdown.slice(pos, lineEnd);
    const fence = line.match(FENCE_RE);
    if (fenceStart === -1 && fence) {
      pushInline(proseStart, pos);
      fenceStart = pos;
      fenceMarker = fence[1];
    } else if (
      fenceStart !== -1 &&
      fence &&
      fence[1][0] === fenceMarker[0] &&
      fence[1].length >= fenceMarker.length &&
      line.trim() === fence[1]
    ) {
      ranges.push({ start: fenceStart, end: lineEnd });
      fenceStart = -1;
      proseStart = lineEnd;
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  if (fenceStart !== -1) ranges.push({ start: fenceStart, end: markdown.length });
  else pushInline(proseStart, markdown.length);
  return ranges;
}

function inRanges(ranges: IpPosition[], start: number, end: number): boolean {
  return ranges.some((r) => start >= r.start && end <= r.end);
}

function lineAround(text: string, index: number): { start: number; end: number } {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const nl = text.indexOf('\n', index);
  return { start, end: nl === -1 ? text.length : nl };
}

function keepReason(ip: string, before: string, after: string): string | null {
  const o = ip.split('.').map(Number);
  if (o[0] === 127) return 'loopback';
  if (ip === '0.0.0.0') return 'unspecified address';
  if (o[0] >= 224) return 'multicast / reserved';
  if (o[3] === 255) return 'broadcast';
  if (CIDR_SUFFIX_RE.test(after)) return 'CIDR range';
  if (o[3] === 0) return 'network address';
  if (RANGE_SUFFIX_RE.test(after) || RANGE_PREFIX_RE.test(before)) return 'address range';
  if (
    VERSION_PREFIX_RE.test(before) ||
    VERSION_SEPARATOR_RE.test(before) ||
    (PIN_SEPARATOR_RE.test(before) && PACKAGE_CONTEXT_RE.test(before))
  ) {
    return 'version string';
  }
  return null;
}

function isHtbVpn(ip: string): boolean {
  const o = ip.split('.').map(Number);
  return o[0] === 10 && o[1] === 10 && o[2] >= 14 && o[2] <= 16;
}

function containsIp(command: string, ip: string): boolean {
  IPV4_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IPV4_RE.exec(command)) !== null) {
    if (m[0] === ip) return true;
  }
  return false;
}

interface Occurrence extends IpPosition {
  inCode: boolean;
  lhostOption: boolean;
  sampleLine: string;
}

/** Classify every IPv4 address in the note body. Never mutates anything. */
export function analyzeIps(markdown: string, options: AnalyzeIpsOptions = {}): IpTemplatizeAnalysis {
  if (!markdown) return { changes: [], kept: [] };
  const bodyStart = frontmatterLength(markdown);
  const code = codeRanges(markdown, bodyStart);
  const known = new Set((options.knownTargetIps || []).map((s) => (s || '').trim()).filter(Boolean));
  const lhost = (options.lhost || '').trim();
  const commands = options.commands || [];

  const occurrences = new Map<string, Occurrence[]>();
  const keptCounts = new Map<string, KeptIp>();
  const order: string[] = [];

  IPV4_RE.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = IPV4_RE.exec(markdown)) !== null) {
    const ip = m[0];
    const start = m.index;
    const end = start + ip.length;
    const line = lineAround(markdown, start);
    const before = markdown.slice(line.start, start);
    const after = markdown.slice(end, line.end);

    const reason = keepReason(ip, before, after);
    if (reason) {
      const k = keptCounts.get(ip);
      if (k) k.count += 1;
      else keptCounts.set(ip, { ip, reason, count: 1 });
      continue;
    }

    let list = occurrences.get(ip);
    if (!list) {
      list = [];
      occurrences.set(ip, list);
      order.push(ip);
    }
    const sample = markdown.slice(line.start, line.end).trim();
    list.push({
      start,
      end,
      inCode: inRanges(code, start, end),
      lhostOption: LHOST_OPTION_PREFIX_RE.test(before),
      sampleLine: sample.length > 160 ? `${sample.slice(0, 157)}...` : sample,
    });
  }

  const changes: IpChange[] = [];
  const candidates: IpChange[] = [];
  let knownMatched = false;

  for (const ip of order) {
    const list = occurrences.get(ip)!;
    const base = {
      ip,
      count: list.length,
      positions: list.map(({ start, end }) => ({ start, end })),
      sampleLine: list[0].sampleLine,
    };

    if (lhost && ip === lhost) {
      changes.push({ ...base, ipClass: 'lhost', role: 'LHOST', defaultOn: true, reason: 'matches your LHOST' });
    } else if (list.some((o) => o.lhostOption)) {
      changes.push({ ...base, ipClass: 'lhost', role: 'LHOST', defaultOn: true, reason: 'LHOST option' });
    } else if (isHtbVpn(ip)) {
      changes.push({ ...base, ipClass: 'lhost', role: 'LHOST', defaultOn: true, reason: 'HTB VPN range' });
    } else if (known.has(ip)) {
      knownMatched = true;
      changes.push({ ...base, ipClass: 'target', role: 'TARGET', defaultOn: true, reason: 'matches the linked target' });
    } else if (list.some((o) => o.inCode) || commands.some((c) => containsIp(c, ip))) {
      const change: IpChange = { ...base, ipClass: 'target', role: 'TARGET', defaultOn: true, reason: 'used in a command' };
      candidates.push(change);
      changes.push(change);
    } else {
      changes.push({ ...base, ipClass: 'unknown', role: 'TARGET', defaultOn: false, reason: 'mentioned in text' });
    }
  }

  if (candidates.length > 1 || (knownMatched && candidates.length > 0)) {
    const max = Math.max(...candidates.map((c) => c.count));
    const top = candidates.filter((c) => c.count === max);
    const winner = !knownMatched && top.length === 1 ? top[0] : null;
    for (const c of candidates) {
      if (c === winner) {
        c.reason = 'most used IP in commands';
        continue;
      }
      c.ipClass = 'ambiguous';
      c.defaultOn = false;
      c.reason = knownMatched ? 'another IP matches the linked target' : 'several IPs used in commands';
    }
  }

  return { changes, kept: Array.from(keptCounts.values()) };
}

/** The default on/off decision for each change. */
export function defaultIpSelection(changes: readonly IpChange[]): IpSelection {
  const selection: IpSelection = {};
  for (const c of changes) selection[c.ip] = c.defaultOn ? c.role : false;
  return selection;
}

/** True when at least one IP is selected for replacement. */
export function hasSelectedIps(selection: IpSelection): boolean {
  return Object.values(selection).some(Boolean);
}

/**
 * Rewrite the selected IPs in `markdown` with their placeholders. Positions are
 * taken from `analysis` (produced from this same markdown); a position whose
 * text no longer equals the IP is skipped, so a stale analysis never corrupts.
 */
export function applyIpTemplatize(markdown: string, analysis: IpTemplatizeAnalysis, selection: IpSelection): string {
  const edits: { start: number; end: number; text: string }[] = [];
  for (const change of analysis.changes) {
    const role = selection[change.ip];
    if (!role) continue;
    for (const p of change.positions) {
      if (markdown.slice(p.start, p.end) === change.ip) {
        edits.push({ start: p.start, end: p.end, text: PLACEHOLDER_FOR_ROLE[role] });
      }
    }
  }
  if (edits.length === 0) return markdown;
  edits.sort((a, b) => a.start - b.start);
  let out = '';
  let last = 0;
  for (const e of edits) {
    out += markdown.slice(last, e.start) + e.text;
    last = e.end;
  }
  return out + markdown.slice(last);
}

/** Which original IPs were replaced by which placeholder. */
export function originalIpsFromSelection(selection: IpSelection): Record<IpRole, string[]> {
  const result: Record<IpRole, string[]> = { TARGET: [], LHOST: [] };
  for (const [ip, role] of Object.entries(selection)) {
    if (role) result[role].push(ip);
  }
  return result;
}

const ORIGINAL_KEYS: Record<IpRole, string> = {
  TARGET: 'original_ips_target',
  LHOST: 'original_ips_lhost',
};

/**
 * Record the replaced IPs as flat frontmatter keys (`original_ips_target`,
 * `original_ips_lhost`), merging with values from an earlier run. Creates a
 * frontmatter block when the note has none. The body is left untouched.
 */
export function recordOriginalIps(markdown: string, originals: Record<IpRole, string[]>): string {
  const roles = (Object.keys(ORIGINAL_KEYS) as IpRole[]).filter((r) => originals[r].length > 0);
  if (roles.length === 0) return markdown;

  const fmMatch = markdown.match(FRONTMATTER_RE);
  const eol = markdown.includes('\r\n') ? '\r\n' : '\n';
  const bom = markdown.startsWith('\uFEFF') ? '\uFEFF' : '';

  if (!fmMatch) {
    const lines = roles.map((r) => `${ORIGINAL_KEYS[r]}: ${originals[r].join(', ')}`);
    return `${bom}---${eol}${lines.join(eol)}${eol}---${eol}${markdown.slice(bom.length)}`;
  }

  const block = fmMatch[0];
  const inner = block.replace(/^\uFEFF?---\r?\n/, '').replace(/\r?\n---(?:\r?\n)?$/, '');
  const lines = inner.split(/\r?\n/);
  for (const role of roles) {
    const key = ORIGINAL_KEYS[role];
    const idx = lines.findIndex((l) => l.trim().toLowerCase().startsWith(`${key}:`));
    const existing =
      idx === -1
        ? []
        : lines[idx]
            .slice(lines[idx].indexOf(':') + 1)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    const merged = Array.from(new Set([...existing, ...originals[role]]));
    const line = `${key}: ${merged.join(', ')}`;
    if (idx === -1) lines.push(line);
    else lines[idx] = line;
  }
  const trailing = /\r?\n$/.test(block) ? eol : '';
  return `${bom}---${eol}${lines.join(eol)}${eol}---${trailing}${markdown.slice(block.length)}`;
}
