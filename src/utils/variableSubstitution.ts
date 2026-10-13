import { GlobalVariables } from '../types';

/**
 * Canonical substitution context shared by every ZeroBox shell/payload UI.
 *
 * Fields map 1:1 onto data the app actually tracks (see `GlobalVariables` in
 * `src/types/index.ts`) plus the two UI-local extras (`shell`, the binary
 * picked in ReverseShellGenerator) that pre-existing templates already rely
 * on.
 *
 * PRECEDENCE: when a target is actively engaged, its IP always wins over the
 * global RHOST (`globalVars.targetIp`). Callers build the context with both
 * `rhost` (the global fallback) and `activeTargetIp` (the engaged machine's
 * IP, if any) and `resolveTemplate` picks `activeTargetIp || rhost` — this is
 * the same rule FloatingPayloadBar used ad hoc (`activeMachine?.ip ||
 * globalVars.targetIp || '10.10.10.X'`) before this engine existed.
 */
export interface SubstitutionContext {
  lhost?: string;
  lport?: string;
  /** Global RHOST, i.e. `globalVars.targetIp`. Overridden by `activeTargetIp`. */
  rhost?: string;
  /** IP of the currently engaged target. Takes priority over `rhost` when present. */
  activeTargetIp?: string;
  /** Shell binary (e.g. `/bin/bash`), used only by the reverse-shell payload templates. */
  shell?: string;
  interface?: string;
  /** Lab/AD globals (`globalVars.domain` etc.). Empty values fall back to a same-named custom variable. */
  domain?: string;
  dcIp?: string;
  user?: string;
  cred?: string;
  wordlist?: string;
  customVars?: Record<string, string>;
}

export interface VariableRange {
  /** Character offset of the token's opening brace/bracket in the *original* template. */
  start: number;
  /** Character offset just past the token's closing brace/bracket. */
  end: number;
  /** Token name as written in the template (original case), e.g. `TARGET_IP` or `ip`. */
  raw: string;
  /** Canonical field name this token maps to, or `null` for unknown/unmapped tokens. */
  canonical: string | null;
  resolved: boolean;
}

export interface ResolveResult {
  /** The template with every resolvable token substituted. Unresolved tokens are left as-is. */
  text: string;
  /** De-duplicated list of unresolved variable labels (e.g. `['LHOST', 'DOMAIN']`). */
  unresolved: string[];
  ranges: VariableRange[];
}

// Known-field display defaults. These exist purely so copied/displayed text
// always reads as a real command instead of a bare `{LHOST}` — the variable
// still counts as unresolved (see below) whenever the underlying context
// value is missing or empty, regardless of this placeholder.
const DEFAULTS: Record<string, string> = {
  lhost: '10.10.14.X',
  lport: '4444',
  rhost: '10.10.10.X',
  interface: 'tun0',
  shell: '/bin/bash',
};

const CANONICAL_LABELS: Record<string, string> = {
  lhost: 'LHOST',
  lport: 'LPORT',
  rhost: 'TARGET_IP',
  interface: 'INTERFACE',
  shell: 'SHELL',
  domain: 'DOMAIN',
  dcIp: 'DC_IP',
  user: 'USER',
  cred: 'CRED',
  wordlist: 'WORDLIST',
};

/**
 * Upper-case token -> global field for the lab/AD globals. These have no display default; when the global is
 * empty a custom variable with the same token name (e.g. the default customVars.DOMAIN) still resolves it, so
 * templates that relied on customVars behave exactly as before.
 */
const GLOBAL_FIELD_ALIASES: Record<string, 'domain' | 'dcIp' | 'user' | 'cred' | 'wordlist'> = {
  DOMAIN: 'domain',
  DC_IP: 'dcIp',
  'DC-IP': 'dcIp',
  USER: 'user',
  CRED: 'cred',
  WORDLIST: 'wordlist',
};

// Matches `{TOKEN}` (not immediately preceded by `$`, so `${VAR}` is left
// untouched) or `<TOKEN>`. `$(cmd)` and `%VAR%` never match this pattern at
// all since neither uses curly/angle brackets, so they're safe by construction.
// Requires 2+ chars so incidental single-char braces from other tools (e.g.
// PowerShell's `|%{0}` foreach-object shorthand) are never mistaken for a
// variable token.
const TOKEN_RE = /(?<!\$)\{([A-Za-z0-9_-]{2,})\}|<([A-Za-z0-9_-]{2,})>/g;

const TARGET_ALIASES = new Set(['TARGET_IP', 'TARGET', 'IP', 'TARGET-IP']);

function effectiveTarget(ctx: SubstitutionContext): string | undefined {
  return ctx.activeTargetIp || ctx.rhost;
}

/**
 * Exact-case (lowercase-only) aliases inherited from ReverseShellGenerator /
 * revshellsData's payload library: `{ip}`, `{port}`, `{shell}`. These are
 * checked BEFORE the case-insensitive TARGET_IP/IP family below so a literal
 * lowercase `{ip}` (attacker host, per revshellsData) never collides with
 * the case-insensitive `{IP}` alias for the target.
 */
function resolveExactCaseToken(
  raw: string,
  ctx: SubstitutionContext
): { value: string | undefined; canonical: string } | null {
  if (raw === 'ip') return { value: ctx.lhost, canonical: 'lhost' };
  if (raw === 'port') return { value: ctx.lport, canonical: 'lport' };
  if (raw === 'shell') return { value: ctx.shell, canonical: 'shell' };
  return null;
}

/** Case-insensitive aliases inherited from `helpers.ts#interpolateCommand`. */
function resolveKnownToken(
  upper: string,
  ctx: SubstitutionContext
): { value: string | undefined; canonical: string } | null {
  if (TARGET_ALIASES.has(upper)) return { value: effectiveTarget(ctx), canonical: 'rhost' };
  if (upper === 'LHOST') return { value: ctx.lhost, canonical: 'lhost' };
  if (upper === 'LPORT') return { value: ctx.lport, canonical: 'lport' };
  if (upper === 'INTERFACE') return { value: ctx.interface, canonical: 'interface' };
  return null;
}

function resolveGlobalFieldToken(
  raw: string,
  ctx: SubstitutionContext
): { value: string | undefined; canonical: string } | null {
  const field = GLOBAL_FIELD_ALIASES[raw.toUpperCase()];
  if (!field) return null;
  return { value: ctx[field] || resolveCustomVar(raw, ctx), canonical: field };
}

function resolveCustomVar(raw: string, ctx: SubstitutionContext): string | undefined {
  if (!ctx.customVars) return undefined;
  const key = Object.keys(ctx.customVars).find((k) => k.toLowerCase() === raw.toLowerCase());
  return key ? ctx.customVars[key] : undefined;
}

export interface ResolveOptions {
  /**
   * Disable the exact-case lowercase `{ip}`/`{port}`/`{shell}` aliases so the
   * engine behaves like the legacy `helpers.ts#interpolateCommand`, where
   * `{ip}` is case-insensitively the TARGET and `{port}`/`{shell}` are not
   * variables at all.
   */
  legacyAliases?: boolean;
}

/**
 * Resolve every `{TOKEN}` / `<TOKEN>` placeholder in `template` against
 * `context`. Pure function — same input always yields the same output.
 *
 * - Known fields (LHOST/LPORT/TARGET_IP family/INTERFACE/shell, plus their
 *   lowercase `{ip}`/`{port}`/`{shell}` and Obsidian `<...>` aliases) are
 *   always substituted with the context value, or a readable default when
 *   the context value is empty — but an empty/missing value is still
 *   reported as unresolved.
 * - Custom variables (`globalVars.customVars`) are matched case-insensitively
 *   by key.
 * - Anything else is left untouched in the output and reported unresolved.
 * - Never substitutes inside `${VAR}` (bash/JS parameter expansion). `$(cmd)`
 *   and `%VAR%` contain no curly/angle syntax, so they are never touched.
 */
export function resolveTemplate(
  template: string,
  context: SubstitutionContext,
  options: ResolveOptions = {}
): ResolveResult {
  if (!template) return { text: '', unresolved: [], ranges: [] };

  const unresolvedSet = new Set<string>();
  const ranges: VariableRange[] = [];
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(template)) !== null) {
    const raw = match[1] ?? match[2] ?? '';
    const start = match.index;
    const end = start + match[0].length;
    result += template.slice(lastIndex, start);

    const known =
      (options.legacyAliases ? null : resolveExactCaseToken(raw, context)) ??
      resolveKnownToken(raw.toUpperCase(), context) ??
      resolveGlobalFieldToken(raw, context);

    if (known) {
      const { value, canonical } = known;
      if (value) {
        result += value;
        ranges.push({ start, end, raw, canonical, resolved: true });
      } else {
        result += DEFAULTS[canonical] ?? match[0];
        unresolvedSet.add(CANONICAL_LABELS[canonical] ?? canonical.toUpperCase());
        ranges.push({ start, end, raw, canonical, resolved: false });
      }
    } else {
      const customValue = resolveCustomVar(raw, context);
      if (customValue) {
        result += customValue;
        ranges.push({ start, end, raw, canonical: raw, resolved: true });
      } else {
        result += match[0];
        unresolvedSet.add(raw);
        ranges.push({ start, end, raw, canonical: null, resolved: false });
      }
    }

    lastIndex = end;
  }
  result += template.slice(lastIndex);

  return { text: result, unresolved: Array.from(unresolvedSet), ranges };
}

/**
 * Convenience builder: turns the store's `GlobalVariables` (plus optional
 * per-UI extras) into a `SubstitutionContext`, applying the
 * active-target-over-RHOST precedence documented on the interface above.
 */
export function contextFromGlobalVars(
  globalVars: GlobalVariables,
  extras?: { activeTargetIp?: string; shell?: string }
): SubstitutionContext {
  return {
    lhost: globalVars.lhost,
    lport: globalVars.lport,
    rhost: globalVars.targetIp,
    activeTargetIp: extras?.activeTargetIp,
    shell: extras?.shell,
    interface: globalVars.interface,
    domain: globalVars.domain,
    dcIp: globalVars.dcIp,
    user: globalVars.user,
    cred: globalVars.cred,
    wordlist: globalVars.wordlist,
    customVars: globalVars.customVars,
  };
}
