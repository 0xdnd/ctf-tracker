/**
 * aiScanInterpreter.ts
 * Prompt synthesis and offensive intelligence extraction for CTF & pentest scans.
 * Transforms raw Nmap/Rustscan/Gnmap data into structured tactical attack trees.
 *
 * Redaction (default ON): before any prompt leaves the browser, IPs, hostnames,
 * AD domains, usernames, internal subnets, and MAC addresses are replaced with
 * stable placeholders via redactScanPayload(). The model's response is restored
 * back to real values for display via restoreRedactions(). Both are pure
 * functions with no network access - see aiScanInterpreter.test.ts.
 */

import { ScanImportResult, ParsedPort } from './scanParserUtils';
import { streamClaudeMessage, StreamCallbacks } from './aiClient';

export interface ScanInterpreterOptions {
  targetIp?: string;
  targetName?: string;
  targetOs?: string;
  difficulty?: string;
  model?: string;
  apiKey?: string;
  /** Default true. When true, scan payload + target fields are redacted before leaving the browser. */
  redact?: boolean;
  /** Required to actually send a request (see streamClaudeMessage). */
  consentGranted?: boolean;
}

export const CYBER_TACTICAL_SYSTEM_PROMPT = `You are ZEROBOX AI // Senior Offensive Cyber Operations & Exploit Architect.
Your mission is to perform elite tactical reconnaissance translation on CTF/pentest target scans (Hack The Box, TryHackMe, OSCP, CPTS, Active Directory).

Guidelines:
1. Speak in a sharp, high-tempo, authoritative tactical cyber tone (CRT terminal aesthetic).
2. Prioritize practical, high-probability footholds (CVEs, version vulnerabilities, anonymous auth, web entry points, default credentials, RPC/SMB enumeration).
3. Always supply concrete, copy-pasteable terminal commands pre-filled with the target IP/port (using tools like nmap, ffuf, curl, hydra, evil-winrm, netexec, crackmapexec, enum4linux-ng, impacket).
4. Organize your response using the following standardized markdown sections:
   - ## 🎯 1. Threat Surface Assessment (Deconstruct what the host actually is)
   - ## ⚡ 2. Ranked Attack Vectors & Foothold Hypotheses (Top 3 most viable attack vectors ranked by probability)
   - ## 🛠️ 3. Immediate Tactical Command Playbook (Actionable bash/powershell commands ready to execute)
   - ## 🏰 4. Active Directory / Lateral Movement Vectors (If Windows/AD; otherwise Linux PrivEsc Hypotheses)
   - ## ⚠️ 5. Potential Traps & Rabbit Holes (What to avoid wasting time on)
5. Do NOT hallucinate services or versions that are not present in the scan evidence.
6. Provide output in clean, structured Markdown suitable for appending directly to engagement notes.
7. The telemetry below may contain placeholder tokens like [IP_1], [HOST_1], [DOMAIN_1], [USER_1] in place of real values that were redacted before reaching you. Treat them as opaque identifiers and reuse them verbatim in your commands/output exactly as given - do not invent real-looking values in their place.`;

/* ------------------------------------------------------------------------ */
/* Redaction                                                                 */
/* ------------------------------------------------------------------------ */

/** Maps placeholder token (e.g. "[IP_1]") -> original real value. */
export interface RedactionMap {
  [placeholder: string]: string;
}

interface RedactionState {
  valueToPlaceholder: Map<string, string>;
  counters: Record<string, number>;
  map: RedactionMap;
}

function createState(): RedactionState {
  return { valueToPlaceholder: new Map(), counters: {}, map: {} };
}

/** Rebuild working state from a previously-returned map, so numbering/reuse is
 *  consistent across multiple redactScanPayload() calls within one request. */
function stateFromMap(existingMap: RedactionMap): RedactionState {
  const state = createState();
  for (const [placeholder, value] of Object.entries(existingMap)) {
    state.map[placeholder] = value;
    state.valueToPlaceholder.set(`${placeholder.slice(1, placeholder.indexOf('_'))}::${value}`, placeholder);
    const prefix = placeholder.slice(1, placeholder.indexOf('_'));
    const num = parseInt(placeholder.slice(placeholder.indexOf('_') + 1, -1), 10);
    if (!Number.isNaN(num)) {
      state.counters[prefix] = Math.max(state.counters[prefix] || 0, num);
    }
  }
  return state;
}

function placeholderFor(state: RedactionState, prefix: string, value: string): string {
  const key = `${prefix}::${value}`;
  const existing = state.valueToPlaceholder.get(key);
  if (existing) return existing;
  const n = (state.counters[prefix] = (state.counters[prefix] || 0) + 1);
  const placeholder = `[${prefix}_${n}]`;
  state.valueToPlaceholder.set(key, placeholder);
  state.map[placeholder] = value;
  return placeholder;
}

const MAC_RE = /\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\b/g;
const CIDR_RE = /\b\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\b/g;
// Loose IPv6 candidate matcher (hex groups separated by colons); candidates are
// validated in isIpv6Candidate() so alternation order can never truncate a match
// and leak the tail of an address.
const IPV6_CANDIDATE_RE = /(?<![\w:.])(?:[A-Fa-f0-9]{0,4}:){2,7}[A-Fa-f0-9]{0,4}(?![\w:])/g;

function isIpv6Candidate(m: string): boolean {
  if (!/[A-Fa-f0-9]/.test(m)) return false;
  if (m.includes(':::')) return false;
  const doubleColons = m.split('::').length - 1;
  if (doubleColons > 1) return false;
  const groups = m.split(':');
  if (doubleColons === 1) return groups.length <= 9;
  // Without "::" a valid address has exactly 8 non-empty groups.
  return groups.length === 8 && groups.every((g) => g.length > 0);
}
// NetBIOS-style "DOMAIN\user" (e.g. CORP\jsmith, or smb-enum-users "ADMIN\Administrator").
const NETBIOS_RE = /\b([A-Za-z][A-Za-z0-9_-]{0,15})\\([A-Za-z0-9_.$-]+)/g;
// A dotted name chain ending in a well-known AD domain suffix, e.g. CORP.LOCAL, dc01.corp.internal.
const AD_DOMAIN_CHAIN_RE = /\b(?:[A-Za-z0-9-]{1,63}\.)+(?:LOCAL|CORP|INTERNAL|LAN|AD|DOMAIN)\b/gi;
// Generic FQDN/hostname: 2+ dotted labels, final label letter-led (excludes IPs and version numbers like 2.4.49).
const FQDN_RE = /\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.){1,}[A-Za-z][A-Za-z-]{0,62}\b/g;
// Common scan-output username idioms: "User:", "Account:" (smb-enum-users), "sAMAccountName:" (ldap).
const USER_LABEL_RE = /\b(?:User|Account|sAMAccountName|Username)\s*:\s*([A-Za-z0-9_.$-]+)/gi;

function redactIntoState(text: string, state: RedactionState): string {
  let out = text;

  out = out.replace(MAC_RE, (m) => placeholderFor(state, 'MAC', m));
  out = out.replace(CIDR_RE, (m) => placeholderFor(state, 'NET', m));
  out = out.replace(IPV4_RE, (m) => placeholderFor(state, 'IP', m));
  out = out.replace(IPV6_CANDIDATE_RE, (m) => (isIpv6Candidate(m) ? placeholderFor(state, 'IP', m) : m));
  out = out.replace(NETBIOS_RE, (_m, domain: string, user: string) => {
    const domainPh = placeholderFor(state, 'DOMAIN', domain);
    const userPh = placeholderFor(state, 'USER', user);
    return `${domainPh}\\${userPh}`;
  });
  out = out.replace(AD_DOMAIN_CHAIN_RE, (m) => placeholderFor(state, 'DOMAIN', m));
  out = out.replace(FQDN_RE, (m) => placeholderFor(state, 'HOST', m));
  out = out.replace(USER_LABEL_RE, (m, user: string) => {
    const userPh = placeholderFor(state, 'USER', user);
    return m.slice(0, m.length - user.length) + userPh;
  });

  return out;
}

/**
 * Redact sensitive scan-output values (IPv4/IPv6, MACs, CIDR subnets, hostnames/
 * FQDNs, AD domain names, and common scan-output usernames) with stable
 * placeholders. Pass a previously-returned map as `existingMap` to keep
 * placeholder numbering/reuse consistent across multiple calls within one
 * logical request (e.g. redacting the scan body and a separately-sent target
 * IP/name with the same map).
 */
export function redactScanPayload(
  text: string,
  existingMap: RedactionMap = {}
): { redacted: string; map: RedactionMap } {
  const state = stateFromMap(existingMap);
  const redacted = redactIntoState(text, state);
  return { redacted, map: state.map };
}

/** Restore placeholder tokens in model output back to their real values for display. */
export function restoreRedactions(text: string, map: RedactionMap): string {
  let result = text;
  for (const [placeholder, value] of Object.entries(map)) {
    result = result.split(placeholder).join(value);
  }
  return result;
}

/* ------------------------------------------------------------------------ */
/* Prompt building                                                           */
/* ------------------------------------------------------------------------ */

/**
 * Builds a token-efficient reconnaissance summary from parsed scan data.
 * Contains REAL values - callers that send this over the network must redact
 * it first (see buildRedactedScanPrompt).
 */
export function buildScanPrompt(scan: ScanImportResult, options?: ScanInterpreterOptions): string {
  const ip = options?.targetIp || scan.detectedIp || 'TARGET_IP';
  const os = options?.targetOs || scan.detectedOs || 'Unknown';
  const name = options?.targetName || scan.detectedHost || 'Unknown Target';
  const difficulty = options?.difficulty || 'Unknown';

  const portLines = scan.ports.map((p: ParsedPort) => {
    let line = `Port ${p.port}/${p.protocol} [${p.state.toUpperCase()}] - Service: ${p.service}`;
    if (p.version) line += ` (Version: ${p.version})`;
    if (p.cveNotes) line += ` [Flagged: ${p.cveNotes}]`;
    if (p.scripts && Object.keys(p.scripts).length > 0) {
      const scriptDetails = Object.entries(p.scripts)
        .slice(0, 5)
        .map(([name, out]) => `  - Script [${name}]: ${out.slice(0, 150).replace(/\n/g, ' ')}`)
        .join('\n');
      line += `\n${scriptDetails}`;
    }
    return line;
  });

  return `TARGET TELEMETRY:
- Name: ${name}
- Primary IP: ${ip}
- Assumed OS: ${os}
- Difficulty Level: ${difficulty}
- Scan Format Parsed: ${scan.format}
- Total Open/Filtered Ports: ${scan.ports.length}

OPEN PORTS & SERVICE FINGERPRINTS:
${portLines.length > 0 ? portLines.join('\n') : 'No open ports parsed in structured output.'}

${scan.rawSummary ? `RAW SCAN EXCERPT:\n${scan.rawSummary.slice(0, 2000)}` : ''}

MISSION DIRECTIVE:
Analyze these service fingerprints. Synthesize the most viable attack vectors and construct the immediate tactical execution playbook for target IP ${ip}.`;
}

export interface RedactedPromptResult {
  /** The exact user-prompt text that will be sent (post-redaction when redact=true). */
  prompt: string;
  /** Placeholder -> real value map (empty when redact=false). */
  map: RedactionMap;
  /** The unredacted prompt, for local reference only - never send this when redact=true. */
  rawPrompt: string;
}

/**
 * Builds the exact request prompt that will be sent, applying redaction (default
 * on) to the scan payload AND the target name/IP fields, which are interpolated
 * into the same string by buildScanPrompt. Pure/no network access - safe to call
 * to render an exact-payload consent preview before sending anything.
 */
export function buildRedactedScanPrompt(
  scan: ScanImportResult,
  options?: ScanInterpreterOptions
): RedactedPromptResult {
  const rawPrompt = buildScanPrompt(scan, options);
  const redact = options?.redact !== false;
  if (!redact) {
    return { prompt: rawPrompt, map: {}, rawPrompt };
  }
  const { redacted, map } = redactScanPayload(rawPrompt);
  return { prompt: redacted, map, rawPrompt };
}

/* ------------------------------------------------------------------------ */
/* Network call                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Stream an AI reconnaissance analysis from a parsed scan.
 *
 * Requires `options.consentGranted === true` (enforced by streamClaudeMessage -
 * no fetch happens without it) and an API key. When `options.redact !== false`
 * (the default), the prompt sent over the network has IPs/hostnames/domains/
 * usernames replaced with placeholders; `callbacks.onChunk`/`onDone` receive the
 * CUMULATIVE de-redacted text so far (not a delta) so the UI can render real
 * values as they stream in. The resolved promise value is always de-redacted.
 */
export async function interpretScanWithClaude(
  scan: ScanImportResult,
  options: ScanInterpreterOptions,
  callbacks: StreamCallbacks
): Promise<string> {
  const redact = options.redact !== false;
  const { prompt, map } = buildRedactedScanPrompt(scan, options);

  let rawBuffer = '';
  const fullTextRaw = await streamClaudeMessage(
    CYBER_TACTICAL_SYSTEM_PROMPT,
    prompt,
    {
      onChunk: (chunk) => {
        rawBuffer += chunk;
        callbacks.onChunk(redact ? restoreRedactions(rawBuffer, map) : rawBuffer);
      },
      onDone: (full) => {
        callbacks.onDone?.(redact ? restoreRedactions(full, map) : full);
      },
      onError: callbacks.onError
    },
    {
      model: options.model,
      apiKey: options.apiKey,
      consentGranted: options.consentGranted
    }
  );

  return redact ? restoreRedactions(fullTextRaw, map) : fullTextRaw;
}
